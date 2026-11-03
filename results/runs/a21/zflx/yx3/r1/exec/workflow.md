# Workflow: creastmt_statement_generation

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** CardDemo CREASTMT (CBSTM03A/B) statement generation, P-17. Inputs: transact.dat, acctdata.dat, cardxref.dat, custdata.dat (fixed-width text). Outputs: creastmt_statements (80-col text) and creastmt_statements_html (100-col HTML), lines joined by \n.

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae1f0933695c563ea50aed4 | <uuid> | (0, 0) | → Parse input files (seq:<uuid>) |
| Parse input files | SCRIPT | 6ae1f0953695c563ea50aed5 | <uuid> | (500, 0) | → Build statement data (seq:<uuid>) | lang: JAVASCRIPT |
| Build statement data | SCRIPT | 6ae1f0983695c563ea50aed6 | <uuid> | (1000, 0) | → Render statements (seq:<uuid>) | lang: JAVASCRIPT |
| Render statements | SCRIPT | 6ae1f09a3695c563ea50aed7 | <uuid> | (1500, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae1f09d3695c563ea50aed8 | <uuid> | (2000, 0) | — |

## Systems
_(none)_

## Scripts

### Parse input files (SCRIPT, id=6ae1f0953695c563ea50aed5)

```javascript
// CREASTMT step 1: read the four fixed-width input files (copybook layouts) into records.
// Amounts are kept as integer cents (zoned decimal, sign overpunched in the last byte).

function lines(text) {
  if (text === null || text === undefined) return [];
  return String(text).split(/\r?\n/).filter(function (l) { return l.replace(/\s+$/, '').length > 0; });
}

// 1-based start, length, as in the copybook
function fld(rec, start, len) {
  var s = rec.substring(start - 1, start - 1 + len);
  while (s.length < len) s += ' ';
  return s;
}

// Zoned decimal with implied 2 decimals -> integer cents
function zonedCents(raw) {
  var s = String(raw).trim();
  if (s.length === 0) return 0;
  var neg = false;
  if (s.charAt(0) === '-') { neg = true; s = s.substring(1); }
  else if (s.charAt(0) === '+') { s = s.substring(1); }
  if (s.charAt(s.length - 1) === '-') { neg = true; s = s.substring(0, s.length - 1); }
  var last = s.charAt(s.length - 1);
  var POS = '{ABCDEFGHI', NEG = '}JKLMNOPQR';
  var i = POS.indexOf(last);
  if (i >= 0) { s = s.substring(0, s.length - 1) + i; }
  else {
    i = NEG.indexOf(last);
    if (i >= 0) { s = s.substring(0, s.length - 1) + i; neg = true; }
  }
  var cents;
  if (s.indexOf('.') >= 0) {
    var p = s.split('.');
    var dec = (p[1] + '00').substring(0, 2);
    cents = parseInt((p[0].replace(/\D/g, '') || '0'), 10) * 100 + parseInt(dec.replace(/\D/g, '0'), 10);
  } else {
    cents = parseInt(s.replace(/\D/g, '') || '0', 10);
  }
  return neg ? -cents : cents;
}

// cardxref.dat - CVACT03Y (50)
var xrefs = [];
lines(input.cardxrefDat).forEach(function (r) {
  xrefs.push({
    cardNumber: fld(r, 1, 16),
    customerId: fld(r, 17, 9),
    accountId: fld(r, 26, 11)
  });
});

// acctdata.dat - CVACT01Y (300)
var accounts = {};
lines(input.acctdataDat).forEach(function (r) {
  var id = fld(r, 1, 11);
  accounts[id] = {
    accountId: id,
    currentBalance: zonedCents(fld(r, 13, 12)),
    creditLimit: zonedCents(fld(r, 25, 12))
  };
});

// custdata.dat - CUSTREC (500)
var customers = {};
lines(input.custdataDat).forEach(function (r) {
  var id = fld(r, 1, 9);
  customers[id] = {
    customerId: id,
    firstName: fld(r, 10, 25),
    middleName: fld(r, 35, 25),
    lastName: fld(r, 60, 25),
    addressLine1: fld(r, 85, 50),
    addressLine2: fld(r, 135, 50),
    addressLine3: fld(r, 185, 50),
    addressState: fld(r, 235, 2),
    addressCountry: fld(r, 237, 3),
    addressZip: fld(r, 240, 10),
    ficoScore: fld(r, 330, 3)
  };
});

// transact.dat - CVTRA05Y (350), only the fields a statement uses
var transactions = [];
lines(input.transactDat).forEach(function (r) {
  transactions.push({
    transactionId: fld(r, 1, 16),
    description: fld(r, 33, 100),
    amount: zonedCents(fld(r, 133, 11)),
    cardNumber: fld(r, 263, 16)
  });
});

// handed to the next node as one JSON string (plain JS values, no foreign objects)
output.parsedJson = JSON.stringify({
  xrefs: xrefs, accounts: accounts, customers: customers, transactions: transactions
});
// the raw files are no longer needed downstream
output.transactDat = null;
output.acctdataDat = null;
output.cardxrefDat = null;
output.custdataDat = null;

```

### Build statement data (SCRIPT, id=6ae1f0983695c563ea50aed6)

```javascript
// CREASTMT step 2: one StatementData per card cross-reference (BR-01), in card-number order.
var d = JSON.parse(String(input.parsedJson));

// COBOL STRING ... DELIMITED BY ' ': the part of a field before its first space
function word(s) { var i = s.indexOf(' '); return i < 0 ? s : s.substring(0, i); }

// BR-07: FICO score band
function ficoBand(raw) {
  var t = String(raw).trim();
  var n = /^\d+$/.test(t) ? parseInt(t, 10) : 0;
  if (n < 580) return 'Poor';
  if (n < 670) return 'Fair';
  if (n < 740) return 'Good';
  if (n < 800) return 'Very Good';
  return 'Exceptional';
}

// BR-02: transactions grouped by card number, each card's list in transaction-id order
var byCard = {};
d.transactions.forEach(function (t) {
  (byCard[t.cardNumber] = byCard[t.cardNumber] || []).push(t);
});
Object.keys(byCard).forEach(function (k) {
  byCard[k].sort(function (a, b) { return a.transactionId < b.transactionId ? -1 : (a.transactionId > b.transactionId ? 1 : 0); });
});

var xrefs = d.xrefs.slice().sort(function (a, b) {
  return a.cardNumber < b.cardNumber ? -1 : (a.cardNumber > b.cardNumber ? 1 : 0);
});

var statements = [];
var skipped = [];
var lineCount = 0;
xrefs.forEach(function (x) {
  var c = d.customers[x.customerId];
  var a = d.accounts[x.accountId];
  if (!c || !a) {
    skipped.push(x.cardNumber + (!c ? ' customer ' + x.customerId + ' not found' : '') +
                 (!a ? ' account ' + x.accountId + ' not found' : ''));
    return;
  }
  var lines = (byCard[x.cardNumber] || []).map(function (t) {
    return { transactionId: t.transactionId, description: t.description, amount: t.amount };
  });
  var total = 0;
  lines.forEach(function (l) { total += l.amount; });   // BR-03: sum of the listed amounts
  lineCount += lines.length;
  statements.push({
    statementId: x.cardNumber,
    accountId: x.accountId,
    customerId: x.customerId,
    cardNumber: x.cardNumber,
    customerName: word(c.firstName) + ' ' + word(c.middleName) + ' ' + word(c.lastName) + ' ',
    addressLine1: c.addressLine1,
    addressLine2: c.addressLine2,
    addressLine3: word(c.addressLine3) + ' ' + word(c.addressState) + ' ' +
                  word(c.addressCountry) + ' ' + word(c.addressZip) + ' ',
    currentBalance: a.currentBalance,
    creditLimit: a.creditLimit,
    ficoScore: String(c.ficoScore).trim(),
    ficoBand: ficoBand(c.ficoScore),
    lines: lines,
    totalExpenditure: total
  });
});

output.statementDataJson = JSON.stringify(statements);
output.statementCount = statements.length;
output.transactionLineCount = lineCount;
output.skippedCards = skipped.join('\n');
output.parsedJson = null;

```

### Render statements (SCRIPT, id=6ae1f09a3695c563ea50aed7)

```javascript
// CREASTMT step 3: render every StatementData as the 80-column text statement (STMTFILE)
// and the 100-column HTML statement (HTMLFILE), line layouts as in the I/O contract.
var statements = JSON.parse(String(input.statementDataJson));

function rep(ch, n) { var s = ''; while (s.length < n) s += ch; return s; }
function pad(s, n) { s = String(s); return s.length >= n ? s.substring(0, n) : s + rep(' ', n - s.length); }
// COBOL STRING ... DELIMITED BY '  ': the part of a field before its first double space
function upToDoubleSpace(s) { var i = s.indexOf('  '); return i < 0 ? s.replace(/\s+$/, '') : s.substring(0, i); }

function parts(cents) {
  var neg = cents < 0, a = Math.abs(cents);
  return { neg: neg, intPart: Math.floor(a / 100) % 1000000000, dec: a % 100 };
}
function two(n) { return (n < 10 ? '0' : '') + n; }
// PIC 9(9).99-
function pic9(cents) {
  var p = parts(cents), i = String(p.intPart);
  return rep('0', 9 - i.length) + i + '.' + two(p.dec) + (p.neg ? '-' : ' ');
}
// PIC Z(9).99-
function picZ(cents) {
  var p = parts(cents), i = p.intPart === 0 ? '' : String(p.intPart);
  return rep(' ', 9 - i.length) + i + '.' + two(p.dec) + (p.neg ? '-' : ' ');
}

var DASH = rep('-', 80);
var txt = [];
var html = [];
function h(line) { html.push(pad(line, 100).replace(/\s+$/, '')); }

statements.forEach(function (s) {
  var acct = pad(s.accountId, 20);
  var bal = pic9(s.currentBalance);
  var fico = pad(s.ficoBand, 20);

  // ---- text statement ----
  txt.push(rep('*', 31) + 'START OF STATEMENT' + rep('*', 31));
  txt.push(pad(s.customerName, 75) + rep(' ', 5));
  txt.push(pad(s.addressLine1, 50) + rep(' ', 30));
  txt.push(pad(s.addressLine2, 50) + rep(' ', 30));
  txt.push(pad(s.addressLine3, 80));
  txt.push(DASH);
  txt.push(pad(rep(' ', 33) + 'Basic Details', 80));
  txt.push(DASH);
  txt.push(pad('Account ID         :' + acct, 80));
  txt.push(pad('Current Balance    :' + bal, 80));
  txt.push(pad('FICO Score         :' + fico, 80));
  txt.push(DASH);
  txt.push(pad(rep(' ', 30) + 'TRANSACTION SUMMARY', 80));
  txt.push(DASH);
  txt.push(pad('Tran ID', 16) + pad('Tran Details', 51) + '  Tran Amount');
  txt.push(DASH);
  s.lines.forEach(function (l) {
    txt.push(pad(l.transactionId, 16) + ' ' + pad(l.description, 49) + '$' + picZ(l.amount));
  });
  txt.push(DASH);
  txt.push('Total EXP:' + rep(' ', 56) + '$' + picZ(s.totalExpenditure));
  txt.push(rep('*', 32) + 'END OF STATEMENT' + rep('*', 32));

  // ---- HTML statement ----
  h('<!DOCTYPE html>');
  h('<html lang="en">');
  h('<head>');
  h('<meta charset="utf-8">');
  h('<title>HTML Table Layout</title>');
  h('</head>');
  h('<body style="margin:0px;">');
  h('<table  align="center" frame="box" style="width:70%; font:12px Segoe UI,sans-serif;">');
  h('<tr>');
  h('<td colspan="3" style="padding:0px 5px;background-color:#1d1d96b3;">');
  h('<h3>Statement for Account Number: ' + acct + '</h3>');
  h('</td>');
  h('</tr>');
  h('<tr>');
  h('<td colspan="3" style="padding:0px 5px;background-color:#FFAF33;">');
  h('<p style="font-size:16px">Bank of XYZ</p>');
  h('<p>410 Terry Ave N</p>');
  h('<p>Seattle WA 99999</p>');
  h('</td>');
  h('</tr>');
  h('<tr>');
  h('<td colspan="3" style="padding:0px 5px;background-color:#f2f2f2;">');
  h('<p style="font-size:16px">' + upToDoubleSpace(pad(s.customerName, 75)) + '  </p>');
  h('<p>' + upToDoubleSpace(pad(s.addressLine1, 50)) + '  </p>');
  h('<p>' + upToDoubleSpace(pad(s.addressLine2, 50)) + '  </p>');
  h('<p>' + upToDoubleSpace(pad(s.addressLine3, 80)) + '  </p>');
  h('</td>');
  h('</tr>');
  h('<tr>');
  h('<td colspan="3" style="padding:0px 5px;background-color:#33FFD1; text-align:center;">');
  h('<p style="font-size:16px">Basic Details</p>');
  h('</td>');
  h('</tr>');
  h('<tr>');
  h('<td colspan="3" style="padding:0px 5px;background-color:#f2f2f2;">');
  h('<p>Account ID         : ' + acct + '</p>');
  h('<p>Current Balance    : ' + bal + '</p>');
  h('<p>FICO Score         : ' + fico + '</p>');
  h('</td>');
  h('</tr>');
  h('<tr>');
  h('<td colspan="3" style="padding:0px 5px;background-color:#33FFD1; text-align:center;">');
  h('<p style="font-size:16px">Transaction Summary</p>');
  h('</td>');
  h('</tr>');
  h('<tr>');
  h('<td style="width:25%; padding:0px 5px; background-color:#33FF5E; text-align:left;">');
  h('<p style="font-size:16px">Tran ID</p>');
  h('</td>');
  h('<td style="width:55%; padding:0px 5px; background-color:#33FF5E; text-align:left;">');
  h('<p style="font-size:16px">Tran Details</p>');
  h('</td>');
  h('<td style="width:20%; padding:0px 5px; background-color:#33FF5E; text-align:right;">');
  h('<p style="font-size:16px">Amount</p>');
  h('</td>');
  h('</tr>');
  s.lines.forEach(function (l) {
    h('<tr>');
    h('<td style="width:25%; padding:0px 5px; background-color:#f2f2f2; text-align:left;">');
    h('<p>' + pad(l.transactionId, 16) + '</p>');
    h('</td>');
    h('<td style="width:55%; padding:0px 5px; background-color:#f2f2f2; text-align:left;">');
    h('<p>' + pad(l.description, 49) + '</p>');
    h('</td>');
    h('<td style="width:20%; padding:0px 5px; background-color:#f2f2f2; text-align:right;">');
    h('<p>' + picZ(l.amount) + '</p>');
    h('</td>');
    h('</tr>');
  });
  h('<tr>');
  h('<td colspan="3" style="padding:0px 5px;background-color:#1d1d96b3;">');
  h('<h3>End of Statement</h3>');
  h('</td>');
  h('</tr>');
  h('</table>');
  h('</body>');
  h('</html>');
});

output.creastmt_statements = txt.join('\n');
output.creastmt_statements_html = html.join('\n');
output.statementDataJson = null;

```

_(server: 171 ms, 1 API call, 167 ms in API)_
