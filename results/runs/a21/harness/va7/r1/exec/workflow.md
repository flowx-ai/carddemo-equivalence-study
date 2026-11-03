# Workflow: DailyTransactionPosting

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** 

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae238b63695c563ea50baf8 | <uuid> | (0, 0) | → Post daily transactions (seq:<uuid>) |
| Return posting result | END | 6ae238b73695c563ea50baf9 | <uuid> | (900, 0) | — |
| Post daily transactions | SCRIPT | 6ae238b73695c563ea50bafa | <uuid> | (300, 0) | → Escape text (seq:<uuid>) | lang: JAVASCRIPT |
| Escape text | SCRIPT | 6ae238b73695c563ea50bafb | <uuid> | (600, 0) | → Return posting result (seq:<uuid>) | lang: JAVASCRIPT |

## Systems
_(none)_

## Scripts

### Post daily transactions (SCRIPT, id=6ae238b73695c563ea50bafa)

```javascript
var bag = input || {};
var txFields = ['tran_id','type_cd','cat_cd','source','desc','amt','merchant_id','merchant_name','merchant_city','merchant_zip','card_num','orig_ts','proc_ts'];
var acFields = ['acct_id','active_status','curr_bal','credit_limit','cash_credit_limit','open_date','expiration_date','reissue_date','curr_cyc_credit','curr_cyc_debit','addr_zip','group_id'];
var assumptions = [
 {assumed:'The calculation accepts decoded records; a separate wrapper reads and writes the named files.',wikiBasis:'posttran-sonnet-va7.pdf p.27: Inputs are fixed-width files; outputs are JSON lists. Maker accepted calculation-only delivery.',consequence:'dailytran.dat, acctdata.dat, cardxref.dat and tcatbal.dat map to the four input lists; no files are read or saved here.'},
 {assumed:'Other listed reference files and unconsumed filler do not impose extra validation.',wikiBasis:'posttran-sonnet-va7.pdf pp.2-3: posting checks CardXref, Account, limit and expiry; p.27 lists additional files but gives no additional POSTTRAN checks.',consequence:'No status, customer, card-master, transaction-type, category-reference or filler validation is introduced.'},
 {assumed:'Decoded transaction, account and category rows use CONTRACT.md output field names; cross-references use card_num and acct_id, with cardNumber and accountId accepted as wiki aliases.',wikiBasis:'posttran-sonnet-va7.pdf pp.9,27: wiki uses camelCase while CONTRACT.md fixes output names; no decoded input API is specified.',consequence:'Trim trailing spaces on keys for matching; numeric account keys match their zero-padded string equivalent; card identifiers remain strings.'},
 {assumed:'Missing card ends dependent validation; missing account ends balance and expiry checks; expiry overrides over-limit; purchase limit is last.',wikiBasis:'posttran-sonnet-va7.pdf p.3 BR-01 through BR-04 and BR-10; p.4 scenario 6 combines invalid card with expired account without defining how that account is found.',consequence:'One reason is retained; an unavailable lookup never fabricates a later failure.'},
 {assumed:'Preserve the daily-feed transaction identifier rather than allocate a sequence.',wikiBasis:'posttran-sonnet-va7.pdf p.3 BR-09 uses transactionId for idempotency; pp.9,23 describe sequence generation without an allocation contract for this isolated calculation.',consequence:'Posting retains tran_id; it does not require an external sequence service.'},
 {assumed:'The caller supplies processingTimestamp once for the run.',wikiBasis:'posttran-sonnet-va7.pdf p.3 BR-05 says processedTimestamp = now but specifies neither timezone nor stable retry-clock handling.',consequence:'Successful posts use the supplied value verbatim; reject proc_ts remains the original value. A nonempty batch with a postable row requires the timestamp.'},
 {assumed:'Replay uses the original account/category snapshots and the same feed and timestamp.',wikiBasis:'posttran-sonnet-va7.pdf p.3 BR-09 requests restart after the last processed index but provides no checkpoint format; maker accepted a side-effect-free partial calculation.',consequence:'Whole-run replay returns the same results; durable last-index persistence and store atomicity are not claimed.'},
 {assumed:'Identical duplicate transaction identifiers apply once; conflicting duplicates produce an error for every occurrence before any is applied.',wikiBasis:'posttran-sonnet-va7.pdf p.3 BR-09 requests transactionId idempotency but does not define duplicate payload conflicts.',consequence:'Duplicate amounts never apply twice; all distinct records continue. Identical duplicate comparison uses the complete contract transaction projection, independent of input object property order.'},
 {assumed:'Arithmetic uses integer cents and accepts only finite decimal values with at most two fractional digits.',wikiBasis:'posttran-sonnet-va7.pdf p.27: amounts are strings or numbers with at most two decimals; rounding and malformed consumed-value handling are not specified.',consequence:'No rounding is invented. All valid monetary outputs use strings with exactly two decimal places, including rejected amounts, untouched account and category balances, credit limits and cash credit limits. This changes representation, not monetary value; malformed non-consumed values remain unchanged without additional validation. Unsafe arithmetic is a per-record error before balance changes.'},
 {assumed:'Expiry comparison uses YYYY-MM-DD from orig_ts and permits transactions on the expiry date.',wikiBasis:'posttran-sonnet-va7.pdf p.3 BR-04: account.expiryDate < transaction original date.',consequence:'No timezone conversion is applied; invalid consumed dates are per-record errors.'},
 {assumed:'Only successfully posted amounts greater than zero consume the four-purchase allowance, counted per card in feed order.',wikiBasis:'posttran-sonnet-va7.pdf p.3 BR-10: at most four purchases (amount > 0) posted in one run; further purchase that passes BR-01 through BR-04 gets 104.',consequence:'Rejected records, zero amounts and negative amounts do not consume the allowance; cards sharing an account have separate allowances.'},
 {assumed:'Negative amounts add their signed value to current cycle debit.',wikiBasis:'posttran-sonnet-va7.pdf p.3 BR-05: else currentCycleDebit += amount.',consequence:'The negative sign is retained; the calculation does not replace the amount by its absolute value.'},
 {assumed:'Unusable consumed data is reported for its own record without inventing a reject code; unrelated records continue.',wikiBasis:'posttran-sonnet-va7.pdf pp.3,12 defines business reasons 100-104 and exceptional rewrite reason 109, but gives no malformed decoded-record reason.',consequence:'summary.errors identifies the row; errors cause ERROR. No error row is represented as a business reject or posted row; existing snapshots are not mutated.'},
 {assumed:'Empty or omitted lists mean no records; untouched master records remain in the result.',wikiBasis:'posttran-sonnet-va7.pdf p.19 says empty feed is NO_DATA; p.27 requires every account/category balance after posting but provides no calculation-only empty-input status.',consequence:'Empty feed returns OK with unchanged account/category lists and no posted/rejected transactions.'},
 {assumed:'Output category identifiers are four-digit strings, account identifiers are integers, and transaction category and merchant identifiers are integers.',wikiBasis:'posttran-sonnet-va7.pdf pp.10,27: category model uses String(4); contract explicitly makes transaction cat_cd and merchant_id and account acct_id integers but does not separately type category-balance keys.',consequence:'Internal account keys remain zero-padded strings; convert only the output integer fields. Transaction strings may retain trailing spaces.'},
 {assumed:'readCount counts feed rows; postedCount and rejectedCount count emitted unique business outcomes.',wikiBasis:'posttran-sonnet-va7.pdf p.5 says read = posted + rejected for normal records; p.3 adds idempotency without describing duplicate/error counter treatment.',consequence:'Ordinary unique valid/rejected feeds reconcile exactly; duplicate suppression and record errors can leave readCount greater than postedCount plus rejectedCount.'},
 {assumed:'Missing input object members are reported only when consumed; non-consumed contract members are projected without additional validation.',wikiBasis:'posttran-sonnet-va7.pdf pp.3,27 defines posting reads and output names, not a general schema-validation rejection rule.',consequence:'The caller remains responsible for decoding complete contract records; null fills a missing non-consumed output member rather than an invented value.'},
 {assumed:'Duplicate account or category master keys are treated as ambiguous only when a feed row needs that key.',wikiBasis:'posttran-sonnet-va7.pdf pp.7,10 describes primary/composite keys but does not define duplicate input master handling.',consequence:'Affected feed rows report errors; all supplied master rows remain in output and unrelated feed rows continue.'}
];
function txt(x) { return x === null || x === undefined ? '' : String(x).replace(/\s+$/,''); }
function accountKey(x) { var s=txt(x); if (/^\d+$/.test(s)) { s=s.replace(/^0+(?=\d)/,''); return ('00000000000'+s).slice(-Math.max(11,s.length)); } return s; }
function catKey(x) { var s=txt(x); if (/^\d+$/.test(s)) return ('0000'+s).slice(-Math.max(4,s.length)); return s; }
function numericId(x) { var s=txt(x); if (!/^\d+$/.test(s) || !Number.isSafeInteger(Number(s))) throw new Error('Invalid contract integer identifier'); return Number(s); }
function cents(x) { var s=txt(x); if (!/^[+-]?\d+(\.\d{1,2})?$/.test(s)) throw new Error('Invalid decimal amount'); var negative=s.charAt(0)==='-'; s=s.replace(/^[+-]/,''); var p=s.split('.'); var n=Number(p[0])*100+Number(((p[1]||'')+'00').slice(0,2)); if(!Number.isSafeInteger(n)) throw new Error('Amount exceeds safe cent arithmetic'); return negative?-n:n; }
function add(a,b) { var n=a+b; if(!Number.isSafeInteger(n)) throw new Error('Balance exceeds safe cent arithmetic'); return n; }
function decimal(n) { var a=Math.abs(n); return (n<0?'-':'')+Math.floor(a/100)+'.'+('0'+(a%100)).slice(-2); }
function monetaryOutput(x) { try { return decimal(cents(x)); } catch(e) { return x; } }
function day(x) { var s=txt(x).slice(0,10); if(!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error('Invalid consumed date'); var p=s.split('-'); var y=Number(p[0]),m=Number(p[1]),d=Number(p[2]); var leap=y%4===0&&(y%100!==0||y%400===0); var days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31]; if(m<1||m>12||d<1||d>days[m-1]) throw new Error('Invalid consumed date'); return s; }
function project(row,fields) { var o={}; for(var j=0;j<fields.length;j++){ var k=fields[j]; o[k]=row[k]===undefined?null:row[k]; } return o; }
function list(k) { if (bag[k]===undefined || bag[k]===null) return []; if (!Array.isArray(bag[k])) {errors.push({recordIndex:-1,tran_id:'',message:k+' must be a decoded record list'}); return [];} return bag[k]; }
var errors=[];
var feed=list('dailyTransactions'), acs=list('accounts'), cats=list('categoryBalances'), xrefs=list('cardXrefs');
var accountRows=[], categoryRows=[], am=Object.create(null), cm=Object.create(null), xm=Object.create(null), seen=Object.create(null), conflicts=Object.create(null), used=Object.create(null), purchases=Object.create(null);
function index(map,k,row) { if(map[k]===undefined) map[k]=row; else map[k]=null; }
for(var a=0;a<acs.length;a++){var ar=project(acs[a]||{},acFields); accountRows.push(ar); index(am,accountKey(ar.acct_id),ar);}
for(var c=0;c<cats.length;c++){var cr=project(cats[c]||{},['acct_id','type_cd','cat_cd','bal']); categoryRows.push(cr); index(cm,JSON.stringify([accountKey(cr.acct_id),txt(cr.type_cd),catKey(cr.cat_cd)]),cr);}
for(var x=0;x<xrefs.length;x++){var xr=xrefs[x]||{}; var ck=txt(xr.card_num===undefined?xr.cardNumber:xr.card_num); var ak=accountKey(xr.acct_id===undefined?xr.accountId:xr.acct_id); if(xm[ck]===undefined)xm[ck]=ak; else if(xm[ck]!==ak)xm[ck]=null;}
for(var f=0;f<feed.length;f++){var ft=project(feed[f]||{},txFields); var id=txt(ft.tran_id); if(id){var sig=JSON.stringify(ft); if(seen[id]===undefined)seen[id]=sig; else if(seen[id]!==sig)conflicts[id]=true;}}
var posted=[], rejected=[];
var descriptions={100:'INVALID CARD NUMBER FOUND',101:'ACCOUNT RECORD NOT FOUND',102:'OVERLIMIT TRANSACTION',103:'TRANSACTION RECEIVED AFTER ACCT EXPIRATION',104:'DAILY PURCHASE LIMIT EXCEEDED'};
for(var i=0;i<feed.length;i++) {
 var original=feed[i]||{}, t=project(original,txFields), tid=txt(t.tran_id);
 try {
  if(!tid)throw new Error('Missing transaction identifier');
  if(conflicts[tid])throw new Error('Conflicting records share a transaction identifier');
  if(used[tid])continue;
  used[tid]=true;
  var card=txt(t.card_num), reason=0, acct, accountId, amt, cc, cd, cb, lim;
  if(!card || xm[card]===undefined) reason=100;
  else {
   if(xm[card]===null)throw new Error('Ambiguous card cross-reference');
   accountId=xm[card]; acct=am[accountId];
   if(acct===undefined)reason=101;
   else {
    if(acct===null)throw new Error('Ambiguous account snapshot');
    amt=cents(t.amt); cc=cents(acct.curr_cyc_credit); cd=cents(acct.curr_cyc_debit); lim=cents(acct.credit_limit);
    if(add(add(cc,-cd),amt)>lim)reason=102;
    if(day(acct.expiration_date)<day(t.orig_ts))reason=103;
    if(reason===0 && amt>0 && (purchases[card]||0)>=4)reason=104;
   }
  }
  if(reason!==0){var r=project(original,txFields); r.cat_cd=numericId(r.cat_cd); r.merchant_id=numericId(r.merchant_id); r.amt=monetaryOutput(r.amt); r.reason=reason; r.reason_desc=descriptions[reason]; rejected.push(r); continue;}
  var timestamp=txt(bag.processingTimestamp); if(!timestamp)throw new Error('A processing timestamp is required for posting');
  var category=catKey(t.cat_cd), typ=txt(t.type_cd); if(!typ || !category)throw new Error('Missing category balance key');
  var key=JSON.stringify([accountId,typ,category]); var balance=cm[key]; if(balance===null)throw new Error('Ambiguous category-balance snapshot');
  var old=balance===undefined?0:cents(balance.bal);
  var nb=add(cents(acct.curr_bal),amt), nc=amt>=0?add(cc,amt):cc, nd=amt<0?add(cd,amt):cd, ncat=add(old,amt);
  var out=project(original,txFields); out.cat_cd=numericId(out.cat_cd); out.merchant_id=numericId(out.merchant_id); out.amt=decimal(amt); out.proc_ts=timestamp;
  var accountInteger=numericId(acct.acct_id);
  if(balance===undefined){balance={acct_id:accountInteger,type_cd:typ,cat_cd:category,bal:'0.00'}; categoryRows.push(balance); cm[key]=balance;}
  acct.curr_bal=decimal(nb); acct.curr_cyc_credit=decimal(nc); acct.curr_cyc_debit=decimal(nd); balance.bal=decimal(ncat);
  posted.push(out); if(amt>0)purchases[card]=(purchases[card]||0)+1;
 } catch(e) {errors.push({recordIndex:i,tran_id:tid,message:String(e.message||e)});}
}
for(var ai=0;ai<accountRows.length;ai++){accountRows[ai].curr_bal=monetaryOutput(accountRows[ai].curr_bal); accountRows[ai].credit_limit=monetaryOutput(accountRows[ai].credit_limit); accountRows[ai].cash_credit_limit=monetaryOutput(accountRows[ai].cash_credit_limit); accountRows[ai].curr_cyc_credit=monetaryOutput(accountRows[ai].curr_cyc_credit); accountRows[ai].curr_cyc_debit=monetaryOutput(accountRows[ai].curr_cyc_debit); try{accountRows[ai].acct_id=numericId(accountRows[ai].acct_id);}catch(e){errors.push({recordIndex:-1,tran_id:'',message:'Account output: '+String(e.message||e)});}}
for(var ci=0;ci<categoryRows.length;ci++){categoryRows[ci].bal=monetaryOutput(categoryRows[ci].bal); try{categoryRows[ci].acct_id=numericId(categoryRows[ci].acct_id); categoryRows[ci].cat_cd=catKey(categoryRows[ci].cat_cd);}catch(e){errors.push({recordIndex:-1,tran_id:'',message:'Category output: '+String(e.message||e)});}}
function cell(s){return String(s).replace(/\|/g,'\\|').replace(/\r?\n/g,' ');}
var md='| What was assumed | Wiki statement or absence | Consequence |\n| --- | --- | --- |\n';
for(var q=0;q<assumptions.length;q++)md+='| '+cell(assumptions[q].assumed)+' | '+cell(assumptions[q].wikiBasis)+' | '+cell(assumptions[q].consequence)+' |\n';
output={posttran_transact:posted,posttran_dalyrejs:rejected,posttran_acctdata:accountRows,posttran_tcatbal:categoryRows,assumptions:assumptions,assumptions_md:md,summary:{status:errors.length?'ERROR':(rejected.length?'WARNING':'OK'),readCount:feed.length,postedCount:posted.length,rejectedCount:rejected.length,errors:errors}};
```

### Escape text (SCRIPT, id=6ae238b73695c563ea50bafb)

```javascript
function esc(v) { return v == null ? null : JSON.stringify(String(v)).slice(1, -1).replace(/\\"/g, '"'); }
function at(o, p) { return p.split('.').reduce(function (x, k) { return x == null ? undefined : x[k]; }, o); }
output = {"endText": {t0: esc(at(input, "assumptions_md"))}};

```

_(server: 204 ms, 1 API call, 201 ms in API)_
