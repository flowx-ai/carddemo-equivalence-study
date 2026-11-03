# Workflow: accrue_lxb002c

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** Ledgerline ACCRUE batch step (COBOL LXB002C): monthly interest per transaction-category balance, writes interest transactions and posts the total to each account.

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae12d193695c563ea509507 | <uuid> | (0, 0) | → Parse input files (seq:<uuid>) |
| Parse input files | SCRIPT | 6ae12d1c3695c563ea50950c | <uuid> | (500, 0) | → LXB002C accrue interest (seq:<uuid>) | lang: JAVASCRIPT |
| LXB002C accrue interest | SCRIPT | 6ae12d1f3695c563ea509513 | <uuid> | (1000, 0) | → Format outputs (seq:<uuid>) | lang: JAVASCRIPT |
| Format outputs | SCRIPT | 6ae12d223695c563ea509518 | <uuid> | (1500, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae12d253695c563ea50951e | <uuid> | (2000, 0) | — |

## Systems
_(none)_

## Scripts

### Parse input files (SCRIPT, id=6ae12d1c3695c563ea50950c)

```javascript
// Parse the ACCRUE input files into records.
// Fixed-width text (.dat / oracle .txt dump), one record per line, layouts per the copybooks:
//   ledgacc  LXV022Y (300)   cardlink LXV024Y (50)   balcat LXV026Y (50)   rategrp LXV027Y (50)
// ledgacc and balcat may also arrive as the POSTDAY JSON lists (step isolation, CONTRACT.md).
// Amounts are carried as integers in units of the field's last digit (cents for V99).

function padRight(s, n) {
  s = s == null ? '' : String(s);
  while (s.length < n) s += ' ';
  return s.substring(0, n);
}
function padNum(v, n) {
  var s = v == null ? '' : String(v).trim();
  while (s.length < n) s = '0' + s;
  return s.substring(s.length - n);
}
function splitLines(text) {
  var out = [];
  if (text == null) return out;
  var ls = String(text).split(/\r?\n/);
  for (var i = 0; i < ls.length; i++) {
    if (ls[i].replace(/\s+$/, '').length > 0) out.push(ls[i]);
  }
  return out;
}
function isJsonList(text) {
  return text != null && String(text).trim().charAt(0) === '[';
}
// DISPLAY signed numeric, trailing overpunched sign. Accepts GnuCOBOL ASCII
// (p-y negative), EBCDIC-style ({ A-I positive, } J-R negative) and plain digits.
function zoned(field) {
  var s = String(field), digits = '', neg = false;
  for (var i = 0; i < s.length; i++) {
    var c = s.charAt(i), last = i === s.length - 1;
    if (c >= '0' && c <= '9') digits += c;
    else if (c === ' ') digits += '0';
    else if (c === '-') neg = true;
    else if (last && c === '{') digits += '0';
    else if (last && c >= 'A' && c <= 'I') digits += String(c.charCodeAt(0) - 64);
    else if (last && c === '}') { digits += '0'; neg = true; }
    else if (last && c >= 'J' && c <= 'R') { digits += String(c.charCodeAt(0) - 73); neg = true; }
    else if (last && c >= 'p' && c <= 'y') { digits += String(c.charCodeAt(0) - 112); neg = true; }
  }
  var n = Number(digits) || 0;
  return neg ? -n : n;
}
// "14.56" / -500 / "-0.5" -> integer units at the given scale (extra decimals truncated)
function decUnits(v, scale) {
  if (v == null || v === '') return 0;
  var s = String(v).trim().replace(/,/g, ''), neg = false;
  if (s.charAt(0) === '-') { neg = true; s = s.substring(1); }
  else if (s.charAt(0) === '+') s = s.substring(1);
  var p = s.split('.'), ip = p[0] || '0', fp = p.length > 1 ? p[1] : '';
  while (fp.length < scale) fp += '0';
  var n = Number(ip + fp.substring(0, scale)) || 0;
  return neg ? -n : n;
}
function parseJsonList(text) {
  var a = JSON.parse(String(text));
  return Array.isArray(a) ? a : [];
}

// ---- ledgacc (ACCOUNT-FILE, KSDS keyed on LACC-ID) ----
function acctFromLine(l) {
  l = padRight(l, 300);
  return {
    id: l.substr(0, 11), active_status: l.substr(11, 1),
    curr_bal: zoned(l.substr(12, 12)), credit_limit: zoned(l.substr(24, 12)),
    cash_credit_limit: zoned(l.substr(36, 12)),
    open_date: l.substr(48, 10), expiration_date: l.substr(58, 10), reissue_date: l.substr(68, 10),
    curr_cyc_credit: zoned(l.substr(78, 12)), curr_cyc_debit: zoned(l.substr(90, 12)),
    addr_zip: l.substr(102, 10), group_id: l.substr(112, 10)
  };
}
function acctFromJson(o) {
  return {
    id: padNum(o.acct_id, 11), active_status: padRight(o.active_status, 1),
    curr_bal: decUnits(o.curr_bal, 2), credit_limit: decUnits(o.credit_limit, 2),
    cash_credit_limit: decUnits(o.cash_credit_limit, 2),
    open_date: padRight(o.open_date, 10), expiration_date: padRight(o.expiration_date, 10),
    reissue_date: padRight(o.reissue_date, 10),
    curr_cyc_credit: decUnits(o.curr_cyc_credit, 2), curr_cyc_debit: decUnits(o.curr_cyc_debit, 2),
    addr_zip: padRight(o.addr_zip, 10), group_id: padRight(o.group_id, 10)
  };
}
var rawAccts = isJsonList(input.ledgacc)
  ? parseJsonList(input.ledgacc).map(acctFromJson)
  : splitLines(input.ledgacc).map(acctFromLine);

// ---- balcat (BALCAT-FILE, KSDS keyed on acct+type+cat, read sequentially) ----
function balFromLine(l) {
  l = padRight(l, 50);
  return { acct: l.substr(0, 11), type: l.substr(11, 2), cat: l.substr(13, 4), bal: zoned(l.substr(17, 11)) };
}
function balFromJson(o) {
  return { acct: padNum(o.acct_id, 11), type: padRight(o.type_cd, 2), cat: padNum(o.cat_cd, 4), bal: decUnits(o.bal, 2) };
}
var rawBals = isJsonList(input.balcat)
  ? parseJsonList(input.balcat).map(balFromJson)
  : splitLines(input.balcat).map(balFromLine);

// ---- cardlink (LINK-FILE, KSDS on card number, alternate key LACC-ID) ----
var rawLinks = splitLines(input.cardlink).map(function (l) {
  l = padRight(l, 50);
  return { card: l.substr(0, 16), clnt: l.substr(16, 9), acct: l.substr(25, 11) };
});

// ---- rategrp (RATEGRP-FILE, KSDS on group+type+cat) ----
var rawRates = splitLines(input.rategrp).map(function (l) {
  l = padRight(l, 50);
  return { key: l.substr(0, 16), rate: zoned(l.substr(16, 6)) };
});

// An indexed file holds one record per key: the first record loaded wins, later duplicates are rejected.
function firstPerKey(list, keyFn) {
  var seen = {}, out = [], dups = 0;
  for (var i = 0; i < list.length; i++) {
    var k = keyFn(list[i]);
    if (Object.prototype.hasOwnProperty.call(seen, k)) { dups++; continue; }
    seen[k] = true;
    out.push(list[i]);
  }
  return { list: out, dups: dups };
}
var accts = firstPerKey(rawAccts, function (a) { return a.id; });
var bals = firstPerKey(rawBals, function (b) { return b.acct + b.type + b.cat; });
var links = firstPerKey(rawLinks, function (k) { return k.card; });
var rates = firstPerKey(rawRates, function (r) { return r.key; });

output.parsed = {
  accounts: accts.list,
  balcats: bals.list,
  links: links.list,
  rates: rates.list,
  duplicates: { ledgacc: accts.dups, balcat: bals.dups, cardlink: links.dups, rategrp: rates.dups }
};
```

### LXB002C accrue interest (SCRIPT, id=6ae12d1f3695c563ea509513)

```javascript
// LXB002C PROCEDURE DIVISION: read the category balances in key order, compute monthly
// interest per balance, write one interest transaction each, and post the total per account.
// See assumptions.md for every decision taken where the source is silent or surprising.

var p = input.parsed;
function arr(x) { var a = []; if (x == null) return a; for (var i = 0; i < x.length; i++) a.push(x[i]); return a; }
function padRight(s, n) { s = s == null ? '' : String(s); while (s.length < n) s += ' '; return s.substring(0, n); }
function padNum(n, w) { var s = String(n); while (s.length < w) s = '0' + s; return s.substring(s.length - w); }

// Copy into native objects (input.* are host objects).
var accounts = arr(p.accounts).map(function (a) {
  return { id: String(a.id), active_status: String(a.active_status), curr_bal: Number(a.curr_bal),
    credit_limit: Number(a.credit_limit), cash_credit_limit: Number(a.cash_credit_limit),
    open_date: String(a.open_date), expiration_date: String(a.expiration_date), reissue_date: String(a.reissue_date),
    curr_cyc_credit: Number(a.curr_cyc_credit), curr_cyc_debit: Number(a.curr_cyc_debit),
    addr_zip: String(a.addr_zip), group_id: String(a.group_id) };
});
var balcats = arr(p.balcats).map(function (b) {
  return { acct: String(b.acct), type: String(b.type), cat: String(b.cat), bal: Number(b.bal) };
});
var acctByKey = {};
accounts.forEach(function (a) { acctByKey[a.id] = a; });
// LINK-FILE alternate key FD-LINK-LACC-ID (no DUPLICATES): one card per account, first loaded wins.
var linkByAcct = {};
arr(p.links).forEach(function (k) {
  var acct = String(k.acct);
  if (!Object.prototype.hasOwnProperty.call(linkByAcct, acct)) linkByAcct[acct] = { card: String(k.card), acct: acct };
});
var rateByKey = {};
arr(p.rates).forEach(function (r) { rateByKey[String(r.key)] = Number(r.rate); });

// BALCAT-FILE is INDEXED, ACCESS SEQUENTIAL: records come back in ascending key order.
balcats.sort(function (x, y) {
  var kx = x.acct + x.type + x.cat, ky = y.acct + y.type + y.cat;
  return kx < ky ? -1 : (kx > ky ? 1 : 0);
});

// PARM-DATE PIC X(10): the first 10 bytes of the EXEC PARM, space padded.
var parmDate = padRight(input.parm, 10);

// Numeric field capacity: high-order digits beyond the PIC are truncated (no ON SIZE ERROR).
var MOD_S9_9V99 = BigInt('100000000000');    // WS-MONTHLY-INT, WS-TOTAL-INT, TXN-AMT
var MOD_S9_10V99 = BigInt('1000000000000');  // LACC-CURR-BAL
function fit(v, mod) { var neg = v < BigInt(0); var a = neg ? -v : v; a = a % mod; return neg ? -a : a; }

// Z-GET-DB2-FORMAT-TIMESTAMP: FUNCTION CURRENT-DATE as YYYY-MM-DD-HH.MM.SS.hh0000
function db2Timestamp() {
  var d = new Date();
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) + '-' +
    p2(d.getHours()) + '.' + p2(d.getMinutes()) + '.' + p2(d.getSeconds()) + '.' +
    p2(Math.floor(d.getMilliseconds() / 10)) + '0000';
}

var log = ['START OF EXECUTION OF PROGRAM LXB002C'];
var txns = [];
var abend = null;
var lastAcct = null;          // WS-LAST-LACC-NUM VALUE SPACES
var firstTime = true;         // WS-FIRST-TIME VALUE 'Y'
var totalInt = BigInt(0);     // WS-TOTAL-INT
var tranIdSuffix = 0;         // WS-TRANID-SUFFIX PIC 9(06)
var acctRec = null;           // ACCOUNT-RECORD
var linkRec = null;           // CRD-LINK-RECORD
var recordCount = 0;

// 1050-UPDATE-ACCOUNT: post total interest, reset cycle totals, REWRITE by ACCOUNT-RECORD's key.
function updateAccount() {
  var target = acctByKey[acctRec.id];
  target.curr_bal = Number(fit(BigInt(acctRec.curr_bal) + totalInt, MOD_S9_10V99));
  target.curr_cyc_credit = 0;
  target.curr_cyc_debit = 0;
}

for (var i = 0; i < balcats.length; i++) {
  var b = balcats[i];
  recordCount++;
  if (b.acct !== lastAcct) {
    if (!firstTime) updateAccount(); else firstTime = false;
    totalInt = BigInt(0);
    lastAcct = b.acct;
    // 1100-GET-LACC-DATA: any status other than '00' abends
    var a = acctByKey[b.acct];
    if (!a) {
      log.push('ACCOUNT NOT FOUND: ' + b.acct, 'ERROR READING ACCOUNT FILE', 'FILE STATUS IS: NNNN0023', 'ABENDING PROGRAM');
      abend = 'ACCOUNT NOT FOUND: ' + b.acct;
      break;
    }
    acctRec = { id: a.id, curr_bal: a.curr_bal, group_id: a.group_id };
    // 1110-GET-LINK-DATA: read by alternate key; not found abends
    var k = linkByAcct[b.acct];
    if (!k) {
      log.push('ACCOUNT NOT FOUND: ' + b.acct, 'ERROR READING XREF FILE', 'FILE STATUS IS: NNNN0023', 'ABENDING PROGRAM');
      abend = 'CARD LINK NOT FOUND FOR ACCOUNT: ' + b.acct;
      break;
    }
    linkRec = k;
  }
  // 1200-GET-INTEREST-RATE: account group, else 'STANDARD' (1200-A); neither found abends
  var key = padRight(acctRec.group_id, 10) + b.type + b.cat;
  var rate;
  if (Object.prototype.hasOwnProperty.call(rateByKey, key)) {
    rate = rateByKey[key];
  } else {
    log.push('DISCLOSURE GROUP RECORD MISSING', 'TRY WITH STANDARD GROUP CODE');
    var stdKey = padRight('STANDARD', 10) + b.type + b.cat;
    if (!Object.prototype.hasOwnProperty.call(rateByKey, stdKey)) {
      log.push('ERROR READING STANDARD DISCLOSURE GROUP', 'FILE STATUS IS: NNNN0023', 'ABENDING PROGRAM');
      abend = 'NO RATE GROUP FOR ' + key + ' OR ' + stdKey;
      break;
    }
    rate = rateByKey[stdKey];
  }
  if (rate !== 0) {
    // 1300-COMPUTE-INTEREST: (bal * rate) / 1200, truncated to 2 decimals (no ROUNDED).
    // bal in cents (scale 2) * rate (scale 2) -> scale 4; /1200 and /100 to get cents.
    var monthly = fit(BigInt(b.bal) * BigInt(rate) / BigInt(120000), MOD_S9_9V99);
    totalInt = fit(totalInt + monthly, MOD_S9_9V99);
    // 1300-B-WRITE-TX
    tranIdSuffix = (tranIdSuffix + 1) % 1000000;
    var ts = db2Timestamp();
    txns.push({
      tran_id: parmDate + padNum(tranIdSuffix, 6),
      type_cd: '07',
      cat_cd: 12,
      source: 'Batch',
      desc: 'Accrued int ' + acctRec.id,
      amt: Number(monthly),
      merchant_id: 0,
      merchant_name: '',
      merchant_city: '',
      merchant_zip: '',
      card_num: linkRec.card,
      orig_ts: ts,
      proc_ts: ts
    });
  }
  // 1400-COMPUTE-FEES: "To be implemented" - no effect.
}
// The ELSE branch (1050-UPDATE-ACCOUNT at end of file) is unreachable: PERFORM UNTIL tests before
// each iteration, so once 1000-BALCATF-GET-NEXT sets END-OF-FILE = 'Y' the loop exits.
// The last account read is therefore never rewritten.

if (!abend) log.push('END OF EXECUTION OF PROGRAM LXB002C');

output.accrued = {
  accounts: accounts,
  txns: txns,
  returnCode: abend ? 16 : 0,
  abendMessage: abend || '',
  recordsRead: recordCount,
  log: log
};
```

### Format outputs (SCRIPT, id=6ae12d223695c563ea509518)

```javascript
// Shape the ACCRUE outputs per CONTRACT.md: accrue_systxn (transaction fields) and
// accrue_ledgacc (account fields). Amounts as strings with two decimals, strings right-trimmed.

var r = input.accrued;
function arr(x) { var a = []; if (x == null) return a; for (var i = 0; i < x.length; i++) a.push(x[i]); return a; }
function rtrim(s) { return s == null ? '' : String(s).replace(/\s+$/, ''); }
function amt(units) {
  var n = Number(units), neg = n < 0, s = String(Math.abs(n));
  while (s.length < 3) s = '0' + s;
  return (neg ? '-' : '') + s.substring(0, s.length - 2) + '.' + s.substring(s.length - 2);
}
function toInt(s) { var n = Number(String(s).replace(/ /g, '0')); return isNaN(n) ? 0 : n; }

output.accrue_systxn = arr(r.txns).map(function (t) {
  return {
    tran_id: rtrim(t.tran_id), type_cd: rtrim(t.type_cd), cat_cd: Number(t.cat_cd), source: rtrim(t.source),
    desc: rtrim(t.desc), amt: amt(t.amt), merchant_id: Number(t.merchant_id),
    merchant_name: rtrim(t.merchant_name), merchant_city: rtrim(t.merchant_city), merchant_zip: rtrim(t.merchant_zip),
    card_num: rtrim(t.card_num), orig_ts: rtrim(t.orig_ts), proc_ts: rtrim(t.proc_ts)
  };
});

output.accrue_ledgacc = arr(r.accounts).map(function (a) {
  return {
    acct_id: toInt(a.id), active_status: rtrim(a.active_status),
    curr_bal: amt(a.curr_bal), credit_limit: amt(a.credit_limit), cash_credit_limit: amt(a.cash_credit_limit),
    open_date: rtrim(a.open_date), expiration_date: rtrim(a.expiration_date), reissue_date: rtrim(a.reissue_date),
    curr_cyc_credit: amt(a.curr_cyc_credit), curr_cyc_debit: amt(a.curr_cyc_debit),
    addr_zip: rtrim(a.addr_zip), group_id: rtrim(a.group_id)
  };
});

output.returnCode = Number(r.returnCode);
output.abendMessage = String(r.abendMessage);
output.runLog = arr(r.log).map(String);

// Drop the bulky intermediates so they are not carried to END.
output.parsed = null;
output.accrued = null;
```

_(server: 361 ms, 1 API call, 358 ms in API)_
