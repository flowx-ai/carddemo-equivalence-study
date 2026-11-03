# Workflow: CalculateCardDemoInterest

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** 

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6adf100216836599f39450e5 | <uuid> | (0, 0) | → Transform (seq:<uuid>) |
| End | END | 6adf100216836599f39450e6 | <uuid> | (600, 0) | — |
| Transform | SCRIPT | 6adf100216836599f39450e7 | <uuid> | (300, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |

## Systems
_(none)_

## Scripts

### Transform (SCRIPT, id=6adf100216836599f39450e7)

```javascript
var assumptions = [
{assumption:'Accept decoded accounts, categoryBalances, disclosureRates and cardXrefs lists; decimal rates are already decoded, not overpunch text.',wikiBasis:'The confirmed brief supplies the decoded interface. Its source summaries identify the legacy record layouts and data access in intcalc-sonnet.pdf pp.6,8–9,16–20; replacing file decoding with caller-supplied records is an implementation choice.'},
{assumption:'CONTRACT.md input-file reading is deferred; this workflow does not read the fixed-width input files.',wikiBasis:'The maker explicitly selected calculation-only delivery. The batch/data-access descriptions summarized from intcalc-sonnet.pdf pp.4,16–20 do not establish completion of the separate CONTRACT.md file contract.'},
{assumption:'Writing intcalc_systran.json and intcalc_acctdata.json is deferred; returned datasets are not actual output files.',wikiBasis:'The confirmed partial-delivery decision defers file writing. Output/account-rewrite descriptions summarized from intcalc-sonnet.pdf pp.3–4,24–25 provide calculation context, not evidence that this workflow writes files.'},
{assumption:'Saving assumptions.md adjacent to output files is deferred; assumptionsMarkdown is only its intended content.',wikiBasis:'This is the maker-approved delivery boundary, not a wiki rule. The supplied summaries of intcalc-sonnet.pdf pp.3–4,24–25 do not specify this explanatory artifact or its saving mechanism.'},
{assumption:'Default an omitted businessDate to 2022-07-18.',wikiBasis:'This default is explicitly approved in the brief. The supplied processing/timestamp summaries of intcalc-sonnet.pdf pp.2–4,24 do not prescribe this default date.'},
{assumption:'Default an omitted interestRunDate to 2022071800, interpreted as an eight-digit calendar date and two-digit run discriminator.',wikiBasis:'This run prefix is approved in the brief; the supplied transaction summaries of intcalc-sonnet.pdf pp.2–3,24 do not establish a legacy run-prefix algorithm.'},
{assumption:'Resolve the account group/type/category rate first; consult DEFAULT only if that exact row is absent.',wikiBasis:'Explicit interest lookup/fallback rule in the supplied summaries of intcalc-sonnet.pdf pp.2,17–20; applying it to normalized decoded keys is this implementation.'},
{assumption:'A present zero rate neither falls back nor posts. A nonzero rate posts even when the truncated result is zero.',wikiBasis:'The supplied summaries of intcalc-sonnet.pdf pp.2–3 distinguish zero-rate handling and interest generation. Zero-valued results from nonzero rates are retained by the approved implementation policy, not asserted as independently observed legacy behavior.'},
{assumption:'Calculate each category as balance multiplied by the annual percentage divided by 1200; use exact decimal arithmetic.',wikiBasis:'The monthly-interest formula is explicit in the supplied summaries of intcalc-sonnet.pdf pp.2–3. Exact scaled-integer arithmetic is the approved implementation technique.'},
{assumption:'Truncate each category toward zero to cents before summing, for both positive and negative results.',wikiBasis:'The supplied summary of intcalc-sonnet.pdf p.2 mentions default truncation but says rounding requires confirmation. Per-category signed truncation is the approved resolution, not a proven oracle-equivalent rounding rule.'},
{assumption:'Use supplied rates for all categories; add no fees and hard-code no payment or credit exemptions.',wikiBasis:'The supplied summaries of intcalc-sonnet.pdf pp.2–3 describe rate-driven interest. Additional fee or exemption rules are not established by those summaries; the confirmed brief excludes them.'},
{assumption:'An account is affected when at least one category-balance row represents it, including when every resolved rate is zero. Add its posted amounts to curr_bal and set both cycle totals to 0.00.',wikiBasis:'Account balance updates and cycle resets are explicit in the supplied summaries of intcalc-sonnet.pdf pp.3–4,25. The zero-rate affected-account boundary is an approved implementation choice where the supplied summary is incomplete.'},
{assumption:'Return all input accounts in input order, preserve unrelated fields, and preserve unchanged monetary representations; normalize output account identifiers to integers.',wikiBasis:'The supplied summaries of intcalc-sonnet.pdf pp.3–4,25 describe account rewriting. Full preservation, input ordering and unchanged-value representation are approved interface choices rather than verified legacy serialization behavior.'},
{assumption:'Normalize numeric account/type/category/card identifiers as left-zero-padded strings for matching; use eleven-, two-, four- and sixteen-digit widths respectively. Output account identifiers and transaction categories as integers.',wikiBasis:'Legacy identifier/layout context is supplied from intcalc-sonnet.pdf pp.6,8–9,16–20,24–25. Decoded-key normalization and JSON integer representation are approved implementation choices.'},
{assumption:'Sort a copy of category rows by normalized account, type and category before allocating posting ids.',wikiBasis:'The supplied summaries of intcalc-sonnet.pdf pp.2–3,24 do not settle posting order. Stable numeric-key ordering is the approved deterministic choice.'},
{assumption:'Use the ten-digit run prefix followed by a global six-digit posting suffix starting at 000001; fail rather than wrap after 999999.',wikiBasis:'Transaction identification is required by the supplied layout summary of intcalc-sonnet.pdf p.24, but this prefix/suffix allocation and exhaustion behavior are implementation choices approved in the brief.'},
{assumption:'Restart the suffix at 000001 on each invocation. Identical inputs and parameters produce identical results, not globally unique ids across repeated runs.',wikiBasis:'The supplied summaries of intcalc-sonnet.pdf pp.2–4,24 do not define cross-run sequence persistence or rerun deduplication. Restarting without persistence is the approved calculation-only policy.'},
{assumption:'Set transaction type_cd to 01, cat_cd to integer 5, source to System and desc to Int. for a/c followed by the eleven-digit padded account id.',wikiBasis:'Interest transaction constants and description are explicit in the supplied summaries of intcalc-sonnet.pdf pp.2–3,24. Padding and decoded JSON category representation follow the approved implementation policy.'},
{assumption:'Choose the numerically smallest cross-referenced card for each posting; retain card numbers as sixteen-digit strings.',wikiBasis:'The supplied cross-reference and transaction summaries of intcalc-sonnet.pdf pp.16–20,24 establish card-related data, but do not settle multiple-card selection. Minimum-card selection is an approved implementation choice.'},
{assumption:'Set merchant_id to 0.',wikiBasis:'The supplied transaction-layout summary of intcalc-sonnet.pdf p.24 requires merchant information but does not establish an interest merchant-id default. Zero is the approved implementation choice.'},
{assumption:'Set merchant_name, merchant_city and merchant_zip to empty strings.',wikiBasis:'The supplied transaction-layout summary of intcalc-sonnet.pdf p.24 does not establish interest merchant-text values. Empty strings are the approved implementation choice.'},
{assumption:'Set orig_ts and proc_ts to businessDate plus 00:00:00.000000, separated by one space.',wikiBasis:'The supplied transaction summaries of intcalc-sonnet.pdf pp.2–3,24 do not establish timestamp time-of-day defaults. Business-date midnight is the approved implementation choice.'},
{assumption:'Validate complete required records, real calendar dates, identifier widths and decimal values. Account money is S9(10)V99; category balances and transaction amounts are S9(9)V99; rates are S9(4)V99. Reject extra fractional digits, exponent text, undecoded overpunch and overflow.',wikiBasis:'Declared legacy layouts are grounded in the supplied summaries of intcalc-sonnet.pdf pp.6,8–9,16–20,24–25 and the approved step. Strict decoded-input validation, including rejecting over-precision rather than rounding it, is an implementation choice.'},
{assumption:'Reject duplicate account ids, category account/type/category keys, disclosure group/type/category keys and identical account/card cross-reference pairs after normalization.',wikiBasis:'The supplied keyed-access summaries of intcalc-sonnet.pdf pp.16–20 do not establish duplicate-input recovery for decoded lists. Rejecting ambiguous keys is the approved validation policy; distinct cards for one account remain allowed.'},
{assumption:'Fail if a category or cross-reference names a missing account, if a required DEFAULT rate is absent, or if a posting has no card reference. Zero-rate rows do not require a card for posting.',wikiBasis:'DEFAULT fallback is explicit in the supplied summaries of intcalc-sonnet.pdf pp.2,17–20; missing DEFAULT, missing-reference recovery and the zero-rate card boundary are not fully specified there. Atomic rejection is the approved resolution.'},
{assumption:'On any validation or calculation failure return FAILED, explanatory errors and empty financial datasets, while retaining assumptions and Markdown. Do not mutate inputs or write a database.',wikiBasis:'The supplied summaries of intcalc-sonnet.pdf pp.2–4,17–20 do not define decoded-interface partial recovery or transaction atomicity. All-or-nothing, side-effect-free failure is the approved implementation policy.'},
{assumption:'Draft these explanations once at build time, not through a runtime model; render precisely the same entries as Markdown on success and failure. No oracle-equivalence claim is made.',wikiBasis:'This is the confirmed implementation/authoring decision. The available grounding is the brief and page-specific summaries of intcalc-sonnet.pdf pp.2–4,6,8–9,16–20,24–25, not independent inspection or verbatim quotations of the PDF; no golden outputs were supplied.'}
];
var markdown = '# assumptions.md — intended content\n\nCalculation-only delivery; no files are read or written.\n\n' + assumptions.map(function(a,i){return '## '+(i+1)+'\n\n**Assumption:** '+a.assumption+'\n\n**Wiki basis:** '+a.wikiBasis;}).join('\n\n')+'\n';
var result={status:'FAILED',errors:[],intcalc_systran:[],intcalc_acctdata:[],assumptions:assumptions,assumptionsMarkdown:markdown};
function fail(s){throw new Error(s);}
function own(o,k){return Object.prototype.hasOwnProperty.call(o,k);}
function obj(o,p){if(!o||typeof o!=='object'||Array.isArray(o))fail(p+' must be an object');return o;}
function req(o,keys,p){obj(o,p);keys.forEach(function(k){if(!own(o,k)||o[k]===null||o[k]===undefined)fail(p+'.'+k+' is required');});}
function clean(s){s=s.replace(/^0+/,'');return s||'0';}
function abs(s){return s.charAt(0)==='-'?s.slice(1):s;}
function neg(s){return s==='0'?'0':s.charAt(0)==='-'?s.slice(1):'-'+s;}
function cmp(a,b){return a.length!==b.length?(a.length<b.length?-1:1):(a===b?0:a<b?-1:1);}
function plus(a,b){var i=a.length-1,j=b.length-1,c=0,r='';while(i>=0||j>=0||c){var v=(i>=0?Number(a.charAt(i--)):0)+(j>=0?Number(b.charAt(j--)):0)+c;r=String(v%10)+r;c=Math.floor(v/10);}return clean(r);}
function minus(a,b){var i=a.length-1,j=b.length-1,c=0,r='';while(i>=0){var v=Number(a.charAt(i--))-(j>=0?Number(b.charAt(j--)):0)-c;if(v<0){v+=10;c=1;}else c=0;r=String(v)+r;}return clean(r);}
function add(a,b){var an=a.charAt(0)==='-',bn=b.charAt(0)==='-',x=abs(a),y=abs(b);if(an===bn){var z=plus(x,y);return an&&z!=='0'?'-'+z:z;}var c=cmp(x,y);if(c===0)return '0';var z=c>0?minus(x,y):minus(y,x);return (c>0?an:bn)?'-'+z:z;}
function product(a,b){var n=Number(abs(b)),x=abs(a),c=0,r='';for(var i=x.length-1;i>=0;i--){var v=Number(x.charAt(i))*n+c;r=String(v%10)+r;c=Math.floor(v/10);}while(c){r=String(c%10)+r;c=Math.floor(c/10);}r=clean(r);return r!=='0'&&((a.charAt(0)==='-')!==(b.charAt(0)==='-'))?'-'+r:r;}
function divide(a,d){var x=abs(a),c=0,r='';for(var i=0;i<x.length;i++){c=c*10+Number(x.charAt(i));r+=String(Math.floor(c/d));c=c%d;}r=clean(r);return a.charAt(0)==='-'&&r!=='0'?'-'+r:r;}
function bound(s,d,p){if(cmp(abs(s),new Array(d+3).join('9'))>0)fail(p+' exceeds S9('+d+')V99');return s;}
function decimal(v,d,p){if(typeof v!=='string'&&typeof v!=='number')fail(p+' must be a decoded decimal');if(typeof v==='number'&&!isFinite(v))fail(p+' must be finite');var s=String(v);if(!/^[+-]?\d+(?:\.\d{1,2})?$/.test(s))fail(p+' must be plain decimal with at most two fractional digits');var negative=s.charAt(0)==='-';s=s.replace(/^[+-]/,'');var parts=s.split('.'),c=clean(parts[0]+((parts[1]||'')+'00').slice(0,2));if(negative&&c!=='0')c='-'+c;return bound(c,d,p);}
function money(c){var x=abs(c);while(x.length<3)x='0'+x;return (c.charAt(0)==='-'?'-':'')+x.slice(0,-2)+'.'+x.slice(-2);}
function id(v,w,p){if(typeof v==='number'){if(!isFinite(v)||Math.floor(v)!==v||v<0||v>9007199254740991)fail(p+' requires a safe nonnegative integer or digit string');}else if(typeof v!=='string')fail(p+' requires a numeric identifier');var s=String(v);if(!/^\d+$/.test(s))fail(p+' requires digits');s=clean(s);if(s.length>w)fail(p+' exceeds '+w+' digits');while(s.length<w)s='0'+s;return s;}
function text(v,max,p,nonempty){if(typeof v!=='string'||v.length>max)fail(p+' requires '+(nonempty?'nonempty ':'')+'text of at most '+max+' characters');return v;}
function group(v,p){return text(v,10,p,true);}
function date(v,p){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))fail(p+' must be YYYY-MM-DD');var y=Number(v.slice(0,4)),m=Number(v.slice(5,7)),d=Number(v.slice(8,10)),leap=y%4===0&&(y%100!==0||y%400===0),days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];if(y<1||m<1||m>12||d<1||d>days[m-1])fail(p+' is not a real calendar date');return v;}
function key(xs){return JSON.stringify(xs);}
function unique(map,k,p,v){if(own(map,k))fail(p+' duplicates key '+k);map[k]=v;}
try{
var lists=['accounts','categoryBalances','disclosureRates','cardXrefs'];lists.forEach(function(k){if(!Array.isArray(input[k]))fail(k+' must be a decoded list');});
var businessDate=date(input.businessDate===undefined?'2022-07-18':input.businessDate,'businessDate');
var run=input.interestRunDate===undefined?'2022071800':input.interestRunDate;
if(typeof run!=='string'&&typeof run!=='number')fail('interestRunDate must contain ten digits');run=String(run);if(!/^\d{10}$/.test(run))fail('interestRunDate must contain ten digits');date(run.slice(0,4)+'-'+run.slice(4,6)+'-'+run.slice(6,8),'interestRunDate date');
var accounts=JSON.parse(JSON.stringify(input.accounts)),accountMap=Object.create(null),rates=Object.create(null),cards=Object.create(null),xrefKeys=Object.create(null),categoryKeys=Object.create(null),rows=[],affected=Object.create(null),totals=Object.create(null);
accounts.forEach(function(a,i){var p='accounts['+i+']';req(a,['acct_id','active_status','curr_bal','credit_limit','cash_credit_limit','open_date','expiration_date','reissue_date','curr_cyc_credit','curr_cyc_debit','addr_zip','group_id'],p);var aid=id(a.acct_id,11,p+'.acct_id');unique(accountMap,aid,p,{record:a,balance:decimal(a.curr_bal,10,p+'.curr_bal'),group:group(a.group_id,p+'.group_id')});text(a.active_status,1,p+'.active_status',true);text(a.addr_zip,10,p+'.addr_zip',false);['credit_limit','cash_credit_limit','curr_cyc_credit','curr_cyc_debit'].forEach(function(k){decimal(a[k],10,p+'.'+k);});['open_date','expiration_date','reissue_date'].forEach(function(k){date(a[k],p+'.'+k);});a.acct_id=Number(aid);});
input.disclosureRates.forEach(function(r,i){var p='disclosureRates['+i+']';req(r,['group_id','type_cd','cat_cd','rate'],p);var g=group(r.group_id,p+'.group_id'),t=id(r.type_cd,2,p+'.type_cd'),c=id(r.cat_cd,4,p+'.cat_cd'),v=decimal(r.rate,4,p+'.rate');unique(rates,key([g,t,c]),p,v);});
input.cardXrefs.forEach(function(r,i){var p='cardXrefs['+i+']';req(r,['acct_id','card_num'],p);var a=id(r.acct_id,11,p+'.acct_id'),c=id(r.card_num,16,p+'.card_num');if(!own(accountMap,a))fail(p+' refers to a missing account '+a);unique(xrefKeys,key([a,c]),p,true);if(!own(cards,a)||c<cards[a])cards[a]=c;});
input.categoryBalances.forEach(function(r,i){var p='categoryBalances['+i+']';req(r,['acct_id','type_cd','cat_cd','bal'],p);var a=id(r.acct_id,11,p+'.acct_id'),t=id(r.type_cd,2,p+'.type_cd'),c=id(r.cat_cd,4,p+'.cat_cd'),b=decimal(r.bal,9,p+'.bal');unique(categoryKeys,key([a,t,c]),p,true);if(!own(accountMap,a))fail(p+' refers to a missing account '+a);rows.push({a:a,t:t,c:c,b:b,p:p});affected[a]=true;});
rows.sort(function(x,y){return x.a!==y.a?(x.a<y.a?-1:1):x.t!==y.t?(x.t<y.t?-1:1):x.c===y.c?0:x.c<y.c?-1:1;});
var transactions=[],suffix=0,ts=businessDate+' 00:00:00.000000';
rows.forEach(function(r){var exact=key([accountMap[r.a].group,r.t,r.c]),fallback=key(['DEFAULT',r.t,r.c]),rate;if(own(rates,exact))rate=rates[exact];else if(own(rates,fallback))rate=rates[fallback];else fail(r.p+' has neither an exact disclosure rate nor DEFAULT for '+r.t+'/'+r.c);if(rate==='0')return;if(!own(cards,r.a))fail(r.p+' needs a card reference for posting');var cents=bound(divide(product(r.b,rate),120000),9,r.p+' interest');suffix++;if(suffix>999999)fail('Six-digit posting suffix exhausted');var seq=String(suffix);while(seq.length<6)seq='0'+seq;transactions.push({tran_id:run+seq,type_cd:'01',cat_cd:5,source:'System',desc:'Int. for a/c '+r.a,amt:money(cents),merchant_id:0,merchant_name:'',merchant_city:'',merchant_zip:'',card_num:cards[r.a],orig_ts:ts,proc_ts:ts});totals[r.a]=add(own(totals,r.a)?totals[r.a]:'0',cents);});
Object.keys(affected).forEach(function(a){var entry=accountMap[a],balance=bound(add(entry.balance,own(totals,a)?totals[a]:'0'),10,'Updated account '+a+' curr_bal');entry.record.curr_bal=money(balance);entry.record.curr_cyc_credit='0.00';entry.record.curr_cyc_debit='0.00';});
result.status='OK';result.intcalc_systran=transactions;result.intcalc_acctdata=accounts;
}catch(e){result.status='FAILED';result.errors=[String(e&&e.message?e.message:e)];result.intcalc_systran=[];result.intcalc_acctdata=[];}
output={result:result};
```

_(server: 181 ms, 1 API call, 178 ms in API)_