// statement-generation (P-17) / CREASTMT — node "Build Statement Data"
// Replaces CBSTM03B (file I/O) and the CBSTM03A in-memory 2-D transaction table.
// Reads the four input files (fixed width, one record per line) and builds one
// StatementData (DT-17) per CardXref record, in card-number order.

function recordsOf(text) {
  var out = [];
  if (text === null || text === undefined) return out;
  var rows = String(text).replace(/\r\n?/g, '\n').split('\n');
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].replace(/\s/g, '') !== '') out.push(rows[i]);
  }
  return out;
}

// 1-based start, like the copybook offsets; short lines are space-padded
function field(rec, start, len) {
  var s = rec.substring(start - 1, start - 1 + len);
  while (s.length < len) s += ' ';
  return s;
}

// numeric keys (CUST-ID 9(9), ACCT-ID 9(11)) compared by value
function key(s) {
  var t = String(s).trim();
  return /^[0-9]+$/.test(t) ? t.replace(/^0+(?=[0-9])/, '') : t;
}

// S9(n)V99 zoned decimal -> integer cents. Trailing overpunch ({A-I / }J-R),
// ASCII negative sign nibble (p-y), or an explicit +/- sign are accepted.
var POS = '{ABCDEFGHI', NEG = '}JKLMNOPQR', ANEG = 'pqrstuvwxy';
function zonedCents(raw) {
  var s = String(raw).trim();
  if (s === '') return 0;
  var neg = false;
  var c = s.charAt(0);
  if (c === '-' || c === '+') { neg = c === '-'; s = s.substring(1).trim(); }
  c = s.charAt(s.length - 1);
  if (c === '-' || c === '+') { neg = neg || c === '-'; s = s.substring(0, s.length - 1).trim(); }
  c = s.charAt(s.length - 1);
  var d;
  if ((d = POS.indexOf(c)) >= 0) s = s.substring(0, s.length - 1) + d;
  else if ((d = NEG.indexOf(c)) >= 0) { neg = true; s = s.substring(0, s.length - 1) + d; }
  else if ((d = ANEG.indexOf(c)) >= 0) { neg = true; s = s.substring(0, s.length - 1) + d; }
  var v;
  if (s.indexOf('.') >= 0) v = Math.round(parseFloat(s) * 100);
  else v = parseInt(s.replace(/[^0-9]/g, '') || '0', 10);
  if (isNaN(v)) v = 0;
  return neg ? -v : v;
}

// COBOL STRING: DELIMITED BY ' ' takes the source up to its first space,
// DELIMITED BY SIZE takes it whole; the result is cut at the receiver size.
function cobolString(parts, size) {
  var r = '';
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i];
    if (p.bySize) { r += p.v; continue; }
    var at = p.v.indexOf(' ');
    r += at >= 0 ? p.v.substring(0, at) : p.v;
  }
  return r.length > size ? r.substring(0, size) : r;
}

// WS-TOTAL-AMT S9(9)V99: ADD without ON SIZE ERROR keeps the low 11 digits
function trunc11(v) {
  return (v < 0 ? -1 : 1) * (Math.abs(v) % 100000000000);
}

var runStatus = 'OK';
var runMessage = '';

// CUSTFILE (CUSTREC, 500)
var customers = {};
var custRecs = recordsOf(input.custdata);
for (var i = 0; i < custRecs.length; i++) {
  var r = custRecs[i];
  var k = key(field(r, 1, 9));
  if (customers[k]) continue;
  customers[k] = {
    custId: field(r, 1, 9),
    firstName: field(r, 10, 25),
    middleName: field(r, 35, 25),
    lastName: field(r, 60, 25),
    addr1: field(r, 85, 50),
    addr2: field(r, 135, 50),
    addr3: field(r, 185, 50),
    state: field(r, 235, 2),
    country: field(r, 237, 3),
    zip: field(r, 240, 10),
    fico: field(r, 330, 3)
  };
}

// ACCTFILE (CVACT01Y, 300)
var accounts = {};
var acctRecs = recordsOf(input.acctdata);
for (var i = 0; i < acctRecs.length; i++) {
  var r = acctRecs[i];
  var k = key(field(r, 1, 11));
  if (accounts[k]) continue;
  accounts[k] = {
    acctId: field(r, 1, 11),
    currBal: zonedCents(field(r, 13, 12)),
    creditLimit: zonedCents(field(r, 25, 12))
  };
}

// XREFFILE (CVACT03Y, 50) — KSDS read sequentially = card-number order, unique key
var xrefs = [];
var seenCard = {};
var xrefRecs = recordsOf(input.cardxref);
for (var i = 0; i < xrefRecs.length; i++) {
  var r = xrefRecs[i];
  var card = field(r, 1, 16);
  if (seenCard[card]) continue;
  seenCard[card] = true;
  xrefs.push({ card: card, custId: field(r, 17, 9), acctId: field(r, 26, 11), seq: i });
}
xrefs.sort(function (a, b) {
  return a.card < b.card ? -1 : a.card > b.card ? 1 : a.seq - b.seq;
});

// TRXFL: transactions sorted by card number (263,16) + tran id (1,16), key length 32
var trx = [];
var trxRecs = recordsOf(input.transact);
for (var i = 0; i < trxRecs.length; i++) {
  var r = trxRecs[i];
  trx.push({
    card: field(r, 263, 16),
    id: field(r, 1, 16),
    desc: field(r, 33, 100),
    amt: zonedCents(field(r, 133, 11)),
    seq: i
  });
}
trx.sort(function (a, b) {
  if (a.card !== b.card) return a.card < b.card ? -1 : 1;
  if (a.id !== b.id) return a.id < b.id ? -1 : 1;
  return a.seq - b.seq;
});
var byCard = {};
var seenTrx = {};
for (var i = 0; i < trx.length; i++) {
  var t = trx[i];
  var tk = t.card + t.id;
  if (seenTrx[tk]) continue; // duplicate KSDS key: REPRO keeps the first
  seenTrx[tk] = true;
  if (!byCard[t.card]) byCard[t.card] = [];
  byCard[t.card].push(t);
}

// one statement per xref record
var statements = [];
var lineCount = 0;
for (var i = 0; i < xrefs.length; i++) {
  var x = xrefs[i];
  var cust = customers[key(x.custId)];
  if (!cust) {
    runStatus = 'ERROR';
    runMessage = 'Customer ' + x.custId + ' not found for card ' + x.card.trim() + '; run stopped (legacy CBSTM03A abends on a CUSTFILE read error)';
    break;
  }
  var acct = accounts[key(x.acctId)];
  if (!acct) {
    runStatus = 'ERROR';
    runMessage = 'Account ' + x.acctId + ' not found for card ' + x.card.trim() + '; run stopped (legacy CBSTM03A abends on an ACCTFILE read error)';
    break;
  }

  var stName = cobolString([
    { v: cust.firstName }, { v: ' ', bySize: true },
    { v: cust.middleName }, { v: ' ', bySize: true },
    { v: cust.lastName }, { v: ' ', bySize: true }
  ], 75);
  var stAdd3 = cobolString([
    { v: cust.addr3 }, { v: ' ', bySize: true },
    { v: cust.state }, { v: ' ', bySize: true },
    { v: cust.country }, { v: ' ', bySize: true },
    { v: cust.zip }, { v: ' ', bySize: true }
  ], 80);

  var txs = byCard[x.card] || [];
  var total = 0;
  var lines = [];
  for (var j = 0; j < txs.length; j++) {
    total = trunc11(total + txs[j].amt);
    lines.push({
      transactionId: txs[j].id,
      description: txs[j].desc,
      amountCents: txs[j].amt,
      amount: txs[j].amt / 100
    });
  }
  lineCount += lines.length;

  statements.push({
    statementId: 'STMT-' + x.card.trim(),
    accountId: x.acctId,
    customerId: x.custId,
    cardNumber: x.card,
    customerName: stName.replace(/\s+$/, ''),
    stName: stName,
    stAdd1: cust.addr1,
    stAdd2: cust.addr2,
    stAdd3: stAdd3,
    accountIdDisplay: acct.acctId,
    currentBalanceCents: acct.currBal,
    currentBalance: acct.currBal / 100,
    creditLimit: acct.creditLimit / 100,
    ficoScore: cust.fico.trim(),
    ficoScoreDisplay: cust.fico,
    lines: lines,
    totalExpenditureCents: total,
    totalExpenditure: total / 100,
    statementDocumentRef: 'creastmt_statements#' + (statements.length + 1)
  });
}

output.statementData = statements;
output.statementLineCount = lineCount;
output.runStatus = runStatus;
output.runMessage = runMessage;
// raw files are no longer needed downstream; keep the SCRIPT payload small
output.transact = null;
output.acctdata = null;
output.cardxref = null;
output.custdata = null;
