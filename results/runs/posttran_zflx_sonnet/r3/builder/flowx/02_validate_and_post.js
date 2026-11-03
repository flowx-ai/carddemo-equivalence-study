// SCRIPT node "Validate and Post Records" — the per-record loop of P-14
// (legacy CBTRN02C 1500-VALIDATE-TRAN / 2000-POST-TRANSACTION / 2500-WRITE-REJECT-REC).
// Lookups (CardXref, Account, TransactionCategoryBalance) are in-memory stores loaded by the
// previous node; account and category-balance updates are applied in place so later records
// in the same run see them (the legacy program re-reads ACCTDAT for every record).

var REASONS = {
  100: 'INVALID CARD NUMBER FOUND',
  101: 'ACCOUNT RECORD NOT FOUND',
  102: 'OVERLIMIT TRANSACTION',
  103: 'TRANSACTION RECEIVED AFTER ACCT EXPIRATION',
  109: 'ACCOUNT RECORD NOT FOUND'
};

function toArr(x) {
  var out = [];
  if (x === null || x === undefined) return out;
  for (var i = 0; i < x.length; i++) out.push(x[i]);
  return out;
}

// explicit copies: input.* elements may be host objects, which for..in does not enumerate reliably
function copyTran(o) {
  return {
    id: o.id, typeCd: o.typeCd, catCd: o.catCd, source: o.source, desc: o.desc, amt: o.amt,
    merchantId: o.merchantId, merchantName: o.merchantName, merchantCity: o.merchantCity,
    merchantZip: o.merchantZip, cardNum: o.cardNum, origTs: o.origTs, procTs: o.procTs
  };
}
function copyAcct(o) {
  return {
    acctId: o.acctId, activeStatus: o.activeStatus, currBal: o.currBal, creditLimit: o.creditLimit,
    cashCreditLimit: o.cashCreditLimit, openDate: o.openDate, expirationDate: o.expirationDate,
    reissueDate: o.reissueDate, currCycCredit: o.currCycCredit, currCycDebit: o.currCycDebit,
    addrZip: o.addrZip, groupId: o.groupId
  };
}
function copyTcat(o) { return { acctId: o.acctId, typeCd: o.typeCd, catCd: o.catCd, bal: o.bal }; }
function copyXref(o) { return { cardNum: o.cardNum, custId: o.custId, acctId: o.acctId }; }

function two(n) { return (n < 10 ? '0' : '') + n; }

// DB2-format timestamp used by the legacy Z-GET-DB2-FORMAT-TIMESTAMP: YYYY-MM-DD-HH.MM.SS.hh0000
function db2Timestamp(d) {
  return d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate()) + '-' +
    two(d.getHours()) + '.' + two(d.getMinutes()) + '.' + two(d.getSeconds()) + '.' +
    two(Math.floor(d.getMilliseconds() / 10)) + '0000';
}

var feed = toArr(input.feed ? input.feed.records : null).map(copyTran);
var accounts = toArr(input.accounts).map(copyAcct);
var xrefs = toArr(input.xrefs).map(copyXref);
var tcatbals = toArr(input.tcatbals).map(copyTcat);

// keyed stores; a KSDS key is unique, so the first record loaded for a key wins
var xrefByCard = {}, acctById = {}, tcatByKey = {}, i;
for (i = 0; i < xrefs.length; i++) if (!(xrefs[i].cardNum in xrefByCard)) xrefByCard[xrefs[i].cardNum] = xrefs[i];
for (i = 0; i < accounts.length; i++) if (!(accounts[i].acctId in acctById)) acctById[accounts[i].acctId] = accounts[i];
function tcatKey(acctId, typeCd, catCd) { return acctId + '|' + typeCd + '|' + catCd; }
for (i = 0; i < tcatbals.length; i++) {
  var k0 = tcatKey(tcatbals[i].acctId, tcatbals[i].typeCd, tcatbals[i].catCd);
  if (!(k0 in tcatByKey)) tcatByKey[k0] = tcatbals[i];
}

var postedIds = {};
var posted = [], rejects = [], duplicates = [];
var procTs = db2Timestamp(new Date());

for (i = 0; i < feed.length; i++) {
  var t = feed[i];
  var reason = 0, desc = '';
  var xref = null, acct = null;

  // BR-09: each record is idempotent via transactionId — a transactionId already posted is not posted again
  if (postedIds[t.id]) { duplicates.push(t.id); continue; }

  // 1500-A: BR-01 card must exist in CardXref
  xref = xrefByCard[t.cardNum];
  if (!xref) {
    reason = 100; desc = REASONS[100];
  } else {
    // 1500-B: BR-02 account must exist
    acct = acctById[xref.acctId];
    if (!acct) {
      reason = 101; desc = REASONS[101];
    } else {
      // BR-03 over limit: cycle credit - cycle debit + amount > credit limit
      var tempBal = acct.currCycCredit - acct.currCycDebit + t.amt;
      if (!(acct.creditLimit >= tempBal)) { reason = 102; desc = REASONS[102]; }
      // BR-04 expiry: expiryDate < transaction original date (YYYY-MM-DD); overwrites 102 when both apply
      if (!(acct.expirationDate >= String(t.origTs).substring(0, 10))) { reason = 103; desc = REASONS[103]; }
    }
  }

  if (reason !== 0) {
    // 2500-WRITE-REJECT-REC — BR-06 original record + 4-digit reason + 76-char description
    var r = copyTran(t);
    r.reason = reason;
    r.reasonDesc = desc;
    rejects.push(r);
    continue;
  }

  // 2000-POST-TRANSACTION — BR-05
  // 2700-UPDATE-TCATBAL: upsert, create on not found
  var k = tcatKey(xref.acctId, t.typeCd, t.catCd);
  var tc = tcatByKey[k];
  if (!tc) {
    tc = { acctId: xref.acctId, typeCd: t.typeCd, catCd: t.catCd, bal: 0 };
    tcatByKey[k] = tc;
    tcatbals.push(tc);
  }
  tc.bal += t.amt;

  // 2800-UPDATE-ACCOUNT-REC
  acct.currBal += t.amt;
  if (t.amt >= 0) acct.currCycCredit += t.amt;
  else acct.currCycDebit += t.amt;

  // 2900-WRITE-TRANSACTION-FILE: transaction keeps the feed transactionId, processedTimestamp = now
  var p = copyTran(t);
  p.procTs = procTs;
  posted.push(p);
  postedIds[t.id] = true;
}

output.postedTransactions = posted;
output.rejectedTransactions = rejects;
output.duplicateTransactionIds = duplicates;
output.accounts = accounts;
output.tcatbals = tcatbals;
output.xrefs = null;
output.feed = { recordCount: feed.length };
