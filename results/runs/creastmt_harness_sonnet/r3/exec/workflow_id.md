# Workflow: GenerateCardStatements

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** 

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6adf83cb16836599f3948160 | <uuid> | (0, 0) | → Generate statements (seq:<uuid>) |
| End | END | 6adf83cb16836599f3948161 | <uuid> | (1200, 0) | — |
| Generate statements | SCRIPT | 6adf83cb16836599f3948162 | <uuid> | (300, 0) | → Draft assumptions (seq:<uuid>) | lang: JAVASCRIPT |
| Draft assumptions | AI | 6adf83cb16836599f3948163 | <uuid> | (600, 0) | → Assemble result [SUCCESS] (seq:<uuid>), → Draft assumptions failed [FAIL] (seq:<uuid>) | responseKey: assumptionDraft, aiType: TEXT_UNDERSTANDING, responseSchema: set |
| Assemble result | SCRIPT | 6adf83cb16836599f3948164 | <uuid> | (900, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| Draft assumptions failed | SCRIPT | 6adf83cb16836599f3948165 | <uuid> | (600, 200) | → Assemble result (seq:<uuid>) | lang: JAVASCRIPT |

## Systems
_(none)_

## AI prompts

### Draft assumptions (TEXT_UNDERSTANDING, id=6adf83cb16836599f3948163)
instructions:

```
Write the implementation's assumptions ledger from the supplied assumptionFacts only. Return exactly one entry per supplied identifier, in supplied order. Each entry must have id, whatYouAssumed, consequence and wikiStatementOrAbsence. Draft clear English for whatYouAssumed and consequence without changing or omitting any supplied choice. Copy id and the entire wikiStatementOrAbsence property exactly, including page references and statements of absence. Do not add entries or invent business rules. Distinguish documented facts from implementation assumptions and missing evidence. Never claim oracle parity or verified original-copybook offsets. Do not calculate, select, format or modify statement records. You receive only implementation facts, no customer records. Do not use outside knowledge. Output only the structured object required by the schema.
```
userMessage:

```
Draft one source-linked entry for every implementation fact in this list: ${assumptionFacts}
```
exampleOutputJsonSchema:

```
{"title":"Response","type":"object","additionalProperties":false,"required":["entries"],"properties":{"entries":{"type":"array","items":{"type":"object","additionalProperties":false,"required":["id","whatYouAssumed","consequence","wikiStatementOrAbsence"],"properties":{"id":{"type":"string"},"whatYouAssumed":{"type":"string"},"consequence":{"type":"string"},"wikiStatementOrAbsence":{"type":"string"}}}}}}
```

## Scripts

### Generate statements (SCRIPT, id=6adf83cb16836599f3948162)

```javascript
var facts = [];
function fact(id, assumption, consequence, source) { facts.push({id:id,whatYouAssumed:assumption,consequence:consequence,wikiStatementOrAbsence:source}); }
var layouts = {
 'acctdata.dat': {width:300,page:'creastmt-sonnet.pdf p.6',fields:[['acct_id',11],['active_status',1],['curr_bal',12],['credit_limit',12],['cash_credit_limit',12],['open_date',10],['expiration_date',10],['reissue_date',10],['curr_cyc_credit',12],['curr_cyc_debit',12],['addr_zip',10],['group_id',10]]},
 'custdata.dat': {width:500,page:'creastmt-sonnet.pdf p.7',fields:[['customer_id',9],['first_name',25],['middle_name',25],['last_name',25],['address1',50],['address2',50],['address3',50],['state',2],['country',3],['zip',10],['phone1',15],['phone2',15],['ssn',9],['government_id',20],['dob',10],['eft_account_id',10],['primary_holder',1],['fico',3]]},
 'cardxref.dat': {width:50,page:'creastmt-sonnet.pdf p.8',fields:[['card_num',16],['customer_id',9],['acct_id',11]]},
 'transact.dat': {width:350,page:'creastmt-sonnet.pdf pp.8-9',fields:[['tran_id',16],['type_cd',2],['cat_cd',4],['source',10],['desc',100],['amt',11],['merchant_id',9],['merchant_name',50],['merchant_city',50],['merchant_zip',10],['card_num',16],['orig_ts',26],['proc_ts',26]]}
};
Object.keys(layouts).forEach(function(file,i){var l=layouts[file],pos=1,parts=[];l.fields.forEach(function(f){parts.push(f[0]+' '+pos+'-'+(pos+f[1]-1));pos+=f[1];});parts.push('filler '+pos+'-'+l.width);fact('LAYOUT-'+(i+1),'Use provisional sequential layout for '+file+': '+parts.join('; ')+'.','Decode exactly '+l.width+' characters per record; these offsets are inferred, not verified original-copybook offsets.',l.page+'; creastmt-sonnet.pdf p.26: input files reference copybooks but the original copybooks and explicit byte offsets are absent.');});
fact('ENCODING','Interpret supplied file contents as decoded text, preserve leading zeros in identifiers, and decode signed numeric pictures as implied-decimal display digits with a final ASCII overpunch ({/A-I positive, }/J-R negative); a digit final character is positive.','Never use binary floating-point for amounts: decoded numeric magnitudes are integer cents. Original encoding and signed storage are not verified.','creastmt-sonnet.pdf pp.6,8-9: signed numeric pictures and two-decimal amounts; p.26: fixed-width inputs. Original copybook sign/encoding details are absent.');
fact('LINES','Accept LF or CRLF, remove one final record terminator, permit an empty file, and reject internal blank records or wrong record lengths.','File decoding is strict and never silently pads or drops a damaged record.','creastmt-sonnet.pdf p.26: fixed-width text, one record per line. Newline conventions and malformed-record recovery are unspecified.');
fact('INTERFACE','Receive the four named raw file contents under files; return the two output line lists under their extensionless file names, plus assumptions.md and structured assumptions together.','No external filesystem, file gateway or customer delivery is implied.','creastmt-sonnet.pdf p.26: a run may return the same lines as a list of strings under the file name without extension; file-gateway connection and publication destination are not supplied.');
fact('CARD-DRIVER','Generate one statement per cross-reference card sorted lexically by its fixed-width card number, rather than one pooled statement per account.','Two cards sharing an account receive separate statements.','creastmt-sonnet.pdf p.2 BR-01: Statement driven by CardXref order (card number); p.4 scenario 1: One statement per card.');
fact('TRANSACTIONS','Select only transactions whose card number matches the current cross-reference and sort them by transaction ID; ignore transactions with no cross-reference.','Never pool another card\'s transactions, including cards sharing an account; unmatched transactions do not create statements.','creastmt-sonnet.pdf p.2 BR-02: Transactions are keyed by card number + transaction id. Orphan-transaction treatment is not specified.');
fact('PERIOD','Do not apply a date/cycle or active-status filter.','All supplied matching transactions contribute, regardless of timestamps or account status.','creastmt-sonnet.pdf p.3: legacy prints all transactions on file; confirm cycle filter requirement is a TODO. No active-status selection rule is stated.');
fact('NAME','Trim each name part and join nonempty first, middle and last names with one space.','Suppress blank name fragments; truncate the resulting text name to X(75).','creastmt-sonnet.pdf p.4: verify address formatting; p.7 lists name fields; p.27 specifies customer name X(75). Name concatenation is unspecified.');
fact('ADDRESS','Use trimmed customer address lines 1 and 2 separately; join nonempty address line 3, state and ZIP with single spaces for the third printed address line.','Do not substitute account ZIP or print country.','creastmt-sonnet.pdf p.21: address (3 lines, state, zip); p.27 provides three address slots. Exact concatenation, punctuation and account/customer ZIP precedence are not defined.');
fact('FICO','Render a blank customer FICO as 0; otherwise require three decimal digits and render the numeric value left-aligned in X(20).','No FICO lookup or recalculation occurs.','creastmt-sonnet.pdf p.7: ficoScore is optional; p.27 requires FICO score X(20). Blank-value formatting is unspecified.');
fact('TOTAL','Sum signed transaction amounts in integer cents per card, with zero for no transactions; enforce a nine-digit integer magnitude for printed amounts.','Reject overflow instead of truncating money; negative transactions reduce the total.','creastmt-sonnet.pdf p.2 BR-03: total expenditure = sum of amounts; p.4 scenario 4: card without transactions has zero total; p.27 amount pictures. Overflow treatment is unspecified.');
fact('CONTENT','Follow only the contract slots: omit SSN, country, phone, dates, credit limits and cycle totals; add no HTML expenditure-total block.','Both formats contain only the prescribed sections and fixed lines.','creastmt-sonnet.pdf p.21 explicitly excludes SSN and mentions extra content; pp.27-29 define the output layouts without these extra slots or an HTML total block.');
fact('PICTURES','Use leading-zero 9(9).99- for current balance and leading-space Z(9).99- for transaction amounts and total; the final sign is minus only for negative values.','Do not introduce currency signs except the literal dollar slots in the text transaction/total rows.','creastmt-sonnet.pdf p.27: picture notation and output positions.');
fact('SEPARATORS','Interpret repeated line numbers in the contract as annotations: retain every listed separator occurrence in sequence.','No blank lines or unlisted page breaks are inserted between concatenated statements.','creastmt-sonnet.pdf p.27 repeats line labels 5,12,14 while prescribing lines in this order; pagination and between-statement spacing are unspecified.');
fact('WIDTHS','Truncate text fields to stated picture widths and right-pad final text records to 80 and HTML records to 100 characters.','Returned line lengths are exact, although the contract permits omitted trailing spaces.','creastmt-sonnet.pdf pp.26-28: fixed-length records, X(n) pictures, trailing spaces may be omitted.');
fact('HTML','Escape inserted HTML text (&, <, >, double quote and apostrophe), then right-truncate any assembled HTML record longer than 100 characters.','Escaping may expand a field and truncation may cut markup; no undocumented wrapping or redesigned markup is added.','creastmt-sonnet.pdf pp.27-29 specify literal HTML lines padded to 100; escaping and overlength-record behaviour are unspecified.');
fact('INVALID','Fail the entire batch on missing input files, malformed records, duplicate account/customer/card keys, duplicate card-plus-transaction keys, unresolved referenced account/customer, or numeric overflow.','Return an error identifying file/record context without raw records and publish no partial statements.','creastmt-sonnet.pdf p.23 BR-02: A failing step stops the chain. Statement-level recovery and duplicate/missing-reference handling are unspecified.');
fact('EMPTY','Require all four file names even when empty; an all-empty set is a valid batch with two empty output lists.','An empty cross-reference file creates no statements.','creastmt-sonnet.pdf p.26 lists the four inputs; p.2 makes cross-references the driver. Missing-file and all-empty outcomes are unspecified.');
fact('DRAFTING','Draft assumption prose with a model from these explicit facts only; preserve every identifier and exact source citation and send no customer record data.','The model cannot calculate, select or change statement contents.','Maker requested each assumption and its wiki basis in assumptions.md; no prose-drafting mechanism is specified in the wiki.');
fact('DRAFT-FAILURE','Validate the draft\'s complete set of identifiers and exact source fields before publishing statements; on drafting failure return FAILED, no statements, and the explicit facts as diagnostic assumptions.md.','A missing or incomplete ledger cannot be mistaken for a complete statement run.','Maker requires assumptions.md beside outputs; drafting failures and recovery are unspecified in the wiki.');
var batch={status:'FAILED',error:'Input files are required.'};
function trim(v){return String(v).replace(/^ +| +$/g,'');}
function fail(file,row,msg){throw new Error(file+(row?' record '+row:'')+': '+msg);}
function parse(file){var l=layouts[file],v=(input.files||{})[file];if(typeof v!=='string')fail(file,0,'required text input is missing');if(v==='')return [];var a=v.split(/\r?\n/);if(a[a.length-1]==='')a.pop();return a.map(function(line,index){if(line.length!==l.width)fail(file,index+1,'invalid record length');var p=0,r={_file:file,_row:index+1};l.fields.forEach(function(f){r[f[0]]=line.substr(p,f[1]);p+=f[1];});return r;});}
function ident(r,key){var s=r[key];if(!/^\d+$/.test(s))fail(r._file,r._row,'invalid '+key);return s;}
function cents(r,key){var s=r[key],last=s.charAt(s.length-1),p='{ABCDEFGHI'.indexOf(last),n='}JKLMNOPQR'.indexOf(last),negative=false;if(p>=0)s=s.slice(0,-1)+String(p);else if(n>=0){s=s.slice(0,-1)+String(n);negative=true;}if(!/^\d+$/.test(s))fail(r._file,r._row,'invalid '+key+' signed numeric field');var x=Number(s);if(!Number.isSafeInteger(x))fail(r._file,r._row,'numeric overflow');return negative?-x:x;}
function indexBy(rows,key){var m=Object.create(null);rows.forEach(function(r){var k=ident(r,key);if(m[k])fail(r._file,r._row,'duplicate '+key);m[k]=r;});return m;}
function pad(s,n){s=String(s);return s.substr(0,n)+' '.repeat(Math.max(0,n-s.length));}
function money(x,zero){if(!Number.isSafeInteger(x)||Math.abs(x)>99999999999)throw new Error('Statement numeric overflow.');var a=Math.abs(x),whole=String(Math.floor(a/100)),fraction=String(a%100).padStart(2,'0');return whole.padStart(9,zero?'0':' ')+'.'+fraction+(x<0?'-':' ');}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
try {
 var accounts=parse('acctdata.dat'),customers=parse('custdata.dat'),xrefs=parse('cardxref.dat'),transactions=parse('transact.dat');
 var am=indexBy(accounts,'acct_id'),cm=indexBy(customers,'customer_id');indexBy(xrefs,'card_num');
 accounts.forEach(function(r){['curr_bal','credit_limit','cash_credit_limit','curr_cyc_credit','curr_cyc_debit'].forEach(function(k){r['_'+k]=cents(r,k);});});
 var groups=Object.create(null),seen=Object.create(null);
 transactions.forEach(function(r){ident(r,'card_num');if(!trim(r.tran_id))fail(r._file,r._row,'blank tran_id');var k=r.card_num+'|'+r.tran_id;if(seen[k])fail(r._file,r._row,'duplicate card and transaction key');seen[k]=true;r._amt=cents(r,'amt');if(!/^\d{4}$/.test(r.cat_cd)||!/^\d{9}$/.test(r.merchant_id))fail(r._file,r._row,'invalid category or merchant numeric field');if(!groups[r.card_num])groups[r.card_num]=[];groups[r.card_num].push(r);});
 Object.keys(groups).forEach(function(k){groups[k].sort(function(a,b){return a.tran_id<b.tran_id?-1:a.tran_id>b.tran_id?1:0;});});
 xrefs.sort(function(a,b){return a.card_num<b.card_num?-1:a.card_num>b.card_num?1:0;});
 var text=[],html=[],rule='-'.repeat(80);
 xrefs.forEach(function(x){ident(x,'acct_id');ident(x,'customer_id');var a=am[x.acct_id],c=cm[x.customer_id];if(!a||!c)fail(x._file,x._row,'referenced account or customer not found');var name=[c.first_name,c.middle_name,c.last_name].map(trim).filter(function(s){return s!=='';}).join(' '),ad1=trim(c.address1),ad2=trim(c.address2),ad3=[c.address3,c.state,c.zip].map(trim).filter(function(s){return s!=='';}).join(' ');var fs=trim(c.fico);if(fs!==''&&!/^\d{3}$/.test(c.fico))fail(c._file,c._row,'invalid FICO');var fico=String(fs===''?0:Number(fs));var ts=groups[x.card_num]||[],total=0;ts.forEach(function(t){total+=t._amt;if(!Number.isSafeInteger(total))fail(t._file,t._row,'total overflow');money(t._amt,false);});var balance=money(a._curr_bal,true),tot=money(total,false),aid=pad(x.acct_id,20),fp=pad(fico,20);
 var lines=['*'.repeat(31)+'START OF STATEMENT'+'*'.repeat(31),pad(name,75),pad(ad1,50),pad(ad2,50),pad(ad3,80),rule,' '.repeat(33)+'Basic Details',rule,pad('Account ID :',20)+aid,pad('Current Balance :',20)+balance,pad('FICO Score :',20)+fp,rule,' '.repeat(30)+'TRANSACTION SUMMARY',rule,pad('Tran ID',16)+pad('Tran Details',51)+'Tran Amount',rule];
 ts.forEach(function(t){lines.push(pad(t.tran_id,16)+' '+pad(trim(t.desc),49)+'$'+money(t._amt,false));});lines.push(rule,pad('Total EXP:',10)+' '.repeat(56)+'$'+tot,'*'.repeat(32)+'END OF STATEMENT'+'*'.repeat(32));lines.forEach(function(s){text.push(pad(s,80));});
 var h=['<!DOCTYPE html>','<html lang="en">','<head>','<meta charset="utf-8">','<title>HTML Table Layout</title>','</head>','<body style="margin:0px;">','<table align="center" frame="box" style="width:70%; font:12px Segoe UI,sans-serif;">','<tr>','<td colspan="3" style="padding:0px 5px;background-color:#1d1d96b3;">','<h3>Statement for Account Number: '+esc(aid)+'</h3>','</td>','</tr>','<tr>','<td colspan="3" style="padding:0px 5px;background-color:#FFAF33;">','<p style="font-size:16px">Bank of XYZ</p>','<p>410 Terry Ave N</p>','<p>Seattle WA 99999</p>','</td>','</tr>','<tr>','<td colspan="3" style="padding:0px 5px;background-color:#f2f2f2;">','<p style="font-size:16px">'+esc(name)+' </p>','<p>'+esc(ad1)+' </p>','<p>'+esc(ad2)+' </p>','<p>'+esc(ad3)+' </p>','</td>','</tr>','<tr>','<td colspan="3" style="padding:0px 5px;background-color:#33FFD1; text-align:center;">','<p style="font-size:16px">Basic Details</p>','</td>','</tr>','<tr>','<td colspan="3" style="padding:0px 5px;background-color:#f2f2f2;">','<p>Account ID : '+esc(aid)+'</p>','<p>Current Balance : '+balance+'</p>','<p>FICO Score : '+fp+'</p>','</td>','</tr>','<tr>','<td colspan="3" style="padding:0px 5px;background-color:#33FFD1; text-align:center;">','<p style="font-size:16px">Transaction Summary</p>','</td>','</tr>','<tr>','<td style="width:25%; padding:0px 5px; background-color:#33FF5E; text-align:left;">','<p style="font-size:16px">Tran ID</p>','</td>','<td style="width:55%; padding:0px 5px; background-color:#33FF5E; text-align:left;">','<p style="font-size:16px">Tran Details</p>','</td>','<td style="width:20%; padding:0px 5px; background-color:#33FF5E; text-align:right;">','<p style="font-size:16px">Amount</p>','</td>','</tr>'];
 ts.forEach(function(t){h=h.concat(['<tr>','<td style="width:25%; padding:0px 5px; background-color:#f2f2f2; text-align:left;">','<p>'+esc(pad(t.tran_id,16))+'</p>','</td>','<td style="width:55%; padding:0px 5px; background-color:#f2f2f2; text-align:left;">','<p>'+esc(pad(trim(t.desc),49))+'</p>','</td>','<td style="width:20%; padding:0px 5px; background-color:#f2f2f2; text-align:right;">','<p>'+money(t._amt,false)+'</p>','</td>','</tr>']);});
 h=h.concat(['<tr>','<td colspan="3" style="padding:0px 5px;background-color:#1d1d96b3;">','<h3>End of Statement</h3>','</td>','</tr>','</table>','</body>','</html>']);h.forEach(function(s){html.push(pad(s,100));});
 });
 batch={status:'OK',error:'',creastmt_statements:text,creastmt_statements_html:html};
} catch(e) {batch={status:'FAILED',error:String(e.message||'Statement transformation failed.')};}
output={batchResult:batch,assumptionFacts:facts};
```

### Assemble result (SCRIPT, id=6adf83cb16836599f3948164)

```javascript
var facts=Array.isArray(input.assumptionFacts)?input.assumptionFacts:[];
var draft=input.assumptionDraft||{};
if(typeof draft==='string'){try{draft=JSON.parse(draft);}catch(e){draft={};}}
var entries=Array.isArray(draft.entries)?draft.entries:[];
var valid=facts.length>0&&entries.length===facts.length;
var byId=Object.create(null);
entries.forEach(function(e){if(!e||typeof e.id!=='string'||byId[e.id]){valid=false;}else byId[e.id]=e;});
facts.forEach(function(f){var e=byId[f.id];if(!e||typeof e.whatYouAssumed!=='string'||!e.whatYouAssumed.trim()||typeof e.consequence!=='string'||!e.consequence.trim()||e.wikiStatementOrAbsence!==f.wikiStatementOrAbsence)valid=false;});
var rows=valid?facts.map(function(f){var e=byId[f.id];return {id:e.id,whatYouAssumed:e.whatYouAssumed,consequence:e.consequence,wikiStatementOrAbsence:e.wikiStatementOrAbsence};}):facts;
function cell(x){return String(x==null?'':x).replace(/\|/g,'&#124;').replace(/\r?\n/g,'<br>');}
var md='# Statement-generation assumptions\n\nOriginal copybooks and oracle fixtures were not supplied. Input offsets and encoding remain provisional; synthetic checks do not establish oracle parity.\n\n';
if(!valid)md+='Drafting failed or returned an incomplete ledger. Statements were withheld. The table below contains the explicit implementation facts, not an accepted model draft.\n\n';
md+='| Decision | What you assumed | Consequence | Which wiki statement (or absence of one) it rests on |\n| --- | --- | --- | --- |\n';
rows.forEach(function(e){md+='| '+[e.id,e.whatYouAssumed,e.consequence,e.wikiStatementOrAbsence].map(cell).join(' | ')+' |\n';});
var b=input.batchResult||{status:'FAILED',error:'Statement transformation did not return a result.'};
var result={status:'FAILED',error:b.error||'',assumptions:rows,'assumptions.md':md};
if(b.status==='OK'&&valid){result.status='OK';result.error='';result.creastmt_statements=b.creastmt_statements;result.creastmt_statements_html=b.creastmt_statements_html;}else if(!valid){result.error=(result.error?result.error+' ':'')+'Assumptions drafting failed or returned an incomplete ledger.';}
output={result:result};
```

### Draft assumptions failed (SCRIPT, id=6adf83cb16836599f3948165)

```javascript
output = {"assumptionDraft": {}};

```

_(server: 238 ms, 1 API call, 235 ms in API)_
