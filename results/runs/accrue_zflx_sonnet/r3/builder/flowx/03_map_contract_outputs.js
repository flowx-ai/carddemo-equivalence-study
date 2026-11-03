// SCRIPT node "Map contract outputs" — workflow accrue_interest_calculation
// Shapes accrue_systxn / accrue_ledgacc as CONTRACT.md lists them. Amounts: strings, 2 decimals.

var c = input.calc;
function arr(x) { var a = []; if (!x) return a; for (var i = 0; i < x.length; i++) a.push(x[i]); return a; }
function rtrim(s) { return String(s === null || s === undefined ? '' : s).replace(/\s+$/, ''); }
function money(cents) {
  var s = String(cents), neg = s.charAt(0) === '-';
  if (neg) s = s.substring(1);
  while (s.length < 3) s = '0' + s;
  return (neg ? '-' : '') + s.substring(0, s.length - 2) + '.' + s.substring(s.length - 2);
}
function int(s) { var t = String(s).replace(/^\s+|\s+$/g, ''); return t.length ? parseInt(t, 10) : 0; }

var systxn = arr(c.transactions).map(function (t) {
  return {
    tran_id: String(t.tranId), type_cd: String(t.typeCd), cat_cd: int(t.catCd), source: String(t.source),
    desc: rtrim(t.desc), amt: money(t.amt), merchant_id: int(t.merchantId),
    merchant_name: rtrim(t.merchantName), merchant_city: rtrim(t.merchantCity), merchant_zip: rtrim(t.merchantZip),
    card_num: rtrim(t.cardNum), orig_ts: rtrim(t.origTs), proc_ts: rtrim(t.procTs)
  };
});

var ledgacc = arr(c.accounts).map(function (a) {
  return {
    acct_id: int(a.acctId), active_status: rtrim(a.activeStatus), curr_bal: money(a.currBal),
    credit_limit: money(a.creditLimit), cash_credit_limit: money(a.cashCreditLimit),
    open_date: rtrim(a.openDate), expiration_date: rtrim(a.expiryDate), reissue_date: rtrim(a.reissueDate),
    curr_cyc_credit: money(a.currCycCredit), curr_cyc_debit: money(a.currCycDebit),
    addr_zip: rtrim(a.addrZip), group_id: rtrim(a.groupId)
  };
});

var warnings = arr(c.warnings).map(function (w) { return String(w); });
output.result = { accrue_systxn: systxn, accrue_ledgacc: ledgacc, warnings: warnings, stats: c.stats };
output.calc = null;
