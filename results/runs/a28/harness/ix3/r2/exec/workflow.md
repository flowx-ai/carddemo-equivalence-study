# Workflow: GenerateDailyTransactionReport

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** 

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae4b5143695c563ea513dd6 | <uuid> | (0, 0) | → Decode report records (seq:<uuid>) |
| End | END | 6ae4b5153695c563ea513dd7 | <uuid> | (1200, 0) | — |
| Decode report records | SCRIPT | 6ae4b5153695c563ea513dd8 | <uuid> | (300, 0) | → Render daily report (seq:<uuid>) | lang: JAVASCRIPT |
| Render daily report | SCRIPT | 6ae4b5153695c563ea513dd9 | <uuid> | (600, 0) | → Escape text (seq:<uuid>) | lang: JAVASCRIPT |
| Escape text | SCRIPT | 6ae4b5163695c563ea513dda | <uuid> | (900, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |

## Systems
_(none)_

## Scripts

### Decode report records (SCRIPT, id=6ae4b5153695c563ea513dd8)

```javascript
output = (function (raw) {
'use strict';
var rows = [];
var notes = {version:1,status:'COMPLETE',startDate:'',endDate:'',diagnostics:[]};
function problem(file,line,code,fatal) {
 notes.diagnostics.push({file:file,line:line,code:code});
 if(fatal) notes.status='INVALID_INPUT';
 else if(notes.status==='COMPLETE') notes.status='PARTIAL';
}
function validDate(v) {
 if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
 var y=Number(v.slice(0,4)),m=Number(v.slice(5,7)),d=Number(v.slice(8,10));
 if(y<1||m<1||m>12) return false;
 var leap=y%4===0&&(y%100!==0||y%400===0);
 return d>=1&&d<=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31][m-1];
}
function records(text) {
 if(text==='') return [];
 var a=text.split(/\r\n|\n/);
 if(a[a.length-1]==='') a.pop();
 return a;
}
var data=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
['transact','cardxref','trantype','trancatg'].forEach(function(f){
 if(typeof data[f+'Text']!=='string') problem(f,0,'MISSING_FILE_STRING',true);
});
var start=data.startDate===undefined?'2022-07-01':data.startDate;
var end=data.endDate===undefined?'2022-07-31':data.endDate;
if(!validDate(start)||!validDate(end)) problem('input',0,'INVALID_DATE',true);
else {
 notes.startDate=start; notes.endDate=end;
 if(start>end) problem('input',0,'INVERTED_DATE_RANGE',true);
}
if(notes.status==='INVALID_INPUT') return {reportRows:[],parseNotes:notes};
function reference(text,file,keyWidth,requiredWidth,decode) {
 var map=new Map();
 records(text).forEach(function(record,index){
  var line=index+1;
  if(record.length<keyWidth){problem(file,line,'SHORT_REFERENCE',false);return;}
  var key=record.slice(0,keyWidth);
  if(map.has(key)){problem(file,line,'DUPLICATE_REFERENCE',false);return;}
  map.set(key,null);
  if(record.length<requiredWidth){problem(file,line,'SHORT_REFERENCE',false);return;}
  var value=decode(record);
  if(value.replace(/ +$/,'')==='') {
   problem(file,line,file==='cardxref'?'EMPTY_ACCOUNT':'EMPTY_DESCRIPTION',false);
   value=null;
  }
  map.set(key,value);
 });
 return map;
}
var accounts=reference(data.cardxrefText,'cardxref',16,36,function(r){return r.slice(25,36);});
var types=reference(data.trantypeText,'trantype',2,52,function(r){return r.slice(2,52).replace(/ +$/,'');});
var categories=reference(data.trancatgText,'trancatg',6,56,function(r){return r.slice(6,56).replace(/ +$/,'');});
function amount(text) {
 if(text.length!==11||!/^\d{10}$/.test(text.slice(0,10))) return null;
 var last=text.charAt(10),digit,sign=1;
 if(/^[0-9]$/.test(last)) digit=last;
 else {
  var p='{ABCDEFGHI'.indexOf(last),n='}JKLMNOPQR'.indexOf(last);
  if(p>=0) digit=String(p);
  else if(n>=0){digit=String(n);sign=-1;}
  else return null;
 }
 var cents=Number(text.slice(0,10)+digit);
 return cents===0?0:sign*cents;
}
records(data.transactText).forEach(function(record,index){
 var line=index+1;
 if(record.length<314){problem('transact',line,'SHORT_TRANSACTION',false);return;}
 var type=record.slice(16,18),category=record.slice(18,22);
 if(type==='01'&&category==='0005') return;
 var day=record.slice(304,314);
 if(!validDate(day)){problem('transact',line,'BAD_PROCESSED_DATE',false);return;}
 if(day<start||day>end) return;
 var cents=amount(record.slice(132,143));
 if(cents===null){problem('transact',line,'BAD_AMOUNT',false);return;}
 if(!Number.isSafeInteger(cents)||Math.abs(cents)>99999999999){problem('transact',line,'AMOUNT_OVERFLOW',true);return;}
 var card=record.slice(262,278),account=accounts.get(card),td=types.get(type),cd=categories.get(type+category);
 if(account===undefined||account===null){account='00000000000';problem('transact',line,'MISSING_XREF',false);}
 if(td===undefined||td===null){td='UNKNOWN TYPE';problem('transact',line,'MISSING_TYPE',false);}
 if(cd===undefined||cd===null){cd='UNKNOWN CATEGORY';problem('transact',line,'MISSING_CATEGORY',false);}
 rows.push([record.slice(0,16),account,type,td,category,cd,record.slice(22,32),cents,card,line]);
});
rows.sort(function(a,b){return a[8]<b[8]?-1:a[8]>b[8]?1:a[9]-b[9];});
return {reportRows:notes.status==='INVALID_INPUT'?[]:rows,parseNotes:notes};
})(typeof input==='undefined'?undefined:input);
```

### Render daily report (SCRIPT, id=6ae4b5153695c563ea513dd9)

```javascript
output = (function(raw){
'use strict';
var status='COMPLETE',invalid=false,diagnostics=[],lines=[];
var reasons={MISSING_FILE_STRING:'Required file argument is missing or is not a string.',INVALID_DATE:'Date parameter is not a valid YYYY-MM-DD calendar date.',INVERTED_DATE_RANGE:'Start date is later than end date.',SHORT_REFERENCE:'Reference record lacks required used-field positions.',DUPLICATE_REFERENCE:'Duplicate reference ignored; first readable occurrence retained.',EMPTY_ACCOUNT:'Account field contains only ASCII spaces.',EMPTY_DESCRIPTION:'Reference description contains only ASCII spaces.',SHORT_TRANSACTION:'Transaction lacks positions through the processed-date prefix.',BAD_PROCESSED_DATE:'Processed-date prefix is not a valid calendar date.',BAD_AMOUNT:'Amount is not eleven-position implied-cent DISPLAY/overpunch text.',AMOUNT_OVERFLOW:'Detail amount exceeds exact-safe or printable bounds.',MISSING_XREF:'Account lookup unavailable; zero account placeholder retained.',MISSING_TYPE:'Type description unavailable; UNKNOWN TYPE retained.',MISSING_CATEGORY:'Category description unavailable; UNKNOWN CATEGORY retained.',MERGED_INPUT_INVALID:'Internal decoder result is missing or malformed.',TOTAL_OVERFLOW:'Subtotal, grand total or intermediate addition exceeds its safety bounds.',INTERNAL_WIDTH:'Generated report line does not have 133 characters.'};
var assumptions=[
['The four input files are supplied as exact decoded text strings; the caller saves the two returned texts together. No runtime file I/O is performed.','tranrept-sonnet-ix3.pdf p.26 lists transact.dat, cardxref.dat, trantype.dat and trancatg.dat. Maker delivery answer assigns reading and saving to the caller.'],
['Missing or non-string file arguments invalidate the run; explicitly supplied empty strings are valid empty files.','tranrept-sonnet-ix3.pdf p.26 lists the inputs but is silent about missing-argument treatment.'],
['Omitted dates default independently to 2022-07-01 and 2022-07-31; explicit blank or null dates do not default.','tranrept-sonnet-ix3.pdf p.26: report start date 2022-07-01 and end date 2022-07-31; omission handling is unstated.'],
['Require real YYYY-MM-DD Gregorian dates in years 0001 through 9999 and reject inverted ranges. Invalid run parameters return no report.','tranrept-sonnet-ix3.pdf p.2 BR-01: "Filter on processedTimestamp between start and end date inclusive"; run-parameter validation/failure policy is unstated.'],
['Input text is already ASCII-compatible decoded text. Positions count string code units; no EBCDIC conversion or Unicode normalization is attempted.','tranrept-sonnet-ix3.pdf p.26: "Fixed-width text, one record per line"; input encoding and decoding are not supplied.'],
['No complete copybooks were inspected. Transaction positions are inferred: ID 1-16, type 17-18, category 19-22, source 23-32, description 33-132, amount 133-143, merchant ID 144-152, merchant name 153-202, city 203-252, ZIP 253-262, card 263-278, original timestamp 279-304, processing timestamp 305-330 and filler 331-350.','tranrept-sonnet-ix3.pdf pp.8-9 supplies field order and picture widths; p.26 names CVTRA05Y and 350-character records, but the complete copybook and explicit offsets are absent.'],
['Cross-reference positions are inferred: card 1-16, customer 17-25, account 26-36, with remaining bytes unused.','tranrept-sonnet-ix3.pdf p.8 lists CardXref fields in that order with widths 16, 9 and 11; p.26 names CVACT03Y and length 50. Explicit offsets are absent.'],
['Type positions are inferred: code 1-2 and description 3-52; ignore the remaining eight positions.','tranrept-sonnet-ix3.pdf p.9 lists TransactionType code String(2) and description String(50); p.26 names CVTRA03Y and length 60. Explicit offsets are absent.'],
['Category positions are inferred: type 1-2, category 3-6, description 7-56; lookup uses type plus category.','tranrept-sonnet-ix3.pdf p.10 lists the composite type/category key and widths 2, 4 and 50; p.26 names CVTRA04Y and length 60. Explicit offsets are absent.'],
['Accept LF and CRLF record separators without trimming record contents; one terminal delimiter does not add a record, interior blank records remain records, and a standalone CR is not a separator.','tranrept-sonnet-ix3.pdf p.26: "one record per line"; separator and terminal-newline conventions are unstated.'],
['Require only the positions actually read: transaction prefix 314, cross-reference 36, type 52 and category 56. Missing unused tails and extra unused bytes are tolerated.','tranrept-sonnet-ix3.pdf pp.8-10 and p.26 give layouts and record lengths; truncation and extra-tail tolerance are unstated.'],
['Ignore unused description, merchant, original timestamp, customer and filler bytes, including NUL; do not validate the unused processing-timestamp suffix.','tranrept-sonnet-ix3.pdf p.29 detail layout does not consume these fields; no rule requires validating their contents.'],
['Preserve IDs and lookup codes as fixed-width opaque strings, including leading zeros; impose no Luhn or digit-only ID restriction.','tranrept-sonnet-ix3.pdf pp.8-10 gives string identifiers and widths; report-specific identifier validation is absent.'],
['Use the first ten processing-timestamp characters as the date, validate that prefix, and compare dates inclusively without timezone conversion.','tranrept-sonnet-ix3.pdf p.2 BR-01: "Filter on processedTimestamp between start and end date inclusive"; date-prefix and timezone treatment are unstated.'],
['After checking the required record prefix, exclude type 01/category 0005 before decoding its date or amount; out-of-range rows do not require amount or reference decoding.','tranrept-sonnet-ix3.pdf p.2 BR-07 says interest postings are left out of details and all totals; BR-01 specifies date filtering. The operation order is unstated.'],
['Decode eleven implied-cent positions: ordinary digits are positive; final {ABCDEFGHI represents positive digits 0-9 and }JKLMNOPQR negative digits 0-9. Separate signs, spaces, decimal points and lowercase overpunch are not accepted.','tranrept-sonnet-ix3.pdf p.8 gives TRAN-AMT S9(9)V99; p.9 mentions signed overpunch for another input. The transaction-file sign representation is not explicitly supplied.'],
['Use integer cents and normalize negative zero to zero. Check additions for exact-safe integer arithmetic; each printed amount or total must not exceed absolute 999999999.99. Overflow invalidates the report rather than truncating money.','tranrept-sonnet-ix3.pdf p.29 specifies the nine-integer-digit money picture; arithmetic, negative-zero and overflow handling are unstated.'],
['Sort card strings lexically, with original transaction line number breaking ties; do not sort same-card records by transaction ID.','tranrept-sonnet-ix3.pdf p.2 BR-02: "Sorted by card number"; comparison and tie rules are absent.'],
['First readable reference key wins, even when its remaining fields are malformed; diagnose later duplicates and never replace the first occurrence.','tranrept-sonnet-ix3.pdf p.2 BR-03 requires reference lookups; duplicate and malformed-first-occurrence rules are absent.'],
['Remove trailing ASCII spaces only from reference descriptions; preserve leading spaces. Blank descriptions and blank account fields are treated as unavailable.','tranrept-sonnet-ix3.pdf pp.8-10 specifies the fields; blank-reference and unpadding rules are absent.'],
['Retain a detail with UNKNOWN TYPE when its type description is unavailable; independently attempt its category lookup.','tranrept-sonnet-ix3.pdf p.4 unknown-reference result: "Error flagged, run continues" with TODO on legacy abend; fallback wording is absent.'],
['Retain a detail with UNKNOWN CATEGORY when its type-plus-category description is unavailable; independently attempt its type lookup.','tranrept-sonnet-ix3.pdf p.4: "Error flagged, run continues"; category fallback wording is absent.'],
['Retain a detail using account 00000000000 when its card cross-reference is unavailable or blank.','tranrept-sonnet-ix3.pdf p.29 requires an account field and p.4 requires error continuation; missing-cross-reference substitution is unstated.'],
['Skip records whose required fields cannot be decoded; continue processing others. Check all reference records even when unused. Recoverable errors, duplicate references and missing lookups mark PARTIAL.','tranrept-sonnet-ix3.pdf p.4: "Error flagged, run continues"; malformed-record isolation, unused-reference checking and status vocabulary are unstated.'],
['Diagnostics contain only fixed file names, original line numbers and reason codes, never raw records or card values; line zero denotes an argument problem.','tranrept-sonnet-ix3.pdf p.4 requires an error flag but does not specify its content or diagnostic privacy policy.'],
['A page holds 50 included transaction details; headings and subtotal lines do not count toward that limit.','tranrept-sonnet-ix3.pdf p.19: "page size {{TODO: lines per page in CBTRN03C}}". Fifty details is an implementation default, not a resolved legacy fact.'],
['Repeat the four-line page heading at each page break; print no page number beyond the exact contract header.','tranrept-sonnet-ix3.pdf p.29: "A page starts with the report header, the blank line, the column header and a rule"; its header has no page-number slot.'],
['Group Account Total by card, not by account ID; two cards sharing an account receive separate subtotals.','tranrept-sonnet-ix3.pdf p.2 BR-04: "card total (on card change)"; p.19: "break on card number"; p.29 labels the subtotal Account Total.'],
['Carry a card sum across pages without an intermediate card subtotal. When card and page boundaries coincide, print the card subtotal before the page subtotal.','tranrept-sonnet-ix3.pdf p.2 BR-04 names page, card and grand totals but leaves layout TODO; cross-page and coincident-boundary ordering are unstated.'],
['A page total contains only that page\'s detail amounts; a card total contains the entire card group; the grand total contains all included details.','tranrept-sonnet-ix3.pdf p.2 BR-04: "Totals: page total, card total (on card change), grand total"; p.2 BR-07 excludes interest from every total.'],
['Print the final page total, but do not create an extra empty page when the last detail is the fiftieth.','tranrept-sonnet-ix3.pdf p.2 BR-04 requires page totals; terminal-boundary behavior is unstated.'],
['An empty selection prints one four-line heading, zero Page Total with its following rule, and zero Grand Total, without an Account Total.','tranrept-sonnet-ix3.pdf p.4 empty-range result: "Report with zero total"; exact zero-report line sequence is unstated.'],
['Pad every report line to exactly 133 characters, retaining trailing spaces, and join lines using LF without a final LF.','tranrept-sonnet-ix3.pdf p.26 fixes 133-character report lines and permits omitted trailing spaces or a returned string; final-delimiter handling is unstated.'],
['Use the p.29 literal labels, separators and positions. Clip type and category descriptions to 15 and 29 characters; keep the four-character category code.','tranrept-sonnet-ix3.pdf p.29 specifies the detail positions and X(15)/X(29) description fields.'],
['Print zero as 0.00; group integer digits with commas, suppress leading positions and right-align the magnitude in fourteen positions.','tranrept-sonnet-ix3.pdf pp.27,29 specifies edited pictures and suppressed leading zeros; explicit zero rendering is an implementation interpretation.'],
['At position 98 print a blank sign for nonnegative details and plus for nonnegative totals; negative values print minus there.','tranrept-sonnet-ix3.pdf pp.27,29 gives -ZZZ,ZZZ,ZZZ.ZZ for details and +ZZZ,ZZZ,ZZZ.ZZ for totals.'],
['Follow each Page Total and Account Total with a rule; finish at Grand Total without a following rule.','tranrept-sonnet-ix3.pdf p.29: "Each page total and each account total line is followed by a rule"; no grand-total following rule is specified.'],
['Return only contract-format report text, assumptions Markdown and an outcome; no PDF, CSV or added footer is generated.','tranrept-sonnet-ix3.pdf p.19 proposes PDF and CSV, but p.26 specifies tranrept_report.txt or returned report text, and the maker requested this contract.'],
['Use COMPLETE without recoverable problems, PARTIAL with isolated recoverable problems, and INVALID_INPUT with an empty report for fatal input or amount-size errors; always return the assumptions table.','tranrept-sonnet-ix3.pdf p.4 requires error continuation; exact status vocabulary and fatal-output policy are not supplied.'],
['The decoder passes a versioned row/note interface to the renderer; validate it defensively and sort a copy, never mutate input.','The wiki does not specify an internal workflow interface; this is an implementation-only choice.'],
['No persistence, source-file mutation, historical backfill or runtime AI rewriting is performed. The fixed assumptions table has separate assumption and wiki-basis columns, one entry per decision.','The maker explicitly chose fixed-format assumptions Markdown with no runtime AI rewriting and assigned output saving to the calling runner; persistence and backfill are outside this report step.']
];
function issue(file,line,code,fatal){diagnostics.push({file:file,line:line,code:code});if(fatal){invalid=true;status='INVALID_INPUT';}else if(status==='COMPLETE')status='PARTIAL';}
function cell(v){return v.replace(/\|/g,'\\|').replace(/\r?\n/g,' ');}
function finish(){
 var a=['| What was assumed | Wiki statement or absence |','| --- | --- |'];
 assumptions.forEach(function(r){a.push('| '+cell(r[0])+' | '+cell(r[1])+' |');});
 a.push('','## Run-specific problems','','Overall status: **'+status+'**.','');
 if(!diagnostics.length)a.push('None.');
 else diagnostics.forEach(function(d){a.push('- `'+d.file+'` line '+d.line+': '+reasons[d.code]+' (`'+d.code+'`).');});
 return {tranrept_report:invalid?'':lines.join('\n'),assumptions_md:a.join('\n'),reportStatus:status};
}
function validDate(v){
 if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;
 var y=Number(v.slice(0,4)),m=Number(v.slice(5,7)),d=Number(v.slice(8,10));
 if(y<1||m<1||m>12)return false;
 var leap=y%4===0&&(y%100!==0||y%400===0);
 return d>=1&&d<=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31][m-1];
}
var data=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
var notes=data.parseNotes;
if(!Array.isArray(data.reportRows)||!notes||typeof notes!=='object'||Array.isArray(notes)||notes.version!==1||['COMPLETE','PARTIAL','INVALID_INPUT'].indexOf(notes.status)<0||!Array.isArray(notes.diagnostics)||typeof notes.startDate!=='string'||typeof notes.endDate!=='string'){
 issue('input',0,'MERGED_INPUT_INVALID',true);return finish();
}
status=notes.status;invalid=status==='INVALID_INPUT';
notes.diagnostics.forEach(function(d){
 if(!d||typeof d!=='object'||Array.isArray(d)||['input','transact','cardxref','trantype','trancatg'].indexOf(d.file)<0||!Number.isSafeInteger(d.line)||d.line<0||typeof d.code!=='string'||!Object.prototype.hasOwnProperty.call(reasons,d.code))issue('input',0,'MERGED_INPUT_INVALID',true);
 else diagnostics.push({file:d.file,line:d.line,code:d.code});
});
if(diagnostics.length&&status==='COMPLETE')status='PARTIAL';
if(invalid)return finish();
if(!validDate(notes.startDate)||!validDate(notes.endDate)||notes.startDate>notes.endDate){issue('input',0,'MERGED_INPUT_INVALID',true);return finish();}
var ordered=data.reportRows.slice();
for(var i=0;i<ordered.length;i++){
 var r=ordered[i],ok=Array.isArray(r)&&r.length===10;
 if(ok)ok=typeof r[0]==='string'&&r[0].length===16&&typeof r[1]==='string'&&r[1].length===11&&typeof r[2]==='string'&&r[2].length===2&&typeof r[3]==='string'&&r[3].length>=1&&r[3].length<=50&&typeof r[4]==='string'&&r[4].length===4&&typeof r[5]==='string'&&r[5].length>=1&&r[5].length<=50&&typeof r[6]==='string'&&r[6].length===10&&typeof r[7]==='number'&&typeof r[8]==='string'&&r[8].length===16&&Number.isSafeInteger(r[9])&&r[9]>=1;
 if(!ok){issue('input',0,'MERGED_INPUT_INVALID',true);break;}
 if(!Number.isSafeInteger(r[7])||Math.abs(r[7])>99999999999){issue('transact',r[9],'AMOUNT_OVERFLOW',true);break;}
}
if(invalid)return finish();
ordered.sort(function(a,b){return a[8]<b[8]?-1:a[8]>b[8]?1:a[9]-b[9];});
function rep(c,n){return new Array(n+1).join(c);}
function right(s,n){s=s.slice(0,n);return s+rep(' ',n-s.length);}
function left(s,n,c){s=s.slice(-n);return rep(c,n-s.length)+s;}
function append(s){if(s.length!==133)issue('input',0,'INTERNAL_WIDTH',true);else lines.push(s);}
function add(a,b,line){var v=a+b;if(!Number.isSafeInteger(v)){issue('transact',line,'TOTAL_OVERFLOW',true);return 0;}return v;}
function money(c,total,line){
 if(!Number.isSafeInteger(c)||Math.abs(c)>99999999999){issue(line?'transact':'input',line,total?'TOTAL_OVERFLOW':'AMOUNT_OVERFLOW',true);return '';}
 var n=Math.abs(c),whole=String(Math.floor(n/100)).replace(/\B(?=(\d{3})+(?!\d))/g,','),fraction=String(n%100);
 if(fraction.length===1)fraction='0'+fraction;
 return (c<0?'-':total?'+':' ')+left(whole+'.'+fraction,14,' ');
}
var rule=rep('-',133);
function header(){
 append(right('DALYREPT',38)+right('Daily Transaction Report',41)+right('Date Range:',12)+notes.startDate+' to '+notes.endDate+rep(' ',18));
 append(rep(' ',133));
 append(right(right('Transaction ID',17)+right('Account ID',12)+right('Transaction Type',19)+right('Tran Category',35)+right('Tran Source',14)+' '+right('Amount',16),133));
 append(rule);
}
function detail(r){var m=money(r[7],false,r[9]);if(!invalid)append(r[0]+' '+r[1]+' '+r[2]+'-'+right(r[3],15)+' '+r[4]+'-'+right(r[5],29)+' '+r[6]+rep(' ',4)+m+rep(' ',21));}
function total(label,dots,c,line,following){var m=money(c,true,line);if(!invalid){append(label+rep('.',dots)+m+rep(' ',21));if(following&&!invalid)append(rule);}}
header();
if(invalid)return finish();
if(!ordered.length){total('Page Total ',86,0,0,true);total('Grand Total',86,0,0,false);return finish();}
var pageSum=0,cardSum=0,grandSum=0,pageCount=0;
for(var p=0;p<ordered.length;p++){
 var current=ordered[p];
 pageSum=add(pageSum,current[7],current[9]);if(invalid)break;
 cardSum=add(cardSum,current[7],current[9]);if(invalid)break;
 grandSum=add(grandSum,current[7],current[9]);if(invalid)break;
 detail(current);if(invalid)break;pageCount++;
 var last=p===ordered.length-1;
 if(last||current[8]!==ordered[p+1][8]){total('Account Total',84,cardSum,current[9],true);if(invalid)break;cardSum=0;}
 if(pageCount===50||last){total('Page Total ',86,pageSum,current[9],true);if(invalid)break;pageSum=0;pageCount=0;if(!last){header();if(invalid)break;}}
}
if(!invalid)total('Grand Total',86,grandSum,ordered[ordered.length-1][9],false);
return finish();
})(typeof input==='undefined'?undefined:input);
```

### Escape text (SCRIPT, id=6ae4b5163695c563ea513dda)

```javascript
function esc(v) { return v == null ? null : JSON.stringify(String(v)).slice(1, -1).replace(/\\"/g, '"'); }
function at(o, p) { return p.split('.').reduce(function (x, k) { return x == null ? undefined : x[k]; }, o); }
output = {"endText": {t0: esc(at(input, "tranrept_report")), t1: esc(at(input, "assumptions_md")), t2: esc(at(input, "reportStatus"))}};

```

_(server: 282 ms, 1 API call, 250 ms in API)_
