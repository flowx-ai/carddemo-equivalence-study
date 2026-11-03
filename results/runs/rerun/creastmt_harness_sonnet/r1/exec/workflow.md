# Workflow: GenerateCardDemoStatements

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** 

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae09ecaad7ea9e18be427af | <uuid> | (0, 0) | → Generate statements (seq:<uuid>) |
| End | END | 6ae09ecaad7ea9e18be427b0 | <uuid> | (1200, 0) | — |
| Generate statements | SCRIPT | 6ae09ecaad7ea9e18be427b1 | <uuid> | (300, 0) | → Draft assumptions (seq:<uuid>) | lang: JAVASCRIPT |
| Draft assumptions | AI | 6ae09ecaad7ea9e18be427b2 | <uuid> | (600, 0) | → Assemble results [SUCCESS] (seq:<uuid>), → Draft assumptions failed [FAIL] (seq:<uuid>) | responseKey: assumptionDraft, aiType: TEXT_UNDERSTANDING, responseSchema: set |
| Assemble results | SCRIPT | 6ae09ecaad7ea9e18be427b3 | <uuid> | (900, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| Draft assumptions failed | SCRIPT | 6ae09ecaad7ea9e18be427b4 | <uuid> | (600, 200) | → Assemble results (seq:<uuid>) | lang: JAVASCRIPT |

## Systems
_(none)_

## AI prompts

### Draft assumptions (TEXT_UNDERSTANDING, id=6ae09ecaad7ea9e18be427b2)
instructions:

```
Prepare the CardDemo statement implementation decision log. You are given reviewed decisions and wiki excerpts with page references. Return an object with assumptions, an array containing exactly the supplied reviewed assumption records in exactly their supplied order. Each record must have separate whatWasAssumed and wikiStatementOrAbsence string properties. Copy their reviewed wording exactly, including page references and explicit absences. Do not invent source claims, decisions, fields, commentary or implementation rules. The excerpts support the existing records, not permission to change them. No customer or transaction data is supplied or needed.
```
userMessage:

```
Reviewed decisions and relevant wiki excerpts:
${assumptionFacts}
```
exampleOutputJsonSchema:

```
{"title":"Response","type":"object","properties":{"assumptions":{"type":"array","items":{"type":"object","properties":{"whatWasAssumed":{"type":"string"},"wikiStatementOrAbsence":{"type":"string"}},"required":["whatWasAssumed","wikiStatementOrAbsence"],"additionalProperties":false}}},"required":["assumptions"],"additionalProperties":false}
```

## Scripts

### Generate statements (SCRIPT, id=6ae09ecaad7ea9e18be427b1)

```javascript
// Source: creastmt-sonnet.pdf pp.2-4,6-9,13,21,26-29.
// No clock, external calls, floating-point currency addition, or input mutations.
var decisions = [
 {whatWasAssumed:'Field offsets follow the field order and widths listed in the wiki; full copybooks were not provided.',wikiStatementOrAbsence:'creastmt-sonnet.pdf pp.6-9 list CVACT01Y, CVCUS01Y, CVACT03Y and CVTRA05Y fields and widths. CONTRACT.md p.26 names CUSTREC for the customer input; the full CUSTREC layout is absent, so the listed customer layout is used.'},
 {whatWasAssumed:'Signed display amounts contain implied cents; ordinary final digits are positive, {ABCDEFGHI encode positive final digits 0-9, and }JKLMNOPQR encode negative final digits 0-9.',wikiStatementOrAbsence:'creastmt-sonnet.pdf pp.6,8 specify S9(10)V99 and S9(9)V99. Page 9 gives the signed-overpunch example 0150{ = 15.00 for another batch input; statement-input encoding is not separately specified.'},
 {whatWasAssumed:'Accept LF or CRLF record separators and one final record terminator; a present empty string is an empty file, not a missing file.',wikiStatementOrAbsence:'creastmt-sonnet.pdf p.26 says fixed-width text, one record per line. It does not specify line-ending encoding. Page 18 distinguishes not-found and empty file outcomes without defining statement-specific handling.'},
 {whatWasAssumed:'Ignore unused fields and filler, including non-printable filler bytes; validate only fields read by statement generation and accept records that contain those fields even if unused trailing filler is absent.',wikiStatementOrAbsence:'creastmt-sonnet.pdf p.6 says legacy FILLER is dropped. Pages 6-9 list many fields unused by the p.27-29 printed layouts; validation of those unused fields is not specified.'},
 {whatWasAssumed:'Create one statement per distinct cross-reference card, in ascending card-number order; include only transactions with that card number, sorted by transaction ID using character order.',wikiStatementOrAbsence:'creastmt-sonnet.pdf p.2 BR-01 says CardXref order (card number), BR-02 says card number + transaction id, and p.4 says one statement per card. Account-level transaction wording on pp.2,21 does not say whether other cards on the same account are included.'},
 {whatWasAssumed:'Use every transaction for the selected card without a date or cycle filter; business date does not change printed content.',wikiStatementOrAbsence:'creastmt-sonnet.pdf p.3 says legacy prints all transactions on file and leaves cycle filtering TODO. Pages 27-29 contain no statement-date output field; the date range on p.26 is for the separate daily report.'},
 {whatWasAssumed:'Trim spaces from each first, middle and last name, omit empty parts and join remaining parts with one space.',wikiStatementOrAbsence:'creastmt-sonnet.pdf p.7 lists three name fields. Page 4 requires address-format verification, and p.21 leaves exact line layouts TODO; neither specifies name assembly.'},
 {whatWasAssumed:'Trim address lines 1 and 2 separately; join trimmed customer address line 3, state and ZIP with single spaces for the third printed address line; do not append country.',wikiStatementOrAbsence:'creastmt-sonnet.pdf p.7 lists three address lines, state, country and ZIP. Page 21 describes address (3 lines, state, zip). Pages 27-28 reserve three address lines but do not define assembly or use of country.'},
 {whatWasAssumed:'Preserve account and customer identifiers as digit strings and card and transaction identifiers as text; print account leading zeros and FICO digits unchanged, with an all-space optional FICO field printed blank.',wikiStatementOrAbsence:'creastmt-sonnet.pdf pp.6-8 specify fixed-width identifiers; p.7 marks FICO optional and gives a three-digit field. Page 27 prints account ID and FICO as X(20), without a conversion rule.'},
 {whatWasAssumed:'Use the exact contract lines, including repeated rules; do not add phone, statement date, credit limit, cycle balances, an HTML expenditure total, or any PDF content.',wikiStatementOrAbsence:'creastmt-sonnet.pdf p.21 lists broader plugin content and mentions PDF as new. Pages 27-29 prescribe the statement output lines; the HTML closing block has no total line.'},
 {whatWasAssumed:'Escape &, <, >, double quote and apostrophe in HTML field values before applying field and record widths; retain literal contract markup and pad or truncate each complete HTML record to 100 characters.',wikiStatementOrAbsence:'creastmt-sonnet.pdf pp.27-29 fix literal HTML lines and 100-column records but do not state escaping or overflow rules. Text fields are truncated and space-padded to their declared X(n) widths.'},
 {whatWasAssumed:'Retain the first occurrence of duplicate account IDs, customer IDs, cross-reference card numbers, or card-plus-transaction-ID keys, and report later occurrences; do not aggregate duplicate transactions.',wikiStatementOrAbsence:'creastmt-sonnet.pdf pp.6-8 identify primary keys; p.2 specifies the composite statement transaction key. Duplicate input behaviour is not specified.'},
 {whatWasAssumed:'Report malformed consumed fields or missing related records individually; omit statements affected by unusable transactions or account/customer data, continue unrelated cards, and ignore transaction contents for cards that have no cross-reference.',wikiStatementOrAbsence:'creastmt-sonnet.pdf pp.16,18,20 describe not-found and error integration results, but no complete statement-specific recovery rule. Page 2 makes cross-references the statement driver. The statement does not read nonmatching transaction payloads.'},
 {whatWasAssumed:'All four named inputs must be present as text; a missing input prevents statement generation. Empty cross-reference input returns empty outputs; a valid card with no transactions still gets a statement with a zero text total.',wikiStatementOrAbsence:'creastmt-sonnet.pdf p.26 names four statement input files. Page 18 leaves per-program file status handling TODO. Page 4 explicitly requires a zero-total statement for a card without transactions; it is silent about an empty driver file.'},
 {whatWasAssumed:'Calculate and sum exact integer cents; render negative amounts with a trailing minus, suppress integer zeroes for Z pictures, and report unrepresentable printed amounts rather than rounding or wrapping.',wikiStatementOrAbsence:'creastmt-sonnet.pdf p.2 BR-03 and p.4 require the sum of transaction amounts. Page 27 defines the numeric pictures and trailing sign; overflow handling is unstated.'},
 {whatWasAssumed:'Return the fixed reviewed decision records and render Markdown with a separate assumption and wiki-basis section per entry; AI drafting cannot alter these records, the statements, or the errors.',wikiStatementOrAbsence:'Maker requested each implementation decision and its wiki basis, then accepted file contents and returned outputs. The wiki does not define an assumptions-document generator. Implementation default: compare model drafts against the reviewed records and fall back on any difference or failure.'}
];
var excerpts = [
 {source:'creastmt-sonnet.pdf p.2',quote:'Statement driven by CardXref order (card number)'},
 {source:'creastmt-sonnet.pdf p.2',quote:'Transactions are keyed by card number + transaction id'},
 {source:'creastmt-sonnet.pdf p.3',quote:'legacy prints all transactions on file; confirm cycle filter requirement'},
 {source:'creastmt-sonnet.pdf p.4',quote:'Card without transactions'},
 {source:'creastmt-sonnet.pdf p.4',quote:'Statement with zero total'},
 {source:'creastmt-sonnet.pdf p.9',quote:'seed file stores signed overpunch (0150{ = 15.00)'},
 {source:'creastmt-sonnet.pdf p.21',quote:'SSN is not printed.'},
 {source:'creastmt-sonnet.pdf p.21',quote:'confirm the exact statement line layouts in CBSTM03A (not analyzed in detail).'},
 {source:'creastmt-sonnet.pdf p.26',quote:'Trailing spaces may be omitted.'}
];
var errors = [];
function issue(file, recordNumber, cardNumber, message) { errors.push({file:file,recordNumber:recordNumber,cardNumber:cardNumber || null,message:String(message)}); }
function right(s) { return String(s).replace(/ +$/,''); }
function trim(s) { return String(s).replace(/^ +| +$/g,''); }
function field(s,n) { s=String(s); return s.slice(0,n) + ' '.repeat(Math.max(0,n-s.length)); }
function compare(a,b) { return a<b?-1:(a>b?1:0); }
function joined(parts) { return parts.map(trim).filter(function(x){return x!=='';}).join(' '); }
function digits(s,n,label) { if(s.length!==n || !/^[0-9]+$/.test(s)) throw new Error('Invalid '+label); return s; }
function take(s,a,n,label) { if(s.length<a+n) throw new Error('Missing '+label); return s.slice(a,a+n); }
function money(s,n) {
 if(s.length!==n) throw new Error('Incomplete amount');
 var positive='{ABCDEFGHI', negative='}JKLMNOPQR', last=s.charAt(n-1), sign=1, digit=last;
 if(positive.indexOf(last)>=0) digit=String(positive.indexOf(last));
 else if(negative.indexOf(last)>=0) {digit=String(negative.indexOf(last));sign=-1;}
 var raw=s.slice(0,n-1)+digit;
 if(!/^[0-9]+$/.test(raw)) throw new Error('Invalid signed display amount');
 return sign*Number(raw);
}
function picture(cents,zeroFilled) {
 if(!Number.isSafeInteger(cents) || Math.abs(cents)>99999999999) throw new Error('Amount exceeds printed 9(9).99- / Z(9).99- width');
 var a=Math.abs(cents), whole=String(Math.floor(a/100)), fraction=String(a%100).padStart(2,'0');
 if(zeroFilled) whole=whole.padStart(9,'0');
 else {if(whole==='0') whole=''; whole=whole.padStart(9,' ');}
 return whole+'.'+fraction+(cents<0?'-':' ');
}
function escaped(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
var fileNames=['transact.dat','acctdata.dat','cardxref.dat','custdata.dat'];
var files=input && input.files && typeof input.files==='object'?input.files:{};
var missing=false, records=Object.create(null);
fileNames.forEach(function(name){
 if(!Object.prototype.hasOwnProperty.call(files,name) || typeof files[name]!=='string') {
  issue(name,0,null,'Required input file is missing or is not text'); missing=true; records[name]=[];
 } else {
  var text=files[name]; var lines=text===''?[]:text.split(/\r?\n/);
  if(lines.length && lines[lines.length-1]==='') lines.pop();
  records[name]=lines;
 }
});
var accountMap=Object.create(null), customerMap=Object.create(null), xrefMap=Object.create(null), transactionMap=Object.create(null), badCards=Object.create(null);
function master(name,map,parse,keyWidth) {
 records[name].forEach(function(line,index){
  var key=line.slice(0,keyWidth);
  if(Object.prototype.hasOwnProperty.call(map,key)) {issue(name,index+1,null,'Duplicate key; first occurrence retained');return;}
  map[key]={valid:false,recordNumber:index+1};
  try {var value=parse(line);value.valid=true;value.recordNumber=index+1;map[key]=value;}
  catch(e) {issue(name,index+1,null,e.message);}
 });
}
if(!missing) {
 master('acctdata.dat',accountMap,function(line){return {accountId:digits(take(line,0,11,'account ID'),11,'account ID'),balance:money(take(line,12,12,'current balance'),12)};},11);
 master('custdata.dat',customerMap,function(line){
  var id=digits(take(line,0,9,'customer ID'),9,'customer ID');
  var name=joined([take(line,9,25,'first name'),take(line,34,25,'middle name'),take(line,59,25,'last name')]);
  var a1=trim(take(line,84,50,'address line 1')), a2=trim(take(line,134,50,'address line 2'));
  var a3=joined([take(line,184,50,'address line 3'),take(line,234,2,'state'),take(line,239,10,'ZIP')]);
  var fico=take(line,329,3,'FICO score'); if(!/^(?:[0-9]{3}| {3})$/.test(fico)) throw new Error('Invalid FICO digits');
  return {customerId:id,name:name,address1:a1,address2:a2,address3:a3,fico:right(fico)};
 },9);
 records['cardxref.dat'].forEach(function(line,index){
  var card=line.slice(0,16);
  if(Object.prototype.hasOwnProperty.call(xrefMap,card)) {issue('cardxref.dat',index+1,card,'Duplicate card; first occurrence retained');return;}
  xrefMap[card]={valid:false,recordNumber:index+1};
  try {
   card=take(line,0,16,'card number');if(trim(card)==='') throw new Error('Blank card number');
   xrefMap[card]={valid:true,recordNumber:index+1,cardNumber:card,customerId:digits(take(line,16,9,'customer ID'),9,'customer ID'),accountId:digits(take(line,25,11,'account ID'),11,'account ID')};
  } catch(e) {issue('cardxref.dat',index+1,card,e.message);badCards[card]=true;}
 });
 records['transact.dat'].forEach(function(line,index){
  var card=line.slice(262,278);
  if(line.length<278) {issue('transact.dat',index+1,card,'Record lacks the consumed card-number field');return;}
  if(!Object.prototype.hasOwnProperty.call(xrefMap,card)) return;
  var id=line.slice(0,16), key=card+'|'+id;
  if(Object.prototype.hasOwnProperty.call(transactionMap,key)) {issue('transact.dat',index+1,card,'Duplicate card and transaction ID; first occurrence retained');return;}
  transactionMap[key]={valid:false,cardNumber:card};
  try {
   if(trim(id)==='') throw new Error('Blank transaction ID');
   var amount=money(take(line,132,11,'transaction amount'),11);picture(amount,false);
   transactionMap[key]={valid:true,cardNumber:card,transactionId:id,description:right(take(line,32,100,'transaction description')),amount:amount,recordNumber:index+1};
  } catch(e) {badCards[card]=true;issue('transact.dat',index+1,card,e.message);}
 });
}
var textOutput=[], htmlOutput=[];
var byCard=Object.create(null);
Object.keys(transactionMap).forEach(function(k){var t=transactionMap[k];if(t.valid){if(!byCard[t.cardNumber])byCard[t.cardNumber]=[];byCard[t.cardNumber].push(t);}});
function makeText(x,a,c,transactions,total) {
 var lines=[];function add(s){lines.push(field(s,80));}
 var rule='-'.repeat(80);
 add('*'.repeat(31)+'START OF STATEMENT'+'*'.repeat(31));
 add(field(c.name,75));add(field(c.address1,50));add(field(c.address2,50));add(field(c.address3,80));
 add(rule);add(' '.repeat(33)+'Basic Details');add(rule);
 add(field('Account ID :',20)+field(x.accountId,20));
 add(field('Current Balance :',20)+picture(a.balance,true));
 add(field('FICO Score :',20)+field(c.fico,20));
 add(rule);add(' '.repeat(30)+'TRANSACTION SUMMARY');add(rule);
 add(field('Tran ID',16)+field('Tran Details',51)+field('Tran Amount',13));add(rule);
 transactions.forEach(function(t){add(field(t.transactionId,16)+' '+field(t.description,49)+'$'+picture(t.amount,false));});
 add(rule);add(field('Total EXP:',10)+' '.repeat(56)+'$'+picture(total,false));
 add('*'.repeat(32)+'END OF STATEMENT'+'*'.repeat(32));
 return lines;
}
function makeHtml(x,a,c,transactions) {
 var lines=[];function add(s){lines.push(field(s,100));}
 var acct=field(escaped(x.accountId),20), fico=field(escaped(c.fico),20);
 add('<!DOCTYPE html>');add('<html lang="en">');add('<head>');add('<meta charset="utf-8">');add('<title>HTML Table Layout</title>');add('</head>');
 add('<body style="margin:0px;">');add('<table align="center" frame="box" style="width:70%; font:12px Segoe UI,sans-serif;">');
 add('<tr>');add('<td colspan="3" style="padding:0px 5px;background-color:#1d1d96b3;">');add('<h3>Statement for Account Number: '+acct+'</h3>');add('</td>');add('</tr>');
 add('<tr>');add('<td colspan="3" style="padding:0px 5px;background-color:#FFAF33;">');add('<p style="font-size:16px">Bank of XYZ</p>');add('<p>410 Terry Ave N</p>');add('<p>Seattle WA 99999</p>');add('</td>');add('</tr>');
 add('<tr>');add('<td colspan="3" style="padding:0px 5px;background-color:#f2f2f2;">');
 add('<p style="font-size:16px">'+escaped(c.name)+' </p>');add('<p>'+escaped(c.address1)+' </p>');add('<p>'+escaped(c.address2)+' </p>');add('<p>'+escaped(c.address3)+' </p>');add('</td>');add('</tr>');
 add('<tr>');add('<td colspan="3" style="padding:0px 5px;background-color:#33FFD1; text-align:center;">');add('<p style="font-size:16px">Basic Details</p>');add('</td>');add('</tr>');
 add('<tr>');add('<td colspan="3" style="padding:0px 5px;background-color:#f2f2f2;">');add('<p>Account ID : '+acct+'</p>');add('<p>Current Balance : '+picture(a.balance,true)+'</p>');add('<p>FICO Score : '+fico+'</p>');add('</td>');add('</tr>');
 add('<tr>');add('<td colspan="3" style="padding:0px 5px;background-color:#33FFD1; text-align:center;">');add('<p style="font-size:16px">Transaction Summary</p>');add('</td>');add('</tr>');
 add('<tr>');add('<td style="width:25%; padding:0px 5px; background-color:#33FF5E; text-align:left;">');add('<p style="font-size:16px">Tran ID</p>');add('</td>');
 add('<td style="width:55%; padding:0px 5px; background-color:#33FF5E; text-align:left;">');add('<p style="font-size:16px">Tran Details</p>');add('</td>');
 add('<td style="width:20%; padding:0px 5px; background-color:#33FF5E; text-align:right;">');add('<p style="font-size:16px">Amount</p>');add('</td>');add('</tr>');
 transactions.forEach(function(t){
  add('<tr>');add('<td style="width:25%; padding:0px 5px; background-color:#f2f2f2; text-align:left;">');add('<p>'+field(escaped(t.transactionId),16)+'</p>');add('</td>');
  add('<td style="width:55%; padding:0px 5px; background-color:#f2f2f2; text-align:left;">');add('<p>'+field(escaped(t.description),49)+'</p>');add('</td>');
  add('<td style="width:20%; padding:0px 5px; background-color:#f2f2f2; text-align:right;">');add('<p>'+picture(t.amount,false)+'</p>');add('</td>');add('</tr>');
 });
 add('<tr>');add('<td colspan="3" style="padding:0px 5px;background-color:#1d1d96b3;">');add('<h3>End of Statement</h3>');add('</td>');add('</tr>');add('</table>');add('</body>');add('</html>');
 return lines;
}
if(!missing) Object.keys(xrefMap).sort(compare).forEach(function(card){
 var x=xrefMap[card];if(!x.valid || badCards[card])return;
 var a=accountMap[x.accountId],c=customerMap[x.customerId];
 if(!a || !a.valid) {issue('cardxref.dat',x.recordNumber,card,'Referenced account is missing or unusable');return;}
 if(!c || !c.valid) {issue('cardxref.dat',x.recordNumber,card,'Referenced customer is missing or unusable');return;}
 var transactions=(byCard[card]||[]).slice().sort(function(l,r){return compare(l.transactionId,r.transactionId);}),total=0;
 try {
  transactions.forEach(function(t){total+=t.amount;if(!Number.isSafeInteger(total))throw new Error('Expenditure total exceeds exact integer range');});
  picture(total,false);picture(a.balance,true);
  var textLines=makeText(x,a,c,transactions,total),htmlLines=makeHtml(x,a,c,transactions);
  textOutput=textOutput.concat(textLines);htmlOutput=htmlOutput.concat(htmlLines);
 } catch(e) {issue('cardxref.dat',x.recordNumber,card,e.message);}
});
output={statementDraft:{creastmt_statements:textOutput,creastmt_statements_html:htmlOutput,errors:errors},assumptionFacts:{assumptions:decisions,wikiExcerpts:excerpts}};
```

### Assemble results (SCRIPT, id=6ae09ecaad7ea9e18be427b3)

```javascript
var facts=input.assumptionFacts||{}, reviewed=Array.isArray(facts.assumptions)?facts.assumptions:[];
var candidate=(input.assumptionDraft||{}).assumptions;
var equal=Array.isArray(candidate)&&candidate.length===reviewed.length;
if(equal) for(var i=0;i<reviewed.length;i++) {
 var item=candidate[i];
 if(!item || Object.keys(item).length!==2 || item.whatWasAssumed!==reviewed[i].whatWasAssumed || item.wikiStatementOrAbsence!==reviewed[i].wikiStatementOrAbsence) {equal=false;break;}
}
var selected=(equal?candidate:reviewed).map(function(x){return {whatWasAssumed:x.whatWasAssumed,wikiStatementOrAbsence:x.wikiStatementOrAbsence};});
var markdown='# Statement generation assumptions\n\nThe following reviewed decisions apply to every run. They describe implementation choices, not observed oracle equivalence.\n';
selected.forEach(function(x,i){markdown+='\n## '+(i+1)+'\n\n### What was assumed\n\n'+x.whatWasAssumed+'\n\n### Wiki statement or absence\n\n'+x.wikiStatementOrAbsence+'\n';});
var statements=input.statementDraft||{};
output={statementResult:{creastmt_statements:statements.creastmt_statements||[],creastmt_statements_html:statements.creastmt_statements_html||[],assumptions:selected,'assumptions.md':markdown,errors:statements.errors||[]}};
```

### Draft assumptions failed (SCRIPT, id=6ae09ecaad7ea9e18be427b4)

```javascript
output = {"assumptionDraft": {}};

```

_(server: 195 ms, 1 API call, 180 ms in API)_
