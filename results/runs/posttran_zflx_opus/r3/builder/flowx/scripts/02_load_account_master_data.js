// Node: Load Account Master Data  (wiki node 4 "Fetch Account" — legacy READ ACCTFILE / XREFFILE / TCATBALF)
// Parses the master files once so the posting loop can look up accounts by key:
//   acctdata.dat  CVACT01Y 300 bytes   cardxref.dat CVACT03Y 50 bytes
//   carddata.dat  CVACT02Y 150 bytes   tcatbal.dat  CVTRA01Y 50 bytes
function records(text, len) {
  var out = [];
  if (text === null || text === undefined) return out;
  var parts = String(text).split('\n');
  for (var i = 0; i < parts.length; i++) {
    var l = parts[i].replace(/\r$/, '');
    if (l.replace(/\s+$/, '').length === 0) continue;
    while (l.length < len) l += ' ';
    out.push(l);
  }
  return out;
}
function str(r, from, to) { return r.substring(from, to).replace(/\s+$/, ''); }
function intField(r, from, to) {
  var s = r.substring(from, to).trim();
  return /^[0-9]+$/.test(s) ? parseInt(s, 10) : 0;
}
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

// Accounts — kept in file order (the output lists every account).
var accounts = [];
var acctLines = records(input.acctdata, 300);
for (var i = 0; i < acctLines.length; i++) {
  var a = acctLines[i];
  accounts.push({
    acctId: intField(a, 0, 11),
    activeStatus: str(a, 11, 12),
    currBalCents: cents(a.substring(12, 24)),
    creditLimitCents: cents(a.substring(24, 36)),
    cashCreditLimitCents: cents(a.substring(36, 48)),
    openDate: str(a, 48, 58),
    expirationDate: str(a, 58, 68),
    reissueDate: str(a, 68, 78),
    currCycCreditCents: cents(a.substring(78, 90)),
    currCycDebitCents: cents(a.substring(90, 102)),
    addrZip: str(a, 102, 112),
    groupId: str(a, 112, 122)
  });
}

// Card -> account cross reference (keyed by card number).
var xref = {};
var xrefLines = records(input.cardxref, 50);
for (var j = 0; j < xrefLines.length; j++) {
  var x = xrefLines[j];
  xref[str(x, 0, 16)] = { custId: intField(x, 16, 25), acctId: intField(x, 25, 36) };
}

// Cards (only the status is used, for the wiki's "card active" check).
var cards = {};
var cardLines = records(input.carddata, 150);
for (var k = 0; k < cardLines.length; k++) {
  var c = cardLines[k];
  cards[str(c, 0, 16)] = { acctId: intField(c, 16, 27), activeStatus: str(c, 90, 91) };
}

// Category balances.
var tcat = [];
var tcatLines = records(input.tcatbal, 50);
for (var m = 0; m < tcatLines.length; m++) {
  var t = tcatLines[m];
  tcat.push({
    acctId: intField(t, 0, 11),
    typeCd: str(t, 11, 13),
    catCd: intField(t, 13, 17),
    balCents: cents(t.substring(17, 28))
  });
}

output.accountsJson = JSON.stringify(accounts);
output.xrefJson = JSON.stringify(xref);
output.cardsJson = JSON.stringify(cards);
output.categoryBalancesJson = JSON.stringify(tcat);
output.cardsLoaded = cardLines.length;
output.acctdata = null;
output.cardxref = null;
output.carddata = null;
output.tcatbal = null;
