# Workflow: PostDailyTransactions

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** 

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6adf40b616836599f3946278 | <uuid> | (0, 0) | → Transform (seq:<uuid>) |
| End | END | 6adf40b616836599f3946279 | <uuid> | (1200, 0) | — |
| Transform | SCRIPT | 6adf40b616836599f394627a | <uuid> | (300, 0) | → DraftAssumptions (seq:<uuid>) | lang: JAVASCRIPT |
| DraftAssumptions | AI | 6adf40b616836599f394627b | <uuid> | (600, 0) | → FinalizeAssumptions [SUCCESS] (seq:<uuid>), → DraftAssumptions failed [FAIL] (seq:<uuid>) | responseKey: assumptionsDraft, aiType: TEXT_UNDERSTANDING, responseSchema: set |
| FinalizeAssumptions | SCRIPT | 6adf40b616836599f394627c | <uuid> | (900, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| DraftAssumptions failed | SCRIPT | 6adf40b616836599f394627d | <uuid> | (600, 200) | → FinalizeAssumptions (seq:<uuid>) | lang: JAVASCRIPT |

## Systems
_(none)_

## AI prompts

### DraftAssumptions (TEXT_UNDERSTANDING, id=6adf40b616836599f394627b)
instructions:

```
Draft one concise explanatory sentence per assumption in the supplied authoritative register. Return entries with id, whatAssumed, wikiBasis, explanation. Copy id, whatAssumed and wikiBasis EXACTLY, without changing punctuation or wording. Cover every register entry exactly once. Explanation must only clarify that entry's already stated decision and cited evidence or explicit absence. Never infer additional accounting rules or use outside knowledge. Preserve provisional reject-code status and uncertainty. Never claim legacy/oracle parity, physical file creation or delivery, persistence, or scheduling. You receive no customer, card or transaction records; do not request them. Output only the specified JSON object.
```
userMessage:

```
Authoritative implementation assumptions and wiki basis:
${assumptionRegister}
```
exampleOutputJsonSchema:

```
{"title":"Response","type":"object","required":["entries"],"properties":{"entries":{"type":"array","items":{"type":"object","required":["id","whatAssumed","wikiBasis","explanation"],"properties":{"id":{"type":"string"},"wikiBasis":{"type":"string"},"explanation":{"type":"string"},"whatAssumed":{"type":"string"}},"additionalProperties":false}}},"additionalProperties":false}
```

## Scripts

### Transform (SCRIPT, id=6adf40b616836599f394627a)

```javascript
var register = [];
function assumption(id, what, basis) { register.push({id:id,whatAssumed:what,wikiBasis:basis}); }
assumption('A01','This core accepts decoded records and returns named JSON collections and assumptions text; it does not read or write physical files.','posttran-opus.pdf p.12: CONTRACT.md requests fixed-width inputs and separate output files. Maker selected the decoded-record core with file decoding and delivery excluded.');
assumption('A02','Use CONTRACT.md transaction/account/category field names; cross-references use card_num/acct_id and cards use card_num/card_acct_id/active_status. Ignore unused card/customer fields.','posttran-opus.pdf pp.7,12: the contract defines output names but not decoded input naming. CardXref links card to account; Card.cardAccountId identifies its account.');
assumption('A03','Process every input row once in supplied order, including repeated transaction IDs, using cumulative updated balances. No persistent replay protection exists.','posttran-opus.pdf p.4: each transaction processed once; no duplicate-input, ordering or cross-run idempotency rule is provided.');
assumption('A04','Resolve an account using the card cross-reference; missing cross-references and missing accounts reject the transaction.','posttran-opus.pdf pp.2,7: fetch owning account; CardXref links card and account. Missing-link handling is absent.');
assumption('A05','Only account and card active_status Y is active; every other one-character status is inactive.','posttran-opus.pdf pp.3,4,7: account and card must be active; account status N is rejected. Active code definitions are not supplied.');
assumption('A06','A card must exist and its card_acct_id must match the cross-reference account; otherwise reject.','posttran-opus.pdf pp.3,7: card must be active and both ownership relationships are documented; missing-card and inconsistent-owner handling are absent.');
assumption('A07','Use first-failure provisional rejects: 1 Card cross-reference not found; 2 Account not found; 3 Account inactive; 4 Card not found; 5 Card inactive; 6 Card account mismatch; 7 Credit limit exceeded. These are NOT authoritative legacy codes.','posttran-opus.pdf p.3: TODO says to consult CBTRN01-03C for exact reject reasons; those sources are not supplied. Codes, descriptions and precedence are unspecified.');
assumption('A08','Reject whenever the signed amount exceeds credit_limit minus current cumulative balance, including negative amounts when that formula fails. Rejects change no balance.','posttran-opus.pdf pp.3,4: transaction must not exceed available credit; over-limit transactions are not posted. No separate credit/refund exception is stated.');
assumption('A09','Add each posted signed amount to account current balance and to the category balance identified by account, type and category. Create a missing category from zero.','posttran-opus.pdf pp.2,3,8: update account balances and add amount to matching category composite key; missing-category creation is unspecified.');
assumption('A10','Positive amounts increase curr_cyc_debit; negative amounts increase curr_cyc_credit by absolute value; zero changes neither. Do not derive direction from type codes.','posttran-opus.pdf pp.5,6: cycle credit and debit fields are listed, but posting sign rules and transaction-type direction mappings are absent.');
assumption('A11','Preserve other account values and transaction timestamps. Do not add expiration, cash-limit, customer, disclosure-group, or reference-code validation.','posttran-opus.pdf pp.2-4: posting rules specify active account/card, available credit and category increments only. The extra checks are not stated.');
assumption('A12','Business date defaults to 2022-07-18 and is context only: no record date filtering or timestamp replacement. INTCALC parameter is unused.','posttran-opus.pdf pp.4,10,12: business date selects a daily file and the contract gives this date; after file selection no row-date filter or timestamp stamping rule is specified. INTCALC is a different step.');
assumption('A13','Use integer cents internally and fixed two-decimal output strings. Reject excess precision instead of rounding; signed account values allow ten integer digits, transaction/category values nine.','posttran-opus.pdf pp.5,7,8,12: signed copybook numeric sizes and output maximum of two decimals are supplied; rounding and overflow recovery are not.');
assumption('A14','All five input arrays and required scalar fields must exist. Malformed values, duplicate master keys or arithmetic overflow fail the entire calculation, with outputs null and a non-sensitive error; never expose a partial result.','posttran-opus.pdf pp.5-8: types, required flags and unique/composite keys are supplied. Malformed-input, duplicate-master and overflow recovery rules are absent.');
assumption('A15','Trim trailing ASCII spaces from text; enforce documented maximum widths and integer ID/code widths. Treat dates/timestamps as opaque text within their copybook widths rather than inventing calendar rules.','posttran-opus.pdf pp.5-8,12: character widths and dates/timestamps are listed, and trailing spaces may be omitted; calendar-validation and invalid-date recovery are unspecified.');
assumption('A16','Missing optional transaction text becomes an empty string and missing optional merchant_id becomes zero. Missing optional account reissue_date, addr_zip and group_id become empty strings. Required values are never invented.','posttran-opus.pdf pp.6-8,12: these attributes are optional but the output field list is fixed; null/default conventions are not specified.');
assumption('A17','Return all accounts and category balances, even untouched ones, with contract fields only; posted/rejected transactions preserve their normalized input field values.','posttran-opus.pdf p.12: every account and every category balance after posting; transaction fields fixed; output order unrestricted.');
assumption('A18','Empty daily input with valid master arrays succeeds unchanged. Every run starts from the supplied master snapshots, with no database writes, GDG advancement or scheduling.','posttran-opus.pdf pp.3,4,10: empty daily file completes without posting; GDG semantics and exact schedule are TODO. The selected scope is the calculation core only.');
assumption('A19','Every returned assumption has separate whatAssumed/wikiBasis properties and a Markdown table row. A model receives only this register to draft explanations, never financial records or decisions.','Maker requested each assumption and its wiki basis. posttran-opus.pdf is silent on documentation generation; the confirmed design isolates wording generation from accounting.');
assumption('A20','Retain every authoritative assumption verbatim. Accept a model explanation only for a recognized ID with exactly matching assumption and basis; failed, malformed or incomplete drafts fall back to register-only documentation without changing financial status or results.','posttran-opus.pdf does not specify assumptions-drafting failures. Confirmed implementation default: documentation generation cannot discard financial results or authoritative assumptions.');
assumption('A21','Do not produce interest outputs or optional flags, and do not claim oracle parity.','posttran-opus.pdf pp.3,12,13: INTCALC is isolated from POSTTRAN; exact rejects are unresolved; optional flags reference PROTOCOL.md, which is not supplied.');
var result = {status:'failed',outputs:null,error:null};
function bad(message) { throw new Error(message); }
function object(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
function text(v, key, max, optional) { if(v === undefined || v === null) { if(optional) return ''; bad('Missing required text: '+key); } if(typeof v !== 'string') bad('Invalid text: '+key); var s=v.replace(/ +$/,''); if(s.length>max || (!optional && !s.length)) bad('Invalid text width: '+key); return s; }
function integer(v,key,max,optional) { if((v === undefined || v === null) && optional) return 0; if(typeof v !== 'number' || !isFinite(v) || Math.floor(v)!==v || v<0 || v>max) bad('Invalid integer: '+key); return v; }
function money(v,key,max) { if(typeof v!=='string' && typeof v!=='number') bad('Invalid amount: '+key); if(typeof v==='number' && !isFinite(v)) bad('Invalid amount: '+key); var s=String(v); if(!/^-?\d+(\.\d{1,2})?$/.test(s)) bad('Invalid monetary precision: '+key); var neg=s.charAt(0)==='-'; if(neg) s=s.slice(1); var p=s.split('.'); var c=Number(p[0])*100+Number(((p[1]||'')+'00').slice(0,2)); if(!isFinite(c) || c>max || Math.floor(c)!==c) bad('Monetary overflow: '+key); return neg ? -c : c; }
function amount(c) { var a=Math.abs(c); return (c<0?'-':'')+String(Math.floor(a/100))+'.'+('0'+String(a%100)).slice(-2); }
function bound(c,max) { if(!isFinite(c)||Math.floor(c)!==c||Math.abs(c)>max) bad('Monetary overflow during posting'); return c; }
function key(ac,ty,ca) { return JSON.stringify([ac,ty,ca]); }
function unique(map,k,val) { if(Object.prototype.hasOwnProperty.call(map,k)) bad('Duplicate master key'); map[k]=val; }
try {
  var names=['dailyTransactions','accounts','cardXrefs','cards','categoryBalances'];
  for(var n=0;n<names.length;n++) if(!Array.isArray(input[names[n]])) bad('Missing or invalid input array: '+names[n]);
  var am={},xm={},cm={},bm={}, accounts=[], balances=[];
  var acmax=999999999999, txmax=99999999999;
  for(var i=0;i<input.accounts.length;i++) {
    var a=input.accounts[i]; if(!object(a)) bad('Invalid account record');
    var row={acct_id:integer(a.acct_id,'acct_id',99999999999,false),active_status:text(a.active_status,'active_status',1,false),curr_bal:amount(money(a.curr_bal,'curr_bal',acmax)),credit_limit:amount(money(a.credit_limit,'credit_limit',acmax)),cash_credit_limit:amount(money(a.cash_credit_limit,'cash_credit_limit',acmax)),open_date:text(a.open_date,'open_date',10,false),expiration_date:text(a.expiration_date,'expiration_date',10,false),reissue_date:text(a.reissue_date,'reissue_date',10,true),curr_cyc_credit:amount(money(a.curr_cyc_credit,'curr_cyc_credit',acmax)),curr_cyc_debit:amount(money(a.curr_cyc_debit,'curr_cyc_debit',acmax)),addr_zip:text(a.addr_zip,'addr_zip',10,true),group_id:text(a.group_id,'group_id',10,true)};
    var wrap={row:row,current:money(row.curr_bal,'curr_bal',acmax),limit:money(row.credit_limit,'credit_limit',acmax),credit:money(row.curr_cyc_credit,'curr_cyc_credit',acmax),debit:money(row.curr_cyc_debit,'curr_cyc_debit',acmax)};
    unique(am,'a'+row.acct_id,wrap); accounts.push(wrap);
  }
  for(var j=0;j<input.cardXrefs.length;j++) { var x=input.cardXrefs[j]; if(!object(x)) bad('Invalid cross-reference record'); var xn=text(x.card_num,'card_num',16,false); unique(xm,'c'+xn,integer(x.acct_id,'acct_id',99999999999,false)); }
  for(var k=0;k<input.cards.length;k++) { var c=input.cards[k]; if(!object(c)) bad('Invalid card record'); var cn=text(c.card_num,'card_num',16,false); unique(cm,'c'+cn,{account:integer(c.card_acct_id,'card_acct_id',99999999999,false),status:text(c.active_status,'active_status',1,false)}); }
  for(var l=0;l<input.categoryBalances.length;l++) { var b=input.categoryBalances[l]; if(!object(b)) bad('Invalid category record'); var br={acct_id:integer(b.acct_id,'acct_id',99999999999,false),type_cd:text(b.type_cd,'type_cd',2,false),cat_cd:integer(b.cat_cd,'cat_cd',9999,false),bal:amount(money(b.bal,'bal',txmax))}; var bw={row:br,cents:money(br.bal,'bal',txmax)}; unique(bm,key(br.acct_id,br.type_cd,br.cat_cd),bw); balances.push(bw); }
  var posted=[], rejected=[];
  var reasons=['','Card cross-reference not found','Account not found','Account inactive','Card not found','Card inactive','Card account mismatch','Credit limit exceeded'];
  for(var t=0;t<input.dailyTransactions.length;t++) {
    var q=input.dailyTransactions[t]; if(!object(q)) bad('Invalid transaction record');
    var tr={tran_id:text(q.tran_id,'tran_id',16,false),type_cd:text(q.type_cd,'type_cd',2,false),cat_cd:integer(q.cat_cd,'cat_cd',9999,false),source:text(q.source,'source',10,true),desc:text(q.desc,'desc',100,true),amt:amount(money(q.amt,'amt',txmax)),merchant_id:integer(q.merchant_id,'merchant_id',999999999,true),merchant_name:text(q.merchant_name,'merchant_name',50,true),merchant_city:text(q.merchant_city,'merchant_city',50,true),merchant_zip:text(q.merchant_zip,'merchant_zip',10,true),card_num:text(q.card_num,'card_num',16,false),orig_ts:text(q.orig_ts,'orig_ts',26,true),proc_ts:text(q.proc_ts,'proc_ts',26,true)};
    var cents=money(tr.amt,'amt',txmax), ck='c'+tr.card_num, owner=xm[ck], aw=am['a'+owner], card=cm[ck], reason=0;
    if(!Object.prototype.hasOwnProperty.call(xm,ck)) reason=1;
    else if(!aw) reason=2;
    else if(aw.row.active_status!=='Y') reason=3;
    else if(!card) reason=4;
    else if(card.status!=='Y') reason=5;
    else if(card.account!==owner) reason=6;
    else if(cents>aw.limit-aw.current) reason=7;
    if(reason) { tr.reason=reason; tr.reason_desc=reasons[reason]; rejected.push(tr); }
    else {
      var bk=key(owner,tr.type_cd,tr.cat_cd), category=bm[bk];
      if(!category) { category={row:{acct_id:owner,type_cd:tr.type_cd,cat_cd:tr.cat_cd,bal:'0.00'},cents:0}; bm[bk]=category; balances.push(category); }
      aw.current=bound(aw.current+cents,acmax);
      if(cents>0) aw.debit=bound(aw.debit+cents,acmax);
      if(cents<0) aw.credit=bound(aw.credit-cents,acmax);
      category.cents=bound(category.cents+cents,txmax); posted.push(tr);
    }
  }
  var aout=[],bout=[];
  for(var ai=0;ai<accounts.length;ai++) { var ar=accounts[ai]; ar.row.curr_bal=amount(ar.current); ar.row.curr_cyc_credit=amount(ar.credit); ar.row.curr_cyc_debit=amount(ar.debit); aout.push(ar.row); }
  for(var bi=0;bi<balances.length;bi++) { balances[bi].row.bal=amount(balances[bi].cents); bout.push(balances[bi].row); }
  var outs={}; outs['posttran_transact.json']=posted; outs['posttran_dalyrejs.json']=rejected; outs['posttran_acctdata.json']=aout; outs['posttran_tcatbal.json']=bout;
  result={status:'completed',outputs:outs,error:null};
} catch(e) { result={status:'failed',outputs:null,error:(e && e.message)?String(e.message):'Invalid posting input'}; }
output={calculation:result,assumptionRegister:register};
```

### FinalizeAssumptions (SCRIPT, id=6adf40b616836599f394627c)

```javascript
var register=Array.isArray(input.assumptionRegister)?input.assumptionRegister:[];
var calculation=input.calculation || {status:'failed',outputs:null,error:'Posting calculation unavailable'};
var candidates=(input.assumptionsDraft && Array.isArray(input.assumptionsDraft.entries))?input.assumptionsDraft.entries:[];
var entries=[], explanations=[];
function cell(v) { return String(v).replace(/\|/g,'\\|').replace(/\r?\n/g,'<br>'); }
var lines=['# Daily transaction posting assumptions','','This is a decoded-record posting core. Returned collections are not physical files. Provisional choices do not establish legacy/oracle equivalence.','','| What was assumed | Wiki statement (or absence) |','| --- | --- |'];
for(var i=0;i<register.length;i++) {
  var a=register[i], entry={id:a.id,whatAssumed:a.whatAssumed,wikiBasis:a.wikiBasis};
  var matches=[];
  for(var j=0;j<candidates.length;j++) if(candidates[j] && candidates[j].id===a.id) matches.push(candidates[j]);
  if(matches.length===1) { var d=matches[0]; if(d.whatAssumed===a.whatAssumed && d.wikiBasis===a.wikiBasis && typeof d.explanation==='string' && d.explanation.trim().length>0) { entry.explanation=d.explanation; explanations.push('### '+a.id+' — model-drafted explanation\n'+d.explanation); } }
  entries.push(entry); lines.push('| '+cell(a.id+': '+a.whatAssumed)+' | '+cell(a.wikiBasis)+' |');
}
if(explanations.length) { lines.push('','## Model-drafted explanations','These explanations do not replace the authoritative assumptions above.','',explanations.join('\n\n')); }
output={postingResult:{status:calculation.status,outputs:calculation.outputs,assumptionEntries:entries,assumptions:lines.join('\n'),error:calculation.error}};
```

### DraftAssumptions failed (SCRIPT, id=6adf40b616836599f394627d)

```javascript
output = {"assumptionsDraft": {}};

```

_(server: 261 ms, 1 API call, 257 ms in API)_
