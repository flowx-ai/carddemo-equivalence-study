# Workflow: creastmt_statement_generation

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** CardDemo CREASTMT (CBSTM03A/B) statement generation, P-17. Inputs: transact, acctdata, cardxref, custdata (fixed-width file contents). Outputs: creastmt_statements (80-col text) and creastmt_statements_html (100-col HTML), lines joined by \n.

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae1f2813695c563ea50af68 | <uuid> | (0, 0) | → Read input files (seq:<uuid>) |
| Read input files | SCRIPT | 6ae1f28c3695c563ea50af69 | <uuid> | (500, 0) | → Build statement data per card (seq:<uuid>) | lang: JAVASCRIPT |
| Build statement data per card | SCRIPT | 6ae1f2903695c563ea50af6a | <uuid> | (1000, 0) | → Render statement-text (80 col) (seq:<uuid>) | lang: JAVASCRIPT |
| Render statement-text (80 col) | SCRIPT | 6ae1f2953695c563ea50af6b | <uuid> | (1500, 0) | → Render statement-html (100 col) (seq:<uuid>) | lang: JAVASCRIPT |
| Render statement-html (100 col) | SCRIPT | 6ae1f2993695c563ea50af6c | <uuid> | (2000, 0) | → Build run summary (seq:<uuid>) | lang: JAVASCRIPT |
| Build run summary | SCRIPT | 6ae1f29d3695c563ea50af6d | <uuid> | (2500, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae1f2a03695c563ea50af6e | <uuid> | (3000, 0) | — |

## Systems
_(none)_

## Scripts

### Read input files (SCRIPT, id=6ae1f28c3695c563ea50af69)

```javascript
// Read the four fixed-width input files (layouts per copybooks CVTRA05Y, CVACT01Y, CVACT03Y, CUSTREC).
// Replaces the batch-file-transfer READ_FILE_PAGE + data-access reads of the wiki design.

function toLines(raw) {
  if (raw === null || raw === undefined) return [];
  var parts = String(raw).split(/\r?\n/);
  var out = [];
  for (var i = 0; i < parts.length; i++) {
    var l = parts[i].replace(/\r$/, '');
    if (l.replace(/\s+$/, '').length > 0) out.push(l);
  }
  return out;
}
// 1-based start, fixed length, space padded (lines may arrive with trailing spaces stripped)
function fld(line, start, len) {
  var s = line.substring(start - 1, start - 1 + len);
  while (s.length < len) s += ' ';
  return s;
}
var OP_POS = '{ABCDEFGHI', OP_NEG = '}JKLMNOPQR', ASCII_NEG = 'pqrstuvwxy';
// Signed zoned decimal with implied decimals -> integer in the smallest unit (cents for scale 2)
function parseSigned(raw, scale) {
  var s = String(raw).trim();
  if (s.length === 0) return 0;
  var neg = false;
  var first = s.charAt(0);
  if (first === '-' || first === '+') { neg = first === '-'; s = s.substring(1).trim(); }
  var last = s.charAt(s.length - 1);
  if (last === '-' || last === '+') {
    neg = neg || last === '-';
    s = s.substring(0, s.length - 1).trim();
  } else if (OP_POS.indexOf(last) >= 0) {
    s = s.substring(0, s.length - 1) + OP_POS.indexOf(last);
  } else if (OP_NEG.indexOf(last) >= 0) {
    neg = true; s = s.substring(0, s.length - 1) + OP_NEG.indexOf(last);
  } else if (ASCII_NEG.indexOf(last) >= 0) {
    neg = true; s = s.substring(0, s.length - 1) + ASCII_NEG.indexOf(last);
  }
  var units;
  var mult = Math.pow(10, scale);
  if (s.indexOf('.') >= 0) {
    var p = s.split('.');
    var ip = p[0].replace(/\D/g, '') || '0';
    var fp = (p[1].replace(/\D/g, '') + '000000').substring(0, scale);
    units = Number(ip) * mult + (scale > 0 ? Number(fp) : 0);
  } else {
    var d = s.replace(/\D/g, '');
    units = d ? Number(d) : 0;
  }
  return neg ? -units : units;
}

var xrefs = [], customers = [], accounts = [], transactions = [];
var i, l;

var xl = toLines(input.cardxref);           // CVACT03Y, 50 bytes
for (i = 0; i < xl.length; i++) {
  l = xl[i];
  xrefs.push({ cardNum: fld(l, 1, 16).replace(/\s+$/, ''), custId: fld(l, 17, 9), acctId: fld(l, 26, 11) });
}
var cl = toLines(input.custdata);           // CUSTREC / CVCUS01Y, 500 bytes
for (i = 0; i < cl.length; i++) {
  l = cl[i];
  customers.push({
    custId: fld(l, 1, 9), first: fld(l, 10, 25), middle: fld(l, 35, 25), last: fld(l, 60, 25),
    addr1: fld(l, 85, 50), addr2: fld(l, 135, 50), addr3: fld(l, 185, 50),
    state: fld(l, 235, 2), country: fld(l, 237, 3), zip: fld(l, 240, 10), fico: fld(l, 330, 3)
  });
}
var al = toLines(input.acctdata);           // CVACT01Y, 300 bytes
for (i = 0; i < al.length; i++) {
  l = al[i];
  accounts.push({ acctId: fld(l, 1, 11), currBal: parseSigned(fld(l, 13, 12), 2), creditLimit: parseSigned(fld(l, 25, 12), 2) });
}
var tl = toLines(input.transact);           // CVTRA05Y, 350 bytes
for (i = 0; i < tl.length; i++) {
  l = tl[i];
  transactions.push({ id: fld(l, 1, 16), desc: fld(l, 33, 100), amt: parseSigned(fld(l, 133, 11), 2), cardNum: fld(l, 263, 16).replace(/\s+$/, '') });
}

output.parsedFilesJson = JSON.stringify({ xrefs: xrefs, customers: customers, accounts: accounts, transactions: transactions });
// drop the raw file contents so they are not carried through the rest of the run
output.transact = null;
output.acctdata = null;
output.cardxref = null;
output.custdata = null;
```

### Build statement data per card (SCRIPT, id=6ae1f2903695c563ea50af6a)

```javascript
// Per CardXref record (card number order, BR-01): customer + account lookup and the card's
// transactions (sorted card number + transaction id, BR-02) -> StatementData (DT-17).

var d = JSON.parse(String(input.parsedFilesJson));
var messages = [];

function numKey(s) {
  var t = String(s).trim();
  if (/^\d+$/.test(t)) { t = t.replace(/^0+/, ''); return t === '' ? '0' : t; }
  return t;
}
// COBOL STRING ... DELIMITED BY ' ': the field up to its first space
function upToSpace(s) {
  var k = s.indexOf(' ');
  return k < 0 ? s : s.substring(0, k);
}
function rtrim(s) { return s.replace(/\s+$/, ''); }
// BR-07 FICO score band
function ficoBand(raw) {
  var t = String(raw).trim();
  if (!/^\d+$/.test(t)) return '';
  var n = Number(t);
  if (n < 580) return 'Poor';
  if (n < 670) return 'Fair';
  if (n < 740) return 'Good';
  if (n < 800) return 'Very Good';
  return 'Exceptional';
}

var custById = {}, acctById = {};
var i;
for (i = 0; i < d.customers.length; i++) {
  var ck = numKey(d.customers[i].custId);
  if (!(ck in custById)) custById[ck] = d.customers[i];
}
for (i = 0; i < d.accounts.length; i++) {
  var ak = numKey(d.accounts[i].acctId);
  if (!(ak in acctById)) acctById[ak] = d.accounts[i];
}

// transactions sorted by card number + transaction id (the TRXFL.SEQ sort), grouped by card
var trans = d.transactions.slice();
trans.sort(function (a, b) {
  if (a.cardNum !== b.cardNum) return a.cardNum < b.cardNum ? -1 : 1;
  if (a.id !== b.id) return a.id < b.id ? -1 : 1;
  return 0;
});
var tranByCard = {};
for (i = 0; i < trans.length; i++) {
  var t = trans[i];
  if (!tranByCard[t.cardNum]) tranByCard[t.cardNum] = [];
  tranByCard[t.cardNum].push({ id: t.id, desc: t.desc, amt: t.amt });
}

var xrefs = d.xrefs.slice();
xrefs.sort(function (a, b) { return a.cardNum < b.cardNum ? -1 : (a.cardNum > b.cardNum ? 1 : 0); });

var statements = [];
for (i = 0; i < xrefs.length; i++) {
  var x = xrefs[i];
  var cust = custById[numKey(x.custId)];
  var acct = acctById[numKey(x.acctId)];
  if (!cust) { messages.push('Card ' + x.cardNum + ': customer ' + x.custId + ' not found - no statement'); continue; }
  if (!acct) { messages.push('Card ' + x.cardNum + ': account ' + x.acctId + ' not found - no statement'); continue; }

  // ST-NAME X(75): first, middle, last name, each up to its first space, one space after each
  var name = (upToSpace(cust.first) + ' ' + upToSpace(cust.middle) + ' ' + upToSpace(cust.last) + ' ').substring(0, 75);
  // ST-ADD3 X(80): address line 3, state, country, zip, each up to its first space
  var addr3 = (upToSpace(cust.addr3) + ' ' + upToSpace(cust.state) + ' ' + upToSpace(cust.country) + ' ' + upToSpace(cust.zip) + ' ').substring(0, 80);

  var lines = tranByCard[x.cardNum] || [];
  var total = 0;
  for (var j = 0; j < lines.length; j++) total += lines[j].amt;

  statements.push({
    statementId: 'STMT-' + x.cardNum,
    accountId: acct.acctId,
    customerId: x.custId,
    cardNumber: x.cardNum,
    customerName: name,
    customerAddress: [cust.addr1, cust.addr2, addr3],
    currentBalance: acct.currBal,
    creditLimit: acct.creditLimit,
    ficoScore: String(cust.fico).trim(),
    ficoBand: ficoBand(cust.fico),
    lines: lines,
    totalExpenditure: total
  });
}

output.statementDataJson = JSON.stringify(statements);
output.runMessagesJson = JSON.stringify(messages);
output.parsedFilesJson = null;
```

### Render statement-text (80 col) (SCRIPT, id=6ae1f2953695c563ea50af6b)

```javascript
// statement-text template: STMTFILE, 80-column lines (CBSTM03A ST-LINE0..ST-LINE15).

var stmts = JSON.parse(String(input.statementDataJson));

function rep(c, n) { var s = ''; while (s.length < n) s += c; return s; }
function pad(s, n) { s = String(s); return s.length >= n ? s.substring(0, n) : s + rep(' ', n - s.length); }
function lpad(s, n, c) { s = String(s); while (s.length < n) s = c + s; return s; }
// PIC 9(9).99-  (cents in)
function pic9(c) {
  var neg = c < 0, a = Math.abs(c);
  var ip = Math.floor(a / 100) % 1000000000, dp = a % 100;
  return lpad(ip, 9, '0') + '.' + lpad(dp, 2, '0') + (neg && a !== 0 ? '-' : ' ');
}
// PIC Z(9).99-  (cents in)
function picZ(c) {
  var neg = c < 0, a = Math.abs(c);
  var ip = Math.floor(a / 100) % 1000000000, dp = a % 100;
  return lpad(ip === 0 ? '' : String(ip), 9, ' ') + '.' + lpad(dp, 2, '0') + (neg && a !== 0 ? '-' : ' ');
}

var DASH = rep('-', 80);
var out = [];
for (var i = 0; i < stmts.length; i++) {
  var s = stmts[i];
  out.push(rep('*', 31) + 'START OF STATEMENT' + rep('*', 31));
  out.push(pad(pad(s.customerName, 75), 80));
  out.push(pad(pad(s.customerAddress[0], 50), 80));
  out.push(pad(pad(s.customerAddress[1], 50), 80));
  out.push(pad(s.customerAddress[2], 80));
  out.push(DASH);
  out.push(pad(rep(' ', 33) + 'Basic Details', 80));
  out.push(DASH);
  out.push(pad('Account ID         :' + pad(s.accountId, 20), 80));
  out.push(pad('Current Balance    :' + pic9(s.currentBalance), 80));
  out.push(pad('FICO Score         :' + pad(s.ficoBand, 20), 80));
  out.push(DASH);
  out.push(pad(rep(' ', 30) + 'TRANSACTION SUMMARY', 80));
  out.push(DASH);
  out.push(pad('Tran ID', 16) + pad('Tran Details', 51) + '  Tran Amount');
  out.push(DASH);
  for (var j = 0; j < s.lines.length; j++) {
    var t = s.lines[j];
    out.push(pad(t.id, 16) + ' ' + pad(t.desc, 49) + '$' + picZ(t.amt));
  }
  out.push(DASH);
  out.push('Total EXP:' + rep(' ', 56) + '$' + picZ(s.totalExpenditure));
  out.push(rep('*', 32) + 'END OF STATEMENT' + rep('*', 32));
}

output.creastmt_statements = out.join('\n');
```

### Render statement-html (100 col) (SCRIPT, id=6ae1f2993695c563ea50af6c)

```javascript
// statement-html template: HTMLFILE, 100-column lines, one full HTML document per statement.

var stmts = JSON.parse(String(input.statementDataJson));

function rep(c, n) { var s = ''; while (s.length < n) s += c; return s; }
function pad(s, n) { s = String(s); return s.length >= n ? s.substring(0, n) : s + rep(' ', n - s.length); }
function lpad(s, n, c) { s = String(s); while (s.length < n) s = c + s; return s; }
function pic9(c) {
  var neg = c < 0, a = Math.abs(c);
  var ip = Math.floor(a / 100) % 1000000000, dp = a % 100;
  return lpad(ip, 9, '0') + '.' + lpad(dp, 2, '0') + (neg && a !== 0 ? '-' : ' ');
}
function picZ(c) {
  var neg = c < 0, a = Math.abs(c);
  var ip = Math.floor(a / 100) % 1000000000, dp = a % 100;
  return lpad(ip === 0 ? '' : String(ip), 9, ' ') + '.' + lpad(dp, 2, '0') + (neg && a !== 0 ? '-' : ' ');
}
// text field as printed inside a <p>: up to the first double space (= trailing padding removed)
function upToDoubleSpace(s) {
  s = String(s);
  var k = s.indexOf('  ');
  s = k < 0 ? s : s.substring(0, k);
  return s.replace(/\s+$/, '');
}

var TD_HEAD = '<td colspan="3" style="padding:0px 5px;background-color:#1d1d96b3;">';
var TD_GREY = '<td colspan="3" style="padding:0px 5px;background-color:#f2f2f2;">';
var TD_SECT = '<td colspan="3" style="padding:0px 5px;background-color:#33FFD1; text-align:center;">';
function tdCol(width, color, align) {
  return '<td style="width:' + width + '; padding:0px 5px; background-color:' + color + '; text-align:' + align + ';">';
}

var out = [];
function w(line) { out.push(pad(line, 100)); }

for (var i = 0; i < stmts.length; i++) {
  var s = stmts[i];
  w('<!DOCTYPE html>');
  w('<html lang="en">');
  w('<head>');
  w('<meta charset="utf-8">');
  w('<title>HTML Table Layout</title>');
  w('</head>');
  w('<body style="margin:0px;">');
  w('<table  align="center" frame="box" style="width:70%; font:12px Segoe UI,sans-serif;">');
  w('<tr>');
  w(TD_HEAD);
  w('<h3>Statement for Account Number: ' + pad(s.accountId, 20) + '</h3>');
  w('</td>');
  w('</tr>');
  w('<tr>');
  w('<td colspan="3" style="padding:0px 5px;background-color:#FFAF33;">');
  w('<p style="font-size:16px">Bank of XYZ</p>');
  w('<p>410 Terry Ave N</p>');
  w('<p>Seattle WA 99999</p>');
  w('</td>');
  w('</tr>');
  w('<tr>');
  w(TD_GREY);
  w('<p style="font-size:16px">' + upToDoubleSpace(s.customerName) + '  </p>');
  w('<p>' + upToDoubleSpace(s.customerAddress[0]) + '  </p>');
  w('<p>' + upToDoubleSpace(s.customerAddress[1]) + '  </p>');
  w('<p>' + upToDoubleSpace(s.customerAddress[2]) + '  </p>');
  w('</td>');
  w('</tr>');
  w('<tr>');
  w(TD_SECT);
  w('<p style="font-size:16px">Basic Details</p>');
  w('</td>');
  w('</tr>');
  w('<tr>');
  w(TD_GREY);
  w('<p>Account ID         : ' + pad(s.accountId, 20) + '</p>');
  w('<p>Current Balance    : ' + pic9(s.currentBalance) + '</p>');
  w('<p>FICO Score         : ' + pad(s.ficoBand, 20) + '</p>');
  w('</td>');
  w('</tr>');
  w('<tr>');
  w(TD_SECT);
  w('<p style="font-size:16px">Transaction Summary</p>');
  w('</td>');
  w('</tr>');
  w('<tr>');
  w(tdCol('25%', '#33FF5E', 'left'));
  w('<p style="font-size:16px">Tran ID</p>');
  w('</td>');
  w(tdCol('55%', '#33FF5E', 'left'));
  w('<p style="font-size:16px">Tran Details</p>');
  w('</td>');
  w(tdCol('20%', '#33FF5E', 'right'));
  w('<p style="font-size:16px">Amount</p>');
  w('</td>');
  w('</tr>');
  for (var j = 0; j < s.lines.length; j++) {
    var t = s.lines[j];
    w('<tr>');
    w(tdCol('25%', '#f2f2f2', 'left'));
    w('<p>' + pad(t.id, 16) + '</p>');
    w('</td>');
    w(tdCol('55%', '#f2f2f2', 'left'));
    w('<p>' + pad(t.desc, 49) + '</p>');
    w('</td>');
    w(tdCol('20%', '#f2f2f2', 'right'));
    w('<p>' + picZ(t.amt) + '</p>');
    w('</td>');
    w('</tr>');
  }
  w('<tr>');
  w(TD_HEAD);
  w('<h3>End of Statement</h3>');
  w('</td>');
  w('</tr>');
  w('</table>');
  w('</body>');
  w('</html>');
}

output.creastmt_statements_html = out.join('\n');
```

### Build run summary (SCRIPT, id=6ae1f29d3695c563ea50af6d)

```javascript
// Run summary: statement count and the cards skipped (customer/account not found).
var stmts = JSON.parse(String(input.statementDataJson));
var msgs = JSON.parse(String(input.runMessagesJson || '[]'));
output.statementCount = stmts.length;
output.runMessages = msgs.length ? msgs.join('\n') : 'OK';
output.statementDataJson = null;
output.runMessagesJson = null;
```

_(server: 172 ms, 1 API call, 169 ms in API)_
