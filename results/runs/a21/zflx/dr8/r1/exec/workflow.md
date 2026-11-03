# Workflow: posttran_daily_transaction_posting

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** P-14 daily-transaction-posting (POSTTRAN / CBTRN02C). Parses the DALYTRAN feed and the ACCTDATA/CARDXREF/TCATBAL stores, orders the feed (BR-10), validates (BR-01..04), posts (BR-05) or rejects (BR-06), and returns the posted transactions, rejects, accounts and category balances plus a run summary (BR-07).

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae1df1d3695c563ea50ac3b | <uuid> | (0, 0) | → Load Daily Feed (seq:<uuid>) |
| Load Daily Feed | SCRIPT | 6ae1df1f3695c563ea50ac3c | <uuid> | (500, 0) | → Order Feed by Amount (BR-10) (seq:<uuid>) | lang: JAVASCRIPT |
| Order Feed by Amount (BR-10) | SCRIPT | 6ae1df223695c563ea50ac3d | <uuid> | (1000, 0) | → Validate and Post (seq:<uuid>) | lang: JAVASCRIPT |
| Validate and Post | SCRIPT | 6ae1df243695c563ea50ac3e | <uuid> | (1500, 0) | → Build Run Summary (seq:<uuid>) | lang: JAVASCRIPT |
| Build Run Summary | SCRIPT | 6ae1df273695c563ea50ac3f | <uuid> | (2000, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae1df293695c563ea50ac40 | <uuid> | (2500, 0) | — |

## Systems
_(none)_

## Scripts

### Load Daily Feed (SCRIPT, id=6ae1df1f3695c563ea50ac3c)

```javascript
// Load Daily Feed: parse the fixed-width records (copybook layouts) handed over by the
// batch-file-transfer adapter into structured records. Amounts are kept as integer cents.
function arr(x) { var a = []; if (x === null || x === undefined) return a; var n = x.length; for (var i = 0; i < n; i++) a.push(x[i]); return a; }
function pad(s, n) { s = (s === null || s === undefined) ? '' : String(s); s = s.replace(/[\r\n]+$/, ''); while (s.length < n) s += ' '; return s; }
function blank(s) { return s === null || s === undefined || String(s).replace(/[\s\r\n]/g, '') === ''; }
// Signed zoned decimal (PIC S9(n)V99, sign overpunched on the last byte) -> integer cents.
function zoned(raw, what) {
  var s = String(raw).trim();
  if (s === '') return 0;
  if (/^[+-]?\d*\.\d*$/.test(s) || /^[+-]\d+$/.test(s) || /^\d+[+-]$/.test(s)) {
    var t = s, sg = 1;
    if (t.charAt(t.length - 1) === '-' ) { sg = -1; t = t.substring(0, t.length - 1); }
    else if (t.charAt(t.length - 1) === '+') { t = t.substring(0, t.length - 1); }
    if (t.charAt(0) === '-') { sg = -sg; t = t.substring(1); } else if (t.charAt(0) === '+') { t = t.substring(1); }
    if (t.indexOf('.') >= 0) { var p = t.split('.'); var fr = (p[1] + '00').substring(0, 2); return sg * (parseInt(p[0] || '0', 10) * 100 + parseInt(fr, 10)); }
    return sg * parseInt(t, 10);
  }
  var last = s.charAt(s.length - 1), body = s.substring(0, s.length - 1), d, neg = false;
  var POS = '{ABCDEFGHI', NEG = '}JKLMNOPQR', ANEG = 'pqrstuvwxy';
  if (last >= '0' && last <= '9') d = last;
  else if (POS.indexOf(last) >= 0) d = String(POS.indexOf(last));
  else if (NEG.indexOf(last) >= 0) { d = String(NEG.indexOf(last)); neg = true; }
  else if (ANEG.indexOf(last) >= 0) { d = String(ANEG.indexOf(last)); neg = true; }
  else throw new Error('Unreadable signed amount in ' + what + ': [' + raw + ']');
  var digits = (body + d).replace(/ /g, '0');
  if (!/^\d+$/.test(digits)) throw new Error('Unreadable signed amount in ' + what + ': [' + raw + ']');
  var v = parseInt(digits, 10);
  return neg ? -v : v;
}
function num(raw) { var s = String(raw).trim(); return /^\d+$/.test(s) ? parseInt(s, 10) : (s === '' ? 0 : s); }
function acctKey(raw) { var s = String(raw).trim(); return /^\d+$/.test(s) ? String(parseInt(s, 10)) : s; }

// CVTRA06Y DALYTRAN-RECORD (350)
var feed = [], lines = arr(input.dailytranLines);
for (var i = 0; i < lines.length; i++) {
  if (blank(lines[i])) continue;
  var s = pad(lines[i], 350);
  feed.push({
    seq: feed.length,
    tranId: s.substring(0, 16), typeCd: s.substring(16, 18), catCd: s.substring(18, 22),
    source: s.substring(22, 32), desc: s.substring(32, 132),
    amt: zoned(s.substring(132, 143), 'DALYTRAN-AMT line ' + (i + 1)),
    merchantId: s.substring(143, 152), merchantName: s.substring(152, 202),
    merchantCity: s.substring(202, 252), merchantZip: s.substring(252, 262),
    cardNum: s.substring(262, 278), origTs: s.substring(278, 304), procTs: s.substring(304, 330)
  });
}
// CVACT01Y ACCOUNT-RECORD (300)
var accounts = [], al = arr(input.acctdataLines);
for (var j = 0; j < al.length; j++) {
  if (blank(al[j])) continue;
  var a = pad(al[j], 300);
  accounts.push({
    key: acctKey(a.substring(0, 11)), acctId: a.substring(0, 11), activeStatus: a.substring(11, 12),
    currBal: zoned(a.substring(12, 24), 'ACCT-CURR-BAL'), creditLimit: zoned(a.substring(24, 36), 'ACCT-CREDIT-LIMIT'),
    cashCreditLimit: zoned(a.substring(36, 48), 'ACCT-CASH-CREDIT-LIMIT'),
    openDate: a.substring(48, 58), expDate: a.substring(58, 68), reissueDate: a.substring(68, 78),
    cycCredit: zoned(a.substring(78, 90), 'ACCT-CURR-CYC-CREDIT'), cycDebit: zoned(a.substring(90, 102), 'ACCT-CURR-CYC-DEBIT'),
    addrZip: a.substring(102, 112), groupId: a.substring(112, 122)
  });
}
// CVACT03Y CARD-XREF-RECORD (50)
var xrefs = [], xl = arr(input.cardxrefLines);
for (var k = 0; k < xl.length; k++) {
  if (blank(xl[k])) continue;
  var x = pad(xl[k], 50);
  xrefs.push({ cardNum: x.substring(0, 16), custId: x.substring(16, 25), acctKey: acctKey(x.substring(25, 36)) });
}
// CVTRA01Y TRAN-CAT-BAL-RECORD (50)
var tcatbals = [], tl = arr(input.tcatbalLines);
for (var m = 0; m < tl.length; m++) {
  if (blank(tl[m])) continue;
  var t = pad(tl[m], 50);
  tcatbals.push({ acctKey: acctKey(t.substring(0, 11)), typeCd: t.substring(11, 13), catCd: num(t.substring(13, 17)),
                  bal: zoned(t.substring(17, 28), 'TRAN-CAT-BAL') });
}
output.feed = feed;
output.accounts = accounts;
output.xrefs = xrefs;
output.tcatbals = tcatbals;
output.recordsRead = feed.length;
// raw images are no longer needed downstream; drop them to keep the data model small
output.dailytranLines = null;
output.acctdataLines = null;
output.cardxrefLines = null;
output.tcatbalLines = null;
```

### Order Feed by Amount (BR-10) (SCRIPT, id=6ae1df223695c563ea50ac3d)

```javascript
// BR-10: process the day's transactions in ascending order of amount, smallest first
// (credits/negative amounts first); equal amounts keep their order in the daily feed.
var F = ['seq', 'tranId', 'typeCd', 'catCd', 'source', 'desc', 'amt', 'merchantId', 'merchantName',
         'merchantCity', 'merchantZip', 'cardNum', 'origTs', 'procTs'];
var src = input.feed, feed = [];
var n = (src === null || src === undefined) ? 0 : src.length;
for (var i = 0; i < n; i++) {
  var r = src[i], o = {};
  for (var f = 0; f < F.length; f++) o[F[f]] = r[F[f]];
  o.amt = Number(o.amt); o.seq = Number(o.seq);
  feed.push(o);
}
feed.sort(function (a, b) { return a.amt !== b.amt ? a.amt - b.amt : a.seq - b.seq; });
output.feed = feed;
```

### Validate and Post (SCRIPT, id=6ae1df243695c563ea50ac3e)

```javascript
// Validate and Post: one iteration per feed record, in the order set by BR-10.
// Validation (BR-01..BR-04, legacy 1500-VALIDATE-TRAN): xref -> account -> limit -> expiry.
// Posting (BR-05, legacy 2000-POST-TRANSACTION): Transaction insert, TCATBAL upsert, Account update.
function arr(x) { var a = []; if (x === null || x === undefined) return a; var n = x.length; for (var i = 0; i < n; i++) a.push(x[i]); return a; }
function copy(r, fields) { var o = {}; for (var f = 0; f < fields.length; f++) o[fields[f]] = r[fields[f]]; return o; }
function p2(v) { return (v < 10 ? '0' : '') + v; }
// legacy Z-GET-DB2-FORMAT-TIMESTAMP layout: YYYY-MM-DD-HH.MM.SS.hh0000 (26 chars)
function db2Now() {
  var d = new Date();
  return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) + '-' + p2(d.getHours()) + '.' +
         p2(d.getMinutes()) + '.' + p2(d.getSeconds()) + '.' + p2(Math.floor(d.getMilliseconds() / 10)) + '0000';
}
var TF = ['seq', 'tranId', 'typeCd', 'catCd', 'source', 'desc', 'amt', 'merchantId', 'merchantName',
          'merchantCity', 'merchantZip', 'cardNum', 'origTs', 'procTs'];
var AF = ['key', 'acctId', 'activeStatus', 'currBal', 'creditLimit', 'cashCreditLimit', 'openDate', 'expDate',
          'reissueDate', 'cycCredit', 'cycDebit', 'addrZip', 'groupId'];

var accounts = arr(input.accounts).map(function (r) { var o = copy(r, AF);
  o.currBal = Number(o.currBal); o.creditLimit = Number(o.creditLimit); o.cashCreditLimit = Number(o.cashCreditLimit);
  o.cycCredit = Number(o.cycCredit); o.cycDebit = Number(o.cycDebit); o.key = String(o.key); return o; });
var acctByKey = {};
accounts.forEach(function (a) { if (!(a.key in acctByKey)) acctByKey[a.key] = a; });

var xrefByCard = {};
arr(input.xrefs).forEach(function (r) { var c = String(r.cardNum); if (!(c in xrefByCard)) xrefByCard[c] = String(r.acctKey); });

var tcatbals = arr(input.tcatbals).map(function (r) {
  return { acctKey: String(r.acctKey), typeCd: String(r.typeCd), catCd: r.catCd, bal: Number(r.bal) }; });
function tcKey(acctKey, typeCd, catCd) { return acctKey + '|' + String(typeCd) + '|' + String(catCd); }
var tcByKey = {};
tcatbals.forEach(function (t) { var k = tcKey(t.acctKey, t.typeCd, t.catCd); if (!(k in tcByKey)) tcByKey[k] = t; });

var posted = [], rejected = [], postedIds = {}, duplicates = [];
var feed = arr(input.feed).map(function (r) { var o = copy(r, TF); o.amt = Number(o.amt); return o; });

for (var i = 0; i < feed.length; i++) {
  var t = feed[i];
  // BR-09: a transactionId is posted at most once
  if (postedIds[t.tranId]) { duplicates.push(t.tranId); continue; }
  var reason = 0, reasonDesc = '';
  var aKey = xrefByCard[t.cardNum];
  var acct = null;
  if (aKey === undefined) {
    reason = 100; reasonDesc = 'INVALID CARD NUMBER FOUND';                                   // BR-01
  } else {
    acct = acctByKey[aKey];
    if (!acct) {
      reason = 101; reasonDesc = 'ACCOUNT RECORD NOT FOUND';                                  // BR-02
    } else {
      var tempBal = acct.cycCredit - acct.cycDebit + t.amt;
      if (!(acct.creditLimit >= tempBal)) { reason = 102; reasonDesc = 'OVERLIMIT TRANSACTION'; }          // BR-03
      if (!(acct.expDate >= t.origTs.substring(0, 10))) {                                                  // BR-04 (overwrites 102)
        reason = 103; reasonDesc = 'TRANSACTION RECEIVED AFTER ACCT EXPIRATION'; }
    }
  }
  if (reason !== 0) {
    var rj = copy(t, TF); rj.reason = reason; rj.reasonDesc = reasonDesc;                     // BR-06
    rejected.push(rj);
    continue;
  }
  // BR-05 posting
  var tx = copy(t, TF); tx.procTs = db2Now();
  var k = tcKey(aKey, t.typeCd, Number(String(t.catCd).trim()) || 0);
  var tc = tcByKey[k];
  if (!tc) {
    tc = { acctKey: aKey, typeCd: t.typeCd, catCd: Number(String(t.catCd).trim()) || 0, bal: 0 };
    tcByKey[k] = tc; tcatbals.push(tc);
  }
  tc.bal += t.amt;
  acct.currBal += t.amt;
  if (t.amt >= 0) acct.cycCredit += t.amt; else acct.cycDebit += t.amt;
  posted.push(tx);
  postedIds[t.tranId] = true;
}

output.postedTransactions = posted;
output.rejectedTransactions = rejected;
output.accounts = accounts;
output.tcatbals = tcatbals;
output.duplicateTransactionIds = duplicates;
output.feed = null;
output.xrefs = null;
```

### Build Run Summary (SCRIPT, id=6ae1df273695c563ea50ac3f)

```javascript
// Build Run Summary: counts and return state (BR-07), and the output records in the
// I/O contract shape (posttran_transact / posttran_dalyrejs / posttran_acctdata / posttran_tcatbal).
function arr(x) { var a = []; if (x === null || x === undefined) return a; var n = x.length; for (var i = 0; i < n; i++) a.push(x[i]); return a; }
function rt(s) { return (s === null || s === undefined) ? '' : String(s).replace(/\s+$/, ''); }
function money(c) { c = Math.round(Number(c)); var neg = c < 0, a = Math.abs(c);
  return (neg ? '-' : '') + Math.floor(a / 100) + '.' + ('0' + (a % 100)).slice(-2); }
function int(v) { var s = String(v === null || v === undefined ? '' : v).trim(); return /^-?\d+$/.test(s) ? parseInt(s, 10) : (s === '' ? 0 : s); }
function tran(t) {
  return { tran_id: rt(t.tranId), type_cd: rt(t.typeCd), cat_cd: int(t.catCd), source: rt(t.source), desc: rt(t.desc),
           amt: money(t.amt), merchant_id: int(t.merchantId), merchant_name: rt(t.merchantName),
           merchant_city: rt(t.merchantCity), merchant_zip: rt(t.merchantZip), card_num: rt(t.cardNum),
           orig_ts: rt(t.origTs), proc_ts: rt(t.procTs) };
}
var posted = arr(input.postedTransactions).map(tran);
var rejects = arr(input.rejectedTransactions).map(function (r) { var o = tran(r); o.reason = int(r.reason); o.reason_desc = rt(r.reasonDesc); return o; });
var accounts = arr(input.accounts).map(function (a) {
  return { acct_id: int(a.acctId), active_status: rt(a.activeStatus), curr_bal: money(a.currBal), credit_limit: money(a.creditLimit),
           cash_credit_limit: money(a.cashCreditLimit), open_date: rt(a.openDate), expiration_date: rt(a.expDate),
           reissue_date: rt(a.reissueDate), curr_cyc_credit: money(a.cycCredit), curr_cyc_debit: money(a.cycDebit),
           addr_zip: rt(a.addrZip), group_id: rt(a.groupId) };
});
var tcatbal = arr(input.tcatbals).map(function (t) {
  return { acct_id: int(t.acctKey), type_cd: rt(t.typeCd), cat_cd: int(t.catCd), bal: money(t.bal) }; });
var dups = arr(input.duplicateTransactionIds).map(rt);

var read = Number(input.recordsRead || 0);
output.posttran_transact = posted;
output.posttran_dalyrejs = rejects;
output.posttran_acctdata = accounts;
output.posttran_tcatbal = tcatbal;
output.runSummary = {
  batchId: input.batchId === undefined ? null : input.batchId,
  businessDate: input.businessDate === undefined ? null : input.businessDate,
  recordsRead: read, postedCount: posted.length, rejectedCount: rejects.length, duplicateCount: dups.length,
  duplicateTransactionIds: dups,
  countsBalance: read === posted.length + rejects.length + dups.length,
  status: rejects.length > 0 ? 'WARNING' : 'COMPLETED',
  returnCode: rejects.length > 0 ? 4 : 0
};
output.postedTransactions = null;
output.rejectedTransactions = null;
output.accounts = null;
output.tcatbals = null;
output.duplicateTransactionIds = null;
```

_(server: 227 ms, 1 API call, 224 ms in API)_
