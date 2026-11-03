# Workflow: posttran_daily_transaction_posting

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** P-14 daily-transaction-posting (legacy POSTTRAN / CBTRN02C). Validates each DALYTRAN record (xref -> account -> limit -> expiry), posts valid ones (Transaction, TCATBAL upsert, Account balances) and rejects the rest with reason 100-103. Input: raw fixed-width file contents; output: transact, dalyrejs, acctdata, tcatbal + runSummary.

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae124523695c563ea5093ed | <uuid> | (0, 200) | → Load Daily Feed (seq:<uuid>) |
| Load Daily Feed | SCRIPT | 6ae124573695c563ea5093ee | <uuid> | (500, 200) | → Validate And Post Records (seq:<uuid>) | lang: JAVASCRIPT |
| Validate And Post Records | SCRIPT | 6ae124593695c563ea5093ef | <uuid> | (1000, 200) | → Build Run Summary (seq:<uuid>) | lang: JAVASCRIPT |
| Build Run Summary | SCRIPT | 6ae1245c3695c563ea5093f0 | <uuid> | (1500, 200) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae1245f3695c563ea5093f1 | <uuid> | (2000, 200) | — |

## Systems
_(none)_

## Scripts

### Load Daily Feed (SCRIPT, id=6ae124573695c563ea5093ee)

```javascript
// Load Daily Feed (legacy POSTTRAN DD DALYTRAN / XREFFILE / ACCTFILE / TCATBALF opens + 1000-DALYTRAN-GET-NEXT)
// Parses the fixed-width copybook layouts into plain records. Amounts are kept as integer cents.

function padLine(l, len) {
  if (l.length >= len) return l;
  return l + new Array(len - l.length + 1).join(' ');
}
function records(text, len) {
  var out = [];
  var raw = String(text == null ? '' : text).split(/\r?\n/);
  for (var i = 0; i < raw.length; i++) {
    var l = raw[i];
    if (l.replace(/\s/g, '') === '') continue;
    out.push(padLine(l, len));
  }
  return out;
}
// 1-based start, as in the copybook offsets
function fld(l, start, len) { return l.substring(start - 1, start - 1 + len); }
function str(l, start, len) { return fld(l, start, len).replace(/\s+$/, ''); }
function int(l, start, len) {
  var s = fld(l, start, len).replace(/\s/g, '');
  if (s === '') return 0;
  var n = parseInt(s, 10);
  return isNaN(n) ? null : n;
}
// Zoned decimal S9(n)V99 with trailing sign overpunch ({A-I positive, }J-R negative, p-y ASCII negative)
// or an explicit sign/decimal point. Returns integer cents.
function cents(l, start, len) {
  var s = fld(l, start, len).replace(/\s/g, '');
  if (s === '') return 0;
  var neg = false;
  var c0 = s.charAt(0);
  if (c0 === '-' || c0 === '+') { neg = c0 === '-'; s = s.substring(1); }
  var last = s.charAt(s.length - 1);
  if (last === '-' || last === '+') { neg = last === '-'; s = s.substring(0, s.length - 1); last = s.charAt(s.length - 1); }
  var d;
  if ((d = '{ABCDEFGHI'.indexOf(last)) >= 0) { s = s.substring(0, s.length - 1) + d; }
  else if ((d = '}JKLMNOPQR'.indexOf(last)) >= 0) { s = s.substring(0, s.length - 1) + d; neg = true; }
  else if ((d = 'pqrstuvwxy'.indexOf(last)) >= 0) { s = s.substring(0, s.length - 1) + d; neg = true; }
  var v;
  if (s.indexOf('.') >= 0) {
    var parts = s.split('.');
    v = parseInt(parts[0] || '0', 10) * 100 + parseInt((parts[1] + '00').substring(0, 2), 10);
  } else {
    v = parseInt(s, 10);
  }
  if (isNaN(v)) v = 0;
  return neg ? -v : v;
}

// CVTRA06Y DALYTRAN-RECORD (350)
var feed = records(input.dailytran, 350).map(function (l, i) {
  return {
    index: i,
    id: str(l, 1, 16),
    typeCd: str(l, 17, 2),
    catCd: int(l, 19, 4),
    source: str(l, 23, 10),
    desc: str(l, 33, 100),
    amt: cents(l, 133, 11),
    merchantId: int(l, 144, 9),
    merchantName: str(l, 153, 50),
    merchantCity: str(l, 203, 50),
    merchantZip: str(l, 253, 10),
    cardNum: str(l, 263, 16),
    origTs: str(l, 279, 26),
    procTs: str(l, 305, 26)
  };
});

// CVACT01Y ACCOUNT-RECORD (300)
var accounts = records(input.acctdata, 300).map(function (l) {
  return {
    acctId: int(l, 1, 11),
    activeStatus: str(l, 12, 1),
    currBal: cents(l, 13, 12),
    creditLimit: cents(l, 25, 12),
    cashCreditLimit: cents(l, 37, 12),
    openDate: str(l, 49, 10),
    expiryDate: str(l, 59, 10),
    reissueDate: str(l, 69, 10),
    cycCredit: cents(l, 79, 12),
    cycDebit: cents(l, 91, 12),
    addrZip: str(l, 103, 10),
    groupId: str(l, 113, 10)
  };
});

// CVACT03Y CARD-XREF-RECORD (50)
var xrefs = records(input.cardxref, 50).map(function (l) {
  return { cardNum: str(l, 1, 16), custId: int(l, 17, 9), acctId: int(l, 26, 11) };
});

// CVTRA01Y TRAN-CAT-BAL-RECORD (50)
var tcatbals = records(input.tcatbal, 50).map(function (l) {
  return { acctId: int(l, 1, 11), typeCd: str(l, 12, 2), catCd: int(l, 14, 4), bal: cents(l, 18, 11) };
});

output.feedJson = JSON.stringify(feed);
output.accountsJson = JSON.stringify(accounts);
output.xrefsJson = JSON.stringify(xrefs);
output.tcatbalsJson = JSON.stringify(tcatbals);
output.loadCounts = { dailytran: feed.length, acctdata: accounts.length, cardxref: xrefs.length, tcatbal: tcatbals.length };
// raw files are no longer needed downstream
output.dailytran = null;
output.acctdata = null;
output.cardxref = null;
output.tcatbal = null;
```

### Validate And Post Records (SCRIPT, id=6ae124593695c563ea5093ef)

```javascript
// Validate And Post Records (legacy CBTRN02C 1500-VALIDATE-TRAN, 2000-POST-TRANSACTION, 2500-WRITE-REJECT-REC)
// One iteration per daily-feed record, in feed order. Account and category-balance state is updated in place,
// so a later record is validated against balances that include earlier postings of the same run.

var feed = JSON.parse(String(input.feedJson));
var accounts = JSON.parse(String(input.accountsJson));
var xrefs = JSON.parse(String(input.xrefsJson));
var tcatbals = JSON.parse(String(input.tcatbalsJson));

var acctIdx = {};
accounts.forEach(function (a, i) { if (!(String(a.acctId) in acctIdx)) acctIdx[String(a.acctId)] = i; });
var xrefIdx = {};
xrefs.forEach(function (x, i) { if (!(x.cardNum in xrefIdx)) xrefIdx[x.cardNum] = i; });
function tcKey(acctId, typeCd, catCd) { return acctId + '|' + typeCd + '|' + catCd; }
var tcIdx = {};
tcatbals.forEach(function (t, i) { var k = tcKey(t.acctId, t.typeCd, t.catCd); if (!(k in tcIdx)) tcIdx[k] = i; });

function p(n, w) { var s = String(n); while (s.length < w) s = '0' + s; return s; }
// Legacy Z-GET-DB2-FORMAT-TIMESTAMP layout: YYYY-MM-DD-HH.MI.SS.hh0000 (26 chars)
function nowDb2() {
  var d = new Date();
  return d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1, 2) + '-' + p(d.getUTCDate(), 2) + '-' +
    p(d.getUTCHours(), 2) + '.' + p(d.getUTCMinutes(), 2) + '.' + p(d.getUTCSeconds(), 2) + '.' +
    p(Math.floor(d.getUTCMilliseconds() / 10), 2) + '0000';
}
var procTs = (input.processedTimestamp != null && String(input.processedTimestamp) !== '') ? String(input.processedTimestamp) : nowDb2();

var REASONS = {
  100: 'INVALID CARD NUMBER FOUND',
  101: 'ACCOUNT RECORD NOT FOUND',
  102: 'OVERLIMIT TRANSACTION',
  103: 'TRANSACTION RECEIVED AFTER ACCT EXPIRATION'
};

var posted = [];
var rejected = [];
var postedIds = {};
var duplicates = [];

for (var i = 0; i < feed.length; i++) {
  var rec = feed[i];

  // BR-09: posting is idempotent on transactionId - an id already posted in this run is not posted again
  if (postedIds[rec.id]) { duplicates.push({ index: rec.index, id: rec.id }); continue; }

  // BR-01..BR-04, order xref -> account -> limit -> expiry; a later failure overwrites an earlier one (F-05)
  var reason = 0;
  var xref = null, acct = null;
  var xi = xrefIdx[rec.cardNum];
  if (xi === undefined) {
    reason = 100;                                             // BR-01
  } else {
    xref = xrefs[xi];
    var ai = acctIdx[String(xref.acctId)];
    if (ai === undefined) {
      reason = 101;                                           // BR-02
    } else {
      acct = accounts[ai];
      // BR-03: cycleCredit - cycleDebit + amount > creditLimit * 1.10  (integer cents: x*100 > limit*110)
      var tempBal = acct.cycCredit - acct.cycDebit + rec.amt;
      if (tempBal * 100 > acct.creditLimit * 110) reason = 102;
      // BR-04: expiry date before the transaction's original date (YYYY-MM-DD string compare)
      if (acct.expiryDate < String(rec.origTs).substring(0, 10)) reason = 103;
    }
  }

  if (reason !== 0) {
    // BR-06: original record + reason code + description
    rejected.push({ rec: rec, reason: reason, desc: REASONS[reason] });
    continue;
  }

  // BR-05: post
  posted.push({ rec: rec, procTs: procTs });
  postedIds[rec.id] = true;

  // TCATBAL upsert, keyed by the xref account id + type + category (create on not found)
  var k = tcKey(xref.acctId, rec.typeCd, rec.catCd);
  if (tcIdx[k] === undefined) {
    tcatbals.push({ acctId: xref.acctId, typeCd: rec.typeCd, catCd: rec.catCd, bal: rec.amt });
    tcIdx[k] = tcatbals.length - 1;
  } else {
    tcatbals[tcIdx[k]].bal += rec.amt;
  }

  // Account update
  acct.currBal += rec.amt;
  if (rec.amt >= 0) acct.cycCredit += rec.amt; else acct.cycDebit += rec.amt;
}

output.postedJson = JSON.stringify(posted);
output.rejectedJson = JSON.stringify(rejected);
output.accountsJson = JSON.stringify(accounts);
output.tcatbalsJson = JSON.stringify(tcatbals);
output.postingStats = { read: feed.length, posted: posted.length, rejected: rejected.length, duplicatesSkipped: duplicates.length, duplicates: duplicates, processedTimestamp: procTs };
output.feedJson = null;
output.xrefsJson = null;
```

### Build Run Summary (SCRIPT, id=6ae1245c3695c563ea5093f0)

```javascript
// Build Run Summary (legacy end-of-job DISPLAY + RETURN-CODE) and the CONTRACT.md output shapes.
// Each output list is returned as a JSON string so int/amount typing survives the trip out of the workflow.

var posted = JSON.parse(String(input.postedJson));
var rejected = JSON.parse(String(input.rejectedJson));
var accounts = JSON.parse(String(input.accountsJson));
var tcatbals = JSON.parse(String(input.tcatbalsJson));
var stats = input.postingStats;

function amt(c) {
  var neg = c < 0;
  var a = Math.abs(c);
  return (neg ? '-' : '') + Math.floor(a / 100) + '.' + ('0' + (a % 100)).slice(-2);
}
function tranFields(rec, procTs) {
  return {
    tran_id: rec.id,
    type_cd: rec.typeCd,
    cat_cd: rec.catCd,
    source: rec.source,
    desc: rec.desc,
    amt: amt(rec.amt),
    merchant_id: rec.merchantId,
    merchant_name: rec.merchantName,
    merchant_city: rec.merchantCity,
    merchant_zip: rec.merchantZip,
    card_num: rec.cardNum,
    orig_ts: rec.origTs,
    proc_ts: procTs
  };
}

var transact = posted.map(function (p) { return tranFields(p.rec, p.procTs); });
var dalyrejs = rejected.map(function (r) {
  // the reject image is the original daily record, so proc_ts is the one the feed carried
  var t = tranFields(r.rec, r.rec.procTs);
  t.reason = r.reason;
  t.reason_desc = r.desc;
  return t;
});
var acctdata = accounts.map(function (a) {
  return {
    acct_id: a.acctId,
    active_status: a.activeStatus,
    curr_bal: amt(a.currBal),
    credit_limit: amt(a.creditLimit),
    cash_credit_limit: amt(a.cashCreditLimit),
    open_date: a.openDate,
    expiration_date: a.expiryDate,
    reissue_date: a.reissueDate,
    curr_cyc_credit: amt(a.cycCredit),
    curr_cyc_debit: amt(a.cycDebit),
    addr_zip: a.addrZip,
    group_id: a.groupId
  };
});
var tcatbal = tcatbals.map(function (t) {
  return { acct_id: t.acctId, type_cd: t.typeCd, cat_cd: t.catCd, bal: amt(t.bal) };
});

var rejectedCount = dalyrejs.length;
output.posttran_transact = JSON.stringify(transact);
output.posttran_dalyrejs = JSON.stringify(dalyrejs);
output.posttran_acctdata = JSON.stringify(acctdata);
output.posttran_tcatbal = JSON.stringify(tcatbal);
output.runSummary = {
  batchId: input.batchId == null ? null : String(input.batchId),
  businessDate: input.businessDate == null ? null : String(input.businessDate),
  transactionsRead: stats.read,
  transactionsPosted: transact.length,
  transactionsRejected: rejectedCount,
  duplicatesSkipped: stats.duplicatesSkipped,
  processedTimestamp: stats.processedTimestamp,
  // BR-07: WARNING (legacy RETURN-CODE 4) when any reject exists
  status: rejectedCount > 0 ? 'WARNING' : 'COMPLETED',
  returnCode: rejectedCount > 0 ? 4 : 0
};

output.postedJson = null;
output.rejectedJson = null;
output.accountsJson = null;
output.tcatbalsJson = null;
output.postingStats = null;
output.loadCounts = null;
```

_(server: 218 ms, 1 API call, 215 ms in API)_
