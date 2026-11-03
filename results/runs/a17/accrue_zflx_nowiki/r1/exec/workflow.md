# Workflow: accrue_interest

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** Ledgerline ACCRUE batch step: monthly interest per category balance, interest transactions (LXV030Y) and account update (LXV022Y). Inputs are raw fixed-width file contents.

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae12bd13695c563ea5094df | <uuid> | (0, 0) | → Accrue interest (seq:<uuid>) |
| Accrue interest | SCRIPT | 6ae12bd43695c563ea5094e0 | <uuid> | (500, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae12bd73695c563ea5094e1 | <uuid> | (1000, 0) | — |

## Systems
_(none)_

## Scripts

### Accrue interest (SCRIPT, id=6ae12bd43695c563ea5094e0)

```javascript
// Ledgerline ACCRUE: interest per category balance -> interest transactions + account update.
// See assumptions.md (A-numbers) for every decision taken here.
var OVERPUNCH = { '{': [0, 1], 'A': [1, 1], 'B': [2, 1], 'C': [3, 1], 'D': [4, 1], 'E': [5, 1], 'F': [6, 1], 'G': [7, 1], 'H': [8, 1], 'I': [9, 1],
                  '}': [0, -1], 'J': [1, -1], 'K': [2, -1], 'L': [3, -1], 'M': [4, -1], 'N': [5, -1], 'O': [6, -1], 'P': [7, -1], 'Q': [8, -1], 'R': [9, -1] };

function str(v) { return (v === null || v === undefined) ? '' : String(v); }
function lines(text) { return str(text).split(/\r?\n/).filter(function (l) { return l.replace(/\s/g, '').length > 0; }); }
function fld(line, start, len) { var s = line.substring(start, start + len); while (s.length < len) s += ' '; return s; }
function rtrim(s) { return s.replace(/\s+$/, ''); }

// Zoned decimal PIC S9(n)V99 (A3): trailing overpunch, or explicit +/- sign, or plain digits. Returns BigInt in units of 10^-scale.
function zoned(raw, scale) {
  var s = raw.trim();
  if (s === '') return BigInt(0);
  var sign = 1;
  if (s.charAt(0) === '-' || s.charAt(0) === '+') { if (s.charAt(0) === '-') sign = -1; s = s.substring(1); }
  if (s.charAt(s.length - 1) === '-' || s.charAt(s.length - 1) === '+') { if (s.charAt(s.length - 1) === '-') sign = -1; s = s.substring(0, s.length - 1); }
  var last = s.charAt(s.length - 1);
  var p = OVERPUNCH[last];
  if (p) { s = s.substring(0, s.length - 1) + p[0]; sign = sign * p[1]; }
  if (s.indexOf('.') >= 0) return BigInt(sign) * decimalToUnits(s, scale);
  s = s.replace(/[^0-9]/g, '');
  if (s === '') return BigInt(0);
  return BigInt(sign) * BigInt(s);
}
// "123.4" / 123.4 / "-500" -> BigInt units of 10^-scale (JSON input form, A2).
function decimalToUnits(v, scale) {
  var s = str(v).trim();
  if (s === '') return BigInt(0);
  var neg = false;
  if (s.charAt(0) === '-') { neg = true; s = s.substring(1); } else if (s.charAt(0) === '+') { s = s.substring(1); }
  var parts = s.split('.');
  var frac = (parts[1] || '');
  while (frac.length < scale) frac += '0';
  frac = frac.substring(0, scale);
  var u = BigInt((parts[0] || '0') + frac);
  return neg ? -u : u;
}
function fmtCents(c) {
  var neg = c < BigInt(0);
  var a = neg ? -c : c;
  var s = a.toString();
  while (s.length < 3) s = '0' + s;
  return (neg ? '-' : '') + s.substring(0, s.length - 2) + '.' + s.substring(s.length - 2);
}
function pad(n, len) { var s = String(n); while (s.length < len) s = '0' + s; return s; }
function isJson(text) { var t = str(text).trim(); return t.charAt(0) === '['; }

// ---- accounts (LXV022Y, RECLN 300) ----
var accounts = [];
if (isJson(input.ledgacc)) {
  JSON.parse(str(input.ledgacc)).forEach(function (r) {
    accounts.push({ acct_id: Number(r.acct_id), active_status: str(r.active_status), curr_bal: decimalToUnits(r.curr_bal, 2),
      credit_limit: decimalToUnits(r.credit_limit, 2), cash_credit_limit: decimalToUnits(r.cash_credit_limit, 2),
      open_date: str(r.open_date), expiration_date: str(r.expiration_date), reissue_date: str(r.reissue_date),
      curr_cyc_credit: decimalToUnits(r.curr_cyc_credit, 2), curr_cyc_debit: decimalToUnits(r.curr_cyc_debit, 2),
      addr_zip: str(r.addr_zip), group_id: str(r.group_id) });
  });
} else {
  lines(input.ledgacc).forEach(function (l) {
    accounts.push({ acct_id: Number(fld(l, 0, 11)), active_status: fld(l, 11, 1), curr_bal: zoned(fld(l, 12, 12), 2),
      credit_limit: zoned(fld(l, 24, 12), 2), cash_credit_limit: zoned(fld(l, 36, 12), 2),
      open_date: fld(l, 48, 10), expiration_date: fld(l, 58, 10), reissue_date: fld(l, 68, 10),
      curr_cyc_credit: zoned(fld(l, 78, 12), 2), curr_cyc_debit: zoned(fld(l, 90, 12), 2),
      addr_zip: fld(l, 102, 10), group_id: fld(l, 112, 10) });
  });
}
var acctById = {};
accounts.forEach(function (a) { acctById[a.acct_id] = a; });

// ---- category balances (LXV026Y, RECLN 50) ----
var cats = [];
if (isJson(input.balcat)) {
  JSON.parse(str(input.balcat)).forEach(function (r) {
    cats.push({ acct_id: Number(r.acct_id), type_cd: str(r.type_cd), cat_cd: Number(r.cat_cd), bal: decimalToUnits(r.bal, 2) });
  });
} else {
  lines(input.balcat).forEach(function (l) {
    cats.push({ acct_id: Number(fld(l, 0, 11)), type_cd: fld(l, 11, 2), cat_cd: Number(fld(l, 13, 4)), bal: zoned(fld(l, 17, 11), 2) });
  });
}
// A5: process in key order (acct id, type, category), as a keyed sequential read would.
cats.sort(function (a, b) {
  if (a.acct_id !== b.acct_id) return a.acct_id - b.acct_id;
  if (a.type_cd !== b.type_cd) return a.type_cd < b.type_cd ? -1 : 1;
  return a.cat_cd - b.cat_cd;
});

// ---- card links (LXV024Y, RECLN 50): A9 first card (lowest card number) per account ----
var cardByAcct = {};
lines(input.cardlink).forEach(function (l) {
  var card = fld(l, 0, 16), acct = Number(fld(l, 25, 11));
  if (cardByAcct[acct] === undefined || card < cardByAcct[acct]) cardByAcct[acct] = card;
});

// ---- rate groups (LXV027Y, RECLN 50) ----
var rates = {};
lines(input.rategrp).forEach(function (l) {
  rates[rtrim(fld(l, 0, 10)) + '|' + fld(l, 10, 2) + '|' + Number(fld(l, 12, 4))] = zoned(fld(l, 16, 6), 2);
});
function rateFor(group, type, cat) {
  var k = rtrim(group) + '|' + type + '|' + cat;
  if (rates[k] !== undefined) return rates[k];
  var d = 'DEFAULT|' + type + '|' + cat;          // A7: fall back to the DEFAULT group
  if (rates[d] !== undefined) return rates[d];
  return BigInt(0);                                 // A8: no rate anywhere -> no interest
}

// ---- run parameters ----
var parm = str(input.parmDate) || '2022071800';
parm = (parm + '          ').substring(0, 10);    // A10: TXN-ID = 10-char parameter + 6-digit counter
var ts = str(input.runTimestamp);
if (ts === '') {
  var d = new Date();
  ts = d.getFullYear() + '-' + pad(d.getMonth() + 1, 2) + '-' + pad(d.getDate(), 2) + '-' + pad(d.getHours(), 2) + '.' +
       pad(d.getMinutes(), 2) + '.' + pad(d.getSeconds(), 2) + '.' + pad(Math.floor(d.getMilliseconds() / 10), 2) + '0000';
}
var updateLast = !(input.updateLastAccount === false || str(input.updateLastAccount) === 'false');

// ---- accrue ----
var txns = [], warnings = [], counter = 0;
var cur = null, total = BigInt(0);
function postAccount(acct, tot) {                   // A6: add total interest, reset cycle credit/debit
  acct.curr_bal = acct.curr_bal + tot;
  acct.curr_cyc_credit = BigInt(0);
  acct.curr_cyc_debit = BigInt(0);
}
cats.forEach(function (c) {
  if (cur === null || c.acct_id !== cur.acct_id) {
    if (cur !== null && cur.acct) postAccount(cur.acct, total);
    total = BigInt(0);
    cur = { acct_id: c.acct_id, acct: acctById[c.acct_id] };
    if (!cur.acct) warnings.push('category balance for unknown account ' + c.acct_id + ' skipped');   // A11
  }
  if (!cur.acct) return;
  var rate = rateFor(cur.acct.group_id, c.type_cd, c.cat_cd);
  if (rate === BigInt(0)) return;                   // A8: zero rate -> no transaction
  var interest = (c.bal * rate) / BigInt(120000);   // A4: bal * rate% / 12, BigInt division truncates toward zero
  total = total + interest;
  counter++;
  var card = cardByAcct[c.acct_id];
  if (card === undefined) { card = ''; warnings.push('no card link for account ' + c.acct_id); }   // A9
  txns.push({ tran_id: parm + pad(counter, 6), type_cd: '01', cat_cd: 5, source: 'System',          // A12
    desc: 'Int. for a/c ' + pad(c.acct_id, 11), amt: fmtCents(interest), merchant_id: 0,
    merchant_name: '', merchant_city: '', merchant_zip: '', card_num: rtrim(card), orig_ts: ts, proc_ts: ts });
});
if (cur !== null && cur.acct && updateLast) postAccount(cur.acct, total);   // A13

output.systxn = JSON.stringify(txns);
output.ledgaccOut = JSON.stringify(accounts.map(function (a) {
  return { acct_id: a.acct_id, active_status: rtrim(a.active_status), curr_bal: fmtCents(a.curr_bal),
    credit_limit: fmtCents(a.credit_limit), cash_credit_limit: fmtCents(a.cash_credit_limit),
    open_date: rtrim(a.open_date), expiration_date: rtrim(a.expiration_date), reissue_date: rtrim(a.reissue_date),
    curr_cyc_credit: fmtCents(a.curr_cyc_credit), curr_cyc_debit: fmtCents(a.curr_cyc_debit),
    addr_zip: rtrim(a.addr_zip), group_id: rtrim(a.group_id) };
}));
output.summary = 'accounts=' + accounts.length + ' catbal=' + cats.length + ' txns=' + txns.length +
  (warnings.length ? ' warnings: ' + warnings.join('; ') : '');
```

_(server: 195 ms, 1 API call, 192 ms in API)_
