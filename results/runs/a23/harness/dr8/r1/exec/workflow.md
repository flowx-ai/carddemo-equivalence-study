# Workflow: PostDailyTransactions

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** 

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae366933695c563ea50e00f | <uuid> | (0, 0) | → Post transactions (seq:<uuid>) |
| Return outputs | END | 6ae366933695c563ea50e010 | <uuid> | (1200, 0) | — |
| Post transactions | SCRIPT | 6ae366933695c563ea50e011 | <uuid> | (300, 0) | → Draft assumptions (seq:<uuid>) | lang: JAVASCRIPT |
| Draft assumptions | AI | 6ae366933695c563ea50e012 | <uuid> | (600, 0) | → Finish results [SUCCESS] (seq:<uuid>), → Draft assumptions failed [FAIL] (seq:<uuid>) | responseKey: assumptionsDraft, aiType: TEXT_UNDERSTANDING, responseSchema: set |
| Finish results | SCRIPT | 6ae366933695c563ea50e013 | <uuid> | (900, 0) | → Return outputs (seq:<uuid>) | lang: JAVASCRIPT |
| Draft assumptions failed | SCRIPT | 6ae366933695c563ea50e014 | <uuid> | (600, 200) | → Finish results (seq:<uuid>) | lang: JAVASCRIPT |

## Systems
_(none)_

## AI prompts

### Draft assumptions (TEXT_UNDERSTANDING, id=6ae366933695c563ea50e012)
instructions:

```
Produce the assumptions documentation entries in English from the supplied inventory only. Return an object with entries. Each entry has exactly whatYouAssumed and wikiStatementOrAbsence. Preserve every supplied assumption and its wiki basis verbatim and in order. Do not add, remove, paraphrase, reinterpret or invent facts, decisions, sources or citations. You are documenting previously decided implementation choices, never deciding financial behaviour. Do not request or infer customer or transaction data.
```
userMessage:

```
Document this complete implementation assumptions inventory: ${assumptionInventory}
```
exampleOutputJsonSchema:

```
{"title":"Response","type":"object","additionalProperties":false,"required":["entries"],"properties":{"entries":{"type":"array","items":{"type":"object","additionalProperties":false,"required":["whatYouAssumed","wikiStatementOrAbsence"],"properties":{"whatYouAssumed":{"type":"string"},"wikiStatementOrAbsence":{"type":"string"}}}}}}
```

## Scripts

### Post transactions (SCRIPT, id=6ae366933695c563ea50e011)

```javascript
var bag = input || {};
function clone(x) { return JSON.parse(JSON.stringify(x)); }
function rows(x) { return Array.isArray(x) ? clone(x) : []; }
function text(x) { return x === null || x === undefined ? '' : String(x).replace(/ +$/, ''); }
function key(x) { var s = text(x); return /^\d+$/.test(s) ? s.replace(/^0+(?=\d)/, '') : s; }
function cents(x) { var s = text(x); var m = /^([+-]?)(\d+)(?:\.(\d{1,2}))?$/.exec(s); if (!m) { throw new Error('Amount must have at most two decimal places'); } var n = Number(m[2]) * 100 + Number(((m[3] || '') + '00').slice(0, 2)); if (m[1] === '-') { n = -n; } if (!Number.isSafeInteger(n)) { throw new Error('Amount exceeds exact integer-cent range'); } return n; }
function sum(a,b) { var n=a+b; if (!Number.isSafeInteger(n)) { throw new Error('Total exceeds exact integer-cent range'); } return n; }
function money(n) { if (!Number.isSafeInteger(n)) { throw new Error('Invalid cent total'); } var a=Math.abs(n); return (n<0?'-':'') + String(Math.floor(a/100)) + '.' + ('0'+String(a%100)).slice(-2); }
function integer(x) { var s=text(x); if (!/^\d+$/.test(s)) { throw new Error('Contract integer is not a digit identifier'); } var n=Number(s); if (!Number.isSafeInteger(n)) { throw new Error('Contract integer exceeds exact range'); } return n; }
function datePart(x) { var s=text(x).slice(0,10); if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) { throw new Error('Date must start with YYYY-MM-DD'); } return s; }
function catKey(a,t,c) { return JSON.stringify([key(a),text(t),key(c)]); }
var txFields=['tran_id','type_cd','cat_cd','source','desc','amt','merchant_id','merchant_name','merchant_city','merchant_zip','card_num','orig_ts','proc_ts'];
var acctFields=['acct_id','active_status','curr_bal','credit_limit','cash_credit_limit','open_date','expiration_date','reissue_date','curr_cyc_credit','curr_cyc_debit','addr_zip','group_id'];
var acctMoney=['curr_bal','credit_limit','cash_credit_limit','curr_cyc_credit','curr_cyc_debit'];
function transaction(r, amount, stamp) { var o={}; txFields.forEach(function(f){ o[f]=text(r[f]); }); o.cat_cd=integer(r.cat_cd); o.merchant_id=integer(r.merchant_id); o.amt=money(amount); if (stamp !== null) { o.proc_ts=stamp; } return o; }
var accounts=rows(bag.accounts), categories=rows(bag.categoryBalances), xrefs=rows(bag.cardXrefs), daily=rows(bag.dailyTransactions);
var timestamp=text(bag.processingTimestamp); if (!timestamp) { timestamp=new Date().toISOString().replace('T',' ').replace('Z','')+'000'; }
var accountMap=Object.create(null), xrefMap=Object.create(null), categoryMap=Object.create(null);
function index(map,k,i) { if (!Object.prototype.hasOwnProperty.call(map,k)) { map[k]=i; } else { map[k]=-1; } }
accounts.forEach(function(a,i){ index(accountMap,key(a.acct_id),i); });
xrefs.forEach(function(x,i){ index(xrefMap,text(x.card_num),i); });
categories.forEach(function(c,i){ index(categoryMap,catKey(c.acct_id,c.type_cd,c.cat_cd),i); });
var feed=daily.map(function(r,i){ var v=null,e=''; try { v=cents(r.amt); } catch(err) { e=String(err.message||err); } return {row:r,index:i,amount:v,error:e}; });
feed.sort(function(a,b){ if (a.error && b.error) { return a.index-b.index; } if (a.error) { return 1; } if (b.error) { return -1; } return a.amount-b.amount || a.index-b.index; });
var posted=[], rejected=[], seen=Object.create(null);
var summary={status:'SUCCESS',readCount:daily.length,postedCount:0,rejectedCount:0,duplicateCount:0,failedCount:0,errors:[]};
var reasonText={100:'INVALID CARD NUMBER FOUND',101:'ACCOUNT RECORD NOT FOUND',102:'OVERLIMIT TRANSACTION',103:'TRANSACTION RECEIVED AFTER ACCT EXPIRATION'};
feed.forEach(function(item){ var r=item.row;
 try {
  if(item.error) { throw new Error(item.error); }
  var id=text(r.tran_id); if(!id) { throw new Error('Missing transaction identifier'); }
  if(Object.prototype.hasOwnProperty.call(seen,id)) { summary.duplicateCount++; return; } seen[id]=true;
  var reason=0, xi=xrefMap[text(r.card_num)], ai, account;
  if(xi===undefined) { reason=100; }
  else { if(xi<0) { throw new Error('Ambiguous card cross-reference'); } ai=accountMap[key(xrefs[xi].acct_id)]; if(ai===undefined) { reason=101; } else if(ai<0) { throw new Error('Ambiguous account identifier'); } else { account=accounts[ai]; var cycleCredit=cents(account.curr_cyc_credit), cycleDebit=cents(account.curr_cyc_debit); if(sum(sum(cycleCredit,-cycleDebit),item.amount)>cents(account.credit_limit)) { reason=102; } if(datePart(account.expiration_date)<datePart(r.orig_ts)) { reason=103; } } }
  if(reason) { var reject=transaction(r,item.amount,null); reject.reason=reason; reject.reason_desc=reasonText[reason]; rejected.push(reject); summary.rejectedCount++; return; }
  var ck=catKey(account.acct_id,r.type_cd,r.cat_cd), ci=categoryMap[ck]; if(ci!==undefined && ci<0) { throw new Error('Ambiguous category balance'); }
  var newCategory=ci===undefined?{acct_id:integer(account.acct_id),type_cd:text(r.type_cd),cat_cd:integer(r.cat_cd),bal:'0.00'}:clone(categories[ci]);
  var newAccount=clone(account), postedRow=transaction(r,item.amount,timestamp);
  newCategory.bal=money(sum(cents(newCategory.bal),item.amount));
  newAccount.curr_bal=money(sum(cents(account.curr_bal),item.amount));
  newAccount.curr_cyc_credit=money(sum(cents(account.curr_cyc_credit),item.amount>=0?item.amount:0));
  newAccount.curr_cyc_debit=money(sum(cents(account.curr_cyc_debit),item.amount<0?item.amount:0));
  accounts[ai]=newAccount;
  if(ci===undefined) { categoryMap[ck]=categories.length; categories.push(newCategory); } else { categories[ci]=newCategory; }
  posted.push(postedRow); summary.postedCount++;
 } catch(err) { summary.failedCount++; summary.errors.push({index:item.index,tran_id:text(r.tran_id),message:String(err.message||err)}); }
});
var outputAccounts=accounts.map(function(a){ var o={}; acctFields.forEach(function(f){o[f]=text(a[f]);}); o.acct_id=integer(a.acct_id); acctMoney.forEach(function(f){o[f]=money(cents(a[f]));}); return o; });
var outputCategories=categories.map(function(c){return {acct_id:integer(c.acct_id),type_cd:text(c.type_cd),cat_cd:integer(c.cat_cd),bal:money(cents(c.bal))};});
summary.status=summary.failedCount?'ERROR':(summary.rejectedCount?'WARNING':'SUCCESS');
var inventory=[
 {whatYouAssumed:'The caller supplies decoded records using the contract field names. Direct file reads, fixed-width parsing and file creation are excluded. Non-array or absent input collections are treated as empty for the empty-input invocation.',wikiStatementOrAbsence:'Maker selected calculation-only scope. posttran-sonnet-dr8.pdf p.27 specifies the file formats but not a decoded workflow interface.'},
 {whatYouAssumed:'All feed records are stably sorted by signed amount before any reference check or posting; equal amounts retain feed order. Records with unreadable amounts are isolated as calculation failures and do not alter state.',wikiStatementOrAbsence:'posttran-sonnet-dr8.pdf pp.3-4 BR-10 and scenario 11; malformed-amount ordering is unstated.'},
 {whatYouAssumed:'A missing card ends reference validation with reason 100; a missing account gives 101. For resolved accounts, evaluate limit then expiry; expiry reason 103 replaces over-limit reason 102. Keep only one reason.',wikiStatementOrAbsence:'posttran-sonnet-dr8.pdf pp.3-4 BR-01 to BR-04 and validation order. Scenario 6 mentions missing card plus expiry but does not explain obtaining an account after a failed card lookup.'},
 {whatYouAssumed:'Reason descriptions are INVALID CARD NUMBER FOUND, ACCOUNT RECORD NOT FOUND, OVERLIMIT TRANSACTION and TRANSACTION RECEIVED AFTER ACCT EXPIRATION. Rejects retain input transaction values, including their input processing timestamp, apart from contract type and decimal normalization.',wikiStatementOrAbsence:'posttran-sonnet-dr8.pdf p.3 BR-01 to BR-06 and p.27 JSON contract; byte-image retention is replaced by decoded-field retention in the selected scope.'},
 {whatYouAssumed:'Use exact integer cents, with no rounding of values having more than two decimal places. Return money as two-decimal strings. Unsafe integer totals are record calculation failures.',wikiStatementOrAbsence:'posttran-sonnet-dr8.pdf pp.7,9-10 specify two decimals; p.27 permits string amounts. Rounding and overflow behaviour are unstated.'},
 {whatYouAssumed:'Apply currentBalance += amount. Nonnegative amounts, including zero, add to cycle credit; negative amounts add their signed value to cycle debit. Do not reinterpret the sign convention or add active-status, transaction-type or category-existence checks.',wikiStatementOrAbsence:'posttran-sonnet-dr8.pdf p.3 BR-03 and BR-05 state the formula and signed updates. No other business validation is listed.'},
 {whatYouAssumed:'Compare account expiration date with the first ten characters of original timestamp as YYYY-MM-DD. Equality is not expired. Do not use the business date in place of the transaction date.',wikiStatementOrAbsence:'posttran-sonnet-dr8.pdf p.3 BR-04 uses strict less-than against original date; date representation is on pp.7 and 10.'},
 {whatYouAssumed:'Use one processing timestamp for the invocation: the supplied value, otherwise current UTC time rendered as YYYY-MM-DD HH:mm:ss.ffffff without a timezone suffix. Rejected records retain their input processing time.',wikiStatementOrAbsence:'posttran-sonnet-dr8.pdf p.3 BR-05 says now, p.10 gives X(26), and p.27 names proc_ts; timezone and per-record versus per-run sampling are unstated.'},
 {whatYouAssumed:'Preserve the supplied transaction identifier. After amount parsing, the first occurrence of that identifier in posting order owns it; subsequent occurrences are skipped even if the first was rejected or failed. No new identifier sequence is allocated.',wikiStatementOrAbsence:'posttran-sonnet-dr8.pdf p.3 BR-09 specifies transactionId idempotence; pp.9 and 23 propose sequences. p.27 supplies no existing-transaction input or sequence state. Duplicate handling is an implementation choice.'},
 {whatYouAssumed:'Replay uses complete original snapshots and produces complete replacement outputs. No database writes, durable checkpoint or resume-at-index operation occurs, and passing already-updated snapshots is not an idempotent replay.',wikiStatementOrAbsence:'posttran-sonnet-dr8.pdf p.3 BR-09 proposes durable restart; the maker selected a calculation-only implementation without persistence.'},
 {whatYouAssumed:'Category identity is account plus type plus category. Missing category balances start at zero. Return every account and category balance, including unchanged rows. Account and category numeric keys compare by digit value; card and transaction identifiers remain strings.',wikiStatementOrAbsence:'posttran-sonnet-dr8.pdf p.10 defines the category composite key, p.3 BR-05 requires upsert, and p.27 requires every account and category balance. Identifier normalization is not otherwise specified.'},
 {whatYouAssumed:'Use the contract integer representation for account, category and merchant identifiers in outputs, including integer category-balance account and category keys. Trim trailing spaces only. Decoded master rows are expected to satisfy their declared contract field types.',wikiStatementOrAbsence:'posttran-sonnet-dr8.pdf p.27 explicitly fixes transaction and account types and permits trimming trailing spaces; category-balance key types are listed by name only and are aligned with those same identifiers.'},
 {whatYouAssumed:'A record with an unreadable required value, ambiguous master-key lookup or unsafe arithmetic is reported separately, not assigned a new business reject reason. Stage all changes before applying them; a failed record leaves its account and category unchanged and other records continue. Unread filler and unrelated fields are ignored.',wikiStatementOrAbsence:'posttran-sonnet-dr8.pdf p.3 BR-08 distinguishes record abort from rejects, while pp.17 and 23 distinguish integration errors. Input-error codes and ambiguous-key policy are unstated; the chosen scope has no actual rewrite failure.'},
 {whatYouAssumed:'Summary status is ERROR for calculation failures, otherwise WARNING for business rejects, otherwise SUCCESS. Read count reconciles as posted plus rejected plus duplicate plus failed. Errors carry original zero-based feed position and transaction identifier.',wikiStatementOrAbsence:'posttran-sonnet-dr8.pdf p.3 BR-07 and p.5 require warning and count reconciliation; duplicate, failure and index presentation are not defined.'},
 {whatYouAssumed:'A model receives only this explicit assumptions inventory. Its text is accepted only when each assumption and source is preserved exactly; otherwise use the complete deterministic fallback. Financial results never depend on documentation drafting.',wikiStatementOrAbsence:'Maker requires each assumption and wiki basis. The wiki has no assumptions-authoring mechanism; this is an implementation choice.'}
];
output={postingResult:{posttran_transact:posted,posttran_dalyrejs:rejected,posttran_acctdata:outputAccounts,posttran_tcatbal:outputCategories,summary:summary},assumptionInventory:inventory,assumptionsFallback:clone(inventory)};
```

### Finish results (SCRIPT, id=6ae366933695c563ea50e013)

```javascript
var b=input||{};
var base=b.postingResult||{posttran_transact:[],posttran_dalyrejs:[],posttran_acctdata:[],posttran_tcatbal:[],summary:{status:'SUCCESS',readCount:0,postedCount:0,rejectedCount:0,duplicateCount:0,failedCount:0,errors:[]}};
var fallback=Array.isArray(b.assumptionsFallback)?b.assumptionsFallback:[];
var proposed=(b.assumptionsDraft||{}).entries;
var valid=Array.isArray(proposed)&&proposed.length===fallback.length;
if(valid){for(var i=0;i<fallback.length;i++){var p=proposed[i]||{};if(p.whatYouAssumed!==fallback[i].whatYouAssumed||p.wikiStatementOrAbsence!==fallback[i].wikiStatementOrAbsence){valid=false;break;}}}
var entries=valid?proposed:fallback;
function cell(x){return String(x||'').replace(/\|/g,'\\|').replace(/\r?\n/g,'<br>');}
var markdown='# Assumptions\n\n| What you assumed | Which wiki statement (or absence of one) it rests on |\n| --- | --- |\n';
entries.forEach(function(e){markdown+='| '+cell(e.whatYouAssumed)+' | '+cell(e.wikiStatementOrAbsence)+' |\n';});
var result=JSON.parse(JSON.stringify(base));
result.assumptions=JSON.parse(JSON.stringify(entries));result.assumptions_md=markdown;
output={result:result};
```

### Draft assumptions failed (SCRIPT, id=6ae366933695c563ea50e014)

```javascript
output = {"assumptionsDraft": {}};

```

_(server: 200 ms, 1 API call, 197 ms in API)_
