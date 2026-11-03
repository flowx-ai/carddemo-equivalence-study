// Save Account — render the two ACCRUE outputs in the CONTRACT.md format:
// accrue_systxn (interest transactions written) and accrue_ledgacc (every account, after
// interest). Amounts are strings with exactly two decimals; strings carry no trailing spaces.
var accounts = JSON.parse(String(input.postedAccounts));
var it = JSON.parse(String(input.interestState));

function money(c) {
  var a = Math.abs(c), s = String(Math.floor(a / 100)) + '.' + ('0' + (a % 100)).slice(-2);
  return c < 0 ? '-' + s : s;
}

var ledgacc = accounts.map(function (a) {
  return {
    acct_id: a.id, active_status: a.status, curr_bal: money(a.bal),
    credit_limit: money(a.creditLimit), cash_credit_limit: money(a.cashCreditLimit),
    open_date: a.openDate, expiration_date: a.expirationDate, reissue_date: a.reissueDate,
    curr_cyc_credit: money(a.cycCredit), curr_cyc_debit: money(a.cycDebit),
    addr_zip: a.zip, group_id: a.groupId
  };
});
var systxn = it.txns.map(function (t) {
  return {
    tran_id: t.tran_id, type_cd: t.type_cd, cat_cd: t.cat_cd, source: t.source, desc: t.desc,
    amt: money(t.amt), merchant_id: t.merchant_id, merchant_name: t.merchant_name,
    merchant_city: t.merchant_city, merchant_zip: t.merchant_zip, card_num: t.card_num,
    orig_ts: t.orig_ts, proc_ts: t.proc_ts
  };
});

output.accrueSystxn = JSON.stringify(systxn);
output.accrueLedgacc = JSON.stringify(ledgacc);
output.runSummary = JSON.stringify({
  accounts: ledgacc.length, accountsPosted: it.order.length, interestTransactions: systxn.length
});
