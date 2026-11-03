// SCRIPT node "Post interest to accounts" (wiki nodes 5 "Post Interest" + 6 "Save Account").
// For every account that had at least one category balance: curr_bal += total interest,
// curr_cyc_credit = 0, curr_cyc_debit = 0 (CBACT04C 1050-UPDATE-ACCOUNT). Other accounts are
// written unchanged. Builds the two contract outputs. See assumptions.md.

var st = JSON.parse(String(input.computed));

function money(cents) {
  var neg = cents < 0;
  var a = Math.abs(cents);
  var frac = String(a % 100);
  if (frac.length < 2) frac = '0' + frac;
  return (neg ? '-' : '') + Math.floor(a / 100) + '.' + frac;
}
function rtrim(s) { return String(s).replace(/\s+$/, ''); }

var accts = [];
for (var i = 0; i < st.accounts.length; i++) {
  var a = st.accounts[i];
  var bal = a.currBal, cyc_cr = a.currCycCredit, cyc_db = a.currCycDebit;
  if (st.interestByAcct.hasOwnProperty(String(a.acctId))) {
    bal = bal + st.interestByAcct[String(a.acctId)];
    cyc_cr = 0;
    cyc_db = 0;
  }
  accts.push({
    acct_id: a.acctId,
    active_status: rtrim(a.activeStatus),
    curr_bal: money(bal),
    credit_limit: money(a.creditLimit),
    cash_credit_limit: money(a.cashCreditLimit),
    open_date: rtrim(a.openDate),
    expiration_date: rtrim(a.expirationDate),
    reissue_date: rtrim(a.reissueDate),
    curr_cyc_credit: money(cyc_cr),
    curr_cyc_debit: money(cyc_db),
    addr_zip: rtrim(a.addrZip),
    group_id: rtrim(a.groupId)
  });
}

var txs = [];
for (var t = 0; t < st.transactions.length; t++) {
  var x = st.transactions[t];
  txs.push({
    tran_id: x.tranId,
    type_cd: x.typeCd,
    cat_cd: x.catCd,
    source: x.source,
    desc: x.desc,
    amt: money(x.amt),
    merchant_id: x.merchantId,
    merchant_name: x.merchantName,
    merchant_city: x.merchantCity,
    merchant_zip: x.merchantZip,
    card_num: rtrim(x.cardNum),
    orig_ts: x.origTs,
    proc_ts: x.procTs
  });
}

output.intcalc_acctdata = accts;
output.intcalc_systran = txs;
// drop the large intermediates so they do not travel further in the workflow state
output.parsed = null;
output.computed = null;
