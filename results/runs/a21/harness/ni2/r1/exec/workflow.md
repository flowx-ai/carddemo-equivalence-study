# Workflow: CalculateCardDemoInterest

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** 

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae22a273695c563ea50b873 | <uuid> | (0, 0) | → Calculate interest (seq:<uuid>) |
| End | END | 6ae22a273695c563ea50b874 | <uuid> | (1200, 0) | — |
| Calculate interest | SCRIPT | 6ae22a273695c563ea50b875 | <uuid> | (300, 0) | → Draft assumptions (seq:<uuid>) | lang: JAVASCRIPT |
| Draft assumptions | AI | 6ae22a273695c563ea50b876 | <uuid> | (600, 0) | → Finalize result [SUCCESS] (seq:<uuid>), → Draft assumptions failed [FAIL] (seq:<uuid>) | responseKey: assumptionsDraft, aiType: TEXT_UNDERSTANDING, responseSchema: set |
| Finalize result | SCRIPT | 6ae22a273695c563ea50b877 | <uuid> | (900, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| Draft assumptions failed | SCRIPT | 6ae22a273695c563ea50b878 | <uuid> | (600, 200) | → Finalize result (seq:<uuid>) | lang: JAVASCRIPT |

## Systems
_(none)_

## AI prompts

### Draft assumptions (TEXT_UNDERSTANDING, id=6ae22a273695c563ea50b876)
instructions:

```
Write the assumptions record in English using only the supplied authoritative entries. Return an object with entries and markdown. Copy every input entry verbatim, in order, with exactly the same assumption, wikiStatement, sourceAbsent and source values. Do not add, omit, merge or reinterpret entries. The markdown must be a table with columns What was assumed and Wiki statement or absence, with one row per entry; include the entry's source citation in the second column. Copy the entry wording exactly, escaping Markdown pipe characters if necessary. Do not calculate interest, infer legacy behaviour, invent citations, or discuss any account or card data. There is no other source of truth.
```
userMessage:

```
Authoritative assumption entries:
${assumptionEntries}
```
exampleOutputJsonSchema:

```
{"title":"Response","type":"object","required":["entries","markdown"],"properties":{"entries":{"type":"array","items":{"type":"object","required":["assumption","wikiStatement","sourceAbsent","source"],"properties":{"source":{"type":"string"},"assumption":{"type":"string"},"sourceAbsent":{"type":"boolean"},"wikiStatement":{"type":"string"}},"additionalProperties":false}},"markdown":{"type":"string"}},"additionalProperties":false}
```

## Scripts

### Calculate interest (SCRIPT, id=6ae22a273695c563ea50b875)

```javascript
var bag = (typeof input === 'object' && input) ? input : {};
var assumptions = [];
function note(a,w,abs,p){ assumptions.push({assumption:a,wikiStatement:w,sourceAbsent:abs,source:'intcalc-sonnet-ni2.pdf '+p}); }
note('Truncate each category interest toward zero to two decimals before summing; use scaled integers rather than binary floating-point arithmetic.','BR-08: Rounding follows COBOL COMPUTE default truncation; TODO: confirm rounding mode (truncate vs ROUNDED).',false,'p.2, process-interest-calculation BR-08; p.4, scenario 8');
note('The effective rate is floored at zero for every account, including a negative original disclosure rate.','BR-03 says the effective rate is reduced by 2.00 for eligible accounts, never below 0.00; scope for a negative original rate is not stated.',false,'p.2, process-interest-calculation BR-03');
note('The ten-year cutoff is computed on the run-date calendar date; a nonexistent February 29 in the cutoff year becomes February 28.','BR-03 specifies the same calendar date ten years before the run date but gives no leap-day rule.',true,'p.2, process-interest-calculation BR-03');
note('Process balance rows in account/type/category order using zero-padded digit identifiers; preserve account output order.','BR-06 describes account-change boundaries; no intra-account ordering is specified. CONTRACT permits output lists in any order.',true,'p.2 BR-06; p.24 CONTRACT.md Outputs');
note('Append a six-digit suffix starting at 000001 to the ten-character INTCALC parameter; restart for each invocation. If the suffix is exhausted, report and skip subsequent transactions.','BR-05 specifies run-date prefix plus running suffix, without suffix width, initial value, overflow or persistent allocation rules. Transaction id is 16 characters.',true,'p.2 BR-05; p.8 DT-05');
note('Choose the lexically smallest valid sixteen-digit card linked to the account; missing valid linked cards prevent only nonzero-rate transaction creation.','CardXref links cardNumber to accountId; interest transaction card selection, multiple-card handling and missing-card handling are not specified.',true,'p.8 DT-04; p.9 DT-05; p.24 CONTRACT.md');
note('Generated merchant_id is integer 0; merchant_name, merchant_city and merchant_zip are empty strings.','The contract requires merchant fields but the interest transaction rule supplies no merchant values.',true,'p.2 BR-04; p.8 DT-05; p.24 CONTRACT.md');
note('Both generated timestamps use business-date midnight in YYYY-MM-DD 00:00:00.000000 format, with no timezone suffix.','Timestamps have a 26-character legacy layout; generated timestamp values and timezone are not stated.',true,'p.9 DT-05; p.24 CONTRACT.md Run parameters');
note('Default businessDate to 2022-07-18 and interestRunDate to 2022071800 only when absent; reject invalid explicit dates. An explicit differing business date controls timestamps, while the run parameter controls ids and account age.','The contract gives both run parameters; BR-03/05 use PARM for age and transaction ids. Mismatch handling is not specified.',true,'p.2 BR-03/05; p.24 CONTRACT.md Run parameters');
note('A missing account-specific rate retries DEFAULT; an existing zero rate never falls back. A missing or unusable DEFAULT rate reports and skips that balance.','BR-02 retries DEFAULT when the group row is not found; no handling for an absent or unusable DEFAULT row is specified.',true,'p.2 BR-02; p.17-18 reference-data-access');
note('Duplicate account ids, duplicate disclosure keys and duplicate account/type/category balance keys are ambiguous; report and skip balances that depend on them rather than pick an arbitrary row.','The data model declares primary/composite keys but does not define duplicate decoded-input handling.',true,'p.6 DT-01; p.9 DT-06/07');
note('Report and skip a malformed or unprocessable balance independently; missing accounts do not stop valid unrelated records. Validate only values the calculation reads and ignore unrelated fields and filler.','The wiki does not define malformed decoded-input handling; transaction bulk failures are returned per record.',true,'p.20 transaction-data-access Error Handling; p.2 process-interest-calculation');
note('Update and reset cycle totals only for accounts with at least one successfully processed balance, including zero-rate balances. Accounts without such balances retain supplied field values.','BR-06 rewrites at account changes; treatment of accounts with no category balances or only failed balances is not stated.',true,'p.2 BR-06');
note('Emit a transaction whenever effective rate is nonzero, even if its truncated amount is zero; negative category balances produce negative interest truncated toward zero.','BR-03 tests effective rate rather than computed amount; zero computed amounts and negative balance examples are not supplied.',true,'p.2 BR-03; p.9 DT-06');
note('Account increments sum the exact amounts of emitted transactions; a skipped transaction contributes nothing. Output monetary amounts as two-decimal strings.','BR-06 adds totalInterest; CONTRACT permits amounts as strings or numbers with at most two decimals. Failure-time aggregation is not specified.',true,'p.2 BR-06; p.24 CONTRACT.md Outputs');
note('Inputs are already-decoded JSON records: balances, rates and amounts use decimal strings or finite JSON numbers with at most two decimals; raw signed-overpunch decoding and file layouts are outside this calculator.','The wiki says signed-overpunch is converted at load time. The maker selected decoded-record calculation without file reading.',false,'p.9 DT-07; p.18 reference-data-access; p.24 CONTRACT.md');
note('Internally normalize account, type and category digit strings to widths 11, 2 and 4 respectively; retain card digits as a sixteen-character string. Contract account ids and generated merchant ids are output integers.','The data model provides these widths; the contract requires acct_id and merchant_id integers. Decoded-input normalization rules are not given.',true,'p.6 DT-01; p.8-9 DT-04/06; p.24 CONTRACT.md');
note('No ledger is read or appended and no database or files are changed. Every invocation recalculates from its supplied account snapshot; callers must not reapply results to the same accounting period.','BR-09 proposes FlowX appending, but the maker explicitly selected calculator-only results without file or persistence connections.',false,'p.3 BR-09; p.24 CONTRACT.md Step isolation');
note('Fees remain the empty stub; no fee transaction is generated.','BR-07: Fees is an empty stub, no fees charged; scenario 7 marks the future choice unresolved. The requested behaviour preserves the stub.',false,'p.2 BR-07; p.4 scenario 7');
note('Financial calculations never depend on model output. If explanation drafting fails or changes authoritative entries, return a deterministic table with the same assumption/source columns and a diagnostic.','The source specifies no documentation-generation or explanation-failure policy; the maker requested explicit assumptions beside returned results.',true,'p.2-4 process-interest-calculation; p.24-25 CONTRACT.md');
var diagnostics=[];
function diag(where,msg){diagnostics.push({record:String(where),message:String(msg)});}
function list(k){if(bag[k]===undefined){diag(k,'Input list is missing; treated as empty.');return [];}if(!Array.isArray(bag[k])){diag(k,'Expected decoded record list; treated as empty.');return [];}return bag[k];}
var accounts=list('accounts'), balances=list('categoryBalances'), groups=list('disclosureGroups'), xrefs=list('cardXrefs');
function copy(x){return JSON.parse(JSON.stringify(x));}
function digits(v,n){var s=String(v===undefined||v===null?'':v).replace(/\s+$/,'');if(!/^\d+$/.test(s)||s.length>n)throw new Error('Expected digit identifier of at most '+n+' characters.');return s.padStart(n,'0');}
function text(v){if(typeof v!=='string')throw new Error('Expected text.');return v.replace(/\s+$/,'');}
function cents(v){if(typeof v!=='string' && typeof v!=='number')throw new Error('Expected decoded decimal amount.');if(typeof v==='number'&&!Number.isFinite(v))throw new Error('Non-finite decimal.');var s=String(v);if(!/^[+-]?\d+(?:\.\d{1,2})?$/.test(s))throw new Error('Expected decimal with at most two places.');var negative=s.charAt(0)==='-';s=s.replace(/^[+-]/,'');var p=s.split('.');return BigInt(p[0])*BigInt(100)*(negative?BigInt(-1):BigInt(1))+BigInt((p[1]||'').padEnd(2,'0'))*(negative?BigInt(-1):BigInt(1));}
function money(v){var neg=v<BigInt(0),s=(neg?-v:v).toString().padStart(3,'0');return (neg?'-':'')+s.slice(0,-2)+'.'+s.slice(-2);}
function date(s){if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))throw new Error('Expected YYYY-MM-DD date.');var y=Number(s.slice(0,4)),m=Number(s.slice(5,7)),d=Number(s.slice(8,10));var leap=y%4===0&&(y%100!==0||y%400===0);var days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];if(y<1||m<1||m>12||d<1||d>days[m-1])throw new Error('Invalid calendar date.');return s;}
var outAccounts=accounts.map(function(a){return copy(a);});
var accountFields=['acct_id','active_status','curr_bal','credit_limit','cash_credit_limit','open_date','expiration_date','reissue_date','curr_cyc_credit','curr_cyc_debit','addr_zip','group_id'];
outAccounts=outAccounts.map(function(a,i){if(!a||typeof a!=='object'||Array.isArray(a)){diag('accounts['+i+']','Unusable account record retained unchanged.');return a;}var r={};accountFields.forEach(function(k){if(Object.prototype.hasOwnProperty.call(a,k))r[k]=a[k];});try{r.acct_id=Number(digits(a.acct_id,11));}catch(e){diag('accounts['+i+']',e.message);}return r;});
var acctIndex=Object.create(null), rateIndex=Object.create(null), balanceCounts=Object.create(null), cards=Object.create(null);
function add(map,k,v){if(!map[k])map[k]=[];map[k].push(v);}
accounts.forEach(function(a,i){try{add(acctIndex,digits(a.acct_id,11),i);}catch(e){diag('accounts['+i+']',e.message);}});
groups.forEach(function(g,i){try{add(rateIndex,text(g.group_id)+'|'+digits(g.type_cd,2)+'|'+digits(g.cat_cd,4),g);}catch(e){diag('disclosureGroups['+i+']',e.message);}});
xrefs.forEach(function(x,i){try{var a=digits(x.acct_id,11),c=String(x.card_num);if(!/^\d{16}$/.test(c))throw new Error('Expected sixteen-digit card_num.');add(cards,a,c);}catch(e){diag('cardXrefs['+i+']',e.message);}});
var rows=[];
balances.forEach(function(b,i){try{var a=digits(b.acct_id,11),t=digits(b.type_cd,2),c=digits(b.cat_cd,4),key=a+'|'+t+'|'+c;balanceCounts[key]=(balanceCounts[key]||0)+1;rows.push({record:b,index:i,acct:a,type:t,cat:c,key:key});}catch(e){diag('categoryBalances['+i+']',e.message);}});
rows.sort(function(a,b){return a.key<b.key?-1:a.key>b.key?1:a.index-b.index;});
var transactions=[], totals=Object.create(null), processed=0, fatal=false;
var business=bag.businessDate===undefined?'2022-07-18':bag.businessDate;
var run=bag.interestRunDate===undefined?'2022071800':bag.interestRunDate;
var cutoff='', stamp='';
try{business=date(business);if(typeof run!=='string'||!/^\d{10}$/.test(run))throw new Error('interestRunDate must be a ten-digit string.');var rd=date(run.slice(0,4)+'-'+run.slice(4,6)+'-'+run.slice(6,8));var y=Number(rd.slice(0,4))-10;if(y<1)throw new Error('Run date is too early for a ten-year cutoff.');var md=rd.slice(5);if(md==='02-29'&&!(y%4===0&&(y%100!==0||y%400===0)))md='02-28';cutoff=String(y).padStart(4,'0')+'-'+md;stamp=business+' 00:00:00.000000';}catch(e){fatal=true;diag('run parameters',e.message);}
if(!fatal){rows.forEach(function(row){try{var key=row.key,where='categoryBalances['+row.index+']';if(balanceCounts[key]!==1)throw new Error('Duplicate category-balance key.');var matches=acctIndex[row.acct];if(!matches||matches.length!==1)throw new Error(matches?'Ambiguous account id.':'Account is missing.');var ai=matches[0],account=accounts[ai];var rk=text(account.group_id)+'|'+row.type+'|'+row.cat;var rates=rateIndex[rk];if(!rates)rates=rateIndex['DEFAULT|'+row.type+'|'+row.cat];if(!rates||rates.length!==1)throw new Error(rates?'Ambiguous disclosure rate.':'Disclosure and DEFAULT rate are missing.');var rate=cents(rates[0].interest_rate);var balance=cents(row.record.bal);var current=cents(account.curr_bal);if(rate>BigInt(0)){var opened=date(account.open_date);if(opened<=cutoff)rate-=BigInt(200);}if(rate<BigInt(0))rate=BigInt(0);
var amount=BigInt(0),tx=null;
if(rate!==BigInt(0)){var candidates=cards[row.acct];if(!candidates||candidates.length===0)throw new Error('No valid linked card.');var card=candidates.slice().sort()[0];if(transactions.length>=999999)throw new Error('Six-digit transaction suffix exhausted.');amount=(balance*rate)/BigInt(120000);var suffix=String(transactions.length+1).padStart(6,'0');tx={tran_id:run+suffix,type_cd:'01',cat_cd:5,source:'System',desc:'Int. for a/c '+row.acct,amt:money(amount),merchant_id:0,merchant_name:'',merchant_city:'',merchant_zip:'',card_num:card,orig_ts:stamp,proc_ts:stamp};}
if(totals[row.acct]===undefined)totals[row.acct]={index:ai,current:current,interest:BigInt(0)};totals[row.acct].interest+=amount;if(tx)transactions.push(tx);processed++;
}catch(e){diag('categoryBalances['+row.index+']',e.message);}});}
Object.keys(totals).forEach(function(k){var t=totals[k],a=outAccounts[t.index];a.curr_bal=money(t.current+t.interest);a.curr_cyc_credit='0.00';a.curr_cyc_debit='0.00';});
var status=fatal?'FAILED':diagnostics.length?(processed>0?'PARTIAL':'FAILED'):'OK';
output={calculation:{intcalc_systran:transactions,intcalc_acctdata:outAccounts,status:status,diagnostics:diagnostics},assumptionEntries:assumptions};
```

### Finalize result (SCRIPT, id=6ae22a273695c563ea50b877)

```javascript
var bag=(typeof input==='object'&&input)?input:{};
var c=bag.calculation||{intcalc_systran:[],intcalc_acctdata:[],status:'FAILED',diagnostics:[{record:'calculation',message:'Calculation result is missing.'}]};
var entries=Array.isArray(bag.assumptionEntries)?bag.assumptionEntries:[];
function cell(v){return String(v).replace(/\|/g,'\\|').replace(/\r?\n/g,' ');}
function table(es){return '# CardDemo interest calculation assumptions\n\nThese are declared implementation interpretations, not certified COBOL oracle behaviour. No files or database records are written by this calculator.\n\n| What was assumed | Wiki statement or absence |\n| --- | --- |\n'+es.map(function(e){return '| '+cell(e.assumption)+' | '+cell(e.wikiStatement)+' '+cell(e.source)+' |';}).join('\n')+'\n';}
var canonical=table(entries),d=bag.assumptionsDraft,valid=!!d&&Array.isArray(d.entries)&&d.entries.length===entries.length&&typeof d.markdown==='string';
if(valid){for(var i=0;i<entries.length;i++){var a=entries[i],b=d.entries[i];if(!b||b.assumption!==a.assumption||b.wikiStatement!==a.wikiStatement||b.sourceAbsent!==a.sourceAbsent||b.source!==a.source){valid=false;break;}}}
// A model may not introduce any prose into the returned record: only an exact rendering of the approved authoritative rows is accepted.
// Compare normalized table lines (ignoring a heading or blank lines is deliberately not allowed); any variation uses the authoritative rendering.
var modelText=valid&&d.markdown.trim()===canonical.trim()?d.markdown:canonical;
var diagnostics=Array.isArray(c.diagnostics)?c.diagnostics.slice():[];
if(!valid||d.markdown.trim()!==canonical.trim()){diagnostics.push({record:'assumptions explanation',message:'Draft unavailable or not an exact authoritative rendering; used deterministic source-linked table.'});}
output={result:{intcalc_systran:c.intcalc_systran||[],intcalc_acctdata:c.intcalc_acctdata||[],assumptions:entries,assumptions_md:modelText,status:c.status||'FAILED',diagnostics:diagnostics}};
```

### Draft assumptions failed (SCRIPT, id=6ae22a273695c563ea50b878)

```javascript
output = {"assumptionsDraft": {}};

```

_(server: 211 ms, 1 API call, 191 ms in API)_
