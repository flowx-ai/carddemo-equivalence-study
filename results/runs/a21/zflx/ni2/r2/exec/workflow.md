# Workflow: intcalc_interest_calculation

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** CardDemo INTCALC / CBACT04C (P-15): monthly interest per account/type/category balance, posts system interest transactions (01/05) and updates accounts. Input: fixed-width file contents (acctdata, tcatbal, discgrp, cardxref) + interestRunDate. Output: intcalc_systran + intcalc_acctdata.

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae1d65d3695c563ea50aa0e | <uuid> | (0, 0) | → Parse input files (seq:<uuid>) |
| Parse input files | SCRIPT | 6ae1d6613695c563ea50aa0f | <uuid> | (500, 0) | → Compute interest and update accounts (seq:<uuid>) | lang: JAVASCRIPT |
| Compute interest and update accounts | SCRIPT | 6ae1d6653695c563ea50aa10 | <uuid> | (1000, 0) | → Format contract outputs (seq:<uuid>) | lang: JAVASCRIPT |
| Format contract outputs | SCRIPT | 6ae1d6693695c563ea50aa11 | <uuid> | (1500, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae1d66d3695c563ea50aa12 | <uuid> | (2000, 0) | — |

## Systems
_(none)_

## Scripts

### Parse input files (SCRIPT, id=6ae1d6613695c563ea50aa0f)

```javascript
// Parse the fixed-width input files (one record per line, copybook layouts).
// Amounts are decoded from zoned decimal (signed overpunch) into integer strings
// in units of the field's scale (cents for V99), so no float is ever involved.
var warnings = [];

function recordsOf(text, name) {
  if (text === null || text === undefined) return [];
  var raw = String(text).split(/\r?\n/);
  var out = [];
  for (var i = 0; i < raw.length; i++) {
    if (raw[i].replace(/\s+$/, '').length > 0) out.push(raw[i]);
  }
  return out;
}

function fld(rec, start, len) {
  var s = rec.substring(start, start + len);
  while (s.length < len) s += ' ';
  return s;
}

function rtrim(s) { return s.replace(/\s+$/, ''); }

// Zoned decimal with implied scale -> BigInt string of scaled units.
var POS = '{ABCDEFGHI', NEG = '}JKLMNOPQR', ANEG = 'pqrstuvwxy';
function zoned(field, scale, where) {
  var t = field.trim();
  if (t.length === 0) return '0';
  var neg = false;
  if (t.charAt(0) === '-' || t.charAt(0) === '+') { neg = t.charAt(0) === '-'; t = t.substring(1).trim(); }
  if (t.indexOf('.') >= 0) {
    // Already an explicit decimal: scale it ourselves.
    var parts = t.split('.');
    var frac = (parts[1] || '').replace(/[^0-9]/g, '');
    while (frac.length < scale) frac += '0';
    var digitsD = (parts[0].replace(/[^0-9]/g, '') || '0') + frac.substring(0, scale);
    var vD = BigInt(digitsD);
    return (neg ? -vD : vD).toString();
  }
  var last = t.charAt(t.length - 1), d;
  if (POS.indexOf(last) >= 0) d = POS.indexOf(last);
  else if (NEG.indexOf(last) >= 0) { d = NEG.indexOf(last); neg = true; }
  else if (ANEG.indexOf(last) >= 0) { d = ANEG.indexOf(last); neg = true; }
  else if (last >= '0' && last <= '9') d = last.charCodeAt(0) - 48;
  else { warnings.push('Unreadable numeric "' + field + '" at ' + where + '; treated as 0'); return '0'; }
  var body = t.substring(0, t.length - 1);
  if (!/^[0-9]*$/.test(body)) { warnings.push('Unreadable numeric "' + field + '" at ' + where + '; treated as 0'); return '0'; }
  var v = BigInt((body || '0') + String(d));
  return (neg ? -v : v).toString();
}

function unsignedNum(field) {
  var t = field.trim();
  return /^[0-9]+$/.test(t) ? t : null;
}

// CVACT01Y (300 bytes)
var accounts = [];
var acctRecs = recordsOf(input.acctdata, 'acctdata');
for (var i = 0; i < acctRecs.length; i++) {
  var r = acctRecs[i], w = 'acctdata line ' + (i + 1);
  var id = unsignedNum(fld(r, 0, 11));
  if (id === null) { warnings.push('Skipped ' + w + ': non-numeric ACCT-ID'); continue; }
  accounts.push({
    acctId: id,
    activeStatus: fld(r, 11, 1),
    currBal: zoned(fld(r, 12, 12), 2, w + ' ACCT-CURR-BAL'),
    creditLimit: zoned(fld(r, 24, 12), 2, w + ' ACCT-CREDIT-LIMIT'),
    cashCreditLimit: zoned(fld(r, 36, 12), 2, w + ' ACCT-CASH-CREDIT-LIMIT'),
    openDate: rtrim(fld(r, 48, 10)),
    expirationDate: rtrim(fld(r, 58, 10)),
    reissueDate: rtrim(fld(r, 68, 10)),
    currCycCredit: zoned(fld(r, 78, 12), 2, w + ' ACCT-CURR-CYC-CREDIT'),
    currCycDebit: zoned(fld(r, 90, 12), 2, w + ' ACCT-CURR-CYC-DEBIT'),
    addrZip: rtrim(fld(r, 102, 10)),
    groupId: rtrim(fld(r, 112, 10))
  });
}

// CVTRA01Y (50 bytes)
var balances = [];
var balRecs = recordsOf(input.tcatbal, 'tcatbal');
for (var j = 0; j < balRecs.length; j++) {
  var b = balRecs[j], wb = 'tcatbal line ' + (j + 1);
  var bid = unsignedNum(fld(b, 0, 11));
  if (bid === null) { warnings.push('Skipped ' + wb + ': non-numeric TRANCAT-ACCT-ID'); continue; }
  balances.push({
    acctId: bid,
    typeCd: fld(b, 11, 2),
    catCd: fld(b, 13, 4),
    bal: zoned(fld(b, 17, 11), 2, wb + ' TRAN-CAT-BAL')
  });
}

// CVTRA02Y (50 bytes): key group + type + category -> rate in hundredths of a percent
var rates = {};
var dgRecs = recordsOf(input.discgrp, 'discgrp');
for (var k = 0; k < dgRecs.length; k++) {
  var g = dgRecs[k], wg = 'discgrp line ' + (k + 1);
  var key = rtrim(fld(g, 0, 10)) + '|' + fld(g, 10, 2) + '|' + fld(g, 12, 4);
  if (rates[key] !== undefined) warnings.push('Duplicate disclosure key ' + key + ' at ' + wg + '; first kept');
  else rates[key] = zoned(fld(g, 16, 6), 2, wg + ' DIS-INT-RATE');
}

// CVACT03Y (50 bytes): account -> card number (lowest card number for the account)
var cardByAcct = {};
var xRecs = recordsOf(input.cardxref, 'cardxref');
for (var x = 0; x < xRecs.length; x++) {
  var c = xRecs[x];
  var xacct = unsignedNum(fld(c, 25, 11));
  if (xacct === null) continue;
  var card = rtrim(fld(c, 0, 16));
  if (cardByAcct[xacct] === undefined || card < cardByAcct[xacct]) cardByAcct[xacct] = card;
}

output.accounts = accounts;
output.balances = balances;
output.rates = rates;
output.cardByAcct = cardByAcct;
output.parseWarnings = warnings;
// Drop the raw file text so it does not ride along through the rest of the run.
output.acctdata = null;
output.tcatbal = null;
output.discgrp = null;
output.cardxref = null;

```

### Compute interest and update accounts (SCRIPT, id=6ae1d6653695c563ea50aa10)

```javascript
// P-15 interest-calculation (CBACT04C), BR-01..BR-08.
// Money is integer cents (BigInt); rates are integer hundredths of a percent.
var warnings = [];
var DIVISOR = 1200; // 12 months x 100 (percent)

function pad2(n) { return (n < 10 ? '0' : '') + n; }
function padLeft(s, n, ch) { s = String(s); while (s.length < n) s = ch + s; return s; }

// Run date from the INTCALC PARM / interestRunDate Configuration Parameter (e.g. 2022071800).
var runParm = input.interestRunDate ? String(input.interestRunDate).trim() : '';
if (!/^[0-9]{8}/.test(runParm)) {
  if (runParm) warnings.push('interestRunDate "' + runParm + '" unreadable; default 2022071800 used');
  runParm = '2022071800';
}
var tranIdPrefix = (runParm + '0000000000').substring(0, 10);
var ry = parseInt(runParm.substring(0, 4), 10), rm = parseInt(runParm.substring(4, 6), 10), rd = parseInt(runParm.substring(6, 8), 10);
// BR-03 cut-off: same calendar date ten years before the run date (29 Feb -> 28 Feb).
var cy = ry - 10;
var lastDay = new Date(Date.UTC(cy, rm, 0)).getUTCDate();
var cutoff = cy + '-' + pad2(rm) + '-' + pad2(Math.min(rd, lastDay));

// Accounts keyed by id, original order kept for the output.
var accounts = [];
var byId = {};
for (var i = 0; i < input.accounts.length; i++) {
  var a = input.accounts[i];
  var acc = {
    acctId: String(a.acctId), activeStatus: String(a.activeStatus),
    currBal: BigInt(String(a.currBal)), creditLimit: String(a.creditLimit), cashCreditLimit: String(a.cashCreditLimit),
    openDate: String(a.openDate), expirationDate: String(a.expirationDate), reissueDate: String(a.reissueDate),
    currCycCredit: BigInt(String(a.currCycCredit)), currCycDebit: BigInt(String(a.currCycDebit)),
    addrZip: String(a.addrZip), groupId: String(a.groupId)
  };
  accounts.push(acc);
  if (byId[acc.acctId] === undefined) byId[acc.acctId] = acc;
  else warnings.push('Duplicate account ' + acc.acctId + '; first record is updated');
}

// Balances in key order (accountId + typeCode + categoryCode), as a KSDS read returns them.
var balances = [];
for (var j = 0; j < input.balances.length; j++) {
  var b = input.balances[j];
  balances.push({ acctId: String(b.acctId), typeCd: String(b.typeCd), catCd: String(b.catCd), bal: BigInt(String(b.bal)), seq: j });
}
balances.sort(function (p, q) {
  var kp = p.acctId + p.typeCd + p.catCd, kq = q.acctId + q.typeCd + q.catCd;
  return kp < kq ? -1 : kp > kq ? 1 : p.seq - q.seq;
});

function rateFor(groupId, typeCd, catCd) {
  var r = input.rates[groupId + '|' + typeCd + '|' + catCd];
  if (r !== undefined && r !== null) return { rate: BigInt(String(r)), usedFallback: false, found: true };
  // BR-02: not found (file status 23) -> retry with group DEFAULT.
  var d = input.rates['DEFAULT|' + typeCd + '|' + catCd];
  if (d !== undefined && d !== null) return { rate: BigInt(String(d)), usedFallback: true, found: true };
  return { rate: 0n, usedFallback: true, found: false };
}

var transactions = [];
var suffix = 0;
var current = null;   // account being accumulated
var totalInterest = 0n;
var fallbackCount = 0;

// BR-06: at each change of account, add the total interest and reset the cycle totals.
function closeAccount() {
  if (current === null) return;
  current.currBal = current.currBal + totalInterest;
  current.currCycCredit = 0n;
  current.currCycDebit = 0n;
  current.updated = true;
}

for (var k = 0; k < balances.length; k++) {
  var bal = balances[k];
  if (current === null || current.acctId !== bal.acctId) {
    closeAccount();
    current = byId[bal.acctId] || null;
    totalInterest = 0n;
    if (current === null) {
      warnings.push('Category balance for unknown account ' + bal.acctId + ' (' + bal.typeCd + '/' + bal.catCd + ') skipped');
      continue;
    }
  }

  // BR-01 / BR-02
  var lookup = rateFor(current.groupId, bal.typeCd, bal.catCd);
  if (lookup.usedFallback) fallbackCount++;
  if (!lookup.found) warnings.push('No disclosure rate for ' + current.groupId + '/' + bal.typeCd + '/' + bal.catCd + ' nor DEFAULT; rate 0 used (account ' + bal.acctId + ')');

  // BR-03: long-standing accounts get the rate reduced by 2.00, never below 0.00.
  var rate = lookup.rate;
  if (/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(current.openDate) && current.openDate <= cutoff) {
    rate = rate - 200n;
    if (rate < 0n) rate = 0n;
  }
  if (rate === 0n) continue;

  // monthlyInterest = (categoryBalance x effectiveRate) / 1200, truncated to cents (BR-08).
  // cents * hundredths / (1200 * 100) -> cents; BigInt division truncates toward zero.
  var interest = (bal.bal * rate) / BigInt(DIVISOR * 100);
  totalInterest = totalInterest + interest;

  // BR-04 / BR-05
  suffix++;
  transactions.push({
    tranId: tranIdPrefix + padLeft(suffix, 6, '0'),
    typeCd: '01',
    catCd: '0005',
    source: 'System',
    desc: 'Int. for a/c ' + bal.acctId,
    amt: interest.toString(),
    cardNum: input.cardByAcct[bal.acctId] !== undefined && input.cardByAcct[bal.acctId] !== null ? String(input.cardByAcct[bal.acctId]) : ''
  });
  if (transactions[transactions.length - 1].cardNum === '') warnings.push('No card cross-reference for account ' + bal.acctId + '; card_num left blank');
}
closeAccount();

var outAccounts = [];
var updated = 0;
for (var m = 0; m < accounts.length; m++) {
  var o = accounts[m];
  if (o.updated) updated++;
  outAccounts.push({
    acctId: o.acctId, activeStatus: o.activeStatus, currBal: o.currBal.toString(),
    creditLimit: o.creditLimit, cashCreditLimit: o.cashCreditLimit,
    openDate: o.openDate, expirationDate: o.expirationDate, reissueDate: o.reissueDate,
    currCycCredit: o.currCycCredit.toString(), currCycDebit: o.currCycDebit.toString(),
    addrZip: o.addrZip, groupId: o.groupId
  });
}

var pw = input.parseWarnings || [];
var allWarnings = [];
for (var w = 0; w < pw.length; w++) allWarnings.push(String(pw[w]));
for (var v = 0; v < warnings.length; v++) allWarnings.push(warnings[v]);

output.interestTransactions = transactions;
output.updatedAccounts = outAccounts;
output.runSummary = {
  interestRunDate: runParm, tenYearCutoff: cutoff,
  balancesRead: balances.length, transactionsWritten: transactions.length,
  accountsUpdated: updated, defaultGroupLookups: fallbackCount
};
output.warnings = allWarnings;
output.accounts = null;
output.balances = null;
output.rates = null;
output.cardByAcct = null;
output.parseWarnings = null;

```

### Format contract outputs (SCRIPT, id=6ae1d6693695c563ea50aa11)

```javascript
// Shape the results into the CONTRACT.md output records.
function money(centsStr) {
  var c = BigInt(String(centsStr));
  var neg = c < 0n;
  var s = (neg ? -c : c).toString();
  while (s.length < 3) s = '0' + s;
  return (neg ? '-' : '') + s.substring(0, s.length - 2) + '.' + s.substring(s.length - 2);
}
function p(n, w) { n = String(n); while (n.length < w) n = '0' + n; return n; }

// DB2-style timestamp (YYYY-MM-DD-HH.MM.SS.ffffff), UTC, one per run.
var now = new Date();
var ts = now.getUTCFullYear() + '-' + p(now.getUTCMonth() + 1, 2) + '-' + p(now.getUTCDate(), 2) + '-' +
  p(now.getUTCHours(), 2) + '.' + p(now.getUTCMinutes(), 2) + '.' + p(now.getUTCSeconds(), 2) + '.' +
  p(now.getUTCMilliseconds(), 3) + '000';

var systran = [];
var tx = input.interestTransactions;
for (var i = 0; i < tx.length; i++) {
  var t = tx[i];
  systran.push({
    tran_id: String(t.tranId),
    type_cd: String(t.typeCd),
    cat_cd: parseInt(String(t.catCd), 10),
    source: String(t.source),
    desc: String(t.desc),
    amt: money(t.amt),
    merchant_id: 0,
    merchant_name: '',
    merchant_city: '',
    merchant_zip: '',
    card_num: String(t.cardNum),
    orig_ts: ts,
    proc_ts: ts
  });
}

var acctdata = [];
var ac = input.updatedAccounts;
for (var j = 0; j < ac.length; j++) {
  var a = ac[j];
  acctdata.push({
    acct_id: parseInt(String(a.acctId), 10),
    active_status: String(a.activeStatus),
    curr_bal: money(a.currBal),
    credit_limit: money(a.creditLimit),
    cash_credit_limit: money(a.cashCreditLimit),
    open_date: String(a.openDate),
    expiration_date: String(a.expirationDate),
    reissue_date: String(a.reissueDate),
    curr_cyc_credit: money(a.currCycCredit),
    curr_cyc_debit: money(a.currCycDebit),
    addr_zip: String(a.addrZip),
    group_id: String(a.groupId)
  });
}

var warnings = [];
var wsrc = input.warnings || [];
for (var k = 0; k < wsrc.length; k++) warnings.push(String(wsrc[k]));

output.result = {
  intcalc_systran: systran,
  intcalc_acctdata: acctdata,
  runSummary: input.runSummary,
  warnings: warnings
};
output.interestTransactions = null;
output.updatedAccounts = null;

```

_(server: 266 ms, 1 API call, 261 ms in API)_
