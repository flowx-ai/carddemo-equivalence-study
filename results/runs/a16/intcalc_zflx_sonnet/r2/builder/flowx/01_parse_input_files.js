// SCRIPT node "Parse input files" — workflow intcalc_interest_calculation.
// Parses the fixed-width INTCALC inputs (copybook layouts, one record per line).
// Monetary fields are kept as integer cents (Number) to avoid float drift.

function recordLines(text) {
  if (text === null || text === undefined) return [];
  return String(text).split(/\r?\n/).filter(function (l) {
    return l.replace(/\s+$/, '').length > 0;
  });
}

function padTo(line, len) {
  while (line.length < len) line += ' ';
  return line;
}

function rtrim(s) {
  return String(s).replace(/\s+$/, '');
}

// Signed zoned decimal (COBOL S9(n)V99, trailing overpunch: '{'..'I' = +0..9, '}'..'R' = -0..9)
// -> integer count of hundredths. Also tolerates a plain "-123.45" / "+12345" rendering.
var OVP_POS = '{ABCDEFGHI';
var OVP_NEG = '}JKLMNOPQR';
function zonedCents(raw, scale) {
  var s = String(raw).trim();
  if (s.length === 0) return 0;
  if (s.indexOf('.') >= 0) {
    var f = parseFloat(s);
    return Math.round(f * 100);
  }
  var neg = false;
  if (s.charAt(0) === '-') { neg = true; s = s.substring(1); }
  else if (s.charAt(0) === '+') { s = s.substring(1); }
  var last = s.charAt(s.length - 1);
  var p = OVP_POS.indexOf(last);
  var n = OVP_NEG.indexOf(last);
  if (p >= 0) { s = s.substring(0, s.length - 1) + p; }
  else if (n >= 0) { s = s.substring(0, s.length - 1) + n; neg = true; }
  var v = parseInt(s.replace(/[^0-9]/g, '') || '0', 10);
  // all layouts used here have exactly 2 implied decimals
  return neg ? -v : v;
}

// CVACT01Y — ACCOUNT-RECORD (300)
function parseAccount(l) {
  l = padTo(l, 300);
  return {
    acctId: l.substr(0, 11),
    activeStatus: l.substr(11, 1),
    currBal: zonedCents(l.substr(12, 12)),
    creditLimit: zonedCents(l.substr(24, 12)),
    cashCreditLimit: zonedCents(l.substr(36, 12)),
    openDate: rtrim(l.substr(48, 10)),
    expirationDate: rtrim(l.substr(58, 10)),
    reissueDate: rtrim(l.substr(68, 10)),
    currCycCredit: zonedCents(l.substr(78, 12)),
    currCycDebit: zonedCents(l.substr(90, 12)),
    addrZip: rtrim(l.substr(102, 10)),
    groupId: rtrim(l.substr(112, 10))
  };
}

// CVTRA01Y — TRAN-CAT-BAL-RECORD (50)
function parseCategoryBalance(l) {
  l = padTo(l, 50);
  return {
    acctId: l.substr(0, 11),
    typeCd: l.substr(11, 2),
    catCd: l.substr(13, 4),
    bal: zonedCents(l.substr(17, 11))
  };
}

// CVTRA02Y — DIS-GROUP-RECORD (50)
function parseDisclosureGroup(l) {
  l = padTo(l, 50);
  return {
    groupId: rtrim(l.substr(0, 10)),
    typeCd: l.substr(10, 2),
    catCd: l.substr(12, 4),
    rate: zonedCents(l.substr(16, 6))
  };
}

// CVACT03Y — CARD-XREF-RECORD (50)
function parseXref(l) {
  l = padTo(l, 50);
  return {
    cardNum: rtrim(l.substr(0, 16)),
    custId: l.substr(16, 9),
    acctId: l.substr(25, 11)
  };
}

output.accounts = recordLines(input.acctdataFile).map(parseAccount);
output.categoryBalances = recordLines(input.tcatbalFile).map(parseCategoryBalance);
output.disclosureGroups = recordLines(input.discgrpFile).map(parseDisclosureGroup);
output.cardXrefs = recordLines(input.cardxrefFile).map(parseXref);
