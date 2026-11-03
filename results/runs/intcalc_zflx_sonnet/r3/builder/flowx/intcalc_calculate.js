// INTCALC — CardDemo interest calculation (legacy CBACT04C, wiki process P-15 "interest-calculation").
// FlowX SCRIPT node "Calculate interest (CBACT04C)" of workflow intcalc_interest_calculation.
// Input  (workflow state): acctdata, tcatbal, discgrp, cardxref = raw fixed-width file contents
//                          (one record per line, copybook layouts); interestRunDate = PARM (e.g. 2022071800).
// Output (workflow state): intcalcSystran[]  = interest transactions written (CONTRACT intcalc_systran.json)
//                          intcalcAcctdata[] = every account after interest  (CONTRACT intcalc_acctdata.json)
//                          runSummary        = counts and warnings

var DIVISOR = 1200;                 // BR-03: 12 months x 100 (rate is an annual percentage)
var DEFAULT_GROUP = 'DEFAULT';      // BR-02: fallback disclosure group
var DEFAULT_RUN_DATE = '2022071800'; // BR-05: legacy PARM default (interestRunDate configuration parameter)
var INT_TYPE_CD = '01';             // BR-04
var INT_CAT_CD = 5;                 // BR-04
var INT_SOURCE = 'System';          // BR-04

var warnings = [];

function str(v) { return v === null || v === undefined ? '' : String(v); }
function rtrim(s) { return s.replace(/\s+$/, ''); }
function lines(text) {
  return str(text).split(/\r?\n/).filter(function (l) { return rtrim(l).length > 0; });
}
function field(line, start, len) {
  var s = line.substr(start, len);
  while (s.length < len) s += ' ';
  return s;
}

// Zoned decimal (DISPLAY, SIGN TRAILING overpunch as in the CardDemo ASCII files) -> integer in units of 10^-scale.
var OVERPUNCH_POS = '{ABCDEFGHI';
var OVERPUNCH_NEG = '}JKLMNOPQR';
function zoned(raw) {
  var s = str(raw).trim();
  if (s.length === 0) return 0;
  var sign = 1;
  if (s.charAt(0) === '-') { sign = -1; s = s.substr(1); }
  else if (s.charAt(0) === '+') { s = s.substr(1); }
  var last = s.charAt(s.length - 1);
  if (last === '-') { sign = -1; s = s.substr(0, s.length - 1); }
  else if (last === '+') { s = s.substr(0, s.length - 1); }
  else if (OVERPUNCH_POS.indexOf(last) >= 0) { s = s.substr(0, s.length - 1) + OVERPUNCH_POS.indexOf(last); }
  else if (OVERPUNCH_NEG.indexOf(last) >= 0) { sign = -1; s = s.substr(0, s.length - 1) + OVERPUNCH_NEG.indexOf(last); }
  s = s.replace(/[^0-9]/g, '');
  var n = s.length ? parseInt(s, 10) : 0;
  return sign * n;
}

function fmtCents(c) {
  var neg = c < 0;
  var a = Math.abs(c);
  var whole = Math.floor(a / 100);
  var frac = a % 100;
  return (neg ? '-' : '') + whole + '.' + (frac < 10 ? '0' : '') + frac;
}
function pad0(n, w) { var s = String(n); while (s.length < w) s = '0' + s; return s; }
function catKey(c) { var n = parseInt(str(c).trim(), 10); return isNaN(n) ? str(c).trim() : pad0(n, 4); }

// BR-03 + BR-08: monthlyInterest = (balance x rate) / 1200, COBOL COMPUTE default = truncation to 2 decimals.
// balance in cents, rate in hundredths of a percent -> interest in cents = bal*rate/(1200*100), truncated toward zero.
function monthlyInterestCents(balCents, rateHundredths) {
  if (typeof BigInt === 'function') {
    return Number(BigInt(balCents) * BigInt(rateHundredths) / BigInt(DIVISOR * 100));
  }
  return Math.trunc((balCents * rateHundredths) / (DIVISOR * 100));
}

function db2Timestamp(d) {
  return d.getUTCFullYear() + '-' + pad0(d.getUTCMonth() + 1, 2) + '-' + pad0(d.getUTCDate(), 2) + '-' +
    pad0(d.getUTCHours(), 2) + '.' + pad0(d.getUTCMinutes(), 2) + '.' + pad0(d.getUTCSeconds(), 2) + '.' +
    pad0(d.getUTCMilliseconds(), 3) + '000';
}

// ---- Parse inputs (copybook layouts) ----
// CVACT01Y (300): ACCT-ID 9(11), ACTIVE-STATUS X(1), CURR-BAL S9(10)V99, CREDIT-LIMIT S9(10)V99,
// CASH-CREDIT-LIMIT S9(10)V99, OPEN-DATE X(10), EXPIRAION-DATE X(10), REISSUE-DATE X(10),
// CURR-CYC-CREDIT S9(10)V99, CURR-CYC-DEBIT S9(10)V99, ADDR-ZIP X(10), GROUP-ID X(10), FILLER X(178)
var accounts = [];
var accountById = {};
lines(input.acctdata).forEach(function (l) {
  var a = {
    acctIdRaw: field(l, 0, 11),
    acctId: parseInt(field(l, 0, 11), 10),
    activeStatus: rtrim(field(l, 11, 1)),
    currBal: zoned(field(l, 12, 12)),
    creditLimit: zoned(field(l, 24, 12)),
    cashCreditLimit: zoned(field(l, 36, 12)),
    openDate: rtrim(field(l, 48, 10)),
    expirationDate: rtrim(field(l, 58, 10)),
    reissueDate: rtrim(field(l, 68, 10)),
    cycCredit: zoned(field(l, 78, 12)),
    cycDebit: zoned(field(l, 90, 12)),
    addrZip: rtrim(field(l, 102, 10)),
    groupId: rtrim(field(l, 112, 10))
  };
  accounts.push(a);
  accountById[a.acctId] = a;
});

// CVACT03Y (50): XREF-CARD-NUM X(16), XREF-CUST-ID 9(9), XREF-ACCT-ID 9(11), FILLER X(14)
var cardByAcct = {};
lines(input.cardxref).forEach(function (l) {
  var acct = parseInt(field(l, 25, 11), 10);
  if (!(acct in cardByAcct)) cardByAcct[acct] = rtrim(field(l, 0, 16)); // first xref of the account
});

// CVTRA02Y (50): DIS-ACCT-GROUP-ID X(10), DIS-TRAN-TYPE-CD X(2), DIS-TRAN-CAT-CD 9(4), DIS-INT-RATE S9(4)V99, FILLER
var rates = {};
lines(input.discgrp).forEach(function (l) {
  var key = rtrim(field(l, 0, 10)) + '|' + field(l, 10, 2).trim() + '|' + catKey(field(l, 12, 4));
  rates[key] = zoned(field(l, 16, 6));
});

// CVTRA01Y (50): TRANCAT-ACCT-ID 9(11), TRANCAT-TYPE-CD X(2), TRANCAT-CD 9(4), TRAN-CAT-BAL S9(9)V99, FILLER
var balances = lines(input.tcatbal).map(function (l, i) {
  return {
    seq: i,
    acctId: parseInt(field(l, 0, 11), 10),
    typeCd: field(l, 11, 2).trim(),
    catCd: catKey(field(l, 13, 4)),
    bal: zoned(field(l, 17, 11))
  };
});
// TCATBALF is a KSDS read sequentially -> process in key order (acct, type, cat).
balances.sort(function (x, y) {
  if (x.acctId !== y.acctId) return x.acctId - y.acctId;
  if (x.typeCd !== y.typeCd) return x.typeCd < y.typeCd ? -1 : 1;
  if (x.catCd !== y.catCd) return x.catCd < y.catCd ? -1 : 1;
  return x.seq - y.seq;
});

// ---- Process ----
var runDate = str(input.interestRunDate).trim() || DEFAULT_RUN_DATE;
var nowTs = db2Timestamp(new Date());
var tranSuffix = 0;
var systran = [];
var fallbackCount = 0;
var noRateCount = 0;
var updatedAccounts = 0;

// BR-01/BR-02: rate lookup on groupId + typeCode + categoryCode, DEFAULT group when missing.
function lookupRate(groupId, typeCd, catCd) {
  var k = groupId + '|' + typeCd + '|' + catCd;
  if (k in rates) return { rate: rates[k], usedFallback: false };
  var d = DEFAULT_GROUP + '|' + typeCd + '|' + catCd;
  if (d in rates) { fallbackCount++; return { rate: rates[d], usedFallback: true }; }
  noRateCount++;
  warnings.push('No disclosure rate for ' + k + ' nor DEFAULT; treated as rate 0');
  return { rate: 0, usedFallback: true };
}

// BR-06: add total interest to current balance, reset cycle credit/debit, rewrite account.
function updateAccount(acct, totalInt) {
  acct.currBal += totalInt;
  acct.cycCredit = 0;
  acct.cycDebit = 0;
  updatedAccounts++;
}

var current = null;
var currentId = null;
var totalInt = 0;
balances.forEach(function (b) {
  if (b.acctId !== currentId) {
    if (current) updateAccount(current, totalInt);
    totalInt = 0;
    currentId = b.acctId;
    current = accountById[b.acctId] || null;
    if (!current) warnings.push('Account ' + pad0(b.acctId, 11) + ' in tcatbal not found in acctdata; balances skipped');
  }
  if (!current) return;
  var r = lookupRate(current.groupId, b.typeCd, b.catCd);
  if (r.rate === 0) return; // BR-10 / AC-5: zero rate -> no interest transaction
  var interest = monthlyInterestCents(b.bal, r.rate);
  totalInt += interest;
  // BR-07: 1400-COMPUTE-FEES is an empty stub -> no fee transaction.
  tranSuffix++;
  systran.push({                                 // BR-04 / BR-05
    tran_id: runDate + pad0(tranSuffix, 6),
    type_cd: INT_TYPE_CD,
    cat_cd: INT_CAT_CD,
    source: INT_SOURCE,
    desc: 'Int. for a/c ' + pad0(current.acctId, 11),
    amt: fmtCents(interest),
    merchant_id: 0,
    merchant_name: '',
    merchant_city: '',
    merchant_zip: '',
    card_num: cardByAcct[current.acctId] || '',
    orig_ts: nowTs,
    proc_ts: nowTs
  });
  if (!(current.acctId in cardByAcct)) warnings.push('No card xref for account ' + pad0(current.acctId, 11));
});
if (current) updateAccount(current, totalInt); // last account in tcatbal order

output.intcalcSystran = systran;
output.intcalcAcctdata = accounts.map(function (a) {
  return {
    acct_id: a.acctId,
    active_status: a.activeStatus,
    curr_bal: fmtCents(a.currBal),
    credit_limit: fmtCents(a.creditLimit),
    cash_credit_limit: fmtCents(a.cashCreditLimit),
    open_date: a.openDate,
    expiration_date: a.expirationDate,
    reissue_date: a.reissueDate,
    curr_cyc_credit: fmtCents(a.cycCredit),
    curr_cyc_debit: fmtCents(a.cycDebit),
    addr_zip: a.addrZip,
    group_id: a.groupId
  };
});
output.runSummary = {
  interestRunDate: runDate,
  accountsRead: accounts.length,
  balancesRead: balances.length,
  transactionsWritten: systran.length,
  accountsUpdated: updatedAccounts,
  defaultRateFallbacks: fallbackCount,
  missingRates: noRateCount,
  warnings: warnings.join('\n')
};
