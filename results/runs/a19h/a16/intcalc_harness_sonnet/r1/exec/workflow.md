# Workflow: CalculateCardDemoInterest

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** 

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae14f553695c563ea50991d | <uuid> | (0, 0) | → Calculate interest (seq:<uuid>) |
| End | END | 6ae14f553695c563ea50991e | <uuid> | (1200, 0) | — |
| Calculate interest | SCRIPT | 6ae14f553695c563ea50991f | <uuid> | (300, 0) | → Draft assumptions (seq:<uuid>) | lang: JAVASCRIPT |
| Draft assumptions | AI | 6ae14f553695c563ea509920 | <uuid> | (600, 0) | → Validate assumptions [SUCCESS] (seq:<uuid>), → Draft assumptions failed [FAIL] (seq:<uuid>) | responseKey: draftAssumptions, aiType: TEXT_UNDERSTANDING, responseSchema: set |
| Validate assumptions | SCRIPT | 6ae14f553695c563ea509921 | <uuid> | (900, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| Draft assumptions failed | SCRIPT | 6ae14f553695c563ea509922 | <uuid> | (600, 200) | → Validate assumptions (seq:<uuid>) | lang: JAVASCRIPT |

## Systems
_(none)_

## AI prompts

### Draft assumptions (TEXT_UNDERSTANDING, id=6ae14f553695c563ea509920)
instructions:

```
You explain a complete reviewed assumption inventory, not financial records. Return an object with assumptions, an array of separate assumption/source pairs. Cover every supplied inventory entry, in its supplied order. Preserve each decision and its source exactly: reproduce the supplied assumption and source strings verbatim so conservative validation can accept them. Do not add, merge, omit, paraphrase or reinterpret entries. Sources may quote only the supplied wiki evidence or explicitly identify an absent rule as the inventory does. Never invent business rules, copybooks, execution results, citations or financial fields. The display labels for these two strings are 'What you assumed' and 'Which wiki statement (or absence of one) it rests on'. Your answer cannot decide interest, posting, account finalisation, recovery or output values.
```
userMessage:

```
Complete reviewed inventory:
${assumptionInventory}

Supplied evidence from cr1-intcalc-sonnet.pdf:
p.24 CONTRACT.md: 'Step isolation. A candidate for INTCALC receives the oracle’s POSTTRAN outputs as its account and category-balance inputs'; 'One JSON file per output: a list of objects, in any order'. Trailing string spaces may be omitted; amounts have at most two decimals and may be strings or numbers. INTCALC outputs contain interest transactions and every account after interest. The page lists nine whole-chain .dat inputs and parameters 2022-07-18 and 2022071800.
p.2 BR-01: 'Rate lookup key: account.groupId + typeCode + categoryCode'. BR-02: 'If not found (file status 23), retry with group DEFAULT'. BR-03: 'If rate ≠ 0: monthlyInterest = (categoryBalance × rate) / 1200'. BR-04: 'Interest transaction: type 01, category 05, source System, description Int. for a/c <accountId>, amount = interest'. BR-05: 'Transaction id = run date prefix (PARM, e.g. 2022071800) + running suffix'. BR-06: 'At each change of account: account.currentBalance += totalInterest; currentCycleCredit = 0; currentCycleDebit = 0; rewrite account'. BR-07: 'Fees (1400-COMPUTE-FEES) is an empty stub — no fees charged'. BR-08: 'monthlyInterest is rounded to the nearest cent, halves away from zero'; examples 15.006 → 15.01 and −15.006 → −15.01. BR-09: 'Legacy opens the transaction output as OUTPUT (overwrites; finding F-07) — FlowX appends'.
p.3 BR-10: 'Payment (type 02) and Credit (type 03) categories have rate 0 in discgrp.txt, hence no interest'. Use supplied rates rather than a hardcoded type override.
p.4: 1000.00 at 18.00 gives 15.00; ZEROAPR produces no interest transaction; the fee scenario leaves a decision unresolved.
p.6: account table gives 11-digit identifier, S9(10)V99 money fields and printed field order; 'Legacy FILLER (178 bytes) is dropped'.
p.8: cross-reference table supplies 16-character card, 9-digit customer and 11-digit account. Transaction id String(16), merchant identifier String(9) internally, card String(16).
p.9: category table gives account 11, type 2, category 4, S9(9)V99 balance; disclosure table gives group 10, type 2, category 4, S9(4)V99 rate. 'Annual percent; seed file stores signed overpunch (0150{ = 15.00) — convert at load'. Timestamps X(26). Complete original copybooks and the full overpunch alphabet are absent.
p.17: GET_DISCLOSURE_GROUP finds group/type/category then DEFAULT.
p.20: bulk insert failures 'are returned per record'.
The wiki does not specify the missing rules explicitly identified in the inventory. Maker delivery choice: calculate and return results and assumption notes, leaving physical output-file creation out of scope. Explain no other decisions.
```
exampleOutputJsonSchema:

```
{"title":"Response","type":"object","additionalProperties":false,"required":["assumptions"],"properties":{"assumptions":{"type":"array","items":{"type":"object","additionalProperties":false,"required":["assumption","source"],"properties":{"assumption":{"type":"string"},"source":{"type":"string"}}}}}}
```

## Scripts

### Calculate interest (SCRIPT, id=6ae14f553695c563ea50991f)

```javascript
var spec = [
['The caller supplies contract-file contents and receives calculated values and notes; no physical output files are created.','cr1-intcalc-sonnet.pdf p.24 names input and output files and says "One JSON file per output: a list of objects, in any order". The maker explicitly selected returned results and notes instead of output-file creation.'],
['Read every supplied string for all nine contract input files in full. Decode only acctdata, tcatbal, discgrp and cardxref; leave the other five opaque and do not run unrelated chain processing.','cr1-intcalc-sonnet.pdf p.24 lists whole-chain inputs; pp.2–3 use accounts, category balances and disclosure rates, and p.8 supplies card cross-references. No INTCALC use of the other five files is specified. The maker explicitly requires reading the CONTRACT.md inputs.'],
['Use the printed table order and widths without reconstructing unavailable full copybooks.','cr1-intcalc-sonnet.pdf pp.6,8–9 provide field tables. Complete original copybooks are absent from the supplied attachment.'],
['Ignore filler, including NUL and other non-printable bytes, and preserve digit identifiers as strings internally.','cr1-intcalc-sonnet.pdf p.6 says "Legacy FILLER (178 bytes) is dropped"; pp.6,8–9 print identifier widths. No filler-byte validation rule is specified.'],
['Read disclosure rates from six positions as declared, despite the five-character example.','cr1-intcalc-sonnet.pdf p.9 declares S9(4)V99 but illustrates "0150{" as 15.00. The conflict is unresolved in the supplied source.'],
['Decode trailing overpunch with implied two decimals: {ABCDEFGHI encode positive final digits 0–9 and }JKLMNOPQR negative final digits 0–9; ordinary unsigned final digits are also accepted.','cr1-intcalc-sonnet.pdf p.9 says "Annual percent; seed file stores signed overpunch (0150{ = 15.00) — convert at load" but omits the full alphabet and unsigned-input handling.'],
['Process category records in account, type and category order.','cr1-intcalc-sonnet.pdf p.2 BR-06 says "At each change of account" but does not specify ties or complete input order.'],
['Use a six-digit transaction suffix starting at 000001 and reset it for each invocation.','cr1-intcalc-sonnet.pdf p.2 BR-05 says "Transaction id = run date prefix (PARM, e.g. 2022071800) + running suffix"; p.8 gives a 16-character id. Suffix width, initial value and reset policy are not specified.'],
['Choose the lexical first matching cross-reference card for an account, or a blank card number when none exists.','cr1-intcalc-sonnet.pdf p.8 supplies card cross-reference fields; interest posting does not specify selection among multiple cards or missing-card handling.'],
['Set merchant identifier to integer 0 and merchant name, city and zip to empty strings.','cr1-intcalc-sonnet.pdf p.24 lists merchant fields; p.2 BR-04 does not populate merchant details.'],
['Use the supplied business date at midnight for both timestamps, with defaults businessDate 2022-07-18 and interestRunDate 2022071800 and no clock dependence.','cr1-intcalc-sonnet.pdf p.24 supplies business date 2022-07-18 and INTCALC parameter 2022071800; p.9 specifies 26-character timestamps. No time-of-day or clock rule is specified.'],
['Finalise readable accounts represented by category balances, including zero-rate accounts; leave accounts without category records unchanged.','cr1-intcalc-sonnet.pdf p.2 BR-06 says "At each change of account: account.currentBalance += totalInterest; currentCycleCredit = 0; currentCycleDebit = 0; rewrite account". It does not explicitly address accounts absent from balance input.'],
['Emit a transaction for each nonzero rate even when its rounded interest is zero; a found zero rate does not trigger DEFAULT fallback.','cr1-intcalc-sonnet.pdf p.2 BR-03 begins "If rate ≠ 0"; BR-02 retries DEFAULT only "If not found (file status 23)". No rounded-zero suppression rule is stated.'],
['Round each category interest to cents, halves away from zero, and then add those rounded amounts to the account.','cr1-intcalc-sonnet.pdf p.2 BR-08 says "monthlyInterest is rounded to the nearest cent, halves away from zero" and BR-06 adds totalInterest. The aggregation order is not explicit.'],
['Keep the fee computation as an empty stub and charge no fees.','cr1-intcalc-sonnet.pdf p.2 BR-07 says "Fees (1400-COMPUTE-FEES) is an empty stub — no fees charged"; p.4 leaves a fee scenario decision unresolved.'],
['Skip a category with a diagnostic if both the requested and DEFAULT rate are absent, while processing other valid categories and accounts.','cr1-intcalc-sonnet.pdf p.2 BR-02 specifies the DEFAULT retry but does not specify recovery when DEFAULT is also missing.'],
['Treat duplicate lookup keys as ambiguous and isolate invalid calculation records; an unprocessable account produces no transactions and retains its representable input image.','cr1-intcalc-sonnet.pdf pp.6,8–9 define composite fields but not duplicate-input or malformed-record recovery. P.20 says bulk insert failures "are returned per record". This recovery policy is an implementation default, not a claim about legacy validation.'],
['Fail with empty financial outputs when required acctdata, tcatbal, discgrp or cardxref contents are missing or not strings. Supplied empty strings are valid; isolate other record failures.','cr1-intcalc-sonnet.pdf p.24 lists inputs but supplies no missing-content or empty-input policy.'],
['Omit account records whose identifiers cannot be represented as contract integers, and diagnose them without blocking unrelated accounts.','cr1-intcalc-sonnet.pdf p.24 requires integer acct_id but does not define malformed-identifier recovery.'],
['Return monetary amounts as two-decimal strings and remove trailing text padding only.','cr1-intcalc-sonnet.pdf p.24 permits amounts as JSON strings or numbers and permits omitted trailing spaces.'],
['Return only this invocation’s transactions; perform no append side effect or cross-run identifier allocation.','cr1-intcalc-sonnet.pdf p.2 BR-09 says "Legacy opens the transaction output as OUTPUT (overwrites; finding F-07) — FlowX appends". The maker selected returned values without persistence, so appending and cross-run allocation are excluded.'],
['Diagnose identifier, amount and suffix overflow rather than silently losing digits or emitting corrupted records.','cr1-intcalc-sonnet.pdf pp.6,8–9 give field sizes and p.24 gives output types; no overflow recovery rule is specified.'],
['Accept model notes only when they exactly reproduce the complete reviewed assumption/source inventory; otherwise use the entire fixed inventory, leaving financial results unchanged.','The maker requests separate traceable assumption and source text. cr1-intcalc-sonnet.pdf specifies no assumption-generation or model-failure mechanism.'],
['Split supplied calculation files on CRLF, LF or CR record boundaries, ignore empty record lines, and require only the printed non-filler field spans being decoded. Preserve leading spaces and never validate filler.','cr1-intcalc-sonnet.pdf pp.6,8–9 provide fixed-width field tables but no text-transport newline, blank-line or missing-filler policy.'],
['Optional whole-chain inputs may be absent. Read any supplied strings completely without interpreting them; diagnose a supplied non-string optional input.','cr1-intcalc-sonnet.pdf p.24 lists whole-chain inputs but does not define an INTCALC requirement or missing-content handling for the five opaque inputs.'],
['Duplicate account identifiers or category composite keys block the affected account. Duplicate disclosure keys block only accounts needing that key. Repeated cross-reference card keys are ambiguous and block all accounts named by those rows; distinct cards for an account remain eligible for lexical selection.','cr1-intcalc-sonnet.pdf pp.6,8–9 print account, category, disclosure and cross-reference fields but supply no duplicate-resolution or ambiguity-propagation rule.'],
['Preserve representable account rows in input order. If an account money field is malformed, omit that nonrepresentable contract row and block its account rather than fabricate a two-decimal value. Text fields are not validated as dates or business codes.','cr1-intcalc-sonnet.pdf p.24 requires output account fields and monetary types but supplies no policy for malformed monetary images or output row order; it permits objects "in any order".'],
['Use exact signed decimal digit-string arithmetic. Enforce the printed source numeric widths and a 12-digit scaled current-balance result; retain two-decimal string transaction amounts without inventing an undocumented transaction amount width.','cr1-intcalc-sonnet.pdf p.2 BR-03 and BR-08 specify the formula and rounding; p.6 gives currentBalance S9(10)V99. The supplied transaction table does not specify an interest amount overflow width.'],
['Use the business-date text as YYYY-MM-DD and a nonempty digit run prefix of at most ten characters; invalid supplied parameters fail before financial processing. Missing or empty parameters use the documented defaults.','cr1-intcalc-sonnet.pdf p.24 supplies parameter examples and p.8 gives a 16-character transaction identifier, but does not specify parameter-validation or empty-parameter recovery.'],
['An unreadable rate with a readable lookup key reserves that key as invalid rather than falling back. An unreadable category with a readable account identifier blocks that account; records with unreadable keys are diagnosed and cannot be associated with an invented key.','cr1-intcalc-sonnet.pdf p.2 BR-02 limits fallback to not-found; pp.6,8–9 do not define malformed-key or malformed-rate recovery.']
];
var inventory = spec.map(function(p){return {assumption:p[0],source:p[1]};});
var diagnostics = [], accountRows = [], transactions = [];
function diag(file,record,reason,account){var d={file:file,record:record,reason:reason};if(account!==undefined&&account!==null)d.accountId=account;diagnostics.push(d);}
function trim(s){return s.replace(/ +$/,'');}
function norm(s){s=s.replace(/^0+/,'');return s||'0';}
function cmp(a,b){a=norm(a);b=norm(b);return a.length===b.length?(a===b?0:(a>b?1:-1)):(a.length>b.length?1:-1);}
function addAbs(a,b){var i=a.length-1,j=b.length-1,c=0,r='';while(i>=0||j>=0||c){var n=(i>=0?Number(a.charAt(i--)):0)+(j>=0?Number(b.charAt(j--)):0)+c;r=String(n%10)+r;c=Math.floor(n/10);}return norm(r);}
function subAbs(a,b){var i=a.length-1,j=b.length-1,c=0,r='';while(i>=0){var n=Number(a.charAt(i--))-(j>=0?Number(b.charAt(j--)):0)-c;c=n<0?1:0;if(n<0)n+=10;r=String(n)+r;}return norm(r);}
function signed(negative,digits){digits=norm(digits);return negative&&digits!=='0'?'-'+digits:digits;}
function abs(s){return s.charAt(0)==='-'?s.slice(1):s;}
function add(a,b){var an=a.charAt(0)==='-',bn=b.charAt(0)==='-',aa=abs(a),bb=abs(b);if(an===bn)return signed(an,addAbs(aa,bb));var c=cmp(aa,bb);return c===0?'0':c>0?signed(an,subAbs(aa,bb)):signed(bn,subAbs(bb,aa));}
function mul(a,b){var out=[];for(var k=0;k<a.length+b.length;k++)out[k]=0;for(var i=a.length-1;i>=0;i--)for(var j=b.length-1;j>=0;j--)out[i+j+1]+=Number(a.charAt(i))*Number(b.charAt(j));for(var p=out.length-1;p>0;p--){out[p-1]+=Math.floor(out[p]/10);out[p]%=10;}return norm(out.join(''));}
function interest(balance,rate){var product=mul(abs(balance),abs(rate)),r=0,q='';for(var i=0;i<product.length;i++){var n=r*10+Number(product.charAt(i));q+=String(Math.floor(n/120000));r=n%120000;}q=norm(q);if(r>=60000)q=addAbs(q,'1');return signed((balance.charAt(0)==='-')!==(rate.charAt(0)==='-'),q);}
function money(n){var negative=n.charAt(0)==='-',d=abs(n);while(d.length<3)d='0'+d;return (negative?'-':'')+d.slice(0,-2)+'.'+d.slice(-2);}
function packed(s,width){if(s.length!==width)throw new Error('incomplete numeric field of width '+width);var last=s.charAt(s.length-1),pos='{ABCDEFGHI',neg='}JKLMNOPQR',n=pos.indexOf(last),negative=false;if(n<0){n=neg.indexOf(last);negative=n>=0;}var d=s.slice(0,-1)+(n>=0?String(n):last);if(!/^\d+$/.test(d))throw new Error('invalid numeric digits or trailing overpunch');return signed(negative,d);}
function id(s){if(!/^\d{11}$/.test(s))throw new Error('account identifier must contain 11 digits');return s;}
function type(s){if(!/^\d{2}$/.test(s))throw new Error('type code must contain two digits');return s;}
function category(s){if(!/^\d{4}$/.test(s))throw new Error('category code must contain four digits');return s;}
function key(g,t,c){return g+'|'+t+'|'+c;}
function lines(text,fn){var a=text.split(/\r\n|\n|\r/);for(var i=0;i<a.length;i++){if(a[i]==='')continue;fn(a[i],i+1);}}
var files=['dailytran','acctdata','cardxref','tcatbal','discgrp','custdata','carddata','trantype','trancatg'];
var required=['acctdata','tcatbal','discgrp','cardxref'];
var missing=false,readDigest=0;
for(var fi=0;fi<files.length;fi++){var file=files[fi],value=input[file];if(typeof value==='string'){for(var bi=0;bi<value.length;bi++)readDigest=(readDigest+value.charCodeAt(bi))%65521;}else if(required.indexOf(file)>=0){diag(file+'.dat',0,'required file contents are missing or are not a string');missing=true;}else if(value!==undefined&&value!==null){diag(file+'.dat',0,'optional file contents are not a string');}}
var businessDate=input.businessDate===undefined||input.businessDate===null||input.businessDate===''?'2022-07-18':input.businessDate;
var prefix=input.interestRunDate===undefined||input.interestRunDate===null||input.interestRunDate===''?'2022071800':input.interestRunDate;
if(typeof businessDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(businessDate)){diag('parameters',0,'businessDate must be YYYY-MM-DD');missing=true;}
if(typeof prefix!=='string'||!/^\d{1,10}$/.test(prefix)){diag('parameters',0,'interestRunDate must be a digit string of 1 to 10 characters; prefix plus suffix must fit 16 characters');missing=true;}
var accounts=Object.create(null),blocked=Object.create(null),rates=Object.create(null),categories=Object.create(null),catSeen=Object.create(null),cards=Object.create(null),cardSeen=Object.create(null);
function block(a,file,row,why){blocked[a]=true;diag(file,row,why,a);}
if(!missing){
lines(input.acctdata,function(s,row){var a=null;try{a=id(s.slice(0,11));}catch(e){diag('acctdata.dat',row,e.message);return;}
var entry={accountId:a,row:row,image:null,balance:null};
if(accounts[a]){block(a,'acctdata.dat',row,'ambiguous duplicate account identifier');}else accounts[a]=entry;
try{var bal=packed(s.slice(12,24),12),cl=packed(s.slice(24,36),12),cash=packed(s.slice(36,48),12),cc=packed(s.slice(78,90),12),cd=packed(s.slice(90,102),12);
entry.balance=bal;entry.image={acct_id:Number(a),active_status:trim(s.slice(11,12)),curr_bal:money(bal),credit_limit:money(cl),cash_credit_limit:money(cash),open_date:trim(s.slice(48,58)),expiration_date:trim(s.slice(58,68)),reissue_date:trim(s.slice(68,78)),curr_cyc_credit:money(cc),curr_cyc_debit:money(cd),addr_zip:trim(s.slice(102,112)),group_id:trim(s.slice(112,122))};accountRows.push(entry);
}catch(e){block(a,'acctdata.dat',row,'unrepresentable account money field: '+e.message);}
});
lines(input.discgrp,function(s,row){var k=null;try{var g=trim(s.slice(0,10)),t=type(s.slice(10,12)),c=category(s.slice(12,16));if(s.slice(0,10).length!==10)throw new Error('incomplete group field');k=key(g,t,c);if(Object.prototype.hasOwnProperty.call(rates,k)){rates[k]={bad:true,row:row};diag('discgrp.dat',row,'ambiguous duplicate disclosure key '+k);return;}try{rates[k]={value:packed(s.slice(16,22),6),row:row};}catch(e){rates[k]={bad:true,row:row};diag('discgrp.dat',row,'invalid rate for '+k+': '+e.message);}}catch(e){diag('discgrp.dat',row,e.message);}});
lines(input.cardxref,function(s,row){var a=null;try{a=id(s.slice(25,36));var card=s.slice(0,16);if(!/^\d{16}$/.test(card))throw new Error('card number must contain 16 digits');if(Object.prototype.hasOwnProperty.call(cardSeen,card)){var previous=cardSeen[card];block(a,'cardxref.dat',row,'ambiguous duplicate cross-reference card '+card);block(previous.accountId,'cardxref.dat',previous.row,'ambiguous duplicate cross-reference card '+card);}else cardSeen[card]={accountId:a,row:row};if(!cards[a])cards[a]=[];cards[a].push(card);}catch(e){if(a!==null)block(a,'cardxref.dat',row,e.message);else diag('cardxref.dat',row,e.message);}});
lines(input.tcatbal,function(s,row){var a=null;try{a=id(s.slice(0,11));if(!categories[a])categories[a]=[];var t=type(s.slice(11,13)),c=category(s.slice(13,17)),b=packed(s.slice(17,28),11),k=key(a,t,c);if(Object.prototype.hasOwnProperty.call(catSeen,k)){block(a,'tcatbal.dat',row,'ambiguous duplicate category key '+k);return;}catSeen[k]=true;categories[a].push({accountId:a,type:t,category:c,balance:b,row:row});}catch(e){if(a!==null)block(a,'tcatbal.dat',row,e.message);else diag('tcatbal.dat',row,e.message);}});
var accountIds=Object.keys(categories).sort(),sequence=0;
for(var ai=0;ai<accountIds.length;ai++){var aid=accountIds[ai],rows=categories[aid],ac=accounts[aid];rows.sort(function(a,b){return a.type===b.type?(a.category===b.category?0:(a.category<b.category?-1:1)):(a.type<b.type?-1:1);});
if(!ac){for(var ri=0;ri<rows.length;ri++)diag('tcatbal.dat',rows[ri].row,'referenced account is absent',aid);continue;}
if(blocked[aid]||!ac.image){diag('acctdata.dat',ac.row,'account cannot be processed; no transactions or financial changes applied',aid);continue;}
var pending=[],total='0',failed=false;
for(var ci=0;ci<rows.length;ci++){var cr=rows[ci],requested=key(ac.image.group_id,cr.type,cr.category),fallback=key('DEFAULT',cr.type,cr.category),rate=rates[requested];if(rate===undefined)rate=rates[fallback];if(rate===undefined){diag('tcatbal.dat',cr.row,'requested rate '+requested+' and DEFAULT rate '+fallback+' are both missing; category skipped',aid);continue;}if(rate.bad){block(aid,'tcatbal.dat',cr.row,'required disclosure key is invalid or ambiguous; entire account left unchanged');failed=true;continue;}if(rate.value==='0')continue;var amount=interest(cr.balance,rate.value);total=add(total,amount);pending.push({amount:amount,row:cr.row});}
if(failed)continue;
var updated=add(ac.balance,total);
if(abs(updated).length>12){block(aid,'acctdata.dat',ac.row,'updated current balance overflows S9(10)V99; account left unchanged');continue;}
if(sequence+pending.length>999999){block(aid,'acctdata.dat',ac.row,'six-digit transaction suffix exhausted; account left unchanged');continue;}
var selected=cards[aid]&&cards[aid].length?cards[aid].slice().sort()[0]:'';
for(var pi=0;pi<pending.length;pi++){sequence++;var suffix=String(sequence);while(suffix.length<6)suffix='0'+suffix;transactions.push({tran_id:prefix+suffix,type_cd:'01',cat_cd:5,source:'System',desc:'Int. for a/c '+aid,amt:money(pending[pi].amount),merchant_id:0,merchant_name:'',merchant_city:'',merchant_zip:'',card_num:selected,orig_ts:businessDate+' 00:00:00.000000',proc_ts:businessDate+' 00:00:00.000000'});}
ac.image.curr_bal=money(updated);ac.image.curr_cyc_credit='0.00';ac.image.curr_cyc_debit='0.00';
}
}
var images=missing?[]:accountRows.map(function(a){return a.image;});
output={calculation:{intcalc_systran:missing?[]:transactions,intcalc_acctdata:images,diagnostics:diagnostics,status:missing?'FAILED':diagnostics.length?'PARTIAL':'OK'},assumptionInventory:inventory};
```

### Validate assumptions (SCRIPT, id=6ae14f553695c563ea509921)

```javascript
var fixed=Array.isArray(input.assumptionInventory)?input.assumptionInventory:[];
var draft=input.draftAssumptions;
var entries=draft&&draft.assumptions;
var valid=!!draft&&typeof draft==='object'&&!Array.isArray(draft)&&Object.keys(draft).length===1&&Array.isArray(entries)&&entries.length===fixed.length;
if(valid){for(var i=0;i<fixed.length;i++){var a=entries[i],b=fixed[i];if(!a||typeof a!=='object'||Array.isArray(a)||Object.keys(a).length!==2||typeof a.assumption!=='string'||typeof a.source!=='string'||a.assumption!==b.assumption||a.source!==b.source){valid=false;break;}}}
var chosen=(valid?entries:fixed).map(function(a){return {assumption:a.assumption,source:a.source};});
function escapeCell(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\\/g,'&#92;').replace(/\|/g,'&#124;').replace(/\r\n|\r|\n/g,'<br>');}
var markdown='| What you assumed | Which wiki statement (or absence of one) it rests on |\n| --- | --- |';
for(var j=0;j<chosen.length;j++)markdown+='\n| '+escapeCell(chosen[j].assumption)+' | '+escapeCell(chosen[j].source)+' |';
var c=input.calculation||{intcalc_systran:[],intcalc_acctdata:[],diagnostics:[{file:'workflow',record:0,reason:'calculation unavailable'}],status:'FAILED'};
output={result:{intcalc_systran:c.intcalc_systran,intcalc_acctdata:c.intcalc_acctdata,assumptions:chosen,assumptions_md:markdown,diagnostics:c.diagnostics,status:c.status}};
```

### Draft assumptions failed (SCRIPT, id=6ae14f553695c563ea509922)

```javascript
output = {"draftAssumptions": {}};

```

_(server: 339 ms, 1 API call, 200 ms in API)_
