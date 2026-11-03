# Workflow: accrue_interest_calculation

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** Ledgerline ACCRUE step (LXB002C, P-15): monthly interest per account/type/category balance, posts type 07 / cat 12 interest transactions, updates account balances and resets cycle credit/debit. Input: fixed-width file contents (ledgacc, balcat, rategrp, cardlink) + PARM. Output: accrue_systxn, accrue_ledgacc.

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae135773695c563ea509621 | <uuid> | (0, 0) | → Parse fixed-width inputs (seq:<uuid>) |
| Parse fixed-width inputs | SCRIPT | 6ae135873695c563ea509622 | <uuid> | (500, 0) | → Compute interest, post transactions, update accounts (seq:<uuid>) | lang: JAVASCRIPT |
| Compute interest, post transactions, update accounts | SCRIPT | 6ae1358b3695c563ea509623 | <uuid> | (1000, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae1358e3695c563ea509624 | <uuid> | (1500, 0) | — |

## Systems
_(none)_

## Scripts

### Parse fixed-width inputs (SCRIPT, id=6ae135873695c563ea509622)

```javascript
// Parse fixed-width input files (one record per line) into plain records.
// Signed numeric fields (PIC S9(n)V99) are zoned decimal with the sign
// over-punched on the last digit; values are carried as integer strings in
// minor units (cents for amounts, hundredths of a percent for rates).

function toLines(s) {
  if (s === null || s === undefined) return [];
  var parts = String(s).split(/\r?\n/);
  var out = [];
  for (var i = 0; i < parts.length; i++) {
    if (parts[i].replace(/\s+$/, '').length > 0) out.push(parts[i]);
  }
  return out;
}

function padTo(l, n) {
  while (l.length < n) l += ' ';
  return l;
}

function rtrim(s) {
  return String(s).replace(/\s+$/, '');
}

var POS_OVERPUNCH = { '{': '0', 'A': '1', 'B': '2', 'C': '3', 'D': '4', 'E': '5', 'F': '6', 'G': '7', 'H': '8', 'I': '9' };
var NEG_OVERPUNCH = { '}': '0', 'J': '1', 'K': '2', 'L': '3', 'M': '4', 'N': '5', 'O': '6', 'P': '7', 'Q': '8', 'R': '9',
                      'p': '0', 'q': '1', 'r': '2', 's': '3', 't': '4', 'u': '5', 'v': '6', 'w': '7', 'x': '8', 'y': '9' };

// Returns the value in minor units (implied 2 decimals) as an integer string.
function zoned2(raw, what) {
  var s = String(raw).replace(/^\s+|\s+$/g, '');
  if (s.length === 0) return '0';
  var neg = false;
  if (s.charAt(0) === '-' || s.charAt(0) === '+') { neg = s.charAt(0) === '-'; s = s.substr(1); }
  if (s.length && (s.charAt(s.length - 1) === '-' || s.charAt(s.length - 1) === '+')) {
    neg = neg || s.charAt(s.length - 1) === '-'; s = s.substr(0, s.length - 1);
  }
  var digits;
  if (s.indexOf('.') >= 0) {
    // tolerate an explicit decimal point (edited dump)
    var p = s.split('.');
    digits = p[0] + ((p[1] || '') + '00').substr(0, 2);
  } else {
    var last = s.charAt(s.length - 1);
    if (POS_OVERPUNCH.hasOwnProperty(last)) { s = s.substr(0, s.length - 1) + POS_OVERPUNCH[last]; }
    else if (NEG_OVERPUNCH.hasOwnProperty(last)) { s = s.substr(0, s.length - 1) + NEG_OVERPUNCH[last]; neg = true; }
    digits = s;
  }
  digits = digits.replace(/ /g, '0');
  if (!/^[0-9]+$/.test(digits)) throw new Error('Bad numeric field ' + what + ': [' + raw + ']');
  digits = digits.replace(/^0+/, '');
  if (digits === '') return '0';
  return (neg ? '-' : '') + digits;
}

function unsignedInt(raw, what) {
  var s = String(raw).replace(/^\s+|\s+$/g, '');
  if (s === '') return 0;
  if (!/^[0-9]+$/.test(s)) throw new Error('Bad numeric field ' + what + ': [' + raw + ']');
  return parseInt(s, 10);
}

// LXV022Y ACCOUNT-RECORD (300)
var accounts = [];
var al = toLines(input.ledgacc);
for (var i = 0; i < al.length; i++) {
  var l = padTo(al[i], 300);
  accounts.push({
    acct_id: unsignedInt(l.substr(0, 11), 'LACC-ID'),
    active_status: rtrim(l.substr(11, 1)),
    curr_bal: zoned2(l.substr(12, 12), 'LACC-CURR-BAL'),
    credit_limit: zoned2(l.substr(24, 12), 'LACC-CREDIT-LIMIT'),
    cash_credit_limit: zoned2(l.substr(36, 12), 'LACC-CASH-CREDIT-LIMIT'),
    open_date: rtrim(l.substr(48, 10)),
    expiration_date: rtrim(l.substr(58, 10)),
    reissue_date: rtrim(l.substr(68, 10)),
    curr_cyc_credit: zoned2(l.substr(78, 12), 'LACC-CURR-CYC-CREDIT'),
    curr_cyc_debit: zoned2(l.substr(90, 12), 'LACC-CURR-CYC-DEBIT'),
    addr_zip: rtrim(l.substr(102, 10)),
    group_id: rtrim(l.substr(112, 10))
  });
}

// LXV026Y TXN-CAT-BAL-RECORD (50)
var balances = [];
var bl = toLines(input.balcat);
for (var j = 0; j < bl.length; j++) {
  var b = padTo(bl[j], 50);
  balances.push({
    acct_id: unsignedInt(b.substr(0, 11), 'BCAT-LACC-ID'),
    type_cd: b.substr(11, 2),
    cat_cd: unsignedInt(b.substr(13, 4), 'BCAT-CD'),
    bal: zoned2(b.substr(17, 11), 'TXN-CAT-BAL')
  });
}

// LXV027Y RG-GROUP-RECORD (50)
var rates = [];
var rl = toLines(input.rategrp);
for (var k = 0; k < rl.length; k++) {
  var r = padTo(rl[k], 50);
  rates.push({
    group_id: rtrim(r.substr(0, 10)),
    type_cd: r.substr(10, 2),
    cat_cd: unsignedInt(r.substr(12, 4), 'RG-TXN-CAT-CD'),
    rate: zoned2(r.substr(16, 6), 'RG-INT-RATE')
  });
}

// LXV024Y CRD-LINK-RECORD (50)
var cards = [];
var cl = toLines(input.cardlink);
for (var m = 0; m < cl.length; m++) {
  var c = padTo(cl[m], 50);
  cards.push({
    card_num: rtrim(c.substr(0, 16)),
    acct_id: unsignedInt(c.substr(25, 11), 'LINK-LACC-ID')
  });
}

output.parsed = { accounts: accounts, balances: balances, rates: rates, cards: cards };
// drop the raw file contents so they are not carried through the rest of the run
output.ledgacc = null;
output.balcat = null;
output.rategrp = null;
output.cardlink = null;

```

### Compute interest, post transactions, update accounts (SCRIPT, id=6ae1358b3695c563ea509623)

```javascript
// ACCRUE (LXB002C): for each account/type/category balance, find the
// disclosure-group rate (falling back to the STANDARD group), compute monthly
// interest = balance * rate / 1200 (truncated to the cent), write one interest
// transaction (type 07, category 12) when the rate is not 0, then add the
// account's total interest to its current balance and reset cycle credit/debit.

var TXN_TYPE = '07';
var TXN_CAT = 12;
var FALLBACK_GROUP = 'STANDARD';

function fmt(c) { // BigInt minor units -> "123.45"
  var neg = c < 0n;
  var a = neg ? -c : c;
  var s = a.toString();
  while (s.length < 3) s = '0' + s;
  return (neg ? '-' : '') + s.substr(0, s.length - 2) + '.' + s.substr(s.length - 2);
}

function pad0(n, w) { var s = String(n); while (s.length < w) s = '0' + s; return s; }

function db2Timestamp(d) { // YYYY-MM-DD-HH.MM.SS.hh0000
  return pad0(d.getFullYear(), 4) + '-' + pad0(d.getMonth() + 1, 2) + '-' + pad0(d.getDate(), 2) + '-' +
    pad0(d.getHours(), 2) + '.' + pad0(d.getMinutes(), 2) + '.' + pad0(d.getSeconds(), 2) + '.' +
    pad0(Math.floor(d.getMilliseconds() / 10), 2) + '0000';
}

var parsed = input.parsed;
var parm = String(input.parm || '2022071800');
var idPrefix = (parm + '          ').substr(0, 10);
var ts = db2Timestamp(new Date());

// account master, in input order
var accounts = [];
var acctIdx = {};
for (var i = 0; i < parsed.accounts.length; i++) {
  var a = parsed.accounts[i];
  var rec = {
    acct_id: Number(a.acct_id), active_status: String(a.active_status),
    curr_bal: BigInt(String(a.curr_bal)), credit_limit: BigInt(String(a.credit_limit)),
    cash_credit_limit: BigInt(String(a.cash_credit_limit)),
    open_date: String(a.open_date), expiration_date: String(a.expiration_date), reissue_date: String(a.reissue_date),
    curr_cyc_credit: BigInt(String(a.curr_cyc_credit)), curr_cyc_debit: BigInt(String(a.curr_cyc_debit)),
    addr_zip: String(a.addr_zip), group_id: String(a.group_id)
  };
  accounts.push(rec);
  if (!acctIdx.hasOwnProperty(String(rec.acct_id))) acctIdx[String(rec.acct_id)] = rec;
}

// disclosure groups keyed by group/type/category
var rateIdx = {};
for (var r = 0; r < parsed.rates.length; r++) {
  var g = parsed.rates[r];
  var key = String(g.group_id) + '|' + String(g.type_cd) + '|' + Number(g.cat_cd);
  if (!rateIdx.hasOwnProperty(key)) rateIdx[key] = BigInt(String(g.rate));
}

// card cross-reference: first card listed for the account
var cardIdx = {};
for (var c = 0; c < parsed.cards.length; c++) {
  var x = parsed.cards[c];
  if (!cardIdx.hasOwnProperty(String(x.acct_id))) cardIdx[String(x.acct_id)] = String(x.card_num);
}

// category balances in key order (account, type, category)
var balances = [];
for (var b = 0; b < parsed.balances.length; b++) {
  var e = parsed.balances[b];
  balances.push({ acct_id: Number(e.acct_id), type_cd: String(e.type_cd), cat_cd: Number(e.cat_cd),
                  bal: BigInt(String(e.bal)), seq: b });
}
balances.sort(function (p, q) {
  if (p.acct_id !== q.acct_id) return p.acct_id < q.acct_id ? -1 : 1;
  if (p.type_cd !== q.type_cd) return p.type_cd < q.type_cd ? -1 : 1;
  if (p.cat_cd !== q.cat_cd) return p.cat_cd - q.cat_cd;
  return p.seq - q.seq;
});

var txns = [];
var suffix = 0;
var skipped = [];
var lastAcct = null;
var acct = null;
var totalInt = 0n;

function updateAccount() {
  if (acct === null) return;
  acct.curr_bal = acct.curr_bal + totalInt;
  acct.curr_cyc_credit = 0n;
  acct.curr_cyc_debit = 0n;
}

for (var n = 0; n < balances.length; n++) {
  var bc = balances[n];
  if (bc.acct_id !== lastAcct) {
    updateAccount();               // account done -> update the previous account
    lastAcct = bc.acct_id;
    totalInt = 0n;
    acct = acctIdx.hasOwnProperty(String(bc.acct_id)) ? acctIdx[String(bc.acct_id)] : null;
  }
  if (acct === null) { skipped.push(bc.acct_id + '/' + bc.type_cd + '/' + bc.cat_cd + ': account not found'); continue; }

  var rate = rateIdx[acct.group_id + '|' + bc.type_cd + '|' + bc.cat_cd];
  if (rate === undefined) rate = rateIdx[FALLBACK_GROUP + '|' + bc.type_cd + '|' + bc.cat_cd];
  if (rate === undefined) { skipped.push(bc.acct_id + '/' + bc.type_cd + '/' + bc.cat_cd + ': no rate'); rate = 0n; }
  if (rate === 0n) continue;

  // cents * (rate in hundredths of a percent) / (100 * 1200 / 100) -> cents, truncated toward zero
  var interest = (bc.bal * rate) / 12000n;
  totalInt = totalInt + interest;

  suffix = suffix + 1;
  txns.push({
    tran_id: idPrefix + pad0(suffix, 6),
    type_cd: TXN_TYPE,
    cat_cd: TXN_CAT,
    source: 'System',
    desc: 'Int. for a/c ' + pad0(acct.acct_id, 11),
    amt: fmt(interest),
    merchant_id: 0,
    merchant_name: '',
    merchant_city: '',
    merchant_zip: '',
    card_num: cardIdx.hasOwnProperty(String(acct.acct_id)) ? cardIdx[String(acct.acct_id)] : '',
    orig_ts: ts,
    proc_ts: ts
  });
}
updateAccount();                   // last account

var outAccts = [];
for (var o = 0; o < accounts.length; o++) {
  var q = accounts[o];
  outAccts.push({
    acct_id: q.acct_id, active_status: q.active_status, curr_bal: fmt(q.curr_bal),
    credit_limit: fmt(q.credit_limit), cash_credit_limit: fmt(q.cash_credit_limit),
    open_date: q.open_date, expiration_date: q.expiration_date, reissue_date: q.reissue_date,
    curr_cyc_credit: fmt(q.curr_cyc_credit), curr_cyc_debit: fmt(q.curr_cyc_debit),
    addr_zip: q.addr_zip, group_id: q.group_id
  });
}

output.accrue_systxn = txns;
output.accrue_ledgacc = outAccts;
output.warnings = skipped;
output.parsed = null;

```

_(server: 208 ms, 1 API call, 205 ms in API)_
