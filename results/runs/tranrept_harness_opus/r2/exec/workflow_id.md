# Workflow: DailyTransactionReport

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** 

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6adfba9116836599f39506dc | <uuid> | (0, 0) | → Transform (seq:<uuid>) |
| End | END | 6adfba9116836599f39506dd | <uuid> | (1200, 0) | — |
| Transform | SCRIPT | 6adfba9116836599f39506de | <uuid> | (300, 0) | → Draft assumptions (seq:<uuid>) | lang: JAVASCRIPT |
| Draft assumptions | AI | 6adfba9116836599f39506df | <uuid> | (600, 0) | → Assemble result [SUCCESS] (seq:<uuid>), → Draft assumptions failed [FAIL] (seq:<uuid>) | responseKey: assumptionsDraft, aiType: TEXT_UNDERSTANDING, responseSchema: set |
| Assemble result | SCRIPT | 6adfba9116836599f39506e0 | <uuid> | (900, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| Draft assumptions failed | SCRIPT | 6adfba9116836599f39506e1 | <uuid> | (600, 200) | → Assemble result (seq:<uuid>) | lang: JAVASCRIPT |

## Systems
_(none)_

## AI prompts

### Draft assumptions (TEXT_UNDERSTANDING, id=6adfba9116836599f39506df)
instructions:

```
Draft a concise English Markdown assumptions narrative solely from the supplied authoritative decision ledger. State what was assumed and which cited wiki statement or explicit omission it rests on. Cite only the supplied PDF page numbers and wiki sections. Distinguish assumptions from documented requirements; never claim verified legacy or oracle equivalence. Do not introduce policies, file offsets, numbers, source quotations or behaviours absent from the ledger. You never receive transaction data and must not request it. Do not compute, select, change or restate the financial report. Return only a JSON object with markdown containing the narrative. The application appends the complete authoritative ledger independently, so a concise introduction and source-grounded explanation is sufficient.
```
userMessage:

```
Authoritative implementation decisions and source bases:
${assumptionsLedger}
```
exampleOutputJsonSchema:

```
{"title":"Response","type":"object","required":["markdown"],"properties":{"markdown":{"type":"string"}},"additionalProperties":false}
```

## Scripts

### Transform (SCRIPT, id=6adfba9116836599f39506de)

```javascript
var ledger = '# CardDemo daily transaction report: assumptions\n\nSource: tranrept-opus.pdf, supplied wiki pages and CONTRACT.md. These choices are assumptions, not verified COBOL behaviour. Page numbers refer to the supplied PDF.\n';
var decisions = [
['A01 Delivery','Accept decoded fixed-width file contents in files, keyed by transact.dat, cardxref.dat, trantype.dat and trancatg.dat. Return report lines under tranrept_report and assumptions.md beside them within dailyTransactionReport, not physical disk files.','CONTRACT.md, pp.16-17 explicitly permits returned lines instead of a file; no storage connection is supplied.','The caller supplies contents and may save the returned artifacts.'],
['A02 Transaction layout','Use 1-based inclusive offsets: transaction ID 1-16; type 17-18; category 19-22; source 23-32; description 33-132; amount 133-143; merchant ID 144-152; merchant name 153-202; merchant city 203-252; merchant ZIP 253-262; card number 263-278; origin timestamp 279-304; processing timestamp 305-330; filler 331-350.','Project Data Model, pp.7-8 provides field order and widths; CONTRACT.md p.16 requires 350 characters but the actual CVTRA05Y copybook is absent.','Sequential offsets and trailing filler are inferred, not independently verified.'],
['A03 Cross-reference layout','Use card number 1-16, customer ID 17-25, account ID 26-36 and filler 37-50.','Project Data Model, p.7 lists these fields and lengths; CONTRACT.md p.16 requires 50 characters; CVACT03Y itself is absent.','Join account by card number without consulting account or customer files.'],
['A04 Transaction type layout','Use type code 1-2, description 3-52 and filler 53-60.','CONTRACT.md p.16 names CVTRA03Y and a 60-character record; no reference-field layout is included in the wiki.','The two-character code and 50-character description are assumed.'],
['A05 Category layout','Use type code 1-2, numeric category 3-6, description 7-56 and filler 57-60; lookup key is type plus category.','CONTRACT.md p.16 names CVTRA04Y and a 60-character record; p.19 prints type and category; their reference-record layout and lookup key are unstated.','The composite key prevents collisions between categories belonging to different types.'],
['A06 Character encoding','Inputs are already decoded ASCII-compatible text; accept only printable ASCII within a record, including signed overpunch characters. Do not decode EBCDIC or packed binary.','CONTRACT.md p.16 says fixed-width text, one record per line, without specifying an encoding or binary conversion.','Character positions equal byte positions only for this assumed text representation.'],
['A07 Line endings','Accept LF or CRLF, with or without one final newline; empty file means zero records. Reject interior blank lines, extra blank records and solitary carriage returns.','CONTRACT.md p.16 says one record per line; line-ending and blank-record conventions are silent.','No blank line is silently discarded as a transaction.'],
['A08 Record widths','Require exact input widths 350, 50, 60 and 60 respectively; do not trim input records. Ignore filler and fields not used by the report.','CONTRACT.md p.16 fixes input widths; only output trailing spaces are explicitly optional on pp.16-17.','Malformed used fields and record lengths fail; unused descriptive fields are not interpreted.'],
['A09 Signed amounts','Read the 11-character transaction amount as signed display digits with implied two decimal places. Plain digits are positive; final {ABCDEFGHI encode positive 0-9 and }JKLMNOPQR negative 0-9. No decimal point or separate sign character is accepted.','Project Data Model p.8 gives S9(9)V99; pp.5 and 16 mention numeric conversion and fixed-width copybooks without specifying the text dump sign encoding.','Packed decimal requires prior decoding; the chosen display representation may differ from the oracle dump.'],
['A10 Date defaults','Absent startDate and endDate default independently to 2022-07-01 and 2022-07-31. Explicit empty values are invalid; require real Gregorian YYYY-MM-DD dates and startDate <= endDate.','CONTRACT.md p.16 supplies these dates; Reports acceptance criteria p.4 requires dates and valid ranges.','No locale-dependent date parsing is used.'],
['A11 Selection date','Select a transaction when the first ten characters of its processing timestamp fall within the inclusive requested range. Require a valid processing date on every transaction, even if ultimately excluded; ignore the timestamp time suffix for selection.','Project Data Model p.8 distinguishes origin and process timestamps; Reports pp.2 and 4 and CONTRACT.md p.16 do not identify which controls selection or how endpoints work.','Origination date is not substituted when processing date is absent.'],
['A12 Batch filters','Apply the date range only; do not add account, category or report-type filters to the batch request.','Reports and UI wiki pp.2 and 10-11 mention optional online filters; the isolated daily-report contract p.16 supplies only start and end dates.','All accounts with selected transactions participate.'],
['A13 Detail semantics','Emit one detail line per selected input transaction; do not consolidate duplicate transaction identifiers.','Reports p.2 calls the query aggregation, but CONTRACT.md p.19 specifies a transaction-ID detail line without grouping rules.','Repeated identifiers remain distinct input occurrences.'],
['A14 Ordering','Sort selected transactions by zero-padded 11-digit account, then transaction identifier, then original record position. Compare printable text case-sensitively.','CONTRACT.md p.16 requires printed order but neither the Reports wiki nor p.19 specifies sorting.','Account details are contiguous and equal identifiers remain stable.'],
['A15 Identifier representation','Require a 16-character nonblank transaction identifier, nonblank two-character type, four numeric category digits and 16 numeric card digits. Require numeric nine-digit customer and eleven-digit account identifiers in cross-references. Preserve transaction-ID spacing and case; print the account as its full eleven digits.','Project Data Model pp.7-8 gives lengths and numeric identifier types; CONTRACT.md p.19 allocates the printed widths but does not settle identifier formatting.','Leading account and category zeros are retained.'],
['A16 Duplicate lookup keys','Allow duplicate lookup records only when their meaningful fields agree. For cross-references meaningful fields include both customer and account; for descriptions compare text after removing trailing spaces. Reject conflicting duplicates even when unused.','The wiki identifies keys on p.7 but defines no duplicate-record policy for batch reference files.','No arbitrary first or last match silently determines the report.'],
['A17 Missing lookup','Require card-to-account, type description and composite category description for every selected transaction. Do not require lookups for excluded transactions. Empty descriptions in an otherwise present reference record are allowed.','Reports p.2 and the p.19 detail layout require account and reference descriptions, but lookup-failure handling is absent.','An unresolved selected transaction fails the whole report rather than disappearing or receiving invented labels.'],
['A18 Pagination','Use 50 detail rows per page. Headings, separators and total lines do not consume this detail-row allowance. Do not force a page break at an account boundary and do not create a trailing empty page.','CONTRACT.md p.19 specifies page headings and page totals but gives no page capacity or account-boundary rule.','This is an explicit capacity assumption, not a recovered legacy page length.'],
['A19 Account totals','Sum only selected transaction amounts for each account, carrying the running account total across page breaks. Print the account total and its following rule immediately after the account final detail, before a coincident page total.','CONTRACT.md p.19 defines account-total format and its following rule, not accumulation scope or coincident-boundary ordering.','Each account has exactly one subtotal.'],
['A20 Page totals','Sum only detail amounts on that page, excluding account subtotal lines; emit a page total and following rule after every nonempty page, including the final page.','CONTRACT.md p.19 defines page totals and following rules but does not explicitly define accumulation or final-page behaviour.','No subtotal is added twice.'],
['A21 Grand total','Sum all selected details once and print one grand-total line after the final page-total rule, with no additional rule.','CONTRACT.md p.19 supplies a grand-total layout and requires rules after page/account totals only.','Grand total equals the sum of page totals and separately the sum of account totals.'],
['A22 Empty results','Print one complete heading block followed by zero page total, its rule and zero grand total; omit account totals and details.','Reports acceptance criteria p.4 requires a zero-row report without error; p.19 does not specify its precise printed lines.','Valid empty files and a valid range selecting no transactions succeed.'],
['A23 Exact arithmetic','Keep amounts and all accumulations as integer cents; reject sums outside the JavaScript safe-integer range before precision is lost. No rounding is performed.','Project Data Model p.8 supplies two decimal places; CONTRACT.md pp.16-19 fixes decimal pictures without specifying arithmetic implementation.','Fractional-cent drift cannot affect totals.'],
['A24 Printed amount pictures','For detail -ZZZ,ZZZ,ZZZ.ZZ use minus for negative and blank for nonnegative. For +ZZZ,ZZZ,ZZZ.ZZ totals use explicit plus or minus. Suppress leading integer zeros and their commas, including the integer zero for zero values; retain decimal point and exactly two fractional digits. Normalize signed zero to nonnegative.','CONTRACT.md pp.17 and 19 defines pictures and leading-zero/comma suppression; signed-zero treatment is unspecified.','Zero prints as a sign, spaces and .00 in the fifteen-character amount field.'],
['A25 Numeric overflow','Reject a detail, page total, account total or grand total whose magnitude exceeds 999999999.99; also reject unsafe-integer accumulation.','CONTRACT.md p.19 allocates nine integer digits; overflow handling is not documented.','No digits are truncated and no asterisk replacement is invented.'],
['A26 Text truncation','Trim trailing reference-description spaces; take the first 15 type-description characters and first 29 category-description characters; left-align and space-pad. Preserve source width ten and transaction identifier width sixteen.','CONTRACT.md p.19 fixes X(15), X(29), X(10) and transaction-ID widths; handling longer reference text is unstated.','Descriptions are truncated only to the explicit printed field widths.'],
['A27 Printed structure','Use exactly the p.19 heading, blank, column heading and 133-hyphen rule; repeat them on each page. Fill all unallocated positions with spaces, emit no form feed, and return lines without embedded newline characters.','CONTRACT.md pp.16-19 specifies lines in printed order and allows returned strings or lists; no carriage-control convention is provided.','Each returned report line is exactly 133 characters, although the contract permits omitting trailing spaces.'],
['A28 Failure contract','Return status FAILED, a location-based error and no report lines for any detected input or financial-format failure; retain assumptions.md. Do not echo raw records or card values in errors.','Reports acceptance criteria p.4 requires surfaced errors; no batch failure format or partial-output policy is supplied.','Failures are distinguishable from valid zero-row reports; no partial financial report is published.'],
['A29 Assumptions narrative','A tool-less AI drafts English prose only from this decision ledger, never transaction records. Append the full ledger after any draft; if drafting fails, is malformed or is empty, return the ledger alone.','The maker requests every uncertain decision in assumptions.md; the wiki does not prescribe how to author that document or how authoring failure behaves.','The report and authoritative decisions remain deterministic; narrative wording can vary and cannot remove the ledger.'],
['A30 Step isolation','Read only the four daily-report files; do not post transactions, calculate interest, create statements, render PDFs or query external systems. Do not persist input records.','CONTRACT.md pp.16-17 lists the daily-report inputs and outputs separately; the online PDF flow is documented on pp.2 and 10-12.','Upstream combined transactions are taken as supplied; no other step outputs are written.']
];
for (var di=0;di<decisions.length;di++) { var dd=decisions[di]; ledger += '\n## '+dd[0]+'\n\nAssumed: '+dd[1]+'\n\nBasis: '+dd[2]+'\n\nConsequence: '+dd[3]+'\n'; }
var result = {status:'FAILED',error:'Input files were not supplied.',tranrept_report:[]};
try {
 var files=input.files || {};
 function fail(message) { throw new Error(message); }
 function digits(s) { return /^[0-9]+$/.test(s); }
 function dateOK(s) { if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false; var y=Number(s.slice(0,4)),m=Number(s.slice(5,7)),d=Number(s.slice(8,10)); var days=[31,28,31,30,31,30,31,31,30,31,30,31]; if(y<1||m<1||m>12) return false; if(y%4===0&&(y%100!==0||y%400===0)) days[1]=29; return d>=1&&d<=days[m-1]; }
 function records(name,width) { if(typeof files[name]!=='string') fail(name+': missing text input.'); var text=files[name]; if(text==='') return []; var rows=text.replace(/\r\n/g,'\n').split('\n'); if(rows[rows.length-1]==='') rows.pop(); for(var j=0;j<rows.length;j++) { if(rows[j].length!==width||!/^[\x20-\x7E]+$/.test(rows[j])) fail(name+': invalid record at line '+(j+1)+'.'); } return rows; }
 function pad(s,n) { s=String(s); return s+' '.repeat(Math.max(0,n-s.length)); }
 function line(s) { if(s.length>133) fail('Printed line exceeds 133 characters.'); return pad(s,133); }
 function money(s,where) { var last=s.slice(-1),prefix=s.slice(0,-1),pos='{ABCDEFGHI',neg='}JKLMNOPQR',sign=1; if(!digits(prefix)) fail(where+': invalid amount.'); if(digits(last)) return Number(s); var k=pos.indexOf(last); if(k<0) { k=neg.indexOf(last); sign=-1; } if(k<0) fail(where+': invalid amount sign.'); return sign*Number(prefix+String(k)); }
 function add(a,b) { if(b>0&&a>9007199254740991-b) fail('Unsafe total accumulation.'); if(b<0&&a< -9007199254740991-b) fail('Unsafe total accumulation.'); return a+b; }
 function picture(c,total) { if(!Number.isSafeInteger(c)||Math.abs(c)>99999999999) fail('Printed amount exceeds nine integer digits.'); var absolute=Math.abs(c),whole=Math.floor(absolute/100),fraction=String(absolute%100).padStart(2,'0'),raw=whole===0?'':String(whole),grouped=''; for(var z=0;z<raw.length;z++) { if(z>0&&(raw.length-z)%3===0) grouped+=','; grouped+=raw[z]; } return (c<0?'-':(total?'+':' '))+(grouped+'.'+fraction).padStart(14,' '); }
 function totalLine(label,width,c) { return line(pad(label,width)+'.'.repeat(97-width)+picture(c,true)); }
 var start=input.startDate===undefined?'2022-07-01':input.startDate;
 var end=input.endDate===undefined?'2022-07-31':input.endDate;
 if(!dateOK(start)||!dateOK(end)||start>end) fail('Invalid required date range: use Gregorian YYYY-MM-DD with start not after end.');
 var ts=records('transact.dat',350),xs=records('cardxref.dat',50),ys=records('trantype.dat',60),cs=records('trancatg.dat',60);
 var xmap={},ymap={},cmap={};
 for(var xi=0;xi<xs.length;xi++) { var xr=xs[xi],card=xr.slice(0,16),customer=xr.slice(16,25),account=xr.slice(25,36); if(!digits(card)||!digits(customer)||!digits(account)) fail('cardxref.dat: invalid identifier at line '+(xi+1)+'.'); var xkey='k'+card,identity=customer+account; if(xmap[xkey]&&xmap[xkey].identity!==identity) fail('cardxref.dat: conflicting duplicate at line '+(xi+1)+'.'); xmap[xkey]={identity:identity,account:account}; }
 for(var yi=0;yi<ys.length;yi++) { var yr=ys[yi],type=yr.slice(0,2),desc=yr.slice(2,52).replace(/ +$/,''); if(type.trim()==='') fail('trantype.dat: blank type at line '+(yi+1)+'.'); var ykey='k'+type; if(ymap[ykey]!==undefined&&ymap[ykey]!==desc) fail('trantype.dat: conflicting duplicate at line '+(yi+1)+'.'); ymap[ykey]=desc; }
 for(var ci=0;ci<cs.length;ci++) { var cr=cs[ci],ct=cr.slice(0,2),cat=cr.slice(2,6),cd=cr.slice(6,56).replace(/ +$/,''); if(ct.trim()===''||!digits(cat)) fail('trancatg.dat: invalid key at line '+(ci+1)+'.'); var ckey='k'+ct+'/'+cat; if(cmap[ckey]!==undefined&&cmap[ckey]!==cd) fail('trancatg.dat: conflicting duplicate at line '+(ci+1)+'.'); cmap[ckey]=cd; }
 var selected=[];
 for(var ti=0;ti<ts.length;ti++) { var tr=ts[ti],id=tr.slice(0,16),tt=tr.slice(16,18),tc=tr.slice(18,22),source=tr.slice(22,32),amount=money(tr.slice(132,143),'transact.dat line '+(ti+1)),pan=tr.slice(262,278),date=tr.slice(304,314); if(id.trim()===''||tt.trim()===''||!digits(tc)||!digits(pan)) fail('transact.dat: invalid identifier at line '+(ti+1)+'.'); if(!dateOK(date)) fail('transact.dat: invalid processing date at line '+(ti+1)+'.'); if(date>=start&&date<=end) { var match=xmap['k'+pan],tdesc=ymap['k'+tt],cdesc=cmap['k'+tt+'/'+tc]; if(!match||tdesc===undefined||cdesc===undefined) fail('transact.dat: missing selected-transaction lookup at line '+(ti+1)+'.'); selected.push({account:match.account,id:id,type:tt,cat:tc,source:source,cents:amount,typeDescription:tdesc,categoryDescription:cdesc,index:ti}); } }
 selected.sort(function(a,b) { if(a.account<b.account) return -1; if(a.account>b.account) return 1; if(a.id<b.id) return -1; if(a.id>b.id) return 1; return a.index-b.index; });
 var lines=[],rule='-'.repeat(133),pageSum=0,accountSum=0,grandSum=0;
 function heading() { lines.push(line(pad('DALYREPT',38)+pad('Daily Transaction Report',41)+pad('Date Range:',12)+start+' to '+end)); lines.push(' '.repeat(133)); lines.push(line(pad('Transaction ID',17)+pad('Account ID',12)+pad('Transaction Type',19)+pad('Tran Category',35)+pad('Tran Source',14)+' '+pad('Amount',16))); lines.push(rule); }
 if(selected.length===0) { heading(); lines.push(totalLine('Page Total',11,0)); lines.push(rule); lines.push(totalLine('Grand Total',11,0)); }
 for(var si=0;si<selected.length;si++) { var row=selected[si]; if(si%50===0) { heading(); pageSum=0; } pageSum=add(pageSum,row.cents); accountSum=add(accountSum,row.cents); grandSum=add(grandSum,row.cents);
 lines.push(line(row.id+' '+row.account+' '+row.type+'-'+pad(row.typeDescription.slice(0,15),15)+' '+row.cat+'-'+pad(row.categoryDescription.slice(0,29),29)+' '+row.source+'    '+picture(row.cents,false)+'  '));
 if(si===selected.length-1||selected[si+1].account!==row.account) { lines.push(totalLine('Account Total',13,accountSum)); lines.push(rule); accountSum=0; }
 if(si%50===49||si===selected.length-1) { lines.push(totalLine('Page Total',11,pageSum)); lines.push(rule); }
 }
 if(selected.length>0) lines.push(totalLine('Grand Total',11,grandSum));
 result={status:'OK',error:'',tranrept_report:lines};
} catch(problem) { result={status:'FAILED',error:String(problem.message||'Batch processing failed.'),tranrept_report:[]}; }
output={reportResult:result,assumptionsLedger:ledger};
```

### Assemble result (SCRIPT, id=6adfba9116836599f39506e0)

```javascript
var r=input.reportResult||{status:'FAILED',error:'Report processing did not return a result.',tranrept_report:[]}; var ledger=typeof input.assumptionsLedger==='string'?input.assumptionsLedger:''; var draft=input.assumptionsDraft||{}; var prose=typeof draft.markdown==='string'?draft.markdown.trim():''; var document=prose!==''?prose+'\n\n---\n\n'+ledger:ledger; output={dailyTransactionReport:{status:r.status,error:r.error,tranrept_report:r.tranrept_report,'assumptions.md':document}};
```

### Draft assumptions failed (SCRIPT, id=6adfba9116836599f39506e1)

```javascript
output = {"assumptionsDraft": {}};

```

_(server: 614 ms, 1 API call, 535 ms in API)_
