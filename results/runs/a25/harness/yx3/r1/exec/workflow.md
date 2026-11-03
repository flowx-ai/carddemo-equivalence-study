# Workflow: GenerateCardStatements

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** 

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae3d7b53695c563ea510822 | <uuid> | (0, 0) | → Build statements (seq:<uuid>) |
| End | END | 6ae3d7b53695c563ea510823 | <uuid> | (1200, 0) | — |
| Build statements | SCRIPT | 6ae3d7b53695c563ea510824 | <uuid> | (300, 0) | → Draft assumptions (seq:<uuid>) | lang: JAVASCRIPT |
| Draft assumptions | AI | 6ae3d7b53695c563ea510825 | <uuid> | (600, 0) | → Finalize outputs [SUCCESS] (seq:<uuid>), → Draft assumptions failed [FAIL] (seq:<uuid>) | responseKey: assumptionsDraft, aiType: TEXT_UNDERSTANDING, responseSchema: set |
| Finalize outputs | SCRIPT | 6ae3d7b53695c563ea510826 | <uuid> | (900, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| Draft assumptions failed | SCRIPT | 6ae3d7b53695c563ea510827 | <uuid> | (600, 200) | → Finalize outputs (seq:<uuid>) | lang: JAVASCRIPT |

## Systems
_(none)_

## AI prompts

### Draft assumptions (TEXT_UNDERSTANDING, id=6ae3d7b53695c563ea510825)
instructions:

```
Draft a concise explanation of the supplied implementation assumptions register for the companion assumptions.md document. The register is the sole evidence; do not invent assumptions, wiki statements, file layouts, citations or claims of oracle equivalence. Do not infer anything from general CardDemo knowledge. Copy every register entry into entries, preserving its id, whatAssumed and wikiBasis exactly, in the supplied order, with no omissions or additions. Keep what was assumed distinct from its source or the absence of a source. explanation may explain why these recorded decisions are disclosed but must not introduce a new decision or claim. You receive no customer records and must not ask for them. Never decide transaction selection, amounts, FICO bands, printing or error behaviour; those decisions are already in the register. Return only the structured object.
```
userMessage:

```
${assumptionsRegister}
```
exampleOutputJsonSchema:

```
{"title":"Response","type":"object","additionalProperties":false,"required":["explanation","entries"],"properties":{"explanation":{"type":"string"},"entries":{"type":"array","items":{"type":"object","additionalProperties":false,"required":["id","whatAssumed","wikiBasis"],"properties":{"id":{"type":"string"},"whatAssumed":{"type":"string"},"wikiBasis":{"type":"string"}}}}}}
```

## Scripts

### Build statements (SCRIPT, id=6ae3d7b53695c563ea510824)

```javascript
var errors = [];
var textLines = [];
var htmlLines = [];
var assumptionsRegister = [];
function assumption(id, whatAssumed, wikiBasis) { assumptionsRegister.push({id:id, whatAssumed:whatAssumed, wikiBasis:wikiBasis}); }
assumption('scope', 'Implement statement generation only; receive four file contents as text and return ordered statement line lists plus companion assumptions content, not physical storage writes.', 'creastmt-sonnet-yx3.pdf p.26, CONTRACT.md supplement: "Instead of a file, a run may return the same lines as one string ... or as a list of strings". The maker requested this step only.');
assumption('cardSelection', 'One statement per distinct cross-reference card; first physical cross-reference wins duplicates. Sort cards lexicographically by the preserved card-number string.', 'creastmt-sonnet-yx3.pdf p.2 BR-01: "Statement driven by CardXref order (card number)"; p.4: "One statement per card". Maker confirmed separate statements. Duplicate handling is unstated.');
assumption('transactionSelection', 'Select transactions by the individual cross-reference card, not by all cards of its account. Sort transaction IDs lexicographically and retain physical order for equal IDs. Use the first physical transaction for a repeated card-number/transaction-ID key.', 'creastmt-sonnet-yx3.pdf p.2 BR-02: "Transactions are keyed by card number + transaction id"; p.21 says "per card of the account". Maker confirmed individual-card statements. Duplicate handling is unstated.');
assumption('period', 'Use all supplied transactions; apply neither a statement-cycle date filter nor an active-account filter.', 'creastmt-sonnet-yx3.pdf p.3: "legacy prints all transactions on file; confirm cycle filter requirement". No active-status filter is specified for statements.');
assumption('offsets', 'Infer consecutive field offsets from the wiki copybook field order and widths: xref card 0:16, customer 16:25, account 25:36; account ID 0:11 and current balance 12:24; customer first/middle/last 9:34/34:59/59:84, addresses 84:134/134:184/184:234, state 234:236, country 236:239, ZIP 239:249, FICO 329:332; transaction ID 0:16, description 32:132, amount 132:143, card 262:278. Offsets are zero-based, end-exclusive, and are inferred rather than verified against original copybooks.', 'creastmt-sonnet-yx3.pdf pp.6-9 lists the field pictures and order; pp.25-26 names the copybooks but does not reproduce their full layouts.');
assumption('identifiers', 'Keep card, customer, account and transaction identifiers as strings, preserving leading zeroes; trim surrounding field padding only. Account IDs print as these strings in X(20).', 'creastmt-sonnet-yx3.pdf pp.6-9 defines digit identifiers as strings; p.27 requires account ID X(20). Numeric-versus-text presentation beyond that is unstated.');
assumption('lookupDuplicates', 'For repeated account or customer keys use the first physical input record. No new uniqueness rejection is imposed.', 'creastmt-sonnet-yx3.pdf pp.6-8 names primary keys but does not define how duplicate sequential input records are resolved.');
assumption('inputText', 'Treat file contents as decoded fixed-width single-byte text, accept LF or CRLF record separators, discard only the terminal line separator, and do not validate unused filler or fields the statement does not read. An empty string is an empty file; an absent or non-text file input is an error.', 'creastmt-sonnet-yx3.pdf p.26: "Fixed-width text, one record per line"; encoding and newline conventions are not specified. The wiki drops filler, e.g. p.6.');
assumption('money', 'Decode unsigned digits or a final signed-overpunch digit as implied-decimal cents. Positive overpunch uses {ABCDEFGHI; negative uses }JKLMNOPQR. Retain sign and sum in safe integer cents; never use binary floating-point dollar arithmetic. A value outside exact integer-cent range is an affected-record error.', 'creastmt-sonnet-yx3.pdf pp.6,8 supplies S9(... )V99 pictures; p.9 explicitly mentions signed overpunch for another file. The statement input encoding and precision implementation are not otherwise specified.');
assumption('customerName', 'Join trimmed first, middle and last names in that order using one space between nonblank parts, then fit to 75 characters.', 'creastmt-sonnet-yx3.pdf p.7 lists the three name fields; p.27 gives customer name X(75); joining is unstated. Maker confirmed single-space joining.');
assumption('address', 'Keep address lines 1 and 2 as separate 50-character fields. Join trimmed address line 3, state and ZIP with single spaces between nonblank parts into the 80-character final address. Do not append country.', 'creastmt-sonnet-yx3.pdf p.21: "address (3 lines, state, zip)"; p.27 sets widths. Exact assembly is unstated. Maker confirmed this arrangement without country.');
assumption('ficoMissing', 'An absent or all-space FICO prints blank. A present score is parsed as digits and classified without imposing an additional 300-850 rejection; present 000 is Poor. A nonnumeric present score is an affected-card error.', 'creastmt-sonnet-yx3.pdf p.7 calls FICO optional; pp.2,13 specify bands including below 580 and 800 and above. Missing-score presentation and malformed-score handling are unstated.');
assumption('formatting', 'Fit text left-aligned with spaces; fit complete printed text/HTML lines to 80/100 characters by right-padding or truncation, without wrapping. Use the exact contract literal HTML lines without extra indentation or separators.', 'creastmt-sonnet-yx3.pdf pp.26-28 fixes line lengths, X(n), and literal HTML; truncation, wrapping and indentation beyond those printed lines are unstated.');
assumption('numericPictures', 'For 9(9).99- use nine leading-zero integer digits, two decimals and a trailing minus or space. For Z(9).99- suppress integer leading zeroes, including all zero integer digits for zero. Amounts that exceed the printed picture use thirteen asterisks, without changing the exact stored sum.', 'creastmt-sonnet-yx3.pdf p.27 defines the pictures and trailing sign. Overflow representation and zero suppression details beyond the notation are not explicitly stated.');
assumption('htmlSubstitution', 'Insert field text literally into the contract HTML, using the same fitted customer/address values as text. Do not add HTML escaping or alter the specified literal blocks.', 'creastmt-sonnet-yx3.pdf pp.27-28 specifies fixed lines with fields inserted and says values come from wiki behaviour; escaping is not specified.');
assumption('layoutScope', 'Print no statement date, phone, credit limit, cycle credit/debit or SSN because the contract has no slots for them; add no HTML total row and no PDF. The text total uses every selected transaction amount, including negative amounts.', 'creastmt-sonnet-yx3.pdf p.21 lists broader plugin content but explicitly says SSN is not printed; pp.27-29 supplies the step output layout with only a text total and no HTML total. p.4 says PDF is not available in legacy.');
assumption('orphanTransactions', 'Transactions whose card is absent from the cross-reference input do not create statements. Parse used amounts only for selected cards; malformed unused transaction fields do not reject a card.', 'creastmt-sonnet-yx3.pdf p.2 drives statements from CardXref; behaviour for orphan transactions and validation of unread fields is not otherwise specified.');
assumption('errors', 'On a missing required account/customer, an unreadable used field or an unsafe sum, omit that affected card statement, keep processing other cards, report file/record/card/message, and mark the batch FAILED. Both formats are appended only after that card is fully assembled. Do not silently report success.', 'creastmt-sonnet-yx3.pdf p.23: "A failing step stops the chain"; per-card data failure handling is absent. Maker confirmed continuing valid cards while marking the batch unsuccessful.');
assumption('drafting', 'Draft explanatory wording only from this decision register, without customer data; keep the complete structured register and Markdown table unchanged. If drafting fails or changes register entries, discard its explanation and return the register alone.', 'The maker requires every assumption and its wiki basis alongside the outputs. The wiki defines no assumptions-document authoring or failure policy; this is an implementation choice.');
function fit(value, width) { return (String(value == null ? '' : value) + ' '.repeat(width)).slice(0,width); }
function clean(value) { return String(value == null ? '' : value).trim(); }
function problem(file, record, card, message) { errors.push({file:file, record:record, cardNumber:card || '', message:message}); }
function rows(value, file) {
  if (typeof value !== 'string') { problem(file,0,'','Required file content is absent or is not text'); return []; }
  if (value === '') return [];
  var a = value.split('\n');
  if (a[a.length-1] === '') a.pop();
  return a.map(function(s,i) { return {s:s.endsWith('\r') ? s.slice(0,-1) : s, n:i+1}; });
}
function cents(field) {
  var s = String(field), sign = 1;
  if (!s.length) throw new Error('Missing amount');
  var last=s.slice(-1), pos='{ABCDEFGHI', neg='}JKLMNOPQR';
  if (pos.indexOf(last)>=0) s=s.slice(0,-1)+String(pos.indexOf(last));
  else if (neg.indexOf(last)>=0) { sign=-1; s=s.slice(0,-1)+String(neg.indexOf(last)); }
  if (!/^[0-9]+$/.test(s)) throw new Error('Amount is not signed-display numeric data');
  var n=Number(s)*sign;
  if (!Number.isSafeInteger(n)) throw new Error('Amount exceeds exact integer-cent range');
  return n;
}
function picture(n, suppressed) {
  var magnitude=Math.abs(n), whole=Math.floor(magnitude/100), fraction=String(magnitude%100).padStart(2,'0');
  if (whole>999999999) return '*'.repeat(13);
  var digits=String(whole).padStart(9,'0');
  if (suppressed) digits=digits.replace(/^0+/,function(z){return ' '.repeat(z.length);});
  return digits+'.'+fraction+(n<0 ? '-' : ' ');
}
function fico(field) {
  var s=clean(field);
  if (s==='') return '';
  if (!/^[0-9]+$/.test(s)) throw new Error('FICO score is not numeric');
  var n=Number(s);
  return n<580 ? 'Poor' : n<670 ? 'Fair' : n<740 ? 'Good' : n<800 ? 'Very Good' : 'Exceptional';
}
var accounts=Object.create(null), customers=Object.create(null), cards=Object.create(null), transactions=Object.create(null);
rows(input.acctdata,'acctdata.dat').forEach(function(r){var key=clean(r.s.slice(0,11)); if (!key) problem('acctdata.dat',r.n,'','Missing account key'); else if (!Object.prototype.hasOwnProperty.call(accounts,key)) accounts[key]=r;});
rows(input.custdata,'custdata.dat').forEach(function(r){var key=clean(r.s.slice(0,9)); if (!key) problem('custdata.dat',r.n,'','Missing customer key'); else if (!Object.prototype.hasOwnProperty.call(customers,key)) customers[key]=r;});
rows(input.cardxref,'cardxref.dat').forEach(function(r){var key=clean(r.s.slice(0,16)); if (r.s.length<36 || !key) problem('cardxref.dat',r.n,key,'Cross-reference lacks required keys'); else if (!Object.prototype.hasOwnProperty.call(cards,key)) cards[key]=r;});
rows(input.transact,'transact.dat').forEach(function(r){
  if(r.s.length<278) { problem('transact.dat',r.n,'','Transaction lacks its card-number field'); return; }
  var card=clean(r.s.slice(262,278));
  if (!transactions[card]) transactions[card]=[];
  transactions[card].push(r);
});
Object.keys(cards).sort().forEach(function(card){
  var x=cards[card], accountId=clean(x.s.slice(25,36)), customerId=clean(x.s.slice(16,25));
  var a=accounts[accountId], c=customers[customerId];
  if(!a) { problem('cardxref.dat',x.n,card,'Account '+accountId+' was not found'); return; }
  if(!c) { problem('cardxref.dat',x.n,card,'Customer '+customerId+' was not found'); return; }
  if(a.s.length<24) { problem('acctdata.dat',a.n,card,'Account current balance is incomplete'); return; }
  if(c.s.length<249) { problem('custdata.dat',c.n,card,'Customer heading fields are incomplete'); return; }
  var balance,band;
  try { balance=cents(a.s.slice(12,24)); } catch(e) { problem('acctdata.dat',a.n,card,String(e.message)); return; }
  try { band=fico(c.s.slice(329,332)); } catch(e) { problem('custdata.dat',c.n,card,String(e.message)); return; }
  var name=[c.s.slice(9,34),c.s.slice(34,59),c.s.slice(59,84)].map(clean).filter(function(v){return v!=='';}).join(' ');
  var address1=fit(clean(c.s.slice(84,134)),50), address2=fit(clean(c.s.slice(134,184)),50);
  var address3=fit([c.s.slice(184,234),c.s.slice(234,236),c.s.slice(239,249)].map(clean).filter(function(v){return v!=='';}).join(' '),80);
  name=fit(name,75);
  var source=(transactions[card] || []).slice().sort(function(l,r){var li=l.s.slice(0,16),ri=r.s.slice(0,16); return li<ri?-1:li>ri?1:l.n-r.n;});
  var seen=Object.create(null), lines=[], total=0, bad=false;
  source.forEach(function(r){
    var id=r.s.slice(0,16);
    if(Object.prototype.hasOwnProperty.call(seen,id)) return;
    seen[id]=true;
    if(!clean(id)) { problem('transact.dat',r.n,card,'Missing transaction ID'); bad=true; return; }
    try {
      var amount=cents(r.s.slice(132,143));
      var sum=total+amount;
      if(!Number.isSafeInteger(sum)) throw new Error('Total exceeds exact integer-cent range');
      total=sum;
      lines.push({id:fit(id,16),details:fit(r.s.slice(32,132),49),amount:amount});
    } catch(e) { problem('transact.dat',r.n,card,String(e.message)); bad=true; }
  });
  if(bad) return;
  var t=[];
  function tline(s){t.push(fit(s,80));}
  tline('*'.repeat(31)+'START OF STATEMENT'+'*'.repeat(31));
  tline(name); tline(address1); tline(address2); tline(address3);
  tline('-'.repeat(80)); tline(' '.repeat(33)+'Basic Details'); tline('-'.repeat(80));
  tline(fit('Account ID :',20)+fit(accountId,20));
  tline(fit('Current Balance :',20)+picture(balance,false));
  tline(fit('FICO Score :',20)+fit(band,20));
  tline('-'.repeat(80)); tline(' '.repeat(30)+'TRANSACTION SUMMARY'); tline('-'.repeat(80));
  tline(fit('Tran ID',16)+fit('Tran Details',51)+'Tran Amount'); tline('-'.repeat(80));
  lines.forEach(function(l){tline(l.id+' '+l.details+'$'+picture(l.amount,true));});
  tline('-'.repeat(80)); tline(fit('Total EXP:',10)+' '.repeat(56)+'$'+picture(total,true));
  tline('*'.repeat(32)+'END OF STATEMENT'+'*'.repeat(32));
  var h=[];
  function hline(s){h.push(fit(s,100));}
  [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<title>HTML Table Layout</title>',
    '</head>',
    '<body style="margin:0px;">',
    '<table align="center" frame="box" style="width:70%; font:12px Segoe UI,sans-serif;">',
    '<tr>',
    '<td colspan="3" style="padding:0px 5px;background-color:#1d1d96b3;">',
    '<h3>Statement for Account Number: '+fit(accountId,20)+'</h3>',
    '</td>', '</tr>', '<tr>',
    '<td colspan="3" style="padding:0px 5px;background-color:#FFAF33;">',
    '<p style="font-size:16px">Bank of XYZ</p>',
    '<p>410 Terry Ave N</p>', '<p>Seattle WA 99999</p>',
    '</td>', '</tr>', '<tr>',
    '<td colspan="3" style="padding:0px 5px;background-color:#f2f2f2;">',
    '<p style="font-size:16px">'+name+' </p>',
    '<p>'+address1+' </p>', '<p>'+address2+' </p>', '<p>'+address3+' </p>',
    '</td>', '</tr>', '<tr>',
    '<td colspan="3" style="padding:0px 5px;background-color:#33FFD1; text-align:center;">',
    '<p style="font-size:16px">Basic Details</p>',
    '</td>', '</tr>', '<tr>',
    '<td colspan="3" style="padding:0px 5px;background-color:#f2f2f2;">',
    '<p>Account ID : '+fit(accountId,20)+'</p>',
    '<p>Current Balance : '+picture(balance,false)+'</p>',
    '<p>FICO Score : '+fit(band,20)+'</p>',
    '</td>', '</tr>', '<tr>',
    '<td colspan="3" style="padding:0px 5px;background-color:#33FFD1; text-align:center;">',
    '<p style="font-size:16px">Transaction Summary</p>',
    '</td>', '</tr>', '<tr>',
    '<td style="width:25%; padding:0px 5px; background-color:#33FF5E; text-align:left;">',
    '<p style="font-size:16px">Tran ID</p>', '</td>',
    '<td style="width:55%; padding:0px 5px; background-color:#33FF5E; text-align:left;">',
    '<p style="font-size:16px">Tran Details</p>', '</td>',
    '<td style="width:20%; padding:0px 5px; background-color:#33FF5E; text-align:right;">',
    '<p style="font-size:16px">Amount</p>', '</td>', '</tr>'
  ].forEach(hline);
  lines.forEach(function(l){
    ['<tr>',
     '<td style="width:25%; padding:0px 5px; background-color:#f2f2f2; text-align:left;">',
     '<p>'+l.id+'</p>', '</td>',
     '<td style="width:55%; padding:0px 5px; background-color:#f2f2f2; text-align:left;">',
     '<p>'+l.details+'</p>', '</td>',
     '<td style="width:20%; padding:0px 5px; background-color:#f2f2f2; text-align:right;">',
     '<p>'+picture(l.amount,true)+'</p>', '</td>', '</tr>'].forEach(hline);
  });
  ['<tr>', '<td colspan="3" style="padding:0px 5px;background-color:#1d1d96b3;">',
   '<h3>End of Statement</h3>', '</td>', '</tr>', '</table>', '</body>', '</html>'].forEach(hline);
  Array.prototype.push.apply(textLines,t);
  Array.prototype.push.apply(htmlLines,h);
});
output={statementResult:{creastmt_statements:textLines,creastmt_statements_html:htmlLines,status:errors.length?'FAILED':'OK',errors:errors},assumptionsRegister:assumptionsRegister};
```

### Finalize outputs (SCRIPT, id=6ae3d7b53695c563ea510826)

```javascript
var base=input.statementResult || {creastmt_statements:[],creastmt_statements_html:[],status:'FAILED',errors:[]};
var register=Array.isArray(input.assumptionsRegister)?input.assumptionsRegister:[];
var draft=input.assumptionsDraft || {};
var valid=Array.isArray(draft.entries) && draft.entries.length===register.length && register.length>0;
if(valid) {
  for(var i=0;i<register.length;i++) {
    var a=register[i], b=draft.entries[i];
    if(!b || b.id!==a.id || b.whatAssumed!==a.whatAssumed || b.wikiBasis!==a.wikiBasis) {valid=false;break;}
  }
}
function cell(s){return String(s==null?'':s).replace(/\|/g,'\\|').replace(/\r?\n/g,'<br>');}
var md=['# Statement-generation assumptions',''];
if(valid && typeof draft.explanation==='string' && draft.explanation.trim()!=='') md.push(draft.explanation.trim(),'');
md.push('| What you assumed | Which wiki statement (or absence of one) it rests on |','| --- | --- |');
register.forEach(function(r){md.push('| '+cell(r.whatAssumed)+' | '+cell(r.wikiBasis)+' |');});
md.push('');
output={result:{creastmt_statements:base.creastmt_statements || [],creastmt_statements_html:base.creastmt_statements_html || [],assumptions_md:md.join('\n'),assumptions:register,status:base.status || 'FAILED',errors:base.errors || []}};
```

### Draft assumptions failed (SCRIPT, id=6ae3d7b53695c563ea510827)

```javascript
output = {"assumptionsDraft": {}};

```

_(server: 220 ms, 1 API call, 209 ms in API)_
