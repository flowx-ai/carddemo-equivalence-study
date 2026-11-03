// ACCRUE / LXB002C - node 1: parse the fixed-width input files (one record per line).
// Layouts (copybooks, see project-data-model DT-01, DT-04, DT-06, DT-07):
//   ledgacc.dat  LXV022Y 300: id 9(11) | status X | curr-bal S9(10)V99 | credit-limit S9(10)V99 |
//                cash-credit-limit S9(10)V99 | open X(10) | expiry X(10) | reissue X(10) |
//                cyc-credit S9(10)V99 | cyc-debit S9(10)V99 | zip X(10) | group X(10) | filler 178
//   balcat.dat   LXV026Y  50: acct 9(11) | type X(2) | cat 9(4) | bal S9(9)V99 | filler 22
//   rategrp.dat  LXV027Y  50: group X(10) | type X(2) | cat 9(4) | rate S9(4)V99 | filler 28
//   cardlink.dat LXV024Y  50: card X(16) | cust 9(9) | acct 9(11) | filler 14
// Amounts are kept as integers in units of the last decimal (cents / hundredths of a percent).

function recordsOf(text, len) {
  var out = [];
  if (text === null || text === undefined) return out;
  var parts = String(text).split(/\r?\n/);
  for (var i = 0; i < parts.length; i++) {
    var l = parts[i];
    if (l.replace(/\s+$/, '').length === 0) continue;
    while (l.length < len) l += ' ';
    out.push(l);
  }
  return out;
}

function field(l, from, to) {
  return l.substring(from, to).replace(/\s+$/, '');
}

function pad(s, n) {
  s = String(s);
  while (s.length < n) s = '0' + s;
  return s;
}

// Numeric key normalisation: '00000000001' and '1' are the same account.
function numKey(raw, n) {
  var t = String(raw).trim();
  return /^\d+$/.test(t) ? pad(String(parseInt(t, 10)), n) : t;
}

// Signed zoned decimal with trailing overpunch (EBCDIC-style '{' 'A'-'I' '}' 'J'-'R', or
// ASCII-style 'p'-'y' for negatives); also accepts plain digits or an explicit decimal form.
function zoned(raw, scale) {
  var s = String(raw).trim();
  if (s === '') return 0;
  if (s.indexOf('.') >= 0) {
    var v = Math.round(parseFloat(s) * Math.pow(10, scale));
    if (isNaN(v)) throw new Error('Bad decimal: [' + raw + ']');
    return v;
  }
  var sign = 1;
  if (s.charAt(0) === '-') { sign = -1; s = s.substring(1); }
  else if (s.charAt(0) === '+') { s = s.substring(1); }
  var last = s.charAt(s.length - 1);
  var POS = '{ABCDEFGHI', NEG = '}JKLMNOPQR', NEG_ASCII = 'pqrstuvwxy';
  var d;
  if (/[0-9]/.test(last)) d = parseInt(last, 10);
  else if (POS.indexOf(last) >= 0) d = POS.indexOf(last);
  else if (NEG.indexOf(last) >= 0) { d = NEG.indexOf(last); sign = -sign; }
  else if (NEG_ASCII.indexOf(last) >= 0) { d = NEG_ASCII.indexOf(last); sign = -sign; }
  else throw new Error('Bad zoned decimal: [' + raw + ']');
  var body = s.substring(0, s.length - 1).replace(/ /g, '0');
  if (!/^\d*$/.test(body)) throw new Error('Bad zoned decimal: [' + raw + ']');
  var n = parseInt(body + String(d), 10);
  return n === 0 ? 0 : sign * n;
}

var errors = [];

// --- accounts (ledgacc.dat) ---
var accounts = [];
var acctLines = recordsOf(input.ledgaccDat, 300);
for (var i = 0; i < acctLines.length; i++) {
  var l = acctLines[i];
  try {
    accounts.push({
      acctKey: numKey(l.substring(0, 11), 11),
      acctId: parseInt(l.substring(0, 11).trim(), 10),
      activeStatus: field(l, 11, 12),
      currBal: zoned(l.substring(12, 24), 2),
      creditLimit: zoned(l.substring(24, 36), 2),
      cashCreditLimit: zoned(l.substring(36, 48), 2),
      openDate: field(l, 48, 58),
      expiryDate: field(l, 58, 68),
      reissueDate: field(l, 68, 78),
      cycCredit: zoned(l.substring(78, 90), 2),
      cycDebit: zoned(l.substring(90, 102), 2),
      addrZip: field(l, 102, 112),
      groupId: field(l, 112, 122)
    });
  } catch (e) {
    errors.push('ledgacc line ' + (i + 1) + ': ' + e.message);
  }
}

// --- category balances (balcat.dat), in KSDS key order acct + type + cat ---
var balances = [];
var balLines = recordsOf(input.balcatDat, 50);
for (var j = 0; j < balLines.length; j++) {
  var b = balLines[j];
  try {
    balances.push({
      acctKey: numKey(b.substring(0, 11), 11),
      typeCd: field(b, 11, 13),
      catKey: numKey(b.substring(13, 17), 4),
      bal: zoned(b.substring(17, 28), 2)
    });
  } catch (e) {
    errors.push('balcat line ' + (j + 1) + ': ' + e.message);
  }
}
balances.sort(function (x, y) {
  var kx = x.acctKey + '|' + x.typeCd + '|' + x.catKey;
  var ky = y.acctKey + '|' + y.typeCd + '|' + y.catKey;
  return kx < ky ? -1 : (kx > ky ? 1 : 0);
});

// --- disclosure group rates (rategrp.dat), keyed group|type|cat ---
var rates = {};
var rateLines = recordsOf(input.rategrpDat, 50);
for (var k = 0; k < rateLines.length; k++) {
  var r = rateLines[k];
  try {
    var key = field(r, 0, 10).trim() + '|' + field(r, 10, 12) + '|' + numKey(r.substring(12, 16), 4);
    if (!(key in rates)) rates[key] = zoned(r.substring(16, 22), 2);
  } catch (e) {
    errors.push('rategrp line ' + (k + 1) + ': ' + e.message);
  }
}

// --- card cross-reference (cardlink.dat): first card number per account (AIX on account id) ---
var xrefs = {};
var xrefLines = recordsOf(input.cardlinkDat, 50);
for (var m = 0; m < xrefLines.length; m++) {
  var x = xrefLines[m];
  var card = field(x, 0, 16);
  var acctKey = numKey(x.substring(25, 36), 11);
  if (!(acctKey in xrefs) || card < xrefs[acctKey]) xrefs[acctKey] = card;
}

output.accounts = accounts;
output.categoryBalances = balances;
output.disclosureRates = rates;
output.cardXrefs = xrefs;
output.parseErrors = errors;
