// Parse fixed-width input files (one record per line) into plain records.
// Signed numeric fields (PIC S9(n)V99) are zoned decimal with the sign
// over-punched on the last digit; values are carried as integer strings in
// minor units (cents for amounts, hundredths of a percent for rates).

function toLines(s) {
  if (s === null || s === undefined) return [];
  var parts = String(s).split(/\r?\n/);
  var out = [];
  for (var i = 0; i < parts.length; i++) {
    if (parts[i].replace(/\s+$/, '').length > 0) out.push(parts[i]);
  }
  return out;
}

function padTo(l, n) {
  while (l.length < n) l += ' ';
  return l;
}

function rtrim(s) {
  return String(s).replace(/\s+$/, '');
}

var POS_OVERPUNCH = { '{': '0', 'A': '1', 'B': '2', 'C': '3', 'D': '4', 'E': '5', 'F': '6', 'G': '7', 'H': '8', 'I': '9' };
var NEG_OVERPUNCH = { '}': '0', 'J': '1', 'K': '2', 'L': '3', 'M': '4', 'N': '5', 'O': '6', 'P': '7', 'Q': '8', 'R': '9',
                      'p': '0', 'q': '1', 'r': '2', 's': '3', 't': '4', 'u': '5', 'v': '6', 'w': '7', 'x': '8', 'y': '9' };

// Returns the value in minor units (implied 2 decimals) as an integer string.
function zoned2(raw, what) {
  var s = String(raw).replace(/^\s+|\s+$/g, '');
  if (s.length === 0) return '0';
  var neg = false;
  if (s.charAt(0) === '-' || s.charAt(0) === '+') { neg = s.charAt(0) === '-'; s = s.substr(1); }
  if (s.length && (s.charAt(s.length - 1) === '-' || s.charAt(s.length - 1) === '+')) {
    neg = neg || s.charAt(s.length - 1) === '-'; s = s.substr(0, s.length - 1);
  }
  var digits;
  if (s.indexOf('.') >= 0) {
    // tolerate an explicit decimal point (edited dump)
    var p = s.split('.');
    digits = p[0] + ((p[1] || '') + '00').substr(0, 2);
  } else {
    var last = s.charAt(s.length - 1);
    if (POS_OVERPUNCH.hasOwnProperty(last)) { s = s.substr(0, s.length - 1) + POS_OVERPUNCH[last]; }
    else if (NEG_OVERPUNCH.hasOwnProperty(last)) { s = s.substr(0, s.length - 1) + NEG_OVERPUNCH[last]; neg = true; }
    digits = s;
  }
  digits = digits.replace(/ /g, '0');
  if (!/^[0-9]+$/.test(digits)) throw new Error('Bad numeric field ' + what + ': [' + raw + ']');
  digits = digits.replace(/^0+/, '');
  if (digits === '') return '0';
  return (neg ? '-' : '') + digits;
}

function unsignedInt(raw, what) {
  var s = String(raw).replace(/^\s+|\s+$/g, '');
  if (s === '') return 0;
  if (!/^[0-9]+$/.test(s)) throw new Error('Bad numeric field ' + what + ': [' + raw + ']');
  return parseInt(s, 10);
}

// LXV022Y ACCOUNT-RECORD (300)
var accounts = [];
var al = toLines(input.ledgacc);
for (var i = 0; i < al.length; i++) {
  var l = padTo(al[i], 300);
  accounts.push({
    acct_id: unsignedInt(l.substr(0, 11), 'LACC-ID'),
    active_status: rtrim(l.substr(11, 1)),
    curr_bal: zoned2(l.substr(12, 12), 'LACC-CURR-BAL'),
    credit_limit: zoned2(l.substr(24, 12), 'LACC-CREDIT-LIMIT'),
    cash_credit_limit: zoned2(l.substr(36, 12), 'LACC-CASH-CREDIT-LIMIT'),
    open_date: rtrim(l.substr(48, 10)),
    expiration_date: rtrim(l.substr(58, 10)),
    reissue_date: rtrim(l.substr(68, 10)),
    curr_cyc_credit: zoned2(l.substr(78, 12), 'LACC-CURR-CYC-CREDIT'),
    curr_cyc_debit: zoned2(l.substr(90, 12), 'LACC-CURR-CYC-DEBIT'),
    addr_zip: rtrim(l.substr(102, 10)),
    group_id: rtrim(l.substr(112, 10))
  });
}

// LXV026Y TXN-CAT-BAL-RECORD (50)
var balances = [];
var bl = toLines(input.balcat);
for (var j = 0; j < bl.length; j++) {
  var b = padTo(bl[j], 50);
  balances.push({
    acct_id: unsignedInt(b.substr(0, 11), 'BCAT-LACC-ID'),
    type_cd: b.substr(11, 2),
    cat_cd: unsignedInt(b.substr(13, 4), 'BCAT-CD'),
    bal: zoned2(b.substr(17, 11), 'TXN-CAT-BAL')
  });
}

// LXV027Y RG-GROUP-RECORD (50)
var rates = [];
var rl = toLines(input.rategrp);
for (var k = 0; k < rl.length; k++) {
  var r = padTo(rl[k], 50);
  rates.push({
    group_id: rtrim(r.substr(0, 10)),
    type_cd: r.substr(10, 2),
    cat_cd: unsignedInt(r.substr(12, 4), 'RG-TXN-CAT-CD'),
    rate: zoned2(r.substr(16, 6), 'RG-INT-RATE')
  });
}

// LXV024Y CRD-LINK-RECORD (50)
var cards = [];
var cl = toLines(input.cardlink);
for (var m = 0; m < cl.length; m++) {
  var c = padTo(cl[m], 50);
  cards.push({
    card_num: rtrim(c.substr(0, 16)),
    acct_id: unsignedInt(c.substr(25, 11), 'LINK-LACC-ID')
  });
}

output.parsed = { accounts: accounts, balances: balances, rates: rates, cards: cards };
// drop the raw file contents so they are not carried through the rest of the run
output.ledgacc = null;
output.balcat = null;
output.rategrp = null;
output.cardlink = null;
