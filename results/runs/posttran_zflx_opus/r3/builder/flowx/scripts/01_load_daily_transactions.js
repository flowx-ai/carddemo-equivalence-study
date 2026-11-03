// Node: Load Daily Transactions  (wiki node 2 — legacy CBTRN01C/CBTRN02C read of DALYTRAN)
// Parses dailytran.dat (copybook CVTRA06Y, 350-byte fixed-width records) into dailyTransactions.
// Amounts are carried as integer cents to avoid floating-point drift.
var REC_LEN = 350;

function records(text, len) {
  var out = [];
  if (text === null || text === undefined) return out;
  var parts = String(text).split('\n');
  for (var i = 0; i < parts.length; i++) {
    var l = parts[i].replace(/\r$/, '');
    if (l.replace(/\s+$/, '').length === 0) continue; // blank line = no record
    while (l.length < len) l += ' ';                    // trailing FILLER may have been trimmed
    out.push(l);
  }
  return out;
}
function str(r, from, to) { return r.substring(from, to).replace(/\s+$/, ''); }
function intField(r, from, to) {
  var s = r.substring(from, to).trim();
  return /^[0-9]+$/.test(s) ? parseInt(s, 10) : 0;
}
// Signed zoned decimal (PIC S9(n)V99, sign overpunched on the last byte) -> integer cents.
function cents(raw) {
  var s = String(raw).trim();
  if (s === '') return 0;
  var neg = false;
  if (s.charAt(0) === '-' || s.charAt(0) === '+') { neg = s.charAt(0) === '-'; s = s.substring(1); }
  var lc = s.charAt(s.length - 1);
  if (lc === '-' || lc === '+') { neg = lc === '-'; s = s.substring(0, s.length - 1); }
  if (s.indexOf('.') >= 0) {
    var p = s.split('.');
    var v = parseInt((p[0] || '0') + (p[1] + '00').substring(0, 2), 10);
    if (isNaN(v)) throw new Error('Bad decimal amount: [' + raw + ']');
    return neg ? -v : v;
  }
  lc = s.charAt(s.length - 1);
  var head = s.substring(0, s.length - 1), d;
  var POS = '{ABCDEFGHI', NEG = '}JKLMNOPQR', NEG_ASCII = 'pqrstuvwxy';
  if (lc >= '0' && lc <= '9') d = lc.charCodeAt(0) - 48;
  else if (POS.indexOf(lc) >= 0) d = POS.indexOf(lc);
  else if (NEG.indexOf(lc) >= 0) { d = NEG.indexOf(lc); neg = true; }
  else if (NEG_ASCII.indexOf(lc) >= 0) { d = NEG_ASCII.indexOf(lc); neg = true; }
  else throw new Error('Bad zoned decimal: [' + raw + ']');
  if (!/^[0-9]*$/.test(head)) throw new Error('Bad zoned decimal: [' + raw + ']');
  var n = (head === '' ? 0 : parseInt(head, 10)) * 10 + d;
  return neg ? -n : n;
}

var lines = records(input.dailytran, REC_LEN);
var txns = [];
for (var i = 0; i < lines.length; i++) {
  var r = lines[i];
  txns.push({
    seq: i + 1,
    tranId: str(r, 0, 16),
    typeCd: str(r, 16, 18),
    catCd: intField(r, 18, 22),
    source: str(r, 22, 32),
    desc: str(r, 32, 132),
    amtCents: cents(r.substring(132, 143)),
    merchantId: intField(r, 143, 152),
    merchantName: str(r, 152, 202),
    merchantCity: str(r, 202, 252),
    merchantZip: str(r, 252, 262),
    cardNum: str(r, 262, 278),
    origTs: str(r, 278, 304),
    procTs: str(r, 304, 330)
  });
}

output.dailyTransactionsJson = JSON.stringify(txns);
output.dailyTransactionCount = txns.length;
output.dailytran = null; // raw file no longer needed; keeps the data model small for later nodes
