# Workflow: posttran_daily_transaction_posting

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** CardDemo POSTTRAN / CBTRN02C (P-14 daily-transaction-posting): validates each DALYTRAN record against card xref + account, posts valid ones (transaction, TCATBAL upsert, account balance/cycle totals), rejects invalid ones with reason 100-104. Input: raw fixed-width lines of dailytran/acctdata/cardxref/tcatbal. Output: posted transactions, rejects, accounts, category balances, run summary.

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae1d93c3695c563ea50aa4e | <uuid> | (0, 0) | → Load Daily Feed (seq:<uuid>) |
| Load Daily Feed | SCRIPT | 6ae1d93e3695c563ea50aa4f | <uuid> | (500, 0) | → Validate and Post Records (seq:<uuid>) | lang: JAVASCRIPT |
| Validate and Post Records | SCRIPT | 6ae1d9413695c563ea50aa50 | <uuid> | (1000, 0) | → Build Run Summary (seq:<uuid>) | lang: JAVASCRIPT |
| Build Run Summary | SCRIPT | 6ae1d9433695c563ea50aa51 | <uuid> | (1500, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae1d9463695c563ea50aa52 | <uuid> | (2000, 0) | — |

## Systems
_(none)_

## Scripts

### Load Daily Feed (SCRIPT, id=6ae1d93e3695c563ea50aa4f)

```javascript
// Load Daily Feed (P-14 "Load Daily Feed" / legacy DALYTRAN-FILE, ACCOUNT-FILE, XREF-FILE, TCATBAL-FILE opens)
// Parses the fixed-width copybook records (CVTRA06Y, CVACT01Y, CVACT03Y, CVTRA01Y) into structured records.
// Money is kept as integer cents throughout (PIC S9(n)V99).

function toArr(x) {
  if (x === null || x === undefined) return [];
  var out = [];
  if (typeof x === 'string') return [x];
  var n = (typeof x.length === 'number') ? x.length : ((typeof x.size === 'function') ? x.size() : 0);
  for (var i = 0; i < n; i++) {
    out.push((typeof x.length === 'number') ? x[i] : x.get(i));
  }
  return out;
}

function pad(s, len) {
  while (s.length < len) s += ' ';
  return s;
}

// One record per line; blank lines skipped; short lines (trailing spaces trimmed) padded to LRECL.
function records(x, len) {
  var a = toArr(x), r = [];
  for (var i = 0; i < a.length; i++) {
    if (a[i] === null || a[i] === undefined) continue;
    var s = String(a[i]).replace(/[\r\n]+$/, '');
    if (s.replace(/\s+/g, '') === '') continue;
    r.push(pad(s, len));
  }
  return r;
}

// Signed zoned decimal -> integer in units of the last digit (cents for V99).
// Accepts trailing overpunch ({A-I = +0..+9, }J-R = -0..-9), GnuCOBOL ASCII negative (p-y),
// leading/trailing explicit sign, and a literal decimal point.
function zoned(f) {
  var s = String(f).trim();
  if (s === '') return 0;
  var neg = false;
  if (s.charAt(0) === '-') { neg = true; s = s.substring(1); }
  else if (s.charAt(0) === '+') { s = s.substring(1); }
  var last = s.charAt(s.length - 1), body = s.substring(0, s.length - 1), d;
  var POS = '{ABCDEFGHI', NEG = '}JKLMNOPQR', GNU = 'pqrstuvwxy';
  if (last >= '0' && last <= '9') d = last;
  else if (POS.indexOf(last) >= 0) d = String(POS.indexOf(last));
  else if (NEG.indexOf(last) >= 0) { d = String(NEG.indexOf(last)); neg = true; }
  else if (GNU.indexOf(last) >= 0) { d = String(GNU.indexOf(last)); neg = true; }
  else if (last === '-') { d = ''; neg = true; }
  else if (last === '+') { d = ''; }
  else d = '0';
  var digits = body + d, v;
  if (digits.indexOf('.') >= 0) {
    v = Math.round(parseFloat(digits.replace(/[^0-9.]/g, '') || '0') * 100);
  } else {
    v = parseInt(digits.replace(/[^0-9]/g, '') || '0', 10);
  }
  return neg ? -v : v;
}

function num(f) {
  var t = String(f).replace(/[^0-9]/g, '');
  return t === '' ? 0 : parseInt(t, 10);
}

// Account / xref key: numeric 9(11) normalised so '00000000001' == '1'.
function acctKey(f) {
  var t = String(f).trim();
  return /^[0-9]+$/.test(t) ? String(parseInt(t, 10)) : t;
}

// CVTRA06Y DALYTRAN-RECORD (350)
var feed = [];
var dl = records(input.dalytranLines, 350);
for (var i = 0; i < dl.length; i++) {
  var s = dl[i];
  feed.push({
    seq: i + 1,
    id: s.substring(0, 16),
    typeCd: s.substring(16, 18),
    catCdRaw: s.substring(18, 22),
    catCd: num(s.substring(18, 22)),
    source: s.substring(22, 32),
    desc: s.substring(32, 132),
    amt: zoned(s.substring(132, 143)),
    merchantIdRaw: s.substring(143, 152),
    merchantId: num(s.substring(143, 152)),
    merchantName: s.substring(152, 202),
    merchantCity: s.substring(202, 252),
    merchantZip: s.substring(252, 262),
    cardNum: s.substring(262, 278),
    origTs: s.substring(278, 304),
    procTs: s.substring(304, 330)
  });
}

// CVACT01Y ACCOUNT-RECORD (300)
var accounts = [];
var al = records(input.acctdataLines, 300);
for (var j = 0; j < al.length; j++) {
  var a = al[j];
  accounts.push({
    key: acctKey(a.substring(0, 11)),
    acctId: num(a.substring(0, 11)),
    activeStatus: a.substring(11, 12),
    currBal: zoned(a.substring(12, 24)),
    creditLimit: zoned(a.substring(24, 36)),
    cashCreditLimit: zoned(a.substring(36, 48)),
    openDate: a.substring(48, 58),
    expirationDate: a.substring(58, 68),
    reissueDate: a.substring(68, 78),
    currCycCredit: zoned(a.substring(78, 90)),
    currCycDebit: zoned(a.substring(90, 102)),
    addrZip: a.substring(102, 112),
    groupId: a.substring(112, 122)
  });
}

// CVACT03Y CARD-XREF-RECORD (50)
var xrefs = [];
var xl = records(input.cardxrefLines, 50);
for (var k = 0; k < xl.length; k++) {
  var x = xl[k];
  xrefs.push({
    cardNum: x.substring(0, 16),
    custId: x.substring(16, 25),
    acctKey: acctKey(x.substring(25, 36)),
    acctId: num(x.substring(25, 36))
  });
}

// CVTRA01Y TRAN-CAT-BAL-RECORD (50)
var tcatbals = [];
var tl = records(input.tcatbalLines, 50);
for (var m = 0; m < tl.length; m++) {
  var t = tl[m];
  tcatbals.push({
    acctKey: acctKey(t.substring(0, 11)),
    acctId: num(t.substring(0, 11)),
    typeCd: t.substring(11, 13),
    catCd: num(t.substring(13, 17)),
    bal: zoned(t.substring(17, 28))
  });
}

output.feed = feed;
output.accounts = accounts;
output.xrefs = xrefs;
output.tcatbals = tcatbals;
output.loadCounts = { dalytran: feed.length, acctdata: accounts.length, cardxref: xrefs.length, tcatbal: tcatbals.length };
// Drop the raw file images from workflow state (keeps the data model small for the next nodes).
output.dalytranLines = null;
output.acctdataLines = null;
output.cardxrefLines = null;
output.tcatbalLines = null;

```

### Validate and Post Records (SCRIPT, id=6ae1d9413695c563ea50aa50)

```javascript
// Validate and Post Records (P-14 For Each Record -> Validate Record -> Post Transaction / Write Reject)
// Legacy CBTRN02C 1500-VALIDATE-TRAN, 2000-POST-TRANSACTION, 2500-WRITE-REJECT-REC; BR-01..BR-10.
// Records are processed strictly in feed order; every posting is visible to the next record's checks.

function toArr(x) {
  if (x === null || x === undefined) return [];
  var out = [];
  var n = (typeof x.length === 'number') ? x.length : ((typeof x.size === 'function') ? x.size() : 0);
  for (var i = 0; i < n; i++) out.push((typeof x.length === 'number') ? x[i] : x.get(i));
  return out;
}
function copy(o, keys) {
  var r = {};
  for (var i = 0; i < keys.length; i++) {
    var v = o[keys[i]];
    r[keys[i]] = (v === null || v === undefined) ? v : (typeof v === 'number' ? v : String(v));
  }
  return r;
}
function n2(v) { return v < 10 ? '0' + v : String(v); }
// Z-GET-DB2-FORMAT-TIMESTAMP: YYYY-MM-DD-HH.MM.SS.hh0000
function db2Now() {
  var d = new Date();
  return d.getFullYear() + '-' + n2(d.getMonth() + 1) + '-' + n2(d.getDate()) + '-' +
    n2(d.getHours()) + '.' + n2(d.getMinutes()) + '.' + n2(d.getSeconds()) + '.' +
    n2(Math.floor(d.getMilliseconds() / 10)) + '0000';
}
function pad4(v) { var s = String(v); while (s.length < 4) s = '0' + s; return s; }

var FEED_KEYS = ['seq', 'id', 'typeCd', 'catCdRaw', 'catCd', 'source', 'desc', 'amt', 'merchantIdRaw', 'merchantId',
  'merchantName', 'merchantCity', 'merchantZip', 'cardNum', 'origTs', 'procTs'];
var ACCT_KEYS = ['key', 'acctId', 'activeStatus', 'currBal', 'creditLimit', 'cashCreditLimit', 'openDate',
  'expirationDate', 'reissueDate', 'currCycCredit', 'currCycDebit', 'addrZip', 'groupId'];

var feed = toArr(input.feed);

// ACCOUNT-FILE (KSDS, key ACCT-ID): first occurrence of a key wins (a KSDS cannot hold duplicates).
var accounts = [], acctMap = {};
toArr(input.accounts).forEach(function (a) {
  var r = copy(a, ACCT_KEYS);
  if (!Object.prototype.hasOwnProperty.call(acctMap, r.key)) { acctMap[r.key] = r; accounts.push(r); }
});

// XREF-FILE (KSDS, key XREF-CARD-NUM X(16))
var xrefMap = {};
toArr(input.xrefs).forEach(function (x) {
  var r = copy(x, ['cardNum', 'custId', 'acctKey', 'acctId']);
  if (!Object.prototype.hasOwnProperty.call(xrefMap, r.cardNum)) xrefMap[r.cardNum] = r;
});

// TCATBAL-FILE (KSDS, key acct-id + type-cd + cat-cd)
var tcatbals = [], tcbMap = {};
toArr(input.tcatbals).forEach(function (t) {
  var r = copy(t, ['acctKey', 'acctId', 'typeCd', 'catCd', 'bal']);
  var k = r.acctKey + '|' + r.typeCd + '|' + pad4(r.catCd);
  if (!Object.prototype.hasOwnProperty.call(tcbMap, k)) { tcbMap[k] = r; tcatbals.push(r); }
});

var posted = [], rejects = [];
var purchaseCount = {};      // BR-10: posted purchases (amount > 0) per card in this run
var tcatbalCreated = 0, tcatbalUpdated = 0;

for (var i = 0; i < feed.length; i++) {
  var t = copy(feed[i], FEED_KEYS);
  var reason = 0, desc = '';
  var xref = null, acct = null;

  // 1500-A-LOOKUP-XREF (BR-01)
  if (Object.prototype.hasOwnProperty.call(xrefMap, t.cardNum)) {
    xref = xrefMap[t.cardNum];
  } else {
    reason = 100; desc = 'INVALID CARD NUMBER FOUND';
  }

  // 1500-B-LOOKUP-ACCT (BR-02..BR-04) - only when the xref lookup succeeded
  if (reason === 0) {
    if (Object.prototype.hasOwnProperty.call(acctMap, xref.acctKey)) {
      acct = acctMap[xref.acctKey];
      // BR-03: reject when credit limit < cycle credit - cycle debit + amount
      var tempBal = acct.currCycCredit - acct.currCycDebit + t.amt;
      if (!(acct.creditLimit >= tempBal)) {
        reason = 102; desc = 'OVERLIMIT TRANSACTION';
      }
      // BR-04: evaluated independently; overwrites 102 when both apply (legacy F-05)
      if (!(acct.expirationDate >= t.origTs.substring(0, 10))) {
        reason = 103; desc = 'TRANSACTION RECEIVED AFTER ACCT EXPIRATION';
      }
    } else {
      reason = 101; desc = 'ACCOUNT RECORD NOT FOUND';
    }
  }

  // BR-10: at most four posted purchases per card per run; only records that passed BR-01..BR-04
  if (reason === 0 && t.amt > 0 && (purchaseCount[t.cardNum] || 0) >= 4) {
    reason = 104; desc = 'DAILY PURCHASE LIMIT EXCEEDED';
  }

  if (reason === 0) {
    // 2000-POST-TRANSACTION (BR-05)
    var procTs = db2Now();

    // 2700-UPDATE-TCATBAL: upsert on XREF-ACCT-ID + type + category
    var k = xref.acctKey + '|' + t.typeCd + '|' + pad4(t.catCd);
    if (Object.prototype.hasOwnProperty.call(tcbMap, k)) {
      tcbMap[k].bal = tcbMap[k].bal + t.amt;
      tcatbalUpdated++;
    } else {
      var nr = { acctKey: xref.acctKey, acctId: xref.acctId, typeCd: t.typeCd, catCd: t.catCd, bal: t.amt };
      tcbMap[k] = nr; tcatbals.push(nr);
      tcatbalCreated++;
    }

    // 2800-UPDATE-ACCOUNT-REC
    acct.currBal = acct.currBal + t.amt;
    if (t.amt >= 0) acct.currCycCredit = acct.currCycCredit + t.amt;
    else acct.currCycDebit = acct.currCycDebit + t.amt;

    // 2900-WRITE-TRANSACTION-FILE: TRAN-ID = DALYTRAN-ID, TRAN-PROC-TS = now
    t.procTs = procTs;
    posted.push(t);

    if (t.amt > 0) purchaseCount[t.cardNum] = (purchaseCount[t.cardNum] || 0) + 1;
  } else {
    // 2500-WRITE-REJECT-REC (BR-06): original image + reason + description
    t.reason = reason;
    t.reasonDesc = desc;
    rejects.push(t);
  }
}

output.posted = posted;
output.rejects = rejects;
output.accounts = accounts;
output.tcatbals = tcatbals;
output.postingCounts = {
  read: feed.length, posted: posted.length, rejected: rejects.length,
  tcatbalCreated: tcatbalCreated, tcatbalUpdated: tcatbalUpdated
};
output.feed = null;
output.xrefs = null;

```

### Build Run Summary (SCRIPT, id=6ae1d9433695c563ea50aa51)

```javascript
// Build Run Summary (P-14 "Build Run Summary" / legacy end-of-job DISPLAY + RETURN-CODE)
// Shapes the four POSTTRAN outputs to the CONTRACT.md field names/types and computes the run state (BR-07).

function toArr(x) {
  if (x === null || x === undefined) return [];
  var out = [];
  var n = (typeof x.length === 'number') ? x.length : ((typeof x.size === 'function') ? x.size() : 0);
  for (var i = 0; i < n; i++) out.push((typeof x.length === 'number') ? x[i] : x.get(i));
  return out;
}
function rtrim(v) { return (v === null || v === undefined) ? '' : String(v).replace(/\s+$/, ''); }
// integer cents -> "1234.56" / "-0.50"
function money(c) {
  c = Number(c);
  var neg = c < 0, a = Math.abs(c);
  var cents = a % 100;
  return (neg ? '-' : '') + Math.floor(a / 100) + '.' + (cents < 10 ? '0' + cents : String(cents));
}
function tran(t) {
  return {
    tran_id: rtrim(t.id),
    type_cd: rtrim(t.typeCd),
    cat_cd: Number(t.catCd),
    source: rtrim(t.source),
    desc: rtrim(t.desc),
    amt: money(t.amt),
    merchant_id: Number(t.merchantId),
    merchant_name: rtrim(t.merchantName),
    merchant_city: rtrim(t.merchantCity),
    merchant_zip: rtrim(t.merchantZip),
    card_num: rtrim(t.cardNum),
    orig_ts: rtrim(t.origTs),
    proc_ts: rtrim(t.procTs)
  };
}

var transact = toArr(input.posted).map(tran);

var dalyrejs = toArr(input.rejects).map(function (t) {
  var r = tran(t);
  r.reason = Number(t.reason);
  r.reason_desc = rtrim(t.reasonDesc);
  return r;
});

var acctdata = toArr(input.accounts).map(function (a) {
  return {
    acct_id: Number(a.acctId),
    active_status: rtrim(a.activeStatus),
    curr_bal: money(a.currBal),
    credit_limit: money(a.creditLimit),
    cash_credit_limit: money(a.cashCreditLimit),
    open_date: rtrim(a.openDate),
    expiration_date: rtrim(a.expirationDate),
    reissue_date: rtrim(a.reissueDate),
    curr_cyc_credit: money(a.currCycCredit),
    curr_cyc_debit: money(a.currCycDebit),
    addr_zip: rtrim(a.addrZip),
    group_id: rtrim(a.groupId)
  };
});

var tcatbal = toArr(input.tcatbals).map(function (t) {
  return { acct_id: Number(t.acctId), type_cd: rtrim(t.typeCd), cat_cd: Number(t.catCd), bal: money(t.bal) };
});

var rejected = dalyrejs.length, postedCount = transact.length;
output.posttran_transact = transact;
output.posttran_dalyrejs = dalyrejs;
output.posttran_acctdata = acctdata;
output.posttran_tcatbal = tcatbal;
output.runSummary = {
  batchId: input.batchId ? String(input.batchId) : null,
  businessDate: input.businessDate ? String(input.businessDate) : null,
  transactionsProcessed: postedCount + rejected,
  posted: postedCount,
  rejected: rejected,
  countsReconcile: (postedCount + rejected) === Number(input.postingCounts ? input.postingCounts.read : postedCount + rejected),
  returnCode: rejected > 0 ? 4 : 0,
  status: rejected > 0 ? 'WARNING' : 'COMPLETED'
};
output.posted = null;
output.rejects = null;
output.accounts = null;
output.tcatbals = null;

```

_(server: 202 ms, 1 API call, 199 ms in API)_
