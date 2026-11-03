// SCRIPT node "Get Account, Type and Category Names" — BR-03
// Enriches each selected transaction with the account id (cardxref.dat, CVACT03Y), the type
// description (trantype.dat, CVTRA03Y) and the category description (trancatg.dat, CVTRA04Y).
// An unknown reference is flagged in referenceErrors and the run continues (AC-5).

function toText(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (v.length !== undefined && typeof v !== 'string') {
    var parts = [];
    for (var i = 0; i < v.length; i++) parts.push(String(v[i]));
    return parts.join('\n');
  }
  return String(v);
}

function padRight(s, n) {
  s = s === null || s === undefined ? '' : String(s);
  while (s.length < n) s += ' ';
  return s.substring(0, n);
}

function records(v, len) {
  var out = [];
  var ls = toText(v).split(/\r?\n/);
  for (var i = 0; i < ls.length; i++) if (ls[i].trim() !== '') out.push(padRight(ls[i], len));
  return out;
}

var xref = {};
records(input.cardxref, 50).forEach(function (r) {
  var card = r.substring(0, 16);
  if (!(card in xref)) xref[card] = r.substring(25, 36); // XREF-ACCT-ID 9(11)
});
var types = {};
records(input.trantype, 60).forEach(function (r) { types[r.substring(0, 2)] = r.substring(2, 52); });
var cats = {};
records(input.trancatg, 60).forEach(function (r) {
  cats[r.substring(0, 2) + '|' + parseInt(r.substring(2, 6), 10)] = r.substring(6, 56);
});

var errors = [];
var src = input.selectedTransactions || [];
var lines = [];
for (var i = 0; i < src.length; i++) {
  var t = src[i];
  var cardNum = String(t.cardNum), typeCd = String(t.typeCd), catCd = String(t.catCd);
  var acct = xref[cardNum];
  if (acct === undefined) {
    errors.push({ tranId: String(t.tranId), key: cardNum, reason: 'CARD NOT FOUND IN XREF' });
    acct = '';
  }
  var typeDesc = types[typeCd];
  if (typeDesc === undefined) {
    errors.push({ tranId: String(t.tranId), key: typeCd, reason: 'TRANSACTION TYPE NOT FOUND' });
    typeDesc = '';
  }
  var catDesc = cats[typeCd + '|' + parseInt(catCd, 10)];
  if (catDesc === undefined) {
    errors.push({ tranId: String(t.tranId), key: typeCd + catCd, reason: 'TRANSACTION CATEGORY NOT FOUND' });
    catDesc = '';
  }
  lines.push({
    tranId: String(t.tranId),
    accountId: acct,
    cardNum: cardNum,
    typeCd: typeCd,
    typeDesc: typeDesc,
    catCd: catCd,
    catDesc: catDesc,
    source: String(t.source),
    amountCents: Number(t.amountCents)
  });
}

output.reportLines = lines;
output.referenceErrors = errors;
output.selectedTransactions = null;
output.cardxref = null;
output.trantype = null;
output.trancatg = null;
