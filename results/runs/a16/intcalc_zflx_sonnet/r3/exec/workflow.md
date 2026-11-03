# Workflow: interest-calculation

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** P-15 / INTCALC (CBACT04C): per account/type/category balance, look up disclosure-group rate (DEFAULT fallback), compute monthly interest, post system transactions (type 01, cat 05) and update account balance resetting cycle credit/debit. Inputs: fixed-width acctdata/tcatbal/discgrp/cardxref text + interestRunDate. Output: intcalc_systran[] and intcalc_acctdata[] in CONTRACT.md format.

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae122f13695c563ea5093c0 | <uuid> | (0, 0) | → Load input files (seq:<uuid>) |
| Load input files | SCRIPT | 6ae122f33695c563ea5093c1 | <uuid> | (500, 0) | → Compute interest and update accounts (seq:<uuid>) | lang: JAVASCRIPT |
| Compute interest and update accounts | SCRIPT | 6ae122f63695c563ea5093c2 | <uuid> | (1000, 0) | → Format contract outputs (seq:<uuid>) | lang: JAVASCRIPT |
| Format contract outputs | SCRIPT | 6ae122f93695c563ea5093c3 | <uuid> | (1500, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae122fb3695c563ea5093c4 | <uuid> | (2000, 0) | — |

## Systems
_(none)_

## Scripts

### Load input files (SCRIPT, id=6ae122f33695c563ea5093c1)

```javascript
// Parse the fixed-width input files (copybook layouts) into plain records.
// Amounts are kept as integers in their implied-decimal unit (cents / hundredths of a percent).
function recLines(text, width) {
  if (text === null || text === undefined) return [];
  var raw = String(text).split(/\r?\n/);
  var out = [];
  for (var i = 0; i < raw.length; i++) {
    var l = raw[i];
    if (l.replace(/\s+$/, '').length === 0) continue;
    while (l.length < width) l += ' ';
    out.push(l);
  }
  return out;
}
function rtrim(s) { return String(s).replace(/\s+$/, ''); }
// Signed zoned decimal (trailing overpunch): { = +0, A-I = +1..9, } = -0, J-R = -1..9.
function signedInt(field) {
  var t = String(field).trim();
  if (t.length === 0) return 0;
  var neg = false;
  if (t.charAt(0) === '-' || t.charAt(0) === '+') { neg = t.charAt(0) === '-'; t = t.substring(1); }
  else if (t.charAt(t.length - 1) === '-' || t.charAt(t.length - 1) === '+') { neg = t.charAt(t.length - 1) === '-'; t = t.substring(0, t.length - 1); }
  var pos = '{ABCDEFGHI', negs = '}JKLMNOPQR';
  var last = t.charAt(t.length - 1), d;
  if (pos.indexOf(last) >= 0) d = String(pos.indexOf(last));
  else if (negs.indexOf(last) >= 0) { d = String(negs.indexOf(last)); neg = true; }
  else d = last;
  var digits = (t.substring(0, t.length - 1) + d).replace(/[^0-9]/g, '');
  var v = digits.length ? parseInt(digits, 10) : 0;
  return neg ? -v : v;
}

// CVACT01Y - 300 bytes
var accounts = [];
var al = recLines(input.acctdata, 300);
for (var i = 0; i < al.length; i++) {
  var l = al[i];
  accounts.push({
    acctId: l.substring(0, 11),
    activeStatus: l.substring(11, 12),
    currBal: signedInt(l.substring(12, 24)),
    creditLimit: signedInt(l.substring(24, 36)),
    cashCreditLimit: signedInt(l.substring(36, 48)),
    openDate: rtrim(l.substring(48, 58)),
    expirationDate: rtrim(l.substring(58, 68)),
    reissueDate: rtrim(l.substring(68, 78)),
    currCycCredit: signedInt(l.substring(78, 90)),
    currCycDebit: signedInt(l.substring(90, 102)),
    addrZip: rtrim(l.substring(102, 112)),
    groupId: rtrim(l.substring(112, 122))
  });
}

// CVTRA01Y - 50 bytes
var balances = [];
var bl = recLines(input.tcatbal, 50);
for (var j = 0; j < bl.length; j++) {
  var b = bl[j];
  balances.push({
    acctId: b.substring(0, 11),
    typeCd: b.substring(11, 13),
    catCd: b.substring(13, 17),
    bal: signedInt(b.substring(17, 28))
  });
}

// CVTRA02Y - 50 bytes
var discGroups = [];
var dl = recLines(input.discgrp, 50);
for (var k = 0; k < dl.length; k++) {
  var g = dl[k];
  discGroups.push({
    groupId: rtrim(g.substring(0, 10)),
    typeCd: g.substring(10, 12),
    catCd: g.substring(12, 16),
    rate: signedInt(g.substring(16, 22))
  });
}

// CVACT03Y - 50 bytes
var xrefs = [];
var xl = recLines(input.cardxref, 50);
for (var m = 0; m < xl.length; m++) {
  var x = xl[m];
  xrefs.push({ cardNum: rtrim(x.substring(0, 16)), custId: x.substring(16, 25), acctId: x.substring(25, 36) });
}

output.accounts = accounts;
output.balances = balances;
output.discGroups = discGroups;
output.xrefs = xrefs;

```

### Compute interest and update accounts (SCRIPT, id=6ae122f63695c563ea5093c2)

```javascript
// P-15 interest-calculation (CBACT04C). Amounts in cents, rates in hundredths of a percent.
var DIVISOR = 1200;           // 12 months x 100 (BR-03)
var INT_TYPE = '01', INT_CAT = 5, INT_SOURCE = 'System';

function n(v) { return Number(v); }
function s(v) { return v === null || v === undefined ? '' : String(v); }
function pad(v, w) { var t = String(v); while (t.length < w) t = '0' + t; return t; }

// BR-05: transaction id prefix = run date PARM (Configuration Parameter interestRunDate), 10 chars.
var runDate = s(input.interestRunDate).trim();
if (runDate.length === 0) runDate = '2022071800';
runDate = runDate.substring(0, 10);

// Run timestamp, DB2 format YYYY-MM-DD-HH.MM.SS.hh0000 (legacy Z-GET-DB2-FORMAT-TIMESTAMP)
var d = new Date();
var ts = d.getFullYear() + '-' + pad(d.getMonth() + 1, 2) + '-' + pad(d.getDate(), 2) + '-' +
  pad(d.getHours(), 2) + '.' + pad(d.getMinutes(), 2) + '.' + pad(d.getSeconds(), 2) + '.' +
  pad(Math.floor(d.getMilliseconds() / 10), 2) + '0000';

// --- copy inputs into plain JS objects
var accounts = [], acctByKey = {};
for (var i = 0; i < input.accounts.length; i++) {
  var a = input.accounts[i];
  var c = {
    acctId: s(a.acctId), activeStatus: s(a.activeStatus), currBal: n(a.currBal), creditLimit: n(a.creditLimit),
    cashCreditLimit: n(a.cashCreditLimit), openDate: s(a.openDate), expirationDate: s(a.expirationDate),
    reissueDate: s(a.reissueDate), currCycCredit: n(a.currCycCredit), currCycDebit: n(a.currCycDebit),
    addrZip: s(a.addrZip), groupId: s(a.groupId)
  };
  accounts.push(c);
  if (!acctByKey.hasOwnProperty(c.acctId)) acctByKey[c.acctId] = c;
}
var rates = {};
for (var j = 0; j < input.discGroups.length; j++) {
  var g = input.discGroups[j];
  var gk = s(g.groupId) + '|' + s(g.typeCd) + '|' + s(g.catCd);
  if (!rates.hasOwnProperty(gk)) rates[gk] = n(g.rate);
}
var cardByAcct = {};
for (var x = 0; x < input.xrefs.length; x++) {
  var xr = input.xrefs[x];
  if (!cardByAcct.hasOwnProperty(s(xr.acctId))) cardByAcct[s(xr.acctId)] = s(xr.cardNum);
}
var balances = [];
for (var k = 0; k < input.balances.length; k++) {
  var b = input.balances[k];
  balances.push({ acctId: s(b.acctId), typeCd: s(b.typeCd), catCd: s(b.catCd), bal: n(b.bal) });
}
// TCATBAL is a KSDS read sequentially: key order acctId + typeCd + catCd
balances.sort(function (p, q) {
  var kp = p.acctId + p.typeCd + p.catCd, kq = q.acctId + q.typeCd + q.catCd;
  return kp < kq ? -1 : (kp > kq ? 1 : 0);
});

// BR-01/BR-02: rate lookup with DEFAULT fallback
function lookupRate(groupId, typeCd, catCd) {
  var key = groupId + '|' + typeCd + '|' + catCd;
  if (rates.hasOwnProperty(key)) return { rate: rates[key], usedFallback: false, found: true };
  var dk = 'DEFAULT|' + typeCd + '|' + catCd;
  if (rates.hasOwnProperty(dk)) return { rate: rates[dk], usedFallback: true, found: true };
  return { rate: 0, usedFallback: true, found: false };
}

// BR-03/BR-08: (balance x rate) / 1200, rounded to the cent, halves away from zero.
// balCents * rateHundredths / 120000 = interest in cents.
function interestCents(balCents, rateHund) {
  var den = 120000;
  if (typeof BigInt === 'function') {
    var num = BigInt(balCents) * BigInt(rateHund);
    var neg = num < BigInt(0);
    if (neg) num = -num;
    var q = (num + BigInt(den / 2)) / BigInt(den);
    var r = Number(q);
    return neg ? -r : r;
  }
  var prod = balCents * rateHund;
  var mag = Math.floor((Math.abs(prod) + den / 2) / den);
  return prod < 0 ? -mag : mag;
}

var systran = [], issues = [], updatedAccts = [];
var suffix = 0, lastAcct = null, totalInt = 0, fallbackCount = 0;

// BR-06: at each change of account post the accumulated interest and reset the cycle totals
function updateAccount(acctId) {
  var acct = acctByKey[acctId];
  if (!acct) return;
  acct.currBal = acct.currBal + totalInt;
  acct.currCycCredit = 0;
  acct.currCycDebit = 0;
  updatedAccts.push(acctId);
}

for (var r = 0; r < balances.length; r++) {
  var bal = balances[r];
  if (bal.acctId !== lastAcct) {
    if (lastAcct !== null) updateAccount(lastAcct);
    totalInt = 0;
    lastAcct = bal.acctId;
  }
  var acct = acctByKey[bal.acctId];
  if (!acct) { issues.push('ACCOUNT NOT FOUND ' + bal.acctId + ': balance ' + bal.typeCd + '/' + bal.catCd + ' skipped'); continue; }
  var lr = lookupRate(acct.groupId, bal.typeCd, bal.catCd);
  if (!lr.found) issues.push('NO DISCLOSURE RATE for ' + acct.groupId + '/DEFAULT ' + bal.typeCd + '/' + bal.catCd + ' (acct ' + bal.acctId + '): rate 0 used');
  if (lr.usedFallback && lr.found) fallbackCount++;
  if (lr.rate !== 0) {
    var interest = interestCents(bal.bal, lr.rate);
    totalInt += interest;
    suffix++;
    var card = cardByAcct.hasOwnProperty(bal.acctId) ? cardByAcct[bal.acctId] : '';
    if (card === '') issues.push('CARD XREF NOT FOUND for acct ' + bal.acctId + ': card_num left blank');
    // BR-04 interest transaction
    systran.push({
      tranId: runDate + pad(suffix, 6), typeCd: INT_TYPE, catCd: INT_CAT, source: INT_SOURCE,
      desc: 'Int. for a/c ' + bal.acctId, amtCents: interest, merchantId: 0, merchantName: '',
      merchantCity: '', merchantZip: '', cardNum: card, origTs: ts, procTs: ts
    });
  }
  // BR-07: 1400-COMPUTE-FEES is an empty stub - no fees charged
}
if (lastAcct !== null) updateAccount(lastAcct);

output.calc = {
  systran: systran,
  accounts: accounts,
  summary: {
    runDate: runDate, balancesRead: balances.length, transactionsWritten: systran.length,
    accountsUpdated: updatedAccts.length, defaultRateLookups: fallbackCount, issues: issues
  }
};

```

### Format contract outputs (SCRIPT, id=6ae122f93695c563ea5093c3)

```javascript
// Shape the results as the CONTRACT.md outputs: intcalc_systran.json and intcalc_acctdata.json.
function amt(c) {
  var v = Number(c), neg = v < 0, a = Math.abs(v);
  var cents = a % 100;
  return (neg ? '-' : '') + Math.floor(a / 100) + '.' + (cents < 10 ? '0' : '') + cents;
}
function s(v) { return v === null || v === undefined ? '' : String(v); }
var calc = input.calc;

var systran = [];
for (var i = 0; i < calc.systran.length; i++) {
  var t = calc.systran[i];
  systran.push({
    tran_id: s(t.tranId), type_cd: s(t.typeCd), cat_cd: Number(t.catCd), source: s(t.source),
    desc: s(t.desc), amt: amt(t.amtCents), merchant_id: Number(t.merchantId),
    merchant_name: s(t.merchantName), merchant_city: s(t.merchantCity), merchant_zip: s(t.merchantZip),
    card_num: s(t.cardNum), orig_ts: s(t.origTs), proc_ts: s(t.procTs)
  });
}
var acctdata = [];
for (var j = 0; j < calc.accounts.length; j++) {
  var a = calc.accounts[j];
  acctdata.push({
    acct_id: parseInt(s(a.acctId), 10), active_status: s(a.activeStatus), curr_bal: amt(a.currBal),
    credit_limit: amt(a.creditLimit), cash_credit_limit: amt(a.cashCreditLimit), open_date: s(a.openDate),
    expiration_date: s(a.expirationDate), reissue_date: s(a.reissueDate),
    curr_cyc_credit: amt(a.currCycCredit), curr_cyc_debit: amt(a.currCycDebit),
    addr_zip: s(a.addrZip), group_id: s(a.groupId)
  });
}
var sm = calc.summary, issues = [];
for (var k = 0; k < sm.issues.length; k++) issues.push(s(sm.issues[k]));

output.result = {
  intcalc_systran: systran,
  intcalc_acctdata: acctdata,
  summary: {
    runDate: s(sm.runDate), balancesRead: Number(sm.balancesRead), transactionsWritten: Number(sm.transactionsWritten),
    accountsUpdated: Number(sm.accountsUpdated), defaultRateLookups: Number(sm.defaultRateLookups), issues: issues
  }
};
// Drop the bulky intermediates so they are not returned with the run.
output.accounts = null; output.balances = null; output.discGroups = null; output.xrefs = null; output.calc = null;

```

_(server: 247 ms, 1 API call, 245 ms in API)_
