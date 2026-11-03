# Workflow: GenerateCardStatements

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** 

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae3e4643695c563ea510aa8 | <uuid> | (0, 0) | → Read input records (seq:<uuid>) |
| End | END | 6ae3e4643695c563ea510aa9 | <uuid> | (1200, 0) | — |
| Read input records | SCRIPT | 6ae3e4643695c563ea510aaa | <uuid> | (300, 0) | → Generate statements (seq:<uuid>) | lang: JAVASCRIPT |
| Generate statements | SCRIPT | 6ae3e4643695c563ea510aab | <uuid> | (600, 0) | → Escape text (seq:<uuid>) | lang: JAVASCRIPT |
| Escape text | SCRIPT | 6ae3e4653695c563ea510aac | <uuid> | (900, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |

## Systems
_(none)_

## Scripts

### Read input records (SCRIPT, id=6ae3e4643695c563ea510aaa)

```javascript
var bag = input || {};
var errors = [];
function readLines(key, fileName) {
  if (typeof bag[key] !== 'string') {
    errors.push({fileName:fileName,recordNumber:0,recordId:'',code:'MISSING_INPUT',message:'Required input file contents must be supplied as text.'});
    return [];
  }
  if (bag[key] === '') return [];
  var lines = bag[key].split('\n');
  if (lines[lines.length-1] === '') lines.pop();
  return lines.map(function(s) { return s.endsWith('\r') ? s.slice(0,-1) : s; });
}
var transactions = readLines('transact','transact.dat');
var accounts = readLines('acctdata','acctdata.dat');
var crossReferences = readLines('cardxref','cardxref.dat');
var customers = readLines('custdata','custdata.dat');
output = {statementInput:{transactions:transactions,accounts:accounts,crossReferences:crossReferences,customers:customers,errors:errors}};
```

### Generate statements (SCRIPT, id=6ae3e4643695c563ea510aab)

```javascript
var data = input.statementInput || {transactions:[],accounts:[],crossReferences:[],customers:[],errors:[]};
var errors = (data.errors || []).slice();
var text = [], html = [];
function trim(s) { return String(s).replace(/^ +| +$/g,''); }
function rightTrim(s) { return String(s).replace(/ +$/g,''); }
function field(s,n) { return String(s).slice(0,n).padEnd(n,' '); }
function fault(file,row,id,code,message) { errors.push({fileName:file,recordNumber:row,recordId:id,code:code,message:message}); }
function money(s) {
  var raw = trim(s), sign = 1;
  if (!raw) return null;
  var positive = '{ABCDEFGHI', negative = '}JKLMNOPQR';
  var last = raw.slice(-1), index = positive.indexOf(last);
  if (index >= 0) raw = raw.slice(0,-1) + String(index);
  else if ((index = negative.indexOf(last)) >= 0) { raw = raw.slice(0,-1) + String(index); sign = -1; }
  if (/^[+-]/.test(raw)) { if (raw.charAt(0) === '-') sign *= -1; raw = raw.slice(1); }
  if (!/^\d+$/.test(raw)) return null;
  var cents = Number(raw) * sign;
  return Number.isSafeInteger(cents) ? cents : null;
}
function displayMoney(cents,zeroFill) {
  var n = Math.abs(cents);
  if (!Number.isSafeInteger(cents) || n > 99999999999) return '*'.repeat(13);
  var whole = String(Math.floor(n/100));
  if (!zeroFill && Math.floor(n/100) === 0) whole = '';
  return whole.padStart(9,zeroFill ? '0' : ' ') + '.' + String(n%100).padStart(2,'0') + (cents < 0 ? '-' : ' ');
}
function fico(raw) {
  raw = trim(raw);
  if (!/^\d{1,3}$/.test(raw)) return '';
  var n = Number(raw);
  return n < 580 ? 'Poor' : n < 670 ? 'Fair' : n < 740 ? 'Good' : n < 800 ? 'Very Good' : 'Exceptional';
}
function indexed(rows,keyLength,fileName) {
  var map = Object.create(null);
  rows.forEach(function(raw,i) {
    var id = trim(raw.slice(0,keyLength));
    if (!id || raw.length < keyLength) {
      fault(fileName,i+1,id,'INVALID_KEY','Record has no complete lookup key.'); return;
    }
    if (Object.prototype.hasOwnProperty.call(map,id)) {
      fault(fileName,i+1,id,'DUPLICATE_KEY','Duplicate lookup key; this key cannot be used.'); map[id] = null;
    } else map[id] = {raw:raw,row:i+1};
  });
  return map;
}
var accounts = indexed(data.accounts || [],11,'acctdata.dat');
var customers = indexed(data.customers || [],9,'custdata.dat');
var xrefs = indexed(data.crossReferences || [],16,'cardxref.dat');
var grouped = Object.create(null), badCards = Object.create(null), seen = Object.create(null);
(data.transactions || []).forEach(function(raw,i) {
  if (raw.length < 278) {
    fault('transact.dat',i+1,'','SHORT_RECORD','Record does not contain the fields used by statement generation.'); return;
  }
  var card = trim(raw.slice(262,278));
  if (!card) { fault('transact.dat',i+1,'','INVALID_CARD','Transaction has no card number.'); return; }
  if (!Object.prototype.hasOwnProperty.call(xrefs,card)) return;
  var id = rightTrim(raw.slice(0,16)), amount = money(raw.slice(132,143));
  if (!trim(id) || amount === null) {
    fault('transact.dat',i+1,card,'INVALID_TRANSACTION','Transaction ID or amount cannot be processed.'); badCards[card] = true; return;
  }
  var composite = card + ':' + id;
  if (seen[composite]) {
    fault('transact.dat',i+1,card,'DUPLICATE_TRANSACTION','Duplicate card and transaction ID; the affected statement cannot be generated.'); badCards[card] = true; return;
  }
  seen[composite] = true;
  if (!grouped[card]) grouped[card] = [];
  grouped[card].push({id:id,description:rightTrim(raw.slice(32,132)),cents:amount});
});
function line80(s) { text.push(field(s,80)); }
function line100(s) { html.push(field(s,100)); }
Object.keys(xrefs).sort().forEach(function(card) {
  var x = xrefs[card];
  if (!x) return;
  if (x.raw.length < 36) {
    fault('cardxref.dat',x.row,card,'SHORT_RECORD','Cross-reference lacks customer or account fields.'); return;
  }
  var customerId = trim(x.raw.slice(16,25)), accountId = trim(x.raw.slice(25,36));
  var a = accounts[accountId], c = customers[customerId];
  var valid = true;
  if (!a) { fault('cardxref.dat',x.row,card,'ACCOUNT_NOT_FOUND','Account is missing or has an ambiguous lookup key.'); valid = false; }
  if (!c) { fault('cardxref.dat',x.row,card,'CUSTOMER_NOT_FOUND','Customer is missing or has an ambiguous lookup key.'); valid = false; }
  if (!valid || badCards[card]) return;
  if (a.raw.length < 24) { fault('acctdata.dat',a.row,accountId,'SHORT_RECORD','Account lacks its current-balance field.'); return; }
  if (c.raw.length < 332) { fault('custdata.dat',c.row,customerId,'SHORT_RECORD','Customer lacks fields used on the statement.'); return; }
  var balance = money(a.raw.slice(12,24));
  if (balance === null) { fault('acctdata.dat',a.row,accountId,'INVALID_BALANCE','Current balance cannot be processed.'); return; }
  var name = [trim(c.raw.slice(9,34)),trim(c.raw.slice(34,59)),trim(c.raw.slice(59,84))].filter(function(s){return s !== '';}).join(' ');
  var addr1 = rightTrim(c.raw.slice(84,134)), addr2 = rightTrim(c.raw.slice(134,184));
  var addr3 = [trim(c.raw.slice(184,234)),trim(c.raw.slice(234,236)),trim(c.raw.slice(239,249))].filter(function(s){return s !== '';}).join(' ');
  var band = fico(c.raw.slice(329,332));
  var transactions = (grouped[card] || []).slice().sort(function(p,q) { return p.id < q.id ? -1 : p.id > q.id ? 1 : 0; });
  var total = 0;
  transactions.forEach(function(t){ total += t.cents; });
  if (!Number.isSafeInteger(total)) { fault('cardxref.dat',x.row,card,'TOTAL_OVERFLOW','Transaction total exceeds exact integer-cent arithmetic.'); return; }
  line80('*'.repeat(31) + 'START OF STATEMENT' + '*'.repeat(31));
  line80(field(name,75)); line80(field(addr1,50)); line80(field(addr2,50)); line80(field(addr3,80));
  line80('-'.repeat(80)); line80(' '.repeat(33) + 'Basic Details'); line80('-'.repeat(80));
  line80(field('Account ID :',20) + field(accountId,20));
  line80(field('Current Balance :',20) + displayMoney(balance,true));
  line80(field('FICO Score :',20) + field(band,20));
  line80('-'.repeat(80)); line80(' '.repeat(30) + 'TRANSACTION SUMMARY'); line80('-'.repeat(80));
  line80(field('Tran ID',16) + field('Tran Details',51) + field('Tran Amount',13)); line80('-'.repeat(80));
  transactions.forEach(function(t) { line80(field(t.id,16) + ' ' + field(t.description,49) + '$' + displayMoney(t.cents,false)); });
  line80('-'.repeat(80));
  line80(field('Total EXP:',10) + ' '.repeat(56) + '$' + displayMoney(total,false));
  line80('*'.repeat(32) + 'END OF STATEMENT' + '*'.repeat(32));
  var header = ['<!DOCTYPE html>','<html lang="en">','<head>','<meta charset="utf-8">','<title>HTML Table Layout</title>','</head>','<body style="margin:0px;">','<table align="center" frame="box" style="width:70%; font:12px Segoe UI,sans-serif;">','<tr>','<td colspan="3" style="padding:0px 5px;background-color:#1d1d96b3;">','<h3>Statement for Account Number: ' + field(accountId,20) + '</h3>','</td>','</tr>','<tr>','<td colspan="3" style="padding:0px 5px;background-color:#FFAF33;">','<p style="font-size:16px">Bank of XYZ</p>','<p>410 Terry Ave N</p>','<p>Seattle WA 99999</p>','</td>','</tr>','<tr>','<td colspan="3" style="padding:0px 5px;background-color:#f2f2f2;">','<p style="font-size:16px">' + field(name,75).trimEnd() + ' </p>','<p>' + field(addr1,50).trimEnd() + ' </p>','<p>' + field(addr2,50).trimEnd() + ' </p>','<p>' + field(addr3,80).trimEnd() + ' </p>','</td>','</tr>','<tr>','<td colspan="3" style="padding:0px 5px;background-color:#33FFD1; text-align:center;">','<p style="font-size:16px">Basic Details</p>','</td>','</tr>','<tr>','<td colspan="3" style="padding:0px 5px;background-color:#f2f2f2;">','<p>Account ID : ' + field(accountId,20) + '</p>','<p>Current Balance : ' + displayMoney(balance,true) + '</p>','<p>FICO Score : ' + field(band,20) + '</p>','</td>','</tr>','<tr>','<td colspan="3" style="padding:0px 5px;background-color:#33FFD1; text-align:center;">','<p style="font-size:16px">Transaction Summary</p>','</td>','</tr>','<tr>','<td style="width:25%; padding:0px 5px; background-color:#33FF5E; text-align:left;">','<p style="font-size:16px">Tran ID</p>','</td>','<td style="width:55%; padding:0px 5px; background-color:#33FF5E; text-align:left;">','<p style="font-size:16px">Tran Details</p>','</td>','<td style="width:20%; padding:0px 5px; background-color:#33FF5E; text-align:right;">','<p style="font-size:16px">Amount</p>','</td>','</tr>'];
  header.forEach(line100);
  transactions.forEach(function(t) {
    ['<tr>','<td style="width:25%; padding:0px 5px; background-color:#f2f2f2; text-align:left;">','<p>' + field(t.id,16) + '</p>','</td>','<td style="width:55%; padding:0px 5px; background-color:#f2f2f2; text-align:left;">','<p>' + field(t.description,49) + '</p>','</td>','<td style="width:20%; padding:0px 5px; background-color:#f2f2f2; text-align:right;">','<p>' + displayMoney(t.cents,false) + '</p>','</td>','</tr>'].forEach(line100);
  });
  ['<tr>','<td colspan="3" style="padding:0px 5px;background-color:#1d1d96b3;">','<h3>End of Statement</h3>','</td>','</tr>','</table>','</body>','</html>'].forEach(line100);
});
var assumptions = '# Statement-generation assumptions\n\nSource: creastmt-sonnet-yx3.pdf. These are implementation-time choices, not conclusions generated from customer records. The two statement outputs and this document are returned together; no shared-storage publication is performed.\n\n' +
'1. Input and output transport. Supply transact.dat, acctdata.dat, cardxref.dat and custdata.dat contents as transact, acctdata, cardxref and custdata. Return creastmt_statements and creastmt_statements_html as newline-joined strings, and assumptions_md as this document. Basis: p.26 permits a returned string or list of lines instead of a statement file; the assumptions transport is unstated. An exporter may save these three returned contents under creastmt_statements.txt, creastmt_statements_html.txt and assumptions.md.\n\n' +
'2. Layout provenance. The complete CVACT01Y, CVACT03Y, CUSTREC and CVTRA05Y copybooks are not included. Positions are derived by concatenating the field order and COBOL widths shown on pp.6-9. The contract calls the customer layout CUSTREC (pp.25-26), whereas the model calls it CVCUS01Y (p.7); assume their consumed fields agree. This is an explicit inference, not verified copybook equivalence.\n\n' +
'3. Exact consumed positions, one-based inclusive: account ID 1-11 and balance 13-24; cross-reference card 1-16, customer 17-25, account 26-36; customer ID 1-9, first/middle/last names 10-34/35-59/60-84, address lines 85-134/135-184/185-234, state 235-236, ZIP 240-249, FICO 330-332; transaction ID 1-16, description 33-132, amount 133-143, card 263-278. Basis: ordered fields on pp.6-9. Fields not printed or used for matching are ignored; the output contract pp.27-29 takes precedence over broader plugin content on p.21 (no additional phone, credit limit, cycle balances, or date line).\n\n' +
'4. Amount input encoding. Decode unsigned digits or positive/negative signed-display overpunch as integer cents; also accept a leading sign. Account fields have implied two decimals (p.6), and transaction amount is S9(9)V99 (p.8). The PDF does not provide complete encoding rules; overpunch is explicitly mentioned for another signed-display input on p.9. No floating-point currency accumulation or rounding is used.\n\n' +
'5. Record separators and filler. Accept LF and CRLF, remove only the record terminator and one final empty split token, and preserve all record contents. Ignore all unused fields and filler, even NUL bytes; require only the consumed positions rather than validating unused bytes or full trailing filler. Basis: pp.25-26 specify one fixed-width record per line; p.6 drops filler; no further validation rule is stated.\n\n' +
'6. Name assembly. Trim space padding from the three name fields, omit blank parts and join remaining parts with single spaces. Basis: p.7 names the fields and p.27 requires a customer name, without an assembly expression. This presentation was confirmed by the maker.\n\n' +
'7. Address assembly. Keep address lines 1 and 2, dropping only right padding. Join trimmed address line 3, state and ZIP with single spaces, omitting empty components and excluding country. Basis: p.21 says address (3 lines, state, zip), but gives no assembly expression. This presentation was confirmed by the maker.\n\n' +
'8. Card versus account scope. Produce one statement for every usable cross-reference card, even if multiple cards share an account; transactions are matched to that card, not pooled across the account. Basis: p.2 BR-01 and BR-02 and p.4 scenario 1. This resolves the looser account wording on p.21. No carddata.dat is required by this step (p.26).\n\n' +
'9. Selection and order. Sort cross-references lexically by card number and transactions lexically by transaction ID within a card; these are fixed-width digit/string identifiers, preserved as strings. Include all supplied transactions for that card, with no period filter. Basis: p.2 BR-01/02 and p.3 says legacy prints all transactions on file while cycle filtering is TODO. Transactions with a complete card field but no corresponding cross-reference are not printed.\n\n' +
'10. Missing and ambiguous lookups. A missing account/customer prevents only affected statements, records a fixed diagnostic and makes overall status FAILED; unaffected cards continue. This was confirmed by the maker. Duplicate account, customer or card keys are ambiguous and unusable, not last-row-wins; duplicate transaction IDs within a card prevent that card statement. Basis: pp.16 and 20 discuss not-found responses, but neither duplicates nor statement-level continuation is specified.\n\n' +
'11. Malformed inputs. Omitted/non-text inputs, blank lookup keys, incomplete consumed fields and undecodable consumed amounts are fixed record-specific diagnostics with overall FAILED. Explicitly empty file contents are valid empty datasets. A malformed transaction whose card cannot be determined cannot be assigned to a statement; it still fails overall status. No replacement financial values are invented. Basis: p.18 lists empty/not-found and format-error statuses but leaves program-specific handling TODO. Unused business fields are not validated.\n\n' +
'12. FICO edge cases. Apply the bands literally: below 580 Poor; 580-669 Fair; 670-739 Good; 740-799 Very Good; 800 or above Exceptional. Blank or non-numeric FICO prints blank instead of inventing a band. Numeric values outside 300-850 still follow the literal band thresholds. Basis: p.2 BR-07; FICO is optional on p.7, and missing/invalid-score rendering is unstated.\n\n' +
'13. Printed numeric pictures. Implement the pictures on p.27: current balance uses leading zeroes, transaction amounts and totals suppress integer leading zeroes, fractional digits remain two, and only negatives have a trailing minus. Zero in a suppressed picture has a blank integer part and .00 followed by a space. Numeric picture overflow prints 13 asterisks. The contract does not explicitly state overflow or all-zero suppression details. A total outside exact integer-cent arithmetic prevents the affected statement and reports a failure.\n\n' +
'14. Text widths and HTML substitution. Truncate text fields on the right and pad the contract field/line widths with spaces. HTML name and address substitutions use the same truncated display values without right padding; fields explicitly marked X(n) retain their padding. Insert field text literally, without HTML escaping, because pp.27-29 prescribe field insertion and no escaping transformation. This output is a fidelity artifact, not safe arbitrary HTML for untrusted browser rendering.\n\n' +
'15. Print sequence and totals. Treat the repeated separator entries on p.27 as repeated printed lines, not duplicate numbering to discard. A no-transaction statement still prints the text transaction-heading/separator sequence and a zero total (p.4 scenario 4). The HTML closing block has no total row, so none is added, notwithstanding the broader totals section on p.21.\n\n' +
'16. Output envelope and newlines. Concatenate statements with no extra blank lines, join lines using LF and omit a terminal LF; retain exactly 80/100 characters per line. Basis: p.26 permits trailing spaces to be omitted and lines joined with a newline, but does not specify a final newline or inter-statement spacer. status is OK only when errors is empty; errors carries fileName, recordNumber, recordId, code and fixed message. These diagnostics accompany but do not alter the two contract output texts.\n\n' +
'17. Business date. The supplied business date 2022-07-18 (p.25) does not add a statement-date line or filter: the statement print contract pp.27-29 contains no date field. No current clock, random ID or run-specific narrative affects the printed outputs.\n';
output = {creastmt_statements:text.join('\n'),creastmt_statements_html:html.join('\n'),assumptions_md:assumptions,status:errors.length ? 'FAILED' : 'OK',errors:errors};
```

### Escape text (SCRIPT, id=6ae3e4653695c563ea510aac)

```javascript
function esc(v) { return v == null ? null : JSON.stringify(String(v)).slice(1, -1).replace(/\\"/g, '"'); }
function at(o, p) { return p.split('.').reduce(function (x, k) { return x == null ? undefined : x[k]; }, o); }
output = {"endText": {t0: esc(at(input, "creastmt_statements")), t1: esc(at(input, "creastmt_statements_html")), t2: esc(at(input, "assumptions_md")), t3: esc(at(input, "status"))}};

```

_(server: 203 ms, 1 API call, 200 ms in API)_
