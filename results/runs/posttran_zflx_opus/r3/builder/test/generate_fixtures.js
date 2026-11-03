// Builds fixed-width fixture files (copybook layouts) covering the acceptance-criteria scenarios.
// Run once on FlowX via run_workflow_node (script override); its output was saved to test/fixtures/.
function rpad(s, n) { s = String(s); while (s.length < n) s += ' '; return s.substring(0, n); }
function lpad0(s, n) { s = String(s); while (s.length < n) s = '0' + s; return s; }
// Signed zoned decimal with EBCDIC-style overpunch on the last byte, as in the CardDemo ASCII data.
function zoned(cents, digits) {
  var neg = cents < 0, s = lpad0(Math.abs(cents), digits);
  var last = +s.charAt(digits - 1);
  return s.substring(0, digits - 1) + (neg ? '}JKLMNOPQR' : '{ABCDEFGHI').charAt(last);
}
function acct(id, st, bal, lim, cash, open, exp, reiss, cc, cd, zip, grp) {
  return rpad(lpad0(id, 11) + st + zoned(bal, 12) + zoned(lim, 12) + zoned(cash, 12) + rpad(open, 10) +
    rpad(exp, 10) + rpad(reiss, 10) + zoned(cc, 12) + zoned(cd, 12) + rpad(zip, 10) + rpad(grp, 10), 300);
}
function xref(card, cust, id) { return rpad(rpad(card, 16) + lpad0(cust, 9) + lpad0(id, 11), 50); }
function card(num, id, st) { return rpad(rpad(num, 16) + lpad0(id, 11) + '123' + rpad('TEST HOLDER', 50) + '2027-12-31' + st, 150); }
function tcat(id, type, cat, bal) { return rpad(lpad0(id, 11) + type + lpad0(cat, 4) + zoned(bal, 11), 50); }
function tran(id, type, cat, amt, card, orig, desc) {
  return rpad(rpad(id, 16) + type + lpad0(cat, 4) + rpad('POS TERM', 10) + rpad(desc, 100) + zoned(amt, 11) +
    lpad0(800000001, 9) + rpad('TEST MERCHANT', 50) + rpad('SPRINGFIELD', 50) + rpad('12345', 10) +
    rpad(card, 16) + rpad(orig, 26) + rpad('', 26), 350);
}
var C = function (n) { return '400000000000000' + n; };
var acctdata = [
  acct(1, 'Y', 10000, 100000, 20000, '2015-01-01', '2025-12-31', '2023-01-01', 0, 0, '10001', 'A000000000'),
  acct(2, 'N', 5000, 50000, 10000, '2016-02-02', '2025-12-31', '2023-01-01', 0, 0, '10002', 'A000000000'),
  acct(3, 'Y', 90000, 100000, 20000, '2017-03-03', '2025-12-31', '2023-01-01', 1500, -700, '10003', 'B000000000'),
  acct(4, 'Y', 0, 500000, 20000, '2018-04-04', '2022-01-01', '2020-01-01', 0, 0, '10004', 'A000000000'),
  acct(5, 'Y', 0, 100000, 20000, '2019-05-05', '2025-12-31', '2023-01-01', 0, 0, '10005', 'A000000000')
];
var cardxref = [xref(C(1), 1, 1), xref(C(2), 2, 2), xref(C(3), 3, 3), xref(C(4), 4, 4), xref(C(5), 5, 5), xref(C(6), 6, 99)];
var carddata = [card(C(1), 1, 'Y'), card(C(2), 2, 'Y'), card(C(3), 3, 'Y'), card(C(4), 4, 'Y'), card(C(5), 5, 'N')];
var tcatbal = [tcat(1, '01', 1, 5000), tcat(3, '01', 1, 90000)];
var TS = '2022-07-18-10.15.00.000000';
var dailytran = [
  tran('T000000000000001', '01', 1, 2550, C(1), TS, 'valid purchase'),
  tran('T000000000000002', '02', 2, -1000, C(1), TS, 'valid payment (negative)'),
  tran('T000000000000003', '01', 1, 500, C(2), TS, 'inactive account'),
  tran('T000000000000004', '01', 1, 15000, C(3), TS, 'over limit by 50.00'),
  tran('T000000000000005', '01', 1, 10000, C(3), TS, 'exactly the available credit'),
  tran('T000000000000006', '01', 1, 1000, C(4), TS, 'account expired'),
  tran('T000000000000007', '01', 1, 1000, C(5), TS, 'card inactive'),
  tran('T000000000000008', '01', 1, 1000, '9999999999999999', TS, 'card not in xref'),
  tran('T000000000000009', '01', 1, 1000, C(6), TS, 'xref account missing'),
  tran('T000000000000010', '01', 1, 9999900, C(4), TS, 'over limit AND expired')
];
output.fixtures = {
  acctdata: acctdata.join('\n'), cardxref: cardxref.join('\n'), carddata: carddata.join('\n'),
  tcatbal: tcatbal.join('\n'), dailytran: dailytran.join('\n')
};
