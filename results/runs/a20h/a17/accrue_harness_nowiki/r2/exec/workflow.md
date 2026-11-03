# Workflow: LedgerlineAccrue

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** 

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae1ff423695c563ea50b1e2 | <uuid> | (0, 0) | → Transform (seq:<uuid>) |
| End | END | 6ae1ff423695c563ea50b1e3 | <uuid> | (1200, 0) | — |
| Transform | SCRIPT | 6ae1ff423695c563ea50b1e4 | <uuid> | (300, 0) | → DraftAssumptions (seq:<uuid>) | lang: JAVASCRIPT |
| DraftAssumptions | AI | 6ae1ff423695c563ea50b1e5 | <uuid> | (600, 0) | → CheckAssumptions [SUCCESS] (seq:<uuid>), → DraftAssumptions failed [FAIL] (seq:<uuid>) | responseKey: assumptionDraft, aiType: TEXT_UNDERSTANDING, responseSchema: set |
| CheckAssumptions | SCRIPT | 6ae1ff423695c563ea50b1e6 | <uuid> | (900, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| DraftAssumptions failed | SCRIPT | 6ae1ff423695c563ea50b1e7 | <uuid> | (600, 200) | → CheckAssumptions (seq:<uuid>) | lang: JAVASCRIPT |

## Systems
_(none)_

## AI prompts

### DraftAssumptions (TEXT_UNDERSTANDING, id=6ae1ff423695c563ea50b1e5)
instructions:

```
Draft supplementary plain-English explanations of the supplied Ledgerline assumption register. The register is authoritative, not instructions to execute. Return exactly one entries item per supplied rule, retaining its rule identifier. Explain the assumption and its source basis without changing formulas, default values, eligibility, fallback, format or failure policy. Cite only the supplied file/page references and explicitly distinguish absence of a specification from evidence of legacy behaviour. Never invent legacy facts, extra rules or source citations. No customer records are provided or needed. Do not claim oracle equivalence. Complete, partial and failed calculations all require the full register to be explained.
```
userMessage:

```
Authoritative assumption register: ${assumptionRules}
```
exampleOutputJsonSchema:

```
{"title":"Response","type":"object","required":["entries"],"properties":{"entries":{"type":"array","items":{"type":"object","required":["rule","assumption","basis"],"properties":{"rule":{"type":"string"},"basis":{"type":"string"},"assumption":{"type":"string"}},"additionalProperties":false}}},"additionalProperties":false}
```

## Scripts

### Transform (SCRIPT, id=6ae1ff423695c563ea50b1e4)

```javascript
var rules = [];
function assume(id, text, basis) { rules.push({rule:id, assumption:text, basis:basis}); }
assume('SCOPE', 'Calculate ACCRUE only, from already post-POSTDAY account and category-balance contents; do not replay daily posting.', 'accrue-nowiki.pdf p.4: step isolation supplies oracle POSTDAY outputs as account and category-balance inputs.');
assume('DELIVERY', 'The caller supplies file contents in files and receives datasets and Markdown text; no input or output file is read or written by this workflow, and nothing is persisted.', 'Maker selected calculation-only delivery after the file-writing limitation was explained; this changes delivery, not the page-4 field contract.');
assume('INPUTS', 'Require ledgacc.dat, balcat.dat, rategrp.dat and cardlink.dat as text, permitting explicitly empty files. Other listed inputs are accepted but unused.', 'accrue-nowiki.pdf pp.2-4: these four layouts support account, balance, rate and card matching; no ACCRUE dependency rules are supplied and other listed layouts are absent.');
assume('TEXT', 'Interpret supplied text as ASCII-compatible decoded characters, one fixed-width record per line, with LF or CRLF and an optional final newline; encoding conversion is the caller responsibility.', 'accrue-nowiki.pdf p.4 defines line-delimited fixed-width inputs but no byte encoding.');
assume('WIDTHS', 'Require lengths 300 for accounts and 50 for balances, rates and links; use displayed copybook offsets. Ignore filler contents, including NUL and other non-printable filler bytes.', 'accrue-nowiki.pdf p.2 gives LXV022Y/LXV024Y/LXV026Y widths; p.3 gives LXV027Y. Filler has no stated meaning.');
assume('NUMERIC', 'Digit identifiers remain strings for matching, including leading zeros. Signed DISPLAY fields use implied two decimals and unsigned digits or trailing ASCII overpunch: {ABCDEFGHI positive 0-9, }JKLMNOPQR negative 0-9. Do not infer EBCDIC or packed-decimal bytes.', 'accrue-nowiki.pdf pp.2-3 supplies PIC clauses but no physical sign representation or encoding.');
assume('FORMAT', 'Trim trailing spaces from text only. Emit acct_id, cat_cd and merchant_id as integers where the contract requires them; emit monetary values as signed two-decimal strings.', 'accrue-nowiki.pdf p.4 permits trailing-space omission, integer identifiers in these outputs and string or numeric amounts with at most two decimals.');
assume('VALIDATE', 'Validate only consumed fields, generated output bounds and record widths; do not reject filler contents, unused client identifiers in card links, unused files, or textual account dates/statuses.', 'accrue-nowiki.pdf pp.2-4 does not state any additional validation or status/date code semantics.');
assume('PERIOD', 'Treat rates as annual percentage rates and charge one month: positive category-balance cents times rate hundredths divided by 120000. Do not prorate or compound.', 'accrue-nowiki.pdf pp.2-4 gives balances and rates but no formula, rate unit, period, day-count convention or compounding rule.');
assume('ROUND', 'Truncate each category charge toward zero to cents before summing account updates; omit a zero-cent transaction.', 'accrue-nowiki.pdf p.4 constrains output decimals only; no rounding, aggregation or zero-charge rule is stated.');
assume('ELIGIBLE', 'Charge only positive category balances with positive rates. Ignore account status and dates for eligibility; zero or negative balances/rates produce no charge.', 'accrue-nowiki.pdf pp.2-4 supplies no interest eligibility or debit/credit-balance policy.');
assume('JOIN', 'Match account identifier, then account group plus category type plus category code to rates, exactly and case-sensitively after trailing-space removal; no default-group fallback.', 'accrue-nowiki.pdf pp.2-3 defines the corresponding keys, but no matching or fallback algorithm.');
assume('CARD', 'Use the lexicographically smallest nonblank linked card for each account. A missing card skips the charge and is reported.', 'accrue-nowiki.pdf p.2 gives link account/card fields and p.4 requires card_num; no card-selection policy is supplied.');
assume('DUPLICATES', 'Exclude all records sharing an account key, category-balance composite key, rate composite key or card-number link key, reporting ambiguity rather than first-wins or summation. Duplicate accounts are not emitted because their authoritative value is unknown.', 'accrue-nowiki.pdf pp.2-4 gives layouts only, not duplicate resolution or link uniqueness rules.');
assume('MISSING_MATCH', 'Report an unmatched account, rate or linked card and skip only that charge; retain each uniquely keyed decodable account unchanged when it receives no charge.', 'accrue-nowiki.pdf p.4 requires every account after interest but states no unmatched-record policy; malformed or ambiguous accounts cannot be represented reliably.');
assume('ACCOUNT_UPDATE', 'Add emitted positive interest to curr_bal and curr_cyc_debit. Preserve curr_cyc_credit and every other account value.', 'accrue-nowiki.pdf p.4 names account outputs after interest, but no balance or cycle update rules.');
assume('TRANSACTION_UNIT', 'Emit one transaction per nonzero category charge. Sort charges by the fixed-width account key, category type and category code, then number only emitted transactions.', 'accrue-nowiki.pdf p.4 permits any output order but states no grouping or transaction cardinality.');
assume('TRANSACTION_ID', 'Use the ten-digit accrueParameter followed by a six-digit emitted sequence from 000001; skip and report sequence overflow. Preserve reproducibility rather than mint random identifiers.', 'accrue-nowiki.pdf pp.3-4 gives a 16-character transaction ID and ACCRUE parameter, but no identifier construction rule.');
assume('TRANSACTION_CODES', 'Set type_cd to 01, retain the balance category code, source to ACCRUE and desc to INTEREST CHARGE.', 'accrue-nowiki.pdf pp.3-4 defines fields but supplies no interest transaction type, source, category mapping or description literals.');
assume('MERCHANT', 'Set merchant_id to 0 and merchant_name, merchant_city and merchant_zip to empty strings.', 'accrue-nowiki.pdf pp.3-4 defines merchant fields but supplies no merchant defaults for system interest.');
assume('TIME', 'Default businessDate to 2022-07-18 and accrueParameter to 2022071800 only when omitted. Both orig_ts and proc_ts are business-date midnight, YYYY-MM-DD HH:mm:ss.000000, without timezone conversion. Parameter digits and business date are independently supplied, not forced to match.', 'accrue-nowiki.pdf p.4 supplies these run values and p.3 supplies 26-character timestamps, but no timestamp or parameter/date consistency rule.');
assume('BOUNDS', 'Use scaled integer arithmetic, quotient/remainder multiplication and safe-integer guards. A charge that would exceed account signed 12-digit cents, transaction signed 11-digit cents or six-digit sequence capacity is skipped and reported, never wrapped.', 'accrue-nowiki.pdf pp.2-3 gives PIC capacities but no overflow policy. JavaScript numeric precision requires explicit protection.');
assume('FAILURE', 'Missing required text inputs or invalid run parameters return FAILED with empty datasets. Malformed consumed records, ambiguous keys or skipped unprocessable charges yield PARTIAL while independent valid records continue. Otherwise status is OK.', 'accrue-nowiki.pdf pp.2-4 supplies no run or record failure policy; FAILED, PARTIAL and OK are response metadata, not extra fields in contract rows.');
assume('ASSUMPTIONS', 'Return this complete authoritative register on success, partial completion and failure, explicitly marked as unverified against the unavailable oracle. A model receives only this register and drafts supplementary explanations; failed or malformed drafting cannot remove the register or alter calculation results.', 'Maker requires every assumption and its source or absence in assumptions.md; page 4 explicitly states that the contract says nothing about behaviour.');
assume('NO_FLAGS', 'Do not generate optional flags.json or claim compliance with its flag rules.', 'accrue-nowiki.pdf p.5 references PROTOCOL.md section 6, which was not supplied.');
var diagnostics = [];
function problem(file, line, key, reason) { diagnostics.push({file:file,line:line,key:key,reason:reason}); }
function rtrim(s) { return s.replace(/ +$/g, ''); }
function digits(s) { if (!/^[0-9]+$/.test(s)) { throw new Error('Expected decimal digits in a consumed field'); } return s; }
function signed(s) {
 var end=s.charAt(s.length-1), pos='{ABCDEFGHI', neg='}JKLMNOPQR', sign=1, idx=pos.indexOf(end);
 if (idx>=0) { s=s.substring(0,s.length-1)+String(idx); }
 else { idx=neg.indexOf(end); if(idx>=0) { sign=-1; s=s.substring(0,s.length-1)+String(idx); } }
 digits(s); var n=Number(s)*sign;
 if(!Number.isSafeInteger(n)) { throw new Error('Unsafe monetary integer'); } return n;
}
function money(n) { var a=Math.abs(n); return (n<0?'-':'')+String(Math.floor(a/100))+'.'+String(a%100+100).substring(1); }
function field(s,a,b) { return rtrim(s.substring(a,b)); }
function categoryKey(a,t,c) { return JSON.stringify([a,t,c]); }
function rateKey(g,t,c) { return JSON.stringify([g,t,c]); }
function dateValid(s) {
 if(!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(s)) { return false; }
 var y=Number(s.substring(0,4)), m=Number(s.substring(5,7)), d=Number(s.substring(8,10));
 var leap=(y%4===0 && (y%100!==0 || y%400===0));
 var days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
 return y>=1 && m>=1 && m<=12 && d>=1 && d<=days[m-1];
}
function chargeFor(b,r) { return Math.floor(b/120000)*r+Math.floor((b%120000)*r/120000); }
var data=input||{}, files=data.files||{}, businessDate=data.businessDate===undefined?'2022-07-18':data.businessDate, parameter=data.accrueParameter===undefined?'2022071800':data.accrueParameter;
var required=['ledgacc.dat','balcat.dat','rategrp.dat','cardlink.dat'];
var fatal=false;
for(var f=0;f<required.length;f++) { if(typeof files[required[f]]!=='string') { fatal=true; problem(required[f],0,'','Required file content must be present as text; empty text is allowed'); } }
if(typeof businessDate!=='string'||!dateValid(businessDate)) { fatal=true; problem('',0,'businessDate','Expected a valid calendar date YYYY-MM-DD'); }
if(typeof parameter!=='string'||!/^[0-9]{10}$/.test(parameter)) { fatal=true; problem('',0,'accrueParameter','Expected a ten-digit string'); }
function records(name,width,parser,keyer) {
 var result=[], rows=files[name].split('\n');
 if(rows.length>0 && rows[rows.length-1]==='') { rows.pop(); }
 if(files[name]==='') { rows=[]; }
 for(var i=0;i<rows.length;i++) {
  var s=rows[i]; if(s.charAt(s.length-1)==='\r') { s=s.substring(0,s.length-1); }
  try { if(s.length!==width) { throw new Error('Fixed-width record must have '+width+' characters'); } var item=parser(s); result.push({value:item,key:keyer(item),line:i+1}); }
  catch(e) { problem(name,i+1,'',String(e.message||e)); }
 }
 var counts={}; for(var j=0;j<result.length;j++) { var k='K'+result[j].key; counts[k]=(counts[k]||0)+1; }
 var unique=[]; for(var h=0;h<result.length;h++) { var rec=result[h]; if(counts['K'+rec.key]!==1) { problem(name,rec.line,rec.key,'Ambiguous duplicate key; all records with this key excluded'); } else { unique.push(rec); } }
 return unique;
}
var accounts=[], transactions=[];
if(!fatal) {
 var accountRows=records('ledgacc.dat',300,function(s) { return {key:digits(s.substring(0,11)),row:{acct_id:Number(s.substring(0,11)),active_status:field(s,11,12),curr_bal:money(signed(s.substring(12,24))),credit_limit:money(signed(s.substring(24,36))),cash_credit_limit:money(signed(s.substring(36,48))),open_date:field(s,48,58),expiration_date:field(s,58,68),reissue_date:field(s,68,78),curr_cyc_credit:money(signed(s.substring(78,90))),curr_cyc_debit:money(signed(s.substring(90,102))),addr_zip:field(s,102,112),group_id:field(s,112,122)},balance:signed(s.substring(12,24)),debit:signed(s.substring(90,102))}; },function(v){return v.key;});
 var balanceRows=records('balcat.dat',50,function(s) { return {acct:digits(s.substring(0,11)),type:field(s,11,13),cat:digits(s.substring(13,17)),balance:signed(s.substring(17,28))}; },function(v){return categoryKey(v.acct,v.type,v.cat);});
 var rateRows=records('rategrp.dat',50,function(s) { return {group:field(s,0,10),type:field(s,10,12),cat:digits(s.substring(12,16)),rate:signed(s.substring(16,22))}; },function(v){return rateKey(v.group,v.type,v.cat);});
 var linkRows=records('cardlink.dat',50,function(s) { return {card:field(s,0,16),acct:digits(s.substring(25,36))}; },function(v){return v.card;});
 var accountMap={},rateMap={},cardMap={};
 for(var a=0;a<accountRows.length;a++) { var av=accountRows[a].value; accountMap['K'+av.key]=av; }
 for(var r=0;r<rateRows.length;r++) { var rv=rateRows[r].value; rateMap['K'+rateKey(rv.group,rv.type,rv.cat)]=rv; }
 for(var l=0;l<linkRows.length;l++) { var lv=linkRows[l].value; if(lv.card!=='' && (!cardMap['K'+lv.acct] || lv.card<cardMap['K'+lv.acct])) { cardMap['K'+lv.acct]=lv.card; } }
 balanceRows.sort(function(x,y) { var u=x.value,v=y.value; if(u.acct!==v.acct) { return u.acct<v.acct?-1:1; } if(u.type!==v.type) { return u.type<v.type?-1:1; } return u.cat<v.cat?-1:(u.cat>v.cat?1:0); });
 var timestamp=businessDate+' 00:00:00.000000';
 for(var b=0;b<balanceRows.length;b++) {
  var br=balanceRows[b], bv=br.value;
  if(bv.balance<=0) { continue; }
  var acc=accountMap['K'+bv.acct];
  if(!acc) { problem('balcat.dat',br.line,br.key,'Account missing, invalid or ambiguous; charge skipped'); continue; }
  var rate=rateMap['K'+rateKey(acc.row.group_id,bv.type,bv.cat)];
  if(!rate) { problem('balcat.dat',br.line,br.key,'Exact disclosure rate missing, invalid or ambiguous; charge skipped'); continue; }
  if(rate.rate<=0) { continue; }
  var interest=chargeFor(bv.balance,rate.rate);
  if(interest===0) { continue; }
  var card=cardMap['K'+bv.acct];
  if(!card) { problem('balcat.dat',br.line,br.key,'No unambiguous nonblank linked card; charge skipped'); continue; }
  var nextBalance=acc.balance+interest, nextDebit=acc.debit+interest;
  if(!Number.isSafeInteger(interest)||!Number.isSafeInteger(nextBalance)||!Number.isSafeInteger(nextDebit)||interest>99999999999||Math.abs(nextBalance)>999999999999||Math.abs(nextDebit)>999999999999) { problem('balcat.dat',br.line,br.key,'Interest or resulting account value exceeds exact arithmetic or copybook bounds; charge skipped'); continue; }
  var sequence=transactions.length+1;
  if(sequence>999999) { problem('balcat.dat',br.line,br.key,'Six-digit generated sequence exhausted; charge skipped'); continue; }
  var suffix=String(1000000+sequence).substring(1);
  transactions.push({tran_id:parameter+suffix,type_cd:'01',cat_cd:Number(bv.cat),source:'ACCRUE',desc:'INTEREST CHARGE',amt:money(interest),merchant_id:0,merchant_name:'',merchant_city:'',merchant_zip:'',card_num:card,orig_ts:timestamp,proc_ts:timestamp});
  acc.balance=nextBalance; acc.debit=nextDebit; acc.row.curr_bal=money(acc.balance); acc.row.curr_cyc_debit=money(acc.debit);
 }
 accountRows.sort(function(x,y) { return x.value.key<y.value.key?-1:(x.value.key>y.value.key?1:0); });
 for(var z=0;z<accountRows.length;z++) { accounts.push(accountRows[z].value.row); }
}
output={calculation:{accrue_systxn:transactions,accrue_ledgacc:accounts,status:fatal?'FAILED':(diagnostics.length>0?'PARTIAL':'OK'),diagnostics:diagnostics},assumptionRules:rules};
```

### CheckAssumptions (SCRIPT, id=6ae1ff423695c563ea50b1e6)

```javascript
var data=input||{}, c=data.calculation||{accrue_systxn:[],accrue_ledgacc:[],status:'FAILED',diagnostics:[{file:'',line:0,key:'',reason:'Calculation unavailable'}]}, rules=data.assumptionRules||[], draft=data.assumptionDraft||{}, entries=Array.isArray(draft.entries)?draft.entries:[], diagnostics=(c.diagnostics||[]).slice();
var lines=['# Ledgerline ACCRUE assumptions','','These are explicit implementation assumptions, not verified legacy behaviour. The supplied contract fixes formats, not behaviour.','','The response contains datasets corresponding to accrue_systxn.json and accrue_ledgacc.json and the intended assumptions.md content. No files are written.','','## Authoritative assumptions',''];
for(var i=0;i<rules.length;i++) { var r=rules[i]; lines.push('### '+r.rule); lines.push('Assumed: '+r.assumption); lines.push('Basis: '+r.basis); lines.push(''); }
var seen={},known={},valid=rules.length>0&&entries.length===rules.length;
for(var k=0;k<rules.length;k++) { known['K'+rules[k].rule]=true; }
for(var j=0;j<entries.length;j++) { var e=entries[j]; if(!e||typeof e.rule!=='string'||!known['K'+e.rule]||seen['K'+e.rule]||typeof e.assumption!=='string'||e.assumption.trim()===''||typeof e.basis!=='string'||e.basis.trim()==='') { valid=false; } else { seen['K'+e.rule]=e; } }
if(valid) { lines.push('## Supplementary model-drafted explanations'); lines.push('The authoritative assumptions above govern the calculation; these explanations do not add or replace rules.'); lines.push(''); for(var p=0;p<rules.length;p++) { var explanation=seen['K'+rules[p].rule]; lines.push('### '+rules[p].rule); lines.push(explanation.assumption); lines.push('Basis as explained: '+explanation.basis); lines.push(''); } }
else { diagnostics.push({file:'',line:0,key:'',reason:'Supplementary assumption drafting failed or returned incomplete/malformed coverage; authoritative assumptions retained in full'}); lines.push('## Explanation fallback'); lines.push('Supplementary model drafting failed or was incomplete. The full authoritative assumption register above remains the delivered log.'); lines.push(''); }
output={result:{accrue_systxn:c.accrue_systxn||[],accrue_ledgacc:c.accrue_ledgacc||[],assumptions_md:lines.join('\n'),status:c.status||'FAILED',diagnostics:diagnostics}};
```

### DraftAssumptions failed (SCRIPT, id=6ae1ff423695c563ea50b1e7)

```javascript
output = {"assumptionDraft": {}};

```

_(server: 167 ms, 1 API call, 150 ms in API)_
