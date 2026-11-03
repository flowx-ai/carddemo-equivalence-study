# Workflow: GenerateCardStatements

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** 

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae49e903695c563ea51379d | <uuid> | (0, 0) | → Transform (seq:<uuid>) |
| End | END | 6ae49e913695c563ea51379e | <uuid> | (600, 0) | — |
| Transform | SCRIPT | 6ae49e913695c563ea51379f | <uuid> | (300, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |

## Systems
_(none)_

## Scripts

### Transform (SCRIPT, id=6ae49e913695c563ea51379f)

```javascript
var errors = [];
var textLines = [];
var htmlLines = [];
var assumptions = [
 {assumption:'One statement per cross-reference/card, sorted by card number. Include every supplied transaction for that card, sorted by transaction identifier, without a date or active-status filter.',wikiBasis:'creastmt-sonnet-bd5.pdf p.2 BR-01: Statement driven by CardXref order (card number); BR-02: Transactions are keyed by card number + transaction id. p.3: legacy prints all transactions on file; confirm cycle filter requirement is TODO. Maker confirmed all supplied transactions.'},
 {assumption:'Join nonblank trimmed first, middle and last names with one space. Keep address lines 1 and 2; join nonblank line 3, state and ZIP with one space. Country is not appended.',wikiBasis:'creastmt-sonnet-bd5.pdf p.7 lists the customer components; p.21 specifies name and address (3 lines, state, zip), but no concatenation rule. p.27 fixes destination rows. Assembly is an implementation assumption.'},
 {assumption:'The contract CUSTREC follows the sequential customer field layout documented as CVCUS01Y. Offsets are zero-based: customer ID 0/9, first 9/25, middle 34/25, last 59/25, address 84/50, 134/50, 184/50, state 234/2, country 236/3, ZIP 239/10, FICO 329/3. Fields are measured in characters; input is already decoded fixed-width text.',wikiBasis:'creastmt-sonnet-bd5.pdf p.7 lists customer fields and widths under CVCUS01Y; p.26 names CUSTREC (500). Complete copybooks and encoding are absent. Offsets are inferred from the sequential widths, not verified against an original copybook.'},
 {assumption:'Account offsets are ID 0/11 and current balance 12/12. Cross-reference offsets are card 0/16, customer 16/9 and account 25/11. Transaction offsets are ID 0/16, description 32/100, amount 132/11 and card 262/16. Read only required fields, not unrelated data or filler.',wikiBasis:'creastmt-sonnet-bd5.pdf pp.6-9 provide sequential field widths; p.26 specifies the input copybooks. Full copybooks are absent. Derived offsets are assumptions. Filler validation is not specified.'},
 {assumption:'Decode implied-decimal amounts with two decimal places. Accept unsigned digits, leading/trailing explicit sign, signed overpunch ({ABCDEFGHI positive, }JKLMNOPQR negative), and a decimal-point form if supplied. Use integer cents, not binary fractional sums.',wikiBasis:'creastmt-sonnet-bd5.pdf pp.6,8 describe S9(10)V99 and S9(9)V99; p.9 explicitly mentions signed overpunch for another monetary input. Exact statement-input sign encoding is not specified.'},
 {assumption:'List negative, positive and zero amounts; total expenditure includes only strictly positive cents. A card without transactions gets a zero total. Ignore transactions whose cards have no cross-reference.',wikiBasis:'creastmt-sonnet-bd5.pdf p.2 BR-03 and p.4 scenarios 4 and 7 specify positive-only expenditure and no-transaction statements. p.2 BR-01 makes cross-references the driver; handling of orphan transactions is not separately stated.'},
 {assumption:'Keep identifiers as strings, including leading zeros. Trim outer spaces from lookup identifiers and printed name/address parts. Blank optional middle names and FICO are rendered blank; a present FICO must be digits, with no added 300-850 acceptance filter.',wikiBasis:'creastmt-sonnet-bd5.pdf pp.6-9 describe digit/string identifiers and optional middleName and ficoScore. p.27 prints Account ID and FICO as X(20). Exact trimming and blank FICO display are unspecified.'},
 {assumption:'Keep the first duplicate account, customer, cross-reference or card-plus-transaction key; report the duplicate and mark the batch INCOMPLETE. A malformed consumed field or missing customer/account skips its affected statement, but independent statements continue. A malformed transaction with a readable card prevents that card from receiving a misleading partial statement.',wikiBasis:'creastmt-sonnet-bd5.pdf pp.6-9 specify primary keys; pp.2-4 do not specify duplicate or malformed statement-record handling. Maker chose independent continuation with reported problems and an incomplete batch.'},
 {assumption:'Missing input files are errors and prevent statements; present empty files are valid empty datasets. Accept a text string or list of record strings. Recognise LF and CRLF, removing one terminal line terminator, not arbitrary blank records. Do not reject unused fields, record filler, or harmless omitted trailing filler.',wikiBasis:'creastmt-sonnet-bd5.pdf p.26 requires one fixed-width record per line, but does not specify newline encoding, empty/missing input semantics, or filler checks. p.18 maps file absence/empty to NO_DATA in the proposed gateway, not a complete statement-specific policy.'},
 {assumption:'Truncate displayed text to its picture width and space-pad each printed line to 80 or 100 characters. For HTML customer name/address use unpadded assembled values; X(20), X(16) and X(49) substitutions retain their specified padding. If an HTML substitution makes a line exceed 100 characters, retain the first 100 characters.',wikiBasis:'creastmt-sonnet-bd5.pdf pp.26-28 fix text/HTML widths, X(n) padding and inserted fields; overflow behaviour and widths of unpictured HTML customer substitutions are not stated.'},
 {assumption:'Render numeric pictures with a trailing minus for negative values and a trailing space otherwise. Zero-suppress all nine integer positions for Z(9).99-. Reject a printed amount needing more than nine integer digits, or an unsafe integer-cent total, rather than silently wrap it.',wikiBasis:'creastmt-sonnet-bd5.pdf p.27 defines 9(9).99- and Z(9).99- but does not specify overflow handling. Nine digit integer capacity follows the supplied picture.'},
 {assumption:'Use the literal HTML skeleton, preserving inserted field characters without additional entity escaping. Return legacy HTML text, not trusted web content; special input characters may affect markup. Do not add an HTML total row, phone, credit-limit row, statement date, or PDF.',wikiBasis:'creastmt-sonnet-bd5.pdf p.21 mentions additional conceptual content; pp.27-29 explicitly enumerate the output lines and HTML closing block, with no total row, phone, credit limit, date or PDF. Escaping is not specified. The contract fixes layout and takes precedence for which rows exist.'},
 {assumption:'Return line lists under creastmt_statements and creastmt_statements_html, and named file-content entries for both statement files and assumptions.md. File content joins lines with LF and has no extra final blank record. Assumptions are drafted at implementation time and rendered unchanged at runtime; no runtime model is used.',wikiBasis:'creastmt-sonnet-bd5.pdf p.26 permits returned strings/lists under the filename without extension and optional assumptions.md. The request requires assumptions.md next to outputs. External paths, final newline and assumption-generation mechanics are unspecified.'}
];
function issue(file, row, message) { errors.push({fileName:file,recordNumber:row,message:message}); }
function rightTrim(s) { return String(s).replace(/ +$/g,''); }
function trimmed(s) { return String(s).replace(/^ +| +$/g,''); }
function fit(s,n) { s=String(s); if(s.length>n) return s.slice(0,n); return s+' '.repeat(n-s.length); }
function field(s,o,n,label) { if(s.length<o+n) throw new Error('Required '+label+' field is truncated.'); return s.slice(o,o+n); }
function keyField(s,o,n,label,numeric) { var k=trimmed(field(s,o,n,label)); if(!k || (numeric && !/^\d+$/.test(k))) throw new Error('Required '+label+' is blank or unreadable.'); return k; }
function cents(raw) {
 var s=trimmed(raw), neg=false;
 if(!s) throw new Error('Required monetary field is blank.');
 if(s.charAt(0)==='-' || s.charAt(0)==='+') { neg=s.charAt(0)==='-'; s=s.slice(1); }
 var last=s.charAt(s.length-1), pos='{ABCDEFGHI', minus='}JKLMNOPQR';
 if(last==='-' || last==='+') { neg=last==='-'; s=s.slice(0,-1); }
 else if(pos.indexOf(last)>=0) { s=s.slice(0,-1)+String(pos.indexOf(last)); }
 else if(minus.indexOf(last)>=0) { neg=true; s=s.slice(0,-1)+String(minus.indexOf(last)); }
 var n;
 if(/^\d+$/.test(s)) n=Number(s);
 else if(/^\d+\.\d{1,2}$/.test(s)) { var p=s.split('.'); n=Number(p[0])*100+Number((p[1]+'0').slice(0,2)); }
 else throw new Error('Required monetary field has an unreadable numeric encoding.');
 if(!Number.isSafeInteger(n)) throw new Error('Monetary field exceeds exact integer-cent capacity.');
 return neg ? -n : n;
}
function picture(n,zeros) {
 if(!Number.isSafeInteger(n)) throw new Error('Statement total exceeds exact integer-cent capacity.');
 var a=Math.abs(n), whole=String(Math.floor(a/100));
 if(whole.length>9) throw new Error('Amount exceeds the printed nine-digit integer picture.');
 if(!zeros && whole==='0') whole='';
 var left=(zeros?'0':' ').repeat(9-whole.length)+whole;
 return left+'.'+('0'+String(a%100)).slice(-2)+(n<0?'-':' ');
}
function readRecords(value,file) {
 if(value===undefined || value===null) { issue(file,0,'Required input file was not supplied.'); return null; }
 if(Array.isArray(value)) { var arr=[]; for(var i=0;i<value.length;i++) { if(typeof value[i]!=='string') {issue(file,i+1,'Input record is not text.');arr.push('');} else arr.push(value[i]); } return arr; }
 if(typeof value!=='string') {issue(file,0,'Input file content is not text or a list of text records.');return null;}
 if(value==='') return [];
 var rows=value.split(/\r?\n/); if(rows.length && rows[rows.length-1]==='') rows.pop(); return rows;
}
var acctRows=readRecords(input.acctdataDat,'acctdata.dat');
var custRows=readRecords(input.custdataDat,'custdata.dat');
var xrefRows=readRecords(input.cardxrefDat,'cardxref.dat');
var tranRows=readRecords(input.transactDat,'transact.dat');
var accounts=Object.create(null), customers=Object.create(null), refs=Object.create(null), byCard=Object.create(null), badCards=Object.create(null), seenTransactions=Object.create(null);
function loadAccounts(rows) {
 if(rows===null) return;
 for(var i=0;i<rows.length;i++) { var r=rows[i], id=null;
  try {id=keyField(r,0,11,'account identifier',true); if(Object.prototype.hasOwnProperty.call(accounts,id)) {issue('acctdata.dat',i+1,'Duplicate account identifier '+id+'; first record retained.');continue;} accounts[id]={balance:cents(field(r,12,12,'current balance')),row:i+1}; }
  catch(e) { if(id!==null && !Object.prototype.hasOwnProperty.call(accounts,id)) accounts[id]={invalid:true,row:i+1}; issue('acctdata.dat',i+1,e.message); }
 }
}
function loadCustomers(rows) {
 if(rows===null) return;
 for(var i=0;i<rows.length;i++) { var r=rows[i], id=null;
  try { id=keyField(r,0,9,'customer identifier',true); if(Object.prototype.hasOwnProperty.call(customers,id)) {issue('custdata.dat',i+1,'Duplicate customer identifier '+id+'; first record retained.');continue;}
   var first=trimmed(field(r,9,25,'first name')), middle=trimmed(field(r,34,25,'middle name')), last=trimmed(field(r,59,25,'last name'));
   var a1=rightTrim(field(r,84,50,'address line 1')), a2=rightTrim(field(r,134,50,'address line 2'));
   var a3=trimmed(field(r,184,50,'address line 3')), state=trimmed(field(r,234,2,'state')), zip=trimmed(field(r,239,10,'ZIP'));
   var fico=trimmed(field(r,329,3,'FICO score')); if(fico!=='' && !/^\d+$/.test(fico)) throw new Error('FICO score is unreadable.');
   customers[id]={name:[first,middle,last].filter(function(v){return v!=='';}).join(' '),a1:a1,a2:a2,a3:[a3,state,zip].filter(function(v){return v!=='';}).join(' '),fico:fico,row:i+1};
  } catch(e) {if(id!==null && !Object.prototype.hasOwnProperty.call(customers,id)) customers[id]={invalid:true,row:i+1};issue('custdata.dat',i+1,e.message);}
 }
}
function loadRefs(rows) {
 if(rows===null) return;
 for(var i=0;i<rows.length;i++) { var r=rows[i], card=null;
  try {card=keyField(r,0,16,'card number',false); if(Object.prototype.hasOwnProperty.call(refs,card)){issue('cardxref.dat',i+1,'Duplicate card number '+card+'; first record retained.');continue;}
   refs[card]={customer:keyField(r,16,9,'customer identifier',true),account:keyField(r,25,11,'account identifier',true),row:i+1};
  } catch(e) {if(card!==null) badCards[card]=true;issue('cardxref.dat',i+1,e.message);}
 }
}
function loadTransactions(rows) {
 if(rows===null) return;
 for(var i=0;i<rows.length;i++) {var r=rows[i], card=null;
  try { card=keyField(r,262,16,'card number',false); var id=keyField(r,0,16,'transaction identifier',false); var pair=card+'|'+id;
   if(Object.prototype.hasOwnProperty.call(seenTransactions,pair)) {issue('transact.dat',i+1,'Duplicate card/transaction identifier '+card+'/'+id+'; first record retained.');continue;}
   seenTransactions[pair]=true;
   var t={id:id,desc:rightTrim(field(r,32,100,'transaction description')),amount:cents(field(r,132,11,'transaction amount')),row:i+1};
   if(!byCard[card]) byCard[card]=[]; byCard[card].push(t);
  } catch(e) {if(card!==null) badCards[card]=true;issue('transact.dat',i+1,e.message);}
 }
}
function renderText(ref,c,acc,tx,total) {
 var a=[], rule='-'.repeat(80);
 a.push('*'.repeat(31)+'START OF STATEMENT'+'*'.repeat(31));
 a.push(fit(c.name,75));a.push(fit(c.a1,50));a.push(fit(c.a2,50));a.push(fit(c.a3,80));
 a.push(rule);a.push(' '.repeat(33)+'Basic Details');a.push(rule);
 a.push(fit('Account ID :',20)+fit(ref.account,20));
 a.push(fit('Current Balance :',20)+picture(acc.balance,true));
 a.push(fit('FICO Score :',20)+fit(c.fico,20));
 a.push(rule);a.push(' '.repeat(30)+'TRANSACTION SUMMARY');a.push(rule);
 a.push(fit('Tran ID',16)+fit('Tran Details',51)+fit('Tran Amount',13));a.push(rule);
 for(var i=0;i<tx.length;i++) a.push(fit(tx[i].id,16)+' '+fit(tx[i].desc,49)+'$'+picture(tx[i].amount,false));
 a.push(rule);a.push(fit('Total EXP:',10)+' '.repeat(56)+'$'+picture(total,false));
 a.push('*'.repeat(32)+'END OF STATEMENT'+'*'.repeat(32));
 return a.map(function(line){return fit(line,80);});
}
function renderHtml(ref,c,acc,tx) {
 var a=[
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
 '<h3>Statement for Account Number: '+fit(ref.account,20)+'</h3>',
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
 '<p style="font-size:16px">'+c.name+' </p>',
 '<p>'+c.a1+' </p>',
 '<p>'+c.a2+' </p>',
 '<p>'+c.a3+' </p>',
 '</td>',
 '</tr>',
 '<tr>',
 '<td colspan="3" style="padding:0px 5px;background-color:#33FFD1; text-align:center;">',
 '<p style="font-size:16px">Basic Details</p>',
 '</td>',
 '</tr>',
 '<tr>',
 '<td colspan="3" style="padding:0px 5px;background-color:#f2f2f2;">',
 '<p>Account ID : '+fit(ref.account,20)+'</p>',
 '<p>Current Balance : '+picture(acc.balance,true)+'</p>',
 '<p>FICO Score : '+fit(c.fico,20)+'</p>',
 '</td>',
 '</tr>',
 '<tr>',
 '<td colspan="3" style="padding:0px 5px;background-color:#33FF5E; text-align:center;">',
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
 ];
 for(var i=0;i<tx.length;i++) {
 a.push('<tr>');
 a.push('<td style="width:25%; padding:0px 5px; background-color:#f2f2f2; text-align:left;">');
 a.push('<p>'+fit(tx[i].id,16)+'</p>');a.push('</td>');
 a.push('<td style="width:55%; padding:0px 5px; background-color:#f2f2f2; text-align:left;">');
 a.push('<p>'+fit(tx[i].desc,49)+'</p>');a.push('</td>');
 a.push('<td style="width:20%; padding:0px 5px; background-color:#f2f2f2; text-align:right;">');
 a.push('<p>'+picture(tx[i].amount,false)+'</p>');a.push('</td>');a.push('</tr>');
 }
 a.push('<tr>');a.push('<td colspan="3" style="padding:0px 5px;background-color:#1d1d96b3;">');
 a.push('<h3>End of Statement</h3>');a.push('</td>');a.push('</tr>');a.push('</table>');a.push('</body>');a.push('</html>');
 return a.map(function(line){return fit(line,100);});
}
loadAccounts(acctRows);loadCustomers(custRows);loadRefs(xrefRows);loadTransactions(tranRows);
if(acctRows!==null && custRows!==null && xrefRows!==null && tranRows!==null) {
 var cards=Object.keys(refs).sort();
 for(var j=0;j<cards.length;j++) {
  var card=cards[j], ref=refs[card], acc=accounts[ref.account], cust=customers[ref.customer];
  if(badCards[card]) {issue('cardxref.dat',ref.row,'Statement for card '+card+' skipped because a related required record is unreadable.');continue;}
  if(!acc || acc.invalid) {issue('cardxref.dat',ref.row,'Statement for card '+card+' skipped: account '+ref.account+' is missing or unreadable.');continue;}
  if(!cust || cust.invalid) {issue('cardxref.dat',ref.row,'Statement for card '+card+' skipped: customer '+ref.customer+' is missing or unreadable.');continue;}
  var tx=(byCard[card] || []).slice().sort(function(a,b){return a.id<b.id?-1:a.id>b.id?1:a.row-b.row;});
  try {
   var total=0;picture(acc.balance,true);
   for(var k=0;k<tx.length;k++) { picture(tx[k].amount,false); if(tx[k].amount>0) total+=tx[k].amount; if(!Number.isSafeInteger(total)) throw new Error('Statement total exceeds exact integer-cent capacity.'); }
   picture(total,false);
   var st=renderText(ref,cust,acc,tx,total), sh=renderHtml(ref,cust,acc,tx);
   for(var t=0;t<st.length;t++) textLines.push(st[t]);for(var h=0;h<sh.length;h++) htmlLines.push(sh[h]);
  } catch(e) {issue('cardxref.dat',ref.row,'Statement for card '+card+' skipped: '+e.message);}
 }
}
function md(s) {return String(s).replace(/\|/g,'\\|').replace(/[\r\n]+/g,' ');}
var assumptionLines=['# Statement generation assumptions','','| What you assumed | Which wiki statement (or absence of one) it rests on |','| --- | --- |'];
for(var m=0;m<assumptions.length;m++) assumptionLines.push('| '+md(assumptions[m].assumption)+' | '+md(assumptions[m].wikiBasis)+' |');
output={statementOutputs:{creastmt_statements:textLines,creastmt_statements_html:htmlLines,files:[{fileName:'creastmt_statements.txt',content:textLines.join('\n')},{fileName:'creastmt_statements_html.txt',content:htmlLines.join('\n')},{fileName:'assumptions.md',content:assumptionLines.join('\n')}],assumptions:assumptions,status:errors.length?'INCOMPLETE':'COMPLETE',errors:errors}};
```

_(server: 194 ms, 1 API call, 190 ms in API)_
