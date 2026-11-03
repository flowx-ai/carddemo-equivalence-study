// Build Run Summary (end-of-job DISPLAY + RETURN-CODE) and shape the outputs to CONTRACT.md:
// posttran_transact, posttran_dalyrejs, posttran_acctdata, posttran_tcatbal.

var p = input.posting;

function rtrim(v) { return (v === null || v === undefined) ? '' : String(v).replace(/\s+$/, ''); }
function toInt(v) {
  var n = parseInt(String(v).trim(), 10);
  return isNaN(n) ? 0 : n;
}
// integer cents -> "1234.56" / "-500.00"
function amount(cents) {
  var c = Number(cents);
  var neg = c < 0;
  var a = Math.abs(c);
  var units = Math.floor(a / 100);
  var frac = a % 100;
  return (neg ? '-' : '') + units + '.' + (frac < 10 ? '0' : '') + frac;
}

function transactionFields(t) {
  return {
    tran_id: rtrim(t.tranId),
    type_cd: rtrim(t.typeCd),
    cat_cd: toInt(t.catCd),
    source: rtrim(t.source),
    desc: rtrim(t.desc),
    amt: amount(t.amtCents),
    merchant_id: toInt(t.merchantId),
    merchant_name: rtrim(t.merchantName),
    merchant_city: rtrim(t.merchantCity),
    merchant_zip: rtrim(t.merchantZip),
    card_num: rtrim(t.cardNum),
    orig_ts: rtrim(t.origTs),
    proc_ts: rtrim(t.procTs)
  };
}

var transact = [];
for (var i = 0; i < p.postedTransactions.length; i++) transact.push(transactionFields(p.postedTransactions[i]));

var dalyrejs = [];
for (i = 0; i < p.rejectedTransactions.length; i++) {
  var rj = p.rejectedTransactions[i];
  var row = transactionFields(rj);
  row.reason = Number(rj.rejectReason);
  row.reason_desc = rtrim(rj.rejectReasonDescription);
  dalyrejs.push(row);
}

var acctdata = [];
for (i = 0; i < p.accounts.length; i++) {
  var a = p.accounts[i];
  acctdata.push({
    acct_id: toInt(a.acctId),
    active_status: rtrim(a.activeStatus),
    curr_bal: amount(a.currBal),
    credit_limit: amount(a.creditLimit),
    cash_credit_limit: amount(a.cashCreditLimit),
    open_date: rtrim(a.openDate),
    expiration_date: rtrim(a.expiryDate),
    reissue_date: rtrim(a.reissueDate),
    curr_cyc_credit: amount(a.currCycCredit),
    curr_cyc_debit: amount(a.currCycDebit),
    addr_zip: rtrim(a.addrZip),
    group_id: rtrim(a.groupId)
  });
}

var tcatbal = [];
for (i = 0; i < p.categoryBalances.length; i++) {
  var t = p.categoryBalances[i];
  tcatbal.push({ acct_id: toInt(t.acctId), type_cd: rtrim(t.typeCd), cat_cd: toInt(t.catCd), bal: amount(t.balCents) });
}

var rejectCount = Number(p.rejectedCount);
var aborted = [];
for (i = 0; i < p.abortedRecords.length; i++) aborted.push(p.abortedRecords[i]);
var duplicates = [];
for (i = 0; i < p.duplicateRecords.length; i++) duplicates.push(p.duplicateRecords[i]);
var warnings = [];
var lw = input.loadWarnings;
if (lw) for (i = 0; i < lw.length; i++) warnings.push(String(lw[i]));

output.result = {
  // BR-07: WARNING (legacy RETURN-CODE 4) when any reject exists
  status: rejectCount > 0 ? 'WARNING' : 'COMPLETED',
  returnCode: rejectCount > 0 ? 4 : 0,
  summary: {
    transactionsProcessed: Number(p.readCount),
    transactionsPosted: Number(p.postedCount),
    transactionsRejected: rejectCount,
    recordsAborted: Number(p.abortedCount),
    duplicatesSkipped: Number(p.duplicateCount),
    abortedRecords: aborted,
    duplicateRecords: duplicates,
    loadWarnings: warnings
  },
  posttran_transact: transact,
  posttran_dalyrejs: dalyrejs,
  posttran_acctdata: acctdata,
  posttran_tcatbal: tcatbal
};
output.posting = null;
