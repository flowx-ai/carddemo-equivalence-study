// Workflow accrue_interest_calculation — SCRIPT node "Update accounts and assemble outputs"
// P-15 BR-06: at each change of account, currentBalance += totalInterest,
// currentCycleCredit = 0, currentCycleDebit = 0, rewrite account.

function arr(x) { var o = []; if (x === null || x === undefined) return o; for (var i = 0; i < x.length; i++) o.push(x[i]); return o; }
function padLeft(s, n, c) { s = String(s); while (s.length < n) s = c + s; return s; }
function str(s) { return s === null || s === undefined ? '' : String(s); }
function fmtCents(c) {
  var neg = c < 0; var a = Math.abs(c);
  return (neg ? '-' : '') + Math.floor(a / 100) + '.' + padLeft(a % 100, 2, '0');
}

var accounts = arr(input.accounts);
var interestList = arr(input.accountInterest);
var interestByAcct = {};
for (var i = 0; i < interestList.length; i++) interestByAcct[String(interestList[i].acctKey)] = Number(interestList[i].totalInterest);

var out = [];
var updated = 0;
var totalInterest = 0;
for (var i = 0; i < accounts.length; i++) {
  var a = accounts[i];
  var key = String(a.acctKey);
  var bal = Number(a.curr_bal), cycCredit = Number(a.curr_cyc_credit), cycDebit = Number(a.curr_cyc_debit);
  if (interestByAcct.hasOwnProperty(key)) {
    // Only accounts that had category balances reach the legacy account rewrite.
    bal += interestByAcct[key];
    totalInterest += interestByAcct[key];
    cycCredit = 0;
    cycDebit = 0;
    updated++;
  }
  out.push({
    acct_id: parseInt(key, 10),
    active_status: str(a.active_status),
    curr_bal: fmtCents(bal),
    credit_limit: fmtCents(Number(a.credit_limit)),
    cash_credit_limit: fmtCents(Number(a.cash_credit_limit)),
    open_date: str(a.open_date),
    expiration_date: str(a.expiration_date),
    reissue_date: str(a.reissue_date),
    curr_cyc_credit: fmtCents(cycCredit),
    curr_cyc_debit: fmtCents(cycDebit),
    addr_zip: str(a.addr_zip),
    group_id: str(a.group_id)
  });
}

var stats = input.calcStats || {};
output.accrue_ledgacc = out;
output.runSummary = {
  accountsRead: accounts.length,
  balancesRead: Number(stats.balancesRead || 0),
  ratesRead: Number(stats.ratesRead || 0),
  transactionsWritten: Number(stats.transactionsWritten || 0),
  accountsUpdated: updated,
  rateFallbacks: Number(stats.rateFallbacks || 0),
  totalInterest: fmtCents(totalInterest),
  warnings: arr(input.calcWarnings).map(function (w) { return String(w); })
};
// Intermediate state is not part of the contract.
output.accounts = null;
output.balances = null;
output.rates = null;
output.xrefs = null;
output.accountInterest = null;
