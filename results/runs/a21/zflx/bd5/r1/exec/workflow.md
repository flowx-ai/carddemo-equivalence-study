# Workflow: creastmt_statement_generation

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** CardDemo CREASTMT (CBSTM03A/B) statement generation, P-17. Input: raw fixed-width contents of transact.dat, acctdata.dat, cardxref.dat, custdata.dat. Output: creastmt_statements (80-col text) and creastmt_statements_html (100-col HTML), lines joined by \n.

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae1e55d3695c563ea50ad57 | <uuid> | (0, 0) | → Build Statement Data (seq:<uuid>) |
| Build Statement Data | SCRIPT | 6ae1e5613695c563ea50ad58 | <uuid> | (500, 0) | → Render Text Statements (seq:<uuid>) | lang: JAVASCRIPT |
| Render Text Statements | SCRIPT | 6ae1e5633695c563ea50ad59 | <uuid> | (1000, 0) | → Render HTML Statements (seq:<uuid>) | lang: JAVASCRIPT |
| Render HTML Statements | SCRIPT | 6ae1e5663695c563ea50ad5a | <uuid> | (1500, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae1e5693695c563ea50ad5b | <uuid> | (2000, 0) | — |

## Systems
_(none)_

## Scripts

### Build Statement Data (SCRIPT, id=6ae1e5613695c563ea50ad58)

```javascript
// CBSTM03A/B: build one StatementData per CardXref record (DT-17).
// Inputs are the raw fixed-width files, one record per line (copybook layouts).

function recLines(s) {
  if (s === null || s === undefined) return [];
  var parts = String(s).split(/\r?\n/);
  var out = [];
  for (var i = 0; i < parts.length; i++) {
    if (parts[i].replace(/\s+$/, '').length > 0) out.push(parts[i]);
  }
  return out;
}

// 1-based start, as in the copybook offsets; short lines are space-padded
function fld(line, start, len) {
  var v = line.substr(start - 1, len);
  while (v.length < len) v += ' ';
  return v;
}

function trim(s) { return String(s).replace(/^\s+|\s+$/g, ''); }

// numeric key: zero-padded ids compare by value
function idKey(s) {
  var t = trim(s);
  if (/^[0-9]+$/.test(t)) return String(parseInt(t, 10));
  return t;
}

// S9(n)V99 zoned display -> integer cents (trailing overpunch or explicit sign)
function cents(raw) {
  var s = trim(raw);
  if (s.length === 0) return 0;
  var neg = false;
  if (s.charAt(0) === '-' || s.charAt(0) === '+') { neg = s.charAt(0) === '-'; s = s.substr(1); }
  var tail = s.charAt(s.length - 1);
  if (tail === '-' || tail === '+') { neg = neg || tail === '-'; s = s.substr(0, s.length - 1); }
  var posOp = '{ABCDEFGHI', negOp = '}JKLMNOPQR';
  tail = s.charAt(s.length - 1);
  var k = posOp.indexOf(tail);
  if (k >= 0) { s = s.substr(0, s.length - 1) + k; }
  else {
    k = negOp.indexOf(tail);
    if (k >= 0) { s = s.substr(0, s.length - 1) + k; neg = true; }
  }
  var c;
  if (s.indexOf('.') >= 0) {
    var p = s.split('.');
    var ip = p[0].replace(/[^0-9]/g, '');
    var dp = (p[1].replace(/[^0-9]/g, '') + '00').substr(0, 2);
    c = (ip ? parseInt(ip, 10) : 0) * 100 + parseInt(dp, 10);
  } else {
    var d = s.replace(/[^0-9]/g, '');
    c = d ? parseInt(d, 10) : 0;
  }
  return neg ? -c : c;
}

// CVCUS01Y / CUSTREC (500)
var customers = {};
var cl = recLines(input.custdata);
for (var i = 0; i < cl.length; i++) {
  var l = cl[i];
  customers[idKey(fld(l, 1, 9))] = {
    firstName: trim(fld(l, 10, 25)),
    middleName: trim(fld(l, 35, 25)),
    lastName: trim(fld(l, 60, 25)),
    addr1: trim(fld(l, 85, 50)),
    addr2: trim(fld(l, 135, 50)),
    addr3: trim(fld(l, 185, 50)),
    state: trim(fld(l, 235, 2)),
    country: trim(fld(l, 237, 3)),
    zip: trim(fld(l, 240, 10)),
    fico: fld(l, 330, 3)
  };
}

// CVACT01Y (300)
var accounts = {};
var al = recLines(input.acctdata);
for (i = 0; i < al.length; i++) {
  l = al[i];
  accounts[idKey(fld(l, 1, 11))] = {
    acctId: fld(l, 1, 11),
    currentBalance: cents(fld(l, 13, 12))
  };
}

// CVTRA05Y (350): keyed by card number + transaction id (BR-02)
var tranByCard = {};
var tl = recLines(input.transact);
for (i = 0; i < tl.length; i++) {
  l = tl[i];
  var card = trim(fld(l, 263, 16));
  if (!tranByCard[card]) tranByCard[card] = [];
  tranByCard[card].push({
    id: trim(fld(l, 1, 16)),
    desc: trim(fld(l, 33, 100)),
    amt: cents(fld(l, 133, 11)),
    seq: i
  });
}

// CVACT03Y (50), statements driven by CardXref order = card number (BR-01)
var xrefs = [];
var xl = recLines(input.cardxref);
for (i = 0; i < xl.length; i++) {
  l = xl[i];
  xrefs.push({ card: trim(fld(l, 1, 16)), custId: fld(l, 17, 9), acctId: fld(l, 26, 11), seq: i });
}
xrefs.sort(function (a, b) {
  if (a.card < b.card) return -1;
  if (a.card > b.card) return 1;
  return a.seq - b.seq;
});

var statements = [];
var warnings = [];
for (i = 0; i < xrefs.length; i++) {
  var x = xrefs[i];
  var cust = customers[idKey(x.custId)];
  var acct = accounts[idKey(x.acctId)];
  if (!cust) warnings.push('customer ' + trim(x.custId) + ' not found for card ' + x.card);
  if (!acct) warnings.push('account ' + trim(x.acctId) + ' not found for card ' + x.card);

  var nameParts = cust ? [cust.firstName, cust.middleName, cust.lastName] : [];
  var name = nameParts.filter(function (p) { return p.length > 0; }).join(' ');
  var addr3Parts = cust ? [cust.addr3, cust.state, cust.zip] : [];
  var addr3 = addr3Parts.filter(function (p) { return p.length > 0; }).join(' ');

  var trans = (tranByCard[x.card] || []).slice();
  trans.sort(function (a, b) {
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return a.seq - b.seq;
  });

  // BR-03: total expenditure = sum of the amounts above zero; credits/returns listed, not subtracted
  var total = 0;
  var lines = [];
  for (var j = 0; j < trans.length; j++) {
    lines.push({ id: trans[j].id, desc: trans[j].desc, amt: trans[j].amt });
    if (trans[j].amt > 0) total += trans[j].amt;
  }

  statements.push({
    statementId: 'STMT-' + x.card,
    cardNumber: x.card,
    customerId: trim(x.custId),
    accountId: acct ? acct.acctId : x.acctId,
    customerName: name,
    addr1: cust ? cust.addr1 : '',
    addr2: cust ? cust.addr2 : '',
    addr3: addr3,
    currentBalance: acct ? acct.currentBalance : 0,
    ficoScore: cust ? cust.fico : '',
    lines: lines,
    totalExpenditure: total
  });
}

output.statementData = JSON.stringify(statements);
output.statementCount = statements.length;
output.statementWarnings = warnings;
// raw files are no longer needed downstream; keep the payload small
output.transact = null;
output.acctdata = null;
output.cardxref = null;
output.custdata = null;

```

### Render Text Statements (SCRIPT, id=6ae1e5633695c563ea50ad59)

```javascript
// STMTFILE: 80-column text statement (CONTRACT layout lines 0..15)

function pad(s, n) {
  s = (s === null || s === undefined) ? '' : String(s);
  if (s.length > n) return s.substr(0, n);
  while (s.length < n) s += ' ';
  return s;
}
function rep(c, n) { var r = ''; for (var i = 0; i < n; i++) r += c; return r; }
function two(d) { return (d < 10 ? '0' : '') + d; }
// 9(9).99-
function pic9(c) {
  var a = Math.abs(c), ip = Math.floor(a / 100) % 1000000000, s = String(ip);
  while (s.length < 9) s = '0' + s;
  return s + '.' + two(a % 100) + (c < 0 ? '-' : ' ');
}
// Z(9).99-
function picZ(c) {
  var a = Math.abs(c), ip = Math.floor(a / 100) % 1000000000, s = ip === 0 ? '' : String(ip);
  while (s.length < 9) s = ' ' + s;
  return s + '.' + two(a % 100) + (c < 0 ? '-' : ' ');
}
function rtrim(s) { return s.replace(/\s+$/, ''); }

var stmts = JSON.parse(String(input.statementData || '[]'));
var out = [];
var dash = rep('-', 80);
for (var i = 0; i < stmts.length; i++) {
  var s = stmts[i];
  var L = [];
  L.push(rep('*', 31) + 'START OF STATEMENT' + rep('*', 31));
  L.push(pad(pad(s.customerName, 75), 80));
  L.push(pad(pad(s.addr1, 50), 80));
  L.push(pad(pad(s.addr2, 50), 80));
  L.push(pad(s.addr3, 80));
  L.push(dash);
  L.push(pad(rep(' ', 33) + 'Basic Details', 80));
  L.push(dash);
  L.push(pad('Account ID         :' + pad(s.accountId, 20), 80));
  L.push(pad('Current Balance    :' + pic9(s.currentBalance), 80));
  L.push(pad('FICO Score         :' + pad(s.ficoScore, 20), 80));
  L.push(dash);
  L.push(pad(rep(' ', 30) + 'TRANSACTION SUMMARY', 80));
  L.push(dash);
  L.push(pad('Tran ID', 16) + pad('Tran Details', 51) + '  Tran Amount');
  L.push(dash);
  for (var j = 0; j < s.lines.length; j++) {
    var t = s.lines[j];
    L.push(pad(t.id, 16) + ' ' + pad(t.desc, 49) + '$' + picZ(t.amt));
  }
  L.push(dash);
  L.push('Total EXP:' + rep(' ', 56) + '$' + picZ(s.totalExpenditure));
  L.push(rep('*', 32) + 'END OF STATEMENT' + rep('*', 32));
  for (var k = 0; k < L.length; k++) out.push(rtrim(L[k]));
}
output.creastmt_statements = out.join('\n');

```

### Render HTML Statements (SCRIPT, id=6ae1e5663695c563ea50ad5a)

```javascript
// HTMLFILE: 100-column HTML statement (CONTRACT layout)

function pad(s, n) {
  s = (s === null || s === undefined) ? '' : String(s);
  if (s.length > n) return s.substr(0, n);
  while (s.length < n) s += ' ';
  return s;
}
function two(d) { return (d < 10 ? '0' : '') + d; }
function pic9(c) {
  var a = Math.abs(c), ip = Math.floor(a / 100) % 1000000000, s = String(ip);
  while (s.length < 9) s = '0' + s;
  return s + '.' + two(a % 100) + (c < 0 ? '-' : ' ');
}
function picZ(c) {
  var a = Math.abs(c), ip = Math.floor(a / 100) % 1000000000, s = ip === 0 ? '' : String(ip);
  while (s.length < 9) s = ' ' + s;
  return s + '.' + two(a % 100) + (c < 0 ? '-' : ' ');
}
function rtrim(s) { return s.replace(/\s+$/, ''); }

var stmts = JSON.parse(String(input.statementData || '[]'));
var out = [];
function emit(line) { out.push(rtrim(pad(line, 100))); }

var tdHead = '<td colspan="3" style="padding:0px 5px;background-color:#1d1d96b3;">';
var tdGrey = '<td colspan="3" style="padding:0px 5px;background-color:#f2f2f2;">';
var tdTeal = '<td colspan="3" style="padding:0px 5px;background-color:#33FFD1; text-align:center;">';

for (var i = 0; i < stmts.length; i++) {
  var s = stmts[i];
  emit('<!DOCTYPE html>');
  emit('<html lang="en">');
  emit('<head>');
  emit('<meta charset="utf-8">');
  emit('<title>HTML Table Layout</title>');
  emit('</head>');
  emit('<body style="margin:0px;">');
  emit('<table  align="center" frame="box" style="width:70%; font:12px Segoe UI,sans-serif;">');
  emit('<tr>');
  emit(tdHead);
  emit('<h3>Statement for Account Number: ' + pad(s.accountId, 20) + '</h3>');
  emit('</td>');
  emit('</tr>');
  emit('<tr>');
  emit('<td colspan="3" style="padding:0px 5px;background-color:#FFAF33;">');
  emit('<p style="font-size:16px">Bank of XYZ</p>');
  emit('<p>410 Terry Ave N</p>');
  emit('<p>Seattle WA 99999</p>');
  emit('</td>');
  emit('</tr>');
  emit('<tr>');
  emit(tdGrey);
  emit('<p style="font-size:16px">' + s.customerName + '  </p>');
  emit('<p>' + s.addr1 + '  </p>');
  emit('<p>' + s.addr2 + '  </p>');
  emit('<p>' + s.addr3 + '  </p>');
  emit('</td>');
  emit('</tr>');
  emit('<tr>');
  emit(tdTeal);
  emit('<p style="font-size:16px">Basic Details</p>');
  emit('</td>');
  emit('</tr>');
  emit('<tr>');
  emit(tdGrey);
  emit('<p>Account ID         : ' + pad(s.accountId, 20) + '</p>');
  emit('<p>Current Balance    : ' + pic9(s.currentBalance) + '</p>');
  emit('<p>FICO Score         : ' + pad(s.ficoScore, 20) + '</p>');
  emit('</td>');
  emit('</tr>');
  emit('<tr>');
  emit(tdTeal);
  emit('<p style="font-size:16px">Transaction Summary</p>');
  emit('</td>');
  emit('</tr>');
  emit('<tr>');
  emit('<td style="width:25%; padding:0px 5px; background-color:#33FF5E; text-align:left;">');
  emit('<p style="font-size:16px">Tran ID</p>');
  emit('</td>');
  emit('<td style="width:55%; padding:0px 5px; background-color:#33FF5E; text-align:left;">');
  emit('<p style="font-size:16px">Tran Details</p>');
  emit('</td>');
  emit('<td style="width:20%; padding:0px 5px; background-color:#33FF5E; text-align:right;">');
  emit('<p style="font-size:16px">Amount</p>');
  emit('</td>');
  emit('</tr>');
  for (var j = 0; j < s.lines.length; j++) {
    var t = s.lines[j];
    emit('<tr>');
    emit('<td style="width:25%; padding:0px 5px; background-color:#f2f2f2; text-align:left;">');
    emit('<p>' + pad(t.id, 16) + '</p>');
    emit('</td>');
    emit('<td style="width:55%; padding:0px 5px; background-color:#f2f2f2; text-align:left;">');
    emit('<p>' + pad(t.desc, 49) + '</p>');
    emit('</td>');
    emit('<td style="width:20%; padding:0px 5px; background-color:#f2f2f2; text-align:right;">');
    emit('<p>' + picZ(t.amt) + '</p>');
    emit('</td>');
    emit('</tr>');
  }
  emit('<tr>');
  emit(tdHead);
  emit('<h3>End of Statement</h3>');
  emit('</td>');
  emit('</tr>');
  emit('</table>');
  emit('</body>');
  emit('</html>');
}
output.creastmt_statements_html = out.join('\n');
output.statementData = null;

```

_(server: 171 ms, 1 API call, 168 ms in API)_
