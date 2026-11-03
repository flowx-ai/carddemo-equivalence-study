# Workflow: GenerateCardStatements

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** 

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6adf7e6b16836599f394797d | <uuid> | (0, 0) | → Build statements (seq:<uuid>) |
| End | END | 6adf7e6b16836599f394797e | <uuid> | (1200, 0) | — |
| Build statements | SCRIPT | 6adf7e6b16836599f394797f | <uuid> | (300, 0) | → Draft assumptions (seq:<uuid>) | lang: JAVASCRIPT |
| Draft assumptions | AI | 6adf7e6b16836599f3947980 | <uuid> | (600, 0) | → Validate outputs [SUCCESS] (seq:<uuid>), → Draft assumptions failed [FAIL] (seq:<uuid>) | responseKey: assumptionDraft, aiType: TEXT_UNDERSTANDING, responseSchema: set |
| Validate outputs | SCRIPT | 6adf7e6b16836599f3947981 | <uuid> | (900, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| Draft assumptions failed | SCRIPT | 6adf7e6b16836599f3947982 | <uuid> | (600, 200) | → Validate outputs (seq:<uuid>) | lang: JAVASCRIPT |

## Systems
_(none)_

## AI prompts

### Draft assumptions (TEXT_UNDERSTANDING, id=6adf7e6b16836599f3947980)
instructions:

```
Explain the supplied implementation assumption ledger, not the banking records or statements. Return exactly one object in assumptions per supplied entry, preserving assumptionId, whatAssumed, wikiBasis and sourceCitation byte-for-byte. Add a nonblank explanation that explains why the named assumption was needed and what uncertainty remains, using only that entry. Do not add or omit entries, do not add business rules or factual claims, and do not claim original-copybook or oracle verification. If wikiBasis describes silence, keep it explicit rather than pretending the wiki settles the matter. No tools and no outside knowledge. The first four properties are authoritative; only explanation is drafted.
```
userMessage:

```
Explain this complete implementation decision ledger: ${statementBatch.assumptions}
```
exampleOutputJsonSchema:

```
{"title":"Response","type":"object","additionalProperties":false,"required":["assumptions"],"properties":{"assumptions":{"type":"array","items":{"type":"object","additionalProperties":false,"required":["assumptionId","whatAssumed","wikiBasis","sourceCitation","explanation"],"properties":{"assumptionId":{"type":"string"},"whatAssumed":{"type":"string"},"wikiBasis":{"type":"string"},"sourceCitation":{"type":"string"},"explanation":{"type":"string"}}}}}}
```

## Scripts

### Build statements (SCRIPT, id=6adf7e6b16836599f394797f)

```javascript
var ledger = [];
function decision(id, assumed, basis, pages) { ledger.push({assumptionId:id,whatAssumed:assumed,wikiBasis:basis,sourceCitation:'creastmt-sonnet.pdf '+pages}); }
decision('input-layout-account','Infer contiguous account fields: ID [0,11), status [11,12), balance [12,24), credit limit [24,36), cash limit [36,48), dates [48,78), cycle credit/debit [78,102), ZIP [102,112), group [112,122), filler [122,300); offsets are zero-based and unverified against original copybooks.','The Account table lists these widths and order and says Legacy FILLER (178 bytes) is dropped; the original copybook is not supplied.','p.6');
decision('input-layout-customer','Treat CUSTREC as the listed CVCUS01Y layout: ID [0,9), first/middle/last [9,34),[34,59),[59,84), addresses [84,134),[134,184),[184,234), state [234,236), country [236,239), ZIP [239,249), phones [249,279), SSN [279,288), government ID [288,308), DOB [308,318), EFT [318,328), primary flag [328,329), FICO [329,332), remaining filler to 500; this is not verified copybook compatibility.','Customer table names CVCUS01Y and lists ordered field widths; the statement input contract instead names CUSTREC, without resolving that identity or supplying original offsets.','pp.7,26');
decision('input-layout-xref','Infer cross-reference card [0,16), customer [16,25), account [25,36), filler [36,50).','CardXref lists cardNumber String(16), customerId String(9), accountId String(11); CONTRACT.md specifies a 50-character record, not original copybook offsets.','pp.8,26');
decision('input-layout-transaction','Infer transaction ID [0,16), type [16,18), category [18,22), source [22,32), description [32,132), amount [132,143), merchant ID [143,152), merchant name [152,202), city [202,252), ZIP [252,262), card [262,278), timestamps [278,304),[304,330), filler [330,350).','The Transaction table gives these field widths and order; CONTRACT.md names CVTRA05Y and 350 characters but does not supply the original layout.','pp.8-9,26');
decision('file-envelope','Accept all four file contents as strings under files, return named line arrays and assumptions.md in one result, and do not create disk files.','The contract permits a list of strings under the output filename without its extension; the maker selected content-input and returned-output delivery.','p.26');
decision('record-encoding','Inputs are decoded ASCII-compatible strings; accept LF or CRLF and one optional final newline, reject non-ASCII characters, bare CR, internal blank records and wrong record lengths; empty but present files contain zero records.','CONTRACT.md says fixed-width text, one record per line, and specifies 350/300/50/500; text encoding, newline details and empty-file handling are otherwise silent.','p.26');
decision('money-decoding','Decode signed implied-decimal cents as unsigned digits or uppercase ASCII COBOL trailing overpunch ({ABCDEFGHI positive, }JKLMNOPQR negative); reject other encodings, use safe integer cents and canonicalize negative zero.','Account pictures are S9(10)V99 and transaction amount S9(9)V99; the wiki does not define the input-file sign encoding.','pp.6,8');
decision('identifier-display','Require numeric identifiers at their declared widths, preserve leading zeros in account/card/customer IDs, and print all three FICO characters (blank FICO prints blank); do not impose online active-status or FICO-range validation on statement input.','IDs are numeric fixed-width strings and FICO is 9(3) in the data tables; printed account and FICO use X(20), without a de-zeroing or range-validation rule for this batch.','pp.6-8,27');
decision('selection','Emit one statement per cross-reference sorted by card number; use only transactions with that exact card number, sorted by transaction ID, including all dates and statuses; transactions without a cross-reference are not selected, and unused account/customer rows produce no statement.','BR-01: Statement driven by CardXref order (card number); BR-02: Transactions are keyed by card number + transaction id; p.3 says legacy prints all transactions on file, with cycle filtering still a TODO.','pp.2-3');
decision('account-sharing','Cards sharing an account get separate statements containing only their own transactions, not the combined transactions of sibling cards.','The process loops For Each Card and calls GET_STATEMENT_DATA {cardNumber}; acceptance says One statement per card, while the plugin also uses the less precise phrase per card of the account.','pp.2,4,21');
decision('duplicates-and-missing','Fail the whole run for duplicate account/customer/card-cross-reference keys, duplicate card+transaction-ID keys, blank transaction IDs, missing referenced account/customer, invalid numeric syntax or unrepresentable money; never skip bad records or return partial statements.','The wiki identifies primary keys and joins, but gives no statement-specific malformed-record recovery; batch chain BR-02 says A failing step stops the chain.','pp.6-8,13,23');
decision('name-assembly','Trim field-edge spaces and join nonblank first, middle and last names with one space, preserving spaces inside each component; truncate the assembled name to 75 characters for text.','Customer fields are firstName, middleName and lastName; the contract gives customer name X(75) but no joining rule.','pp.7,27');
decision('address-assembly','Trim address fields; print customer addressLine1 and addressLine2 separately; join nonblank addressLine3, state and ZIP with one space for final address line, omitting country; do not add phone or SSN.','The plugin requires name, address (3 lines, state, zip), phone and states SSN is not printed; the controlling layout has exactly three address lines and no phone or country slot, and does not specify assembly.','pp.7,21,27-28');
decision('fixed-pictures','Use exactly nine integer digits plus point, two fractional digits and trailing minus/space in 13 columns; balance retains leading zeros, detail and total replace leading integer zeros with spaces (zero is nine spaces plus .00 and trailing space); reject magnitudes above 999999999.99 or unsafe integer sums.','CONTRACT.md defines 9(9).99- and Z(9).99- and fixes the 13-column positions; it does not state how overflow is handled.','p.27');
decision('text-layout','Use the supplied literal lines and repeated separators, right-pad each line to 80, truncate description to its X(49) slot, pad the column-heading line to 80, concatenate statements without blank lines or page breaks, and produce zero-total statements even with no transactions.','CONTRACT.md gives the printed line order and permits omitted trailing spaces; acceptance says Card without transactions: Statement with zero total, but does not specify inter-statement separators or long-field policy.','pp.4,27');
decision('html-layout','Use the literal HTML lines without added indentation, preserve specified X(20)/X(16)/X(49) field padding inside tags, use trimmed assembled name/address values for unspecified-width insertions, HTML-escape field values, then pad lines to 100; reject an insertion whose escaped line exceeds 100 rather than corrupt markup.','CONTRACT.md supplies fixed HTML lines and explicit pictures for some insertions but no escaping, indentation or oversized-insertion policy.','pp.27-29');
decision('html-documents-and-totals','Concatenate a complete HTML document for each card in cross-reference order; use its closing block even for zero transactions, and do not invent an HTML total block or extra phone/date/credit-limit fields.','The contract specifies one statement with a transaction block and closing block; unlike text it has no total line, despite the broader plugin content description.','pp.21,27-29');
decision('assumptions-drafting','Use a model only to explain this authoritative ledger, with no input records or statements; require one entry per decision, exact preservation of its assumption and source, and nonblank explanation; on drafting failure return an error and authoritative Markdown ledger, without statements.','The maker requires each decision and its wiki basis in assumptions.md; the wiki is silent about how that ledger is written or failures during its drafting.','pp.2-4,21,26');
decision('testing-limit','Synthetic tests use the inferred layouts, not observed legacy files, and independently expected printed lines must come from the contract; no oracle-equivalence claim is made.','The contract describes comparison to an oracle and step isolation, but the attachment contains no oracle runs, original copybooks or input datasets.','pp.25-26');
var batch={status:'FAILED',error:'Missing input files',assumptions:ledger,creastmt_statements:[],creastmt_statements_html:[]};
function fail(message){throw new Error(message);}
function trim(s){return s.replace(/^ +| +$/g,'');}
function field(s,width){return String(s).slice(0,width).padEnd(width,' ');}
function fixed(s,width){if(s.length>width)fail('Printed line exceeds '+width+' columns');return s.padEnd(width,' ');}
function digits(s,width,label){if(s.length!==width||!/^[0-9]+$/.test(s))fail('Invalid '+label);return s;}
function cents(s){var n=s;var sign=1;var last=n.charAt(n.length-1);var pos='{ABCDEFGHI'.indexOf(last);var neg='}JKLMNOPQR'.indexOf(last);if(pos>=0)n=n.slice(0,-1)+String(pos);else if(neg>=0){n=n.slice(0,-1)+String(neg);sign=-1;}if(!/^[0-9]+$/.test(n))fail('Invalid signed amount');var v=Number(n)*sign;if(!Number.isSafeInteger(v))fail('Unsafe amount');return v===0?0:v;}
function money(v,zeroFilled){if(!Number.isSafeInteger(v)||Math.abs(v)>99999999999)fail('Money exceeds printed picture');var a=Math.abs(v);var integer=String(Math.floor(a/100)).padStart(9,'0');if(!zeroFilled)integer=integer.replace(/^0+/g,function(m){return ' '.repeat(m.length);});return integer+'.'+String(a%100).padStart(2,'0')+(v<0?'-':' ');}
function records(files,key,width){if(!Object.prototype.hasOwnProperty.call(files,key)||typeof files[key]!=='string')fail('Missing or non-text '+key);var text=files[key];if(text==='')return [];if(/[^\x00-\x7f]/.test(text))fail('Non-ASCII input in '+key);text=text.replace(/\r\n/g,'\n');if(text.indexOf('\r')>=0)fail('Bare CR in '+key);var rows=text.split('\n');if(rows[rows.length-1]==='')rows.pop();rows.forEach(function(row,i){if(row.length!==width||/[\x00-\x1f\x7f]/.test(row))fail('Invalid record '+(i+1)+' in '+key);});return rows;}
function keyed(rows,keyFn){var map=Object.create(null);rows.forEach(function(row){var k=keyFn(row);if(Object.prototype.hasOwnProperty.call(map,k))fail('Duplicate lookup key');map[k]=row;});return map;}
function escapeHtml(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function para(s){return '<p>'+escapeHtml(s)+'</p>';}
try{
var files=input.files||{};
var tx=records(files,'transact.dat',350), ac=records(files,'acctdata.dat',300), xr=records(files,'cardxref.dat',50), cu=records(files,'custdata.dat',500);
var accounts=keyed(ac,function(r){return digits(r.slice(0,11),11,'account ID');});
var customers=keyed(cu,function(r){return digits(r.slice(0,9),9,'customer ID');});
keyed(xr,function(r){digits(r.slice(16,25),9,'xref customer ID');digits(r.slice(25,36),11,'xref account ID');return digits(r.slice(0,16),16,'xref card');});
var transactions=Object.create(null);var seen=Object.create(null);
tx.forEach(function(r){var card=digits(r.slice(262,278),16,'transaction card');var id=r.slice(0,16);if(trim(id)==='')fail('Blank transaction ID');var key=card+id;if(Object.prototype.hasOwnProperty.call(seen,key))fail('Duplicate card and transaction ID');seen[key]=true;var amount=cents(r.slice(132,143));money(amount,false);if(!transactions[card])transactions[card]=[];transactions[card].push({id:id,description:field(trim(r.slice(32,132)),49),amount:amount});});
Object.keys(transactions).forEach(function(k){transactions[k].sort(function(a,b){return a.id<b.id?-1:a.id>b.id?1:0;});});
var textLines=[],htmlLines=[];
function text(s){textLines.push(fixed(s,80));}
function html(s){htmlLines.push(fixed(s,100));}
xr.slice().sort(function(a,b){return a.slice(0,16)<b.slice(0,16)?-1:a.slice(0,16)>b.slice(0,16)?1:0;}).forEach(function(x){
var card=x.slice(0,16), customer=customers[x.slice(16,25)], account=accounts[x.slice(25,36)];if(!customer||!account)fail('Missing referenced customer or account');
var accountId=field(account.slice(0,11),20);var balance=money(cents(account.slice(12,24)),true);var fico=customer.slice(329,332);if(!/^(?:[0-9]{3}| {3})$/.test(fico))fail('Invalid FICO syntax');var ficoField=field(trim(fico),20);
var name=[trim(customer.slice(9,34)),trim(customer.slice(34,59)),trim(customer.slice(59,84))].filter(function(s){return s!=='';}).join(' ');
var address1=trim(customer.slice(84,134)),address2=trim(customer.slice(134,184));var address3=[trim(customer.slice(184,234)),trim(customer.slice(234,236)),trim(customer.slice(239,249))].filter(function(s){return s!=='';}).join(' ');
var lines=transactions[card]||[],total=0;lines.forEach(function(t){total+=t.amount;if(!Number.isSafeInteger(total))fail('Unsafe sum');});money(total,false);
text('*'.repeat(31)+'START OF STATEMENT'+'*'.repeat(31));
text(field(name,75));text(field(address1,50));text(field(address2,50));text(field(address3,80));
text('-'.repeat(80));text(' '.repeat(33)+'Basic Details');text('-'.repeat(80));
text(field('Account ID :',20)+accountId);text(field('Current Balance :',20)+balance);text(field('FICO Score :',20)+ficoField);
text('-'.repeat(80));text(' '.repeat(30)+'TRANSACTION SUMMARY');text('-'.repeat(80));text(field('Tran ID',16)+field('Tran Details',51)+'Tran Amount');text('-'.repeat(80));
lines.forEach(function(t){text(field(t.id,16)+' '+t.description+'$'+money(t.amount,false));});
text('-'.repeat(80));text(field('Total EXP:',10)+' '.repeat(56)+'$'+money(total,false));text('*'.repeat(32)+'END OF STATEMENT'+'*'.repeat(32));
[
'<!DOCTYPE html>',
'<html lang="en">',
'<head>',
'<meta charset="utf-8">',
'<title>HTML Table Layout</title>',
'</head>',
'<body style="margin:0px;">',
'<table align="center" frame="box" style="width:70%; font:12px Segoe UI,sans-serif;">',
'<tr>',
'<td colspan="3" style="padding:0px 5px;background-color:#1d1d96b3;">',
'<h3>Statement for Account Number: '+escapeHtml(accountId)+'</h3>',
'</td>',
'</tr>',
'<tr>',
'<td colspan="3" style="padding:0px 5px;background-color:#FFAF33;">',
'<p style="font-size:16px">Bank of XYZ</p>',
'<p>410 Terry Ave N</p>',
'<p>Seattle WA 99999</p>',
'</td>',
'</tr>',
'<tr>',
'<td colspan="3" style="padding:0px 5px;background-color:#f2f2f2;">',
'<p style="font-size:16px">'+escapeHtml(name)+' </p>',
'<p>'+escapeHtml(address1)+' </p>',
'<p>'+escapeHtml(address2)+' </p>',
'<p>'+escapeHtml(address3)+' </p>',
'</td>',
'</tr>',
'<tr>',
'<td colspan="3" style="padding:0px 5px;background-color:#33FFD1; text-align:center;">',
'<p style="font-size:16px">Basic Details</p>',
'</td>',
'</tr>',
'<tr>',
'<td colspan="3" style="padding:0px 5px;background-color:#f2f2f2;">',
para('Account ID : '+accountId),
para('Current Balance : '+balance),
para('FICO Score : '+ficoField),
'</td>',
'</tr>',
'<tr>',
'<td colspan="3" style="padding:0px 5px;background-color:#33FFD1; text-align:center;">',
'<p style="font-size:16px">Transaction Summary</p>',
'</td>',
'</tr>',
'<tr>',
'<td style="width:25%; padding:0px 5px; background-color:#33FF5E; text-align:left;">',
'<p style="font-size:16px">Tran ID</p>',
'</td>',
'<td style="width:55%; padding:0px 5px; background-color:#33FF5E; text-align:left;">',
'<p style="font-size:16px">Tran Details</p>',
'</td>',
'<td style="width:20%; padding:0px 5px; background-color:#33FF5E; text-align:right;">',
'<p style="font-size:16px">Amount</p>',
'</td>',
'</tr>'
].forEach(html);
lines.forEach(function(t){[
'<tr>',
'<td style="width:25%; padding:0px 5px; background-color:#f2f2f2; text-align:left;">',
para(field(t.id,16)),
'</td>',
'<td style="width:55%; padding:0px 5px; background-color:#f2f2f2; text-align:left;">',
para(t.description),
'</td>',
'<td style="width:20%; padding:0px 5px; background-color:#f2f2f2; text-align:right;">',
para(money(t.amount,false)),
'</td>',
'</tr>'
].forEach(html);});
['<tr>','<td colspan="3" style="padding:0px 5px;background-color:#1d1d96b3;">','<h3>End of Statement</h3>','</td>','</tr>','</table>','</body>','</html>'].forEach(html);
});
batch={status:'OK',error:'',assumptions:ledger,creastmt_statements:textLines,creastmt_statements_html:htmlLines};
}catch(e){batch.error=String(e.message||e);}
output={statementBatch:batch};
```

### Validate outputs (SCRIPT, id=6adf7e6b16836599f3947981)

```javascript
var b=input.statementBatch||{};var ledger=Array.isArray(b.assumptions)?b.assumptions:[];var draft=input.assumptionDraft||{};var rows=Array.isArray(draft.assumptions)?draft.assumptions:[];var valid=ledger.length>0&&rows.length===ledger.length;var seen=Object.create(null);var byId=Object.create(null);rows.forEach(function(r){if(!r||typeof r.assumptionId!=='string'||seen[r.assumptionId]){valid=false;return;}seen[r.assumptionId]=true;byId[r.assumptionId]=r;});var verified=ledger.map(function(a){var r=byId[a.assumptionId];if(!r||r.whatAssumed!==a.whatAssumed||r.wikiBasis!==a.wikiBasis||r.sourceCitation!==a.sourceCitation||typeof r.explanation!=='string'||r.explanation.trim()===''){valid=false;return {assumptionId:a.assumptionId,whatAssumed:a.whatAssumed,wikiBasis:a.wikiBasis,sourceCitation:a.sourceCitation,explanation:'Drafting unavailable or incomplete; the authoritative assumption and evidence are retained.'};}return {assumptionId:a.assumptionId,whatAssumed:a.whatAssumed,wikiBasis:a.wikiBasis,sourceCitation:a.sourceCitation,explanation:r.explanation};});
var text=Array.isArray(b.creastmt_statements)?b.creastmt_statements:[];var html=Array.isArray(b.creastmt_statements_html)?b.creastmt_statements_html:[];var widths=text.every(function(s){return typeof s==='string'&&s.length===80&&!/[\r\n]/.test(s);})&&html.every(function(s){return typeof s==='string'&&s.length===100&&!/[\r\n]/.test(s);});var ok=b.status==='OK'&&valid&&widths;var error=b.status!=='OK'?(b.error||'Statement calculation unavailable'):!valid?'Assumptions drafting failed or did not preserve complete authoritative coverage':!widths?'Invalid printed line layout':'';
if(!valid){verified=ledger.map(function(a){return {assumptionId:a.assumptionId,whatAssumed:a.whatAssumed,wikiBasis:a.wikiBasis,sourceCitation:a.sourceCitation,explanation:'Drafting unavailable or incomplete; the authoritative assumption and evidence are retained.'};});}
function cell(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\|/g,'&#124;').replace(/[\r\n]+/g,' ');}
var md=['# Statement-generation assumptions','','The choices below belong to this implementation, not to a verified legacy oracle. Input offsets are inferred from the supplied wiki tables.','','| What was assumed | Wiki statement or absence | Source | Explanation |','| --- | --- | --- | --- |'];verified.forEach(function(a){md.push('| '+cell(a.whatAssumed)+' | '+cell(a.wikiBasis)+' | '+cell(a.sourceCitation)+' | '+cell(a.explanation)+' |');});
output={result:{status:ok?'OK':'FAILED',error:error,assumptions:verified,creastmt_statements:ok?text:[],creastmt_statements_html:ok?html:[],'assumptions.md':md.join('\n')+'\n'}};
```

### Draft assumptions failed (SCRIPT, id=6adf7e6b16836599f3947982)

```javascript
output = {"assumptionDraft": {}};

```

_(server: 345 ms, 1 API call, 342 ms in API)_
