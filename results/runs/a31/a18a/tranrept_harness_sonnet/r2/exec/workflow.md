# Workflow: CardDemoDailyTransactionReport

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** 

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae580f13695c563ea515ecd | <uuid> | (0, 0) | → CalculateReport (seq:<uuid>) |
| End | END | 6ae580f13695c563ea515ece | <uuid> | (1200, 0) | — |
| CalculateReport | SCRIPT | 6ae580f13695c563ea515ecf | <uuid> | (300, 0) | → DraftAssumptions (seq:<uuid>) | lang: JAVASCRIPT |
| DraftAssumptions | AI | 6ae580f13695c563ea515ed0 | <uuid> | (600, 0) | → AssembleOutputs [SUCCESS] (seq:<uuid>), → DraftAssumptions failed [FAIL] (seq:<uuid>) | responseKey: assumptionsDraft, aiType: TEXT_UNDERSTANDING, responseSchema: set |
| AssembleOutputs | SCRIPT | 6ae580f13695c563ea515ed1 | <uuid> | (900, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| DraftAssumptions failed | SCRIPT | 6ae580f13695c563ea515ed2 | <uuid> | (600, 200) | → AssembleOutputs (seq:<uuid>) | lang: JAVASCRIPT |

## Systems
_(none)_

## AI prompts

### DraftAssumptions (TEXT_UNDERSTANDING, id=6ae580f13695c563ea515ed0)
instructions:

```
Write a concise readable Markdown explanation of the canonical CardDemo reporting assumptions and run warnings supplied in the user message. Return only an object with assumptionsText, a string. The canonical ledger is authoritative: do not invent, change or decide any report behaviour; do not compute amounts; do not omit the maker's chosen 60 details per page or preservation of input order within each card. Distinguish explicit source rules, maker choices and implementation assumptions. Cite only the exact supplied PDF page references. Never describe inferred offsets or unresolved pagination/boundary behaviour as verified legacy behaviour. Explain any warnings using only their provided text. Do not add new source quotations, assumptions, policies or facts. Do not answer from general knowledge. Raw transactions, card/account numbers and report details are not provided and must not be requested or invented. This prose is noncanonical documentation; the complete authoritative ledger will be preserved separately even if drafting fails.
```
userMessage:

```
Canonical assumptions ledger and source excerpts:
${assumptionsLedger}

Sanitized run warnings:
${runWarnings}
```
exampleOutputJsonSchema:

```
{"title":"Response","type":"object","properties":{"assumptionsText":{"type":"string"}},"required":["assumptionsText"],"additionalProperties":false}
```

## Scripts

### CalculateReport (SCRIPT, id=6ae580f13695c563ea515ecf)

```javascript
var bag = typeof input === 'object' && input !== null ? input : {};
var lines = [], warnings = [], failure = '', ledgerEntries = [];
function assumption(what, why, source) { ledgerEntries.push('- Assumption: ' + what + '\n  - Rationale: ' + why + '\n  - Source: ' + source); }
assumption('File contents arrive as four text inputs; report lines and Markdown are returned together, not written to disk.', 'Maker selected the returned-output adaptation. No input records are changed or persisted.', 'Maker answer on batch delivery; tranrept-sonnet.pdf p.26, CONTRACT.md layer 1 Outputs: a run may return the lines as a list or string.');
assumption('Absent date parameters default to 2022-07-01 and 2022-07-31.', 'The step-specific contract overrides the older wiki defaults; supplied dates must be real Gregorian YYYY-MM-DD dates, with start no later than end.', 'tranrept-sonnet.pdf p.26, CONTRACT.md layer 1 Run parameters; p.2 BR-05 lists older 2022-01-01 to 2022-07-06 defaults. Malformed-range handling is not stated.');
assumption('Transaction consumed offsets are ID 1-16, type 17-18, category 19-22, source 23-32, amount 133-143, card 263-278, processing timestamp 305-330.', 'These offsets are inferred by accumulating the listed field widths in their listed order. Complete copybook byte layouts were not reproduced; these are not independently verified copybook offsets.', 'tranrept-sonnet.pdf pp.8-9, DT-05 Transaction field list; p.26 names CVTRA05Y and a 350-character record.');
assumption('Cross-reference card is 1-16 and account 26-36; type code is 1-2 and description 3-52; category type is 1-2, category code 3-6 and description 7-56.', 'Use the listed field order and widths, leaving unconsumed bytes alone.', 'tranrept-sonnet.pdf p.8 DT-04, p.9 DT-08, p.10 DT-09; p.26 specifies record lengths but does not reproduce full copybooks.');
assumption('Input is already decoded ASCII-compatible text. Split LF or CRLF records and ignore one final newline; preserve interior blank rows for warning numbering.', 'The workflow receives strings, not binary records; encoding and newline details are not specified.', 'tranrept-sonnet.pdf pp.25-26 CONTRACT.md Inputs: fixed-width text, one record per line; no encoding or newline convention given.');
assumption('Ignore every unused field and filler byte, including NUL. Do not require filler to reach the nominal record width.', 'Only fields used by this report are read; unused bytes must not introduce rejection conditions.', 'tranrept-sonnet.pdf p.26 identifies copybooks and widths, but does not define validation of filler.');
assumption('Preserve identifiers as strings, including leading zeros; strip only boundary ASCII spaces from consumed text.', 'The report is fixed-width text, not numeric identifier arithmetic. No additional alphabetic or numeric identifier validation is imposed.', 'tranrept-sonnet.pdf pp.8-10 declares string identifiers and reference keys; p.29 specifies X fields.');
assumption('Interpret signed display amounts as integer cents; decode final-character overpunch {ABCDEFGHI as positive 0-9 and }JKLMNOPQR as negative 0-9.', 'The amount has an implied decimal, but the attachment does not specify its exact transaction-file sign encoding.', 'tranrept-sonnet.pdf p.8 DT-05 amount S9(9)V99; p.9 mentions signed overpunch for disclosure values, not an explicit transaction encoding rule.');
assumption('Also accept ordinary unsigned digits, one leading or trailing sign, or an explicit decimal with one or two fractional digits; reject malformed consumed amounts only.', 'This permits common decoded signed-display forms without applying validation to unrelated data. Integer digits mean implied cents; explicit decimals mean currency units. Reject commas, exponents, internal spaces, repeated signs and decimal-overpunch mixtures.', 'tranrept-sonnet.pdf p.8 specifies two-decimal amounts, but does not settle decoded lexical variants.');
assumption('Filter inclusively using the first ten processing-timestamp characters, without timezone conversion.', 'The documented selection is by processing date, not original date; calendar-date comparison is lexical after validation.', 'tranrept-sonnet.pdf p.2 BR-01: Filter on processedTimestamp between start and end date inclusive; p.9 declares X(26) timestamps.');
assumption('Sort card-number strings ascending and retain input order within each card.', 'The maker explicitly chose input order within a card; no additional transaction-ID sort is added.', 'tranrept-sonnet.pdf p.2 BR-02: Sorted by card number; maker answer on within-card order.');
assumption('Use cross-reference account lookup by card, type lookup by type code, and category lookup by the pair type/category.', 'These are the documented keys; an account total is still a card-break total, not a regrouping by account.', 'tranrept-sonnet.pdf p.4 Data Mapping Verification; p.8 DT-04; pp.9-10 DT-08/DT-09; p.19 Account total: break on card number.');
assumption('For duplicate reference keys, keep the first occurrence and record a warning.', 'The sources define keys but do not state how duplicate input records should be resolved. Blank descriptions on the first record are not replaced silently by later duplicates.', 'tranrept-sonnet.pdf pp.8-10 key definitions; no duplicate-file-row rule stated.');
assumption('Missing account/type/category lookup values print blank with warnings. An invalid four-digit category prints blank with a warning; the transaction otherwise remains.', 'Follow the recorded missing-information decision and keep usable transactions. Optional descriptions do not make a whole run fail.', 'tranrept-sonnet.pdf p.4 scenario 5: Error flagged, run continues; the same page marks legacy abend behaviour TODO. Other lookup failures are silent in the source.');
assumption('Skip only transactions with an unreadable required identifier, card, processing date or amount; record a warning for each fault and continue.', 'One unusable record does not fail the batch. Check consumed required fields before filtering, so malformed out-of-range rows can still produce warnings. Missing reference keys are ignored with warnings; unused reference values are not separately validated.', 'Recorded missing-information decision; tranrept-sonnet.pdf p.4 continuation scenario. Detailed malformed-record and validation-order rules are not stated.');
assumption('Compute all sums as integer cents and fail, without partial report lines, if any running sum exceeds JavaScript safe integer precision.', 'Avoid binary currency rounding drift. Unsafe arithmetic is different from a value too wide to print.', 'tranrept-sonnet.pdf pp.2,19 requires totals but gives no arithmetic overflow policy.');
assumption('Each page holds 60 transaction details; header and total rows do not consume this allowance.', 'Maker explicitly selected 60 transactions per page.', 'tranrept-sonnet.pdf p.19: page size TODO: lines per page in CBTRN03C; maker pagination answer.');
assumption('A card total spans page breaks and closes only on card change or EOF, even when two cards share an account.', 'The wiki labels the printed line Account Total but explicitly states a card-number break.', 'tranrept-sonnet.pdf p.2 BR-04; p.19 Account total: sum per account/card, break on card number; p.29 Account Total layout.');
assumption('At a coincident card/page boundary, print card total and rule first, then page total and rule. Do not start an empty trailing page.', 'The sources do not define coincident boundaries or whether an empty last page exists.', 'tranrept-sonnet.pdf p.29: each page total and account total is followed by a rule; coincident ordering is absent.');
assumption('At EOF print final card total if any, then final page total and rule, then grand total without an additional rule.', 'Keep every selected processable detail in each relevant total exactly once. The contract does not require a rule after grand total.', 'tranrept-sonnet.pdf pp.2,19 totals descriptions; p.29 total line rules.');
assumption('An empty selection prints the four header lines, zero Page Total, its rule and zero Grand Total; no Account Total.', 'The wiki requires a zero-total report but does not specify its complete empty layout.', 'tranrept-sonnet.pdf p.4 scenario 4: Report with zero total; p.29 page/header/total line definitions.');
assumption('Zero prints with two decimal places and a nonnegative sign; details use blank/negative signs and totals use plus/negative signs at the first amount position.', 'Apply the contract pictures, suppress leading zeros and commas as spaces, and normalize negative zero.', 'tranrept-sonnet.pdf p.27 picture notation; p.29 amount fields. Detailed zero rendering is not otherwise shown.');
assumption('If a formatted amount cannot fit its 15-character field, print 15 asterisks and warn, while retaining the exact cents for totals.', 'Printed-field overflow must not silently truncate or change arithmetic; the contract gives widths but no overflow rule.', 'tranrept-sonnet.pdf p.29 positions 98-112 and numeric pictures; overflow handling absent.');
assumption('Pad every output line to 133 characters and truncate only the specified text fields. Count decoded string characters, not an independently specified binary encoding.', 'The contract permits omitted trailing spaces, but full padding is less ambiguous for comparison. No output byte encoding or non-ASCII display-width policy is supplied.', 'tranrept-sonnet.pdf pp.26,29 output length and field positions.');
assumption('Missing file inputs, malformed or reversed run dates, and unexpected calculation errors return FAILED with no report lines and a sidecar explanation; empty strings are valid files.', 'Prevent successful-looking partial or substituted results. Unexpected errors are sanitized instead of exposing raw record contents.', 'tranrept-sonnet.pdf does not specify these workflow-level failure semantics; implementation default.');
assumption('Model prose is optional documentation only: append it separately, preserve the full canonical ledger and warnings verbatim, and fall back to those if drafting fails.', 'The report is deterministic; a drafting failure must not alter financial results. Only sanitized ledger text and warnings are sent to the model, never raw cards/accounts or report details.', 'Confirmed assumptions-wording decision; this is a FlowX delivery choice not a legacy rule.');
var ledger = '# Assumptions for CardDemo daily transaction report\n\nEach entry distinguishes an explicit choice from behaviour the source leaves unstated.\n\n' + ledgerEntries.join('\n\n');
function warn(file, row, message) { warnings.push(file + ', row ' + row + ': ' + message); }
function bad(message) { if (!failure) failure = message; }
function trim(s) { return s.replace(/^ +| +$/g, ''); }
function field(s,p,n) { return trim(s.slice(p-1,p-1+n)); }
function rows(s) { if (s === '') return []; var r=s.split(/\r?\n/); if (r[r.length-1] === '') r.pop(); return r; }
function validDate(s) { if (typeof s !== 'string' || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(s)) return false; var y=Number(s.slice(0,4)),m=Number(s.slice(5,7)),d=Number(s.slice(8,10)); var ds=[31,(y%4===0&&(y%100!==0||y%400===0))?29:28,31,30,31,30,31,31,30,31,30,31]; return y>=1 && m>=1 && m<=12 && d>=1 && d<=ds[m-1]; }
function money(s) { s=trim(s); if (!s) return null; var pos='{ABCDEFGHI',neg='}JKLMNOPQR',last=s.slice(-1),p=pos.indexOf(last),n=neg.indexOf(last),sign=1; if(p>=0||n>=0) { if(!/^[0-9]*$/.test(s.slice(0,-1))) return null; sign=n>=0?-1:1; s=s.slice(0,-1)+String(n>=0?n:p); } else { if(s[0]==='+'||s[0]==='-') {sign=s[0]==='-'?-1:1;s=s.slice(1);} else if(s.slice(-1)==='+'||s.slice(-1)==='-') {sign=s.slice(-1)==='-'?-1:1;s=s.slice(0,-1);} if(!/^[0-9]+(?:\.[0-9]{1,2})?$/.test(s)) return null; } var parts=s.split('.'); var cents=Number(parts.length===2?parts[0]+parts[1].padEnd(2,'0'):parts[0])*sign; if(!Number.isSafeInteger(cents)) {bad('Unsafe transaction amount precision.');return null;} return cents===0?0:cents; }
function pad(s,n) { return String(s).slice(0,n).padEnd(n,' '); }
function emit(s) { if(s.length!==133) bad('Unexpected report line width.'); else lines.push(s); }
function picture(c,total,row,label) { var a=Math.abs(c); var whole=String(Math.floor(a/100)).replace(/\B(?=(\d{3})+(?!\d))/g,','); var text=whole+'.'+String(a%100).padStart(2,'0'); if(text.length>14) {warn('transact.dat',row,label+' amount exceeds printed width; asterisks used.');return '*'.repeat(15);} return (c<0?'-':total?'+':' ')+text.padStart(14,' '); }
function sum(a,b) { var c=a+b; if(!Number.isSafeInteger(c)) bad('Unsafe running-total precision.'); return c; }
var start,end;
function header() { emit(pad(pad('DALYREPT',38)+pad('Daily Transaction Report',41)+pad('Date Range:',12)+start+pad('to',4)+end,133));emit(' '.repeat(133));emit(pad(pad('Transaction ID',17)+pad('Account ID',12)+pad('Transaction Type',19)+pad('Tran Category',35)+pad('Tran Source',14)+' '+pad('Amount',16),133));emit('-'.repeat(133)); }
function rule() {emit('-'.repeat(133));}
function total(label,width,c,row) {emit(pad(label,width)+'.'.repeat(97-width)+picture(c,true,row,label)+' '.repeat(21));}
try {
  start=Object.prototype.hasOwnProperty.call(bag,'startDate')?bag.startDate:'2022-07-01';
  end=Object.prototype.hasOwnProperty.call(bag,'endDate')?bag.endDate:'2022-07-31';
  ['transact','cardxref','trantype','trancatg'].forEach(function(k){if(typeof bag[k]!=='string')bad('All four input file contents must be supplied as strings; empty strings are valid.');});
  if(!validDate(start)||!validDate(end))bad('Run dates must be valid Gregorian YYYY-MM-DD calendar dates.');else if(start>end)bad('Start date is later than end date.');
  if(!failure) {
    var xrefs=new Map(),types=new Map(),cats=new Map();
    rows(bag.cardxref).forEach(function(r,i){var k=field(r,1,16);if(!k)warn('cardxref.dat',i+1,'Missing reference key; row ignored.');else if(xrefs.has(k))warn('cardxref.dat',i+1,'Duplicate reference key; first occurrence retained.');else xrefs.set(k,field(r,26,11));});
    rows(bag.trantype).forEach(function(r,i){var k=field(r,1,2);if(!k)warn('trantype.dat',i+1,'Missing reference key; row ignored.');else if(types.has(k))warn('trantype.dat',i+1,'Duplicate reference key; first occurrence retained.');else types.set(k,field(r,3,50));});
    rows(bag.trancatg).forEach(function(r,i){var t=field(r,1,2),c=r.slice(2,6),k=JSON.stringify([t,c]);if(!t||!/^[0-9]{4}$/.test(c))warn('trancatg.dat',i+1,'Unusable composite reference key; row ignored.');else if(cats.has(k))warn('trancatg.dat',i+1,'Duplicate reference key; first occurrence retained.');else cats.set(k,field(r,7,50));});
    var selected=[];
    rows(bag.transact).forEach(function(r,i){if(failure)return;var id=field(r,1,16),card=field(r,263,16),date=r.slice(304,314),c=money(r.slice(132,143)),ok=true;if(!id){warn('transact.dat',i+1,'Missing transaction identifier; row skipped.');ok=false;}if(!card){warn('transact.dat',i+1,'Missing card identifier; row skipped.');ok=false;}if(!validDate(date)){warn('transact.dat',i+1,'Unreadable processing date; row skipped.');ok=false;}if(c===null){warn('transact.dat',i+1,'Unreadable amount; row skipped.');ok=false;}if(ok&&!failure&&date>=start&&date<=end)selected.push({id:id,card:card,type:field(r,17,2),cat:r.slice(18,22),source:field(r,23,10),cents:c,row:i+1});});
    selected.sort(function(a,b){return a.card<b.card?-1:a.card>b.card?1:a.row-b.row;});
    if(!failure) {
      var pageSum=0,cardSum=0,grand=0,count=0;header();
      for(var i=0;i<selected.length&&!failure;i++) {
        var t=selected[i],acct=xrefs.has(t.card)?xrefs.get(t.card):'',td=types.has(t.type)?types.get(t.type):'',cat=/^[0-9]{4}$/.test(t.cat)?t.cat:'',cd=cat&&cats.has(JSON.stringify([t.type,cat]))?cats.get(JSON.stringify([t.type,cat])):'';
        if(!acct)warn('transact.dat',t.row,'Missing account lookup value; printed blank.');
        if(!td)warn('transact.dat',t.row,'Missing type description; printed blank.');
        if(!cat)warn('transact.dat',t.row,'Unreadable category code; category and description printed blank.');else if(!cd)warn('transact.dat',t.row,'Missing category description; printed blank.');
        pageSum=sum(pageSum,t.cents);cardSum=sum(cardSum,t.cents);grand=sum(grand,t.cents);if(failure)break;
        emit(pad(t.id,16)+' '+pad(acct,11)+' '+pad(t.type,2)+'-'+pad(td,15)+' '+pad(cat,4)+'-'+pad(cd,29)+' '+pad(t.source,10)+' '.repeat(4)+picture(t.cents,false,t.row,'Detail')+' '.repeat(21));count++;
        var last=i===selected.length-1;
        if(last||selected[i+1].card!==t.card){total('Account Total',13,cardSum,t.row);rule();cardSum=0;}
        if(count===60||last){total('Page Total',11,pageSum,t.row);rule();pageSum=0;count=0;if(!last)header();}
      }
      if(!failure){if(!selected.length){total('Page Total',11,0,0);rule();}total('Grand Total',11,grand,selected.length?selected[selected.length-1].row:0);}
    }
  }
} catch(ignored) {bad('Unexpected calculation error; partial report discarded and raw input details suppressed.');}
if(failure){lines=[];ledger+='\n\n## Calculation failure\n\n'+failure;}else{ledger+='\n\n## Calculation outcome\n\n'+(warnings.length?'Completed with warnings.':'Completed without warnings.');}
output={reportLines:lines,assumptionsLedger:ledger,runWarnings:warnings,reportStatus:failure?'FAILED':warnings.length?'WARNING':'OK'};
```

### AssembleOutputs (SCRIPT, id=6ae580f13695c563ea515ed1)

```javascript
var b=typeof input==='object'&&input!==null?input:{};
var ws=Array.isArray(b.runWarnings)?b.runWarnings.filter(function(x){return typeof x==='string';}).slice():[];
var report=Array.isArray(b.reportLines)&&b.reportLines.every(function(x){return typeof x==='string'&&x.length===133;})?b.reportLines:null;
var ledger=typeof b.assumptionsLedger==='string'&&b.assumptionsLedger.trim()?b.assumptionsLedger:'';
var known=b.reportStatus==='OK'||b.reportStatus==='WARNING'||b.reportStatus==='FAILED';
var failed=b.reportStatus==='FAILED'||!known||report===null||!ledger;
if(!ledger){ledger='# Assumptions unavailable\n\nThe authoritative ledger was not supplied; evidence cannot be reconstructed silently.';ws.push('AssembleOutputs: missing authoritative assumptions ledger.');}
if(report===null){report=[];ws.push('AssembleOutputs: report lines missing or malformed; no report returned.');}
if(!known)ws.push('AssembleOutputs: calculation status missing or malformed.');
if(failed)report=[];
var draft=b.assumptionsDraft&&typeof b.assumptionsDraft==='object'&&!Array.isArray(b.assumptionsDraft)?b.assumptionsDraft.assumptionsText:null;
var good=typeof draft==='string'&&draft.trim().length>0;
if(!good)ws.push('AssembleOutputs: optional assumptions drafting failed or returned empty/malformed text; complete canonical ledger and warnings returned instead.');
var md=ledger+'\n\n## Run warnings\n\n'+(ws.length?ws.join('\n\n'):'None.');
if(good){var runs=draft.match(/`+/g)||[],n=3;runs.forEach(function(s){if(s.length>=n)n=s.length+1;});var fence='`'.repeat(n);md+='\n\n## Separate model-drafted explanation\n\nNoncanonical explanation only; the authoritative assumptions and warnings above remain unchanged.\n\n'+fence+'text\n'+draft+'\n'+fence;}
output={result:{tranrept_report:report,assumptions_md:md,status:failed?'FAILED':b.reportStatus==='WARNING'||ws.length?'WARNING':'OK'}};
```

### DraftAssumptions failed (SCRIPT, id=6ae580f13695c563ea515ed2)

```javascript
output = {"assumptionsDraft": {}};

```

_(server: 333 ms, 1 API call, 330 ms in API)_
