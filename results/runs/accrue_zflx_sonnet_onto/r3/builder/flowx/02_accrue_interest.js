// SCRIPT node "Accrue interest (LXB002C main loop)" — workflow accrue_interest_calculation (P-15).
// Walks the category balances in key order (BALCAT is read sequentially), one account at a time:
//   BR-01/02 rate key account.groupId + typeCode + categoryCode, retry with group STANDARD if missing
//   BR-03    rate != 0: monthlyInterest = (categoryBalance * rate) / 1200, truncated to 0.01 (BR-08)
//   BR-04    interest transaction type 07, category 12, source Batch, desc "Accrued int <accountId>"
//   BR-05    transaction id = interestRunDate (PARM, 10 chars) + 6-digit running suffix
//   BR-06    at each change of account: currentBalance += totalInterest, cycle credit/debit = 0
//   BR-07    1400-COMPUTE-FEES is an empty stub: no fee transactions
function str(v) { return v === null || v === undefined ? '' : String(v); }
function padLeft(s, n, c) { s = str(s); while (s.length < n) s = c + s; return s; }
function padRight(s, n) { s = str(s); while (s.length < n) s += ' '; return s; }

var st = JSON.parse(str(input.parsedJson));
var runDate = str(input.interestRunDate).trim();
if (runDate === '') runDate = '2022071800';           // interestRunDate default = legacy PARM
runDate = padRight(runDate, 10).substring(0, 10);     // PARM-DATE PIC X(10)
var applyFinalUpdate = String(input.applyFinalAccountUpdate) === 'true';

// DB2-format timestamp (Z-GET-DB2-FORMAT-TIMESTAMP): YYYY-MM-DD-HH.MM.SS.hh0000
function db2Timestamp(d) {
  function p2(n) { return padLeft(String(n), 2, '0'); }
  return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) + '-' +
    p2(d.getHours()) + '.' + p2(d.getMinutes()) + '.' + p2(d.getSeconds()) + '.' +
    p2(Math.floor(d.getMilliseconds() / 10)) + '0000';
}
var ts = db2Timestamp(new Date());

var accById = {};
st.accounts.forEach(function (a) { accById[a.acctId] = a; });

var balances = st.balances.slice().sort(function (x, y) {
  if (x.acctId !== y.acctId) return x.acctId < y.acctId ? -1 : 1;
  if (x.typeCd !== y.typeCd) return x.typeCd < y.typeCd ? -1 : 1;
  return x.catCd - y.catCd;
});

var stats = {
  interestRunDate: runDate, batchId: str(input.batchId), balanceRecords: 0, accountsUpdated: 0,
  transactionsWritten: 0, standardFallbacks: 0, zeroRateSkips: 0, finalAccountUpdated: applyFinalUpdate,
  lastAccountNotUpdated: null, errors: []
};

function lookupRate(groupId, typeCd, catCd) {
  var k = str(groupId).replace(/\s+$/, '') + '|' + typeCd + '|' + catCd;
  if (k in st.rates) return st.rates[k];
  // file status 23 (record not found) -> retry with group STANDARD
  stats.standardFallbacks++;
  var k2 = 'STANDARD|' + typeCd + '|' + catCd;
  if (k2 in st.rates) return st.rates[k2];
  stats.errors.push('No rate for ' + k + ' nor ' + k2 + ' (legacy abends); treated as rate 0');
  return '0';
}

function updateAccount(acct, totalInt) {
  if (!acct) return;
  acct.currBal = String(BigInt(acct.currBal) + totalInt);
  acct.currCycCredit = '0';
  acct.currCycDebit = '0';
  stats.accountsUpdated++;
}

var DIVISOR = BigInt(120000);   // 1200 (12 months x 100) with cents x hundredths-of-a-percent scaling
var transactions = [];
var suffix = 0;
var lastAcctId = null, firstTime = true, totalInt = BigInt(0), acct = null, cardNum = '';

balances.forEach(function (b) {
  stats.balanceRecords++;
  if (b.acctId !== lastAcctId) {
    if (!firstTime) updateAccount(acct, totalInt); else firstTime = false;
    totalInt = BigInt(0);
    lastAcctId = b.acctId;
    acct = accById[b.acctId] || null;
    if (!acct) stats.errors.push('Account ' + b.acctId + ' not found in ledgacc (legacy abends); its balances are skipped');
    cardNum = (b.acctId in st.cardByAcct) ? st.cardByAcct[b.acctId] : '';
    if (acct && cardNum === '') stats.errors.push('No card xref for account ' + b.acctId + ' (legacy abends); card_num left blank');
  }
  if (!acct) return;
  var rate = BigInt(lookupRate(acct.groupId, b.typeCd, b.catCd));
  if (rate === BigInt(0)) { stats.zeroRateSkips++; return; }
  // COMPUTE without ROUNDED: exact quotient truncated toward zero to 2 decimals
  var interest = (BigInt(b.bal) * rate) / DIVISOR;
  totalInt += interest;
  suffix++;
  transactions.push({
    tranId: runDate + padLeft(String(suffix % 1000000), 6, '0'),
    typeCd: '07', catCd: 12, source: 'Batch',
    desc: 'Accrued int ' + acct.acctId,
    amt: String(interest),
    merchantId: 0, merchantName: '', merchantCity: '', merchantZip: '',
    cardNum: cardNum, origTs: ts, procTs: ts
  });
  stats.transactionsWritten++;
  // BR-07: 1400-COMPUTE-FEES is an empty stub — no fee computed
});

// Legacy loop: the account rewrite runs only "at each change of account"; the end-of-file branch that
// would rewrite the last account is never reached, so the last account keeps its balance and cycle totals.
if (lastAcctId !== null) {
  if (applyFinalUpdate) updateAccount(acct, totalInt);
  else stats.lastAccountNotUpdated = lastAcctId;
}

output.resultJson = JSON.stringify({ transactions: transactions, accounts: st.accounts, stats: stats });
output.parsedJson = null;
