# Workflow: GenerateCardStatements

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** 

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6adf906216836599f394ae31 | <uuid> | (0, 0) | → Build statements (seq:<uuid>) |
| End | END | 6adf906216836599f394ae32 | <uuid> | (1200, 0) | — |
| Build statements | SCRIPT | 6adf906216836599f394ae33 | <uuid> | (300, 0) | → Draft assumptions (seq:<uuid>) | lang: JAVASCRIPT |
| Draft assumptions | AI | 6adf906216836599f394ae34 | <uuid> | (600, 0) | → Package outputs [SUCCESS] (seq:<uuid>), → Draft assumptions failed [FAIL] (seq:<uuid>) | responseKey: draftedAssumptions, aiType: TEXT_UNDERSTANDING, responseSchema: set |
| Package outputs | SCRIPT | 6adf906216836599f394ae35 | <uuid> | (900, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| Draft assumptions failed | SCRIPT | 6adf906216836599f394ae36 | <uuid> | (600, 200) | → Package outputs (seq:<uuid>) | lang: JAVASCRIPT |

## Systems
_(none)_

## AI prompts

### Draft assumptions (TEXT_UNDERSTANDING, id=6adf906216836599f394ae34)
instructions:

*[Paragraph withheld from this draft: it quotes the builder prompt.]*

```
Document these implementation decisions and their wiki bases: ${assumptionLedger}
```
exampleOutputJsonSchema:

```
{"title":"Response","type":"object","required":["assumptions"],"properties":{"assumptions":{"type":"array","items":{"type":"object","required":["decision","what you assumed","which wiki statement (or absence of one) it rests on"],"properties":{"decision":{"type":"string"},"what you assumed":{"type":"string"},"which wiki statement (or absence of one) it rests on":{"type":"string"}},"additionalProperties":false}}},"additionalProperties":false}
```

## Scripts

### Build statements (SCRIPT, id=6adf906216836599f394ae33)

```javascript
var ledger=[];
function note(id,a,s){ledger.push({decision:id,'what you assumed':a,'which wiki statement (or absence of one) it rests on':s});}
var layouts={
 'transact.dat':{size:350,fields:[['tran_id',16],['type_cd',2],['cat_cd',4],['source',10],['desc',100],['amt',11],['merchant_id',9],['merchant_name',50],['merchant_city',50],['merchant_zip',10],['card_num',16],['orig_ts',26],['proc_ts',26]]},
 'acctdata.dat':{size:300,fields:[['acct_id',11],['active_status',1],['curr_bal',12],['credit_limit',12],['cash_credit_limit',12],['open_date',10],['expiration_date',10],['reissue_date',10],['curr_cyc_credit',12],['curr_cyc_debit',12],['addr_zip',10],['group_id',10]]},
 'cardxref.dat':{size:50,fields:[['card_num',16],['customer_id',9],['acct_id',11]]},
 'custdata.dat':{size:500,fields:[['customer_id',9],['first_name',25],['middle_name',25],['last_name',25],['address_line_1',50],['address_line_2',50],['address_line_3',50],['state',2],['country',3],['zip',10],['phone_1',15],['phone_2',15],['ssn',9],['govt_id',20],['dob',10],['eft_account_id',10],['primary_holder',1],['fico',3]]}
};
var filenames=['transact.dat','acctdata.dat','cardxref.dat','custdata.dat'];
for(var li=0;li<filenames.length;li++){
 var fn=filenames[li],spec=layouts[fn],pos=1,cells=[];
 for(var lf=0;lf<spec.fields.length;lf++){var fld=spec.fields[lf];cells.push(fld[0]+':'+pos+'-'+(pos+fld[1]-1));pos+=fld[1];}
 cells.push('filler:'+pos+'-'+spec.size);
 note('layout-'+fn,'Inferred 1-based offsets for '+fn+': '+cells.join('; ')+'. Not verified against original copybooks.','creastmt-opus.pdf p.13 gives lengths/copybook names; pp.5-8 give field order/widths, not offsets. Assume CUSTREC follows p.6 Customer layout.');
}
note('transport','Supply decoded text in files keyed by the four exact filenames; return extensionless statement line lists and assumptions.md together, not local filesystem files.','creastmt-opus.pdf p.13 permits returned strings/lists; input transport and storage locations are unspecified.');
note('invocation','Run on request, without automatic scheduling or a date filter; all supplied transactions belong to this batch.','creastmt-opus.pdf p.2 names Scheduled Start without a schedule; p.13 supplies combined daily transactions without a statement date filter.');
note('encoding','Assume single-byte printable ASCII text, not packed binary or raw EBCDIC; require exact record lengths including filler.','creastmt-opus.pdf p.13 says fixed-width text; pp.5-8 do not establish export encoding.');
note('newlines','Accept LF/CRLF, remove one terminal empty line, and treat an empty file as zero records; reject embedded blank lines, lone CR and nonprintable/non-ASCII characters.','creastmt-opus.pdf p.13 says one record per line, without newline or malformed-line rules.');
note('money-decoding','Use two implied decimals; unsigned digits or trailing overpunch {ABCDEFGHI for positive 0-9 and }JKLMNOPQR for negative 0-9. Reject decimal points, leading signs and binary bytes; normalize negative zero.','creastmt-opus.pdf pp.5,8 specify signed S9(n)V99, but p.13 does not define textual sign encoding.');
note('unused-fields','Ignore filler; do not use SSN, government ID, birth date or phone numbers in outputs, model requests or diagnostics, or validate unused text business content.','creastmt-opus.pdf pp.6-7 identify sensitive fields; pp.14-15 omit them from statements.');
note('identifiers','Match digit strings with leading zeros; print 11-digit account IDs and three-digit FICO in X(20). Card numbers must be 16 digits.','creastmt-opus.pdf pp.5-8 specify widths; pp.14-15 do not define numeric-to-X display conversion.');
note('keys','Reject duplicate account IDs, customer IDs, cross-reference card numbers and transaction IDs.','creastmt-opus.pdf pp.5-8 name unique keys; duplicate-input handling is unstated.');
note('joins','Join each transaction card through CardXref to its account; every cross-reference must resolve an account and customer, and every account needs a linked customer. Unresolved links fail the batch.','creastmt-opus.pdf p.7 describes CardXref links; missing-link handling is unstated.');
note('customer','Choose the smallest linked numeric customer ID, not an inferred primary-holder indicator value.','creastmt-opus.pdf pp.6-7 supply links and an indicator, without addressee selection or indicator value semantics.');
note('coverage','Emit one statement per account, including inactive accounts and accounts without transactions.','creastmt-opus.pdf p.4 requires a statement per account and zero-activity handling; no inactive-account exclusion.');
note('ordering','Sort accounts numerically and transactions by ID, with input order breaking ties; duplicate primary keys remain invalid.','creastmt-opus.pdf p.13 requires printed order without defining sort keys.');
note('balance','Print supplied current balance unchanged; do not invent opening balance, interest, minimum due or category balances.','creastmt-opus.pdf p.13 supplies post-interest accounts; pp.14-15 print current balance; p.11 broader PDF content is absent from contracted layouts.');
note('total','Total EXP is the signed sum of every account transaction, without type/date/category/sign filters; no activity totals zero.','creastmt-opus.pdf p.14 names Total EXP without a formula; p.4 requires zero-activity statements.');
note('precision','Use integer cents without rounding; reject unsafe integer sums and overflow beyond the nine-integer-digit output picture, including intermediate totals.','creastmt-opus.pdf p.14 defines two decimals and nine integer digits; rounding/overflow policy is absent.');
note('name','Trim and join nonblank first, middle and last names with single spaces, fitting X(75).','creastmt-opus.pdf p.6 supplies names; pp.13-15 leave assembly unspecified.');
note('address','Trim customer address lines 1 and 2 for X(50); join nonblank address line 3, state, country and ZIP with single spaces for X(80).','creastmt-opus.pdf p.6 supplies components; p.14 gives printed slots without assembly rules.');
note('details','Use right-trimmed transaction description fitted to X(49), not merchant or type text.','creastmt-opus.pdf p.8 has description and merchant data; pp.14-15 do not define Tran Details assembly.');
note('pictures','Balance uses 9(9).99-; amounts/totals use Z(9).99-. Negative sign trails; positive/zero sign is space. Zero-suppressed whole zero is nine spaces, then .00 for zero.','creastmt-opus.pdf p.14 defines pictures; zero rendering assumes COBOL picture semantics.');
note('text','Use literal ordered text lines and repeated separators, headings even without activity, plain-text total and one start/end marker per account; no extra inter-statement blank lines.','creastmt-opus.pdf p.14 gives the line sequence but no inter-statement spacing.');
note('html','Concatenate complete per-account HTML documents without extra separators, HTML totals or PDF generation.','creastmt-opus.pdf pp.14-16 give HTML blocks without a total; p.13 requires text/HTML, not PDF.');
note('escaping','Use the same fitted field values in both outputs; HTML-escape &, <, >, double quote and apostrophe before fitting each HTML line.','creastmt-opus.pdf pp.14-15 specify fields but not escaping or whitespace assembly.');
note('line-fitting','Right-pad text lines to 80 and HTML to 100; truncate excess at the right, even an HTML tag/entity. Return lists without embedded newlines.','creastmt-opus.pdf pp.13-15 fix line lengths and allow omitted trailing spaces, but give no overlong-substitution policy.');
note('errors','Fail atomically on missing files, malformed records, invalid used numbers, duplicates, missing links or overflow; return file/line/field diagnostics without raw values or partial statements. Keep input files unchanged.','The wiki gives no malformed-input, partial-output or mutation policy for statement generation.');
note('documentation','A documentation-only model copies this complete ledger into separate assumption/source fields, receiving no customer or transaction data; retain fields and render one Markdown row per decision.','Maker explicitly requires every assumption and its wiki statement or absence; the wiki gives no documentation-generation mechanism.');
note('documentation-failure','If drafting fails or changes/omits/duplicates a decision or source, return failure without statements and render the original ledger as assumptions.md.','The wiki is silent on documentation failure; chosen to prevent undocumented successful output.');
var errors=[],tables={},files=input.files||{};
function err(f,l,k,m){errors.push(f+(l?':'+l:'')+(k?' '+k:'')+': '+m);}
function digits(v,n){return typeof v==='string'&&v.length===n&&/^[0-9]+$/.test(v);}
function cents(raw){var s=raw,sign=1,last=s.slice(-1),p='{ABCDEFGHI'.indexOf(last),n='}JKLMNOPQR'.indexOf(last);if(p>=0){s=s.slice(0,-1)+String(p);}else if(n>=0){s=s.slice(0,-1)+String(n);sign=-1;}if(!/^[0-9]+$/.test(s)){return null;}var v=Number(s)*sign;return Number.isSafeInteger(v)?v:null;}
for(var fi=0;fi<filenames.length;fi++){
 var file=filenames[fi],cfg=layouts[file],rows=[];
 if(typeof files[file]!=='string'){err(file,0,'','missing text file');tables[file]=rows;continue;}
 var text=files[file],lines=text===''?[]:text.replace(/\r\n/g,'\n').split('\n');
 if(lines.length&&lines[lines.length-1]===''){lines.pop();}
 for(var ri=0;ri<lines.length;ri++){
  var line=lines[ri];if(line.length!==cfg.size){err(file,ri+1,'','wrong record length');continue;}if(/[^\x20-\x7E]/.test(line)){err(file,ri+1,'','unsupported character encoding');continue;}
  var rec={line:ri+1},offset=0;for(var ci=0;ci<cfg.fields.length;ci++){var col=cfg.fields[ci];rec[col[0]]=line.slice(offset,offset+col[1]);offset+=col[1];}rows.push(rec);
 }tables[file]=rows;
}
var accounts=tables['acctdata.dat'],customers=tables['custdata.dat'],xrefs=tables['cardxref.dat'],transactions=tables['transact.dat'];
var accountMap={},customerMap={},xrefMap={},tranMap={},links={},byAccount={};
function indexRows(rows,key,width,file,target){for(var i=0;i<rows.length;i++){var r=rows[i],v=r[key];if(!digits(v,width)){err(file,r.line,key,'invalid numeric identifier');continue;}if(Object.prototype.hasOwnProperty.call(target,v)){err(file,r.line,key,'duplicate primary key');continue;}target[v]=r;}}
indexRows(accounts,'acct_id',11,'acctdata.dat',accountMap);indexRows(customers,'customer_id',9,'custdata.dat',customerMap);indexRows(xrefs,'card_num',16,'cardxref.dat',xrefMap);
for(var ai=0;ai<accounts.length;ai++){
 var ar=accounts[ai],keys=['curr_bal','credit_limit','cash_credit_limit','curr_cyc_credit','curr_cyc_debit'];
 for(var mi=0;mi<keys.length;mi++){var mk=keys[mi],cv=cents(ar[mk]);if(cv===null){err('acctdata.dat',ar.line,mk,'invalid implied-decimal amount');}else if(mk==='curr_bal'){ar.balanceCents=cv;}}
 if(ar.balanceCents!==undefined&&Math.abs(ar.balanceCents)>99999999999){err('acctdata.dat',ar.line,'curr_bal','output picture overflow');}
}
for(var xi=0;xi<xrefs.length;xi++){
 var xr=xrefs[xi];if(!digits(xr.acct_id,11)||!accountMap[xr.acct_id]){err('cardxref.dat',xr.line,'acct_id','unresolved account');continue;}if(!digits(xr.customer_id,9)||!customerMap[xr.customer_id]){err('cardxref.dat',xr.line,'customer_id','unresolved customer');continue;}if(!links[xr.acct_id]){links[xr.acct_id]=[];}links[xr.acct_id].push(xr.customer_id);
}
for(var ti=0;ti<transactions.length;ti++){
 var tr=transactions[ti];if(tr.tran_id.trim()===''){err('transact.dat',tr.line,'tran_id','blank primary key');}if(Object.prototype.hasOwnProperty.call(tranMap,tr.tran_id)){err('transact.dat',tr.line,'tran_id','duplicate primary key');}else{tranMap[tr.tran_id]=true;}
 if(!digits(tr.cat_cd,4)){err('transact.dat',tr.line,'cat_cd','invalid numeric category');}if(!digits(tr.merchant_id,9)){err('transact.dat',tr.line,'merchant_id','invalid numeric merchant identifier');}
 tr.amountCents=cents(tr.amt);if(tr.amountCents===null){err('transact.dat',tr.line,'amt','invalid implied-decimal amount');}
 if(!digits(tr.card_num,16)||!xrefMap[tr.card_num]){err('transact.dat',tr.line,'card_num','unresolved card');continue;}var account=xrefMap[tr.card_num].acct_id;if(!accountMap[account]){err('transact.dat',tr.line,'card_num','card has unresolved account');continue;}if(!byAccount[account]){byAccount[account]=[];}byAccount[account].push(tr);
}
for(var ac=0;ac<accounts.length;ac++){
 var acc=accounts[ac];if(!links[acc.acct_id]||!links[acc.acct_id].length){err('acctdata.dat',acc.line,'acct_id','no linked customer');continue;}links[acc.acct_id].sort();acc.customer=customerMap[links[acc.acct_id][0]];if(!digits(acc.customer.fico,3)){err('custdata.dat',acc.customer.line,'fico','invalid score digits');}
 var activity=byAccount[acc.acct_id]||[];activity.sort(function(a,b){return a.tran_id<b.tran_id?-1:a.tran_id>b.tran_id?1:a.line-b.line;});var total=0;for(var at=0;at<activity.length;at++){if(activity[at].amountCents!==null){total+=activity[at].amountCents;if(!Number.isSafeInteger(total)||Math.abs(total)>99999999999){err('acctdata.dat',acc.line,'total','total overflow');break;}}}acc.totalCents=total;
}
function fit(v,w){return String(v).slice(0,w).padEnd(w,' ');}
function display(n,z){var a=Math.abs(n),w=Math.floor(a/100),f=String(a%100).padStart(2,'0');return(z?String(w).padStart(9,'0'):(w===0?'':String(w)).padStart(9,' '))+'.'+f+(n<0?'-':' ');}
function join(parts){return parts.map(function(s){return s.trim();}).filter(function(s){return s!=='';}).join(' ');}
function html(v){return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#39;');}
var plain=[],markup=[];
function pl(s){plain.push(fit(s,80));}function hl(s){markup.push(fit(s,100));}
if(!errors.length){
 accounts.sort(function(a,b){return Number(a.acct_id)-Number(b.acct_id);});
 for(var si=0;si<accounts.length;si++){
  var a=accounts[si],c=a.customer,name=fit(join([c.first_name,c.middle_name,c.last_name]),75),ad1=fit(c.address_line_1.trim(),50),ad2=fit(c.address_line_2.trim(),50),ad3=fit(join([c.address_line_3,c.state,c.country,c.zip]),80),id=fit(a.acct_id,20),fico=fit(c.fico,20),bal=display(a.balanceCents,true),tx=byAccount[a.acct_id]||[];
  pl('*'.repeat(31)+'START OF STATEMENT'+'*'.repeat(31));pl(name);pl(ad1);pl(ad2);pl(ad3);pl('-'.repeat(80));pl(' '.repeat(33)+'Basic Details');pl('-'.repeat(80));pl(fit('Account ID :',20)+id);pl(fit('Current Balance :',20)+bal);pl(fit('FICO Score :',20)+fico);pl('-'.repeat(80));pl(' '.repeat(30)+'TRANSACTION SUMMARY');pl('-'.repeat(80));pl(fit('Tran ID',16)+fit('Tran Details',51)+'Tran Amount');pl('-'.repeat(80));
  for(var pi=0;pi<tx.length;pi++){pl(fit(tx[pi].tran_id,16)+' '+fit(tx[pi].desc.replace(/\s+$/,''),49)+'$'+display(tx[pi].amountCents,false));}
  pl('-'.repeat(80));pl(fit('Total EXP:',10)+' '.repeat(56)+'$'+display(a.totalCents,false));pl('*'.repeat(32)+'END OF STATEMENT'+'*'.repeat(32));
  var before=['<!DOCTYPE html>','<html lang="en">','<head>','<meta charset="utf-8">','<title>HTML Table Layout</title>','</head>','<body style="margin:0px;">','<table align="center" frame="box" style="width:70%; font:12px Segoe UI,sans-serif;">','<tr>','<td colspan="3" style="padding:0px 5px;background-color:#1d1d96b3;">','<h3>Statement for Account Number: '+html(id)+'</h3>','</td>','</tr>','<tr>','<td colspan="3" style="padding:0px 5px;background-color:#FFAF33;">','<p style="font-size:16px">Bank of XYZ</p>','<p>410 Terry Ave N</p>','<p>Seattle WA 99999</p>','</td>','</tr>','<tr>','<td colspan="3" style="padding:0px 5px;background-color:#f2f2f2;">','<p style="font-size:16px">'+html(name)+' </p>','<p>'+html(ad1)+' </p>','<p>'+html(ad2)+' </p>','<p>'+html(ad3)+' </p>','</td>','</tr>','<tr>','<td colspan="3" style="padding:0px 5px;background-color:#33FFD1; text-align:center;">','<p style="font-size:16px">Basic Details</p>','</td>','</tr>','<tr>','<td colspan="3" style="padding:0px 5px;background-color:#f2f2f2;">','<p>Account ID : '+html(id)+'</p>','<p>Current Balance : '+html(bal)+'</p>','<p>FICO Score : '+html(fico)+'</p>','</td>','</tr>','<tr>','<td colspan="3" style="padding:0px 5px;background-color:#33FFD1; text-align:center;">','<p style="font-size:16px">Transaction Summary</p>','</td>','</tr>','<tr>','<td style="width:25%; padding:0px 5px; background-color:#33FF5E; text-align:left;">','<p style="font-size:16px">Tran ID</p>','</td>','<td style="width:55%; padding:0px 5px; background-color:#33FF5E; text-align:left;">','<p style="font-size:16px">Tran Details</p>','</td>','<td style="width:20%; padding:0px 5px; background-color:#33FF5E; text-align:right;">','<p style="font-size:16px">Amount</p>','</td>','</tr>'];
  for(var hi=0;hi<before.length;hi++){hl(before[hi]);}
  for(var ht=0;ht<tx.length;ht++){
   var block=['<tr>','<td style="width:25%; padding:0px 5px; background-color:#f2f2f2; text-align:left;">','<p>'+html(fit(tx[ht].tran_id,16))+'</p>','</td>','<td style="width:55%; padding:0px 5px; background-color:#f2f2f2; text-align:left;">','<p>'+html(fit(tx[ht].desc.replace(/\s+$/,''),49))+'</p>','</td>','<td style="width:20%; padding:0px 5px; background-color:#f2f2f2; text-align:right;">','<p>'+html(display(tx[ht].amountCents,false))+'</p>','</td>','</tr>'];for(var bi=0;bi<block.length;bi++){hl(block[bi]);}
  }
  var close=['<tr>','<td colspan="3" style="padding:0px 5px;background-color:#1d1d96b3;">','<h3>End of Statement</h3>','</td>','</tr>','</table>','</body>','</html>'];for(var ei=0;ei<close.length;ei++){hl(close[ei]);}
 }
}
output={statementBatch:{status:errors.length?'FAILED':'OK',errors:errors,creastmt_statements:errors.length?[]:plain,creastmt_statements_html:errors.length?[]:markup},assumptionLedger:ledger};
```

### Package outputs (SCRIPT, id=6adf906216836599f394ae35)

```javascript
var batch=input.statementBatch||{status:'FAILED',errors:['Batch data unavailable'],creastmt_statements:[],creastmt_statements_html:[]};
var ledger=Array.isArray(input.assumptionLedger)?input.assumptionLedger:[];
var draft=input.draftedAssumptions||{},rows=Array.isArray(draft.assumptions)?draft.assumptions:[];
var valid=ledger.length>0&&rows.length===ledger.length,byId={};
for(var i=0;i<rows.length;i++){var row=rows[i];if(!row||typeof row.decision!=='string'||Object.prototype.hasOwnProperty.call(byId,row.decision)){valid=false;continue;}byId[row.decision]=row;}
var chosen=[];
for(var j=0;j<ledger.length;j++){var original=ledger[j],supplied=byId[original.decision];if(!supplied||supplied['what you assumed']!==original['what you assumed']||supplied['which wiki statement (or absence of one) it rests on']!==original['which wiki statement (or absence of one) it rests on']){valid=false;}chosen.push(supplied||original);}
if(!valid){chosen=ledger;}
var errors=(batch.errors||[]).slice();if(!valid){errors.push('Assumption documentation failed validation; original decision ledger retained.');}
function cell(v){return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\|/g,'&#124;').replace(/[\r\n]+/g,' ');}
var markdown='# Statement generation assumptions\n\nInput layouts and undocumented behaviour are assumptions, not verified legacy equivalence.\n\n| decision | what you assumed | which wiki statement (or absence of one) it rests on |\n| --- | --- | --- |\n';
for(var k=0;k<chosen.length;k++){var r=chosen[k];markdown+='| '+cell(r.decision)+' | '+cell(r['what you assumed'])+' | '+cell(r['which wiki statement (or absence of one) it rests on'])+' |\n';}
var ok=batch.status==='OK'&&valid&&errors.length===0;
output={result:{status:ok?'OK':'FAILED',errors:errors,creastmt_statements:ok?batch.creastmt_statements:[],creastmt_statements_html:ok?batch.creastmt_statements_html:[],assumptions:chosen,'assumptions.md':markdown}};
```

### Draft assumptions failed (SCRIPT, id=6adf906216836599f394ae36)

```javascript
output = {"draftedAssumptions": {}};

```

_(server: 246 ms, 1 API call, 230 ms in API)_
