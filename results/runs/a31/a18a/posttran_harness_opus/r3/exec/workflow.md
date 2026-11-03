# Workflow: PostDailyTransactions

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** 

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae560cb3695c563ea51599b | <uuid> | (0, 0) | → Post transactions (seq:<uuid>) |
| End | END | 6ae560cb3695c563ea51599c | <uuid> | (1200, 0) | — |
| Post transactions | SCRIPT | 6ae560cb3695c563ea51599d | <uuid> | (300, 0) | → Draft assumptions (seq:<uuid>) | lang: JAVASCRIPT |
| Draft assumptions | AI | 6ae560cb3695c563ea51599e | <uuid> | (600, 0) | → Format results [SUCCESS] (seq:<uuid>), → Draft assumptions failed [FAIL] (seq:<uuid>) | responseKey: draftedAssumptions, aiType: TEXT_UNDERSTANDING, responseSchema: set |
| Format results | SCRIPT | 6ae560cb3695c563ea51599f | <uuid> | (900, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| Draft assumptions failed | SCRIPT | 6ae560cb3695c563ea5159a0 | <uuid> | (600, 200) | → Format results (seq:<uuid>) | lang: JAVASCRIPT |

## Systems
_(none)_

## AI prompts

### Draft assumptions (TEXT_UNDERSTANDING, id=6ae560cb3695c563ea51599e)
instructions:

```
Draft the assumptions record from the supplied implementation-derived register only. Return an object containing assumptions, an array with exactly one entry per supplied register item in the same order, with separate whatYouAssumed and wikiBasis strings. For this source-controlled record, retain both supplied strings verbatim: do not omit, paraphrase, combine or add entries. This is not a request to infer financial rules. Do not calculate balances, decide transaction outcomes, invent source quotations or claim legacy/oracle parity. You receive no customer or transaction data. Return only the structured object matching the schema.
```
userMessage:

```
Implementation assumption register, including each assumed choice and its cited wiki statement or explicitly identified absence:
${assumptionFacts}
```
exampleOutputJsonSchema:

```
{"title":"Response","type":"object","additionalProperties":false,"required":["assumptions"],"properties":{"assumptions":{"type":"array","items":{"type":"object","additionalProperties":false,"required":["whatYouAssumed","wikiBasis"],"properties":{"whatYouAssumed":{"type":"string"},"wikiBasis":{"type":"string"}}}}}}
```

## Scripts

### Post transactions (SCRIPT, id=6ae560cb3695c563ea51599d)

```javascript
var errors = [];
var facts = [];
function fact(a,b) { facts.push({whatYouAssumed:a,wikiBasis:b}); }
var src = 'posttran-opus.pdf ';
fact('Return output datasets and assumptions text, not physical JSON or Markdown files.', 'Maker scope answer: build posting logic and return output datasets and assumptions text; leave saving files out of scope. CONTRACT.md at '+src+'p.12 originally names files.');
fact('The implementation is assumption-based; exact COBOL/oracle parity is unverified.', src+'pp.3–4: exact reject reasons are TODO and regression requires balances and rejects identical to legacy; no oracle examples were supplied.');
fact('Daily input CVTRA06Y uses the same field layout as the Transaction CVTRA05Y description.', src+'pp.7–8 describe CVTRA05Y, while p.12 names CVTRA06Y without providing its field offsets.');
fact('Input values are already decoded single-byte fixed-width text, one record per LF or CRLF line; ignore empty lines. Do not decode EBCDIC or packed binary.', src+'p.12 says one record per line, fixed width, but does not specify character encoding, newline conventions or blank-line handling.');
fact('A signed PIC field occupies its digit count, with no separate sign byte. Accept plain digits or trailing signed overpunch: {ABCDEFGHI positive 0–9 and }JKLMNOPQR negative 0–9. A leading sign inside the allotted width is also accepted; no decimal point is expected.', src+'p.5 describes S9(n)V99 and scale two but supplies no physical signed-number encoding; copybooks are absent.');
fact('Use integer cents and emit monetary JSON strings with exactly two decimals. Detect unsafe integer arithmetic rather than round an uncertain value.', src+'p.12 allows amounts as strings or numbers with at most two decimals; pp.5,7–8 describe signed scale-two amounts but do not state an arithmetic implementation.');
fact('Keep digit identifiers as fixed-width strings for joins, converting only acct_id, cat_cd and merchant_id to contract integers at output.', src+'pp.5,7–8 describe digit identifiers; p.12 expressly requires these output fields to be integers and card_num/tran_id to be strings.');
fact('Blank optional merchant_id becomes integer zero; other consumed numeric fields must be parseable.', src+'p.7 marks merchantId optional; p.12 requires merchant_id as an integer and gives no missing-value representation.');
fact('Only consumed prefixes are required. Ignore filler, including NUL and non-printable bytes, and do not enforce total line length beyond the fields actually read.', src+'p.5 says FILLER tails are dropped; p.12 lists total record lengths without rules for unused bytes.');
fact('Ignore discgrp, custdata, trantype and trancatg contents for POSTTRAN. Do not validate unused card/customer attributes, expiry dates or reference codes.', src+'pp.2–3 specify only account/card activity and available credit; p.12 lists shared inputs without assigning these unused fields a posting rule.');
fact('Use cardxref to resolve transaction card to account. Do not impose an additional cardAccountId consistency rule.', src+'p.7 describes CardXref linking card/customer/account; pp.2–3 omit the account lookup mechanics and any cross-file consistency check.');
fact('Use the first renderable master record for each account, card, cross-reference or category key. Report later duplicates and mark the run incomplete.', src+'pp.5,7–8 describe unique keys but provide no policy for duplicate input records.');
fact('Report each unreadable record with file, one-based line and a non-sensitive message. Continue independent records; do not fabricate its values or claim a complete contract result. An unreadable category key with readable identity is blocked from replacement.', src+'pp.2–4 give no malformed-record policy. This implementation makes partial processing explicit rather than silently coercing data.');
fact('Process transactions in daily-file order against evolving balances, without sorting or deduplicating repeated transaction IDs.', src+'p.4: each transaction processed once; pp.2–3 describe a loop but do not specify sorting or duplicate transaction-ID handling.');
fact('Preserve origin and processing timestamp text and all untouched account fields; trim only trailing string spaces. Do not filter by businessDate or apply INTCALC parameter 2022071800.', src+'p.12 supplies business date 2022-07-18, INTCALC parameter and permits trailing-space omission; no POSTTRAN timestamp rewrite or date-filter rule is specified.');
fact('The businessDate default is 2022-07-18; the supplied daily contents identify the batch, with no GDG rotation or persistent replay ledger.', src+'p.12 supplies that date; p.3 explicitly leaves GDG cycle semantics TODO.');
fact('Activity means exactly uppercase Y for account and card; any other flag is inactive.', src+'p.4 explicitly rejects account status N; p.3 requires account and card active but does not enumerate all status codes.');
fact('Check in order: cross-reference missing, account missing, account inactive, card missing, card inactive, amount above credit_limit minus current balance. The first applicable rejection wins.', src+'pp.2–3 state activity and available-credit checks, but not precedence or missing-master handling.');
var reasons = ['','Card cross-reference not found','Account not found','Account inactive','Card not found','Card inactive','Credit limit exceeded'];
for(var ri=1;ri<reasons.length;ri++) fact('Reject code '+ri+' has reason_desc '+reasons[ri]+'.',src+'p.3: See CBTRN01-03C source for exact reject reasons; no numeric codes or descriptions are supplied in the wiki.');
fact('Reject only if signed amount is strictly greater than available credit. Equality passes. Do not add a special refund exception or a separate cash-credit-limit test.', src+'p.3: transaction must not exceed available credit (creditLimit - currentBalance); no equality, refund or cash-limit exception is stated.');
fact('A rejected transaction leaves all account and category monetary fields unchanged.',src+'p.4: over-limit transaction is routed to rejects, not posted.');
fact('For a posted transaction, add its signed amount to current balance and matching category balance; use amount sign, not type code, for debit/credit direction.',src+'p.3 explicitly says add transaction amount to category balance; pp.2–3 do not specify a type-code sign mapping for account balance.');
fact('Add positive amounts to current-cycle debit, negative magnitudes to current-cycle credit, and leave both unchanged for zero.',src+'pp.5–6 define cycle credit/debit fields but pp.2–4 do not state their posting arithmetic.');
fact('Create an absent account/type/category balance at zero before adding the first valid transaction. Never create it for a rejection.',src+'p.3 gives the composite key and additive rule but no missing-row policy.');
fact('Return all renderable master accounts and category balances, including untouched rows, plus newly created category rows. Unrenderable records make status incomplete.',src+'p.12 requires every account and every category balance after posting; malformed records have no specified output representation.');
fact('A model drafts only this fixed assumption register, with separate whatYouAssumed and wikiBasis values. Validate exact entries before acceptance; otherwise use the original register with a fallback notice.', 'Implementation default: the maker requires every assumption and its wiki basis; no model-based financial behaviour is specified by '+src+'pp.2–4.');
var txLayout = [['tran_id',16],['type_cd',2],['cat_cd',4],['source',10],['desc',100],['amt',11],['merchant_id',9],['merchant_name',50],['merchant_city',50],['merchant_zip',10],['card_num',16],['orig_ts',26],['proc_ts',26]];
var acctLayout = [['acct_id',11],['active_status',1],['curr_bal',12],['credit_limit',12],['cash_credit_limit',12],['open_date',10],['expiration_date',10],['reissue_date',10],['curr_cyc_credit',12],['curr_cyc_debit',12],['addr_zip',10],['group_id',10]];
var catLayout = [['acct_id',11],['type_cd',2],['cat_cd',4],['bal',11]];
var xrefLayout = [['card_num',16],['customerId',9],['acct_id',11]];
var cardLayout = [['card_num',16],['cardAccountId',11],['cvv',3],['embossedName',50],['expirationDate',10],['active_status',1]];
function registerLayout(file, layout, page, total) { var at=0; for(var i=0;i<layout.length;i++){ fact(file+': '+layout[i][0]+' occupies 1-based positions '+(at+1)+'–'+(at+layout[i][1])+' (width '+layout[i][1]+').',src+page+': inferred consecutively from documented field order and PIC widths; p.12 gives total record length '+total+' but no offsets.'); at+=layout[i][1]; } }
registerLayout('dailytran.dat',txLayout,'pp.7–8',350); registerLayout('acctdata.dat',acctLayout,'pp.5–6',300); registerLayout('tcatbal.dat',catLayout,'p.8',50); registerLayout('cardxref.dat',xrefLayout,'p.7',50); registerLayout('carddata.dat',cardLayout,'p.7',150);
function err(file,line,message) { errors.push({file:file,line:line,message:message}); }
function rtrim(s) { return s.replace(/ +$/g,''); }
function fields(line,layout) { var row={}, p=0; for(var i=0;i<layout.length;i++){var key=layout[i][0],width=layout[i][1]; if(line.length<p+width) throw new Error('Incomplete consumed field '+key);row[key]=rtrim(line.slice(p,p+width));p+=width;}return row; }
function uint(s,key) { if(!/^\d+$/.test(s))throw new Error('Unreadable integer '+key);var n=Number(s);if(!Number.isSafeInteger(n))throw new Error('Unsafe integer '+key);return n; }
function money(s,key,optional) { s=s.trim();if(s==='' && optional)return 0;var last=s.slice(-1), pos='{ABCDEFGHI',neg='}JKLMNOPQR', sign=1; if(pos.indexOf(last)>=0 && last!==''){s=s.slice(0,-1)+String(pos.indexOf(last));}else if(neg.indexOf(last)>=0 && last!==''){s=s.slice(0,-1)+String(neg.indexOf(last));sign=-1;} if(!/^[+-]?\d+$/.test(s))throw new Error('Unreadable cents '+key);var n=sign*Number(s);if(!Number.isSafeInteger(n))throw new Error('Unsafe cents '+key);return n; }
function safe(n,key){if(!Number.isSafeInteger(n))throw new Error('Unsafe arithmetic '+key);return n;}
function amount(n){var a=Math.abs(n);return (n<0?'-':'')+String(Math.floor(a/100))+'.'+String(a%100).padStart(2,'0');}
function records(value,file,fn) { if(value===undefined || value===null || value==='')return;if(typeof value!=='string'){err(file,0,'Expected decoded fixed-width text');return;}var lines=value.split('\n');for(var i=0;i<lines.length;i++){var line=lines[i];if(line.endsWith('\r'))line=line.slice(0,-1);if(line==='')continue;try{fn(line,i+1);}catch(e){err(file,i+1,String(e.message || 'Unreadable consumed field'));}} }
function requireKey(s,name){if(s==='')throw new Error('Empty identity '+name);return s;}
var accounts=[], accountMap=Object.create(null), cats=[], catMap=Object.create(null), blockedCats=Object.create(null), xrefs=Object.create(null), cards=Object.create(null);
records(input.acctdata,'acctdata.dat',function(line,no){var r=fields(line,acctLayout),key=r.acct_id;uint(key,'acct_id');if(accountMap[key]){err('acctdata.dat',no,'Duplicate account; first renderable record retained');return;}r.acct_id=uint(key,'acct_id');r.curr_bal=money(r.curr_bal,'curr_bal');r.credit_limit=money(r.credit_limit,'credit_limit');r.cash_credit_limit=money(r.cash_credit_limit,'cash_credit_limit');r.curr_cyc_credit=money(r.curr_cyc_credit,'curr_cyc_credit');r.curr_cyc_debit=money(r.curr_cyc_debit,'curr_cyc_debit');accounts.push(r);accountMap[key]=r;});
records(input.cardxref,'cardxref.dat',function(line,no){if(line.length<36)throw new Error('Incomplete consumed cross-reference');var key=requireKey(rtrim(line.slice(0,16)),'card_num'),acct=line.slice(25,36);uint(acct,'acct_id');if(xrefs[key]!==undefined){err('cardxref.dat',no,'Duplicate cross-reference; first renderable record retained');return;}xrefs[key]=acct;});
records(input.carddata,'carddata.dat',function(line,no){if(line.length<91)throw new Error('Incomplete consumed card status');var key=requireKey(rtrim(line.slice(0,16)),'card_num');if(cards[key]!==undefined){err('carddata.dat',no,'Duplicate card; first renderable record retained');return;}cards[key]=line.slice(90,91);});
records(input.tcatbal,'tcatbal.dat',function(line,no){var key=null;try{var r=fields(line,catLayout);uint(r.acct_id,'acct_id');r.cat_cd=uint(r.cat_cd,'cat_cd');key=r.acct_id+'|'+r.type_cd+'|'+r.cat_cd;if(catMap[key]){err('tcatbal.dat',no,'Duplicate category balance; first renderable record retained');return;}r.acct_id=uint(r.acct_id,'acct_id');r.bal=money(r.bal,'bal');cats.push(r);catMap[key]=r;delete blockedCats[key];}catch(e){if(key!==null && !catMap[key])blockedCats[key]=true;throw e;}});
var posted=[], rejected=[];
records(input.dailytran,'dailytran.dat',function(line,no){var r=fields(line,txLayout);requireKey(r.tran_id,'tran_id');var card=requireKey(r.card_num,'card_num');r.cat_cd=uint(r.cat_cd,'cat_cd');r.merchant_id=r.merchant_id.trim()===''?0:uint(r.merchant_id,'merchant_id');var cents=money(r.amt,'amt');r.amt=amount(cents);var accountKey=xrefs[card],a=accountKey===undefined?null:accountMap[accountKey],code=0;
if(accountKey===undefined)code=1;else if(!a)code=2;else if(a.active_status!=='Y')code=3;else if(cards[card]===undefined)code=4;else if(cards[card]!=='Y')code=5;else if(cents>safe(a.credit_limit-a.curr_bal,'available credit'))code=6;
if(code){r.reason=code;r.reason_desc=reasons[code];rejected.push(r);return;}
var key=accountKey+'|'+r.type_cd+'|'+r.cat_cd;if(blockedCats[key])throw new Error('Category balance unreadable; transaction not posted');var c=catMap[key];var nextBalance=safe(a.curr_bal+cents,'account balance'),nextCat=safe((c?c.bal:0)+cents,'category balance'),nextDebit=safe(a.curr_cyc_debit+(cents>0?cents:0),'cycle debit'),nextCredit=safe(a.curr_cyc_credit+(cents<0?-cents:0),'cycle credit');
if(!c){c={acct_id:a.acct_id,type_cd:r.type_cd,cat_cd:r.cat_cd,bal:0};cats.push(c);catMap[key]=c;}
a.curr_bal=nextBalance;a.curr_cyc_debit=nextDebit;a.curr_cyc_credit=nextCredit;c.bal=nextCat;posted.push(r);
});
var accountRows=accounts.map(function(a){return {acct_id:a.acct_id,active_status:a.active_status,curr_bal:amount(a.curr_bal),credit_limit:amount(a.credit_limit),cash_credit_limit:amount(a.cash_credit_limit),open_date:a.open_date,expiration_date:a.expiration_date,reissue_date:a.reissue_date,curr_cyc_credit:amount(a.curr_cyc_credit),curr_cyc_debit:amount(a.curr_cyc_debit),addr_zip:a.addr_zip,group_id:a.group_id};});
var categoryRows=cats.map(function(c){return {acct_id:c.acct_id,type_cd:c.type_cd,cat_cd:c.cat_cd,bal:amount(c.bal)};});
output={postingData:{posttran_transact:posted,posttran_dalyrejs:rejected,posttran_acctdata:accountRows,posttran_tcatbal:categoryRows,status:errors.length?'incomplete':'complete',recordErrors:errors},assumptionFacts:facts};
```

### Format results (SCRIPT, id=6ae560cb3695c563ea51599f)

```javascript
var p=input.postingData || {posttran_transact:[],posttran_dalyrejs:[],posttran_acctdata:[],posttran_tcatbal:[],status:'incomplete',recordErrors:[]};
var facts=Array.isArray(input.assumptionFacts)?input.assumptionFacts:[];
var draft=input.draftedAssumptions;
if(typeof draft==='string'){try{draft=JSON.parse(draft);}catch(e){draft=null;}}
var proposed=draft && Array.isArray(draft.assumptions)?draft.assumptions:null;
var valid=proposed!==null && proposed.length===facts.length;
if(valid){for(var i=0;i<facts.length;i++){var row=proposed[i];if(!row || row.whatYouAssumed!==facts[i].whatYouAssumed || row.wikiBasis!==facts[i].wikiBasis || Object.keys(row).length!==2){valid=false;break;}}}
var rows=(valid?proposed:facts).map(function(r){return {whatYouAssumed:r.whatYouAssumed,wikiBasis:r.wikiBasis};});
if(!valid){rows.push({whatYouAssumed:'The model draft was unavailable or did not preserve every source-register entry. The complete deterministic register is returned unchanged; financial results are unaffected.',wikiBasis:'Implementation fallback policy: the wiki does not specify an assumptions-drafting model or a model-failure policy; the maker requires every decision and its basis to remain available.'});}
function cell(s){return String(s).replace(/\|/g,'\\|').replace(/\r?\n/g,'<br>');}
var md='# assumptions.md\n\nAssumption-based implementation; exact legacy/oracle parity is unverified. These results are returned as data and text, not saved as files.\n\n| What you assumed | Which wiki statement (or absence of one) it rests on |\n| --- | --- |\n';
for(var j=0;j<rows.length;j++)md+='| '+cell(rows[j].whatYouAssumed)+' | '+cell(rows[j].wikiBasis)+' |\n';
output={postingOutput:{posttran_transact:p.posttran_transact,posttran_dalyrejs:p.posttran_dalyrejs,posttran_acctdata:p.posttran_acctdata,posttran_tcatbal:p.posttran_tcatbal,assumptions:rows,assumptions_md:md,status:p.status,recordErrors:p.recordErrors}};
```

### Draft assumptions failed (SCRIPT, id=6ae560cb3695c563ea5159a0)

```javascript
output = {"draftedAssumptions": {}};

```

_(server: 341 ms, 1 API call, 202 ms in API)_
