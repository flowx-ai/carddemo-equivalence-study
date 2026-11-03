# Workflow: tranrept_daily_transaction_report

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** CardDemo TRANREPT / CBTRN03C (P-18 transaction-report): reads transact.dat, cardxref.dat, trantype.dat, trancatg.dat (fixed width) and returns tranrept_report (133-column report lines joined by \n).

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae1ed453695c563ea50ae5b | <uuid> | (0, 0) | → Select Transactions in Range (seq:<uuid>) |
| Select Transactions in Range | SCRIPT | 6ae1ed483695c563ea50ae5c | <uuid> | (500, 0) | → Get Type and Category Names (seq:<uuid>) | lang: JAVASCRIPT |
| Get Type and Category Names | SCRIPT | 6ae1ed4a3695c563ea50ae5d | <uuid> | (1000, 0) | → Add Report Lines and Totals (seq:<uuid>) | lang: JAVASCRIPT |
| Add Report Lines and Totals | SCRIPT | 6ae1ed4d3695c563ea50ae5e | <uuid> | (1500, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae1ed503695c563ea50ae5f | <uuid> | (2000, 0) | — |

## Systems
_(none)_

## Scripts

### Select Transactions in Range (SCRIPT, id=6ae1ed483695c563ea50ae5c)

```javascript
// P-18 transaction-report: Select Transactions in Range (TRANREPT.prc REPROC + SORT).
// BR-01 filter on processed date (TRAN-PROC-TS(1:10)) between start and end inclusive.
// BR-02 sort by card number (stable: equal cards keep file order).
// BR-05 default range 2022-01-01 .. 2022-07-06 when no run parameter is given.
// BR-07 interest postings (type 01, category 0005) are left out entirely.
function recordLines(s) {
  if (s === null || s === undefined) return [];
  var parts = String(s).replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  var out = [];
  for (var i = 0; i < parts.length; i++) {
    if (parts[i].replace(/\s+$/, "").length > 0) out.push(parts[i]);
  }
  return out;
}
function pad(s, n) {
  s = (s === null || s === undefined) ? "" : String(s);
  while (s.length < n) s += " ";
  return s.substring(0, n);
}
// S9(n)V99 zoned decimal (sign overpunched in the last byte) -> integer cents.
function zonedCents(field) {
  var f = String(field).trim();
  if (f.length === 0) return 0;
  var neg = false;
  if (f.charAt(0) === "-" || f.charAt(0) === "+") { neg = f.charAt(0) === "-"; f = f.substring(1); }
  var last = f.charAt(f.length - 1);
  if (last === "-" || last === "+") { neg = last === "-"; f = f.substring(0, f.length - 1); last = f.charAt(f.length - 1); }
  var body = f.substring(0, f.length - 1);
  var d;
  var pos = "{ABCDEFGHI".indexOf(last);
  var ng = "}JKLMNOPQR".indexOf(last);
  var gn = "pqrstuvwxy".indexOf(last);
  if (pos >= 0) { d = pos; }
  else if (ng >= 0) { d = ng; neg = true; }
  else if (gn >= 0) { d = gn; neg = true; }
  else { d = parseInt(last, 10); if (isNaN(d)) d = 0; }
  var digits = (body + String(d)).replace(/[^0-9]/g, "");
  var v = digits.length ? parseInt(digits, 10) : 0;
  return neg ? -v : v;
}

var start = (input.startDate === null || input.startDate === undefined) ? "" : String(input.startDate).trim();
var end = (input.endDate === null || input.endDate === undefined) ? "" : String(input.endDate).trim();
if (start.length === 0) start = "2022-01-01";
if (end.length === 0) end = "2022-07-06";

var recs = recordLines(input.transactDat);
var selected = [];
var excludedInterest = 0;
for (var i = 0; i < recs.length; i++) {
  var r = pad(recs[i], 350);
  var t = {
    seq: i,
    id: r.substring(0, 16),
    typeCd: r.substring(16, 18),
    catCd: r.substring(18, 22),
    source: r.substring(22, 32),
    amtCents: zonedCents(r.substring(132, 143)),
    cardNum: r.substring(262, 278),
    procTs: r.substring(304, 330)
  };
  var procDate = t.procTs.substring(0, 10);
  if (procDate < start || procDate > end) continue;
  if (t.typeCd === "01" && parseInt(t.catCd, 10) === 5) { excludedInterest++; continue; }
  selected.push(t);
}
selected.sort(function (a, b) {
  if (a.cardNum < b.cardNum) return -1;
  if (a.cardNum > b.cardNum) return 1;
  return a.seq - b.seq;
});

output.reportStartDate = start;
output.reportEndDate = end;
output.selectedTransactions = selected;
output.excludedInterestCount = excludedInterest;
output.inputRecordCount = recs.length;
output.transactDat = null;

```

### Get Type and Category Names (SCRIPT, id=6ae1ed4a3695c563ea50ae5d)

```javascript
// P-18 transaction-report: Get Type and Category Names (CBTRN03C 1500-A/B/C lookups).
// Account id via CardXref (CVACT03Y), type description via TransactionType (CVTRA03Y),
// category description via TransactionCategory (CVTRA04Y, key type + category).
// AC-5: a missing reference is flagged in `errors` and the run continues (blank field printed).
function recordLines(s) {
  if (s === null || s === undefined) return [];
  var parts = String(s).replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  var out = [];
  for (var i = 0; i < parts.length; i++) {
    if (parts[i].replace(/\s+$/, "").length > 0) out.push(parts[i]);
  }
  return out;
}
function pad(s, n) {
  s = (s === null || s === undefined) ? "" : String(s);
  while (s.length < n) s += " ";
  return s.substring(0, n);
}

var xref = {};
var xl = recordLines(input.cardxrefDat);
for (var i = 0; i < xl.length; i++) {
  var r = pad(xl[i], 50);
  var card = r.substring(0, 16);
  if (!(card in xref)) xref[card] = r.substring(25, 36);
}
var types = {};
var tl = recordLines(input.trantypeDat);
for (var i = 0; i < tl.length; i++) {
  var r = pad(tl[i], 60);
  var k = r.substring(0, 2);
  if (!(k in types)) types[k] = r.substring(2, 52);
}
var cats = {};
var cl = recordLines(input.trancatgDat);
for (var i = 0; i < cl.length; i++) {
  var r = pad(cl[i], 60);
  var k = r.substring(0, 2) + "|" + r.substring(2, 6);
  if (!(k in cats)) cats[k] = r.substring(6, 56);
}

var src = input.selectedTransactions;
var n = (src === null || src === undefined) ? 0 : src.length;
var lines = [];
var errors = [];
var lastCard = null;
var lastAcct = "";
for (var i = 0; i < n; i++) {
  var t = src[i];
  var cardNum = String(t.cardNum);
  var id = String(t.id);
  var typeCd = String(t.typeCd);
  var catCd = String(t.catCd);
  if (cardNum !== lastCard) {
    lastCard = cardNum;
    if (cardNum in xref) { lastAcct = xref[cardNum]; }
    else { lastAcct = ""; errors.push("INVALID CARD NUMBER : " + cardNum + " (transaction " + id.trim() + ")"); }
  }
  var typeDesc = "";
  if (typeCd in types) typeDesc = types[typeCd];
  else errors.push("INVALID TRANSACTION TYPE : " + typeCd + " (transaction " + id.trim() + ")");
  var catDesc = "";
  var ck = typeCd + "|" + catCd;
  if (ck in cats) catDesc = cats[ck];
  else errors.push("INVALID TRAN CATEGORY KEY : " + typeCd + catCd + " (transaction " + id.trim() + ")");
  lines.push({
    id: id,
    cardNum: cardNum,
    acctId: lastAcct,
    typeCd: typeCd,
    typeDesc: typeDesc,
    catCd: catCd,
    catDesc: catDesc,
    source: String(t.source),
    amtCents: Number(t.amtCents)
  });
}

output.reportLines = lines;
output.errors = errors;
output.errorCount = errors.length;
output.selectedTransactions = null;
output.cardxrefDat = null;
output.trantypeDat = null;
output.trancatgDat = null;

```

### Add Report Lines and Totals (SCRIPT, id=6ae1ed4d3695c563ea50ae5e)

```javascript
// P-18 transaction-report: Add Report Lines and Totals (CBTRN03C 1100/1110/1120, layout CVTRA07Y).
// BR-04 account total on card change, page total on page break, grand total at end.
// BR-06 133-column lines. Page size 20 lines (legacy WS-PAGE-SIZE).
var W = 133;
var PAGE_SIZE = 20;
function pad(s, n) {
  s = (s === null || s === undefined) ? "" : String(s);
  while (s.length < n) s += " ";
  return s.substring(0, n);
}
function rep(c, n) { var s = ""; while (s.length < n) s += c; return s; }
// Edited picture -ZZZ,ZZZ,ZZZ.ZZ (signChar "-") or +ZZZ,ZZZ,ZZZ.ZZ (signChar "+"), 15 chars.
// All-Z picture: a zero value prints as all spaces.
function edit(cents, signChar) {
  var neg = cents < 0;
  var a = Math.abs(cents) % 100000000000;
  if (a === 0) return rep(" ", 15);
  var ip = Math.floor(a / 100);
  var dp = a % 100;
  var digits = String(ip);
  while (digits.length < 9) digits = "0" + digits;
  var s = "";
  var started = false;
  for (var k = 0; k < 9; k++) {
    if (k === 3 || k === 6) s += started ? "," : " ";
    var c = digits.charAt(k);
    if (!started && c === "0") { s += " "; } else { started = true; s += c; }
  }
  var sign = neg ? "-" : (signChar === "+" ? "+" : " ");
  return sign + s + "." + (dp < 10 ? "0" : "") + dp;
}
function cents2str(c) {
  var neg = c < 0; var a = Math.abs(c);
  var s = String(Math.floor(a / 100)) + "." + (a % 100 < 10 ? "0" : "") + (a % 100);
  return (neg ? "-" : "") + s;
}

var start = String(input.reportStartDate);
var end = String(input.reportEndDate);
var src = input.reportLines;
var n = (src === null || src === undefined) ? 0 : src.length;

var HEADER = pad(pad("DALYREPT", 38) + pad("Daily Transaction Report", 41) + "Date Range: " +
  pad(start, 10) + " to " + pad(end, 10), W);
var BLANK = rep(" ", W);
var COLS = pad(pad("Transaction ID", 17) + pad("Account ID", 12) + pad("Transaction Type", 19) +
  pad("Tran Category", 35) + pad("Tran Source", 14) + " " + pad("        Amount", 16), W);
var RULE = rep("-", W);

var out = [];
var lineCounter = 0;
var firstTime = true;
var currCard = null;
var pageTotal = 0, accountTotal = 0, grandTotal = 0;

function writeHeaders() {
  out.push(HEADER); out.push(BLANK); out.push(COLS); out.push(RULE);
  lineCounter += 4;
}
function writePageTotals() {
  out.push(pad(pad("Page Total", 11) + rep(".", 86) + edit(pageTotal, "+"), W));
  grandTotal += pageTotal;
  pageTotal = 0;
  out.push(RULE);
  lineCounter += 2;
}
function writeAccountTotals() {
  out.push(pad(pad("Account Total", 13) + rep(".", 84) + edit(accountTotal, "+"), W));
  accountTotal = 0;
  out.push(RULE);
  lineCounter += 2;
}
function writeGrandTotals() {
  out.push(pad(pad("Grand Total", 11) + rep(".", 86) + edit(grandTotal, "+"), W));
}

for (var i = 0; i < n; i++) {
  var t = src[i];
  var cardNum = String(t.cardNum);
  var amt = Number(t.amtCents);
  if (cardNum !== currCard) {
    if (!firstTime) writeAccountTotals();
    currCard = cardNum;
  }
  if (firstTime) {
    firstTime = false;
    writeHeaders();
  }
  if (lineCounter % PAGE_SIZE === 0) {
    writePageTotals();
    writeHeaders();
  }
  pageTotal += amt;
  accountTotal += amt;
  out.push(pad(
    pad(t.id, 16) + " " + pad(t.acctId, 11) + " " + pad(t.typeCd, 2) + "-" + pad(t.typeDesc, 15) + " " +
    pad(t.catCd, 4) + "-" + pad(t.catDesc, 29) + " " + pad(t.source, 10) + "    " + edit(amt, "-") + "  ", W));
  lineCounter += 1;
}
// End of file: final page total, then grand total (legacy 1110-WRITE-PAGE-TOTALS / 1110-WRITE-GRAND-TOTALS).
writePageTotals();
writeGrandTotals();

output.tranrept_report = out.join("\n");
output.lineCount = out.length;
output.detailCount = n;
output.grandTotal = cents2str(grandTotal);
output.reportLines = null;

```

_(server: 198 ms, 1 API call, 195 ms in API)_
