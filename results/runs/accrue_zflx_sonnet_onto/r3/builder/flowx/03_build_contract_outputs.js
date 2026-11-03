// SCRIPT node "Build contract outputs" — workflow accrue_interest_calculation (P-15).
// Maps the run result onto the CONTRACT.md shapes: accrue_systxn.json (transaction fields) and
// accrue_ledgacc.json (account fields). Amounts are two-decimal strings; trailing spaces omitted.
function str(v) { return v === null || v === undefined ? '' : String(v); }
function amount(units) {
  var s = str(units), neg = s.charAt(0) === '-';
  if (neg) s = s.substring(1);
  while (s.length < 3) s = '0' + s;
  return (neg ? '-' : '') + s.substring(0, s.length - 2) + '.' + s.substring(s.length - 2);
}

var r = JSON.parse(str(input.resultJson));

output.accrueSystxn = r.transactions.map(function (t) {
  return {
    tran_id: t.tranId, type_cd: t.typeCd, cat_cd: t.catCd, source: t.source, desc: t.desc,
    amt: amount(t.amt), merchant_id: t.merchantId, merchant_name: t.merchantName,
    merchant_city: t.merchantCity, merchant_zip: t.merchantZip, card_num: t.cardNum,
    orig_ts: t.origTs, proc_ts: t.procTs
  };
});

output.accrueLedgacc = r.accounts.map(function (a) {
  return {
    acct_id: parseInt(a.acctId, 10), active_status: a.activeStatus, curr_bal: amount(a.currBal),
    credit_limit: amount(a.creditLimit), cash_credit_limit: amount(a.cashCreditLimit),
    open_date: a.openDate, expiration_date: a.expirationDate, reissue_date: a.reissueDate,
    curr_cyc_credit: amount(a.currCycCredit), curr_cyc_debit: amount(a.currCycDebit),
    addr_zip: a.addrZip, group_id: a.groupId
  };
});

output.runSummary = JSON.stringify(r.stats);
output.resultJson = null;
