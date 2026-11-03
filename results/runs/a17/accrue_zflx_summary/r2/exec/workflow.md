# Workflow: accrue_interest_calculation

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** Ledgerline ACCRUE (LXB002C) – monthly interest calculation. Input: raw fixed-width file contents (ledgacc, balcat, rategrp, cardlink) + ACCRUE parm. Output: accrue_systxn / accrue_ledgacc as JSON strings (CONTRACT.md format).

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae12fa63695c563ea509556 | <uuid> | (0, 0) | → Parse input files (seq:<uuid>) |
| Parse input files | SCRIPT | 6ae12fb03695c563ea509557 | <uuid> | (500, 0) | → Compute interest per category balance (seq:<uuid>) | lang: JAVASCRIPT |
| Compute interest per category balance | SCRIPT | 6ae12fb43695c563ea509558 | <uuid> | (1000, 0) | → Update accounts and format outputs (seq:<uuid>) | lang: JAVASCRIPT |
| Update accounts and format outputs | SCRIPT | 6ae12fb73695c563ea509559 | <uuid> | (1500, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae12fba3695c563ea50955a | <uuid> | (2000, 0) | — |

## Systems
_(none)_

## Scripts

### Parse input files (SCRIPT, id=6ae12fb03695c563ea509557)

```javascript
// Parse the fixed-width input files (copybooks LXV022Y, LXV024Y, LXV026Y, LXV027Y).
// Signed numeric fields are zoned decimal; the sign may be an overpunch on the last byte.
// Amounts are carried as integer strings in their implied-decimal units (cents / hundredths of a percent).

function lines(text, recLen) {
  var out = [];
  var parts = String(text == null ? '' : text).split(/\r?\n/);
  for (var i = 0; i < parts.length; i++) {
    var l = parts[i];
    if (l.replace(/\s/g, '').length === 0) continue;
    while (l.length < recLen) l += ' ';
    out.push(l);
  }
  return out;
}

var POS_OP = { '{': '0', 'A': '1', 'B': '2', 'C': '3', 'D': '4', 'E': '5', 'F': '6', 'G': '7', 'H': '8', 'I': '9' };
var NEG_OP = { '}': '0', 'J': '1', 'K': '2', 'L': '3', 'M': '4', 'N': '5', 'O': '6', 'P': '7', 'Q': '8', 'R': '9',
               'p': '0', 'q': '1', 'r': '2', 's': '3', 't': '4', 'u': '5', 'v': '6', 'w': '7', 'x': '8', 'y': '9' };

// zoned decimal -> signed integer string (implied decimals kept as units)
function zoned(raw) {
  var s = String(raw).trim();
  if (s.length === 0) return '0';
  var neg = false;
  if (s.charAt(0) === '-' || s.charAt(0) === '+') { neg = s.charAt(0) === '-'; s = s.substring(1); }
  var last = s.charAt(s.length - 1);
  if (last === '-' || last === '+') { neg = last === '-'; s = s.substring(0, s.length - 1); last = s.charAt(s.length - 1); }
  if (POS_OP[last] !== undefined) { s = s.substring(0, s.length - 1) + POS_OP[last]; }
  else if (NEG_OP[last] !== undefined) { s = s.substring(0, s.length - 1) + NEG_OP[last]; neg = true; }
  s = s.replace(/[^0-9]/g, '0').replace(/^0+/, '');
  if (s.length === 0) return '0';
  return (neg ? '-' : '') + s;
}

function num(raw) { var s = String(raw).replace(/[^0-9]/g, ''); return s.length ? parseInt(s, 10) : 0; }
function rtrim(s) { return String(s).replace(/\s+$/, ''); }

// LXV022Y account (300)
var accounts = [];
var al = lines(input.ledgaccFile, 300);
for (var i = 0; i < al.length; i++) {
  var r = al[i];
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

// LXV024Y card link (50): account -> card number
var xref = {};
var cl = lines(input.cardlinkFile, 50);
for (var j = 0; j < cl.length; j++) {
  var c = cl[j];
  var card = rtrim(c.substring(0, 16));
  var acct = String(num(c.substring(25, 36)));
  // first card in card-number order (the order of an alternate index built over the card-keyed file)
  if (xref[acct] === undefined || card < xref[acct]) xref[acct] = card;
}

// LXV026Y category balance (50)
var balances = [];
var bl = lines(input.balcatFile, 50);
for (var k = 0; k < bl.length; k++) {
  var b = bl[k];
  balances.push({
    acct_id: num(b.substring(0, 11)),
    type_cd: b.substring(11, 13),
    cat_cd: num(b.substring(13, 17)),
    bal: zoned(b.substring(17, 28))
  });
}

// LXV027Y disclosure group (50): key group(10)+type(2)+cat(4) -> rate
var rates = {};
var rl = lines(input.rategrpFile, 50);
for (var m = 0; m < rl.length; m++) {
  var g = rl[m];
  var key = rtrim(g.substring(0, 10)) + '|' + g.substring(10, 12) + '|' + num(g.substring(12, 16));
  rates[key] = zoned(g.substring(16, 22));
}

output.parsedJson = JSON.stringify({ accounts: accounts, xref: xref, balances: balances, rates: rates });

```

### Compute interest per category balance (SCRIPT, id=6ae12fb43695c563ea509558)

```javascript
// ACCRUE core: walk the category balances in key order (account, type, category).
// Per balance: disclosure-group rate (account group, falling back to STANDARD when no record exists),
// monthly interest = balance * rate / 1200 truncated to cents, one interest transaction (type 07, cat 12)
// when the rate is not zero, and the interest accumulated per account.

var p = JSON.parse(input.parsedJson);
var parm = String(input.accrueParm == null || input.accrueParm === '' ? '2022071800' : input.accrueParm);
while (parm.length < 10) parm += ' ';
parm = parm.substring(0, 10);

function pad(n, w) { var s = String(n); while (s.length < w) s = '0' + s; return s; }
function ts() {
  if (input.runTimestamp) return String(input.runTimestamp);
  var d = new Date();
  return d.getFullYear() + '-' + pad(d.getMonth() + 1, 2) + '-' + pad(d.getDate(), 2) + '-' +
    pad(d.getHours(), 2) + '.' + pad(d.getMinutes(), 2) + '.' + pad(d.getSeconds(), 2) + '.' +
    pad(Math.floor(d.getMilliseconds() / 10), 2) + '0000';
}

var acctById = {};
for (var i = 0; i < p.accounts.length; i++) acctById[String(p.accounts[i].acct_id)] = p.accounts[i];

var bals = p.balances.slice();
bals.sort(function (a, b) {
  if (a.acct_id !== b.acct_id) return a.acct_id < b.acct_id ? -1 : 1;
  if (a.type_cd !== b.type_cd) return a.type_cd < b.type_cd ? -1 : 1;
  return a.cat_cd - b.cat_cd;
});

var ZERO = BigInt(0);
var DIV = BigInt(120000); // (cents * rate-hundredths) / (100 * 1200) -> cents
var suffix = 0;
var txns = [];
var totals = {};          // acct_id -> total interest (cents, string)
var order = [];           // accounts in processing order
var skipped = [];
var defaulted = 0, zeroRate = 0, noRate = 0;

for (var k = 0; k < bals.length; k++) {
  var b = bals[k];
  var id = String(b.acct_id);
  var acct = acctById[id];
  if (!acct) { skipped.push(id + '/' + b.type_cd + '/' + b.cat_cd); continue; }
  if (totals[id] === undefined) { totals[id] = ZERO; order.push(id); }

  var rate = p.rates[acct.group_id + '|' + b.type_cd + '|' + b.cat_cd];
  if (rate === undefined) {
    rate = p.rates['STANDARD|' + b.type_cd + '|' + b.cat_cd];
    defaulted++;
    if (rate === undefined) { rate = '0'; noRate++; }
  }
  var rateBig = BigInt(rate);
  if (rateBig === ZERO) { zeroRate++; continue; }

  var monthly = (BigInt(b.bal) * rateBig) / DIV;   // BigInt division truncates toward zero
  totals[id] = totals[id] + monthly;

  suffix++;
  var now = ts();
  txns.push({
    tran_id: parm + pad(suffix, 6),
    type_cd: '07',
    cat_cd: 12,
    source: 'System',
    desc: 'Int. for a/c ' + pad(acct.acct_id, 11),
    amt: monthly.toString(),
    merchant_id: 0,
    merchant_name: '',
    merchant_city: '',
    merchant_zip: '',
    card_num: p.xref[id] === undefined ? '' : p.xref[id],
    orig_ts: now,
    proc_ts: now
  });
}

var totalsOut = {};
for (var t in totals) totalsOut[t] = totals[t].toString();

output.interestJson = JSON.stringify({
  txns: txns, totals: totalsOut, order: order,
  stats: { balances: bals.length, skippedUnknownAccount: skipped, defaultedToStandard: defaulted,
           noRateFound: noRate, zeroRate: zeroRate, transactions: txns.length }
});

```

### Update accounts and format outputs (SCRIPT, id=6ae12fb73695c563ea509559)

```javascript
// Account update: every account that had at least one category balance gets
// curr_bal += total interest and its cycle credit/debit reset to 0. All accounts are returned.
// Amounts are formatted as decimal strings with two places (CONTRACT.md).

var p = JSON.parse(input.parsedJson);
var r = JSON.parse(input.interestJson);

function money(units) {
  var s = String(units);
  var neg = s.charAt(0) === '-';
  if (neg) s = s.substring(1);
  while (s.length < 3) s = '0' + s;
  var out = s.substring(0, s.length - 2) + '.' + s.substring(s.length - 2);
  return (neg && out !== '0.00' ? '-' : '') + out;
}

var accts = [];
for (var i = 0; i < p.accounts.length; i++) {
  var a = p.accounts[i];
  var id = String(a.acct_id);
  var bal = a.curr_bal, cc = a.curr_cyc_credit, cd = a.curr_cyc_debit;
  if (r.totals[id] !== undefined) {
    bal = (BigInt(a.curr_bal) + BigInt(r.totals[id])).toString();
    cc = '0';
    cd = '0';
  }
  accts.push({
    acct_id: a.acct_id,
    active_status: a.active_status,
    curr_bal: money(bal),
    credit_limit: money(a.credit_limit),
    cash_credit_limit: money(a.cash_credit_limit),
    open_date: a.open_date,
    expiration_date: a.expiration_date,
    reissue_date: a.reissue_date,
    curr_cyc_credit: money(cc),
    curr_cyc_debit: money(cd),
    addr_zip: a.addr_zip,
    group_id: a.group_id
  });
}

var txns = [];
for (var j = 0; j < r.txns.length; j++) {
  var t = r.txns[j];
  t.amt = money(t.amt);
  txns.push(t);
}

output.accrueSystxnJson = JSON.stringify(txns);
output.accrueLedgaccJson = JSON.stringify(accts);
var st = r.stats;
st.accounts = accts.length;
st.accountsUpdated = r.order.length;
output.runSummary = JSON.stringify(st);
output.parsedJson = null;
output.interestJson = null;

```

_(server: 201 ms, 1 API call, 197 ms in API)_
