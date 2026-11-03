# Workflow: DailyTransactionReport

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** 

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6adfa6b316836599f394f5b9 | <uuid> | (0, 0) | → Transform (seq:<uuid>) |
| End | END | 6adfa6b316836599f394f5ba | <uuid> | (1200, 0) | — |
| Transform | SCRIPT | 6adfa6b416836599f394f5bc | <uuid> | (300, 0) | → Draft assumptions (seq:<uuid>) | lang: JAVASCRIPT |
| Draft assumptions | AI | 6adfa6b416836599f394f5bd | <uuid> | (600, 0) | → Package outputs [SUCCESS] (seq:<uuid>), → Draft assumptions failed [FAIL] (seq:<uuid>) | responseKey: assumptionsDraft, aiType: TEXT_UNDERSTANDING, responseSchema: set |
| Package outputs | SCRIPT | 6adfa6b516836599f394f5bf | <uuid> | (900, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| Draft assumptions failed | SCRIPT | 6adfa6b516836599f394f5c2 | <uuid> | (600, 200) | → Package outputs (seq:<uuid>) | lang: JAVASCRIPT |

## Systems
_(none)_

## AI prompts

### Draft assumptions (TEXT_UNDERSTANDING, id=6adfa6b416836599f394f5bd)
instructions:

```
Draft the assumptions document as structured entries in English. Use only the supplied assumptionRegister and cited wiki extracts. Each register row is an actual implementation decision, not an invitation to reconsider it. Return every row exactly once, in the same order, preserving decisionId, whatYouAssumed, wikiStatementOrAbsence and sourcePage verbatim. These separate text fields are the human-facing statement of the assumption and of the wiki statement or absence it rests on. Do not invent, omit, combine or modify decisions, source quotations, page references or implementation policies. Do not interpret transactions or calculate any financial value. Report warnings are context only and must not become additional implementation assumptions. Return only the schema object.
```
userMessage:

```
Source-linked implementation decision register: ${assumptionRegister}
Run warnings (not transaction records): ${reportWarnings}
Relevant wiki extracts from tranrept-sonnet.pdf: p.2: Filter on processedTimestamp between start and end date inclusive; Sorted by card number; Totals: page total, card total (on card change), grand total, TODO confirm totals layout. p.4: Empty range: Report with zero total. Unknown reference: Error flagged, run continues, TODO confirm legacy abend behaviour. p.19: Account total sum of amounts per account/card (break on card number); Page total sum per page; Grand total sum for the report; page size TODO lines per page. p.26: daily transaction report inputs transact.dat, cardxref.dat, trantype.dat, trancatg.dat; start 2022-07-01 and end 2022-07-31; instead of a file a run may return lines as a string or list of strings under the file name without extension; Optional assumptions.md. p.29: A page starts with report header, blank line, column header and rule. Each page total and each account total is followed by a rule. Full source facts and explicit absences are already recorded separately on every register row.
```
exampleOutputJsonSchema:

```
{"title":"Response","type":"object","additionalProperties":false,"required":["entries"],"properties":{"entries":{"type":"array","minItems":1,"items":{"type":"object","additionalProperties":false,"required":["decisionId","whatYouAssumed","wikiStatementOrAbsence","sourcePage"],"properties":{"decisionId":{"type":"string"},"whatYouAssumed":{"type":"string"},"wikiStatementOrAbsence":{"type":"string"},"sourcePage":{"type":"string"}}}}}}
```

## Scripts

### Transform (SCRIPT, id=6adfa6b416836599f394f5bc)

```javascript
var assumptionRegister = [];
function assumption(id, choice, basis, page) { assumptionRegister.push({decisionId:id, whatYouAssumed:choice, wikiStatementOrAbsence:basis, sourcePage:'tranrept-sonnet.pdf p.'+page}); }
assumption('delivery','Accept the four named files as text in the run input and return report lines and assumptions.md in the same output bundle, not as physical disk writes.','CONTRACT permits a list of strings under the report file name without extension; no external filesystem is specified.','26');
assumption('transaction-offsets','Read transact.dat at 1-based positions: ID 1-16, type 17-18, category 19-22, source 23-32, description 33-132, amount 133-143, merchant ID 144-152, name 153-202, city 203-252, ZIP 253-262, card 263-278, original timestamp 279-304, processed timestamp 305-330, filler 331-350.','The Transaction attributes and widths are listed, but the complete CVTRA05Y copybook is absent; sequential offsets and final filler are inferred.','8-9');
assumption('xref-offsets','Read cardxref.dat as card 1-16, customer 17-25, account 26-36 and filler 37-50.','CardXref lists these three attributes and widths; CONTRACT gives 50 bytes, but the complete copybook is absent.','8,26');
assumption('reference-offsets','Read trantype.dat as type 1-2, description 3-52, filler 53-60; trancatg.dat as type 1-2, category 3-6, description 7-56, filler 57-60.','Reference attribute order and widths plus 60-byte record lengths are supplied; complete copybooks are absent.','9-10,26');
assumption('encoding','Require decoded ASCII text. An amount is eleven implied-cent digits; its final character may be an ASCII positive {ABCDEFGHI or negative }JKLMNOPQR overpunch, or an ordinary positive digit.','Transaction amount is S9(9)V99 and disclosure data mentions signed overpunch, but transaction file encoding is not specified.','8-9');
assumption('line-endings','Accept LF or CRLF separators; ignore only the final empty segment from a terminal newline. All other records must have the exact declared width; an entirely empty file has zero records.','CONTRACT says fixed-width text, one record per line, without specifying newline conventions or treatment of empty records.','26');
assumption('default-dates','Default to 2022-07-01 through 2022-07-31; explicit startDate and endDate independently override those defaults.','CONTRACT supplies these dates; the earlier wiki gives 2022-01-01 through 2022-07-06 and permits per-run overrides.','2-3,26');
assumption('date-comparison','Use the first ten processing-timestamp characters as a Gregorian YYYY-MM-DD date, inclusive at both boundaries, without timezone conversion.','BR-01 filters on processedTimestamp between the start and end dates inclusive; no timezone or time-of-day boundary policy is stated.','2');
assumption('tie-order','Sort ascending by card number and preserve input-file order for equal cards; do not deduplicate transactions.','BR-02 says sorted by card number; tie ordering and deduplication are not specified.','2');
assumption('identifier-format','Preserve leading zeros in identifiers and print the eleven-character account identifier from CardXref, not a numeric reformatting.','Identifiers are string fields, and the printed account position has eleven columns.','8-9,29');
assumption('lookup-keys','Resolve account by card number, type by type code, and category by the combination of type and category code.','CardXref is keyed by card and TransactionCategory has a type-plus-category key; the document plugin requires account and reference descriptions.','8-10,19');
assumption('grouping','Print an Account Total at each card break even if multiple cards resolve to the same account.','The plugin describes an account/card total with a break on card number.','19');
assumption('page-capacity','A page holds fifty detail records; headers, rules and total lines do not consume this capacity.','The wiki explicitly leaves lines per page as TODO.','19');
assumption('page-order','Repeat the four-line page opening. At coincident boundaries print account total and rule before page total and rule; continue a card subtotal across pages; print the grand total last without a following rule.','CONTRACT specifies page openings and rules following page/account totals, but not page capacity or ordering of coincident boundaries.','19,29');
assumption('empty-selection','An empty selection prints the four-line page opening, a zero page total, its rule and a zero grand total, with no account total.','The empty-range scenario requires a report with zero total; detailed empty-report layout is not stated.','4,29');
assumption('page-number','Do not print a page number or extra title fields.','The plugin mentions a page number, but the authoritative CONTRACT header allocates no position for one.','19,29');
assumption('money','Compute all sums in signed integer cents; require exact safe-integer arithmetic; fail any displayed value exceeding 999999999.99 rather than round or truncate.','The wiki requires page/card/grand totals and CONTRACT fixes two-decimal pictures; overflow behaviour is unspecified.','2,27,29');
assumption('picture-zero','Print two fractional digits, suppress zero integer digits and their leading commas, put a minus or space in the first position for details, and an explicit plus or minus for totals.','CONTRACT gives sign and leading-zero picture notation; use its two-decimal interpretation also at zero.','27,29');
assumption('text-fields','Truncate reference descriptions to fifteen and twenty-nine characters and space-pad every printed line to 133 columns; do not print the transaction free-text description.','CONTRACT allocates X(15), X(29) and a 133-column line; truncation handling is not separately stated.','29');
assumption('missing-lookups','Continue a missing type or category with UNKNOWN in its description position; continue a missing cross-reference with a blank account ID. Record each missing lookup by file and record number.','The acceptance scenario flags a missing type and continues; placeholder wording and missing-category/cross-reference behaviour are not stated.','4');
assumption('bad-input','Fail missing files, non-ASCII data, invalid record widths, malformed required numeric keys, invalid Gregorian dates or amount encodings, inverted ranges and duplicate reference keys. Return no partial report, but return assumptions.md with the failure reason.','CONTRACT specifies input formats but no malformed-input or duplicate-reference policy.','8-10,26');
assumption('validation-scope','Validate all records before selection, including excluded transactions, without modifying any inputs or upstream account data.','Step isolation is specified; whether malformed excluded transactions are ignored is not stated.','26');
assumption('drafting','A model drafts the structured assumption entries from this register and supplied wiki extracts only; it receives no transaction records. Report generation is deterministic and independent of its answer.','The request requires each assumption and its wiki basis, but does not prescribe how to compose the document.','1-29');
assumption('draft-fallback','Accept model entries only if every decision ID, assumption, wiki basis and source is preserved exactly. Otherwise render this canonical register and disclose the fallback.','The request requires a complete source-linked assumptions document; drafting-failure behaviour is not specified.','1-29');
var reportWarnings = [], reportFailure = '', reportLines = [];
function fail(message) { throw new Error(message); }
function rtrim(s) { return s.replace(/ +$/,''); }
function pad(s,n) { s=String(s); return s.substring(0,n)+' '.repeat(Math.max(0,n-s.length)); }
function validDate(s) { if(!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false; var y=Number(s.substring(0,4)),m=Number(s.substring(5,7)),d=Number(s.substring(8,10)); if(y<1 || m<1 || m>12) return false; var leap=(y%4===0 && (y%100!==0 || y%400===0)); return d>=1 && d<=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31][m-1]; }
function records(files,name,width) { if(!files || typeof files[name]!=='string') fail(name+': missing text file'); var raw=files[name]; if(/[^\x00-\x7F]/.test(raw)) fail(name+': expected ASCII text'); if(raw==='') return []; var rows=raw.split(/\r?\n/); if(rows[rows.length-1]==='') rows.pop(); for(var i=0;i<rows.length;i++) if(rows[i].length!==width) fail(name+' record '+(i+1)+': expected '+width+' columns, got '+rows[i].length); return rows; }
function digits(s,n,file,line,label) { if(!(new RegExp('^[0-9]{'+n+'}$')).test(s)) fail(file+' record '+line+': invalid '+label); return s; }
function amount(s,line) { var last=s.charAt(10), pos='{ABCDEFGHI', neg='}JKLMNOPQR', sign=1, digit=last; if(pos.indexOf(last)>=0) digit=String(pos.indexOf(last)); else if(neg.indexOf(last)>=0) {digit=String(neg.indexOf(last));sign=-1;} var raw=s.substring(0,10)+digit; if(!/^\d{11}$/.test(raw)) fail('transact.dat record '+line+': invalid signed implied-cent amount'); return sign*Number(raw); }
function add(a,b) { var n=a+b; if(!Number.isSafeInteger(n)) fail('Amount exceeds exact integer-cent arithmetic'); return n; }
function money(c,total) { if(!Number.isSafeInteger(c) || Math.abs(c)>99999999999) fail('Amount exceeds the report picture'); var a=Math.abs(c), whole=Math.floor(a/100), h=whole===0?'':String(whole).replace(/\B(?=(\d{3})+(?!\d))/g,','); return (c<0?'-':(total?'+':' '))+' '.repeat(11-h.length)+h+'.'+String(a%100).padStart(2,'0'); }
function print(s) { if(s.length>133) fail('Printed line exceeds 133 columns'); reportLines.push(pad(s,133)); }
try {
 var f=input.files, start=input.startDate==null?'2022-07-01':input.startDate, end=input.endDate==null?'2022-07-31':input.endDate;
 if(typeof start!=='string' || typeof end!=='string' || !validDate(start) || !validDate(end) || start>end) fail('Invalid or inverted report date range');
 var tx=records(f,'transact.dat',350), xr=records(f,'cardxref.dat',50), ty=records(f,'trantype.dat',60), ca=records(f,'trancatg.dat',60);
 var xrefs=Object.create(null), types=Object.create(null), categories=Object.create(null);
 function put(map,key,val,file,line) { if(Object.prototype.hasOwnProperty.call(map,key)) fail(file+' record '+line+': duplicate reference key'); map[key]=val; }
 for(var i=0;i<xr.length;i++) {var r=xr[i],ln=i+1; var card=digits(r.substring(0,16),16,'cardxref.dat',ln,'card'); digits(r.substring(16,25),9,'cardxref.dat',ln,'customer'); var account=digits(r.substring(25,36),11,'cardxref.dat',ln,'account'); put(xrefs,card,account,'cardxref.dat',ln);}
 for(var i=0;i<ty.length;i++) {var r=ty[i],ln=i+1; var code=digits(r.substring(0,2),2,'trantype.dat',ln,'type'); put(types,code,rtrim(r.substring(2,52)),'trantype.dat',ln);}
 for(var i=0;i<ca.length;i++) {var r=ca[i],ln=i+1; var code=digits(r.substring(0,2),2,'trancatg.dat',ln,'type'), cat=digits(r.substring(2,6),4,'trancatg.dat',ln,'category'); put(categories,code+':'+cat,rtrim(r.substring(6,56)),'trancatg.dat',ln);}
 var chosen=[];
 for(var i=0;i<tx.length;i++) {var r=tx[i],ln=i+1; var type=digits(r.substring(16,18),2,'transact.dat',ln,'type'),cat=digits(r.substring(18,22),4,'transact.dat',ln,'category'),card=digits(r.substring(262,278),16,'transact.dat',ln,'card'); digits(r.substring(143,152),9,'transact.dat',ln,'merchant ID'); var id=r.substring(0,16); if(id.trim()==='') fail('transact.dat record '+ln+': blank transaction ID'); var cents=amount(r.substring(132,143),ln), orig=r.substring(278,288), proc=r.substring(304,314); if(!validDate(orig) || !validDate(proc)) fail('transact.dat record '+ln+': invalid timestamp date'); if(proc>=start && proc<=end) chosen.push({id:id,type:type,cat:cat,card:card,source:r.substring(22,32),cents:cents,index:i,line:ln});}
 chosen.sort(function(a,b){return a.card<b.card?-1:(a.card>b.card?1:a.index-b.index);});
 var rule='-'.repeat(133), count=0, page=0, subtotal=0, grand=0;
 function heading() {print(pad('DALYREPT',38)+pad('Daily Transaction Report',41)+pad('Date Range:',12)+start+pad('to',4)+end); print(''); print(pad('Transaction ID',17)+pad('Account ID',12)+pad('Transaction Type',19)+pad('Tran Category',35)+pad('Tran Source',14)+' '+pad('Amount',16)); print(rule);}
 function total(label,width,cents) {print(pad(label,width)+'.'.repeat(97-width)+money(cents,true));}
 function warning(t,msg) {reportWarnings.push({file:'transact.dat',record:t.line,message:msg});}
 heading();
 for(var i=0;i<chosen.length;i++) {var t=chosen[i]; if(count===50) {heading(); count=0; page=0;} var acct=xrefs[t.card],td=types[t.type],cd=categories[t.type+':'+t.cat]; if(acct===undefined) {acct='';warning(t,'Missing card cross-reference; account printed blank');} if(td===undefined) {td='UNKNOWN';warning(t,'Missing transaction type description');} if(cd===undefined) {cd='UNKNOWN';warning(t,'Missing transaction category description');}
 print(t.id+' '+pad(acct,11)+' '+t.type+'-'+pad(td,15)+' '+t.cat+'-'+pad(cd,29)+' '+t.source+'    '+money(t.cents,false)); count++; page=add(page,t.cents); subtotal=add(subtotal,t.cents); grand=add(grand,t.cents);
 if(i===chosen.length-1 || chosen[i+1].card!==t.card) {total('Account Total',13,subtotal);print(rule);subtotal=0;}
 if(count===50 || i===chosen.length-1) {total('Page Total',11,page);print(rule);}
 }
 if(chosen.length===0) {total('Page Total',11,0);print(rule);}
 total('Grand Total',11,grand);
} catch(e) {reportFailure=String(e.message || e);reportLines=[];}
output={reportLines:reportLines,assumptionRegister:assumptionRegister,reportWarnings:reportWarnings,reportFailure:reportFailure};
```

### Package outputs (SCRIPT, id=6adfa6b516836599f394f5bf)

```javascript
var registry=Array.isArray(input.assumptionRegister)?input.assumptionRegister:[];
var draft=input.assumptionsDraft && input.assumptionsDraft.entries;
var accepted=Array.isArray(draft) && draft.length===registry.length && registry.length>0;
if(accepted) {for(var i=0;i<registry.length;i++) {var a=registry[i], b=draft[i]; if(!b || b.decisionId!==a.decisionId || b.whatYouAssumed!==a.whatYouAssumed || b.wikiStatementOrAbsence!==a.wikiStatementOrAbsence || b.sourcePage!==a.sourcePage) {accepted=false;break;}}}
var assumptionEntries=accepted?draft:registry;
function cell(x) {return String(x==null?'':x).replace(/\|/g,'\\|').replace(/[\r\n]+/g,' ');}
var text='# Assumptions\n\nThis report implements the daily transaction report only. Source: tranrept-sonnet.pdf. Entries below distinguish implementation decisions from documented requirements.\n\n| Decision | What you assumed | Which wiki statement (or absence of one) it rests on | Source |\n| --- | --- | --- | --- |\n';
for(var i=0;i<assumptionEntries.length;i++) {var a=assumptionEntries[i];text+='| '+cell(a.decisionId)+' | '+cell(a.whatYouAssumed)+' | '+cell(a.wikiStatementOrAbsence)+' | '+cell(a.sourcePage)+' |\n';}
text+='\n## Drafting\n\n'+(accepted?'The model preserved every source-linked register entry; the structured entries passed exact validation.':'The model draft was unavailable or did not preserve the complete register. The canonical source-linked entries were rendered instead.')+'\n';
var failure=typeof input.reportFailure==='string'?input.reportFailure:'Report transform did not return a status';
text+='\n## Run outcome\n\n'+(failure?'FAILED: '+cell(failure)+'. No partial report was returned.':'SUCCESS: report lines are returned under tranrept_report in this same output bundle.')+'\n';
var warnings=Array.isArray(input.reportWarnings)?input.reportWarnings:[];
text+='\n## Run warnings\n\n';
if(warnings.length===0) text+='None.\n'; else {text+='| File | Record | Warning |\n| --- | --- | --- |\n';for(var i=0;i<warnings.length;i++) {var w=warnings[i];text+='| '+cell(w.file)+' | '+cell(w.record)+' | '+cell(w.message)+' |\n';}}
var files={'assumptions.md':text};
if(!failure && Array.isArray(input.reportLines)) files.tranrept_report=input.reportLines;
output={filesChecked:files,assumptionEntries:assumptionEntries};
```

### Draft assumptions failed (SCRIPT, id=6adfa6b516836599f394f5c2)

```javascript
output = {"assumptionsDraft": {}};

```

_(server: 230 ms, 1 API call, 208 ms in API)_
