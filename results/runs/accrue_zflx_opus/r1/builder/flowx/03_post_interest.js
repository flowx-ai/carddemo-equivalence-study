// Node "Post Interest to Balance" + "Save Account" (balance update, REWRITE LEDGFILE).
// Every account that had at least one category balance: curr_bal += total interest and the
// current-cycle credit/debit accumulators are reset to 0. Other accounts pass through unchanged.
// Builds the two ACCRUE outputs in CONTRACT.md format (amounts as strings with 2 decimals).
var accounts = JSON.parse(input.accountsJson);
var transactions = JSON.parse(input.transactionsJson);
var interestByAcct = JSON.parse(input.interestByAcctJson);
var warnings = JSON.parse(input.loadWarningsJson || '[]').concat(JSON.parse(input.computeWarningsJson || '[]'));

function amt(cents) {
  var neg = cents < 0;
  var a = Math.abs(cents);
  var frac = String(a % 100);
  if (frac.length < 2) frac = '0' + frac;
  return (neg ? '-' : '') + String(Math.floor(a / 100)) + '.' + frac;
}
function rtrim(s) { return String(s).replace(/\s+$/, ''); }

var ledgacc = [];
for (var i = 0; i < accounts.length; i++) {
  var a = accounts[i];
  var bal = a.currBal, cycCredit = a.currCycCredit, cycDebit = a.currCycDebit;
  if (interestByAcct.hasOwnProperty(String(a.acctId))) {
    bal += interestByAcct[String(a.acctId)];
    cycCredit = 0;
    cycDebit = 0;
  }
  ledgacc.push({
    acct_id: a.acctId,
    active_status: rtrim(a.activeStatus),
    curr_bal: amt(bal),
    credit_limit: amt(a.creditLimit),
    cash_credit_limit: amt(a.cashCreditLimit),
    open_date: rtrim(a.openDate),
    expiration_date: rtrim(a.expirationDate),
    reissue_date: rtrim(a.reissueDate),
    curr_cyc_credit: amt(cycCredit),
    curr_cyc_debit: amt(cycDebit),
    addr_zip: rtrim(a.addrZip),
    group_id: rtrim(a.groupId)
  });
}

var systxn = [];
for (var t = 0; t < transactions.length; t++) {
  var x = transactions[t];
  x.amt = amt(x.amt);
  systxn.push(x);
}

output.systxnJson = JSON.stringify(systxn);
output.ledgaccJson = JSON.stringify(ledgacc);
output.warningsJson = JSON.stringify(warnings);
output.summary = 'accounts=' + ledgacc.length + ' interestTransactions=' + systxn.length + ' warnings=' + warnings.length;
output.accountsJson = null;
output.transactionsJson = null;
