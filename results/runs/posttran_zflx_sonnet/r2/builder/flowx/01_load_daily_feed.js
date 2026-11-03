// Load Daily Feed (legacy DALYTRAN-FILE, XREF-FILE, ACCOUNT-FILE, TCATBAL-FILE opens + reads).
// Parses the fixed-width input files (one record per line, copybook layouts) into records.
// Signed zoned fields (S9(n)V99) are kept as integer cents.

var POS_OVERPUNCH = '{ABCDEFGHI';
var NEG_OVERPUNCH = '}JKLMNOPQR';
var NEG_ASCII_ZONED = 'pqrstuvwxy';
var warnings = [];

function toLines(text) {
  if (text === null || text === undefined) return [];
  var parts = String(text).replace(/\r\n?/g, '\n').split('\n');
  var out = [];
  for (var i = 0; i < parts.length; i++) {
    if (parts[i].replace(/\s+$/, '').length > 0) out.push(parts[i]);
  }
  return out;
}

function padTo(line, len) {
  while (line.length < len) line += ' ';
  return line;
}

function cut(rec, start, len) {
  return rec.substr(start, len);
}

// Signed zoned decimal with 2 implied decimals -> integer cents.
function zonedCents(raw, where) {
  var s = String(raw).trim();
  if (s.length === 0) return 0;
  var neg = false;
  if (s.charAt(0) === '-' || s.charAt(0) === '+') { neg = s.charAt(0) === '-'; s = s.substr(1); }
  var last = s.charAt(s.length - 1);
  if (last === '-' || last === '+') { neg = last === '-'; s = s.substr(0, s.length - 1); last = s.charAt(s.length - 1); }
  var d = POS_OVERPUNCH.indexOf(last);
  if (d >= 0) {
    s = s.substr(0, s.length - 1) + d;
  } else if ((d = NEG_OVERPUNCH.indexOf(last)) >= 0) {
    neg = true; s = s.substr(0, s.length - 1) + d;
  } else if ((d = NEG_ASCII_ZONED.indexOf(last)) >= 0) {
    neg = true; s = s.substr(0, s.length - 1) + d;
  }
  var cents;
  if (s.indexOf('.') >= 0) cents = Math.round(parseFloat(s) * 100);
  else cents = parseInt(s, 10);
  if (isNaN(cents)) { warnings.push('non-numeric amount "' + raw + '" in ' + where + ', read as 0'); cents = 0; }
  return (neg && cents !== 0) ? -cents : cents;
}

// CVTRA06Y DALYTRAN-RECORD, 350 bytes
function parseDaily(line, idx) {
  var r = padTo(line, 350);
  return {
    index: idx,
    image: r.substr(0, 350),
    tranId: cut(r, 0, 16),
    typeCd: cut(r, 16, 2),
    catCd: cut(r, 18, 4),
    source: cut(r, 22, 10),
    desc: cut(r, 32, 100),
    amtCents: zonedCents(cut(r, 132, 11), 'dailytran record ' + (idx + 1)),
    merchantId: cut(r, 143, 9),
    merchantName: cut(r, 152, 50),
    merchantCity: cut(r, 202, 50),
    merchantZip: cut(r, 252, 10),
    cardNum: cut(r, 262, 16),
    origTs: cut(r, 278, 26),
    procTs: cut(r, 304, 26)
  };
}

// CVACT01Y ACCOUNT-RECORD, 300 bytes
function parseAccount(line, idx) {
  var r = padTo(line, 300);
  var w = 'acctdata record ' + (idx + 1);
  return {
    acctId: cut(r, 0, 11),
    activeStatus: cut(r, 11, 1),
    currBal: zonedCents(cut(r, 12, 12), w),
    creditLimit: zonedCents(cut(r, 24, 12), w),
    cashCreditLimit: zonedCents(cut(r, 36, 12), w),
    openDate: cut(r, 48, 10),
    expiryDate: cut(r, 58, 10),
    reissueDate: cut(r, 68, 10),
    currCycCredit: zonedCents(cut(r, 78, 12), w),
    currCycDebit: zonedCents(cut(r, 90, 12), w),
    addrZip: cut(r, 102, 10),
    groupId: cut(r, 112, 10)
  };
}

// CVACT03Y CARD-XREF-RECORD, 50 bytes
function parseXref(line) {
  var r = padTo(line, 50);
  return { cardNum: cut(r, 0, 16), custId: cut(r, 16, 9), acctId: cut(r, 25, 11) };
}

// CVTRA01Y TRAN-CAT-BAL-RECORD, 50 bytes
function parseTcatbal(line, idx) {
  var r = padTo(line, 50);
  return {
    acctId: cut(r, 0, 11),
    typeCd: cut(r, 11, 2),
    catCd: cut(r, 13, 4),
    balCents: zonedCents(cut(r, 17, 11), 'tcatbal record ' + (idx + 1))
  };
}

function parseAll(text, fn) {
  var ls = toLines(text);
  var out = [];
  for (var i = 0; i < ls.length; i++) out.push(fn(ls[i], i));
  return out;
}

var records = parseAll(input.dailytran, parseDaily);
output.feed = {
  batchId: input.batchId ? String(input.batchId) : null,
  businessDate: input.businessDate ? String(input.businessDate) : null,
  recordCount: records.length,
  records: records
};
output.master = {
  accounts: parseAll(input.acctdata, parseAccount),
  xrefs: parseAll(input.cardxref, parseXref),
  categoryBalances: parseAll(input.tcatbal, parseTcatbal)
};
output.loadWarnings = warnings;
// The raw file text is no longer needed downstream.
output.dailytran = null;
output.acctdata = null;
output.cardxref = null;
output.tcatbal = null;
