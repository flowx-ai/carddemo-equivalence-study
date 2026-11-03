// SCRIPT node "Accrue interest" (workflow accrue_interest_calculation) - process interest-calculation BR-01..BR-10.
// Walks the category balances in key order (acct, type, cat) like LXB002C reading BALCATF sequentially;
// on each change of account the previous account is rewritten (BR-06), and the last one at end of file.

var d = JSON.parse(String(input.parsed));
var DIVISOR = BigInt(1200 * 100); // BR-03 divisor 1200; *100 because bal and rate are both in hundredths

function rateKey(group, type, cat) { return String(group).trim() + '|' + String(type) + '|' + parseInt(cat, 10); }

var rates = {};
d.rates.forEach(function (r) {
  var k = rateKey(r.groupId, r.typeCd, r.catCd);
  if (!(k in rates)) rates[k] = r.rate;
});

var accounts = {};
d.accounts.forEach(function (a) { if (!(a.acctId in accounts)) accounts[a.acctId] = a; });

// Card xref by alternate key acctId: the first card in key order (lowest card number)
var cardByAcct = {};
d.xrefs.forEach(function (x) {
  var cur = cardByAcct[x.acctId];
  if (cur === undefined || x.cardNum < cur) cardByAcct[x.acctId] = x.cardNum;
});

var balances = d.balances.slice().sort(function (a, b) {
  var ka = a.acctId + a.typeCd + a.catCd, kb = b.acctId + b.typeCd + b.catCd;
  return ka < kb ? -1 : ka > kb ? 1 : 0;
});

function pad(n, w) { var s = String(n); while (s.length < w) s = '0' + s; return s; }

// DB2 format timestamp YYYY-MM-DD-HH.MM.SS.hh0000 (legacy Z-GET-DB2-FORMAT-TIMESTAMP)
function db2Timestamp() {
  var t = new Date();
  return t.getFullYear() + '-' + pad(t.getMonth() + 1, 2) + '-' + pad(t.getDate(), 2) + '-' +
    pad(t.getHours(), 2) + '.' + pad(t.getMinutes(), 2) + '.' + pad(t.getSeconds(), 2) + '.' +
    pad(Math.floor(t.getMilliseconds() / 10), 2) + '0000';
}

var txns = [];
var updated = {};
var log = { balancesRead: balances.length, fallbackToStandard: 0, missingRate: [], missingAccount: [], zeroRate: 0 };
var suffix = 0;
var lastAcct = null, current = null, totalInt = BigInt(0);

function rewriteAccount() {
  if (current === null) return;
  current.currBal = (BigInt(current.currBal) + totalInt).toString();
  current.currCycCredit = '0';
  current.currCycDebit = '0';
  updated[current.acctId] = true;
}

balances.forEach(function (b) {
  if (b.acctId !== lastAcct) {
    rewriteAccount();
    lastAcct = b.acctId;
    totalInt = BigInt(0);
    current = accounts[b.acctId] || null;
    if (current === null) log.missingAccount.push(b.acctId);
  }
  if (current === null) return;

  // BR-01 / BR-02: account group first, then STANDARD when the row is missing (file status 23)
  var rate = rates[rateKey(current.groupId, b.typeCd, b.catCd)];
  if (rate === undefined) {
    rate = rates[rateKey('STANDARD', b.typeCd, b.catCd)];
    if (rate !== undefined) log.fallbackToStandard++;
  }
  if (rate === undefined) {
    log.missingRate.push(b.acctId + '/' + b.typeCd + '/' + b.catCd);
    return;
  }
  if (BigInt(rate) === BigInt(0)) { log.zeroRate++; return; } // BR-10

  // BR-03 / BR-08: (bal * rate) / 1200, truncated to cents like an unROUNDED COMPUTE
  var monthly = (BigInt(b.bal) * BigInt(rate)) / DIVISOR;
  totalInt += monthly;
  // BR-07: 1400-COMPUTE-FEES is an empty stub - no fee

  // BR-04 / BR-05
  suffix++;
  var ts = db2Timestamp();
  txns.push({
    tranId: d.runDate + pad(suffix, 6),
    typeCd: '07', catCd: '0012', source: 'Batch',
    desc: 'Accrued int ' + b.acctId,
    amt: monthly.toString(),
    merchantId: 0, merchantName: '', merchantCity: '', merchantZip: '',
    cardNum: cardByAcct[b.acctId] || '',
    origTs: ts, procTs: ts
  });
});
rewriteAccount();

log.transactionsWritten = txns.length;
log.accountsUpdated = Object.keys(updated).length;

output.accrued = JSON.stringify({ txns: txns, accounts: d.accounts, log: log });
output.parsed = null;
