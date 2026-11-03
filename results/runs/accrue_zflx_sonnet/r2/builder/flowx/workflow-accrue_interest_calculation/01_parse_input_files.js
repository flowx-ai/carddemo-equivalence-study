// Workflow accrue_interest_calculation — SCRIPT node "Parse input files"
// Parses the fixed-width record layouts (copybooks LXV022Y, LXV026Y, LXV027Y, LXV024Y)
// into plain objects. Each input may also be a JSON list in the CONTRACT.md output field
// names (e.g. the oracle's postday_ledgacc.json / postday_balcat.json), see assumptions.md A-03.

function lines(text) {
  if (text === null || text === undefined) return [];
  var t = String(text).replace(/\r/g, '');
  var out = [];
  var parts = t.split('\n');
  for (var i = 0; i < parts.length; i++) {
    if (parts[i].replace(/\s+$/, '').length > 0) out.push(parts[i]);
  }
  return out;
}
function cut(line, from, to) {
  if (line.length <= from) return '';
  return line.substring(from, Math.min(to, line.length));
}
function rtrim(s) { return s === null || s === undefined ? '' : String(s).replace(/\s+$/, ''); }
function padLeft(s, n, c) { s = String(s); while (s.length < n) s = c + s; return s; }

// Signed zoned decimal (DISPLAY, sign overpunched on the last byte) -> scaled integer.
// For a V99 field the result is the amount in hundredths. A field holding an explicit
// decimal point / sign (a human-edited dump) is accepted as well.
var POS = { '{': 0, 'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8, 'I': 9 };
var NEG = { '}': 0, 'J': 1, 'K': 2, 'L': 3, 'M': 4, 'N': 5, 'O': 6, 'P': 7, 'Q': 8, 'R': 9,
            'p': 0, 'q': 1, 'r': 2, 's': 3, 't': 4, 'u': 5, 'v': 6, 'w': 7, 'x': 8, 'y': 9 };
function zoned(raw, scale) {
  var s = String(raw).trim();
  if (s.length === 0) return 0;
  if (s.indexOf('.') >= 0 || /^[+-]/.test(s) || /[+-]$/.test(s)) return decimalScaled(s, scale);
  var last = s.charAt(s.length - 1);
  var body = s.substring(0, s.length - 1);
  var sign = 1, digit;
  if (last >= '0' && last <= '9') digit = last;
  else if (POS.hasOwnProperty(last)) digit = String(POS[last]);
  else if (NEG.hasOwnProperty(last)) { digit = String(NEG[last]); sign = -1; }
  else throw new Error('Bad zoned decimal: [' + raw + ']');
  var digits = (body + digit).replace(/ /g, '0');
  if (!/^[0-9]+$/.test(digits)) throw new Error('Bad zoned decimal: [' + raw + ']');
  return sign * parseInt(digits, 10);
}
// "12.5" / "-1234.56" / 15 -> scaled integer (scale = number of implied decimals)
function decimalScaled(v, scale) {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return Math.round(v * Math.pow(10, scale));
  var s = String(v).trim();
  var sign = 1;
  if (s.charAt(0) === '-') { sign = -1; s = s.substring(1); }
  else if (s.charAt(0) === '+') s = s.substring(1);
  if (s.charAt(s.length - 1) === '-') { sign = -1; s = s.substring(0, s.length - 1); }
  else if (s.charAt(s.length - 1) === '+') s = s.substring(0, s.length - 1);
  var p = s.split('.');
  var frac = (p.length > 1 ? p[1] : '');
  while (frac.length < scale) frac += '0';
  frac = frac.substring(0, scale);
  var n = parseInt((p[0] || '0') + frac, 10);
  if (isNaN(n)) throw new Error('Bad decimal: [' + v + ']');
  return sign * n;
}
function isJsonList(text) { return text !== null && text !== undefined && String(text).trim().charAt(0) === '['; }
function acctKey(v) { return padLeft(String(v).trim().replace(/^0+(?=\d)/, ''), 11, '0'); }

var warnings = [];

// ---- LXV022Y Account (300 bytes) ----
var accounts = [];
if (isJsonList(input.ledgacc)) {
  var ja = JSON.parse(String(input.ledgacc));
  for (var i = 0; i < ja.length; i++) {
    var a = ja[i];
    accounts.push({
      acctKey: acctKey(a.acct_id), active_status: rtrim(a.active_status),
      curr_bal: decimalScaled(a.curr_bal, 2), credit_limit: decimalScaled(a.credit_limit, 2),
      cash_credit_limit: decimalScaled(a.cash_credit_limit, 2),
      open_date: rtrim(a.open_date), expiration_date: rtrim(a.expiration_date), reissue_date: rtrim(a.reissue_date),
      curr_cyc_credit: decimalScaled(a.curr_cyc_credit, 2), curr_cyc_debit: decimalScaled(a.curr_cyc_debit, 2),
      addr_zip: rtrim(a.addr_zip), group_id: rtrim(a.group_id)
    });
  }
} else {
  var la = lines(input.ledgacc);
  for (var i = 0; i < la.length; i++) {
    var l = la[i];
    accounts.push({
      acctKey: acctKey(cut(l, 0, 11)),             // LACC-ID 9(11)
      active_status: rtrim(cut(l, 11, 12)),         // LACC-ACTIVE-STATUS X(1)
      curr_bal: zoned(cut(l, 12, 24), 2),           // LACC-CURR-BAL S9(10)V99
      credit_limit: zoned(cut(l, 24, 36), 2),       // LACC-CREDIT-LIMIT S9(10)V99
      cash_credit_limit: zoned(cut(l, 36, 48), 2),  // LACC-CASH-CREDIT-LIMIT S9(10)V99
      open_date: rtrim(cut(l, 48, 58)),             // LACC-OPEN-DATE X(10)
      expiration_date: rtrim(cut(l, 58, 68)),       // LACC-EXPIRY-DATE X(10)
      reissue_date: rtrim(cut(l, 68, 78)),          // LACC-REISSUE-DATE X(10)
      curr_cyc_credit: zoned(cut(l, 78, 90), 2),    // LACC-CURR-CYC-CREDIT S9(10)V99
      curr_cyc_debit: zoned(cut(l, 90, 102), 2),    // LACC-CURR-CYC-DEBIT S9(10)V99
      addr_zip: rtrim(cut(l, 102, 112)),            // LACC-ADDR-ZIP X(10)
      group_id: rtrim(cut(l, 112, 122))             // LACC-GROUP-ID X(10); FILLER(178) dropped
    });
  }
}

// ---- LXV026Y TransactionCategoryBalance (50 bytes) ----
var balances = [];
if (isJsonList(input.balcat)) {
  var jb = JSON.parse(String(input.balcat));
  for (var i = 0; i < jb.length; i++) {
    balances.push({ acctKey: acctKey(jb[i].acct_id), type_cd: padLeft(rtrim(jb[i].type_cd), 2, '0'),
      cat_cd: padLeft(String(jb[i].cat_cd).trim(), 4, '0'), bal: decimalScaled(jb[i].bal, 2), seq: i });
  }
} else {
  var lb = lines(input.balcat);
  for (var i = 0; i < lb.length; i++) {
    var l = lb[i];
    balances.push({
      acctKey: acctKey(cut(l, 0, 11)),   // BCAT-LACC-ID 9(11)
      type_cd: cut(l, 11, 13),           // BCAT-TYPE-CD X(2)
      cat_cd: cut(l, 13, 17),            // BCAT-CD 9(4)
      bal: zoned(cut(l, 17, 28), 2),     // TXN-CAT-BAL S9(9)V99
      seq: i
    });
  }
}

// ---- LXV027Y DisclosureGroup (50 bytes) ----
var rates = [];
var lr = lines(input.rategrp);
for (var i = 0; i < lr.length; i++) {
  var l = lr[i];
  rates.push({
    group_id: rtrim(cut(l, 0, 10)),  // RG-LACC-GROUP-ID X(10)
    type_cd: cut(l, 10, 12),         // RG-TXN-TYPE-CD X(2)
    cat_cd: cut(l, 12, 16),          // RG-TXN-CAT-CD 9(4)
    rate: zoned(cut(l, 16, 22), 2)   // RG-INT-RATE S9(4)V99 (hundredths of a percent)
  });
}

// ---- LXV024Y CardXref (50 bytes) ----
var xrefs = [];
var lx = lines(input.cardlink);
for (var i = 0; i < lx.length; i++) {
  var l = lx[i];
  xrefs.push({
    card_num: rtrim(cut(l, 0, 16)),     // LINK-CRD-NUM X(16)
    acctKey: acctKey(cut(l, 25, 36))    // LINK-LACC-ID 9(11) (LINK-CLNT-ID 9(9) at 16-25 unused)
  });
}
if (xrefs.length === 0) warnings.push('cardlink is empty: interest transactions will carry a blank card number');

output.accounts = accounts;
output.balances = balances;
output.rates = rates;
output.xrefs = xrefs;
output.parseWarnings = warnings;
// Drop the raw file contents so they are not carried through the rest of the run.
output.ledgacc = null;
output.balcat = null;
output.rategrp = null;
output.cardlink = null;
