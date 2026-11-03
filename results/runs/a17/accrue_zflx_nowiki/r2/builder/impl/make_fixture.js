// Synthetic fixture (not real Ledgerline data): node make_fixture.js <dir>
var fs = require('fs'), path = require('path');
var dir = process.argv[2]; fs.mkdirSync(dir, { recursive: true });
function z(cents, w) { // signed zoned, trailing overpunch
  var neg = cents < 0, s = String(Math.abs(cents)); while (s.length < w) s = '0' + s;
  var d = +s[s.length - 1]; return s.slice(0, -1) + (neg ? '}JKLMNOPQR' : '{ABCDEFGHI')[d];
}
function n(v, w) { var s = String(v); while (s.length < w) s = '0' + s; return s; }
function x(v, w) { while (v.length < w) v += ' '; return v; }
var acct = [
  [1, 'Y', 194000, 'A000000000'], [2, 'Y', -5050, 'ZZZ'], [3, 'N', 0, 'A000000000'], [4, 'Y', 12345, 'A000000000']
].map(function (a) {
  return x(n(a[0], 11) + a[1] + z(a[2], 12) + z(500000, 12) + z(100000, 12) + '2014-11-20' + '2025-05-20' +
    '2025-05-20' + z(1000, 12) + z(-2000, 12) + x('12345', 10) + x(a[3], 10), 300);
});
fs.writeFileSync(path.join(dir, 'ledgacc.dat'), acct.join('\n') + '\n');
fs.writeFileSync(path.join(dir, 'cardlink.dat'), [
  x('4111111111111112' + n(1, 9) + n(1, 11), 50), x('4111111111111111' + n(1, 9) + n(1, 11), 50),
  x('4222222222222222' + n(2, 9) + n(2, 11), 50), x('4444444444444444' + n(4, 9) + n(4, 11), 50)].join('\n') + '\n');
fs.writeFileSync(path.join(dir, 'rategrp.dat'), [
  x('A000000000' + '01' + n(1, 4) + z(1500, 6), 50), x('A000000000' + '01' + n(2, 4) + z(0, 6), 50),
  x('DEFAULT   ' + '01' + n(1, 4) + z(2499, 6), 50), x('DEFAULT   ' + '02' + n(1, 4) + z(1000, 6), 50)].join('\n') + '\n');
fs.writeFileSync(path.join(dir, 'balcat.dat'), [
  x(n(2, 11) + '01' + n(1, 4) + z(-1235, 11), 50),    // group ZZZ -> DEFAULT 24.99%, negative bal
  x(n(1, 11) + '01' + n(2, 4) + z(99999, 11), 50),    // rate 0 -> no txn
  x(n(1, 11) + '01' + n(1, 4) + z(100033, 11), 50),   // 15.00%
  x(n(4, 11) + '02' + n(1, 4) + z(5000, 11), 50),     // last account (DEFAULT 10%)
  x(n(1, 11) + '03' + n(1, 4) + z(7777, 11), 50)      // no rate anywhere -> none
].join('\n') + '\n');
