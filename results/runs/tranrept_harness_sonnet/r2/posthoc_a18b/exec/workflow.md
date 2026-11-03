# Workflow: GenerateDailyTransactionReport

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** 

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6adfabf016836599f3950522 | <uuid> | (0, 0) | → ParseInputs (seq:<uuid>) |
| End | END | 6adfabf016836599f3950523 | <uuid> | (1800, 0) | — |
| ParseInputs | SCRIPT | 6adfabf116836599f3950524 | <uuid> | (300, 0) | → RenderReport (seq:<uuid>) | lang: JAVASCRIPT |
| RenderReport | SCRIPT | 6adfabf116836599f3950525 | <uuid> | (600, 0) | → DraftAssumptions (seq:<uuid>) | lang: JAVASCRIPT |
| DraftAssumptions | AI | 6adfabf216836599f3950526 | <uuid> | (900, 0) | → PackageOutputs [SUCCESS] (seq:<uuid>), → DraftAssumptions failed [FAIL] (seq:<uuid>) | responseKey: assumptionDraft, aiType: TEXT_UNDERSTANDING, responseSchema: set |
| PackageOutputs | SCRIPT | 6adfabf216836599f3950527 | <uuid> | (1200, 0) | → Escape text (seq:<uuid>) | lang: JAVASCRIPT |
| Escape text | SCRIPT | 6adfabf216836599f3950528 | <uuid> | (1500, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| DraftAssumptions failed | SCRIPT | 6adfabf316836599f3950529 | <uuid> | (900, 200) | → PackageOutputs (seq:<uuid>) | lang: JAVASCRIPT |

## Systems
_(none)_

## AI prompts

### DraftAssumptions (TEXT_UNDERSTANDING, id=6adfabf216836599f3950526)
instructions:

```
Write the accompanying assumptions.md explanation in English. Your input is a complete implementation-decision register with source page citations or explicitly identified absences and safe run diagnostics. Return a JSON object with one markdown string. Explain every assumption and its source or absence; do not invent legacy behaviour, copybook evidence, oracle results, or additional decisions. Distinguish explicit contract requirements from inferred defaults. Preserve the stated defaults, failure rules, uncertainty and warning counts. Do not change any report calculation or output. Do not claim a source was unavailable: the supplied register contains the passages read by the implementation planner. The complete register will be retained separately after your explanation.
```
userMessage:

```
${assumptionEvidence}
```
exampleOutputJsonSchema:

```
{"title":"Response","type":"object","properties":{"markdown":{"type":"string"}},"required":["markdown"],"additionalProperties":false}
```

## Scripts

### ParseInputs (SCRIPT, id=6adfabf116836599f3950524)

```javascript
var r={records:[],maps:{xref:{},types:{},categories:{}},errors:[],warnings:[],dates:{startDate:'2022-07-01',endDate:'2022-07-31'}};
try {
var root=input||{}, files=root.files, bad=0,dups=0, all=[];
function own(o,k){return Object.prototype.hasOwnProperty.call(o,k);}
function digits(s){return /^[0-9]+$/.test(s);}
function dateOK(s){if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;var y=Number(s.slice(0,4)),m=Number(s.slice(5,7)),d=Number(s.slice(8,10));if(y<1||m<1||m>12)return false;var leap=y%4===0&&(y%100!==0||y%400===0);return d>=1&&d<=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31][m-1];}
function stamp(s){return s.length===26&&dateOK(s.slice(0,10))&&[' ','-','T'].indexOf(s.charAt(10))>=0;}
function cents(s){if(s.length!==11||!digits(s.slice(0,10)))return null;var last=s.charAt(10),n,sign=1;if(digits(last))n=Number(last);else{n='{ABCDEFGHI'.indexOf(last);if(n<0){n='}JKLMNOPQR'.indexOf(last);sign=-1;}}if(n<0)return null;var v=(Number(s.slice(0,10))*10+n)*sign;return Number.isSafeInteger(v)&&Math.abs(v)<=99999999999?(v===0?0:v):null;}
var names=['transact.dat','cardxref.dat','trantype.dat','trancatg.dat'];
if(!files||typeof files!=='object'||Array.isArray(files)){r.errors.push('All four input file contents are required.');files={};}
for(var ni=0;ni<names.length;ni++){if(!own(files,names[ni])||typeof files[names[ni]]!=='string')r.errors.push('Missing or non-text input: '+names[ni]);}
var start=root.startDate==null?'2022-07-01':root.startDate,end=root.endDate==null?'2022-07-31':root.endDate;
if(!dateOK(start)||!dateOK(end)||start>end)r.errors.push('Invalid date range.');else r.dates={startDate:start,endDate:end};
function rows(name,width,visit){if(typeof files[name]!=='string'||files[name]==='')return;var a=files[name].split('\n'),terminal=a[a.length-1]==='';if(terminal)a.pop();for(var i=0;i<a.length;i++){var s=a[i];if((i<a.length-1||terminal)&&s.endsWith('\r'))s=s.slice(0,-1);if(s.length!==width||/[^ -~]/.test(s)){bad++;continue;}if(!visit(s,i))bad++;}}
rows('cardxref.dat',50,function(s){var card=s.slice(0,16),cust=s.slice(16,25),acct=s.slice(25,36);if(!digits(card)||!digits(cust)||!digits(acct))return false;if(own(r.maps.xref,card))dups++;else r.maps.xref[card]=acct;return true;});
rows('trantype.dat',60,function(s){var k=s.slice(0,2);if(!digits(k))return false;if(own(r.maps.types,k))dups++;else r.maps.types[k]=s.slice(2,52);return true;});
rows('trancatg.dat',60,function(s){var t=s.slice(0,2),c=s.slice(2,6),k=t+c;if(!digits(t)||!digits(c))return false;if(own(r.maps.categories,k))dups++;else r.maps.categories[k]=s.slice(6,56);return true;});
rows('transact.dat',350,function(s,i){var id=s.slice(0,16),t=s.slice(16,18),c=s.slice(18,22),v=cents(s.slice(132,143)),card=s.slice(262,278);if(id.trim()===''||!digits(t)||!digits(c)||!digits(s.slice(143,152))||!digits(card)||v===null||!stamp(s.slice(278,304))||!stamp(s.slice(304,330)))return false;all.push({id:id,type:t,category:c,source:s.slice(22,32),card:card,cents:v,sequence:i,processedDate:s.slice(304,314)});return true;});
if(bad)r.errors.push('Invalid fixed-width records: '+bad+'.');if(dups)r.warnings.push('Duplicate reference records ignored: '+dups+'.');
if(r.errors.length===0){var mx=0,mt=0,mc=0;for(var i=0;i<all.length;i++){var a=all[i];if(a.processedDate>=start&&a.processedDate<=end){if(!own(r.maps.xref,a.card))mx++;if(!own(r.maps.types,a.type))mt++;if(!own(r.maps.categories,a.type+a.category))mc++;r.records.push(a);}}r.records.sort(function(a,b){return a.card<b.card?-1:a.card>b.card?1:a.sequence-b.sequence;});if(mx)r.warnings.push('Selected records without an account lookup: '+mx+'.');if(mt)r.warnings.push('Selected records with an unknown transaction type: '+mt+'.');if(mc)r.warnings.push('Selected records with an unknown transaction category: '+mc+'.');}
} catch(e){r.records=[];r.errors.push('Input processing failed safely.');}
output={reportData:r};
```

### RenderReport (SCRIPT, id=6adfabf116836599f3950525)

```javascript
var register=[
'# Implementation decisions and source evidence',
'',
'Each entry states an assumption or implementation interpretation and the wiki statement or absence supporting it. Sources refer to the attached tranrept-sonnet.pdf, read for this implementation. These choices are not claims of oracle equivalence.',
'',
'1. Input offsets and filler. Assume consecutive legacy fields in the order documented on pp.8-9, followed by filler to the p.26 record length. transact.dat one-based positions: transaction ID 1-16; type 17-18; category 19-22; source 23-32; description 33-132; amount 133-143; merchant ID 144-152; merchant name 153-202; city 203-252; ZIP 253-262; card 263-278; original timestamp 279-304; processed timestamp 305-330; filler 331-350. The attachment names the copybook but does not reproduce its complete definition, so these offsets are inferred, not verified against the copybook.',
'2. Reference offsets. P.8 CardXref lists card, customer, account in that order, widths 16,9,11; assume positions 1-16,17-25,26-36 and filler 37-50. P.9 TransactionType lists type 2 then description 50; assume positions 1-2,3-52,filler 53-60. P.10 TransactionCategory lists type 2,category 4,description 50; assume positions 1-2,3-6,7-56,filler 57-60. P.26 fixes record lengths. Full reference copybooks are absent.',
'3. Amount decoding. P.8 documents TRAN-AMT S9(9)V99. Assume 11 display characters with implied cents and ASCII trailing overpunch: digits or {ABCDEFGHI for positive final digits 0-9, }JKLMNOPQR for negative final digits 0-9. Decimal points, separate signs and other encodings fail. P.9 documents overpunch for another legacy field, but the report input encoding is not explicitly stated. Negative zero is normalized to zero.',
'4. Record validation. P.26 says fixed-width text, one record per line. Assume exact lengths and printable ASCII, including filler; ignore filler contents after validation. Numeric category, merchant and card/account/customer identifiers must contain digits; type codes are two digits as the documented 01-07 convention indicates. Transaction ID is nonblank text because p.8 describes X(16), not a numeric picture. Reject bad records even outside the selected date range rather than silently skipping them; the wiki does not specify malformed-file handling. Require all four file contents, but explicitly empty strings mean valid empty files. Additional file entries are ignored because this isolated step reads only its four specified inputs.',
'5. Line endings and whitespace. The wiki is silent on transport delimiters: accept LF or CRLF and one optional terminal line ending; reject interior blank records, extra terminal blank records, lone CR, tabs, BOM and non-ASCII. Preserve fixed-width fields before parsing. Reference descriptions are trimmed at both ends then truncated to display width; whether leading spaces are meaningful is unspecified. Source retains its 10 characters.',
'6. Date defaults and overrides. P.26 specifies report start 2022-07-01 and end 2022-07-31, taking precedence over the older p.2 default of 2022-01-01 through 2022-07-06. Missing or null dates default independently; supplied dates must be real Gregorian YYYY-MM-DD with years 0001-9999 and start not after end. Empty strings fail. These null and invalid-input conventions are implementation assumptions.',
'7. Timestamp interpretation. P.2: Filter on processedTimestamp between start and end date inclusive. Compare its first 10 characters as a date, with no timezone conversion. Both timestamps must contain a valid date followed by space, hyphen or T, total width 26 as on p.9; remaining clock characters are opaque printable text because their grammar is absent. originalTimestamp never selects a row.',
'8. Sort and ties. P.2: Sorted by card number. Use lexical order on the fixed 16-character card identifier; preserve original file sequence within a card. The wiki does not define a secondary sort. Do not deduplicate input transactions.',
'9. Lookup keys. P.10 defines category primary key as type plus category; p.16 GET_TYPE_DESCRIPTION accepts both. Use exact type and composite type/category lookups, and exact card lookup for account. Preserve identifier and category leading zeros. This resolves the otherwise ambiguous category-only lookup.',
'10. Unknown and repeated reference rows. P.4 says Type missing in reference data: Error flagged, run continues, with legacy abend behaviour TODO. Print UNKNOWN for a missing type or category. Missing card cross-reference behaviour is absent: print eleven account spaces, flag it and continue. Duplicate-key policy is absent: first occurrence wins and subsequent rows are still validated. Aggregate warnings record duplicate and selected-row lookup counts without account numbers, card numbers or transaction contents.',
'11. Display truncation and alignment. P.29 fixes type description X(15) and category description X(29): truncate after trimming, then right-pad. Category prints four digits. Do not add unused merchant, transaction description, timestamps, page number or other fields. P.19 mentions a page number but p.29 provides no position, so the contract layout wins. All printed lines are exactly 133 characters; the contract permits shorter trailing spaces but retaining them is deterministic.',
'12. Monetary arithmetic and overflow. Totals are sums of decoded integer cents, not floating-point dollar sums. The wiki does not define overflow or rounding handling: preserve cents exactly; reject any detail or running page, card or grand total whose magnitude exceeds 99999999999 cents, even if later amounts could cancel it. This is the largest nine-integer-digit, two-decimal monetary picture. Details use a minus only for negatives, totals an explicit plus/minus; zero totals print +0.00. Commas and numbers are right-aligned in the 15-character slots on p.29.',
'13. Header and detail construction. Follow p.29 one-based positions literally. Header labels are left-aligned within their slots; literal date separator is four characters: space, to, space. Column headings concatenate widths 17,12,19,35,14,one space,16 and pad to 133. A page begins with report header, blank line, column header and rule. Detail account comes from CardXref; no matching transaction is omitted solely for a missing lookup.',
'14. Total labels and rules. P.29 gives Account Total columns 1-13 and dots 14-97; use the 13-character label followed by 84 dots. Page Total and Grand Total occupy 11-character padded slots followed by 86 dots. Amounts occupy 98-112. A page or account total is followed by a 133-hyphen rule; no final grand-total rule is added because none is specified.',
'15. Pagination capacity. P.19 explicitly says page size TODO: lines per page in CBTRN03C. Assume 50 detail rows per page; headings, blanks, totals and rules do not consume this capacity. Repeat the heading block when the next detail starts a new page. Do not create an empty extra page after an exact multiple of 50 details.',
'16. Total scope and ordering. P.19: Account total sum of amounts per account/card (break on card number). Therefore maintain a separate subtotal for each contiguous sorted card, even if two cards share an account. Carry the card subtotal across pages; reset page subtotal per page; grand total counts each detail exactly once. Simultaneous page/card ordering is not supplied: print page total and rule before account total and rule; finish with grand total. Earlier card changes print their account total inside the current page. On the final row close the page before closing the final card.',
'17. Empty selection. P.4 requires Report with zero total but does not specify its exact lines. Emit one header block, zero Page Total, its rule, then zero Grand Total; no Account Total. This is seven lines.',
'18. Failures and existing inputs. Missing files, malformed records, bad dates, overflow or caught exceptions return FAILED with safe error and an empty report, never successful partial output. Lookup warnings remain SUCCESS. This fail-closed policy is an assumption because wiki error handling covers missing references, not file corruption. Inputs are never modified and no existing stored records are migrated or written.',
'19. Output transport. P.26 permits the same lines as a string or list under the filename without extension; return the list under tranrept_report and return assumptions.md beside it, together inside the returned outputs object. Report lines contain no newline characters. No directory, storage service or newline convention for serialized output files was specified, so this workflow returns contents rather than writing to an invented location. status and error distinguish failure from an empty successful report. An outer object is used because FlowX top-level return names cannot contain a dot; it preserves the document name assumptions.md exactly as an inner member.',
'20. Assumptions prose and fallback. The user requests every decision with its source or absence. The model reads only this complete evidence register and aggregate diagnostics, not transaction or card data. It drafts explanatory Markdown but may not make decisions or alter the report. Always append this full register. If prose generation fails or returns blank, retain the deterministic register and note fallback. This authoring and fallback mechanism is an implementation choice, not a legacy behaviour. No oracle fixtures were supplied, so parity remains unverified.'
].join('\n\n');
var lines=[],status='FAILED',error={type:'INVALID_INPUT',message:'Report data missing.'},warnings=[],validation=[],r=input&&input.reportData;
try{
function own(o,k){return Object.prototype.hasOwnProperty.call(o,k);}
function bounded(n){return Number.isSafeInteger(n)&&Math.abs(n)<=99999999999;}
function money(n,signed){var a=Math.abs(n),whole=String(Math.floor(a/100)),g='';for(var j=0;j<whole.length;j++){if(j>0&&(whole.length-j)%3===0)g+=',';g+=whole.charAt(j);}return ((n<0?'-':signed?'+':'')+g+'.'+String(a%100).padStart(2,'0')).padStart(15,' ');}
function total(label,n){var w=label==='Account Total'?13:11;return label.padEnd(w,' ')+'.'.repeat(97-w)+money(n,true)+' '.repeat(21);}
if(r&&Array.isArray(r.errors)&&Array.isArray(r.warnings)&&Array.isArray(r.records)&&r.maps&&r.dates){warnings=r.warnings;validation=r.errors;if(validation.length){error={type:'INVALID_INPUT',message:'Input validation failed; no report generated.'};}else{
var a=r.records,rule='-'.repeat(133),header='DALYREPT'.padEnd(38,' ')+'Daily Transaction Report'.padEnd(41,' ')+'Date Range:'.padEnd(12,' ')+r.dates.startDate+' to '+r.dates.endDate+' '.repeat(18),columns=('Transaction ID'.padEnd(17,' ')+'Account ID'.padEnd(12,' ')+'Transaction Type'.padEnd(19,' ')+'Tran Category'.padEnd(35,' ')+'Tran Source'.padEnd(14,' ')+' '+'Amount'.padEnd(16,' ')).padEnd(133,' ');
function pageHeader(){lines.push(header,' '.repeat(133),columns,rule);}
var pageSum=0,cardSum=0,grandSum=0,count=0,overflow=false;
for(var i=0;i<a.length;i++){var t=a[i];pageSum+=t.cents;cardSum+=t.cents;grandSum+=t.cents;if(!bounded(t.cents)||!bounded(pageSum)||!bounded(cardSum)||!bounded(grandSum)){overflow=true;break;}if(count===0)pageHeader();var account=own(r.maps.xref,t.card)?r.maps.xref[t.card]:' '.repeat(11),td=own(r.maps.types,t.type)?r.maps.types[t.type]:'UNKNOWN',cd=own(r.maps.categories,t.type+t.category)?r.maps.categories[t.type+t.category]:'UNKNOWN';lines.push(t.id+' '+account+' '+t.type+'-'+td.trim().slice(0,15).padEnd(15,' ')+' '+t.category+'-'+cd.trim().slice(0,29).padEnd(29,' ')+' '+t.source+' '.repeat(4)+money(t.cents,false)+' '.repeat(21));count++;var last=i===a.length-1,cardEnd=last||a[i+1].card!==t.card;if(count===50||last){lines.push(total('Page Total',pageSum),rule);pageSum=0;count=0;}if(cardEnd){lines.push(total('Account Total',cardSum),rule);cardSum=0;}if(last)lines.push(total('Grand Total',grandSum));}
if(overflow){lines=[];error={type:'AMOUNT_OVERFLOW',message:'A running report amount exceeds its print picture.'};}else{if(a.length===0){pageHeader();lines.push(total('Page Total',0),rule,total('Grand Total',0));}var layoutOK=lines.every(function(s){return typeof s==='string'&&s.length===133&&!/[^ -~]/.test(s);});if(layoutOK){status='SUCCESS';error=null;}else{lines=[];error={type:'LAYOUT_ERROR',message:'Report line layout failed validation.'};}}
}}
}catch(e){lines=[];status='FAILED';error={type:'INTERNAL_ERROR',message:'Report rendering failed safely.'};}
var diagnostics='## Run diagnostics\n\nOutcome: '+status+'\n\n'+(warnings.length?warnings.join('\n\n'):'No reference warnings.')+'\n\n'+(validation.length?validation.join('\n\n'):'No input validation errors.');
var evidence=register+'\n\n'+diagnostics;
output={tranrept_report:lines,assumptionEvidence:evidence,assumptionsFallback:'# Assumptions\n\n'+evidence,status:status,error:error};
```

### PackageOutputs (SCRIPT, id=6adfabf216836599f3950527)

```javascript
var root=input||{},draft=root.assumptionDraft,evidence=typeof root.assumptionEvidence==='string'?root.assumptionEvidence:'Evidence register is unavailable; report generation must be investigated.',fallback=typeof root.assumptionsFallback==='string'?root.assumptionsFallback:'# Assumptions\n\n'+evidence;
var valid=draft&&typeof draft==='object'&&typeof draft.markdown==='string'&&draft.markdown.trim()!=='';
var markdown=valid?draft.markdown+'\n\n---\n\n'+evidence:fallback+'\n\n## Drafting fallback\n\nThe optional explanatory drafting step did not return usable prose. The complete implementation-decision register and run diagnostics above remain authoritative.';
var files={tranrept_report:Array.isArray(root.tranrept_report)?root.tranrept_report:[],'assumptions.md':markdown};
output={assumptionsMarkdown:markdown,reportFiles:files};
```

### Escape text (SCRIPT, id=6adfabf216836599f3950528)

```javascript
function esc(v) { return v == null ? null : JSON.stringify(String(v)).slice(1, -1).replace(/\\"/g, '"'); }
function at(o, p) { return p.split('.').reduce(function (x, k) { return x == null ? undefined : x[k]; }, o); }
output = {"endText": {t0: esc(at(input, "status"))}};

```

### DraftAssumptions failed (SCRIPT, id=6adfabf316836599f3950529)

```javascript
output = {"assumptionDraft": {}};

```

_(server: 274 ms, 1 API call, 270 ms in API)_
