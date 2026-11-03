# Workflow: CardDemoInterestCalculation

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** 

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ade9af53e84447dc43a2a5f | <uuid> | (0, 0) | → Calculate interest (seq:<uuid>) |
| End | END | 6ade9af53e84447dc43a2a60 | <uuid> | (1200, 0) | — |
| Calculate interest | SCRIPT | 6ade9af53e84447dc43a2a61 | <uuid> | (300, 0) | → Draft assumptions (seq:<uuid>) | lang: JAVASCRIPT |
| Draft assumptions | AI | 6ade9af53e84447dc43a2a62 | <uuid> | (600, 0) | → Assemble result [SUCCESS] (seq:<uuid>), → Draft assumptions failed [FAIL] (seq:<uuid>) | responseKey: assumptionDraft, aiType: TEXT_UNDERSTANDING, responseSchema: set |
| Assemble result | SCRIPT | 6ade9af53e84447dc43a2a63 | <uuid> | (900, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| Draft assumptions failed | SCRIPT | 6ade9af53e84447dc43a2a64 | <uuid> | (600, 200) | → Assemble result (seq:<uuid>) | lang: JAVASCRIPT |

## Systems
_(none)_

## AI prompts

### Draft assumptions (TEXT_UNDERSTANDING, id=6ade9af53e84447dc43a2a62)
instructions:

```
Render the provided authoritative assumption ledger as Markdown. Receive only that ledger, never financial records. Do not add, omit, paraphrase or infer any decision or source, and never claim files were written. Return only an object with assumptionsMarkdown. The Markdown must be exactly: a line '# Assumptions', a blank line, '| Assumption | What was assumed | Wiki statement or absence | Source |', then '| --- | --- | --- | --- |', then one line per ledger entry in original order, formatted '| '+assumptionId+' | '+whatAssumed+' | '+wikiStatementOrAbsence+' | '+source+' |'. Replace any literal pipe in a value with '\|' and any newline in a value with a space. Join all lines with a single newline and no final newline. The structured ledger is authoritative; any difference will use a deterministic fallback.
```
userMessage:

```
${assumptionLedger}
```
exampleOutputJsonSchema:

```
{"title":"Response","type":"object","properties":{"assumptionsMarkdown":{"type":"string"}},"required":["assumptionsMarkdown"],"additionalProperties":false}
```

## Scripts

### Calculate interest (SCRIPT, id=6ade9af53e84447dc43a2a61)

```javascript
var ledger = [];
function assume(id, what, basis, pages) { ledger.push({assumptionId:id,whatAssumed:what,wikiStatementOrAbsence:basis,source:'intcalc-opus.pdf '+pages}); }
assume('A01','Rates are decimal multipliers with at most six fractional digits; apply once without annualisation or proration. Signed rates are accepted.','p.2 says interest = currentBalance × interestRate(groupId), but gives no units, precision, sign restriction or accrual interval.','pp.2,4');
assume('A02','Use exact decimal arithmetic; round each signed product half away from zero to cents before adding it to the account.','Exact formula and rounding are explicitly TODO.','pp.2,4');
assume('A03','Process all supplied accounts including inactive and negative balances. Emit no transaction for interest rounded to zero.','Zero balance must give zero interest; eligibility and zero-transaction creation are otherwise unspecified.','pp.2,4');
assume('A04','Use one unique disclosure-group rate per account, matching group strings after removing trailing spaces; calculate from current balance, not category balances.','The wiki names account balance and group rate, while detailed grouping is TODO.','p.2');
assume('A05','Change only curr_bal on each account; preserve cycle totals and all other contracted fields. Add nonzero interest to category IN/9999, creating that category if absent.','Posting to balance and category balance is stated, but the category and cycle-field updates are not defined; the contract requires every account.','pp.2,8,10-11');
assume('A06','Interest transaction type_cd is IN, cat_cd is 9999, source is INTCALC, desc is Interest, merchant_id is 0 and merchant text fields are empty.','Transaction output fields are listed without interest-specific values.','p.10');
assume('A07','Transaction id is IC plus the 11-digit zero-padded account id plus 001. Use the lexicographically smallest linked card number, or empty if none exists.','The cross-reference and transaction fields exist, but transaction numbering and card selection are unspecified.','pp.7,10');
assume('A08','Default to business date 2022-07-18 and parameter 2022071800. Require a valid YYYY-MM-DD date and ten-digit parameter beginning with YYYYMMDD. Both transaction timestamps are YYYY-MM-DD 00:00:00.000000 without timezone conversion.','The run date and parameter are supplied, but parameter semantics and timestamp construction are not.','pp.8,10');
assume('A09','Reject the entire request on missing arrays or account fields, duplicate keys, missing rates, malformed numeric/date/text values or account/category monetary overflow. Empty accounts is valid. Monetary numeric inputs must have ordinary decimal notation and at most two fractional digits. Account and category identifiers must be JSON integers in their copybook ranges; card references must have 16 digit strings.','Keys, numeric sizes and some string lengths are given; validation, defaults and batch failure policy are unspecified.','pp.5-8,10-11');
assume('A10','Return money as two-decimal strings and identifiers as integers. Preserve account order and emitted-transaction order. Do not mutate inputs or persist records; calls calculate independently without replay protection.','The contract permits amount strings and any object-list order. Replay handling is unspecified, and storage writes are outside the selected partial scope.','pp.10-11');
assume('A11','Caller supplies already-decoded POSTTRAN account and category balances. Do not run POSTTRAN or use daily transactions, customers, full card data, transaction types or transaction categories in this isolated calculation.','Step isolation expressly supplies oracle POSTTRAN outputs to INTCALC; parsing of files is excluded in the selected partial delivery.','p.10');
assume('A12','Return intended JSON and Markdown file contents and mark each written=false. Do not read or create any file. Return assumptions on success and failure.','CONTRACT.md requires actual files and the maker requests assumptions.md; the maker explicitly selected the partial structured-results implementation because file writing is unavailable.','pp.10-11; maker scope response');
assume('A13','A model receives only this ledger and may render Markdown; preserve the structured ledger as authoritative. Use deterministic full-ledger Markdown on model failure or whenever the proposed Markdown differs from the authoritative rendering.','The request requires every decision and its wiki basis; it does not prescribe a rendering mechanism. This is an implementation default that cannot change calculations.','pp.1-11; maker request');
var errors=[];
function bad(message){errors.push(message);}
function trimEnd(s){return s.replace(/\s+$/,'');}
function isInteger(n){return typeof n==='number' && isFinite(n) && Math.floor(n)===n;}
function aid(n){return isInteger(n)&&n>=0&&n<=99999999999;}
function validDate(s){if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;var y=Number(s.slice(0,4)),m=Number(s.slice(5,7)),d=Number(s.slice(8,10));var days=[31,((y%4===0&&y%100!==0)||y%400===0)?29:28,31,30,31,30,31,31,30,31,30,31];return y>=1&&m>=1&&m<=12&&d>=1&&d<=days[m-1];}
function cents(value,limit,label){var s=String(value);if((typeof value!=='number'&&typeof value!=='string')||!/^[-+]?\d+(\.\d{1,2})?$/.test(s)){bad(label+' must be a decimal amount with at most two fractional digits');return 0;}var neg=s.charAt(0)==='-';if(s.charAt(0)==='-'||s.charAt(0)==='+')s=s.slice(1);var p=s.split('.');var n=Number(p[0])*100+Number(((p[1]||'')+'00').slice(0,2));if(!isFinite(n)||n>limit||Math.floor(n)!==n){bad(label+' monetary overflow');return 0;}return neg?-n:n;}
function amount(n){var a=Math.abs(n);return (n<0?'-':'')+Math.floor(a/100)+'.'+('0'+(a%100)).slice(-2);}
function rate(value,label){var s=String(value);if((typeof value!=='number'&&typeof value!=='string')||!/^[-+]?\d+(\.\d{1,6})?$/.test(s)){bad(label+' must be a decimal multiplier with at most six fractional digits');return {negative:false,digits:'0'};}var neg=s.charAt(0)==='-';if(s.charAt(0)==='-'||s.charAt(0)==='+')s=s.slice(1);var p=s.split('.');return {negative:neg,digits:(p[0]+((p[1]||'')+'000000').slice(0,6)).replace(/^0+/,'')||'0'};}
function multiply(a,b){var z=[];var i,j;for(i=0;i<a.length+b.length;i++)z.push(0);for(i=a.length-1;i>=0;i--){for(j=b.length-1;j>=0;j--){var k=i+j+1;var v=z[k]+Number(a.charAt(i))*Number(b.charAt(j));z[k]=v%10;z[k-1]+=Math.floor(v/10);}}return z.join('').replace(/^0+/,'')||'0';}
function interest(c,r,label){var p=multiply(String(Math.abs(c)),r.digits);while(p.length<7)p='0'+p;var whole=p.slice(0,-6),fraction=p.slice(-6);if(whole.length>12){bad(label+' interest overflow');return 0;}var n=Number(whole)+(Number(fraction)>=500000?1:0);if(n>999999999999){bad(label+' interest overflow');return 0;}return ((c<0)!==r.negative)?-n:n;}
var arrays=['accounts','disclosureRates','cardXrefs','categoryBalances'];for(var ai=0;ai<arrays.length;ai++){if(!Array.isArray(input[arrays[ai]]))bad(arrays[ai]+' must be an array');}
var accounts=Array.isArray(input.accounts)?input.accounts:[];
var rates=Array.isArray(input.disclosureRates)?input.disclosureRates:[];
var xrefs=Array.isArray(input.cardXrefs)?input.cardXrefs:[];
var categories=Array.isArray(input.categoryBalances)?input.categoryBalances:[];
var date=input.businessDate===undefined?'2022-07-18':input.businessDate;
var param=input.intcalcParameter===undefined?'2022071800':input.intcalcParameter;
if(!validDate(date))bad('businessDate must be a valid YYYY-MM-DD date');
if(typeof param!=='string'||!/^\d{10}$/.test(param)||typeof date!=='string'||param.slice(0,8)!==date.replace(/-/g,''))bad('intcalcParameter must have ten digits and begin with the business date');
var rateMap={},cards={},seenX={},catMap={},newCats=[],seenAccounts={},prepared=[];
for(var ri=0;ri<rates.length;ri++){var rr=rates[ri];if(!rr||typeof rr!=='object'||typeof rr.group_id!=='string'||trimEnd(rr.group_id).length>10){bad('Invalid disclosure rate at '+ri);continue;}var rk='$'+trimEnd(rr.group_id);if(Object.prototype.hasOwnProperty.call(rateMap,rk)){bad('Duplicate disclosure group at '+ri);continue;}rateMap[rk]=rate(rr.rate,'Rate '+ri);}
for(var xi=0;xi<xrefs.length;xi++){var x=xrefs[xi];if(!x||!aid(x.acct_id)||typeof x.card_num!=='string'||!/^\d{16}$/.test(x.card_num)){bad('Invalid card cross-reference at '+xi);continue;}var xk='$'+x.card_num;if(seenX[xk])bad('Duplicate card cross-reference at '+xi);seenX[xk]=true;var ak='$'+x.acct_id;if(!cards[ak]||x.card_num<cards[ak])cards[ak]=x.card_num;}
for(var ci=0;ci<categories.length;ci++){var cat=categories[ci];if(!cat||!aid(cat.acct_id)||typeof cat.type_cd!=='string'||trimEnd(cat.type_cd).length>2||!isInteger(cat.cat_cd)||cat.cat_cd<0||cat.cat_cd>9999){bad('Invalid category balance at '+ci);continue;}var ck='$'+cat.acct_id+'|'+trimEnd(cat.type_cd)+'|'+cat.cat_cd;if(Object.prototype.hasOwnProperty.call(catMap,ck)){bad('Duplicate category balance at '+ci);continue;}var cc=cents(cat.bal,99999999999,'Category '+ci);catMap[ck]=newCats.length;newCats.push({acct_id:cat.acct_id,type_cd:trimEnd(cat.type_cd),cat_cd:cat.cat_cd,bal:amount(cc)});}
var fields=['acct_id','active_status','curr_bal','credit_limit','cash_credit_limit','open_date','expiration_date','reissue_date','curr_cyc_credit','curr_cyc_debit','addr_zip','group_id'];
var money=['curr_bal','credit_limit','cash_credit_limit','curr_cyc_credit','curr_cyc_debit'];
for(var a=0;a<accounts.length;a++){var row=accounts[a];if(!row||typeof row!=='object'||Array.isArray(row)){bad('Invalid account at '+a);continue;}var copy={};for(var f=0;f<fields.length;f++){var field=fields[f];if(!Object.prototype.hasOwnProperty.call(row,field))bad('Account '+a+' missing '+field);copy[field]=row[field];}if(!aid(row.acct_id)){bad('Invalid account identifier at '+a);}var key='$'+row.acct_id;if(seenAccounts[key])bad('Duplicate account at '+a);seenAccounts[key]=true;var cb=0;for(var mi=0;mi<money.length;mi++){var mk=money[mi];var mc=cents(row[mk],999999999999,'Account '+a+' '+mk);if(mk==='curr_bal')cb=mc;}
if(typeof row.active_status!=='string'||trimEnd(row.active_status).length!==1)bad('Invalid active_status at '+a);
if(typeof row.addr_zip!=='string'||trimEnd(row.addr_zip).length>10)bad('Invalid addr_zip at '+a);
if(typeof row.group_id!=='string'||trimEnd(row.group_id).length>10)bad('Invalid group_id at '+a);
if(!validDate(row.open_date)||!validDate(row.expiration_date)||(row.reissue_date!==''&&row.reissue_date!==null&&!validDate(row.reissue_date)))bad('Invalid account date at '+a);
var group=typeof row.group_id==='string'?'$'+trimEnd(row.group_id):'$';if(!Object.prototype.hasOwnProperty.call(rateMap,group))bad('Missing disclosure rate for account '+a);
prepared.push({record:copy,balance:cb,group:group});}
var outAccounts=[],transactions=[];
if(errors.length===0){for(var pi=0;pi<prepared.length;pi++){var item=prepared[pi];var interestCents=interest(item.balance,rateMap[item.group],'Account '+pi);var next=item.balance+interestCents;if(Math.abs(next)>999999999999)bad('Account '+pi+' resulting balance overflow');item.record.curr_bal=amount(next);outAccounts.push(item.record);if(interestCents!==0){var id=String(item.record.acct_id);while(id.length<11)id='0'+id;var stamp=date+' 00:00:00.000000';transactions.push({tran_id:'IC'+id+'001',type_cd:'IN',cat_cd:9999,source:'INTCALC',desc:'Interest',amt:amount(interestCents),merchant_id:0,merchant_name:'',merchant_city:'',merchant_zip:'',card_num:cards['$'+item.record.acct_id]||'',orig_ts:stamp,proc_ts:stamp});var target='$'+item.record.acct_id+'|IN|9999';var index=catMap[target];if(index===undefined){index=newCats.length;catMap[target]=index;newCats.push({acct_id:item.record.acct_id,type_cd:'IN',cat_cd:9999,bal:'0.00'});}var prev=cents(newCats[index].bal,99999999999,'Interest category');var nb=prev+interestCents;if(Math.abs(nb)>99999999999)bad('Interest category balance overflow for account '+pi);newCats[index].bal=amount(nb);}}}
if(errors.length){outAccounts=[];transactions=[];newCats=[];}
output={calculation:{status:errors.length?'INVALID_INPUT':'OK',errors:errors,intcalc_systran:transactions,intcalc_acctdata:outAccounts,updatedCategoryBalances:newCats},assumptionLedger:ledger};
```

### Assemble result (SCRIPT, id=6ade9af53e84447dc43a2a63)

```javascript
var ledger=Array.isArray(input.assumptionLedger)?input.assumptionLedger:[];
function cell(s){return String(s).replace(/\|/g,'\\|').replace(/[\r\n]/g,' ');}
var lines=['# Assumptions','','| Assumption | What was assumed | Wiki statement or absence | Source |','| --- | --- | --- | --- |'];
for(var i=0;i<ledger.length;i++){var a=ledger[i];lines.push('| '+cell(a.assumptionId)+' | '+cell(a.whatAssumed)+' | '+cell(a.wikiStatementOrAbsence)+' | '+cell(a.source)+' |');}
var canonical=lines.join('\n');
var proposed=input.assumptionDraft&&input.assumptionDraft.assumptionsMarkdown;
var markdown=typeof proposed==='string'&&proposed===canonical?proposed:canonical;
var c=input.calculation||{status:'INVALID_INPUT',errors:['Calculation result unavailable'],intcalc_systran:[],intcalc_acctdata:[],updatedCategoryBalances:[]};
var names=['dailytran.dat','acctdata.dat','cardxref.dat','tcatbal.dat','discgrp.dat','custdata.dat','carddata.dat','trantype.dat','trancatg.dat'];var inputs=[];for(var n=0;n<names.length;n++)inputs.push({fileName:names[n],read:false});
output={result:{status:c.status,errors:c.errors,intcalc_systran:c.intcalc_systran,intcalc_acctdata:c.intcalc_acctdata,updatedCategoryBalances:c.updatedCategoryBalances,assumptions:ledger,assumptionsMarkdown:markdown,inputFiles:inputs,outputFiles:[{fileName:'intcalc_systran.json',format:'JSON array of transaction objects',content:c.intcalc_systran,written:false},{fileName:'intcalc_acctdata.json',format:'JSON array of account objects',content:c.intcalc_acctdata,written:false},{fileName:'assumptions.md',format:'Markdown',content:markdown,written:false}]}};
```

### Draft assumptions failed (SCRIPT, id=6ade9af53e84447dc43a2a64)

```javascript
output = {"assumptionDraft": {}};

```

_(server: 181 ms, 1 API call, 177 ms in API)_
