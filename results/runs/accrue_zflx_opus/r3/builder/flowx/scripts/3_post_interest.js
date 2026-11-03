// Post Interest — for every account that had at least one category balance (LXB002C
// 1050-UPDATE-ACCOUNT): add the total interest to the current balance and reset the
// current-cycle credit and debit to zero. Accounts with no category balance are untouched.
var st = JSON.parse(String(input.accrueState));
var it = JSON.parse(String(input.interestState));

var acctById = {};
st.accounts.forEach(function (a) { acctById[a.id] = a; });

it.order.forEach(function (id) {
  var a = acctById[id];
  if (!a) return;
  a.bal += it.totals[id];
  a.cycCredit = 0;
  a.cycDebit = 0;
});

output.postedAccounts = JSON.stringify(st.accounts);
