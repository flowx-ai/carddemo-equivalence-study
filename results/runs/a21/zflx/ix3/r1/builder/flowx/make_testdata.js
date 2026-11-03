// Synthetic fixed-width test inputs (CVTRA05Y / CVACT03Y / CVTRA03Y / CVTRA04Y).
// usage: node make_testdata.js <outDir>
const fs = require('fs');
const path = require('path');
const out = process.argv[2];
fs.mkdirSync(out, { recursive: true });
const p = (s, n) => String(s).padEnd(n).substring(0, n);
const z = (s, n) => String(s).padStart(n, '0');

// zoned S9(9)V99 with overpunched sign
function zoned(cents) {
  const d = z(Math.abs(cents), 11);
  const last = +d[10];
  const ch = cents < 0 ? '}JKLMNOPQR'[last] : '{ABCDEFGHI'[last];
  return d.substring(0, 10) + ch;
}

let n = 0;
function tran(card, type, cat, amt, procDate, src = 'POS TERM') {
  n++;
  return p(z(n, 16), 16) + p(type, 2) + z(cat, 4) + p(src, 10) + p('Purchase at shop ' + n, 100) +
    zoned(amt) + z(800000000 + n, 9) + p('Merchant ' + n, 50) + p('Seattle', 50) + p('98101', 10) +
    p(card, 16) + p(procDate + ' 10:00:00.000000', 26) + p(procDate + ' 11:00:00.000000', 26) + p('', 20);
}

const cards = ['4111111111111111', '4222222222222222', '4333333333333333', '4999999999999999'];
const recs = [];
// card 2 first in file order, to exercise the sort
for (let i = 0; i < 5; i++) recs.push(tran(cards[1], '01', 1, 1050 + i * 100, '2022-07-0' + (i + 1)));
for (let i = 0; i < 18; i++) recs.push(tran(cards[0], i % 2 ? '02' : '01', i % 2 ? 1 : 2, i === 3 ? -2599 : 123456 + i, '2022-07-1' + (i % 10)));
recs.push(tran(cards[0], '01', 5, 777, '2022-07-15'));             // interest posting -> excluded
recs.push(tran(cards[1], '01', 1, 999999, '2022-06-30'));          // before range -> excluded
recs.push(tran(cards[1], '01', 1, 888888, '2022-08-01'));          // after range -> excluded
recs.push(tran(cards[2], '03', 1, 5, '2022-07-31'));               // edge of range, 0.05
recs.push(tran(cards[2], '09', 1, 100000000000, '2022-07-31'));    // unknown type, 1,000,000,000.00 (overflow)
recs.push(tran(cards[3], '01', 1, 0, '2022-07-01'));               // card not in xref, zero amount
fs.writeFileSync(path.join(out, 'transact.dat'), recs.join('\n') + '\n');

const xref = cards.slice(0, 3).map((c, i) => p(c, 16) + z(i + 1, 9) + z(i + 10, 11) + p('', 14));
fs.writeFileSync(path.join(out, 'cardxref.dat'), xref.join('\n') + '\n');
const types = [['01', 'Purchase'], ['02', 'Payment'], ['03', 'Credit']].map(([t, d]) => p(t, 2) + p(d, 50) + p('', 8));
fs.writeFileSync(path.join(out, 'trantype.dat'), types.join('\n') + '\n');
const catg = [['01', 1, 'Regular Sales Draft'], ['01', 2, 'Regular Cash Advance'], ['01', 5, 'Interest Amount'],
  ['02', 1, 'Payment'], ['03', 1, 'Credit to Account A very long category description text']]
  .map(([t, c, d]) => p(t, 2) + z(c, 4) + p(d, 50) + p('', 4));
fs.writeFileSync(path.join(out, 'trancatg.dat'), catg.join('\n') + '\n');
