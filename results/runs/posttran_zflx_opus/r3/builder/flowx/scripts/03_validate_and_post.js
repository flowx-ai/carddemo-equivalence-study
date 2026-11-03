// Node: Validate and Post Transactions  (wiki nodes 3/5/6/7/8 — the per-transaction loop)
//   For each transaction (inputKey dailyTransactions, in file order):
//     Fetch Account -> gateway "Account Active & Within Limit?"
//       yes -> Post to Balance + TCATBAL (rules PostingValidation / UpdateCategoryBalance)
//       no  -> Write Reject
//   Results collected into postingResults (posted + rejected), the wiki's outputKey.
// The loop runs inside one node because each posting changes the account balance the next
// transaction is validated against (sequential state), exactly as the legacy batch rewrites ACCTFILE.
var txns = JSON.parse(String(input.dailyTransactionsJson || '[]'));
var accounts = JSON.parse(String(input.accountsJson || '[]'));
var xref = JSON.parse(String(input.xrefJson || '{}'));
var cards = JSON.parse(String(input.cardsJson || '{}'));
var tcat = JSON.parse(String(input.categoryBalancesJson || '[]'));
var cardCheckEnabled = Number(input.cardsLoaded || 0) > 0;

function pad(n, w) { var s = String(n); while (s.length < w) s = '0' + s; return s; }
// DB2-style timestamp YYYY-MM-DD-HH.MM.SS.ffffff, as the legacy TRAN-PROC-TS.
function db2Timestamp(d) {
  return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1, 2) + '-' + pad(d.getUTCDate(), 2) + '-' +
    pad(d.getUTCHours(), 2) + '.' + pad(d.getUTCMinutes(), 2) + '.' + pad(d.getUTCSeconds(), 2) + '.' +
    pad(d.getUTCMilliseconds() * 1000, 6);
}
var runTs = input.runTimestamp ? String(input.runTimestamp) : db2Timestamp(new Date());

var acctIdx = {};
for (var i = 0; i < accounts.length; i++) acctIdx[String(accounts[i].acctId)] = i;
var tcatIdx = {};
function tcatKey(acctId, typeCd, catCd) { return acctId + '|' + typeCd + '|' + catCd; }
for (var j = 0; j < tcat.length; j++) tcatIdx[tcatKey(tcat[j].acctId, tcat[j].typeCd, tcat[j].catCd)] = j;

// Rule: PostingValidation. Returns {reason, desc}; reason 0 = valid.
function validate(t) {
  var x = xref[t.cardNum];
  if (!x) return { reason: 100, desc: 'INVALID CARD NUMBER FOUND' };
  var ai = acctIdx[String(x.acctId)];
  if (ai === undefined) return { reason: 101, desc: 'ACCOUNT RECORD NOT FOUND' };
  var acct = accounts[ai];
  if (acct.activeStatus !== 'Y') return { reason: 104, desc: 'ACCOUNT NOT ACTIVE' };
  var card = cards[t.cardNum];
  if (cardCheckEnabled && card && card.activeStatus !== 'Y') return { reason: 105, desc: 'CARD NOT ACTIVE' };
  var res = { reason: 0, desc: '' };
  var available = acct.creditLimitCents - acct.currBalCents;        // wiki: creditLimit - currentBalance
  if (t.amtCents > available) res = { reason: 102, desc: 'OVERLIMIT TRANSACTION' };
  if (acct.expirationDate < String(t.origTs).substring(0, 10))     // later check overrides, as in CBTRN02C
    res = { reason: 103, desc: 'TRANSACTION RECEIVED AFTER ACCT EXPIRATION' };
  return res;
}

function copyTxn(t) {
  return { seq: t.seq, tranId: t.tranId, typeCd: t.typeCd, catCd: t.catCd, source: t.source, desc: t.desc,
    amtCents: t.amtCents, merchantId: t.merchantId, merchantName: t.merchantName,
    merchantCity: t.merchantCity, merchantZip: t.merchantZip, cardNum: t.cardNum,
    origTs: t.origTs, procTs: t.procTs };
}

var results = [];
var posted = 0, rejected = 0;
for (var n = 0; n < txns.length; n++) {
  var t = txns[n];
  var v = validate(t);
  var r = copyTxn(t);
  if (v.reason === 0) {
    var acctId = xref[t.cardNum].acctId;
    var acct = accounts[acctIdx[String(acctId)]];
    // Post to Balance
    acct.currBalCents += t.amtCents;
    if (t.amtCents >= 0) acct.currCycCreditCents += t.amtCents;
    else acct.currCycDebitCents += t.amtCents;
    // Rule: UpdateCategoryBalance (key = account + type + category; created when missing)
    var key = tcatKey(acctId, t.typeCd, t.catCd);
    if (tcatIdx[key] === undefined) {
      tcat.push({ acctId: acctId, typeCd: t.typeCd, catCd: t.catCd, balCents: 0 });
      tcatIdx[key] = tcat.length - 1;
    }
    tcat[tcatIdx[key]].balCents += t.amtCents;
    r.status = 'POSTED';
    r.procTs = runTs;
    posted++;
  } else {
    // Write Reject — the daily record unchanged, plus the validation trailer
    r.status = 'REJECTED';
    r.reason = v.reason;
    r.reasonDesc = v.desc;
    rejected++;
  }
  results.push(r);
}

output.postingResultsJson = JSON.stringify(results);
output.accountsJson = JSON.stringify(accounts);
output.categoryBalancesJson = JSON.stringify(tcat);
output.postedCount = posted;
output.rejectedCount = rejected;
output.processTimestamp = runTs;
output.dailyTransactionsJson = null;
output.xrefJson = null;
output.cardsJson = null;
