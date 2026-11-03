// Node: Write Posting Outputs  (wiki node 7 "Save Account + Balances" + node 8 reject output)
// Shapes the results into the four CONTRACT.md outputs:
//   posttran_transact  posttran_dalyrejs  posttran_acctdata  posttran_tcatbal
// Amounts are emitted as strings with exactly two decimals ("14.56", "-500.00").
var results = JSON.parse(String(input.postingResultsJson || '[]'));
var accounts = JSON.parse(String(input.accountsJson || '[]'));
var tcat = JSON.parse(String(input.categoryBalancesJson || '[]'));

function money(c) {
  var a = Math.abs(c);
  var s = Math.floor(a / 100) + '.' + ('0' + (a % 100)).slice(-2);
  return (c < 0 ? '-' : '') + s;
}
function tranFields(r) {
  return {
    tran_id: r.tranId, type_cd: r.typeCd, cat_cd: r.catCd, source: r.source, desc: r.desc,
    amt: money(r.amtCents), merchant_id: r.merchantId, merchant_name: r.merchantName,
    merchant_city: r.merchantCity, merchant_zip: r.merchantZip, card_num: r.cardNum,
    orig_ts: r.origTs, proc_ts: r.procTs
  };
}

var transact = [], rejects = [];
for (var i = 0; i < results.length; i++) {
  var r = results[i];
  var f = tranFields(r);
  if (r.status === 'POSTED') transact.push(f);
  else { f.reason = r.reason; f.reason_desc = r.reasonDesc; rejects.push(f); }
}

var acctOut = [];
for (var j = 0; j < accounts.length; j++) {
  var a = accounts[j];
  acctOut.push({
    acct_id: a.acctId, active_status: a.activeStatus, curr_bal: money(a.currBalCents),
    credit_limit: money(a.creditLimitCents), cash_credit_limit: money(a.cashCreditLimitCents),
    open_date: a.openDate, expiration_date: a.expirationDate, reissue_date: a.reissueDate,
    curr_cyc_credit: money(a.currCycCreditCents), curr_cyc_debit: money(a.currCycDebitCents),
    addr_zip: a.addrZip, group_id: a.groupId
  });
}

// KSDS order (account + type + category) for readability; the contract allows any order.
tcat.sort(function (x, y) {
  if (x.acctId !== y.acctId) return x.acctId < y.acctId ? -1 : 1;
  if (x.typeCd !== y.typeCd) return x.typeCd < y.typeCd ? -1 : 1;
  return x.catCd - y.catCd;
});
var tcatOut = [];
for (var k = 0; k < tcat.length; k++) {
  tcatOut.push({ acct_id: tcat[k].acctId, type_cd: tcat[k].typeCd, cat_cd: tcat[k].catCd, bal: money(tcat[k].balCents) });
}

output.posttran_transact = transact;
output.posttran_dalyrejs = rejects;
output.posttran_acctdata = acctOut;
output.posttran_tcatbal = tcatOut;
output.summary = {
  businessDate: input.businessDate ? String(input.businessDate) : null,
  transactionsRead: results.length,
  posted: transact.length,
  rejected: rejects.length,
  returnCode: rejects.length > 0 ? 4 : 0   // legacy CBTRN02C ends RC=4 when any reject was written
};
output.postingResultsJson = null;
output.accountsJson = null;
output.categoryBalancesJson = null;
