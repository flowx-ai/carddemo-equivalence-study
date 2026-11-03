// ACCRUE / Interest Calculation — node "Post Interest & Save" (FlowX SCRIPT, JavaScript).
// Writes one interest transaction per accruing category balance and posts each account's total
// interest to its current balance, resetting the cycle credit/debit (A8-A14 in assumptions.md).
// Produces the two ACCRUE outputs of CONTRACT.md: accrue_systxn and accrue_ledgacc.

var L = JSON.parse(String(input.loaded));
var lines = JSON.parse(String(input.interestLines));
var parm = (input.parmDate === null || input.parmDate === undefined || String(input.parmDate) === '') ? '2022071800' : String(input.parmDate);
var bizDate = (input.businessDate === null || input.businessDate === undefined || String(input.businessDate) === '') ? '2022-07-18' : String(input.businessDate);

function money(units) {
  var neg = units < 0;
  var a = Math.abs(units);
  var c = String(a % 100);
  if (c.length < 2) c = '0' + c;
  return (neg ? '-' : '') + String((a - a % 100) / 100) + '.' + c;
}
function zpad(n, len) { var s = String(n); while (s.length < len) s = '0' + s; return s; }

// Card used on the interest transaction: the account's first card in card-number order (A11).
var cardByAcct = {};
L.links.slice().sort(function (x, y) { return x.card_num < y.card_num ? -1 : x.card_num > y.card_num ? 1 : 0; })
  .forEach(function (c) { if (!(c.acct_id in cardByAcct)) cardByAcct[c.acct_id] = c.card_num; });

var acctIdx = {};
L.accounts.forEach(function (a) { if (!(a.acct_id in acctIdx)) acctIdx[a.acct_id] = a; });

var prefix = (parm + '          ').substring(0, 10);
var ts = bizDate + '-00.00.00.000000';
var seq = 0;
var txns = [];
var totals = {};
var order = [];
var issues = [];

lines.forEach(function (ln) {
  if (!(ln.acct_id in totals)) { totals[ln.acct_id] = 0; order.push(ln.acct_id); }
  if (!ln.accrues) return;
  totals[ln.acct_id] += ln.interest;
  seq += 1;
  var card = cardByAcct[ln.acct_id];
  if (card === undefined) { issues.push('no card link for account ' + ln.acct_id); card = ''; }
  txns.push({
    tran_id: prefix + zpad(seq, 6),
    type_cd: '01',
    cat_cd: 5,
    source: 'System',
    desc: 'Int. for a/c ' + zpad(ln.acct_id, 11),
    amt: money(ln.interest),
    merchant_id: 0,
    merchant_name: '',
    merchant_city: '',
    merchant_zip: '',
    card_num: card,
    orig_ts: ts,
    proc_ts: ts
  });
});

// Post: every account that has category balances gets its total added and its cycle totals reset.
order.forEach(function (id) {
  var a = acctIdx[id];
  a.curr_bal = a.curr_bal + totals[id];
  a.curr_cyc_credit = 0;
  a.curr_cyc_debit = 0;
});

var ledg = L.accounts.map(function (a) {
  return {
    acct_id: a.acct_id, active_status: a.active_status,
    curr_bal: money(a.curr_bal), credit_limit: money(a.credit_limit), cash_credit_limit: money(a.cash_credit_limit),
    open_date: a.open_date, expiration_date: a.expiration_date, reissue_date: a.reissue_date,
    curr_cyc_credit: money(a.curr_cyc_credit), curr_cyc_debit: money(a.curr_cyc_debit),
    addr_zip: a.addr_zip, group_id: a.group_id
  };
});
var summary = {
  categoryBalancesRead: lines.length,
  interestTransactions: txns.length,
  accountsPosted: order.length,
  accountsOut: L.accounts.length,
  issues: issues
};
output.accrue_systxn = txns;
output.accrue_ledgacc = ledg;
output.summary = summary;
// File-ready contents of the two ACCRUE outputs (returned through the END node's OUTPUT slice).
output.accrue_systxn_json = JSON.stringify(txns, null, 1);
output.accrue_ledgacc_json = JSON.stringify(ledg, null, 1);
output.summary_json = JSON.stringify(summary);
