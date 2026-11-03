# Workflow: PostDailyTransactions

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** 

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae55b443695c563ea5158e0 | <uuid> | (0, 0) | → Calculate posting (seq:<uuid>) |
| End | END | 6ae55b443695c563ea5158e1 | <uuid> | (1200, 0) | — |
| Calculate posting | SCRIPT | 6ae55b443695c563ea5158e2 | <uuid> | (300, 0) | → Draft assumptions (seq:<uuid>) | lang: JAVASCRIPT |
| Draft assumptions | AI | 6ae55b443695c563ea5158e3 | <uuid> | (600, 0) | → Render assumptions [SUCCESS] (seq:<uuid>), → Draft assumptions failed [FAIL] (seq:<uuid>) | responseKey: assumptionDraft, aiType: TEXT_UNDERSTANDING, responseSchema: set |
| Render assumptions | SCRIPT | 6ae55b443695c563ea5158e4 | <uuid> | (900, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| Draft assumptions failed | SCRIPT | 6ae55b443695c563ea5158e5 | <uuid> | (600, 200) | → Render assumptions (seq:<uuid>) | lang: JAVASCRIPT |

## Systems
_(none)_

## AI prompts

### Draft assumptions (TEXT_UNDERSTANDING, id=6ae55b443695c563ea5158e3)
instructions:

```
Draft the assumptions register exclusively from the supplied assumptionFacts ledger. Return an object with an assumptions array, one entry per supplied fact, with assumptionId, whatYouAssumed and wikiStatementOrAbsence as separate string properties. The visible meanings are What you assumed and Which wiki statement (or absence of one) it rests on. Retain the exact rule and source-basis statements verbatim: these are authoritative, so do not replace, summarize, combine, omit or add entries. Preserve identifiers, page references, explicit source absences, provisional codes, descriptions and caveats. Add no external knowledge, quotations or claims of legacy parity. You explain the documented implementation decisions only and never calculate, revise or infer posting results. Return only the requested structured object.
```
userMessage:

```
Prepare the source-linked assumptions register from these authoritative entries: ${assumptionFacts}
```
exampleOutputJsonSchema:

```
{"title":"Response","type":"object","additionalProperties":false,"required":["assumptions"],"properties":{"assumptions":{"type":"array","items":{"type":"object","additionalProperties":false,"required":["assumptionId","whatYouAssumed","wikiStatementOrAbsence"],"properties":{"assumptionId":{"type":"string"},"whatYouAssumed":{"type":"string"},"wikiStatementOrAbsence":{"type":"string"}}}}}}
```

## Scripts

### Calculate posting (SCRIPT, id=6ae55b443695c563ea5158e2)

```javascript
var errors = [];
function err(file, record, field) { errors.push({inputFile:file,recordNumber:record,field:field,message:'Cannot process consumed field'}); }
function lines(value,file) { if(value === undefined || value === null || value === '') return []; if(typeof value !== 'string') { err(file,0,'contents'); return []; } var a=value.split(/\r?\n/); if(a.length && a[a.length-1] === '') a.pop(); return a; }
function tail(s) { return s.replace(/ +$/,''); }
function str(row,p,n,field) { if(row.length < p+n) throw field; return tail(row.slice(p,p+n)); }
function digits(row,p,n,field) { var s=str(row,p,n,field); if(!/^[0-9]+$/.test(s)) throw field; return s; }
function integer(row,p,n,field) { return Number(digits(row,p,n,field)); }
function cents(row,p,n,field) { var s=str(row,p,n,field); var positive='{ABCDEFGHI'; var negative='}JKLMNOPQR'; if(!s.length) throw field; var c=s.charAt(s.length-1), j=positive.indexOf(c), k=negative.indexOf(c), sign=1; if(j>=0) s=s.slice(0,-1)+j; else if(k>=0) {s=s.slice(0,-1)+k;sign=-1;} if(!/^[+-]?[0-9]+$/.test(s)) throw field; var v=Number(s)*sign; if(!Number.isSafeInteger(v)) throw field; return v; }
function money(v) { var a=Math.abs(v); return (v<0?'-':'')+Math.floor(a/100)+'.'+String(a%100).padStart(2,'0'); }
function key(a,t,c) { return a+'|'+t+'|'+c; }
function copy(o) { var r={}; Object.keys(o).forEach(function(k){r[k]=o[k];}); return r; }
var accounts=[], accountMap=Object.create(null), xrefs=Object.create(null), cards=Object.create(null), cats=[], catMap=Object.create(null);
lines(input.acctdata,'acctdata.dat').forEach(function(r,i){try{var id=digits(r,0,11,'acct_id'); var a={id:id,active_status:str(r,11,1,'active_status'),curr_bal:cents(r,12,12,'curr_bal'),credit_limit:cents(r,24,12,'credit_limit'),cash_credit_limit:cents(r,36,12,'cash_credit_limit'),open_date:str(r,48,10,'open_date'),expiration_date:str(r,58,10,'expiration_date'),reissue_date:str(r,68,10,'reissue_date'),curr_cyc_credit:cents(r,78,12,'curr_cyc_credit'),curr_cyc_debit:cents(r,90,12,'curr_cyc_debit'),addr_zip:str(r,102,10,'addr_zip'),group_id:str(r,112,10,'group_id')};accounts.push(a);accountMap[id]=a;}catch(e){err('acctdata.dat',i+1,String(e));}});
lines(input.cardxref,'cardxref.dat').forEach(function(r,i){try{var card=str(r,0,16,'card_num');var acct=digits(r,25,11,'acct_id');xrefs[card]=acct;}catch(e){err('cardxref.dat',i+1,String(e));}});
lines(input.carddata,'carddata.dat').forEach(function(r,i){try{var card=str(r,0,16,'card_num');var active=str(r,90,1,'active_status');cards[card]=active;}catch(e){err('carddata.dat',i+1,String(e));}});
lines(input.tcatbal,'tcatbal.dat').forEach(function(r,i){try{var a=digits(r,0,11,'acct_id'),t=str(r,11,2,'type_cd'),c=integer(r,13,4,'cat_cd'),b=cents(r,17,11,'bal');var v={id:a,type_cd:t,cat_cd:c,bal:b};cats.push(v);catMap[key(a,t,c)]=v;}catch(e){err('tcatbal.dat',i+1,String(e));}});
var posted=[], rejected=[];
var descriptions=['','Card cross-reference not found','Account not found','Account inactive','Card not found','Card inactive','Credit limit exceeded'];
lines(input.dailytran,'dailytran.dat').forEach(function(r,i){try{var amount=cents(r,132,11,'amt');var t={tran_id:str(r,0,16,'tran_id'),type_cd:str(r,16,2,'type_cd'),cat_cd:integer(r,18,4,'cat_cd'),source:str(r,22,10,'source'),desc:str(r,32,100,'desc'),amt:money(amount),merchant_id:integer(r,143,9,'merchant_id'),merchant_name:str(r,152,50,'merchant_name'),merchant_city:str(r,202,50,'merchant_city'),merchant_zip:str(r,252,10,'merchant_zip'),card_num:str(r,262,16,'card_num'),orig_ts:str(r,278,26,'orig_ts'),proc_ts:str(r,304,26,'proc_ts')};var id=xrefs[t.card_num],a=accountMap[id],reason=0;if(id===undefined)reason=1;else if(!a)reason=2;else if(a.active_status!=='Y')reason=3;else if(cards[t.card_num]===undefined)reason=4;else if(cards[t.card_num]!=='Y')reason=5;else if(amount>a.credit_limit-a.curr_bal)reason=6;if(reason){var rej=copy(t);rej.reason=reason;rej.reason_desc=descriptions[reason];rejected.push(rej);}else{var ck=key(id,t.type_cd,t.cat_cd);var cat=catMap[ck];if(!cat){cat={id:id,type_cd:t.type_cd,cat_cd:t.cat_cd,bal:0};cats.push(cat);catMap[ck]=cat;}a.curr_bal+=amount;if(amount>0)a.curr_cyc_debit+=amount;else if(amount<0)a.curr_cyc_credit-=amount;cat.bal+=amount;posted.push(t);}}catch(e){err('dailytran.dat',i+1,String(e));}});
var accountOutput=accounts.map(function(a){return {acct_id:Number(a.id),active_status:a.active_status,curr_bal:money(a.curr_bal),credit_limit:money(a.credit_limit),cash_credit_limit:money(a.cash_credit_limit),open_date:a.open_date,expiration_date:a.expiration_date,reissue_date:a.reissue_date,curr_cyc_credit:money(a.curr_cyc_credit),curr_cyc_debit:money(a.curr_cyc_debit),addr_zip:a.addr_zip,group_id:a.group_id};});
var categoryOutput=cats.map(function(c){return {acct_id:Number(c.id),type_cd:c.type_cd,cat_cd:c.cat_cd,bal:money(c.bal)};});
var facts=[];
function fact(id,assumption,basis){facts.push({assumptionId:id,whatYouAssumed:assumption,wikiStatementOrAbsence:basis});}
fact('daily-layout','Interpret CVTRA06Y daily transactions using the CVTRA05Y field order and widths: 16,2,4,10,100,11,9,50,50,10,16,26,26 characters, followed by ignored filler.','posttran-opus.pdf pp.7-8 describes CVTRA05Y transaction fields; p.12 names CVTRA06Y and 350 bytes but supplies no CVTRA06Y copybook. Their equivalence is not stated.');
fact('account-layout','Read account fields consecutively with widths 11,1,12,12,12,10,10,10,12,12,10,10; remaining bytes are filler.','posttran-opus.pdf pp.5-6 lists these fields and widths and p.12 says 300-byte records, but supplies no complete copybook or byte offsets.');
fact('card-layout','Read card number at zero-based offset 0 width 16 and active status at offset 90 width 1; other card fields are not consumed.','posttran-opus.pdf p.7 lists widths 16,11,3,50,10,1 in that order; it supplies no complete CVACT02Y copybook.');
fact('xref-layout','Read cross-reference card number at offset 0 width 16 and account at offset 25 width 11, skipping the customer identifier.','posttran-opus.pdf p.7 lists cardNumber, customerId and accountId with widths 16,9,11; the complete CVACT03Y copybook and offsets are absent.');
fact('category-layout','Read category-balance account, type, category and amount consecutively with widths 11,2,4,11.','posttran-opus.pdf p.8 lists the composite key and signed balance; p.12 names a 50-byte CVTRA01Y record but does not include the copybook.');
fact('numeric-encoding','Decode consumed numerics as display digits, permitting a leading sign or final ASCII signed-overpunch characters {ABCDEFGHI for nonnegative and }JKLMNOPQR for negative. Do not interpret packed or binary bytes.','posttran-opus.pdf p.5 mentions packed/zoned/signed numerics but does not identify the physical encoding of the supplied line-oriented dumps. ASCII display decoding is assumed.');
fact('money-scale','All consumed monetary fields have two implied fractional digits; calculate in integer cents and return fixed two-decimal JSON strings.','posttran-opus.pdf p.5 maps signed V99 amounts to scale 2; p.12 permits JSON strings or numbers with at most two decimals. Physical dump decimal punctuation is not specified.');
fact('filler','Ignore every unconsumed filler character, including NUL or other non-printable bytes; do not reject an otherwise usable record for filler.','posttran-opus.pdf p.5 says FILLER tails are dropped; pp.5-8 does not specify filler contents.');
fact('line-endings','Split record text on LF or CRLF, removing only the final empty split caused by a terminal line ending; an internal empty record is reported as unprocessable.','posttran-opus.pdf p.12 says one record per line but does not specify line endings or internal blank-line handling.');
fact('unused-discgrp','Accept discgrp contents without reading their fields in POSTTRAN.','posttran-opus.pdf p.12 lists discgrp among shared inputs; pp.2-4 gives no disclosure-group lookup in daily posting.');
fact('unused-custdata','Accept custdata contents without reading their fields in POSTTRAN.','posttran-opus.pdf p.12 lists custdata; pp.2-4 gives no customer-data lookup in posting.');
fact('unused-trantype','Accept trantype contents without reference-table validation or type-specific monetary rules.','posttran-opus.pdf p.12 lists trantype; pp.2-4 does not define a transaction-type lookup or type-specific posting sign.');
fact('unused-trancatg','Accept trancatg contents without reference-table validation.','posttran-opus.pdf p.12 lists trancatg; pp.2-4 does not define category-reference validation.');
fact('absent-input','Treat an absent, null or empty input content value as an empty file; a non-text content value is a reported input error.','posttran-opus.pdf p.4 defines empty daily-file completion; p.12 does not specify missing-input transport semantics.');
fact('active-code','Only the literal Y is active for both accounts and cards; all other status values are inactive.','posttran-opus.pdf p.4 says account status N is rejected and p.3 requires account and card active; it does not enumerate active-status codes.');
fact('account-lookup','Resolve a transaction account through its card number in cardxref; do not separately require the card record account to agree.','posttran-opus.pdf p.7 describes CardXref as linking card, customer and account; pp.2-4 does not specify the posting lookup path or cross-check policy.');
fact('validation-order','Check missing cross-reference, missing account, inactive account, missing card, inactive card and available credit in that order; emit only the first reason.','posttran-opus.pdf pp.2-3 states account/card status and credit validation, but not validation precedence or handling multiple failed conditions.');
fact('reject-xref','For a missing card cross-reference reject with provisional reason 1 and reason_desc Card cross-reference not found.','posttran-opus.pdf p.3 says: See CBTRN01-03C source for exact reject reasons. That source and a missing-cross-reference reason are absent.');
fact('reject-account','For a missing account reject with provisional reason 2 and reason_desc Account not found.','posttran-opus.pdf p.3 defers exact reject reasons to absent legacy source and gives no missing-account rule.');
fact('reject-account-status','For an inactive account reject with provisional reason 3 and reason_desc Account inactive.','posttran-opus.pdf p.4 requires rejection for account status N; p.3 defers exact codes and descriptions to absent legacy source.');
fact('reject-card','For a missing card reject with provisional reason 4 and reason_desc Card not found.','posttran-opus.pdf p.3 requires card active but does not state a missing-card rule; exact reasons are deferred to absent source.');
fact('reject-card-status','For an inactive card reject with provisional reason 5 and reason_desc Card inactive.','posttran-opus.pdf p.3 says card active; exact reasons are deferred to absent source.');
fact('reject-credit','For an amount greater than remaining credit reject with provisional reason 6 and reason_desc Credit limit exceeded. Equality passes.','posttran-opus.pdf p.3 states transaction must not exceed available credit (creditLimit - currentBalance); it defers exact reject reasons to absent source.');
fact('input-order','Process daily records in their supplied order, using balances already updated by earlier valid records.','posttran-opus.pdf pp.2-4 describes a main read loop and each transaction once, but does not specify sorting or whether validation uses opening or running balances.');
fact('signed-current','Increase currentBalance by the signed transaction amount, including negative and zero amounts.','posttran-opus.pdf p.2 says post valid transactions to account balances; pp.2-4 does not state the exact account arithmetic or type-specific signs.');
fact('signed-category','Increase the matching category balance by the signed amount, using account plus type plus integer category as its key.','posttran-opus.pdf p.3 says add transaction amount to the matching TransactionCategoryBalance (key = account + type + category). No alternate type-specific arithmetic is stated.');
fact('cycle-debit','Increase currentCycleDebit by positive amounts; negative or zero amounts do not increase it.','posttran-opus.pdf pp.5-6 defines currentCycleDebit, but pp.2-4 does not specify its posting arithmetic.');
fact('cycle-credit','Increase currentCycleCredit by the absolute value of negative amounts; positive or zero amounts do not increase it.','posttran-opus.pdf pp.5-6 defines currentCycleCredit, but pp.2-4 does not specify its posting arithmetic.');
fact('missing-category','Create a missing category-balance key at zero before adding the posted amount.','posttran-opus.pdf p.3 specifies addition to a matching balance, but does not state what to do when that balance does not exist.');
fact('duplicates','Do not deduplicate daily transaction identifiers; process each input occurrence once.','posttran-opus.pdf p.4 requires each transaction processed once; it does not define duplicate detection or replay prevention.');
fact('timestamps','Preserve supplied orig_ts and proc_ts text; do not rewrite processing timestamps from businessDate or the current clock.','posttran-opus.pdf pp.7-8 lists timestamps and p.12 lists their output names; neither states a rewrite rule.');
fact('date-filter','Do not filter supplied daily records by business date or use businessDate in arithmetic; the caller selects the snapshot.','posttran-opus.pdf p.4 says business date chooses which daily file is posted, but p.12 does not define an additional record-level date filter.');
fact('expiry','Do not reject by account or card expiration dates.','posttran-opus.pdf pp.2-3 lists active status and available-credit checks, not expiration validation. Dates are described on pp.5-7.');
fact('cash-limit','Do not apply a separate cash-credit-limit check.','posttran-opus.pdf p.5 defines cashCreditLimit, but pp.2-4 does not state a cash-specific posting validation.');
fact('snapshot-boundary','Calculate independently from supplied snapshots and return every successfully parsed account and category row; there is no external persistence or migration of existing records.','posttran-opus.pdf p.12 requires every account and category balance after posting; p.3 leaves GDG cycle semantics unresolved. Calculation-only scope excludes file creation and storage.');
fact('scheduler','Do not create a nightly trigger; the caller invokes the calculation.','posttran-opus.pdf p.10 says cron is to be defined per operations window. No operational schedule is supplied.');
fact('malformed-fields','Report unprocessable consumed fields by file, record number and field, skip that record, continue other records and label the result partial. Never include the raw row or card number in diagnostics.','posttran-opus.pdf pp.2-4 and p.12 gives no corrupt-field policy. Record-local continuation and redacted diagnostics are implementation defaults, not verified legacy behaviour.');
fact('identifier-types','Keep digit identifiers as strings for internal matching; convert acct_id, merchant_id and cat_cd to contract integers only in outputs, preserving card_num as text.','posttran-opus.pdf pp.5-8 models several identifiers numerically; p.12 fixes output integer fields. String internal matching avoids losing leading-zero identity.');
fact('string-spaces','Remove trailing ASCII spaces from output text fields but retain leading spaces and embedded characters.','posttran-opus.pdf p.12 says strings may omit trailing spaces; it does not authorize trimming leading spaces.');
fact('inferred-key-duplicates','For snapshot rows that violate the documented unique key, preserve parsed account/category rows but use the last row for lookup and updates; use the last card/cross-reference row for lookup.','posttran-opus.pdf pp.5,7-8 declares unique or composite keys, so duplicate snapshots are outside the documented valid input; collision handling is not defined.');
fact('explanatory-model','Use a model only to draft paired assumption explanations from this ledger. Accept a draft only when its independent rule and source-basis statements exactly preserve this ledger; otherwise use the factual ledger and mark fallback.','posttran-opus.pdf does not define assumption-document generation. The maker requests a record of every assumption and its wiki basis; the confirmed implementation keeps posting deterministic.');
fact('files-excluded','Return the four output collections and Markdown text but do not create JSON or Markdown files.','posttran-opus.pdf p.12 specifies filenames; the maker selected calculation-only scope with actual file creation excluded.');
output={postingCalculation:{posttran_transact:posted,posttran_dalyrejs:rejected,posttran_acctdata:accountOutput,posttran_tcatbal:categoryOutput,status:errors.length?'partial':'complete',errors:errors},assumptionFacts:facts};
```

### Render assumptions (SCRIPT, id=6ae55b443695c563ea5158e4)

```javascript
var facts=Array.isArray(input.assumptionFacts)?input.assumptionFacts:[];
var draft=input.assumptionDraft||{};
var rows=Array.isArray(draft.assumptions)?draft.assumptions:[];
var index=Object.create(null),valid=rows.length===facts.length && facts.length>0;
rows.forEach(function(r){if(!r||typeof r.assumptionId!=='string'||typeof r.whatYouAssumed!=='string'||typeof r.wikiStatementOrAbsence!=='string'||Object.keys(r).length!==3||index[r.assumptionId])valid=false;else index[r.assumptionId]=r;});
facts.forEach(function(f){var r=index[f.assumptionId];if(!r||r.whatYouAssumed!==f.whatYouAssumed||r.wikiStatementOrAbsence!==f.wikiStatementOrAbsence)valid=false;});
var chosen=facts.map(function(f){var r=valid?index[f.assumptionId]:f;return {assumptionId:f.assumptionId,whatYouAssumed:r.whatYouAssumed,wikiStatementOrAbsence:r.wikiStatementOrAbsence};});
function cell(s){return String(s).replace(/\|/g,'&#124;').replace(/\r?\n/g,'<br>');}
var md='# Daily posting assumptions\n\nExact legacy parity is unproven: complete copybooks and legacy reject reasons were not supplied. Physical output files are excluded from this calculation-only implementation.\n\n| What you assumed | Which wiki statement (or absence of one) it rests on |\n| --- | --- |\n';
chosen.forEach(function(r){md+='| '+cell(r.whatYouAssumed)+' | '+cell(r.wikiStatementOrAbsence)+' |\n';});
var result={};Object.keys(input.postingCalculation||{}).forEach(function(k){result[k]=input.postingCalculation[k];});
result.assumptions=chosen;result.assumptions_md=md;result.assumptionDraftStatus=valid?'drafted':'fallback';
output={postingResult:result};
```

### Draft assumptions failed (SCRIPT, id=6ae55b443695c563ea5158e5)

```javascript
output = {"assumptionDraft": {}};

```

_(server: 352 ms, 1 API call, 199 ms in API)_
