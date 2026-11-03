# Workflow: posttran_daily_transaction_posting

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** P-14 daily-transaction-posting (legacy POSTTRAN / CBTRN02C). Reads DALYTRAN, CARDXREF, ACCTDAT, TCATBALF fixed-width images; validates each daily transaction (reasons 100-103), posts valid ones (transaction, category balance upsert, account balance/cycle totals) and returns the posted transactions, rejects, updated accounts and category balances plus a run summary.

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae126053695c563ea509419 | <uuid> | (0, 0) | → Load Daily Feed (seq:<uuid>) |
| Load Daily Feed | SCRIPT | 6ae126083695c563ea509420 | <uuid> | (500, 0) | → Validate and Post Records (seq:<uuid>) | lang: JAVASCRIPT |
| Validate and Post Records | SCRIPT | 6ae1260b3695c563ea509427 | <uuid> | (1000, 0) | → Build Run Summary (seq:<uuid>) | lang: JAVASCRIPT |
| Build Run Summary | SCRIPT | 6ae1260e3695c563ea50942f | <uuid> | (1500, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae126123695c563ea509430 | <uuid> | (2000, 0) | — |

## Systems
_(none)_

## Scripts

### Load Daily Feed (SCRIPT, id=6ae126083695c563ea509420)

```javascript
// Node "Load Daily Feed" — parses the fixed-width input images (one record per line)
// DALYTRAN (CVTRA06Y, 350), CARDXREF (CVACT03Y, 50), ACCTDAT (CVACT01Y, 300), TCATBALF (CVTRA01Y, 50).
// Amounts are kept as integer cents so posting arithmetic is exact (COBOL S9(n)V99).

var OVERPUNCH_POS = "{ABCDEFGHI";
var OVERPUNCH_NEG = "}JKLMNOPQR";
var OVERPUNCH_NEG_ASCII = "pqrstuvwxy";

function recordsOf(text, len) {
  if (text === null || text === undefined) return [];
  var all = String(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  var out = [];
  for (var i = 0; i < all.length; i++) {
    var l = all[i];
    if (l.trim() === "") continue;
    out.push(l.length < len ? l.padEnd(len, " ") : l);
  }
  return out;
}

function str(rec, start, len) {
  return rec.substring(start, start + len).replace(/\s+$/, "");
}

// Signed zoned decimal with 2 implied decimals -> integer cents.
function cents(rec, start, len) {
  var s = rec.substring(start, start + len).trim();
  if (s === "") return 0;
  var sign = 1;
  if (s.charAt(0) === "-") { sign = -1; s = s.substring(1); }
  else if (s.charAt(0) === "+") { s = s.substring(1); }
  var last = s.charAt(s.length - 1);
  var body = s.substring(0, s.length - 1);
  var k;
  if (last === "-") { sign = -1; s = body; }
  else if (last === "+") { s = body; }
  else if ((k = OVERPUNCH_POS.indexOf(last)) >= 0) { s = body + k; }
  else if ((k = OVERPUNCH_NEG.indexOf(last)) >= 0) { sign = -1; s = body + k; }
  else if ((k = OVERPUNCH_NEG_ASCII.indexOf(last)) >= 0) { sign = -1; s = body + k; }
  if (s.indexOf(".") >= 0) {
    var p = s.split(".");
    var whole = parseInt(p[0] === "" ? "0" : p[0], 10);
    var frac = parseInt((p[1] + "00").substring(0, 2), 10);
    if (isNaN(whole) || isNaN(frac)) return 0;
    return sign * (whole * 100 + frac) || 0;
  }
  s = s.replace(/ /g, "0");
  if (!/^[0-9]+$/.test(s)) return 0;
  return sign * parseInt(s, 10) || 0;
}

function num(rec, start, len) {
  var s = rec.substring(start, start + len).trim();
  if (!/^[0-9]+$/.test(s)) return 0;
  return parseInt(s, 10);
}

// Numeric account keys (9(11)) are compared by value.
function acctKey(raw) {
  var s = raw.trim();
  return /^[0-9]+$/.test(s) ? String(parseInt(s, 10)) : s;
}

var feed = recordsOf(input.dailytranFile, 350).map(function (r, i) {
  return {
    seq: i + 1,
    tranId: str(r, 0, 16),
    typeCd: str(r, 16, 2),
    catCd: num(r, 18, 4),
    source: str(r, 22, 10),
    desc: str(r, 32, 100),
    amt: cents(r, 132, 11),
    merchantId: num(r, 143, 9),
    merchantName: str(r, 152, 50),
    merchantCity: str(r, 202, 50),
    merchantZip: str(r, 252, 10),
    cardNum: str(r, 262, 16),
    origTs: str(r, 278, 26),
    procTs: str(r, 304, 26)
  };
});

var xrefs = recordsOf(input.cardxrefFile, 50).map(function (r) {
  return { cardNum: str(r, 0, 16), custId: num(r, 16, 9), acctKey: acctKey(r.substring(25, 36)), acctId: num(r, 25, 11) };
});

var accounts = recordsOf(input.acctdataFile, 300).map(function (r) {
  return {
    key: acctKey(r.substring(0, 11)),
    acctId: num(r, 0, 11),
    activeStatus: str(r, 11, 1),
    currBal: cents(r, 12, 12),
    creditLimit: cents(r, 24, 12),
    cashCreditLimit: cents(r, 36, 12),
    openDate: str(r, 48, 10),
    expirationDate: str(r, 58, 10),
    reissueDate: str(r, 68, 10),
    cycCredit: cents(r, 78, 12),
    cycDebit: cents(r, 90, 12),
    addrZip: str(r, 102, 10),
    groupId: str(r, 112, 10)
  };
});

var tcatbals = recordsOf(input.tcatbalFile, 50).map(function (r) {
  return { acctKey: acctKey(r.substring(0, 11)), acctId: num(r, 0, 11), typeCd: str(r, 11, 2), catCd: num(r, 13, 4), bal: cents(r, 17, 11) };
});

output.feed = JSON.stringify(feed);
output.refData = JSON.stringify({ xrefs: xrefs, accounts: accounts, tcatbals: tcatbals });
// raw images are no longer needed downstream; drop them so they do not ride along in every node payload
output.dailytranFile = null;
output.cardxrefFile = null;
output.acctdataFile = null;
output.tcatbalFile = null;

```

### Validate and Post Records (SCRIPT, id=6ae1260b3695c563ea509427)

```javascript
// Node "Validate and Post Records" — the per-record loop of CBTRN02C (1500-VALIDATE-TRAN,
// 2000-POST-TRANSACTION, 2500-WRITE-REJECT-REC). Records are processed in feed order and
// account/category-balance updates are visible to later records of the same run.

var feed = JSON.parse(String(input.feed));
var ref = JSON.parse(String(input.refData));

// BR-03: over limit when cycleCredit - cycleDebit + amount > creditLimit x 1.10
var OVERLIMIT_TOLERANCE_PCT = 110;

function two(n) { return (n < 10 ? "0" : "") + n; }
function db2Timestamp(d) {
  // legacy DB2 format YYYY-MM-DD-HH.MM.SS.hh0000 (26 chars)
  return d.getUTCFullYear() + "-" + two(d.getUTCMonth() + 1) + "-" + two(d.getUTCDate()) + "-" +
    two(d.getUTCHours()) + "." + two(d.getUTCMinutes()) + "." + two(d.getUTCSeconds()) + "." +
    two(Math.floor(d.getUTCMilliseconds() / 10)) + "0000";
}
var runTs = input.runTimestamp ? String(input.runTimestamp) : "";
var procTs = runTs !== "" ? runTs : db2Timestamp(new Date());

var xrefByCard = {};
ref.xrefs.forEach(function (x) { if (!(x.cardNum in xrefByCard)) xrefByCard[x.cardNum] = x; });
var acctIdx = {};
ref.accounts.forEach(function (a, i) { if (!(a.key in acctIdx)) acctIdx[a.key] = i; });
var tcatIdx = {};
function tcatKey(acct, type, cat) { return acct + "|" + type + "|" + cat; }
ref.tcatbals.forEach(function (t, i) {
  var k = tcatKey(t.acctKey, t.typeCd, t.catCd);
  if (!(k in tcatIdx)) tcatIdx[k] = i;
});

var posted = [], rejected = [], duplicates = [], postedIds = {};

feed.forEach(function (rec) {
  var reason = 0, reasonDesc = "";
  var xref = xrefByCard[rec.cardNum];
  var account = null;
  if (!xref) {
    reason = 100; reasonDesc = "INVALID CARD NUMBER FOUND";
  } else {
    var ai = acctIdx[xref.acctKey];
    if (ai === undefined) {
      reason = 101; reasonDesc = "ACCOUNT RECORD NOT FOUND";
    } else {
      account = ref.accounts[ai];
      var tempBal = account.cycCredit - account.cycDebit + rec.amt;
      if (tempBal * 100 > account.creditLimit * OVERLIMIT_TOLERANCE_PCT) {
        reason = 102; reasonDesc = "OVERLIMIT TRANSACTION";
      }
      // BR-04: checked after 102 and overwrites it (legacy order, F-05)
      if (account.expirationDate < rec.origTs.substring(0, 10)) {
        reason = 103; reasonDesc = "TRANSACTION RECEIVED AFTER ACCT EXPIRATION";
      }
    }
  }

  if (reason !== 0) {
    rec.reason = reason;
    rec.reasonDesc = reasonDesc;
    rejected.push(rec);
    return;
  }

  // BR-09: a transactionId is posted at most once
  if (postedIds[rec.tranId]) { duplicates.push(rec.tranId); return; }
  postedIds[rec.tranId] = true;

  // BR-05: TCATBAL upsert (create on not found)
  var k = tcatKey(xref.acctKey, rec.typeCd, rec.catCd);
  if (k in tcatIdx) {
    ref.tcatbals[tcatIdx[k]].bal += rec.amt;
  } else {
    tcatIdx[k] = ref.tcatbals.length;
    ref.tcatbals.push({ acctKey: xref.acctKey, acctId: xref.acctId, typeCd: rec.typeCd, catCd: rec.catCd, bal: rec.amt });
  }

  // BR-05: account balance and cycle totals
  account.currBal += rec.amt;
  if (rec.amt >= 0) account.cycCredit += rec.amt; else account.cycDebit += rec.amt;

  rec.procTs = procTs;
  posted.push(rec);
});

output.postingResult = JSON.stringify({
  posted: posted,
  rejected: rejected,
  duplicates: duplicates,
  accounts: ref.accounts,
  tcatbals: ref.tcatbals,
  read: feed.length,
  procTs: procTs
});
output.feed = null;
output.refData = null;

```

### Build Run Summary (SCRIPT, id=6ae1260e3695c563ea50942f)

```javascript
// Node "Build Run Summary" — shapes the contract outputs (posttran_transact / _dalyrejs /
// _acctdata / _tcatbal) and the run summary (BR-07: WARNING / return code 4 when any reject exists).

var r = JSON.parse(String(input.postingResult));

function amount(c) {
  var neg = c < 0;
  var a = Math.abs(c);
  var s = Math.floor(a / 100) + "." + String(a % 100).padStart(2, "0");
  return neg && a !== 0 ? "-" + s : s;
}

function tran(t) {
  return {
    tran_id: t.tranId,
    type_cd: t.typeCd,
    cat_cd: t.catCd,
    source: t.source,
    desc: t.desc,
    amt: amount(t.amt),
    merchant_id: t.merchantId,
    merchant_name: t.merchantName,
    merchant_city: t.merchantCity,
    merchant_zip: t.merchantZip,
    card_num: t.cardNum,
    orig_ts: t.origTs,
    proc_ts: t.procTs
  };
}

var transact = r.posted.map(tran);
var dalyrejs = r.rejected.map(function (t) {
  var o = tran(t);
  o.reason = t.reason;
  o.reason_desc = t.reasonDesc;
  return o;
});
var acctdata = r.accounts.map(function (a) {
  return {
    acct_id: a.acctId,
    active_status: a.activeStatus,
    curr_bal: amount(a.currBal),
    credit_limit: amount(a.creditLimit),
    cash_credit_limit: amount(a.cashCreditLimit),
    open_date: a.openDate,
    expiration_date: a.expirationDate,
    reissue_date: a.reissueDate,
    curr_cyc_credit: amount(a.cycCredit),
    curr_cyc_debit: amount(a.cycDebit),
    addr_zip: a.addrZip,
    group_id: a.groupId
  };
});
var tcatbal = r.tcatbals.map(function (t) {
  return { acct_id: t.acctId, type_cd: t.typeCd, cat_cd: t.catCd, bal: amount(t.bal) };
});

var rejectCount = dalyrejs.length;
var summary = {
  batchId: input.batchId ? String(input.batchId) : "",
  businessDate: input.businessDate ? String(input.businessDate) : "",
  status: rejectCount > 0 ? "WARNING" : "COMPLETED",
  returnCode: rejectCount > 0 ? 4 : 0,
  transactionsRead: r.read,
  transactionsPosted: transact.length,
  transactionsRejected: rejectCount,
  duplicatesSkipped: r.duplicates.length,
  countsBalance: r.read === transact.length + rejectCount + r.duplicates.length,
  processedTimestamp: r.procTs
};

output.result = {
  posttran_transact: transact,
  posttran_dalyrejs: dalyrejs,
  posttran_acctdata: acctdata,
  posttran_tcatbal: tcatbal,
  runSummary: summary
};
output.postingResult = null;

```

_(server: 224 ms, 1 API call, 221 ms in API)_
