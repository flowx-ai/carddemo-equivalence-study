// Workflow accrue_interest_calculation — SCRIPT node "Calculate interest and build transactions"
// P-15 interest-calculation, BR-01..BR-05, BR-07, BR-08, BR-10 (legacy LXB002C).

function arr(x) { var o = []; if (x === null || x === undefined) return o; for (var i = 0; i < x.length; i++) o.push(x[i]); return o; }
function padLeft(s, n, c) { s = String(s); while (s.length < n) s = c + s; return s; }
function rtrim(s) { return s === null || s === undefined ? '' : String(s).replace(/\s+$/, ''); }
function fmtCents(c) {
  var neg = c < 0; var a = Math.abs(c);
  return (neg ? '-' : '') + Math.floor(a / 100) + '.' + padLeft(a % 100, 2, '0');
}
// BR-03 + BR-08: monthlyInterest = (balance x rate) / 1200, truncated to 2 decimals
// (COBOL COMPUTE without ROUNDED). balance in cents, rate in hundredths of a percent:
//   cents = balanceCents * rateHundredths / 120000, truncated toward zero.
function monthlyInterestCents(balCents, rateHundredths) {
  if (typeof BigInt === 'function') {
    return Number((BigInt(balCents) * BigInt(rateHundredths)) / BigInt(120000));
  }
  var p = balCents * rateHundredths;
  return p < 0 ? Math.ceil(p / 120000) : Math.floor(p / 120000);
}

var STANDARD_GROUP = 'STANDARD';                         // BR-02 fallback group
var runDate = rtrim(input.interestRunDate);              // BR-05 ACCRUE PARM, e.g. 2022071800
if (runDate === '') runDate = '2022071800';
var runTs = rtrim(input.runTimestamp);
if (runTs === '') {
  var d = new Date();
  runTs = d.getUTCFullYear() + '-' + padLeft(d.getUTCMonth() + 1, 2, '0') + '-' + padLeft(d.getUTCDate(), 2, '0') + '-' +
          padLeft(d.getUTCHours(), 2, '0') + '.' + padLeft(d.getUTCMinutes(), 2, '0') + '.' + padLeft(d.getUTCSeconds(), 2, '0') + '.' +
          padLeft(d.getUTCMilliseconds(), 3, '0') + '000';
}

var warnings = arr(input.parseWarnings);
var accounts = arr(input.accounts);
var rates = arr(input.rates);
var xrefs = arr(input.xrefs);
var balances = arr(input.balances);

var accountByKey = {};
for (var i = 0; i < accounts.length; i++) accountByKey[accounts[i].acctKey] = accounts[i];

// DisclosureGroup keyed groupId + typeCode + categoryCode (first row wins on duplicates)
var rateByKey = {};
for (var i = 0; i < rates.length; i++) {
  var k = rates[i].group_id + '|' + rates[i].type_cd + '|' + rates[i].cat_cd;
  if (!rateByKey.hasOwnProperty(k)) rateByKey[k] = rates[i].rate;
}
// Card cross-reference by account (first card in file order = card-number order)
var cardByAcct = {};
for (var i = 0; i < xrefs.length; i++) {
  if (!cardByAcct.hasOwnProperty(xrefs[i].acctKey)) cardByAcct[xrefs[i].acctKey] = xrefs[i].card_num;
}

// Balances are processed in key order (accountId + typeCode + categoryCode), as the
// legacy sequential read of the KSDS does; each account is one control-break group.
var bals = [];
for (var i = 0; i < balances.length; i++) {
  var b = balances[i];
  bals.push({ acctKey: String(b.acctKey), type_cd: String(b.type_cd), cat_cd: String(b.cat_cd), bal: Number(b.bal), seq: Number(b.seq) });
}
bals.sort(function (x, y) {
  var kx = x.acctKey + x.type_cd + x.cat_cd, ky = y.acctKey + y.type_cd + y.cat_cd;
  return kx < ky ? -1 : (kx > ky ? 1 : x.seq - y.seq);
});

var transactions = [];
var interestByAcct = {};      // acctKey -> total interest in cents (BR-06 input)
var processedAccts = [];      // accounts that had at least one category balance
var suffix = 0;
var rateFallbacks = 0;

for (var i = 0; i < bals.length; i++) {
  var b = bals[i];
  var acct = accountByKey[b.acctKey];
  if (!acct) {
    warnings.push('Category balance for account ' + b.acctKey + ' (' + b.type_cd + '/' + b.cat_cd + ') has no account record: skipped');
    continue;
  }
  if (!interestByAcct.hasOwnProperty(b.acctKey)) { interestByAcct[b.acctKey] = 0; processedAccts.push(b.acctKey); }

  // BR-01 rate lookup key: account.groupId + typeCode + categoryCode
  var group = rtrim(acct.group_id);
  var key = group + '|' + b.type_cd + '|' + b.cat_cd;
  var rate;
  if (rateByKey.hasOwnProperty(key)) {
    rate = rateByKey[key];
  } else {
    // BR-02: not found -> retry with group STANDARD
    rateFallbacks++;
    var dkey = STANDARD_GROUP + '|' + b.type_cd + '|' + b.cat_cd;
    if (rateByKey.hasOwnProperty(dkey)) {
      rate = rateByKey[dkey];
    } else {
      rate = 0;
      warnings.push('No disclosure rate for ' + group + '/' + b.type_cd + '/' + b.cat_cd + ' nor STANDARD fallback (account ' + b.acctKey + '): no interest');
    }
  }

  // BR-03 / BR-10: only a non-zero rate produces interest (and a transaction)
  if (Number(rate) === 0) continue;
  var interest = monthlyInterestCents(b.bal, Number(rate));
  interestByAcct[b.acctKey] += interest;

  // BR-04 / BR-05: batch interest transaction, id = run date prefix + running suffix
  suffix++;
  var card = cardByAcct.hasOwnProperty(b.acctKey) ? cardByAcct[b.acctKey] : '';
  if (card === '') warnings.push('No card cross-reference for account ' + b.acctKey + ': interest transaction has blank card number');
  transactions.push({
    tran_id: (runDate + padLeft(suffix, 6, '0')).substring(0, 16),
    type_cd: '07',
    cat_cd: 12,
    source: 'Batch',
    desc: 'Accrued int ' + b.acctKey,
    amt: fmtCents(interest),
    merchant_id: 0,
    merchant_name: '',
    merchant_city: '',
    merchant_zip: '',
    card_num: card,
    orig_ts: runTs,
    proc_ts: runTs
  });
  // BR-07: fee computation (1400-COMPUTE-FEES) is an empty stub in legacy -> no fee transaction.
}

var interestList = [];
for (var i = 0; i < processedAccts.length; i++) {
  interestList.push({ acctKey: processedAccts[i], totalInterest: interestByAcct[processedAccts[i]] });
}

output.accrue_systxn = transactions;
output.accountInterest = interestList;
output.calcStats = { balancesRead: bals.length, ratesRead: rates.length, transactionsWritten: transactions.length, rateFallbacks: rateFallbacks };
output.calcWarnings = warnings;
