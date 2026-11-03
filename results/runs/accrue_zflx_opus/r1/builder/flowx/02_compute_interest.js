// Node "For each account / Compute Interest" (LXB002C, rule ComputeInterest).
// Walks the category balances in key order (account, type, category), grouped by account.
// For each balance: rate = rate(account.groupId, type, cat), falling back to group DEFAULT;
// when rate != 0: interest = trunc(bal * rate / 1200) and one interest transaction is written.
// The per-account interest total is handed to "Post Interest".
var warnings = [];
var accounts = JSON.parse(input.accountsJson);
var balances = JSON.parse(input.balancesJson);
var rates = JSON.parse(input.ratesJson);
var xrefs = JSON.parse(input.xrefsJson);
var categories = JSON.parse(input.categoriesJson);

function pad(s, n) { s = String(s === null || s === undefined ? '' : s); while (s.length < n) s += ' '; return s.substring(0, n); }
function zpad(v, n) { var s = String(v); while (s.length < n) s = '0' + s; return s; }

var accountById = {};
for (var i = 0; i < accounts.length; i++) {
  if (accountById[accounts[i].acctId] === undefined) accountById[accounts[i].acctId] = accounts[i];
}

var rateByKey = {};
for (var r = 0; r < rates.length; r++) {
  var rk = pad(rates[r].groupId, 10) + '|' + pad(rates[r].typeCd, 2) + '|' + rates[r].catCd;
  if (rateByKey[rk] === undefined) rateByKey[rk] = rates[r].rate;
}

// First card on file for the account (alternate-index read by account id).
var cardByAcct = {};
for (var x = 0; x < xrefs.length; x++) {
  if (cardByAcct[xrefs[x].acctId] === undefined) cardByAcct[xrefs[x].acctId] = xrefs[x].cardNum;
}

// Interest transaction type/category: the single txncatg entry described as interest, else 01/0005.
var intType = '01', intCat = 5;
var interestCats = [];
for (var g = 0; g < categories.length; g++) {
  if (/interest/i.test(categories[g].desc)) interestCats.push(categories[g]);
}
if (interestCats.length === 1) { intType = interestCats[0].typeCd; intCat = interestCats[0].catCd; }
else if (interestCats.length > 1) warnings.push('several interest categories in txncatg; using 01/0005');

// KSDS key order: account id, type code, category code.
var sorted = balances.slice().sort(function (a, b) {
  if (a.acctId !== b.acctId) return a.acctId < b.acctId ? -1 : 1;
  if (a.typeCd !== b.typeCd) return a.typeCd < b.typeCd ? -1 : 1;
  if (a.catCd !== b.catCd) return a.catCd < b.catCd ? -1 : 1;
  return 0;
});

var tranPrefix = pad(input.accrueParam, 10);
var ts = String(input.businessDate || '').substring(0, 10) + '-00.00.00.000000';
var DIVISOR = BigInt(120000); // /1200 for annual % -> monthly, x100 because the rate carries 2 decimals

var suffix = 0;
var transactions = [];
var interestByAcct = {};
var accrued = [];

for (var s = 0; s < sorted.length; s++) {
  var bal = sorted[s];
  var acct = accountById[bal.acctId];
  if (!acct) { warnings.push('category balance for unknown account ' + bal.acctId + ' skipped'); continue; }
  if (interestByAcct[bal.acctId] === undefined) { interestByAcct[bal.acctId] = 0; accrued.push(bal.acctId); }

  var key = pad(acct.groupId, 10) + '|' + pad(bal.typeCd, 2) + '|' + bal.catCd;
  var rate = rateByKey[key];
  if (rate === undefined) rate = rateByKey[pad('DEFAULT', 10) + '|' + pad(bal.typeCd, 2) + '|' + bal.catCd];
  if (rate === undefined) {
    warnings.push('no rate for group "' + acct.groupId.replace(/\s+$/, '') + '" or DEFAULT, type ' + bal.typeCd + ' cat ' + bal.catCd + ' (account ' + bal.acctId + '); no interest');
    continue;
  }
  if (rate === 0) continue;

  // BigInt division truncates toward zero, like a COBOL COMPUTE without ROUNDED.
  var interest = Number(BigInt(bal.bal) * BigInt(rate) / DIVISOR);
  interestByAcct[bal.acctId] += interest;

  suffix += 1;
  var card = cardByAcct[bal.acctId];
  if (card === undefined) { warnings.push('no card link for account ' + bal.acctId + '; card_num left blank'); card = ''; }
  transactions.push({
    tran_id: tranPrefix + zpad(suffix, 6),
    type_cd: intType,
    cat_cd: intCat,
    source: 'System',
    desc: 'Int. for a/c ' + zpad(bal.acctId, 11),
    amt: interest,
    merchant_id: 0,
    merchant_name: '',
    merchant_city: '',
    merchant_zip: '',
    card_num: card,
    orig_ts: ts,
    proc_ts: ts
  });
}

output.transactionsJson = JSON.stringify(transactions);
output.interestByAcctJson = JSON.stringify(interestByAcct);
output.accruedAcctsJson = JSON.stringify(accrued);
output.computeWarningsJson = JSON.stringify(warnings);
output.balancesJson = null;
output.ratesJson = null;
output.xrefsJson = null;
output.categoriesJson = null;
