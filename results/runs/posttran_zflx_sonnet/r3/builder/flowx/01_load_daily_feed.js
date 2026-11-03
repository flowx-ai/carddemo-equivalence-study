// SCRIPT node "Load Daily Feed" (legacy: OPEN + sequential/VSAM reads in CBTRN02C).
// Parses the fixed-width images (one record per line, copybook layouts) into plain objects.
// Amounts are carried as integer cents to avoid floating-point drift.

function padRight(s, n) {
  s = (s === null || s === undefined) ? '' : String(s);
  while (s.length < n) s += ' ';
  return s;
}

function rtrim(s) { return String(s).replace(/\s+$/, ''); }

function fileLines(txt, len) {
  var out = [];
  if (txt === null || txt === undefined) return out;
  var arr = String(txt).split(/\r?\n/);
  for (var i = 0; i < arr.length; i++) {
    if (rtrim(arr[i]) === '') continue;
    out.push(padRight(arr[i], len));
  }
  return out;
}

// Zoned decimal PIC S9(n)V99 (ASCII overpunch on the last digit) -> integer cents.
// Also tolerates a separate leading/trailing sign or an explicit decimal point.
function zonedCents(raw) {
  var s = String(raw).trim();
  if (s === '') return 0;
  var neg = false;
  if (s.charAt(0) === '-') { neg = true; s = s.substring(1); }
  else if (s.charAt(0) === '+') { s = s.substring(1); }
  var last = s.charAt(s.length - 1);
  var body = s.substring(0, s.length - 1);
  var POS = '{ABCDEFGHI', NEG = '}JKLMNOPQR', NEGL = 'pqrstuvwxy';
  var d;
  if (last >= '0' && last <= '9') d = last;
  else if (POS.indexOf(last) >= 0) d = String(POS.indexOf(last));
  else if (NEG.indexOf(last) >= 0) { d = String(NEG.indexOf(last)); neg = true; }
  else if (NEGL.indexOf(last) >= 0) { d = String(NEGL.indexOf(last)); neg = true; }
  else if (last === '-') { d = ''; neg = true; }
  else { d = ''; }
  var t = body + d;
  var cents;
  if (t.indexOf('.') >= 0) {
    cents = Math.round(parseFloat(t.replace(/[^0-9.]/g, '')) * 100);
  } else {
    var digits = t.replace(/[^0-9]/g, '');
    cents = digits === '' ? 0 : parseInt(digits, 10);
  }
  if (isNaN(cents)) cents = 0;
  return neg ? -cents : cents;
}

function num(raw) {
  var d = String(raw).replace(/[^0-9]/g, '');
  return d === '' ? 0 : parseInt(d, 10);
}

// CVTRA06Y DALYTRAN-RECORD (350)
function parseTran(l) {
  return {
    id: rtrim(l.substring(0, 16)),
    typeCd: l.substring(16, 18),
    catCd: num(l.substring(18, 22)),
    source: rtrim(l.substring(22, 32)),
    desc: rtrim(l.substring(32, 132)),
    amt: zonedCents(l.substring(132, 143)),
    merchantId: num(l.substring(143, 152)),
    merchantName: rtrim(l.substring(152, 202)),
    merchantCity: rtrim(l.substring(202, 252)),
    merchantZip: rtrim(l.substring(252, 262)),
    cardNum: rtrim(l.substring(262, 278)),
    origTs: rtrim(l.substring(278, 304)),
    procTs: rtrim(l.substring(304, 330))
  };
}

// CVACT01Y ACCOUNT-RECORD (300)
function parseAcct(l) {
  return {
    acctId: num(l.substring(0, 11)),
    activeStatus: rtrim(l.substring(11, 12)),
    currBal: zonedCents(l.substring(12, 24)),
    creditLimit: zonedCents(l.substring(24, 36)),
    cashCreditLimit: zonedCents(l.substring(36, 48)),
    openDate: rtrim(l.substring(48, 58)),
    expirationDate: rtrim(l.substring(58, 68)),
    reissueDate: rtrim(l.substring(68, 78)),
    currCycCredit: zonedCents(l.substring(78, 90)),
    currCycDebit: zonedCents(l.substring(90, 102)),
    addrZip: rtrim(l.substring(102, 112)),
    groupId: rtrim(l.substring(112, 122))
  };
}

// CVACT03Y CARD-XREF-RECORD (50)
function parseXref(l) {
  return {
    cardNum: rtrim(l.substring(0, 16)),
    custId: num(l.substring(16, 25)),
    acctId: num(l.substring(25, 36))
  };
}

// CVTRA01Y TRAN-CAT-BAL-RECORD (50)
function parseTcat(l) {
  return {
    acctId: num(l.substring(0, 11)),
    typeCd: l.substring(11, 13),
    catCd: num(l.substring(13, 17)),
    bal: zonedCents(l.substring(17, 28))
  };
}

var dl = fileLines(input.dailytranFile, 350);
var al = fileLines(input.acctdataFile, 300);
var xl = fileLines(input.cardxrefFile, 50);
var tl = fileLines(input.tcatbalFile, 50);

var feed = [], accounts = [], xrefs = [], tcatbals = [], i;
for (i = 0; i < dl.length; i++) feed.push(parseTran(dl[i]));
for (i = 0; i < al.length; i++) accounts.push(parseAcct(al[i]));
for (i = 0; i < xl.length; i++) xrefs.push(parseXref(xl[i]));
for (i = 0; i < tl.length; i++) tcatbals.push(parseTcat(tl[i]));

output.feed = { records: feed, recordCount: feed.length };
output.accounts = accounts;
output.xrefs = xrefs;
output.tcatbals = tcatbals;
// raw images are no longer needed: drop them so later nodes stay under the script payload cap
output.dailytranFile = null;
output.acctdataFile = null;
output.cardxrefFile = null;
output.tcatbalFile = null;
