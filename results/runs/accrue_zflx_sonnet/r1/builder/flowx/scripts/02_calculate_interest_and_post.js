// ACCRUE / LXB002C - node 2: interest calculation (process interest-calculation, BR-01..BR-10).
// Walks the category balances in key order; at each change of account the previous account is
// rewritten (BR-06). Per balance: rate lookup group+type+cat (BR-01), STANDARD fallback (BR-02),
// and when rate != 0: interest = balance * rate / 1200, truncated to 2 decimals (BR-03, BR-08),
// posted as a type 07 / category 12 batch transaction (BR-04, BR-05). Fees are a stub (BR-07).

var DIVISOR = 1200;              // 12 months x 100 (percent)
var FALLBACK_GROUP = 'STANDARD';
var INTEREST_TYPE = '07';
var INTEREST_CATEGORY = 12;
var INTEREST_SOURCE = 'Batch';

function pad(s, n) {
  s = String(s);
  while (s.length < n) s = '0' + s;
  return s;
}

// PARM (X(10)) - interestRunDate configuration parameter, default = legacy JCL PARM.
var runDate = input.interestRunDate ? String(input.interestRunDate).trim() : '';
if (runDate === '') runDate = '2022071800';
while (runDate.length < 10) runDate += ' ';
runDate = runDate.substring(0, 10);

// Legacy Z-GET-DB2-FORMAT-TIMESTAMP: YYYY-MM-DD-HH.MM.SS.hh0000 (current time).
function db2Timestamp() {
  var d = new Date();
  return d.getFullYear() + '-' + pad(d.getMonth() + 1, 2) + '-' + pad(d.getDate(), 2) + '-' +
    pad(d.getHours(), 2) + '.' + pad(d.getMinutes(), 2) + '.' + pad(d.getSeconds(), 2) + '.' +
    pad(Math.floor(d.getMilliseconds() / 10), 2) + '0000';
}
var ts = input.processingTimestamp ? String(input.processingTimestamp) : db2Timestamp();

// balance (cents) x rate (hundredths of a percent) / 1200 -> cents, truncated toward zero.
function monthlyInterest(balCents, rateHundredths) {
  var den = 100 * DIVISOR;
  if (typeof BigInt === 'function') {
    return Number(BigInt(balCents) * BigInt(rateHundredths) / BigInt(den));
  }
  var p = balCents * rateHundredths;
  return (p < 0 ? -1 : 1) * Math.floor(Math.abs(p) / den);
}

var accountIndex = {};
for (var i = 0; i < input.accounts.length; i++) {
  var a = input.accounts[i];
  if (!(a.acctKey in accountIndex)) accountIndex[a.acctKey] = a;
}

var rates = input.disclosureRates;
var xrefs = input.cardXrefs;

function lookupRate(groupId, typeCd, catKey) {
  var k = String(groupId).trim() + '|' + typeCd + '|' + catKey;
  if (rates[k] !== undefined && rates[k] !== null) return { rate: Number(rates[k]), usedFallback: false, found: true };
  var f = FALLBACK_GROUP + '|' + typeCd + '|' + catKey;
  if (rates[f] !== undefined && rates[f] !== null) return { rate: Number(rates[f]), usedFallback: true, found: true };
  return { rate: 0, usedFallback: true, found: false };
}

var transactions = [];
var accountUpdates = {};
var log = [];
var suffix = 0;

var curKey = null, curAcct = null, curCard = '', totalInterest = 0;

function updateAccount() {
  if (curKey === null || curAcct === null) return;
  accountUpdates[curKey] = {
    currBal: Number(curAcct.currBal) + totalInterest,
    cycCredit: 0,
    cycDebit: 0,
    totalInterest: totalInterest
  };
}

var bals = input.categoryBalances;
for (var j = 0; j < bals.length; j++) {
  var b = bals[j];
  var acctKey = String(b.acctKey);
  if (acctKey !== curKey) {
    updateAccount();
    curKey = acctKey;
    totalInterest = 0;
    curAcct = accountIndex[acctKey] || null;
    if (curAcct === null) log.push('ACCOUNT NOT FOUND: ' + acctKey + ' - its category balances are skipped');
    curCard = (xrefs[acctKey] !== undefined && xrefs[acctKey] !== null) ? String(xrefs[acctKey]) : '';
    if (curAcct !== null && curCard === '') log.push('CARD XREF NOT FOUND for account ' + acctKey + ' - card_num left blank');
  }
  if (curAcct === null) continue;

  var typeCd = String(b.typeCd), catKey = String(b.catKey);
  var r = lookupRate(curAcct.groupId, typeCd, catKey);
  if (!r.found) log.push('NO RATE for ' + curAcct.groupId + '/' + FALLBACK_GROUP + ' ' + typeCd + '/' + catKey + ' - rate 0 used');
  if (r.rate !== 0) {
    var interest = monthlyInterest(Number(b.bal), r.rate);
    totalInterest += interest;
    suffix += 1;
    transactions.push({
      tranId: runDate + pad(suffix, 6),
      typeCd: INTEREST_TYPE,
      catCd: INTEREST_CATEGORY,
      source: INTEREST_SOURCE,
      desc: 'Accrued int ' + acctKey,
      amt: interest,
      merchantId: 0,
      merchantName: '',
      merchantCity: '',
      merchantZip: '',
      cardNum: curCard,
      origTs: ts,
      procTs: ts
    });
  }
  // 1400-COMPUTE-FEES: legacy stub, no fee charged (BR-07).
}
updateAccount();

output.interestTransactions = transactions;
output.accountUpdates = accountUpdates;
output.calculationLog = log;
