# Workflow: GenerateDailyTransactionReport

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** 

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae5861f3695c563ea515f7e | <uuid> | (0, 0) | → Transform (seq:<uuid>) |
| End | END | 6ae5861f3695c563ea515f7f | <uuid> | (1200, 0) | — |
| Transform | SCRIPT | 6ae5861f3695c563ea515f80 | <uuid> | (300, 0) | → Draft assumptions (seq:<uuid>) | lang: JAVASCRIPT |
| Draft assumptions | AI | 6ae5861f3695c563ea515f81 | <uuid> | (600, 0) | → Package outputs [SUCCESS] (seq:<uuid>), → Draft assumptions failed [FAIL] (seq:<uuid>) | responseKey: assumptionDraft, aiType: TEXT_UNDERSTANDING, responseSchema: set |
| Package outputs | SCRIPT | 6ae5861f3695c563ea515f82 | <uuid> | (900, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| Draft assumptions failed | SCRIPT | 6ae5861f3695c563ea515f83 | <uuid> | (600, 200) | → Package outputs (seq:<uuid>) | lang: JAVASCRIPT |

## Systems
_(none)_

## AI prompts

### Draft assumptions (TEXT_UNDERSTANDING, id=6ae5861f3695c563ea515f81)
instructions:

```
Draft the human-readable assumptions record solely from the supplied ledger. Return an object with entries, one item for every ledger entry, in exactly the same order, each with the separate properties assumption, wikiBasis and citation. Preserve each property's supplied wording and citation exactly: do not invent, omit, merge, improve, resolve or reinterpret a choice or a source statement. The assumption must remain visibly an implementation choice, and a wiki absence must not be described as established legacy behaviour. Never infer facts from outside the ledger. Do not produce report data. The caller will render the entries as a Markdown table with columns What you assumed, Which wiki statement (or absence of one) it rests on, and Source.
```
userMessage:

```
${assumptionLedger}
```
exampleOutputJsonSchema:

```
{"title":"Response","type":"object","additionalProperties":false,"required":["entries"],"properties":{"entries":{"type":"array","items":{"type":"object","additionalProperties":false,"required":["assumption","wikiBasis","citation"],"properties":{"assumption":{"type":"string"},"wikiBasis":{"type":"string"},"citation":{"type":"string"}}}}}}
```

## Scripts

### Transform (SCRIPT, id=6ae5861f3695c563ea515f80)

```javascript
var ledger=[];
function assumption(a,b,p){ledger.push({assumption:a,wikiBasis:b,citation:'tranrept-sonnet.pdf p.'+p});}
assumption('Receive the four input file contents as workflow text parameters and return both named output contents together; no external directory is assumed.','The daily-report supplement permits returning printed lines as a string or list under the file name without extension; no directory or file-service connection is specified.','26');
assumption('Default the run to 2022-07-01 through 2022-07-31; explicit startDate/endDate override the defaults.','The daily-report contract gives these dates; the wiki gives an earlier example default range.','2,26');
assumption('Compare the first ten characters of processedTimestamp as an ISO calendar date, inclusively, without timezone conversion.','BR-01 specifies processing dates between the bounds inclusive, but does not specify time-of-day or timezone treatment.','2,9');
assumption('Preserve input order within each card-number group.','BR-02 specifies card-number order only; no secondary order is supplied.','2');
assumption('Decode transactions consecutively as id16, type2, category4, source10, description100, amount11, merchantId9, merchantName50, merchantCity50, merchantZip10, card16, originalTimestamp26, processedTimestamp26; ignore the remaining 20 filler characters.','The data model lists those widths and field order, and the contract names a 350-character copybook record without supplying the complete copybook.','8,9,26');
assumption('Decode card cross-reference as card16, customer9, account11, then ignored filler; preserve card and account identifiers as strings including leading zeroes.','The model lists these fields and widths; the complete cross-reference copybook is not attached.','8,26');
assumption('Decode type reference as type2 plus description50; category reference as type2 plus category4 plus description50; ignore their trailing filler.','The reference model gives these ordered fields, while the contract gives total record width 60, not full copybooks.','9,10,26');
assumption('Decode the 11-character implied-two-decimal transaction amount using ASCII digits with optional signed overpunch; accept explicit leading or trailing signs when they occupy the same field. All summation uses integer cents.','Transaction amount is S9(9)V99; the wiki mentions signed overpunch for another numeric input but does not supply transaction encoding examples.','8,9');
assumption('Recognise LF and CRLF record separators and an optional final separator; treat an interior empty record as unusable. Validate only fields actually read; ignore merchant fields, unused timestamps and filler, including NUL bytes.','The contract specifies one fixed-width record per line; no line-ending or filler-content restrictions are stated.','26');
assumption('Use at most 50 detail records per page; subtotal, header and rule lines do not consume this limit.','The plugin explicitly leaves lines per page TODO, and the contract does not supply a page capacity.','19,29');
assumption('At a card break emit its account total after its last detail, even when several cards share an account; if a card spans pages its account total is emitted only at its final detail.','The wiki says totals break on card number, while labelling the subtotal Account total.','2,19');
assumption('Emit a page total and rule after every completed page, after a coincident card subtotal; emit the grand total after the final page rule, with no additional grand-total rule.','The contract states that each page and account total is followed by a rule, but is silent about coincident break ordering and any grand-total rule.','29');
assumption('For no selected transactions emit the four header lines, zero page total and its rule, then zero grand total, with no account total.','The acceptance page requires an empty-range report with zero total; exact empty-report line sequence is not specified.','4,29');
assumption('Pad every printed line to 133 characters; use the contract header, not a page number or redesigned PDF/CSV; truncate reference descriptions to their report widths.','The contract fixes literal headers and column positions, superseding the plugin output redesign for this requested step.','19,26,29');
assumption('Print cents with two decimal digits; right-align grouped integer digits with spaces suppressing leading zero groups; put a minus or space in the first amount position for detail, and plus/minus for totals. Zero retains a zero integer digit.','The contract specifies 15-position signed amount pictures and two decimals, but gives no zero-value example.','27,29');
assumption('If a printed amount exceeds its 15-column numeric picture, print 15 asterisks and flag it instead of truncating digits; if integer-cent arithmetic exceeds safe exact precision, fail the run without a report.','The source specifies pictures and totals but no overflow policy.','2,29');
assumption('On a missing type/category lookup retain the transaction with a blank description and a diagnostic; a missing card cross-reference prints a blank account and is also diagnosed.','Unknown reference is flagged and the run continues, with legacy abend behaviour marked TODO; missing cross-reference behaviour is unstated.','4,19');
assumption('Use the first usable row for a reference key; flag later conflicting rows and ignore identical duplicates.','Reference keys are described as primary/composite keys, but duplicate file-row handling is unstated.','8,9,10');
assumption('Skip only an individual record that cannot supply the fields this step reads, and diagnose its file and line without exposing record contents; do not validate unused fields.','No malformed fixed-width record policy is supplied; an unknown reference is explicitly a continuing condition.','4,26');
assumption('Missing input content or invalid/reversed run dates fail the run and omit the report; an explicitly empty string represents a present empty file.','The contract lists four mandatory inputs and a date range but does not define missing-file or invalid-date handling.','26');
assumption('Keep the report deterministic; use a model only to draft separate structured explanations of this cited ledger; preserve the entire ledger if drafting fails or changes any entry.','The maker requires each assumption and its wiki basis; no particular explanation-generation mechanism is prescribed.','1,26');
var diagnostics=[],failed=false,lines=[];
function diag(file,n,msg){diagnostics.push({fileName:file,lineNumber:n,message:msg});}
function rows(v){if(typeof v!=='string')return [];var a=v.split(/\r?\n/);if(a.length&&a[a.length-1]==='')a.pop();return a;}
function validDate(s){if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;var y=Number(s.slice(0,4)),m=Number(s.slice(5,7)),d=Number(s.slice(8,10));var leap=y%4===0&&(y%100!==0||y%400===0);var days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];return y>0&&m>=1&&m<=12&&d>=1&&d<=days[m-1];}
function pad(s,n){s=String(s);return s.slice(0,n)+' '.repeat(Math.max(0,n-s.length));}
function line(s){lines.push(pad(s,133));}
function cents(s){var sign=1,t=s.trim();if(!t)return null;var end=t.slice(-1),pos='{ABCDEFGHI',neg='}JKLMNOPQR';if(pos.indexOf(end)>=0){t=t.slice(0,-1)+pos.indexOf(end);}else if(neg.indexOf(end)>=0){sign=-1;t=t.slice(0,-1)+neg.indexOf(end);}else if(end==='-'||end==='+'){sign=end==='-'?-1:1;t=t.slice(0,-1);}if(t.charAt(0)==='-'||t.charAt(0)==='+'){sign=t.charAt(0)==='-'?-1:1;t=t.slice(1);}if(!/^\d+$/.test(t))return null;var n=Number(t)*sign;return Number.isSafeInteger(n)?n:null;}
function money(n,total){var a=Math.abs(n),whole=String(Math.floor(a/100)).replace(/\B(?=(\d{3})+(?!\d))/g,','),fraction=String(a%100).padStart(2,'0');if(whole.replace(/,/g,'').length>9){diag('tranrept_report.txt',lines.length+1,'Amount exceeds numeric picture; asterisks printed');return '*'.repeat(15);}var body=whole+'.'+fraction;return (n<0?'-':total?'+':' ')+' '.repeat(Math.max(0,14-body.length))+body;}
function total(label,n,width){line(pad(label,width)+'.'.repeat(97-width)+money(n,true));line('-'.repeat(133));}
var names=[['transactText','transact.dat'],['cardxrefText','cardxref.dat'],['trantypeText','trantype.dat'],['trancatgText','trancatg.dat']];for(var f=0;f<names.length;f++){if(typeof input[names[f][0]]!=='string'){failed=true;diag(names[f][1],0,'Required input file content is missing or not text');}}
var start=input.startDate==null?'2022-07-01':input.startDate,endDate=input.endDate==null?'2022-07-31':input.endDate;
if(!validDate(start)||!validDate(endDate)||start>endDate){failed=true;diag('run parameters',0,'Dates must be valid YYYY-MM-DD values with start not after end');}
var types=Object.create(null),categories=Object.create(null),xrefs=Object.create(null);
function load(text,file,min,keyFn,valueFn,map){var rr=rows(text);for(var j=0;j<rr.length;j++){var r=rr[j];if(r.length<min){diag(file,j+1,'Record cannot supply required lookup fields; skipped');continue;}var key=keyFn(r),value=valueFn(r);if(!key){diag(file,j+1,'Lookup key is blank; skipped');continue;}if(Object.prototype.hasOwnProperty.call(map,key)){if(map[key]!==value)diag(file,j+1,'Conflicting duplicate lookup key; first usable row retained');}else map[key]=value;}}
if(!failed){load(input.trantypeText,'trantype.dat',52,function(r){return r.slice(0,2).trim();},function(r){return r.slice(2,52).trimEnd();},types);load(input.trancatgText,'trancatg.dat',56,function(r){var c=r.slice(2,6);return /^\d{4}$/.test(c)&&r.slice(0,2).trim()?r.slice(0,2).trim()+'|'+c:'';},function(r){return r.slice(6,56).trimEnd();},categories);load(input.cardxrefText,'cardxref.dat',36,function(r){return r.slice(0,16).trimEnd();},function(r){return r.slice(25,36);},xrefs);}
var selected=[];
if(!failed){var tr=rows(input.transactText);for(var k=0;k<tr.length;k++){var r=tr[k],n=k+1;if(r.length<314){diag('transact.dat',n,'Record cannot supply processing date and report fields; skipped');continue;}var date=r.slice(304,314);if(!validDate(date)){diag('transact.dat',n,'Processing date is unusable; record skipped');continue;}if(date<start||date>endDate)continue;var amount=cents(r.slice(132,143)),cat=r.slice(18,22),card=r.slice(262,278).trimEnd(),type=r.slice(16,18).trim();if(amount===null||!/^\d{4}$/.test(cat)||!card||!type){diag('transact.dat',n,'Selected record has unusable amount, category or lookup key; skipped');continue;}selected.push({id:r.slice(0,16),type:type,cat:cat,source:r.slice(22,32),amount:amount,card:card,ordinal:k,line:n});}selected.sort(function(a,b){return a.card<b.card?-1:a.card>b.card?1:a.ordinal-b.ordinal;});}
var page=0,cardSum=0,grand=0;
function header(){line(pad('DALYREPT',38)+pad('Daily Transaction Report',41)+pad('Date Range:',12)+start+pad('to',4)+endDate);line('');line(pad('Transaction ID',17)+pad('Account ID',12)+pad('Transaction Type',19)+pad('Tran Category',35)+pad('Tran Source',14)+' '+pad('Amount',16));line('-'.repeat(133));}
if(!failed){header();for(var z=0;z<selected.length;z++){var t=selected[z],typeDesc=types[t.type],catDesc=categories[t.type+'|'+t.cat],acct=xrefs[t.card];if(typeDesc===undefined){diag('transact.dat',t.line,'Type reference not found; blank description printed');typeDesc='';}if(catDesc===undefined){diag('transact.dat',t.line,'Category reference not found; blank description printed');catDesc='';}if(acct===undefined){diag('transact.dat',t.line,'Card cross-reference not found; blank account printed');acct='';}page+=t.amount;cardSum+=t.amount;grand+=t.amount;if(!Number.isSafeInteger(page)||!Number.isSafeInteger(cardSum)||!Number.isSafeInteger(grand)){failed=true;diag('tranrept_report.txt',0,'Exact-cent arithmetic exceeded safe precision; report omitted');break;}line(pad(t.id,16)+' '+pad(acct,11)+' '+pad(t.type,2)+'-'+pad(typeDesc,15)+' '+t.cat+'-'+pad(catDesc,29)+' '+pad(t.source,10)+'    '+money(t.amount,false));if(z===selected.length-1||selected[z+1].card!==t.card){total('Account Total',cardSum,13);cardSum=0;}if((z+1)%50===0&&z<selected.length-1){total('Page Total',page,11);page=0;header();}}if(!failed){total('Page Total',page,11);line(pad('Grand Total',11)+'.'.repeat(86)+money(grand,true));}}
if(failed)lines=[];
output={assumptionLedger:ledger,reportLines:lines,reportStatus:failed?'FAILED':diagnostics.length?'WARNING':'OK',reportDiagnostics:diagnostics};
```

### Package outputs (SCRIPT, id=6ae5861f3695c563ea515f82)

```javascript
var ledger=Array.isArray(input.assumptionLedger)?input.assumptionLedger:[];var draft=input.assumptionDraft||{},entries=Array.isArray(draft.entries)?draft.entries:[];var valid=entries.length===ledger.length&&ledger.length>0;for(var i=0;i<ledger.length&&valid;i++){valid=entries[i]&&entries[i].assumption===ledger[i].assumption&&entries[i].wikiBasis===ledger[i].wikiBasis&&entries[i].citation===ledger[i].citation;}var records=valid?entries:ledger;var diagnostics=Array.isArray(input.reportDiagnostics)?input.reportDiagnostics.slice():[];var status=input.reportStatus||'FAILED';if(!valid){diagnostics.push({fileName:'assumptions.md',lineNumber:0,message:'Explanation drafting failed or changed the ledger; complete cited ledger preserved'});if(status==='OK')status='WARNING';}function cell(s){return String(s==null?'':s).replace(/\|/g,'\\|').replace(/\r?\n/g,'<br>');}var md='# Daily transaction report assumptions\n\nEach row is an implementation assumption, not a claim of verified legacy parity. The source column cites the supplied wiki or the location where a rule is absent.\n\n| What you assumed | Which wiki statement (or absence of one) it rests on | Source |\n| --- | --- | --- |\n';for(var j=0;j<records.length;j++){md+='| '+cell(records[j].assumption)+' | '+cell(records[j].wikiBasis)+' | '+cell(records[j].citation)+' |\n';}var report=Array.isArray(input.reportLines)?input.reportLines:[];var artifacts=[];if(status!=='FAILED')artifacts.push({fileName:'tranrept_report.txt',content:report.join('\n')+'\n'});artifacts.push({fileName:'assumptions.md',content:md});output={result:{tranrept_report:report,assumptions:records,artifacts:artifacts,status:status,diagnostics:diagnostics}};
```

### Draft assumptions failed (SCRIPT, id=6ae5861f3695c563ea515f83)

```javascript
output = {"assumptionDraft": {}};

```

_(server: 213 ms, 1 API call, 209 ms in API)_
