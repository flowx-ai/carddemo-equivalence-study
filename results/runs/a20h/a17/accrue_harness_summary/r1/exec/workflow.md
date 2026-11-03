# Workflow: CalculateLedgerlineInterest

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** 

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae1bc623695c563ea50a5d1 | <uuid> | (0, 0) | → Calculate interest (seq:<uuid>) |
| Return results | END | 6ae1bc623695c563ea50a5d2 | <uuid> | (600, 0) | — |
| Calculate interest | SCRIPT | 6ae1bc623695c563ea50a5d3 | <uuid> | (300, 0) | → Return results (seq:<uuid>) | lang: JAVASCRIPT |

## Systems
_(none)_

## Scripts

### Calculate interest (SCRIPT, id=6ae1bc623695c563ea50a5d3)

```javascript
function calculate(p) {
var issues = [];
function issue(file,line,code,message) { issues.push({file:file,line:line,code:code,message:message}); }
var notes = [
'# ACCRUE assumptions and provenance',
'',
'This is a calculation-only implementation. accrue_systxn and accrue_ledgacc are returned JSON contents; this Markdown is returned as assumptions_md. No files are written, no persistent accounts are updated, and legacy parity has not been verified. CONTRACT.md fixes formats rather than complete behaviour (accrue-summary.pdf, p.5). Only summary sections are available; the detailed integration workflows and acceptance criteria referenced on p.2 were not supplied.',
'',
'## Rules and their sources',
'- Input boundary: the caller must supply isolated POSTDAY account and balance outputs, not pre-POSTDAY data. No automatic filesystem reads, POSTDAY, POSTDAY outputs, scheduling, legacy batch invocation or optional flags protocol is implemented. Source: CONTRACT.md references on p.5; the flag protocol and detailed workflows are absent from the supplied material (p.2). This boundary cannot be verified from the supplied text contents.',
'- Layout: use the confirmed zero-based layouts from pp.3–4: account ID 0:11, status 11:1, five signed account money fields at 12:12, 24:12, 36:12, 78:12 and 90:12; dates 48:10, 58:10, 68:10; ZIP 102:10; group 112:10. Card link uses card 0:16 and account 25:11, ignoring client 16:9. Balance uses account 0:11, type 11:2, category 13:4, amount 17:11. Rate uses group 0:10, type 10:2, category 12:4, rate 16:6. Nominal record lengths are 300, 50, 50 and 50 respectively. Filler, including non-printable bytes, is ignored; only fields actually read must be present. These supplied layouts interpret the pictures on pp.3–4; no unused-file layouts are inferred.',
'- Encoding assumption: money and rate are signed display numerics with two implied decimal places. Accept digits, one leading or trailing plus/minus, or final ASCII overpunch {ABCDEFGHI / }JKLMNOPQR for positive/negative 0–9. Surrounding spaces within a numeric field are ignored; embedded spaces and other encodings are unusable. Source: numeric pictures on pp.3–4; encoding and whitespace handling are not specified there.',
'- Record interpretation assumption: split CRLF, LF or CR without trimming records; ignore only truly empty physical lines and retain physical line numbers. Remove trailing spaces only from output text fields. Keep digit identifiers, leading zeroes, type codes and category keys as strings internally; require their supplied digit widths. Normalize group padding by removing trailing spaces consistently, preserving case and leading spaces. Convert only account, category and merchant identifiers to output integers; all money is a two-decimal string. Source: widths/pictures on pp.3–4 and output types on p.5; line endings and padding policy are not specified.',
'- Duplicate assumption: first physical account, rate and card-link key wins, even if its remaining fields are unusable; later duplicates are reported and ignored. Account identity is the fixed-width account key, rate identity is group/type/category, and card-link identity for this calculation is account. Each physical balance record is processed once, including repeated balance keys. Output accounts follow first-account order; postings follow balance-file order. Source: record layouts on pp.3–4; duplicate and ordering policy is absent from the summary on p.2.',
'- Lookup: try exact account-group/type/category first, then STANDARD/type/category only if the exact key is absent. An exact zero rate suppresses posting and never triggers fallback. An unusable exact rate is not an absent rate. Missing exact and fallback rates or an unusable selected rate skip that balance calculation. Source: STANDARD fallback and nonzero-rate test on p.2; absent-versus-zero and unusable-rate handling are inferred.',
'- Arithmetic assumption: interpret the annual rate as a percentage; compute each balance-category interest independently as balance cents times rate hundredths divided by 120000. Use exact integer arithmetic and truncate toward zero to whole cents before accumulating account totals. Preserve negative balances and rates. Post for every nonzero selected rate, even if its calculated amount truncates to zero; post nothing for a zero selected rate. Source: monthly interest and nonzero-rate test on p.2; annual-percentage interpretation, formula, rounding stage, sign policy and zero-cent posting behaviour are not specified.',
'- Transaction defaults assumption: sequential sixteen-digit transaction identifiers starting at one in posting order; type 07, category 12, source ACCRUE, description Monthly interest; merchant identifier 0 and empty merchant name/city/ZIP. Select the first physical matching card link, or an empty card number when unavailable. Both timestamps are business-date midnight with six fractional digits, formatted YYYY-MM-DD 00:00:00.000000. Source: interest type/category on p.2 and transaction fields on pp.4–5; identifiers, source, description, merchant values, card selection and timestamps are undocumented.',
'- Run defaults assumption: businessDate defaults to 2022-07-18 and accrueParameter to 2022071800 when absent, null or empty. Validate businessDate as a real ISO calendar date. The job parameter is accepted as metadata only and does not override the business date or change the formula; its operational protocol is not supplied. Source: contract defaults on p.5; date validation, precedence and parameter semantics are otherwise absent.',
'- Account update assumption: add precisely the sum of posted, already-truncated interest to each readable account current balance. Reset cycle credit and debit to 0.00 only for readable accounts whose valid account key appears in a balance record, even if that balance calculation is skipped; accounts absent from the balance file retain cycle totals. Preserve every other contract account field and return each readable first-key account once. No active-status eligibility filter is applied. Source: completion by account on p.2 and every-account output on p.5; reset boundary, sign convention, filtering and skipped-calculation reset handling are not specified.',
'- Unused-input assumption: daytxnText, clntrecText, crdrecText, txntypeText and txncatgText are accepted supplied contents but not parsed and have no calculation effect. No validation of ignored client identifiers or filler is performed. Source: p.2 describes interest using balances, accounts, rates and card links without an effect from these other contract inputs (p.5).',
'- Failure assumption: all nine contents must be supplied as strings; an explicitly empty string denotes an empty file. Missing/non-string contents or an invalid business date fail before calculation with empty output lists. Unusable records are reported locally and do not stop unrelated records. Any reported record issue, including an ignored duplicate, marks the result partial; otherwise it is complete. A result with no usable accounts after record errors is partial, not a claim of completed calculations. Source: error/status, empty-file and duplicate severity policies are absent from pp.2–5.',
'- Readability assumption: an account is readable only when its account key, all returned text spans and all five money fields are usable. Preserve contract text by removing trailing spaces only, without validating date or status contents. An invalid account is omitted and reported rather than repaired. An invalid/missing card link yields an empty posting card number and a reported issue. Source: fields on pp.3–5; recovery and readability criteria are not specified.',
'',
'## Run'
];
var date = (p.businessDate === undefined || p.businessDate === null || p.businessDate === '') ? '2022-07-18' : p.businessDate;
var parameter = (p.accrueParameter === undefined || p.accrueParameter === null || p.accrueParameter === '') ? '2022071800' : p.accrueParameter;
var contents = {ledgaccText:p.ledgaccText,cardlinkText:p.cardlinkText,balcatText:p.balcatText,rategrpText:p.rategrpText,daytxnText:p.daytxnText,clntrecText:p.clntrecText,crdrecText:p.crdrecText,txntypeText:p.txntypeText,txncatgText:p.txncatgText};
Object.keys(contents).forEach(function(k) { if (typeof contents[k] !== 'string') issue(k,null,'missing_contents','Required supplied contents must be a string; an empty string is an empty file.'); });
function validDate(s) {
if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
var y = Number(s.slice(0,4)), m = Number(s.slice(5,7)), d = Number(s.slice(8,10));
var days = [31,((y%4===0 && y%100!==0)||y%400===0)?29:28,31,30,31,30,31,31,30,31,30,31];
return y >= 1 && m >= 1 && m <= 12 && d >= 1 && d <= days[m-1];
}
if (!validDate(date)) issue('businessDate',null,'invalid_date','Expected a real YYYY-MM-DD calendar date.');
notes.push('- businessDate: ' + JSON.stringify(date));
notes.push('- accrueParameter (metadata only): ' + JSON.stringify(parameter));
function finish(accounts,transactions,status) {
var md = notes.concat(['','## Outcome','- Status: '+status,'- Returned account rows: '+accounts.length,'- Returned transaction rows: '+transactions.length,'- Files written: none','','## Skipped records and other issues']);
if (!issues.length) md.push('None.');
issues.forEach(function(x) { md.push('- '+JSON.stringify(x)); });
return {accrue_systxn:transactions,accrue_ledgacc:accounts,assumptions_md:md.join('\n'),status:status,issues:issues};
}
if (issues.length) return finish([],[],'failed');
var ZERO = BigInt(0), HUNDRED = BigInt(100), DENOM = BigInt(120000);
function rtrim(s) { return s.replace(/ +$/,''); }
function field(s,start,len,name) { if (s.length < start+len) throw new Error('Missing or truncated '+name+' field.'); return s.slice(start,start+len); }
function digits(s,len,name) { if (s.length!==len || !/^\d+$/.test(s)) throw new Error('Unusable '+name+': expected '+len+' digits.'); return s; }
function money(s,name) {
var t=s.trim(), sign=1;
if (!t) throw new Error('Empty '+name+'.');
if (t.charAt(0)==='+' || t.charAt(0)==='-') { sign=t.charAt(0)==='-'?-1:1; t=t.slice(1); }
else if (t.charAt(t.length-1)==='+' || t.charAt(t.length-1)==='-') { sign=t.charAt(t.length-1)==='-'?-1:1; t=t.slice(0,-1); }
else {
var last=t.charAt(t.length-1), pos='{ABCDEFGHI'.indexOf(last), neg='}JKLMNOPQR'.indexOf(last);
if (pos>=0) t=t.slice(0,-1)+String(pos);
else if (neg>=0) { sign=-1; t=t.slice(0,-1)+String(neg); }
}
if (!/^\d+$/.test(t)) throw new Error('Unusable signed display numeric '+name+'.');
var n=BigInt(t); return sign<0 ? -n : n;
}
function format(n) { var neg=n<ZERO; if (neg) n=-n; return (neg?'-':'')+String(n/HUNDRED)+'.'+String(n%HUNDRED).padStart(2,'0'); }
function each(text,file,fn) { text.split(/\r\n|\n|\r/).forEach(function(s,i) { if (s==='') return; try { fn(s,i+1); } catch(e) { issue(file,i+1,'unusable_record',String(e.message || e)); } }); }
function rateKey(g,t,c) { return JSON.stringify([g,t,c]); }
var accounts = new Map(), accountSeen = new Set(), ordered = [], cards = new Map(), cardSeen = new Set(), rates = new Map(), boundary = new Set();
each(p.ledgaccText,'ledgaccText',function(s,line) {
var id=digits(field(s,0,11,'acct_id'),11,'acct_id');
if (accountSeen.has(id)) { issue('ledgaccText',line,'duplicate_account','Ignored later account key '+id+'.'); return; }
accountSeen.add(id);
var bal=money(field(s,12,12,'curr_bal'),'curr_bal');
var row={acct_id:Number(id),active_status:rtrim(field(s,11,1,'active_status')),curr_bal:format(bal),credit_limit:format(money(field(s,24,12,'credit_limit'),'credit_limit')),cash_credit_limit:format(money(field(s,36,12,'cash_credit_limit'),'cash_credit_limit')),open_date:rtrim(field(s,48,10,'open_date')),expiration_date:rtrim(field(s,58,10,'expiration_date')),reissue_date:rtrim(field(s,68,10,'reissue_date')),curr_cyc_credit:format(money(field(s,78,12,'curr_cyc_credit'),'curr_cyc_credit')),curr_cyc_debit:format(money(field(s,90,12,'curr_cyc_debit'),'curr_cyc_debit')),addr_zip:rtrim(field(s,102,10,'addr_zip')),group_id:rtrim(field(s,112,10,'group_id'))};
var a={id:id,row:row,balance:bal,posted:ZERO}; accounts.set(id,a); ordered.push(a);
});
each(p.cardlinkText,'cardlinkText',function(s,line) {
var id=digits(field(s,25,11,'acct_id'),11,'acct_id');
if (cardSeen.has(id)) { issue('cardlinkText',line,'duplicate_card_link','Ignored later card link for '+id+'.'); return; }
cardSeen.add(id);
cards.set(id,digits(field(s,0,16,'card_num'),16,'card_num'));
});
each(p.rategrpText,'rategrpText',function(s,line) {
var g=rtrim(field(s,0,10,'group_id')), t=digits(field(s,10,2,'type_cd'),2,'type_cd'), c=digits(field(s,12,4,'cat_cd'),4,'cat_cd');
var k=rateKey(g,t,c);
if (rates.has(k)) { issue('rategrpText',line,'duplicate_rate','Ignored later rate key '+k+'.'); return; }
rates.set(k,{usable:false});
var r=money(field(s,16,6,'rate'),'rate'); rates.set(k,{usable:true,value:r});
});
var transactions=[], sequence=BigInt(1), timestamp=date+' 00:00:00.000000';
each(p.balcatText,'balcatText',function(s,line) {
var id=digits(field(s,0,11,'acct_id'),11,'acct_id'); boundary.add(id);
var a=accounts.get(id);
if (!a) { issue('balcatText',line,'missing_account','Skipped calculation for absent or unreadable account '+id+'.'); return; }
var t=digits(field(s,11,2,'type_cd'),2,'type_cd'), c=digits(field(s,13,4,'cat_cd'),4,'cat_cd');
var b=money(field(s,17,11,'bal'),'bal');
var k=rateKey(a.row.group_id,t,c), fallback=rateKey('STANDARD',t,c), selected;
if (rates.has(k)) selected=rates.get(k);
else if (rates.has(fallback)) selected=rates.get(fallback);
else { issue('balcatText',line,'missing_rate','Skipped calculation for '+id+', type '+t+', category '+c+': no exact or STANDARD rate.'); return; }
if (!selected.usable) { issue('balcatText',line,'unusable_rate','Skipped calculation for '+id+', type '+t+', category '+c+': selected first-key rate is unusable.'); return; }
if (selected.value===ZERO) return;
var amount=(b*selected.value)/DENOM;
var card=cards.has(id)?cards.get(id):'';
if (!card) issue('balcatText',line,'missing_card_link','Posting for '+id+' uses an empty card number: no usable first physical card link.');
var tran={tran_id:String(sequence).padStart(16,'0'),type_cd:'07',cat_cd:12,source:'ACCRUE',desc:'Monthly interest',amt:format(amount),merchant_id:0,merchant_name:'',merchant_city:'',merchant_zip:'',card_num:card,orig_ts:timestamp,proc_ts:timestamp};
transactions.push(tran); sequence=sequence+BigInt(1); a.posted=a.posted+amount;
});
var outputAccounts=ordered.map(function(a) { a.row.curr_bal=format(a.balance+a.posted); if (boundary.has(a.id)) { a.row.curr_cyc_credit='0.00'; a.row.curr_cyc_debit='0.00'; } return a.row; });
return finish(outputAccounts,transactions,issues.length?'partial':'complete');
}
output = {result:calculate(input || {})};
```

_(server: 249 ms, 1 API call, 246 ms in API)_
