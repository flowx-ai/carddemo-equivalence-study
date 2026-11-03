// Node "Load Accounts" (LXB001C read + ACCRUE reference inputs).
// Parses the fixed-width input files into plain records and hands them on as JSON strings.
// Layouts: see assumptions.md (A-LAYOUT-*).
var warnings = [];

function lines(text) {
  if (text === null || text === undefined) return [];
  var parts = String(text).replace(/\r/g, '').split('\n');
  var out = [];
  for (var i = 0; i < parts.length; i++) {
    if (parts[i].replace(/\s+$/, '') !== '') out.push(parts[i]);
  }
  return out;
}

function fld(line, start, len) {
  var v = line.substring(start, start + len);
  while (v.length < len) v += ' ';
  return v;
}

function rtrim(s) { return s.replace(/\s+$/, ''); }

var OVER_POS = { '{': 0, 'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8, 'I': 9 };
var OVER_NEG = { '}': 0, 'J': 1, 'K': 2, 'L': 3, 'M': 4, 'N': 5, 'O': 6, 'P': 7, 'Q': 8, 'R': 9 };

// Signed zoned decimal (trailing overpunch) -> integer in units of 10^-scale.
// Also accepts an explicit sign / decimal point, in case a dump is display-edited.
function zoned(raw, scale, where) {
  var t = raw.replace(/^\s+|\s+$/g, '');
  if (t === '') return 0;
  var neg = false;
  var value;
  if (/[.+\-]/.test(t)) {
    var m = /^([+\-]?)(\d*)(?:\.(\d*))?([+\-]?)$/.exec(t);
    if (!m) { warnings.push('unparseable number "' + raw + '" at ' + where + '; taken as 0'); return 0; }
    neg = m[1] === '-' || m[4] === '-';
    if (m[3] === undefined) {
      value = parseInt(m[2] || '0', 10);
    } else {
      var fp = (m[3] + '0000000000').substring(0, scale);
      value = parseInt(m[2] || '0', 10) * Math.pow(10, scale) + parseInt(fp || '0', 10);
    }
  } else {
    var last = t.charAt(t.length - 1);
    var body = t.substring(0, t.length - 1);
    var d;
    if (/\d/.test(last)) d = last;
    else if (OVER_POS.hasOwnProperty(last)) d = String(OVER_POS[last]);
    else if (OVER_NEG.hasOwnProperty(last)) { d = String(OVER_NEG[last]); neg = true; }
    else { warnings.push('bad sign byte "' + raw + '" at ' + where + '; taken as 0'); return 0; }
    if (!/^\d*$/.test(body)) {
      warnings.push('non-digit in number "' + raw + '" at ' + where);
      body = body.replace(/\D/g, '');
    }
    value = parseInt(body + d, 10);
  }
  return neg && value !== 0 ? -value : value;
}

function unsigned(raw, where) {
  var t = raw.replace(/^\s+|\s+$/g, '');
  if (t === '') return 0;
  if (!/^\d+$/.test(t)) { warnings.push('non-numeric "' + raw + '" at ' + where); t = t.replace(/\D/g, '') || '0'; }
  return parseInt(t, 10);
}

// ledgacc.dat - LXV022Y, 300 bytes
var accounts = [];
var la = lines(input.ledgaccText);
for (var i = 0; i < la.length; i++) {
  var l = la[i], w = 'ledgacc line ' + (i + 1);
  accounts.push({
    acctId: unsigned(fld(l, 0, 11), w),
    acctIdRaw: fld(l, 0, 11),
    activeStatus: fld(l, 11, 1),
    currBal: zoned(fld(l, 12, 12), 2, w + ' curr_bal'),
    creditLimit: zoned(fld(l, 24, 12), 2, w + ' credit_limit'),
    cashCreditLimit: zoned(fld(l, 36, 12), 2, w + ' cash_credit_limit'),
    openDate: fld(l, 48, 10),
    expirationDate: fld(l, 58, 10),
    reissueDate: fld(l, 68, 10),
    currCycCredit: zoned(fld(l, 78, 12), 2, w + ' curr_cyc_credit'),
    currCycDebit: zoned(fld(l, 90, 12), 2, w + ' curr_cyc_debit'),
    addrZip: fld(l, 102, 10),
    groupId: fld(l, 112, 10)
  });
}

// balcat.dat - LXV026Y, 50 bytes
var balances = [];
var lb = lines(input.balcatText);
for (var j = 0; j < lb.length; j++) {
  var b = lb[j], wb = 'balcat line ' + (j + 1);
  balances.push({
    acctId: unsigned(fld(b, 0, 11), wb),
    typeCd: fld(b, 11, 2),
    catCd: unsigned(fld(b, 13, 4), wb),
    bal: zoned(fld(b, 17, 11), 2, wb + ' bal')
  });
}

// rategrp.dat - LXV027Y, 50 bytes (disclosure group rates)
var rates = [];
var lr = lines(input.rategrpText);
for (var k = 0; k < lr.length; k++) {
  var r = lr[k], wr = 'rategrp line ' + (k + 1);
  rates.push({
    groupId: fld(r, 0, 10),
    typeCd: fld(r, 10, 2),
    catCd: unsigned(fld(r, 12, 4), wr),
    rate: zoned(fld(r, 16, 6), 2, wr + ' rate')
  });
}

// cardlink.dat - LXV024Y, 50 bytes (card <-> customer <-> account)
var xrefs = [];
var lc = lines(input.cardlinkText);
for (var c = 0; c < lc.length; c++) {
  var x = lc[c];
  xrefs.push({
    cardNum: rtrim(fld(x, 0, 16)),
    custId: unsigned(fld(x, 16, 9), 'cardlink line ' + (c + 1)),
    acctId: unsigned(fld(x, 25, 11), 'cardlink line ' + (c + 1))
  });
}

// txncatg.dat - LXV029Y, 60 bytes (optional; used only to locate the interest category)
var categories = [];
var lt = lines(input.txncatgText);
for (var t = 0; t < lt.length; t++) {
  var g = lt[t];
  categories.push({
    typeCd: fld(g, 0, 2),
    catCd: unsigned(fld(g, 2, 4), 'txncatg line ' + (t + 1)),
    desc: rtrim(fld(g, 6, 50))
  });
}

output.accountsJson = JSON.stringify(accounts);
output.balancesJson = JSON.stringify(balances);
output.ratesJson = JSON.stringify(rates);
output.xrefsJson = JSON.stringify(xrefs);
output.categoriesJson = JSON.stringify(categories);
output.loadWarningsJson = JSON.stringify(warnings);
// Drop the raw file texts from workflow state so later nodes do not carry them.
output.ledgaccText = null;
output.balcatText = null;
output.rategrpText = null;
output.cardlinkText = null;
output.txncatgText = null;
