# Workflow: PostDailyTransactions

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** 

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae372263695c563ea50e218 | <uuid> | (0, 0) | → Calculate postings (seq:<uuid>) |
| End | END | 6ae372263695c563ea50e219 | <uuid> | (1200, 0) | — |
| Calculate postings | SCRIPT | 6ae372263695c563ea50e21a | <uuid> | (300, 0) | → Draft assumptions (seq:<uuid>) | lang: JAVASCRIPT |
| Draft assumptions | AI | 6ae372263695c563ea50e21b | <uuid> | (600, 0) | → Package results [SUCCESS] (seq:<uuid>), → Draft assumptions failed [FAIL] (seq:<uuid>) | responseKey: assumptionsDraft, aiType: TEXT_UNDERSTANDING, responseSchema: set |
| Package results | SCRIPT | 6ae372263695c563ea50e21c | <uuid> | (900, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| Draft assumptions failed | SCRIPT | 6ae372263695c563ea50e21d | <uuid> | (600, 200) | → Package results (seq:<uuid>) | lang: JAVASCRIPT |

## Systems
_(none)_

## AI prompts

### Draft assumptions (TEXT_UNDERSTANDING, id=6ae372263695c563ea50e21b)
instructions:

```
Prepare the assumptions log entries solely from the supplied authoritative decision ledger. Return a JSON object with entries. Copy every id, assumption and basis exactly, in ledger order, without omissions, additions or changes. Each assumption and its wiki statement or stated absence must remain in separate properties. explanation must be the empty string: no additional claims are authorized. Do not decide business rules, infer facts, fetch sources or request financial records. This step documents fixed implementation choices; it does not affect posting calculations.
```
userMessage:

```
Authoritative implementation decisions and wiki evidence: ${assumptionEvidence}
```
exampleOutputJsonSchema:

```
{"title":"Response","type":"object","additionalProperties":false,"required":["entries"],"properties":{"entries":{"type":"array","minItems":15,"maxItems":15,"items":{"type":"object","additionalProperties":false,"required":["id","assumption","basis","explanation"],"properties":{"id":{"type":"string"},"assumption":{"type":"string"},"basis":{"type":"string"},"explanation":{"type":"string","enum":[""]}}}}}}
```

## Scripts

### Calculate postings (SCRIPT, id=6ae372263695c563ea50e21a)

```javascript
var evidence = [
{id:'A01',assumption:'Stop validation when the card cross-reference or account is missing; after successful lookups, expiry overrides over-limit.',basis:'posttran-sonnet-dr8.pdf pp. 3-4: BR01-BR04 and the lookup order conflict with the invalid-card/expired-account example. Follow the usable lookup chain; no account is available after a missing cross-reference.',explanation:''},
{id:'A02',assumption:'Retain each incoming transaction number instead of allocating a new sequence number.',basis:'posttran-sonnet-dr8.pdf pp. 9, 23 describe sequence allocation; p. 3 BR09 uses transactionId for idempotency; p. 27 supplies no sequence starting value. The maker explicitly chose incoming numbers, a departure from the sequence wording.',explanation:''},
{id:'A03',assumption:'A separate adapter supplies decoded daily transactions, accounts, cross-references and category balances; return datasets and assumptions text, not actual files.',basis:'posttran-sonnet-dr8.pdf p. 27 lists fixed-width inputs and output files. The maker explicitly accepted a calculation-only implementation, leaving file decoding and file creation to a separate integration.',explanation:''},
{id:'A04',assumption:'Calculate monetary values in integer cents and output monetary fields as two-decimal strings.',basis:'posttran-sonnet-dr8.pdf p. 27 allows numeric or string amounts with at most two decimals; the wiki does not specify arithmetic precision. Integer cents and exactly two displayed decimals are implementation choices.',explanation:''},
{id:'A05',assumption:'Preserve a caller-supplied processing timestamp; otherwise capture UTC once per invocation in YYYY-MM-DD HH:mm:ss.SSS000 form and reuse it for all postings.',basis:'posttran-sonnet-dr8.pdf p. 3 BR05 says processedTimestamp = now; p. 10 gives a 26-character timestamp. Exact format, timezone, per-record clock sampling and replay clock control are unstated. A fixed supplied timestamp enables repeatable replay.',explanation:''},
{id:'A06',assumption:'Compare account expiration_date with the first ten characters of orig_ts as an ISO date; equality is not expired.',basis:'posttran-sonnet-dr8.pdf p. 3 BR04 compares account expiry strictly before the transaction original date. Extracting the ISO date from the timestamp is not specified explicitly.',explanation:''},
{id:'A07',assumption:'Add the signed amount to the category balance, starting missing categories at zero; add nonnegative amounts to cycle credit and negative amounts, retaining their sign, to cycle debit.',basis:'posttran-sonnet-dr8.pdf p. 3 BR05 describes signed account/cycle updates and category upsert; p. 20 specifies category-balance delta. Zero initialization and adding that delta make the missing-row upsert explicit.',explanation:''},
{id:'A08',assumption:'After a transaction number posts successfully, skip subsequent records with that same number within this invocation, count them separately and invent no reject reason; rejected numbers are not marked as successfully posted.',basis:'posttran-sonnet-dr8.pdf p. 3 BR09 requires transactionId idempotency but does not define repeated feed rows, which occurrence wins, or a duplicate reject reason. This is the invocation-local interpretation.',explanation:''},
{id:'A09',assumption:'Replay requires original starting snapshots and the same supplied processing timestamp; no persistent checkpoint or cross-invocation posting ledger is maintained.',basis:'posttran-sonnet-dr8.pdf p. 3 BR09 describes restart after the last processed index. The maker accepted calculation-only scope without storage; this deliberately does not implement durable restart against already changed balances.',explanation:''},
{id:'A10',assumption:'An empty decoded feed returns no postings or rejects, unchanged snapshots and a successful zero-count calculation; the adapter handles absent-file NO_DATA.',basis:'posttran-sonnet-dr8.pdf p. 19 maps missing/empty files to NO_DATA. The calculation receives decoded arrays, not file statuses; its empty-array success representation is an implementation assumption.',explanation:''},
{id:'A11',assumption:'Report unreadable required calculation values as separate errors, keep that record atomic and continue others. Use status ERROR and assumed return code 12; invalid starting snapshots produce empty final datasets that must not be used. Error indices are original zero-based feed positions, or -1 for a snapshot error.',basis:'posttran-sonnet-dr8.pdf pp. 3, 17, 19 define business rejects, rewrite failure 109 and integration errors but not pure-calculation errors or an error return code. BR08 excludes rewrite failure 109 from rejects. No real storage writes occur here, so 109 cannot occur. No new business reject is invented.',explanation:''},
{id:'A12',assumption:'Do not add business rejections for active status, customer records, card expiry, type/category reference catalogs or disclosure-group data; do not inspect filler bytes.',basis:'posttran-sonnet-dr8.pdf p. 3 BR01-BR04 defines the posting rejection checks. Other model fields and files on pp. 7-15 and 27 do not establish additional POSTTRAN rejection rules. The calculation reads only the values needed for posting and required output.',explanation:''},
{id:'A13',assumption:'Return every account and category balance, including untouched records, plus new categories created during posting.',basis:'posttran-sonnet-dr8.pdf p. 27 explicitly requires every account and every category balance after posting; p. 3 BR05 requires creation of missing category balances. This output boundary is required rather than an uncertain business rule.',explanation:''},
{id:'A14',assumption:'Keep digit identifiers as text for internal identity, canonicalizing account leading zeros for matching; emit integer account and transaction category/merchant identifiers where the contract requires them. Category-balance category codes remain four-character digit text.',basis:'posttran-sonnet-dr8.pdf pp. 7, 9-10 describe fixed-width string identifiers; p. 27 requires integer account identifiers and transaction cat_cd/merchant_id but does not specify category-balance cat_cd type. Internal text preserves identity; category-balance category text follows p. 10.',explanation:''},
{id:'A15',assumption:'Reject rows retain original contract transaction values, including original processing timestamps, and add integer reasons with the exact unpadded descriptions; return structured rows rather than the legacy 430-byte image.',basis:'posttran-sonnet-dr8.pdf p. 3 BR01-BR06 supplies the four descriptions and original image plus trailer; p. 27 permits structured JSON and omitted trailing spaces. The separate adapter is responsible for byte decoding and no raw dump is returned.',explanation:''}
];
function copy(v){return JSON.parse(JSON.stringify(v));}
function txt(v){if(v===undefined||v===null){throw new Error('Required value is missing');}return String(v).replace(/ +$/,'');}
function cents(v){var s=txt(v).trim(),m=/^([+-]?)([0-9]+)(?:\.([0-9]{1,2}))?$/.exec(s);if(!m){throw new Error('Unreadable two-decimal amount');}var n=Number(m[2])*100+Number(((m[3]||'')+'00').slice(0,2));if(!Number.isSafeInteger(n)){throw new Error('Amount outside exact integer-cent range');}return m[1]==='-'?-n:n;}
function plus(a,b){var n=a+b;if(!Number.isSafeInteger(n)){throw new Error('Balance outside exact integer-cent range');}return n;}
function money(n){if(!Number.isSafeInteger(n)){throw new Error('Invalid integer-cent value');}var a=Math.abs(n);return(n<0?'-':'')+String(Math.floor(a/100))+'.'+String(a%100).padStart(2,'0');}
function digit(v){var s=txt(v).trim();if(!/^[0-9]+$/.test(s)){throw new Error('Unreadable numeric identifier');}return s;}
function acctKey(v){return digit(v).replace(/^0+(?=[0-9])/,'');}
function intId(v){var n=Number(digit(v));if(!Number.isSafeInteger(n)){throw new Error('Identifier outside exact integer range');}return n;}
function catCode(v){var s=digit(v);if(s.length>4){throw new Error('Unreadable category code');}return s.padStart(4,'0');}
function catKey(a,t,c){return JSON.stringify([acctKey(a),txt(t),catCode(c)]);}
var accountText=['active_status','open_date','expiration_date','reissue_date','addr_zip','group_id'];
var accountMoney=['curr_bal','credit_limit','cash_credit_limit','curr_cyc_credit','curr_cyc_debit'];
function accountRow(a){var r={acct_id:intId(a.acct_id)};accountText.forEach(function(k){r[k]=txt(a[k]);});accountMoney.forEach(function(k){r[k]=money(cents(a[k]));});return r;}
function categoryRow(c){return{acct_id:intId(c.acct_id),type_cd:txt(c.type_cd),cat_cd:catCode(c.cat_cd),bal:money(cents(c.bal))};}
function transactionRow(t){var r={};['tran_id','type_cd','source','desc','merchant_name','merchant_city','merchant_zip','card_num','orig_ts','proc_ts'].forEach(function(k){r[k]=txt(t[k]);});r.cat_cd=intId(t.cat_cd);r.merchant_id=intId(t.merchant_id);r.amt=money(cents(t.amt));return r;}
var descriptions={100:'INVALID CARD NUMBER FOUND',101:'ACCOUNT RECORD NOT FOUND',102:'OVERLIMIT TRANSACTION',103:'TRANSACTION RECEIVED AFTER ACCT EXPIRATION'};
function calculate(bag){
 var res={posttranTransact:[],posttranDalyrejs:[],posttranAcctdata:[],posttranTcatbal:[],summary:{status:'OK',returnCode:0,readCount:0,postedCount:0,rejectedCount:0,duplicateCount:0,errorCount:0,errors:[]}};
 var s=res.summary,rows=[],accts=[],cats=[],aMap=Object.create(null),cMap=Object.create(null),xMap=Object.create(null),seen=Object.create(null);
 function error(index,id,message){s.errors.push({index:index,transactionId:id,message:message});s.errorCount++;}
 try{
  ['dailyTransactions','accounts','cardXrefs','categoryBalances'].forEach(function(k){if(bag[k]!==undefined&&!Array.isArray(bag[k])){throw new Error(k+' must be a decoded array');}});
  rows=copy(bag.dailyTransactions||[]);s.readCount=rows.length;
  accts=(bag.accounts||[]).map(accountRow);cats=(bag.categoryBalances||[]).map(categoryRow);
  accts.forEach(function(a,i){var k=acctKey(a.acct_id);if(aMap[k]!==undefined){throw new Error('Duplicate account in starting snapshot');}aMap[k]=i;});
  cats.forEach(function(c,i){var k=catKey(c.acct_id,c.type_cd,c.cat_cd);if(cMap[k]!==undefined){throw new Error('Duplicate category in starting snapshot');}cMap[k]=i;});
  (bag.cardXrefs||[]).forEach(function(x){var k=txt(x.card_num);if(xMap[k]!==undefined){throw new Error('Duplicate cross-reference in starting snapshot');}xMap[k]=acctKey(x.acct_id);});
 }catch(e){error(-1,'',String(e.message||e));s.status='ERROR';s.returnCode=12;return res;}
 var timestamp=bag.processedTimestamp===undefined||bag.processedTimestamp===null||bag.processedTimestamp===''?new Date().toISOString().replace('T',' ').replace('Z','000'):String(bag.processedTimestamp);
 var ordered=rows.map(function(t,i){try{return{row:t,index:i,amount:cents(t.amt),invalid:false};}catch(e){return{row:t,index:i,invalid:true,message:String(e.message||e)};}});
 ordered.sort(function(a,b){if(a.invalid!==b.invalid){return a.invalid?1:-1;}if(a.invalid){return a.index-b.index;}return a.amount-b.amount||a.index-b.index;});
 ordered.forEach(function(item){var t=item.row,id='';try{
  id=txt(t.tran_id);if(id===''){throw new Error('Missing transaction number');}
  if(seen[id]){s.duplicateCount++;return;}
  if(item.invalid){throw new Error(item.message);}
  var amount=item.amount,card=txt(t.card_num),aid=xMap[card],reason=0,aIndex,account;
  if(aid===undefined){reason=100;}else if(aMap[aid]===undefined){reason=101;}else{
   aIndex=aMap[aid];account=accts[aIndex];
   var exposure=plus(plus(cents(account.curr_cyc_credit),-cents(account.curr_cyc_debit)),amount);
   if(exposure>cents(account.credit_limit)){reason=102;}
   var originalDate=txt(t.orig_ts).slice(0,10),expiry=txt(account.expiration_date);
   if(!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(originalDate)||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(expiry)){throw new Error('Unreadable date needed for expiry comparison');}
   if(expiry<originalDate){reason=103;}
  }
  var tr=transactionRow(t);
  if(reason){tr.reason=reason;tr.reason_desc=descriptions[reason];res.posttranDalyrejs.push(tr);s.rejectedCount++;return;}
  var ck=catKey(account.acct_id,tr.type_cd,tr.cat_cd),ci=cMap[ck],oldCategory=ci===undefined?0:cents(cats[ci].bal);
  var nextAccount=copy(account),nextCategory=ci===undefined?{acct_id:account.acct_id,type_cd:tr.type_cd,cat_cd:catCode(tr.cat_cd),bal:'0.00'}:copy(cats[ci]);
  nextAccount.curr_bal=money(plus(cents(account.curr_bal),amount));
  if(amount>=0){nextAccount.curr_cyc_credit=money(plus(cents(account.curr_cyc_credit),amount));}else{nextAccount.curr_cyc_debit=money(plus(cents(account.curr_cyc_debit),amount));}
  nextCategory.bal=money(plus(oldCategory,amount));tr.proc_ts=timestamp;
  accts[aIndex]=nextAccount;
  if(ci===undefined){cMap[ck]=cats.length;cats.push(nextCategory);}else{cats[ci]=nextCategory;}
  res.posttranTransact.push(tr);seen[id]=true;s.postedCount++;
 }catch(e){error(item.index,id,String(e.message||e));}});
 res.posttranAcctdata=accts;res.posttranTcatbal=cats;
 s.status=s.errorCount?'ERROR':s.rejectedCount?'WARNING':'OK';s.returnCode=s.errorCount?12:s.rejectedCount?4:0;
 if(s.readCount!==s.postedCount+s.rejectedCount+s.duplicateCount+s.errorCount){throw new Error('Regression: count reconciliation');}
 return res;
}
function assert(ok,label){if(!ok){throw new Error('POSTTRAN regression failed: '+label);}}
function fixtureAccount(id){return{acct_id:id,active_status:'Y',curr_bal:'0.00',credit_limit:'500.00',cash_credit_limit:'100.00',open_date:'2020-01-01',expiration_date:'2030-01-01',reissue_date:'2020-01-01',curr_cyc_credit:'0.00',curr_cyc_debit:'0.00',addr_zip:'10001',group_id:'DEFAULT'};}
function fixtureTran(id,amt){return{tran_id:id,type_cd:'01',cat_cd:1,source:'POS TERM',desc:'Posting fixture',amt:amt,merchant_id:1,merchant_name:'Market',merchant_city:'New York',merchant_zip:'10001',card_num:'0000000000000001',orig_ts:'2022-07-18 12:00:00.000000',proc_ts:''};}
function fixtureBag(ts,aa,xx,cc){return{dailyTransactions:ts,accounts:aa||[fixtureAccount(1)],cardXrefs:xx||[{card_num:'0000000000000001',acct_id:'00000000001',cust_id:'000000001'}],categoryBalances:cc||[],processedTimestamp:'2022-07-18 15:00:00.000000'};}
function regress(){
 var b=fixtureBag([fixtureTran('p300','300.00'),fixtureTran('p120','120.00'),fixtureTran('c50','-50.00')]);var r=calculate(b);
 assert(r.posttranTransact.map(function(t){return t.tran_id;}).join(',')==='c50,p120,p300','ascending amount');
 assert(r.posttranAcctdata[0].curr_bal==='370.00'&&r.posttranAcctdata[0].curr_cyc_credit==='420.00'&&r.posttranAcctdata[0].curr_cyc_debit==='-50.00','signed cycle totals');assert(r.posttranTcatbal[0].bal==='370.00','new category delta');assert(b.accounts[0].curr_bal==='0.00','no input mutation');
 assert(JSON.stringify(r)===JSON.stringify(calculate(b)),'fixed time replay');
 var limited=fixtureAccount(1);limited.credit_limit='100.00';var ties=calculate(fixtureBag([fixtureTran('first','80.00'),fixtureTran('second','80.00')],[limited]));assert(ties.posttranTransact[0].tran_id==='first'&&ties.posttranDalyrejs[0].tran_id==='second'&&ties.posttranDalyrejs[0].reason===102,'stable equal amounts and prior updates');
 var expired=fixtureAccount(1);expired.expiration_date='2022-07-17';expired.credit_limit='0.00';var exp=calculate(fixtureBag([fixtureTran('expired','10.00')],[expired]));assert(exp.posttranDalyrejs[0].reason===103&&exp.posttranAcctdata[0].curr_bal==='0.00'&&exp.posttranTcatbal.length===0,'expiry overwrites limit atomically');
 var invalid=fixtureTran('badcard','1.00');invalid.card_num='9999999999999999';var missing=fixtureTran('missing','2.00');missing.card_num='0000000000000002';var lookups=calculate(fixtureBag([invalid,missing],undefined,[{card_num:'0000000000000002',acct_id:'2',cust_id:'2'}]));assert(lookups.posttranDalyrejs[0].reason===100&&lookups.posttranDalyrejs[1].reason===101,'lookup short circuit');assert(lookups.summary.returnCode===4,'reject warning');
 var a2=fixtureAccount(2),cat={acct_id:2,type_cd:'07',cat_cd:'0009',bal:'12.34'};var exact=calculate(fixtureBag([fixtureTran('centA','0.10'),fixtureTran('centB','0.20')],[fixtureAccount(1),a2],undefined,[cat]));assert(exact.posttranAcctdata[0].curr_bal==='0.30'&&exact.posttranAcctdata[1].curr_bal==='0.00'&&exact.posttranTcatbal[0].bal==='12.34','exact cents and untouched snapshots');assert(typeof exact.posttranTransact[0].merchant_id==='number'&&typeof exact.posttranTransact[0].cat_cd==='number'&&typeof exact.posttranAcctdata[0].acct_id==='number','contract integer types');
 var duplicate=calculate(fixtureBag([fixtureTran('same','1.23'),fixtureTran('same','1.23')]));assert(duplicate.summary.postedCount===1&&duplicate.summary.duplicateCount===1&&duplicate.posttranAcctdata[0].curr_bal==='1.23','successful duplicate');
 var errors=calculate(fixtureBag([fixtureTran('badamount','abc'),fixtureTran('good','2.00')]));assert(errors.summary.errorCount===1&&errors.summary.returnCode===12&&errors.posttranDalyrejs.length===0&&errors.posttranAcctdata[0].curr_bal==='2.00','record error isolation');
 var empty=calculate(fixtureBag([],undefined,undefined,[{acct_id:1,type_cd:'01',cat_cd:'0001',bal:'4.56'}]));assert(empty.summary.readCount===0&&empty.posttranTcatbal[0].bal==='4.56'&&empty.posttranTransact.length===0,'empty feed');
 var broken=fixtureAccount(1);broken.curr_bal='unreadable';var fatal=calculate(fixtureBag([fixtureTran('notposted','1.00')],[broken]));assert(fatal.summary.status==='ERROR'&&fatal.posttranAcctdata.length===0&&fatal.posttranTransact.length===0,'invalid starting snapshot');
 var boundary=fixtureAccount(1);boundary.expiration_date='2022-07-18';var zero=calculate(fixtureBag([fixtureTran('zero','0.00')],[boundary]));assert(zero.summary.postedCount===1,'expiry equality and zero amount');
 var fields=['tran_id','type_cd','cat_cd','source','desc','amt','merchant_id','merchant_name','merchant_city','merchant_zip','card_num','orig_ts','proc_ts'];assert(Object.keys(r.posttranTransact[0]).sort().join(',')===fields.sort().join(','),'exact transaction fields');
}
regress();
output={postingCalculation:calculate(input||{}),assumptionEvidence:{entries:evidence}};
```

### Package results (SCRIPT, id=6ae372263695c563ea50e21c)

```javascript
function clone(v){return JSON.parse(JSON.stringify(v));}
function escapeCell(t){return String(t).replace(/\|/g,'\\|').replace(/\r?\n/g,' ');}
function modelAuthoredMarkdown(entries){return '# CardDemo POSTTRAN assumptions\n\nCalculation-only implementation: decoded inputs and returned datasets; no file I/O or durable restart. Each decision is listed even if this run did not exercise it.\n\n| Decision | What was assumed | Wiki statement or absence |\n| --- | --- | --- |\n'+entries.map(function(e){return '| '+escapeCell(e.id)+' | '+escapeCell(e.assumption)+' | '+escapeCell(e.basis)+' |';}).join('\n')+'\n';}
function packageResult(calculation,evidence,draft){
 var base=(evidence&&Array.isArray(evidence.entries))?evidence.entries:[],entries=clone(base),valid=base.length===15&&draft&&Array.isArray(draft.entries)&&draft.entries.length===base.length;
 if(valid){for(var i=0;i<base.length;i++){var a=base[i],b=draft.entries[i];if(!b||b.id!==a.id||b.assumption!==a.assumption||b.basis!==a.basis||(b.explanation!==undefined&&b.explanation!=='')||Object.keys(b).some(function(k){return ['id','assumption','basis','explanation'].indexOf(k)<0;})){valid=false;break;}}}
 if(valid){entries=draft.entries.map(function(e){return{id:e.id,assumption:e.assumption,basis:e.basis,explanation:''};});}
 var r=clone(calculation||{posttranTransact:[],posttranDalyrejs:[],posttranAcctdata:[],posttranTcatbal:[],summary:{status:'ERROR',returnCode:12,readCount:0,postedCount:0,rejectedCount:0,duplicateCount:0,errorCount:1,errors:[{index:-1,transactionId:'',message:'Calculation output unavailable'}]}});
 r.assumptionEntries=entries;r.assumptionsMarkdown=modelAuthoredMarkdown(entries);r.assumptionsDraftStatus=valid?'DRAFTED':'FALLBACK';
 if(!valid){r.assumptionsMarkdown+='\nDrafting fallback used: the complete pre-authored fixed-wording decision ledger is returned unchanged.\n';}
 return r;
}
function check(ok,name){if(!ok){throw new Error('Assumptions regression failed: '+name);}}
var authoritative=input.assumptionEvidence||{entries:[]};
if(authoritative.entries.length===15){
 var stable={posttranTransact:[],posttranDalyrejs:[],posttranAcctdata:[],posttranTcatbal:[],summary:{status:'OK',returnCode:0,readCount:0,postedCount:0,rejectedCount:0,duplicateCount:0,errorCount:0,errors:[]}};
 var good=packageResult(stable,authoritative,{entries:clone(authoritative.entries)}),missing=packageResult(stable,authoritative,{}),altered=clone(authoritative.entries);altered[0].basis='Unverified replacement';var bad=packageResult(stable,authoritative,{entries:altered});
 check(good.assumptionsDraftStatus==='DRAFTED'&&missing.assumptionsDraftStatus==='FALLBACK'&&bad.assumptionsDraftStatus==='FALLBACK','valid failed altered draft routes');
 check(missing.assumptionEntries.length===15&&bad.assumptionEntries[0].basis===authoritative.entries[0].basis,'fallback complete and unchanged');
 check(JSON.stringify(good.summary)===JSON.stringify(missing.summary)&&JSON.stringify(good.posttranTransact)===JSON.stringify(bad.posttranTransact),'draft cannot change financial results');
 check(missing.assumptionsMarkdown.indexOf('What was assumed')>=0&&missing.assumptionsMarkdown.indexOf('Wiki statement or absence')>=0&&missing.assumptionsMarkdown.indexOf('Drafting fallback used')>=0,'separate columns and fallback disclosure');
}
output={result:packageResult(input.postingCalculation,authoritative,input.assumptionsDraft)};
```

### Draft assumptions failed (SCRIPT, id=6ae372263695c563ea50e21d)

```javascript
output = {"assumptionsDraft": {}};

```

_(server: 227 ms, 1 API call, 199 ms in API)_
