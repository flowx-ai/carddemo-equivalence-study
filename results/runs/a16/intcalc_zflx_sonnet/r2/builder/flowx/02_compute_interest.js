// SCRIPT node "Compute interest and update accounts" — workflow intcalc_interest_calculation.
// P-15 interest-calculation, BR-01..BR-10 (legacy CBACT04C). See assumptions.md (A-xx refs).

var DIVISOR = 1200;            // 12 months x 100 (wiki: constant in script)
var DEFAULT_GROUP = 'DEFAULT'; // BR-02
var runDate = String(input.interestRunDate || '2022071800'); // BR-05, legacy PARM (A-03)
var runDay = runDate.substr(0, 4) + '-' + runDate.substr(4, 2) + '-' + runDate.substr(6, 2);
var tranTs = runDay + '-00.00.00.000000'; // A-08

function list(x) {
  var out = [];
  if (x === null || x === undefined) return out;
  for (var i = 0; i < x.length; i++) out.push(x[i]);
  return out;
}

function lpad(s, len, ch) {
  s = String(s);
  while (s.length < len) s = ch + s;
  return s;
}

function money(cents) {
  var neg = cents < 0;
  var a = Math.abs(cents);
  var s = Math.floor(a / 100) + '.' + lpad(a % 100, 2, '0');
  return neg ? '-' + s : s;
}

// BR-03 + BR-08: (balance x rate) / 1200, rounded to the cent half away from zero.
// balance and rate are both in hundredths, so interest(cents) = balC * rateC / 120000.
function interestCents(balC, rateC) {
  var p = balC * rateC;
  var neg = p < 0;
  var a = Math.abs(p);
  var den = DIVISOR * 100;
  var q = Math.floor(a / den);
  var r = a - q * den;
  if (2 * r >= den) q += 1;
  return neg ? -q : q;
}

// ---- reference data ------------------------------------------------------
var accounts = list(input.accounts).map(function (a) {
  return {
    acctId: String(a.acctId), activeStatus: String(a.activeStatus), currBal: Number(a.currBal),
    creditLimit: Number(a.creditLimit), cashCreditLimit: Number(a.cashCreditLimit),
    openDate: String(a.openDate), expirationDate: String(a.expirationDate),
    reissueDate: String(a.reissueDate),
    currCycCredit: Number(a.currCycCredit), currCycDebit: Number(a.currCycDebit),
    addrZip: String(a.addrZip), groupId: String(a.groupId)
  };
});
var acctById = {};
accounts.forEach(function (a) { acctById[a.acctId] = a; });

var rateByKey = {};
list(input.disclosureGroups).forEach(function (d) {
  rateByKey[d.groupId + '|' + d.typeCd + '|' + d.catCd] = Number(d.rate);
});

var cardByAcct = {};
list(input.cardXrefs).forEach(function (x) {
  if (!(x.acctId in cardByAcct)) cardByAcct[x.acctId] = String(x.cardNum); // A-06: first xref of the account
});

// BR-01 / BR-02: rate lookup with DEFAULT fallback
function lookupRate(groupId, typeCd, catCd) {
  var k = groupId + '|' + typeCd + '|' + catCd;
  if (k in rateByKey) return { rate: rateByKey[k], usedFallback: false, found: true };
  var d = DEFAULT_GROUP + '|' + typeCd + '|' + catCd;
  if (d in rateByKey) return { rate: rateByKey[d], usedFallback: true, found: true };
  return { rate: 0, usedFallback: true, found: false }; // A-05
}

// ---- process balances in key order (TCATBAL is a KSDS: acct + type + cat) --
var balances = list(input.categoryBalances).map(function (b) {
  return { acctId: String(b.acctId), typeCd: String(b.typeCd), catCd: String(b.catCd), bal: Number(b.bal) };
});
balances.sort(function (a, b) {
  var ka = a.acctId + a.typeCd + a.catCd, kb = b.acctId + b.typeCd + b.catCd;
  return ka < kb ? -1 : (ka > kb ? 1 : 0);
});

var systran = [];
var suffix = 0;
var warnings = [];
var totalByAcct = {};
var order = [];

balances.forEach(function (b) {
  var acct = acctById[b.acctId];
  if (!acct) { warnings.push('ACCOUNT NOT FOUND: ' + b.acctId); return; } // A-07
  if (!(b.acctId in totalByAcct)) { totalByAcct[b.acctId] = 0; order.push(b.acctId); }

  var r = lookupRate(acct.groupId, b.typeCd, b.catCd);
  if (!r.found) warnings.push('NO DISCLOSURE RATE (incl. DEFAULT): ' + b.acctId + ' ' + b.typeCd + ' ' + b.catCd);
  if (r.rate === 0) return; // BR-03 / BR-10: no interest when rate is 0

  var interest = interestCents(b.bal, r.rate);
  totalByAcct[b.acctId] += interest;

  suffix += 1; // BR-05: run date + running 6-digit suffix (A-04)
  systran.push({
    tran_id: runDate + lpad(suffix, 6, '0'),
    type_cd: '01',                                   // BR-04
    cat_cd: 5,
    source: 'System',
    desc: 'Int. for a/c ' + b.acctId,
    amt: money(interest),
    merchant_id: 0,                                  // A-06
    merchant_name: '',
    merchant_city: '',
    merchant_zip: '',
    card_num: cardByAcct[b.acctId] || '',
    orig_ts: tranTs,
    proc_ts: tranTs
  });
});

// BR-06: at each change of account — balance += total interest, cycle totals reset
order.forEach(function (id) {
  var a = acctById[id];
  a.currBal = a.currBal + totalByAcct[id];
  a.currCycCredit = 0;
  a.currCycDebit = 0;
});

// BR-07: fees stub — no fee transactions are produced.

output.intcalc_systran = systran;
output.intcalc_acctdata = accounts.map(function (a) {
  return {
    acct_id: parseInt(a.acctId, 10),
    active_status: a.activeStatus,
    curr_bal: money(a.currBal),
    credit_limit: money(a.creditLimit),
    cash_credit_limit: money(a.cashCreditLimit),
    open_date: a.openDate,
    expiration_date: a.expirationDate,
    reissue_date: a.reissueDate,
    curr_cyc_credit: money(a.currCycCredit),
    curr_cyc_debit: money(a.currCycDebit),
    addr_zip: a.addrZip,
    group_id: a.groupId
  };
});
output.runSummary = {
  interestRunDate: runDate,
  balancesRead: balances.length,
  transactionsWritten: systran.length,
  accountsUpdated: order.length,
  warnings: warnings
};
// drop the parsed inputs so they do not travel further in the workflow state
output.accounts = null;
output.categoryBalances = null;
output.disclosureGroups = null;
output.cardXrefs = null;
