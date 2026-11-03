# Workflow: GenerateDailyTransactionReport

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** 

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae509c53695c563ea514caa | <uuid> | (0, 0) | → Build report (seq:<uuid>) |
| End | END | 6ae509c53695c563ea514cab | <uuid> | (1200, 0) | — |
| Build report | SCRIPT | 6ae509c53695c563ea514cac | <uuid> | (300, 0) | → Draft assumptions (seq:<uuid>) | lang: JAVASCRIPT |
| Draft assumptions | AI | 6ae509c53695c563ea514cad | <uuid> | (600, 0) | → Finalize outputs [SUCCESS] (seq:<uuid>), → Draft assumptions failed [FAIL] (seq:<uuid>) | responseKey: draftedAssumptions, aiType: TEXT_UNDERSTANDING, responseSchema: set |
| Finalize outputs | SCRIPT | 6ae509c53695c563ea514cae | <uuid> | (900, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| Draft assumptions failed | SCRIPT | 6ae509c53695c563ea514caf | <uuid> | (600, 200) | → Finalize outputs (seq:<uuid>) | lang: JAVASCRIPT |

## Systems
_(none)_

## AI prompts

### Draft assumptions (TEXT_UNDERSTANDING, id=6ae509c53695c563ea514cad)
instructions:

```
Draft the assumptions for this isolated CardDemo daily transaction report. Use only the supplied canonical manifest. It contains implementation decisions and their cited source statements or explicitly identified source omissions. Return one entry per manifest item in the same order. Preserve id and source exactly. In whatAssumed clearly state what was assumed, without changing its meaning. In wikiStatementOrAbsence distinguish a documented statement from an omission or TODO; do not promote an assumption into a wiki rule. Do not invent references, decisions, validations, behaviour or oracle results. Every entry must have its own separate whatAssumed and wikiStatementOrAbsence properties. No customer transaction data is provided or needed. Output only the required structured object.
```
userMessage:

```
Canonical implementation decisions and source bases: ${assumptionManifest}
```
exampleOutputJsonSchema:

```
{"title":"Response","type":"object","additionalProperties":false,"required":["entries"],"properties":{"entries":{"type":"array","items":{"type":"object","additionalProperties":false,"required":["id","whatAssumed","wikiStatementOrAbsence","source"],"properties":{"id":{"type":"string"},"whatAssumed":{"type":"string"},"wikiStatementOrAbsence":{"type":"string"},"source":{"type":"string"}}}}}}
```

## Scripts

### Build report (SCRIPT, id=6ae509c53695c563ea514cac)

```javascript
var rows = [
['Receive file contents as four string run inputs and return printed lines rather than physical files.','CONTRACT.md permits the same printed lines as a string or list under the filename without extension; no storage location is specified.','26'],
['Default an omitted date range to 2022-07-01 through 2022-07-31; supplied dates override those defaults.','The layer 1 run parameters specify that range; per-run dates are described in the process.','2, 26'],
['Use the transaction field order in the data-model table: id 1-16, type 17-18, category 19-22, source 23-32, description 33-132, amount 133-143, merchant id 144-152, name 153-202, city 203-252, zip 253-262, card 263-278, original timestamp 279-304, processing timestamp 305-330; ignore the remaining 20 bytes.','The table lists field widths and order, and CONTRACT.md gives 350 bytes, but does not reproduce the offset copybook.','8, 9, 26'],
['Decode card cross-references as card 1-16, customer 17-25 and account 26-36; type references as type 1-2 and description 3-52; category references as type 1-2, category 3-6 and description 7-56.','The data-model tables list those widths and order; the full copybooks and offsets are absent.','8, 9, 10, 26'],
['Treat unused suffixes as filler, allow their omission, and never reject filler NULs or other unused bytes. Only fields read by this report are decoded.','The record sizes exceed the listed fields; filler content and validation are not specified.','8, 9, 10, 26'],
['Interpret a transaction amount as eleven display digits with implied two decimal places; accept a numeric final digit as positive, { or A-I as positive overpunch, and } or J-R as negative overpunch.','TRAN-AMT is S9(9)V99; transaction sign encoding is not reproduced. Another data-model amount explicitly uses signed overpunch.','8, 9'],
['Keep all digit identifiers as strings, including leading zeros; do not convert account, card or transaction identifiers to numbers.','The report detail has fixed-width identifier columns; the data model gives string identifiers.','8, 29'],
['Compare the first ten processing-timestamp characters as calendar dates, inclusively, without timezone conversion; do not filter on original timestamp or business date.','BR-01 selects processedTimestamp between start and end inclusive; timestamp normalization is unstated.','2, 9'],
['Sort lexically by card number, preserving original transaction file order for equal cards.','BR-02 specifies sorting by card number but no secondary ordering.','2'],
['Resolve accounts by card cross-reference; resolve category descriptions by the composite type and category key.','The verification lists CardXref; TransactionCategory has the composite type/category key.','4, 8, 10, 29'],
['Use the first input occurrence of a duplicate reference key and report the duplicate.','Reference keys are documented as unique; duplicate input handling is not specified.','8, 9, 10'],
['For missing type/category references, retain the detail with UNKNOWN TYPE or UNKNOWN CATEGORY and a warning.','Unknown reference acceptance says Error flagged, run continues and marks legacy abend behaviour TODO; placeholder text is unstated.','4'],
['For a missing card cross-reference, leave the eleven-character account column blank, retain the detail, and warn.','The account column is required in the layout; missing cross-reference behaviour is not specified.','4, 19, 29'],
['For an undecodable required field, skip only that record and diagnose filename and one-based line number; continue with all other valid records. Reference records with insufficient used fields are ignored with warnings.','The wiki provides no malformed-record rule; continuation for missing type references is explicit.','4, 8, 9, 10'],
['Do not validate unused transaction fields such as merchant data, original timestamp or description, and do not impose digit-only checks on identifiers.','Those fields are not read by the report layout; no additional validation is stated for this step.','19, 29'],
['A page contains at most 50 detail rows; headers, rules and totals do not consume that allowance.','Page size is explicitly TODO: lines per page in CBTRN03C.','19'],
['Break account totals on card number, even when multiple cards share one account; carry a card total across pages.','The plugin specifies an account/card sum with break on card number; page-boundary treatment is unstated.','2, 19'],
['Print account total immediately after the last detail for that card; at a simultaneous card/page break print account total before page total.','Both total types are specified but their combined ordering is not.','2, 19, 29'],
['Print a page total and rule before each page ends, repeat the four-line page heading on the next page, and print grand total last without an extra trailing rule or empty page.','The contract states that a page starts with header, blank, column header and rule; page/account totals are followed by rules, but final ordering is not specified.','29'],
['For an empty selection print one page heading, a zero page total with rule, and a zero grand total; no account totals.','Empty range requires a report with zero total; the precise empty layout is unstated.','4, 29'],
['Sum signed integer cents; do not use floating-point currency arithmetic or round each total separately.','The contract permits at most two decimal places; the wiki does not state a rounding algorithm.','8, 25, 27, 29'],
['Use the contract amount picture with sign in the first of fifteen positions, suppressed leading zeros/commas, two decimals, space for positive detail sign, and + for nonnegative totals; normalize negative zero to zero.','The contract defines -ZZZ,ZZZ,ZZZ.ZZ and +ZZZ,ZZZ,ZZZ.ZZ; negative-zero behaviour is unstated.','27, 29'],
['If a page, card or grand total cannot fit the nine-digit amount picture or safe integer arithmetic, flag an ERROR and return no complete report rather than truncate or wrap money.','No monetary overflow behaviour is specified for this step.','29'],
['Use LF as the output line separator, accept LF or CRLF input, omit only the final newline terminator from record parsing, and pad every printed line to 133 characters.','CONTRACT.md specifies one record per line and permits trailing spaces to be omitted; input newline conventions are unstated.','26, 29'],
['Truncate printable descriptions and source to their contract text widths; do not truncate monetary fields.','The contract specifies X(15), X(29) and X(10) on the detail line.','29'],
['Require all four file-content inputs; explicitly empty files are valid. Missing inputs or invalid/reversed calendar-date ranges yield ERROR with no complete report, while still returning assumptions.','Four report inputs and run dates are specified; absent-input and invalid-range handling are not specified for this isolated step.','26'],
['Validate calendar dates without converting timezones; decode dates before amount fields and skip out-of-range transactions without validating their unused report fields.','Only transactions in the processing-date range enter the report; validation order is unstated.','2'],
['Draft assumptions from the canonical implementation decision list and supplied source excerpts only, without sending transaction contents to the model.','The maker requests each assumption and its wiki basis; the drafting mechanism is not specified.','1, 26'],
['If model drafting fails, has missing/extra/duplicate entries or changes citations, return the complete canonical Markdown decision list and identify the fallback. Keep the report unchanged.','Documentation failure handling is not specified by the wiki or contract.','26'],
['Return structured assumptions as well as a Markdown table with separate assumption, wiki-statement-or-absence and source columns; retain the authoritative canonical decision list in the document.','The maker explicitly asks what was assumed and which wiki statement or absence it rests on, next to the outputs.','26'],
['Treat the provided layer 1 fixed-column contract as authoritative for this step; do not generate the plugin page-number field, PDF, CSV, notifications or other batch-step outputs.','The plugin mentions PDF/CSV and page number, but CONTRACT.md for this step requires only tranrept_report.txt with its stated header.','19, 26, 29']
];
var manifest = [];
for (var m = 0; m < rows.length; m++) { manifest.push({id:'A' + String(m+1), whatAssumed:'Assumed: ' + rows[m][0], wikiStatementOrAbsence:rows[m][1], source:'tranrept-sonnet.pdf p.' + rows[m][2]}); }
function mdCell(x) { return String(x).replace(/\|/g,'\\|').replace(/[\r\n]+/g,' '); }
var markdown = '# Assumptions\n\n| What you assumed | Which wiki statement (or absence of one) it rests on | Source |\n| --- | --- | --- |\n';
for (var a=0; a<manifest.length; a++) { var z=manifest[a]; markdown += '| ' + mdCell(z.id + ': ' + z.whatAssumed) + ' | ' + mdCell(z.wikiStatementOrAbsence) + ' | ' + mdCell(z.source) + ' |\n'; }
var diagnostics = [], fatal = false;
function warn(file,line,reason) { diagnostics.push({filename:file,line:line,reason:reason,severity:'WARNING'}); }
function fail(reason) { fatal=true; diagnostics.push({filename:'run',line:0,reason:reason,severity:'ERROR'}); }
function rtrim(x) { return String(x).replace(/ +$/,''); }
function pad(x,n) { var s=String(x); return s.substring(0,n) + new Array(Math.max(0,n-s.length)+1).join(' '); }
function calendar(s) { if(typeof s!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false; var y=Number(s.substring(0,4)), mo=Number(s.substring(5,7)), d=Number(s.substring(8,10)); var days=[31,((y%4===0 && y%100!==0)||y%400===0)?29:28,31,30,31,30,31,31,30,31,30,31]; return y>=1 && mo>=1 && mo<=12 && d>=1 && d<=days[mo-1]; }
var start=input.startDate==null?'2022-07-01':input.startDate;
var end=input.endDate==null?'2022-07-31':input.endDate;
if(!calendar(start)||!calendar(end)||start>end) fail('Invalid or reversed calendar date range.');
var names=['transact_dat','cardxref_dat','trantype_dat','trancatg_dat'];
for(var k=0;k<names.length;k++) { if(typeof input[names[k]]!=='string') fail('Missing file-content input: ' + names[k]); }
function records(key) { var s=input[key]; if(typeof s!=='string'||s==='') return []; var ls=s.split('\n'); if(ls[ls.length-1]==='') ls.pop(); for(var j=0;j<ls.length;j++) { if(ls[j].slice(-1)==='\r') ls[j]=ls[j].slice(0,-1); } return ls; }
var xrefs={}, types={}, cats={};
function add(map,key,value,file,line) { var p='$'+key; if(Object.prototype.hasOwnProperty.call(map,p)) warn(file,line,'Duplicate reference key; first occurrence retained: '+key); else map[p]=value; }
var xr=records('cardxref_dat');
for(var j=0;j<xr.length;j++) { if(xr[j].length<36) warn('cardxref.dat',j+1,'Insufficient used cross-reference fields.'); else add(xrefs,xr[j].substring(0,16),xr[j].substring(25,36),'cardxref.dat',j+1); }
var ty=records('trantype_dat');
for(var j=0;j<ty.length;j++) { if(ty[j].length<52) warn('trantype.dat',j+1,'Insufficient used type-reference fields.'); else add(types,ty[j].substring(0,2),rtrim(ty[j].substring(2,52)),'trantype.dat',j+1); }
var ca=records('trancatg_dat');
for(var j=0;j<ca.length;j++) { if(ca[j].length<56) warn('trancatg.dat',j+1,'Insufficient used category-reference fields.'); else add(cats,ca[j].substring(0,6),rtrim(ca[j].substring(6,56)),'trancatg.dat',j+1); }
function cents(s) { if(s.length!==11) return null; var tail=s.slice(-1), sign=1, last=tail; var p='{ABCDEFGHI'.indexOf(tail), n='}JKLMNOPQR'.indexOf(tail); if(p>=0) last=String(p); else if(n>=0) { last=String(n); sign=-1; } var ds=s.substring(0,10)+last; if(!/^\d{11}$/.test(ds)) return null; return sign*Number(ds); }
var transactions=[], raw=records('transact_dat');
for(var i=0;i<raw.length;i++) { var s=raw[i]; if(s.length<330) { warn('transact.dat',i+1,'Insufficient used transaction fields.'); continue; } var date=s.substring(304,314); if(!calendar(date)) { warn('transact.dat',i+1,'Undecodable processing date.'); continue; } if(date<start||date>end) continue; var value=cents(s.substring(132,143)); var cat=s.substring(18,22); if(value===null||!/^\d{4}$/.test(cat)) { warn('transact.dat',i+1,'Undecodable amount or category.'); continue; } var card=s.substring(262,278), type=s.substring(16,18); var account=xrefs['$'+card]; if(account===undefined) { account=''; warn('transact.dat',i+1,'Missing card cross-reference: '+card); } var td=types['$'+type]; if(td===undefined) { td='UNKNOWN TYPE'; warn('transact.dat',i+1,'Missing type reference: '+type); } var cd=cats['$'+type+cat]; if(cd===undefined) { cd='UNKNOWN CATEGORY'; warn('transact.dat',i+1,'Missing category reference: '+type+'/'+cat); } transactions.push({id:s.substring(0,16),type:type,cat:cat,source:s.substring(22,32),card:card,account:account,typeDescription:td,categoryDescription:cd,cents:value,index:i}); }
transactions.sort(function(a,b){return a.card<b.card?-1:(a.card>b.card?1:a.index-b.index);});
var lines=[], grand=0, page=0, cardTotal=0, detailCount=0;
var rule=new Array(134).join('-');
function amount(n,total) { if(!Number.isSafeInteger(n)||Math.abs(n)>99999999999) { fail('Monetary total exceeds the report picture or safe arithmetic.'); return new Array(16).join(' '); } var v=Math.abs(n), whole=Math.floor(v/100), dec=String(v%100); if(dec.length===1) dec='0'+dec; var integer=whole===0?'':String(whole).replace(/\B(?=(\d{3})+(?!\d))/g,','); var digits=integer+'.'+dec; return (n<0?'-':(total?'+':' '))+new Array(15-digits.length).join(' ')+digits; }
function heading(){lines.push(pad(pad('DALYREPT',38)+pad('Daily Transaction Report',41)+pad('Date Range:',12)+start+' to '+end,133)); lines.push(pad('',133)); lines.push(pad(pad('Transaction ID',17)+pad('Account ID',12)+pad('Transaction Type',19)+pad('Tran Category',35)+pad('Tran Source',14)+' '+pad('Amount',16),133)); lines.push(rule);}
function total(label,value){var dotted=label==='Account Total'?84:86; lines.push(pad(label+new Array(dotted+1).join('.')+amount(value,true),133)); if(label!=='Grand Total') lines.push(rule);}
if(!fatal){ heading(); for(var i=0;i<transactions.length;i++){var t=transactions[i]; lines.push(pad(pad(t.id,16)+' '+pad(t.account,11)+' '+pad(t.type,2)+'-'+pad(t.typeDescription,15)+' '+t.cat+'-'+pad(t.categoryDescription,29)+' '+pad(t.source,10)+'    '+amount(t.cents,false)+'  ',133)); page+=t.cents; grand+=t.cents; cardTotal+=t.cents; detailCount++; var last=i===transactions.length-1; if(last||transactions[i+1].card!==t.card){total('Account Total',cardTotal);cardTotal=0;} if(detailCount===50&&!last){total('Page Total ',page);page=0;detailCount=0;heading();} } total('Page Total ',page); total('Grand Total',grand); }
if(fatal) lines=[];
output={reportData:{tranrept_report:lines,status:fatal?'ERROR':(diagnostics.length?'WARNING':'OK'),diagnostics:diagnostics},assumptionManifest:manifest,fallbackAssumptions:markdown};
```

### Finalize outputs (SCRIPT, id=6ae509c53695c563ea514cae)

```javascript
var canonical=Array.isArray(input.assumptionManifest)?input.assumptionManifest:[];
var draft=input.draftedAssumptions||{}; var proposed=draft.entries; var valid=Array.isArray(proposed)&&proposed.length===canonical.length&&canonical.length>0;
if(valid){for(var i=0;i<canonical.length;i++){var x=proposed[i],c=canonical[i];if(!x||x.id!==c.id||x.source!==c.source||typeof x.whatAssumed!=='string'||!x.whatAssumed.trim()||typeof x.wikiStatementOrAbsence!=='string'||!x.wikiStatementOrAbsence.trim()){valid=false;break;}}}
function cell(x){return String(x).replace(/\|/g,'\\|').replace(/[\r\n]+/g,' ');}
function table(entries){var text='| What you assumed | Which wiki statement (or absence of one) it rests on | Source |\n| --- | --- | --- |\n';for(var i=0;i<entries.length;i++){var e=entries[i];text+='| '+cell(e.id+': '+e.whatAssumed)+' | '+cell(e.wikiStatementOrAbsence)+' | '+cell(e.source)+' |\n';}return text;}
var entries=valid?proposed:canonical;
var md=valid?'# Assumptions\n\n'+table(entries)+'\n## Authoritative implementation decision list\n\n'+table(canonical):(input.fallbackAssumptions||'# Assumptions\n\nNo manifest was supplied.');
var report=input.reportData||{tranrept_report:[],status:'ERROR',diagnostics:[]};
var ds=Array.isArray(report.diagnostics)?report.diagnostics.slice():[];
if(!valid)ds.push({filename:'assumptions.md',line:0,severity:'WARNING',reason:'Documentation drafting failed or did not preserve complete coverage/citations; canonical Markdown fallback returned.'});
output={result:{tranrept_report:Array.isArray(report.tranrept_report)?report.tranrept_report:[],assumptions:entries,assumptions_md:md,status:report.status==='ERROR'?'ERROR':(ds.length?'WARNING':'OK'),diagnostics:ds,documentationStatus:valid?'DRAFTED':'FALLBACK'}};
```

### Draft assumptions failed (SCRIPT, id=6ae509c53695c563ea514caf)

```javascript
output = {"draftedAssumptions": {}};

```

_(server: 349 ms, 1 API call, 333 ms in API)_
