# Workflow: PostDailyTransactions

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** 

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae555553695c563ea5157cc | <uuid> | (0, 0) | → CalculatePosting (seq:<uuid>) |
| End | END | 6ae555553695c563ea5157cd | <uuid> | (1200, 0) | — |
| CalculatePosting | SCRIPT | 6ae555553695c563ea5157ce | <uuid> | (300, 0) | → DraftAssumptions (seq:<uuid>) | lang: JAVASCRIPT |
| DraftAssumptions | AI | 6ae555553695c563ea5157cf | <uuid> | (600, 0) | → FinalizeOutputs [SUCCESS] (seq:<uuid>), → DraftAssumptions failed [FAIL] (seq:<uuid>) | responseKey: assumptionDraft, aiType: TEXT_UNDERSTANDING, responseSchema: set |
| FinalizeOutputs | SCRIPT | 6ae555553695c563ea5157d0 | <uuid> | (900, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| DraftAssumptions failed | SCRIPT | 6ae555553695c563ea5157d1 | <uuid> | (600, 200) | → FinalizeOutputs (seq:<uuid>) | lang: JAVASCRIPT |

## Systems
_(none)_

## AI prompts

### DraftAssumptions (TEXT_UNDERSTANDING, id=6ae555553695c563ea5157cf)
instructions:

```
Produce the assumption report for the supplied implementation decision catalogue. Return exactly one entry per decision with decisionId, whatAssumed and wikiBasis. Preserve each catalogue decisionId and the factual whatAssumed and wikiBasis values exactly: these are the reviewed implementation choices and their authoritative sources. Structure and explain the report only from this catalogue and the supplied wiki evidence; do not invent behaviour, references, or decisions. The report concerns implementation uncertainty, not customer records. Do not change financial calculations or ask for financial inputs. An absent wiki rule must remain explicitly identified as absent. Output only the specified JSON object.
```
userMessage:

```
Implementation decisions: ${assumptionDecisions}
Wiki evidence: ${wikiEvidence}
```
exampleOutputJsonSchema:

```
{"title":"Response","type":"object","required":["entries"],"properties":{"entries":{"type":"array","items":{"type":"object","required":["decisionId","whatAssumed","wikiBasis"],"properties":{"wikiBasis":{"type":"string"},"decisionId":{"type":"string"},"whatAssumed":{"type":"string"}},"additionalProperties":false}}},"additionalProperties":false}
```

## Scripts

### CalculatePosting (SCRIPT, id=6ae555553695c563ea5157ce)

```javascript
var src = input || {};
var decisions = [];
function decision(id, assumption, basis) { decisions.push({decisionId:id, whatAssumed:assumption, wikiBasis:basis}); }
decision('daily-layout','Infer these zero-based dailytran.dat fields: tran_id 0:16, type_cd 16:2, cat_cd 18:4, source 22:10, desc 32:100, amt 132:11, merchant_id 143:9, merchant_name 152:50, merchant_city 202:50, merchant_zip 252:10, card_num 262:16, orig_ts 278:26, proc_ts 304:26; bytes 330-349 are unused filler.','posttran-sonnet.pdf pp.9-11 and 27 give attributes and picture widths, but do not include CVTRA06Y or complete physical offsets. These offsets are inferred, not copybook-verified.');
decision('account-layout','Infer acctdata.dat fields: acct_id 0:11, active_status 11:1, curr_bal 12:12, credit_limit 24:12, cash_credit_limit 36:12, open_date 48:10, expiration_date 58:10, reissue_date 68:10, curr_cyc_credit 78:12, curr_cyc_debit 90:12, addr_zip 102:10, group_id 112:10; remaining bytes are filler.','posttran-sonnet.pdf p.7 lists fields, picture widths, and 178 filler bytes; p.27 names CVACT01Y but does not reproduce its full layout.');
decision('xref-layout','Infer cardxref.dat fields: card number 0:16, customer number 16:9, account number 25:11; remaining bytes are filler.','posttran-sonnet.pdf p.9 lists CardXref fields in this order; p.27 gives 50-byte records without the complete CVACT03Y layout.');
decision('category-layout','Infer tcatbal.dat fields: account number 0:11, type 11:2, category 13:4, balance 17:11; remaining bytes are filler.','posttran-sonnet.pdf p.10 lists these fields and widths; p.27 gives 50-byte records without the complete CVTRA01Y layout.');
decision('file-boundary','The caller supplies decoded ASCII-compatible file text, one record per line; LF and CRLF are accepted. This workflow returns datasets and Markdown content and does not read or write actual files.','posttran-sonnet.pdf p.27 defines line-oriented inputs; encoding is not specified. The maker explicitly selected caller-owned file reading and writing.');
decision('filler','Ignore unused trailing filler, including non-printable bytes; require only the prefix containing fields read by posting, not a printable or fully padded filler area.','posttran-sonnet.pdf p.7 drops legacy filler; p.27 fixes record sizes but does not impose filler-content validation.');
decision('money-encoding','Decode DISPLAY signed-overpunch amounts with two implied decimals; unsigned digits are positive. Also accept an explicit leading sign or decimal point within the declared field width. Do not decode EBCDIC bytes.','posttran-sonnet.pdf pp.7,9-10 give S9(...)V99 pictures, p.10 explicitly mentions signed overpunch, and p.9 shows a signed decimal example; exact input encoding is not stated.');
decision('money-arithmetic','Use integer cents, reject unrepresentable arithmetic as an execution error, and return two-decimal strings; do not add business rounding rules.','posttran-sonnet.pdf p.3 specifies additions and comparisons; p.27 allows strings with at most two decimals and does not specify rounding or overflow.');
decision('lookup-order','Stop reference validation at missing card or missing account, returning 100 or 101; only evaluate limit and expiry after both references resolve.','posttran-sonnet.pdf pp.3-4 specify xref then account then limit then expiry; p.4 also gives an invalid-card-plus-expiry example that cannot resolve an account. This implementation follows resolvable lookup order.');
decision('reason-precedence','For an available account, expiry reason 103 overwrites over-limit reason 102; do not collect extra business reasons or add active-status checks.','posttran-sonnet.pdf p.3 BR-03/04 explicitly gives overwrite order; p.4 contains an unresolved keep-or-collect note. The explicit rule is followed.');
decision('expiry-comparison','Compare the account expiration_date lexically with the first ten characters of orig_ts; equality is allowed. No additional calendar or current-business-date rejection is added.','posttran-sonnet.pdf p.3 compares expiry with the original transaction date using strict less-than; p.7 specifies YYYY-MM-DD. Invalid-calendar handling is not stated.');
decision('signed-debit','Add a nonnegative amount to current cycle credit, or add a negative amount directly to current cycle debit without negating it; category and current balances always add the signed amount.','posttran-sonnet.pdf p.3 BR-03 and BR-05 explicitly use credit minus debit for the limit check and debit += amount for negative amounts.');
decision('posting-id','Allocate a sixteen-digit posted transaction identifier sequentially from caller nextTransactionId, default 0000000000000001; consume it only for successful postings. The caller must provide a collision-free starting value across separate runs.','posttran-sonnet.pdf p.9 and p.23 propose sequence allocation; p.27 supplies no existing transactions or sequence seed, so the default seed and caller responsibility are assumptions.');
decision('duplicate-id','Use the incoming transaction identifier as the idempotency key. Repeated successfully handled identifiers in the same feed or resumed state are skipped, including previously rejected identifiers; skip counts are reported separately.','posttran-sonnet.pdf p.3 BR-09 says idempotent via transactionId but does not define duplicate-feed or duplicate-reject handling.');
decision('processed-time','Preserve original proc_ts on rejects. For postings, use caller processedTimestamp verbatim when supplied; otherwise use current UTC in YYYY-MM-DD HH:mm:ss.ffffff with millisecond precision and three trailing zeroes.','posttran-sonnet.pdf p.3 says processedTimestamp = now; pp.9-10 give 26 characters but no timezone or separator convention.');
decision('business-date','Default businessDate to 2022-07-18 as the contract states; do not substitute it for a transaction original date or the processing clock.','posttran-sonnet.pdf p.27 provides the business date; p.3 separately uses original transaction date and now.');
decision('restart','Return the complete calculated state and next feed index. The caller must retain them together and resume against the same original feed; this workflow provides no durable checkpoint storage.','posttran-sonnet.pdf p.3 BR-09 requires resume after the last processed index; retention mechanics are not defined and file handling is outside the maker-selected scope.');
decision('bad-record','Report unreadable records as execution errors, not invented business rejects; continue independent records. A visited unreadable feed record advances the index and is not automatically retried on resume.','posttran-sonnet.pdf pp.3-4 define business reasons 100-103 and special rewrite reason 109, but no malformed-input code or retry disposition.');
decision('bad-master','Keep the first readable occurrence of a master primary key and report duplicate keys as execution errors. An unreadable master key, where identifiable, blocks dependent postings as execution errors rather than producing a false not-found reject or creating a replacement balance.','posttran-sonnet.pdf pp.7,9-10 describe primary keys but do not define duplicate or malformed master input handling.');
decision('unused-inputs','Accept discgrp.dat, custdata.dat, carddata.dat, trantype.dat and trancatg.dat contents but do not add posting validations from them. Empty supplied files are valid; an absent required posting input is an execution error.','posttran-sonnet.pdf p.27 lists chain inputs; p.3 posting validation reads xref, account and category balances only; p.19 permits empty input.');
decision('contract-types','Keep digit identifiers as strings internally. Convert only acct_id, cat_cd and merchant_id to integers in contract outputs; trim trailing spaces only on other character fields.','posttran-sonnet.pdf p.27 explicitly prescribes these output integer types; pp.7,9-10 otherwise define digit identifiers as strings.');
decision('rewrite-failure','Calculate one record atomically in memory before applying its balance changes; do not fabricate database rewrite failures or reject 109 because this workflow performs no database writes.','posttran-sonnet.pdf p.3 BR-08 says actual rewrite failure 109 aborts without a reject; the maker-selected implementation returns calculated state instead of database commits.');
decision('empty-and-counts','A supplied empty feed returns unchanged masters and OK unless execution errors exist. Counts distinguish read, posted, rejected and skipped; execution-error records are not asserted to satisfy read = posted + rejected.','posttran-sonnet.pdf p.5 gives read = posted + rejected for ordinary outcomes, p.19 permits empty input, and p.3 introduces idempotency without its count convention.');
decision('documentation','A separate model receives only this decision catalogue and wiki excerpts, never financial records; canonical assumptions remain authoritative and incomplete drafting falls back to them.','The maker requested assumption explanations; no wiki statement specifies their generation. This is an implementation documentation choice, not a posting rule.');
var evidence = 'posttran-sonnet.pdf p.3 BR-01: Card number not in CardXref -> reject 100 INVALID CARD NUMBER FOUND. BR-02: Account not found -> reject 101 ACCOUNT RECORD NOT FOUND. BR-03: currentCycleCredit - currentCycleDebit + amount > creditLimit -> 102 OVERLIMIT TRANSACTION. BR-04: expiryDate < transaction original date -> 103 TRANSACTION RECEIVED AFTER ACCT EXPIRATION; overwrites 102. BR-05: processedTimestamp = now; category balance upsert; currentBalance += amount; amount >= 0 -> currentCycleCredit += amount, else currentCycleDebit += amount. BR-07: any reject means WARNING. BR-08: actual account rewrite failure 109 is not written to rejects. BR-09: idempotent via transactionId and resume after last processed index. p.4: validation order xref, account, limit, expiry. p.5: ordinary counts read = posted + rejected. p.7: Account picture widths and 178 filler bytes. pp.9-10: Transaction field widths, sequence generator, 26-character timestamps; category balance key account/type/category. p.19: empty input is allowed. p.23: sequence allocation. p.27: POSTTRAN returns four JSON lists, trailing spaces may be omitted, amounts at most two decimals; acct_id, cat_cd and merchant_id are integers; no copybook source is included.';
var errors = [], accounts = [], categories = [], posted = [], rejected = [], seen = {}, blockedAccounts = {}, blockedCards = {}, blockedCategories = {};
var nextIndex = 0, readCount = 0, skippedCount = 0;
var nextId = src.nextTransactionId == null ? '0000000000000001' : String(src.nextTransactionId);
function err(file, line, message) { errors.push({inputFile:file,line:line,message:String(message)}); }
function trimEnd(s) { return String(s).replace(/ +$/,''); }
function requiredText(key, name) { if (typeof src[key] !== 'string') { err(name,0,'Required file contents were not supplied as text'); return null; } return src[key]; }
function lines(text) { if (text === null || text === '') return []; var a = text.split('\n'); if (a[a.length-1] === '') a.pop(); for (var i=0;i<a.length;i++) if (a[i].slice(-1)==='\r') a[i]=a[i].slice(0,-1); return a; }
function prefix(s, n) { if (s.length < n) throw new Error('Record is shorter than the fields read by posting: need '+n+' characters'); }
function field(s,a,n) { return trimEnd(s.slice(a,a+n)); }
function digits(s, n) { var t=String(s).trim(); if (!/^\d+$/.test(t) || (n && t.length!==n)) throw new Error('Invalid digit identifier'); return t; }
function safe(n) { if (!isFinite(n) || Math.floor(n)!==n || Math.abs(n)>9007199254740991) throw new Error('Money arithmetic exceeds exact integer range'); return n; }
function cents(s) { var t=String(s).trim(); if (!t) throw new Error('Missing amount'); var pos='{ABCDEFGHI', neg='}JKLMNOPQR'; var last=t.slice(-1), p=pos.indexOf(last), m=neg.indexOf(last), sign=1; if (p>=0) t=t.slice(0,-1)+p; else if(m>=0){t=t.slice(0,-1)+m;sign=-1;} if (/^[+-]?\d+\.\d{1,2}$/.test(t)) { var negative=t[0]==='-'; t=t.replace(/^[+-]/,''); var z=t.split('.'); return safe((negative?-1:1)*sign*(Number(z[0])*100+Number((z[1]+'0').slice(0,2)))); } if(!/^[+-]?\d+$/.test(t)) throw new Error('Invalid display amount'); return safe(sign*Number(t)); }
function money(n) { safe(n); var a=Math.abs(n); return (n<0?'-':'')+Math.floor(a/100)+'.'+('0'+(a%100)).slice(-2); }
function key(a,t,c) { return String(a)+'|'+String(t)+'|'+String(c); }
function account(s) { prefix(s,122); return {acct_id:digits(s.slice(0,11),11),active_status:field(s,11,1),curr_bal:cents(s.slice(12,24)),credit_limit:cents(s.slice(24,36)),cash_credit_limit:cents(s.slice(36,48)),open_date:field(s,48,10),expiration_date:field(s,58,10),reissue_date:field(s,68,10),curr_cyc_credit:cents(s.slice(78,90)),curr_cyc_debit:cents(s.slice(90,102)),addr_zip:field(s,102,10),group_id:field(s,112,10)}; }
function category(s) { prefix(s,28); return {acct_id:digits(s.slice(0,11),11),type_cd:field(s,11,2),cat_cd:digits(s.slice(13,17),4),bal:cents(s.slice(17,28))}; }
function transaction(s) { prefix(s,330); return {tran_id:field(s,0,16),type_cd:field(s,16,2),cat_cd:Number(digits(s.slice(18,22),4)),source:field(s,22,10),desc:field(s,32,100),amt:money(cents(s.slice(132,143))),merchant_id:Number(digits(s.slice(143,152),9)),merchant_name:field(s,152,50),merchant_city:field(s,202,50),merchant_zip:field(s,252,10),card_num:field(s,262,16),orig_ts:field(s,278,26),proc_ts:field(s,304,26)}; }
function copy(o) { return JSON.parse(JSON.stringify(o)); }
function outputAccount(a) { return {acct_id:Number(a.acct_id),active_status:a.active_status,curr_bal:money(a.curr_bal),credit_limit:money(a.credit_limit),cash_credit_limit:money(a.cash_credit_limit),open_date:a.open_date,expiration_date:a.expiration_date,reissue_date:a.reissue_date,curr_cyc_credit:money(a.curr_cyc_credit),curr_cyc_debit:money(a.curr_cyc_debit),addr_zip:a.addr_zip,group_id:a.group_id}; }
function outputCategory(c) { return {acct_id:Number(c.acct_id),type_cd:c.type_cd,cat_cd:Number(c.cat_cd),bal:money(c.bal)}; }
function incrementId(s) { var a=s.split(''); for(var i=a.length-1;i>=0;i--){ if(a[i]!=='9'){a[i]=String(Number(a[i])+1);return a.join('');}a[i]='0';}return ''; }
var rawFeed=requiredText('dailytran','dailytran.dat'), rawAccounts=requiredText('acctdata','acctdata.dat'), rawXrefs=requiredText('cardxref','cardxref.dat'), rawCategories=requiredText('tcatbal','tcatbal.dat');
var feed=lines(rawFeed), al=lines(rawAccounts), xl=lines(rawXrefs), cl=lines(rawCategories);
var amap={}, cmap={}, xmap={};
for(var i=0;i<al.length;i++){try{var a=account(al[i]);if(Object.prototype.hasOwnProperty.call(amap,a.acct_id)){err('acctdata.dat',i+1,'Duplicate account primary key; first readable row retained');}else{accounts.push(a);amap[a.acct_id]=a;}}catch(e){err('acctdata.dat',i+1,e.message);var bad=al[i].slice(0,11);if(/^\d{11}$/.test(bad))blockedAccounts[bad]=true;}}
for(var i=0;i<cl.length;i++){try{var c=category(cl[i]), ck=key(c.acct_id,c.type_cd,c.cat_cd);if(Object.prototype.hasOwnProperty.call(cmap,ck)){err('tcatbal.dat',i+1,'Duplicate category primary key; first readable row retained');}else{categories.push(c);cmap[ck]=c;}}catch(e){err('tcatbal.dat',i+1,e.message);if(cl[i].length>=17)blockedCategories[key(cl[i].slice(0,11),field(cl[i],11,2),cl[i].slice(13,17))]=true;}}
for(var i=0;i<xl.length;i++){try{prefix(xl[i],36);var card=field(xl[i],0,16), aid=digits(xl[i].slice(25,36),11);if(Object.prototype.hasOwnProperty.call(xmap,card)){err('cardxref.dat',i+1,'Duplicate card primary key; first readable row retained');}else{xmap[card]=aid;}}catch(e){err('cardxref.dat',i+1,e.message);if(xl[i].length>=16)blockedCards[field(xl[i],0,16)]=true;}}
var fatal = rawFeed === null || rawAccounts === null || rawXrefs === null || rawCategories === null;
if(src.resumeState != null){try{var rs=copy(src.resumeState);if(!Array.isArray(rs.accounts)||!Array.isArray(rs.categories)||!Array.isArray(rs.posted)||!Array.isArray(rs.rejected)||!Array.isArray(rs.seenIds)||!Array.isArray(rs.errors)||!Number.isInteger(rs.nextIndex)||rs.nextIndex<0||rs.nextIndex>feed.length||!Number.isInteger(rs.readCount)||!Number.isInteger(rs.skippedCount))throw new Error('Incomplete restart state');
var ra={},rc={};for(var j=0;j<rs.accounts.length;j++){var q=rs.accounts[j];digits(q.acct_id,11);safe(q.curr_bal);safe(q.credit_limit);safe(q.cash_credit_limit);safe(q.curr_cyc_credit);safe(q.curr_cyc_debit);if(ra[q.acct_id])throw new Error('Duplicate account in restart state');ra[q.acct_id]=q;}for(var j=0;j<rs.categories.length;j++){var q=rs.categories[j];digits(q.acct_id,11);digits(q.cat_cd,4);safe(q.bal);var k=key(q.acct_id,q.type_cd,q.cat_cd);if(rc[k])throw new Error('Duplicate category in restart state');rc[k]=q;}
accounts=rs.accounts;categories=rs.categories;amap=ra;cmap=rc;posted=rs.posted;rejected=rs.rejected;nextIndex=rs.nextIndex;readCount=rs.readCount;skippedCount=rs.skippedCount;nextId=String(rs.nextTransactionId);for(var j=0;j<rs.seenIds.length;j++)seen[String(rs.seenIds[j])]=true;errors=rs.errors.concat(errors);
}catch(e){err('resumeState',0,e.message);fatal=true;}}
if(!/^\d{1,16}$/.test(nextId)){err('nextTransactionId',0,'Starting transaction identifier must contain one to sixteen digits');fatal=true;}else nextId=('0000000000000000'+nextId).slice(-16);
var clock=typeof src.processedTimestamp==='string' && src.processedTimestamp!=='' ? src.processedTimestamp : new Date().toISOString().replace('T',' ').slice(0,23)+'000';
if(clock.length!==26){err('processedTimestamp',0,'Processing timestamp must contain 26 characters');fatal=true;}
var descriptions={100:'INVALID CARD NUMBER FOUND',101:'ACCOUNT RECORD NOT FOUND',102:'OVERLIMIT TRANSACTION',103:'TRANSACTION RECEIVED AFTER ACCT EXPIRATION'};
if(!fatal){for(var i=nextIndex;i<feed.length;i++){readCount++;try{var t=transaction(feed[i]);if(t.tran_id==='')throw new Error('Incoming transaction identifier is blank');if(Object.prototype.hasOwnProperty.call(seen,t.tran_id)){skippedCount++;}else{var reason=0;
if(blockedCards[t.card_num])throw new Error('Card cross-reference input is unreadable');
if(!Object.prototype.hasOwnProperty.call(xmap,t.card_num))reason=100;
else{var aid=xmap[t.card_num];if(blockedAccounts[aid])throw new Error('Account input is unreadable');if(!Object.prototype.hasOwnProperty.call(amap,aid))reason=101;else{var ac=amap[aid], amount=cents(t.amt);if(safe(safe(ac.curr_cyc_credit-ac.curr_cyc_debit)+amount)>ac.credit_limit)reason=102;if(ac.expiration_date<t.orig_ts.slice(0,10))reason=103;}}
if(reason){var r=copy(t);r.reason=reason;r.reason_desc=descriptions[reason];rejected.push(r);seen[t.tran_id]=true;}
else{var amount=cents(t.amt), catCode=('0000'+t.cat_cd).slice(-4), k=key(aid,t.type_cd,catCode);if(blockedCategories[k])throw new Error('Category balance input is unreadable');var cb=cmap[k];var nb=safe(ac.curr_bal+amount), nc=safe(ac.curr_cyc_credit+(amount>=0?amount:0)), nd=safe(ac.curr_cyc_debit+(amount<0?amount:0)), bc=safe((cb?cb.bal:0)+amount);if(!/^\d{16}$/.test(nextId))throw new Error('Transaction identifier sequence exhausted');var p=copy(t);p.tran_id=nextId;p.proc_ts=clock;var successor=incrementId(nextId);ac.curr_bal=nb;ac.curr_cyc_credit=nc;ac.curr_cyc_debit=nd;if(cb)cb.bal=bc;else{cb={acct_id:aid,type_cd:t.type_cd,cat_cd:catCode,bal:bc};categories.push(cb);cmap[k]=cb;}posted.push(p);nextId=successor;seen[t.tran_id]=true;}
}}catch(e){err('dailytran.dat',i+1,e.message);}nextIndex=i+1;}}
var ao=[],co=[];for(var i=0;i<accounts.length;i++)ao.push(outputAccount(accounts[i]));for(var i=0;i<categories.length;i++)co.push(outputCategory(categories[i]));
var seenIds=Object.keys(seen);
var state={nextIndex:nextIndex,accounts:copy(accounts),categories:copy(categories),posted:copy(posted),rejected:copy(rejected),seenIds:seenIds,nextTransactionId:nextId,readCount:readCount,skippedCount:skippedCount,errors:copy(errors)};
var result={posttran_transact:posted,posttran_dalyrejs:rejected,posttran_acctdata:ao,posttran_tcatbal:co,status:errors.length?'ERROR':(rejected.length?'WARNING':'OK'),readCount:readCount,postedCount:posted.length,rejectedCount:rejected.length,skippedCount:skippedCount,errors:errors,resumeState:state};
output={postingResult:result,assumptionDecisions:decisions,wikiEvidence:evidence};
```

### FinalizeOutputs (SCRIPT, id=6ae555553695c563ea5157d0)

```javascript
var bag=input||{};var base=bag.postingResult&&typeof bag.postingResult==='object'?JSON.parse(JSON.stringify(bag.postingResult)):{posttran_transact:[],posttran_dalyrejs:[],posttran_acctdata:[],posttran_tcatbal:[],status:'ERROR',readCount:0,postedCount:0,rejectedCount:0,skippedCount:0,errors:[{inputFile:'calculation',line:0,message:'Calculation result was not supplied'}],resumeState:null};
var canonical=Array.isArray(bag.assumptionDecisions)?bag.assumptionDecisions:[];var draft=bag.assumptionDraft;var valid=false,entries=[];
try{if(typeof draft==='string')draft=JSON.parse(draft);if(draft&&Array.isArray(draft.entries)&&draft.entries.length===canonical.length&&canonical.length>0){var index={};valid=true;for(var i=0;i<draft.entries.length;i++){var e=draft.entries[i];if(!e||typeof e.decisionId!=='string'||Object.prototype.hasOwnProperty.call(index,e.decisionId)){valid=false;break;}index[e.decisionId]=e;}if(valid){for(var i=0;i<canonical.length;i++){var d=canonical[i],e=index[d.decisionId];if(!e||e.whatAssumed!==d.whatAssumed||e.wikiBasis!==d.wikiBasis){valid=false;break;}}}if(valid){for(var i=0;i<canonical.length;i++)entries.push(index[canonical[i].decisionId]);}}}catch(e){valid=false;}
if(!valid)entries=canonical;
function cell(s){return String(s).replace(/\|/g,'\\|').replace(/[\r\n]+/g,' ');}
var md='# POSTTRAN implementation assumptions\n\nThis calculation returns data, not files. The caller writes these contents to assumptions.md beside the four POSTTRAN outputs. Inferred layouts are not copybook-verified.\n\n| What you assumed | Which wiki statement (or absence of one) it rests on |\n| --- | --- |\n';for(var i=0;i<entries.length;i++)md+='| '+cell(entries[i].whatAssumed)+' | '+cell(entries[i].wikiBasis)+' |\n';
base.assumptions=JSON.parse(JSON.stringify(entries));base.assumptions_md=md;base.assumptionsStatus=valid?'drafted':'fallback';output={result:base};
```

### DraftAssumptions failed (SCRIPT, id=6ae555553695c563ea5157d1)

```javascript
output = {"assumptionDraft": {}};

```

_(server: 339 ms, 1 API call, 328 ms in API)_
