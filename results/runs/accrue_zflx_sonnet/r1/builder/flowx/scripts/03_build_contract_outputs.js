// ACCRUE / LXB002C - node 3: shape the CONTRACT.md outputs.
//   accrue_systxn  - transaction fields for every interest transaction written
//   accrue_ledgacc - account fields for every account, after interest
// Amounts are emitted as strings with exactly two decimals.

function money(cents) {
  var c = Number(cents);
  var neg = c < 0;
  var abs = Math.abs(c);
  var units = Math.floor(abs / 100), frac = abs % 100;
  var s = String(units) + '.' + (frac < 10 ? '0' : '') + String(frac);
  return (neg && abs !== 0 ? '-' : '') + s;
}

var systxn = [];
var txns = input.interestTransactions;
for (var i = 0; i < txns.length; i++) {
  var t = txns[i];
  systxn.push({
    tran_id: String(t.tranId),
    type_cd: String(t.typeCd),
    cat_cd: Number(t.catCd),
    source: String(t.source),
    desc: String(t.desc),
    amt: money(t.amt),
    merchant_id: Number(t.merchantId),
    merchant_name: String(t.merchantName),
    merchant_city: String(t.merchantCity),
    merchant_zip: String(t.merchantZip),
    card_num: String(t.cardNum),
    orig_ts: String(t.origTs),
    proc_ts: String(t.procTs)
  });
}

var ledgacc = [];
var updates = input.accountUpdates;
var accounts = input.accounts;
var updatedCount = 0;
for (var j = 0; j < accounts.length; j++) {
  var a = accounts[j];
  var u = updates[String(a.acctKey)];
  var hasUpdate = u !== undefined && u !== null;
  if (hasUpdate) updatedCount += 1;
  ledgacc.push({
    acct_id: Number(a.acctId),
    active_status: String(a.activeStatus),
    curr_bal: money(hasUpdate ? u.currBal : a.currBal),
    credit_limit: money(a.creditLimit),
    cash_credit_limit: money(a.cashCreditLimit),
    open_date: String(a.openDate),
    expiration_date: String(a.expiryDate),
    reissue_date: String(a.reissueDate),
    curr_cyc_credit: money(hasUpdate ? u.cycCredit : a.cycCredit),
    curr_cyc_debit: money(hasUpdate ? u.cycDebit : a.cycDebit),
    addr_zip: String(a.addrZip),
    group_id: String(a.groupId)
  });
}

var log = [];
for (var k = 0; k < input.parseErrors.length; k++) log.push(String(input.parseErrors[k]));
for (var m = 0; m < input.calculationLog.length; m++) log.push(String(input.calculationLog[m]));

output.result = {
  accrue_systxn: systxn,
  accrue_ledgacc: ledgacc,
  summary: {
    accountsRead: accounts.length,
    categoryBalancesRead: input.categoryBalances.length,
    interestTransactionsWritten: systxn.length,
    accountsUpdated: updatedCount,
    messages: log
  }
};

// Drop the intermediate state so it is not carried in the run's data model.
output.accounts = null;
output.categoryBalances = null;
output.disclosureRates = null;
output.cardXrefs = null;
output.interestTransactions = null;
output.accountUpdates = null;
