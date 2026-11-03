# Workflow: intcalc_interest_calculation

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** P-15 interest-calculation (legacy INTCALC / CBACT04C). Input: fixed-width acctdata/tcatbal/discgrp/cardxref contents + interestRunDate (PARM). Output: intcalc_systran (interest transactions) and intcalc_acctdata (all accounts after interest).

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae1d7c73695c563ea50aa25 | <uuid> | (0, 0) | → Parse input files (seq:<uuid>) |
| Parse input files | SCRIPT | 6ae1d7d23695c563ea50aa26 | <uuid> | (500, 0) | → Compute interest per category balance (seq:<uuid>) | lang: JAVASCRIPT |
| Compute interest per category balance | SCRIPT | 6ae1d7d53695c563ea50aa27 | <uuid> | (1000, 0) | → Format contract outputs (seq:<uuid>) | lang: JAVASCRIPT |
| Format contract outputs | SCRIPT | 6ae1d7d83695c563ea50aa28 | <uuid> | (1500, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae1d7db3695c563ea50aa29 | <uuid> | (2000, 0) | — |

## Systems
_(none)_

## Scripts

### Parse input files (SCRIPT, id=6ae1d7d23695c563ea50aa26)

```javascript
// Parse the fixed-width input files (copybook layouts) into plain records.
// Signed numeric fields are zoned decimal with an overpunched last character
// ('{'/'A'-'I' positive, '}'/'J'-'R' negative; 'p'-'y' also read as negative).
// Amounts are kept as integer strings in hundredths (cents / hundredths of a
// percent) so no floating-point error enters the calculation.

var POS = {'{':0,'A':1,'B':2,'C':3,'D':4,'E':5,'F':6,'G':7,'H':8,'I':9};
var NEG = {'}':0,'J':1,'K':2,'L':3,'M':4,'N':5,'O':6,'P':7,'Q':8,'R':9};

function lines(text) {
  if (text === null || text === undefined) return [];
  return String(text).split(/\r?\n/).filter(function (l) { return l.replace(/\s+/g, '').length > 0; });
}

function field(line, start, len) {           // start is 1-based, as in the copybook
  var s = line.substring(start - 1, start - 1 + len);
  while (s.length < len) s += ' ';
  return s;
}

// Zoned decimal with 2 implied decimals -> integer string in hundredths.
function zoned2(raw) {
  var s = String(raw).trim();
  if (s.length === 0) return '0';
  var neg = false;
  if (s.charAt(0) === '-') { neg = true; s = s.substring(1); }
  else if (s.charAt(0) === '+') { s = s.substring(1); }
  if (s.indexOf('.') >= 0) {                  // tolerate an explicit decimal point
    var parts = s.split('.');
    var frac = (parts[1] || '').replace(/[^0-9]/g, '');
    frac = (frac + '00').substring(0, 2);
    s = parts[0].replace(/[^0-9]/g, '') + frac;
  } else {
    var last = s.charAt(s.length - 1);
    var d;
    if (/[0-9]/.test(last)) d = last;
    else if (POS.hasOwnProperty(last)) d = String(POS[last]);
    else if (NEG.hasOwnProperty(last)) { d = String(NEG[last]); neg = true; }
    else if (last >= 'p' && last <= 'y') { d = String(last.charCodeAt(0) - 112); neg = true; }
    else throw new Error('Invalid zoned decimal: [' + raw + ']');
    s = s.substring(0, s.length - 1).replace(/[^0-9]/g, '') + d;
  }
  s = s.replace(/^0+/, '');
  if (s === '') return '0';
  return (neg ? '-' : '') + s;
}

function rtrim(s) { return String(s).replace(/\s+$/, ''); }

// CVACT01Y - account record (300)
var accounts = lines(input.acctdata).map(function (l) {
  return {
    acctId:         field(l, 1, 11),
    activeStatus:   rtrim(field(l, 12, 1)),
    currBal:        zoned2(field(l, 13, 12)),
    creditLimit:    zoned2(field(l, 25, 12)),
    cashCreditLimit: zoned2(field(l, 37, 12)),
    openDate:       rtrim(field(l, 49, 10)),
    expirationDate: rtrim(field(l, 59, 10)),
    reissueDate:    rtrim(field(l, 69, 10)),
    currCycCredit:  zoned2(field(l, 79, 12)),
    currCycDebit:   zoned2(field(l, 91, 12)),
    addrZip:        rtrim(field(l, 103, 10)),
    groupId:        rtrim(field(l, 113, 10))
  };
});

// CVTRA01Y - transaction category balance (50)
var balances = lines(input.tcatbal).map(function (l) {
  return {
    acctId:  field(l, 1, 11),
    typeCd:  field(l, 12, 2),
    catCd:   field(l, 14, 4),
    bal:     zoned2(field(l, 18, 11))
  };
});

// CVTRA02Y - disclosure group (50)
var rates = lines(input.discgrp).map(function (l) {
  return {
    groupId: rtrim(field(l, 1, 10)),
    typeCd:  field(l, 11, 2),
    catCd:   field(l, 13, 4),
    rate:    zoned2(field(l, 17, 6))
  };
});

// CVACT03Y - card cross-reference (50)
var xrefs = lines(input.cardxref).map(function (l) {
  return {
    cardNum: rtrim(field(l, 1, 16)),
    custId:  field(l, 17, 9),
    acctId:  field(l, 26, 11)
  };
});

output.parsed = JSON.stringify({ accounts: accounts, balances: balances, rates: rates, xrefs: xrefs });
// The raw file contents are no longer needed downstream.
output.acctdata = null;
output.tcatbal = null;
output.discgrp = null;
output.cardxref = null;
```

### Compute interest per category balance (SCRIPT, id=6ae1d7d53695c563ea50aa27)

```javascript
// P-15 interest-calculation (CBACT04C). See assumptions.md for every decision.
var data = JSON.parse(input.parsed);

// ---- run parameters --------------------------------------------------------
var runDate = String(input.interestRunDate === null || input.interestRunDate === undefined ? '' : input.interestRunDate).trim();
if (!/^\d{8}/.test(runDate)) throw new Error('interestRunDate must start with YYYYMMDD, got [' + runDate + ']');
var parmPrefix = (runDate + '          ').substring(0, 10);   // PARM-DATE X(10) -> tran id prefix

// BR-03 cutoff: same calendar date ten years before the run date.
var ry = parseInt(runDate.substring(0, 4), 10);
var rm = parseInt(runDate.substring(4, 6), 10);
var rd = parseInt(runDate.substring(6, 8), 10);
var cy = ry - 10;
var leap = (cy % 4 === 0 && cy % 100 !== 0) || cy % 400 === 0;
var cd = (rm === 2 && rd === 29 && !leap) ? 28 : rd;
function pad(n, w) { var s = String(n); while (s.length < w) s = '0' + s; return s; }
var cutoff = pad(cy, 4) + '-' + pad(rm, 2) + '-' + pad(cd, 2);

// DB2-format timestamp for TRAN-ORIG-TS / TRAN-PROC-TS (YYYY-MM-DD-HH.MM.SS.hh0000)
var ts = input.runTimestamp ? String(input.runTimestamp) : null;
if (!ts) {
  var now = new Date();
  ts = pad(now.getFullYear(), 4) + '-' + pad(now.getMonth() + 1, 2) + '-' + pad(now.getDate(), 2) + '-' +
       pad(now.getHours(), 2) + '.' + pad(now.getMinutes(), 2) + '.' + pad(now.getSeconds(), 2) + '.' +
       pad(Math.floor(now.getMilliseconds() / 10), 2) + '0000';
}

// ---- reference data (W-05 reference-data-access, GET_DISCLOSURE_GROUP) ----
var rateByKey = {};
data.rates.forEach(function (r) {
  var k = r.groupId + '|' + r.typeCd + '|' + parseInt(r.catCd, 10);
  if (!rateByKey.hasOwnProperty(k)) rateByKey[k] = r.rate;          // KSDS keys are unique: first wins
});
function lookupRate(groupId, typeCd, catCd) {
  var c = parseInt(catCd, 10);
  var k = groupId + '|' + typeCd + '|' + c;
  if (rateByKey.hasOwnProperty(k)) return { rate: BigInt(rateByKey[k]), usedDefault: false, found: true };
  var dk = 'DEFAULT|' + typeCd + '|' + c;                              // BR-02
  if (rateByKey.hasOwnProperty(dk)) return { rate: BigInt(rateByKey[dk]), usedDefault: true, found: true };
  return { rate: 0n, usedDefault: true, found: false };
}

// ---- account / xref (W-01 account-data-access) -----------------------------
var accountsById = {};
var accountOrder = [];
data.accounts.forEach(function (a) {
  if (!accountsById.hasOwnProperty(a.acctId)) { accountsById[a.acctId] = a; accountOrder.push(a.acctId); }
});
var cardByAcct = {};                                                  // alternate index: lowest card number per account
data.xrefs.forEach(function (x) {
  var k = x.acctId;
  if (!cardByAcct.hasOwnProperty(k) || x.cardNum < cardByAcct[k]) cardByAcct[k] = x.cardNum;
});

// ---- main loop over category balances in key order -------------------------
var balances = data.balances.slice().sort(function (a, b) {
  var ka = a.acctId + a.typeCd + a.catCd, kb = b.acctId + b.typeCd + b.catCd;
  return ka < kb ? -1 : (ka > kb ? 1 : 0);
});

var suffix = 0;
var transactions = [];
var warnings = [];
var updated = {};
var current = null;                // { acct, totalInt (BigInt) }

function updateAccount(c) {        // BR-06
  if (!c || !c.acct) return;
  var a = c.acct;
  a.currBal = (BigInt(a.currBal) + c.totalInt).toString();
  a.currCycCredit = '0';
  a.currCycDebit = '0';
  updated[a.acctId] = true;
}

balances.forEach(function (b) {
  if (!current || current.acctId !== b.acctId) {
    updateAccount(current);
    var acct = accountsById.hasOwnProperty(b.acctId) ? accountsById[b.acctId] : null;
    if (!acct) warnings.push('Account not found for category balance: ' + b.acctId);
    var card = cardByAcct.hasOwnProperty(b.acctId) ? cardByAcct[b.acctId] : '';
    if (acct && card === '') warnings.push('No card cross-reference for account: ' + b.acctId);
    current = { acctId: b.acctId, acct: acct, card: card, totalInt: 0n };
  }
  if (!current.acct) return;                                          // no account -> nothing to post

  var acct = current.acct;
  var lr = lookupRate(acct.groupId, b.typeCd, b.catCd);
  if (!lr.found) warnings.push('No disclosure rate (incl. DEFAULT) for ' + acct.groupId + '/' + b.typeCd + '/' + b.catCd);

  // BR-03: long-standing account reduction, floored at 0.00
  var rate = lr.rate;
  if (/^\d{4}-\d{2}-\d{2}$/.test(acct.openDate) && acct.openDate <= cutoff) {
    rate = rate - 200n;
    if (rate < 0n) rate = 0n;
  }
  if (rate === 0n) return;                                            // BR-10 / zero rate: no interest

  // monthlyInterest = balance * rate / 1200, truncated to 2 decimals (BR-08).
  // balance in cents, rate in hundredths of a percent -> cents = bal*rate/120000.
  var interest = (BigInt(b.bal) * rate) / 120000n;                    // BigInt division truncates toward zero
  current.totalInt = current.totalInt + interest;

  // BR-04 / BR-05: interest transaction
  suffix += 1;
  transactions.push({
    tranId: parmPrefix + pad(suffix, 6),
    typeCd: '01',
    catCd: 5,
    source: 'System',
    desc: 'Int. for a/c ' + acct.acctId,
    amt: interest.toString(),
    cardNum: current.card,
    ts: ts
  });
});
updateAccount(current);

output.calc = JSON.stringify({
  transactions: transactions,
  accounts: accountOrder.map(function (id) { return accountsById[id]; }),
  updatedCount: Object.keys(updated).length,
  warnings: warnings
});
output.parsed = null;
```

### Format contract outputs (SCRIPT, id=6ae1d7d83695c563ea50aa28)

```javascript
// Shape the results to CONTRACT.md: intcalc_systran (transaction fields) and
// intcalc_acctdata (account fields). Amounts: strings with exactly two decimals.
var calc = JSON.parse(input.calc);

function money(hundredths) {
  var s = String(hundredths);
  var neg = s.charAt(0) === '-';
  if (neg) s = s.substring(1);
  while (s.length < 3) s = '0' + s;
  var out = s.substring(0, s.length - 2) + '.' + s.substring(s.length - 2);
  return (neg && out !== '0.00' ? '-' : '') + out;
}

var systran = calc.transactions.map(function (t) {
  return {
    tran_id: t.tranId,
    type_cd: t.typeCd,
    cat_cd: t.catCd,
    source: t.source,
    desc: t.desc,
    amt: money(t.amt),
    merchant_id: 0,
    merchant_name: '',
    merchant_city: '',
    merchant_zip: '',
    card_num: t.cardNum,
    orig_ts: t.ts,
    proc_ts: t.ts
  };
});

var acctdata = calc.accounts.map(function (a) {
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

output.result = {
  intcalc_systran: systran,
  intcalc_acctdata: acctdata,
  summary: {
    transactionsWritten: systran.length,
    accountsRead: acctdata.length,
    accountsUpdated: calc.updatedCount,
    warnings: calc.warnings
  }
};
output.calc = null;
```

_(server: 218 ms, 1 API call, 215 ms in API)_
