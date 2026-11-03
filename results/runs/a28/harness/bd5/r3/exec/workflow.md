# Workflow: GenerateCardStatements

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** 

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae4ace63695c563ea513b57 | <uuid> | (0, 0) | → Build statements (seq:<uuid>) |
| End | END | 6ae4ace63695c563ea513b58 | <uuid> | (1200, 0) | — |
| Build statements | SCRIPT | 6ae4ace63695c563ea513b59 | <uuid> | (300, 0) | → Draft assumptions (seq:<uuid>) | lang: JAVASCRIPT |
| Draft assumptions | AI | 6ae4ace63695c563ea513b5a | <uuid> | (600, 0) | → Finalize outputs [SUCCESS] (seq:<uuid>), → Draft assumptions failed [FAIL] (seq:<uuid>) | responseKey: assumptionDraft, aiType: TEXT_UNDERSTANDING, responseSchema: set |
| Finalize outputs | SCRIPT | 6ae4ace63695c563ea513b5b | <uuid> | (900, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| Draft assumptions failed | SCRIPT | 6ae4ace63695c563ea513b5c | <uuid> | (600, 200) | → Finalize outputs (seq:<uuid>) | lang: JAVASCRIPT |

## Systems
_(none)_

## AI prompts

### Draft assumptions (TEXT_UNDERSTANDING, id=6ae4ace63695c563ea513b5a)
instructions:

```
Compose the companion assumptions document entries using ONLY the supplied register. Return exactly one entry for each assumptionId. Copy whatYouAssumed and wikiStatementOrAbsence verbatim into their separate fields. Do not invent, omit, summarize, correct or merge assumptions, citations or evidence. An explicitly absent source must remain explicitly absent. You have no authority over financial behaviour and must not request customer data. No general knowledge or external sources.
```
userMessage:

```
Decision register: ${assumptionRegister}
```
exampleOutputJsonSchema:

```
{"title":"Response","type":"object","required":["entries"],"properties":{"entries":{"type":"array","items":{"type":"object","required":["assumptionId","whatYouAssumed","wikiStatementOrAbsence"],"properties":{"assumptionId":{"type":"string"},"whatYouAssumed":{"type":"string"},"wikiStatementOrAbsence":{"type":"string"}},"additionalProperties":false}}},"additionalProperties":false}
```

## Scripts

### Build statements (SCRIPT, id=6ae4ace63695c563ea513b59)

```javascript
var assumptions = [];
function assume(id,what,source){assumptions.push({assumptionId:id,whatYouAssumed:what,wikiStatementOrAbsence:source});}
assume('selection','One statement per card cross-reference, sorted lexically by the full card number. Match transactions by card, not by all cards sharing an account. Sort transaction IDs lexically, preserving input order for ties.','creastmt-sonnet-bd5.pdf p.2 BR-01 and BR-02; p.4 statement per card; p.21 per-card transaction lines. Account-wide pooling and tie order are unstated.');
assume('period','Include every transaction in the supplied combined file; apply no date or account-active-status filter.','creastmt-sonnet-bd5.pdf p.3 says legacy prints all transactions and leaves cycle filtering TODO; no active-status exclusion is specified.');
assume('totals','Use integer cents. Include positive amounts only in Total EXP; retain zero, credits and returns as transaction lines. A card with no transactions has zero expenditure.','creastmt-sonnet-bd5.pdf pp.2,4,13,21; p.4 specifies 100.00 plus 40.00 and return -30.00 gives 140.00.');
assume('files','Caller supplies raw fixed-width file text under transact, acctdata, cardxref and custdata. Return ordered line lists under the contract output stems and assumptions_md as companion assumptions.md content; caller can materialize physical files. Missing input differs from an explicitly empty file.','creastmt-sonnet-bd5.pdf p.26 permits lists of printed lines under filenames without extension; physical transport and assumptions transport are unstated.');
assume('line-endings','Split LF or CRLF records, remove only the final line terminator, never trim a complete record. Accept omitted trailing filler, ignore bytes beyond consumed fields, and diagnose interior blank records. No character encoding conversion is performed after the caller supplies text.','creastmt-sonnet-bd5.pdf pp.25-26 say one fixed-width record per line; line endings, encoding and filler handling are not specified.');
assume('xref-layout','Infer zero-based character offsets: card 0:16, customer 16:25, account 25:36; remaining bytes are unused filler. Preserve all digit identifiers as strings including leading zeros.','creastmt-sonnet-bd5.pdf p.8 gives CVACT03Y field order and lengths; p.26 gives record length 50 but does not reproduce the original copybook.');
assume('account-layout','Infer account ID 0:11 and current balance 12:24. Do not validate unused status, dates, limits, other balances or filler.','creastmt-sonnet-bd5.pdf p.6 orders 11-character ID, 1-character status, then signed 12-character implied-cent current balance; p.26 gives 300-byte record. Original copybook omitted.');
assume('customer-layout','Infer customer ID 0:9, first 9:34, middle 34:59, last 59:84, address1 84:134, address2 134:184, address3 184:234, state 234:236, country 236:239, ZIP 239:249 and FICO 329:332. Locate FICO after two 15-character phones, 9-character SSN, 20-character government ID, 10-character DOB, 10-character EFT and 1-character primary indicator. Ignore all unused fields, including SSN and filler.','creastmt-sonnet-bd5.pdf p.7 lists CVCUS01Y field order and widths; p.26 instead names CUSTREC without its source declaration. These offsets are inferred, not verified against that copybook.');
assume('transaction-layout','Infer transaction ID 0:16, description 32:132, amount 132:143 and card number 262:278, from the ordered widths. Consume no transaction dates, categories or merchant fields; unused bytes may contain arbitrary characters.','creastmt-sonnet-bd5.pdf pp.8-9 gives CVTRA05Y field widths; p.26 gives 350-byte input. Source copybook is not attached.');
assume('signed-decoding','Amounts contain implied cents. Accept unsigned digits, leading or trailing explicit sign, or ASCII trailing overpunch {ABCDEFGHI for positive 0-9 and }JKLMNOPQR for negative 0-9. Blanks or other characters in a consumed numeric value are errors. Do not require unused fields to be valid.','creastmt-sonnet-bd5.pdf pp.6,8 give signed implied-decimal pictures; p.9 mentions overpunch for another file. Exact statement-file sign encoding is unstated.');
assume('name','Trim each first, middle and last name and join nonblank parts with single spaces; truncate to 75 characters.','creastmt-sonnet-bd5.pdf p.7 names the three fields; p.27 requires customer name X(75). Concatenation is unstated.');
assume('address','Trim address lines 1 and 2 separately. Join nonblank trimmed address3, state and ZIP with single spaces for the third printed address line. Do not append country.','creastmt-sonnet-bd5.pdf pp.7,21 identify address fields; p.27 supplies printed widths but no assembly rule.');
assume('display-identifiers','Print the full digit account ID with leading zeros and the original three-digit FICO, each padded to 20 characters. Reject missing or nondigit consumed IDs and FICO rather than invent values.','creastmt-sonnet-bd5.pdf pp.6-8 identify numeric digit fields; p.27 specifies X(20) output but not conversion or missing-value presentation.');
assume('text-fields','Trim outer spaces in names, addresses and descriptions. Left-align and right-pad text fields, truncating on the right to the specified width. Description is limited to 49 characters in each format. Emit all repeated separator lines in listed order.','creastmt-sonnet-bd5.pdf p.27 defines X(n), transaction description X(49), and repeated separator positions. Input trimming and overflow handling are unstated.');
assume('numeric-pictures','Current balance uses nine zero-filled integer digits, a point, two decimals and trailing minus or space. Transaction and total pictures suppress leading integer zeros with spaces, including all nine integer digits for zero; decimal digits remain. Overflow beyond nine integer digits is an error, not wraparound or clipping.','creastmt-sonnet-bd5.pdf p.27 defines 9(9).99- and Z(9).99-; overflow behaviour is unstated.');
assume('html','Use the contract literal HTML and padded account, FICO, transaction ID, description and amount fields. Customer HTML name and address use the assembled trimmed values. Insert raw values without HTML entity escaping to preserve literal legacy-style bytes. Pad or right-truncate each final line to 100 characters. Never insert the explanatory block-marker lines.','creastmt-sonnet-bd5.pdf pp.27-29 gives literal HTML and field insertions; escaping, customer insertion widths and overlength lines are unstated.');
assume('format-precedence','Do not add a statement date, phone, credit limit, cycle balances, SSN or HTML expenditure total, since none is a placeholder in the fixed output contract.','creastmt-sonnet-bd5.pdf p.21 mentions additional content, while pp.27-29 enumerate actual output lines. Contract fixes output format.');
assume('errors','Report consumed-field errors by input filename and record number without raw personal data. Skip malformed transactions, skip invalid cross-references and statements with missing, duplicate or malformed required lookup rows, but keep unrelated statements. Duplicate cross-reference card keys suppress that card. Unmatched transaction cards are diagnosed. Any record error marks the result INCOMPLETE; missing required files marks INPUT_ERROR and suppresses all statements. Never mutate input.','creastmt-sonnet-bd5.pdf pp.16-20 documents not-found and file errors but does not specify statement-level recovery, duplicates or corrupt-record policy.');
assume('empty-run','Explicitly empty files are valid inputs; an empty cross-reference file yields no statements. No-transaction cards still render.','creastmt-sonnet-bd5.pdf p.4 scenario 4 requires a statement without transactions. Empty overall runs are otherwise unspecified.');
assume('documentation','Documentation model sees only this static register, never customer or financial data. Only exact copies of registered assumption/source pairs are accepted by finalization; otherwise verbatim registered text is used. Markdown has one row per decision and separate columns for assumption and wiki evidence.','Maker requires every assumption and its source or absence in assumptions.md; wiki has no documentation-drafting or failure policy.');
var diagnostics=[]; var text=[]; var html=[]; var fatal=false;
function issue(file,row,message){diagnostics.push({file:file,record:row,message:message});}
function records(key,file){if(typeof input[key]!=='string'){issue(file,0,'Required raw file content is missing or is not text');fatal=true;return [];}var a=input[key].split(/\r?\n/);if(a.length && a[a.length-1]==='')a.pop();return a;}
var ar=records('acctdata','acctdata.dat'), cr=records('custdata','custdata.dat'), xr=records('cardxref','cardxref.dat'), tr=records('transact','transact.dat');
function trim(s){return String(s).replace(/^ +| +$/g,'');}
function field(s,a,b){if(s.length<b)throw new Error('Record ends before a consumed field');return s.slice(a,b);}
function digits(s,n){if(s.length!==n||!/^[0-9]+$/.test(s))throw new Error('Invalid consumed digit identifier or FICO');return s;}
function cents(s){var sign=1,v=s;var p='{ABCDEFGHI',m='}JKLMNOPQR';var c=v.charAt(v.length-1),k=p.indexOf(c),j=m.indexOf(c);if(c!==''&&k>=0){v=v.slice(0,-1)+String(k);}else if(c!==''&&j>=0){sign=-1;v=v.slice(0,-1)+String(j);}else if(v.charAt(0)==='+'||v.charAt(0)==='-'){sign=v.charAt(0)==='-'?-1:1;v=v.slice(1);}else if(c==='+'||c==='-'){sign=c==='-'?-1:1;v=v.slice(0,-1);}if(!/^[0-9]+$/.test(v))throw new Error('Invalid consumed implied-cent amount');var n=Number(v)*sign;if(!Number.isSafeInteger(n))throw new Error('Amount exceeds exact integer arithmetic');return n;}
function indexRows(rows,file,parse){var map={},duplicates={};rows.forEach(function(s,i){try{var obj=parse(s),key='k'+obj.id;if(Object.prototype.hasOwnProperty.call(map,key)){duplicates[key]=true;issue(file,i+1,'Duplicate lookup identifier');}else map[key]=obj;}catch(e){issue(file,i+1,e.message);}});Object.keys(duplicates).forEach(function(k){map[k]=null;});return map;}
var accounts=indexRows(ar,'acctdata.dat',function(s){return {id:digits(field(s,0,11),11),balance:cents(field(s,12,24))};});
var customers=indexRows(cr,'custdata.dat',function(s){return {id:digits(field(s,0,9),9),first:trim(field(s,9,34)),middle:trim(field(s,34,59)),last:trim(field(s,59,84)),a1:trim(field(s,84,134)),a2:trim(field(s,134,184)),a3:trim(field(s,184,234)),state:trim(field(s,234,236)),zip:trim(field(s,239,249)),fico:digits(field(s,329,332),3)};});
var xrefs=indexRows(xr,'cardxref.dat',function(s){return {id:digits(field(s,0,16),16),customer:digits(field(s,16,25),9),account:digits(field(s,25,36),11)};});
var transactions={};tr.forEach(function(s,i){try{var t={id:field(s,0,16),desc:trim(field(s,32,132)),amount:cents(field(s,132,143)),card:digits(field(s,262,278),16),row:i+1};if(trim(t.id)==='')throw new Error('Blank transaction identifier');var key='k'+t.card;if(!transactions[key])transactions[key]=[];transactions[key].push(t);}catch(e){issue('transact.dat',i+1,e.message);}});
Object.keys(transactions).forEach(function(k){transactions[k].sort(function(a,b){return a.id<b.id?-1:a.id>b.id?1:a.row-b.row;});if(!xrefs[k])transactions[k].forEach(function(t){issue('transact.dat',t.row,'Transaction has no unique valid cross-reference');});});
function pad(s,n){s=String(s);return s.slice(0,n)+' '.repeat(Math.max(0,n-s.length));}
function join(a){return a.filter(function(s){return s!=='';}).join(' ');}
function pic(n,zero){if(!Number.isSafeInteger(n)||Math.abs(n)>99999999999)throw new Error('Printed amount exceeds nine integer digits');var abs=Math.abs(n),whole=String(Math.floor(abs/100)),frac=String(abs%100).padStart(2,'0');var left=zero?whole.padStart(9,'0'):(Math.floor(abs/100)===0?' '.repeat(9):whole.padStart(9,' '));return left+'.'+frac+(n<0?'-':' ');}
function statement(x){var a=accounts['k'+x.account],c=customers['k'+x.customer];if(!a||!c)throw new Error('Statement lacks a unique valid account or customer');var ts=transactions['k'+x.id]||[],total=0;ts.forEach(function(t){if(t.amount>0)total+=t.amount;pic(t.amount,false);});pic(total,false);var balance=pic(a.balance,true),name=pad(join([c.first,c.middle,c.last]),75),a3=join([c.a3,c.state,c.zip]),account=pad(a.id,20),fico=pad(c.fico,20);
var lines=[];function L(s){lines.push(pad(s,80));}
L('*'.repeat(31)+'START OF STATEMENT'+'*'.repeat(31));L(name);L(pad(c.a1,50));L(pad(c.a2,50));L(a3);L('-'.repeat(80));L(' '.repeat(33)+'Basic Details');L('-'.repeat(80));L(pad('Account ID :',20)+account);L(pad('Current Balance :',20)+balance);L(pad('FICO Score :',20)+fico);L('-'.repeat(80));L(' '.repeat(30)+'TRANSACTION SUMMARY');L('-'.repeat(80));L(pad('Tran ID',16)+pad('Tran Details',51)+pad('Tran Amount',13));L('-'.repeat(80));ts.forEach(function(t){L(pad(t.id,16)+' '+pad(t.desc,49)+'$'+pic(t.amount,false));});L('-'.repeat(80));L(pad('Total EXP:',10)+' '.repeat(56)+'$'+pic(total,false));L('*'.repeat(32)+'END OF STATEMENT'+'*'.repeat(32));
var h=[];function H(s){h.push(pad(s,100));}
['<!DOCTYPE html>','<html lang="en">','<head>','<meta charset="utf-8">','<title>HTML Table Layout</title>','</head>','<body style="margin:0px;">','<table align="center" frame="box" style="width:70%; font:12px Segoe UI,sans-serif;">','<tr>','<td colspan="3" style="padding:0px 5px;background-color:#1d1d96b3;">','<h3>Statement for Account Number: '+account+'</h3>','</td>','</tr>','<tr>','<td colspan="3" style="padding:0px 5px;background-color:#FFAF33;">','<p style="font-size:16px">Bank of XYZ</p>','<p>410 Terry Ave N</p>','<p>Seattle WA 99999</p>','</td>','</tr>','<tr>','<td colspan="3" style="padding:0px 5px;background-color:#f2f2f2;">','<p style="font-size:16px">'+trim(name)+' </p>','<p>'+c.a1+' </p>','<p>'+c.a2+' </p>','<p>'+a3+' </p>','</td>','</tr>','<tr>','<td colspan="3" style="padding:0px 5px;background-color:#33FFD1; text-align:center;">','<p style="font-size:16px">Basic Details</p>','</td>','</tr>','<tr>','<td colspan="3" style="padding:0px 5px;background-color:#f2f2f2;">','<p>Account ID : '+account+'</p>','<p>Current Balance : '+balance+'</p>','<p>FICO Score : '+fico+'</p>','</td>','</tr>','<tr>','<td colspan="3" style="padding:0px 5px;background-color:#33FFD1; text-align:center;">','<p style="font-size:16px">Transaction Summary</p>','</td>','</tr>','<tr>','<td style="width:25%; padding:0px 5px; background-color:#33FF5E; text-align:left;">','<p style="font-size:16px">Tran ID</p>','</td>','<td style="width:55%; padding:0px 5px; background-color:#33FF5E; text-align:left;">','<p style="font-size:16px">Tran Details</p>','</td>','<td style="width:20%; padding:0px 5px; background-color:#33FF5E; text-align:right;">','<p style="font-size:16px">Amount</p>','</td>','</tr>'].forEach(H);
ts.forEach(function(t){['<tr>','<td style="width:25%; padding:0px 5px; background-color:#f2f2f2; text-align:left;">','<p>'+pad(t.id,16)+'</p>','</td>','<td style="width:55%; padding:0px 5px; background-color:#f2f2f2; text-align:left;">','<p>'+pad(t.desc,49)+'</p>','</td>','<td style="width:20%; padding:0px 5px; background-color:#f2f2f2; text-align:right;">','<p>'+pic(t.amount,false)+'</p>','</td>','</tr>'].forEach(H);});
['<tr>','<td colspan="3" style="padding:0px 5px;background-color:#1d1d96b3;">','<h3>End of Statement</h3>','</td>','</tr>','</table>','</body>','</html>'].forEach(H);
return {text:lines,html:h};}
if(!fatal){Object.keys(xrefs).sort().forEach(function(k){var x=xrefs[k];if(x){try{var s=statement(x);text=text.concat(s.text);html=html.concat(s.html);}catch(e){issue('cardxref.dat',xr.findIndex(function(r){return r.slice(0,16)===x.id;})+1,e.message);}}});}
output={statementData:{creastmt_statements:text,creastmt_statements_html:html,status:fatal?'INPUT_ERROR':diagnostics.length?'INCOMPLETE':'OK',diagnostics:diagnostics},assumptionRegister:assumptions};
```

### Finalize outputs (SCRIPT, id=6ae4ace63695c563ea513b5b)

```javascript
var register=Array.isArray(input.assumptionRegister)?input.assumptionRegister:[];var draft=(input.assumptionDraft||{}).entries;var accepted=Array.isArray(draft)&&draft.length===register.length&&register.every(function(a){return draft.filter(function(d){return d.assumptionId===a.assumptionId&&d.whatYouAssumed===a.whatYouAssumed&&d.wikiStatementOrAbsence===a.wikiStatementOrAbsence;}).length===1;});var rows=register.map(function(a){if(accepted)return draft.filter(function(d){return d.assumptionId===a.assumptionId;})[0];return a;});function cell(s){return String(s).replace(/\|/g,'\\|').replace(/\r?\n/g,'<br>');}var md='# Statement-generation assumptions\n\nOne row records one implementation decision; source references identify the supplied wiki or an explicit omission.\n\n| Decision | what you assumed | which wiki statement (or absence of one) it rests on |\n| --- | --- | --- |\n'+rows.map(function(a){return '| '+cell(a.assumptionId)+' | '+cell(a.whatYouAssumed)+' | '+cell(a.wikiStatementOrAbsence)+' |';}).join('\n')+'\n';var data=input.statementData||{creastmt_statements:[],creastmt_statements_html:[],status:'INPUT_ERROR',diagnostics:[]};output={statementOutputs:{creastmt_statements:data.creastmt_statements||[],creastmt_statements_html:data.creastmt_statements_html||[],assumptions_md:md,assumptions:rows,status:data.status||'INPUT_ERROR',diagnostics:data.diagnostics||[]}};
```

### Draft assumptions failed (SCRIPT, id=6ae4ace63695c563ea513b5c)

```javascript
output = {"assumptionDraft": {}};

```

_(server: 294 ms, 1 API call, 287 ms in API)_
