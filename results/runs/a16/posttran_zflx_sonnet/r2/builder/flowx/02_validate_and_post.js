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
