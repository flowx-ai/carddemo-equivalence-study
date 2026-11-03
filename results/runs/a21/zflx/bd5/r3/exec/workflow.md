# Workflow: creastmt_statement_generation

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** CardDemo CREASTMT (CBSTM03A/B) statement generation, P-17. Input: transact, acctdata, cardxref, custdata file contents. Output: creastmt_statements (80-col text) and creastmt_statements_html (100-col HTML).

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae1e97c3695c563ea50add6 | <uuid> | (0, 0) | → Build statement data (seq:<uuid>) |
| Build statement data | SCRIPT | 6ae1e97e3695c563ea50add7 | <uuid> | (500, 0) | → Render text statements (seq:<uuid>) | lang: JAVASCRIPT |
| Render text statements | SCRIPT | 6ae1e9813695c563ea50add8 | <uuid> | (1000, 0) | → Render HTML statements (seq:<uuid>) | lang: JAVASCRIPT |
| Render HTML statements | SCRIPT | 6ae1e9833695c563ea50add9 | <uuid> | (1500, 0) | → Build run summary (seq:<uuid>) | lang: JAVASCRIPT |
| Build run summary | SCRIPT | 6ae1e9863695c563ea50adda | <uuid> | (2000, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae1e9883695c563ea50addb | <uuid> | (2500, 0) | — |

## Systems
_(none)_

## Scripts

### Build statement data (SCRIPT, id=6ae1e97e3695c563ea50add7)

```javascript
// CREASTMT / statement-generation (P-17) - node "Build statement data".
// Reads the four input files (fixed width, layouts from the copybooks) and builds one
// StatementData (DT-17) per card cross-reference, in card-number order (BR-01).
// Transactions are matched on card number and ordered by card number + transaction id (BR-02).
// Total expenditure = sum of the amounts above zero; credits/returns are listed, not subtracted (BR-03).

function toLines(text) {
  if (text === null || text === undefined) return [];
  var raw = String(text).replace(/\r\n?/g, '\n').split('\n');
  var out = [];
  for (var i = 0; i < raw.length; i++) {
    if (raw[i].replace(/\s+$/, '').length > 0) out.push(raw[i]);
  }
  return out;
}

function padRight(s, n) {
  s = (s === null || s === undefined) ? '' : String(s);
  while (s.length < n) s += ' ';
  return s.length > n ? s.substring(0, n) : s;
}

function rtrim(s) { return String(s).replace(/\s+$/, ''); }

// Numeric key: an id compared as a number (9(9) / 9(11) fields), leading zeros ignored.
function numKey(s) {
  var t = String(s).trim().replace(/^0+/, '');
  return t === '' ? '0' : t;
}

// COBOL "STRING x DELIMITED BY ' '": the field up to its first space.
function firstWord(s) {
  s = String(s);
  var p = s.indexOf(' ');
  return p < 0 ? s : s.substring(0, p);
}

// Signed zoned decimal with two implied decimals (S9(n)V99) -> integer cents.
// Accepts plain digits, trailing overpunch ({A-I / }J-R, or ASCII p-y for negatives),
// a separate leading/trailing sign, or an explicit decimal point.
function zonedToCents(raw) {
  var s = String(raw).trim();
  if (s === '') return 0;
  var neg = false;
  var c0 = s.charAt(0);
  if (c0 === '-' || c0 === '+') { neg = (c0 === '-'); s = s.substring(1).trim(); }
  var cl = s.charAt(s.length - 1);
  if (cl === '-' || cl === '+') { neg = neg || cl === '-'; s = s.substring(0, s.length - 1).trim(); }
  if (s === '') return 0;
  var v;
  if (s.indexOf('.') >= 0) {
    var parts = s.split('.');
    var ip = parts[0].replace(/\D/g, '') || '0';
    var dp = (parts[1].replace(/\D/g, '') + '00').substring(0, 2);
    v = parseInt(ip, 10) * 100 + parseInt(dp, 10);
  } else {
    var POS = '{ABCDEFGHI', NEGC = '}JKLMNOPQR', NEGA = 'pqrstuvwxy';
    var last = s.charAt(s.length - 1);
    var d = last;
    if (POS.indexOf(last) >= 0) { d = String(POS.indexOf(last)); }
    else if (NEGC.indexOf(last) >= 0) { d = String(NEGC.indexOf(last)); neg = true; }
    else if (NEGA.indexOf(last) >= 0) { d = String(NEGA.indexOf(last)); neg = true; }
    var digits = (s.substring(0, s.length - 1) + d).replace(/\D/g, '');
    v = digits === '' ? 0 : parseInt(digits, 10);
  }
  return (neg && v !== 0) ? -v : v;
}

function cmp(a, b) { return a < b ? -1 : (a > b ? 1 : 0); }

// ---- load ---------------------------------------------------------------------------
// CVTRA05Y (350): id 1-16, desc 33-132, amt 133-143 S9(9)V99, card 263-278
var transactions = [];
var tl = toLines(input.transact);
for (var i = 0; i < tl.length; i++) {
  var r = padRight(tl[i], 350);
  transactions.push({
    seq: i,
    transactionId: r.substring(0, 16),
    description: r.substring(32, 132),
    amountCents: zonedToCents(r.substring(132, 143)),
    cardNumber: r.substring(262, 278)
  });
}
// BR-02: sorted copy keyed by card number + transaction id
transactions.sort(function (a, b) {
  return cmp(a.cardNumber, b.cardNumber) || cmp(a.transactionId, b.transactionId) || (a.seq - b.seq);
});
var txByCard = {};
for (var t = 0; t < transactions.length; t++) {
  var ck = transactions[t].cardNumber.trim();
  if (!txByCard[ck]) txByCard[ck] = [];
  txByCard[ck].push(transactions[t]);
}

// CVACT01Y (300): id 1-11, curr bal 13-24 S9(10)V99
var accounts = {};
var al = toLines(input.acctdata);
for (var j = 0; j < al.length; j++) {
  var ar = padRight(al[j], 300);
  var ak = numKey(ar.substring(0, 11));
  if (!accounts[ak]) {
    accounts[ak] = { accountId: ar.substring(0, 11), currentBalanceCents: zonedToCents(ar.substring(12, 24)) };
  }
}

// CUSTREC (500)
var customers = {};
var cl2 = toLines(input.custdata);
for (var k = 0; k < cl2.length; k++) {
  var cr = padRight(cl2[k], 500);
  var cid = numKey(cr.substring(0, 9));
  if (!customers[cid]) {
    customers[cid] = {
      customerId: cr.substring(0, 9),
      firstName: cr.substring(9, 34),
      middleName: cr.substring(34, 59),
      lastName: cr.substring(59, 84),
      addressLine1: cr.substring(84, 134),
      addressLine2: cr.substring(134, 184),
      addressLine3: cr.substring(184, 234),
      addressState: cr.substring(234, 236),
      addressCountry: cr.substring(236, 239),
      addressZip: cr.substring(239, 249),
      ficoScore: cr.substring(329, 332)
    };
  }
}

// CVACT03Y (50): card 1-16, cust 17-25, acct 26-36
var xrefs = [];
var xl = toLines(input.cardxref);
for (var x = 0; x < xl.length; x++) {
  var xr = padRight(xl[x], 50);
  xrefs.push({ seq: x, cardNumber: xr.substring(0, 16), customerId: xr.substring(16, 25), accountId: xr.substring(25, 36) });
}
// BR-01: driven by CardXref in key (card number) order
xrefs.sort(function (a, b) { return cmp(a.cardNumber, b.cardNumber) || (a.seq - b.seq); });

// ---- build StatementData --------------------------------------------------------------
var statements = [];
var skipped = [];
var lineCount = 0;
for (var n = 0; n < xrefs.length; n++) {
  var xref = xrefs[n];
  var cust = customers[numKey(xref.customerId)];
  var acct = accounts[numKey(xref.accountId)];
  if (!cust || !acct) {
    skipped.push(xref.cardNumber.trim() + (!cust ? ' customer ' + xref.customerId.trim() + ' not found' : '')
      + (!acct ? ' account ' + xref.accountId.trim() + ' not found' : ''));
    continue;
  }
  var name = firstWord(cust.firstName) + ' ' + firstWord(cust.middleName) + ' ' + firstWord(cust.lastName) + ' ';
  var addr3 = firstWord(cust.addressLine3) + ' ' + firstWord(cust.addressState) + ' '
    + firstWord(cust.addressCountry) + ' ' + firstWord(cust.addressZip) + ' ';
  var lines = [];
  var total = 0;
  var cardTx = txByCard[xref.cardNumber.trim()] || [];
  for (var m = 0; m < cardTx.length; m++) {
    lines.push({ transactionId: cardTx[m].transactionId, description: cardTx[m].description, amountCents: cardTx[m].amountCents });
    if (cardTx[m].amountCents > 0) total += cardTx[m].amountCents;
  }
  lineCount += lines.length;
  statements.push({
    statementId: 'STMT-' + xref.cardNumber.trim(),
    accountId: acct.accountId,
    customerId: cust.customerId,
    cardNumber: xref.cardNumber,
    customerName: padRight(name, 75),
    addressLine1: padRight(cust.addressLine1, 50),
    addressLine2: padRight(cust.addressLine2, 50),
    addressLine3: padRight(addr3, 80),
    currentBalanceCents: acct.currentBalanceCents,
    ficoScore: cust.ficoScore,
    lines: lines,
    totalExpenditureCents: total
  });
}

output.statementDataJson = JSON.stringify(statements);
output.buildStats = JSON.stringify({
  xrefRecords: xrefs.length,
  transactionRecords: transactions.length,
  accountRecords: al.length,
  customerRecords: cl2.length,
  statements: statements.length,
  statementLines: lineCount,
  skippedCards: skipped
});
// The raw files are no longer needed: drop them so later nodes do not carry them.
output.transact = null;
output.acctdata = null;
output.custdata = null;
output.cardxref = null;

```

### Render text statements (SCRIPT, id=6ae1e9813695c563ea50add8)

```javascript
// CREASTMT / statement-generation (P-17) - node "Render text statements" (STMTFILE, 80 columns, BR-04).
// Line layout per CONTRACT (creastmt_statements.txt); lines joined by "\n".

function rep(c, n) { var s = ''; for (var i = 0; i < n; i++) s += c; return s; }
function padRight(s, n) {
  s = (s === null || s === undefined) ? '' : String(s);
  while (s.length < n) s += ' ';
  return s.length > n ? s.substring(0, n) : s;
}
function padLeft(s, n, c) { s = String(s); while (s.length < n) s = c + s; return s; }
// 9(9).99-  (high-order digits beyond 9 are truncated, as a COBOL MOVE does)
function fmtNine(cents) {
  var neg = cents < 0, a = Math.abs(cents);
  var ip = Math.floor(a / 100) % 1000000000, dp = a % 100;
  return padLeft(String(ip), 9, '0') + '.' + padLeft(String(dp), 2, '0') + (neg ? '-' : ' ');
}
// Z(9).99-  (leading zeros of the integer part printed as spaces)
function fmtZ(cents) {
  var neg = cents < 0, a = Math.abs(cents);
  var ip = Math.floor(a / 100) % 1000000000, dp = a % 100;
  return padLeft(ip === 0 ? '' : String(ip), 9, ' ') + '.' + padLeft(String(dp), 2, '0') + (neg ? '-' : ' ');
}

var statements = JSON.parse(input.statementDataJson);
var DASH = rep('-', 80);
var out = [];
for (var i = 0; i < statements.length; i++) {
  var st = statements[i];
  out.push(rep('*', 31) + 'START OF STATEMENT' + rep('*', 31));                    // 0
  out.push(padRight(padRight(st.customerName, 75), 80));                           // 1
  out.push(padRight(padRight(st.addressLine1, 50), 80));                           // 2
  out.push(padRight(padRight(st.addressLine2, 50), 80));                           // 3
  out.push(padRight(st.addressLine3, 80));                                         // 4
  out.push(DASH);                                                                  // 5
  out.push(padRight(rep(' ', 33) + 'Basic Details', 80));                          // 6
  out.push(DASH);                                                                  // 5
  out.push(padRight('Account ID         :' + padRight(st.accountId, 20), 80));     // 7
  out.push(padRight('Current Balance    :' + fmtNine(st.currentBalanceCents), 80)); // 8
  out.push(padRight('FICO Score         :' + padRight(st.ficoScore, 20), 80));     // 9
  out.push(DASH);                                                                  // 10
  out.push(padRight(rep(' ', 30) + 'TRANSACTION SUMMARY', 80));                    // 11
  out.push(DASH);                                                                  // 12
  out.push(padRight('Tran ID', 16) + padRight('Tran Details', 51) + '  Tran Amount'); // 13
  out.push(DASH);                                                                  // 12
  for (var j = 0; j < st.lines.length; j++) {                                      // 14
    var ln = st.lines[j];
    out.push(padRight(ln.transactionId, 16) + ' ' + padRight(ln.description, 49) + '$' + fmtZ(ln.amountCents));
  }
  out.push(DASH);                                                                  // 12
  out.push('Total EXP:' + rep(' ', 56) + '$' + fmtZ(st.totalExpenditureCents));    // 14A
  out.push(rep('*', 32) + 'END OF STATEMENT' + rep('*', 32));                      // 15
}
output.creastmt_statements = out.join('\n');

```

### Render HTML statements (SCRIPT, id=6ae1e9833695c563ea50add9)

```javascript
// CREASTMT / statement-generation (P-17) - node "Render HTML statements" (HTMLFILE, 100 columns, BR-04).
// Line layout per CONTRACT (creastmt_statements_html.txt); each statement is a complete HTML document.
// Lines are cut at 100 columns; trailing spaces are omitted (CONTRACT allows it).

function padRight(s, n) {
  s = (s === null || s === undefined) ? '' : String(s);
  while (s.length < n) s += ' ';
  return s.length > n ? s.substring(0, n) : s;
}
function rtrim(s) { return String(s).replace(/\s+$/, ''); }
function padLeft(s, n, c) { s = String(s); while (s.length < n) s = c + s; return s; }
function fmtNine(cents) {
  var neg = cents < 0, a = Math.abs(cents);
  var ip = Math.floor(a / 100) % 1000000000, dp = a % 100;
  return padLeft(String(ip), 9, '0') + '.' + padLeft(String(dp), 2, '0') + (neg ? '-' : ' ');
}
function fmtZ(cents) {
  var neg = cents < 0, a = Math.abs(cents);
  var ip = Math.floor(a / 100) % 1000000000, dp = a % 100;
  return padLeft(ip === 0 ? '' : String(ip), 9, ' ') + '.' + padLeft(String(dp), 2, '0') + (neg ? '-' : ' ');
}

var statements = JSON.parse(input.statementDataJson);
var out = [];
function w(s) { out.push(rtrim(String(s).substring(0, 100))); }

var TD_DARK = '<td colspan="3" style="padding:0px 5px;background-color:#1d1d96b3;">';
var TD_GREY = '<td colspan="3" style="padding:0px 5px;background-color:#f2f2f2;">';
var TD_TEAL = '<td colspan="3" style="padding:0px 5px;background-color:#33FFD1; text-align:center;">';

for (var i = 0; i < statements.length; i++) {
  var st = statements[i];
  var acctId = padRight(st.accountId, 20);
  w('<!DOCTYPE html>');
  w('<html lang="en">');
  w('<head>');
  w('<meta charset="utf-8">');
  w('<title>HTML Table Layout</title>');
  w('</head>');
  w('<body style="margin:0px;">');
  w('<table  align="center" frame="box" style="width:70%; font:12px Segoe UI,sans-serif;">');
  w('<tr>');
  w(TD_DARK);
  w('<h3>Statement for Account Number: ' + acctId + '</h3>');
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
  w('<p style="font-size:16px">' + rtrim(st.customerName) + '  </p>');
  w('<p>' + rtrim(st.addressLine1) + '  </p>');
  w('<p>' + rtrim(st.addressLine2) + '  </p>');
  w('<p>' + rtrim(st.addressLine3) + '  </p>');
  w('</td>');
  w('</tr>');
  w('<tr>');
  w(TD_TEAL);
  w('<p style="font-size:16px">Basic Details</p>');
  w('</td>');
  w('</tr>');
  w('<tr>');
  w(TD_GREY);
  w('<p>Account ID         : ' + acctId + '</p>');
  w('<p>Current Balance    : ' + fmtNine(st.currentBalanceCents) + '</p>');
  w('<p>FICO Score         : ' + padRight(st.ficoScore, 20) + '</p>');
  w('</td>');
  w('</tr>');
  w('<tr>');
  w(TD_TEAL);
  w('<p style="font-size:16px">Transaction Summary</p>');
  w('</td>');
  w('</tr>');
  w('<tr>');
  w('<td style="width:25%; padding:0px 5px; background-color:#33FF5E; text-align:left;">');
  w('<p style="font-size:16px">Tran ID</p>');
  w('</td>');
  w('<td style="width:55%; padding:0px 5px; background-color:#33FF5E; text-align:left;">');
  w('<p style="font-size:16px">Tran Details</p>');
  w('</td>');
  w('<td style="width:20%; padding:0px 5px; background-color:#33FF5E; text-align:right;">');
  w('<p style="font-size:16px">Amount</p>');
  w('</td>');
  w('</tr>');
  for (var j = 0; j < st.lines.length; j++) {
    var ln = st.lines[j];
    w('<tr>');
    w('<td style="width:25%; padding:0px 5px; background-color:#f2f2f2; text-align:left;">');
    w('<p>' + padRight(ln.transactionId, 16) + '</p>');
    w('</td>');
    w('<td style="width:55%; padding:0px 5px; background-color:#f2f2f2; text-align:left;">');
    w('<p>' + padRight(ln.description, 49) + '</p>');
    w('</td>');
    w('<td style="width:20%; padding:0px 5px; background-color:#f2f2f2; text-align:right;">');
    w('<p>' + fmtZ(ln.amountCents) + '</p>');
    w('</td>');
    w('</tr>');
  }
  w('<tr>');
  w(TD_DARK);
  w('<h3>End of Statement</h3>');
  w('</td>');
  w('</tr>');
  w('</table>');
  w('</body>');
  w('</html>');
}
output.creastmt_statements_html = out.join('\n');

```

### Build run summary (SCRIPT, id=6ae1e9863695c563ea50adda)

```javascript
// CREASTMT / statement-generation (P-17) - node "Build run summary".
// Reports what the run produced and drops the intermediate StatementData.
var stats = JSON.parse(input.buildStats);
output.statementCount = stats.statements;
output.runSummary = 'statements=' + stats.statements
  + ' transactionLines=' + stats.statementLines
  + ' xrefRecords=' + stats.xrefRecords
  + ' transactionRecords=' + stats.transactionRecords
  + ' accountRecords=' + stats.accountRecords
  + ' customerRecords=' + stats.customerRecords
  + ' skippedCards=' + stats.skippedCards.length
  + (stats.skippedCards.length ? ' [' + stats.skippedCards.join('; ') + ']' : '');
output.statementDataJson = null;

```

_(server: 353 ms, 1 API call, 193 ms in API)_
