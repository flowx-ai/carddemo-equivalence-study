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
