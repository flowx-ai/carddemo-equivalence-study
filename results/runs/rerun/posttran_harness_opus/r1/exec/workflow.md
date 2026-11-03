# Workflow: PostDailyTransactions

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** 

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae08bd0ad7ea9e18be422cf | <uuid> | (0, 0) | → Transform (seq:<uuid>) |
| End | END | 6ae08bd0ad7ea9e18be422d0 | <uuid> | (1200, 0) | — |
| Transform | SCRIPT | 6ae08bd0ad7ea9e18be422d1 | <uuid> | (300, 0) | → Draft assumptions (seq:<uuid>) | lang: JAVASCRIPT |
| Draft assumptions | AI | 6ae08bd0ad7ea9e18be422d2 | <uuid> | (600, 0) | → Assemble result [SUCCESS] (seq:<uuid>), → Draft assumptions failed [FAIL] (seq:<uuid>) | responseKey: assumptionsDraft, aiType: TEXT_UNDERSTANDING, responseSchema: set |
| Assemble result | SCRIPT | 6ae08bd0ad7ea9e18be422d3 | <uuid> | (900, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| Draft assumptions failed | SCRIPT | 6ae08bd0ad7ea9e18be422d4 | <uuid> | (600, 200) | → Assemble result (seq:<uuid>) | lang: JAVASCRIPT |

## Systems
_(none)_

## AI prompts

### Draft assumptions (TEXT_UNDERSTANDING, id=6ae08bd0ad7ea9e18be422d2)
instructions:

```
Draft the requested assumptions report using only the supplied evidence register. This is explanation writing, not financial decision-making. For every register entry return one assumptionEntries item with the same decisionNumber, a clear English assumed explanation of implementedDecision, and a wikiBasis explanation quoting or accurately paraphrasing wikiStatement and including wikiPage verbatim. Explicitly say when sourceIsSilent is true: the source does not specify the rule, and the decision is an assumption. Preserve all details and local reason numbers. Do not invent rules, source quotations, source pages, legacy-parity claims or file-writing claims. Also return markdown containing one table row per entry under columns What was assumed and Wiki statement or omission. Use the exact assumed and wikiBasis text of each returned item in that row. The reduced implementation returns datasets and report text, not files. Do not inspect or request transaction records, account records or card numbers.
```
userMessage:

```
Write each assumption and its wiki basis from this complete implemented-decision register: ${assumptionEvidence}
```
exampleOutputJsonSchema:

```
{"title":"Response","type":"object","required":["assumptionEntries","markdown"],"properties":{"markdown":{"type":"string"},"assumptionEntries":{"type":"array","items":{"type":"object","required":["decisionNumber","assumed","wikiBasis"],"properties":{"assumed":{"type":"string"},"wikiBasis":{"type":"string"},"decisionNumber":{"type":"integer"}},"additionalProperties":false}}},"additionalProperties":false}
```

## Scripts

### Transform (SCRIPT, id=6ae08bd0ad7ea9e18be422d1)

```javascript
function text(v) { return v === undefined || v === null ? '' : String(v).trim(); }
function identifier(v) { var s = text(v); while (s.length > 1 && s.charAt(0) === '0') { s = s.substring(1); } return s; }
function integer(v) { var s = text(v); if (/^\d+$/.test(s)) { return Number(s); } return v; }
function cents(v) { var s = text(v); if (!/^[+-]?\d+(\.\d{1,2})?$/.test(s)) { return null; } var neg = s.charAt(0) === '-'; if (neg || s.charAt(0) === '+') { s = s.substring(1); } var p = s.split('.'); var f = (p.length > 1 ? p[1] : '') + '00'; var n = Number(p[0]) * 100 + Number(f.substring(0,2)); if (!Number.isSafeInteger(n)) { return null; } return neg ? -n : n; }
function money(n) { var a = Math.abs(n); var f = String(a % 100); if (f.length < 2) { f = '0' + f; } return (n < 0 ? '-' : '') + String(Math.floor(a / 100)) + '.' + f; }
function amount(v) { var n = cents(v); return n === null ? v : money(n); }
function txn(t) { t = t || {}; return {tran_id:t.tran_id,type_cd:t.type_cd,cat_cd:integer(t.cat_cd),source:t.source,desc:t.desc,amt:amount(t.amt),merchant_id:integer(t.merchant_id),merchant_name:t.merchant_name,merchant_city:t.merchant_city,merchant_zip:t.merchant_zip,card_num:t.card_num,orig_ts:t.orig_ts,proc_ts:t.proc_ts}; }
function account(a) { a = a || {}; return {acct_id:integer(a.acct_id),active_status:a.active_status,curr_bal:amount(a.curr_bal),credit_limit:amount(a.credit_limit),cash_credit_limit:amount(a.cash_credit_limit),open_date:a.open_date,expiration_date:a.expiration_date,reissue_date:a.reissue_date,curr_cyc_credit:amount(a.curr_cyc_credit),curr_cyc_debit:amount(a.curr_cyc_debit),addr_zip:a.addr_zip,group_id:a.group_id}; }
function category(c) { c = c || {}; return {acct_id:integer(c.acct_id),type_cd:c.type_cd,cat_cd:integer(c.cat_cd),bal:amount(c.bal)}; }
function findCard(rows, card) { for (var j=0;j<rows.length;j++) { if (rows[j] && text(rows[j].card_num) === text(card)) { return j; } } return -1; }
function findAccount(rows, id) { for (var j=0;j<rows.length;j++) { if (rows[j] && identifier(rows[j].acct_id) === identifier(id)) { return j; } } return -1; }
function findCategory(rows, id, type, cat) { for (var j=0;j<rows.length;j++) { var c=rows[j]; if (c && identifier(c.acct_id)===identifier(id) && text(c.type_cd)===text(type) && identifier(c.cat_cd)===identifier(cat)) { return j; } } return -1; }
var evidence=[];
function note(decision, statement, page, silent) { evidence.push({decisionNumber:evidence.length+1,implementedDecision:decision,wikiStatement:statement,wikiPage:'posttran-opus.pdf p.'+page,sourceIsSilent:silent}); }
note('This reduced implementation accepts decoded records and returns datasets and Markdown, not physical files.','Contract: One JSON file per output: a list of objects, in any order. The maker explicitly selected a reduced return-value implementation.',12,false);
note('Decoded transactions and accounts use CONTRACT.md field names. Cards and cross-references use card_num and acct_id; cards also use active_status.','The contract names copybooks and record widths, but supplies no decoded card or cross-reference JSON schema. Wiki card and cross-reference ownership fields are listed on p.7.',12,true);
note('Both card and account active_status must equal Y after trimming spaces.','PostingValidation: account must be active; transaction must not exceed available credit (creditLimit - currentBalance); card active. Acceptance rejects account status N. The active encoding Y is not explicitly stated.',3,true);
note('Account ownership is resolved through cardxref, using the transaction card number.','CardXref links card to customer to account. The posting description does not specify the exact ownership lookup.',7,true);
note('Reject precedence is missing cross-reference, missing account, missing card, inactive account, inactive card, unreadable calculation value, then available credit exceeded.','The wiki names status, credit and card checks but gives no precedence for simultaneously failing checks.',3,true);
note('Local integer reject reasons are 1 cross-reference missing, 2 account missing, 3 card missing, 4 account inactive, 5 card inactive, 6 available credit exceeded, 7 required posting value unreadable; descriptions state these meanings.','See CBTRN01-03C source for exact reject reasons. Those sources are not included in this attachment.',3,true);
note('When lookup keys repeat, the first matching account, card, cross-reference or category row is used; other rows remain present.','The data model describes unique or composite keys but does not define duplicate decoded-input handling.',7,true);
note('Process daily transactions in received order against balances updated by earlier successful postings.','For each transaction: iterate input main read loop; Save Account + Balances; Next transaction.',2,false);
note('Repeated transaction identifiers are processed again, once for every supplied row; no deduplication is added.','Data Mapping Verification: each transaction processed once. The wiki does not specify duplicate suppression.',4,true);
note('Add each successful signed transaction amount to the account current balance and to its category balance.','UpdateCategoryBalance: add transaction amount to the matching TransactionCategoryBalance. Account balance updates are required but their exact signed arithmetic is not stated.',3,true);
note('Positive amounts increase current-cycle debits; negative amounts increase current-cycle credits by their absolute value; zero changes neither.','The model names currentCycleCredit and currentCycleDebit, but gives no posting formula or transaction-type mapping.',5,true);
note('Compare the signed amount directly with creditLimit minus currentBalance, without a special refund or transaction-type exemption.','PostingValidation: transaction must not exceed available credit (creditLimit - currentBalance). No special negative-amount rule is given.',3,true);
note('Create a missing account/type/category balance with opening balance zero before adding a successful amount.','UpdateCategoryBalance gives the matching composite key and addition rule, but no missing-category rule.',3,true);
note('Use integer cents for arithmetic and emit amounts as two-decimal strings; do not introduce interest or intermediate rounding.','Amounts are JSON strings or numbers holding at most two decimals.',12,false);
note('Match digit identifiers as strings, ignoring leading zero padding; convert account and merchant identifiers and category codes to integers only when forming contract output. Card numbers remain strings.','CONTRACT.md requires acct_id, merchant_id and cat_cd as integers; card_num is a transaction field. The wiki gives fixed-width identifiers.',12,true);
note('Preserve orig_ts and proc_ts from every input transaction; do not generate a new processing timestamp.','The transaction model lists originTimestamp and processTimestamp, but specifies no timestamp rewrite during posting.',8,true);
note('Treat businessDate as run metadata, defaulting to 2022-07-18; do not filter transactions by timestamps.','Business date / cycle: Which daily file is posted. The reduced implementation already receives its selected daily records.',4,true);
note('Return all accounts and category rows, including unused rows; only successful postings change the balances of matched rows.','CONTRACT.md requires account fields for every account after posting and category fields for every category balance after posting.',12,false);
note('Unreadable values required for an individual posting produce local reject 7; continue with later records and leave that transaction balances unchanged.','Mixed valid/invalid: valid posted, invalid rejected. The wiki does not define malformed decoded-record handling.',4,true);
note('Missing required list inputs fail the batch without partial datasets; an explicitly empty daily list completes without changes.','Empty daily file: Run completes, nothing posted. Missing decoded-list envelope behaviour is not specified.',4,true);
note('Do not validate filler, customer details, unused merchant details, expiration dates, cash-credit limits or reference data as additional posting rules.','PostingValidation names account status, available credit and card active status. No other posting validation is stated.',3,true);
note('No nightly schedule is installed in this reduced calculation.','The trigger inventory suggests nightly processing and says cron is to be defined per operations window.',10,false);
note('No database writes occur: updated accounts and category balances are returned to the caller. Every invocation starts from its supplied records.','The wiki Save Account + Balances integration persists records; the maker selected a reduced return-value implementation.',3,false);
note('Repeating a run with previously updated balances can post transactions again; no cross-run idempotency ledger is added.','GDG daily-cycle semantics are explicitly TODO; no repeat-run deduplication rule is supplied.',3,true);
note('A model drafts the explanation of each implemented decision from this register and cited statements, without making financial decisions. Failed or incomplete drafting uses deterministic source-linked explanations and Markdown.','The maker requested assumptions with their wiki basis; the wiki specifies no explanation-generation mechanism.',12,true);
var result={status:'completed',error:'',postedTransactions:[],rejectedTransactions:[],accounts:[],categoryBalances:[]};
var required=['dailyTransactions','accounts','cards','cardXrefs','categoryBalances'];
for (var r=0;r<required.length;r++) { if (!Array.isArray(input[required[r]])) { result.status='failed'; result.error += (result.error ? '; ' : '') + 'Missing or non-list input: ' + required[r]; } }
if (result.status === 'completed') {
 for (var a=0;a<input.accounts.length;a++) { result.accounts.push(account(input.accounts[a])); }
 for (var b=0;b<input.categoryBalances.length;b++) { result.categoryBalances.push(category(input.categoryBalances[b])); }
 for (var i=0;i<input.dailyTransactions.length;i++) {
  var original=input.dailyTransactions[i] || {}; var t=txn(original); var reason=0; var description='';
  var xi=findCard(input.cardXrefs, original.card_num); var ai=-1; var ci=-1; var bi=-1;
  if (xi<0) { reason=1; description='Card cross-reference not found'; }
  if (!reason) { ai=findAccount(input.accounts,input.cardXrefs[xi].acct_id); if(ai<0) { reason=2; description='Account not found'; } }
  if (!reason) { ci=findCard(input.cards,original.card_num); if(ci<0) { reason=3; description='Card not found'; } }
  if (!reason && text(input.accounts[ai].active_status)!=='Y') { reason=4; description='Account inactive'; }
  if (!reason && text(input.cards[ci].active_status)!=='Y') { reason=5; description='Card inactive'; }
  var amt=null; var current=null; var limit=null; var credits=null; var debits=null; var oldCategory=0;
  if (!reason) {
   var acc=result.accounts[ai]; amt=cents(original.amt); current=cents(acc.curr_bal); limit=cents(acc.credit_limit); credits=cents(acc.curr_cyc_credit); debits=cents(acc.curr_cyc_debit);
   bi=findCategory(result.categoryBalances,acc.acct_id,original.type_cd,original.cat_cd);
   if (bi>=0) { oldCategory=cents(result.categoryBalances[bi].bal); }
   if (amt===null || current===null || limit===null || credits===null || debits===null || oldCategory===null || !text(original.type_cd) || !/^\d+$/.test(text(original.cat_cd)) || !Number.isSafeInteger(current+amt) || !Number.isSafeInteger(oldCategory+amt) || !Number.isSafeInteger(credits+(amt<0?-amt:0)) || !Number.isSafeInteger(debits+(amt>0?amt:0))) { reason=7; description='Required posting value unreadable'; }
  }
  if (!reason && amt > limit-current) { reason=6; description='Available credit exceeded'; }
  if (reason) { t.reason=reason; t.reason_desc=description; result.rejectedTransactions.push(t); }
  else {
   result.accounts[ai].curr_bal=money(current+amt);
   result.accounts[ai].curr_cyc_credit=money(credits+(amt<0?-amt:0)); result.accounts[ai].curr_cyc_debit=money(debits+(amt>0?amt:0));
   if (bi<0) { result.categoryBalances.push({acct_id:result.accounts[ai].acct_id,type_cd:original.type_cd,cat_cd:integer(original.cat_cd),bal:money(amt)}); }
   else { result.categoryBalances[bi].bal=money(oldCategory+amt); }
   result.postedTransactions.push(t);
  }
 }
}
output={postingData:result,assumptionEvidence:evidence};
```

### Assemble result (SCRIPT, id=6ae08bd0ad7ea9e18be422d3)

```javascript
var data=input.postingData || {status:'failed',error:'Posting calculation did not return its result',postedTransactions:[],rejectedTransactions:[],accounts:[],categoryBalances:[]};
var evidence=Array.isArray(input.assumptionEvidence)?input.assumptionEvidence:[];
var draft=input.assumptionsDraft || {}; var entries=Array.isArray(draft.assumptionEntries)?draft.assumptionEntries:[]; var markdown=typeof draft.markdown==='string'?draft.markdown:''; var valid=entries.length===evidence.length && evidence.length>0 && markdown.indexOf('What was assumed')>=0 && markdown.indexOf('Wiki statement or omission')>=0;
for (var i=0;i<evidence.length;i++) { var count=0; for(var j=0;j<entries.length;j++) { var e=entries[j] || {}; if(e.decisionNumber===evidence[i].decisionNumber) { count++; if(typeof e.assumed!=='string' || !e.assumed.trim() || typeof e.wikiBasis!=='string' || e.wikiBasis.indexOf(evidence[i].wikiPage)<0 || markdown.indexOf(e.assumed)<0 || markdown.indexOf(e.wikiBasis)<0) { valid=false; } } } if(count!==1) { valid=false; } }
if(!valid) { entries=[]; markdown='| What was assumed | Wiki statement or omission |\n| --- | --- |\n'; for(var k=0;k<evidence.length;k++) { var src=evidence[k]; var basis=src.wikiPage+': '+src.wikiStatement+(src.sourceIsSilent?' This rule is uncertain or unstated in the source; the implementation uses the declared assumption.':''); entries.push({decisionNumber:src.decisionNumber,assumed:src.implementedDecision,wikiBasis:basis}); markdown+='| '+src.implementedDecision.replace(/\|/g,'\\|').replace(/\n/g,' ')+' | '+basis.replace(/\|/g,'\\|').replace(/\n/g,' ')+' |\n'; } }
output={postingResult:{status:data.status,error:data.error,postedTransactions:data.postedTransactions,rejectedTransactions:data.rejectedTransactions,accounts:data.accounts,categoryBalances:data.categoryBalances,assumptionEntries:entries,assumptions:markdown}};
```

### Draft assumptions failed (SCRIPT, id=6ae08bd0ad7ea9e18be422d4)

```javascript
output = {"assumptionsDraft": {}};

```

_(server: 184 ms, 1 API call, 182 ms in API)_
