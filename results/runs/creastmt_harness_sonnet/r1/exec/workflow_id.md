# Workflow: GenerateCardStatements

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** 

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6adf779816836599f3947885 | <uuid> | (0, 0) | → Transform (seq:<uuid>) |
| End | END | 6adf779816836599f3947886 | <uuid> | (1200, 0) | — |
| Transform | SCRIPT | 6adf779816836599f3947887 | <uuid> | (300, 0) | → DraftAssumptions (seq:<uuid>) | lang: JAVASCRIPT |
| DraftAssumptions | AI | 6adf779816836599f3947888 | <uuid> | (600, 0) | → FinalizeOutputs [SUCCESS] (seq:<uuid>), → DraftAssumptions failed [FAIL] (seq:<uuid>) | responseKey: assumptionsDraft, aiType: TEXT_UNDERSTANDING, responseSchema: set |
| FinalizeOutputs | SCRIPT | 6adf779816836599f3947889 | <uuid> | (900, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| DraftAssumptions failed | SCRIPT | 6adf779816836599f394788a | <uuid> | (600, 200) | → FinalizeOutputs (seq:<uuid>) | lang: JAVASCRIPT |

## Systems
_(none)_

## AI prompts

### DraftAssumptions (TEXT_UNDERSTANDING, id=6adf779816836599f3947888)
instructions:

```
Organize the provided implementation decision ledger into the required structured entries. Copy every decision, whatYouAssumed and wikiStatementOrAbsence string exactly, once per decision. Do not add, omit or alter any entry, invent citations, choose new behaviour or use general knowledge. You receive only the ledger, never customer or transaction records.
```
userMessage:

```
Return all ledger entries, unchanged: ${assumptionLedger}
```
exampleOutputJsonSchema:

```
{"title":"Response","type":"object","required":["entries"],"properties":{"entries":{"type":"array","items":{"type":"object","required":["decision","whatYouAssumed","wikiStatementOrAbsence"],"properties":{"decision":{"type":"string"},"whatYouAssumed":{"type":"string"},"wikiStatementOrAbsence":{"type":"string"}},"additionalProperties":false}}},"additionalProperties":false}
```

## Scripts

### Transform (SCRIPT, id=6adf779816836599f3947887)

```javascript
var ledger=[];
function assume(decision,what,basis){ledger.push({decision:decision,whatYouAssumed:what,wikiStatementOrAbsence:basis});}
assume('Input record offsets','Fields occupy consecutive DISPLAY character positions in the wiki table order; account monetary fields occupy 12 characters and transaction amount 11, with no separate sign position; trailing record filler is ignored. Offsets are inferred, not verified copybooks.','creastmt-sonnet.pdf pp.6–9 list field pictures and widths; pp.25–26 name the copybooks but omit their complete definitions.');
assume('Signed numeric encoding','Accept numeric DISPLAY digits with implied two decimal places and ASCII overpunch {ABCDEFGHI for positive and }JKLMNOPQR for negative final digits. Also accept an explicit decimal point or a leading/trailing sign inside the declared width. Reject nonnumeric encodings.','creastmt-sonnet.pdf pp.6,8 specify signed monetary pictures but omit their physical input encoding.');
assume('Record delimiters','Accept LF or CRLF, ignore a single final line delimiter, require exact nonempty record widths, and treat an empty file as zero records.','creastmt-sonnet.pdf p.26 says fixed-width text, one record per line; newline conventions are unstated.');
assume('Card selection','Generate one statement per cross-reference card in lexical card-number order, matching transactions to that card alone and ordering them by transaction ID. Do not pool other cards of the same account or filter by dates.','creastmt-sonnet.pdf p.2 BR-01: CardXref order (card number); BR-02: card number + transaction id; p.3: legacy prints all transactions on file, cycle filter remains TODO.');
assume('Customer name','Trim each first, middle and last name, omit blank parts, and join the remaining parts with one space.','creastmt-sonnet.pdf p.7 lists firstName, middleName and lastName; pp.13,21 require customer name but do not define concatenation.');
assume('Customer address','Use trimmed customer address lines 1 and 2 directly; construct printed line 3 by joining nonblank addressLine3, state and ZIP with single spaces; do not print country.','creastmt-sonnet.pdf p.7 lists address fields; p.21 says address (3 lines, state, zip), without an assembly rule.');
assume('Account and FICO display','Preserve the zero-padded account identifier from the xref as text. Preserve a three-digit FICO score; a wholly blank FICO prints blank. Reject other FICO encodings.','creastmt-sonnet.pdf pp.6–8 give numeric identifiers and optional FICO; p.27 specifies account ID and FICO X(20) without conversion rules.');
assume('Printed field truncation','Truncate ordinary text fields on the right to the contract width and pad on the right with spaces; never truncate numeric output.','creastmt-sonnet.pdf p.27 gives X(n) and numeric pictures, but no overflow policy.');
assume('HTML field safety','Escape ampersand, less-than, greater-than, double quote and apostrophe in inserted HTML text. Fit insertions within 100 columns without splitting an entity, preserving literal tag suffixes; truncate only the inserted field when necessary.','creastmt-sonnet.pdf pp.27–29 specify literal HTML and 100-column lines but omit escaping and escaped-field overflow rules.');
assume('Duplicate records','Reject duplicate account IDs, customer IDs, xref card numbers or transaction IDs instead of choosing one record.','creastmt-sonnet.pdf pp.6–8 declare primary keys but do not specify duplicate input handling.');
assume('Missing references','Fail the whole batch if an xref has no matching account or customer; ignore transactions belonging to no listed xref because statements are xref-driven.','creastmt-sonnet.pdf pp.2,13 describe xref-driven joins, without missing-reference behaviour.');
assume('Monetary arithmetic','Decode and sum safe integer cents, preserve signs, print zero without a negative sign, and fail on values exceeding nine integer output digits or safe integer arithmetic.','creastmt-sonnet.pdf p.2 BR-03 defines sum of amounts; p.27 defines numeric pictures but not overflow handling.');
assume('No extra printed sections','Use only contract lines: no phone, credit limit, statement date, PDF, SSN or HTML total row, although the plugin sketch mentions additional content.','creastmt-sonnet.pdf p.21 is a broad content sketch; pp.26–29 define the required printed output and omit these lines.');
assume('Batch failure and empty inputs','Missing files, malformed records, broken joins and numeric overflow fail the batch without partial statements; present empty xrefs produce a successful empty statement set.','creastmt-sonnet.pdf p.23 says a failing step stops the chain; no statement-specific invalid-input or empty-xref policy is given.');
assume('Output packaging','Return ordered line lists under creastmt_statements and creastmt_statements_html with a companion assumptions.md string and structured assumptions entries; do not write host-directory files.','creastmt-sonnet.pdf p.26 explicitly permits returned line lists under file names without extensions and names optional assumptions.md.');
assume('Assumptions drafting validation','A model organizes only this ledger, never customer data; exact entry coverage and exact assumption/source preservation are checked before rendering Markdown. Draft failure or alteration fails the batch without partial statement outputs.','The request requires every assumption and its wiki basis; the wiki is silent about how the companion document is authored or validated.');
var batch={status:'FAILED',error:'',creastmt_statements:[],creastmt_statements_html:[]};
function pad(s,n){s=String(s);if(s.length>n){s=s.slice(0,n);}return s+' '.repeat(n-s.length);}
function text(s){return String(s).trim();}
function records(files,name,width){if(!Object.prototype.hasOwnProperty.call(files,name)||typeof files[name]!=='string'){throw new Error('Missing text input: '+name);}var raw=files[name];if(raw===''){return [];}var rows=raw.replace(/\r\n/g,'\n').split('\n');if(rows[rows.length-1]===''){rows.pop();}return rows.map(function(row,i){if(row.length!==width){throw new Error(name+' record '+(i+1)+' must have '+width+' characters');}return row;});}
function numberId(s,label){if(!/^\d+$/.test(s)){throw new Error('Invalid '+label);}return s;}
function cents(s){var t=s.trim(),negative=false;var p='{ABCDEFGHI',m='}JKLMNOPQR';if(t===''){throw new Error('Blank amount');}var last=t.slice(-1),pos=p.indexOf(last),neg=m.indexOf(last);if(pos>=0){t=t.slice(0,-1)+String(pos);}else if(neg>=0){negative=true;t=t.slice(0,-1)+String(neg);}if(t.charAt(0)==='-'||t.charAt(0)==='+'){negative=t.charAt(0)==='-'||negative;t=t.slice(1);}if(t.slice(-1)==='-'||t.slice(-1)==='+'){negative=t.slice(-1)==='-'||negative;t=t.slice(0,-1);}var value;if(/^\d+$/.test(t)){value=Number(t);}else if(/^\d+\.\d{1,2}$/.test(t)){var a=t.split('.');value=Number(a[0])*100+Number(pad(a[1],2).replace(/ /g,'0'));}else{throw new Error('Invalid amount');}if(!Number.isSafeInteger(value)){throw new Error('Unsafe monetary value');}return negative&&value!==0?-value:value;}
function money(v,suppress){if(!Number.isSafeInteger(v)||Math.abs(v)>99999999999){throw new Error('Amount exceeds printed picture');}var n=Math.abs(v),integer=String(Math.floor(n/100)),frac=String(n%100).padStart(2,'0');return (suppress?integer.padStart(9,' '):integer.padStart(9,'0'))+'.'+frac+(v<0?'-':' ');}
function unique(map,key,value,label){if(Object.prototype.hasOwnProperty.call(map,key)){throw new Error('Duplicate '+label);}map[key]=value;}
function escaped(s,budget){var out='';for(var i=0;i<s.length;i++){var c=s.charAt(i),e=c==='&'?'&amp;':c==='<'?'&lt;':c==='>'?'&gt;':c==='"'?'&quot;':c==="'"?'&#39;':c;if(out.length+e.length>budget){break;}out+=e;}return out;}
function htmlField(pre,value,post){return pad(pre+escaped(String(value),100-pre.length-post.length)+post,100);}
try{
var files=(input&&input.files)||{},accounts=Object.create(null),customers=Object.create(null),xrefs=Object.create(null),transactions=Object.create(null),byCard=Object.create(null);
records(files,'acctdata.dat',300).forEach(function(r){var id=numberId(r.slice(0,11),'account ID');unique(accounts,id,{balance:cents(r.slice(12,24))},'account ID');});
records(files,'custdata.dat',500).forEach(function(r){var id=numberId(r.slice(0,9),'customer ID'),fico=r.slice(429,432);if(fico.trim()!==''&&!/^\d{3}$/.test(fico)){throw new Error('Invalid FICO');}unique(customers,id,{name:[r.slice(9,34),r.slice(34,59),r.slice(59,84)].map(text).filter(function(v){return v!=='';}).join(' '),a1:text(r.slice(84,134)),a2:text(r.slice(134,184)),a3:[r.slice(184,234),r.slice(234,236),r.slice(239,249)].map(text).filter(function(v){return v!=='';}).join(' '),fico:fico.trim()===''?'':fico},'customer ID');});
records(files,'cardxref.dat',50).forEach(function(r){var card=numberId(r.slice(0,16),'card number');unique(xrefs,card,{card:card,customer:numberId(r.slice(16,25),'xref customer'),account:numberId(r.slice(25,36),'xref account')},'xref card');});
records(files,'transact.dat',350).forEach(function(r){var id=r.slice(0,16),card=numberId(r.slice(262,278),'transaction card');if(id.trim()===''){throw new Error('Blank transaction ID');}var tr={id:id,description:r.slice(32,132),amount:cents(r.slice(132,143))};unique(transactions,id,tr,'transaction ID');if(!byCard[card]){byCard[card]=[];}byCard[card].push(tr);});
var lines=[],html=[];
Object.keys(xrefs).sort().forEach(function(card){var x=xrefs[card],a=accounts[x.account],c=customers[x.customer];if(!a||!c){throw new Error('Missing account or customer for card '+card);}var ts=(byCard[card]||[]).slice().sort(function(u,v){return u.id<v.id?-1:u.id>v.id?1:0;}),total=0;ts.forEach(function(t){total+=t.amount;if(!Number.isSafeInteger(total)){throw new Error('Unsafe total');}money(t.amount,true);});money(total,true);var bal=money(a.balance,false),account=pad(x.account,20),fico=pad(c.fico,20),rule='-'.repeat(80);
lines.push('*'.repeat(31)+'START OF STATEMENT'+'*'.repeat(31),pad(c.name,75)+' '.repeat(5),pad(c.a1,50)+' '.repeat(30),pad(c.a2,50)+' '.repeat(30),pad(c.a3,80),rule,pad(' '.repeat(33)+'Basic Details',80),rule,pad(pad('Account ID : ',20)+account,80),pad(pad('Current Balance : ',20)+bal,80),pad(pad('FICO Score : ',20)+fico,80),rule,pad(' '.repeat(30)+'TRANSACTION SUMMARY',80),rule,pad('Tran ID',16)+pad('Tran Details',51)+pad('Tran Amount',13),rule);
ts.forEach(function(t){lines.push(pad(t.id,16)+' '+pad(t.description,49)+'$'+money(t.amount,true));});lines.push(rule,pad('Total EXP:',10)+' '.repeat(56)+'$'+money(total,true),'*'.repeat(32)+'END OF STATEMENT'+'*'.repeat(32));
function h(s){html.push(pad(s,100));}function hf(pre,v,post){html.push(htmlField(pre,v,post));}
h('<!DOCTYPE html>');h('<html lang="en">');h('<head>');h('<meta charset="utf-8">');h('<title>HTML Table Layout</title>');h('</head>');h('<body style="margin:0px;">');h('<table align="center" frame="box" style="width:70%; font:12px Segoe UI,sans-serif;">');h('<tr>');h('<td colspan="3" style="padding:0px 5px;background-color:#1d1d96b3;">');hf('<h3>Statement for Account Number: ',account,'</h3>');h('</td>');h('</tr>');h('<tr>');h('<td colspan="3" style="padding:0px 5px;background-color:#FFAF33;">');h('<p style="font-size:16px">Bank of XYZ</p>');h('<p>410 Terry Ave N</p>');h('<p>Seattle WA 99999</p>');h('</td>');h('</tr>');h('<tr>');h('<td colspan="3" style="padding:0px 5px;background-color:#f2f2f2;">');hf('<p style="font-size:16px">',c.name,' </p>');hf('<p>',c.a1,' </p>');hf('<p>',c.a2,' </p>');hf('<p>',c.a3,' </p>');h('</td>');h('</tr>');h('<tr>');h('<td colspan="3" style="padding:0px 5px;background-color:#33FFD1; text-align:center;">');h('<p style="font-size:16px">Basic Details</p>');h('</td>');h('</tr>');h('<tr>');h('<td colspan="3" style="padding:0px 5px;background-color:#f2f2f2;">');hf('<p>Account ID : ',account,'</p>');hf('<p>Current Balance : ',bal,'</p>');hf('<p>FICO Score : ',fico,'</p>');h('</td>');h('</tr>');h('<tr>');h('<td colspan="3" style="padding:0px 5px;background-color:#33FFD1; text-align:center;">');h('<p style="font-size:16px">Transaction Summary</p>');h('</td>');h('</tr>');h('<tr>');h('<td style="width:25%; padding:0px 5px; background-color:#33FF5E; text-align:left;">');h('<p style="font-size:16px">Tran ID</p>');h('</td>');h('<td style="width:55%; padding:0px 5px; background-color:#33FF5E; text-align:left;">');h('<p style="font-size:16px">Tran Details</p>');h('</td>');h('<td style="width:20%; padding:0px 5px; background-color:#33FF5E; text-align:right;">');h('<p style="font-size:16px">Amount</p>');h('</td>');h('</tr>');
ts.forEach(function(t){h('<tr>');h('<td style="width:25%; padding:0px 5px; background-color:#f2f2f2; text-align:left;">');hf('<p>',pad(t.id,16),'</p>');h('</td>');h('<td style="width:55%; padding:0px 5px; background-color:#f2f2f2; text-align:left;">');hf('<p>',pad(t.description,49),'</p>');h('</td>');h('<td style="width:20%; padding:0px 5px; background-color:#f2f2f2; text-align:right;">');hf('<p>',money(t.amount,true),'</p>');h('</td>');h('</tr>');});h('<tr>');h('<td colspan="3" style="padding:0px 5px;background-color:#1d1d96b3;">');h('<h3>End of Statement</h3>');h('</td>');h('</tr>');h('</table>');h('</body>');h('</html>');
});
batch={status:'OK',error:'',creastmt_statements:lines,creastmt_statements_html:html};
}catch(e){batch.error=String(e.message||e);}
output={statementOutputs:batch,assumptionLedger:ledger};
```

### FinalizeOutputs (SCRIPT, id=6adf779816836599f3947889)

```javascript
var b=(input&&input.statementOutputs)||{status:'FAILED',error:'Missing statement result',creastmt_statements:[],creastmt_statements_html:[]};var ledger=(input&&input.assumptionLedger)||[];var draft=(input&&input.assumptionsDraft)||{};var entries=draft.entries;var ok=Array.isArray(entries)&&entries.length===ledger.length&&ledger.length>0;var seen=Object.create(null);if(ok){for(var i=0;i<entries.length;i++){var e=entries[i],match=null;if(!e||typeof e.decision!=='string'||seen[e.decision]){ok=false;break;}seen[e.decision]=true;for(var j=0;j<ledger.length;j++){if(ledger[j].decision===e.decision){match=ledger[j];break;}}if(!match||e.whatYouAssumed!==match.whatYouAssumed||e.wikiStatementOrAbsence!==match.wikiStatementOrAbsence||Object.keys(e).sort().join(',')!=='decision,whatYouAssumed,wikiStatementOrAbsence'){ok=false;break;}}}var good=b.status==='OK'&&ok;function cell(s){return String(s).replace(/\\/g,'\\\\').replace(/\|/g,'\\|').replace(/\r?\n/g,'<br>');}var md='';if(ok){md='| Decision | What you assumed | Which wiki statement (or absence of one) it rests on |\n| --- | --- | --- |\n'+ledger.map(function(e){return '| '+cell(e.decision)+' | '+cell(e.whatYouAssumed)+' | '+cell(e.wikiStatementOrAbsence)+' |';}).join('\n')+'\n';}output={result:{status:good?'OK':'FAILED',error:good?'':(b.error||'Assumptions drafting failed or changed the decision ledger'),creastmt_statements:good?b.creastmt_statements:[],creastmt_statements_html:good?b.creastmt_statements_html:[],assumptions:ok?ledger:ledger,'assumptions.md':md}};
```

### DraftAssumptions failed (SCRIPT, id=6adf779816836599f394788a)

```javascript
output = {"assumptionsDraft": {}};

```

_(server: 7099 ms, 1 API call, 7095 ms in API)_
