// Node "Build Run Summary" — shapes the contract outputs (posttran_transact / _dalyrejs /
// _acctdata / _tcatbal) and the run summary (BR-07: WARNING / return code 4 when any reject exists).

var r = JSON.parse(String(input.postingResult));

function amount(c) {
  var neg = c < 0;
  var a = Math.abs(c);
  var s = Math.floor(a / 100) + "." + String(a % 100).padStart(2, "0");
  return neg && a !== 0 ? "-" + s : s;
}

function tran(t) {
  return {
    tran_id: t.tranId,
    type_cd: t.typeCd,
    cat_cd: t.catCd,
    source: t.source,
    desc: t.desc,
    amt: amount(t.amt),
    merchant_id: t.merchantId,
    merchant_name: t.merchantName,
    merchant_city: t.merchantCity,
    merchant_zip: t.merchantZip,
    card_num: t.cardNum,
    orig_ts: t.origTs,
    proc_ts: t.procTs
  };
}

var transact = r.posted.map(tran);
var dalyrejs = r.rejected.map(function (t) {
  var o = tran(t);
  o.reason = t.reason;
  o.reason_desc = t.reasonDesc;
  return o;
});
var acctdata = r.accounts.map(function (a) {
  return {
    acct_id: a.acctId,
    active_status: a.activeStatus,
    curr_bal: amount(a.currBal),
    credit_limit: amount(a.creditLimit),
    cash_credit_limit: amount(a.cashCreditLimit),
    open_date: a.openDate,
    expiration_date: a.expirationDate,
    reissue_date: a.reissueDate,
    curr_cyc_credit: amount(a.cycCredit),
    curr_cyc_debit: amount(a.cycDebit),
    addr_zip: a.addrZip,
    group_id: a.groupId
  };
});
var tcatbal = r.tcatbals.map(function (t) {
  return { acct_id: t.acctId, type_cd: t.typeCd, cat_cd: t.catCd, bal: amount(t.bal) };
});

var rejectCount = dalyrejs.length;
var summary = {
  batchId: input.batchId ? String(input.batchId) : "",
  businessDate: input.businessDate ? String(input.businessDate) : "",
  status: rejectCount > 0 ? "WARNING" : "COMPLETED",
  returnCode: rejectCount > 0 ? 4 : 0,
  transactionsRead: r.read,
  transactionsPosted: transact.length,
  transactionsRejected: rejectCount,
  duplicatesSkipped: r.duplicates.length,
  countsBalance: r.read === transact.length + rejectCount + r.duplicates.length,
  processedTimestamp: r.procTs
};

output.result = {
  posttran_transact: transact,
  posttran_dalyrejs: dalyrejs,
  posttran_acctdata: acctdata,
  posttran_tcatbal: tcatbal,
  runSummary: summary
};
output.postingResult = null;
