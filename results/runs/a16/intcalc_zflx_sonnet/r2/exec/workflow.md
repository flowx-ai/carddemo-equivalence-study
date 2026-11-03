# Workflow: intcalc_interest_calculation

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** P-15 interest-calculation (legacy INTCALC / CBACT04C). Reads acctdata, tcatbal, discgrp, cardxref fixed-width files; writes interest system transactions (type 01 / cat 05) and updated accounts.

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae121ad3695c563ea50936e | <uuid> | (0, 0) | → Parse input files (seq:<uuid>) |
| Parse input files | SCRIPT | 6ae121b03695c563ea50936f | <uuid> | (500, 0) | → Compute interest and update accounts (seq:<uuid>) | lang: JAVASCRIPT |
| Compute interest and update accounts | SCRIPT | 6ae121b23695c563ea509370 | <uuid> | (1000, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae121b53695c563ea509371 | <uuid> | (1500, 0) | — |

## Systems
_(none)_

## Scripts

### Parse input files (SCRIPT, id=6ae121b03695c563ea50936f)

```javascript
// SCRIPT node "Parse input files" — workflow intcalc_interest_calculation.
// Parses the fixed-width INTCALC inputs (copybook layouts, one record per line).
// Monetary fields are kept as integer cents (Number) to avoid float drift.

function recordLines(text) {
  if (text === null || text === undefined) return [];
  return String(text).split(/\r?\n/).filter(function (l) {
    return l.replace(/\s+$/, '').length > 0;
  });
}

function padTo(line, len) {
  while (line.length < len) line += ' ';
  return line;
}

function rtrim(s) {
  return String(s).replace(/\s+$/, '');
}

// Signed zoned decimal (COBOL S9(n)V99, trailing overpunch: '{'..'I' = +0..9, '}'..'R' = -0..9)
// -> integer count of hundredths. Also tolerates a plain "-123.45" / "+12345" rendering.
var OVP_POS = '{ABCDEFGHI';
var OVP_NEG = '}JKLMNOPQR';
function zonedCents(raw, scale) {
  var s = String(raw).trim();
  if (s.length === 0) return 0;
  if (s.indexOf('.') >= 0) {
    var f = parseFloat(s);
    return Math.round(f * 100);
  }
  var neg = false;
  if (s.charAt(0) === '-') { neg = true; s = s.substring(1); }
  else if (s.charAt(0) === '+') { s = s.substring(1); }
  var last = s.charAt(s.length - 1);
  var p = OVP_POS.indexOf(last);
  var n = OVP_NEG.indexOf(last);
  if (p >= 0) { s = s.substring(0, s.length - 1) + p; }
  else if (n >= 0) { s = s.substring(0, s.length - 1) + n; neg = true; }
  var v = parseInt(s.replace(/[^0-9]/g, '') || '0', 10);
  // all layouts used here have exactly 2 implied decimals
  return neg ? -v : v;
}

// CVACT01Y — ACCOUNT-RECORD (300)
function parseAccount(l) {
  l = padTo(l, 300);
  return {
    acctId: l.substr(0, 11),
    activeStatus: l.substr(11, 1),
    currBal: zonedCents(l.substr(12, 12)),
    creditLimit: zonedCents(l.substr(24, 12)),
    cashCreditLimit: zonedCents(l.substr(36, 12)),
    openDate: rtrim(l.substr(48, 10)),
    expirationDate: rtrim(l.substr(58, 10)),
    reissueDate: rtrim(l.substr(68, 10)),
    currCycCredit: zonedCents(l.substr(78, 12)),
    currCycDebit: zonedCents(l.substr(90, 12)),
    addrZip: rtrim(l.substr(102, 10)),
    groupId: rtrim(l.substr(112, 10))
  };
}

// CVTRA01Y — TRAN-CAT-BAL-RECORD (50)
function parseCategoryBalance(l) {
  l = padTo(l, 50);
  return {
    acctId: l.substr(0, 11),
    typeCd: l.substr(11, 2),
    catCd: l.substr(13, 4),
    bal: zonedCents(l.substr(17, 11))
  };
}

// CVTRA02Y — DIS-GROUP-RECORD (50)
function parseDisclosureGroup(l) {
  l = padTo(l, 50);
  return {
    groupId: rtrim(l.substr(0, 10)),
    typeCd: l.substr(10, 2),
    catCd: l.substr(12, 4),
    rate: zonedCents(l.substr(16, 6))
  };
}

// CVACT03Y — CARD-XREF-RECORD (50)
function parseXref(l) {
  l = padTo(l, 50);
  return {
    cardNum: rtrim(l.substr(0, 16)),
    custId: l.substr(16, 9),
    acctId: l.substr(25, 11)
  };
}

output.accounts = recordLines(input.acctdataFile).map(parseAccount);
output.categoryBalances = recordLines(input.tcatbalFile).map(parseCategoryBalance);
output.disclosureGroups = recordLines(input.discgrpFile).map(parseDisclosureGroup);
output.cardXrefs = recordLines(input.cardxrefFile).map(parseXref);

```

### Compute interest and update accounts (SCRIPT, id=6ae121b23695c563ea509370)

```javascript
// SCRIPT node "Compute interest and update accounts" — workflow intcalc_interest_calculation.
// P-15 interest-calculation, BR-01..BR-10 (legacy CBACT04C). See assumptions.md (A-xx refs).

var DIVISOR = 1200;            // 12 months x 100 (wiki: constant in script)
var DEFAULT_GROUP = 'DEFAULT'; // BR-02
var runDate = String(input.interestRunDate || '2022071800'); // BR-05, legacy PARM (A-03)
var runDay = runDate.substr(0, 4) + '-' + runDate.substr(4, 2) + '-' + runDate.substr(6, 2);
var tranTs = runDay + '-00.00.00.000000'; // A-08

function list(x) {
  var out = [];
  if (x === null || x === undefined) return out;
  for (var i = 0; i < x.length; i++) out.push(x[i]);
  return out;
}

function lpad(s, len, ch) {
  s = String(s);
  while (s.length < len) s = ch + s;
  return s;
}

function money(cents) {
  var neg = cents < 0;
  var a = Math.abs(cents);
  var s = Math.floor(a / 100) + '.' + lpad(a % 100, 2, '0');
  return neg ? '-' + s : s;
}

// BR-03 + BR-08: (balance x rate) / 1200, rounded to the cent half away from zero.
// balance and rate are both in hundredths, so interest(cents) = balC * rateC / 120000.
function interestCents(balC, rateC) {
  var p = balC * rateC;
  var neg = p < 0;
  var a = Math.abs(p);
  var den = DIVISOR * 100;
  var q = Math.floor(a / den);
  var r = a - q * den;
  if (2 * r >= den) q += 1;
  return neg ? -q : q;
}

// ---- reference data ------------------------------------------------------
var accounts = list(input.accounts).map(function (a) {
  return {
    acctId: String(a.acctId), activeStatus: String(a.activeStatus), currBal: Number(a.currBal),
    creditLimit: Number(a.creditLimit), cashCreditLimit: Number(a.cashCreditLimit),
    openDate: String(a.openDate), expirationDate: String(a.expirationDate),
    reissueDate: String(a.reissueDate),
    currCycCredit: Number(a.currCycCredit), currCycDebit: Number(a.currCycDebit),
    addrZip: String(a.addrZip), groupId: String(a.groupId)
  };
});
var acctById = {};
accounts.forEach(function (a) { acctById[a.acctId] = a; });

var rateByKey = {};
list(input.disclosureGroups).forEach(function (d) {
  rateByKey[d.groupId + '|' + d.typeCd + '|' + d.catCd] = Number(d.rate);
});

var cardByAcct = {};
list(input.cardXrefs).forEach(function (x) {
  if (!(x.acctId in cardByAcct)) cardByAcct[x.acctId] = String(x.cardNum); // A-06: first xref of the account
});

// BR-01 / BR-02: rate lookup with DEFAULT fallback
function lookupRate(groupId, typeCd, catCd) {
  var k = groupId + '|' + typeCd + '|' + catCd;
  if (k in rateByKey) return { rate: rateByKey[k], usedFallback: false, found: true };
  var d = DEFAULT_GROUP + '|' + typeCd + '|' + catCd;
  if (d in rateByKey) return { rate: rateByKey[d], usedFallback: true, found: true };
  return { rate: 0, usedFallback: true, found: false }; // A-05
}

// ---- process balances in key order (TCATBAL is a KSDS: acct + type + cat) --
var balances = list(input.categoryBalances).map(function (b) {
  return { acctId: String(b.acctId), typeCd: String(b.typeCd), catCd: String(b.catCd), bal: Number(b.bal) };
});
balances.sort(function (a, b) {
  var ka = a.acctId + a.typeCd + a.catCd, kb = b.acctId + b.typeCd + b.catCd;
  return ka < kb ? -1 : (ka > kb ? 1 : 0);
});

var systran = [];
var suffix = 0;
var warnings = [];
var totalByAcct = {};
var order = [];

balances.forEach(function (b) {
  var acct = acctById[b.acctId];
  if (!acct) { warnings.push('ACCOUNT NOT FOUND: ' + b.acctId); return; } // A-07
  if (!(b.acctId in totalByAcct)) { totalByAcct[b.acctId] = 0; order.push(b.acctId); }

  var r = lookupRate(acct.groupId, b.typeCd, b.catCd);
  if (!r.found) warnings.push('NO DISCLOSURE RATE (incl. DEFAULT): ' + b.acctId + ' ' + b.typeCd + ' ' + b.catCd);
  if (r.rate === 0) return; // BR-03 / BR-10: no interest when rate is 0

  var interest = interestCents(b.bal, r.rate);
  totalByAcct[b.acctId] += interest;

  suffix += 1; // BR-05: run date + running 6-digit suffix (A-04)
  systran.push({
    tran_id: runDate + lpad(suffix, 6, '0'),
    type_cd: '01',                                   // BR-04
    cat_cd: 5,
    source: 'System',
    desc: 'Int. for a/c ' + b.acctId,
    amt: money(interest),
    merchant_id: 0,                                  // A-06
    merchant_name: '',
    merchant_city: '',
    merchant_zip: '',
    card_num: cardByAcct[b.acctId] || '',
    orig_ts: tranTs,
    proc_ts: tranTs
  });
});

// BR-06: at each change of account — balance += total interest, cycle totals reset
order.forEach(function (id) {
  var a = acctById[id];
  a.currBal = a.currBal + totalByAcct[id];
  a.currCycCredit = 0;
  a.currCycDebit = 0;
});

// BR-07: fees stub — no fee transactions are produced.

output.intcalc_systran = systran;
output.intcalc_acctdata = accounts.map(function (a) {
  return {
    acct_id: parseInt(a.acctId, 10),
    active_status: a.activeStatus,
    curr_bal: money(a.currBal),
    credit_limit: money(a.creditLimit),
    cash_credit_limit: money(a.cashCreditLimit),
    open_date: a.openDate,
    expiration_date: a.expirationDate,
    reissue_date: a.reissueDate,
    curr_cyc_credit: money(a.currCycCredit),
    curr_cyc_debit: money(a.currCycDebit),
    addr_zip: a.addrZip,
    group_id: a.groupId
  };
});
output.runSummary = {
  interestRunDate: runDate,
  balancesRead: balances.length,
  transactionsWritten: systran.length,
  accountsUpdated: order.length,
  warnings: warnings
};
// drop the parsed inputs so they do not travel further in the workflow state
output.accounts = null;
output.categoryBalances = null;
output.disclosureGroups = null;
output.cardXrefs = null;

```

_(server: 404 ms, 1 API call, 401 ms in API)_
