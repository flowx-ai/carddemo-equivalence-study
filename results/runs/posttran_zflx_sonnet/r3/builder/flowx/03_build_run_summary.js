// SCRIPT node "Build Run Summary" (legacy end-of-job DISPLAY + RETURN-CODE).
// Shapes the four CONTRACT.md outputs and the run state (BR-07).

function toArr(x) {
  var out = [];
  if (x === null || x === undefined) return out;
  for (var i = 0; i < x.length; i++) out.push(x[i]);
  return out;
}

// integer cents -> "1234.56" / "-0.05"
function money(c) {
  c = Math.round(Number(c) || 0);
  var neg = c < 0, a = Math.abs(c);
  var s = Math.floor(a / 100) + '.' + ('0' + (a % 100)).slice(-2);
  return (neg ? '-' : '') + s;
}

function tranOut(t) {
  return {
    tran_id: t.id, type_cd: t.typeCd, cat_cd: t.catCd, source: t.source, desc: t.desc,
    amt: money(t.amt), merchant_id: t.merchantId, merchant_name: t.merchantName,
    merchant_city: t.merchantCity, merchant_zip: t.merchantZip, card_num: t.cardNum,
    orig_ts: t.origTs, proc_ts: t.procTs
  };
}

var posted = toArr(input.postedTransactions);
var rejects = toArr(input.rejectedTransactions);
var accounts = toArr(input.accounts);
var tcatbals = toArr(input.tcatbals);
var dups = toArr(input.duplicateTransactionIds);
var i;

var transact = [], dalyrejs = [], acctdata = [], tcatbal = [];
for (i = 0; i < posted.length; i++) transact.push(tranOut(posted[i]));
for (i = 0; i < rejects.length; i++) {
  var r = tranOut(rejects[i]);
  r.reason = rejects[i].reason;
  r.reason_desc = rejects[i].reasonDesc;
  dalyrejs.push(r);
}
for (i = 0; i < accounts.length; i++) {
  var a = accounts[i];
  acctdata.push({
    acct_id: a.acctId, active_status: a.activeStatus, curr_bal: money(a.currBal),
    credit_limit: money(a.creditLimit), cash_credit_limit: money(a.cashCreditLimit),
    open_date: a.openDate, expiration_date: a.expirationDate, reissue_date: a.reissueDate,
    curr_cyc_credit: money(a.currCycCredit), curr_cyc_debit: money(a.currCycDebit),
    addr_zip: a.addrZip, group_id: a.groupId
  });
}
for (i = 0; i < tcatbals.length; i++) {
  var c = tcatbals[i];
  tcatbal.push({ acct_id: c.acctId, type_cd: c.typeCd, cat_cd: c.catCd, bal: money(c.bal) });
}

var read = input.feed ? input.feed.recordCount : 0;
output.posttran_transact = transact;
output.posttran_dalyrejs = dalyrejs;
output.posttran_acctdata = acctdata;
output.posttran_tcatbal = tcatbal;
output.runSummary = {
  batchId: input.batchId || null,
  businessDate: input.businessDate || null,
  read: read,
  processed: transact.length,
  rejected: dalyrejs.length,
  duplicatesSkipped: dups.length,
  // BR-07: WARNING (legacy RETURN-CODE 4) when any reject exists
  state: dalyrejs.length > 0 ? 'WARNING' : 'COMPLETED',
  returnCode: dalyrejs.length > 0 ? 4 : 0
};

// drop intermediates so the END output is only the contract outputs + summary
output.postedTransactions = null;
output.rejectedTransactions = null;
output.duplicateTransactionIds = null;
output.accounts = null;
output.tcatbals = null;
output.feed = null;
