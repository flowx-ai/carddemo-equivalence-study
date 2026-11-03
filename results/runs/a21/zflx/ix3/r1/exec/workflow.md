# Workflow: transaction-report

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** P-18 / TRANREPT (CBTRN03C): daily transaction report. Inputs: transact, cardxref, trantype, trancatg (fixed-width file contents), startDate, endDate. Output: tranrept_report (133-column lines), lineCount, grandTotal, referenceErrors.

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae1eb853695c563ea50ae3a | <uuid> | (0, 0) | → Select Transactions in Range (seq:<uuid>) |
| Select Transactions in Range | SCRIPT | 6ae1eb873695c563ea50ae3b | <uuid> | (500, 0) | → Get Account, Type and Category Names (seq:<uuid>) | lang: JAVASCRIPT |
| Get Account, Type and Category Names | SCRIPT | 6ae1eb8a3695c563ea50ae3c | <uuid> | (1000, 0) | → Add Report Lines and Totals (seq:<uuid>) | lang: JAVASCRIPT |
| Add Report Lines and Totals | SCRIPT | 6ae1eb8d3695c563ea50ae3d | <uuid> | (1500, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae1eb903695c563ea50ae3e | <uuid> | (2000, 0) | — |

## Systems
_(none)_

## Scripts

### Select Transactions in Range (SCRIPT, id=6ae1eb873695c563ea50ae3b)

```javascript
// SCRIPT node "Select Transactions in Range" — BR-01, BR-02, BR-05, BR-07
// Reads transact.dat (CVTRA05Y, 350 bytes) and keeps the transactions whose processed date
// (TRAN-PROC-TS, positions 305-314) lies in [startDate, endDate], drops interest postings
// (type 01 / category 0005) and sorts the rest by card number (stable).

function toText(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (v.length !== undefined && typeof v !== 'string') {
    var parts = [];
    for (var i = 0; i < v.length; i++) parts.push(String(v[i]));
    return parts.join('\n');
  }
  return String(v);
}

function padRight(s, n) {
  s = s === null || s === undefined ? '' : String(s);
  while (s.length < n) s += ' ';
  return s.substring(0, n);
}

function normDate(v, dflt) {
  var s = v === null || v === undefined ? '' : String(v).trim();
  if (s === '') return dflt;
  if (/^\d{8}$/.test(s)) return s.substring(0, 4) + '-' + s.substring(4, 6) + '-' + s.substring(6, 8);
  return s.substring(0, 10);
}

// TRAN-AMT S9(9)V99: zoned decimal, sign overpunched on the last digit; also accepts an explicit
// leading/trailing sign or a decimal point. Returns integer cents.
function parseAmount(raw) {
  var s = String(raw).trim();
  if (s === '') return 0;
  var sign = 1;
  if (s.charAt(0) === '-' || s.charAt(0) === '+') { if (s.charAt(0) === '-') sign = -1; s = s.substring(1); }
  var lastCh = s.charAt(s.length - 1);
  if (lastCh === '-' || lastCh === '+') { if (lastCh === '-') sign = -1; s = s.substring(0, s.length - 1); lastCh = s.charAt(s.length - 1); }
  var pos = '{ABCDEFGHI', neg = '}JKLMNOPQR';
  if (pos.indexOf(lastCh) >= 0) s = s.substring(0, s.length - 1) + pos.indexOf(lastCh);
  else if (neg.indexOf(lastCh) >= 0) { s = s.substring(0, s.length - 1) + neg.indexOf(lastCh); sign = -sign; }
  s = s.replace(/\s/g, '');
  var cents;
  if (s.indexOf('.') >= 0) {
    var p = s.split('.');
    cents = parseInt(p[0] || '0', 10) * 100 + parseInt(((p[1] || '') + '00').substring(0, 2), 10);
  } else {
    cents = parseInt(s || '0', 10); // implied V99
  }
  if (isNaN(cents)) cents = 0;
  return sign * cents;
}

var DEFAULT_START = '2022-01-01'; // BR-05 reportStartDate (PARM-START-DATE)
var DEFAULT_END = '2022-07-06';   // BR-05 reportEndDate (PARM-END-DATE)

var startDate = normDate(input.startDate, DEFAULT_START);
var endDate = normDate(input.endDate, DEFAULT_END);

var lines = toText(input.transact).split(/\r?\n/);
var selected = [];
var readCount = 0, outOfRange = 0, interestSkipped = 0;
for (var i = 0; i < lines.length; i++) {
  var raw = lines[i];
  if (raw.trim() === '') continue;
  var r = padRight(raw, 350);
  readCount++;
  var procDate = r.substring(304, 314);
  if (procDate < startDate || procDate > endDate) { outOfRange++; continue; } // BR-01
  var typeCd = r.substring(16, 18);
  var catCd = r.substring(18, 22);
  if (typeCd === '01' && parseInt(catCd, 10) === 5) { interestSkipped++; continue; } // BR-07
  selected.push({
    seq: selected.length,
    tranId: r.substring(0, 16),
    typeCd: typeCd,
    catCd: catCd,
    source: r.substring(22, 32),
    amountCents: parseAmount(r.substring(132, 143)),
    cardNum: r.substring(262, 278)
  });
}

// BR-02: sort by card number; ties keep file order (stable)
selected.sort(function (a, b) {
  if (a.cardNum < b.cardNum) return -1;
  if (a.cardNum > b.cardNum) return 1;
  return a.seq - b.seq;
});

output.startDate = startDate;
output.endDate = endDate;
output.selectedTransactions = selected;
output.selectionStats = { read: readCount, outOfRange: outOfRange, interestSkipped: interestSkipped, selected: selected.length };
output.transact = null; // drop the raw file from the payload once parsed

```

### Get Account, Type and Category Names (SCRIPT, id=6ae1eb8a3695c563ea50ae3c)

```javascript
// SCRIPT node "Get Account, Type and Category Names" — BR-03
// Enriches each selected transaction with the account id (cardxref.dat, CVACT03Y), the type
// description (trantype.dat, CVTRA03Y) and the category description (trancatg.dat, CVTRA04Y).
// An unknown reference is flagged in referenceErrors and the run continues (AC-5).

function toText(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (v.length !== undefined && typeof v !== 'string') {
    var parts = [];
    for (var i = 0; i < v.length; i++) parts.push(String(v[i]));
    return parts.join('\n');
  }
  return String(v);
}

function padRight(s, n) {
  s = s === null || s === undefined ? '' : String(s);
  while (s.length < n) s += ' ';
  return s.substring(0, n);
}

function records(v, len) {
  var out = [];
  var ls = toText(v).split(/\r?\n/);
  for (var i = 0; i < ls.length; i++) if (ls[i].trim() !== '') out.push(padRight(ls[i], len));
  return out;
}

var xref = {};
records(input.cardxref, 50).forEach(function (r) {
  var card = r.substring(0, 16);
  if (!(card in xref)) xref[card] = r.substring(25, 36); // XREF-ACCT-ID 9(11)
});
var types = {};
records(input.trantype, 60).forEach(function (r) { types[r.substring(0, 2)] = r.substring(2, 52); });
var cats = {};
records(input.trancatg, 60).forEach(function (r) {
  cats[r.substring(0, 2) + '|' + parseInt(r.substring(2, 6), 10)] = r.substring(6, 56);
});

var errors = [];
var src = input.selectedTransactions || [];
var lines = [];
for (var i = 0; i < src.length; i++) {
  var t = src[i];
  var cardNum = String(t.cardNum), typeCd = String(t.typeCd), catCd = String(t.catCd);
  var acct = xref[cardNum];
  if (acct === undefined) {
    errors.push({ tranId: String(t.tranId), key: cardNum, reason: 'CARD NOT FOUND IN XREF' });
    acct = '';
  }
  var typeDesc = types[typeCd];
  if (typeDesc === undefined) {
    errors.push({ tranId: String(t.tranId), key: typeCd, reason: 'TRANSACTION TYPE NOT FOUND' });
    typeDesc = '';
  }
  var catDesc = cats[typeCd + '|' + parseInt(catCd, 10)];
  if (catDesc === undefined) {
    errors.push({ tranId: String(t.tranId), key: typeCd + catCd, reason: 'TRANSACTION CATEGORY NOT FOUND' });
    catDesc = '';
  }
  lines.push({
    tranId: String(t.tranId),
    accountId: acct,
    cardNum: cardNum,
    typeCd: typeCd,
    typeDesc: typeDesc,
    catCd: catCd,
    catDesc: catDesc,
    source: String(t.source),
    amountCents: Number(t.amountCents)
  });
}

output.reportLines = lines;
output.referenceErrors = errors;
output.selectedTransactions = null;
output.cardxref = null;
output.trantype = null;
output.trancatg = null;

```

### Add Report Lines and Totals (SCRIPT, id=6ae1eb8d3695c563ea50ae3d)

```javascript
// SCRIPT node "Add Report Lines and Totals" — BR-04, BR-06
// Lays the enriched lines out as the 133-column DALYREPT print file (CVTRA07Y layout):
// page header, detail lines, account total on card change, page total every PAGE_SIZE lines,
// final page total and grand total.

var PAGE_SIZE = 20; // lines per page, header and total lines included (CBTRN03C WS-PAGE-SIZE)
var WIDTH = 133;

function padRight(s, n) {
  s = s === null || s === undefined ? '' : String(s);
  while (s.length < n) s += ' ';
  return s.substring(0, n);
}
function padLeft(s, n, ch) {
  s = String(s);
  while (s.length < n) s = ch + s;
  return s.substring(s.length - n);
}
function repeat(ch, n) { var s = ''; for (var i = 0; i < n; i++) s += ch; return s; }

// COBOL edited pictures -ZZZ,ZZZ,ZZZ.ZZ (signChar '-') and +ZZZ,ZZZ,ZZZ.ZZ (signChar '+').
// All digit positions are Z, so a zero value prints as all spaces.
function editAmount(cents, signChar) {
  var neg = cents < 0;
  var a = Math.abs(cents);
  if (a === 0) return repeat(' ', 15);
  var digits = padLeft(String(Math.floor(a / 100) % 1000000000), 9, '0');
  var dec = padLeft(String(a % 100), 2, '0');
  var body = '', started = false;
  for (var i = 0; i < 9; i++) {
    if (i === 3 || i === 6) body += started ? ',' : ' ';
    var d = digits.charAt(i);
    if (!started && d === '0') body += ' ';
    else { started = true; body += d; }
  }
  var sign = neg ? '-' : (signChar === '+' ? '+' : ' ');
  return sign + body + '.' + dec;
}

var startDate = String(input.startDate);
var endDate = String(input.endDate);

var HDR_REPORT = padRight('DALYREPT', 38) + padRight('Daily Transaction Report', 41) +
  'Date Range: ' + padRight(startDate, 10) + ' to ' + padRight(endDate, 10);
var HDR_COLUMNS = padRight('Transaction ID', 17) + padRight('Account ID', 12) +
  padRight('Transaction Type', 19) + padRight('Tran Category', 35) + padRight('Tran Source', 14) +
  ' ' + padRight('        Amount', 16);
var RULE = repeat('-', WIDTH);

var out = [];
var lineCounter = 0;
var pageTotal = 0, accountTotal = 0, grandTotal = 0;
var detailCount = 0;

function emit(s) { out.push(padRight(s, WIDTH)); lineCounter++; }
function writeHeaders() { emit(HDR_REPORT); emit(''); emit(HDR_COLUMNS); emit(RULE); }
function writePageTotals() {
  emit(padRight('Page Total', 11) + repeat('.', 86) + editAmount(pageTotal, '+'));
  grandTotal += pageTotal;
  pageTotal = 0;
  emit(RULE);
}
function writeAccountTotals() {
  emit(padRight('Account Total', 13) + repeat('.', 84) + editAmount(accountTotal, '+'));
  accountTotal = 0;
  emit(RULE);
}
function writeDetail(l) {
  emit(padRight(l.tranId, 16) + ' ' + padRight(l.accountId, 11) + ' ' +
    padRight(l.typeCd, 2) + '-' + padRight(l.typeDesc, 15) + ' ' +
    padLeft(String(parseInt(l.catCd, 10) || 0), 4, '0') + '-' + padRight(l.catDesc, 29) + ' ' +
    padRight(l.source, 10) + repeat(' ', 4) + editAmount(l.amountCents, '-') + '  ');
  detailCount++;
}

var lines = input.reportLines || [];
var firstTime = true;
var currentCard = null;
for (var i = 0; i < lines.length; i++) {
  var l = lines[i];
  var amt = Number(l.amountCents);
  if (currentCard !== String(l.cardNum)) {
    if (!firstTime) writeAccountTotals(); // card total on card change
    currentCard = String(l.cardNum);
  }
  if (firstTime) { firstTime = false; writeHeaders(); }
  if (lineCounter % PAGE_SIZE === 0) { writePageTotals(); writeHeaders(); }
  pageTotal += amt;
  accountTotal += amt;
  writeDetail(l);
}
if (firstTime) writeHeaders(); // empty range: still print one page with zero totals (AC-4)
writePageTotals();
out.push(padRight(padRight('Grand Total', 11) + repeat('.', 86) + editAmount(grandTotal, '+'), WIDTH));

output.tranrept_report = out;
output.lineCount = detailCount;
output.grandTotal = (grandTotal / 100).toFixed(2);
output.reportLines = null;

```

_(server: 173 ms, 1 API call, 169 ms in API)_
