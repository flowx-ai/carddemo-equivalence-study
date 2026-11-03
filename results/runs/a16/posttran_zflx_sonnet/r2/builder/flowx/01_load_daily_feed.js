// Node "Load Daily Feed" — parses the fixed-width input images (one record per line)
// DALYTRAN (CVTRA06Y, 350), CARDXREF (CVACT03Y, 50), ACCTDAT (CVACT01Y, 300), TCATBALF (CVTRA01Y, 50).
// Amounts are kept as integer cents so posting arithmetic is exact (COBOL S9(n)V99).

var OVERPUNCH_POS = "{ABCDEFGHI";
var OVERPUNCH_NEG = "}JKLMNOPQR";
var OVERPUNCH_NEG_ASCII = "pqrstuvwxy";

function recordsOf(text, len) {
  if (text === null || text === undefined) return [];
  var all = String(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  var out = [];
  for (var i = 0; i < all.length; i++) {
    var l = all[i];
    if (l.trim() === "") continue;
    out.push(l.length < len ? l.padEnd(len, " ") : l);
  }
  return out;
}

function str(rec, start, len) {
  return rec.substring(start, start + len).replace(/\s+$/, "");
}

// Signed zoned decimal with 2 implied decimals -> integer cents.
function cents(rec, start, len) {
  var s = rec.substring(start, start + len).trim();
  if (s === "") return 0;
  var sign = 1;
  if (s.charAt(0) === "-") { sign = -1; s = s.substring(1); }
  else if (s.charAt(0) === "+") { s = s.substring(1); }
  var last = s.charAt(s.length - 1);
  var body = s.substring(0, s.length - 1);
  var k;
  if (last === "-") { sign = -1; s = body; }
  else if (last === "+") { s = body; }
  else if ((k = OVERPUNCH_POS.indexOf(last)) >= 0) { s = body + k; }
  else if ((k = OVERPUNCH_NEG.indexOf(last)) >= 0) { sign = -1; s = body + k; }
  else if ((k = OVERPUNCH_NEG_ASCII.indexOf(last)) >= 0) { sign = -1; s = body + k; }
  if (s.indexOf(".") >= 0) {
    var p = s.split(".");
    var whole = parseInt(p[0] === "" ? "0" : p[0], 10);
    var frac = parseInt((p[1] + "00").substring(0, 2), 10);
    if (isNaN(whole) || isNaN(frac)) return 0;
    return sign * (whole * 100 + frac) || 0;
  }
  s = s.replace(/ /g, "0");
  if (!/^[0-9]+$/.test(s)) return 0;
  return sign * parseInt(s, 10) || 0;
}

function num(rec, start, len) {
  var s = rec.substring(start, start + len).trim();
  if (!/^[0-9]+$/.test(s)) return 0;
  return parseInt(s, 10);
}

// Numeric account keys (9(11)) are compared by value.
function acctKey(raw) {
  var s = raw.trim();
  return /^[0-9]+$/.test(s) ? String(parseInt(s, 10)) : s;
}

var feed = recordsOf(input.dailytranFile, 350).map(function (r, i) {
  return {
    seq: i + 1,
    tranId: str(r, 0, 16),
    typeCd: str(r, 16, 2),
    catCd: num(r, 18, 4),
    source: str(r, 22, 10),
    desc: str(r, 32, 100),
    amt: cents(r, 132, 11),
    merchantId: num(r, 143, 9),
    merchantName: str(r, 152, 50),
    merchantCity: str(r, 202, 50),
    merchantZip: str(r, 252, 10),
    cardNum: str(r, 262, 16),
    origTs: str(r, 278, 26),
    procTs: str(r, 304, 26)
  };
});

var xrefs = recordsOf(input.cardxrefFile, 50).map(function (r) {
  return { cardNum: str(r, 0, 16), custId: num(r, 16, 9), acctKey: acctKey(r.substring(25, 36)), acctId: num(r, 25, 11) };
});

var accounts = recordsOf(input.acctdataFile, 300).map(function (r) {
  return {
    key: acctKey(r.substring(0, 11)),
    acctId: num(r, 0, 11),
    activeStatus: str(r, 11, 1),
    currBal: cents(r, 12, 12),
    creditLimit: cents(r, 24, 12),
    cashCreditLimit: cents(r, 36, 12),
    openDate: str(r, 48, 10),
    expirationDate: str(r, 58, 10),
    reissueDate: str(r, 68, 10),
    cycCredit: cents(r, 78, 12),
    cycDebit: cents(r, 90, 12),
    addrZip: str(r, 102, 10),
    groupId: str(r, 112, 10)
  };
});

var tcatbals = recordsOf(input.tcatbalFile, 50).map(function (r) {
  return { acctKey: acctKey(r.substring(0, 11)), acctId: num(r, 0, 11), typeCd: str(r, 11, 2), catCd: num(r, 13, 4), bal: cents(r, 17, 11) };
});

output.feed = JSON.stringify(feed);
output.refData = JSON.stringify({ xrefs: xrefs, accounts: accounts, tcatbals: tcatbals });
// raw images are no longer needed downstream; drop them so they do not ride along in every node payload
output.dailytranFile = null;
output.cardxrefFile = null;
output.acctdataFile = null;
output.tcatbalFile = null;
