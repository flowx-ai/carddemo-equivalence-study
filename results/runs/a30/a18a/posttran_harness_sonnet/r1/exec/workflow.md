# Workflow: PostDailyTransactions

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** 

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae50d8a3695c563ea514d5b | <uuid> | (0, 0) | → DecodeAndPost (seq:<uuid>) |
| End | END | 6ae50d8a3695c563ea514d5c | <uuid> | (1200, 0) | — |
| DecodeAndPost | SCRIPT | 6ae50d8a3695c563ea514d5d | <uuid> | (300, 0) | → DraftAssumptions (seq:<uuid>) | lang: JAVASCRIPT |
| DraftAssumptions | AI | 6ae50d8a3695c563ea514d5e | <uuid> | (600, 0) | → AssembleResults [SUCCESS] (seq:<uuid>), → DraftAssumptions failed [FAIL] (seq:<uuid>) | responseKey: assumptionDraft, aiType: TEXT_UNDERSTANDING, responseSchema: set |
| AssembleResults | SCRIPT | 6ae50d8a3695c563ea514d5f | <uuid> | (900, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| DraftAssumptions failed | SCRIPT | 6ae50d8a3695c563ea514d60 | <uuid> | (600, 200) | → AssembleResults (seq:<uuid>) | lang: JAVASCRIPT |

## Systems
_(none)_

## AI prompts

### DraftAssumptions (TEXT_UNDERSTANDING, id=6ae50d8a3695c563ea514d5e)
instructions:

```
Produce source-linked implementation assumption notes in English from the supplied canonical decision manifest only. Return an object with assumptions, one entry per manifest item, each with whatYouAssumed and wikiBasis. Preserve each item's two strings verbatim, including caveats, page references, explicit uncertainty, and delivery limitations. Do not add, combine, omit or reinterpret assumptions. Do not infer additional legacy behaviour. No account data is supplied or needed. These notes describe implementation choices already made; you do not choose or modify any posting rule.
```
userMessage:

```
Canonical decision manifest, including the relevant wiki statements or identified absences: ${assumptionManifest}
```
exampleOutputJsonSchema:

```
{"title":"Response","type":"object","additionalProperties":false,"required":["assumptions"],"properties":{"assumptions":{"type":"array","items":{"type":"object","additionalProperties":false,"required":["whatYouAssumed","wikiBasis"],"properties":{"whatYouAssumed":{"type":"string"},"wikiBasis":{"type":"string"}}}}}}
```

## Scripts

### DecodeAndPost (SCRIPT, id=6ae50d8a3695c563ea514d5d)

```javascript
var manifest = [
 {whatYouAssumed:'This delivery consumes caller-supplied file contents and returns values only; the caller must map the four output arrays to posttran_transact.json, posttran_dalyrejs.json, posttran_acctdata.json and posttran_tcatbal.json and write assumptions_md to assumptions.md. No files are created here.',wikiBasis:'posttran-sonnet.pdf p.27 CONTRACT.md requires named JSON files; p.28 permits fixed-width dumps. Returning values instead is the maker-selected reduced delivery, not equivalent to completing that contract.'},
 {whatYouAssumed:'Read dailytran, acctdata, cardxref and tcatbal for POSTTRAN. Accept discgrp, custdata, carddata, trantype and trancatg contents without using them. No new category, active-status, customer or card-file validation is introduced.',wikiBasis:'posttran-sonnet.pdf pp.2-3 lists xref, account, limit and account-expiry checks; p.27 lists inputs for the chain, not a requirement that POSTTRAN consult every reference file.'},
 {whatYouAssumed:'Single-byte record contents are supplied as JavaScript strings, one record per LF or CRLF line; an optional final line terminator is not a record. Internal empty lines are records that cannot be decoded. Decode fields in the wiki order and copybook widths; do not validate unread filler or its bytes.',wikiBasis:'posttran-sonnet.pdf pp.7,9-11,27 lists widths and field order but does not attach the complete copybooks or specify file encoding. p.7 explicitly drops account filler. Physical offsets and text encoding are therefore inferred, not verified copybook facts.'},
 {whatYouAssumed:'Transaction offsets (zero-based) are id 0:16, type 16:18, category 18:22, source 22:32, description 32:132, amount 132:143, merchant id 143:152, name 152:202, city 202:252, zip 252:262, card 262:278, original timestamp 278:304 and processed timestamp 304:330; remaining filler is ignored.',wikiBasis:'posttran-sonnet.pdf pp.9-11 lists Transaction fields and says DailyTransaction has the same attributes. Amount S9(9)V99 occupies 11 display characters. p.27 gives 350-byte records but not offsets.'},
 {whatYouAssumed:'Account offsets are id 0:11, status 11:12, current balance 12:24, credit limit 24:36, cash limit 36:48, three dates 48:78, cycle credit 78:90, cycle debit 90:102, zip 102:112 and group 112:122. Xref is card 0:16, customer 16:25, account 25:36. Category balance is account 0:11, type 11:13, category 13:17, amount 17:28.',wikiBasis:'posttran-sonnet.pdf pp.7,9-10 gives ordered fields and display widths; p.27 gives record lengths. Complete physical layouts are absent, so offsets are derived and must be checked against copybooks when available.'},
 {whatYouAssumed:'Decode implied-decimal monetary fields as integer cents using trailing ASCII overpunch ({ABCDEFGHI positive; }JKLMNOPQR negative), also accepting all-digit positive fields. Do not use floating-point money arithmetic. Output amounts as strings with exactly two decimals; do not round input or overflow silently.',wikiBasis:'posttran-sonnet.pdf pp.7,9-10 declares signed display monetary fields and demonstrates overpunch 0150{ = 15.00 for disclosure rates; full encoding conventions for the posting files are not specified. p.27 allows decimal strings or numbers.'},
 {whatYouAssumed:'Preserve digit identifiers internally as strings, including leading zeros. Convert acct_id, cat_cd and merchant_id to integers only at the output boundary where CONTRACT.md requires them; category-balance cat_cd stays a zero-padded string because its type is not fixed there.',wikiBasis:'posttran-sonnet.pdf pp.7,9-10 models identifiers as strings; p.27 explicitly marks account acct_id, transaction cat_cd and merchant_id as integers, but does not mark category-balance key types.'},
 {whatYouAssumed:'Preserve each feed transaction id instead of allocating another. Process feed occurrences sequentially, including repeated identifiers; this pure calculation does not claim durable deduplication.',wikiBasis:'posttran-sonnet.pdf p.3 describes transactionId-based idempotency as a FlowX improvement; pp.9,23 describes generic sequence allocation. The batch record-id preservation versus allocation rule is not resolved; the contract supplies no prior transaction file or sequence state.'},
 {whatYouAssumed:'Use one UTC run-start clock for all successful processing timestamps, formatted YYYY-MM-DD HH:mm:ss.ffffff with milliseconds padded to six fractional digits. Rejected records retain the input processing timestamp.',wikiBasis:'posttran-sonnet.pdf p.3 BR-05 says processedTimestamp = now; pp.9-10 declares X(26) timestamps without timezone or exact punctuation. p.3 BR-06 retains original rejected-record data.'},
 {whatYouAssumed:'For valid references, reject only when cycle credit minus signed cycle debit plus amount is strictly greater than credit limit, then overwrite 102 with 103 when account expiry is strictly before the original transaction calendar date. Equal dates and an amount exactly at limit pass.',wikiBasis:'posttran-sonnet.pdf p.3 BR-03 and BR-04 explicitly uses > and < and expiry overwrites overlimit; p.4 gives xref -> account -> limit -> expiry order. A missing xref or account cannot supply an expiry, so those lookups stop at reason 100 or 101.'},
 {whatYouAssumed:'Validate required posting fields when actually read: a missing xref or missing account may be rejected before amount or date decoding. For existing accounts, decode needed arithmetic and dates. An unreadable required field is a separate processing error, not an invented reject reason, and later independent records continue.',wikiBasis:'posttran-sonnet.pdf pp.3-4 fixes business reason codes and validation order but gives no malformed-input reason code. p.3 excludes account rewrite error 109 from rejects. Input validation beyond the fields used by the step is not documented.'},
 {whatYouAssumed:'Amounts >= 0 increase cycle credit; negative amounts are added, with their negative sign, to cycle debit. Both current account balance and category balance add the signed amount. A missing account/type/category balance starts at zero.',wikiBasis:'posttran-sonnet.pdf p.3 BR-05 states these arithmetic rules, including negative amount added to debit; p.4 scenario 9 requires creating a missing category balance.'},
 {whatYouAssumed:'Use the first physical matching xref, account or category row if a supposedly unique master key is repeated; preserve every supplied account and category row in outputs. No later duplicate overwrites an earlier lookup. Newly created category rows are appended.',wikiBasis:'posttran-sonnet.pdf pp.7,9-10 declares primary/composite keys; duplicate-key handling for supplied flat-file master snapshots is not specified.'},
 {whatYouAssumed:'Return every successfully decoded master row, including untouched rows. A master row whose required output numeric fields cannot be decoded is reported as a processing error; the partial result has FAILED status and is not a complete successful snapshot. Preserve original rejected record images internally while exposing only contract fields.',wikiBasis:'posttran-sonnet.pdf p.27 requires every account and category balance after posting and fixes reject output fields; pp.3,5 describes original reject images and fixed-width dumps. The JSON format does not include a raw-image field.'},
 {whatYouAssumed:'With any processing error return FAILED; otherwise any business reject gives WARNING; otherwise return SUCCESS, including an empty feed. Each failed record changes no account or category balance. No external write failure is simulated and no retries are performed because this calculation has no I/O.',wikiBasis:'posttran-sonnet.pdf p.3 BR-07 requires warning for rejects; BR-08 treats rewrite failure separately; p.19 maps an empty file to NO_DATA without specifying this calculation-only return shape. A processing-error return and empty-feed success are implementation defaults.'},
 {whatYouAssumed:'No persistent checkpoint, transaction commit, record archive, scheduler, processing-window switch or restart store is provided. Recompute against the original supplied snapshots after a failed invocation; applying the feed again to previously updated snapshots would double-post.',wikiBasis:'posttran-sonnet.pdf pp.3-4 proposes per-transaction restart as a FlowX improvement; p.25 defines the wider batch chain. Those persistence and orchestration mechanisms are outside the maker-selected calculation-only scope.'},
 {whatYouAssumed:'Use the contract business date 2022-07-18 as context, not as an override for transaction original date or the run clock; INTCALC parameter 2022071800 is irrelevant to POSTTRAN. Trim trailing text spaces only and retain timestamp text except for successful proc_ts replacement.',wikiBasis:'posttran-sonnet.pdf p.27 fixes run parameters and permits omission of trailing spaces. p.3 compares account expiry to transaction original date and sets processing time to now.'},
 {whatYouAssumed:'Assumption drafting receives only this decision manifest, never account or card contents. Accept a drafted entry only when both its assumption and source-basis strings exactly match a canonical entry; restore every omitted or altered entry. The model cannot change posting rules, balances, counts or delivery limits.',wikiBasis:'The maker requests every assumption and its wiki basis. Model drafting is an isolated presentation mechanism selected in this plan, not behaviour specified in the wiki; canonical restoration prevents unsupported new source claims.'}
];
function rt(s){return String(s).replace(/ +$/,'');}
function lines(v){if(v===undefined||v===null||v==='')return [];if(typeof v!=='string')throw new Error('File content must be a string');var a=v.split(/\r?\n/);if(a.length&&a[a.length-1]==='')a.pop();return a;}
function cut(s,p,n){if(s.length<p+n)throw new Error('Required field is truncated at offset '+p);return s.slice(p,p+n);}
function digits(s,label){if(!/^\d+$/.test(s))throw new Error('Invalid '+label);return s;}
function num(s,label){digits(s,label);var n=Number(s);if(!Number.isSafeInteger(n))throw new Error('Integer overflow in '+label);return n;}
function cents(s){var c=s.charAt(s.length-1),pos='{ABCDEFGHI',neg='}JKLMNOPQR',k=pos.indexOf(c),sign=1,body=s;if(k>=0)body=s.slice(0,-1)+k;else {k=neg.indexOf(c);if(k>=0){sign=-1;body=s.slice(0,-1)+k;}}digits(body,'money encoding');var n=Number(body)*sign;if(!Number.isSafeInteger(n))throw new Error('Money overflow');return n;}
function money(n){if(!Number.isSafeInteger(n))throw new Error('Money overflow');var a=Math.abs(n);return (n<0?'-':'')+Math.floor(a/100)+'.'+String(a%100).padStart(2,'0');}
function add(a,b){var n=a+b;if(!Number.isSafeInteger(n))throw new Error('Money overflow');return n;}
function day(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s))throw new Error('Invalid required date');var d=new Date(s+'T00:00:00.000Z');if(isNaN(d.getTime())||d.toISOString().slice(0,10)!==s)throw new Error('Invalid required date');return s;}
function catkey(a,t,c){return a+'|'+t+'|'+c;}
var errors=[],accounts=[],balances=[],xrefs=[],accountLookup={},balanceLookup={},xrefLookup={},posted=[],rejects=[],daily=[];
function err(file,line,message){errors.push({file:file,line:line,message:String(message)});}
function load(key,file,fn){var rows=[];try{rows=lines(input[key]);}catch(e){err(file,0,e.message);return;}for(var i=0;i<rows.length;i++){try{fn(rows[i],i+1);}catch(e){err(file,i+1,e.message);}}}
load('acctdata','acctdata.dat',function(s,line){var id=digits(cut(s,0,11),'account id');var row={acct_id:num(id,'account id'),active_status:rt(cut(s,11,1)),curr_bal:money(cents(cut(s,12,12))),credit_limit:money(cents(cut(s,24,12))),cash_credit_limit:money(cents(cut(s,36,12))),open_date:rt(cut(s,48,10)),expiration_date:rt(cut(s,58,10)),reissue_date:rt(cut(s,68,10)),curr_cyc_credit:money(cents(cut(s,78,12))),curr_cyc_debit:money(cents(cut(s,90,12))),addr_zip:rt(cut(s,102,10)),group_id:rt(cut(s,112,10))};accounts.push(row);if(!Object.prototype.hasOwnProperty.call(accountLookup,id))accountLookup[id]={row:row,balance:cents(cut(s,12,12)),limit:cents(cut(s,24,12)),credit:cents(cut(s,78,12)),debit:cents(cut(s,90,12))};});
load('cardxref','cardxref.dat',function(s,line){var card=rt(cut(s,0,16)),id=digits(cut(s,25,11),'xref account id');xrefs.push({card:card,id:id});if(!Object.prototype.hasOwnProperty.call(xrefLookup,card))xrefLookup[card]=id;});
load('tcatbal','tcatbal.dat',function(s,line){var id=digits(cut(s,0,11),'category account id'),t=cut(s,11,2),c=digits(cut(s,13,4),'category code'),n=cents(cut(s,17,11)),row={acct_id:num(id,'category account id'),type_cd:rt(t),cat_cd:c,bal:money(n)};balances.push(row);var key=catkey(id,t,c);if(!Object.prototype.hasOwnProperty.call(balanceLookup,key))balanceLookup[key]={row:row,balance:n};});
try{daily=lines(input.dailytran);}catch(e){err('dailytran.dat',0,e.message);}
var now=new Date().toISOString().replace('T',' ').replace('Z','000');
var descs={100:'INVALID CARD NUMBER FOUND',101:'ACCOUNT RECORD NOT FOUND',102:'OVERLIMIT TRANSACTION',103:'TRANSACTION RECEIVED AFTER ACCT EXPIRATION'};
function transaction(s,amount,category,merchant){return {tran_id:rt(cut(s,0,16)),type_cd:rt(cut(s,16,2)),cat_cd:category===null?num(cut(s,18,4),'transaction category'):category,source:rt(cut(s,22,10)),desc:rt(cut(s,32,100)),amt:money(amount===null?cents(cut(s,132,11)):amount),merchant_id:merchant===null?num(cut(s,143,9),'merchant id'):merchant,merchant_name:rt(cut(s,152,50)),merchant_city:rt(cut(s,202,50)),merchant_zip:rt(cut(s,252,10)),card_num:rt(cut(s,262,16)),orig_ts:rt(cut(s,278,26)),proc_ts:rt(cut(s,304,26))};}
var rejectedImages=[];
for(var i=0;i<daily.length;i++){
 var s=daily[i];
 try{
  var card=rt(cut(s,262,16)),id=xrefLookup[card],reason=0,a=null,amount=null,category=null,merchant=null,t=cut(s,16,2),c=cut(s,18,4);
  if(!Object.prototype.hasOwnProperty.call(xrefLookup,card))reason=100;
  else if(!Object.prototype.hasOwnProperty.call(accountLookup,id))reason=101;
  else{
   a=accountLookup[id];amount=cents(cut(s,132,11));
   if(add(add(a.credit,-a.debit),amount)>a.limit)reason=102;
   var expiry=day(a.row.expiration_date),orig=day(cut(s,278,10));
   if(expiry<orig)reason=103;
  }
  var tr=transaction(s,amount,category,merchant);
  if(reason){tr.reason=reason;tr.reason_desc=descs[reason];rejects.push(tr);rejectedImages.push(s);}
  else{
   var ck=catkey(id,t,digits(c,'transaction category')),b=balanceLookup[ck],nextBalance=add(a.balance,amount),nextCredit=amount>=0?add(a.credit,amount):a.credit,nextDebit=amount<0?add(a.debit,amount):a.debit,nextCategory=add(b?b.balance:0,amount);
   money(nextBalance);money(nextCredit);money(nextDebit);money(nextCategory);
   tr.proc_ts=now;
   if(!b){var br={acct_id:num(id,'category account id'),type_cd:rt(t),cat_cd:c,bal:money(nextCategory)};b={row:br,balance:0};balances.push(br);balanceLookup[ck]=b;}
   a.balance=nextBalance;a.credit=nextCredit;a.debit=nextDebit;b.balance=nextCategory;
   a.row.curr_bal=money(nextBalance);a.row.curr_cyc_credit=money(nextCredit);a.row.curr_cyc_debit=money(nextDebit);b.row.bal=money(nextCategory);posted.push(tr);
  }
 }catch(e){err('dailytran.dat',i+1,e.message);}
}
output={postingResult:{posttran_transact:posted,posttran_dalyrejs:rejects,posttran_acctdata:accounts,posttran_tcatbal:balances,status:errors.length?'FAILED':rejects.length?'WARNING':'SUCCESS',readCount:daily.length,postedCount:posted.length,rejectedCount:rejects.length,processingErrors:errors},assumptionManifest:manifest};
```

### AssembleResults (SCRIPT, id=6ae50d8a3695c563ea514d5f)

```javascript
var canonical=Array.isArray(input.assumptionManifest)?input.assumptionManifest:[];var draft=input.assumptionDraft||{};var offered=Array.isArray(draft.assumptions)?draft.assumptions:[];var notes=[];for(var i=0;i<canonical.length;i++){var c=canonical[i],selected={whatYouAssumed:c.whatYouAssumed,wikiBasis:c.wikiBasis};for(var j=0;j<offered.length;j++){var d=offered[j];if(d&&d.whatYouAssumed===c.whatYouAssumed&&d.wikiBasis===c.wikiBasis){selected={whatYouAssumed:d.whatYouAssumed,wikiBasis:d.wikiBasis};break;}}notes.push(selected);}var md='# Daily transaction posting assumptions\n\nThis is the calculation-only delivery. No output files are created.\n\n';for(var k=0;k<notes.length;k++){md+='## '+(k+1)+'\n\nWhat was assumed: '+notes[k].whatYouAssumed+'\n\nWiki statement or absence: '+notes[k].wikiBasis+'\n\n';}var p=input.postingResult||{posttran_transact:[],posttran_dalyrejs:[],posttran_acctdata:[],posttran_tcatbal:[],status:'FAILED',readCount:0,postedCount:0,rejectedCount:0,processingErrors:[{file:'workflow',line:0,message:'Posting result absent'}]};output={result:{posttran_transact:p.posttran_transact,posttran_dalyrejs:p.posttran_dalyrejs,posttran_acctdata:p.posttran_acctdata,posttran_tcatbal:p.posttran_tcatbal,assumptions:notes,assumptions_md:md,status:p.status,readCount:p.readCount,postedCount:p.postedCount,rejectedCount:p.rejectedCount,processingErrors:p.processingErrors}};
```

### DraftAssumptions failed (SCRIPT, id=6ae50d8a3695c563ea514d60)

```javascript
output = {"assumptionDraft": {}};

```

_(server: 331 ms, 1 API call, 328 ms in API)_
