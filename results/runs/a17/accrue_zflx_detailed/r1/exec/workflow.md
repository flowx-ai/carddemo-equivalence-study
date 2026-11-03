# Workflow: interest-calculation

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** Ledgerline ACCRUE step (legacy job ACCRUE / LXB002C, wiki P-15). Reads account, category-balance, disclosure-group and card-xref records, computes monthly interest per category balance, writes interest transactions (type 07 / cat 12) and updates accounts (balance += total interest, cycle credit/debit reset).

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae129a23695c563ea5094c9 | <uuid> | (0, 0) | → Parse input files (seq:<uuid>) |
| Parse input files | SCRIPT | 6ae129a53695c563ea5094ca | <uuid> | (500, 0) | → Accrue interest (seq:<uuid>) | lang: JAVASCRIPT |
| Accrue interest | SCRIPT | 6ae129a83695c563ea5094cb | <uuid> | (1000, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae129ab3695c563ea5094cc | <uuid> | (1500, 0) | — |

## Systems
_(none)_

## Scripts

### Parse input files (SCRIPT, id=6ae129a53695c563ea5094ca)

```javascript
// Parse the ACCRUE inputs. Each *File input is the raw content of one input file:
//   ledgaccFile  - LXV022Y account records (300)      or POSTDAY account JSON (contract account fields)
//   balcatFile   - LXV026Y category balances (50)     or POSTDAY balcat JSON (acct_id, type_cd, cat_cd, bal)
//   rategrpFile  - LXV027Y disclosure groups (50)
//   cardlinkFile - LXV024Y card xref (50)
// Amounts are kept as integers in minor units (cents; rates in hundredths of a percent).

function text(v) { return v === null || v === undefined ? '' : String(v); }
function rtrim(s) { return s.replace(/\s+$/, ''); }
function records(raw) {
  return text(raw).split(/\r?\n/).filter(function (l) { return rtrim(l).length > 0; });
}
function field(line, from, to) { return line.substring(from, to); }
function isJson(raw) { return text(raw).replace(/^\s+/, '').charAt(0) === '['; }
function typeCode(v) { var s = text(v).trim(); return /^\d$/.test(s) ? '0' + s : s; }
function intOf(v) { var s = text(v).trim(); return s === '' ? 0 : parseInt(s, 10); }

// Zoned decimal with trailing overpunch sign (e.g. "0150{" = +1500, "0000001J" = -11) -> integer
var POS = '{ABCDEFGHI', NEG = '}JKLMNOPQR', NEG_ASCII = 'pqrstuvwxy';
function zoned(raw) {
  var s = text(raw).trim();
  if (s === '') return 0;
  var sign = 1;
  if (s.charAt(0) === '-') { sign = -1; s = s.substring(1); }
  else if (s.charAt(0) === '+') { s = s.substring(1); }
  var last = s.charAt(s.length - 1), d;
  if (last >= '0' && last <= '9') d = last;
  else if (POS.indexOf(last) >= 0) d = String(POS.indexOf(last));
  else if (NEG.indexOf(last) >= 0) { d = String(NEG.indexOf(last)); sign = -sign; }
  else if (NEG_ASCII.indexOf(last) >= 0) { d = String(NEG_ASCII.indexOf(last)); sign = -sign; }
  else throw new Error('Invalid zoned decimal: "' + raw + '"');
  var digits = (s.substring(0, s.length - 1) + d).replace(/ /g, '0');
  if (!/^\d+$/.test(digits)) throw new Error('Invalid zoned decimal: "' + raw + '"');
  var n = parseInt(digits, 10);
  return n === 0 ? 0 : sign * n;
}
// JSON amount ("14.56", -500, "-0.5") -> integer in minor units
function minor(v, dec) {
  if (v === null || v === undefined || text(v).trim() === '') return 0;
  var s = typeof v === 'number' ? v.toFixed(dec) : text(v).trim();
  var neg = s.charAt(0) === '-';
  s = s.replace(/^[+-]/, '');
  var p = s.split('.'), frac = (p[1] || '').substring(0, dec);
  while (frac.length < dec) frac += '0';
  var n = parseInt((p[0] || '0') + frac, 10);
  return neg && n !== 0 ? -n : n;
}

var accounts = [];
if (isJson(input.ledgaccFile)) {
  JSON.parse(text(input.ledgaccFile)).forEach(function (a) {
    accounts.push({
      acct_id: intOf(a.acct_id), active_status: text(a.active_status).trim(),
      curr_bal: minor(a.curr_bal, 2), credit_limit: minor(a.credit_limit, 2),
      cash_credit_limit: minor(a.cash_credit_limit, 2),
      open_date: text(a.open_date).trim(), expiration_date: text(a.expiration_date).trim(),
      reissue_date: text(a.reissue_date).trim(),
      curr_cyc_credit: minor(a.curr_cyc_credit, 2), curr_cyc_debit: minor(a.curr_cyc_debit, 2),
      addr_zip: text(a.addr_zip).trim(), group_id: text(a.group_id).trim()
    });
  });
} else {
  records(input.ledgaccFile).forEach(function (l) {            // LXV022Y
    accounts.push({
      acct_id: intOf(field(l, 0, 11)), active_status: field(l, 11, 12).trim(),
      curr_bal: zoned(field(l, 12, 24)), credit_limit: zoned(field(l, 24, 36)),
      cash_credit_limit: zoned(field(l, 36, 48)),
      open_date: field(l, 48, 58).trim(), expiration_date: field(l, 58, 68).trim(),
      reissue_date: field(l, 68, 78).trim(),
      curr_cyc_credit: zoned(field(l, 78, 90)), curr_cyc_debit: zoned(field(l, 90, 102)),
      addr_zip: field(l, 102, 112).trim(), group_id: field(l, 112, 122).trim()
    });
  });
}

var balances = [];
if (isJson(input.balcatFile)) {
  JSON.parse(text(input.balcatFile)).forEach(function (b) {
    balances.push({ acct_id: intOf(b.acct_id), type_cd: typeCode(b.type_cd),
                    cat_cd: intOf(b.cat_cd), bal: minor(b.bal, 2) });
  });
} else {
  records(input.balcatFile).forEach(function (l) {             // LXV026Y
    balances.push({ acct_id: intOf(field(l, 0, 11)), type_cd: typeCode(field(l, 11, 13)),
                    cat_cd: intOf(field(l, 13, 17)), bal: zoned(field(l, 17, 28)) });
  });
}

var rates = [];
records(input.rategrpFile).forEach(function (l) {              // LXV027Y
  rates.push({ group_id: field(l, 0, 10).trim(), type_cd: typeCode(field(l, 10, 12)),
               cat_cd: intOf(field(l, 12, 16)), rate: zoned(field(l, 16, 22)) });
});

var xrefs = [];
records(input.cardlinkFile).forEach(function (l) {             // LXV024Y
  xrefs.push({ card_num: field(l, 0, 16).trim(), cust_id: intOf(field(l, 16, 25)),
               acct_id: intOf(field(l, 25, 36)) });
});

output.accounts = accounts;
output.balances = balances;
output.rates = rates;
output.xrefs = xrefs;
// raw file contents are no longer needed downstream
output.ledgaccFile = null;
output.balcatFile = null;
output.rategrpFile = null;
output.cardlinkFile = null;
```

### Accrue interest (SCRIPT, id=6ae129a83695c563ea5094cb)

```javascript
// LXB002C / P-15 interest calculation over the parsed records (integers in minor units).
var RUN_PARM = String(input.interestRunDate || '2022071800').trim(); // BR-05, legacy PARM
var DIVISOR = 1200;                // 12 months x 100 (percent)
var FALLBACK_GROUP = 'STANDARD';   // BR-02
var TXN_TYPE = '07', TXN_CAT = 12, TXN_SOURCE = 'Batch', DESC_PREFIX = 'Accrued int '; // BR-04

function copy(list) {           // workflow data arrives as host objects: copy into plain JS
  var out = [], n = list ? list.length : 0;
  for (var i = 0; i < n; i++) { var o = list[i], c = {}; for (var k in o) c[k] = o[k]; out.push(c); }
  return out;
}
function zeroPad(v, len) { var s = String(v); while (s.length < len) s = '0' + s; return s; }
function amount(c) {            // minor units -> "-123.45"
  var neg = c < 0, a = Math.abs(c);
  var s = Math.floor(a / 100) + '.' + zeroPad(a % 100, 2);
  return neg ? '-' + s : s;
}
// BR-03 + BR-08: (balance x rate) / 1200, truncated to 2 decimals (COBOL COMPUTE without ROUNDED).
// balance in cents, rate in hundredths of a percent -> cents = trunc(bal * rate / 120000)
function monthlyInterest(balCents, rateHundredths) {
  if (typeof BigInt === 'function') {
    return Number(BigInt(balCents) * BigInt(rateHundredths) / BigInt(DIVISOR * 100));
  }
  return Math.trunc(balCents * rateHundredths / (DIVISOR * 100));
}
function db2Timestamp(d) {      // YYYY-MM-DD-HH.MM.SS.hh0000
  return d.getUTCFullYear() + '-' + zeroPad(d.getUTCMonth() + 1, 2) + '-' + zeroPad(d.getUTCDate(), 2) +
    '-' + zeroPad(d.getUTCHours(), 2) + '.' + zeroPad(d.getUTCMinutes(), 2) + '.' + zeroPad(d.getUTCSeconds(), 2) +
    '.' + zeroPad(Math.floor(d.getUTCMilliseconds() / 10), 2) + '0000';
}

var accounts = copy(input.accounts);
var balances = copy(input.balances);
var acctById = {}, rateByKey = {}, cardByAcct = {};
accounts.forEach(function (a) { acctById[a.acct_id] = a; });
copy(input.rates).forEach(function (r) { rateByKey[r.group_id + '|' + r.type_cd + '|' + r.cat_cd] = r.rate; });
copy(input.xrefs).forEach(function (x) { if (!(x.acct_id in cardByAcct)) cardByAcct[x.acct_id] = x.card_num; });

var notes = { fallbackUsed: 0, rateMissing: [], accountMissing: [], xrefMissing: [] };

// BR-01 / BR-02: groupId + typeCode + categoryCode, else STANDARD + typeCode + categoryCode
function interestRate(groupId, typeCd, catCd) {
  var key = groupId + '|' + typeCd + '|' + catCd;
  if (key in rateByKey) return rateByKey[key];
  var fallback = FALLBACK_GROUP + '|' + typeCd + '|' + catCd;
  if (fallback in rateByKey) { notes.fallbackUsed++; return rateByKey[fallback]; }
  notes.rateMissing.push(key);
  return 0;
}

// KSDS sequential read: category balances in key order accountId + typeCode + categoryCode
balances.sort(function (x, y) {
  if (x.acct_id !== y.acct_id) return x.acct_id - y.acct_id;
  if (x.type_cd !== y.type_cd) return x.type_cd < y.type_cd ? -1 : 1;
  return x.cat_cd - y.cat_cd;
});

var timestamp = db2Timestamp(new Date());
var transactions = [], suffix = 0;
var currentId = null, current = null, cardNum = '', totalInterest = 0;

// BR-06: on change of account, add the accumulated interest and reset the cycle totals
function closeAccount() {
  if (current === null) return;
  current.curr_bal += totalInterest;
  current.curr_cyc_credit = 0;
  current.curr_cyc_debit = 0;
}

balances.forEach(function (b) {
  if (b.acct_id !== currentId) {
    closeAccount();
    currentId = b.acct_id;
    totalInterest = 0;
    current = acctById[b.acct_id] || null;
    if (current === null) notes.accountMissing.push(b.acct_id);
    cardNum = cardByAcct[b.acct_id];
    if (cardNum === undefined) { cardNum = ''; if (current !== null) notes.xrefMissing.push(b.acct_id); }
  }
  if (current === null) return;
  var rate = interestRate(current.group_id, b.type_cd, b.cat_cd);
  if (rate === 0) return;                                   // BR-03 / BR-10 / ZEROAPR
  var interest = monthlyInterest(b.bal, rate);
  totalInterest += interest;
  suffix++;
  transactions.push({                                       // BR-04 / BR-05
    tran_id: RUN_PARM + zeroPad(suffix, 6),
    type_cd: TXN_TYPE,
    cat_cd: TXN_CAT,
    source: TXN_SOURCE,
    desc: DESC_PREFIX + zeroPad(current.acct_id, 11),
    amt: amount(interest),
    merchant_id: 0,
    merchant_name: '',
    merchant_city: '',
    merchant_zip: '',
    card_num: cardNum,
    orig_ts: timestamp,
    proc_ts: timestamp
  });
  // BR-07: fees (1400-COMPUTE-FEES) are an empty stub - nothing charged
});
closeAccount();                                             // last account at end of file

output.accrue_systxn = transactions;
output.accrue_ledgacc = accounts.map(function (a) {
  return {
    acct_id: a.acct_id, active_status: a.active_status,
    curr_bal: amount(a.curr_bal), credit_limit: amount(a.credit_limit),
    cash_credit_limit: amount(a.cash_credit_limit),
    open_date: a.open_date, expiration_date: a.expiration_date, reissue_date: a.reissue_date,
    curr_cyc_credit: amount(a.curr_cyc_credit), curr_cyc_debit: amount(a.curr_cyc_debit),
    addr_zip: a.addr_zip, group_id: a.group_id
  };
});
output.summary = {
  runParm: RUN_PARM, balancesRead: balances.length, accounts: accounts.length,
  interestTransactions: transactions.length, standardFallbacks: notes.fallbackUsed,
  rateMissing: notes.rateMissing, accountMissing: notes.accountMissing, xrefMissing: notes.xrefMissing
};
// intermediate records are not part of the step's result
output.accounts = null;
output.balances = null;
output.rates = null;
output.xrefs = null;
```

_(server: 313 ms, 1 API call, 309 ms in API)_
