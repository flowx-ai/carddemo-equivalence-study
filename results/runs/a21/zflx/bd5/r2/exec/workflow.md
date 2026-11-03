# Workflow: creastmt_statement_generation

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** P-17 statement-generation (legacy CREASTMT / CBSTM03A+B). Reads transact, acctdata, cardxref, custdata (fixed-width text), builds one StatementData per CardXref (card-number order), renders the 80-col text statement and the 100-col HTML statement.

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae1e7503695c563ea50ad7e | <uuid> | (0, 200) | → Read files and build statement data (seq:<uuid>) |
| Read files and build statement data | SCRIPT | 6ae1e7533695c563ea50ad83 | <uuid> | (500, 200) | → Render text statements (statement-text) (seq:<uuid>) | lang: JAVASCRIPT |
| Render text statements (statement-text) | SCRIPT | 6ae1e7553695c563ea50ad8a | <uuid> | (1000, 200) | → Render HTML statements (statement-html) (seq:<uuid>) | lang: JAVASCRIPT |
| Render HTML statements (statement-html) | SCRIPT | 6ae1e7583695c563ea50ad8e | <uuid> | (1500, 200) | → Build run summary (seq:<uuid>) | lang: JAVASCRIPT |
| Build run summary | SCRIPT | 6ae1e75a3695c563ea50ad8f | <uuid> | (2000, 200) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae1e75d3695c563ea50ad92 | <uuid> | (2500, 200) | — |

## Systems
_(none)_

## Scripts

### Read files and build statement data (SCRIPT, id=6ae1e7533695c563ea50ad83)

```javascript
// P-17 statement-generation: read the four input files (fixed width, layouts per the
// project data model DT-01/02/04/05) and build one StatementData (DT-17) per CardXref.
function recs(txt) {
  if (txt === null || txt === undefined) return [];
  var parts = String(txt).replace(/\r\n?/g, '\n').split('\n');
  var out = [];
  for (var i = 0; i < parts.length; i++) {
    if (parts[i].replace(/\s+$/, '').length > 0) out.push(parts[i]);
  }
  return out;
}
function fld(r, start, len) {
  var s = r.length > start ? r.substring(start, Math.min(r.length, start + len)) : '';
  while (s.length < len) s += ' ';
  return s;
}
function rtrim(s) { return s.replace(/\s+$/, ''); }
function key(s) { var t = String(s).trim().replace(/^0+(?=.)/, ''); return t; }
// Signed zoned decimal with 2 implied decimals -> integer cents.
// Accepts overpunch ({A-I / }J-R, ASCII p-y), explicit +/- sign, or an explicit point.
function cents(raw) {
  var s = String(raw).trim();
  if (s === '') return 0;
  var neg = false;
  var c0 = s.charAt(0);
  if (c0 === '-' || c0 === '+') { neg = c0 === '-'; s = s.substring(1).trim(); }
  var last = s.charAt(s.length - 1);
  if (last === '-' || last === '+') { neg = last === '-'; s = s.substring(0, s.length - 1).trim(); last = s.charAt(s.length - 1); }
  var POS = '{ABCDEFGHI', NEG = '}JKLMNOPQR', NEGA = 'pqrstuvwxy', k;
  if ((k = POS.indexOf(last)) >= 0) { s = s.substring(0, s.length - 1) + k; }
  else if ((k = NEG.indexOf(last)) >= 0) { s = s.substring(0, s.length - 1) + k; neg = true; }
  else if ((k = NEGA.indexOf(last)) >= 0) { s = s.substring(0, s.length - 1) + k; neg = true; }
  var v;
  if (s.indexOf('.') >= 0) v = Math.round(parseFloat(s) * 100);
  else v = parseInt(s.replace(/ /g, '0'), 10);
  if (isNaN(v)) v = 0;
  return neg ? -v : v;
}

var warnings = [];

// CardXref (CVACT03Y, 50): card 0-16, cust 16-25, acct 25-36
var xrefs = [];
var xr = recs(input.cardxref);
for (var i = 0; i < xr.length; i++) {
  var r = xr[i];
  xrefs.push({ seq: i, cardNumber: rtrim(fld(r, 0, 16)), customerId: fld(r, 16, 9), accountId: fld(r, 25, 11) });
}
// BR-01: statements driven by CardXref order (card number)
xrefs.sort(function (a, b) { return a.cardNumber < b.cardNumber ? -1 : a.cardNumber > b.cardNumber ? 1 : a.seq - b.seq; });

// Customer (CUSTREC, 500)
var customers = {};
var cr = recs(input.custdata);
for (var i = 0; i < cr.length; i++) {
  var r = cr[i];
  var id = key(fld(r, 0, 9));
  if (customers[id]) { warnings.push('duplicate customer ' + id + ' ignored'); continue; }
  customers[id] = {
    firstName: fld(r, 9, 25).trim(), middleName: fld(r, 34, 25).trim(), lastName: fld(r, 59, 25).trim(),
    addr1: rtrim(fld(r, 84, 50)), addr2: rtrim(fld(r, 134, 50)), addr3: fld(r, 184, 50).trim(),
    state: fld(r, 234, 2).trim(), country: fld(r, 236, 3).trim(), zip: fld(r, 239, 10).trim(),
    fico: fld(r, 329, 3)
  };
}

// Account (CVACT01Y, 300): id 0-11, status 11, curr bal 12-24
var accounts = {};
var ar = recs(input.acctdata);
for (var i = 0; i < ar.length; i++) {
  var r = ar[i];
  var id = key(fld(r, 0, 11));
  if (accounts[id]) { warnings.push('duplicate account ' + id + ' ignored'); continue; }
  accounts[id] = { accountId: fld(r, 0, 11), currentBalance: cents(fld(r, 12, 12)) };
}

// Transaction (CVTRA05Y, 350): id 0-16, desc 32-132, amt 132-143, card 262-278
var txByCard = {};
var tr = recs(input.transact);
for (var i = 0; i < tr.length; i++) {
  var r = tr[i];
  var card = rtrim(fld(r, 262, 16));
  if (!txByCard[card]) txByCard[card] = [];
  txByCard[card].push({ seq: i, transactionId: rtrim(fld(r, 0, 16)), description: rtrim(fld(r, 32, 100)), amount: cents(fld(r, 132, 11)) });
}

var statements = [];
for (var i = 0; i < xrefs.length; i++) {
  var x = xrefs[i];
  var cust = customers[key(x.customerId)];
  var acct = accounts[key(x.accountId)];
  if (!cust) { warnings.push('card ' + x.cardNumber + ': customer ' + x.customerId + ' not found, no statement'); continue; }
  if (!acct) { warnings.push('card ' + x.cardNumber + ': account ' + x.accountId + ' not found, no statement'); continue; }
  // BR-02: transactions keyed by card number + transaction id
  var txs = (txByCard[x.cardNumber] || []).slice();
  txs.sort(function (a, b) { return a.transactionId < b.transactionId ? -1 : a.transactionId > b.transactionId ? 1 : a.seq - b.seq; });
  var lines = [];
  var total = 0;
  for (var j = 0; j < txs.length; j++) {
    lines.push({ transactionId: txs[j].transactionId, description: txs[j].description, amount: txs[j].amount });
    // BR-03: total expenditure = sum of amounts above zero; credits/returns listed, not subtracted
    if (txs[j].amount > 0) total += txs[j].amount;
  }
  var nameParts = [cust.firstName, cust.middleName, cust.lastName].filter(function (p) { return p.length > 0; });
  var addr3Parts = [cust.addr3, cust.state, cust.zip].filter(function (p) { return p.length > 0; });
  statements.push({
    statementId: 'STMT-' + (statements.length + 1),
    accountId: x.accountId, customerId: x.customerId, cardNumber: x.cardNumber,
    customerName: nameParts.join(' '),
    addressLine1: cust.addr1, addressLine2: cust.addr2, addressLine3: addr3Parts.join(' '),
    currentBalance: acct.currentBalance,
    ficoScore: cust.fico,
    lines: lines,
    totalExpenditure: total
  });
}

output.statements = statements;
output.runWarnings = warnings.join('\n');
// drop the raw files so later script nodes do not carry them
output.transact = null;
output.acctdata = null;
output.cardxref = null;
output.custdata = null;
```

### Render text statements (statement-text) (SCRIPT, id=6ae1e7553695c563ea50ad8a)

```javascript
// statement-text template: 80-column statement (legacy STMTFILE), one block per StatementData.
function pad(s, n) {
  s = (s === null || s === undefined) ? '' : String(s);
  if (s.length > n) return s.substring(0, n);
  while (s.length < n) s += ' ';
  return s;
}
function rep(c, n) { var s = ''; for (var i = 0; i < n; i++) s += c; return s; }
function parts(c) {
  c = Number(c);
  var a = Math.abs(c);
  var ip = Math.floor(a / 100) % 1000000000;
  var dp = String(a % 100); if (dp.length < 2) dp = '0' + dp;
  return { ip: ip, dp: dp, sign: (c < 0 ? '-' : ' ') };
}
// 9(9).99-
function num9(c) { var p = parts(c); var s = String(p.ip); while (s.length < 9) s = '0' + s; return s + '.' + p.dp + p.sign; }
// Z(9).99-
function numZ(c) { var p = parts(c); var s = p.ip === 0 ? '' : String(p.ip); while (s.length < 9) s = ' ' + s; return s + '.' + p.dp + p.sign; }

var RULE = rep('-', 80);
var out = [];
var st = input.statements || [];
for (var i = 0; i < st.length; i++) {
  var s = st[i];
  out.push(rep('*', 31) + 'START OF STATEMENT' + rep('*', 31));
  out.push(pad(pad(s.customerName, 75), 80));
  out.push(pad(pad(s.addressLine1, 50), 80));
  out.push(pad(pad(s.addressLine2, 50), 80));
  out.push(pad(s.addressLine3, 80));
  out.push(RULE);
  out.push(pad(rep(' ', 33) + 'Basic Details', 80));
  out.push(RULE);
  out.push(pad(pad('Account ID', 19) + ':' + pad(s.accountId, 20), 80));
  out.push(pad(pad('Current Balance', 19) + ':' + num9(s.currentBalance), 80));
  out.push(pad(pad('FICO Score', 19) + ':' + pad(s.ficoScore, 20), 80));
  out.push(RULE);
  out.push(pad(rep(' ', 30) + 'TRANSACTION SUMMARY', 80));
  out.push(RULE);
  out.push(pad('Tran ID', 16) + pad('Tran Details', 51) + '  Tran Amount');
  out.push(RULE);
  var ln = s.lines || [];
  for (var j = 0; j < ln.length; j++) {
    out.push(pad(ln[j].transactionId, 16) + ' ' + pad(ln[j].description, 49) + '$' + numZ(ln[j].amount));
  }
  out.push(RULE);
  out.push('Total EXP:' + rep(' ', 56) + '$' + numZ(s.totalExpenditure));
  out.push(rep('*', 32) + 'END OF STATEMENT' + rep('*', 32));
}
output.creastmt_statements = out.join('\n');
```

### Render HTML statements (statement-html) (SCRIPT, id=6ae1e7583695c563ea50ad8e)

```javascript
// statement-html template: 100-column HTML statement (legacy HTMLFILE), one document per StatementData.
function pad(s, n) {
  s = (s === null || s === undefined) ? '' : String(s);
  if (s.length > n) return s.substring(0, n);
  while (s.length < n) s += ' ';
  return s;
}
function rtrim(s) { return (s === null || s === undefined) ? '' : String(s).replace(/\s+$/, ''); }
function parts(c) {
  c = Number(c);
  var a = Math.abs(c);
  var ip = Math.floor(a / 100) % 1000000000;
  var dp = String(a % 100); if (dp.length < 2) dp = '0' + dp;
  return { ip: ip, dp: dp, sign: (c < 0 ? '-' : ' ') };
}
function num9(c) { var p = parts(c); var s = String(p.ip); while (s.length < 9) s = '0' + s; return s + '.' + p.dp + p.sign; }
function numZ(c) { var p = parts(c); var s = p.ip === 0 ? '' : String(p.ip); while (s.length < 9) s = ' ' + s; return s + '.' + p.dp + p.sign; }

var TD_HEAD = '<td colspan="3" style="padding:0px 5px;background-color:#1d1d96b3;">';
var TD_GREY = '<td colspan="3" style="padding:0px 5px;background-color:#f2f2f2;">';
var TD_SECT = '<td colspan="3" style="padding:0px 5px;background-color:#33FFD1; text-align:center;">';
function col(width, bg, align) {
  return '<td style="width:' + width + '; padding:0px 5px; background-color:' + bg + '; text-align:' + align + ';">';
}

var out = [];
function w(line) { out.push(pad(line, 100)); }

var st = input.statements || [];
for (var i = 0; i < st.length; i++) {
  var s = st[i];
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
  w('<p style="font-size:16px">' + rtrim(s.customerName) + '  </p>');
  w('<p>' + rtrim(s.addressLine1) + '  </p>');
  w('<p>' + rtrim(s.addressLine2) + '  </p>');
  w('<p>' + rtrim(s.addressLine3) + '  </p>');
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
  w('<p>Current Balance    : ' + num9(s.currentBalance) + '</p>');
  w('<p>FICO Score         : ' + pad(s.ficoScore, 20) + '</p>');
  w('</td>');
  w('</tr>');
  w('<tr>');
  w(TD_SECT);
  w('<p style="font-size:16px">Transaction Summary</p>');
  w('</td>');
  w('</tr>');
  w('<tr>');
  w(col('25%', '#33FF5E', 'left'));
  w('<p style="font-size:16px">Tran ID</p>');
  w('</td>');
  w(col('55%', '#33FF5E', 'left'));
  w('<p style="font-size:16px">Tran Details</p>');
  w('</td>');
  w(col('20%', '#33FF5E', 'right'));
  w('<p style="font-size:16px">Amount</p>');
  w('</td>');
  w('</tr>');
  var ln = s.lines || [];
  for (var j = 0; j < ln.length; j++) {
    w('<tr>');
    w(col('25%', '#f2f2f2', 'left'));
    w('<p>' + pad(ln[j].transactionId, 16) + '</p>');
    w('</td>');
    w(col('55%', '#f2f2f2', 'left'));
    w('<p>' + pad(ln[j].description, 49) + '</p>');
    w('</td>');
    w(col('20%', '#f2f2f2', 'right'));
    w('<p>' + numZ(ln[j].amount) + '</p>');
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

### Build run summary (SCRIPT, id=6ae1e75a3695c563ea50ad8f)

```javascript
// Run summary: count statements, keep warnings, drop the in-memory StatementData list.
var st = input.statements || [];
output.statementCount = st.length;
output.runWarnings = input.runWarnings || '';
output.statements = null;
```

_(server: 167 ms, 1 API call, 163 ms in API)_
