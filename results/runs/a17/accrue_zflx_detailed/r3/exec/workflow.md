# Workflow: interest_calculation

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** Ledgerline ACCRUE (LXB002C, P-15): monthly interest per account/type/category balance, interest transactions (type 07 / cat 12), account update with cycle reset. Inputs: raw ledgacc/balcat/rategrp/cardlink file text; outputs accrue_systxn + accrue_ledgacc.

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae134353695c563ea509611 | <uuid> | (0, 0) | → Parse input files (seq:<uuid>) |
| Parse input files | SCRIPT | 6ae134383695c563ea509612 | <uuid> | (500, 0) | → Compute interest and update accounts (seq:<uuid>) | lang: JAVASCRIPT |
| Compute interest and update accounts | SCRIPT | 6ae1343a3695c563ea509613 | <uuid> | (1000, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae1343d3695c563ea509614 | <uuid> | (1500, 0) | — |

## Systems
_(none)_

## Scripts

### Parse input files (SCRIPT, id=6ae134383695c563ea509612)

```javascript
// Parse the ACCRUE input files (raw text) into records.
// Each input is either fixed-width text (one record per line, copybook layout)
// or a JSON array (the oracle's POSTDAY JSON outputs, contract field names).
var warnings = [];
var POS = {'{':0,'A':1,'B':2,'C':3,'D':4,'E':5,'F':6,'G':7,'H':8,'I':9};
var NEG = {'}':0,'J':1,'K':2,'L':3,'M':4,'N':5,'O':6,'P':7,'Q':8,'R':9};

function str(v) { return (v === null || v === undefined) ? '' : String(v); }
function rtrim(s) { return str(s).replace(/\s+$/, ''); }

// Decimal text ("14.56", "-500", 15) -> integer minor units (scale 2).
function decToCents(v) {
  var s = str(v).trim();
  if (s === '') return 0;
  var sign = 1;
  if (s.charAt(0) === '-') { sign = -1; s = s.substring(1); } else if (s.charAt(0) === '+') { s = s.substring(1); }
  var parts = s.split('.');
  var ip = parts[0] === '' ? '0' : parts[0];
  var fp = (parts.length > 1 ? parts[1] : '') + '00';
  return sign * (parseInt(ip, 10) * 100 + parseInt(fp.substring(0, 2), 10));
}

// Zoned decimal PIC S9(n)V99 with trailing overpunch sign -> integer minor units.
function zoned(raw) {
  var s = str(raw).trim();
  if (s === '') return 0;
  if (s.indexOf('.') >= 0) return decToCents(s);
  var sign = 1;
  if (s.charAt(0) === '-') { sign = -1; s = s.substring(1); }
  else if (s.charAt(0) === '+') { s = s.substring(1); }
  var last = s.charAt(s.length - 1);
  if (last === '-') { sign = -1; s = s.substring(0, s.length - 1); }
  else if (last === '+') { s = s.substring(0, s.length - 1); }
  else if (POS[last] !== undefined) { s = s.substring(0, s.length - 1) + POS[last]; }
  else if (NEG[last] !== undefined) { sign = -1; s = s.substring(0, s.length - 1) + NEG[last]; }
  if (!/^[0-9]+$/.test(s)) { warnings.push('Unparseable numeric field: [' + raw + ']'); return 0; }
  return sign * parseInt(s, 10);
}

function isJson(text) { var t = str(text).trim(); return t.charAt(0) === '['; }
function lines(text) {
  return str(text).split(/\r?\n/).filter(function (l) { return rtrim(l).length > 0; });
}
function pad(l, n) { l = str(l); while (l.length < n) l += ' '; return l; }
function f(l, start, len) { return l.substring(start, start + len); }
function digits(v, n) { var s = String(parseInt(str(v).trim() || '0', 10)); while (s.length < n) s = '0' + s; return s; }

// LXV022Y account (300)
function parseAccounts(text) {
  if (isJson(text)) {
    return JSON.parse(str(text)).map(function (r) {
      return {
        acctId: digits(r.acct_id, 11), activeStatus: rtrim(r.active_status),
        currBal: decToCents(r.curr_bal), creditLimit: decToCents(r.credit_limit),
        cashCreditLimit: decToCents(r.cash_credit_limit), openDate: rtrim(r.open_date),
        expirationDate: rtrim(r.expiration_date), reissueDate: rtrim(r.reissue_date),
        currCycCredit: decToCents(r.curr_cyc_credit), currCycDebit: decToCents(r.curr_cyc_debit),
        addrZip: rtrim(r.addr_zip), groupId: rtrim(r.group_id)
      };
    });
  }
  return lines(text).map(function (l) {
    l = pad(l, 300);
    return {
      acctId: f(l, 0, 11), activeStatus: rtrim(f(l, 11, 1)),
      currBal: zoned(f(l, 12, 12)), creditLimit: zoned(f(l, 24, 12)), cashCreditLimit: zoned(f(l, 36, 12)),
      openDate: rtrim(f(l, 48, 10)), expirationDate: rtrim(f(l, 58, 10)), reissueDate: rtrim(f(l, 68, 10)),
      currCycCredit: zoned(f(l, 78, 12)), currCycDebit: zoned(f(l, 90, 12)),
      addrZip: rtrim(f(l, 102, 10)), groupId: rtrim(f(l, 112, 10))
    };
  });
}

// LXV026Y category balance (50)
function parseBalances(text) {
  if (isJson(text)) {
    return JSON.parse(str(text)).map(function (r) {
      return { acctId: digits(r.acct_id, 11), typeCd: rtrim(r.type_cd), catCd: parseInt(str(r.cat_cd).trim() || '0', 10), bal: decToCents(r.bal) };
    });
  }
  return lines(text).map(function (l) {
    l = pad(l, 50);
    return { acctId: f(l, 0, 11), typeCd: rtrim(f(l, 11, 2)), catCd: parseInt(f(l, 13, 4), 10), bal: zoned(f(l, 17, 11)) };
  });
}

// LXV027Y disclosure group (50): rate S9(4)V99 -> hundredths of a percent
function parseRates(text) {
  if (isJson(text)) {
    return JSON.parse(str(text)).map(function (r) {
      return { groupId: rtrim(r.group_id), typeCd: rtrim(r.type_cd), catCd: parseInt(str(r.cat_cd).trim() || '0', 10), rate: decToCents(r.rate !== undefined ? r.rate : r.int_rate) };
    });
  }
  return lines(text).map(function (l) {
    l = pad(l, 50);
    return { groupId: rtrim(f(l, 0, 10)), typeCd: rtrim(f(l, 10, 2)), catCd: parseInt(f(l, 12, 4), 10), rate: zoned(f(l, 16, 6)) };
  });
}

// LXV024Y card xref (50)
function parseXrefs(text) {
  if (isJson(text)) {
    return JSON.parse(str(text)).map(function (r) {
      return { cardNum: rtrim(r.card_num), custId: rtrim(r.cust_id), acctId: digits(r.acct_id, 11) };
    });
  }
  return lines(text).map(function (l) {
    l = pad(l, 50);
    return { cardNum: rtrim(f(l, 0, 16)), custId: f(l, 16, 9), acctId: f(l, 25, 11) };
  });
}

var accounts = parseAccounts(input.ledgacc);
var balances = parseBalances(input.balcat);
var rates = parseRates(input.rategrp);
var xrefs = parseXrefs(input.cardlink);

output.parsed = { accounts: accounts, balances: balances, rates: rates, xrefs: xrefs };
output.parseWarnings = warnings;
// Drop the raw file text so it is not carried through the rest of the run.
output.ledgacc = null; output.balcat = null; output.rategrp = null; output.cardlink = null;
```

### Compute interest and update accounts (SCRIPT, id=6ae1343a3695c563ea509613)

```javascript
// ACCRUE / LXB002C interest calculation (P-15, BR-01..BR-10).
// All amounts are integer minor units (cents); rates are hundredths of a percent.
var DIVISOR = 1200;                 // 12 months x 100 (constant in script)
var FALLBACK_GROUP = 'STANDARD';    // BR-02
var TXN_TYPE = '07', TXN_CAT = 12, TXN_SOURCE = 'Batch', TXN_DESC = 'Accrued int '; // BR-04
var SUFFIX_WIDTH = 6;               // 16-char transactionId = 10-char run date + 6-digit suffix (BR-05)

var p = input.parsed;
var notes = [];
var runDate = String(input.interestRunDate || '2022071800').trim();

function n2(v) { return v < 10 ? '0' + v : '' + v; }
function db2Timestamp() {
  if (input.runTimestamp) return String(input.runTimestamp);
  var d = new Date();
  return d.getFullYear() + '-' + n2(d.getMonth() + 1) + '-' + n2(d.getDate()) + '-' +
    n2(d.getHours()) + '.' + n2(d.getMinutes()) + '.' + n2(d.getSeconds()) + '.' +
    n2(Math.floor(d.getMilliseconds() / 10)) + '0000';
}
var ts = db2Timestamp();

function cents(v) {
  var neg = v < 0, a = Math.abs(v);
  var c = a % 100, i = (a - c) / 100;
  return (neg ? '-' : '') + i + '.' + (c < 10 ? '0' + c : c);
}

// BR-03 / BR-08: interest = balance x rate / 1200, truncated (COBOL COMPUTE without ROUNDED).
// In minor units: cents = balanceCents x rateHundredths / (1200 x 100), truncated toward zero.
function monthlyInterest(balCents, rateHundredths) {
  var den = DIVISOR * 100;
  if (typeof BigInt === 'function') {
    return Number((BigInt(balCents) * BigInt(rateHundredths)) / BigInt(den)); // BigInt division truncates toward zero
  }
  var prod = balCents * rateHundredths;
  return (prod < 0 ? -1 : 1) * Math.floor(Math.abs(prod) / den);
}

// Index accounts (keep the first record per key, as a KSDS load would).
var accounts = [], accountByKey = {};
for (var i = 0; i < p.accounts.length; i++) {
  var a0 = p.accounts[i];
  var a = { acctId: String(a0.acctId), activeStatus: a0.activeStatus, currBal: Number(a0.currBal),
    creditLimit: Number(a0.creditLimit), cashCreditLimit: Number(a0.cashCreditLimit), openDate: a0.openDate,
    expirationDate: a0.expirationDate, reissueDate: a0.reissueDate, currCycCredit: Number(a0.currCycCredit),
    currCycDebit: Number(a0.currCycDebit), addrZip: a0.addrZip, groupId: a0.groupId };
  if (accountByKey[a.acctId]) { notes.push('Duplicate account ' + a.acctId + ' ignored'); continue; }
  accountByKey[a.acctId] = a; accounts.push(a);
}

// Disclosure group rates keyed by group + type + category (BR-01).
var rateByKey = {};
function rateKey(g, t, c) { return String(g).trim() + '|' + String(t).trim() + '|' + Number(c); }
for (var r = 0; r < p.rates.length; r++) {
  var rr = p.rates[r], k = rateKey(rr.groupId, rr.typeCd, rr.catCd);
  if (rateByKey[k] === undefined) rateByKey[k] = Number(rr.rate);
}

// Card for an account: first xref by card number (alternate-index read on accountId).
var cardByAcct = {};
for (var x = 0; x < p.xrefs.length; x++) {
  var xr = p.xrefs[x], acc = String(xr.acctId), card = String(xr.cardNum);
  if (cardByAcct[acc] === undefined || card < cardByAcct[acc]) cardByAcct[acc] = card;
}

// Category balances in key order (sequential KSDS read: account + type + category).
var balances = [];
for (var b = 0; b < p.balances.length; b++) {
  var bb = p.balances[b];
  balances.push({ acctId: String(bb.acctId), typeCd: String(bb.typeCd), catCd: Number(bb.catCd), bal: Number(bb.bal) });
}
balances.sort(function (u, v) {
  if (u.acctId !== v.acctId) return u.acctId < v.acctId ? -1 : 1;
  if (u.typeCd !== v.typeCd) return u.typeCd < v.typeCd ? -1 : 1;
  return u.catCd - v.catCd;
});

var txns = [], suffix = 0, current = null, currentId = null, totalInt = 0, fallbackCount = 0, updated = 0;

// BR-06: on change of account (and after the last balance) add total interest, reset cycle totals.
function flushAccount() {
  if (current) {
    current.currBal += totalInt;
    current.currCycCredit = 0;
    current.currCycDebit = 0;
    updated++;
  }
}

for (var j = 0; j < balances.length; j++) {
  var bal = balances[j];
  if (bal.acctId !== currentId) {
    flushAccount();
    currentId = bal.acctId;
    current = accountByKey[bal.acctId] || null;
    totalInt = 0;
    if (!current) notes.push('Category balance for unknown account ' + bal.acctId + ' skipped');
  }
  if (!current) continue;

  // BR-01 / BR-02: rate lookup with STANDARD fallback.
  var rate = rateByKey[rateKey(current.groupId, bal.typeCd, bal.catCd)];
  if (rate === undefined) {
    rate = rateByKey[rateKey(FALLBACK_GROUP, bal.typeCd, bal.catCd)];
    fallbackCount++;
    if (rate === undefined) {
      notes.push('No rate for ' + current.groupId + '/' + FALLBACK_GROUP + ' ' + bal.typeCd + '/' + bal.catCd + ' (account ' + bal.acctId + '); no interest');
      rate = 0;
    }
  }
  // BR-03 / BR-10: rate 0 => no interest, no transaction.
  if (rate === 0) continue;

  var interest = monthlyInterest(bal.bal, rate);
  totalInt += interest;

  // BR-04 / BR-05: interest transaction.
  suffix++;
  var sfx = String(suffix); while (sfx.length < SUFFIX_WIDTH) sfx = '0' + sfx;
  txns.push({
    tran_id: runDate + sfx, type_cd: TXN_TYPE, cat_cd: TXN_CAT, source: TXN_SOURCE,
    desc: TXN_DESC + current.acctId, amt: cents(interest),
    merchant_id: 0, merchant_name: '', merchant_city: '', merchant_zip: '',
    card_num: cardByAcct[current.acctId] || '', orig_ts: ts, proc_ts: ts
  });
  // BR-07: fees (1400-COMPUTE-FEES) is an empty stub - nothing charged.
}
flushAccount();

var ledgacc = accounts.map(function (a) {
  return {
    acct_id: parseInt(a.acctId, 10), active_status: a.activeStatus, curr_bal: cents(a.currBal),
    credit_limit: cents(a.creditLimit), cash_credit_limit: cents(a.cashCreditLimit),
    open_date: a.openDate, expiration_date: a.expirationDate, reissue_date: a.reissueDate,
    curr_cyc_credit: cents(a.currCycCredit), curr_cyc_debit: cents(a.currCycDebit),
    addr_zip: a.addrZip, group_id: a.groupId
  };
});

output.result = {
  accrue_systxn: txns,
  accrue_ledgacc: ledgacc,
  summary: {
    interestRunDate: runDate, balancesRead: balances.length, transactionsWritten: txns.length,
    accountsUpdated: updated, accountsTotal: ledgacc.length, standardFallbacks: fallbackCount,
    bigIntArithmetic: typeof BigInt === 'function', notes: notes, parseWarnings: input.parseWarnings
  }
};
output.parsed = null;
output.parseWarnings = null;
```

_(server: 212 ms, 1 API call, 209 ms in API)_
