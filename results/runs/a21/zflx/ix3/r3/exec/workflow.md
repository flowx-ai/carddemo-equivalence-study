# Workflow: tranrept_daily_transaction_report

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** CardDemo TRANREPT (P-18 transaction-report): SORT step (select by processed date, sort by card) + CBTRN03C report build. Inputs: transact/cardxref/trantype/trancatg file contents + startDate/endDate. Output: tranrept_report (133-col lines joined by \n).

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae1eefc3695c563ea50aeba | <uuid> | (0, 0) | → TRANREPT SORT - select by proc date, sort by card (seq:<uuid>) |
| TRANREPT SORT - select by proc date, sort by card | SCRIPT | 6ae1eeff3695c563ea50aebb | <uuid> | (500, 0) | → CBTRN03C - build report lines (seq:<uuid>) | lang: JAVASCRIPT |
| CBTRN03C - build report lines | SCRIPT | 6ae1ef023695c563ea50aebc | <uuid> | (1000, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae1ef043695c563ea50aebd | <uuid> | (1500, 0) | — |

## Systems
_(none)_

## Scripts

### TRANREPT SORT - select by proc date, sort by card (SCRIPT, id=6ae1eeff3695c563ea50aebb)

```javascript
// TRANREPT.prc steps REPROC + SORT (BR-01, BR-02, BR-05)
// Reads transact.dat (CVTRA05Y, 350 bytes), keeps records whose TRAN-PROC-TS(1:10)
// lies between startDate and endDate inclusive, sorts them by TRAN-CARD-NUM ascending
// (stable: original file order kept within a card).
function str(v) { return (v === null || v === undefined) ? '' : String(v); }
function pad(s, n) { s = str(s); while (s.length < n) s += ' '; return s.substring(0, n); }
function recs(t) {
  var a = str(t).split(/\r?\n/), r = [];
  for (var i = 0; i < a.length; i++) { if (a[i].replace(/\s+$/, '').length > 0) r.push(a[i]); }
  return r;
}
// S9(9)V99 display amount -> integer cents. Accepts trailing overpunch
// ({A-I positive, }J-R negative, p-y ASCII negative) or a readable signed decimal.
function cents(raw) {
  var s = str(raw).replace(/\s/g, '');
  if (s === '') return 0;
  var neg = false, v;
  if (s.indexOf('.') >= 0 || s.indexOf('-') >= 0 || s.indexOf('+') >= 0) {
    neg = s.indexOf('-') >= 0;
    s = s.replace(/[+\-]/g, '');
    if (s.indexOf('.') >= 0) {
      var p = s.split('.');
      var ip = p[0].replace(/\D/g, '') || '0';
      var fp = ((p[1] || '').replace(/\D/g, '') + '00').substring(0, 2);
      v = parseInt(ip, 10) * 100 + parseInt(fp, 10);
    } else {
      v = parseInt(s.replace(/\D/g, '') || '0', 10);
    }
    return neg ? -v : v;
  }
  var last = s.charAt(s.length - 1), body = s.substring(0, s.length - 1), d;
  var POS = '{ABCDEFGHI', NEG = '}JKLMNOPQR', ANEG = 'pqrstuvwxy';
  if (last >= '0' && last <= '9') d = last;
  else if (POS.indexOf(last) >= 0) d = String(POS.indexOf(last));
  else if (NEG.indexOf(last) >= 0) { d = String(NEG.indexOf(last)); neg = true; }
  else if (ANEG.indexOf(last) >= 0) { d = String(ANEG.indexOf(last)); neg = true; }
  else d = '0';
  v = parseInt((body + d).replace(/\D/g, '') || '0', 10);
  return neg ? -v : v;
}

// BR-05: default range from configuration reportStartDate / reportEndDate
var startDate = str(input.startDate).trim() || '2022-01-01';
var endDate = str(input.endDate).trim() || '2022-07-06';

var lines = recs(input.transact);
var sel = [];
for (var i = 0; i < lines.length; i++) {
  var r = pad(lines[i], 350);
  var procDate = r.substring(304, 314);           // TRAN-PROC-TS(1:10), pos 305
  if (procDate < startDate || procDate > endDate) continue;
  sel.push({
    seq: i,
    tranId: r.substring(0, 16),                     // TRAN-ID X(16)
    typeCd: r.substring(16, 18),                    // TRAN-TYPE-CD X(2)
    catCd: r.substring(18, 22),                     // TRAN-CAT-CD 9(4)
    source: r.substring(22, 32),                    // TRAN-SOURCE X(10)
    amt: cents(r.substring(132, 143)),              // TRAN-AMT S9(9)V99
    card: r.substring(262, 278)                     // TRAN-CARD-NUM X(16)
  });
}
sel.sort(function (a, b) {
  if (a.card < b.card) return -1;
  if (a.card > b.card) return 1;
  return a.seq - b.seq;
});

output.reportStartDate = startDate;
output.reportEndDate = endDate;
output.selectedJson = JSON.stringify(sel);
output.selectedCount = sel.length;
output.transact = null;   // drop the raw file from the token once consumed

```

### CBTRN03C - build report lines (SCRIPT, id=6ae1ef023695c563ea50aebc)

```javascript
// CBTRN03C: print the daily transaction report (133-column lines, layout CVTRA07Y).
// BR-03 type/category descriptions, BR-04 page / account(card) / grand totals,
// BR-06 133 columns, BR-07 interest postings (type 01, category 0005) left out.
var PAGE_SIZE = 20;   // legacy WS-PAGE-SIZE (wiki TODO) - see assumptions.md
var WIDTH = 133;

function str(v) { return (v === null || v === undefined) ? '' : String(v); }
function pad(s, n) { s = str(s); while (s.length < n) s += ' '; return s.substring(0, n); }
function rep(c, n) { var s = ''; while (s.length < n) s += c; return s; }
function recs(t) {
  var a = str(t).split(/\r?\n/), r = [];
  for (var i = 0; i < a.length; i++) { if (a[i].replace(/\s+$/, '').length > 0) r.push(a[i]); }
  return r;
}
function cat4(c) { var t = str(c).trim(); return /^\d+$/.test(t) ? ('0000' + t).slice(-4) : pad(c, 4); }
// COBOL edited picture [+|-]ZZZ,ZZZ,ZZZ.ZZ from integer cents.
// signMode '+': '+'/'-' in col 1; signMode '-': '-'/space. All-Z picture with value 0 -> all spaces.
function edit(c, signMode) {
  var neg = c < 0, a = Math.abs(c);
  if (a === 0) return rep(' ', 15);
  var ip = Math.floor(a / 100) % 1000000000, fp = a % 100;
  var is = ip === 0 ? '' : String(ip).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  while (is.length < 11) is = ' ' + is;
  var sign = neg ? '-' : (signMode === '+' ? '+' : ' ');
  return sign + is + '.' + (fp < 10 ? '0' : '') + fp;
}

// Reference files
var xref = {}, types = {}, cats = {};
var xl = recs(input.cardxref);
for (var i = 0; i < xl.length; i++) { var r = pad(xl[i], 50); xref[r.substring(0, 16)] = r.substring(25, 36); }   // CVACT03Y
var tl = recs(input.trantype);
for (i = 0; i < tl.length; i++) { r = pad(tl[i], 60); types[r.substring(0, 2)] = r.substring(2, 52); }           // CVTRA03Y
var cl = recs(input.trancatg);
for (i = 0; i < cl.length; i++) { r = pad(cl[i], 60); cats[r.substring(0, 2) + cat4(r.substring(2, 6))] = r.substring(6, 56); } // CVTRA04Y

var startDate = pad(input.reportStartDate, 10), endDate = pad(input.reportEndDate, 10);
var trans = JSON.parse(str(input.selectedJson) || '[]');

var RULE = rep('-', WIDTH);
var HDR = pad('DALYREPT', 38) + pad('Daily Transaction Report', 41) + 'Date Range: ' + startDate + ' to ' + endDate;
var COLS = pad('Transaction ID', 17) + pad('Account ID', 12) + pad('Transaction Type', 19) +
           pad('Tran Category', 35) + pad('Tran Source', 14) + ' ' + pad('          Amount', 16);

var out = [], errors = [];
var counter = 0, first = true, curCard = null, acctId = '';
var pageTot = 0, acctTot = 0, grandTot = 0, details = 0;

function w(l) { out.push(pad(l, WIDTH)); }
function headers() { w(HDR); w(''); w(COLS); w(RULE); counter += 4; }
function pageTotals() {
  w('Page Total ' + rep('.', 86) + edit(pageTot, '+')); counter++;
  grandTot += pageTot; pageTot = 0;
  w(RULE); counter++;
}
function accountTotals() {
  w('Account Total' + rep('.', 84) + edit(acctTot, '+')); counter++;
  acctTot = 0;
  w(RULE); counter++;
}

for (i = 0; i < trans.length; i++) {
  var t = trans[i];
  // BR-07: interest postings are neither listed nor totalled
  if (t.typeCd === '01' && cat4(t.catCd) === '0005') continue;

  // BR-04: account (card) total on card-number change
  if (t.card !== curCard) {
    if (!first) accountTotals();
    curCard = t.card;
    if (Object.prototype.hasOwnProperty.call(xref, t.card)) acctId = xref[t.card];
    else { acctId = ''; errors.push('CARD NOT FOUND IN XREF: ' + t.card.trim() + ' (tran ' + t.tranId.trim() + ')'); }
  }
  // BR-03: descriptions from reference data; unknown reference flagged, run continues
  var typeDesc = types[t.typeCd];
  if (typeDesc === undefined) { typeDesc = ''; errors.push('TRANSACTION TYPE NOT FOUND: ' + t.typeCd + ' (tran ' + t.tranId.trim() + ')'); }
  var catDesc = cats[t.typeCd + cat4(t.catCd)];
  if (catDesc === undefined) { catDesc = ''; errors.push('TRANSACTION CATEGORY NOT FOUND: ' + t.typeCd + '/' + t.catCd + ' (tran ' + t.tranId.trim() + ')'); }

  if (first) { first = false; headers(); }
  if (counter % PAGE_SIZE === 0) { pageTotals(); headers(); }

  pageTot += t.amt; acctTot += t.amt;
  w(pad(t.tranId, 16) + ' ' + pad(acctId, 11) + ' ' + pad(t.typeCd, 2) + '-' + pad(typeDesc, 15) + ' ' +
    cat4(t.catCd) + '-' + pad(catDesc, 29) + ' ' + pad(t.source, 10) + '    ' + edit(t.amt, '-') + '  ');
  counter++; details++;
}
// End of file: last page total, then grand total
pageTotals();
w('Grand Total' + rep('.', 86) + edit(grandTot, '+'));

output.tranrept_report = out.join('\n');
output.lineCount = details;
output.grandTotal = (grandTot < 0 ? '-' : '') + Math.floor(Math.abs(grandTot) / 100) + '.' + ('0' + (Math.abs(grandTot) % 100)).slice(-2);
output.referenceErrors = errors.join('\n');
output.selectedJson = null;
output.cardxref = null; output.trantype = null; output.trancatg = null;

```

_(server: 158 ms, 1 API call, 155 ms in API)_
