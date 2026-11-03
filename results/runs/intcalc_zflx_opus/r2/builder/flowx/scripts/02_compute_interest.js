// SCRIPT node "Compute interest" (wiki nodes 3 "For each account" + 4 "Compute Interest").
// Walks the category balances in key order (acct, type, cat), like the sequential read of the
// TCATBALF KSDS in CBACT04C. Per category balance: rate = DISCGRP(acct group, type, cat), falling
// back to group 'DEFAULT'; when rate != 0, monthly interest = bal * rate / 1200 truncated to cents,
// and one interest transaction is written. See assumptions.md A1-A12.

var st = JSON.parse(String(input.parsed));
var parmDate = String(input.parmDate || '');
while (parmDate.length < 10) parmDate += ' ';
parmDate = parmDate.substring(0, 10);

function pad(s, n) { s = String(s); while (s.length < n) s += ' '; return s.substring(0, n); }
function zeroPad(v, n) { var s = String(v); while (s.length < n) s = '0' + s; return s; }

// bal (cents) * rate (hundredths of %) / 1200 -> cents, truncated toward zero (COBOL COMPUTE, no ROUNDED)
// cents * rateH / 100 / 1200 = cents * rateH / 120000
function monthlyInterest(balCents, rateH) {
  if (typeof BigInt === 'function') {
    var q = BigInt(balCents) * BigInt(rateH) / BigInt(120000); // BigInt division truncates toward zero
    return Number(q);
  }
  var p = balCents * rateH;
  return p < 0 ? -Math.floor(-p / 120000) : Math.floor(p / 120000);
}

// DB2-format timestamp YYYY-MM-DD-HH.MM.SS.hh0000 (CBACT04C Z-GET-DB2-FORMAT-TIMESTAMP)
function db2Ts() {
  if (input.runTimestamp) return String(input.runTimestamp);
  var d = new Date();
  return d.getFullYear() + '-' + zeroPad(d.getMonth() + 1, 2) + '-' + zeroPad(d.getDate(), 2) + '-' +
    zeroPad(d.getHours(), 2) + '.' + zeroPad(d.getMinutes(), 2) + '.' + zeroPad(d.getSeconds(), 2) + '.' +
    zeroPad(Math.floor(d.getMilliseconds() / 10), 2) + '0000';
}

var acctById = {};
for (var i = 0; i < st.accounts.length; i++) {
  if (!acctById.hasOwnProperty(st.accounts[i].acctId)) acctById[st.accounts[i].acctId] = st.accounts[i];
}

// Alternate index on XREF-ACCT-ID: first card in primary-key (card number) order
var xs = st.xref.slice().sort(function (a, b) { return a.cardNum < b.cardNum ? -1 : a.cardNum > b.cardNum ? 1 : 0; });
var cardByAcct = {};
for (var x = 0; x < xs.length; x++) {
  if (!cardByAcct.hasOwnProperty(xs[x].acctId)) cardByAcct[xs[x].acctId] = xs[x].cardNum;
}

var rateByKey = {};
for (var g = 0; g < st.discgrp.length; g++) {
  var dg = st.discgrp[g];
  var k = pad(dg.groupId, 10) + pad(dg.typeCd, 2) + zeroPad(dg.catCd, 4);
  if (!rateByKey.hasOwnProperty(k)) rateByKey[k] = dg.rate;
}
function lookupRate(groupId, typeCd, catCd) {
  var k = pad(groupId, 10) + pad(typeCd, 2) + zeroPad(catCd, 4);
  if (rateByKey.hasOwnProperty(k)) return rateByKey[k];
  var dk = pad('DEFAULT', 10) + pad(typeCd, 2) + zeroPad(catCd, 4);
  if (rateByKey.hasOwnProperty(dk)) return rateByKey[dk];
  return 0; // neither the group nor DEFAULT is configured: no interest (legacy would abend)
}

var cats = st.tcatbal.slice().sort(function (a, b) {
  if (a.acctId !== b.acctId) return a.acctId - b.acctId;
  if (a.typeCd !== b.typeCd) return a.typeCd < b.typeCd ? -1 : 1;
  return a.catCd - b.catCd;
});

var ts = db2Ts();
var suffix = 0;
var transactions = [];
var interestByAcct = {}; // acctId -> total interest (cents); presence = account was processed
var skipped = [];

for (var c = 0; c < cats.length; c++) {
  var cb = cats[c];
  var acct = acctById[cb.acctId];
  if (!acct) { skipped.push(cb.acctId); continue; }
  if (!interestByAcct.hasOwnProperty(cb.acctId)) interestByAcct[cb.acctId] = 0;
  var rate = lookupRate(acct.groupId, cb.typeCd, cb.catCd);
  if (rate === 0) continue;
  var interest = monthlyInterest(cb.bal, rate);
  interestByAcct[cb.acctId] += interest;
  suffix += 1;
  transactions.push({
    tranId: parmDate + zeroPad(suffix, 6),
    typeCd: '01',
    catCd: 5,
    source: 'System',
    desc: 'Int. for a/c ' + zeroPad(acct.acctId, 11),
    amt: interest,
    merchantId: 0,
    merchantName: '',
    merchantCity: '',
    merchantZip: '',
    cardNum: cardByAcct.hasOwnProperty(cb.acctId) ? cardByAcct[cb.acctId] : '',
    origTs: ts,
    procTs: ts
  });
}

output.computed = JSON.stringify({ accounts: st.accounts, transactions: transactions, interestByAcct: interestByAcct, skippedAccounts: skipped });
