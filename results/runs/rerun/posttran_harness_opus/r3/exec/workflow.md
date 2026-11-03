# Workflow: PostDailyTransactions

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** 

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae09550ad7ea9e18be42429 | <uuid> | (0, 0) | → Post transactions (seq:<uuid>) |
| End | END | 6ae09550ad7ea9e18be4242a | <uuid> | (1200, 0) | — |
| Post transactions | SCRIPT | 6ae09550ad7ea9e18be4242b | <uuid> | (300, 0) | → Draft assumption notes (seq:<uuid>) | lang: JAVASCRIPT |
| Draft assumption notes | AI | 6ae09550ad7ea9e18be4242c | <uuid> | (600, 0) | → Assemble results [SUCCESS] (seq:<uuid>), → Draft assumption notes failed [FAIL] (seq:<uuid>) | responseKey: assumptionDraft, aiType: TEXT_UNDERSTANDING, responseSchema: set |
| Assemble results | SCRIPT | 6ae09550ad7ea9e18be4242d | <uuid> | (900, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| Draft assumption notes failed | SCRIPT | 6ae09550ad7ea9e18be4242e | <uuid> | (600, 200) | → Assemble results (seq:<uuid>) | lang: JAVASCRIPT |

## Systems
_(none)_

## AI prompts

### Draft assumption notes (TEXT_UNDERSTANDING, id=6ae09550ad7ea9e18be4242c)
instructions:

```
Write an English Markdown introduction of at most two sentences, based solely on the supplied authoritative assumption ledger. State that choices are documented assumptions, not verified legacy behaviour, and that results are returned datasets and notes, not written files. Cite posttran-opus.pdf p.3 for unresolved reject reasons and p.12 for the format-only contract. Invent no rules, source quotations or assertions of parity. Do not rewrite the ledger. Return only an object with the string markdown. The complete original ledger is appended independently.
```
userMessage:

```
Authoritative ledger:
${assumptionLedger}
```
exampleOutputJsonSchema:

```
{"title":"Response","type":"object","properties":{"markdown":{"type":"string"}},"required":["markdown"],"additionalProperties":false}
```

## Scripts

### Post transactions (SCRIPT, id=6ae09550ad7ea9e18be4242b)

```javascript
function text(v){return v===null||v===undefined?'':String(v).replace(/ +$/,'');}
function digits(v){var s=text(v);return /^\d+$/.test(s)?s.replace(/^0+(?=\d)/,''):null;}
function cents(v){var s=text(v).trim();if(!/^[+-]?\d+(\.\d{1,2})?$/.test(s))return null;var neg=s.charAt(0)==='-';s=s.replace(/^[+-]/,'');var p=s.split('.');var n=Number(p[0])*100+Number(((p[1]||'')+'00').slice(0,2));return Number.isSafeInteger(n)?(neg?-n:n):null;}
function money(n){var a=Math.abs(n);return(n<0?'-':'')+String(Math.floor(a/100))+'.'+('0'+String(a%100)).slice(-2);}
function amount(v){var n=cents(v);return n===null?v:money(n);}
function rows(v){return Array.isArray(v)?JSON.parse(JSON.stringify(v)):[];}
function tx(r){r=r||{};return{tran_id:text(r.tran_id),type_cd:text(r.type_cd),cat_cd:Number(r.cat_cd||0),source:text(r.source),desc:text(r.desc),amt:amount(r.amt),merchant_id:Number(r.merchant_id||0),merchant_name:text(r.merchant_name),merchant_city:text(r.merchant_city),merchant_zip:text(r.merchant_zip),card_num:text(r.card_num),orig_ts:text(r.orig_ts),proc_ts:text(r.proc_ts)};}
function ac(r){return{acct_id:Number(r.acct_id),active_status:text(r.active_status),curr_bal:amount(r.curr_bal),credit_limit:amount(r.credit_limit),cash_credit_limit:amount(r.cash_credit_limit),open_date:text(r.open_date),expiration_date:text(r.expiration_date),reissue_date:text(r.reissue_date),curr_cyc_credit:amount(r.curr_cyc_credit),curr_cyc_debit:amount(r.curr_cyc_debit),addr_zip:text(r.addr_zip),group_id:text(r.group_id)};}
function cb(r){return{acct_id:Number(r.acct_id),type_cd:text(r.type_cd),cat_cd:Number(r.cat_cd),bal:amount(r.bal)};}
function ck(id,type,cat){return JSON.stringify([digits(id),text(type),digits(cat)]);}
var accounts=rows(input.accounts),balances=rows(input.categoryBalances),xrefs=rows(input.cardXrefs),cards=rows(input.cards),transactions=rows(input.dailyTransactions);
var ai=Object.create(null),xi=Object.create(null),ci=Object.create(null),bi=Object.create(null);
accounts.forEach(function(r,i){var k=digits(r.acct_id);if(k!==null&&ai[k]===undefined)ai[k]=i;});xrefs.forEach(function(r,i){var k=text(r.card_num);if(xi[k]===undefined)xi[k]=i;});cards.forEach(function(r,i){var k=text(r.card_num);if(ci[k]===undefined)ci[k]=i;});balances.forEach(function(r,i){var k=ck(r.acct_id,r.type_cd,r.cat_cd);if(bi[k]===undefined)bi[k]=i;});
var posted=[],rejected=[],descriptions=['','Invalid posting data','Card cross-reference not found','Account not found','Account inactive','Card not found','Card inactive','Credit limit exceeded'];
transactions.forEach(function(raw){var r=raw||{},code=0,amt=cents(r.amt),card=text(r.card_num),cat=digits(r.cat_cd),typ=text(r.type_cd),idx,account,key,bidx,oldCat,cur,limit,credit,debit,next,nextCat,nextCredit,nextDebit;
if(amt===null||!card||cat===null||!typ)code=1;
if(!code&&xi[card]===undefined)code=2;
if(!code){var aid=digits(xrefs[xi[card]].acct_id);idx=aid===null?undefined:ai[aid];if(idx===undefined)code=3;else account=accounts[idx];}
if(!code&&text(account.active_status)!=='Y')code=4;
if(!code&&ci[card]===undefined)code=5;
if(!code&&text(cards[ci[card]].active_status)!=='Y')code=6;
if(!code){cur=cents(account.curr_bal);limit=cents(account.credit_limit);credit=cents(account.curr_cyc_credit);debit=cents(account.curr_cyc_debit);key=ck(account.acct_id,typ,r.cat_cd);bidx=bi[key];oldCat=bidx===undefined?0:cents(balances[bidx].bal);
if(cur===null||limit===null||credit===null||debit===null||oldCat===null)code=1;else if(amt>limit-cur)code=7;else{next=cur+amt;nextCat=oldCat+amt;nextCredit=credit+(amt<0?-amt:0);nextDebit=debit+(amt>0?amt:0);if(!Number.isSafeInteger(next)||!Number.isSafeInteger(nextCat)||!Number.isSafeInteger(nextCredit)||!Number.isSafeInteger(nextDebit))code=1;}}
var projected=tx(r);if(code){projected.reason=code;projected.reason_desc=descriptions[code];rejected.push(projected);}else{account.curr_bal=money(next);account.curr_cyc_credit=money(nextCredit);account.curr_cyc_debit=money(nextDebit);if(bidx===undefined){bidx=balances.length;bi[key]=bidx;balances.push({acct_id:account.acct_id,type_cd:typ,cat_cd:Number(r.cat_cd),bal:money(nextCat)});}else balances[bidx].bal=money(nextCat);posted.push(projected);}});
var ledger=[
'# Daily transaction posting assumptions','',
'These are returned datasets and Markdown text, not files. No file parsing, file creation, scheduling, persistence or INTCALC is implemented. Legacy parity has not been established.','',
'| Decision | Assumption | Wiki statement or explicit absence |','|---|---|---|',
'| In-memory input | Accept dailyTransactions, accounts, cardXrefs, cards and categoryBalances using the contract output field spellings. Cross-references supply card_num/acct_id; cards supply card_num/active_status. Missing or non-array lists are empty. | posttran-opus.pdf p.12 defines files, not an in-memory interface; p.7 defines the card and cross-reference records. The maker selected calculation-only delivery. |',
'| Cycle | businessDate defaults to 2022-07-18 and does not filter the already supplied cycle. No rollover or previous-run state is inferred. | p.12 supplies the date; p.3 leaves GDG daily-cycle semantics TODO. |',
'| Lookup | Resolve the account through cardxref. Match account/category digit identifiers as decimal strings ignoring leading zeroes; preserve card numbers as strings. Convert only required integer output fields. | p.7 defines card-account links; p.2 says Fetch Account but leaves the procedure unstated; p.12 requires integer acct_id and transaction cat_cd/merchant_id. |',
'| Order and duplicates | Process supplied transaction occurrences in order against progressive balances, without deduplication. First reference row wins for duplicate keys; retain duplicate reference rows in full snapshots. | pp.2-4 describe the loop and each transaction processed once; duplicate and order policies are unspecified. |',
'| Activity | Y means active; other account/card status values are inactive. No expiry or separate card-account agreement check. | p.3 requires active account and card; p.4 rejects account N but does not name the active value or additional checks. |',
'| Credit comparison | Signed amt must not exceed credit_limit minus progressive curr_bal. Equality passes; negative and zero amounts use the same comparison. | p.3 states available credit and must not exceed; refund exceptions are unstated. |',
'| Signed posting | Add signed amt to account and matching category balances independently of type_cd. Positive amounts increase cycle debit; negative amounts increase cycle credit by their absolute value; zero changes neither. | p.3 specifies category addition; pp.5-6 list cycle fields without sign rules or transaction-type mappings. |',
'| Category creation | Start an absent composite account/type/category balance at zero, creating it only on successful posting. | p.3 specifies the key and addition but not missing-row behaviour. |',
'| Missing references | Reject only the affected transaction on missing xref, account or card; mutate none of its balances and continue. | p.4 requires mixed valid/invalid processing but is silent about missing references. |',
'| Provisional reject reasons | 1 Invalid posting data; 2 Card cross-reference not found; 3 Account not found; 4 Account inactive; 5 Card not found; 6 Card inactive; 7 Credit limit exceeded. These codes/descriptions are invented assumptions, not COBOL values. | p.3 explicitly says See CBTRN01-03C source for exact reject reasons; those details are not supplied. |',
'| Failure precedence | Check required transaction lookup/arithmetic data, xref existence, account existence/activity, card existence/activity, required balance arithmetic, then credit limit. Invalid balance arithmetic also uses reason 1. Report the first failure. | pp.2-4 do not define precedence or malformed-data handling. |',
'| Numeric handling | Parse at-most-two-decimal amounts into safe-integer cents without rounding. Unparseable required arithmetic or unsafe result arithmetic rejects the affected occurrence as reason 1 before mutation; never inspect unused fields or filler bytes. | pp.5-8 give decimal layouts; p.12 permits at most two decimals, but malformed/overflow handling is absent. |',
'| Output projection | Emit only contract fields. Format parseable money as two-decimal strings without changing its value; retain supplied unparseable amounts unchanged, never replace them with zero. Required integer fields are transaction cat_cd/merchant_id, reject reason, account acct_id and category acct_id/cat_cd. All other fields are strings or decimal money. Missing text becomes empty string; missing transaction merchant_id defaults to zero. Contract-conformant structured input is otherwise expected. | p.12 fixes fields, integer annotations and money formats but not defaults for missing structured fields; category key types follow corresponding account and transaction fields. |',
'| Preservation | Keep every supplied account/category row, all unrelated declared fields and original transaction timestamps. Only successful posting updates current balance, cycle totals and category bal. No replacement proc_ts. | p.12 requires all accounts/categories after posting; pp.2-4 do not specify timestamp rewriting or changes to unrelated account fields. |',
'| No extra checks | No customer, disclosure-group, transaction-type/category reference validation, cash-limit rule, expiry/date checks, interest calculation, replay protection or cross-run deduplication. | p.12 lists shared-chain inputs; pp.2-4 prescribe only account/card activity and available-credit posting checks, not these additional behaviours. |',
'| Notes drafting | The model drafts only an introduction from this ledger, never from financial records. Append this entire original ledger unchanged. On timeout, failure, absent or malformed response, return the ledger alone. | Presentation implementation default for the requested source-linked assumption notes; the wiki specifies no generation behaviour. |'
].join('\n');
output={postingData:{'posttran_transact.json':posted,'posttran_dalyrejs.json':rejected,'posttran_acctdata.json':accounts.map(ac),'posttran_tcatbal.json':balances.map(cb)},assumptionLedger:ledger};
```

### Assemble results (SCRIPT, id=6ae09550ad7ea9e18be4242d)

```javascript
var d=input.postingData||{};var ledger=typeof input.assumptionLedger==='string'?input.assumptionLedger:'';var a=input.assumptionDraft;var intro=a&&typeof a.markdown==='string'?a.markdown.trim():'';output={postingResult:{'posttran_transact.json':d['posttran_transact.json']||[],'posttran_dalyrejs.json':d['posttran_dalyrejs.json']||[],'posttran_acctdata.json':d['posttran_acctdata.json']||[],'posttran_tcatbal.json':d['posttran_tcatbal.json']||[],'assumptions.md':(intro?intro+'\n\n':'')+ledger}};
```

### Draft assumption notes failed (SCRIPT, id=6ae09550ad7ea9e18be4242e)

```javascript
output = {"assumptionDraft": {}};

```

_(server: 185 ms, 1 API call, 182 ms in API)_
