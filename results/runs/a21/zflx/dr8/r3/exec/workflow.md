# Workflow: posttran_daily_transaction_posting

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** P-14 daily-transaction-posting (legacy POSTTRAN / CBTRN02C). Reads DALYTRAN, ACCTDATA, CARDXREF, TCATBAL fixed-width files, validates each daily transaction (BR-01..04) in BR-10 posting order, posts valid ones (BR-05) and rejects the rest (BR-06), returns posted transactions, rejects, accounts and category balances after posting, plus the run state (BR-07).

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae1e3383695c563ea50acbe | <uuid> | (0, 0) | → Load Daily Feed (seq:<uuid>) |
| Load Daily Feed | SCRIPT | 6ae1e3433695c563ea50acbf | <uuid> | (500, 0) | → Order Feed BR-10 (seq:<uuid>) | lang: JAVASCRIPT |
| Order Feed BR-10 | SCRIPT | 6ae1e3463695c563ea50acc0 | <uuid> | (1000, 0) | → Validate and Post Records (seq:<uuid>) | lang: JAVASCRIPT |
| Validate and Post Records | SCRIPT | 6ae1e3483695c563ea50acc1 | <uuid> | (1500, 0) | → Build Run Summary (seq:<uuid>) | lang: JAVASCRIPT |
| Build Run Summary | SCRIPT | 6ae1e34b3695c563ea50acc2 | <uuid> | (2000, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae1e34e3695c563ea50acc3 | <uuid> | (2500, 0) | — |

## Systems
_(none)_

## Scripts

### Load Daily Feed (SCRIPT, id=6ae1e3433695c563ea50acbf)

```javascript
// Load Daily Feed (READ_DAILY_FEED): parse the fixed-width input files, one record per line,
// layouts as in the copybooks CVTRA06Y (350), CVACT01Y (300), CVACT03Y (50), CVTRA01Y (50).

function pad(s, len) {
  while (s.length < len) { s = s + '          '; }
  return s.substring(0, len);
}

// Split a file into fixed-length records. Blank lines are skipped; a line holding several
// records back to back (no line feeds) is cut into record-length chunks.
function records(txt, len) {
  var out = [];
  if (txt === null || txt === undefined) { return out; }
  var parts = String(txt).split(/\r?\n/);
  for (var i = 0; i < parts.length; i++) {
    var l = parts[i];
    if (l.replace(/\s+$/, '') === '') { continue; }
    if (l.length >= 2 * len && l.length % len === 0) {
      for (var k = 0; k < l.length; k += len) { out.push(l.substring(k, k + len)); }
    } else {
      out.push(pad(l, len));
    }
  }
  return out;
}

function rtrim(s) { return s.replace(/\s+$/, ''); }

// DISPLAY numeric with implied decimals (PIC S9(n)V99 etc.), returned in units of the last digit
// (cents for V99). Accepts plain digits, EBCDIC-style overpunch ({ A-I positive, } J-R negative),
// GnuCOBOL ASCII overpunch (p-y negative), and an explicit sign / decimal point.
function zoned(s, scale) {
  var t = String(s).replace(/^\s+|\s+$/g, '');
  if (t === '') { return 0; }
  if (/[.+\-]/.test(t)) {
    var f = parseFloat(t.replace(/\s/g, ''));
    return isNaN(f) ? 0 : Math.round(f * Math.pow(10, scale));
  }
  var neg = false, digits = '';
  for (var i = 0; i < s.length; i++) {
    var c = s.charAt(i);
    if (c >= '0' && c <= '9') { digits += c; }
    else if (c === '{') { digits += '0'; }
    else if (c >= 'A' && c <= 'I') { digits += String(c.charCodeAt(0) - 64); }
    else if (c === '}') { digits += '0'; neg = true; }
    else if (c >= 'J' && c <= 'R') { digits += String(c.charCodeAt(0) - 73); neg = true; }
    else if (c >= 'p' && c <= 'y') { digits += String(c.charCodeAt(0) - 112); neg = true; }
    else if (c === ' ') { digits += '0'; }
  }
  var n = digits === '' ? 0 : parseInt(digits, 10);
  if (isNaN(n)) { n = 0; }
  return neg && n !== 0 ? -n : n;
}

// CVTRA06Y DALYTRAN-RECORD
var feed = [];
var dl = records(input.dailytranFile, 350);
for (var i = 0; i < dl.length; i++) {
  var l = dl[i];
  feed.push({
    seq: i,
    tranId: l.substring(0, 16),
    typeCd: l.substring(16, 18),
    catCd: zoned(l.substring(18, 22), 0),
    source: l.substring(22, 32),
    desc: l.substring(32, 132),
    amt: zoned(l.substring(132, 143), 2),
    merchantId: zoned(l.substring(143, 152), 0),
    merchantName: l.substring(152, 202),
    merchantCity: l.substring(202, 252),
    merchantZip: l.substring(252, 262),
    cardNum: l.substring(262, 278),
    origTs: l.substring(278, 304),
    procTs: l.substring(304, 330)
  });
}

// CVACT01Y ACCOUNT-RECORD
var accounts = [];
var al = records(input.acctdataFile, 300);
for (var j = 0; j < al.length; j++) {
  var a = al[j];
  accounts.push({
    acctId: zoned(a.substring(0, 11), 0),
    activeStatus: a.substring(11, 12),
    currBal: zoned(a.substring(12, 24), 2),
    creditLimit: zoned(a.substring(24, 36), 2),
    cashCreditLimit: zoned(a.substring(36, 48), 2),
    openDate: a.substring(48, 58),
    expirationDate: a.substring(58, 68),
    reissueDate: a.substring(68, 78),
    currCycCredit: zoned(a.substring(78, 90), 2),
    currCycDebit: zoned(a.substring(90, 102), 2),
    addrZip: a.substring(102, 112),
    groupId: a.substring(112, 122)
  });
}

// CVACT03Y CARD-XREF-RECORD
var xrefs = [];
var xl = records(input.cardxrefFile, 50);
for (var x = 0; x < xl.length; x++) {
  var r = xl[x];
  xrefs.push({
    cardNum: r.substring(0, 16),
    custId: zoned(r.substring(16, 25), 0),
    acctId: zoned(r.substring(25, 36), 0)
  });
}

// CVTRA01Y TRAN-CAT-BAL-RECORD
var tcatbal = [];
var tl = records(input.tcatbalFile, 50);
for (var t = 0; t < tl.length; t++) {
  var b = tl[t];
  tcatbal.push({
    acctId: zoned(b.substring(0, 11), 0),
    typeCd: b.substring(11, 13),
    catCd: zoned(b.substring(13, 17), 0),
    bal: zoned(b.substring(17, 28), 2)
  });
}

output.posttranStage = JSON.stringify({ feed: feed, accounts: accounts, xrefs: xrefs, tcatbal: tcatbal });
output.feedRecordCount = feed.length;
// Drop the raw files so later nodes do not carry them.
output.dailytranFile = null;
output.acctdataFile = null;
output.cardxrefFile = null;
output.tcatbalFile = null;

```

### Order Feed BR-10 (SCRIPT, id=6ae1e3463695c563ea50acc0)

```javascript
// Order Feed (BR-10): the run processes the day's transactions in ascending order of amount,
// smallest first (credits, negative amounts, come first); equal amounts keep their feed order.
var stage = JSON.parse(input.posttranStage);
stage.feed.sort(function (a, b) {
  if (a.amt !== b.amt) { return a.amt - b.amt; }
  return a.seq - b.seq;
});
output.posttranStage = JSON.stringify(stage);

```

### Validate and Post Records (SCRIPT, id=6ae1e3483695c563ea50acc1)

```javascript
// Validate Record (1500-VALIDATE-TRAN) + Post Transaction (2000-POST-TRANSACTION) / Write Reject
// (2500-WRITE-REJECT-REC), one record at a time in the BR-10 order. Amounts are integer cents.
var stage = JSON.parse(input.posttranStage);

var REASONS = {
  100: 'INVALID CARD NUMBER FOUND',
  101: 'ACCOUNT RECORD NOT FOUND',
  102: 'OVERLIMIT TRANSACTION',
  103: 'TRANSACTION RECEIVED AFTER ACCT EXPIRATION'
};

function rtrim(s) { return String(s === null || s === undefined ? '' : s).replace(/\s+$/, ''); }
// Keep the low-order digits a PIC S9(n)V99 field can hold (COBOL ADD/COMPUTE without SIZE ERROR).
function fit(cents, digits) { return cents % Math.pow(10, digits); }
function money(c) {
  var neg = c < 0, a = Math.abs(c);
  var s = Math.floor(a / 100) + '.' + ('0' + (a % 100)).slice(-2);
  return (neg ? '-' : '') + s;
}
function p(n, w) { var s = String(n); while (s.length < w) { s = '0' + s; } return s; }
// Legacy Z-GET-DB2-FORMAT-TIMESTAMP layout: YYYY-MM-DD-HH.MM.SS.hh0000 (26 chars)
function db2Now() {
  var d = new Date();
  return d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1, 2) + '-' + p(d.getUTCDate(), 2) + '-' +
    p(d.getUTCHours(), 2) + '.' + p(d.getUTCMinutes(), 2) + '.' + p(d.getUTCSeconds(), 2) + '.' +
    p(Math.floor(d.getUTCMilliseconds() / 10), 2) + '0000';
}
function tranFields(r, procTs) {
  return {
    tran_id: rtrim(r.tranId), type_cd: rtrim(r.typeCd), cat_cd: r.catCd, source: rtrim(r.source),
    desc: rtrim(r.desc), amt: money(r.amt), merchant_id: r.merchantId,
    merchant_name: rtrim(r.merchantName), merchant_city: rtrim(r.merchantCity),
    merchant_zip: rtrim(r.merchantZip), card_num: rtrim(r.cardNum), orig_ts: rtrim(r.origTs),
    proc_ts: rtrim(procTs)
  };
}

// Keyed stores (VSAM KSDS: one record per key, first occurrence kept).
var acctByKey = {}, xrefByCard = {}, tcbByKey = {};
var i;
for (i = 0; i < stage.accounts.length; i++) {
  var a0 = stage.accounts[i];
  if (!acctByKey.hasOwnProperty('A' + a0.acctId)) { acctByKey['A' + a0.acctId] = a0; }
}
for (i = 0; i < stage.xrefs.length; i++) {
  var x0 = stage.xrefs[i];
  var ck = rtrim(x0.cardNum);
  if (!xrefByCard.hasOwnProperty(ck)) { xrefByCard[ck] = x0; }
}
function tcbKey(acctId, typeCd, catCd) { return acctId + '|' + rtrim(typeCd) + '|' + catCd; }
for (i = 0; i < stage.tcatbal.length; i++) {
  var t0 = stage.tcatbal[i];
  var tk = tcbKey(t0.acctId, t0.typeCd, t0.catCd);
  if (!tcbByKey.hasOwnProperty(tk)) { tcbByKey[tk] = t0; }
}

var transact = [], dalyrejs = [], postedIds = {};
var read = 0, posted = 0, rejected = 0, duplicates = 0;

for (i = 0; i < stage.feed.length; i++) {
  var r = stage.feed[i];
  read++;
  var reason = 0;
  var xref = xrefByCard.hasOwnProperty(rtrim(r.cardNum)) ? xrefByCard[rtrim(r.cardNum)] : null;
  var acct = null;

  // BR-01 card in cross-reference
  if (xref === null) {
    reason = 100;
  } else {
    // BR-02 account exists
    acct = acctByKey.hasOwnProperty('A' + xref.acctId) ? acctByKey['A' + xref.acctId] : null;
    if (acct === null) {
      reason = 101;
    } else {
      // BR-03 over limit, using the cycle totals left by the records posted before this one
      var tempBal = fit(acct.currCycCredit - acct.currCycDebit + r.amt, 11);
      if (tempBal > acct.creditLimit) { reason = 102; }
      // BR-04 expiry before the transaction's original date; overwrites 102 (legacy F-05)
      if (String(acct.expirationDate) < String(r.origTs).substring(0, 10)) { reason = 103; }
    }
  }

  if (reason !== 0) {
    // BR-06 reject = original record + reason code + description
    var rej = tranFields(r, r.procTs);
    rej.reason = reason;
    rej.reason_desc = REASONS[reason];
    dalyrejs.push(rej);
    rejected++;
    continue;
  }

  // BR-09 idempotent per transactionId: a record already posted in this run is not posted again
  var idKey = rtrim(r.tranId);
  if (postedIds.hasOwnProperty(idKey)) { duplicates++; continue; }
  postedIds[idKey] = true;

  // BR-05 post: category balance upsert, account balance and cycle totals, transaction write
  var key = tcbKey(xref.acctId, r.typeCd, r.catCd);
  var tcb = tcbByKey.hasOwnProperty(key) ? tcbByKey[key] : null;
  if (tcb === null) {
    tcb = { acctId: xref.acctId, typeCd: r.typeCd, catCd: r.catCd, bal: 0 };
    tcbByKey[key] = tcb;
    stage.tcatbal.push(tcb);
  }
  tcb.bal = fit(tcb.bal + r.amt, 11);

  acct.currBal = fit(acct.currBal + r.amt, 12);
  if (r.amt >= 0) {
    acct.currCycCredit = fit(acct.currCycCredit + r.amt, 12);
  } else {
    acct.currCycDebit = fit(acct.currCycDebit + r.amt, 12);
  }

  transact.push(tranFields(r, db2Now()));
  posted++;
}

var acctdata = [];
for (i = 0; i < stage.accounts.length; i++) {
  var a = stage.accounts[i];
  acctdata.push({
    acct_id: a.acctId, active_status: rtrim(a.activeStatus), curr_bal: money(a.currBal),
    credit_limit: money(a.creditLimit), cash_credit_limit: money(a.cashCreditLimit),
    open_date: rtrim(a.openDate), expiration_date: rtrim(a.expirationDate),
    reissue_date: rtrim(a.reissueDate), curr_cyc_credit: money(a.currCycCredit),
    curr_cyc_debit: money(a.currCycDebit), addr_zip: rtrim(a.addrZip), group_id: rtrim(a.groupId)
  });
}
var tcatbal = [];
for (i = 0; i < stage.tcatbal.length; i++) {
  var t = stage.tcatbal[i];
  tcatbal.push({ acct_id: t.acctId, type_cd: rtrim(t.typeCd), cat_cd: t.catCd, bal: money(t.bal) });
}

output.posttranResult = JSON.stringify({
  counts: { read: read, posted: posted, rejected: rejected, duplicatesSkipped: duplicates },
  transact: transact, dalyrejs: dalyrejs, acctdata: acctdata, tcatbal: tcatbal
});
output.posttranStage = null;

```

### Build Run Summary (SCRIPT, id=6ae1e34b3695c563ea50acc2)

```javascript
// Build Run Summary (end-of-job DISPLAY): processed / rejected counts and the run state.
// BR-07: any reject -> WARNING (legacy RETURN-CODE 4), otherwise COMPLETED (RC 0).
var res = JSON.parse(input.posttranResult);
var c = res.counts;
var warning = c.rejected > 0;
output.posttranOutput = {
  batchId: input.batchId === undefined ? null : input.batchId,
  businessDate: input.businessDate === undefined ? null : input.businessDate,
  status: warning ? 'WARNING' : 'COMPLETED',
  returnCode: warning ? 4 : 0,
  processedCount: c.posted,
  rejectedCount: c.rejected,
  readCount: c.read,
  duplicatesSkipped: c.duplicatesSkipped,
  countsBalance: c.read === c.posted + c.rejected + c.duplicatesSkipped,
  posttran_transact: res.transact,
  posttran_dalyrejs: res.dalyrejs,
  posttran_acctdata: res.acctdata,
  posttran_tcatbal: res.tcatbal
};
output.posttranResult = null;

```

_(server: 189 ms, 1 API call, 185 ms in API)_
