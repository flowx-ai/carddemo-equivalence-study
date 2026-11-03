# Workflow: GenerateCardStatements

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** 

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae523413695c563ea51505b | <uuid> | (0, 0) | → GenerateStatements (seq:<uuid>) |
| End | END | 6ae523413695c563ea51505c | <uuid> | (1200, 0) | — |
| GenerateStatements | SCRIPT | 6ae523413695c563ea51505d | <uuid> | (300, 0) | → DraftAssumptions (seq:<uuid>) | lang: JAVASCRIPT |
| DraftAssumptions | AI | 6ae523413695c563ea51505e | <uuid> | (600, 0) | → PackageOutputs [SUCCESS] (seq:<uuid>), → DraftAssumptions failed [FAIL] (seq:<uuid>) | responseKey: assumptionDraft, aiType: TEXT_UNDERSTANDING, responseSchema: set |
| PackageOutputs | SCRIPT | 6ae523413695c563ea51505f | <uuid> | (900, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| DraftAssumptions failed | SCRIPT | 6ae523413695c563ea515060 | <uuid> | (600, 200) | → PackageOutputs (seq:<uuid>) | lang: JAVASCRIPT |

## Systems
_(none)_

## AI prompts

### DraftAssumptions (TEXT_UNDERSTANDING, id=6ae523413695c563ea51505e)
instructions:

```
Draft the implementation assumptions document from the supplied decision register only. Return one entry per register entry, in its original order, retaining assumptionId and wikiStatementOrAbsence exactly. For each whatYouAssumed, write the supplied wording exactly: these are already complete implementation decisions and must not be reinterpreted. The document must separately expose what you assumed and which wiki statement (or absence of one) it rests on. Do not invent sources, claims of copybook verification, defaults, behaviours, input facts or extra entries. Never omit entries, change statement behaviour or infer anything from customer data. Only the decision register is supplied; do not ask for customer data.
```
userMessage:

```
${decisionRegister}
```
exampleOutputJsonSchema:

```
{"title":"Response","type":"object","required":["entries"],"properties":{"entries":{"type":"array","items":{"type":"object","required":["assumptionId","whatYouAssumed","wikiStatementOrAbsence"],"properties":{"assumptionId":{"type":"string"},"whatYouAssumed":{"type":"string"},"wikiStatementOrAbsence":{"type":"string"}},"additionalProperties":false}}},"additionalProperties":false}
```

## Scripts

### GenerateStatements (SCRIPT, id=6ae523413695c563ea51505d)

```javascript
function spaces(n) { return ' '.repeat(n); }
function field(s,n) { return (String(s == null ? '' : s) + spaces(n)).slice(0,n); }
function trim(s) { return String(s == null ? '' : s).trim(); }
function joinParts(a) { return a.filter(function(x) { return x !== ''; }).join(' '); }
var errors = [];
var missing = false;
function error(file,n,reason) { errors.push({fileName:file,recordNumber:n,reason:reason}); }
function records(key,file) {
  if (typeof input[key] !== 'string') { missing=true; error(file,0,'Required file contents missing or not text'); return []; }
  if (input[key] === '') return [];
  var a=input[key].split('\n');
  if(a.length && a[a.length-1] === '') a.pop();
  return a.map(function(s) { return s.endsWith('\r') ? s.slice(0,-1) : s; });
}
function cents(raw) {
  var s=trim(raw), sign=1;
  if(!s) return null;
  var last=s.slice(-1), pos='{ABCDEFGHI', neg='}JKLMNOPQR';
  if(pos.indexOf(last)>=0) s=s.slice(0,-1)+String(pos.indexOf(last));
  else if(neg.indexOf(last)>=0) { s=s.slice(0,-1)+String(neg.indexOf(last)); sign=-1; }
  if(!/^[0-9]+$/.test(s)) return null;
  var n=Number(s)*sign;
  return Number.isSafeInteger(n) ? n : null;
}
function picture(n,zeroFill) {
  if(!Number.isSafeInteger(n) || Math.abs(n)>99999999999) return null;
  var a=Math.abs(n), whole=String(Math.floor(a/100));
  var left=zeroFill ? ('000000000'+whole).slice(-9) : (spaces(9)+(whole==='0' ? '' : whole)).slice(-9);
  return left+'.'+('0'+String(a%100)).slice(-2)+(n<0 ? '-' : ' ');
}
function band(s) {
  s=trim(s); if(!s) return '';
  if(!/^[0-9]+$/.test(s)) return null;
  var n=Number(s); return n<580?'Poor':n<670?'Fair':n<740?'Good':n<800?'Very Good':'Exceptional';
}
var reg=[];
function assume(id,what,source) { reg.push({assumptionId:id,whatYouAssumed:what,wikiStatementOrAbsence:source}); }
assume('input-layout','Use ordered display-field widths from the wiki to derive zero-based offsets, with unused trailing filler ignored; original copybooks are not attached.','creastmt-sonnet-yx3.pdf pp.6–9 enumerate field widths; pp.25–26 name the copybooks and record lengths, but do not supply their source.');
assume('account-offsets','Account ID [0,11), balance [12,24); read only those account fields. Account input records may contain all other fields and filler without validation.','creastmt-sonnet-yx3.pdf p.6: accountId 9(11), activeStatus X(1), currentBalance S9(10)V99.');
assume('xref-offsets','Card [0,16), customer [16,25), account [25,36), then ignored filler.','creastmt-sonnet-yx3.pdf p.8 lists cardNumber X(16), customerId 9(9), accountId 9(11); p.26 gives record length 50.');
assume('customer-offsets','Customer ID [0,9); first/middle/last names [9,34), [34,59), [59,84); address lines [84,134), [134,184), [184,234); state [234,236), country [236,239), ZIP [239,249); FICO [329,332). Intermediate fields and filler are ignored.','creastmt-sonnet-yx3.pdf p.7 lists customer fields in order and their widths, including two 15-character phones, SSN 9, government ID 20, DOB 10, EFT ID 10 and primary-holder indicator 1 before FICO 3.');
assume('transaction-offsets','Transaction ID [0,16), description [32,132), amount [132,143), card [262,278); read only these fields. All remaining transaction data and filler are ignored.','creastmt-sonnet-yx3.pdf pp.8–9 list transaction widths and field order; p.26 gives 350-character records.');
assume('signed-money','Decode unsigned display digits and ASCII signed overpunch with implied two decimals; use integer cents, never binary fractional arithmetic or invented rounding. Reject unreadable or unrepresentable amounts only where consumed.','creastmt-sonnet-yx3.pdf pp.6,8 specify S9(10)V99 and S9(9)V99; p.9 demonstrates ASCII signed overpunch for another monetary field. Encoding for statement input amounts is not separately stated.');
assume('identifier-preservation','Keep identifiers as trimmed strings, preserving leading zeros, and compare/sort them lexically.','creastmt-sonnet-yx3.pdf pp.6–9 model identifiers as strings; p.2 BR-01 specifies card-number order and BR-02 card-plus-transaction-ID order.');
assume('name-assembly','Join trimmed, nonblank first, middle and last names with one space; clip to 75 characters in text.','creastmt-sonnet-yx3.pdf p.4 requires verification of address formatting; pp.7,21 identify customer/name fields but omit name concatenation rules; p.27 fixes name X(75).');
assume('address-assembly','Use trimmed address lines 1 and 2 directly; join nonblank address line 3, state and ZIP with one space as the final address line. Do not add country.','creastmt-sonnet-yx3.pdf p.21: customer block name, address (3 lines, state, zip), phone. It does not state assembly rules; p.27 provides three printed address lines.');
assume('card-membership','Each distinct valid xref card gets a statement using that xref customer and account; include only transactions with that card. Cards sharing an account remain separate. Unmatched transactions create no statement.','creastmt-sonnet-yx3.pdf p.2 BR-01: Statement driven by CardXref order (card number); p.4: One statement per card. Account-wide grouping language elsewhere is less specific.');
assume('cycle-filter','Use all matching transactions in the supplied combined file without a date filter.','creastmt-sonnet-yx3.pdf p.3: legacy prints all transactions on file; confirm cycle filter requirement. P.26 supplies the combined transaction file and no statement-cycle range.');
assume('zero-card','Produce the normal headings, separators and closing blocks even with no transaction rows; total expenditure is zero. HTML contains no added total block.','creastmt-sonnet-yx3.pdf p.4: Card without transactions — Statement with zero total. Pp.27–29 supply text total line and HTML closing block without an HTML total.');
assume('fico-blank','Blank FICO prints blank. Nonblank digit scores use the documented thresholds without imposing the data model’s suggested 300–850 range; malformed nonblank FICO makes only its statement unbuildable.','creastmt-sonnet-yx3.pdf p.7 marks FICO optional; p.2 BR-07 defines Poor below 580, Fair 580–669, Good 670–739, Very Good 740–799 and Exceptional 800 and above. Missing/malformed score behaviour is unstated.');
assume('literal-layout','Pad text lines to 80 and HTML lines to 100 characters; truncate overlong text fields and lines. Keep HTML field interpolation literal, with no extra escaping, and use trimmed name/address placeholders in HTML. Preserve X(20), X(16), X(49) and monetary field padding where the contract specifies a picture.','creastmt-sonnet-yx3.pdf pp.26–28 define exact fixed-length lines, pictures and HTML literals. Overflow, unspecified HTML placeholder padding and escaping rules are not stated. Literal output is not safe for untrusted browser rendering.');
assume('numeric-pictures','Current balance uses nine zero-filled integer digits, decimal point, two fractional digits and trailing minus/space. Transaction amounts and text total suppress all leading integer zeros, including the units zero for zero amounts, with the same trailing sign. Numeric overflow makes only the affected statement unbuildable.','creastmt-sonnet-yx3.pdf p.27 defines 9(9).99- and Z(9).99-; overflow behaviour is not specified.');
assume('duplicate-keys','Keep the first encountered master record for a key and first transaction for card+transaction ID. Report later duplicates without silently replacing earlier records.','creastmt-sonnet-yx3.pdf pp.6–9 identify master keys, p.2 BR-02 identifies the transaction composite key; duplicate input handling is not stated.');
assume('record-failures','Report malformed consumed fields or short consumed regions by file and one-based record number; skip the affected record or unbuildable card only. Never validate or reject filler or unrelated fields. Missing account/customer data prevents only that card’s statement.','creastmt-sonnet-yx3.pdf pp.16,18,20 describe lookup/file errors but omit statement-specific malformed-record and missing-master recovery.');
assume('line-endings','Accept LF and CRLF record delimiters, remove a terminal delimiter rather than creating a record, and preserve other bytes including non-printable filler. Empty physical interior lines are malformed records, not silent deletions.','creastmt-sonnet-yx3.pdf p.26 says one record per line but does not specify delimiter handling.');
assume('empty-and-missing','Empty supplied files are valid. A missing or non-text required file fails the batch and suppresses all statement output. Otherwise any reported record error makes the result incomplete; valid independent statements remain available.','creastmt-sonnet-yx3.pdf p.18 maps file not found/empty to NO_DATA; p.26 requires four per-run files but does not distinguish missing-file batch completion.');
assume('contract-precedence','Do not print statement date, phone, credit limit, cycle credit/debit, SSN, PDF content or other fields absent from the contract. No upstream posting or interest calculations are performed.','creastmt-sonnet-yx3.pdf p.21 lists richer plugin content; pp.26–29 fix this step’s printed fields and p.26 specifies isolated upstream inputs; p.21 says SSN is not printed.');
assume('return-materialization','Return creastmt_statements and creastmt_statements_html as ordered line lists under result; return assumptions.md as an accompanying filename/content artifact and structured assumptionEntries. The caller materializes files if required.','creastmt-sonnet-yx3.pdf p.26 explicitly permits returning line lists under each output filename without extension and lists optional assumptions.md; the maker requires assumptions.md for this build.');
assume('explanation-fallback','The model receives only this register and must preserve each entry’s evidence and meaning. Invalid or failed drafting falls back to this register verbatim; it never changes statement outputs.','Implementation choice: the wiki does not prescribe an assumption-document drafting mechanism. This keeps the maker-requested explanation separate from statement computation.');
var acctRows=records('acctdata','acctdata.dat'), custRows=records('custdata','custdata.dat'), xrefRows=records('cardxref','cardxref.dat'), tranRows=records('transact','transact.dat');
var accounts={}, customers={}, xrefs={}, txs={}, seen={};
function has(o,k) { return Object.prototype.hasOwnProperty.call(o,k); }
for(var i=0;i<acctRows.length;i++) {
  var a=acctRows[i], aid=trim(a.slice(0,11)), ak='k'+aid;
  if(a.length<24 || !aid) { error('acctdata.dat',i+1,'Short consumed account fields or blank account ID'); continue; }
  if(has(accounts,ak)) { error('acctdata.dat',i+1,'Duplicate account ID'); continue; }
  var bal=cents(a.slice(12,24));
  accounts[ak]={id:aid,balance:bal};
  if(bal===null) error('acctdata.dat',i+1,'Unreadable current balance');
}
for(var j=0;j<custRows.length;j++) {
  var c=custRows[j], cid=trim(c.slice(0,9)), ck='k'+cid;
  if(c.length<249 || !cid) { error('custdata.dat',j+1,'Short consumed customer fields or blank customer ID'); continue; }
  if(has(customers,ck)) { error('custdata.dat',j+1,'Duplicate customer ID'); continue; }
  var name=joinParts([trim(c.slice(9,34)),trim(c.slice(34,59)),trim(c.slice(59,84))]);
  var addr3=joinParts([trim(c.slice(184,234)),trim(c.slice(234,236)),trim(c.slice(239,249))]);
  var fico=band(c.slice(329,332));
  customers[ck]={name:name,line1:trim(c.slice(84,134)),line2:trim(c.slice(134,184)),line3:addr3,fico:fico};
  if(fico===null) error('custdata.dat',j+1,'Unreadable nonblank FICO score');
}
for(var k=0;k<xrefRows.length;k++) {
  var x=xrefRows[k], card=trim(x.slice(0,16)), xk='k'+card;
  if(x.length<36 || !card || !trim(x.slice(16,25)) || !trim(x.slice(25,36))) { error('cardxref.dat',k+1,'Short or blank consumed cross-reference fields'); continue; }
  if(has(xrefs,xk)) { error('cardxref.dat',k+1,'Duplicate cross-reference card'); continue; }
  xrefs[xk]={card:card,customer:trim(x.slice(16,25)),account:trim(x.slice(25,36)),record:k+1};
}
for(var t=0;t<tranRows.length;t++) {
  var r=tranRows[t], tid=trim(r.slice(0,16)), tc=trim(r.slice(262,278));
  if(r.length<278 || !tid || !tc) { error('transact.dat',t+1,'Short or blank consumed transaction fields'); continue; }
  var sk='k'+tc+'|'+tid;
  if(has(seen,sk)) { error('transact.dat',t+1,'Duplicate card and transaction ID'); continue; }
  seen[sk]=true;
  var amt=cents(r.slice(132,143));
  if(amt===null) { error('transact.dat',t+1,'Unreadable transaction amount'); continue; }
  var tk='k'+tc;
  if(!has(txs,tk)) txs[tk]=[];
  txs[tk].push({id:tid,description:trim(r.slice(32,132)),amount:amt});
}
var text=[], html=[];
var cards=Object.keys(xrefs).sort();
for(var n=0;n<cards.length && !missing;n++) {
  var xr=xrefs[cards[n]], ac=accounts['k'+xr.account], cu=customers['k'+xr.customer];
  if(!ac || !cu || ac.balance===null || cu.fico===null) { error('cardxref.dat',xr.record,'Statement skipped: missing or unreadable customer/account data'); continue; }
  var lines=txs['k'+xr.card] || [];
  lines.sort(function(u,v) { return u.id<v.id?-1:u.id>v.id?1:0; });
  var total=0, valid=true;
  for(var z=0;z<lines.length;z++) { total+=lines[z].amount; if(picture(lines[z].amount,false)===null || !Number.isSafeInteger(total)) valid=false; }
  if(!valid || picture(total,false)===null || picture(ac.balance,true)===null) { error('cardxref.dat',xr.record,'Statement skipped: amount or total exceeds fixed numeric picture'); continue; }
  var st=[];
  st.push('*'.repeat(31)+'START OF STATEMENT'+'*'.repeat(31));
  st.push(field(cu.name,75)+spaces(5));
  st.push(field(cu.line1,50)+spaces(30)); st.push(field(cu.line2,50)+spaces(30)); st.push(field(cu.line3,80));
  st.push('-'.repeat(80)); st.push(field(spaces(33)+'Basic Details',80)); st.push('-'.repeat(80));
  st.push(field('Account ID :',20)+field(ac.id,20)+spaces(40));
  st.push(field('Current Balance :',20)+picture(ac.balance,true)+spaces(47));
  st.push(field('FICO Score :',20)+field(cu.fico,20)+spaces(40));
  st.push('-'.repeat(80)); st.push(field(spaces(30)+'TRANSACTION SUMMARY',80)); st.push('-'.repeat(80));
  st.push(field('Tran ID',16)+field('Tran Details',51)+field('Tran Amount',13)); st.push('-'.repeat(80));
  for(var q=0;q<lines.length;q++) st.push(field(lines[q].id,16)+' '+field(lines[q].description,49)+'$'+picture(lines[q].amount,false));
  st.push('-'.repeat(80)); st.push(field('Total EXP:',10)+spaces(56)+'$'+picture(total,false));
  st.push('*'.repeat(32)+'END OF STATEMENT'+'*'.repeat(32));
  for(var u=0;u<st.length;u++) text.push(field(st[u],80));
  var h=['<!DOCTYPE html>','<html lang="en">','<head>','<meta charset="utf-8">','<title>HTML Table Layout</title>','</head>','<body style="margin:0px;">','<table align="center" frame="box" style="width:70%; font:12px Segoe UI,sans-serif;">','<tr>','<td colspan="3" style="padding:0px 5px;background-color:#1d1d96b3;">','<h3>Statement for Account Number: '+field(ac.id,20)+'</h3>','</td>','</tr>','<tr>','<td colspan="3" style="padding:0px 5px;background-color:#FFAF33;">','<p style="font-size:16px">Bank of XYZ</p>','<p>410 Terry Ave N</p>','<p>Seattle WA 99999</p>','</td>','</tr>','<tr>','<td colspan="3" style="padding:0px 5px;background-color:#f2f2f2;">','<p style="font-size:16px">'+cu.name+' </p>','<p>'+cu.line1+' </p>','<p>'+cu.line2+' </p>','<p>'+cu.line3+' </p>','</td>','</tr>','<tr>','<td colspan="3" style="padding:0px 5px;background-color:#33FFD1; text-align:center;">','<p style="font-size:16px">Basic Details</p>','</td>','</tr>','<tr>','<td colspan="3" style="padding:0px 5px;background-color:#f2f2f2;">','<p>Account ID : '+field(ac.id,20)+'</p>','<p>Current Balance : '+picture(ac.balance,true)+'</p>','<p>FICO Score : '+field(cu.fico,20)+'</p>','</td>','</tr>','<tr>','<td colspan="3" style="padding:0px 5px;background-color:#33FFD1; text-align:center;">','<p style="font-size:16px">Transaction Summary</p>','</td>','</tr>','<tr>','<td style="width:25%; padding:0px 5px; background-color:#33FF5E; text-align:left;">','<p style="font-size:16px">Tran ID</p>','</td>','<td style="width:55%; padding:0px 5px; background-color:#33FF5E; text-align:left;">','<p style="font-size:16px">Tran Details</p>','</td>','<td style="width:20%; padding:0px 5px; background-color:#33FF5E; text-align:right;">','<p style="font-size:16px">Amount</p>','</td>','</tr>'];
  for(var v=0;v<lines.length;v++) {
    h.push('<tr>','<td style="width:25%; padding:0px 5px; background-color:#f2f2f2; text-align:left;">','<p>'+field(lines[v].id,16)+'</p>','</td>','<td style="width:55%; padding:0px 5px; background-color:#f2f2f2; text-align:left;">','<p>'+field(lines[v].description,49)+'</p>','</td>','<td style="width:20%; padding:0px 5px; background-color:#f2f2f2; text-align:right;">','<p>'+picture(lines[v].amount,false)+'</p>','</td>','</tr>');
  }
  h.push('<tr>','<td colspan="3" style="padding:0px 5px;background-color:#1d1d96b3;">','<h3>End of Statement</h3>','</td>','</tr>','</table>','</body>','</html>');
  for(var w=0;w<h.length;w++) html.push(field(h[w],100));
}
output={statementOutputs:{creastmt_statements:text,creastmt_statements_html:html,status:missing?'FAILED':errors.length?'INCOMPLETE':'COMPLETE',errors:errors},decisionRegister:reg};
```

### PackageOutputs (SCRIPT, id=6ae523413695c563ea51505f)

```javascript
var source=input.statementOutputs || {creastmt_statements:[],creastmt_statements_html:[],status:'FAILED',errors:[]};
var register=input.decisionRegister || [];
var proposed=(input.assumptionDraft || {}).entries;
var valid=Array.isArray(proposed) && proposed.length===register.length;
if(valid) { for(var i=0;i<register.length;i++) { var a=proposed[i] || {}, b=register[i]; if(a.assumptionId!==b.assumptionId || a.whatYouAssumed!==b.whatYouAssumed || a.wikiStatementOrAbsence!==b.wikiStatementOrAbsence || Object.keys(a).length!==3) valid=false; } }
var entries=valid?proposed:register;
function cell(s) { return String(s).replace(/\|/g,'\\|').replace(/\r?\n/g,' '); }
var md='# Statement-generation assumptions\n\nSource: creastmt-sonnet-yx3.pdf. Page references refer to the supplied wiki and CONTRACT.md bundle. Inferred offsets are not independently verified copybooks.\n\n| Decision | what you assumed | which wiki statement (or absence of one) it rests on |\n| --- | --- | --- |\n';
for(var j=0;j<entries.length;j++) md+='| '+cell(entries[j].assumptionId)+' | '+cell(entries[j].whatYouAssumed)+' | '+cell(entries[j].wikiStatementOrAbsence)+' |\n';
output={result:{creastmt_statements:source.creastmt_statements || [],creastmt_statements_html:source.creastmt_statements_html || [],assumptionEntries:entries,assumptions:{fileName:'assumptions.md',content:md},status:source.status,errors:source.errors || []}};
```

### DraftAssumptions failed (SCRIPT, id=6ae523413695c563ea515060)

```javascript
output = {"assumptionDraft": {}};

```

_(server: 319 ms, 1 API call, 291 ms in API)_
