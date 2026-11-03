# Workflow: CardDemoDailyTransactionReport

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** 

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae3cd3d3695c563ea5105d9 | <uuid> | (0, 0) | → Transform (seq:<uuid>) |
| End | END | 6ae3cd3e3695c563ea5105da | <uuid> | (600, 0) | — |
| Transform | SCRIPT | 6ae3cd3e3695c563ea5105db | <uuid> | (300, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |

## Systems
_(none)_

## Scripts

### Transform (SCRIPT, id=6ae3cd3e3695c563ea5105db)

```javascript
var bag = input || {};
var assumptions = [];
function assume(text, basis) { assumptions.push({whatYouAssumed:text,wikiStatementOrAbsence:basis}); }
assume('The caller supplies decoded ASCII fixed-width file contents as transact, cardxref, trantype and trancatg, then saves result.tranrept_report as tranrept_report.txt and result.assumptions_md as assumptions.md in the same output directory. No filesystem access occurs in this workflow.','tranrept-sonnet-ix3.pdf p.26 permits report text returned under the filename without extension. Caller-side file transfer was selected by the maker; the Markdown output is returned separately for saving.');
assume('Absent startDate or endDate uses 2022-07-01 or 2022-07-31 respectively. Explicit null, blank, impossible dates and reversed ranges are failures, not defaults.','tranrept-sonnet-ix3.pdf p.26 gives the daily-report run range; p.2 also gives older generic defaults. The step-specific contract takes precedence for this build.');
assume('Input is already decoded single-byte ASCII text. LF and CRLF separate records; a final newline is optional. Embedded blank records are invalid; unused filler, including NUL bytes, is ignored. No EBCDIC conversion is attempted.','tranrept-sonnet-ix3.pdf pp.25-26 specify fixed-width text records but do not define a transport encoding, line terminator or EBCDIC conversion.');
assume('Derive transaction offsets by concatenating the fields listed in wiki order: id 1-16, type 17-18, category 19-22, source 23-32, description 33-132, amount 133-143, merchant id 144-152, merchant name 153-202, city 203-252, zip 253-262, card 263-278, original timestamp 279-304 and processing timestamp 305-330; remaining bytes are filler.','tranrept-sonnet-ix3.pdf pp.8-9 list ordered Transaction fields and widths; p.26 names CVTRA05Y and 350-byte records, but the complete copybook is absent. These offsets are derived, not verified against legacy source.');
assume('Read card cross-reference card at 1-16 and account at 26-36; ignore customer at 17-25. Read type code 1-2 and description 3-52. Read category type 1-2, code 3-6 and description 7-56. Ignore other bytes. Require only the bytes actually read, not filler length.','tranrept-sonnet-ix3.pdf pp.8-10 list these fields and widths; p.26 specifies 50/60/60-byte files but does not reproduce full copybooks.');
assume('Identifiers remain text with leading zeroes. Card order is lexicographic on its fixed-width text; equal-card transactions retain input order.','tranrept-sonnet-ix3.pdf pp.8-9 define string identifiers; p.2 BR-02 specifies card sorting but no secondary sort.');
assume('Use the first ten characters of processedTimestamp as its ISO calendar date, without timezone conversion; both date endpoints are inclusive. Validate only that date portion, not unused timestamp components.','tranrept-sonnet-ix3.pdf p.2 BR-01 filters processing date inclusively; pp.9 and 26 supply timestamp and date formats but no timezone conversion rule.');
assume('Exclude exactly the combination type 01 and category 0005 before amount parsing, lookup, detail counting or totals; preserve other type/category combinations.','tranrept-sonnet-ix3.pdf p.2 BR-07 and p.4 scenario 7 explicitly exclude interest from every detail and total.');
assume('The eleven-byte S9(9)V99 display amount carries integer cents. Accept digits, a leading/trailing explicit sign or standard ASCII signed overpunch {ABCDEFGHI / }JKLMNOPQR. Arithmetic uses integer cents, never binary decimal addition or rounding.','tranrept-sonnet-ix3.pdf p.8 gives S9(9)V99 and two decimal places, but the input sign encoding is not fully specified; p.9 documents overpunch elsewhere in CardDemo.');
assume('Duplicate card, type or composite type/category reference keys use the first record and flag the report incomplete. Empty lookup keys and malformed reference records are flagged and ignored.','tranrept-sonnet-ix3.pdf pp.8-10 describe primary keys but do not define duplicate or malformed sequential-input handling.');
assume('Unknown card references print eleven spaces as account ID; unknown type/category references print blank descriptions while retaining their codes, transaction and amount. Flag each affected transaction and continue with an incomplete status.','tranrept-sonnet-ix3.pdf p.4 scenario 5 says unknown types are flagged and the run continues, with a TODO on legacy abend behaviour; missing category/card behaviour is silent. The maker selected this continuation policy.');
assume('Unreadable required data skips only its own record and flags the report incomplete. Unused merchant, customer, original timestamp, transaction description and filler content is not validated.','tranrept-sonnet-ix3.pdf p.19 names the printed fields; the wiki has no malformed-record policy. The maker selected record-local continuation, not a whole-run rejection.');
assume('Page capacity is provisionally 50 included transaction detail lines; headers, rules, account totals and page totals do not consume that capacity.','tranrept-sonnet-ix3.pdf p.19 explicitly leaves lines per page TODO. This is a provisional implementation assumption, not a recovered legacy fact.');
assume('Page totals reset on each page; card totals persist across page boundaries and print after the last transaction of that card. Account Total means a card group even when several cards share one account.','tranrept-sonnet-ix3.pdf p.2 BR-04 and p.19 say account/card break on card number; details of spanning-page sequencing are unstated. The maker selected carry-over presentation.');
assume('If a card ends at a full-page boundary, print Account Total and its rule before Page Total and its rule. Start a new page only when another included detail exists. Grand Total closes the final page without an extra rule or empty page.','tranrept-sonnet-ix3.pdf p.29 requires rules after account and page totals, but not grand total, and leaves coincident-boundary sequencing unstated. The maker selected this presentation policy.');
assume('An empty selection prints the header, blank line, column header, rule, zero Page Total, rule and zero Grand Total; no Account Total.','tranrept-sonnet-ix3.pdf p.4 scenario 4 requires a report with zero total and p.29 specifies line types but not their empty-report sequence. The maker selected this presentation policy.');
assume('All lines are space-padded to exactly 133 characters and joined by LF without a final LF. Do not add carriage-control bytes or a page number field not present in the contract.','tranrept-sonnet-ix3.pdf p.29 supplies exact positions, while p.19 mentions page numbers without placing one. p.26 permits omitted trailing spaces; this implementation retains them for exact width.');
assume('Left-align and truncate text to its contract field width. Place the monetary sign in column 98, use spaces for leading integer zeroes and associated commas, and always print two fractional digits, including .00 for zero. Details use space/minus; totals use plus/minus.','tranrept-sonnet-ix3.pdf pp.27 and 29 specify the pictures and positions; exact zero-value editing is otherwise unstated. Text truncation follows X(n) field widths.');
assume('A malformed category code or missing required transaction identifier/card is unreadable record data. Non-digit identifiers are not otherwise rejected.','tranrept-sonnet-ix3.pdf pp.8-10 specify category as four digits and identifiers as strings, but do not specify broader input rejection rules.');
assume('An amount or accumulated total exceeding the nine-integer-digit picture or safe integer arithmetic produces an incomplete outcome with no report, rather than a silently truncated financial value. All available errors and assumptions are still returned.','tranrept-sonnet-ix3.pdf p.29 limits the printed amount picture but supplies no overflow rule. This conservative limitation is documented rather than claimed as legacy behaviour.');
assume('status is OK for a complete report, INCOMPLETE when record/reference errors occurred, and FAILED for invalid run inputs; errors are returned separately and are never inserted as extra report lines.','tranrept-sonnet-ix3.pdf p.4 requires errors to be flagged without stopping, but p.29 defines no error print line. The maker selected clearly disclosed incomplete outcomes.');
function mdCell(s) { return s.replace(/\|/g,'\\|').replace(/\r?\n/g,' '); }
var markdown = '# Daily transaction report assumptions\n\nThese are implementation choices, not verified legacy facts.\n\n| What you assumed | Which wiki statement (or absence of one) it rests on |\n| --- | --- |\n';
for (var ai=0; ai<assumptions.length; ai++) markdown += '| '+mdCell(assumptions[ai].whatYouAssumed)+' | '+mdCell(assumptions[ai].wikiStatementOrAbsence)+' |\n';
var errors=[];
function flag(file, record, message, transactionId) { errors.push({file:file,record:record,message:message,transactionId:transactionId||''}); }
function rtrim(s) { return s.replace(/ +$/,''); }
function text(s,n) { return (s + ' '.repeat(n)).slice(0,n); }
function line(s) { return text(s,133); }
function validDate(s) { if(typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false; var y=+s.slice(0,4),m=+s.slice(5,7),d=+s.slice(8,10); var leap=y%4===0 && (y%100!==0 || y%400===0); var days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31]; return y>=1 && m>=1 && m<=12 && d>=1 && d<=days[m-1]; }
var start = bag.startDate === undefined ? '2022-07-01' : bag.startDate;
var end = bag.endDate === undefined ? '2022-07-31' : bag.endDate;
var fatal=false,overflow=false;
if(!validDate(start) || !validDate(end) || start>end) { flag('parameters',0,'Invalid or reversed report date range'); fatal=true; }
var fileKeys=['transact','cardxref','trantype','trancatg'];
for(var fi=0;fi<fileKeys.length;fi++) if(typeof bag[fileKeys[fi]]!=='string') { flag(fileKeys[fi]+'.dat',0,'Required file contents must be supplied as text; empty text is valid'); fatal=true; }
function records(s) { if(s==='') return []; var rows=s.split('\n'); if(rows[rows.length-1]==='') rows.pop(); return rows.map(function(row){return row.endsWith('\r')?row.slice(0,-1):row;}); }
function cents(raw) { var s=raw, sign=1, last=s.slice(-1),pos='{ABCDEFGHI',neg='}JKLMNOPQR',p=pos.indexOf(last),n=neg.indexOf(last); if(p>=0) s=s.slice(0,-1)+p; else if(n>=0) {sign=-1;s=s.slice(0,-1)+n;} else if(last==='+' || last==='-') {sign=last==='-'?-1:1;s=s.slice(0,-1);} if(s[0]==='+' || s[0]==='-') { if(sign!==1) return null; sign=s[0]==='-'?-1:1;s=s.slice(1); } if(!/^\d+$/.test(s)) return null; var value=Number(s)*sign; return Number.isSafeInteger(value)?value:null; }
function add(a,b) { var n=a+b; if(!Number.isSafeInteger(n) || Math.abs(n)>99999999999) {overflow=true; return n;} return n; }
function money(c,total) { if(!Number.isSafeInteger(c) || Math.abs(c)>99999999999) {overflow=true;return ' '.repeat(15);} var x=Math.abs(c),integer=Math.floor(x/100),digits=integer===0?'':String(integer),groups=digits.replace(/\B(?=(\d{3})+(?!\d))/g,','); var frac=String(x%100).padStart(2,'0'); return (c<0?'-':total?'+':' ') + groups.padStart(11,' ') + '.' + frac; }
var report=null;
if(!fatal) {
 var xrefs=Object.create(null),types=Object.create(null),categories=Object.create(null);
 function load(file,min,kind) { var rows=records(bag[file]); for(var i=0;i<rows.length;i++) {var row=rows[i]; if(row.length<min) {flag(file+'.dat',i+1,'Record does not contain all lookup fields');continue;} var key,val,map; if(kind==='xref') {key=row.slice(0,16);val=rtrim(row.slice(25,36));map=xrefs;} else if(kind==='type') {key=row.slice(0,2);val=rtrim(row.slice(2,52));map=types;} else {key=row.slice(0,2)+'|'+row.slice(2,6);val=rtrim(row.slice(6,56));map=categories; if(!/^\d{4}$/.test(row.slice(2,6))) {flag(file+'.dat',i+1,'Unreadable category lookup code');continue;}} if(key.replace(/[ |]/g,'')==='') {flag(file+'.dat',i+1,'Empty lookup key');continue;} if(Object.prototype.hasOwnProperty.call(map,key)) {flag(file+'.dat',i+1,'Duplicate lookup key; first row retained');continue;} map[key]=val; }}
 load('cardxref',36,'xref');load('trantype',52,'type');load('trancatg',56,'category');
 var tx=[],rows=records(bag.transact);
 for(var ri=0;ri<rows.length;ri++) { var r=rows[ri],id=rtrim(r.slice(0,16)); if(r.length<330) {flag('transact.dat',ri+1,'Record does not contain required transaction fields',id);continue;} var date=r.slice(304,314); if(!validDate(date)) {flag('transact.dat',ri+1,'Unreadable processing date',id);continue;} if(date<start || date>end) continue; var type=r.slice(16,18),cat=r.slice(18,22); if(type==='01' && cat==='0005') continue; var card=r.slice(262,278),amt=cents(r.slice(132,143)); if(!id || !rtrim(card) || !/^\d{4}$/.test(cat) || amt===null) {flag('transact.dat',ri+1,'Unreadable required identifier, card, category or amount',id);continue;} var account=xrefs[card],td=types[type],cd=categories[type+'|'+cat]; if(account===undefined || account==='') {flag('transact.dat',ri+1,'Missing card/account reference',id);account='';} if(td===undefined) {flag('transact.dat',ri+1,'Missing transaction type description',id);td='';} if(cd===undefined) {flag('transact.dat',ri+1,'Missing transaction category description',id);cd='';} tx.push({id:id,card:card,type:type,cat:cat,source:rtrim(r.slice(22,32)),amount:amt,account:account,typeDescription:td,categoryDescription:cd,index:ri}); }
 tx.sort(function(a,b){return a.card<b.card?-1:a.card>b.card?1:a.index-b.index;});
 var lines=[],rule='-'.repeat(133),pageCount=0,pageTotal=0,cardTotal=0,grandTotal=0;
 function header() {lines.push(line(text('DALYREPT',38)+text('Daily Transaction Report',41)+text('Date Range:',12)+start+' to '+end));lines.push(' '.repeat(133));lines.push(line(text('Transaction ID',17)+text('Account ID',12)+text('Transaction Type',19)+text('Tran Category',35)+text('Tran Source',14)+' '+text('Amount',16)));lines.push(rule);}
 function total(label,width,value) {lines.push(line(text(label,width)+'.'.repeat(97-width)+money(value,true)));}
 header();
 for(var ti=0;ti<tx.length;ti++) { var t=tx[ti]; if(pageCount===50) {header();pageCount=0;pageTotal=0;} lines.push(line(text(t.id,16)+' '+text(t.account,11)+' '+text(t.type,2)+'-'+text(t.typeDescription,15)+' '+t.cat+'-'+text(t.categoryDescription,29)+' '+text(t.source,10)+'    '+money(t.amount,false)+'  ')); pageCount++;pageTotal=add(pageTotal,t.amount);cardTotal=add(cardTotal,t.amount);grandTotal=add(grandTotal,t.amount); var cardEnds=ti===tx.length-1 || tx[ti+1].card!==t.card; if(cardEnds) {total('Account Total',13,cardTotal);lines.push(rule);cardTotal=0;} if(pageCount===50 || ti===tx.length-1) {total('Page Total',11,pageTotal);lines.push(rule);} }
 if(tx.length===0) {total('Page Total',11,0);lines.push(rule);}
 total('Grand Total',11,grandTotal);
 if(overflow) {flag('tranrept_report.txt',0,'An amount or total exceeds the report picture or safe integer arithmetic; no report returned');report=null;} else report=lines.join('\n');
}
output = {result:{tranrept_report:report,assumptions_md:markdown,assumptions:assumptions,status:fatal?'FAILED':errors.length?'INCOMPLETE':'OK',errors:errors}};

```

_(server: 188 ms, 1 API call, 184 ms in API)_
