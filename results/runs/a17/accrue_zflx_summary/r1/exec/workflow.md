# Workflow: accrue_interest_calculation

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** Ledgerline ACCRUE (LXB002C) interest calculation: reads ledgacc/balcat/rategrp/cardlink fixed-width contents, returns accrue_systxn and accrue_ledgacc.

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae12aee3695c563ea5094d7 | <uuid> | (0, 0) | → Parse fixed-width inputs (seq:<uuid>) |
| Parse fixed-width inputs | SCRIPT | 6ae12af23695c563ea5094d8 | <uuid> | (500, 0) | → Compute interest and update accounts (seq:<uuid>) | lang: JAVASCRIPT |
| Compute interest and update accounts | SCRIPT | 6ae12af53695c563ea5094d9 | <uuid> | (1000, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae12af93695c563ea5094da | <uuid> | (1500, 0) | — |

## Systems
_(none)_

## Scripts

### Parse fixed-width inputs (SCRIPT, id=6ae12af23695c563ea5094d8)

```javascript
// Parse the fixed-width ACCRUE inputs (copybooks LXV022Y, LXV024Y, LXV026Y, LXV027Y).
// Amounts are kept as integers in units of their implied decimals (cents for V99).

function lines(text) {
  if (text === null || text === undefined) return [];
  var out = [];
  var parts = String(text).split(/\r?\n/);
  for (var i = 0; i < parts.length; i++) {
    if (parts[i].replace(/\s+/g, '').length > 0) out.push(parts[i]);
  }
  return out;
}

function pad(s, n) {
  while (s.length < n) s += ' ';
  return s;
}

function rtrim(s) {
  return s.replace(/\s+$/, '');
}

// Signed zoned decimal (DISPLAY). Accepts EBCDIC-style overpunch ({A-I / }J-R),
// GnuCOBOL ASCII overpunch (p-y negative), or an explicit leading/trailing sign.
function zoned(field) {
  var s = field.replace(/^\s+|\s+$/g, '');
  if (s.length === 0) return 0;
  var neg = false;
  if (s.charAt(0) === '-' || s.charAt(0) === '+') { neg = s.charAt(0) === '-'; s = s.substring(1); }
  if (s.length > 0 && (s.charAt(s.length - 1) === '-' || s.charAt(s.length - 1) === '+')) {
    neg = s.charAt(s.length - 1) === '-'; s = s.substring(0, s.length - 1);
  }
  var last = s.charAt(s.length - 1);
  var pos = '{ABCDEFGHI'.indexOf(last);
  var ng = '}JKLMNOPQR'.indexOf(last);
  var asc = 'pqrstuvwxy'.indexOf(last);
  if (pos >= 0) { s = s.substring(0, s.length - 1) + pos; }
  else if (ng >= 0) { s = s.substring(0, s.length - 1) + ng; neg = true; }
  else if (asc >= 0) { s = s.substring(0, s.length - 1) + asc; neg = true; }
  s = s.replace(/[^0-9]/g, '');
  var v = s.length ? parseInt(s, 10) : 0;
  return neg ? -v : v;
}

function num(field) {
  var s = field.replace(/[^0-9]/g, '');
  return s.length ? parseInt(s, 10) : 0;
}

var accounts = [];
var accLines = lines(input.ledgacc);
for (var i = 0; i < accLines.length; i++) {
  var r = pad(accLines[i], 300);
  accounts.push({
    acct_id: num(r.substring(0, 11)),
    active_status: rtrim(r.substring(11, 12)),
    curr_bal: zoned(r.substring(12, 24)),
    credit_limit: zoned(r.substring(24, 36)),
    cash_credit_limit: zoned(r.substring(36, 48)),
    open_date: rtrim(r.substring(48, 58)),
    expiration_date: rtrim(r.substring(58, 68)),
    reissue_date: rtrim(r.substring(68, 78)),
    curr_cyc_credit: zoned(r.substring(78, 90)),
    curr_cyc_debit: zoned(r.substring(90, 102)),
    addr_zip: rtrim(r.substring(102, 112)),
    group_id: rtrim(r.substring(112, 122))
  });
}

var xrefs = [];
var xLines = lines(input.cardlink);
for (var i = 0; i < xLines.length; i++) {
  var r = pad(xLines[i], 50);
  xrefs.push({ card_num: rtrim(r.substring(0, 16)), acct_id: num(r.substring(25, 36)) });
}

var balances = [];
var bLines = lines(input.balcat);
for (var i = 0; i < bLines.length; i++) {
  var r = pad(bLines[i], 50);
  balances.push({
    acct_id: num(r.substring(0, 11)),
    type_cd: r.substring(11, 13),
    cat_cd: num(r.substring(13, 17)),
    bal: zoned(r.substring(17, 28))
  });
}

var rates = [];
var gLines = lines(input.rategrp);
for (var i = 0; i < gLines.length; i++) {
  var r = pad(gLines[i], 50);
  rates.push({
    group_id: rtrim(r.substring(0, 10)),
    type_cd: r.substring(10, 12),
    cat_cd: num(r.substring(12, 16)),
    rate: zoned(r.substring(16, 22))
  });
}

// Handed on as a JSON string: a nested value read back through input.* is a foreign
// object in the next SCRIPT node, a string round-trips without surprises.
output.parsedJson = JSON.stringify({ accounts: accounts, xrefs: xrefs, balances: balances, rates: rates });

```

### Compute interest and update accounts (SCRIPT, id=6ae12af53695c563ea5094d9)

```javascript
// ACCRUE / LXB002C: for each account/type/category balance, look up the
// disclosure-group rate (fallback group STANDARD), compute monthly interest,
// write a type 07 / category 12 transaction, then add the account's total
// interest to its balance and reset the cycle credit/debit totals.

var p = JSON.parse(String(input.parsedJson));
var parm = input.accrueParm ? String(input.accrueParm) : '2022071800';
while (parm.length < 10) parm += ' ';
parm = parm.substring(0, 10);

var DEFAULT_GROUP = 'STANDARD';
var TXN_TYPE = '07';
var TXN_CAT = 12;
var bizDate = parm.substring(0, 4) + '-' + parm.substring(4, 6) + '-' + parm.substring(6, 8);
var ts = bizDate + '-00.00.00.000000';

// monthly interest in cents = trunc(bal * rate / 1200), bal in cents, rate in hundredths of a percent
function monthlyInterest(balCents, rateHundredths) {
  if (typeof BigInt === 'function') {
    var q = (BigInt(balCents) * BigInt(rateHundredths)) / BigInt(120000); // BigInt division truncates toward zero
    return Number(q);
  }
  var prod = balCents * rateHundredths;
  return prod < 0 ? Math.ceil(prod / 120000) : Math.floor(prod / 120000);
}

function amt(cents) {
  var neg = cents < 0;
  var a = Math.abs(cents);
  var frac = String(a % 100);
  if (frac.length < 2) frac = '0' + frac;
  return (neg ? '-' : '') + Math.floor(a / 100) + '.' + frac;
}

var acctById = {};
for (var i = 0; i < p.accounts.length; i++) acctById[p.accounts[i].acct_id] = p.accounts[i];

var cardByAcct = {};
for (var i = 0; i < p.xrefs.length; i++) {
  var x = p.xrefs[i];
  if (cardByAcct[x.acct_id] === undefined) cardByAcct[x.acct_id] = x.card_num;
}

var rateByKey = {};
for (var i = 0; i < p.rates.length; i++) {
  var g = p.rates[i];
  var k = g.group_id + '|' + g.type_cd + '|' + g.cat_cd;
  if (rateByKey[k] === undefined) rateByKey[k] = g.rate;
}

function findRate(groupId, typeCd, catCd) {
  var r = rateByKey[groupId + '|' + typeCd + '|' + catCd];
  if (r !== undefined) return r;
  r = rateByKey[DEFAULT_GROUP + '|' + typeCd + '|' + catCd];
  return r !== undefined ? r : 0;
}

var systxn = [];
var suffix = 0;
var current = null;   // account being accumulated
var totalInt = 0;
var lastAcctId = null;

function updateAccount() {
  if (current === null) return;
  current.curr_bal += totalInt;
  current.curr_cyc_credit = 0;
  current.curr_cyc_debit = 0;
}

for (var i = 0; i < p.balances.length; i++) {
  var b = p.balances[i];
  if (b.acct_id !== lastAcctId) {
    updateAccount();
    lastAcctId = b.acct_id;
    totalInt = 0;
    current = acctById[b.acct_id] || null;
  }
  if (current === null) continue; // balance for an account not in the account file
  var rate = findRate(current.group_id, b.type_cd, b.cat_cd);
  if (rate === 0) continue;
  var interest = monthlyInterest(b.bal, rate);
  totalInt += interest;
  suffix += 1;
  var sfx = String(suffix);
  while (sfx.length < 6) sfx = '0' + sfx;
  var card = cardByAcct[b.acct_id];
  systxn.push({
    tran_id: parm + sfx,
    type_cd: TXN_TYPE,
    cat_cd: TXN_CAT,
    source: 'System',
    desc: 'Int. for a/c ' + String(b.acct_id),
    amt: amt(interest),
    merchant_id: 0,
    merchant_name: '',
    merchant_city: '',
    merchant_zip: '',
    card_num: card === undefined ? '' : card,
    orig_ts: ts,
    proc_ts: ts
  });
}
updateAccount(); // the last account in the balance file

var ledgacc = [];
for (var i = 0; i < p.accounts.length; i++) {
  var a = p.accounts[i];
  ledgacc.push({
    acct_id: a.acct_id,
    active_status: a.active_status,
    curr_bal: amt(a.curr_bal),
    credit_limit: amt(a.credit_limit),
    cash_credit_limit: amt(a.cash_credit_limit),
    open_date: a.open_date,
    expiration_date: a.expiration_date,
    reissue_date: a.reissue_date,
    curr_cyc_credit: amt(a.curr_cyc_credit),
    curr_cyc_debit: amt(a.curr_cyc_debit),
    addr_zip: a.addr_zip,
    group_id: a.group_id
  });
}

output.accrue_systxn = systxn;
output.accrue_ledgacc = ledgacc;
output.parsedJson = null;

```

_(server: 290 ms, 1 API call, 287 ms in API)_
