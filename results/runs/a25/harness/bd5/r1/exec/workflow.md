# Workflow: GenerateCardStatements

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** 

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae3b3bb3695c563ea50ff98 | <uuid> | (0, 0) | → Build statements (seq:<uuid>) |
| End | END | 6ae3b3bb3695c563ea50ff99 | <uuid> | (1500, 0) | — |
| Build statements | SCRIPT | 6ae3b3bb3695c563ea50ff9a | <uuid> | (300, 0) | → Draft assumptions (seq:<uuid>) | lang: JAVASCRIPT |
| Draft assumptions | AI | 6ae3b3bb3695c563ea50ff9b | <uuid> | (600, 0) | → Finalize outputs [SUCCESS] (seq:<uuid>), → Draft assumptions failed [FAIL] (seq:<uuid>) | responseKey: assumptionDraft, aiType: TEXT_UNDERSTANDING, responseSchema: set |
| Finalize outputs | SCRIPT | 6ae3b3bb3695c563ea50ff9c | <uuid> | (900, 0) | → Escape text (seq:<uuid>) | lang: JAVASCRIPT |
| Escape text | SCRIPT | 6ae3b3bb3695c563ea50ff9d | <uuid> | (1200, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| Draft assumptions failed | SCRIPT | 6ae3b3bb3695c563ea50ff9e | <uuid> | (600, 200) | → Finalize outputs (seq:<uuid>) | lang: JAVASCRIPT |

## Systems
_(none)_

## AI prompts

### Draft assumptions (TEXT_UNDERSTANDING, id=6ae3b3bb3695c563ea50ff9b)
instructions:

```
Prepare the accompanying implementation assumptions, not statement calculations. The implementation ledger is authoritative. Return an object containing entries, preserving each entry's id, assumption and source strings verbatim. Include every entry exactly once; no additions, omissions, interpretations, business rules or invented citations. You may organize entries, but must not rewrite their factual strings. Use only the ledger and source excerpts supplied. Do not request or infer customer data. Never claim that original copybooks or the COBOL program were inspected. An explicit absence is legitimate evidence for an assumption.
```
userMessage:

```
Implementation decision ledger: ${assumptionLedger}
Source excerpts: ${assumptionSources}
```
exampleOutputJsonSchema:

```
{"title":"Response","type":"object","additionalProperties":false,"required":["entries"],"properties":{"entries":{"type":"array","items":{"type":"object","additionalProperties":false,"required":["id","assumption","source"],"properties":{"id":{"type":"string"},"assumption":{"type":"string"},"source":{"type":"string"}}}}}}
```

## Scripts

### Build statements (SCRIPT, id=6ae3b3bb3695c563ea50ff9a)

```javascript
var diagnostics = [];
var textLines = [], htmlLines = [];
var ledger = [];
function assume(id, assumption, source) { ledger.push({id:id, assumption:assumption, source:source}); }
var doc = 'creastmt-sonnet-bd5.pdf ';
assume('input-account-offsets', 'Account positions are inferred as consecutive fields: account ID 1-11; active status 12; current balance 13-24; credit limit 25-36; cash limit 37-48; open, expiry and reissue dates 49-58, 59-68, 69-78; cycle credit 79-90; cycle debit 91-102; ZIP 103-112; group 113-122; remaining bytes filler. Only ID and current balance are read for these contract outputs.', doc+'p.6 lists fields and widths; p.26 names CVACT01Y and 300-byte records, but the original copybook and explicit offsets are absent.');
assume('input-customer-offsets', 'Customer positions are inferred as ID 1-9; first, middle and last names 10-34, 35-59, 60-84; address lines 85-134, 135-184, 185-234; state 235-236; country 237-239; ZIP 240-249; phones 250-264 and 265-279; SSN 280-288; government ID 289-308; birth date 309-318; EFT ID 319-328; primary-holder indicator 329; FICO 330-332; remaining bytes filler. Fields not printed are not parsed or validated.', doc+'p.7 lists ordered CVCUS01Y fields and widths; p.26 instead calls the 500-byte input CUSTREC. Their equivalence and these offsets are inferred, not verified from either copybook.');
assume('input-xref-offsets', 'Cross-reference positions are card 1-16, customer ID 17-25, account ID 26-36 and ignored filler through byte 50.', doc+'p.8 lists these CVACT03Y fields and widths; p.26 gives record size 50 but no explicit offsets.');
assume('input-transaction-offsets', 'Transaction positions are ID 1-16; type 17-18; category 19-22; source 23-32; description 33-132; amount 133-143; merchant ID 144-152; merchant name 153-202; merchant city 203-252; merchant ZIP 253-262; card 263-278; original timestamp 279-304; processed timestamp 305-330; remaining bytes filler. Only ID, description, amount and card are read.', doc+'pp.8-9 list CVTRA05Y fields and widths, including S9(9)V99 amount; p.26 gives size 350. Original copybook offsets are absent.');
assume('identifier-handling', 'Keys remain strings, preserving leading zeros. Lookup keys discard leading and trailing ASCII spaces; printed identifiers retain their digit strings and are right-padded in the contract field, never converted to numbers. No numeric or business-range validation is added to character keys or FICO.', doc+'pp.6-9 identify string keys and a three-digit FICO; p.27 prints account ID and FICO as X(20). Key-space normalization is unspecified.');
assume('monetary-decoding', 'Implied-decimal monetary fields are interpreted in integer cents. Accept plain digits, a leading or trailing plus/minus sign within the field, and ASCII signed overpunch: {ABCDEFGHI positive and }JKLMNOPQR negative. An explicit negative sign or negative overpunch makes the amount negative. Spaces are trimmed at the field edges; empty or otherwise malformed relevant amounts are unprocessable. No rounding is applied.', doc+'pp.6 and 8 identify signed implied-decimal pictures; p.9 mentions signed overpunch for a different input. Encoding details for these statement inputs are absent.');
assume('statement-selection', 'Generate one statement for each distinct cross-reference card, including cards with no transactions. Do not filter by status, business date or statement period, and do not combine sibling cards on an account.', doc+'p.2 BR-01 specifies CardXref order and BR-02 card-number plus transaction-ID keys; p.4 specifies one statement per card and a no-transaction statement. p.3 leaves cycle filtering as a TODO; p.21 also mentions transactions per card of the account.');
assume('ordering-and-repeated-transactions', 'Sort cross-references lexically by card number; sort each card transaction list lexically by transaction ID, breaking ties by original input order. Repeated transaction IDs are retained as separate printed records.', doc+'p.2 BR-01 and BR-02 establish key order. Equal-key and duplicate-transaction handling are not specified.');
assume('customer-name', 'Trim ASCII spaces from each first, middle and last name; omit blank components and join the remaining components with single spaces in that order.', doc+'p.7 names the three fields; p.21 requests customer name; p.26 explicitly leaves assembly behaviour to the wiki, which gives no concatenation rule.');
assume('customer-address', 'Trim ASCII spaces from printed address components. Print address lines 1 and 2 directly; join nonblank address line 3, state and ZIP with single spaces for printed address line 3. Do not include country or phone.', doc+'p.21 requests three address lines, state and ZIP; pp.27-28 provide exactly three address slots. Assembly punctuation and country inclusion are not specified.');
assume('fico-format', 'Print the trimmed three-character FICO field without numerical conversion, preserving leading zeros; a blank source remains blank.', doc+'p.7 gives a three-digit source field and p.27 gives an X(20) output. Conversion or missing-value rules are absent.');
assume('duplicate-masters', 'For duplicate account, customer or cross-reference keys, retain the first successfully parsed record in input order and report each later duplicate. Do not emit duplicate statements for repeated cross-reference cards.', doc+'pp.6-8 call these fields primary keys, but duplicate-input handling is not specified.');
assume('missing-links', 'If a cross-reference has no usable linked account or customer, omit only that card statement and report its card, input line and missing link. Do not fabricate balances or customer details. Transactions with no selected cross-reference are not printed and are reported individually.', doc+'p.2 describes xref, account, customer and transaction lookup; p.16 gives generic not-found handling but no statement-specific continuation rule.');
assume('record-error-isolation', 'Skip an unprocessable record with a diagnostic and continue with other records. An invalid transaction is excluded from lines and expenditure, so diagnostics must be checked for partial results. A statement-specific arithmetic error omits only that statement. Do not reject unrelated business fields or inspect unused filler, including nonprintable filler.', doc+'The statement wiki does not define malformed-record recovery. The input tables name many fields that the contract never prints; no extra business validation is imposed.');
assume('input-lines', 'Inputs are strings containing one record per LF or CRLF line. Remove a terminal CR belonging to CRLF. Ignore an empty terminal split caused by a final newline. Treat internal empty lines as malformed records. A missing input is treated as an empty file with a diagnostic; a non-string input is an invalid empty file. Empty strings are valid empty files.', doc+'p.26 specifies fixed-width text with one record per line; newline convention, absent-file handling and blank-record handling are not specified.');
assume('record-lengths', 'Read only through the last field needed for each statement record, while accepting arbitrary remaining bytes. A record shorter than its last required field is unprocessable. Do not require all declared filler bytes to be present and do not reject extra trailing filler.', doc+'p.26 names full record lengths; it does not state validation behaviour. p.6 explicitly drops legacy filler; the calculation does not use filler.');
assume('text-truncation', 'Left-align text, truncate it at the contract field width and right-pad with spaces. Transaction descriptions are truncated to 49 characters. Customer text inserted into HTML is further shortened if necessary to preserve fixed surrounding markup within the 100-column line.', doc+'p.27 defines X(n), 49-character transaction detail, and 80/100-column outputs. Customer insertion overflow within an HTML line is unspecified.');
assume('html-literals', 'Use the HTML literals in CONTRACT.md verbatim, with dynamic field spaces preserved. Do not introduce entity escaping, indentation, extra blank lines, a single wrapper around all statements, or an HTML Total EXP line. Each statement has its own complete HTML document block.', doc+'pp.27-29 enumerate a full HTML block for each statement, without an expenditure-total line; escaping is not specified.');
assume('text-header-padding', 'The text transaction header consists of Tran ID padded to 16 columns, Tran Details padded to 51 columns, and Tran Amount padded to the remaining 13 columns, for 80 columns in all.', doc+'p.27 gives the first two padded widths and says 80 in all, but does not explicitly give final header padding.');
assume('zero-edited-amount', 'For Z(9).99- retain decimal point and two fractional digits for zero, suppress all nine leading integer zeros, and use a trailing space for zero or positive amounts and a trailing minus for negative amounts. Current balance uses nine leading-zero integer digits instead.', doc+'p.27 defines both pictures and trailing signs; the zero example is not shown.');
assume('numeric-overflow', 'A monetary value that cannot fit the nine-integer-digit printed picture is rendered as 13 asterisks. If integer-cent accumulation would exceed JavaScript safe integer precision, omit only that statement and report it rather than silently round.', doc+'p.27 fixes the monetary pictures; numeric overflow and execution precision handling are not specified.');
assume('line-serialization', 'Return fully space-padded line arrays under the contract names without extensions. The caller joins with LF when writing files and may add a final newline; no inter-statement blank line or page break is inserted.', doc+'p.26 expressly permits lists or LF-joined strings and optional trailing spaces; final-newline and inter-statement separator rules are otherwise absent.');
assume('markdown-and-fallback', 'Return assumptions as structured entries and as a Markdown table with separate assumption and source columns. Escape table pipes and replace embedded newlines with spaces. A model may organize only these entries; accept its result only if every entry exactly matches the authoritative ledger by ID, assumption and source, otherwise use the full ledger fallback. Customer data is not sent for drafting.', doc+'The maker explicitly requests every implementation assumption with its supporting wiki statement or absence. Markdown table style, drafting validation and failure fallback are implementation choices not specified in the wiki.');
assume('literal-start-end-banners', 'Use 31 stars, START OF STATEMENT and 31 stars for the opening line, and 32 stars, END OF STATEMENT and 32 stars for the closing line, without additional inserted spaces.', doc+'p.27 enumerates these three components of each 80-column banner. Any additional spacing is unspecified and would exceed the stated width.');
function trim(s) { return String(s).replace(/^ +| +$/g, ''); }
function pad(s,n) { s=String(s); return s.slice(0,n)+' '.repeat(Math.max(0,n-s.length)); }
function problem(file,line,key,message) { diagnostics.push({file:file,line:line,key:key||'',message:message}); }
function rows(value,file,min,parse) {
 var out=[];
 if (value===undefined || value===null) { problem(file,0,'','Input missing; treated as empty'); return out; }
 if (typeof value!=='string') { problem(file,0,'','Expected fixed-width text string; treated as empty'); return out; }
 if (value==='') return out;
 var a=value.split('\n'); if (a[a.length-1]==='') a.pop();
 for(var i=0;i<a.length;i++) { var r=a[i]; if(r.endsWith('\r')) r=r.slice(0,-1); try { if(r.length<min) throw new Error('Record shorter than required fields'); var p=parse(r); p.row=i+1; out.push(p); } catch(e) { problem(file,i+1,'',String(e.message||e)); } }
 return out;
}
function key(s) { var k=trim(s); if(k==='') throw new Error('Blank required lookup key'); return k; }
function cents(field) {
 var s=trim(field), sign=1;
 if(s==='') throw new Error('Blank relevant amount');
 if(s[0]==='-' || s[0]==='+') { if(s[0]==='-')sign=-1; s=s.slice(1); }
 if(s.endsWith('-') || s.endsWith('+')) { if(s.endsWith('-'))sign=-1; s=s.slice(0,-1); }
 var pos='{ABCDEFGHI', neg='}JKLMNOPQR', last=s.slice(-1).toUpperCase();
 if(last && pos.indexOf(last)>=0) s=s.slice(0,-1)+String(pos.indexOf(last));
 else if(last && neg.indexOf(last)>=0) { sign=-1; s=s.slice(0,-1)+String(neg.indexOf(last)); }
 if(!/^\d+$/.test(s)) throw new Error('Invalid signed implied-decimal amount');
 var v=Number(s)*sign; if(!Number.isSafeInteger(v)) throw new Error('Amount exceeds exact integer precision'); return v;
}
function money(v,zeroFill) {
 var a=Math.abs(v); if(a>99999999999) return '*'.repeat(13);
 var whole=String(Math.floor(a/100)), frac=String(a%100).padStart(2,'0');
 var left=zeroFill?whole.padStart(9,'0'):(a<100?'':whole).padStart(9,' ');
 return left+'.'+frac+(v<0?'-':' ');
}
function masters(list,file,prop) { var m=Object.create(null); list.forEach(function(r){ var k=r[prop]; if(Object.prototype.hasOwnProperty.call(m,k)) problem(file,r.row,k,'Duplicate key; first usable record retained'); else m[k]=r; }); return m; }
var accounts=masters(rows(input.acctdata,'acctdata.dat',24,function(r){return {id:key(r.slice(0,11)),balance:cents(r.slice(12,24))};}),'acctdata.dat','id');
var customers=masters(rows(input.custdata,'custdata.dat',332,function(r){return {id:key(r.slice(0,9)),first:trim(r.slice(9,34)),middle:trim(r.slice(34,59)),last:trim(r.slice(59,84)),a1:trim(r.slice(84,134)),a2:trim(r.slice(134,184)),a3:trim(r.slice(184,234)),state:trim(r.slice(234,236)),zip:trim(r.slice(239,249)),fico:trim(r.slice(329,332))};}),'custdata.dat','id');
var xrefs=masters(rows(input.cardxref,'cardxref.dat',36,function(r){return {card:key(r.slice(0,16)),customer:key(r.slice(16,25)),account:key(r.slice(25,36))};}),'cardxref.dat','card');
var transactions=rows(input.transact,'transact.dat',278,function(r){return {id:r.slice(0,16),description:trim(r.slice(32,132)),amount:cents(r.slice(132,143)),card:key(r.slice(262,278))};});
var byCard=Object.create(null);
transactions.forEach(function(t){ if(!Object.prototype.hasOwnProperty.call(xrefs,t.card)) problem('transact.dat',t.row,t.card,'No selected cross-reference; transaction not printed'); if(!byCard[t.card])byCard[t.card]=[]; byCard[t.card].push(t); });
function hfield(prefix,value,suffix,width) { return pad(prefix+pad(value,Math.min(width,100-prefix.length-suffix.length))+suffix,100); }
function statement(x) {
 var a=accounts[x.account], c=customers[x.customer];
 if(!a || !c) { problem('cardxref.dat',x.row,x.card,(!a?'Missing usable account '+x.account:'')+(!a&&!c?'; ':'')+(!c?'Missing usable customer '+x.customer:'')); return; }
 var ts=(byCard[x.card]||[]).slice().sort(function(u,v){return u.id<v.id?-1:u.id>v.id?1:u.row-v.row;});
 var total=0; ts.forEach(function(t){if(t.amount>0){total+=t.amount; if(!Number.isSafeInteger(total))throw new Error('Expenditure exceeds exact integer precision');}});
 var name=[c.first,c.middle,c.last].filter(function(v){return v!=='';}).join(' ');
 var addr3=[c.a3,c.state,c.zip].filter(function(v){return v!=='';}).join(' ');
 var tx=[]; function T(s){tx.push(pad(s,80));}
 T('*'.repeat(31)+'START OF STATEMENT'+'*'.repeat(31));
 T(pad(name,75)); T(pad(c.a1,50)); T(pad(c.a2,50)); T(addr3);
 T('-'.repeat(80)); T(' '.repeat(33)+'Basic Details'); T('-'.repeat(80));
 T(pad('Account ID :',20)+pad(x.account,20));
 T(pad('Current Balance :',20)+money(a.balance,true));
 T(pad('FICO Score :',20)+pad(c.fico,20));
 T('-'.repeat(80)); T(' '.repeat(30)+'TRANSACTION SUMMARY'); T('-'.repeat(80));
 T(pad('Tran ID',16)+pad('Tran Details',51)+pad('Tran Amount',13)); T('-'.repeat(80));
 ts.forEach(function(t){T(pad(t.id,16)+' '+pad(t.description,49)+'$'+money(t.amount,false));});
 T('-'.repeat(80)); T(pad('Total EXP:',10)+' '.repeat(56)+'$'+money(total,false));
 T('*'.repeat(32)+'END OF STATEMENT'+'*'.repeat(32));
 var hs=[]; function H(s){hs.push(pad(s,100));}
 H('<!DOCTYPE html>'); H('<html lang="en">'); H('<head>'); H('<meta charset="utf-8">'); H('<title>HTML Table Layout</title>'); H('</head>'); H('<body style="margin:0px;">');
 H('<table align="center" frame="box" style="width:70%; font:12px Segoe UI,sans-serif;">');
 H('<tr>'); H('<td colspan="3" style="padding:0px 5px;background-color:#1d1d96b3;">');
 hs.push(hfield('<h3>Statement for Account Number: ',x.account,'</h3>',20));
 H('</td>'); H('</tr>'); H('<tr>'); H('<td colspan="3" style="padding:0px 5px;background-color:#FFAF33;">');
 H('<p style="font-size:16px">Bank of XYZ</p>'); H('<p>410 Terry Ave N</p>'); H('<p>Seattle WA 99999</p>'); H('</td>'); H('</tr>');
 H('<tr>'); H('<td colspan="3" style="padding:0px 5px;background-color:#f2f2f2;">');
 hs.push(hfield('<p style="font-size:16px">',name,' </p>',75));
 hs.push(hfield('<p>',c.a1,' </p>',50)); hs.push(hfield('<p>',c.a2,' </p>',50)); hs.push(hfield('<p>',addr3,' </p>',80));
 H('</td>'); H('</tr>'); H('<tr>'); H('<td colspan="3" style="padding:0px 5px;background-color:#33FFD1; text-align:center;">');
 H('<p style="font-size:16px">Basic Details</p>'); H('</td>'); H('</tr>'); H('<tr>'); H('<td colspan="3" style="padding:0px 5px;background-color:#f2f2f2;">');
 hs.push(hfield('<p>Account ID : ',x.account,'</p>',20)); H('<p>Current Balance : '+money(a.balance,true)+'</p>'); hs.push(hfield('<p>FICO Score : ',c.fico,'</p>',20));
 H('</td>'); H('</tr>'); H('<tr>'); H('<td colspan="3" style="padding:0px 5px;background-color:#33FFD1; text-align:center;">');
 H('<p style="font-size:16px">Transaction Summary</p>'); H('</td>'); H('</tr>'); H('<tr>');
 H('<td style="width:25%; padding:0px 5px; background-color:#33FF5E; text-align:left;">'); H('<p style="font-size:16px">Tran ID</p>'); H('</td>');
 H('<td style="width:55%; padding:0px 5px; background-color:#33FF5E; text-align:left;">'); H('<p style="font-size:16px">Tran Details</p>'); H('</td>');
 H('<td style="width:20%; padding:0px 5px; background-color:#33FF5E; text-align:right;">'); H('<p style="font-size:16px">Amount</p>'); H('</td>'); H('</tr>');
 ts.forEach(function(t){
 H('<tr>'); H('<td style="width:25%; padding:0px 5px; background-color:#f2f2f2; text-align:left;">'); hs.push(hfield('<p>',t.id,'</p>',16)); H('</td>');
 H('<td style="width:55%; padding:0px 5px; background-color:#f2f2f2; text-align:left;">'); hs.push(hfield('<p>',t.description,'</p>',49)); H('</td>');
 H('<td style="width:20%; padding:0px 5px; background-color:#f2f2f2; text-align:right;">'); H('<p>'+money(t.amount,false)+'</p>'); H('</td>'); H('</tr>');
 });
 H('<tr>'); H('<td colspan="3" style="padding:0px 5px;background-color:#1d1d96b3;">'); H('<h3>End of Statement</h3>'); H('</td>'); H('</tr>'); H('</table>'); H('</body>'); H('</html>');
 Array.prototype.push.apply(textLines,tx); Array.prototype.push.apply(htmlLines,hs);
}
Object.keys(xrefs).sort().forEach(function(k){try {statement(xrefs[k]);}catch(e){problem('cardxref.dat',xrefs[k].row,k,String(e.message||e));}});
output={creastmt_statements:textLines,creastmt_statements_html:htmlLines,diagnostics:diagnostics,assumptionLedger:ledger,fallbackAssumptions:ledger.map(function(e){return {id:e.id,assumption:e.assumption,source:e.source};}),assumptionSources:[doc+'p.2 BR-01: Statement driven by CardXref order (card number). BR-02: Transactions are keyed by card number + transaction id. BR-03: Total EXP is the sum of charges above zero; credits and returns are listed but not subtracted.',doc+'p.3: legacy prints all transactions on file; confirm cycle filter requirement is a TODO.',doc+'p.4: one statement per card; card without transactions has zero total; purchases 100.00 and 40.00 with return -30.00 yield three lines and total 140.00.',doc+'pp.6-9: Account, Customer, CardXref and Transaction field tables; original copybooks are not included.',doc+'p.21: SSN is not printed; exact legacy line layout is a TODO.',doc+'pp.26-29: statement inputs and exact text/HTML line layouts; lists of lines under filenames without extension are permitted.']};
```

### Finalize outputs (SCRIPT, id=6ae3b3bb3695c563ea50ff9c)

```javascript
var ledger=Array.isArray(input.assumptionLedger)?input.assumptionLedger:[];
var fallback=Array.isArray(input.fallbackAssumptions)?input.fallbackAssumptions:ledger;
var candidate=input.assumptionDraft && input.assumptionDraft.entries;
var valid=Array.isArray(candidate) && candidate.length===ledger.length;
var reference=Object.create(null), seen=Object.create(null);
ledger.forEach(function(e){reference[e.id]=e;});
if(valid) candidate.forEach(function(e){if(!e || typeof e.id!=='string' || seen[e.id] || !reference[e.id] || e.assumption!==reference[e.id].assumption || e.source!==reference[e.id].source || Object.keys(e).some(function(k){return ['id','assumption','source'].indexOf(k)<0;}))valid=false; else seen[e.id]=true;});
var chosen=valid?candidate:fallback;
var rows=chosen.map(function(e){return {id:e.id,assumption:e.assumption,source:e.source};});
function cell(s){return String(s).replace(/\r?\n/g,' ').replace(/\|/g,'&#124;');}
var md='# Statement-generation implementation assumptions\n\nThese are implementation choices, not verified claims about unspecified legacy behaviour. Physical input and output file handling belongs to the caller.\n\n| What you assumed | Which wiki statement (or absence of one) it rests on |\n| --- | --- |\n';
rows.forEach(function(e){md+='| '+cell(e.assumption)+' | '+cell(e.source)+' |\n';});
output={assumptions:rows,assumptions_md:md};
```

### Escape text (SCRIPT, id=6ae3b3bb3695c563ea50ff9d)

```javascript
function esc(v) { return v == null ? null : JSON.stringify(String(v)).slice(1, -1).replace(/\\"/g, '"'); }
function at(o, p) { return p.split('.').reduce(function (x, k) { return x == null ? undefined : x[k]; }, o); }
output = {"endText": {t0: esc(at(input, "assumptions_md"))}};

```

### Draft assumptions failed (SCRIPT, id=6ae3b3bb3695c563ea50ff9e)

```javascript
output = {"assumptionDraft": {}};

```

_(server: 346 ms, 1 API call, 342 ms in API)_
