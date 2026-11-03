# Workflow: PostDailyTransactions

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** 

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae1636c3695c563ea509c06 | <uuid> | (0, 0) | → Post transactions (seq:<uuid>) |
| Done | END | 6ae1636d3695c563ea509c07 | <uuid> | (600, 0) | — |
| Post transactions | SCRIPT | 6ae1636d3695c563ea509c08 | <uuid> | (300, 0) | → Done (seq:<uuid>) | lang: JAVASCRIPT |

## Systems
_(none)_

## Scripts

### Post transactions (SCRIPT, id=6ae1636d3695c563ea509c08)

```javascript
var errors = [];
var readCount = 0;
var processedCount = 0;
var rejectedCount = 0;
var failedCount = 0;
var posted = [];
var rejects = [];
var accounts = [];
var categories = [];
var accountMap = {};
var categoryMap = {};
var xrefMap = {};
var safe = 818836295885544;
function err(file, line, message) { errors.push({file:file,line:line,message:message}); }
function right(s) { while (s.length > 0 && s.charAt(s.length-1) === ' ') { s = s.substring(0,s.length-1); } return s; }
function numeric(s) { s = right(s); while (s.length > 0 && s.charAt(0) === ' ') { s=s.substring(1); } if (s.length===0) { return null; } for (var j=0;j<s.length;j++) { if ('0123456789'.indexOf(s.charAt(j))<0) { return null; } } var v=Number(s); if (v>safe) { return null; } return v; }
function cents(s) {
 s=right(s); while (s.length>0 && s.charAt(0)===' ') { s=s.substring(1); }
 if(s.length===0) { return null; }
 var sign=1;
 if(s.charAt(0)==='-' || s.charAt(0)==='+') { if(s.charAt(0)==='-') { sign=-1; } s=s.substring(1); }
 if(s.length===0) { return null; }
 var last=s.charAt(s.length-1); var p='{ABCDEFGHI'.indexOf(last); var n='}JKLMNOPQR'.indexOf(last);
 if(p>=0) { s=s.substring(0,s.length-1)+String(p); }
 else if(n>=0) { sign=-1; s=s.substring(0,s.length-1)+String(n); }
 var value=numeric(s); if(value===null) { return null; } return sign*value;
}
function fmt(v) { var sign=v<0?'-':''; var a=Math.abs(v); var c=String(a%100); if(c.length<2) { c='0'+c; } return sign+String(Math.floor(a/100))+'.'+c; }
function bounded(v) { return v<=safe && v>=-safe && Math.floor(v)===v; }
function lines(v,file,required) {
 if(typeof v!=='string') { if(required) { err(file,0,'Required file contents must be supplied as a string; an empty string represents an empty file.'); } return []; }
 if(v==='') { return []; }
 var a=v.split('\n'); if(a.length>0 && a[a.length-1]==='') { a.pop(); }
 for(var i=0;i<a.length;i++) { if(a[i].length>0 && a[i].charAt(a[i].length-1)==='\r') { a[i]=a[i].substring(0,a[i].length-1); } }
 return a;
}
function categoryKey(a,t,c) { return 'k'+a+'|'+t+'|'+c; }
var masterMissing = typeof input.acctdataText!=='string' || typeof input.cardxrefText!=='string' || typeof input.tcatbalText!=='string';
var al=lines(input.acctdataText,'acctdata.dat',true);
for(var ai=0;ai<al.length;ai++) {
 var ar=al[ai]; var ak=ar.substring(0,11); var aid=numeric(ak);
 var ab=ar.length>=122?cents(ar.substring(12,24)):null;
 var acl=ar.length>=122?cents(ar.substring(24,36)):null;
 var cash=ar.length>=122?cents(ar.substring(36,48)):null;
 var acc=ar.length>=122?cents(ar.substring(78,90)):null;
 var acd=ar.length>=122?cents(ar.substring(90,102)):null;
 var aw={key:ak,bad:false,readable:false,row:null,balance:ab,credit:acc,debit:acd,limit:acl};
 if(ar.length<122 || aid===null || ab===null || acl===null || cash===null || acc===null || acd===null) { aw.bad=true; err('acctdata.dat',ai+1,'Cannot decode a consumed account field; this account is not available for posting.'); }
 else { aw.readable=true; aw.row={acct_id:aid,active_status:right(ar.substring(11,12)),curr_bal:fmt(ab),credit_limit:fmt(acl),cash_credit_limit:fmt(cash),open_date:right(ar.substring(48,58)),expiration_date:right(ar.substring(58,68)),reissue_date:right(ar.substring(68,78)),curr_cyc_credit:fmt(acc),curr_cyc_debit:fmt(acd),addr_zip:right(ar.substring(102,112)),group_id:right(ar.substring(112,122))}; }
 accounts.push(aw);
 if(accountMap['a'+ak]) { accountMap['a'+ak].bad=true; aw.bad=true; err('acctdata.dat',ai+1,'Duplicate account key; postings to this key are ambiguous.'); }
 else { accountMap['a'+ak]=aw; }
}
var xl=lines(input.cardxrefText,'cardxref.dat',true);
for(var xi=0;xi<xl.length;xi++) {
 var xr=xl[xi]; var card=right(xr.substring(0,16)); var xv={account:xr.substring(25,36),bad:xr.length<36};
 if(xv.bad) { err('cardxref.dat',xi+1,'Cannot decode consumed cross-reference fields.'); }
 if(xrefMap['c'+card]) { xrefMap['c'+card].bad=true; err('cardxref.dat',xi+1,'Duplicate card cross-reference key; postings to this key are ambiguous.'); }
 else { xrefMap['c'+card]=xv; }
}
var cl=lines(input.tcatbalText,'tcatbal.dat',true);
for(var ci=0;ci<cl.length;ci++) {
 var cr=cl[ci]; var cak=cr.substring(0,11); var ct=right(cr.substring(11,13)); var ccat=cr.substring(13,17); var caid=numeric(cak); var ccode=numeric(ccat); var cb=cr.length>=28?cents(cr.substring(17,28)):null;
 var cw={key:categoryKey(cak,ct,ccat),bad:false,readable:false,row:null,balance:cb};
 if(cr.length<28 || caid===null || ccode===null || cb===null) { cw.bad=true; err('tcatbal.dat',ci+1,'Cannot decode a consumed category-balance field.'); }
 else { cw.readable=true; cw.row={acct_id:caid,type_cd:ct,cat_cd:ccode,bal:fmt(cb)}; }
 categories.push(cw);
 if(categoryMap[cw.key]) { categoryMap[cw.key].bad=true; cw.bad=true; err('tcatbal.dat',ci+1,'Duplicate category-balance key; postings to this key are ambiguous.'); }
 else { categoryMap[cw.key]=cw; }
}
var unused=[input.discgrpText,input.custdataText,input.carddataText,input.trantypeText,input.trancatgText,input.businessDate];
var stamp=typeof input.processingTimestamp==='string'?input.processingTimestamp:'';
var stampOK=stamp.length===26;
if(!stampOK) { err('run parameters',0,'Supply processingTimestamp representing the current time in the 26-character transaction timestamp representation.'); }
var dl=lines(input.dailytranText,'dailytran.dat',true);
for(var di=0;di<dl.length;di++) {
 readCount=readCount+1;
 var dr=dl[di]; var amount=dr.length>=330?cents(dr.substring(132,143)):null;
 var catCode=numeric(dr.substring(18,22)); var merchant=numeric(dr.substring(143,152));
 if(dr.length<330 || amount===null || catCode===null || merchant===null) { failedCount=failedCount+1; err('dailytran.dat',di+1,'Cannot decode a consumed transaction field; no business rejection code is invented.'); continue; }
 var tr={tran_id:right(dr.substring(0,16)),type_cd:right(dr.substring(16,18)),cat_cd:catCode,source:right(dr.substring(22,32)),desc:right(dr.substring(32,132)),amt:fmt(amount),merchant_id:merchant,merchant_name:right(dr.substring(152,202)),merchant_city:right(dr.substring(202,252)),merchant_zip:right(dr.substring(252,262)),card_num:right(dr.substring(262,278)),orig_ts:right(dr.substring(278,304)),proc_ts:right(dr.substring(304,330))};
 if(masterMissing) { failedCount=failedCount+1; err('dailytran.dat',di+1,'A required master snapshot was not supplied; no posting or business rejection is calculated.'); continue; }
 var reason=0; var reasonText=''; var xf=xrefMap['c'+tr.card_num]; var account=null;
 if(!xf) { reason=100; reasonText='INVALID CARD NUMBER FOUND'; }
 else if(xf.bad) { failedCount=failedCount+1; err('dailytran.dat',di+1,'The card cross-reference is malformed or ambiguous.'); continue; }
 else {
  account=accountMap['a'+xf.account];
  if(!account) { reason=101; reasonText='ACCOUNT RECORD NOT FOUND'; }
  else if(account.bad || !account.readable) { failedCount=failedCount+1; err('dailytran.dat',di+1,'The referenced account is malformed or ambiguous.'); continue; }
  else {
   var exposure=account.credit-account.debit+amount;
   if(!bounded(exposure)) { failedCount=failedCount+1; err('dailytran.dat',di+1,'Exact-cent calculation exceeds the supported numeric range.'); continue; }
   if(exposure*10>account.limit*11) { reason=102; reasonText='OVERLIMIT TRANSACTION'; }
   if(account.row.expiration_date<tr.orig_ts.substring(0,10)) { reason=103; reasonText='TRANSACTION RECEIVED AFTER ACCT EXPIRATION'; }
  }
 }
 if(reason!==0) { tr.reason=reason; tr.reason_desc=reasonText; rejects.push(tr); rejectedCount=rejectedCount+1; continue; }
 if(!stampOK) { failedCount=failedCount+1; err('dailytran.dat',di+1,'The record cannot post without a supplied current processing timestamp.'); continue; }
 var key=categoryKey(account.key,tr.type_cd,dr.substring(18,22)); var category=categoryMap[key];
 if(category && (category.bad || !category.readable)) { failedCount=failedCount+1; err('dailytran.dat',di+1,'The category balance is malformed or ambiguous.'); continue; }
 var newBalance=account.balance+amount; var newCredit=account.credit+(amount>=0?amount:0); var newDebit=account.debit+(amount<0?amount:0); var newCategory=(category?category.balance:0)+amount;
 if(!bounded(newBalance) || !bounded(newCredit) || !bounded(newDebit) || !bounded(newCategory)) { failedCount=failedCount+1; err('dailytran.dat',di+1,'A balance would exceed the exact supported cents range; no update was applied.'); continue; }
 if(!category) { category={key:key,bad:false,readable:true,row:{acct_id:account.row.acct_id,type_cd:tr.type_cd,cat_cd:tr.cat_cd,bal:'0.00'},balance:0}; categoryMap[key]=category; categories.push(category); }
 account.balance=newBalance; account.credit=newCredit; account.debit=newDebit; account.row.curr_bal=fmt(newBalance); account.row.curr_cyc_credit=fmt(newCredit); account.row.curr_cyc_debit=fmt(newDebit); category.balance=newCategory; category.row.bal=fmt(newCategory);
 tr.proc_ts=stamp; posted.push(tr); processedCount=processedCount+1;
}
var outAccounts=[];
for(var ao=0;ao<accounts.length;ao++) { if(accounts[ao].readable) { outAccounts.push(accounts[ao].row); } }
var outCategories=[];
for(var co=0;co<categories.length;co++) { if(categories[co].readable) { outCategories.push(categories[co].row); } }
var assumptions=[
 {what_you_assumed:'The caller supplies file contents and saves returned datasets and assumptions.md; no physical file is read or written by this workflow.',which_wiki_statement_or_absence:'cr2-posttran-sonnet.pdf p.27 CONTRACT.md lists physical files; the maker explicitly chose caller-managed file I/O for this build.',rationale:'The supported calculation returns data; file creation is outside the agreed scope.'},
 {what_you_assumed:'Original posting behaviour takes priority over proposed database, sequence and checkpoint improvements.',which_wiki_statement_or_absence:'p.3 BR-09 proposes idempotency/checkpoints; p.4 contrasts legacy no commit with FlowX per-transaction commit; maker chose original behaviour.',rationale:'An isolated snapshot calculation has no persistent commit or restart store.'},
 {what_you_assumed:'Transaction fields occupy 0-based half-open ranges tran_id 0:16, type_cd 16:18, cat_cd 18:22, source 22:32, desc 32:132, amt 132:143, merchant_id 143:152, merchant_name 152:202, merchant_city 202:252, merchant_zip 252:262, card_num 262:278, orig_ts 278:304 and proc_ts 304:330; residual bytes through nominal length 350 are filler.',which_wiki_statement_or_absence:'p.9-11 list Transaction fields and widths; p.11 says DailyTransaction has the same attributes; p.27 references CVTRA06Y but supplies no copybook or byte offsets.',rationale:'Offsets and trailing filler are reconstructed from listed order and widths, not verified copybook definitions.'},
 {what_you_assumed:'Account ranges are acct_id 0:11, active_status 11:12, curr_bal 12:24, credit_limit 24:36, cash_credit_limit 36:48, open_date 48:58, expiration_date 58:68, reissue_date 68:78, curr_cyc_credit 78:90, curr_cyc_debit 90:102, addr_zip 102:112 and group_id 112:122; residual bytes through 300 are filler.',which_wiki_statement_or_absence:'p.7 lists these fields and a 178-byte filler; p.27 references CVACT01Y without including the copybook.',rationale:'Consecutive widths reconstruct the layout but cannot certify original offsets.'},
 {what_you_assumed:'Cross-reference card is 0:16 and account is 25:36, skipping customer 16:25; category balance uses account 0:11, type 11:13, category 13:17 and balance 17:28, with residual nominal 50-byte filler ignored.',which_wiki_statement_or_absence:'p.9 CardXref and p.10 TransactionCategoryBalance give field order and widths; p.27 lists 50-byte records but no complete layouts.',rationale:'Only lookup keys and category balances are consumed by posting.'},
 {what_you_assumed:'Fixed numeric amounts contain implied cents with trailing ASCII overpunch: {ABCDEFGHI are positive digits 0-9 and }JKLMNOPQR are negative digits 0-9; plain digits, surrounding spaces and an optional leading sign are also accepted.',which_wiki_statement_or_absence:'p.7, p.9 and p.10 specify signed implied-decimal PIC fields; p.10 explicitly mentions overpunch for disclosure rates, but the supplied pages do not specify POSTTRAN input sign encoding.',rationale:'This is an explicit encoding inference; accepting a leading sign or spaces adds tolerance rather than rejecting otherwise readable amounts.'},
 {what_you_assumed:'Amounts are exact integer cents and output amounts are two-decimal strings; each parsed amount and relevant intermediate is restricted to absolute value 818836295885544 cents.',which_wiki_statement_or_absence:'p.3 gives arithmetic rules; p.27 allows JSON money strings or numbers with at most two decimals; the wiki specifies no JavaScript numeric-range policy.',rationale:'The conservative range keeps 10-times exposure and 11-times credit limit within exact integer arithmetic; overflow becomes a processing error.'},
 {what_you_assumed:'Input line endings are LF or CRLF, one final empty split after a terminal newline is ignored, and leading text spaces are retained while trailing text spaces may be omitted; filler is not examined, even when nonprintable.',which_wiki_statement_or_absence:'p.27 specifies one fixed-width record per line and permits omitting trailing string spaces; it gives no newline convention or validation rule for filler.',rationale:'Only consumed fields affect posting; malformed consumed fields, not filler contents or nominal trailing length, cause processing errors.'},
 {what_you_assumed:'Digit identifiers remain strings for internal matching; acct_id, transaction cat_cd and merchant_id are numeric in JSON, and category-balance acct_id/cat_cd use the same numeric representation; card_num and tran_id retain leading zeroes.',which_wiki_statement_or_absence:'p.7 and p.9-10 describe string identifier widths; p.27 explicitly requires account acct_id, transaction cat_cd and merchant_id as integers but does not separately type category-balance columns.',rationale:'Internal fixed-width identity is preserved while output uses the contract representation; category fields follow the same named fields elsewhere in the contract.'},
 {what_you_assumed:'When card lookup fails, return only reason 100 without attempting account diagnosis; when account lookup fails, return only 101; for a found account, expiry 103 overwrites over-limit 102.',which_wiki_statement_or_absence:'p.3 BR-01 through BR-04 and p.4 lookup order; p.4 example mentions invalid card plus expiry but provides no account lookup path after a missing card; maker chose the immediate invalid-card result.',rationale:'There is no identified account to test after a missing cross-reference; the documented limit-then-expiry order remains intact.'},
 {what_you_assumed:'Expiry is compared lexically with the first ten characters of orig_ts, representing its original calendar date; equal dates pass; no new calendar-validity, active-status or business-date rejection is imposed.',which_wiki_statement_or_absence:'p.3 BR-04 says account expiry before transaction original date; p.7 describes YYYY-MM-DD dates; the supplied posting rules contain no extra date-validity or active-status test.',rationale:'The ISO date prefix preserves the documented strict comparison without adding business validation absent from the source.'},
 {what_you_assumed:'The caller supplies processingTimestamp representing now in a 26-character transaction timestamp representation; it replaces proc_ts only for posted records and is never fabricated from businessDate.',which_wiki_statement_or_absence:'p.3 BR-05 says processedTimestamp = now; p.10 gives a 26-character timestamp; the wiki gives no clock, timezone or fractional-second policy.',rationale:'Clock ownership remains explicit at the caller boundary and fixed timestamp inputs permit reproducible tests; missing or wrong-length values are processing errors.'},
 {what_you_assumed:'Feed tran_id values are retained and every input line is processed in order, including duplicate identifiers; reruns use original snapshots and the same timestamp rather than already-updated outputs.',which_wiki_statement_or_absence:'p.11 says the daily feed has transaction attributes; p.9 and p.23 propose sequence allocation, while p.3 BR-09 proposes idempotency by transactionId; p.27 provides no prior transaction snapshot, sequence start or checkpoint.',rationale:'The maker chose no proposed sequence or restart improvements; no duplicate-suppression policy or replacement sequence seed is silently invented.'},
 {what_you_assumed:'Missing category balance starts at zero; signed amounts update account and category balances; zero is a credit-side amount and still creates a missing category row.',which_wiki_statement_or_absence:'p.3 BR-05 says TCATBAL upsert/create and amount >= 0 adds to cycle credit; it does not explicitly state the initial balance of a new row.',rationale:'Zero initialization is the minimal interpretation of creating a running balance; negative debit amounts keep their sign as documented.'},
 {what_you_assumed:'Malformed consumed fields or ambiguous duplicate master keys are processing errors, not new business rejection codes; continue independent records, and do not partially apply a failing record.',which_wiki_statement_or_absence:'p.3-4 define business reasons 100-103 and p.19 leaves file-error details uncertain; there is no malformed-record or duplicate-master rule. Master types have primary/composite keys on p.7 and p.9-10.',rationale:'The confirmed error policy isolates failures; readable duplicate master rows remain in returned snapshots, but postings involving their ambiguous key do not proceed.'},
 {what_you_assumed:'Business-only completion is OK/0 or WARNING/4 with rejects; processing errors are ERROR with assumed return code 12 and incomplete outputs. failedCount counts failed feed lines, while master errors are also listed separately.',which_wiki_statement_or_absence:'p.3 BR-07 and p.4 require warning/4 for rejects, and p.5 requires read = posted + rejected; the source does not assign a return code or counters for malformed input.',rationale:'For classified feed lines read = posted + rejected + failed; original count equality remains true when no feed line is unprocessable. ERROR is never presented as successful completion.'},
 {what_you_assumed:'Reject JSON preserves original transaction field values and adds one integer reason and description, rather than returning the raw 350-byte image plus fixed trailer.',which_wiki_statement_or_absence:'p.3 BR-06 describes the legacy raw image and 4+76 trailer; p.27 CONTRACT.md instead fixes transaction fields plus reason and reason_desc for JSON output.',rationale:'The explicit JSON contract governs output representation; no whitespace-padded trailer or extra raw-image field is added.'},
 {what_you_assumed:'All readable account/category rows are returned, including unchanged rows; unreadable rows are reported and cannot be represented as a successful complete output. Empty feed is successful with valid supplied master snapshots and timestamp.',which_wiki_statement_or_absence:'p.27 requires every account and category balance after posting; p.19 mentions empty/no-data without a definitive POSTTRAN policy.',rationale:'Returning unchanged snapshots for an empty feed is the minimal no-op batch interpretation; errors clearly mark incomplete outputs.'},
 {what_you_assumed:'Disclosure, customer, card, transaction-type and transaction-category file contents and businessDate are accepted but do not change posting decisions; no interest is calculated.',which_wiki_statement_or_absence:'p.27 lists inputs for the chain; p.3 posting rules consume cross-reference, account and category balances and compare expiry with original date; INTCALC is a different step.',rationale:'Do not invent reference lookups, active-status restrictions or validation of unused files for POSTTRAN.'},
 {what_you_assumed:'Reason 109 is not simulated, and there are no timeout retries or database rollback/restart actions in this side-effect-free calculation.',which_wiki_statement_or_absence:'p.3 BR-08 associates 109 with account rewrite failure; p.17 and p.23 describe store errors, but this agreed implementation writes no store.',rationale:'Inventing a storage failure would not implement an actual failing account rewrite; the caller owns durable delivery and replay.'},
 {what_you_assumed:'Assumption entries and Markdown are drafted once during implementation and emitted unchanged on every run; synthetic tests are not proof of oracle parity.',which_wiki_statement_or_absence:'The maker requests what was assumed and the wiki statement or absence supporting each decision; p.27 is a format contract, not behavioural answers, and original input fixtures/oracle outputs were not supplied.',rationale:'Freeze reviewable provenance next to results without runtime AI decisions or unverified claims.'}
];
var md='# Assumptions\n\nPosting calculation only; the caller saves this text as assumptions.md next to the four JSON outputs. Reconstructed layouts are not verified copybooks.\n\n| What you assumed | Which wiki statement (or absence of one) it rests on | Rationale |\n| --- | --- | --- |\n';
function cell(s) { return s.split('|').join('\\|').split('\n').join(' '); }
for(var si=0;si<assumptions.length;si++) { var se=assumptions[si]; md=md+'| '+cell(se.what_you_assumed)+' | '+cell(se.which_wiki_statement_or_absence)+' | '+cell(se.rationale)+' |\n'; }
var status=errors.length>0?'ERROR':(rejectedCount>0?'WARNING':'OK');
var rc=errors.length>0?12:(rejectedCount>0?4:0);
output={result:{posttran_transact:posted,posttran_dalyrejs:rejects,posttran_acctdata:outAccounts,posttran_tcatbal:outCategories,assumptions:assumptions,assumptions_md:md,runSummary:{status:status,returnCode:rc,readCount:readCount,processedCount:processedCount,rejectedCount:rejectedCount,failedCount:failedCount,errors:errors}}};
```

_(server: 284 ms, 1 API call, 268 ms in API)_
