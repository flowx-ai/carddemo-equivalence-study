# Workflow: GenerateCardStatements

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** 

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae491da3695c563ea5133cd | <uuid> | (0, 0) | → Build statements (seq:<uuid>) |
| End | END | 6ae491da3695c563ea5133ce | <uuid> | (1200, 0) | — |
| Build statements | SCRIPT | 6ae491da3695c563ea5133cf | <uuid> | (300, 0) | → Draft assumptions (seq:<uuid>) | lang: JAVASCRIPT |
| Draft assumptions | AI | 6ae491da3695c563ea5133d0 | <uuid> | (600, 0) | → Finalize outputs [SUCCESS] (seq:<uuid>), → Draft assumptions failed [FAIL] (seq:<uuid>) | responseKey: assumptionDraft, aiType: TEXT_UNDERSTANDING, responseSchema: set |
| Finalize outputs | SCRIPT | 6ae491da3695c563ea5133d1 | <uuid> | (900, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| Draft assumptions failed | SCRIPT | 6ae491da3695c563ea5133d2 | <uuid> | (600, 200) | → Finalize outputs (seq:<uuid>) | lang: JAVASCRIPT |

## Systems
_(none)_

## AI prompts

### Draft assumptions (TEXT_UNDERSTANDING, id=6ae491da3695c563ea5133d0)
instructions:

```
Produce only a JSON object with markdown. You document an implementation, not financial records. Your entire source is the fixed implementation assumption ledger supplied in the user message. Return its markdown field verbatim as markdown, preserving every assumption entry, identifier, citation and statement of source silence. Do not infer additional rules, omit entries, change choices or mention unseen customer data. Do not change outputs or invent original-copybook verification.
```
userMessage:

```
Implementation decision ledger and complete fallback document: ${assumptionLedger}
```
exampleOutputJsonSchema:

```
{"title":"Response","type":"object","properties":{"markdown":{"type":"string"}},"required":["markdown"],"additionalProperties":false}
```

## Scripts

### Build statements (SCRIPT, id=6ae491da3695c563ea5133cf)

```javascript
var entries = [
'A01 — Input boundary. The caller supplies file contents as transact, acctdata, cardxref and custdata; the returned line lists map to creastmt_statements.txt and creastmt_statements_html.txt and assumptions_md maps to assumptions.md. No filesystem write is performed here. Basis: creastmt-sonnet-yx3.pdf p.26 explicitly permits returned line lists; the wiki does not specify an available physical file connection.',
'A02 — Byte-layout interpretation. Original copybooks are absent. Offsets are zero-based, inferred from the listed field order and widths: account id 0/11 and balance 12/12; xref card 0/16, customer 16/9, account 25/11; transaction id 0/16, description 32/100, amount 132/11, card 262/16; customer id 0/9, first 9/25, middle 34/25, last 59/25, address1 84/50, address2 134/50, address3 184/50, state 234/2, country 236/3, ZIP 239/10, FICO 329/3. These offsets are NOT verified against original copybooks. Basis: creastmt-sonnet-yx3.pdf pp.6–9,25–26 list widths and layout names but do not supply original definitions.',
'A03 — Encoding and framing. Contents are single-byte-compatible text, not packed decimal or an EBCDIC byte stream. Split LF records and remove a single terminal CR per record; a final newline is not an additional record. Present empty contents are an empty dataset. Missing, null or non-string contents fail the run. Permit omitted unused trailing filler, require every consumed field to exist, and never validate unused filler bytes. A blank interior record is reported, not silently treated as EOF. Basis: creastmt-sonnet-yx3.pdf pp.25–26 specify fixed-width text records but do not settle encoding, newline conventions or shortened filler.',
'A04 — Numeric decoding and precision. Read unsigned identifiers as digit strings, preserving zeroes. Read amounts as implied-decimal signed DISPLAY, accepting numeric final digits or positive overpunch {ABCDEFGHI and negative overpunch }JKLMNOPQR. Compute and sum integer cents; never round parsed input. The nine-whole-digit output pictures must hold each balance, line amount and total, otherwise reject that card statement. Basis: creastmt-sonnet-yx3.pdf pp.6,8,27 specify signed source pictures and printed pictures, but not text-encoding or overflow behaviour.',
'A05 — Customer block. Join nonblank first, middle and last names with single spaces. Keep address lines one and two. Join third address line, state and ZIP with single spaces, without country. Trim field-edge spaces but preserve internal spaces; apply X-field truncation on output. Basis: maker-confirmed interpretation; creastmt-sonnet-yx3.pdf pp.7,21,27–28 list fields but leave assembly unspecified.',
'A06 — Selection and cycle. One statement per unique card cross-reference, ascending card number; select that card only, sort by transaction id and include all supplied transactions without a cycle filter. Do not consult carddata.dat or select another card on the same account. Basis: creastmt-sonnet-yx3.pdf p.2 BR-01/02 and p.26 statement inputs; p.3 leaves cycle filtering as a TODO, so no new filter is introduced.',
'A07 — Duplicate keys. Duplicate account ids, customer ids, card cross-references, or card-plus-transaction ids are ambiguous even if identical. Report them and skip the affected card rather than choose first or last. A transaction whose card key is unreadable is reported independently; valid unrelated cards continue. Basis: creastmt-sonnet-yx3.pdf pp.6–9 name keys but are silent about duplicate input records.',
'A08 — Partial failure. Missing accounts or customers, missing FICO, unreadable consumed fields and unusable numeric values prevent only the affected card statement. Do not fabricate balances, missing names or a FICO band. Invalid transactions with readable card keys invalidate that card so totals never silently omit them. Unrelated bad records are reported and valid cards continue. Missing whole files fail the run. Status is FAILED for missing files or no usable statements with errors, PARTIAL for errors beside usable statements, otherwise OK, including genuinely empty xrefs. Basis: maker-confirmed partial-failure policy; creastmt-sonnet-yx3.pdf pp.16,18,21 do not specify statement-specific join/field recovery.',
'A09 — FICO. Classify every readable three-digit score by the documented thresholds; do not impose an additional 300–850 rejection rule on this step. Blank or nondigit scores make the card unusable. Basis: creastmt-sonnet-yx3.pdf p.2 BR-07 supplies the five bands; p.7 describes an optional score and range, but statement behaviour for absent scores is unspecified.',
'A10 — Printed alignment and zero. Labels are left-aligned in their assigned fields; marker text touches its surrounding stars. The header fields occupy 16, 51 and 11 characters followed by two trailing spaces to reach 80. In Z(9).99-, zero renders nine spaces, .00 and a blank sign; current balance retains all nine zero digits. Zero-transaction cards still print separators and a zero total. Basis: creastmt-sonnet-yx3.pdf pp.4,27 specifies markers, pictures and column widths; its header wording leaves two columns unassigned.',
'A11 — HTML substitution. Preserve the exact contract tags and literal field substitution, without HTML-entity conversion. Trim customer-name padding in HTML; cap an inserted value to the lesser of its X width and the available 100-column line capacity, preserving closing tags. Every HTML line is space-padded to 100. Do not add a total, phone, date, credit limit, cycle totals or SSN absent from the contract blocks. Basis: creastmt-sonnet-yx3.pdf pp.27–29 fixes blocks but is silent about escaping and overlong substituted values; p.21 broader content does not override the contract.',
'A12 — Nonconsumed data and orphan transactions. Do not require unrelated account, customer or transaction fields to be valid; do not modify inputs or persistence. Report transactions with no supplied xref rather than generate additional statements. Basis: creastmt-sonnet-yx3.pdf pp.2,26 makes xrefs the driver and specifies isolated upstream inputs; orphan handling is unstated.',
'A13 — Documentation drafting. Draft assumptions only from this fixed ledger and its citations, never from customer records. Accept model markdown only if it is the complete fixed document; otherwise return the prewritten document unchanged. Basis: maker requires every implementation assumption and its source alongside outputs; the wiki specifies no documentation-generation mechanism.'
];
var markdown = '# Statement-generation assumptions\n\n' + entries.join('\n\n') + '\n';
var ledger = {entries:entries, markdown:markdown};
var result = {creastmt_statements:[], creastmt_statements_html:[], assumptions_md:markdown, status:'OK', errors:[]};
function err(file,row,card,message){result.errors.push({file:file,row:row,cardNumber:card || '',message:String(message)});}
function trim(s){return String(s).replace(/^ +| +$/g,'');}
function repeat(s,n){return new Array(n+1).join(s);}
function field(s,p,n){if(s.length<p+n){throw new Error('Consumed field truncated at column '+(p+1));}return s.substr(p,n);}
function text(s,p,n){var v=field(s,p,n);if(/[\x00-\x1F\x7F]/.test(v)){throw new Error('Nonprintable consumed text at column '+(p+1));}return trim(v);}
function digits(s,p,n){var v=field(s,p,n);if(!/^\d+$/.test(v)){throw new Error('Invalid digit identifier at column '+(p+1));}return v;}
function cents(v){var pos='{ABCDEFGHI',neg='}JKLMNOPQR',last=v.charAt(v.length-1),i=pos.indexOf(last),sign=1;if(i>=0){v=v.substr(0,v.length-1)+String(i);}else{i=neg.indexOf(last);if(i>=0){v=v.substr(0,v.length-1)+String(i);sign=-1;}}if(!/^\d+$/.test(v)){throw new Error('Invalid signed DISPLAY amount');}var n=Number(v)*sign;if(!Number.isSafeInteger(n)){throw new Error('Amount outside exact integer-cent range');}return n;}
function picture(n,zeroes){if(!Number.isSafeInteger(n)||Math.abs(n)>99999999999){throw new Error('Amount exceeds output 9(9).99- picture');}var a=Math.abs(n),whole=String(Math.floor(a/100)),fraction=String(a%100);if(fraction.length<2){fraction='0'+fraction;}if(zeroes){whole=repeat('0',9-whole.length)+whole;}else{if(a<100){whole='';}whole=repeat(' ',9-whole.length)+whole;}return whole+'.'+fraction+(n<0?'-':' ');}
function x(s,n){s=String(s);return s.substr(0,n)+repeat(' ',Math.max(0,n-s.length));}
function band(v){if(!/^\d{3}$/.test(v)){throw new Error('Missing or unreadable FICO score');}var n=Number(v);return n<580?'Poor':n<670?'Fair':n<740?'Good':n<800?'Very Good':'Exceptional';}
function lines(value){if(value===''){return [];}var a=value.split('\n');if(a.length&&a[a.length-1]===''){a.pop();}for(var i=0;i<a.length;i++){if(a[i].slice(-1)==='\r'){a[i]=a[i].slice(0,-1);}}return a;}
var missing=false;
['transact','acctdata','cardxref','custdata'].forEach(function(k){if(typeof input[k]!=='string'){missing=true;err(k+'.dat',0,'','Required input contents missing or not text');}});
var accounts=Object.create(null),customers=Object.create(null),xrefs=Object.create(null),txs=Object.create(null),badCards=Object.create(null),txKeys=Object.create(null);
function put(map,key,value,file,row,card){if(Object.prototype.hasOwnProperty.call(map,key)){map[key]=null;err(file,row,card,'Duplicate input key '+key);}else{map[key]=value;}}
if(!missing){
lines(input.acctdata).forEach(function(s,i){var key='';try{key=digits(s,0,11);var value={id:key,balance:cents(field(s,12,12))};put(accounts,key,value,'acctdata.dat',i+1,'');}catch(e){if(key){accounts[key]=null;}err('acctdata.dat',i+1,'',e.message);}});
lines(input.custdata).forEach(function(s,i){var key='';try{key=digits(s,0,9);var name=[text(s,9,25),text(s,34,25),text(s,59,25)].filter(function(v){return v!=='';}).join(' ');if(!name){throw new Error('Missing customer name');}var value={id:key,name:name,address1:text(s,84,50),address2:text(s,134,50),address3:[text(s,184,50),text(s,234,2),text(s,239,10)].filter(function(v){return v!=='';}).join(' '),fico:band(field(s,329,3))};put(customers,key,value,'custdata.dat',i+1,'');}catch(e){if(key){customers[key]=null;}err('custdata.dat',i+1,'',e.message);}});
lines(input.cardxref).forEach(function(s,i){var card='';try{card=digits(s,0,16);var value={card:card,customer:digits(s,16,9),account:digits(s,25,11)};put(xrefs,card,value,'cardxref.dat',i+1,card);if(xrefs[card]===null){badCards[card]=true;}}catch(e){if(card){badCards[card]=true;}err('cardxref.dat',i+1,card,e.message);}});
lines(input.transact).forEach(function(s,i){var card='';try{card=digits(s,262,16);var id=text(s,0,16);if(!id){throw new Error('Missing transaction identifier');}var value={id:id,description:text(s,32,100),amount:cents(field(s,132,11))};var key=card+id;if(Object.prototype.hasOwnProperty.call(txKeys,key)){badCards[card]=true;throw new Error('Duplicate card and transaction identifier');}txKeys[key]=true;if(!txs[card]){txs[card]=[];}txs[card].push(value);}catch(e){if(card){badCards[card]=true;}err('transact.dat',i+1,card,e.message);}});
Object.keys(txs).forEach(function(card){if(!Object.prototype.hasOwnProperty.call(xrefs,card)){err('transact.dat',0,card,'No cross-reference for transaction card');}});
function htmlLine(a){if(a.length>100){throw new Error('Internal HTML fixed line exceeds 100 columns');}return x(a,100);}
function hvalue(prefix,value,suffix,width){var room=100-prefix.length-suffix.length;return htmlLine(prefix+String(value).substr(0,Math.min(width,room))+suffix);}
Object.keys(xrefs).sort().forEach(function(card){var ref=xrefs[card];try{if(!ref||badCards[card]){throw new Error('Ambiguous or unusable card input');}var account=accounts[ref.account],customer=customers[ref.customer];if(!account){throw new Error('Missing or unusable account '+ref.account);}if(!customer){throw new Error('Missing or unusable customer '+ref.customer);}var transactions=(txs[card]||[]).slice().sort(function(a,b){return a.id<b.id?-1:a.id>b.id?1:0;});var total=0;transactions.forEach(function(t){picture(t.amount,false);total+=t.amount;if(!Number.isSafeInteger(total)){throw new Error('Total outside exact integer-cent range');}});var balance=picture(account.balance,true),totalText=picture(total,false),out=[],ht=[];
function t(s){if(s.length>80){throw new Error('Internal text line exceeds 80 columns');}out.push(x(s,80));}
t(repeat('*',31)+'START OF STATEMENT'+repeat('*',31));t(x(customer.name,75));t(x(customer.address1,50));t(x(customer.address2,50));t(x(customer.address3,80));t(repeat('-',80));t(repeat(' ',33)+'Basic Details');t(repeat('-',80));t(x('Account ID :',20)+x(ref.account,20));t(x('Current Balance :',20)+balance);t(x('FICO Score :',20)+x(customer.fico,20));t(repeat('-',80));t(repeat(' ',30)+'TRANSACTION SUMMARY');t(repeat('-',80));t(x('Tran ID',16)+x('Tran Details',51)+'Tran Amount');t(repeat('-',80));transactions.forEach(function(v){t(x(v.id,16)+' '+x(v.description,49)+'$'+picture(v.amount,false));});t(repeat('-',80));t(x('Total EXP:',10)+repeat(' ',56)+'$'+totalText);t(repeat('*',32)+'END OF STATEMENT'+repeat('*',32));
function h(s){ht.push(htmlLine(s));}
function hv(a,b,c,n){ht.push(hvalue(a,b,c,n));}
h('<!DOCTYPE html>');h('<html lang="en">');h('<head>');h('<meta charset="utf-8">');h('<title>HTML Table Layout</title>');h('</head>');h('<body style="margin:0px;">');h('<table align="center" frame="box" style="width:70%; font:12px Segoe UI,sans-serif;">');h('<tr>');h('<td colspan="3" style="padding:0px 5px;background-color:#1d1d96b3;">');hv('<h3>Statement for Account Number: ',x(ref.account,20),'</h3>',20);h('</td>');h('</tr>');h('<tr>');h('<td colspan="3" style="padding:0px 5px;background-color:#FFAF33;">');h('<p style="font-size:16px">Bank of XYZ</p>');h('<p>410 Terry Ave N</p>');h('<p>Seattle WA 99999</p>');h('</td>');h('</tr>');h('<tr>');h('<td colspan="3" style="padding:0px 5px;background-color:#f2f2f2;">');hv('<p style="font-size:16px">',customer.name,' </p>',75);hv('<p>',customer.address1,' </p>',50);hv('<p>',customer.address2,' </p>',50);hv('<p>',customer.address3,' </p>',80);h('</td>');h('</tr>');h('<tr>');h('<td colspan="3" style="padding:0px 5px;background-color:#33FFD1; text-align:center;">');h('<p style="font-size:16px">Basic Details</p>');h('</td>');h('</tr>');h('<tr>');h('<td colspan="3" style="padding:0px 5px;background-color:#f2f2f2;">');hv('<p>Account ID : ',x(ref.account,20),'</p>',20);hv('<p>Current Balance : ',balance,'</p>',13);hv('<p>FICO Score : ',x(customer.fico,20),'</p>',20);h('</td>');h('</tr>');h('<tr>');h('<td colspan="3" style="padding:0px 5px;background-color:#33FFD1; text-align:center;">');h('<p style="font-size:16px">Transaction Summary</p>');h('</td>');h('</tr>');h('<tr>');h('<td style="width:25%; padding:0px 5px; background-color:#33FF5E; text-align:left;">');h('<p style="font-size:16px">Tran ID</p>');h('</td>');h('<td style="width:55%; padding:0px 5px; background-color:#33FF5E; text-align:left;">');h('<p style="font-size:16px">Tran Details</p>');h('</td>');h('<td style="width:20%; padding:0px 5px; background-color:#33FF5E; text-align:right;">');h('<p style="font-size:16px">Amount</p>');h('</td>');h('</tr>');transactions.forEach(function(v){h('<tr>');h('<td style="width:25%; padding:0px 5px; background-color:#f2f2f2; text-align:left;">');hv('<p>',x(v.id,16),'</p>',16);h('</td>');h('<td style="width:55%; padding:0px 5px; background-color:#f2f2f2; text-align:left;">');hv('<p>',x(v.description,49),'</p>',49);h('</td>');h('<td style="width:20%; padding:0px 5px; background-color:#f2f2f2; text-align:right;">');hv('<p>',picture(v.amount,false),'</p>',13);h('</td>');h('</tr>');});h('<tr>');h('<td colspan="3" style="padding:0px 5px;background-color:#1d1d96b3;">');h('<h3>End of Statement</h3>');h('</td>');h('</tr>');h('</table>');h('</body>');h('</html>');result.creastmt_statements=result.creastmt_statements.concat(out);result.creastmt_statements_html=result.creastmt_statements_html.concat(ht);
}catch(e){err('statement',0,card,e.message);}});
}
if(missing){result.status='FAILED';}else if(result.errors.length){result.status=result.creastmt_statements.length?'PARTIAL':'FAILED';}
output={statementBatch:result,assumptionLedger:ledger};
```

### Finalize outputs (SCRIPT, id=6ae491da3695c563ea5133d1)

```javascript
var source=input.statementBatch||{creastmt_statements:[],creastmt_statements_html:[],assumptions_md:'',status:'FAILED',errors:[{file:'batch',row:0,cardNumber:'',message:'Statement calculation did not return a result'}]};var ledger=input.assumptionLedger||{entries:[],markdown:'# Statement-generation assumptions\n\nImplementation ledger unavailable; no successful batch can be certified.\n'};var draft=input.assumptionDraft||{};var fixed=String(ledger.markdown||'');var candidate=typeof draft.markdown==='string'?draft.markdown:'';var complete=candidate===fixed;(ledger.entries||[]).forEach(function(entry){if(candidate.indexOf(entry)<0){complete=false;}});output={finalStatementBatch:{creastmt_statements:source.creastmt_statements||[],creastmt_statements_html:source.creastmt_statements_html||[],assumptions_md:complete?candidate:fixed,status:source.status||'FAILED',errors:source.errors||[]}};
```

### Draft assumptions failed (SCRIPT, id=6ae491da3695c563ea5133d2)

```javascript
output = {"assumptionDraft": {}};

```

_(server: 208 ms, 1 API call, 183 ms in API)_
