# Workflow: posttran_daily_transaction_posting

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** P-14 daily-transaction-posting (legacy POSTTRAN / CBTRN02C). Reads DALYTRAN, ACCTDAT, CARDXREF, TCATBALF fixed-width text; validates and posts each record; returns posted transactions, rejects, accounts and category balances after posting.

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae1db443695c563ea50ab1b | <uuid> | (0, 0) | → Load Daily Feed (seq:<uuid>) |
| Load Daily Feed | SCRIPT | 6ae1db473695c563ea50ab1c | <uuid> | (500, 0) | → Validate and Post Records (seq:<uuid>) | lang: JAVASCRIPT |
| Validate and Post Records | SCRIPT | 6ae1db493695c563ea50ab1d | <uuid> | (1000, 0) | → Build Run Summary (seq:<uuid>) | lang: JAVASCRIPT |
| Build Run Summary | SCRIPT | 6ae1db4c3695c563ea50ab1e | <uuid> | (1500, 0) | → Format Contract Outputs (seq:<uuid>) | lang: JAVASCRIPT |
| Format Contract Outputs | SCRIPT | 6ae1db4e3695c563ea50ab1f | <uuid> | (2000, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae1db513695c563ea50ab20 | <uuid> | (2500, 0) | — |

## Systems
_(none)_

## Scripts

### Load Daily Feed (SCRIPT, id=6ae1db473695c563ea50ab1c)

```javascript
// Load Daily Feed (READ_DAILY_FEED) + the reference stores POSTTRAN reads.
// Parses the fixed-width text of DALYTRAN (CVTRA06Y, 350), ACCTDAT (CVACT01Y, 300),
// CARDXREF (CVACT03Y, 50) and TCATBALF (CVTRA01Y, 50). Amounts are kept as integer cents.

function toLines(text) {
  if (text === null || text === undefined) return [];
  var parts = String(text).split(/\r?\n/);
  var out = [];
  for (var i = 0; i < parts.length; i++) {
    if (parts[i].replace(/\s+$/, '').length > 0) out.push(parts[i]);
  }
  return out;
}
function fld(line, start, len) {
  var v = line.substring(start, start + len);
  while (v.length < len) v += ' ';
  return v;
}
function rtrim(s) { return s.replace(/\s+$/, ''); }
// Numeric key: zero-pad an all-digit value to the PIC 9(n) width, otherwise keep it trimmed.
function numKey(raw, len) {
  var t = raw.trim();
  if (/^[0-9]+$/.test(t)) { while (t.length < len) t = '0' + t; }
  return t;
}
// Signed zoned decimal S9(n)V99 in ASCII: the sign is overpunched on the last digit
// ('{' A-I = +0..+9, '}' J-R = -0..-9). Plain digits, a leading/trailing sign and an
// explicit decimal point are accepted too. Returns integer cents.
function zonedCents(raw) {
  var s = raw.trim();
  if (s.length === 0) return 0;
  var neg = false;
  var c0 = s.charAt(0);
  if (c0 === '-' || c0 === '+') { neg = (c0 === '-'); s = s.substring(1).trim(); }
  var cl = s.charAt(s.length - 1);
  if (cl === '-' || cl === '+') { neg = neg || cl === '-'; s = s.substring(0, s.length - 1).trim(); }
  cl = s.charAt(s.length - 1);
  var p = '{ABCDEFGHI'.indexOf(cl);
  var n = '}JKLMNOPQR'.indexOf(cl);
  if (p >= 0) { s = s.substring(0, s.length - 1) + p; }
  else if (n >= 0) { s = s.substring(0, s.length - 1) + n; neg = true; }
  var cents;
  var dot = s.indexOf('.');
  if (dot >= 0) {
    var ip = s.substring(0, dot).replace(/[^0-9]/g, '');
    var fp = (s.substring(dot + 1).replace(/[^0-9]/g, '') + '00').substring(0, 2);
    cents = parseInt(ip || '0', 10) * 100 + parseInt(fp, 10);
  } else {
    cents = parseInt(s.replace(/[^0-9]/g, '') || '0', 10);
  }
  return neg ? -cents : cents;
}

// DALYTRAN-RECORD (CVTRA06Y)
var feed = [];
var dl = toLines(input.dailytran);
for (var i = 0; i < dl.length; i++) {
  var l = dl[i];
  feed.push({
    seq: i + 1,
    tranId: rtrim(fld(l, 0, 16)),
    typeCd: rtrim(fld(l, 16, 2)),
    catCd: numKey(fld(l, 18, 4), 4),
    source: rtrim(fld(l, 22, 10)),
    desc: rtrim(fld(l, 32, 100)),
    amt: zonedCents(fld(l, 132, 11)),
    merchantId: fld(l, 143, 9).trim(),
    merchantName: rtrim(fld(l, 152, 50)),
    merchantCity: rtrim(fld(l, 202, 50)),
    merchantZip: rtrim(fld(l, 252, 10)),
    cardNum: fld(l, 262, 16).trim(),
    origTs: rtrim(fld(l, 278, 26)),
    procTs: rtrim(fld(l, 304, 26))
  });
}

// ACCOUNT-RECORD (CVACT01Y)
var accounts = [];
var al = toLines(input.acctdata);
for (var j = 0; j < al.length; j++) {
  var a = al[j];
  accounts.push({
    acctId: numKey(fld(a, 0, 11), 11),
    activeStatus: rtrim(fld(a, 11, 1)),
    currBal: zonedCents(fld(a, 12, 12)),
    creditLimit: zonedCents(fld(a, 24, 12)),
    cashCreditLimit: zonedCents(fld(a, 36, 12)),
    openDate: rtrim(fld(a, 48, 10)),
    expiryDate: rtrim(fld(a, 58, 10)),
    reissueDate: rtrim(fld(a, 68, 10)),
    cycCredit: zonedCents(fld(a, 78, 12)),
    cycDebit: zonedCents(fld(a, 90, 12)),
    addrZip: rtrim(fld(a, 102, 10)),
    groupId: rtrim(fld(a, 112, 10))
  });
}

// CARD-XREF-RECORD (CVACT03Y)
var xrefs = [];
var xl = toLines(input.cardxref);
for (var k = 0; k < xl.length; k++) {
  var x = xl[k];
  xrefs.push({
    cardNum: fld(x, 0, 16).trim(),
    custId: numKey(fld(x, 16, 9), 9),
    acctId: numKey(fld(x, 25, 11), 11)
  });
}

// TRAN-CAT-BAL-RECORD (CVTRA01Y)
var catBals = [];
var tl = toLines(input.tcatbal);
for (var m = 0; m < tl.length; m++) {
  var t = tl[m];
  catBals.push({
    acctId: numKey(fld(t, 0, 11), 11),
    typeCd: rtrim(fld(t, 11, 2)),
    catCd: numKey(fld(t, 13, 4), 4),
    bal: zonedCents(fld(t, 17, 11))
  });
}

output.feed = feed;
output.accounts = accounts;
output.xrefs = xrefs;
output.categoryBalances = catBals;
// The raw file text is not needed past this point; drop it to keep the token small.
output.dailytran = null;
output.acctdata = null;
output.cardxref = null;
output.tcatbal = null;
```

### Validate and Post Records (SCRIPT, id=6ae1db493695c563ea50ab1d)

```javascript
// Validate and Post Records — the For Each Record loop of P-14 (legacy CBTRN02C main loop).
// Records are processed strictly in feed order against the running state, so a posting
// changes the account / category balance that later records are validated against.

var REASON_DESC = {
  100: 'INVALID CARD NUMBER FOUND',
  101: 'ACCOUNT RECORD NOT FOUND',
  102: 'OVERLIMIT TRANSACTION',
  103: 'TRANSACTION RECEIVED AFTER ACCT EXPIRATION',
  104: 'DAILY PURCHASE LIMIT EXCEEDED'
};
var MAX_DAILY_PURCHASES_PER_CARD = 4; // BR-10

function S(v) { return (v === null || v === undefined) ? '' : String(v); }
function N(v) { return (v === null || v === undefined) ? 0 : Number(v); }
function pad(n, w) { var s = String(n); while (s.length < w) s = '0' + s; return s; }

// processedTimestamp = now (BR-05), in the DB2 timestamp text the legacy program writes
// into TRAN-PROC-TS: YYYY-MM-DD-HH.MM.SS.hh0000
function db2Timestamp(d) {
  return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1, 2) + '-' + pad(d.getUTCDate(), 2) + '-' +
    pad(d.getUTCHours(), 2) + '.' + pad(d.getUTCMinutes(), 2) + '.' + pad(d.getUTCSeconds(), 2) + '.' +
    pad(Math.floor(d.getUTCMilliseconds() / 10), 2) + '0000';
}
var processedTs = db2Timestamp(new Date());

function copyTran(t) {
  return {
    seq: N(t.seq), tranId: S(t.tranId), typeCd: S(t.typeCd), catCd: S(t.catCd), source: S(t.source),
    desc: S(t.desc), amt: N(t.amt), merchantId: S(t.merchantId), merchantName: S(t.merchantName),
    merchantCity: S(t.merchantCity), merchantZip: S(t.merchantZip), cardNum: S(t.cardNum),
    origTs: S(t.origTs), procTs: S(t.procTs)
  };
}

// Reference stores (first record wins on a duplicate key, as a KSDS holds one record per key).
var acctMap = {}, acctOrder = [];
var accts = input.accounts || [];
for (var i = 0; i < accts.length; i++) {
  var a = accts[i];
  var id = S(a.acctId);
  if (acctMap.hasOwnProperty(id)) continue;
  acctMap[id] = {
    acctId: id, activeStatus: S(a.activeStatus), currBal: N(a.currBal), creditLimit: N(a.creditLimit),
    cashCreditLimit: N(a.cashCreditLimit), openDate: S(a.openDate), expiryDate: S(a.expiryDate),
    reissueDate: S(a.reissueDate), cycCredit: N(a.cycCredit), cycDebit: N(a.cycDebit),
    addrZip: S(a.addrZip), groupId: S(a.groupId)
  };
  acctOrder.push(id);
}
var xrefMap = {};
var xrefs = input.xrefs || [];
for (var j = 0; j < xrefs.length; j++) {
  var x = xrefs[j];
  var card = S(x.cardNum);
  if (!xrefMap.hasOwnProperty(card)) xrefMap[card] = { cardNum: card, custId: S(x.custId), acctId: S(x.acctId) };
}
var catMap = {}, catOrder = [];
var cbs = input.categoryBalances || [];
for (var k = 0; k < cbs.length; k++) {
  var c = cbs[k];
  var ck = S(c.acctId) + '|' + S(c.typeCd) + '|' + S(c.catCd);
  if (catMap.hasOwnProperty(ck)) continue;
  catMap[ck] = { acctId: S(c.acctId), typeCd: S(c.typeCd), catCd: S(c.catCd), bal: N(c.bal) };
  catOrder.push(ck);
}

var posted = [], rejected = [], newCategoryBalances = 0;
var purchasesPerCard = {};
var feed = input.feed || [];

for (var r = 0; r < feed.length; r++) {
  var t = copyTran(feed[r]);
  var reason = 0;
  var xref = xrefMap.hasOwnProperty(t.cardNum) ? xrefMap[t.cardNum] : null;
  var acct = null;

  // 1500-VALIDATE-TRAN. A later failure overwrites an earlier reason (legacy F-05, BR-04).
  if (xref === null) {
    reason = 100;                                                     // BR-01
  } else {
    acct = acctMap.hasOwnProperty(xref.acctId) ? acctMap[xref.acctId] : null;
    if (acct === null) {
      reason = 101;                                                   // BR-02
    } else {
      if (acct.cycCredit - acct.cycDebit + t.amt > acct.creditLimit) {
        reason = 102;                                                 // BR-03
      }
      if (acct.expiryDate < t.origTs.substring(0, 10)) {
        reason = 103;                                                 // BR-04
      }
    }
  }
  // BR-10: a fifth (or later) purchase on a card that passed BR-01..BR-04.
  if (reason === 0 && t.amt > 0 && (purchasesPerCard[t.cardNum] || 0) >= MAX_DAILY_PURCHASES_PER_CARD) {
    reason = 104;
  }

  if (reason !== 0) {
    // 2500-WRITE-REJECT-REC: original record + reason + description (BR-06)
    t.reason = reason;
    t.reasonDesc = REASON_DESC[reason];
    rejected.push(t);
    continue;
  }

  // 2000-POST-TRANSACTION (BR-05)
  var key = xref.acctId + '|' + t.typeCd + '|' + t.catCd;
  if (catMap.hasOwnProperty(key)) {
    catMap[key].bal += t.amt;
  } else {
    catMap[key] = { acctId: xref.acctId, typeCd: t.typeCd, catCd: t.catCd, bal: t.amt };
    catOrder.push(key);
    newCategoryBalances++;
  }
  acct.currBal += t.amt;
  if (t.amt >= 0) acct.cycCredit += t.amt; else acct.cycDebit += t.amt;

  t.procTs = processedTs;
  t.acctId = xref.acctId;
  posted.push(t);
  if (t.amt > 0) purchasesPerCard[t.cardNum] = (purchasesPerCard[t.cardNum] || 0) + 1;
}

var accountsAfter = [];
for (var p = 0; p < acctOrder.length; p++) accountsAfter.push(acctMap[acctOrder[p]]);
var categoryBalancesAfter = [];
for (var q = 0; q < catOrder.length; q++) categoryBalancesAfter.push(catMap[catOrder[q]]);

output.posted = posted;
output.rejected = rejected;
output.accountsAfter = accountsAfter;
output.categoryBalancesAfter = categoryBalancesAfter;
output.postingStats = {
  read: feed.length, posted: posted.length, rejected: rejected.length,
  newCategoryBalances: newCategoryBalances, processedTimestamp: processedTs
};
// Inputs fully consumed — drop them from the token.
output.feed = null;
output.accounts = null;
output.xrefs = null;
output.categoryBalances = null;
```

### Build Run Summary (SCRIPT, id=6ae1db4c3695c563ea50ab1e)

```javascript
// Build Run Summary (legacy end-of-job DISPLAY + RETURN-CODE).
// BR-07: any reject -> WARNING (legacy RETURN-CODE 4); otherwise COMPLETED (RC 0).
var st = input.postingStats || {};
var read = Number(st.read || 0), posted = Number(st.posted || 0), rejected = Number(st.rejected || 0);
var balanced = (read === posted + rejected);
output.runSummary = {
  batchId: input.batchId === null || input.batchId === undefined ? '' : String(input.batchId),
  businessDate: input.businessDate === null || input.businessDate === undefined ? '' : String(input.businessDate),
  transactionsProcessed: read,
  transactionsPosted: posted,
  transactionsRejected: rejected,
  newCategoryBalances: Number(st.newCategoryBalances || 0),
  countsBalanced: balanced,
  status: !balanced ? 'FAILED' : (rejected > 0 ? 'WARNING' : 'COMPLETED'),
  returnCode: !balanced ? 16 : (rejected > 0 ? 4 : 0),
  processedTimestamp: st.processedTimestamp === undefined ? '' : String(st.processedTimestamp)
};
```

### Format Contract Outputs (SCRIPT, id=6ae1db4e3695c563ea50ab1f)

```javascript
// Format Contract Outputs — maps the posting result onto the CONTRACT.md field names.
// Amounts are emitted as strings with exactly two decimals ("-12.50").

function S(v) { return (v === null || v === undefined) ? '' : String(v); }
function money(cents) {
  var c = Number(cents || 0);
  var neg = c < 0;
  var a = Math.abs(c);
  var frac = a % 100;
  return (neg ? '-' : '') + Math.floor(a / 100) + '.' + (frac < 10 ? '0' : '') + frac;
}
// PIC 9(n) field as an int; a blank or non-numeric value becomes null.
function toInt(v) {
  var t = S(v).trim();
  return /^[0-9]+$/.test(t) ? parseInt(t, 10) : null;
}
function tranFields(t) {
  return {
    tran_id: S(t.tranId),
    type_cd: S(t.typeCd),
    cat_cd: toInt(t.catCd),
    source: S(t.source),
    desc: S(t.desc),
    amt: money(t.amt),
    merchant_id: toInt(t.merchantId),
    merchant_name: S(t.merchantName),
    merchant_city: S(t.merchantCity),
    merchant_zip: S(t.merchantZip),
    card_num: S(t.cardNum),
    orig_ts: S(t.origTs),
    proc_ts: S(t.procTs)
  };
}

var transact = [], dalyrejs = [], acctdata = [], tcatbal = [];
var posted = input.posted || [];
for (var i = 0; i < posted.length; i++) transact.push(tranFields(posted[i]));

var rejected = input.rejected || [];
for (var j = 0; j < rejected.length; j++) {
  var r = tranFields(rejected[j]);
  r.reason = Number(rejected[j].reason);
  r.reason_desc = S(rejected[j].reasonDesc);
  dalyrejs.push(r);
}

var accts = input.accountsAfter || [];
for (var k = 0; k < accts.length; k++) {
  var a = accts[k];
  acctdata.push({
    acct_id: toInt(a.acctId),
    active_status: S(a.activeStatus),
    curr_bal: money(a.currBal),
    credit_limit: money(a.creditLimit),
    cash_credit_limit: money(a.cashCreditLimit),
    open_date: S(a.openDate),
    expiration_date: S(a.expiryDate),
    reissue_date: S(a.reissueDate),
    curr_cyc_credit: money(a.cycCredit),
    curr_cyc_debit: money(a.cycDebit),
    addr_zip: S(a.addrZip),
    group_id: S(a.groupId)
  });
}

var cbs = input.categoryBalancesAfter || [];
for (var m = 0; m < cbs.length; m++) {
  var c = cbs[m];
  tcatbal.push({ acct_id: toInt(c.acctId), type_cd: S(c.typeCd), cat_cd: toInt(c.catCd), bal: money(c.bal) });
}

output.result = {
  posttran_transact: transact,
  posttran_dalyrejs: dalyrejs,
  posttran_acctdata: acctdata,
  posttran_tcatbal: tcatbal,
  runSummary: input.runSummary
};
```

_(server: 180 ms, 1 API call, 176 ms in API)_
