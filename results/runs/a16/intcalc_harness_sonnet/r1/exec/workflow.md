# Workflow: CalculateCardDemoInterest

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** 

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae13dbc3695c563ea509767 | <uuid> | (0, 0) | → Transform (seq:<uuid>) |
| End | END | 6ae13dbc3695c563ea509768 | <uuid> | (600, 0) | — |
| Transform | SCRIPT | 6ae13dbd3695c563ea509769 | <uuid> | (300, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |

## Systems
_(none)_

## Scripts

### Transform (SCRIPT, id=6ae13dbd3695c563ea509769)

```javascript
var src = input || {};
var accounts = Array.isArray(src.accounts) ? src.accounts : [];
var balances = Array.isArray(src.categoryBalances) ? src.categoryBalances : [];
var rates = Array.isArray(src.disclosureGroups) ? src.disclosureGroups : [];
var xrefs = Array.isArray(src.cardXrefs) ? src.cardXrefs : [];
var existing = Array.isArray(src.existingTransactions) ? src.existingTransactions : [];
var day = src.businessDate == null ? '2022-07-18' : String(src.businessDate);
var prefix = src.interestRunDate == null ? '2022071800' : String(src.interestRunDate);
var errors = [], transactions = [], updated = [];
var assumptions = [];
function note(a,s) { assumptions.push({whatYouAssumed:a,wikiStatementOrAbsence:'cr1-intcalc-sonnet.pdf '+s}); }
note('The core accepts decoded records and returns datasets and Markdown, not physical files. Accounts and category balances must be the isolated POSTTRAN results. Other batch inputs are not read by this step.','p.24, CONTRACT.md lists file inputs and isolated POSTTRAN outputs; file adaptation is excluded by the maker-selected scope.');
note('Omitted record lists mean empty lists; omitted businessDate is 2022-07-18 and omitted interestRunDate is 2022071800. No database state is read or changed.','p.24 supplies those run parameters; p.3 allows a run-date default/override; decoded-list defaults and stateless invocation are implementation conventions.');
note('Match account identifiers as 11-digit strings, type codes as two digits and categories as four digits; remove trailing spaces from group identifiers. Convert account and category identifiers to the integer types required only at output.','pp.6,9 give identifier widths; p.24 requires integer acct_id and cat_cd. Normalisation at the decoded boundary is an implementation convention.');
note('Use exact integer cents and hundredths of an annual percentage. Round each category half away from zero and then add rounded category amounts. Do not reject negative or zero balances and do not filter on account active status.','p.2 BR-03/06/08 states calculation, accumulation and signed rounding; no active-status or positive-balance restriction is specified.');
note('Look up the exact account group, type and category; only a missing row triggers DEFAULT, never a found zero rate.','p.2 BR-01/02/10 and pp.17-18 describe missing-group fallback and zero-rate categories.');
note('A nonzero rate creates a transaction even if the rounded amount is zero.','p.2 BR-03 conditions writing on nonzero rate rather than on rounded interest; zero-rounded writing is not separately specified.');
note('Return every account. Only accounts represented in category balances receive balance updates and cycle-credit/debit resets, including accounts whose categories all have zero rates. All other account fields are copied.','p.2 BR-06 describes updating at account changes; p.24 requires all accounts but is silent about accounts with no category balances.');
note('Sort accounts and categories by account, type and category. Transaction suffixes start at 000001 and use six digits after the ten-digit run prefix.','p.2 BR-05 specifies prefix plus running suffix; p.8 specifies a 16-character identifier; starting value, suffix width and ordering are not specified together.');
note('Skip transaction identifiers supplied in existingTransactions; suffix exhaustion fails the affected account. Repeating a call without prior identifiers can reproduce identifiers and does not deduplicate interest.','p.20 prescribes collision retries; p.2 BR-05 does not define exhaustion or rerun idempotence; this core has no persistent sequence.');
note('Choose the lowest card number from account cross-references; use blank card when none is available.','p.8 describes cross-references; p.2 BR-04 does not specify card selection or missing-card handling for interest.');
note('Merchant identifier is zero and merchant name, city and ZIP are blank.','pp.8-9 list required transaction fields; p.2 BR-04 does not state their interest-transaction values.');
note('Original and processed timestamps are both business-date midnight, formatted YYYY-MM-DD 00:00:00.000000.','p.9 specifies 26-character timestamp fields; p.24 supplies the business date but does not define generated timestamps.');
note('No usable DEFAULT rate, missing account, duplicate read keys, invalid calculation values or overflow produces an account-specific error. Keep that account unchanged and return no transactions for it; continue other accounts.','pp.18,20 describe fallback and per-record failures; p.22 describes chain failure, but interest-specific failure outcomes are absent; maker selected per-account continuation.');
note('Validate only fields used in calculation, matching and generated values. Ignore unrelated input fields and filler; do not reject records for filler bytes. Amount and rate bounds follow their documented copybook digit capacities.','pp.6,8-9 supply signed decimal capacities; no general validation of unrelated fields or filler is specified.');
note('The transaction description uses the 11-digit account identifier, type 01, integer category 5 and source System. No fees are produced. The returned transaction list contains only this invocation\'s interest, not prior transactions.','p.2 BR-04/07/09; p.4 leaves fees marked as a decision, while BR-07 documents an empty stub; p.24 requires every interest transaction written.');
note('Malformed run parameters are reported against each affected account without failing unrelated accounts that require no generated transaction. Blank-input invocation returns empty datasets and the assumption entries.','p.24 gives concrete parameters but no parameter-validation or empty-run policy; this follows the selected per-account failure boundary.');
function text(x) { return x == null ? '' : String(x).replace(/ +$/g,''); }
function id(x,n) { var s=text(x); if(!/^\d+$/.test(s)||s.length>n) throw new Error('invalid '+n+'-digit identifier'); return s.padStart(n,'0'); }
function decimal(x,max) { var s=String(x); if(!/^[+-]?\d+(\.\d{1,2})?$/.test(s)) throw new Error('invalid decimal calculation value'); var neg=s.charAt(0)==='-'; s=s.replace(/^[+-]/,''); var p=s.split('.'); var cents=BigInt(p[0])*100n+BigInt(((p[1]||'')+'00').slice(0,2)); if(cents>max) throw new Error('calculation value exceeds copybook capacity'); return neg ? -cents : cents; }
function money(x) { var neg=x<0n; var a=neg ? -x : x; return (neg?'-':'')+String(a/100n)+'.'+String(a%100n).padStart(2,'0'); }
function rounded(x) { var a=x<0n ? -x : x; var q=a/120000n; if((a%120000n)*2n>=120000n) q+=1n; return x<0n ? -q : q; }
function err(a,t,c,msg) { errors.push({acct_id:a,type_cd:t||'',cat_cd:c||'',message:'Account '+String(a)+': '+msg+'; account unchanged.'}); }
var byAccount = Object.create(null), rows = Object.create(null), rmap = Object.create(null), cards = Object.create(null), used = Object.create(null);
var records=[];
accounts.forEach(function(a,index) { var k; try { k=id(a.acct_id,11); } catch(e) { k='invalid'+index; } var entry={key:k,record:a}; records.push(entry); if(!byAccount[k]) byAccount[k]=[]; byAccount[k].push(entry); });
balances.forEach(function(b) { try { var k=id(b.acct_id,11); if(!rows[k]) rows[k]=[]; rows[k].push(b); if(!byAccount[k]) err(Number(k),text(b.type_cd),text(b.cat_cd),'category balance has no account'); } catch(e) { err(b.acct_id,text(b.type_cd),text(b.cat_cd),e.message); } });
rates.forEach(function(r) { try { var k=text(r.group_id)+'|'+id(r.type_cd,2)+'|'+id(r.cat_cd,4); if(!rmap[k]) rmap[k]=[]; rmap[k].push(r); } catch(e) { /* Unmatched malformed reference rows are not consumed. */ } });
xrefs.forEach(function(x) { try { var k=id(x.acct_id,11); var c=id(x.card_num,16); if(!cards[k]||c<cards[k]) cards[k]=c; } catch(e) { /* Invalid cross-references are unavailable for deterministic selection. */ } });
existing.forEach(function(t) { used[text(t.tran_id)]=true; });
var seq=1;
var fields=['acct_id','active_status','curr_bal','credit_limit','cash_credit_limit','open_date','expiration_date','reissue_date','curr_cyc_credit','curr_cyc_debit','addr_zip','group_id'];
records.sort(function(a,b) { return a.key<b.key?-1:a.key>b.key?1:0; });
records.forEach(function(entry) {
 var a=entry.record, k=entry.key, out={}; fields.forEach(function(f) { out[f]=a[f]; });
 var list=rows[k]||[], temporary=[], next=seq, localIds=Object.create(null), t='', c='';
 try {
  var canonical=id(a.acct_id,11); out.acct_id=Number(canonical);
  if(byAccount[k].length!==1) throw new Error('duplicate account identifier');
  if(list.length) {
   var current=decimal(a.curr_bal,999999999999n), total=0n, seen=Object.create(null);
   var ordered=list.map(function(b) { return {row:b,type:id(b.type_cd,2),cat:id(b.cat_cd,4)}; });
   ordered.sort(function(x,y) { var p=x.type+x.cat,q=y.type+y.cat; return p<q?-1:p>q?1:0; });
   ordered.forEach(function(b) {
    t=b.type; c=b.cat; var key=t+'|'+c;
    if(seen[key]) throw new Error('duplicate category-balance key'); seen[key]=true;
    var matched=rmap[text(a.group_id)+'|'+key]; if(!matched) matched=rmap['DEFAULT|'+key];
    if(!matched) throw new Error('no rate for type '+t+', category '+c+', including DEFAULT');
    if(matched.length!==1) throw new Error('duplicate disclosure-rate key for type '+t+', category '+c);
    var rate=decimal(matched[0].interestRate,999999n), bal=decimal(b.row.bal,99999999999n);
    if(rate!==0n) {
     var interest=rounded(bal*rate); if(interest>99999999999n||interest< -99999999999n) throw new Error('interest amount overflow');
     if(!/^\d{10}$/.test(prefix)) throw new Error('run prefix must contain ten digits');
     if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||isNaN(Date.parse(day+'T00:00:00.000Z'))||new Date(day+'T00:00:00.000Z').toISOString().slice(0,10)!==day) throw new Error('invalid business date');
     var txid='';
     while(next<=999999) { txid=prefix+String(next).padStart(6,'0'); next++; if(!used[txid]&&!localIds[txid]) break; txid=''; }
     if(!txid) throw new Error('transaction suffix exhausted'); localIds[txid]=true;
     var ts=day+' 00:00:00.000000';
     temporary.push({tran_id:txid,type_cd:'01',cat_cd:5,source:'System',desc:'Int. for a/c '+canonical,amt:money(interest),merchant_id:0,merchant_name:'',merchant_city:'',merchant_zip:'',card_num:cards[k]||'',orig_ts:ts,proc_ts:ts});
     total+=interest;
    }
   });
   var finalBalance=current+total; if(finalBalance>999999999999n||finalBalance< -999999999999n) throw new Error('account balance overflow');
   out.curr_bal=money(finalBalance); out.curr_cyc_credit='0.00'; out.curr_cyc_debit='0.00';
   temporary.forEach(function(tr) { transactions.push(tr); used[tr.tran_id]=true; }); seq=next;
  }
 } catch(e) { out={}; fields.forEach(function(f) { out[f]=a[f]; }); if(/^\d{11}$/.test(k)) out.acct_id=Number(k); err(out.acct_id,t,c,e.message); }
 updated.push(out);
});
note('Malformed disclosure keys are unavailable for matching; malformed cross-reference rows are unavailable for card selection. Duplicate keys fail only accounts that actually read them. Successful accounts commit their tentative generated identifiers; failed accounts consume none.','pp.8-9 describe key shapes and p.20 collision handling, but malformed optional reference selection, duplicate lookup keys and failed-account suffix consumption are unstated.');
function escapeCell(s) { return String(s).replace(/\|/g,'\\|').replace(/[\r\n]+/g,' '); }
var md='| What you assumed | Which wiki statement (or absence of one) it rests on |\n| --- | --- |\n';
assumptions.forEach(function(n) { md+='| '+escapeCell(n.whatYouAssumed)+' | '+escapeCell(n.wikiStatementOrAbsence)+' |\n'; });
output={result:{intcalc_systran_json:transactions,intcalc_acctdata_json:updated,assumptions:assumptions,assumptions_md:md,errors:errors,status:errors.length?'PARTIAL':'OK'}};
```

_(server: 311 ms, 1 API call, 307 ms in API)_
