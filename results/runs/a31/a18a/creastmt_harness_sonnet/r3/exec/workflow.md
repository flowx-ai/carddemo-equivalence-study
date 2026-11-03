# Workflow: GenerateCardStatements

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** 

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae56e6e3695c563ea515bb5 | <uuid> | (0, 0) | → DecodeStatementFiles (seq:<uuid>) |
| End | END | 6ae56e6e3695c563ea515bb6 | <uuid> | (1500, 0) | — |
| DecodeStatementFiles | SCRIPT | 6ae56e6e3695c563ea515bb7 | <uuid> | (300, 0) | → BuildCardStatements (seq:<uuid>) | lang: JAVASCRIPT |
| BuildCardStatements | SCRIPT | 6ae56e6f3695c563ea515bb8 | <uuid> | (600, 0) | → RenderStatements (seq:<uuid>) | lang: JAVASCRIPT |
| RenderStatements | SCRIPT | 6ae56e6f3695c563ea515bb9 | <uuid> | (900, 0) | → Escape text (seq:<uuid>) | lang: JAVASCRIPT |
| Escape text | SCRIPT | 6ae56e6f3695c563ea515bba | <uuid> | (1200, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |

## Systems
_(none)_

## Scripts

### DecodeStatementFiles (SCRIPT, id=6ae56e6e3695c563ea515bb7)

```javascript
var issues = [];
var fatal = false;
function issue(file, line, message) { issues.push({file:file,line:line,message:message}); }
function text(s,a,n) { return s.slice(a,a+n).replace(/ +$/g,''); }
function key(s,a,n) { return text(s,a,n).trim(); }
function cents(s) {
  var t=s.trim(), sign=1;
  if (!t) { throw new Error('blank amount'); }
  if(t.charAt(0)==='-' || t.charAt(0)==='+') { sign=t.charAt(0)==='-'?-1:1; t=t.slice(1); }
  var last=t.charAt(t.length-1), pos='{ABCDEFGHI', neg='}JKLMNOPQR';
  if(pos.indexOf(last)>=0) { t=t.slice(0,-1)+String(pos.indexOf(last)); }
  else if(neg.indexOf(last)>=0) { sign=-1; t=t.slice(0,-1)+String(neg.indexOf(last)); }
  if(!/^[0-9]+$/.test(t)) { throw new Error('invalid signed display amount'); }
  var n=Number(t)*sign;
  if(!Number.isSafeInteger(n)) { throw new Error('amount exceeds exact integer range'); }
  return n;
}
function lines(value,file,min,decode) {
  if(typeof value!=='string') { fatal=true; issue(file,0,'Required input file contents are missing or are not a string.'); return []; }
  if(value==='') { return []; }
  var rows=value.split('\n');
  if(rows[rows.length-1]==='') { rows.pop(); }
  var out=[];
  for(var i=0;i<rows.length;i++) {
    var row=rows[i]; if(row.endsWith('\r')) { row=row.slice(0,-1); }
    try {
      if(row.length<min) { throw new Error('record too short for the fields used by this step'); }
      var obj=decode(row);
      obj.sourceLine=i+1;
      out.push(obj);
    } catch(e) { issue(file,i+1,String(e.message || 'unusable record')); }
  }
  return out;
}
var accounts=lines(input.acctdata,'acctdata.dat',24,function(s){
  var id=key(s,0,11); if(!id) { throw new Error('blank account identifier'); }
  return {accountId:id,currentBalance:cents(s.slice(12,24))};
});
var customers=lines(input.custdata,'custdata.dat',332,function(s){
  var id=key(s,0,9); if(!id) { throw new Error('blank customer identifier'); }
  return {customerId:id,firstName:text(s,9,25),middleName:text(s,34,25),lastName:text(s,59,25),address1:text(s,84,50),address2:text(s,134,50),address3:text(s,184,50),state:text(s,234,2),zip:text(s,239,10),fico:text(s,329,3)};
});
var xrefs=lines(input.cardxref,'cardxref.dat',36,function(s){
  var card=key(s,0,16),customer=key(s,16,9),account=key(s,25,11);
  if(!card || !customer || !account) { throw new Error('blank cross-reference identifier'); }
  return {cardNumber:card,customerId:customer,accountId:account};
});
var transactions=lines(input.transact,'transact.dat',278,function(s){
  var id=key(s,0,16),card=key(s,262,16);
  if(!id || !card) { throw new Error('blank transaction or card identifier'); }
  return {transactionId:id,description:text(s,32,100),amount:cents(s.slice(132,143)),cardNumber:card};
});
output={statementRecords:{accounts:accounts,customers:customers,xrefs:xrefs,transactions:transactions,failed:fatal},statementIssues:issues};
```

### BuildCardStatements (SCRIPT, id=6ae56e6f3695c563ea515bb8)

```javascript
var records=input.statementRecords || {accounts:[],customers:[],xrefs:[],transactions:[],failed:true};
var issues=(input.statementIssues || []).slice();
var accounts=new Map(),customers=new Map(),byCard=new Map();
function master(rows,map,key,file) {
  for(var i=0;i<rows.length;i++) {
    var r=rows[i],k=r[key];
    if(map.has(k)) { issues.push({file:file,line:r.sourceLine,message:'Duplicate master key: first usable record retained.'}); }
    else { map.set(k,r); }
  }
}
master(records.accounts || [],accounts,'accountId','acctdata.dat');
master(records.customers || [],customers,'customerId','custdata.dat');
var transactions=records.transactions || [];
for(var t=0;t<transactions.length;t++) {
  var tx=transactions[t]; if(!byCard.has(tx.cardNumber)) { byCard.set(tx.cardNumber,[]); }
  byCard.get(tx.cardNumber).push(tx);
}
function cmp(a,b) { return a<b?-1:a>b?1:0; }
byCard.forEach(function(rows){rows.sort(function(a,b){return cmp(a.transactionId,b.transactionId) || a.sourceLine-b.sourceLine;});});
var xrefs=(records.xrefs || []).slice();
xrefs.sort(function(a,b){return cmp(a.cardNumber,b.cardNumber) || a.sourceLine-b.sourceLine;});
function joined(parts) { return parts.map(function(x){return String(x || '').trim();}).filter(function(x){return x!=='';}).join(' '); }
var statements=[];
if(!records.failed) {
  for(var i=0;i<xrefs.length;i++) {
    var x=xrefs[i],account=accounts.get(x.accountId),customer=customers.get(x.customerId);
    if(!account || !customer) { issues.push({file:'cardxref.dat',line:x.sourceLine,message:'Statement skipped: account or customer could not be resolved.'}); continue; }
    var rows=byCard.get(x.cardNumber) || [],sum=0,valid=true;
    for(var j=0;j<rows.length;j++) { sum+=rows[j].amount; if(!Number.isSafeInteger(sum)) { valid=false; break; } }
    if(!valid) { issues.push({file:'cardxref.dat',line:x.sourceLine,message:'Statement skipped: total exceeds exact integer range.'}); continue; }
    statements.push({accountId:x.accountId,customerName:joined([customer.firstName,customer.middleName,customer.lastName]),address1:customer.address1,address2:customer.address2,address3:joined([customer.address3,customer.state,customer.zip]),fico:customer.fico,currentBalance:account.currentBalance,transactions:rows,totalExpenditure:sum});
  }
}
output={cardStatements:statements,statementIssuesChecked:issues};
```

### RenderStatements (SCRIPT, id=6ae56e6f3695c563ea515bb9)

```javascript
var assumptionEntries=[
{whatYouAssumed:'Use the returned-lines interface: transact, acctdata, cardxref and custdata contain raw file text; return creastmt_statements, creastmt_statements_html and assumptions_md together; the caller may save the latter as assumptions.md.',wikiBasis:'creastmt-sonnet.pdf p.26 permits ordered string lists under each output filename without its extension; p.26 names assumptions.md. The plain input aliases and companion alias are interface choices.'},
{whatYouAssumed:'Produce a statement for every resolvable cross-reference occurrence, sorted lexically by preserved card identifier; do not aggregate other cards on the same account or filter active status.',wikiBasis:'p.2 BR-01: Statement driven by CardXref order (card number); p.4: one statement per card. Account-wide aggregation, active-status filtering and duplicate-xref behavior are not specified.'},
{whatYouAssumed:'Include all supplied transactions matching that card, sorted by transaction ID; retain duplicates and break equal-key ties by input line order. No cycle or date filter.',wikiBasis:'p.2 BR-02 specifies card number + transaction id keys; p.3 says legacy prints all transactions and leaves the cycle filter TODO. Duplicate and tie handling are unstated.'},
{whatYouAssumed:'Infer contiguous copybook positions from listed field order and widths, using character positions on supplied decoded text. Original copybook offsets and byte encoding are not independently verified.',wikiBasis:'pp.6-9 list fields and widths; pp.25-26 reference copybooks and fixed-width records but do not reproduce their complete layouts or encoding.'},
{whatYouAssumed:'Account nominal width 300: account ID 1-11, status 12, current balance 13-24, credit limit 25-36, cash limit 37-48, open/expiry/reissue 49-58/59-68/69-78, cycle credit/debit 79-90/91-102, ZIP 103-112, group 113-122, ignored filler 123-300.',wikiBasis:'p.6 Account field list, 300-byte record and 178-byte filler; offsets inferred by consecutive placement, not verified from CVACT01Y.'},
{whatYouAssumed:'Cross-reference nominal width 50: card 1-16, customer 17-25, account 26-36, ignored filler 37-50.',wikiBasis:'p.8 CardXref widths and p.26 50-character contract; explicit offsets/filler placement are absent.'},
{whatYouAssumed:'Transaction nominal width 350: ID 1-16, type 17-18, category 19-22, source 23-32, description 33-132, signed amount 133-143, merchant ID 144-152, name 153-202, city 203-252, ZIP 253-262, card 263-278, original/processed timestamp 279-304/305-330, ignored filler 331-350.',wikiBasis:'pp.8-9 Transaction widths; p.26 specifies 350. Offsets/filler inferred, not verified from CVTRA05Y.'},
{whatYouAssumed:'Customer nominal width 500: ID 1-9, first/middle/last 10-34/35-59/60-84, addresses 85-134/135-184/185-234, state 235-236, country 237-239, ZIP 240-249, phones 250-264/265-279, SSN 280-288, government ID 289-308, DOB 309-318, EFT 319-328, primary flag 329, FICO 330-332, ignored remainder 333-500.',wikiBasis:'p.7 Customer field widths; p.26 specifies a 500-character CUSTREC. Listed fields occupy 332 characters; trailing remainder and offsets are inferred. The record is not treated as 400 characters.'},
{whatYouAssumed:'Only require enough record characters to reach fields this step reads: account 24, customer 332, xref 36, transaction 278. Do not validate unused fields or filler content, including NUL bytes, or reject omitted unused trailing filler.',wikiBasis:'pp.25-26 nominal record widths are fixed. The wiki gives no statement validation policy for unused fields; tolerance of missing unused tails is an explicit assumption, not a contract layout change.'},
{whatYouAssumed:'Read amounts as signed display integers in cents: ordinary final digits are positive, {ABCDEFGHI encode positive digits 0-9 and }JKLMNOPQR negative digits 0-9; also tolerate a leading plus/minus. Reject blank or undecodable used amounts.',wikiBasis:'pp.6,8 give S9(10)V99 and S9(9)V99; exact ASCII sign encoding and malformed/blank policies are not supplied. Two implied decimals follow the pictures; supported sign encoding is assumed.'},
{whatYouAssumed:'Keep identifiers as trimmed strings with leading zeros, not numbers; preserve leading zeros in printed account IDs and FICO.',wikiBasis:'pp.6-9 give string identifiers and a three-digit FICO; p.27 prints account and FICO with X(20), but conversion/default rules are not stated.'},
{whatYouAssumed:'Name is nonblank trimmed first, middle and last joined by single spaces; address1 and address2 retain internal spacing; address3 combines trimmed third address line, state and ZIP with single spaces, omitting country.',wikiBasis:'p.4 asks to verify address formatting; p.7 lists components; p.21 names three address lines, state and ZIP. Exact name/address assembly is absent.'},
{whatYouAssumed:'Blank FICO and blank text fields remain blank; no general mandatory-field checks beyond the keys and amounts needed for processing.',wikiBasis:'p.7 FICO is optional; statement-specific defaults for blank text/FICO are not defined.'},
{whatYouAssumed:'First usable account/customer record wins for duplicate keys; duplicate transactions and xrefs are retained rather than deduplicated.',wikiBasis:'pp.6-9 identify keys but no file-level duplicate resolution; p.2 mentions a keyed transaction store without describing duplicate-load outcomes.'},
{whatYouAssumed:'Missing or non-string required file contents make the batch FAILED with no statement outputs; supplied empty files are valid. Isolate unusable records, skip unresolved card references, report file and line without unused sensitive fields.',wikiBasis:'pp.17-18 distinguish file not found/empty and read errors, but do not establish statement-specific recovery or missing-reference behavior. This returned-content implementation makes no connection calls or transport retries.'},
{whatYouAssumed:'Sum signed integer cents exactly; reject a statement whose running total exceeds JavaScript safe integer range rather than silently round. Render zero-transaction statements with zero total.',wikiBasis:'p.2 BR-03 sums amounts and p.4 scenario 4 requires zero total; implementation precision and overflow policies are unstated.'},
{whatYouAssumed:'Implement p.27 numeric pictures literally: balance has nine zero-filled integer digits, cents and trailing minus/space; transaction and total have suppressed leading integer zeroes, cents and trailing minus/space. Numeric slot overflow is thirteen asterisks.',wikiBasis:'p.27 defines 9(9).99- and Z(9).99-. Asterisk overflow treatment is not specified and is assumed.'},
{whatYouAssumed:'Clip raw text to its specified X width and space-pad; repeat separator lines in their printed sequence despite repeated row numbers in the contract; append statements directly without extra blank lines.',wikiBasis:'p.27 defines fixed widths and printed line order, with repeated line numbers 5,12,14. Inter-statement separators and overflow clipping are not separately stated.'},
{whatYouAssumed:'Escape inserted HTML text (&, <, >, double and single quote); truncate raw fields to their declared text slot, then shorten escaped tokens if necessary to preserve the 100-character serialized line and intact markup/entities.',wikiBasis:'pp.27-29 give HTML literals and line width, but do not specify escaping or expansion-overflow behavior. This deliberate truncation policy is assumed.'},
{whatYouAssumed:'Do not add date, phone, credit/cycle fields, an HTML total, PDF or delivery. Both outputs use the exact contracted literal blocks; sum still appears in the text total.',wikiBasis:'p.21 describes broader plugin content; pp.27-29 prescribe the actual output blocks, which omit those elements. p.4 says PDF is not legacy.'},
{whatYouAssumed:'Accept LF or CRLF, preserve record spaces, discard only the split artifact of a final newline; interior blank records are bad records. Return lines without newline terminators; file encoding/newline serialization is the caller responsibility.',wikiBasis:'p.26 says one record per line and permits lists of strings, but does not specify encoding, newline convention, blank-line handling or final terminators.'},
{whatYouAssumed:'Assumptions are model-drafted and reviewed at design time, fixed with the implementation, and emitted with run diagnostics. There is no runtime AI, database write, external file call or notification.',wikiBasis:'The maker requests each implementation decision next to outputs; the wiki does not require runtime generation of explanatory prose. This implementation delivery mechanism is an explicit choice.'}
];
function pad(value,n) { var s=String(value===undefined || value===null?'':value); return s.slice(0,n)+' '.repeat(Math.max(0,n-s.length)); }
function picture(value,zeroFill) {
 var n=Math.abs(value),integer=String(Math.floor(n/100)),fraction=String(n%100).padStart(2,'0');
 if(integer.length>9) { return '*'.repeat(13); }
 var digits=zeroFill?integer.padStart(9,'0'):(n<100?' '.repeat(9):integer.padStart(9,' '));
 return digits+'.'+fraction+(value<0?'-':' ');
}
function entity(c) { if(c==='&')return '&amp;'; if(c==='<')return '&lt;'; if(c==='>')return '&gt;'; if(c==='\"')return '&quot;'; if(c==="'")return '&#39;'; return c; }
function htmlField(prefix,value,suffix,width) {
 var raw=String(value===undefined || value===null?'':value); if(width!==null)raw=pad(raw,width);
 var room=100-prefix.length-suffix.length,escaped='';
 for(var i=0;i<raw.length;i++) { var token=entity(raw.charAt(i)); if(escaped.length+token.length>room)break; escaped+=token; }
 return pad(prefix+escaped+suffix,100);
}
var plain=[],html=[];
function h(s) { html.push(pad(s,100)); }
var statements=input.cardStatements || [];
for(var i=0;i<statements.length;i++) {
 var s=statements[i],rows=s.transactions || [];
 plain.push('*'.repeat(31)+'START OF STATEMENT'+'*'.repeat(31));
 plain.push(pad(pad(s.customerName,75),80)); plain.push(pad(pad(s.address1,50),80)); plain.push(pad(pad(s.address2,50),80)); plain.push(pad(s.address3,80));
 plain.push('-'.repeat(80)); plain.push(pad(' '.repeat(33)+'Basic Details',80)); plain.push('-'.repeat(80));
 plain.push(pad(pad('Account ID :',20)+pad(s.accountId,20),80));
 plain.push(pad(pad('Current Balance :',20)+picture(s.currentBalance,true),80));
 plain.push(pad(pad('FICO Score :',20)+pad(s.fico,20),80));
 plain.push('-'.repeat(80)); plain.push(pad(' '.repeat(30)+'TRANSACTION SUMMARY',80)); plain.push('-'.repeat(80));
 plain.push(pad('Tran ID',16)+pad('Tran Details',51)+pad('Tran Amount',13)); plain.push('-'.repeat(80));
 for(var j=0;j<rows.length;j++) { var r=rows[j]; plain.push(pad(r.transactionId,16)+' '+pad(r.description,49)+'$'+picture(r.amount,false)); }
 plain.push('-'.repeat(80)); plain.push(pad('Total EXP:',10)+' '.repeat(56)+'$'+picture(s.totalExpenditure,false)); plain.push('*'.repeat(32)+'END OF STATEMENT'+'*'.repeat(32));
 h('<!DOCTYPE html>');h('<html lang="en">');h('<head>');h('<meta charset="utf-8">');h('<title>HTML Table Layout</title>');h('</head>');h('<body style="margin:0px;">');h('<table align="center" frame="box" style="width:70%; font:12px Segoe UI,sans-serif;">');
 h('<tr>');h('<td colspan="3" style="padding:0px 5px;background-color:#1d1d96b3;">');html.push(htmlField('<h3>Statement for Account Number: ',s.accountId,'</h3>',20));h('</td>');h('</tr>');
 h('<tr>');h('<td colspan="3" style="padding:0px 5px;background-color:#FFAF33;">');h('<p style="font-size:16px">Bank of XYZ</p>');h('<p>410 Terry Ave N</p>');h('<p>Seattle WA 99999</p>');h('</td>');h('</tr>');
 h('<tr>');h('<td colspan="3" style="padding:0px 5px;background-color:#f2f2f2;">');html.push(htmlField('<p style="font-size:16px">',s.customerName,' </p>',75));html.push(htmlField('<p>',s.address1,' </p>',50));html.push(htmlField('<p>',s.address2,' </p>',50));html.push(htmlField('<p>',s.address3,' </p>',80));h('</td>');h('</tr>');
 h('<tr>');h('<td colspan="3" style="padding:0px 5px;background-color:#33FFD1; text-align:center;">');h('<p style="font-size:16px">Basic Details</p>');h('</td>');h('</tr>');
 h('<tr>');h('<td colspan="3" style="padding:0px 5px;background-color:#f2f2f2;">');html.push(htmlField('<p>Account ID : ',s.accountId,'</p>',20));html.push(htmlField('<p>Current Balance : ',picture(s.currentBalance,true),'</p>',13));html.push(htmlField('<p>FICO Score : ',s.fico,'</p>',20));h('</td>');h('</tr>');
 h('<tr>');h('<td colspan="3" style="padding:0px 5px;background-color:#33FFD1; text-align:center;">');h('<p style="font-size:16px">Transaction Summary</p>');h('</td>');h('</tr>');
 h('<tr>');h('<td style="width:25%; padding:0px 5px; background-color:#33FF5E; text-align:left;">');h('<p style="font-size:16px">Tran ID</p>');h('</td>');h('<td style="width:55%; padding:0px 5px; background-color:#33FF5E; text-align:left;">');h('<p style="font-size:16px">Tran Details</p>');h('</td>');h('<td style="width:20%; padding:0px 5px; background-color:#33FF5E; text-align:right;">');h('<p style="font-size:16px">Amount</p>');h('</td>');h('</tr>');
 for(var k=0;k<rows.length;k++) { var tx=rows[k];h('<tr>');h('<td style="width:25%; padding:0px 5px; background-color:#f2f2f2; text-align:left;">');html.push(htmlField('<p>',tx.transactionId,'</p>',16));h('</td>');h('<td style="width:55%; padding:0px 5px; background-color:#f2f2f2; text-align:left;">');html.push(htmlField('<p>',tx.description,'</p>',49));h('</td>');h('<td style="width:20%; padding:0px 5px; background-color:#f2f2f2; text-align:right;">');html.push(htmlField('<p>',picture(tx.amount,false),'</p>',13));h('</td>');h('</tr>'); }
 h('<tr>');h('<td colspan="3" style="padding:0px 5px;background-color:#1d1d96b3;">');h('<h3>End of Statement</h3>');h('</td>');h('</tr>');h('</table>');h('</body>');h('</html>');
}
function md(s) { return String(s).replace(/\|/g,'&#124;').replace(/[\r\n]+/g,' '); }
var issues=input.statementIssuesChecked || [],failed=!!((input.statementRecords || {}).failed);
var doc='# assumptions.md\n\nBatch outcome: '+(failed?'FAILED':issues.length?'COMPLETED WITH RECORD ISSUES':'COMPLETED')+'.\n\nThese are explicit implementation assumptions, not claims of verified legacy equivalence. Original copybooks and oracle outputs were not supplied.\n\n| What you assumed | Which wiki statement (or absence of one) it rests on |\n|---|---|\n';
for(var a=0;a<assumptionEntries.length;a++) { doc+='| '+md(assumptionEntries[a].whatYouAssumed)+' | '+md(assumptionEntries[a].wikiBasis)+' |\n'; }
doc+='\n## Run diagnostics\n\n';
if(!issues.length) { doc+='No record issues were detected.\n'; }
else { doc+='| Input file | Line | Outcome |\n|---|---:|---|\n';for(var z=0;z<issues.length;z++) { doc+='| '+md(issues[z].file)+' | '+issues[z].line+' | '+md(issues[z].message)+' |\n'; } }
output={creastmt_statements:plain,creastmt_statements_html:html,assumptionEntries:assumptionEntries,assumptions_md:doc};
```

### Escape text (SCRIPT, id=6ae56e6f3695c563ea515bba)

```javascript
function esc(v) { return v == null ? null : JSON.stringify(String(v)).slice(1, -1).replace(/\\"/g, '"'); }
function at(o, p) { return p.split('.').reduce(function (x, k) { return x == null ? undefined : x[k]; }, o); }
output = {"endText": {t0: esc(at(input, "assumptions_md"))}};

```

_(server: 347 ms, 1 API call, 318 ms in API)_
