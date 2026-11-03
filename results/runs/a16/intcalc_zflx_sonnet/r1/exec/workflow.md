# Workflow: intcalc_interest_calculation

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** CardDemo INTCALC (CBACT04C, P-15): monthly interest per account/type/category balance with DEFAULT disclosure-group fallback; writes interest system transactions (01/05) and updated accounts. Inputs are the fixed-width tcatbal/acctdata/cardxref/discgrp files + run parm.

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae120a33695c563ea509361 | <uuid> | (0, 0) | → Calculate interest (CBACT04C) (seq:<uuid>) |
| Calculate interest (CBACT04C) | SCRIPT | 6ae120a73695c563ea509362 | <uuid> | (500, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae120aa3695c563ea509363 | <uuid> | (1000, 0) | — |

## Systems
_(none)_

## Scripts

### Calculate interest (CBACT04C) (SCRIPT, id=6ae120a73695c563ea509362)

```javascript
// INTCALC (CBACT04C) — monthly interest calculation, FlowX SCRIPT node "Calculate interest".
// Inputs (workflow state, all STRING): parmDate (INTCALC PARM, e.g. "2022071800"),
//   tcatbal (CVTRA01Y, 50), acctdata (CVACT01Y, 300), cardxref (CVACT03Y, 50), discgrp (CVTRA02Y, 50)
//   — raw fixed-width file contents, one record per line.
// Outputs: intcalc_systran[] (interest transactions), intcalc_acctdata[] (every account after interest),
//   intcalc_summary {counts, warnings}.
// Money is held as BigInt minor units (cents; rates in hundredths of a percent) — no float arithmetic.

var POS_OVERPUNCH = { '{': 0, 'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8, 'I': 9 };
var NEG_OVERPUNCH = { '}': 0, 'J': 1, 'K': 2, 'L': 3, 'M': 4, 'N': 5, 'O': 6, 'P': 7, 'Q': 8, 'R': 9,
                      'p': 0, 'q': 1, 'r': 2, 's': 3, 't': 4, 'u': 5, 'v': 6, 'w': 7, 'x': 8, 'y': 9 };
var warnings = [];

function str(v) { return v === null || v === undefined ? '' : String(v); }

function records(text, len) {
  var out = [];
  var rows = str(text).split(/\r?\n/);
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (r.trim() === '') continue;
    while (r.length < len) r += ' ';
    out.push(r);
  }
  return out;
}

function rtrim(s) { return s.replace(/\s+$/, ''); }

// Signed zoned decimal (sign overpunched on the last byte, as in the CardDemo ASCII data) -> BigInt of
// minor units at the field's implied scale. Also tolerates a leading/trailing +/- and an explicit point.
function zoned(raw, scale, field) {
  var s = raw.trim();
  if (s === '') return 0n;
  var neg = false;
  if (s.charAt(0) === '-' || s.charAt(0) === '+') { neg = s.charAt(0) === '-'; s = s.slice(1); }
  var last = s.charAt(s.length - 1);
  if (last === '-' || last === '+') { neg = last === '-'; s = s.slice(0, -1); last = s.charAt(s.length - 1); }
  if (POS_OVERPUNCH.hasOwnProperty(last)) { s = s.slice(0, -1) + POS_OVERPUNCH[last]; }
  else if (NEG_OVERPUNCH.hasOwnProperty(last)) { s = s.slice(0, -1) + NEG_OVERPUNCH[last]; neg = true; }
  var dot = s.indexOf('.');
  if (dot >= 0) {
    var frac = s.slice(dot + 1);
    while (frac.length < scale) frac += '0';
    s = s.slice(0, dot) + frac.slice(0, scale);
  }
  if (!/^\d+$/.test(s)) {
    warnings.push('Unparseable numeric ' + field + ': "' + raw + '" read as 0');
    return 0n;
  }
  var v = BigInt(s);
  return neg ? -v : v;
}

function money(cents) {
  var neg = cents < 0n;
  var a = neg ? -cents : cents;
  var units = (a / 100n).toString();
  var c = (a % 100n).toString();
  if (c.length < 2) c = '0' + c;
  return (neg ? '-' : '') + units + '.' + c;
}

// BR-08: COMPUTE ... ROUNDED — nearest unit, halves away from zero.
function divRoundHalfAway(n, d) {
  var neg = n < 0n;
  var a = neg ? -n : n;
  var q = a / d;
  if ((a % d) * 2n >= d) q += 1n;
  return neg ? -q : q;
}

function pad2(n) { return (n < 10 ? '0' : '') + n; }

// DB2-style timestamp as written by CBACT04C Z-GET-DB2-FORMAT-TIMESTAMP: YYYY-MM-DD-HH.MM.SS.hh0000
function db2Timestamp(d) {
  return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate()) + '-' +
    pad2(d.getUTCHours()) + '.' + pad2(d.getUTCMinutes()) + '.' + pad2(d.getUTCSeconds()) + '.' +
    pad2(Math.floor(d.getUTCMilliseconds() / 10)) + '0000';
}

// ---- Parse inputs (copybook layouts) ----
var runParm = str(input.parmDate).trim() || '2022071800';

var accounts = [];        // file order, for output
var accountById = {};
var acctRows = records(input.acctdata, 300);
for (var i = 0; i < acctRows.length; i++) {
  var r = acctRows[i];
  var a = {
    id: r.substr(0, 11),
    activeStatus: r.substr(11, 1),
    currBal: zoned(r.substr(12, 12), 2, 'ACCT-CURR-BAL'),
    creditLimit: zoned(r.substr(24, 12), 2, 'ACCT-CREDIT-LIMIT'),
    cashCreditLimit: zoned(r.substr(36, 12), 2, 'ACCT-CASH-CREDIT-LIMIT'),
    openDate: r.substr(48, 10),
    expirationDate: r.substr(58, 10),
    reissueDate: r.substr(68, 10),
    cycCredit: zoned(r.substr(78, 12), 2, 'ACCT-CURR-CYC-CREDIT'),
    cycDebit: zoned(r.substr(90, 12), 2, 'ACCT-CURR-CYC-DEBIT'),
    addrZip: r.substr(102, 10),
    groupId: r.substr(112, 10)
  };
  accounts.push(a);
  accountById[String(Number(a.id))] = a;
}

// Card for an account: replaces the CXACAIX alternate-index read; lowest card number wins.
var cardByAcct = {};
var xrefRows = records(input.cardxref, 50);
for (i = 0; i < xrefRows.length; i++) {
  var card = xrefRows[i].substr(0, 16);
  var xAcct = String(Number(xrefRows[i].substr(25, 11)));
  if (!cardByAcct.hasOwnProperty(xAcct) || card < cardByAcct[xAcct]) cardByAcct[xAcct] = card;
}

function rateKey(group, type, cat) { return group.trim() + '|' + type + '|' + Number(cat); }
var rateByKey = {};
var dgRows = records(input.discgrp, 50);
for (i = 0; i < dgRows.length; i++) {
  var d = dgRows[i];
  rateByKey[rateKey(d.substr(0, 10), d.substr(10, 2), d.substr(12, 4))] = zoned(d.substr(16, 6), 2, 'DIS-INT-RATE');
}

var balances = [];
var tcRows = records(input.tcatbal, 50);
for (i = 0; i < tcRows.length; i++) {
  var t = tcRows[i];
  balances.push({ acctId: t.substr(0, 11), typeCd: t.substr(11, 2), catCd: t.substr(13, 4),
                  bal: zoned(t.substr(17, 11), 2, 'TRAN-CAT-BAL') });
}
// TCATBALF is a KSDS read sequentially: process in key order (account, type, category).
balances.sort(function (x, y) {
  var kx = x.acctId + x.typeCd + x.catCd, ky = y.acctId + y.typeCd + y.catCd;
  return kx < ky ? -1 : (kx > ky ? 1 : 0);
});

// ---- Interest calculation (BR-01..BR-10) ----
var systran = [];
var tranSuffix = 0;
var nowTs = db2Timestamp(new Date());
var usedDefault = 0, zeroRate = 0, skipped = 0, accountsUpdated = 0;
var lastAcctKey = null, lastAcct = null, totalInt = 0n;

function updateAccount(acct, total) {          // BR-06
  acct.currBal = acct.currBal + total;
  acct.cycCredit = 0n;
  acct.cycDebit = 0n;
  accountsUpdated++;
}

for (i = 0; i < balances.length; i++) {
  var b = balances[i];
  var acctKey = String(Number(b.acctId));
  if (acctKey !== lastAcctKey) {
    if (lastAcct) updateAccount(lastAcct, totalInt);
    totalInt = 0n;
    lastAcctKey = acctKey;
    lastAcct = accountById.hasOwnProperty(acctKey) ? accountById[acctKey] : null;
    if (!lastAcct) warnings.push('Account ' + b.acctId + ' not found in acctdata: its category balances are skipped');
  }
  if (!lastAcct) { skipped++; continue; }

  var key = rateKey(lastAcct.groupId, b.typeCd, b.catCd);              // BR-01
  var rate;
  if (rateByKey.hasOwnProperty(key)) {
    rate = rateByKey[key];
  } else {
    var defKey = rateKey('DEFAULT', b.typeCd, b.catCd);                  // BR-02
    usedDefault++;
    if (rateByKey.hasOwnProperty(defKey)) {
      rate = rateByKey[defKey];
    } else {
      rate = 0n;
      warnings.push('No disclosure rate for ' + key + ' nor DEFAULT: no interest for account ' + b.acctId);
    }
  }
  if (rate === 0n) { zeroRate++; continue; }                             // BR-03 / BR-10

  var monthlyInt = divRoundHalfAway(b.bal * rate, 120000n);              // (bal × rate) / 1200, ROUNDED
  totalInt += monthlyInt;
  tranSuffix++;
  var suffix = String(tranSuffix);
  while (suffix.length < 6) suffix = '0' + suffix;
  systran.push({                                                         // BR-04 / BR-05
    tran_id: runParm + suffix,
    type_cd: '01',
    cat_cd: 5,
    source: 'System',
    desc: 'Int. for a/c ' + lastAcct.id,
    amt: money(monthlyInt),
    merchant_id: 0,
    merchant_name: '',
    merchant_city: '',
    merchant_zip: '',
    card_num: cardByAcct.hasOwnProperty(acctKey) ? cardByAcct[acctKey] : '',
    orig_ts: nowTs,
    proc_ts: nowTs
  });
  if (!cardByAcct.hasOwnProperty(acctKey)) warnings.push('No card cross-reference for account ' + b.acctId + ': card_num left blank');
}
if (lastAcct) updateAccount(lastAcct, totalInt);                         // final account at end of file

// BR-07: fees (1400-COMPUTE-FEES) are an empty stub — nothing charged.

var acctOut = [];
for (i = 0; i < accounts.length; i++) {
  var o = accounts[i];
  acctOut.push({
    acct_id: Number(o.id),
    active_status: rtrim(o.activeStatus),
    curr_bal: money(o.currBal),
    credit_limit: money(o.creditLimit),
    cash_credit_limit: money(o.cashCreditLimit),
    open_date: rtrim(o.openDate),
    expiration_date: rtrim(o.expirationDate),
    reissue_date: rtrim(o.reissueDate),
    curr_cyc_credit: money(o.cycCredit),
    curr_cyc_debit: money(o.cycDebit),
    addr_zip: rtrim(o.addrZip),
    group_id: rtrim(o.groupId)
  });
}

output.intcalc_systran = systran;
output.intcalc_acctdata = acctOut;
output.intcalc_summary = {
  runParm: runParm,
  categoryBalancesRead: balances.length,
  interestTransactionsWritten: systran.length,
  accountsRead: accounts.length,
  accountsUpdated: accountsUpdated,
  defaultRateLookups: usedDefault,
  zeroRateBalances: zeroRate,
  balancesSkipped: skipped,
  warnings: warnings
};

```

_(server: 271 ms, 1 API call, 267 ms in API)_
