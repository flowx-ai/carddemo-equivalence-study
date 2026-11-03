# Workflow: CalculateCardDemoInterest

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** 

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae500be3695c563ea514b58 | <uuid> | (0, 0) | → Calculate interest (seq:<uuid>) |
| End | END | 6ae500be3695c563ea514b59 | <uuid> | (1200, 0) | — |
| Calculate interest | SCRIPT | 6ae500be3695c563ea514b5a | <uuid> | (300, 0) | → Draft assumptions (seq:<uuid>) | lang: JAVASCRIPT |
| Draft assumptions | AI | 6ae500be3695c563ea514b5b | <uuid> | (600, 0) | → Assemble results [SUCCESS] (seq:<uuid>), → Draft assumptions failed [FAIL] (seq:<uuid>) | responseKey: draftedAssumptions, aiType: TEXT_UNDERSTANDING, responseSchema: set |
| Assemble results | SCRIPT | 6ae500be3695c563ea514b5c | <uuid> | (900, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| Draft assumptions failed | SCRIPT | 6ae500be3695c563ea514b5d | <uuid> | (600, 200) | → Assemble results (seq:<uuid>) | lang: JAVASCRIPT |

## Systems
_(none)_

## AI prompts

### Draft assumptions (TEXT_UNDERSTANDING, id=6ae500be3695c563ea514b5b)
instructions:

```
Prepare the assumptions explanation from the supplied fixed assumptionRegister only. It is trusted implementation metadata, not an invitation to decide financial behaviour. Return an object with an assumptions array containing exactly one entry for every supplied assumptionId. Each entry must contain assumptionId, whatYouAssumed, wikiStatementOrAbsence and source. Copy each of those four values verbatim from its supplied entry. The canonical wording already separates an implementation assumption from its documented statement or explicit absence; preserve that distinction. Do not combine individual entries, add assumptions, invent citations, assert oracle verification, change rules or paraphrase the source basis. Do not request or infer customer records, account records, file contents, balances, diagnostics or calculation status. Return only the required structured object.
```
userMessage:

```
Prepare the complete source-paired assumptions register from this fixed register:
${assumptionRegister}
```
exampleOutputJsonSchema:

```
{"title":"Response","type":"object","additionalProperties":false,"required":["assumptions"],"properties":{"assumptions":{"type":"array","items":{"type":"object","additionalProperties":false,"required":["assumptionId","whatYouAssumed","wikiStatementOrAbsence","source"],"properties":{"assumptionId":{"type":"string"},"whatYouAssumed":{"type":"string"},"wikiStatementOrAbsence":{"type":"string"},"source":{"type":"string"}}}}}}
```

## Scripts

### Calculate interest (SCRIPT, id=6ae500be3695c563ea514b5a)

```javascript
function strip(n){n=String(n).replace(/^0+/, '');return n||'0';}
function neg(n){return n.charAt(0)==='-';}
function mag(n){return neg(n)?n.slice(1):n;}
function signed(n,s){n=strip(n);return s&&n!=='0'?'-'+n:n;}
function cmp(a,b){a=strip(a);b=strip(b);return a.length!==b.length?(a.length>b.length?1:-1):(a===b?0:(a>b?1:-1));}
function plus(a,b){var i=a.length-1,j=b.length-1,c=0,r='';while(i>=0||j>=0||c){var v=(i>=0?Number(a.charAt(i--)):0)+(j>=0?Number(b.charAt(j--)):0)+c;r=String(v%10)+r;c=Math.floor(v/10);}return strip(r);}
function minus(a,b){var i=a.length-1,j=b.length-1,c=0,r='';while(i>=0){var v=Number(a.charAt(i--))-(j>=0?Number(b.charAt(j--)):0)-c;if(v<0){v+=10;c=1;}else c=0;r=String(v)+r;}return strip(r);}
function add(a,b){var x=mag(a),y=mag(b),sa=neg(a),sb=neg(b);if(sa===sb)return signed(plus(x,y),sa);var c=cmp(x,y);return c>=0?signed(minus(x,y),sa):signed(minus(y,x),sb);}
function multiply(a,b){a=mag(a);b=mag(b);var r='0';for(var j=0;j<b.length;j++){var d=Number(b.charAt(j)),c=0,t='';for(var i=a.length-1;i>=0;i--){var v=Number(a.charAt(i))*d+c;t=String(v%10)+t;c=Math.floor(v/10);}if(c)t=String(c)+t;r=plus(r+'0',strip(t));}return strip(r);}
function divideSmall(a,d){var rem=0,r='';for(var i=0;i<a.length;i++){var v=rem*10+Number(a.charAt(i));r+=String(Math.floor(v/d));rem=v%d;}return strip(r);}
function interest(b,r){return signed(divideSmall(multiply(b,r),120000),neg(b)!==neg(r));}
function money(n){var s=neg(n)?'-':'',v=mag(n);while(v.length<3)v='0'+v;return s+v.slice(0,-2)+'.'+v.slice(-2);}
function decode(s,width){if(s.length!==width)throw new Error('Required numeric field is shorter than its copybook width '+width);var v=s.trim(),negative=false;if(!v)throw new Error('Required numeric field is blank');var tail=v.charAt(v.length-1),p='{ABCDEFGHI',m='}JKLMNOPQR',idx=p.indexOf(tail);if(idx>=0)v=v.slice(0,-1)+String(idx);else if((idx=m.indexOf(tail))>=0){negative=true;v=v.slice(0,-1)+String(idx);}if(v.charAt(0)==='-'||v.charAt(0)==='+'){negative=v.charAt(0)==='-';v=v.slice(1);}else if(v.charAt(v.length-1)==='-'||v.charAt(v.length-1)==='+'){negative=v.charAt(v.length-1)==='-';v=v.slice(0,-1);}if(!/^\d+$/.test(v))throw new Error('Unreadable required numeric value');if(strip(v).length>width)throw new Error('Numeric overflow');return signed(v,negative);}
function idField(s,width,name){if(s.length!==width||!/^\d+$/.test(s))throw new Error('Unreadable '+name+'; expected '+width+' digits');return s;}
function field(s,start,width,name){var v=s.slice(start,start+width);if(v.length!==width)throw new Error('Unreadable '+name+'; field is shorter than '+width);return v;}
function text(s){return s.replace(/ +$/,'');}
function rows(s){if(s==='')return [];var a=s.split(/\r\n|\n|\r/);if(a.length&&a[a.length-1]==='')a.pop();return a;}
function dateValid(s){if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;var y=Number(s.slice(0,4)),m=Number(s.slice(5,7)),d=Number(s.slice(8,10)),leap=y%4===0&&(y%100!==0||y%400===0),days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];return y>=1&&m>=1&&m<=12&&d>=1&&d<=days[m-1];}
var diagnostics=[],seenDiagnostics=Object.create(null),blocked=Object.create(null);
function diagnostic(accountId,inputName,lineNumber,message){var d={accountId:accountId||null,inputName:inputName,lineNumber:lineNumber===undefined?null:lineNumber,message:message},k=JSON.stringify(d);if(!seenDiagnostics[k]){seenDiagnostics[k]=true;diagnostics.push(d);}}
function fail(accountId,inputName,lineNumber,message){if(accountId)blocked[accountId]=true;diagnostic(accountId,inputName,lineNumber,message);}
var specs=[
['delivery','Return data and Markdown only; do not read or create files.','The maker selected calculation-only delivery. CONTRACT.md describes physical inputs and outputs but does not provide a FlowX file-delivery implementation.','Maker-confirmed file-delivery decision; intcalc-sonnet.pdf p.24, CONTRACT.md'],
['input-scope','Consume only acctdata, cardxref, tcatbal and discgrp supplied contents; ignore the other fileContents members.','The interest flow uses category balances, accounts, disclosure rates and account/card references; CONTRACT.md lists the larger chain input set.','intcalc-sonnet.pdf pp.2,15,17,24'],
['step-isolation','Treat supplied account and category contents as the post-POSTTRAN inputs for this isolated step.','CONTRACT.md explicitly says an INTCALC candidate receives the oracle POSTTRAN account and category-balance outputs.','intcalc-sonnet.pdf p.24, CONTRACT.md, Step isolation'],
['layout-positions','Derive contiguous offsets from the listed field order and copybook widths, without inventing additional intervening fields.','The wiki lists field order and widths; complete copybooks are not included in the supplied material.','intcalc-sonnet.pdf pp.6,8–9,24'],
['layout-filler','Ignore all unused filler bytes, including NUL and other non-printable bytes.','The data model drops account filler; no interest calculation rule reads filler.','intcalc-sonnet.pdf pp.2,6,8–9'],
['layout-length','Require only the fields actually consumed to have their listed widths; do not reject extra trailing filler or enforce total record length.','CONTRACT.md names record sizes, but complete copybooks and any rules for validating unused bytes are absent.','intcalc-sonnet.pdf pp.6,8–9,24'],
['line-boundaries','Accept LF, CRLF or CR record separators; ignore one terminal separator, not interior blank records.','CONTRACT.md specifies one fixed-width record per line without specifying a newline convention or blank-record handling.','intcalc-sonnet.pdf p.24, CONTRACT.md'],
['overpunch','Decode trailing positive { and A–I and negative } and J–R as signed final digits; also accept ordinary digits and explicit signs.','The wiki states signed decimal overpunch storage and gives an example, but does not enumerate all accepted textual sign encodings.','intcalc-sonnet.pdf pp.4,9,18'],
['rate-example','Use the six-character S9(4)V99 rate width and two implied decimals, treating the abbreviated 0150{ example as illustrative rather than as an alternate layout.','The rate table specifies S9(4)V99 while the displayed example is abbreviated; full copybooks are not supplied.','intcalc-sonnet.pdf pp.4,9,18'],
['decimal-scale','Decode monetary fields and annual percentage rates with two implied decimal places.','The listed account, category-balance and rate fields all have V99 fractional digits.','intcalc-sonnet.pdf pp.6,8–9'],
['exact-arithmetic','Use decimal digit-string integer arithmetic for products, sums and division, never floating-point financial arithmetic.','The wiki specifies a decimal interest formula but does not prescribe the migrated arithmetic representation.','intcalc-sonnet.pdf p.2, BR-03 and BR-08'],
['monthly-formula','Compute category monthly interest as category balance times annual percentage rate divided by 1200.','BR-03 gives this formula and the acceptance example yields 15.00 from 1000.00 at 18.00.','intcalc-sonnet.pdf pp.2–4'],
['truncation-direction','Truncate signed fractional cents toward zero, not toward negative infinity and not to nearest cent.','BR-08 mentions COBOL default truncation but explicitly requests rounding-mode confirmation and a golden-file test. This implementation choice is not oracle-verified.','intcalc-sonnet.pdf p.2, BR-08'],
['truncation-stage','Truncate each category to cents before summing posted interest for an account.','The flow computes and writes category interest before accumulating account total interest; an explicit intermediate precision policy is absent.','intcalc-sonnet.pdf p.2, Process Flow and BR-03–BR-06'],
['rate-key','Look up rates by account group plus original category type and category code.','BR-01 specifies account.groupId + typeCode + categoryCode as the rate key.','intcalc-sonnet.pdf p.2, BR-01'],
['default-rate','Use DEFAULT only when the account-group rate row is absent; do not replace an existing zero or unreadable rate with DEFAULT.','BR-02 retries DEFAULT for a not-found status; error handling for an existing unreadable row is unspecified.','intcalc-sonnet.pdf pp.2,17–18'],
['missing-default','Diagnose a missing group rate and missing DEFAULT rate rather than silently choosing zero interest.','The wiki documents DEFAULT fallback but supplies no result for absence of both rows.','intcalc-sonnet.pdf pp.2,17–18'],
['zero-rate','Do not emit an interest transaction when the resolved rate is zero.','BR-03 tests rate not zero; the zero-rate acceptance scenario expects no interest transaction.','intcalc-sonnet.pdf pp.2–4'],
['zero-truncated-interest','Emit a transaction for a nonzero rate even when truncated interest is 0.00.','The documented posting condition tests the rate, not the computed amount; an extra zero-amount suppression rule is absent.','intcalc-sonnet.pdf p.2, BR-03 and Process Flow'],
['fee-stub','Charge no fees.','BR-07 identifies COMPUTE-FEES as an empty stub, and the acceptance page leaves fee implementation as a decision.','intcalc-sonnet.pdf pp.2,4'],
['transaction-constants','Emit type_cd 01, cat_cd 5 and source System.','BR-04 specifies type 01, category 05 and source System; CONTRACT.md requires integer cat_cd.','intcalc-sonnet.pdf pp.2,24'],
['transaction-description','Use Int. for a/c followed by one space and the original eleven-character account identifier.','BR-04 gives the description template Int. for a/c <accountId>.','intcalc-sonnet.pdf p.2, BR-04'],
['category-order','Process categories in account/type/category lexical order using their fixed-width identifier strings.','The flow is grouped by account, but ordering among categories is not fully specified.','intcalc-sonnet.pdf pp.2–3,9'],
['run-default','Default an omitted or null interestRunDate to 2022071800; require supplied values to be ten-character strings.','The legacy PARM example and contract parameter are 2022071800; validation of overrides is not documented.','intcalc-sonnet.pdf pp.2–4,24'],
['sequence-width','Append a six-digit suffix beginning at 000001 to the ten-character run prefix.','BR-05 specifies run prefix plus running suffix; the transaction identifier width is 16, but suffix width and starting value are otherwise unspecified.','intcalc-sonnet.pdf pp.2,8'],
['sequence-commit','Allocate suffixes only to transactions of successful accounts, with no gaps for rejected accounts.','The wiki does not define sequence consumption after an account-local calculation failure.','intcalc-sonnet.pdf pp.2,20'],
['business-date','Default omitted or null businessDate to 2022-07-18; require a valid YYYY-MM-DD calendar date for supplied overrides.','CONTRACT.md provides business date 2022-07-18 but does not specify override validation.','intcalc-sonnet.pdf p.24, CONTRACT.md'],
['timestamps','Set both orig_ts and proc_ts to businessDate midnight in YYYY-MM-DD HH:mm:ss.ffffff format.','The transaction model specifies 26-character timestamp fields, but the interest rules do not specify generated timestamps.','intcalc-sonnet.pdf pp.8–9,24'],
['card-choice','Choose the lexicographically first cross-reference card for each account.','The wiki describes a card-reference secondary index on accountId but gives no selection rule for several cards.','intcalc-sonnet.pdf pp.8,15–16'],
['missing-card','Use blank card_num when an account has no cross-reference card.','The interest-step pages do not define missing-card handling for generated system transactions.','intcalc-sonnet.pdf pp.2,8,15–16'],
['merchant-id','Use merchant_id 0.','The contract requires merchant_id, but the interest rules do not prescribe its value.','intcalc-sonnet.pdf pp.2,8,24'],
['merchant-text','Use blank merchant_name, merchant_city and merchant_zip.','The contract requires these fields, but no merchant text is specified for interest transactions.','intcalc-sonnet.pdf pp.2,8,24'],
['represented-accounts','Update and reset cycle totals only for accounts represented in category balances.','The documented loop is driven by account/type/category balances and rewrites accounts at account changes.','intcalc-sonnet.pdf p.2, Process Flow and BR-06'],
['unaffected-accounts','Return every supplied account record, preserving values of accounts not processed successfully.','CONTRACT.md requests output for every account; behaviour for unrelated or failed accounts is not fully specified.','intcalc-sonnet.pdf pp.2,16,24'],
['account-balance','Add exactly the sum of emitted, individually truncated category interest to each successful account current balance.','BR-06 adds totalInterest to currentBalance after category transactions have been written.','intcalc-sonnet.pdf p.2, BR-06'],
['cycle-reset','Set both current-cycle credit and current-cycle debit to 0.00 for every successfully processed account, even if all rates are zero.','BR-06 resets both totals at each account change without a nonzero-interest condition.','intcalc-sonnet.pdf p.2, BR-06'],
['local-failure','On any attributable required-value, duplicate-key, rate, missing-account or overflow error, omit all transactions for that account, leave its records unchanged and continue other accounts.','The wiki describes per-record bulk failures and no data change on account timeout, but complete INTCALC failure and rollback semantics are absent.','intcalc-sonnet.pdf pp.16–20'],
['unknown-owner-error','An unreadable record whose account cannot be identified contributes a diagnostic without suppressing other identifiable accounts.','The wiki does not specify how to attribute malformed fixed-width records with unreadable keys.','intcalc-sonnet.pdf pp.16–20,24'],
['duplicates','Coalesce identical category and rate keys for calculation; conflicting keys fail affected accounts. Repeated identical card references are harmless; a card assigned to conflicting accounts fails both identifiable accounts.','The model names primary or composite keys but does not define duplicate-record ingestion semantics.','intcalc-sonnet.pdf pp.6,8–9'],
['account-duplicates','Retain each supplied account row in the output. Identical rows for one account share a single calculation; conflicting decoded account rows leave all those rows unchanged.','The contract requests every account and the model names accountId as a primary key, but duplicate physical account-row output is unspecified.','intcalc-sonnet.pdf pp.6,24'],
['numeric-overflow','Bound account amounts to S9(10)V99 and generated transaction amounts to S9(9)V99; fail an affected account if a generated amount or six-digit sequence exceeds its field capacity.','The model lists these copybook widths; detailed migrated overflow semantics and sequence exhaustion are not specified.','intcalc-sonnet.pdf pp.6,8–9'],
['invalid-raw-values','If a supplied account amount cannot be decoded, preserve its original field text in that failed account row rather than fabricate a numeric value, and report a diagnostic.','No contract representation for a syntactically unreadable original amount is specified; this exceptional preservation is not a claim of oracle behaviour.','intcalc-sonnet.pdf pp.6,16,24'],
['required-contents','Return INVALID_INPUT for absent or non-string required contents or invalid run parameters, without performing calculations.','The contract lists required inputs and parameter examples but does not define invalid-input responses.','intcalc-sonnet.pdf p.24, CONTRACT.md'],
['empty-inputs','Accept present empty required strings and return empty financial lists when all required contents are empty.','The contract does not define an empty-batch error or minimum record count.','intcalc-sonnet.pdf p.24, CONTRACT.md'],
['status-diagnostics','Use OK without calculation diagnostics, PARTIAL with record-level diagnostics and INVALID_INPUT for invalid required inputs; diagnostics separately expose accountId, inputName, lineNumber and message.','The wiki supplies incomplete interest error semantics; this structured response is the maker-confirmed implementation interface.','Maker-confirmed record-error-policy decision; intcalc-sonnet.pdf pp.16–20'],
['identifier-precision','Keep numeric-looking identifiers as strings internally; convert only acct_id, cat_cd and merchant_id at the output boundary.','The model uses fixed-width identifiers; CONTRACT.md requires these three output fields to be integers.','intcalc-sonnet.pdf pp.6,8–9,24'],
['amount-rendering','Render decoded and calculated amounts as exact two-decimal strings, including 0.00 rather than negative zero.','CONTRACT.md allows strings or numbers with at most two decimals; the selected delivery uses two-decimal strings.','intcalc-sonnet.pdf p.24, CONTRACT.md; maker-confirmed output format'],
['text-rendering','Remove trailing spaces from output text, while preserving identifier leading zeros and not interpreting unrelated date or status text.','CONTRACT.md permits omission of trailing spaces; no additional interest-time validation of those fields is specified.','intcalc-sonnet.pdf pp.6,8–9,24'],
['invocation-isolation','Start a fresh sequence and fresh result lists for each invocation, with no persistent append, replay history or wall-clock input.','BR-09 contrasts legacy overwrite with FlowX append; the maker selected an isolated calculation-only implementation instead of storage integration.','intcalc-sonnet.pdf pp.2,24; maker-confirmed transaction-details decision'],
['explanation-privacy','Send only the fixed assumption register to the model, never supplied file contents or customer/account records.','This is the maker-confirmed implementation boundary, not a documented legacy interest behaviour.','Maker-confirmed assumptions-drafting decision'],
['explanation-identity','Pair explanations by assumptionId, reject unknown and ambiguous duplicate entries, and always retain the canonical source.','The maker requires individually source-paired explanations; the wiki does not specify an AI explanation mechanism.','Maker-confirmed assumptions-drafting decision'],
['explanation-fidelity','Accept only the canonical assumption and basis wording from the drafting step; otherwise fall back to the canonical entry to prevent changed rules or invented source claims.','The maker forbids model-selected rules and invented source claims; automated verification of unrestricted paraphrases is not available in this calculation.','Maker-confirmed assumptions-drafting decision and rules'],
['explanation-recovery','If drafting fails, is malformed or omits an entry, use the canonical entry without changing financial results, diagnostics or status.','This is the maker-confirmed recovery policy; it is not asserted to be legacy program behaviour.','Maker-confirmed assumptions-drafting decision'],
['markdown-pairing','Render the same structured entries in a Markdown table with separate assumption, wiki-basis and source columns.','The maker explicitly requires each individual decision next to its source basis; CONTRACT.md does not define an assumptions file schema.','Maker request; maker-confirmed assumptions-drafting decision; intcalc-sonnet.pdf pp.24–25'],
['oracle-verification','Do not claim full-copybook verification or a golden-file comparison with the COBOL oracle.','BR-08 requests a golden-file test; neither complete source copybooks nor oracle output data were attached.','Supplied attachment set; intcalc-sonnet.pdf pp.2,24–25']
];
var assumptionRegister=specs.map(function(s){return {assumptionId:s[0],whatYouAssumed:s[1],wikiStatementOrAbsence:s[2],source:s[3]};});
var financial={intcalc_systran_json:[],intcalc_acctdata_json:[],status:'OK',diagnostics:diagnostics};
var fc=input.fileContents,required=['acctdata','cardxref','tcatbal','discgrp'],invalid=false;
for(var ri=0;ri<required.length;ri++){var rn=required[ri];if(!fc||typeof fc!=='object'||typeof fc[rn]!=='string'){invalid=true;diagnostic(null,rn,null,'Missing required string fileContents.'+rn);}}
var businessDate=input.businessDate===undefined||input.businessDate===null?'2022-07-18':input.businessDate;
var run=input.interestRunDate===undefined||input.interestRunDate===null?'2022071800':input.interestRunDate;
if(!dateValid(businessDate)){invalid=true;diagnostic(null,'businessDate',null,'Expected a valid YYYY-MM-DD calendar date');}
if(typeof run!=='string'||run.length!==10){invalid=true;diagnostic(null,'interestRunDate',null,'Expected a ten-character run prefix');}
if(invalid){financial.status='INVALID_INPUT';}else{
var accounts=Object.create(null),accountRows=[],rates=Object.create(null),categories=Object.create(null),cardsByNumber=Object.create(null),cardsByAccount=Object.create(null);
var arows=rows(fc.acctdata);
var amountFields=[['curr_bal',12,12],['credit_limit',24,12],['cash_credit_limit',36,12],['curr_cyc_credit',78,12],['curr_cyc_debit',90,12]];
for(var ai=0;ai<arows.length;ai++){
var line=arows[ai],lineNo=ai+1,aid=null;
try{aid=idField(line.slice(0,11),11,'accountId');}catch(e){diagnostic(null,'acctdata',lineNo,e.message);}
var obj={acct_id:aid===null?text(line.slice(0,11)):Number(aid),active_status:text(line.slice(11,12)),curr_bal:text(line.slice(12,24)),credit_limit:text(line.slice(24,36)),cash_credit_limit:text(line.slice(36,48)),open_date:text(line.slice(48,58)),expiration_date:text(line.slice(58,68)),reissue_date:text(line.slice(68,78)),curr_cyc_credit:text(line.slice(78,90)),curr_cyc_debit:text(line.slice(90,102)),addr_zip:text(line.slice(102,112)),group_id:text(line.slice(112,122))};
var record={id:aid,line:lineNo,obj:obj,cents:{},bad:aid===null};
if(line.length<122){record.bad=true;fail(aid,'acctdata',lineNo,'Required account output fields are shorter than the listed layout');}
for(var af=0;af<amountFields.length;af++){var f=amountFields[af];try{var val=decode(line.slice(f[1],f[1]+f[2]),f[2]);record.cents[f[0]]=val;obj[f[0]]=money(val);}catch(e){record.bad=true;fail(aid,'acctdata',lineNo,f[0]+': '+e.message);}}
accountRows.push(record);
if(aid!==null){if(!accounts[aid])accounts[aid]={rows:[],first:record,signature:JSON.stringify(obj)};var ar=accounts[aid];if(ar.signature!==JSON.stringify(obj)){fail(aid,'acctdata',lineNo,'Conflicting duplicate accountId');}ar.rows.push(record);if(record.bad)blocked[aid]=true;}
}
var xrows=rows(fc.cardxref);
for(var xi=0;xi<xrows.length;xi++){
var x=xrows[xi],xid=null,xno=xi+1;
try{xid=idField(x.slice(25,36),11,'cross-reference accountId');var card=text(field(x,0,16,'cardNumber'));var old=cardsByNumber[card];if(old&&old.account!==xid){fail(old.account,'cardxref',old.line,'Conflicting duplicate cardNumber');fail(xid,'cardxref',xno,'Conflicting duplicate cardNumber');}else if(!old)cardsByNumber[card]={account:xid,line:xno};if(!cardsByAccount[xid])cardsByAccount[xid]=[];if(cardsByAccount[xid].indexOf(card)<0)cardsByAccount[xid].push(card);}catch(e){fail(xid,'cardxref',xno,e.message);}
}
var drows=rows(fc.discgrp);
for(var di=0;di<drows.length;di++){
var dr=drows[di],dk=null,dno=di+1;
try{var group=text(field(dr,0,10,'groupId')),dtype=field(dr,10,2,'typeCode'),dcat=idField(field(dr,12,4,'categoryCode'),4,'categoryCode');dk=group+'|'+dtype+'|'+dcat;var rateRow={line:dno,value:null,error:null,raw:dr.slice(16,22)};try{rateRow.value=decode(dr.slice(16,22),6);}catch(e){rateRow.error=e.message;}var prev=rates[dk];if(!prev)rates[dk]=rateRow;else if(prev.value!==rateRow.value||prev.error!==rateRow.error||(prev.error&&prev.raw!==rateRow.raw)){prev.error='Conflicting duplicate disclosure-rate key';}}catch(e){diagnostic(null,'discgrp',dno,e.message);}
}
var trows=rows(fc.tcatbal);
for(var ti=0;ti<trows.length;ti++){
var tr=trows[ti],tid=null,tno=ti+1;
try{tid=idField(tr.slice(0,11),11,'category accountId');var tt=field(tr,11,2,'typeCode'),tc=idField(field(tr,13,4,'categoryCode'),4,'categoryCode'),balance=decode(tr.slice(17,28),11),tk=tid+'|'+tt+'|'+tc;var category={id:tid,type:tt,cat:tc,balance:balance,line:tno};if(categories[tk]){if(categories[tk].balance!==balance)fail(tid,'tcatbal',tno,'Conflicting duplicate category-balance key');}else categories[tk]=category;}catch(e){fail(tid,'tcatbal',tno,e.message);}
}
var orderedKeys=Object.keys(categories).sort(),perAccount=Object.create(null),accountOrder=[];
for(var ki=0;ki<orderedKeys.length;ki++){var cr=categories[orderedKeys[ki]];if(!perAccount[cr.id]){perAccount[cr.id]=[];accountOrder.push(cr.id);}perAccount[cr.id].push(cr);}
var seq=0,updates=Object.create(null),timestamp=businessDate+' 00:00:00.000000';
for(var pi=0;pi<accountOrder.length;pi++){
var currentId=accountOrder[pi],recordSet=accounts[currentId],catRows=perAccount[currentId];
if(!recordSet){fail(currentId,'tcatbal',catRows[0].line,'Missing account for category balance');continue;}
if(blocked[currentId])continue;
var account=recordSet.first,total='0',pending=[];
for(var ci=0;ci<catRows.length;ci++){
var cat=catRows[ci],lookup=account.obj.group_id+'|'+cat.type+'|'+cat.cat,resolved=rates[lookup];
if(!resolved)resolved=rates['DEFAULT|'+cat.type+'|'+cat.cat];
if(!resolved){fail(currentId,'discgrp',null,'Missing account-group and DEFAULT disclosure rate for type '+cat.type+' category '+cat.cat);continue;}
if(resolved.error){fail(currentId,'discgrp',resolved.line,resolved.error+' for type '+cat.type+' category '+cat.cat);continue;}
if(resolved.value==='0')continue;
var amt=interest(cat.balance,resolved.value);
if(mag(amt).length>11){fail(currentId,'tcatbal',cat.line,'Interest amount overflows S9(9)V99');continue;}
total=add(total,amt);pending.push({amount:amt,line:cat.line});
}
if(blocked[currentId])continue;
var newBalance=add(account.cents.curr_bal,total);
if(mag(newBalance).length>12){fail(currentId,'acctdata',account.line,'Updated account balance overflows S9(10)V99');continue;}
if(seq+pending.length>999999){fail(currentId,'tcatbal',catRows[0].line,'Transaction identifier six-digit suffix exhausted');continue;}
var selectedCards=(cardsByAccount[currentId]||[]).slice().sort(),selectedCard=selectedCards.length?selectedCards[0]:'';
for(var pj=0;pj<pending.length;pj++){seq++;var suffix=String(seq);while(suffix.length<6)suffix='0'+suffix;financial.intcalc_systran_json.push({tran_id:run+suffix,type_cd:'01',cat_cd:5,source:'System',desc:'Int. for a/c '+currentId,amt:money(pending[pj].amount),merchant_id:0,merchant_name:'',merchant_city:'',merchant_zip:'',card_num:selectedCard,orig_ts:timestamp,proc_ts:timestamp});}
updates[currentId]=money(newBalance);
}
for(var oi=0;oi<accountRows.length;oi++){var original=accountRows[oi],out=original.obj;if(original.id!==null&&updates[original.id]!==undefined&&!blocked[original.id]){out.curr_bal=updates[original.id];out.curr_cyc_credit='0.00';out.curr_cyc_debit='0.00';}financial.intcalc_acctdata_json.push(out);}
financial.status=diagnostics.length?'PARTIAL':'OK';
}
output={calculation:financial,assumptionRegister:assumptionRegister};
```

### Assemble results (SCRIPT, id=6ae500be3695c563ea514b5c)

```javascript
function cell(value){return String(value===undefined||value===null?'':value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\|/g,'&#124;').replace(/\r\n|\r|\n/g,'<br>');}
var canonical=Array.isArray(input.assumptionRegister)?input.assumptionRegister:[],draft=input.draftedAssumptions,candidates=draft&&Array.isArray(draft.assumptions)?draft.assumptions:[],known=Object.create(null),byId=Object.create(null),duplicates=Object.create(null);
for(var i=0;i<canonical.length;i++)known[canonical[i].assumptionId]=true;
for(var j=0;j<candidates.length;j++){var candidate=candidates[j];if(!candidate||typeof candidate!=='object'||typeof candidate.assumptionId!=='string'||!known[candidate.assumptionId])continue;if(byId[candidate.assumptionId])duplicates[candidate.assumptionId]=true;else byId[candidate.assumptionId]=candidate;}
var assumptions=[];
for(var k=0;k<canonical.length;k++){var original=canonical[k],entry=byId[original.assumptionId],valid=entry&&!duplicates[original.assumptionId]&&entry.source===original.source&&entry.whatYouAssumed===original.whatYouAssumed&&entry.wikiStatementOrAbsence===original.wikiStatementOrAbsence;assumptions.push({assumptionId:original.assumptionId,whatYouAssumed:valid?entry.whatYouAssumed:original.whatYouAssumed,wikiStatementOrAbsence:valid?entry.wikiStatementOrAbsence:original.wikiStatementOrAbsence,source:original.source});}
var md='# Assumptions\n\nThese are documented rules and explicit implementation choices, not a claim of full-copybook or oracle verification. Returned data maps to intcalc_systran.json and intcalc_acctdata.json; this text maps to assumptions.md. No file is read or saved by this workflow.\n\n| What you assumed | Which wiki statement or absence it rests on | Source |\n| --- | --- | --- |\n';
for(var n=0;n<assumptions.length;n++){var a=assumptions[n];md+='| '+cell(a.whatYouAssumed)+' | '+cell(a.wikiStatementOrAbsence)+' | '+cell(a.source)+' |\n';}
var calculation=input.calculation||{intcalc_systran_json:[],intcalc_acctdata_json:[],status:'INVALID_INPUT',diagnostics:[]};
output={result:{intcalc_systran_json:calculation.intcalc_systran_json,intcalc_acctdata_json:calculation.intcalc_acctdata_json,assumptions:assumptions,assumptions_md:md,status:calculation.status,diagnostics:calculation.diagnostics}};
```

### Draft assumptions failed (SCRIPT, id=6ae500be3695c563ea514b5d)

```javascript
output = {"draftedAssumptions": {}};

```

_(server: 214 ms, 1 API call, 203 ms in API)_
