# Workflow: DailyTransactionReport

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** 

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae4b0973695c563ea513c36 | <uuid> | (0, 0) | → ParseReportInputs (seq:<uuid>) |
| End | END | 6ae4b0983695c563ea513c37 | <uuid> | (2100, 0) | — |
| DocumentationFailed | END | 6ae4b0983695c563ea513c38 | <uuid> | (1200, 200) | — |
| ParseReportInputs | SCRIPT | 6ae4b0983695c563ea513c39 | <uuid> | (300, 0) | → SelectReportTransactions (seq:<uuid>) | lang: JAVASCRIPT |
| SelectReportTransactions | SCRIPT | 6ae4b0993695c563ea513c3a | <uuid> | (600, 0) | → RenderDailyReport (seq:<uuid>) | lang: JAVASCRIPT |
| RenderDailyReport | SCRIPT | 6ae4b0993695c563ea513c3b | <uuid> | (900, 0) | → DraftAssumptions (seq:<uuid>) | lang: JAVASCRIPT |
| DraftAssumptions | AI | 6ae4b0993695c563ea513c3c | <uuid> | (1200, 0) | → AssembleReportOutputs [SUCCESS] (seq:<uuid>), → DraftAssumptions failed [FAIL] (seq:<uuid>) | responseKey: assumptionsDraft, aiType: TEXT_UNDERSTANDING, responseSchema: set |
| AssembleReportOutputs | SCRIPT | 6ae4b0993695c563ea513c3d | <uuid> | (1500, 0) | → Escape text (seq:<uuid>) | lang: JAVASCRIPT |
| Escape text | SCRIPT | 6ae4b09a3695c563ea513c3e | <uuid> | (1800, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| DraftAssumptions failed | SCRIPT | 6ae4b09a3695c563ea513c3f | <uuid> | (1200, 200) | → DocumentationFailed (seq:<uuid>) | lang: JAVASCRIPT |

## Systems
_(none)_

## AI prompts

### DraftAssumptions (TEXT_UNDERSTANDING, id=6ae4b0993695c563ea513c3c)
instructions:

```
Write the companion assumptions document as structured entries, not as report data. Input is a complete implementation decision ledger, with exact assumptions and their supporting wiki statement or explicit absence. Return one entry for EVERY supplied decision and no other entries. Copy decisionId, whatYouAssumed and wikiStatementOrAbsence VERBATIM; in explanation, briefly explain why this is an assumption or implementation choice rather than confirmed legacy behaviour. Do not change the rule, invent a policy, assert oracle parity or use outside knowledge. Preserve the explicit maker choices and numerical examples. Use only the supplied ledger and source citations. The report has already been computed deterministically; you must not calculate totals, select transactions, receive customer records or modify report lines. Answer using the supplied JSON schema.
```
userMessage:

```
Explain every entry of this complete implementation decision ledger. Preserve all three input fields exactly and add explanation to each entry: ${decisionLedger}
```
exampleOutputJsonSchema:

```
{"title":"Response","type":"object","properties":{"assumptions":{"type":"array","items":{"type":"object","properties":{"decisionId":{"type":"string"},"whatYouAssumed":{"type":"string"},"wikiStatementOrAbsence":{"type":"string"},"explanation":{"type":"string"}},"required":["decisionId","whatYouAssumed","wikiStatementOrAbsence","explanation"],"additionalProperties":false}}},"required":["assumptions"],"additionalProperties":false}
```

## Scripts

### ParseReportInputs (SCRIPT, id=6ae4b0983695c563ea513c39)

```javascript
function trimRight(s) { return String(s).replace(/ +$/g, ''); }
function validDate(s) { if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false; var y=Number(s.slice(0,4)),m=Number(s.slice(5,7)),d=Number(s.slice(8,10)); var leap=y%4===0&&(y%100!==0||y%400===0); var days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31]; return m>=1&&m<=12&&d>=1&&d<=days[m-1]; }
function cents(s) { var last=s.slice(-1),pos='{ABCDEFGHI',neg='}JKLMNOPQR',sign=1,i=pos.indexOf(last),digits=s; if(i>=0) digits=s.slice(0,-1)+String(i); else {i=neg.indexOf(last); if(i>=0){digits=s.slice(0,-1)+String(i);sign=-1;}} if(!/^\d{11}$/.test(digits)) return null; return sign*Number(digits); }
var errors=[], fatal=false;
function flag(file,row,reason,severity){errors.push({file:file,row:row,reason:reason,severity:severity||'WARNING'});if(severity==='ERROR')fatal=true;}
function lines(key,file){if(!Object.prototype.hasOwnProperty.call(input,key)||typeof input[key]!=='string'){flag(file,0,'Required file contents were not supplied as text','ERROR');return [];} var a=input[key].split('\n');if(a.length&&a[a.length-1]==='')a.pop();return a.map(function(s){return s.endsWith('\r')?s.slice(0,-1):s;});}
var txLines=lines('transactDat','transact.dat'),xrLines=lines('cardxrefDat','cardxref.dat'),tyLines=lines('trantypeDat','trantype.dat'),caLines=lines('trancatgDat','trancatg.dat');
var start=input.startDate===undefined?'2022-07-01':String(input.startDate),end=input.endDate===undefined?'2022-07-31':String(input.endDate);
if(!validDate(start)||!validDate(end))flag('run parameters',0,'A supplied range date is not a valid YYYY-MM-DD date','ERROR');
var types={},cats={},xrefs={},transactions=[];
tyLines.forEach(function(s,i){if(s.length<52){flag('trantype.dat',i+1,'Unreadable type key or description; reference row skipped');return;}var k=s.slice(0,2);if(Object.prototype.hasOwnProperty.call(types,k)){flag('trantype.dat',i+1,'Duplicate type key; first occurrence retained');return;}types[k]=trimRight(s.slice(2,52));});
caLines.forEach(function(s,i){if(s.length<56){flag('trancatg.dat',i+1,'Unreadable category key or description; reference row skipped');return;}var k=s.slice(0,6);if(Object.prototype.hasOwnProperty.call(cats,k)){flag('trancatg.dat',i+1,'Duplicate category key; first occurrence retained');return;}cats[k]=trimRight(s.slice(6,56));});
xrLines.forEach(function(s,i){if(s.length<36){flag('cardxref.dat',i+1,'Unreadable card/account cross-reference; row skipped');return;}var k=s.slice(0,16);if(Object.prototype.hasOwnProperty.call(xrefs,k)){flag('cardxref.dat',i+1,'Duplicate card key; first occurrence retained');return;}xrefs[k]=s.slice(25,36);});
txLines.forEach(function(s,i){if(s.length<330){flag('transact.dat',i+1,'Unreadable consumed transaction fields; row skipped');return;}var date=s.slice(304,314);if(!validDate(date)){flag('transact.dat',i+1,'Unreadable processed date; transaction cannot be selected and is skipped');return;}if(date<start||date>end)return;var type=s.slice(16,18),cat=s.slice(18,22);if(type==='01'&&cat==='0005')return;var amt=cents(s.slice(132,143));if(amt===null){flag('transact.dat',i+1,'Unreadable signed amount; selected transaction skipped');return;}if(!/^\d{4}$/.test(cat)){flag('transact.dat',i+1,'Unreadable consumed category code; selected transaction skipped');return;}transactions.push({transactionId:s.slice(0,16),typeCode:type,categoryCode:cat,source:s.slice(22,32),amountCents:amt,cardNumber:s.slice(262,278),processedDate:date,inputOrder:i,row:i+1});});
output={parsedReport:{startDate:start,endDate:end,transactions:transactions,types:types,categories:cats,xrefs:xrefs,errors:errors,fatal:fatal}};
```

### SelectReportTransactions (SCRIPT, id=6ae4b0993695c563ea513c3a)

```javascript
var p=input.parsedReport||{transactions:[],types:{},categories:{},xrefs:{},errors:[],fatal:true,startDate:'2022-07-01',endDate:'2022-07-31'};var errors=(p.errors||[]).slice();var rows=(p.transactions||[]).slice();rows.sort(function(a,b){if(a.cardNumber<b.cardNumber)return -1;if(a.cardNumber>b.cardNumber)return 1;return a.inputOrder-b.inputOrder;});
rows=rows.map(function(t){var typeFound=Object.prototype.hasOwnProperty.call(p.types,t.typeCode),categoryFound=Object.prototype.hasOwnProperty.call(p.categories,t.typeCode+t.categoryCode),accountFound=Object.prototype.hasOwnProperty.call(p.xrefs,t.cardNumber);if(!typeFound)errors.push({file:'transact.dat',row:t.row,severity:'WARNING',reason:'Transaction type lookup missing; description printed blank; amount retained'});if(!categoryFound)errors.push({file:'transact.dat',row:t.row,severity:'WARNING',reason:'Transaction category lookup missing; description printed blank; amount retained'});if(!accountFound)errors.push({file:'transact.dat',row:t.row,severity:'WARNING',reason:'Card/account lookup missing; account number printed blank; amount retained'});return {transactionId:t.transactionId,typeCode:t.typeCode,categoryCode:t.categoryCode,source:t.source,amountCents:t.amountCents,cardNumber:t.cardNumber,accountId:accountFound?p.xrefs[t.cardNumber]:'',typeDescription:typeFound?p.types[t.typeCode]:'',categoryDescription:categoryFound?p.categories[t.typeCode+t.categoryCode]:'',row:t.row};});
output={selectedReport:{startDate:p.startDate,endDate:p.endDate,rows:rows,errors:errors,fatal:p.fatal===true}};
```

### RenderDailyReport (SCRIPT, id=6ae4b0993695c563ea513c3b)

```javascript
function entry(id,assumption,basis){return {decisionId:id,whatYouAssumed:assumption,wikiStatementOrAbsence:basis};}
var ledger=[
entry('input-boundary','The caller supplies the decoded text contents of the four daily-report files. No posting, interest calculation or statement generation runs here.','tranrept-sonnet-ix3.pdf p.26: daily transaction report inputs are transact.dat, cardxref.dat, trantype.dat and trancatg.dat; step isolation supplies upstream outputs.'),
entry('input-layout','Infer contiguous field offsets from the listed copybook field order and widths. Transaction offsets, zero-based: id 0:16, type 16:18, category 18:22, source 22:32, description 32:132, amount 132:143, merchant ID 143:152, merchant name 152:202, merchant city 202:252, merchant ZIP 252:262, card 262:278, original timestamp 278:304, processed timestamp 304:330. The remaining 20 bytes are ignored.','tranrept-sonnet-ix3.pdf pp.8-9 list Transaction fields and widths; pp.25-26 name CVTRA05Y and 350-byte records, but the complete copybook and explicit offsets are absent.'),
entry('reference-layout','Cross-reference fields are card 0:16, customer 16:25 and account 25:36; ignore the remaining 14 bytes. Type fields are code 0:2 and description 2:52, with 8 ignored bytes. Category fields are type 0:2, category 2:6 and description 6:56, with 4 ignored bytes.','tranrept-sonnet-ix3.pdf pp.8-10 list CardXref, TransactionType and TransactionCategory fields; pp.25-26 give record lengths 50, 60 and 60 but do not reproduce the copybooks.'),
entry('signed-amount','Interpret the 11-character transaction amount as implied cents, with an unsigned final digit or an ASCII COBOL overpunch: {ABCDEFGHI are positive digits 0-9 and }JKLMNOPQR negative digits 0-9. Thus 0000000145F is 14.56. Keep identifiers as strings and retain leading zeros.','tranrept-sonnet-ix3.pdf p.8: TRAN-AMT is S9(9)V99; p.9 illustrates signed overpunch for another amount field. Transaction encoding is unstated. Maker selected signed-final-digit and implied-cent decoding.'),
entry('unused-bytes','Inspect only fields consumed by this report. Ignore unused descriptions, merchant fields, original timestamps and filler, including NUL or non-printable filler. Do not demand exact total record length when all consumed slices exist.','tranrept-sonnet-ix3.pdf pp.8-9 describe unused Transaction fields; p.29 defines the smaller set printed by this step. Validation of unused bytes is not specified.'),
entry('line-framing','Split input on LF and remove a terminal CR from each record. Ignore only the single final empty element due to a terminating LF; an interior empty record is flagged. Inputs are already decoded text, not EBCDIC bytes.','tranrept-sonnet-ix3.pdf pp.25-26: fixed-width text, one record per line. Encoding and line-ending conventions are not specified.'),
entry('date-range','Default absent range parameters to 2022-07-01 and 2022-07-31. Compare the first ten processed-timestamp characters as calendar dates inclusively; ignore the time portion. A reversed valid range selects nothing. Invalid calendar range parameters fail the run.','tranrept-sonnet-ix3.pdf p.26 supplies July 2022 report parameters; p.2 BR-01 selects processedTimestamp inclusively. Time-zone, reversed-range and malformed-parameter handling are absent. July contract parameters take precedence over the older January-July wiki defaults on p.2.'),
entry('interest-order','Apply date selection and the exact type 01/category 0005 exclusion before reading monetary amounts or resolving lookups for selected report rows. Excluded rows never contribute to any total.','tranrept-sonnet-ix3.pdf p.2 BR-07: interest postings are left out, with no detail and no page, card or grand total contribution. Error precedence for excluded rows is not specified.'),
entry('same-card-order','Sort by the full card-number string, preserving input order among transactions on the same card; add no secondary transaction-ID ordering.','tranrept-sonnet-ix3.pdf p.2 BR-02: sorted by card number. No secondary ordering is stated. Maker selected input order within each card.'),
entry('card-subtotals','Use the card cross-reference account number on detail lines. Sum and print Account Total at each card break, even if different cards share an account. A card with only excluded transactions produces no subtotal.','tranrept-sonnet-ix3.pdf p.19: Account total is sum per account/card, break on card number; p.29 labels it Account Total. Maker selected card-break totals even for cards sharing an account.'),
entry('unknown-lookups','Keep selected transactions whose type, composite type/category, or card/account lookup is missing. Print unavailable descriptions or account number as blank, retain their amounts, and list each missing lookup by input file and row in this document.','tranrept-sonnet-ix3.pdf p.4 scenario 5: Error flagged, run continues, with TODO about legacy abort behaviour. The printed substitute and missing-card behaviour are unstated. Maker selected blanks with retained amounts and a missing-lookup list.'),
entry('duplicate-reference','Use the first occurrence of a duplicate type, composite category, or card cross-reference key and flag later occurrences.','tranrept-sonnet-ix3.pdf pp.8-10 define primary/composite keys but no duplicate-input policy for this file-based implementation.'),
entry('row-errors','Flag and skip only the affected record when a required consumed slice, selected amount, processed date or printed numeric category is unreadable. Malformed reference records do not stop other records. Missing input-file contents or invalid range parameters fail the run; explicitly supplied empty strings are valid empty files.','tranrept-sonnet-ix3.pdf pp.4,25-26 specify continuation for unknown references and text files, but do not specify malformed-record or missing-file behaviour.'),
entry('money-arithmetic','Use integer cents and algebraic addition, including negative amounts; do not perform floating-point rounding. No detail amount contributes twice when a card spans pages.','tranrept-sonnet-ix3.pdf pp.2,19 require page, card and grand totals; p.8 declares two decimal places. The arithmetic implementation is not specified.'),
entry('pagination','Allow at most 60 printed lines per page including headings and totals. Every page begins with the four contract heading lines. Keep each subtotal with its following rule; keep a card subtotal with its last detail. Continue a card across pages when necessary. Reserve room for a page subtotal and rule plus one grand-total line on every page, leaving at most one extra unused line on nonfinal pages.','tranrept-sonnet-ix3.pdf p.19: page size TODO; p.29: every page starts with header, blank, column header and rule, and each page/account total has a following rule. Capacity and exact subtotal placement are unstated. Chosen default is 60 lines.'),
entry('page-totals','Page Total sums only detail amounts physically printed on that page, not printed card totals. Print it before each new page and on the final page; print the single Grand Total after the final page subtotal and rule. Do not print an extra rule after Grand Total.','tranrept-sonnet-ix3.pdf p.19 says sum per page and sum for report; p.29 defines line types and rules but not precise final ordering or subtotal interaction.'),
entry('empty-report','An empty selection prints the four heading lines, a zero Page Total, its rule and a zero Grand Total, with no Account Total.','tranrept-sonnet-ix3.pdf p.4 scenario 4: Report with zero total. Exact empty-report line sequence is not stated.'),
entry('print-pictures','Detail amounts use a leading minus only for negatives and otherwise a space; total lines always use plus or minus. Suppress leading zero groups and their commas, print two decimal places, and normalize negative zero to positive zero.','tranrept-sonnet-ix3.pdf pp.27,29 define -ZZZ,ZZZ,ZZZ.ZZ for details and +ZZZ,ZZZ,ZZZ.ZZ for totals; the zero-only rendering is not illustrated.'),
entry('field-widths','Truncate printed text on the right to its contract width, pad with spaces and emit every line as exactly 133 characters. Use only the contract header fields; do not add a page number, PDF layout or CSV.','tranrept-sonnet-ix3.pdf p.29 gives exact report field positions; pp.26-27 permit trailing-space omission and define X(n). p.19 mentions page numbers and PDF/CSV, but the report-specific contract has no position for page numbers and selects text output.'),
entry('overflow','If any amount or subtotal cannot fit the signed nine-integer-digit print picture, or accumulation exceeds exact integer safety, fail the run without a completed report rather than clip a financial value.','tranrept-sonnet-ix3.pdf p.29 fixes the amount picture; overflow behaviour is absent.'),
entry('delivery','Return tranrept_report as a list of lines and assumptions_md as companion Markdown text, plus structured assumptions and status/errors. Do not write server files or alter source records. A successful result must contain both outputs.','tranrept-sonnet-ix3.pdf p.26 explicitly permits report lines returned under the output filename without extension. The requested assumptions.md accompanies those report contents; physical directory delivery is not defined.'),
entry('documentation-model','The model only explains the complete fixed decision ledger; it does not calculate or select report contents and does not receive transaction records. Preserve every assumption and source basis verbatim, then add explanation. Invalid, incomplete or failed documentation prevents successful delivery.','The maker requests every assumption and its supporting wiki statement or absence in assumptions.md. The wiki does not prescribe how this companion document is authored or how documentation failures are handled.')
];
var p=input.selectedReport||{rows:[],errors:[],fatal:true,startDate:'2022-07-01',endDate:'2022-07-31'};var errors=(p.errors||[]).slice(),fatal=p.fatal===true,lines=[],count=0,pageCents=0,grand=0;
function text(s,n){s=String(s);return s.slice(0,n).padEnd(n,' ');}
function picture(c,total){if(!Number.isSafeInteger(c)||Math.abs(c)>99999999999){fatal=true;errors.push({file:'report',row:0,severity:'ERROR',reason:'Amount or subtotal exceeds the contract print picture'});return ' '.repeat(15);}var a=Math.abs(c),whole=String(Math.floor(a/100)),frac=String(a%100).padStart(2,'0');var grouped=whole.replace(/\B(?=(\d{3})+(?!\d))/g,',');if(a<100)grouped='';var body=grouped+'.'+frac;return (c<0?'-':total?'+':' ')+body.padStart(14,' ');}
function emit(s){lines.push(text(s,133));count++;}
function begin(){count=0;pageCents=0;emit(text('DALYREPT',38)+text('Daily Transaction Report',41)+text('Date Range:',12)+text(p.startDate,10)+text(' to ',4)+text(p.endDate,10));emit('');emit(text('Transaction ID',17)+text('Account ID',12)+text('Transaction Type',19)+text('Tran Category',35)+text('Tran Source',14)+' '+text('Amount',16));emit('-'.repeat(133));}
function subtotal(label,c){var width=label==='Account Total'?13:11;return text(label,width)+'.'.repeat(97-width)+picture(c,true);}
function closePage(){emit(subtotal('Page Total',pageCents));emit('-'.repeat(133));}
function room(n){if(count+n+3>60){closePage();begin();}}
function safeAdd(a,b){var c=a+b;if(!Number.isSafeInteger(c)){fatal=true;errors.push({file:'report',row:0,severity:'ERROR',reason:'Total exceeds exact integer safety'});return 0;}return c;}
begin();var rows=p.rows||[],i=0;while(i<rows.length){var j=i,card=rows[i].cardNumber,cardTotal=0;while(j<rows.length&&rows[j].cardNumber===card){cardTotal=safeAdd(cardTotal,rows[j].amountCents);j++;}for(var k=i;k<j;k++){var r=rows[k],last=k===j-1;room(last?3:1);var detail=text(r.transactionId,16)+' '+text(r.accountId,11)+' '+text(r.typeCode,2)+'-'+text(r.typeDescription,15)+' '+text(r.categoryCode,4)+'-'+text(r.categoryDescription,29)+' '+text(r.source,10)+'    '+picture(r.amountCents,false)+'  ';emit(detail);pageCents=safeAdd(pageCents,r.amountCents);grand=safeAdd(grand,r.amountCents);if(last){emit(subtotal('Account Total',cardTotal));emit('-'.repeat(133));}}i=j;}closePage();emit(subtotal('Grand Total',grand));
output={renderedReport:{lines:fatal?[]:lines,errors:errors,fatal:fatal},decisionLedger:ledger};
```

### AssembleReportOutputs (SCRIPT, id=6ae4b0993695c563ea513c3d)

```javascript
var r=input.renderedReport||{lines:[],errors:[],fatal:true},ledger=input.decisionLedger||[],draft=input.assumptionsDraft||{},entries=Array.isArray(draft.assumptions)?draft.assumptions:[],errors=(r.errors||[]).slice(),bad=false,ordered=[];
if(entries.length!==ledger.length||ledger.length===0)bad=true;
ledger.forEach(function(w){var matches=entries.filter(function(e){return e&&e.decisionId===w.decisionId;});if(matches.length!==1){bad=true;return;}var e=matches[0];if(e.whatYouAssumed!==w.whatYouAssumed||e.wikiStatementOrAbsence!==w.wikiStatementOrAbsence||typeof e.explanation!=='string'||e.explanation.trim()===''){bad=true;return;}ordered.push({decisionId:e.decisionId,whatYouAssumed:e.whatYouAssumed,wikiStatementOrAbsence:e.wikiStatementOrAbsence,explanation:e.explanation});});
if(bad)errors.push({file:'assumptions.md',row:0,severity:'ERROR',reason:'Assumptions documentation is missing, incomplete or changed a recorded assumption/source basis'});
function cell(s){return String(s).replace(/\|/g,'\\|').replace(/[\r\n]+/g,' ');}
var md=['# Daily transaction report assumptions','','These are explicit implementation decisions, not claims of verified legacy equivalence.','','| Decision | What you assumed | Which wiki statement (or absence of one) it rests on | Explanation |','| --- | --- | --- | --- |'];ordered.forEach(function(e){md.push('| '+cell(e.decisionId)+' | '+cell(e.whatYouAssumed)+' | '+cell(e.wikiStatementOrAbsence)+' | '+cell(e.explanation)+' |');});
md.push('','## Input and lookup flags','','| Input file | Record number | Severity | Flag |','| --- | --- | --- | --- |');if(errors.length===0)md.push('| None | — | — | No input or lookup flags. |');else errors.forEach(function(e){md.push('| '+cell(e.file)+' | '+cell(e.row)+' | '+cell(e.severity)+' | '+cell(e.reason)+' |');});
var fatal=r.fatal===true||bad;output={reportOutputs:{tranrept_report:fatal?[]:(r.lines||[]),assumptions_md:bad?'':md.join('\n')+'\n',assumptions:bad?[]:ordered,status:fatal?'FAILED':errors.length?'SUCCESS_WITH_WARNINGS':'SUCCESS',errors:errors}};
```

### Escape text (SCRIPT, id=6ae4b09a3695c563ea513c3e)

```javascript
function esc(v) { return v == null ? null : JSON.stringify(String(v)).slice(1, -1).replace(/\\"/g, '"'); }
function at(o, p) { return p.split('.').reduce(function (x, k) { return x == null ? undefined : x[k]; }, o); }
output = {"endText": {t0: esc(at(input, "reportOutputs.assumptions_md")), t1: esc(at(input, "reportOutputs.status"))}};

```

### DraftAssumptions failed (SCRIPT, id=6ae4b09a3695c563ea513c3f)

```javascript
output = {"reportOutputs": {"tranrept_report": [], "assumptions_md": "", "assumptions": [], "status": "FAILED", "errors": []}};

```

_(server: 305 ms, 1 API call, 277 ms in API)_
