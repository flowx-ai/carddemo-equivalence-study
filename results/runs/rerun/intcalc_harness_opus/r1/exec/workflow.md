# Workflow: CardDemoInterestCalculation

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** 

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae06e14ad7ea9e18be41d51 | <uuid> | (0, 0) | → Transform (seq:<uuid>) |
| End | END | 6ae06e14ad7ea9e18be41d52 | <uuid> | (600, 0) | — |
| Transform | SCRIPT | 6ae06e14ad7ea9e18be41d53 | <uuid> | (300, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |

## Systems
_(none)_

## Scripts

### Transform (SCRIPT, id=6ae06e14ad7ea9e18be41d53)

```javascript
function object(v){return v!==null&&typeof v==='object'&&!Array.isArray(v);}
function safe(v){return typeof v==='number'&&isFinite(v)&&Math.floor(v)===v&&Math.abs(v)<=9007199254740991;}
function fail(s){throw new Error(s);}
function decimal(v,label){if(typeof v!=='string'&&typeof v!=='number')fail('Invalid '+label);if(typeof v==='number'&&!isFinite(v))fail('Invalid '+label);var s=String(v);var m=/^([+-]?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(s);if(!m)fail('Invalid '+label);var digits=(m[2]+(m[3]||'')).replace(/^0+/,'')||'0';if(digits==='0')return {n:0,scale:0};var scale=(m[3]||'').length-Number(m[4]||0);if(!safe(scale))fail('Unsafe arithmetic in '+label);while(scale>0&&digits.charAt(digits.length-1)==='0'){digits=digits.slice(0,-1);scale--;}
if(scale<0){if(digits.length-scale>16)fail('Unsafe arithmetic in '+label);while(scale<0){digits+='0';scale++;}}
if(scale>15||digits.length>16)fail('Unsafe arithmetic in '+label);var n=Number(digits);if(!safe(n))fail('Unsafe arithmetic in '+label);return {n:m[1]==='-'?-n:n,scale:scale};}
function cents(v){var d=decimal(v,'curr_bal');if(d.scale>2)fail('curr_bal contains fractional cents');var n=d.n*Math.pow(10,2-d.scale);if(!safe(n))fail('Unsafe arithmetic in curr_bal');return n;}
function money(n){var a=Math.abs(n);var r=a%100;return (n<0?'-':'')+String((a-r)/100)+'.'+(r<10?'0':'')+String(r);}
function identifier(v){if(typeof v==='number'){if(!safe(v)||v<0)fail('Invalid or overflowing acct_id');v=String(v);}if(typeof v!=='string'||!/^\d+$/.test(v))fail('Invalid acct_id');var s=v.replace(/^0+/,'')||'0';if(s.length>16||!safe(Number(s)))fail('Identifier overflow in acct_id');return s;}
function group(v){if(typeof v!=='string')fail('Invalid group_id');return v.replace(/ +$/,'');}
function copy(v){var o={};Object.keys(v).forEach(function(k){Object.defineProperty(o,k,{value:v[k],enumerable:true,writable:true,configurable:true});});return o;}
function dateValid(v){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;var y=Number(v.slice(0,4)),m=Number(v.slice(5,7)),d=Number(v.slice(8,10));var leap=y%4===0&&(y%100!==0||y%400===0);var days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];return y>=1&&m>=1&&m<=12&&d>=1&&d<=days[m-1];}
var entries=[];
function note(assumption,wikiBasis){entries.push({assumption:assumption,wikiBasis:wikiBasis});}
var formulaBasis='intcalc-opus.pdf p.2 gives balance multiplied by disclosure-group rate and posting, but leaves formula and grouping TODO.';
var roundingBasis='intcalc-opus.pdf p.4 leaves rounding TODO and specifies zero interest for zero balance.';
var silentBasis='intcalc-opus.pdf pp.2–4 do not settle this convention.';
var transactionBasis='intcalc-opus.pdf pp.10–11 name the transaction fields; pp.2–4 and 10–11 provide no interest-specific generation rule for this field.';
var safetyBasis='intcalc-opus.pdf pp.2–4 and 10–11 do not specify this validation, safety or record-local failure rule.';
note('Delivery accepts already-parsed accounts, categoryBalances and rates; it does not read physical batch files.','intcalc-opus.pdf pp.10–11 describe batch inputs; parsed-input delivery is the maker-selected calculation-only substitute.');
note('Return intcalc_systran and intcalc_acctdata as arrays inside result; do not write physical output files.','intcalc-opus.pdf pp.10–11 list the two INTCALC outputs; returned arrays are the maker-selected substitute.');
note('Return the fixed assumptions record as assumptionEntries and itemised Markdown assumptions, intended for assumptions.md but not saved as a file.','The maker explicitly selected fixed itemised Markdown with separate assumption and source basis; intcalc-opus.pdf pp.2–4 and 10–11 do not prescribe report generation.');
note('Missing or null accounts means an empty account list.','intcalc-opus.pdf pp.10–11 identify input data but do not define omitted parsed-input values.');
note('Missing or null rates means an empty rate list.','intcalc-opus.pdf pp.10–11 identify input data but do not define omitted parsed-input values.');
note('Missing or null categoryBalances is accepted as unused input.','intcalc-opus.pdf pp.10–11 identify category-balance input but do not define omitted parsed-input values.');
note('Default missing or null businessDate to 2022-07-18.','intcalc-opus.pdf pp.2–4 and 10–11 do not define a business-date default; this value is the confirmed implementation default.');
note('Default missing or null intcalcParameter to the string 2022071800.','intcalc-opus.pdf pp.2–4 and 10–11 do not define a run-parameter default; this value is the confirmed implementation default.');
note('Use signed current account balance as the interest base.',formulaBasis);
note('Calculate current balance multiplied by its group rate once per account, with no category-level aggregation.',formulaBasis);
note('Interpret each rate as a fractional per-cycle decimal.',silentBasis);
note('Do not annualise the rate.',silentBasis);
note('Do not convert percentage units.',silentBasis);
note('Do not apply a day-count factor.',silentBasis);
note('Accept categoryBalances without reading, validating, changing or returning category-balance records.','intcalc-opus.pdf p.2 leaves grouping TODO; pp.10–11 list no category-balance output for INTCALC.');
note('Represent current balances as integer cents during calculation.',roundingBasis);
note('Round signed interest to cents half away from zero.',roundingBasis);
note('Add rounded interest only to curr_bal.','intcalc-opus.pdf p.2 describes posting interest; pp.2–4 do not define other account mutations.');
note('Keep curr_cyc_credit unchanged.',silentBasis);
note('Keep curr_cyc_debit unchanged.',silentBasis);
note('Preserve every unrelated supplied account field, including extra properties, dates and filler; do not manufacture absent fields.','intcalc-opus.pdf pp.10–11 give the account layout but pp.2–4 do not require unrelated field changes or missing-field synthesis.');
note('Do not exclude accounts according to active_status.',silentBasis);
note('Emit no transaction when rounded interest is zero.',roundingBasis);
note('Emit exactly one transaction for each successfully calculated nonzero rounded account interest.',formulaBasis);
note('Set tran_id to the ten-character run parameter followed by the six-digit one-based original account input position.',transactionBasis);
note('Set type_cd to the string 01; this is not a verified legacy code.',transactionBasis);
note('Set cat_cd to integer 0; this is not a verified legacy code.',transactionBasis);
note('Set source to INTCALC.',transactionBasis);
note('Set desc to Interest calculation.',transactionBasis);
note('Set amt to the signed rounded interest as a two-decimal string.','intcalc-opus.pdf pp.10–11 identify amt; p.4 leaves rounding TODO. The two-decimal rendering is the confirmed implementation convention.');
note('Set merchant_id to integer 0.',transactionBasis);
note('Set merchant_name to an empty string.',transactionBasis);
note('Set merchant_city to an empty string.',transactionBasis);
note('Set merchant_zip to an empty string.',transactionBasis);
note('Set card_num to an empty string; do not infer a card from an account.',transactionBasis);
note('Set orig_ts to businessDate followed by a space and 00:00:00.000000.',transactionBasis);
note('Set proc_ts to businessDate followed by a space and 00:00:00.000000.',transactionBasis);
note('Represent successful account curr_bal as a two-decimal string, including 0.00; preserve other amount fields exactly as supplied.','intcalc-opus.pdf pp.10–11 give account fields; the confirmed convention makes calculated amounts two-decimal strings without rewriting unrelated amounts.');
note('Keep digit identifiers as strings internally; convert acct_id to an integer only in successful contract output.','intcalc-opus.pdf pp.10–11 specify an integer account identifier; internal string handling avoids numeric precision loss, which the source does not address.');
note('Accept acct_id as an unsigned digit string or a nonnegative safe integer; leading zeros are insignificant for duplicate detection and integer output.',safetyBasis);
note('Reject account identifier conversion beyond 9007199254740991 rather than silently losing digits.',safetyBasis);
note('Match group_id values case-sensitively after removing trailing ASCII spaces only; preserve leading spaces and all other characters.',formulaBasis+' The source does not specify string-normalisation rules.');
note('Require a string group_id on a calculated account and on a candidate matching rate; an empty string is a matchable group, not an invented default.',safetyBasis);
note('Require exactly one rate row matching an account group; a missing matching rate is a record-local error.',safetyBasis);
note('Treat multiple matching rate rows as ambiguous even if their rate values agree.',safetyBasis);
note('Treat every occurrence of a duplicate account identifier as an error; continue calculating other identifiers.',safetyBasis);
note('Accept balance and rate values as signed decimal strings or finite numbers, including decimal exponent notation, without trimming their text.',safetyBasis);
note('Require curr_bal to be exactly representable in cents; reject nonzero fractional cents rather than silently rounding input balance.',safetyBasis);
note('Permit signed rates without a policy range restriction.',silentBasis);
note('Use safe integer arithmetic with a maximum absolute integer of 9007199254740991; reject an unsafe balance, rate coefficient, multiplication or new balance on the affected account.',safetyBasis);
note('Normalise insignificant decimal zeros before safety checks; permit at most fifteen remaining fractional rate digits so the decimal denominator is a safe integer.',safetyBasis);
note('Reject invalid calculation fields only on the account that requires them.',safetyBasis);
note('Validate no unrelated account dates, filler bytes, credit limits, cycle totals or status fields.',safetyBasis);
note('Ignore malformed rate rows that have no usable matching string group_id; validate the rate value only for the uniquely matching row.',safetyBasis);
note('Use businessDate only to construct a nonzero-interest transaction and require it to be a real Gregorian YYYY-MM-DD date with year 0001 through 9999.',safetyBasis);
note('Use intcalcParameter only to construct a nonzero-interest transaction and require a string containing exactly ten characters; do not infer undocumented parameter semantics.',safetyBasis);
note('Reject a nonzero transaction at an account position greater than 999999 rather than overflowing its six-digit suffix.',safetyBasis);
note('For any account-local error, return the original affected account unchanged, omit its transaction and append accountIndex, accountId and message to errors.',safetyBasis);
note('Report accountIndex as the one-based original input position and accountId as the original identifier rendered as text, or null when absent.',safetyBasis);
note('Process accounts and return transactions, account rows and account-local errors in original account order.',safetyBasis);
note('A non-array accounts value produces no account rows and one envelope error with null accountIndex and accountId; a non-array rates value produces an error on each account needing a rate.',safetyBasis);
note('Empty account input returns empty transaction, account and error arrays together with the same fixed assumptions record.','intcalc-opus.pdf pp.2–4 and 10–11 do not specify empty parsed-input behaviour.');
note('Do not persist account changes or perform migration.','The maker selected calculation-only delivery; intcalc-opus.pdf pp.10–11 describe outputs, not a persistence or migration interface.');
note('Do not run POSTTRAN, scheduling or file transfer.','intcalc-opus.pdf pp.10–11 isolate INTCALC with post-POSTTRAN balances; the maker excluded these integrations.');
note('Use no clock, randomness or generated report wording; repeated original inputs with the same run parameters return identical results.','intcalc-opus.pdf pp.2–4 and 10–11 provide no identifier, timestamp or report nondeterminism requirement; reproducibility is the confirmed convention.');
note('These implementation choices are disclosed assumptions, not verified legacy parity.','intcalc-opus.pdf pp.2 and 4 explicitly leave formula, grouping and rounding TODO; those gaps prevent certification of COBOL equivalence.');
var assumptions='# CardDemo INTCALC implementation assumptions\n\nFixed implementation record for the calculation-only workflow. Returned data and Markdown are not physical batch files. Legacy parity has not been verified.\n\n'+entries.map(function(e,i){return '- '+String(i+1)+'. **Assumption:** '+e.assumption+'\n  **Wiki basis:** '+e.wikiBasis;}).join('\n\n')+'\n';
var result={intcalc_systran:[],intcalc_acctdata:[],assumptionEntries:entries,assumptions:assumptions,errors:[]};
var rawAccounts=input.accounts;var accounts=rawAccounts==null?[]:rawAccounts;var rates=input.rates==null?[]:input.rates;var businessDate=input.businessDate==null?'2022-07-18':input.businessDate;var parameter=input.intcalcParameter==null?'2022071800':input.intcalcParameter;
var counts=Object.create(null);var ids=[];
if(!Array.isArray(accounts)){result.errors.push({accountIndex:null,accountId:null,message:'accounts must be an array'});accounts=[];}
accounts.forEach(function(a,i){try{if(!object(a))fail('Account must be an object');var id=identifier(a.acct_id);ids[i]=id;counts[id]=(counts[id]||0)+1;}catch(e){ids[i]=null;}});
var rateGroups=Object.create(null);
if(Array.isArray(rates)){rates.forEach(function(r){if(object(r)&&typeof r.group_id==='string'){var g=r.group_id.replace(/ +$/,'');if(!rateGroups[g])rateGroups[g]=[];rateGroups[g].push(r);}});}
accounts.forEach(function(a,i){try{
if(!object(a))fail('Account must be an object');var id=identifier(a.acct_id);if(counts[id]>1)fail('Duplicate account identifier');var balance=cents(a.curr_bal);var g=group(a.group_id);if(!Array.isArray(rates))fail('rates must be an array');var matches=rateGroups[g]||[];if(matches.length===0)fail('Missing matching group rate');if(matches.length!==1)fail('Ambiguous matching group rate');var rate=decimal(matches[0].rate,'rate');var denominator=Math.pow(10,rate.scale);var absBalance=Math.abs(balance),absRate=Math.abs(rate.n);if(absRate!==0&&absBalance>Math.floor(9007199254740991/absRate))fail('Unsafe interest multiplication');var product=absBalance*absRate;if(!safe(product))fail('Unsafe interest multiplication');var remainder=product%denominator;var rounded=(product-remainder)/denominator;if(remainder>=Math.ceil(denominator/2))rounded++;if(!safe(rounded))fail('Unsafe rounded interest');var interest=((balance<0)!==(rate.n<0))?-rounded:rounded;
if(interest>0&&balance>9007199254740991-interest)fail('Unsafe resulting balance');if(interest<0&&balance< -9007199254740991-interest)fail('Unsafe resulting balance');var updated=balance+interest;if(!safe(updated))fail('Unsafe resulting balance');var tx=null;
if(interest!==0){if(!dateValid(businessDate))fail('Invalid businessDate');if(typeof parameter!=='string'||parameter.length!==10)fail('intcalcParameter must be a ten-character string');if(i+1>999999)fail('Transaction identifier position overflow');var suffix=String(i+1);while(suffix.length<6)suffix='0'+suffix;var timestamp=businessDate+' 00:00:00.000000';tx={tran_id:parameter+suffix,type_cd:'01',cat_cd:0,source:'INTCALC',desc:'Interest calculation',amt:money(interest),merchant_id:0,merchant_name:'',merchant_city:'',merchant_zip:'',card_num:'',orig_ts:timestamp,proc_ts:timestamp};}
var row=copy(a);row.acct_id=Number(id);row.curr_bal=money(updated);result.intcalc_acctdata.push(row);if(tx!==null)result.intcalc_systran.push(tx);
}catch(e){result.intcalc_acctdata.push(a);var raw=object(a)?a.acct_id:null;result.errors.push({accountIndex:i+1,accountId:raw==null?null:String(raw),message:e&&e.message?String(e.message):'Invalid account calculation'});}});
output={result:result};
```

_(server: 198 ms, 1 API call, 194 ms in API)_
