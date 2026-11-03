// SCRIPT node "Format outputs" (workflow accrue_interest_calculation).
// Shapes the CONTRACT.md outputs accrue_systxn.json and accrue_ledgacc.json; returned by END as ${result}.

var a = JSON.parse(String(input.accrued));

function money(h) {
  var s = String(h), neg = s.charAt(0) === '-';
  if (neg) s = s.substring(1);
  while (s.length < 3) s = '0' + s;
  return (neg ? '-' : '') + s.slice(0, -2) + '.' + s.slice(-2);
}
function rtrim(s) { return String(s === null || s === undefined ? '' : s).replace(/\s+$/, ''); }

var systxn = a.txns.map(function (t) {
  return {
    tran_id: t.tranId, type_cd: t.typeCd, cat_cd: parseInt(t.catCd, 10), source: t.source,
    desc: rtrim(t.desc), amt: money(t.amt), merchant_id: t.merchantId,
    merchant_name: t.merchantName, merchant_city: t.merchantCity, merchant_zip: t.merchantZip,
    card_num: rtrim(t.cardNum), orig_ts: t.origTs, proc_ts: t.procTs
  };
});

var ledgacc = a.accounts.map(function (c) {
  return {
    acct_id: parseInt(c.acctId, 10), active_status: rtrim(c.activeStatus),
    curr_bal: money(c.currBal), credit_limit: money(c.creditLimit), cash_credit_limit: money(c.cashCreditLimit),
    open_date: rtrim(c.openDate), expiration_date: rtrim(c.expirationDate), reissue_date: rtrim(c.reissueDate),
    curr_cyc_credit: money(c.currCycCredit), curr_cyc_debit: money(c.currCycDebit),
    addr_zip: rtrim(c.addrZip), group_id: rtrim(c.groupId)
  };
});

output.result = { accrue_systxn: systxn, accrue_ledgacc: ledgacc, runLog: a.log };
output.accrued = null;
