# Workflow: accrue_interest_calculation

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** P-15 interest-calculation (legacy ACCRUE / LXB002C). Input: raw fixed-width ledgacc/balcat/rategrp/cardlink file contents + interestRunDate. Output: accrue_systxn (interest transactions) and accrue_ledgacc (accounts after interest), in CONTRACT.md field names.

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae12e7a3695c563ea509547 | <uuid> | (0, 0) | → Parse input files (seq:<uuid>) |
| Parse input files | SCRIPT | 6ae12e7d3695c563ea509548 | <uuid> | (500, 0) | → Compute interest (seq:<uuid>) | lang: JAVASCRIPT |
| Compute interest | SCRIPT | 6ae12e803695c563ea509549 | <uuid> | (1000, 0) | → Build contract outputs (seq:<uuid>) | lang: JAVASCRIPT |
| Build contract outputs | SCRIPT | 6ae12e823695c563ea50954a | <uuid> | (1500, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae12e853695c563ea50954b | <uuid> | (2000, 0) | — |

## Systems
_(none)_

## Scripts

### Parse input files (SCRIPT, id=6ae12e7d3695c563ea509548)

```javascript
// Decode the fixed-width input files (one record per line, copybook layouts).
// ledgacc.dat  LXV022Y (300)  balcat.dat LXV026Y (50)
// rategrp.dat  LXV027Y (50)   cardlink.dat LXV024Y (50)

function records(raw, len) {
  var out = [];
  if (raw === null || raw === undefined) return out;
  var lines = String(raw).split(/\r?\n/);
  for (var i = 0; i < lines.length; i++) {
    var l = lines[i];
    if (l.replace(/\s+$/, '') === '') continue;   // blank line
    while (l.length < len) l += ' ';               // trailing spaces may be stripped
    out.push(l);
  }
  return out;
}

// Signed zoned decimal (PIC S9(n)V99, sign overpunched on the last byte).
// Returns the value as an integer count of the smallest unit (cents for V99).
function zoned(s) {
  var t = String(s).trim();
  if (t === '') return 0;
  var neg = false;
  if (t.charAt(0) === '-' || t.charAt(0) === '+') { neg = t.charAt(0) === '-'; t = t.substring(1); }
  var last = t.charAt(t.length - 1);
  var body = t.substring(0, t.length - 1);
  var d;
  var pos = '{ABCDEFGHI', negc = '}JKLMNOPQR', ascNeg = 'pqrstuvwxy';
  if (last >= '0' && last <= '9') d = last;
  else if (pos.indexOf(last) >= 0) d = String(pos.indexOf(last));
  else if (negc.indexOf(last) >= 0) { d = String(negc.indexOf(last)); neg = true; }
  else if (ascNeg.indexOf(last) >= 0) { d = String(ascNeg.indexOf(last)); neg = true; }
  else if (last === '-') { d = ''; neg = true; }
  else if (last === '+') { d = ''; }
  else d = '0';
  var digits = (body + d).replace(/[^0-9]/g, '');
  var v = digits === '' ? 0 : parseInt(digits, 10);
  return neg ? -v : v;
}

function f(rec, start, len) { return rec.substr(start, len); }

var accounts = [];
var accRecs = records(input.ledgacc, 300);
for (var i = 0; i < accRecs.length; i++) {
  var r = accRecs[i];
  accounts.push({
    accountId: f(r, 0, 11),
    activeStatus: f(r, 11, 1),
    currentBalance: zoned(f(r, 12, 12)),
    creditLimit: zoned(f(r, 24, 12)),
    cashCreditLimit: zoned(f(r, 36, 12)),
    openDate: f(r, 48, 10),
    expiryDate: f(r, 58, 10),
    reissueDate: f(r, 68, 10),
    currentCycleCredit: zoned(f(r, 78, 12)),
    currentCycleDebit: zoned(f(r, 90, 12)),
    addressZip: f(r, 102, 10),
    groupId: f(r, 112, 10)
  });
}

var balances = [];
var balRecs = records(input.balcat, 50);
for (var j = 0; j < balRecs.length; j++) {
  var b = balRecs[j];
  balances.push({ key: f(b, 0, 17), accountId: f(b, 0, 11), typeCode: f(b, 11, 2),
                  categoryCode: f(b, 13, 4), balance: zoned(f(b, 17, 11)) });
}

var rates = [];
var rateRecs = records(input.rategrp, 50);
for (var k = 0; k < rateRecs.length; k++) {
  var g = rateRecs[k];
  rates.push({ key: f(g, 0, 16), groupId: f(g, 0, 10), typeCode: f(g, 10, 2),
               categoryCode: f(g, 12, 4), interestRate: zoned(f(g, 16, 6)) });
}

var xrefs = [];
var xrefRecs = records(input.cardlink, 50);
for (var m = 0; m < xrefRecs.length; m++) {
  var x = xrefRecs[m];
  xrefs.push({ cardNumber: f(x, 0, 16), customerId: f(x, 16, 9), accountId: f(x, 25, 11) });
}

output.accounts = accounts;
output.balances = balances;
output.rates = rates;
output.xrefs = xrefs;
// Drop the raw file contents so later nodes do not carry them.
output.ledgacc = null;
output.balcat = null;
output.rategrp = null;
output.cardlink = null;
```

### Compute interest (SCRIPT, id=6ae12e803695c563ea509549)

```javascript
// P-15 interest-calculation (LXB002C). Amounts are integer cents, rates integer hundredths of a percent.
var DIVISOR = 1200;               // 12 months x 100 (constant in script)
var FALLBACK_GROUP = 'STANDARD';  // BR-02
var INTEREST_TYPE = '07';         // BR-04
var INTEREST_CATEGORY = '0012';   // BR-04
var INTEREST_SOURCE = 'Batch';    // BR-04

var runDate = (input.interestRunDate === null || input.interestRunDate === undefined || String(input.interestRunDate).trim() === '')
  ? '2022071800' : String(input.interestRunDate).trim();   // BR-05 (Configuration Parameter default)
var businessDate = (input.businessDate === null || input.businessDate === undefined || String(input.businessDate).trim() === '')
  ? '2022-07-18' : String(input.businessDate).trim();
var timestamp = businessDate + '-00.00.00.000000';

function num(id) { return parseInt(String(id).trim() || '0', 10); }
function pad(s, n) { s = String(s); while (s.length < n) s = s + ' '; return s.substring(0, n); }
function zpad(v, n) { var s = String(v); while (s.length < n) s = '0' + s; return s; }

// BR-03 with COBOL COMPUTE default truncation (BR-08): trunc(bal x rate / 1200) to the cent.
function monthlyInterest(balCents, rateHundredths) {
  var den = DIVISOR * 100;
  var p = balCents * rateHundredths;
  if (Math.abs(p) <= 9007199254740991) {
    return (p - (p % den)) / den;          // % keeps the dividend's sign: truncation toward zero
  }
  return Number(BigInt(balCents) * BigInt(rateHundredths) / BigInt(den));
}

// Account store (by numeric id), in file order for the output.
var accounts = [];
var accIndex = {};
for (var i = 0; i < input.accounts.length; i++) {
  var a = input.accounts[i];
  var acc = {
    accountId: String(a.accountId), activeStatus: String(a.activeStatus),
    currentBalance: Number(a.currentBalance), creditLimit: Number(a.creditLimit),
    cashCreditLimit: Number(a.cashCreditLimit), openDate: String(a.openDate),
    expiryDate: String(a.expiryDate), reissueDate: String(a.reissueDate),
    currentCycleCredit: Number(a.currentCycleCredit), currentCycleDebit: Number(a.currentCycleDebit),
    addressZip: String(a.addressZip), groupId: String(a.groupId)
  };
  accounts.push(acc);
  accIndex[num(acc.accountId)] = acc;
}

// Disclosure-group rates keyed by groupId(10)+typeCode(2)+categoryCode(4) (BR-01).
var rateIndex = {};
for (var r = 0; r < input.rates.length; r++) {
  var g = input.rates[r];
  rateIndex[pad(g.groupId, 10) + pad(g.typeCode, 2) + zpad(num(g.categoryCode), 4)] = Number(g.interestRate);
}

// Card cross-reference by account (alternate-index read): lowest card number wins.
var cardIndex = {};
for (var x = 0; x < input.xrefs.length; x++) {
  var xr = input.xrefs[x];
  var k = num(xr.accountId);
  var cn = String(xr.cardNumber);
  if (cardIndex[k] === undefined || cn < cardIndex[k]) cardIndex[k] = cn;
}

// Category balances read in key order (VSAM KSDS sequential read).
var balances = [];
for (var b = 0; b < input.balances.length; b++) {
  var cb = input.balances[b];
  balances.push({ key: String(cb.key), accountId: String(cb.accountId), typeCode: String(cb.typeCode),
                  categoryCode: String(cb.categoryCode), balance: Number(cb.balance) });
}
balances.sort(function (p, q) { return p.key < q.key ? -1 : (p.key > q.key ? 1 : 0); });

var transactions = [];
var suffix = 0;
var fallbackUsed = 0;
var missingRate = [];
var missingAccounts = [];
var updatedAccounts = 0;

var currentAcct = null;   // numeric id of the account being accumulated
var totalInterest = 0;

function updateAccount(id, total) {   // BR-06
  var acc = accIndex[id];
  if (!acc) return;
  acc.currentBalance = acc.currentBalance + total;
  acc.currentCycleCredit = 0;
  acc.currentCycleDebit = 0;
  updatedAccounts++;
}

for (var n = 0; n < balances.length; n++) {
  var cat = balances[n];
  var id = num(cat.accountId);
  if (currentAcct !== null && id !== currentAcct) {
    updateAccount(currentAcct, totalInterest);
  }
  if (id !== currentAcct) { currentAcct = id; totalInterest = 0; }

  var acc = accIndex[id];
  if (!acc) { if (missingAccounts.indexOf(cat.accountId) < 0) missingAccounts.push(cat.accountId); continue; }

  var tc = pad(cat.typeCode, 2), cc = zpad(num(cat.categoryCode), 4);
  var rate = rateIndex[pad(acc.groupId, 10) + tc + cc];
  if (rate === undefined) {                              // file status 23 -> STANDARD (BR-02)
    rate = rateIndex[pad(FALLBACK_GROUP, 10) + tc + cc];
    fallbackUsed++;
    if (rate === undefined) { missingRate.push(cat.key); rate = 0; }
  }

  if (rate !== 0) {                                      // BR-03, BR-10
    var interest = monthlyInterest(cat.balance, rate);
    totalInterest += interest;
    suffix++;
    transactions.push({                                  // BR-04, BR-05
      transactionId: runDate + zpad(suffix, 6),
      typeCode: INTEREST_TYPE,
      categoryCode: INTEREST_CATEGORY,
      source: INTEREST_SOURCE,
      description: 'Accrued int ' + acc.accountId,
      amount: interest,
      merchantId: 0, merchantName: '', merchantCity: '', merchantZip: '',
      cardNumber: cardIndex[id] === undefined ? '' : cardIndex[id],
      originalTimestamp: timestamp,
      processedTimestamp: timestamp
    });
  }
  // BR-07: fee computation is an empty stub in legacy - no fee transaction.
}
if (currentAcct !== null) updateAccount(currentAcct, totalInterest);   // last account at end of file

output.interestTransactions = transactions;
output.accountsAfterInterest = accounts;
output.runSummary = {
  interestRunDate: runDate,
  categoryBalancesRead: balances.length,
  interestTransactionsWritten: transactions.length,
  accountsUpdated: updatedAccounts,
  standardFallbackLookups: fallbackUsed,
  categoriesWithoutAnyRate: missingRate,
  balancesForUnknownAccounts: missingAccounts
};
output.accounts = null;
output.balances = null;
output.rates = null;
output.xrefs = null;
```

### Build contract outputs (SCRIPT, id=6ae12e823695c563ea50954a)

```javascript
// Map to the CONTRACT.md output records: accrue_systxn.json and accrue_ledgacc.json.
function amt(cents) {
  var c = Number(cents);
  var neg = c < 0;
  if (neg) c = -c;
  var whole = Math.floor(c / 100);
  var frac = String(c % 100);
  if (frac.length < 2) frac = '0' + frac;
  return (neg ? '-' : '') + whole + '.' + frac;
}
function str(s) { return s === null || s === undefined ? '' : String(s).replace(/\s+$/, ''); }
function int(s) { var v = parseInt(String(s).trim() || '0', 10); return isNaN(v) ? 0 : v; }

var systxn = [];
var txns = input.interestTransactions;
for (var i = 0; i < txns.length; i++) {
  var t = txns[i];
  systxn.push({
    tran_id: str(t.transactionId),
    type_cd: str(t.typeCode),
    cat_cd: int(t.categoryCode),
    source: str(t.source),
    desc: str(t.description),
    amt: amt(t.amount),
    merchant_id: int(t.merchantId),
    merchant_name: str(t.merchantName),
    merchant_city: str(t.merchantCity),
    merchant_zip: str(t.merchantZip),
    card_num: str(t.cardNumber),
    orig_ts: str(t.originalTimestamp),
    proc_ts: str(t.processedTimestamp)
  });
}

var ledgacc = [];
var accs = input.accountsAfterInterest;
for (var j = 0; j < accs.length; j++) {
  var a = accs[j];
  ledgacc.push({
    acct_id: int(a.accountId),
    active_status: str(a.activeStatus),
    curr_bal: amt(a.currentBalance),
    credit_limit: amt(a.creditLimit),
    cash_credit_limit: amt(a.cashCreditLimit),
    open_date: str(a.openDate),
    expiration_date: str(a.expiryDate),
    reissue_date: str(a.reissueDate),
    curr_cyc_credit: amt(a.currentCycleCredit),
    curr_cyc_debit: amt(a.currentCycleDebit),
    addr_zip: str(a.addressZip),
    group_id: str(a.groupId)
  });
}

output.accrue_systxn = systxn;
output.accrue_ledgacc = ledgacc;
output.interestTransactions = null;
output.accountsAfterInterest = null;
```

_(server: 264 ms, 1 API call, 261 ms in API)_
