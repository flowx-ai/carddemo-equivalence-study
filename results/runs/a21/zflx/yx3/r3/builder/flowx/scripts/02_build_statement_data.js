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
