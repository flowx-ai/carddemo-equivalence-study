// Parse the fixed-width ACCRUE inputs (copybooks LXV022Y, LXV024Y, LXV026Y, LXV027Y).
// Amounts are kept as integers in units of their implied decimals (cents for V99).

function lines(text) {
  if (text === null || text === undefined) return [];
  var out = [];
  var parts = String(text).split(/\r?\n/);
  for (var i = 0; i < parts.length; i++) {
    if (parts[i].replace(/\s+/g, '').length > 0) out.push(parts[i]);
  }
  return out;
}

function pad(s, n) {
  while (s.length < n) s += ' ';
  return s;
}

function rtrim(s) {
  return s.replace(/\s+$/, '');
}

// Signed zoned decimal (DISPLAY). Accepts EBCDIC-style overpunch ({A-I / }J-R),
// GnuCOBOL ASCII overpunch (p-y negative), or an explicit leading/trailing sign.
function zoned(field) {
  var s = field.replace(/^\s+|\s+$/g, '');
  if (s.length === 0) return 0;
  var neg = false;
  if (s.charAt(0) === '-' || s.charAt(0) === '+') { neg = s.charAt(0) === '-'; s = s.substring(1); }
  if (s.length > 0 && (s.charAt(s.length - 1) === '-' || s.charAt(s.length - 1) === '+')) {
    neg = s.charAt(s.length - 1) === '-'; s = s.substring(0, s.length - 1);
  }
  var last = s.charAt(s.length - 1);
  var pos = '{ABCDEFGHI'.indexOf(last);
  var ng = '}JKLMNOPQR'.indexOf(last);
  var asc = 'pqrstuvwxy'.indexOf(last);
  if (pos >= 0) { s = s.substring(0, s.length - 1) + pos; }
  else if (ng >= 0) { s = s.substring(0, s.length - 1) + ng; neg = true; }
  else if (asc >= 0) { s = s.substring(0, s.length - 1) + asc; neg = true; }
  s = s.replace(/[^0-9]/g, '');
  var v = s.length ? parseInt(s, 10) : 0;
  return neg ? -v : v;
}

function num(field) {
  var s = field.replace(/[^0-9]/g, '');
  return s.length ? parseInt(s, 10) : 0;
}

var accounts = [];
var accLines = lines(input.ledgacc);
for (var i = 0; i < accLines.length; i++) {
  var r = pad(accLines[i], 300);
  accounts.push({
    acct_id: num(r.substring(0, 11)),
    active_status: rtrim(r.substring(11, 12)),
    curr_bal: zoned(r.substring(12, 24)),
    credit_limit: zoned(r.substring(24, 36)),
    cash_credit_limit: zoned(r.substring(36, 48)),
    open_date: rtrim(r.substring(48, 58)),
    expiration_date: rtrim(r.substring(58, 68)),
    reissue_date: rtrim(r.substring(68, 78)),
    curr_cyc_credit: zoned(r.substring(78, 90)),
    curr_cyc_debit: zoned(r.substring(90, 102)),
    addr_zip: rtrim(r.substring(102, 112)),
    group_id: rtrim(r.substring(112, 122))
  });
}

var xrefs = [];
var xLines = lines(input.cardlink);
for (var i = 0; i < xLines.length; i++) {
  var r = pad(xLines[i], 50);
  xrefs.push({ card_num: rtrim(r.substring(0, 16)), acct_id: num(r.substring(25, 36)) });
}

var balances = [];
var bLines = lines(input.balcat);
for (var i = 0; i < bLines.length; i++) {
  var r = pad(bLines[i], 50);
  balances.push({
    acct_id: num(r.substring(0, 11)),
    type_cd: r.substring(11, 13),
    cat_cd: num(r.substring(13, 17)),
    bal: zoned(r.substring(17, 28))
  });
}

var rates = [];
var gLines = lines(input.rategrp);
for (var i = 0; i < gLines.length; i++) {
  var r = pad(gLines[i], 50);
  rates.push({
    group_id: rtrim(r.substring(0, 10)),
    type_cd: r.substring(10, 12),
    cat_cd: num(r.substring(12, 16)),
    rate: zoned(r.substring(16, 22))
  });
}

// Handed on as a JSON string: a nested value read back through input.* is a foreign
// object in the next SCRIPT node, a string round-trips without surprises.
output.parsedJson = JSON.stringify({ accounts: accounts, xrefs: xrefs, balances: balances, rates: rates });
