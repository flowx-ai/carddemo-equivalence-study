# Workflow: GenerateCardStatements

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** 

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae0a61cad7ea9e18be431e7 | <uuid> | (0, 0) | → Prepare statements (seq:<uuid>) |
| End | END | 6ae0a61cad7ea9e18be431e8 | <uuid> | (1200, 0) | — |
| Prepare statements | SCRIPT | 6ae0a61cad7ea9e18be431e9 | <uuid> | (300, 0) | → Draft assumptions (seq:<uuid>) | lang: JAVASCRIPT |
| Draft assumptions | AI | 6ae0a61cad7ea9e18be431ea | <uuid> | (600, 0) | → Package outputs [SUCCESS] (seq:<uuid>), → Draft assumptions failed [FAIL] (seq:<uuid>) | responseKey: assumptionDraft, aiType: TEXT_UNDERSTANDING, responseSchema: set |
| Package outputs | SCRIPT | 6ae0a61cad7ea9e18be431eb | <uuid> | (900, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| Draft assumptions failed | SCRIPT | 6ae0a61cad7ea9e18be431ec | <uuid> | (600, 200) | → Package outputs (seq:<uuid>) | lang: JAVASCRIPT |

## Systems
_(none)_

## AI prompts

### Draft assumptions (TEXT_UNDERSTANDING, id=6ae0a61cad7ea9e18be431ea)
instructions:

```
Write explanatory assumptions entries only, from the supplied authoritative ledger. Return the JSON object schema, with one entry per supplied assumption and separate whatAssumed and wikiBasis strings. Keep each choice and its exact page citation and quoted source statement, or explicit absence of a rule. Explain faithfully, without adding a rule, inferring legacy answers, changing computations, claiming oracle parity, or inventing citations. Do not request or use customer data. The supplied ledger is authoritative, including the customer presentation and per-record recovery choices. Do not omit assumptions. This explanation is supplemental to a verbatim authoritative ledger and never controls statement generation.
```
userMessage:

```
Authoritative assumptions and their source bases: ${assumptionFacts}
```
exampleOutputJsonSchema:

```
{"title":"Response","type":"object","properties":{"assumptions":{"type":"array","items":{"type":"object","properties":{"whatAssumed":{"type":"string"},"wikiBasis":{"type":"string"}},"required":["whatAssumed","wikiBasis"],"additionalProperties":false}}},"required":["assumptions"],"additionalProperties":false}
```

## Scripts

### Prepare statements (SCRIPT, id=6ae0a61cad7ea9e18be431e9)

```javascript
var assumptions=[];
function note(a,b){assumptions.push({whatAssumed:a,wikiBasis:b});}
note('Read each named input as its complete ASCII-compatible text, with LF or CRLF record separators; remove only a final line terminator. An empty present file contains zero records.','creastmt-sonnet.pdf p.26: "Fixed-width text, one record per line"; character encoding and line separators are not specified.');
note('Infer zero-based account offsets: accountId [0,11), currentBalance [12,24). Other account bytes are not interpreted.','creastmt-sonnet.pdf p.6: ACCT-ID 9(11), ACCT-ACTIVE-STATUS X(1), ACCT-CURR-BAL S9(10)V99. Original CVACT01Y is absent; these offsets assume contiguous display fields in the listed order.');
note('Infer zero-based cross-reference offsets: cardNumber [0,16), customerId [16,25), accountId [25,36). Ignore remaining bytes.','creastmt-sonnet.pdf p.8: XREF-CARD-NUM X(16), XREF-CUST-ID 9(9), XREF-ACCT-ID 9(11); CVACT03Y itself is absent.');
note('Infer zero-based customer offsets: id [0,9); first/middle/last [9,34), [34,59), [59,84); address lines [84,134), [134,184), [184,234); state [234,236); ZIP [239,249); FICO [329,332). Ignore country [236,239) and all other fields.','creastmt-sonnet.pdf p.7 lists the Customer fields and widths, including intervening phones, SSN, government ID, birth date, EFT ID and primary-holder flag. CUSTREC itself is absent; contiguous display storage is assumed.');
note('Infer zero-based transaction offsets: id [0,16), description [32,132), signed cents [132,143), card [262,278). Do not read other transaction fields.','creastmt-sonnet.pdf pp.8-9 list Transaction fields and widths, including S9(9)V99 and the intervening merchant fields. CVTRA05Y itself is absent; contiguous display storage is assumed.');
note('Amounts use implied two-decimal ASCII display digits. Accept an ordinary final digit or ASCII overpunch {ABCDEFGHI for positive 0-9 and }JKLMNOPQR for negative 0-9. Do not infer packed-decimal or EBCDIC conversion.','creastmt-sonnet.pdf pp.6,8 give signed numeric pictures; p.9 mentions signed overpunch for a different file. Monetary encoding in these four files is not explicitly specified.');
note('Preserve digit identifiers as strings and keep leading zeros on printed account and transaction identifiers; trim only surrounding field spaces. FICO is the supplied three-character field, not range-validated.','creastmt-sonnet.pdf pp.6-8 describe identifier widths and types; p.27 prints Account ID and FICO as X(20). Printed conversion and validation rules are otherwise silent.');
note('Sort usable cross-reference rows by card number, stably by input line for ties. Generate one statement per usable cross-reference; do not merge different cards by account or deduplicate repeated cross-reference rows.','creastmt-sonnet.pdf p.2 BR-01: "Statement driven by CardXref order (card number)"; p.4: "One statement per card". Duplicate cross-reference behaviour is not specified.');
note('Select only transactions with the cross-reference card number and sort by transaction ID, stably by input line for equal IDs. Do not use account-wide transaction selection.','creastmt-sonnet.pdf p.2 BR-02: "Transactions are keyed by card number + transaction id"; p.21 refers more broadly to transactions per card of the account. Per-card interpretation resolves that ambiguity.');
note('Include every supplied transaction regardless of original or processed date. Business date defaults to 2022-07-18 and does not add an uncontracted printed line.','creastmt-sonnet.pdf p.3: "legacy prints all transactions on file; confirm cycle filter requirement"; p.25 supplies business date 2022-07-18; pp.27-29 define no statement-date slot.');
note('Join trimmed nonblank first, middle and last names with a single space. Retain the first two address lines apart from trailing padding; join trimmed address line three, state and ZIP with single spaces. Omit country.','creastmt-sonnet.pdf pp.7,21 list name and address components but not assembly punctuation. The maker selected this presentation.');
note('A card without transactions still receives both formats, with zero expenditure. Compute totals as signed integer cents, including negative amounts.','creastmt-sonnet.pdf p.4: "Card without transactions ... Statement with zero total"; p.2 BR-03: "total expenditure = sum of amounts".');
note('For duplicate account or customer IDs, retain the first usable record and list later duplicates as omitted. Missing joins omit that cross-reference only. Unreadable transactions are omitted individually.','creastmt-sonnet.pdf pp.2,4,16 do not define statement-specific duplicate or join-error recovery. The maker chose unaffected statements plus an explicit omissions list.');
note('A missing or non-text required input fails the batch without statements. A present empty input is not missing. On record-level exclusions return PARTIAL, otherwise OK; use FAILED for absent required inputs.','creastmt-sonnet.pdf p.26 names the four required files. The maker chose failure on absent files, not on one bad record; result status labels are implementation defaults.');
note('Read and validate only the spans used by this step. A short record is unusable only if a required span is unavailable. Ignore filler bytes, including NUL, and do not enforce unused-field, FICO, date, name or unrelated numeric validation.','creastmt-sonnet.pdf pp.6-9 specify many fields not printed here; no statement-specific rejection rule for unused fields or filler is documented.');
note('Use the exact contract separators, boilerplate, fixed columns and numeric pictures, not the broader plugin field inventory. Do not add a date, phone, credit limit, cycle amounts, HTML total or PDF.','creastmt-sonnet.pdf pp.27-29 enumerate statement output lines; p.21 lists broader plugin content and p.4 says PDF is not legacy. The contract governs printed slots.');
note('For 9(9).99- pad integer digits with zeros; for Z(9).99- replace leading integer zeros with spaces. Zero has a blank sign and .00 fractional part. Negative zero prints like zero. A magnitude beyond nine integer digits prints thirteen asterisks.','creastmt-sonnet.pdf p.27 specifies numeric pictures; negative zero and overflow presentation are not defined.');
note('Clip text to its printed field width, then space-pad. HTML name and address values use the same pre-escape maxima as text, right-trimmed; account ID, FICO and transaction ID retain their specified X-field padding. Escape &, <, >, quotes and apostrophes in inserted HTML data; pad or clip the final HTML line to 100 characters.','creastmt-sonnet.pdf pp.27-29 fix widths and HTML literals but are silent about escaping, unusually long escaped values, and HTML padding for name/address variables.');
note('Retain the first two address lines without introducing punctuation or changing their content; remove only their source trailing padding and apply the contract X(50) width.','Maker presentation choice; creastmt-sonnet.pdf p.27 provides separate X(50) address slots.');
note('If accumulated cents exceed exact JavaScript integer representation, omit that statement and identify its cross-reference; do not silently round its total.','The source does not define totals exceeding exact integer capacity; integer-cents arithmetic is an implementation choice.');
note('The explanatory model receives only this ledger and its citations, never raw input records. Its prose is supplemental; the complete authoritative ledger and deterministic omissions list are always rendered even if drafting fails.','The maker requires each decision and omitted record in assumptions.md; no model or explanatory-document failure policy is specified in the wiki.');
var omitted=[],errors=[],txt=[],html=[];
var files=(input&&input.files&&typeof input.files==='object')?input.files:{};
var required=['transact.dat','acctdata.dat','cardxref.dat','custdata.dat'];
for(var q=0;q<required.length;q++){var fn=required[q];if(!Object.prototype.hasOwnProperty.call(files,fn)||typeof files[fn]!=='string'){errors.push({fileName:fn,reason:'Required text input is missing or is not text'});}}
function omit(f,n,r){omitted.push({fileName:f,lineNumber:n,reason:r});}
function rows(f){var s=files[f];if(s==='')return [];var a=s.split('\n');if(a[a.length-1]==='')a.pop();return a.map(function(x,i){return {text:x.endsWith('\r')?x.slice(0,-1):x,line:i+1};});}
function trim(s){return s.replace(/^ +| +$/g,'');}
function rtrim(s){return s.replace(/ +$/g,'');}
function field(s,p,n){if(s.length<p+n)throw new Error('Required field span unavailable');return s.slice(p,p+n);}
function id(s,p,n){var v=trim(field(s,p,n));if(!v)throw new Error('Required identifier is blank');return v;}
function cents(s){if(!s.length)throw new Error('Unreadable amount');var last=s.slice(-1),pos='{ABCDEFGHI',neg='}JKLMNOPQR',sign=1,digit;if(/^[0-9]$/.test(last)){digit=last;}else if(pos.indexOf(last)>=0){digit=String(pos.indexOf(last));}else if(neg.indexOf(last)>=0){digit=String(neg.indexOf(last));sign=-1;}else{throw new Error('Unreadable signed display amount');}var digits=s.slice(0,-1)+digit;if(!/^[0-9]+$/.test(digits))throw new Error('Unreadable signed display amount');var n=Number(digits)*sign;if(!Number.isSafeInteger(n))throw new Error('Amount outside exact integer capacity');return n;}
function pad(s,n){s=String(s);return (s+' '.repeat(n)).slice(0,n);}
function money(n,zero){var a=Math.abs(n);if(a>99999999999)return '*'.repeat(13);var whole=String(Math.floor(a/100)),fraction=String(a%100).padStart(2,'0');var leading=zero?whole.padStart(9,'0'):(a<100?' '.repeat(9):whole.padStart(9,' '));return leading+'.'+fraction+(n<0?'-':' ');}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function htmlLine(s){html.push(pad(s,100));}
function htmlStatement(x,c,a,ts){var cname=pad(c.name,75).trimEnd(),ad1=rtrim(pad(c.a1,50)),ad2=rtrim(pad(c.a2,50)),ad3=rtrim(pad(c.a3,80));
var h=['<!DOCTYPE html>','<html lang="en">','<head>','<meta charset="utf-8">','<title>HTML Table Layout</title>','</head>','<body style="margin:0px;">','<table align="center" frame="box" style="width:70%; font:12px Segoe UI,sans-serif;">','<tr>','<td colspan="3" style="padding:0px 5px;background-color:#1d1d96b3;">','<h3>Statement for Account Number: '+esc(pad(x.accountId,20))+'</h3>','</td>','</tr>','<tr>','<td colspan="3" style="padding:0px 5px;background-color:#FFAF33;">','<p style="font-size:16px">Bank of XYZ</p>','<p>410 Terry Ave N</p>','<p>Seattle WA 99999</p>','</td>','</tr>','<tr>','<td colspan="3" style="padding:0px 5px;background-color:#f2f2f2;">','<p style="font-size:16px">'+esc(cname)+' </p>','<p>'+esc(ad1)+' </p>','<p>'+esc(ad2)+' </p>','<p>'+esc(ad3)+' </p>','</td>','</tr>','<tr>','<td colspan="3" style="padding:0px 5px;background-color:#33FFD1; text-align:center;">','<p style="font-size:16px">Basic Details</p>','</td>','</tr>','<tr>','<td colspan="3" style="padding:0px 5px;background-color:#f2f2f2;">','<p>Account ID : '+esc(pad(x.accountId,20))+'</p>','<p>Current Balance : '+money(a.balance,true)+'</p>','<p>FICO Score : '+esc(pad(c.fico,20))+'</p>','</td>','</tr>','<tr>','<td colspan="3" style="padding:0px 5px;background-color:#33FFD1; text-align:center;">','<p style="font-size:16px">Transaction Summary</p>','</td>','</tr>','<tr>','<td style="width:25%; padding:0px 5px; background-color:#33FF5E; text-align:left;">','<p style="font-size:16px">Tran ID</p>','</td>','<td style="width:55%; padding:0px 5px; background-color:#33FF5E; text-align:left;">','<p style="font-size:16px">Tran Details</p>','</td>','<td style="width:20%; padding:0px 5px; background-color:#33FF5E; text-align:right;">','<p style="font-size:16px">Amount</p>','</td>','</tr>'];
h.forEach(htmlLine);
ts.forEach(function(t){['<tr>','<td style="width:25%; padding:0px 5px; background-color:#f2f2f2; text-align:left;">','<p>'+esc(pad(t.id,16))+'</p>','</td>','<td style="width:55%; padding:0px 5px; background-color:#f2f2f2; text-align:left;">','<p>'+esc(pad(t.desc,49))+'</p>','</td>','<td style="width:20%; padding:0px 5px; background-color:#f2f2f2; text-align:right;">','<p>'+money(t.amount,false)+'</p>','</td>','</tr>'].forEach(htmlLine);});
['<tr>','<td colspan="3" style="padding:0px 5px;background-color:#1d1d96b3;">','<h3>End of Statement</h3>','</td>','</tr>','</table>','</body>','</html>'].forEach(htmlLine);
}
if(errors.length===0){
var accounts=Object.create(null),customers=Object.create(null),xrefs=[],transactions=[],byCard=Object.create(null);
rows('acctdata.dat').forEach(function(r){try{var k=id(r.text,0,11),a={balance:cents(field(r.text,12,12))};if(Object.prototype.hasOwnProperty.call(accounts,k)){omit('acctdata.dat',r.line,'Duplicate account identifier; first usable record retained');}else accounts[k]=a;}catch(e){omit('acctdata.dat',r.line,String(e.message));}});
rows('custdata.dat').forEach(function(r){try{var s=r.text,k=id(s,0,9);var name=[trim(field(s,9,25)),trim(field(s,34,25)),trim(field(s,59,25))].filter(function(v){return v!=='';}).join(' ');var ad3=[trim(field(s,184,50)),trim(field(s,234,2)),trim(field(s,239,10))].filter(function(v){return v!=='';}).join(' ');var c={name:name,a1:rtrim(field(s,84,50)),a2:rtrim(field(s,134,50)),a3:ad3,fico:rtrim(field(s,329,3))};if(Object.prototype.hasOwnProperty.call(customers,k)){omit('custdata.dat',r.line,'Duplicate customer identifier; first usable record retained');}else customers[k]=c;}catch(e){omit('custdata.dat',r.line,String(e.message));}});
rows('cardxref.dat').forEach(function(r){try{xrefs.push({card:id(r.text,0,16),customerId:id(r.text,16,9),accountId:id(r.text,25,11),line:r.line});}catch(e){omit('cardxref.dat',r.line,String(e.message));}});
rows('transact.dat').forEach(function(r){try{var t={id:id(r.text,0,16),desc:field(r.text,32,100),amount:cents(field(r.text,132,11)),card:id(r.text,262,16),line:r.line,used:false};transactions.push(t);if(!byCard[t.card])byCard[t.card]=[];byCard[t.card].push(t);}catch(e){omit('transact.dat',r.line,String(e.message));}});
Object.keys(byCard).forEach(function(k){byCard[k].sort(function(a,b){return a.id<b.id?-1:a.id>b.id?1:a.line-b.line;});});
xrefs.sort(function(a,b){return a.card<b.card?-1:a.card>b.card?1:a.line-b.line;});
xrefs.forEach(function(x){var a=accounts[x.accountId],c=customers[x.customerId];if(!a||!c){omit('cardxref.dat',x.line,'No usable matching '+(!a&&!c?'account and customer':!a?'account':'customer'));return;}var ts=byCard[x.card]||[],total=0;ts.forEach(function(t){total+=t.amount;});if(!Number.isSafeInteger(total)){omit('cardxref.dat',x.line,'Statement total exceeds exact integer capacity');return;}
var lines=['*'.repeat(31)+'START OF STATEMENT'+'*'.repeat(31),pad(c.name,75)+' '.repeat(5),pad(c.a1,50)+' '.repeat(30),pad(c.a2,50)+' '.repeat(30),pad(c.a3,80),'-'.repeat(80),pad(' '.repeat(33)+'Basic Details',80),'-'.repeat(80),pad(pad('Account ID : ',20)+pad(x.accountId,20),80),pad(pad('Current Balance : ',20)+money(a.balance,true),80),pad(pad('FICO Score : ',20)+pad(c.fico,20),80),'-'.repeat(80),pad(' '.repeat(30)+'TRANSACTION SUMMARY',80),'-'.repeat(80),pad(pad('Tran ID',16)+pad('Tran Details',51)+'Tran Amount',80),'-'.repeat(80)];
ts.forEach(function(t){lines.push(pad(t.id,16)+' '+pad(t.desc,49)+'$'+money(t.amount,false));t.used=true;});
lines.push('-'.repeat(80));lines.push(pad('Total EXP:',10)+' '.repeat(56)+'$'+money(total,false));lines.push('*'.repeat(32)+'END OF STATEMENT'+'*'.repeat(32));lines.forEach(function(l){txt.push(pad(l,80));});htmlStatement(x,c,a,ts);
});
transactions.forEach(function(t){if(!t.used)omit('transact.dat',t.line,'No generated statement for this transaction card');});
}
omitted.sort(function(a,b){return a.fileName<b.fileName?-1:a.fileName>b.fileName?1:a.lineNumber-b.lineNumber;});
output={statementLines:txt,htmlLines:html,assumptionFacts:{assumptions:assumptions},canonicalAssumptions:{assumptions:assumptions,omittedRecords:omitted},batchStatus:errors.length?'FAILED':omitted.length?'PARTIAL':'OK',batchErrors:errors};
```

### Package outputs (SCRIPT, id=6ae0a61cad7ea9e18be431eb)

```javascript
var canonical=input.canonicalAssumptions||{assumptions:[],omittedRecords:[]};
var assumptions=Array.isArray(canonical.assumptions)?canonical.assumptions:[];
var omissions=Array.isArray(canonical.omittedRecords)?canonical.omittedRecords:[];
var draft=input.assumptionDraft||{};
function cell(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\|/g,'&#124;').replace(/\r?\n/g,'<br>');}
var lines=['# Statement-generation assumptions','','These are implementation decisions, not a claim of comparison with the COBOL oracle. Source: creastmt-sonnet.pdf.','','## Authoritative decisions','','| What was assumed | Wiki statement or absence |','| --- | --- |'];
assumptions.forEach(function(a){lines.push('| '+cell(a.whatAssumed)+' | '+cell(a.wikiBasis)+' |');});
lines.push('','## Omitted records','','| File | Line | Reason |','| --- | --- | --- |');
omissions.forEach(function(r){lines.push('| '+cell(r.fileName)+' | '+cell(r.lineNumber)+' | '+cell(r.reason)+' |');});
if(!omissions.length)lines.push('','No records omitted.');
var errors=Array.isArray(input.batchErrors)?input.batchErrors:[];
if(errors.length){lines.push('','## Batch input errors','','| File | Reason |','| --- | --- |');errors.forEach(function(e){lines.push('| '+cell(e.fileName)+' | '+cell(e.reason)+' |');});}
if(Array.isArray(draft.assumptions)&&draft.assumptions.length){lines.push('','## Supplemental model explanations','','These explanations do not replace or modify the authoritative decisions above.','','| What was assumed | Wiki statement or absence |','| --- | --- |');draft.assumptions.forEach(function(a){if(a&&typeof a.whatAssumed==='string'&&typeof a.wikiBasis==='string')lines.push('| '+cell(a.whatAssumed)+' | '+cell(a.wikiBasis)+' |');});}else{lines.push('','Explanatory drafting was unavailable; the complete authoritative decisions and omissions are retained above.');}
output={statementFiles:{creastmt_statements:Array.isArray(input.statementLines)?input.statementLines:[],creastmt_statements_html:Array.isArray(input.htmlLines)?input.htmlLines:[],'assumptions.md':lines.join('\n')+'\n',assumptions:assumptions,omittedRecords:omissions,status:input.batchStatus||'FAILED',errors:errors}};
```

### Draft assumptions failed (SCRIPT, id=6ae0a61cad7ea9e18be431ec)

```javascript
output = {"assumptionDraft": {}};

```

_(server: 222 ms, 1 API call, 200 ms in API)_
