// creastmt_test_harness — node "Generate Synthetic Input Files"
// Same data as tools/make_test_data.py. Exercises: 3 transactions on a card (AC-2),
// a card without transactions (AC-4), a negative amount, unsorted transactions and
// xrefs, an orphan transaction, two cards on one account, a blank middle name,
// a multi-word city, a description longer than 49 characters, a negative balance.
function x(v, n) { var s = String(v); while (s.length < n) s += ' '; return s.substring(0, n); }
function n9(v, n) { var s = String(v); while (s.length < n) s = '0' + s; return s.substring(0, n); }
function zoned(cents, n) {
  var d = n9(Math.abs(cents), n);
  var last = parseInt(d.charAt(n - 1), 10);
  return d.substring(0, n - 1) + (cents >= 0 ? '{ABCDEFGHI' : '}JKLMNOPQR').charAt(last);
}
function tran(tid, card, desc, cents) {
  return x(tid, 16) + x('01', 2) + n9(1, 4) + x('POS TERM', 10) + x(desc, 100)
    + zoned(cents, 11) + n9(123456789, 9) + x('Merchant', 50) + x('City', 50)
    + x('12345', 10) + x(card, 16) + x('2022-07-18 10:00:00.000000', 26)
    + x('2022-07-18 10:00:00.000000', 26) + x('', 20);
}
function acct(aid, bal, lim) {
  return n9(aid, 11) + 'Y' + zoned(bal, 12) + zoned(lim, 12) + zoned(100000, 12)
    + x('2014-11-20', 10) + x('2025-05-20', 10) + x('2025-05-20', 10)
    + zoned(0, 12) + zoned(0, 12) + x('12345', 10) + x('A000000000', 10) + x('', 178);
}
function xref(card, cust, aid) { return x(card, 16) + n9(cust, 9) + n9(aid, 11) + x('', 14); }
function cust(cid, f, m, l, a1, a2, a3, st, c, z, fico) {
  return n9(cid, 9) + x(f, 25) + x(m, 25) + x(l, 25) + x(a1, 50) + x(a2, 50) + x(a3, 50)
    + x(st, 2) + x(c, 3) + x(z, 10) + x('(908)119-8310', 15) + x('(373)693-8684', 15)
    + n9(20973888, 9) + x('000000000000493684371961316', 20) + x('1961-06-08', 10)
    + x('0053581756', 10) + 'Y' + n9(fico, 3) + x('', 168);
}

output.transact = [
  tran('0000000000000003', '4111111111110001', 'Purchase at Store C', 2500),
  tran('0000000000000001', '4111111111110001', 'Purchase at Store A', 5045),
  tran('0000000000000010', '4111111111119999', 'Orphan card transaction', 999),
  tran('0000000000000002', '4111111111110001', 'Refund from Store B', -1250),
  tran('0000000000000004', '4111111111110003',
    'A very long description that is longer than forty-nine characters for sure', 123456789)
].join('\n') + '\n';
output.acctdata = [acct(1, 194000, 2020000), acct(2, -5025, 500000)].join('\n') + '\n';
output.cardxref = [
  xref('4111111111110003', 1, 1),
  xref('4111111111110001', 1, 1),
  xref('4111111111110002', 2, 2)
].join('\n') + '\n';
output.custdata = [
  cust(1, 'Immanuel', 'Madeline', 'Kessler', '618 Deshaun Route', 'Apt. 802', 'Altenwerthshire', 'NC', 'USA', '12546', 274),
  cust(2, 'Mary Ann', '', 'Smith', '1 Main  Street', '', 'New York', 'NY', 'USA', '10001', 805)
].join('\n') + '\n';
