// Validate and post each daily transaction, in feed order (CBTRN02C main loop).
// BR-01..BR-04 validation (1500-VALIDATE-TRAN), BR-05 posting (2000-POST-TRANSACTION),
// BR-06 rejects (2500-WRITE-REJECT-REC), BR-08 reason 109, BR-09 idempotency by transactionId.
// Records are processed strictly in order: a posting changes the account that later
// records of the same account are validated against.

var feed = input.feed;
var master = input.master;

function str(v) { return (v === null || v === undefined) ? '' : String(v); }
function num(v) { return Number(v); }

// COBOL ADD/COMPUTE without ON SIZE ERROR keeps the low-order digits.
function truncDigits(cents, totalDigits) {
  var m = Math.pow(10, totalDigits);
  var a = Math.abs(cents) % m;
  return (cents < 0 && a !== 0) ? -a : a;
}
var ACCT_AMT_DIGITS = 12;   // S9(10)V99
var TCATBAL_DIGITS = 11;    // S9(09)V99

function pad2(n) { return (n < 10 ? '0' : '') + n; }
// Z-GET-DB2-FORMAT-TIMESTAMP: YYYY-MM-DD-HH.MM.SS.hh0000
function db2Timestamp(d) {
  var hh = Math.floor(d.getMilliseconds() / 10);
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + '-' +
    pad2(d.getHours()) + '.' + pad2(d.getMinutes()) + '.' + pad2(d.getSeconds()) + '.' +
    pad2(hh) + '0000';
}

// Copy the master data into plain objects keyed like the legacy VSAM files.
var accounts = {}, accountOrder = [];
var srcAccounts = master.accounts;
for (var i = 0; i < srcAccounts.length; i++) {
  var a = srcAccounts[i];
  var acct = {
    acctId: str(a.acctId), activeStatus: str(a.activeStatus),
    currBal: num(a.currBal), creditLimit: num(a.creditLimit), cashCreditLimit: num(a.cashCreditLimit),
    openDate: str(a.openDate), expiryDate: str(a.expiryDate), reissueDate: str(a.reissueDate),
    currCycCredit: num(a.currCycCredit), currCycDebit: num(a.currCycDebit),
    addrZip: str(a.addrZip), groupId: str(a.groupId)
  };
  if (!accounts.hasOwnProperty(acct.acctId)) { accounts[acct.acctId] = acct; accountOrder.push(acct.acctId); }
}
var xrefs = {};
for (i = 0; i < master.xrefs.length; i++) {
  var x = master.xrefs[i];
  var card = str(x.cardNum);
  if (!xrefs.hasOwnProperty(card)) xrefs[card] = { cardNum: card, custId: str(x.custId), acctId: str(x.acctId) };
}
var tcatbal = {}, tcatOrder = [];
for (i = 0; i < master.categoryBalances.length; i++) {
  var t = master.categoryBalances[i];
  var tk = str(t.acctId) + '|' + str(t.typeCd) + '|' + str(t.catCd);
  if (!tcatbal.hasOwnProperty(tk)) {
    tcatbal[tk] = { acctId: str(t.acctId), typeCd: str(t.typeCd), catCd: str(t.catCd), balCents: num(t.balCents), created: false };
    tcatOrder.push(tk);
  }
}

var posted = [], rejected = [], aborted = [], duplicates = [];
var postedIds = {};
var records = feed.records;

for (var r = 0; r < records.length; r++) {
  var src = records[r];
  var tran = {
    index: num(src.index), image: str(src.image),
    tranId: str(src.tranId), typeCd: str(src.typeCd), catCd: str(src.catCd),
    source: str(src.source), desc: str(src.desc), amtCents: num(src.amtCents),
    merchantId: str(src.merchantId), merchantName: str(src.merchantName),
    merchantCity: str(src.merchantCity), merchantZip: str(src.merchantZip),
    cardNum: str(src.cardNum), origTs: str(src.origTs), procTs: str(src.procTs)
  };

  // ---- 1500-VALIDATE-TRAN: xref -> account -> limit -> expiry; the last failure wins ----
  var failures = [];
  var xref = xrefs.hasOwnProperty(tran.cardNum) ? xrefs[tran.cardNum] : null;
  var account = null;
  if (xref === null) {
    failures.push({ reason: 100, desc: 'INVALID CARD NUMBER FOUND' });
  } else {
    account = accounts.hasOwnProperty(xref.acctId) ? accounts[xref.acctId] : null;
    if (account === null) {
      failures.push({ reason: 101, desc: 'ACCOUNT RECORD NOT FOUND' });
    } else {
      var tempBal = account.currCycCredit - account.currCycDebit + tran.amtCents;
      if (!(account.creditLimit >= tempBal)) failures.push({ reason: 102, desc: 'OVERLIMIT TRANSACTION' });
      if (!(account.expiryDate >= tran.origTs.substr(0, 10))) {
        failures.push({ reason: 103, desc: 'TRANSACTION RECEIVED AFTER ACCT EXPIRATION' });
      }
    }
  }

  if (failures.length > 0) {
    // ---- 2500-WRITE-REJECT-REC: original image + 4-digit reason + 76-char description ----
    var last = failures[failures.length - 1];
    tran.rejectReason = last.reason;
    tran.rejectReasonDescription = last.desc;
    tran.allReasons = failures;
    rejected.push(tran);
    continue;
  }

  // ---- BR-09: a transactionId is posted at most once ----
  if (postedIds.hasOwnProperty(tran.tranId)) {
    duplicates.push({ index: tran.index, tranId: tran.tranId });
    continue;
  }

  // ---- 2800-UPDATE-ACCOUNT-REC precondition: BR-08, account rewrite failure aborts the record ----
  if (!accounts.hasOwnProperty(xref.acctId)) {
    aborted.push({ index: tran.index, tranId: tran.tranId, reason: 109, desc: 'ACCOUNT RECORD NOT FOUND' });
    continue;
  }

  // ---- 2000-POST-TRANSACTION ----
  tran.procTs = db2Timestamp(new Date());

  // 2700-UPDATE-TCATBAL: upsert, create on not found
  var key = xref.acctId + '|' + tran.typeCd + '|' + tran.catCd;
  if (!tcatbal.hasOwnProperty(key)) {
    tcatbal[key] = { acctId: xref.acctId, typeCd: tran.typeCd, catCd: tran.catCd, balCents: 0, created: true };
    tcatOrder.push(key);
  }
  tcatbal[key].balCents = truncDigits(tcatbal[key].balCents + tran.amtCents, TCATBAL_DIGITS);

  // 2800-UPDATE-ACCOUNT-REC
  account.currBal = truncDigits(account.currBal + tran.amtCents, ACCT_AMT_DIGITS);
  if (tran.amtCents >= 0) account.currCycCredit = truncDigits(account.currCycCredit + tran.amtCents, ACCT_AMT_DIGITS);
  else account.currCycDebit = truncDigits(account.currCycDebit + tran.amtCents, ACCT_AMT_DIGITS);

  // 2900-WRITE-TRANSACTION-FILE
  tran.accountId = xref.acctId;
  tran.newBalance = account.currBal;
  postedIds[tran.tranId] = true;
  posted.push(tran);
}

var accountList = [];
for (i = 0; i < accountOrder.length; i++) accountList.push(accounts[accountOrder[i]]);
var tcatList = [];
for (i = 0; i < tcatOrder.length; i++) tcatList.push(tcatbal[tcatOrder[i]]);

output.posting = {
  readCount: records.length,
  postedCount: posted.length,
  rejectedCount: rejected.length,
  abortedCount: aborted.length,
  duplicateCount: duplicates.length,
  postedTransactions: posted,
  rejectedTransactions: rejected,
  abortedRecords: aborted,
  duplicateRecords: duplicates,
  accounts: accountList,
  categoryBalances: tcatList
};
output.feed = null;
output.master = null;
