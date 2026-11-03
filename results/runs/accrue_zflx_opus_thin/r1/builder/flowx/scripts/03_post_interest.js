// FlowX SCRIPT node "Post interest" (workflow accrue_interest_calculation).
// Adds each account's total interest to its current balance and resets the current-cycle
// credit/debit of every account the run processed (the legacy account REWRITE), then shapes the
// two ACCRUE outputs of CONTRACT.md:
//   output.systxn  -> accrue_systxn.json  (every interest transaction written)
//   output.ledgacc -> accrue_ledgacc.json (every account, after interest)

var loaded = JSON.parse(String(input.loaded));
var computed = JSON.parse(String(input.computed));

function pad(s, n, c) { s = String(s); while (s.length < n) s = c + s; return s; }
function fmtCents(v) {
  var b = BigInt(v);
  var neg = b < BigInt(0);
  if (neg) b = -b;
  var s = pad(b.toString(), 3, "0");
  return (neg ? "-" : "") + s.slice(0, -2) + "." + s.slice(-2);
}

var accounts = loaded.accounts.slice().sort(function (a, b) {
  var ka = pad(a.acct_id, 11, "0"), kb = pad(b.acct_id, 11, "0");
  return ka < kb ? -1 : ka > kb ? 1 : 0;
});

var posted = 0;
var ledgacc = accounts.map(function (a) {
  var bal = a.curr_bal, cycCredit = a.curr_cyc_credit, cycDebit = a.curr_cyc_debit;
  var total = computed.postings[a.acct_id];
  if (total !== undefined) {
    bal = (BigInt(bal) + BigInt(total)).toString();
    cycCredit = "0";
    cycDebit = "0";
    posted += 1;
  }
  return {
    acct_id: Number(a.acct_id),
    active_status: a.active_status,
    curr_bal: fmtCents(bal),
    credit_limit: fmtCents(a.credit_limit),
    cash_credit_limit: fmtCents(a.cash_credit_limit),
    open_date: a.open_date,
    expiration_date: a.expiration_date,
    reissue_date: a.reissue_date,
    curr_cyc_credit: fmtCents(cycCredit),
    curr_cyc_debit: fmtCents(cycDebit),
    addr_zip: a.addr_zip,
    group_id: a.group_id
  };
});

output.systxn = computed.txns;
output.ledgacc = ledgacc;
output.summary = {
  accountsRead: accounts.length,
  categoryBalancesRead: loaded.balcats.length,
  accountsPosted: posted,
  interestTransactions: computed.txns.length,
  warnings: computed.warnings
};
// keep the hand-off payloads out of the run result
output.loaded = null;
output.computed = null;
