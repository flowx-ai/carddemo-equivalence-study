// SCRIPT node "Calculate interest (P-15)" — workflow accrue_interest_calculation
// BR-01..BR-10 of process-interest-calculation. Money is BigInt cents, rates BigInt hundredths.

var p = input.parsed;
var warnings = [];

function arr(x) { var a = []; if (!x) return a; for (var i = 0; i < x.length; i++) a.push(x[i]); return a; }
function trim(s) { return String(s).replace(/^\s+/, '').replace(/\s+$/, ''); }
function pad(n, w) { var s = String(n); while (s.length < w) s = '0' + s; return s; }

var accounts = arr(p.accounts).map(function (a) {
  return {
    acctId: String(a.acctId), activeStatus: String(a.activeStatus), currBal: String(a.currBal),
    creditLimit: String(a.creditLimit), cashCreditLimit: String(a.cashCreditLimit),
    openDate: String(a.openDate), expiryDate: String(a.expiryDate), reissueDate: String(a.reissueDate),
    currCycCredit: String(a.currCycCredit), currCycDebit: String(a.currCycDebit),
    addrZip: String(a.addrZip), groupId: String(a.groupId)
  };
});
var acctById = {};
accounts.forEach(function (a) { if (!acctById[a.acctId]) acctById[a.acctId] = a; });

// BR-01/02 rate table keyed groupId|typeCode|categoryCode
var rateByKey = {};
arr(p.rates).forEach(function (r) {
  var key = trim(r.groupId) + '|' + String(r.typeCd) + '|' + String(r.catCd);
  if (!(key in rateByKey)) rateByKey[key] = BigInt(String(r.rate));
});

// Card for the interest transaction: first CARDLINK record of the account (alternate-index read)
var cardByAcct = {};
arr(p.xrefs).forEach(function (x) { var k = String(x.acctId); if (!(k in cardByAcct)) cardByAcct[k] = String(x.cardNum); });

// TCATBALF is a KSDS read sequentially: process in key order accountId + typeCode + categoryCode
var balances = arr(p.balances).map(function (b) {
  return { acctId: String(b.acctId), typeCd: String(b.typeCd), catCd: String(b.catCd), bal: String(b.bal) };
});
balances.sort(function (x, y) {
  var kx = x.acctId + x.typeCd + x.catCd, ky = y.acctId + y.typeCd + y.catCd;
  return kx < ky ? -1 : (kx > ky ? 1 : 0);
});

// BR-05 transaction id prefix: PARM X(10)
var runDate = trim(input.interestRunDate || '2022071800');
while (runDate.length < 10) runDate += ' ';
runDate = runDate.substring(0, 10);

var rounding = String(input.roundingMode || 'TRUNCATE').toUpperCase();      // BR-08
var updateFinalAccount = input.updateFinalAccount === true;                // BR-06, see assumptions A-06
var ts = String(input.runTimestamp || '');
if (ts.length === 0) {
  var d = new Date();
  ts = d.getFullYear() + '-' + pad(d.getMonth() + 1, 2) + '-' + pad(d.getDate(), 2) + '-' +
       pad(d.getHours(), 2) + '.' + pad(d.getMinutes(), 2) + '.' + pad(d.getSeconds(), 2) + '.' +
       pad(Math.floor(d.getMilliseconds() / 10), 2) + '0000';
}

// BR-03: interest = balance x rate / 1200. In cents: balCents * rateHundredths / 120000.
function monthlyInterest(balCents, rate) {
  var n = balCents * rate, dv = 120000n;
  var q = n / dv;                                // BigInt division truncates toward zero (COBOL COMPUTE)
  if (rounding === 'HALF_UP') {
    var r = n % dv; if (r < 0n) r = -r;
    if (r * 2n >= dv) q += (n < 0n ? -1n : 1n);
  }
  return q;
}

var transactions = [];
var suffix = 0;
var lastAcct = null, current = null, card = null, totalInterest = 0n;
var stats = { balanceRecords: balances.length, accountsUpdated: 0, fallbackRates: 0, zeroRate: 0, skippedNoAccount: 0 };

function updateAccount() {                       // BR-06
  if (!current) return;
  current.currBal = (BigInt(current.currBal) + totalInterest).toString();
  current.currCycCredit = '0';
  current.currCycDebit = '0';
  stats.accountsUpdated++;
}

balances.forEach(function (b) {
  if (b.acctId !== lastAcct) {
    if (lastAcct !== null) updateAccount();      // at each change of account
    totalInterest = 0n;
    lastAcct = b.acctId;
    current = acctById[b.acctId] || null;
    card = cardByAcct[b.acctId];
    if (!current) warnings.push('Account ' + b.acctId + ' not found in ledgacc: category balances skipped');
    else if (card === undefined) { warnings.push('No card xref for account ' + b.acctId + ': card_num left blank'); card = ''; }
  }
  if (!current) { stats.skippedNoAccount++; return; }

  var key = trim(current.groupId) + '|' + b.typeCd + '|' + b.catCd;
  var rate = rateByKey[key];
  if (rate === undefined) {                      // BR-02: file status 23 -> STANDARD group
    rate = rateByKey['STANDARD|' + b.typeCd + '|' + b.catCd];
    stats.fallbackRates++;
    if (rate === undefined) {
      warnings.push('No rate for ' + key + ' nor STANDARD|' + b.typeCd + '|' + b.catCd + ': no interest');
      rate = 0n;
    }
  }
  if (rate === 0n) { stats.zeroRate++; return; }  // BR-03 / BR-10: no interest transaction

  var interest = monthlyInterest(BigInt(b.bal), rate);
  totalInterest += interest;
  // BR-07: 1400-COMPUTE-FEES is an empty stub — no fee transaction
  suffix++;
  transactions.push({                            // BR-04 / BR-05
    tranId: runDate + pad(suffix, 6),
    typeCd: '07', catCd: '0012', source: 'Batch',
    desc: 'Accrued int ' + current.acctId,
    amt: interest.toString(),
    merchantId: '0', merchantName: '', merchantCity: '', merchantZip: '',
    cardNum: card, origTs: ts, procTs: ts
  });
});
if (updateFinalAccount && lastAcct !== null) updateAccount();

stats.transactionsWritten = transactions.length;
output.calc = { accounts: accounts, transactions: transactions, warnings: warnings, stats: stats };
output.parsed = null;
