// SCRIPT node "Load inputs" (wiki node 2 "Load Accounts").
// Parses the fixed-width files (CVACT01Y, CVTRA01Y, CVACT03Y, CVTRA02Y) into plain records.
// Amounts are carried as integer minor units (cents for V99) to avoid binary floating point.
// Intermediate state is handed to the next node as a JSON string (input.* objects are
// GraalVM foreign objects; a string crosses node boundaries unchanged).

function toLines(s) {
  if (s === null || s === undefined) return [];
  var out = [];
  var raw = String(s).split(/\r?\n/);
  for (var i = 0; i < raw.length; i++) {
    if (raw[i].replace(/\s+$/, '').length > 0) out.push(raw[i]);
  }
  return out;
}

function padRight(s, n) {
  while (s.length < n) s += ' ';
  return s;
}

// Zoned decimal (DISPLAY) with optional overpunched sign in the last byte.
// Also tolerates explicit +/- signs and an explicit decimal point.
var OVERPUNCH_POS = { '{': 0, 'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8, 'I': 9 };
var OVERPUNCH_NEG = { '}': 0, 'J': 1, 'K': 2, 'L': 3, 'M': 4, 'N': 5, 'O': 6, 'P': 7, 'Q': 8, 'R': 9 };

function zoned(field, scale) {
  var f = String(field).trim();
  if (f.length === 0) return 0;
  var neg = false;
  if (f.charAt(0) === '-' || f.charAt(0) === '+') { neg = f.charAt(0) === '-'; f = f.substring(1); }
  var last = f.charAt(f.length - 1);
  if (last === '-' || last === '+') { neg = last === '-'; f = f.substring(0, f.length - 1); }
  else if (OVERPUNCH_POS.hasOwnProperty(last)) { f = f.substring(0, f.length - 1) + OVERPUNCH_POS[last]; }
  else if (OVERPUNCH_NEG.hasOwnProperty(last)) { f = f.substring(0, f.length - 1) + OVERPUNCH_NEG[last]; neg = true; }
  var intPart, fracPart;
  if (f.indexOf('.') >= 0) {
    var p = f.split('.');
    intPart = p[0]; fracPart = p[1];
    while (fracPart.length < scale) fracPart += '0';
    fracPart = fracPart.substring(0, scale);
  } else {
    intPart = f.substring(0, f.length - scale);
    fracPart = f.substring(f.length - scale);
  }
  var v = parseInt((intPart + fracPart).replace(/[^0-9]/g, '') || '0', 10);
  return neg ? -v : v;
}

function num(field) {
  var d = String(field).replace(/[^0-9]/g, '');
  return d.length ? parseInt(d, 10) : 0;
}

// ACCOUNT-RECORD, CVACT01Y, 300 bytes
var accounts = [];
var al = toLines(input.acctdata);
for (var i = 0; i < al.length; i++) {
  var r = padRight(al[i], 300);
  accounts.push({
    acctId: num(r.substring(0, 11)),
    activeStatus: r.substring(11, 12),
    currBal: zoned(r.substring(12, 24), 2),
    creditLimit: zoned(r.substring(24, 36), 2),
    cashCreditLimit: zoned(r.substring(36, 48), 2),
    openDate: r.substring(48, 58),
    expirationDate: r.substring(58, 68),
    reissueDate: r.substring(68, 78),
    currCycCredit: zoned(r.substring(78, 90), 2),
    currCycDebit: zoned(r.substring(90, 102), 2),
    addrZip: r.substring(102, 112),
    groupId: r.substring(112, 122)
  });
}

// TRAN-CAT-BAL-RECORD, CVTRA01Y, 50 bytes
var tcatbal = [];
var tl = toLines(input.tcatbal);
for (var j = 0; j < tl.length; j++) {
  var t = padRight(tl[j], 50);
  tcatbal.push({
    acctId: num(t.substring(0, 11)),
    typeCd: t.substring(11, 13),
    catCd: num(t.substring(13, 17)),
    bal: zoned(t.substring(17, 28), 2)
  });
}

// CARD-XREF-RECORD, CVACT03Y, 50 bytes
var xref = [];
var xl = toLines(input.cardxref);
for (var k = 0; k < xl.length; k++) {
  var x = padRight(xl[k], 50);
  xref.push({ cardNum: x.substring(0, 16), custId: num(x.substring(16, 25)), acctId: num(x.substring(25, 36)) });
}

// DIS-GROUP-RECORD, CVTRA02Y, 50 bytes. Rate S9(04)V99 kept in hundredths of a percent.
var discgrp = [];
var dl = toLines(input.discgrp);
for (var m = 0; m < dl.length; m++) {
  var d = padRight(dl[m], 50);
  discgrp.push({ groupId: d.substring(0, 10), typeCd: d.substring(10, 12), catCd: num(d.substring(12, 16)), rate: zoned(d.substring(16, 22), 2) });
}

output.parsed = JSON.stringify({ accounts: accounts, tcatbal: tcatbal, xref: xref, discgrp: discgrp });
output.parmDate = input.parmDate;
output.runTimestamp = input.runTimestamp;
