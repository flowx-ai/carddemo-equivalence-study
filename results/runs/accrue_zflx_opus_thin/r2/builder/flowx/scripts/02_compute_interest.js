// ACCRUE / Interest Calculation — node "Compute Interest" (FlowX SCRIPT, JavaScript).
// For every category balance (in key order) look up the disclosure-group rate of the owning
// account and compute that category's interest:
//   interest = TRUNC( balance x annualRatePercent / 1200 , 2 decimals )   (see assumptions.md A3-A5)
// Missing group/type/category rate -> retry with group "DEFAULT" (A6); still missing -> rate 0 (A7).

var L = JSON.parse(String(input.loaded));
var DEFAULT_GROUP = 'DEFAULT';

function rateKey(group, type, cat) { return String(group).replace(/\s+$/, '') + '|' + String(type).replace(/\s+$/, '') + '|' + cat; }

var rateIdx = {};
L.rates.forEach(function (r) {
  var k = rateKey(r.group_id, r.type_cd, r.cat_cd);
  if (!(k in rateIdx)) rateIdx[k] = r.int_rate;
});
var acctIdx = {};
L.accounts.forEach(function (a) { if (!(a.acct_id in acctIdx)) acctIdx[a.acct_id] = a; });

// Category balances are read in key order: account id, type code, category code (A2).
var bals = L.balcats.map(function (b, i) { b._i = i; return b; });
bals.sort(function (x, y) {
  if (x.acct_id !== y.acct_id) return x.acct_id - y.acct_id;
  if (x.type_cd !== y.type_cd) return x.type_cd < y.type_cd ? -1 : 1;
  if (x.cat_cd !== y.cat_cd) return x.cat_cd - y.cat_cd;
  return x._i - y._i;
});

// Truncating integer division of balance(cents) x rate(1/100 %) by 12000 -> interest in cents.
function monthlyInterestCents(balCents, rateUnits) {
  var p = balCents * rateUnits;
  if (Math.abs(p) <= 9007199254740991) {
    var rem = p % 12000;
    return (p - rem) / 12000;
  }
  return Number(BigInt(balCents) * BigInt(rateUnits) / BigInt(12000)); // BigInt division truncates toward zero
}

var lines = [];
var issues = [];
bals.forEach(function (b) {
  var acct = acctIdx[b.acct_id];
  if (!acct) {
    issues.push('category balance for unknown account ' + b.acct_id + ' skipped');
    return;
  }
  var group = acct.group_id;
  var rate = rateIdx[rateKey(group, b.type_cd, b.cat_cd)];
  var groupUsed = group;
  if (rate === undefined) {
    rate = rateIdx[rateKey(DEFAULT_GROUP, b.type_cd, b.cat_cd)];
    groupUsed = DEFAULT_GROUP;
  }
  if (rate === undefined) {
    issues.push('no rate for group ' + group + ' / DEFAULT, type ' + b.type_cd + ', cat ' + b.cat_cd + ' (account ' + b.acct_id + '): rate 0');
    rate = 0;
    groupUsed = null;
  }
  lines.push({
    acct_id: b.acct_id, type_cd: b.type_cd, cat_cd: b.cat_cd, bal: b.bal,
    group_used: groupUsed, int_rate: rate,
    accrues: rate !== 0,
    interest: rate !== 0 ? monthlyInterestCents(b.bal, rate) : 0
  });
});

output.interestLines = JSON.stringify(lines);
output.computeIssues = issues;
