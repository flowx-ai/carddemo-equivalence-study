# Workflow: creastmt_statement_generation

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** CardDemo CREASTMT (CBSTM03A/B) statement generation, P-17. Input: transact, acctdata, cardxref, custdata (fixed-width file contents). Output: creastmt_statements (80 col text) and creastmt_statements_html (100 col HTML), lines joined by \n, plus runSummary.

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae1f4cd3695c563ea50af87 | <uuid> | (0, 0) | → Parse Input Files (seq:<uuid>) |
| Parse Input Files | SCRIPT | 6ae1f4d13695c563ea50af88 | <uuid> | (500, 0) | → Build Statement Data (seq:<uuid>) | lang: JAVASCRIPT |
| Build Statement Data | SCRIPT | 6ae1f4d33695c563ea50af89 | <uuid> | (1000, 0) | → Render Statement Text (seq:<uuid>) | lang: JAVASCRIPT |
| Render Statement Text | SCRIPT | 6ae1f4d63695c563ea50af8a | <uuid> | (1500, 0) | → Render Statement HTML (seq:<uuid>) | lang: JAVASCRIPT |
| Render Statement HTML | SCRIPT | 6ae1f4d93695c563ea50af8b | <uuid> | (2000, 0) | → Build Run Summary (seq:<uuid>) | lang: JAVASCRIPT |
| Build Run Summary | SCRIPT | 6ae1f4dc3695c563ea50af8c | <uuid> | (2500, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae1f4de3695c563ea50af8d | <uuid> | (3000, 0) | — |

## Systems
_(none)_

## Scripts

### Parse Input Files (SCRIPT, id=6ae1f4d13695c563ea50af88)

```javascript
// Node "Parse Input Files" — reads the four fixed-width inputs of the statement step
// (CONTRACT.md layer 1): transact.dat (CVTRA05Y, 350), acctdata.dat (CVACT01Y, 300),
// cardxref.dat (CVACT03Y, 50), custdata.dat (CUSTREC, 500). Offsets follow the attribute
// order and sizes of DT-05, DT-01, DT-04 and DT-02 in the project data model.
// Parsed data is handed on as a JSON string (avoids GraalVM foreign objects between nodes).

var warnings = [];

function toLines(s) {
  if (s === null || s === undefined) return [];
  var t = String(s).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  var arr = t.split('\n');
  var out = [];
  for (var i = 0; i < arr.length; i++) {
    if (arr[i].replace(/\s+$/, '').length > 0) out.push(arr[i]);
  }
  return out;
}

// 1-based start, fixed length, space-padded when the line is short
function fld(rec, start, len) {
  var v = rec.substring(start - 1, start - 1 + len);
  while (v.length < len) v += ' ';
  return v;
}

function numKey(v) {
  var t = String(v).trim();
  if (/^[0-9]+$/.test(t)) {
    t = t.replace(/^0+/, '');
    return t === '' ? '0' : t;
  }
  return t;
}

// Signed zoned decimal with two implied decimals (S9(n)V99) -> integer cents.
// Accepts overpunch ({A-I positive, }J-R negative), ASCII zoned negatives (p-y),
// a separate leading/trailing sign, or an explicit decimal point.
function zonedCents(raw, where) {
  var s = String(raw).trim();
  if (s === '') return 0;
  var neg = false;
  if (s.charAt(0) === '-') { neg = true; s = s.substring(1); }
  else if (s.charAt(0) === '+') { s = s.substring(1); }
  var tail = s.charAt(s.length - 1);
  if (tail === '-') { neg = true; s = s.substring(0, s.length - 1); }
  else if (tail === '+') { s = s.substring(0, s.length - 1); }
  var last = s.charAt(s.length - 1);
  var POS = '{ABCDEFGHI', NEG = '}JKLMNOPQR', ANEG = 'pqrstuvwxy';
  if (POS.indexOf(last) >= 0) {
    s = s.substring(0, s.length - 1) + POS.indexOf(last);
  } else if (NEG.indexOf(last) >= 0) {
    neg = true; s = s.substring(0, s.length - 1) + NEG.indexOf(last);
  } else if (ANEG.indexOf(last) >= 0) {
    neg = true; s = s.substring(0, s.length - 1) + ANEG.indexOf(last);
  }
  var cents;
  if (s.indexOf('.') >= 0) {
    var p = s.split('.');
    var ip = p[0] === '' ? '0' : p[0];
    var fp = (p[1] + '00').substring(0, 2);
    if (!/^[0-9]+$/.test(ip) || !/^[0-9]{2}$/.test(fp)) {
      warnings.push('non-numeric amount ' + where + ': [' + raw + '] read as 0');
      return 0;
    }
    cents = parseInt(ip, 10) * 100 + parseInt(fp, 10);
  } else {
    if (!/^[0-9]+$/.test(s)) {
      warnings.push('non-numeric amount ' + where + ': [' + raw + '] read as 0');
      return 0;
    }
    cents = parseInt(s, 10);
  }
  return neg ? -cents : cents;
}

// transact.dat — CVTRA05Y
var transactions = [];
var tl = toLines(input.transact);
for (var i = 0; i < tl.length; i++) {
  var r = tl[i];
  transactions.push({
    seq: i,
    transactionId: fld(r, 1, 16),
    typeCode: fld(r, 17, 2),
    categoryCode: fld(r, 19, 4),
    source: fld(r, 23, 10),
    description: fld(r, 33, 100),
    amountCents: zonedCents(fld(r, 133, 11), 'transact.dat line ' + (i + 1)),
    cardNumber: fld(r, 263, 16).trim()
  });
}

// acctdata.dat — CVACT01Y
var accounts = {};
var al = toLines(input.acctdata);
for (var j = 0; j < al.length; j++) {
  var a = al[j];
  var acctId = fld(a, 1, 11);
  accounts[numKey(acctId)] = {
    accountId: acctId,
    activeStatus: fld(a, 12, 1),
    currentBalanceCents: zonedCents(fld(a, 13, 12), 'acctdata.dat line ' + (j + 1) + ' curr-bal'),
    creditLimitCents: zonedCents(fld(a, 25, 12), 'acctdata.dat line ' + (j + 1) + ' credit-limit'),
    currentCycleCreditCents: zonedCents(fld(a, 79, 12), 'acctdata.dat line ' + (j + 1) + ' cyc-credit'),
    currentCycleDebitCents: zonedCents(fld(a, 91, 12), 'acctdata.dat line ' + (j + 1) + ' cyc-debit')
  };
}

// cardxref.dat — CVACT03Y
var xrefs = [];
var xl = toLines(input.cardxref);
for (var k = 0; k < xl.length; k++) {
  var x = xl[k];
  xrefs.push({
    seq: k,
    cardNumber: fld(x, 1, 16),
    customerId: fld(x, 17, 9),
    accountId: fld(x, 26, 11)
  });
}

// custdata.dat — CUSTREC (SSN is deliberately not carried: it is never printed)
var customers = {};
var cl = toLines(input.custdata);
for (var m = 0; m < cl.length; m++) {
  var c = cl[m];
  var custId = fld(c, 1, 9);
  customers[numKey(custId)] = {
    customerId: custId,
    firstName: fld(c, 10, 25),
    middleName: fld(c, 35, 25),
    lastName: fld(c, 60, 25),
    addressLine1: fld(c, 85, 50),
    addressLine2: fld(c, 135, 50),
    addressLine3: fld(c, 185, 50),
    addressState: fld(c, 235, 2),
    addressCountry: fld(c, 237, 3),
    addressZip: fld(c, 240, 10),
    phone1: fld(c, 250, 15),
    ficoScore: fld(c, 330, 3)
  };
}

output.parsedInputJson = JSON.stringify({
  transactions: transactions,
  accounts: accounts,
  xrefs: xrefs,
  customers: customers,
  counts: {
    transactions: transactions.length,
    accounts: al.length,
    xrefs: xrefs.length,
    customers: cl.length
  },
  warnings: warnings
});
// raw files are no longer needed downstream (keeps the SCRIPT payload small)
output.transact = null;
output.acctdata = null;
output.cardxref = null;
output.custdata = null;

```

### Build Statement Data (SCRIPT, id=6ae1f4d33695c563ea50af89)

```javascript
// Node "Build Statement Data" — one StatementData (DT-17) per CardXref record.
// BR-01: driven by CardXref order (card number). BR-02: transactions keyed by
// card number + transaction id. BR-03: lines = id, description, amount; total = sum.
// BR-07: FICO score printed as its band. No statement-period filter (all transactions on file).

var P = JSON.parse(String(input.parsedInputJson));

function numKey(v) {
  var t = String(v).trim();
  if (/^[0-9]+$/.test(t)) {
    t = t.replace(/^0+/, '');
    return t === '' ? '0' : t;
  }
  return t;
}

// COBOL STRING ... DELIMITED BY ' ' / ' ' DELIMITED BY SIZE, as in CBSTM03A:
// each part up to its first space, each followed by one space, cut at the target size.
function stringDelimited(parts, size) {
  var r = '';
  for (var i = 0; i < parts.length; i++) {
    var s = String(parts[i]);
    var sp = s.indexOf(' ');
    r += (sp < 0 ? s : s.substring(0, sp)) + ' ';
  }
  return r.length > size ? r.substring(0, size) : r;
}

function ficoBand(raw) {
  var t = String(raw).trim();
  if (!/^[0-9]+$/.test(t)) return '';
  var n = parseInt(t, 10);
  if (n < 580) return 'Poor';
  if (n < 670) return 'Fair';
  if (n < 740) return 'Good';
  if (n < 800) return 'Very Good';
  return 'Exceptional';
}

// transactions grouped by card, each group in transaction-id order (file order on ties)
var byCard = {};
for (var i = 0; i < P.transactions.length; i++) {
  var t = P.transactions[i];
  if (!byCard[t.cardNumber]) byCard[t.cardNumber] = [];
  byCard[t.cardNumber].push(t);
}
function bySeqKey(a, b, key) {
  if (a[key] < b[key]) return -1;
  if (a[key] > b[key]) return 1;
  return a.seq - b.seq;
}
for (var card in byCard) {
  byCard[card].sort(function (a, b) { return bySeqKey(a, b, 'transactionId'); });
}

var xrefs = P.xrefs.slice();
xrefs.sort(function (a, b) { return bySeqKey(a, b, 'cardNumber'); });

var statements = [];
var skipped = [];
var cardsOnXref = {};
var printedTransactions = 0;

for (var x = 0; x < xrefs.length; x++) {
  var xr = xrefs[x];
  var cardNo = xr.cardNumber.trim();
  cardsOnXref[cardNo] = true;
  var cust = P.customers[numKey(xr.customerId)];
  var acct = P.accounts[numKey(xr.accountId)];
  if (!cust || !acct) {
    skipped.push({
      cardNumber: cardNo,
      reason: (!cust ? 'customer ' + xr.customerId.trim() + ' not found' : '') +
        (!cust && !acct ? '; ' : '') +
        (!acct ? 'account ' + xr.accountId.trim() + ' not found' : '')
    });
    continue;
  }
  var txns = byCard[cardNo] || [];
  var lines = [];
  var total = 0;
  for (var k = 0; k < txns.length; k++) {
    lines.push({
      transactionId: txns[k].transactionId,
      description: txns[k].description,
      amountCents: txns[k].amountCents
    });
    total += txns[k].amountCents;
  }
  printedTransactions += lines.length;
  statements.push({
    statementId: 'STMT-' + cardNo,
    accountId: acct.accountId,
    customerId: cust.customerId,
    cardNumber: cardNo,
    customerName: stringDelimited([cust.firstName, cust.middleName, cust.lastName], 75),
    addressLine1: cust.addressLine1,
    addressLine2: cust.addressLine2,
    addressLine3: stringDelimited(
      [cust.addressLine3, cust.addressState, cust.addressCountry, cust.addressZip], 80),
    currentBalanceCents: acct.currentBalanceCents,
    creditLimitCents: acct.creditLimitCents,
    ficoScore: cust.ficoScore,
    ficoBand: ficoBand(cust.ficoScore),
    lines: lines,
    totalExpenditureCents: total
  });
}

var unmatched = 0;
for (var c in byCard) {
  if (!cardsOnXref[c]) unmatched += byCard[c].length;
}

output.statementDataJson = JSON.stringify(statements);
output.buildInfoJson = JSON.stringify({
  inputCounts: P.counts,
  parseWarnings: P.warnings,
  statements: statements.length,
  transactionsPrinted: printedTransactions,
  transactionsWithoutXref: unmatched,
  skippedCards: skipped
});
output.parsedInputJson = null;

```

### Render Statement Text (SCRIPT, id=6ae1f4d63695c563ea50af8a)

```javascript
// Node "Render Statement Text" — template statement-text: 80-column statements
// (BR-04, layout of creastmt_statements.txt in CONTRACT.md layer 1).

var statements = JSON.parse(String(input.statementDataJson));
var W = 80;

function padR(s, n) {
  s = (s === null || s === undefined) ? '' : String(s);
  if (s.length > n) return s.substring(0, n);
  while (s.length < n) s += ' ';
  return s;
}
function rep(ch, n) {
  var s = '';
  for (var i = 0; i < n; i++) s += ch;
  return s;
}
function twoDec(c) { return (c < 10 ? '0' : '') + c; }
// 9(9).99-
function fmtNum(cents) {
  var a = Math.abs(cents);
  var s = String(Math.floor(a / 100) % 1000000000);
  while (s.length < 9) s = '0' + s;
  return s + '.' + twoDec(a % 100) + (cents < 0 ? '-' : ' ');
}
// Z(9).99-
function fmtZ(cents) {
  var a = Math.abs(cents);
  var ip = Math.floor(a / 100) % 1000000000;
  var s = ip === 0 ? '' : String(ip);
  while (s.length < 9) s = ' ' + s;
  return s + '.' + twoDec(a % 100) + (cents < 0 ? '-' : ' ');
}

var out = [];
function add(s) { out.push(padR(s, W)); }
var dashes = rep('-', W);

for (var i = 0; i < statements.length; i++) {
  var st = statements[i];
  add(rep('*', 31) + 'START OF STATEMENT' + rep('*', 31));
  add(padR(st.customerName, 75));
  add(padR(st.addressLine1, 50));
  add(padR(st.addressLine2, 50));
  add(padR(st.addressLine3, 80));
  add(dashes);
  add(rep(' ', 33) + 'Basic Details');
  add(dashes);
  add(padR('Account ID', 19) + ':' + padR(st.accountId, 20));
  add(padR('Current Balance', 19) + ':' + fmtNum(st.currentBalanceCents));
  add(padR('FICO Score', 19) + ':' + padR(st.ficoBand, 20));
  add(dashes);
  add(rep(' ', 30) + 'TRANSACTION SUMMARY');
  add(dashes);
  add(padR('Tran ID', 16) + padR('Tran Details', 51) + '  Tran Amount');
  add(dashes);
  for (var k = 0; k < st.lines.length; k++) {
    var t = st.lines[k];
    add(padR(t.transactionId, 16) + ' ' + padR(t.description, 49) + '$' + fmtZ(t.amountCents));
  }
  add(dashes);
  add('Total EXP:' + rep(' ', 56) + '$' + fmtZ(st.totalExpenditureCents));
  add(rep('*', 32) + 'END OF STATEMENT' + rep('*', 32));
}

output.creastmt_statements = out.join('\n');

```

### Render Statement HTML (SCRIPT, id=6ae1f4d93695c563ea50af8b)

```javascript
// Node "Render Statement HTML" — template statement-html: one HTML document per statement,
// every line padded to 100 columns (BR-04, layout of creastmt_statements_html.txt in
// CONTRACT.md layer 1).

var statements = JSON.parse(String(input.statementDataJson));
var W = 100;

function padR(s, n) {
  s = (s === null || s === undefined) ? '' : String(s);
  if (s.length > n) return s.substring(0, n);
  while (s.length < n) s += ' ';
  return s;
}
function rtrim(s) { return String(s === null || s === undefined ? '' : s).replace(/\s+$/, ''); }
function twoDec(c) { return (c < 10 ? '0' : '') + c; }
// 9(9).99-
function fmtNum(cents) {
  var a = Math.abs(cents);
  var s = String(Math.floor(a / 100) % 1000000000);
  while (s.length < 9) s = '0' + s;
  return s + '.' + twoDec(a % 100) + (cents < 0 ? '-' : ' ');
}
// Z(9).99-
function fmtZ(cents) {
  var a = Math.abs(cents);
  var ip = Math.floor(a / 100) % 1000000000;
  var s = ip === 0 ? '' : String(ip);
  while (s.length < 9) s = ' ' + s;
  return s + '.' + twoDec(a % 100) + (cents < 0 ? '-' : ' ');
}

var TD_BANNER = '<td colspan="3" style="padding:0px 5px;background-color:#1d1d96b3;">';
var TD_GREY = '<td colspan="3" style="padding:0px 5px;background-color:#f2f2f2;">';
var TD_SECTION = '<td colspan="3" style="padding:0px 5px;background-color:#33FFD1; text-align:center;">';

var out = [];
function add(s) { out.push(padR(s, W)); }

for (var i = 0; i < statements.length; i++) {
  var st = statements[i];
  add('<!DOCTYPE html>');
  add('<html lang="en">');
  add('<head>');
  add('<meta charset="utf-8">');
  add('<title>HTML Table Layout</title>');
  add('</head>');
  add('<body style="margin:0px;">');
  add('<table  align="center" frame="box" style="width:70%; font:12px Segoe UI,sans-serif;">');
  add('<tr>');
  add(TD_BANNER);
  add('<h3>Statement for Account Number: ' + padR(st.accountId, 20) + '</h3>');
  add('</td>');
  add('</tr>');
  add('<tr>');
  add('<td colspan="3" style="padding:0px 5px;background-color:#FFAF33;">');
  add('<p style="font-size:16px">Bank of XYZ</p>');
  add('<p>410 Terry Ave N</p>');
  add('<p>Seattle WA 99999</p>');
  add('</td>');
  add('</tr>');
  add('<tr>');
  add(TD_GREY);
  add('<p style="font-size:16px">' + rtrim(st.customerName) + '  </p>');
  add('<p>' + rtrim(st.addressLine1) + '  </p>');
  add('<p>' + rtrim(st.addressLine2) + '  </p>');
  add('<p>' + rtrim(st.addressLine3) + '  </p>');
  add('</td>');
  add('</tr>');
  add('<tr>');
  add(TD_SECTION);
  add('<p style="font-size:16px">Basic Details</p>');
  add('</td>');
  add('</tr>');
  add('<tr>');
  add(TD_GREY);
  add('<p>Account ID         : ' + padR(st.accountId, 20) + '</p>');
  add('<p>Current Balance    : ' + fmtNum(st.currentBalanceCents) + '</p>');
  add('<p>FICO Score         : ' + padR(st.ficoBand, 20) + '</p>');
  add('</td>');
  add('</tr>');
  add('<tr>');
  add(TD_SECTION);
  add('<p style="font-size:16px">Transaction Summary</p>');
  add('</td>');
  add('</tr>');
  add('<tr>');
  add('<td style="width:25%; padding:0px 5px; background-color:#33FF5E; text-align:left;">');
  add('<p style="font-size:16px">Tran ID</p>');
  add('</td>');
  add('<td style="width:55%; padding:0px 5px; background-color:#33FF5E; text-align:left;">');
  add('<p style="font-size:16px">Tran Details</p>');
  add('</td>');
  add('<td style="width:20%; padding:0px 5px; background-color:#33FF5E; text-align:right;">');
  add('<p style="font-size:16px">Amount</p>');
  add('</td>');
  add('</tr>');
  for (var k = 0; k < st.lines.length; k++) {
    var t = st.lines[k];
    add('<tr>');
    add('<td style="width:25%; padding:0px 5px; background-color:#f2f2f2; text-align:left;">');
    add('<p>' + padR(t.transactionId, 16) + '</p>');
    add('</td>');
    add('<td style="width:55%; padding:0px 5px; background-color:#f2f2f2; text-align:left;">');
    add('<p>' + padR(t.description, 49) + '</p>');
    add('</td>');
    add('<td style="width:20%; padding:0px 5px; background-color:#f2f2f2; text-align:right;">');
    add('<p>' + fmtZ(t.amountCents) + '</p>');
    add('</td>');
    add('</tr>');
  }
  add('<tr>');
  add(TD_BANNER);
  add('<h3>End of Statement</h3>');
  add('</td>');
  add('</tr>');
  add('</table>');
  add('</body>');
  add('</html>');
}

output.creastmt_statements_html = out.join('\n');

```

### Build Run Summary (SCRIPT, id=6ae1f4dc3695c563ea50af8c)

```javascript
// Node "Build Run Summary" — batch-operator summary of the run (process flow: Build Run Summary).

var info = JSON.parse(String(input.buildInfoJson));
info.status = info.skippedCards.length > 0 || info.parseWarnings.length > 0 ? 'COMPLETED_WITH_WARNINGS' : 'OK';
info.textLines = input.creastmt_statements ? String(input.creastmt_statements).split('\n').length : 0;
info.htmlLines = input.creastmt_statements_html ? String(input.creastmt_statements_html).split('\n').length : 0;

output.runSummary = JSON.stringify(info);
output.statementDataJson = null;
output.buildInfoJson = null;

```

_(server: 168 ms, 1 API call, 165 ms in API)_
