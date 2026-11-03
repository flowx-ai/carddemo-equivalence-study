# Workflow: GenerateDailyTransactionReport

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** 

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6adfaf1516836599f39505a3 | <uuid> | (0, 0) | → Build report (seq:<uuid>) |
| End | END | 6adfaf1516836599f39505a4 | <uuid> | (1200, 0) | — |
| Build report | SCRIPT | 6adfaf1516836599f39505a5 | <uuid> | (300, 0) | → Draft assumptions (seq:<uuid>) | lang: JAVASCRIPT |
| Draft assumptions | AI | 6adfaf1516836599f39505a6 | <uuid> | (600, 0) | → Package outputs [SUCCESS] (seq:<uuid>), → Draft assumptions failed [FAIL] (seq:<uuid>) | responseKey: assumptionDraft, aiType: TEXT_UNDERSTANDING, responseSchema: set |
| Package outputs | SCRIPT | 6adfaf1516836599f39505a7 | <uuid> | (900, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| Draft assumptions failed | SCRIPT | 6adfaf1516836599f39505a8 | <uuid> | (600, 200) | → Package outputs (seq:<uuid>) | lang: JAVASCRIPT |

## Systems
_(none)_

## AI prompts

### Draft assumptions (TEXT_UNDERSTANDING, id=6adfaf1516836599f39505a6)
instructions:

```
Write the assumptions companion for an isolated CardDemo daily report. The supplied inventory is the complete authoritative list of decisions already made, not a source from which to invent further decisions. Return one object entry per supplied entry, in the supplied order, with separate assumptionId, whatAssumed and wikiBasis strings. Preserve the approved rule and every detail of whatAssumed and wikiBasis exactly, including the references and explicit statements of silence. Do not infer legacy facts, omit caveats, invent quotes, or change any financial behaviour. You have no transaction records and must not produce the report. Return only the object required by the schema.
```
userMessage:

```
Prepare the individually sourced assumption records from this inventory: ${assumptionFacts}
```
exampleOutputJsonSchema:

```
{"title":"Response","type":"object","required":["assumptions"],"properties":{"assumptions":{"type":"array","items":{"type":"object","required":["assumptionId","whatAssumed","wikiBasis"],"properties":{"wikiBasis":{"type":"string"},"whatAssumed":{"type":"string"},"assumptionId":{"type":"string"}},"additionalProperties":false}}},"additionalProperties":false}
```

## Scripts

### Build report (SCRIPT, id=6adfaf1516836599f39505a5)

```javascript
var facts = [];
function assumption(id, what, basis) { facts.push({assumptionId:id,whatAssumed:what,wikiBasis:basis}); }
assumption('A01','Read ASCII-compatible fixed-width text, with LF or CRLF separators and at most one final newline. Require record lengths 350, 50, 60 and 60 respectively. Do not perform EBCDIC conversion.','tranrept-sonnet.pdf p.26: "Fixed-width text, one record per line, layouts as in the copybooks". Character encoding and newline handling are not specified.');
assumption('A02','Infer Transaction positions: ID 1-16; type 17-18; category 19-22; source 23-32; description 33-132; implied-cent signed amount 133-143; merchant ID 144-152; name 153-202; city 203-252; ZIP 253-262; card 263-278; original timestamp 279-304; processing timestamp 305-330; filler 331-350. These offsets are inferred, not copybook-verified.','tranrept-sonnet.pdf pp.8-9 list the transaction attributes, order and widths; p.26 specifies CVTRA05Y and 350 characters but does not reproduce the copybook.');
assumption('A03','Infer CardXref card/customer/account widths 16/9/11; TransactionType code/description widths 2/50; TransactionCategory type/category/description widths 2/4/50. Treat the remaining record tails as filler.','tranrept-sonnet.pdf pp.8-10 give these field orders and widths; p.26 gives total record lengths 50/60/60. Exact filler positions are absent.');
assumption('A04','Decode implied-cent amounts as unsigned digits or ASCII signed overpunch: {ABCDEFGHI are positive digits 0-9 and }JKLMNOPQR negative digits 0-9. Accumulate and format integer cents without floating-point decimal summation.','tranrept-sonnet.pdf p.8 identifies TRAN-AMT S9(9)V99; p.9 mentions signed overpunch for another legacy field. The transaction input encoding is not explicitly stated.');
assumption('A05','Default the inclusive report range to 2022-07-01 through 2022-07-31, overriding the older wiki defaults. Supplied ISO calendar dates override those defaults. Compare calendar dates without timezone conversion.','tranrept-sonnet.pdf p.26: "daily transaction report start date 2022-07-01 and end date 2022-07-31"; p.2 gives older defaults and requires processedTimestamp selection inclusive.');
assumption('A06','Sort lexically by the fixed-width numeric card number and retain input order within each card. Do not deduplicate transactions.','tranrept-sonnet.pdf p.2: "Sorted by card number". No secondary sort or transaction deduplication is specified.');
assumption('A07','Print at most 50 transaction details per page. Headings, totals and rules do not consume that quota. Repeat the four-line heading on each page.','tranrept-sonnet.pdf p.19: "page size {{TODO: lines per page in CBTRN03C}}"; p.29 specifies the four-line page heading but no page limit.');
assumption('A08','Treat Account Total as the card-break total, carried across page breaks, not an aggregation of all cards sharing an account. At simultaneous card and page boundaries print account total and rule before page total and rule.','tranrept-sonnet.pdf p.2 says "card total (on card change)"; p.19 says "Account total ... per account/card (break on card number)". The relative boundary ordering is absent.');
assumption('A09','Close the final page with page total and rule, then grand total. An empty selection prints one heading, zero page total and rule, then zero grand total, without an account total. Do not append a rule after grand total.','tranrept-sonnet.pdf p.4: "Empty range ... Report with zero total"; p.29 requires a rule after each page and account total, but does not completely specify final/empty ordering.');
assumption('A10','Look up category by type plus category. Print UNKNOWN TYPE or UNKNOWN CATEGORY for missing descriptions and account 00000000000 for missing card cross-reference; flag each lookup error and retain the transaction and amount.','tranrept-sonnet.pdf p.4: "Type missing in reference data ... Error flagged, run continues"; p.10 identifies the category composite key. Missing-xref behaviour and placeholder text are not specified.');
assumption('A11','Accept repeated lookup keys only when their meaningful values agree; reject conflicting duplicates rather than choose arbitrarily.','tranrept-sonnet.pdf pp.8-10 identify lookup keys; duplicate-record resolution is not documented.');
assumption('A12','Fail without a partial report for missing files, malformed fixed-width records, invalid dates or numeric fields, a reversed date range, conflicting lookup records, unsafe arithmetic, or a printed amount exceeding the numeric picture.','tranrept-sonnet.pdf pp.2,4,26-29 do not define these invalid-input and overflow behaviours. Failing rather than silently dropping financial data is an implementation choice.');
assumption('A13','Space-pad every report line to 133 characters and truncate textual display fields to their contracted widths. Monetary fields have a fixed first-position sign, leading zero groups/commas suppressed, blank positive detail sign and explicit positive total sign. Zero prints .00 with the applicable sign.','tranrept-sonnet.pdf pp.27,29 specify picture notation, columns and signs. The zero edge case and text overflow handling are not fully specified.');
assumption('A14','Return tranrept_report as an ordered list of printed lines and assumptions.md as companion Markdown text in one result, rather than writing to an unspecified external folder. Inputs remain unchanged.','tranrept-sonnet.pdf p.26 explicitly permits a list of strings under the output filename without extension. No external output destination is supplied.');
assumption('A15','Use a model only to draft the paired assumption explanations from this inventory. Preserve all approved facts and source bases; if drafting fails or cannot be validated, use the complete canonical entries and disclose the fallback. Never let drafting alter the financial report.','Implementation default: the wiki does not prescribe how an assumptions document is authored or how drafting failures are handled.');
assumption('A16','Validate the first ten characters of both transaction timestamps as ISO calendar dates. Use only the processing-date portion for selection; the remaining timestamp characters are not interpreted.','tranrept-sonnet.pdf p.9 gives DateTime fields X(26); p.2 filters on processing date. The timestamp time/fraction grammar and timezone conversion are not specified.');
var warnings = [];
var result = {status:'FAILED',errors:[],lines:null};
function fail(message) { throw new Error(message); }
function pad(value, width) { var s=String(value); return s.slice(0,width)+' '.repeat(Math.max(0,width-s.length)); }
function printed(s) { if(s.length>133) fail('Printed line exceeds 133 columns'); return pad(s,133); }
function validDate(s) { if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false; var y=Number(s.slice(0,4)),m=Number(s.slice(5,7)),d=Number(s.slice(8,10)); var leap=(y%4===0&&y%100!==0)||y%400===0; var ds=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31]; return y>=1&&m>=1&&m<=12&&d>=1&&d<=ds[m-1]; }
function digits(s,n,label) { if(s.length!==n||!/^[0-9]+$/.test(s)) fail('Invalid '+label); return s; }
function records(files,name,width) { if(!Object.prototype.hasOwnProperty.call(files,name)||typeof files[name]!=='string') fail('Missing text input '+name); var s=files[name]; if(s==='') return []; s=s.replace(/\r\n/g,'\n'); if(s.charAt(s.length-1)==='\n') s=s.slice(0,-1); var a=s.split('\n'); for(var i=0;i<a.length;i++) { if(a[i].length!==width) fail(name+' line '+(i+1)+': expected '+width+' characters'); for(var j=0;j<a[i].length;j++) if(a[i].charCodeAt(j)<32||a[i].charCodeAt(j)>126) fail(name+' line '+(i+1)+': non-ASCII text'); } return a; }
function lookupPut(map,key,value,label) { var k='$'+key; if(Object.prototype.hasOwnProperty.call(map,k)&&map[k]!==value) fail('Conflicting duplicate '+label); map[k]=value; }
function cents(s,label) { var last=s.charAt(s.length-1), pos='{ABCDEFGHI', neg='}JKLMNOPQR', sign=1, digit=last; if(pos.indexOf(last)>=0) digit=String(pos.indexOf(last)); else if(neg.indexOf(last)>=0) {digit=String(neg.indexOf(last));sign=-1;} var n=s.slice(0,-1)+digit; if(s.length!==11||!/^[0-9]{11}$/.test(n)) fail('Invalid amount at '+label); return sign*Number(n); }
function add(a,b) { var n=a+b; if(!Number.isSafeInteger(n)) fail('Unsafe monetary sum'); return n; }
function money(n,total) { if(!Number.isSafeInteger(n)||Math.abs(n)>99999999999) fail('Amount exceeds printed picture'); var a=Math.abs(n), whole=Math.floor(a/100), frac=String(a%100).padStart(2,'0'); var integer=whole===0?'':String(whole).replace(/\B(?=(\d{3})+(?!\d))/g,','); return (n<0?'-':total?'+':' ')+(integer+'.'+frac).padStart(14,' '); }
try {
  var bag=(typeof input==='object'&&input!==null)?input:{};
  var files=bag.files;
  if(!files||typeof files!=='object') fail('Missing files object');
  var start=bag.startDate===undefined||bag.startDate===null||bag.startDate===''?'2022-07-01':bag.startDate;
  var end=bag.endDate===undefined||bag.endDate===null||bag.endDate===''?'2022-07-31':bag.endDate;
  if(!validDate(start)||!validDate(end)||start>end) fail('Invalid or reversed report date range');
  var tx=records(files,'transact.dat',350), xr=records(files,'cardxref.dat',50), tt=records(files,'trantype.dat',60), tc=records(files,'trancatg.dat',60);
  var xrefs=Object.create(null), types=Object.create(null), cats=Object.create(null);
  for(var x=0;x<xr.length;x++) { var r=xr[x]; digits(r.slice(0,16),16,'xref card at line '+(x+1)); digits(r.slice(16,25),9,'xref customer at line '+(x+1)); digits(r.slice(25,36),11,'xref account at line '+(x+1)); lookupPut(xrefs,r.slice(0,16),r.slice(25,36)+'|'+r.slice(16,25),'card cross-reference'); }
  for(var t=0;t<tt.length;t++) { var rt=tt[t]; var type=rt.slice(0,2); if(!/^[A-Za-z0-9]{2}$/.test(type)) fail('Invalid reference type at line '+(t+1)); lookupPut(types,type,rt.slice(2,52).replace(/ +$/,''),'transaction type'); }
  for(var c=0;c<tc.length;c++) { var rc=tc[c]; if(!/^[A-Za-z0-9]{2}$/.test(rc.slice(0,2))) fail('Invalid category type at line '+(c+1)); digits(rc.slice(2,6),4,'reference category at line '+(c+1)); lookupPut(cats,rc.slice(0,6),rc.slice(6,56).replace(/ +$/,''),'transaction category'); }
  var selected=[];
  for(var i=0;i<tx.length;i++) {
    var row=tx[i], label='transact.dat line '+(i+1);
    var id=row.slice(0,16), ty=row.slice(16,18), ca=digits(row.slice(18,22),4,'category at '+label), src=row.slice(22,32), am=cents(row.slice(132,143),label), card=digits(row.slice(262,278),16,'card at '+label), od=row.slice(278,288), pd=row.slice(304,314);
    if(id.trim()===''||!/^[A-Za-z0-9]{2}$/.test(ty)) fail('Invalid transaction identifier or type at '+label);
    digits(row.slice(143,152),9,'merchant identifier at '+label);
    if(!validDate(od)||!validDate(pd)) fail('Invalid timestamp date at '+label);
    if(pd<start||pd>end) continue;
    var xrVal=xrefs['$'+card], td=types['$'+ty], cd=cats['$'+ty+ca];
    if(xrVal===undefined) warnings.push(label+': missing card cross-reference; account 00000000000 used');
    if(td===undefined) warnings.push(label+': missing transaction type description; UNKNOWN TYPE used');
    if(cd===undefined) warnings.push(label+': missing transaction category description; UNKNOWN CATEGORY used');
    selected.push({id:id,type:ty,category:ca,source:src,amount:am,card:card,account:xrVal===undefined?'00000000000':xrVal.slice(0,11),typeDescription:td===undefined?'UNKNOWN TYPE':td,categoryDescription:cd===undefined?'UNKNOWN CATEGORY':cd,index:i});
  }
  selected.sort(function(a,b){return a.card<b.card?-1:a.card>b.card?1:a.index-b.index;});
  var lines=[], rule='-'.repeat(133);
  function heading() { lines.push(printed(pad('DALYREPT',38)+pad('Daily Transaction Report',41)+pad('Date Range:',12)+start+' to '+end)); lines.push(' '.repeat(133)); lines.push(printed(pad('Transaction ID',17)+pad('Account ID',12)+pad('Transaction Type',19)+pad('Tran Category',35)+pad('Tran Source',14)+' '+pad('Amount',16))); lines.push(rule); }
  function totalLine(label,dots,value) { lines.push(printed(label+'.'.repeat(dots)+money(value,true))); }
  var pageCount=0,pageTotal=0,cardTotal=0,grand=0;
  heading();
  for(var z=0;z<selected.length;z++) {
    var q=selected[z];
    lines.push(printed(q.id+' '+q.account+' '+q.type+'-'+pad(q.typeDescription,15)+' '+q.category+'-'+pad(q.categoryDescription,29)+' '+q.source+'    '+money(q.amount,false)+'  '));
    pageCount++; pageTotal=add(pageTotal,q.amount); cardTotal=add(cardTotal,q.amount); grand=add(grand,q.amount);
    var cardEnd=z===selected.length-1||selected[z+1].card!==q.card;
    if(cardEnd) {totalLine('Account Total',84,cardTotal);lines.push(rule);cardTotal=0;}
    if(pageCount===50||z===selected.length-1) {totalLine('Page Total ',86,pageTotal);lines.push(rule);pageCount=0;pageTotal=0;if(z<selected.length-1) heading();}
  }
  if(selected.length===0) {totalLine('Page Total ',86,0);lines.push(rule);}
  totalLine('Grand Total',86,grand);
  result={status:warnings.length?'WARNING':'OK',errors:warnings,lines:lines};
} catch(e) { result={status:'FAILED',errors:warnings.concat([String(e&&e.message?e.message:e)]),lines:null}; }
output={reportData:result,assumptionFacts:facts};
```

### Package outputs (SCRIPT, id=6adfaf1516836599f39505a7)

```javascript
var bag=(typeof input==='object'&&input!==null)?input:{};
var canonical=Array.isArray(bag.assumptionFacts)?bag.assumptionFacts:[];
var candidate=bag.assumptionDraft&&Array.isArray(bag.assumptionDraft.assumptions)?bag.assumptionDraft.assumptions:null;
var valid=canonical.length>0&&candidate!==null&&candidate.length===canonical.length;
if(valid) for(var i=0;i<canonical.length;i++) {var a=canonical[i],b=candidate[i];if(!b||b.assumptionId!==a.assumptionId||b.whatAssumed!==a.whatAssumed||b.wikiBasis!==a.wikiBasis){valid=false;break;}}
var chosen=valid?candidate:canonical;
function cell(s){return String(s).replace(/\|/g,'\\|').replace(/[\r\n]+/g,' ');}
var md='# CardDemo daily transaction report assumptions\n\nEach row records one implementation decision and the wiki statement, or absence of a statement, on which it rests. Page references are to tranrept-sonnet.pdf.\n\n| Decision | what you assumed | which wiki statement (or absence of one) it rests on |\n| --- | --- | --- |\n';
for(var j=0;j<chosen.length;j++)md+='| '+cell(chosen[j].assumptionId)+' | '+cell(chosen[j].whatAssumed)+' | '+cell(chosen[j].wikiBasis)+' |\n';
if(!valid)md+='\nDrafting fallback: model drafting was unavailable, incomplete or did not preserve the approved inventory exactly. The full canonical paired entries above were used. No report values were changed.\n';
var report=bag.reportData||{status:'FAILED',errors:['Report construction did not produce a result'],lines:null};
if(Array.isArray(report.errors)&&report.errors.length){md+='\n## Run diagnostics\n\n';for(var k=0;k<report.errors.length;k++)md+='- '+String(report.errors[k]).replace(/[\r\n]+/g,' ')+'\n';}
output={result:{status:report.status,errors:Array.isArray(report.errors)?report.errors:[],tranrept_report:report.lines===undefined?null:report.lines,assumptions:chosen,'assumptions.md':md}};
```

### Draft assumptions failed (SCRIPT, id=6adfaf1516836599f39505a8)

```javascript
output = {"assumptionDraft": {}};

```

_(server: 811 ms, 1 API call, 624 ms in API)_
