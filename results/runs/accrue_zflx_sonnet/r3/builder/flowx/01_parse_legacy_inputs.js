// SCRIPT node "Parse legacy inputs" — workflow accrue_interest_calculation (P-15 / LXB002C)
// Reads the fixed-width files (one record per line) passed in as whole-file strings and
// turns them into plain records. Amounts are kept as integer strings in units of the
// last implied decimal (cents for V99), so no floating point ever touches money.

function toLines(content) {
  var out = [];
  if (content === null || content === undefined) return out;
  var parts = String(content).replace(/\r/g, '').split('\n');
  for (var i = 0; i < parts.length; i++) {
    if (parts[i].replace(/\s+$/, '').length > 0) out.push(parts[i]);
  }
  return out;
}

// 1-based start, like the copybook offsets
function fld(rec, start, len) {
  var v = rec.substring(start - 1, start - 1 + len);
  while (v.length < len) v += ' ';
  return v;
}

function trim(s) { return String(s).replace(/^\s+/, '').replace(/\s+$/, ''); }

// Signed zoned decimal with trailing overpunch sign (S9(n)V99 DISPLAY):
// '{'/'A'-'I' = +0..+9, '}'/'J'-'R' = -0..-9; ASCII variant 'p'-'y' = -0..-9.
var POS = '{ABCDEFGHI';
var NEG = '}JKLMNOPQR';
var NEG_ASCII = 'pqrstuvwxy';
function zoned(raw) {
  var s = trim(raw);
  if (s.length === 0) return '0';
  var sign = '';
  if (s.charAt(0) === '-' || s.charAt(0) === '+') { if (s.charAt(0) === '-') sign = '-'; s = s.substring(1); }
  var last = s.charAt(s.length - 1);
  var body = s.substring(0, s.length - 1);
  var d;
  if (last >= '0' && last <= '9') { d = last; }
  else if (POS.indexOf(last) >= 0) { d = String(POS.indexOf(last)); }
  else if (NEG.indexOf(last) >= 0) { d = String(NEG.indexOf(last)); sign = '-'; }
  else if (NEG_ASCII.indexOf(last) >= 0) { d = String(NEG_ASCII.indexOf(last)); sign = '-'; }
  else if (last === '-') { d = ''; sign = '-'; }
  else if (last === '+') { d = ''; }
  else { throw new Error('Invalid zoned decimal: [' + raw + ']'); }
  var digits = (body + d).replace(/^0+/, '');
  if (!/^[0-9]*$/.test(digits)) throw new Error('Invalid zoned decimal: [' + raw + ']');
  if (digits.length === 0) return '0';
  return sign + digits;
}

// LXV022Y account record (300): ID 9(11), ACTIVE X(1), CURR-BAL S9(10)V99, CREDIT-LIMIT S9(10)V99,
// CASH-CREDIT-LIMIT S9(10)V99, OPEN X(10), EXPIRY X(10), REISSUE X(10), CYC-CREDIT S9(10)V99,
// CYC-DEBIT S9(10)V99, ADDR-ZIP X(10), GROUP-ID X(10), FILLER X(178)
var accounts = [];
var al = toLines(input.ledgaccDat);
for (var i = 0; i < al.length; i++) {
  var r = al[i];
  accounts.push({
    acctId: fld(r, 1, 11),
    activeStatus: fld(r, 12, 1),
    currBal: zoned(fld(r, 13, 12)),
    creditLimit: zoned(fld(r, 25, 12)),
    cashCreditLimit: zoned(fld(r, 37, 12)),
    openDate: fld(r, 49, 10),
    expiryDate: fld(r, 59, 10),
    reissueDate: fld(r, 69, 10),
    currCycCredit: zoned(fld(r, 79, 12)),
    currCycDebit: zoned(fld(r, 91, 12)),
    addrZip: fld(r, 103, 10),
    groupId: fld(r, 113, 10)
  });
}

// LXV026Y category balance (50): ACCT-ID 9(11), TYPE-CD X(2), CAT-CD 9(4), BAL S9(9)V99, FILLER X(22)
var balances = [];
var bl = toLines(input.balcatDat);
for (var j = 0; j < bl.length; j++) {
  var b = bl[j];
  balances.push({ acctId: fld(b, 1, 11), typeCd: fld(b, 12, 2), catCd: fld(b, 14, 4), bal: zoned(fld(b, 18, 11)) });
}

// LXV027Y disclosure group (50): GROUP-ID X(10), TYPE-CD X(2), CAT-CD 9(4), INT-RATE S9(4)V99, FILLER X(28)
var rates = [];
var rl = toLines(input.rategrpDat);
for (var k = 0; k < rl.length; k++) {
  var g = rl[k];
  rates.push({ groupId: fld(g, 1, 10), typeCd: fld(g, 11, 2), catCd: fld(g, 13, 4), rate: zoned(fld(g, 17, 6)) });
}

// LXV024Y card xref (50): CARD-NUM X(16), CUST-ID 9(9), ACCT-ID 9(11), FILLER X(14)
var xrefs = [];
var xl = toLines(input.cardlinkDat);
for (var m = 0; m < xl.length; m++) {
  var x = xl[m];
  xrefs.push({ cardNum: fld(x, 1, 16), custId: fld(x, 17, 9), acctId: fld(x, 26, 11) });
}

output.parsed = { accounts: accounts, balances: balances, rates: rates, xrefs: xrefs };
output.ledgaccDat = null;
output.balcatDat = null;
output.rategrpDat = null;
output.cardlinkDat = null;
