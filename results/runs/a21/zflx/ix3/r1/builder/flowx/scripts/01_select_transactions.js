// SCRIPT node "Select Transactions in Range" — BR-01, BR-02, BR-05, BR-07
// Reads transact.dat (CVTRA05Y, 350 bytes) and keeps the transactions whose processed date
// (TRAN-PROC-TS, positions 305-314) lies in [startDate, endDate], drops interest postings
// (type 01 / category 0005) and sorts the rest by card number (stable).

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

function normDate(v, dflt) {
  var s = v === null || v === undefined ? '' : String(v).trim();
  if (s === '') return dflt;
  if (/^\d{8}$/.test(s)) return s.substring(0, 4) + '-' + s.substring(4, 6) + '-' + s.substring(6, 8);
  return s.substring(0, 10);
}

// TRAN-AMT S9(9)V99: zoned decimal, sign overpunched on the last digit; also accepts an explicit
// leading/trailing sign or a decimal point. Returns integer cents.
function parseAmount(raw) {
  var s = String(raw).trim();
  if (s === '') return 0;
  var sign = 1;
  if (s.charAt(0) === '-' || s.charAt(0) === '+') { if (s.charAt(0) === '-') sign = -1; s = s.substring(1); }
  var lastCh = s.charAt(s.length - 1);
  if (lastCh === '-' || lastCh === '+') { if (lastCh === '-') sign = -1; s = s.substring(0, s.length - 1); lastCh = s.charAt(s.length - 1); }
  var pos = '{ABCDEFGHI', neg = '}JKLMNOPQR';
  if (pos.indexOf(lastCh) >= 0) s = s.substring(0, s.length - 1) + pos.indexOf(lastCh);
  else if (neg.indexOf(lastCh) >= 0) { s = s.substring(0, s.length - 1) + neg.indexOf(lastCh); sign = -sign; }
  s = s.replace(/\s/g, '');
  var cents;
  if (s.indexOf('.') >= 0) {
    var p = s.split('.');
    cents = parseInt(p[0] || '0', 10) * 100 + parseInt(((p[1] || '') + '00').substring(0, 2), 10);
  } else {
    cents = parseInt(s || '0', 10); // implied V99
  }
  if (isNaN(cents)) cents = 0;
  return sign * cents;
}

var DEFAULT_START = '2022-01-01'; // BR-05 reportStartDate (PARM-START-DATE)
var DEFAULT_END = '2022-07-06';   // BR-05 reportEndDate (PARM-END-DATE)

var startDate = normDate(input.startDate, DEFAULT_START);
var endDate = normDate(input.endDate, DEFAULT_END);

var lines = toText(input.transact).split(/\r?\n/);
var selected = [];
var readCount = 0, outOfRange = 0, interestSkipped = 0;
for (var i = 0; i < lines.length; i++) {
  var raw = lines[i];
  if (raw.trim() === '') continue;
  var r = padRight(raw, 350);
  readCount++;
  var procDate = r.substring(304, 314);
  if (procDate < startDate || procDate > endDate) { outOfRange++; continue; } // BR-01
  var typeCd = r.substring(16, 18);
  var catCd = r.substring(18, 22);
  if (typeCd === '01' && parseInt(catCd, 10) === 5) { interestSkipped++; continue; } // BR-07
  selected.push({
    seq: selected.length,
    tranId: r.substring(0, 16),
    typeCd: typeCd,
    catCd: catCd,
    source: r.substring(22, 32),
    amountCents: parseAmount(r.substring(132, 143)),
    cardNum: r.substring(262, 278)
  });
}

// BR-02: sort by card number; ties keep file order (stable)
selected.sort(function (a, b) {
  if (a.cardNum < b.cardNum) return -1;
  if (a.cardNum > b.cardNum) return 1;
  return a.seq - b.seq;
});

output.startDate = startDate;
output.endDate = endDate;
output.selectedTransactions = selected;
output.selectionStats = { read: readCount, outOfRange: outOfRange, interestSkipped: interestSkipped, selected: selected.length };
output.transact = null; // drop the raw file from the payload once parsed
