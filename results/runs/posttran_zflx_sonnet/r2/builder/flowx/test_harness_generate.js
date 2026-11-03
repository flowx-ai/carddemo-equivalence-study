// Test harness: builds fixed-width CardDemo input files covering acceptance scenarios 1-9
// plus BR-09 (duplicate transactionId) and sequential-state effects on the limit check.
// Expected result (business date 2022-07-18):
//   posted   T1, T7, T11                       (3)
//   rejected T2=100 T3=101 T4=102 T5=103 T6=103 T8=102 T9=102   (7) -> status WARNING
//   duplicate T10 (same id as T1)              (1)
//   acct 1: bal 6000.00, cyc credit 5000.00 | acct 3: bal -15.00, cyc debit -35.00
//   tcatbal 1/01/0001 = 5100.00, new 3/02/0002 = -15.00

function f(s, n) { s = String(s); while (s.length < n) s += ' '; return s.substr(0, n); }
function z(cents, n) {
  var neg = cents < 0;
  var d = String(Math.abs(cents));
  while (d.length < n) d = '0' + d;
  var last = parseInt(d.charAt(n - 1), 10);
  return d.substr(0, n - 1) + (neg ? '}JKLMNOPQR' : '{ABCDEFGHI').charAt(last);
}
function acct(id, bal, limit, exp, cycCr, cycDb) {
  return f(id, 11) + 'Y' + z(bal, 12) + z(limit, 12) + z(100000, 12) + '2014-11-20' + f(exp, 10) +
    f(exp, 10) + z(cycCr, 12) + z(cycDb, 12) + f('12345', 10) + f('A000000000', 10) + f('', 178);
}
function xref(card, cust, acctId) { return f(card, 16) + f(cust, 9) + f(acctId, 11) + f('', 14); }
function tcat(acctId, type, cat, bal) { return f(acctId, 11) + f(type, 2) + f(cat, 4) + z(bal, 11) + f('', 22); }
function daily(id, type, cat, amt, card, ts) {
  return f(id, 16) + f(type, 2) + f(cat, 4) + f('POS TERM', 10) + f('Purchase at test merchant', 100) +
    z(amt, 11) + '800000001' + f('Test Merchant', 50) + f('Seattle', 50) + f('98101', 10) +
    f(card, 16) + f(ts, 26) + f('', 26) + f('', 20);
}

var TS = '2022-07-18 10:00:00.000000';
output.acctdata = [
  acct('00000000001', 100000, 500000, '2025-05-20', 0, 0),
  acct('00000000002', 100000, 500000, '2020-01-01', 0, 0),
  acct('00000000003', 0, 10000, '2030-12-31', 5000, -2000),
  acct('00000000004', 0, 10000, '2020-01-01', 0, 0),
  acct('00000000005', 12345, 99900, '2030-12-31', 0, 0)
].join('\n');
output.cardxref = [
  xref('4111111111111111', '000000001', '00000000001'),
  xref('4222222222222222', '000000002', '00000000002'),
  xref('4333333333333333', '000000003', '00000000003'),
  xref('4444444444444444', '000000004', '00000000004'),
  xref('4999999999999999', '000000009', '00000000099')
].join('\n');
output.tcatbal = [tcat('00000000001', '01', '0001', 10000)].join('\n');
output.dailytran = [
  daily('TXN0000000000001', '01', '0001', 25000, '4111111111111111', TS),
  daily('TXN0000000000002', '01', '0001', 1000, '4000000000000000', TS),
  daily('TXN0000000000003', '01', '0001', 1000, '4999999999999999', TS),
  daily('TXN0000000000004', '01', '0001', 4000, '4333333333333333', TS),
  daily('TXN0000000000005', '01', '0001', 1000, '4222222222222222', TS),
  daily('TXN0000000000006', '01', '0001', 50000, '4444444444444444', TS),
  daily('TXN0000000000007', '02', '0002', -1500, '4333333333333333', TS),
  daily('TXN0000000000008', '01', '0001', 3000, '4333333333333333', TS),
  daily('TXN0000000000009', '01', '0001', 480000, '4111111111111111', TS),
  daily('TXN0000000000001', '01', '0001', 100, '4111111111111111', TS),
  daily('TXN0000000000011', '01', '0001', 475000, '4111111111111111', TS)
].join('\n');
output.businessDate = '2022-07-18';
output.batchId = 'TEST-POSTTRAN-001';
