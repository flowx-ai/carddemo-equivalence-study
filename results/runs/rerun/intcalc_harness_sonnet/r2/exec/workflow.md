# Workflow: CalculateCardDemoInterest

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** 

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae0676cad7ea9e18be41c34 | <uuid> | (0, 0) | → Transform (seq:<uuid>) |
| End | END | 6ae0676cad7ea9e18be41c35 | <uuid> | (1200, 0) | — |
| Transform | SCRIPT | 6ae0676cad7ea9e18be41c36 | <uuid> | (300, 0) | → Draft assumptions (seq:<uuid>) | lang: JAVASCRIPT |
| Draft assumptions | AI | 6ae0676cad7ea9e18be41c37 | <uuid> | (600, 0) | → Finalize result [SUCCESS] (seq:<uuid>), → Draft assumptions failed [FAIL] (seq:<uuid>) | responseKey: assumptionDraft, aiType: TEXT_UNDERSTANDING, responseSchema: set |
| Finalize result | SCRIPT | 6ae0676cad7ea9e18be41c38 | <uuid> | (900, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| Draft assumptions failed | SCRIPT | 6ae0676cad7ea9e18be41c39 | <uuid> | (600, 200) | → Finalize result (seq:<uuid>) | lang: JAVASCRIPT |

## Systems
_(none)_

## AI prompts

### Draft assumptions (TEXT_UNDERSTANDING, id=6ae0676cad7ea9e18be41c37)
instructions:

```
You format an approved assumptions inventory, not financial data. Return the schema object containing markdown. Use exactly the supplied assumption, evidence and citation strings with no paraphrase or additions. Heading: # assumptions.md. Then for every inventory entry in its supplied order write a bullet containing the assumption, a newline beginning Evidence: followed by its evidence, and a newline beginning Source: followed by its citation. Include all entries. Do not invent business rules or claim output files were written. File creation was excluded by the maker, not by the wiki. Your response cannot alter the calculation.
```
userMessage:

```
Format this approved inventory only: ${assumptionFacts}
```
exampleOutputJsonSchema:

```
{"title":"Response","type":"object","properties":{"markdown":{"type":"string"}},"required":["markdown"],"additionalProperties":false}
```

## Scripts

### Transform (SCRIPT, id=6ae0676cad7ea9e18be41c36)

```javascript
var facts = [
{assumption:'Return results as data, not physical files. No output files were written.',evidence:'Maker selected calculation-only delivery; CONTRACT.md requires files, which this version explicitly does not create.',citation:'intcalc-sonnet.pdf p.24; maker scope answer'},
{assumption:'Use 2022-07-18 and 2022071800 when businessDate and interestRunDate are omitted.',evidence:'CONTRACT.md supplies these run parameters.',citation:'intcalc-sonnet.pdf p.24'},
{assumption:'Read account, cross-reference, category-balance and disclosure-rate contents only; other listed input files do not affect this step.',evidence:'The interest step names these copybooks and rate/account/transaction operations; the contract lists inputs for the whole chain.',citation:'intcalc-sonnet.pdf pp.2-3,24'},
{assumption:'Infer contiguous offsets from ordered wiki copybook fields; ignore all filler bytes, including NUL; accept LF or CRLF separators.',evidence:'The wiki supplies ordered fields and widths but not the full copybooks; account filler is explicitly dropped.',citation:'intcalc-sonnet.pdf pp.6,8-9,24'},
{assumption:'Decode trailing ASCII signed overpunch and implied two-place decimals; ordinary digit endings are positive.',evidence:'The rate example 0150{ represents 15.00; signed DISPLAY pictures are listed for amounts.',citation:'intcalc-sonnet.pdf pp.4,6,8-9'},
{assumption:'Keep digit identifiers as strings internally, retaining leading zeros; only contract-required integer output identifiers are converted.',evidence:'The data model uses string identifiers while the JSON contract requires integer acct_id, cat_cd and merchant_id.',citation:'intcalc-sonnet.pdf pp.6,8-9,24'},
{assumption:'Truncate each category interest toward zero to cents before summing, using exact integer arithmetic.',evidence:'BR-08 says default truncation but explicitly leaves truncate versus ROUNDED unconfirmed; no golden file was supplied.',citation:'intcalc-sonnet.pdf pp.2,4'},
{assumption:'A nonzero rate emits an interest transaction even when truncated interest is zero; negative balances and negative rates remain eligible.',evidence:'BR-03 branches on rate not zero and imposes no positivity condition.',citation:'intcalc-sonnet.pdf p.2'},
{assumption:'Reset cycle totals for accounts with readable category rows even at zero rates; leave accounts without category rows unchanged.',evidence:'BR-06 updates at account changes in the category-balance traversal, but does not describe untouched accounts separately.',citation:'intcalc-sonnet.pdf pp.2,4'},
{assumption:'Use the first occurrence of duplicate account, card-cross-reference or rate keys and report the duplicates.',evidence:'The model specifies unique keys, but the wiki does not say how duplicate keys in supplied text dumps are handled.',citation:'intcalc-sonnet.pdf pp.6,8-9'},
{assumption:'Keep duplicate category-balance rows as separate work and report them, rather than silently deduplicating.',evidence:'The model declares a composite key; behaviour for duplicate input rows is not specified.',citation:'intcalc-sonnet.pdf p.9'},
{assumption:'Use the lexicographically first card cross-reference for each account; if absent use a blank card number.',evidence:'The cross-reference fields and alternate account access are documented; the interest rules do not specify card selection or missing-card behaviour.',citation:'intcalc-sonnet.pdf pp.2,8,15'},
{assumption:'Set merchant_id to 0 and merchant_name, merchant_city and merchant_zip to blank.',evidence:'The contract requires these fields but the interest transaction rules do not assign their values.',citation:'intcalc-sonnet.pdf pp.2,24'},
{assumption:'Set orig_ts and proc_ts to business-date midnight formatted YYYY-MM-DD HH:MM:SS.000000.',evidence:'Timestamp fields have length 26; the contract supplies a business date, but timestamp contents and delimiter are not specified.',citation:'intcalc-sonnet.pdf pp.9,24'},
{assumption:'Use a six-digit suffix starting at 000001 after the ten-character run parameter, processing account/type/category in ascending string order.',evidence:'BR-05 specifies a date prefix and running suffix; the transaction identifier has 16 characters, but suffix start and traversal tie order are unspecified.',citation:'intcalc-sonnet.pdf pp.2,8,24'},
{assumption:'A missing account or a rate missing from both requested and DEFAULT groups skips that category with an error.',evidence:'DEFAULT fallback and not-found responses are documented, but no terminal missing-default policy is given.',citation:'intcalc-sonnet.pdf pp.2,16,18'},
{assumption:'Report unreadable records individually, validate only fields actually read, and continue independent records; combine valid category results despite other category errors.',evidence:'The integration wiki returns bulk failures per record but does not define complete standalone file-batch failure handling.',citation:'intcalc-sonnet.pdf pp.16,18,20'},
{assumption:'Missing required input contents or invalid run parameters produce FAILED with empty result lists; record errors produce PARTIAL; otherwise return OK.',evidence:'Standalone file-input failure statuses are not specified by the wiki.',citation:'intcalc-sonnet.pdf pp.3,22,24'},
{assumption:'Return all readable input accounts, preserve unrelated account values, format monetary values as two-decimal strings, and do not charge fees.',evidence:'The contract requires every account and permits monetary strings; BR-07 explicitly describes an empty fee stub.',citation:'intcalc-sonnet.pdf pp.2,24'},
{assumption:'Restart the suffix per invocation; return only this invocation\u0027s transactions with no shared append, persistence, scheduler, batch-window enforcement or other batch steps.',evidence:'The contract isolates INTCALC; BR-09 discusses persistent append, which is outside the selected returned-data version.',citation:'intcalc-sonnet.pdf pp.2,21-24'},
{assumption:'A model formats these approved facts without customer data; a complete factual rendering replaces failed or incomplete drafts.',evidence:'This is an implementation choice for the requested assumptions document, not a claimed legacy rule.',citation:'Maker-approved delivery-scope decision'}
];
var errors=[]; var out={intcalc_systran:[],intcalc_acctdata:[],assumptions:'',errors:errors,status:'OK'};
function err(file,line,message){errors.push({file:file,line:line,message:message});}
function digits(s){if(!/^[0-9]+$/.test(s))throw new Error('Unreadable numeric field');return s;}
function signed(s){var p='{ABCDEFGHI',n='}JKLMNOPQR';var last=s.charAt(s.length-1),sign=1,t=s;var a=p.indexOf(last),b=n.indexOf(last);if(a>=0)t=s.slice(0,-1)+String(a);else if(b>=0){t=s.slice(0,-1)+String(b);sign=-1;}else if(s.charAt(0)==='-'||s.charAt(0)==='+'){sign=s.charAt(0)==='-'?-1:1;t=s.slice(1);}digits(t);return BigInt(t)*BigInt(sign);}
function money(c){var neg=c<BigInt(0),a=neg?-c:c;return (neg?'-':'')+String(a/BigInt(100))+'.'+String(a%BigInt(100)).padStart(2,'0');}
function trim(s){return s.replace(/ +$/,'');}
function lines(file,fn){var rows=input.files[file].split('\n');if(rows.length&&rows[rows.length-1]==='')rows.pop();for(var i=0;i<rows.length;i++){var r=rows[i];if(r.endsWith('\r'))r=r.slice(0,-1);try{fn(r,i+1);}catch(e){err(file,i+1,String(e.message||e));}}}
function need(r,n){if(r.length<n)throw new Error('Record shorter than fields read');}
var date=input.businessDate===undefined?'2022-07-18':input.businessDate;
var prefix=input.interestRunDate===undefined?'2022071800':input.interestRunDate;
var required=['acctdata.dat','cardxref.dat','tcatbal.dat','discgrp.dat'];
var fatal=false;
for(var i=0;i<required.length;i++){if(!input.files||typeof input.files[required[i]]!=='string'){err(required[i],0,'Required file contents are missing');fatal=true;}}
if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||isNaN(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date){err('parameters',0,'Invalid business date');fatal=true;}
if(typeof prefix!=='string'||!/^\d{10}$/.test(prefix)){err('parameters',0,'Run parameter must contain ten digits');fatal=true;}
if(!fatal){
var accounts=Object.create(null), order=[], rates=Object.create(null), cards=Object.create(null), xkeys=Object.create(null), balances=[],bkeys=Object.create(null),totals=Object.create(null);
lines('acctdata.dat',function(r,line){need(r,122);var id=digits(r.slice(0,11));var obj={acct_id:Number(id),active_status:trim(r.slice(11,12)),curr_bal:money(signed(r.slice(12,24))),credit_limit:money(signed(r.slice(24,36))),cash_credit_limit:money(signed(r.slice(36,48))),open_date:trim(r.slice(48,58)),expiration_date:trim(r.slice(58,68)),reissue_date:trim(r.slice(68,78)),curr_cyc_credit:money(signed(r.slice(78,90))),curr_cyc_debit:money(signed(r.slice(90,102))),addr_zip:trim(r.slice(102,112)),group_id:trim(r.slice(112,122))};if(accounts[id]){err('acctdata.dat',line,'Duplicate account key; first occurrence retained');return;}accounts[id]={record:obj,cents:signed(r.slice(12,24))};order.push(id);});
lines('discgrp.dat',function(r,line){need(r,22);var g=trim(r.slice(0,10)),t=r.slice(10,12),c=digits(r.slice(12,16)),rate=signed(r.slice(16,22)),k=JSON.stringify([g,t,c]);if(rates[k]!==undefined){err('discgrp.dat',line,'Duplicate rate key; first occurrence retained');return;}rates[k]=rate;});
lines('cardxref.dat',function(r,line){need(r,36);var card=r.slice(0,16),id=digits(r.slice(25,36));if(xkeys[card]){err('cardxref.dat',line,'Duplicate cross-reference key; first occurrence retained');return;}xkeys[card]=true;if(cards[id]===undefined||card<cards[id])cards[id]=card;});
lines('tcatbal.dat',function(r,line){need(r,28);var id=digits(r.slice(0,11)),t=r.slice(11,13),c=digits(r.slice(13,17)),bal=signed(r.slice(17,28)),k=JSON.stringify([id,t,c]);if(bkeys[k])err('tcatbal.dat',line,'Duplicate balance key retained as separate work');bkeys[k]=true;balances.push({id:id,type:t,cat:c,balance:bal,line:line});});
balances.sort(function(a,b){var x=a.id+a.type+a.cat,y=b.id+b.type+b.cat;return x<y?-1:x>y?1:a.line-b.line;});
var seq=0;
for(var j=0;j<balances.length;j++){var b=balances[j],a=accounts[b.id];if(!a){err('tcatbal.dat',b.line,'Account not found; category skipped');continue;}if(totals[b.id]===undefined)totals[b.id]=BigInt(0);var rateKey=JSON.stringify([a.record.group_id,b.type,b.cat]),rate=rates[rateKey];if(rate===undefined)rate=rates[JSON.stringify(['DEFAULT',b.type,b.cat])];if(rate===undefined){err('tcatbal.dat',b.line,'Rate missing from requested and DEFAULT groups; category skipped');continue;}if(rate===BigInt(0))continue;if(seq>=999999){err('tcatbal.dat',b.line,'Transaction suffix exhausted; category skipped');continue;}var interest=b.balance*rate/BigInt(120000);seq++;totals[b.id]+=interest;out.intcalc_systran.push({tran_id:prefix+String(seq).padStart(6,'0'),type_cd:'01',cat_cd:5,source:'System',desc:'Int. for a/c '+b.id,amt:money(interest),merchant_id:0,merchant_name:'',merchant_city:'',merchant_zip:'',card_num:cards[b.id]===undefined?'':trim(cards[b.id]),orig_ts:date+' 00:00:00.000000',proc_ts:date+' 00:00:00.000000'});}
for(var k=0;k<order.length;k++){var id=order[k],a=accounts[id],obj=a.record;if(totals[id]!==undefined){obj.curr_bal=money(a.cents+totals[id]);obj.curr_cyc_credit='0.00';obj.curr_cyc_debit='0.00';}out.intcalc_acctdata.push(obj);}
out.status=errors.length?'PARTIAL':'OK';
}else out.status='FAILED';
output={result:out,assumptionFacts:facts};
```

### Finalize result (SCRIPT, id=6ae0676cad7ea9e18be41c38)

```javascript
var facts=Array.isArray(input.assumptionFacts)?input.assumptionFacts:[];var canonical='# assumptions.md\n\n'+facts.map(function(f){return '- '+f.assumption+'\n  Evidence: '+f.evidence+'\n  Source: '+f.citation;}).join('\n\n');var draft=input.assumptionDraft&&typeof input.assumptionDraft.markdown==='string'?input.assumptionDraft.markdown:'';function norm(s){return s.replace(/[#*_`]/g,'').replace(/\s+/g,' ').trim();}var result=input.result?JSON.parse(JSON.stringify(input.result)):{intcalc_systran:[],intcalc_acctdata:[],errors:[],status:'FAILED'};result.assumptions=draft&&norm(draft)===norm(canonical)?draft:canonical;output={resultChecked:result};
```

### Draft assumptions failed (SCRIPT, id=6ae0676cad7ea9e18be41c39)

```javascript
output = {"assumptionDraft": {}};

```

_(server: 177 ms, 1 API call, 173 ms in API)_
