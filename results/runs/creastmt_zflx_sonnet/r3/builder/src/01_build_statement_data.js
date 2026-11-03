// SCRIPT node "Read Files and Build Statement Data" (workflow creastmt_statement_generation)
// Replaces batch-file-transfer READ_FILE_PAGE, account-data-access GET_ACCOUNT,
// transaction-data-access (all transactions of a card) and the customer lookup of CBSTM03A/B.
// Produces one StatementData (DT-17) per CardXref record, in card-number order (BR-01).

function toLines(txt, recLen) {
  if (txt === null || txt === undefined) return [];
  var s = String(txt).replace(/\r\n?/g, '\n');
  var raw = s.split('\n');
  // A file delivered without line breaks: cut it into fixed-length records.
  if (raw.length === 1 && raw[0].length > recLen && raw[0].length % recLen === 0) {
    var cut = [];
    for (var k = 0; k < raw[0].length; k += recLen) cut.push(raw[0].substring(k, k + recLen));
    raw = cut;
  }
  var out = [];
  for (var i = 0; i < raw.length; i++) {
    var l = raw[i];
    if (l.trim() === '') continue;
    out.push(l.length < recLen ? l + ' '.repeat(recLen - l.length) : l);
  }
  return out;
}

// Signed zoned decimal with implied V99 (or a plain decimal text) -> integer cents.
var POS_OVP = '{ABCDEFGHI', NEG_OVP = '}JKLMNOPQR';
function zonedCents(field) {
  var t = String(field).trim();
  if (t === '') return 0;
  var neg = false;
  if (t[0] === '-' || t[0] === '+') { neg = t[0] === '-'; t = t.substring(1).trim(); }
  else if (t[t.length - 1] === '-' || t[t.length - 1] === '+') { neg = t[t.length - 1] === '-'; t = t.substring(0, t.length - 1).trim(); }
  var v;
  if (t.indexOf('.') >= 0) {
    var p = t.split('.');
    var ip = p[0].replace(/\D/g, '') || '0';
    var dp = ((p[1] || '').replace(/\D/g, '') + '00').substring(0, 2);
    v = parseInt(ip, 10) * 100 + parseInt(dp, 10);
  } else {
    var last = t[t.length - 1], d = last, i;
    if ((i = POS_OVP.indexOf(last)) >= 0) d = String(i);
    else if ((i = NEG_OVP.indexOf(last)) >= 0) { d = String(i); neg = true; }
    else if (last >= 'p' && last <= 'y') { d = String(last.charCodeAt(0) - 112); neg = true; }
    var digits = (t.substring(0, t.length - 1) + d).replace(/\D/g, '0');
    v = digits === '' ? 0 : parseInt(digits, 10);
  }
  return neg ? -v : v;
}

// Numeric keys (9(9) / 9(11)) compared by value, text keys by trimmed text.
function key(s) {
  var t = String(s).trim();
  return /^\d+$/.test(t) ? t.replace(/^0+(?=\d)/, '') : t;
}

// COBOL STRING ... DELIMITED BY ' ': the field up to its first space.
function upToSpace(s) {
  var i = s.indexOf(' ');
  return i < 0 ? s : s.substring(0, i);
}

var warnings = [];

// cardxref.dat — CVACT03Y (50)
var xrefs = toLines(input.cardxref, 50).map(function (l, i) {
  return { cardNumber: l.substring(0, 16), customerId: l.substring(16, 25), accountId: l.substring(25, 36), seq: i };
});
xrefs.sort(function (a, b) {
  return a.cardNumber < b.cardNumber ? -1 : a.cardNumber > b.cardNumber ? 1 : a.seq - b.seq;
});

// custdata.dat — CUSTREC (500)
var customers = {};
toLines(input.custdata, 500).forEach(function (l) {
  var id = key(l.substring(0, 9));
  if (customers[id] === undefined) customers[id] = {
    firstName: l.substring(9, 34), middleName: l.substring(34, 59), lastName: l.substring(59, 84),
    addr1: l.substring(84, 134), addr2: l.substring(134, 184), addr3: l.substring(184, 234),
    state: l.substring(234, 236), country: l.substring(236, 239), zip: l.substring(239, 249),
    fico: l.substring(329, 332)
  };
});

// acctdata.dat — CVACT01Y (300)
var accounts = {};
toLines(input.acctdata, 300).forEach(function (l) {
  var id = key(l.substring(0, 11));
  if (accounts[id] === undefined) accounts[id] = {
    accountId: l.substring(0, 11),
    currentBalance: zonedCents(l.substring(12, 24)),
    creditLimit: zonedCents(l.substring(24, 36))
  };
});

// transact.dat — CVTRA05Y (350), grouped by card, ordered by card + tran id (BR-02)
var txByCard = {};
toLines(input.transact, 350).forEach(function (l, i) {
  var card = l.substring(262, 278);
  (txByCard[card] = txByCard[card] || []).push({
    transactionId: l.substring(0, 16), description: l.substring(32, 132),
    amount: zonedCents(l.substring(132, 143)), seq: i
  });
});
Object.keys(txByCard).forEach(function (card) {
  txByCard[card].sort(function (a, b) {
    return a.transactionId < b.transactionId ? -1 : a.transactionId > b.transactionId ? 1 : a.seq - b.seq;
  });
});

var statements = [];
xrefs.forEach(function (x) {
  var cust = customers[key(x.customerId)];
  var acct = accounts[key(x.accountId)];
  if (!cust) { warnings.push('Card ' + x.cardNumber + ': customer ' + x.customerId + ' not found, no statement'); return; }
  if (!acct) { warnings.push('Card ' + x.cardNumber + ': account ' + x.accountId + ' not found, no statement'); return; }

  var name = (upToSpace(cust.firstName) + ' ' + upToSpace(cust.middleName) + ' ' + upToSpace(cust.lastName) + ' ').substring(0, 75);
  var addr3 = (upToSpace(cust.addr3) + ' ' + upToSpace(cust.state) + ' ' + upToSpace(cust.country) + ' ' + upToSpace(cust.zip) + ' ').substring(0, 80);

  var lines = (txByCard[x.cardNumber] || []).map(function (t) {
    return { transactionId: t.transactionId, description: t.description, amount: t.amount };
  });
  var total = 0;
  lines.forEach(function (t) { total += t.amount; });

  statements.push({
    statementId: 'STMT-' + x.cardNumber.trim(),
    cardNumber: x.cardNumber, accountId: acct.accountId, customerId: x.customerId,
    customerName: name, addressLine1: cust.addr1, addressLine2: cust.addr2, addressLine3: addr3,
    currentBalance: acct.currentBalance, creditLimit: acct.creditLimit, ficoScore: cust.fico,
    lines: lines, totalExpenditure: total
  });
});

// Hand over as JSON text: the next node parses it natively instead of walking host objects.
output.statementsJson = JSON.stringify(statements);
output.statementCount = statements.length;
output.warnings = warnings;
// Drop the raw files so they are not carried through the rest of the run.
output.transact = null;
output.acctdata = null;
output.cardxref = null;
output.custdata = null;
