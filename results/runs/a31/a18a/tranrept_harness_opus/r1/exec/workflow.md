# Workflow: GenerateDailyTransactionReport

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** 

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae588bd3695c563ea516015 | <uuid> | (0, 0) | → DecodeDailyReportInputs (seq:<uuid>) |
| End | END | 6ae588bd3695c563ea516016 | <uuid> | (1200, 0) | — |
| DecodeDailyReportInputs | SCRIPT | 6ae588bd3695c563ea516017 | <uuid> | (300, 0) | → FormatDailyTransactionReport (seq:<uuid>) | lang: JAVASCRIPT |
| FormatDailyTransactionReport | SCRIPT | 6ae588bd3695c563ea516018 | <uuid> | (600, 0) | → Escape text (seq:<uuid>) | lang: JAVASCRIPT |
| Escape text | SCRIPT | 6ae588be3695c563ea516019 | <uuid> | (900, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |

## Systems
_(none)_

## Scripts

### DecodeDailyReportInputs (SCRIPT, id=6ae588bd3695c563ea516017)

```javascript
var bag = typeof input === 'object' && input !== null ? input : {};
var diagnostics = [];
var failed = false;
var partial = false;
function issue(file, record, message, fatal) {
  diagnostics.push({file: file, record: record, message: message, severity: fatal ? 'error' : 'warning'});
  if (fatal) { failed = true; } else { partial = true; }
}
function validDate(s) {
  if (typeof s !== 'string' || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(s)) { return false; }
  var y = Number(s.slice(0,4)); var m = Number(s.slice(5,7)); var d = Number(s.slice(8,10));
  if (y < 1 || m < 1 || m > 12 || d < 1) { return false; }
  var days = [31, ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0) ? 29 : 28,31,30,31,30,31,31,30,31,30,31];
  return d <= days[m-1];
}
var from = bag.startDate === undefined ? '2022-07-01' : bag.startDate;
var to = bag.endDate === undefined ? '2022-07-31' : bag.endDate;
if (!validDate(from) || !validDate(to) || from > to) {
  issue('run parameters', 0, 'Start and end must be valid YYYY-MM-DD dates with start not after end.', true);
}
function records(key, file) {
  if (typeof bag[key] !== 'string') { issue(file, 0, 'Required input file content is missing or is not text.', true); return []; }
  if (bag[key] === '') { return []; }
  var a = bag[key].split(/\r?\n/);
  if (a.length && a[a.length-1] === '') { a.pop(); }
  return a;
}
var tx = records('transact', 'transact.dat');
var xr = records('cardxref', 'cardxref.dat');
var tt = records('trantype', 'trantype.dat');
var tc = records('trancatg', 'trancatg.dat');
var accounts = Object.create(null);
var types = Object.create(null);
var categories = Object.create(null);
function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
function first(o, k, v, file, n) {
  if (has(o, k)) { issue(file, n, 'Duplicate reference key: first usable record retained.', false); }
  else { o[k] = v; }
}
var i; var r;
for (i=0; i<xr.length; i++) {
  r = xr[i];
  if (r.length < 36 || !/^[0-9]{11}$/.test(r.slice(25,36))) {
    issue('cardxref.dat', i+1, 'Unusable card/account fields; record skipped.', false);
  } else { first(accounts, r.slice(0,16), r.slice(25,36), 'cardxref.dat', i+1); }
}
for (i=0; i<tt.length; i++) {
  r = tt[i];
  if (r.length < 17) { issue('trantype.dat', i+1, 'Record ends before consumed type-description fields; record skipped.', false); }
  else { first(types, r.slice(0,2), r.slice(2,17), 'trantype.dat', i+1); }
}
for (i=0; i<tc.length; i++) {
  r = tc[i];
  if (r.length < 35 || !/^[0-9]{4}$/.test(r.slice(2,6))) {
    issue('trancatg.dat', i+1, 'Unusable category key or description; record skipped.', false);
  } else { first(categories, JSON.stringify([r.slice(0,2), r.slice(2,6)]), r.slice(6,35), 'trancatg.dat', i+1); }
}
function cents(s) {
  if (s.length !== 11 || !/^[0-9]{10}$/.test(s.slice(0,10))) { return null; }
  var last = s.charAt(10); var p = '{ABCDEFGHI'.indexOf(last); var n = '}JKLMNOPQR'.indexOf(last); var digit; var sign = 1;
  if (/^[0-9]$/.test(last)) { digit = Number(last); }
  else if (p >= 0) { digit = p; }
  else if (n >= 0) { digit = n; sign = -1; }
  else { return null; }
  var value = (Number(s.slice(0,10)) * 10 + digit) * sign;
  return value === 0 ? 0 : value;
}
var reportRows = [];
if (!failed) {
  for (i=0; i<tx.length; i++) {
    r = tx[i];
    if (r.length < 314 || !validDate(r.slice(304,314))) {
      issue('transact.dat', i+1, 'Processing-date field is missing or invalid; record skipped.', false); continue;
    }
    var day = r.slice(304,314);
    if (day < from || day > to) { continue; }
    var amount = cents(r.slice(132,143));
    var category = r.slice(18,22);
    if (amount === null || !/^[0-9]{4}$/.test(category)) {
      issue('transact.dat', i+1, 'Unusable amount or category code; record skipped.', false); continue;
    }
    var card = r.slice(262,278); var type = r.slice(16,18); var categoryKey = JSON.stringify([type,category]);
    var account = has(accounts,card) ? accounts[card] : '00000000000';
    var typeDescription = has(types,type) ? types[type] : '';
    var categoryDescription = has(categories,categoryKey) ? categories[categoryKey] : '';
    if (!has(accounts,card)) { issue('transact.dat', i+1, 'No card cross-reference: eleven-zero account used; transaction retained.', false); }
    if (!has(types,type)) { issue('transact.dat', i+1, 'No transaction type description: blank used; transaction retained.', false); }
    if (!has(categories,categoryKey)) { issue('transact.dat', i+1, 'No transaction category description: blank used; transaction retained.', false); }
    reportRows.push({transactionId:r.slice(0,16), accountId:account, typeCode:type, typeDescription:typeDescription, categoryCode:category, categoryDescription:categoryDescription, source:r.slice(22,32), amountCents:amount, sequence:i+1});
  }
}
var entries = [
 ['A01','Implement the daily transaction batch step only.','The supplement distinguishes daily transaction report from statement generation; the broader wiki also describes an interactive PDF journey.','tranrept-opus.pdf pp.2, 16-19','No POSTTRAN, INTCALC, statements, interactive filters or PDF output is added.'],
 ['A02','The caller supplies the four raw text contents as transact, cardxref, trantype and trancatg.','The contract lists transact.dat, cardxref.dat, trantype.dat and trancatg.dat but gives no FlowX input transport.','tranrept-opus.pdf p.16','No directory is watched or read; these four START members carry the corresponding files.'],
 ['A03','An omitted date parameter defaults to start 2022-07-01 and end 2022-07-31; a supplied empty or null date is invalid.','Run parameters specify daily transaction report start date 2022-07-01 and end date 2022-07-31; missing batch parameter handling is not stated.','tranrept-opus.pdf p.16','The specified contract run is reproducible; explicit malformed dates are not silently replaced.'],
 ['A04','Use strict Gregorian YYYY-MM-DD dates, years 0001 through 9999, with inclusive endpoints.','The contract specifies YYYY-MM-DD; Date Utility says Parse/Validate Date but gives no batch calendar or endpoint rule.','tranrept-opus.pdf pp.13-14, 16','Leap years are checked and records on either endpoint are included.'],
 ['A05','A reversed range, invalid date or missing/non-text required file fails the batch and returns no report lines.','Reports acceptance requires a range error for From greater than To; the batch contract does not define file or parameter failures.','tranrept-opus.pdf pp.4, 16','A failed batch cannot look like a successful zero-activity report; diagnostics explain the failure.'],
 ['A06','An explicitly supplied empty text file is valid.','The contract does not forbid empty files; Reports acceptance says an empty result set produces a report with zero rows and no error.','tranrept-opus.pdf pp.4, 16','Four empty files generate a zero-activity report.'],
 ['A07','Decode transact using ID 1-16, type 17-18, category 19-22, source 23-32, amount 133-143, card 263-278 and processing timestamp 305-330.','Transaction lists fields and widths in order; the contract names CVTRA05Y and 350 bytes but does not reproduce offsets.','tranrept-opus.pdf pp.7-8, 16','These are inferred positions, not verified copybook definitions.'],
 ['A08','Decode cardxref card at 1-16 and account at 26-36.','CardXref lists card X(16), customer 9(9), account 9(11); CVACT03Y is referenced without offsets.','tranrept-opus.pdf pp.7, 16','Customer and filler are not read; account is retained as eleven characters.'],
 ['A09','Decode trantype code at 1-2 and description at 3-52; only the first fifteen description characters are consumed.','CVTRA03Y is referenced as 60 bytes; type description positions and full width are absent; report detail uses description X(15).','tranrept-opus.pdf pp.16, 19','The assumed full description layout is provisional; the report reads positions 3-17.'],
 ['A10','Decode trancatg type at 1-2, category at 3-6 and description at 7-56; consume only its first twenty-nine description characters.','CVTRA04Y is referenced as 60 bytes without its layout; the report uses category 9(4) and description X(29).','tranrept-opus.pdf pp.16, 19','Composite key and description positions are inferred; the report reads description positions 7-35.'],
 ['A11','Inputs are already decoded character text; perform no EBCDIC or packed-binary conversion.','The supplement calls the inputs fixed-width text, one record per line; it provides no byte encoding or packed-field decoding.','tranrept-opus.pdf p.16','Callers must decode such external encodings before supplying the text.'],
 ['A12','Amounts occupy eleven display positions with two implied decimals; digits mean positive and a final {ABCDEFGHI or }JKLMNOPQR encodes positive or negative digits 0-9.','Transaction amount is S9(9)V99; the contract does not specify its text dump sign representation.','tranrept-opus.pdf pp.8, 16','Signed zoned/overpunched decimal is provisional; other encodings are diagnosed, not guessed.'],
 ['A13','Keep account, card and transaction identifiers as strings with leading zeros.','The wiki labels some identifiers NUMBER but the report specifies fixed-width account and transaction columns.','tranrept-opus.pdf pp.7-8, 19','No identifier precision or leading zeros are lost during matching and printing.'],
 ['A14','Validate only consumed fields and sufficient length to reach them; do not enforce or inspect unused record tails.','The contract gives record lengths but no rejection policy for ignored positions; the data model notes that filler tails are dropped.','tranrept-opus.pdf pp.5, 16','NULs or other bytes in unused filler do not reject a record.'],
 ['A15','Split records on LF or CRLF, ignore one final line terminator and preserve leading spaces.','The contract says one record per line without specifying line endings.','tranrept-opus.pdf p.16','An interior blank record is unusable; a trailing line terminator is not an extra record.'],
 ['A16','Skip an individual unusable consumed record and mark the result partial with file and one-based record number.','The wiki and contract give no malformed-record batch policy.','tranrept-opus.pdf pp.2, 16-19','Other records remain processable; omitted records are never hidden.'],
 ['A17','Use the first ten characters of processing timestamp, not origination timestamp, to select transactions.','Both timestamps exist in Transaction; the report contract gives start/end dates but does not state the selection timestamp.','tranrept-opus.pdf pp.8, 16','Only processing dates inside the inclusive interval contribute to report rows or totals.'],
 ['A18','Apply the date filter before decoding remaining transaction values.','The wiki does not specify validation order for out-of-range records.','tranrept-opus.pdf pp.2, 16','Unused amounts in out-of-range records do not cause rejection diagnostics.'],
 ['A19','Join cross-reference by the exact sixteen-character card value and type description by the exact two-character type code.','CardXref links card to account and the report includes account and type; the batch join algorithm is absent.','tranrept-opus.pdf pp.7, 19','No numeric coercion, case folding or whitespace normalization changes the keys.'],
 ['A20','Join a category description by type code plus four-character category code.','The report uses type and category; CVTRA04Y key structure is not reproduced.','tranrept-opus.pdf pp.16, 19','A category belonging to a different type is not substituted.'],
 ['A21','For duplicate usable reference keys retain the first input record and issue a diagnostic.','No duplicate reference resolution policy is documented.','tranrept-opus.pdf pp.16-19','Input order deterministically resolves conflicting descriptions and accounts.'],
 ['A22','Missing type/category descriptions print blanks, retaining the transaction with a diagnostic.','The layout reserves descriptions but the wiki gives no not-found fallback.','tranrept-opus.pdf p.19','A missing description does not silently remove report activity.'],
 ['A23','A missing card cross-reference prints account 00000000000 and retains the transaction with a diagnostic.','The account column is specified but unmatched-card handling is absent.','tranrept-opus.pdf p.19','Unmatched activity is visible and groups under the eleven-zero account.'],
 ['A24','Sort by account string, then transaction ID string, using original record order for ties.','Account total lines are specified but transaction grouping and ordering are not.','tranrept-opus.pdf p.19','Each account forms one contiguous group and duplicate transactions are retained.'],
 ['A25','Do not deduplicate, mask, reverse signs or otherwise alter usable transactions.','The batch wiki specifies no such transformations.','tranrept-opus.pdf pp.2, 16-19','Each selected usable input transaction prints once.'],
 ['A26','Sum signed integer cents without rounding for page, account and grand totals.','The contract fixes two-decimal amount pictures but does not state aggregation or rounding rules.','tranrept-opus.pdf pp.17, 19','Negative amounts reduce totals; intermediate binary floating-point decimal rounding is avoided.'],
 ['A27','A page holds fifty detail records; headings, account totals and rules do not consume that quota.','The contract says a page starts with four opening lines but does not give page capacity.','tranrept-opus.pdf p.19','Page boundaries are explicit provisional behaviour rather than verified legacy pagination.'],
 ['A28','Account totals span pages; page totals include only that page and grand total includes all selected usable transactions.','Page, Account and Grand Total layouts are given without their accumulation scopes.','tranrept-opus.pdf p.19','An account split across pages still has exactly one account total.'],
 ['A29','Emit account total at account end, page total at full/final page end, then grand total once; account total precedes page total when both occur together.','Each page total and each account total is followed by a rule; the relative order at coincident boundaries is absent.','tranrept-opus.pdf p.19','Repeat the header only when another page has a detail to print.'],
 ['A30','An empty selection prints the four opening lines, zero page total and rule, then zero grand total, without account totals.','Acceptance requires a zero-row report, while the contract does not specify its total lines.','tranrept-opus.pdf pp.4, 19','Empty activity is a successful, visibly zero report.'],
 ['A31','Use a blank positive detail sign, minus negative detail sign and explicit plus/minus total sign in the first position.','The picture legend defines signs and the report uses -ZZZ,ZZZ,ZZZ.ZZ for detail and +ZZZ,ZZZ,ZZZ.ZZ for totals.','tranrept-opus.pdf pp.17, 19','Sign placement is fixed, not floating next to the first digit.'],
 ['A32','Suppress leading integer zeros and associated commas, retaining the decimal point and two fractional digits, including .00 at zero.','The picture legend says leading zeros and their commas print as spaces but does not further describe all-zero suppression.','tranrept-opus.pdf pp.17, 19','The all-zero and sub-unit rendering choice is recorded rather than presented as verified COBOL editing.'],
 ['A33','If an amount exceeds the nine-integer-digit picture, print fifteen asterisks and a diagnostic.','No amount-picture overflow policy is stated.','tranrept-opus.pdf pp.17, 19','The result is partial rather than silently truncated or wrapped.'],
 ['A34','Fail rather than approximate if an accumulated cents value exceeds JavaScript safe-integer precision.','The wiki does not specify implementation arithmetic limits.','tranrept-opus.pdf pp.16-19','An unrepresentable total cannot be emitted as a successful result.'],
 ['A35','Pad every printed line to 133 characters and use the exact fixed positions, labels and rules from p.19.','The contract specifies a 133-character line and allows trailing spaces to be omitted.','tranrept-opus.pdf pp.17, 19','This implementation retains trailing spaces and adds no form-feed or page-number lines.'],
 ['A36','Description and source columns preserve their consumed text without trimming or case conversion.','The layout gives X(n) fields and does not request normalization.','tranrept-opus.pdf p.19','Text is clipped to the declared printed column and space-padded.'],
 ['A37','The model authors these fixed explanations during implementation, not during each batch run.','The maker requests a record of implementation decisions, not per-run model judgments.','Maker request; tranrept-opus.pdf pp.16-19','Runtime selection, arithmetic and formatting are entirely deterministic.'],
 ['A38','Return one structured assumption record with separate whatAssumed and wikiBasis values for each decision, and render those as separate markdown columns.','The maker explicitly asks what was assumed and which wiki statement or absence supports it.','Maker request; tranrept-opus.pdf p.17','Explanations stay attributable individually instead of being an undifferentiated note.'],
 ['A39','Return report lines under tranrept_report and return assumptions_md beside structured assumptionEntries.','The contract permits a returned list under the report filename without extension; it does not specify the FlowX result mapping for markdown.','tranrept-opus.pdf pp.16-17','The report uses the permitted returned-lines interface; no report filesystem write is claimed.'],
 ['A40','A physical assumptions.md file is not created by this build.','The requested sidecar is optional in the contract but explicitly requested by the maker; supported file upload only transfers an existing file and document rendering supports PDF/DOCX.','Maker request; tranrept-opus.pdf p.17; confirmed delivery limitation','This is an unfulfilled delivery capability, not a claim of legacy behaviour or a completed sidecar write.'],
 ['A41','Normalize signed zero to mathematical zero before printing and aggregation.','The amount picture and wiki do not define preservation of a negative-zero encoding.','tranrept-opus.pdf pp.8, 17, 19','Zero detail uses a blank sign and zero totals use plus.']
];
var assumptionEntries = entries.map(function(e) { return {assumptionId:e[0], whatAssumed:e[1], wikiBasis:e[2], sourcePage:e[3], effect:e[4]}; });
output = {reportRows:failed ? [] : reportRows, batchStatus:failed ? 'failed' : (partial ? 'partial' : 'complete'), diagnostics:diagnostics, assumptionEntries:assumptionEntries};
```

### FormatDailyTransactionReport (SCRIPT, id=6ae588bd3695c563ea516018)

```javascript
var bag = typeof input === 'object' && input !== null ? input : {};
var status = bag.batchStatus || 'failed';
var diagnostics = Array.isArray(bag.diagnostics) ? bag.diagnostics.slice() : [];
var entries = Array.isArray(bag.assumptionEntries) ? bag.assumptionEntries : [];
var rows = Array.isArray(bag.reportRows) ? bag.reportRows.slice() : [];
var from = bag.startDate === undefined ? '2022-07-01' : String(bag.startDate);
var to = bag.endDate === undefined ? '2022-07-31' : String(bag.endDate);
function spaces(n) { return new Array(Math.max(0,n)+1).join(' '); }
function right(s,n) { s=String(s); return s.slice(0,n)+spaces(Math.max(0,n-s.length)); }
function left(s,n) { s=String(s); return spaces(Math.max(0,n-s.length))+s; }
var rule = new Array(134).join('-');
var lines = [];
function diagnostic(message, fatal) {
  diagnostics.push({file:'tranrept_report.txt', record:lines.length+1, message:message, severity:fatal ? 'error' : 'warning'});
  if (fatal) { status='failed'; } else if (status!=='failed') { status='partial'; }
}
function add(a,b) {
  var c=a+b;
  if (!isFinite(c) || Math.floor(c)!==c || Math.abs(c)>9007199254740991) {
    diagnostic('An accumulated cents total exceeds safe integer precision; report withheld.', true); return 0;
  }
  return c;
}
function money(cents, total) {
  var mag=Math.abs(cents); var integer=Math.floor(mag/100); var fraction=mag%100;
  if (integer>999999999) { diagnostic('Amount picture overflow: fifteen asterisks printed.', false); return '***************'; }
  var digits=integer===0 ? '' : String(integer).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  var numeric=digits+'.'+(fraction<10 ? '0' : '')+String(fraction);
  return (cents<0 ? '-' : (total ? '+' : ' '))+left(numeric,14);
}
function emit(s) { lines.push(right(s,133)); }
function opening() {
  emit(right('DALYREPT',38)+right('Daily Transaction Report',41)+right('Date Range:',12)+right(from,10)+' to '+right(to,10));
  emit('');
  emit(right('Transaction ID',17)+right('Account ID',12)+right('Transaction Type',19)+right('Tran Category',35)+right('Tran Source',14)+' '+right('Amount',16));
  emit(rule);
}
function totalLine(label,width,value,dots) { emit(right(label,width)+new Array(dots+1).join('.')+money(value,true)); }
rows.sort(function(a,b) {
  if (a.accountId<b.accountId) { return -1; } if (a.accountId>b.accountId) { return 1; }
  if (a.transactionId<b.transactionId) { return -1; } if (a.transactionId>b.transactionId) { return 1; }
  return a.sequence-b.sequence;
});
if (status!=='failed') {
  var pageCount=0; var pageSum=0; var accountSum=0; var grand=0; var pageOpen=false;
  if (rows.length===0) {
    opening(); totalLine('Page Total',11,0,86); emit(rule); totalLine('Grand Total',11,0,86);
  } else {
    for (var i=0; i<rows.length; i++) {
      if (!pageOpen) { opening(); pageOpen=true; pageCount=0; pageSum=0; }
      var r=rows[i];
      emit(right(r.transactionId,16)+' '+right(r.accountId,11)+' '+right(r.typeCode,2)+'-'+right(r.typeDescription,15)+' '+right(r.categoryCode,4)+'-'+right(r.categoryDescription,29)+' '+right(r.source,10)+'    '+money(r.amountCents,false)+'  ');
      pageSum=add(pageSum,r.amountCents); accountSum=add(accountSum,r.amountCents); grand=add(grand,r.amountCents); pageCount++;
      if (i===rows.length-1 || rows[i+1].accountId!==r.accountId) {
        totalLine('Account Total',13,accountSum,84); emit(rule); accountSum=0;
      }
      if (pageCount===50 || i===rows.length-1) {
        totalLine('Page Total',11,pageSum,86); emit(rule); pageOpen=false;
      }
    }
    totalLine('Grand Total',11,grand,86);
  }
}
if (status==='failed') { lines=[]; }
function cell(v) { return String(v===undefined || v===null ? '' : v).replace(/\|/g,'\\|').replace(/\r?\n/g,' '); }
var md=['# Daily transaction report assumptions','','These are explicit provisional implementation decisions, not proof of oracle equivalence.','The physical assumptions.md file is NOT created by this implementation; this response contains its intended content.','','## Implementation decisions','','| Decision | What you assumed | Which wiki statement (or absence of one) it rests on | Source page | Effect |','| --- | --- | --- | --- | --- |'];
for (var j=0; j<entries.length; j++) {
  var e=entries[j]; md.push('| '+[e.assumptionId,e.whatAssumed,e.wikiBasis,e.sourcePage,e.effect].map(cell).join(' | ')+' |');
}
md.push('','## Run result','','- Start date: '+cell(from),'- End date: '+cell(to),'- Status: '+status,'- Printed lines: '+lines.length,'','## Run diagnostics','','These observations are not wiki statements.');
if (diagnostics.length===0) { md.push('','None.'); }
else {
  md.push('','| File | Record or printed line | Severity | Observation |','| --- | --- | --- | --- |');
  for (var k=0; k<diagnostics.length; k++) {
    var d=diagnostics[k]; md.push('| '+[d.file,d.record,d.severity,d.message].map(cell).join(' | ')+' |');
  }
}
output = {tranrept_report:lines, assumptions_md:md.join('\n')+'\n', reportOutcome:{batchStatus:status, diagnostics:diagnostics}};
```

### Escape text (SCRIPT, id=6ae588be3695c563ea516019)

```javascript
function esc(v) { return v == null ? null : JSON.stringify(String(v)).slice(1, -1).replace(/\\"/g, '"'); }
function at(o, p) { return p.split('.').reduce(function (x, k) { return x == null ? undefined : x[k]; }, o); }
output = {"endText": {t0: esc(at(input, "assumptions_md")), t1: esc(at(input, "reportOutcome.batchStatus"))}};

```

_(server: 360 ms, 1 API call, 349 ms in API)_
