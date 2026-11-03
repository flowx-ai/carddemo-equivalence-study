# Workflow: intcalc_batch

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** CardDemo INTCALC (CBACT04C) - interest calculation batch step (P-15). Input: fixed-width acctdata/tcatbal/discgrp/cardxref text + interestRunDate (PARM). Output: intcalc_systran[] and intcalc_acctdata[] per CONTRACT.md.

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae1d4783695c563ea50a97f | <uuid> | (0, 0) | → Parse input files (seq:<uuid>) |
| Parse input files | SCRIPT | 6ae1d4843695c563ea50a980 | <uuid> | (500, 0) | → Compute interest (CBACT04C) (seq:<uuid>) | lang: JAVASCRIPT |
| Compute interest (CBACT04C) | SCRIPT | 6ae1d4863695c563ea50a981 | <uuid> | (1000, 0) | → Build contract outputs (seq:<uuid>) | lang: JAVASCRIPT |
| Build contract outputs | SCRIPT | 6ae1d4893695c563ea50a982 | <uuid> | (1500, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae1d48c3695c563ea50a983 | <uuid> | (2000, 0) | — |

## Systems
_(none)_

## Scripts

### Parse input files (SCRIPT, id=6ae1d4843695c563ea50a980)

```javascript
// INTCALC step 1 - parse the fixed-width input files (one record per line, copybook layouts).
//   acctdata  CVACT01Y (300)   tcatbal CVTRA01Y (50)   discgrp CVTRA02Y (50)   cardxref CVACT03Y (50)
// Signed zoned decimals S9(n)V99 are kept as integer strings in hundredths, so no precision is lost
// between nodes (BigInt arithmetic happens in the next node).

function lines(text) {
  if (text === null || text === undefined) return [];
  var raw = String(text).split('\n');
  var out = [];
  for (var i = 0; i < raw.length; i++) {
    var l = raw[i].replace(/\r$/, '');
    if (l.trim() !== '') out.push(l);
  }
  return out;
}

// 1-based start position; a right-trimmed line is padded back with spaces
function field(line, start, len) {
  var s = line.substring(start - 1, start - 1 + len);
  while (s.length < len) s += ' ';
  return s;
}

// zoned decimal with implied V99 -> integer string in hundredths
// sign: EBCDIC-style overpunch ({A-I positive, }J-R negative), ASCII-style p-y negative,
// or an explicit leading/trailing +/-; an explicit '.' is also accepted
function zoned(raw) {
  var s = raw.trim();
  if (s === '') return '0';
  var neg = false;
  var head = s.charAt(0);
  if (head === '-' || head === '+') { neg = head === '-'; s = s.substring(1); }
  var tail = s.charAt(s.length - 1);
  if (tail === '-' || tail === '+') { neg = tail === '-'; s = s.substring(0, s.length - 1); tail = s.charAt(s.length - 1); }
  var p = '{ABCDEFGHI'.indexOf(tail), n = '}JKLMNOPQR'.indexOf(tail), a = 'pqrstuvwxy'.indexOf(tail);
  if (p >= 0) { s = s.substring(0, s.length - 1) + p; }
  else if (n >= 0) { neg = true; s = s.substring(0, s.length - 1) + n; }
  else if (a >= 0) { neg = true; s = s.substring(0, s.length - 1) + a; }
  var digits;
  var dot = s.indexOf('.');
  if (dot >= 0) digits = s.substring(0, dot) + (s.substring(dot + 1) + '00').substring(0, 2);
  else digits = s;
  if (!/^[0-9]*$/.test(digits)) throw new Error('Invalid zoned decimal [' + raw + ']');
  digits = digits.replace(/^0+/, '');
  if (digits === '') return '0';
  return (neg ? '-' : '') + digits;
}

var accounts = [];
var al = lines(input.acctdata);
for (var i = 0; i < al.length; i++) {
  var l = al[i];
  accounts.push({
    acctId: field(l, 1, 11).trim(),
    activeStatus: field(l, 12, 1),
    currBal: zoned(field(l, 13, 12)),
    creditLimit: zoned(field(l, 25, 12)),
    cashCreditLimit: zoned(field(l, 37, 12)),
    openDate: field(l, 49, 10),
    expirationDate: field(l, 59, 10),
    reissueDate: field(l, 69, 10),
    currCycCredit: zoned(field(l, 79, 12)),
    currCycDebit: zoned(field(l, 91, 12)),
    addrZip: field(l, 103, 10),
    groupId: field(l, 113, 10)
  });
}

var balances = [];
var bl = lines(input.tcatbal);
for (var j = 0; j < bl.length; j++) {
  var b = bl[j];
  balances.push({
    acctId: field(b, 1, 11).trim(),
    typeCd: field(b, 12, 2),
    catCd: field(b, 14, 4).trim(),
    bal: zoned(field(b, 18, 11))
  });
}

var groups = [];
var dl = lines(input.discgrp);
for (var k = 0; k < dl.length; k++) {
  var d = dl[k];
  groups.push({
    groupId: field(d, 1, 10),
    typeCd: field(d, 11, 2),
    catCd: field(d, 13, 4).trim(),
    rate: zoned(field(d, 17, 6))
  });
}

var xrefs = [];
var xl = lines(input.cardxref);
for (var m = 0; m < xl.length; m++) {
  var x = xl[m];
  xrefs.push({
    cardNum: field(x, 1, 16).trim(),
    custId: field(x, 17, 9).trim(),
    acctId: field(x, 26, 11).trim()
  });
}

output.parsed = { accounts: accounts, balances: balances, groups: groups, xrefs: xrefs };

```

### Compute interest (CBACT04C) (SCRIPT, id=6ae1d4863695c563ea50a981)

```javascript
// INTCALC step 2 - interest calculation (P-15, legacy CBACT04C).
// Amounts and rates are integers in hundredths (BigInt), so interest is exact before truncation.
//   BR-01 rate key = account.groupId + typeCode + categoryCode
//   BR-02 not found -> retry with group DEFAULT
//   BR-03 effective rate = group rate - 2.00 (min 0.00) when openDate <= run date minus ten years;
//         if effective rate != 0: monthlyInterest = balance * rate / 1200
//   BR-04 interest transaction type 01, category 05, source System, desc "Int. for a/c <accountId>"
//   BR-05 transaction id = PARM (interestRunDate) + running suffix
//   BR-06 on each change of account: currentBalance += totalInterest, cycle credit/debit = 0
//   BR-07 fees: empty stub, nothing charged
//   BR-08 COBOL COMPUTE default truncation (no ROUNDED)

var DEFAULT_RUN_PARM = '2022071800';
var DIVISOR = 120000n; // 1200 (12 months x 100) x 100 (rate held in hundredths)

function str(v) { return (v === null || v === undefined) ? '' : String(v); }
function rtrim(s) { return str(s).replace(/\s+$/, ''); }
function lpad(s, len, ch) { s = str(s); while (s.length < len) s = ch + s; return s; }
function acctKey(s) { var t = str(s).trim(); return /^[0-9]+$/.test(t) ? lpad(t, 11, '0') : t; }
function catKey(s) { var t = str(s).trim(); return /^[0-9]+$/.test(t) ? lpad(String(parseInt(t, 10)), 4, '0') : t; }
function typeKey(s) { var t = str(s); while (t.length < 2) t += ' '; return t.substring(0, 2); }
function toArray(list) { var a = []; if (list) { for (var i = 0; i < list.length; i++) a.push(list[i]); } return a; }

var parm = rtrim(input.interestRunDate).trim();
if (parm === '') parm = DEFAULT_RUN_PARM;
if (!/^[0-9]{8}/.test(parm)) throw new Error('interestRunDate must start with YYYYMMDD, got [' + parm + ']');
var runYmd = parseInt(parm.substring(0, 8), 10);
var cutoffYmd = runYmd - 100000; // same calendar date, ten years earlier (2022-07-18 -> 2012-07-18)
var tranIdPrefix = parm.length > 10 ? parm.substring(0, 10) : parm;

function db2Timestamp(d) {
  return d.getFullYear() + '-' + lpad(d.getMonth() + 1, 2, '0') + '-' + lpad(d.getDate(), 2, '0') + '-' +
    lpad(d.getHours(), 2, '0') + '.' + lpad(d.getMinutes(), 2, '0') + '.' + lpad(d.getSeconds(), 2, '0') + '.' +
    lpad(Math.floor(d.getMilliseconds() / 10), 2, '0') + '0000';
}
var runTs = rtrim(input.runTimestamp);
if (runTs === '') runTs = db2Timestamp(new Date());

function isLongStanding(openDate) {
  var digits = str(openDate).replace(/[^0-9]/g, '');
  if (digits.length !== 8) return false;
  return parseInt(digits, 10) <= cutoffYmd;
}

var P = input.parsed;
var accounts = toArray(P.accounts).map(function (a) {
  return {
    acctId: str(a.acctId), activeStatus: str(a.activeStatus), currBal: str(a.currBal),
    creditLimit: str(a.creditLimit), cashCreditLimit: str(a.cashCreditLimit),
    openDate: str(a.openDate), expirationDate: str(a.expirationDate), reissueDate: str(a.reissueDate),
    currCycCredit: str(a.currCycCredit), currCycDebit: str(a.currCycDebit),
    addrZip: str(a.addrZip), groupId: str(a.groupId)
  };
});

var acctIndex = {};
for (var i = 0; i < accounts.length; i++) {
  var ak0 = acctKey(accounts[i].acctId);
  if (acctIndex[ak0] === undefined) acctIndex[ak0] = i;
}

// DISCGRP is a KSDS keyed on group+type+category: the first row of a duplicated key wins
var rates = {};
toArray(P.groups).forEach(function (g) {
  var key = rtrim(g.groupId) + '|' + typeKey(g.typeCd) + '|' + catKey(g.catCd);
  if (rates[key] === undefined) rates[key] = str(g.rate);
});

// CXACAIX (xref by account id): lowest card number of the account
var cardByAcct = {};
toArray(P.xrefs).forEach(function (x) {
  var key = acctKey(x.acctId);
  var card = str(x.cardNum);
  if (cardByAcct[key] === undefined || card < cardByAcct[key]) cardByAcct[key] = card;
});

// TCATBAL is read sequentially in KSDS key order (account, type, category)
var balances = toArray(P.balances).map(function (b) {
  return { acctKey: acctKey(b.acctId), typeCd: typeKey(b.typeCd), catCd: catKey(b.catCd), bal: str(b.bal) };
});
balances.sort(function (x, y) {
  var kx = x.acctKey + x.typeCd + x.catCd, ky = y.acctKey + y.typeCd + y.catCd;
  return kx < ky ? -1 : (kx > ky ? 1 : 0);
});

var report = {
  interestRunDate: parm, balancesRead: balances.length, accountsRead: accounts.length,
  accountsUpdated: 0, interestTransactions: 0, defaultRateUsed: 0, zeroRateSkipped: 0,
  totalInterest: '0', missingAccounts: [], missingRates: [], missingXref: []
};

var transactions = [];
var suffix = 0;
var lastAcct = null;
var current = null;
var cardNum = '';
var longStanding = false;
var totalInt = 0n;
var grandTotal = 0n;

// 1050-UPDATE-ACCOUNT
function updateAccount() {
  if (current === null) return;
  current.currBal = (BigInt(current.currBal) + totalInt).toString();
  current.currCycCredit = '0';
  current.currCycDebit = '0';
  report.accountsUpdated++;
}

for (var n = 0; n < balances.length; n++) {
  var b = balances[n];
  if (b.acctKey !== lastAcct) {
    if (lastAcct !== null) updateAccount();
    totalInt = 0n;
    lastAcct = b.acctKey;
    var idx = acctIndex[b.acctKey];
    current = idx === undefined ? null : accounts[idx];
    if (current === null) report.missingAccounts.push(b.acctKey);
    cardNum = cardByAcct[b.acctKey] === undefined ? '' : cardByAcct[b.acctKey];
    if (current !== null && cardByAcct[b.acctKey] === undefined) report.missingXref.push(b.acctKey);
    longStanding = current !== null && isLongStanding(current.openDate);
  }
  if (current === null) continue;

  // 1200-GET-INTEREST-RATE / 1200-A-GET-DEFAULT-INT-RATE
  var group = rtrim(current.groupId);
  var rate = rates[group + '|' + b.typeCd + '|' + b.catCd];
  if (rate === undefined) {
    rate = rates['DEFAULT|' + b.typeCd + '|' + b.catCd];
    if (rate !== undefined) report.defaultRateUsed++;
  }
  if (rate === undefined) {
    report.missingRates.push(b.acctKey + '/' + group + '/' + b.typeCd + '/' + b.catCd);
    continue;
  }

  var effRate = BigInt(rate);
  if (longStanding) {
    effRate = effRate - 200n;
    if (effRate < 0n) effRate = 0n;
  }
  if (effRate === 0n) { report.zeroRateSkipped++; continue; }

  // 1300-COMPUTE-INTEREST: BigInt division truncates toward zero, like COMPUTE without ROUNDED
  var interest = BigInt(b.bal) * effRate / DIVISOR;
  totalInt += interest;
  grandTotal += interest;

  // 1300-B-WRITE-TX
  suffix++;
  transactions.push({
    tranId: tranIdPrefix + lpad(suffix, 6, '0'),
    typeCd: '01',
    catCd: '0005',
    source: 'System',
    desc: 'Int. for a/c ' + b.acctKey,
    amount: interest.toString(),
    merchantId: '0',
    merchantName: '',
    merchantCity: '',
    merchantZip: '',
    cardNum: cardNum,
    origTs: runTs,
    procTs: runTs,
    acctId: b.acctKey,
    balanceTypeCd: b.typeCd,
    balanceCatCd: b.catCd,
    balance: b.bal,
    rate: rate,
    effectiveRate: effRate.toString()
  });
  // 1400-COMPUTE-FEES: empty stub (BR-07)
}
if (lastAcct !== null) updateAccount();

report.interestTransactions = transactions.length;
report.totalInterest = grandTotal.toString();

output.computed = { transactions: transactions, accounts: accounts, report: report };

```

### Build contract outputs (SCRIPT, id=6ae1d4893695c563ea50a982)

```javascript
// INTCALC step 3 - shape the results as the CONTRACT.md outputs:
//   intcalc_systran  - transaction fields for every interest transaction written
//   intcalc_acctdata - account fields for every account, after interest
// Amounts are strings with exactly two decimals; strings drop trailing spaces.

function str(v) { return (v === null || v === undefined) ? '' : String(v); }
function rtrim(s) { return str(s).replace(/\s+$/, ''); }
function toArray(list) { var a = []; if (list) { for (var i = 0; i < list.length; i++) a.push(list[i]); } return a; }
function money(hundredths) {
  var s = str(hundredths);
  var neg = s.charAt(0) === '-';
  if (neg) s = s.substring(1);
  while (s.length < 3) s = '0' + s;
  var txt = s.substring(0, s.length - 2) + '.' + s.substring(s.length - 2);
  return (neg && txt !== '0.00' ? '-' : '') + txt;
}
function int(s) { var t = str(s).trim(); return /^-?[0-9]+$/.test(t) ? parseInt(t, 10) : t; }

var C = input.computed;

var systran = toArray(C.transactions).map(function (t) {
  return {
    tran_id: str(t.tranId),
    type_cd: str(t.typeCd),
    cat_cd: int(t.catCd),
    source: str(t.source),
    desc: rtrim(t.desc),
    amt: money(t.amount),
    merchant_id: int(t.merchantId),
    merchant_name: rtrim(t.merchantName),
    merchant_city: rtrim(t.merchantCity),
    merchant_zip: rtrim(t.merchantZip),
    card_num: rtrim(t.cardNum),
    orig_ts: rtrim(t.origTs),
    proc_ts: rtrim(t.procTs)
  };
});

var acctdata = toArray(C.accounts).map(function (a) {
  return {
    acct_id: int(a.acctId),
    active_status: rtrim(a.activeStatus),
    curr_bal: money(a.currBal),
    credit_limit: money(a.creditLimit),
    cash_credit_limit: money(a.cashCreditLimit),
    open_date: rtrim(a.openDate),
    expiration_date: rtrim(a.expirationDate),
    reissue_date: rtrim(a.reissueDate),
    curr_cyc_credit: money(a.currCycCredit),
    curr_cyc_debit: money(a.currCycDebit),
    addr_zip: rtrim(a.addrZip),
    group_id: rtrim(a.groupId)
  };
});

var r = C.report;
var report = {
  interestRunDate: str(r.interestRunDate),
  accountsRead: r.accountsRead, balancesRead: r.balancesRead, accountsUpdated: r.accountsUpdated,
  interestTransactions: r.interestTransactions, defaultRateUsed: r.defaultRateUsed,
  zeroRateSkipped: r.zeroRateSkipped, totalInterest: money(r.totalInterest),
  missingAccounts: toArray(r.missingAccounts).map(str),
  missingRates: toArray(r.missingRates).map(str),
  missingXref: toArray(r.missingXref).map(str)
};

output.result = { intcalc_systran: systran, intcalc_acctdata: acctdata, report: report };

```

_(server: 188 ms, 1 API call, 185 ms in API)_
