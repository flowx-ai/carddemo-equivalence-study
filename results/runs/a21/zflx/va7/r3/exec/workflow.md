# Workflow: posttran_daily_transaction_posting

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** P-14 daily-transaction-posting (legacy POSTTRAN / CBTRN02C). Reads the DALYTRAN feed plus ACCTDATA, CARDXREF, TCATBALF images; validates each record (BR-01..04, BR-10), posts valid ones (Transaction, TCATBAL upsert, Account update) and rejects the rest with reason code; returns POSTTRAN outputs + run summary (BR-07).

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae1dd2a3695c563ea50ab92 | <uuid> | (0, 0) | → Load Daily Feed (seq:<uuid>) |
| Load Daily Feed | SCRIPT | 6ae1dd323695c563ea50ab98 | <uuid> | (500, 0) | → Validate and Post Records (seq:<uuid>) | lang: JAVASCRIPT |
| Validate and Post Records | SCRIPT | 6ae1dd343695c563ea50aba0 | <uuid> | (1000, 0) | → Build Run Summary (seq:<uuid>) | lang: JAVASCRIPT |
| Build Run Summary | SCRIPT | 6ae1dd373695c563ea50aba1 | <uuid> | (1500, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae1dd3a3695c563ea50abaa | <uuid> | (2000, 0) | — |

## Systems
_(none)_

## Scripts

### Load Daily Feed (SCRIPT, id=6ae1dd323695c563ea50ab98)

```javascript
// Load Daily Feed (legacy DALYTRAN-FILE / ACCTFILE / XREFFILE / TCATBALF opens + reads).
// Parses the fixed-width copybook images into records. Amounts are held as integer cents.

function records(txt, len) {
  var s = (txt === null || txt === undefined) ? '' : String(txt);
  var raw = s.split(/\r?\n/);
  var out = [];
  for (var i = 0; i < raw.length; i++) {
    var l = raw[i];
    if (l.replace(/\s+$/, '').length === 0) continue;   // blank line = no record
    out.push(l.padEnd(len, ' ').substring(0, len));
  }
  return out;
}

// Signed zoned decimal, implied 2 decimals (PIC S9(n)V99). Accepts ASCII overpunch
// ({A-I = +0..9, }J-R = -0..9, p-y = -0..9), plain digits, or an explicit +/- sign.
function zoned(f) {
  var t = String(f).trim();
  if (t === '') return 0;
  var neg = false;
  if (t.charAt(0) === '-' || t.charAt(0) === '+') { neg = t.charAt(0) === '-'; t = t.substring(1).trim(); }
  if (t.charAt(t.length - 1) === '-' || t.charAt(t.length - 1) === '+') {
    neg = t.charAt(t.length - 1) === '-'; t = t.substring(0, t.length - 1).trim();
  }
  if (t.indexOf('.') >= 0) {
    var v = Math.round(parseFloat(t) * 100);
    return isNaN(v) ? 0 : (neg ? -v : v);
  }
  var last = t.charAt(t.length - 1);
  var body = t.substring(0, t.length - 1).replace(/\s/g, '0');
  var d = '{ABCDEFGHI'.indexOf(last);
  if (d < 0) { d = '}JKLMNOPQR'.indexOf(last); if (d >= 0) neg = true; }
  if (d < 0) { d = 'pqrstuvwxy'.indexOf(last); if (d >= 0) neg = true; }
  if (d < 0) { d = (last >= '0' && last <= '9') ? last.charCodeAt(0) - 48 : 0; }
  var n = parseInt(body + String(d), 10);
  if (isNaN(n)) n = 0;
  return neg ? -n : n;
}

function num(f) {
  var n = parseInt(String(f).trim(), 10);
  return isNaN(n) ? 0 : n;
}

// CVTRA06Y DALYTRAN-RECORD (350)
function tran(l) {
  return {
    tran_id: l.substring(0, 16), type_cd: l.substring(16, 18), cat_cd: num(l.substring(18, 22)),
    source: l.substring(22, 32), desc: l.substring(32, 132), amt: zoned(l.substring(132, 143)),
    merchant_id: num(l.substring(143, 152)), merchant_name: l.substring(152, 202),
    merchant_city: l.substring(202, 252), merchant_zip: l.substring(252, 262),
    card_num: l.substring(262, 278), orig_ts: l.substring(278, 304), proc_ts: l.substring(304, 330)
  };
}
// CVACT01Y ACCOUNT-RECORD (300)
function acct(l) {
  return {
    acct_id: num(l.substring(0, 11)), active_status: l.substring(11, 12),
    curr_bal: zoned(l.substring(12, 24)), credit_limit: zoned(l.substring(24, 36)),
    cash_credit_limit: zoned(l.substring(36, 48)), open_date: l.substring(48, 58),
    expiration_date: l.substring(58, 68), reissue_date: l.substring(68, 78),
    curr_cyc_credit: zoned(l.substring(78, 90)), curr_cyc_debit: zoned(l.substring(90, 102)),
    addr_zip: l.substring(102, 112), group_id: l.substring(112, 122)
  };
}
// CVACT03Y CARD-XREF-RECORD (50)
function xref(l) {
  return { card_num: l.substring(0, 16), cust_id: num(l.substring(16, 25)), acct_id: num(l.substring(25, 36)) };
}
// CVTRA01Y TRAN-CAT-BAL-RECORD (50)
function tcb(l) {
  return { acct_id: num(l.substring(0, 11)), type_cd: l.substring(11, 13), cat_cd: num(l.substring(13, 17)), bal: zoned(l.substring(17, 28)) };
}

output.stores = JSON.stringify({
  feed: records(input.dailytran, 350).map(tran),
  accounts: records(input.acctdata, 300).map(acct),
  xref: records(input.cardxref, 50).map(xref),
  tcatbal: records(input.tcatbal, 50).map(tcb)
});
// raw images are no longer needed downstream
output.dailytran = null;
output.acctdata = null;
output.cardxref = null;
output.tcatbal = null;

```

### Validate and Post Records (SCRIPT, id=6ae1dd343695c563ea50aba0)

```javascript
// For Each Record -> Validate Record -> Post Transaction | Write Reject (legacy CBTRN02C main loop,
// 1500-VALIDATE-TRAN, 2000-POST-TRANSACTION, 2500-WRITE-REJECT-REC). Records are processed in feed order;
// each validation/posting sees the account and category-balance state left by the records before it.

var st = JSON.parse(String(input.stores));

function pad2(n) { return String(n).padStart(2, '0'); }
// DB2-format timestamp YYYY-MM-DD-HH.MM.SS.hh0000 (legacy Z-GET-DB2-FORMAT-TIMESTAMP)
function db2Now() {
  var d = new Date();
  return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate()) + '-' +
    pad2(d.getUTCHours()) + '.' + pad2(d.getUTCMinutes()) + '.' + pad2(d.getUTCSeconds()) + '.' +
    pad2(Math.floor(d.getUTCMilliseconds() / 10)) + '0000';
}

var xrefByCard = {};
st.xref.forEach(function (x) { if (!(x.card_num in xrefByCard)) xrefByCard[x.card_num] = x; });
var acctById = {};
st.accounts.forEach(function (a) { if (!(String(a.acct_id) in acctById)) acctById[String(a.acct_id)] = a; });
function tcbKey(acctId, typeCd, catCd) { return acctId + '|' + typeCd + '|' + catCd; }
var tcbByKey = {};
st.tcatbal.forEach(function (b) { tcbByKey[tcbKey(b.acct_id, b.type_cd, b.cat_cd)] = b; });

var MAX_DAILY_PURCHASES = 4;   // BR-10
var posted = [], rejects = [];
var purchasesByCard = {};       // posted purchases (amount > 0) per card in this run
var postedIds = {};             // BR-09 idempotency key
var duplicateSkipped = 0;

for (var i = 0; i < st.feed.length; i++) {
  var t = st.feed[i];
  var reason = 0, reasonDesc = '';
  var x = xrefByCard[t.card_num];
  var a = null;

  if (x === undefined) {                                           // BR-01
    reason = 100; reasonDesc = 'INVALID CARD NUMBER FOUND';
  } else {
    a = acctById[String(x.acct_id)];
    if (a === undefined) {                                         // BR-02
      reason = 101; reasonDesc = 'ACCOUNT RECORD NOT FOUND';
    } else {
      var tempBal = a.curr_cyc_credit - a.curr_cyc_debit + t.amt;
      if (!(a.credit_limit >= tempBal)) {                          // BR-03
        reason = 102; reasonDesc = 'OVERLIMIT TRANSACTION';
      }
      if (!(a.expiration_date >= t.orig_ts.substring(0, 10))) {    // BR-04 (overwrites 102, legacy F-05)
        reason = 103; reasonDesc = 'TRANSACTION RECEIVED AFTER ACCT EXPIRATION';
      }
    }
  }
  if (reason === 0 && t.amt > 0 && (purchasesByCard[t.card_num] || 0) >= MAX_DAILY_PURCHASES) {  // BR-10
    reason = 104; reasonDesc = 'DAILY PURCHASE LIMIT EXCEEDED';
  }

  if (reason !== 0) {                                              // BR-06 Write Reject
    var r = JSON.parse(JSON.stringify(t));
    r.reason = reason;
    r.reason_desc = reasonDesc;
    rejects.push(r);
    continue;
  }

  if (postedIds[t.tran_id]) { duplicateSkipped++; continue; }      // BR-09: already posted, do not post twice

  // BR-05 Post Transaction: TCATBAL upsert, Account update, Transaction insert
  var key = tcbKey(x.acct_id, t.type_cd, t.cat_cd);
  var b = tcbByKey[key];
  if (b === undefined) {
    b = { acct_id: x.acct_id, type_cd: t.type_cd, cat_cd: t.cat_cd, bal: 0 };
    tcbByKey[key] = b;
    st.tcatbal.push(b);
  }
  b.bal += t.amt;

  a.curr_bal += t.amt;
  if (t.amt >= 0) a.curr_cyc_credit += t.amt; else a.curr_cyc_debit += t.amt;

  var p = JSON.parse(JSON.stringify(t));
  p.proc_ts = db2Now();
  posted.push(p);
  postedIds[t.tran_id] = true;
  if (t.amt > 0) purchasesByCard[t.card_num] = (purchasesByCard[t.card_num] || 0) + 1;
}

output.posting = JSON.stringify({
  read: st.feed.length, posted: posted, rejects: rejects,
  accounts: st.accounts, tcatbal: st.tcatbal, duplicateSkipped: duplicateSkipped
});
output.stores = null;

```

### Build Run Summary (SCRIPT, id=6ae1dd373695c563ea50aba1)

```javascript
// Build Run Summary (legacy end-of-job DISPLAY + RETURN-CODE). Shapes the four POSTTRAN outputs
// per CONTRACT.md (one JSON array each) and sets the run state (BR-07: WARNING / RC 4 when any reject).

var res = JSON.parse(String(input.posting));

function money(c) {
  var neg = c < 0, a = Math.abs(c);
  return (neg ? '-' : '') + Math.floor(a / 100) + '.' + String(a % 100).padStart(2, '0');
}
function rt(s) { return String(s === null || s === undefined ? '' : s).replace(/\s+$/, ''); }

function tranOut(t) {
  return {
    tran_id: rt(t.tran_id), type_cd: rt(t.type_cd), cat_cd: t.cat_cd, source: rt(t.source),
    desc: rt(t.desc), amt: money(t.amt), merchant_id: t.merchant_id, merchant_name: rt(t.merchant_name),
    merchant_city: rt(t.merchant_city), merchant_zip: rt(t.merchant_zip), card_num: rt(t.card_num),
    orig_ts: rt(t.orig_ts), proc_ts: rt(t.proc_ts)
  };
}
function rejOut(t) {
  var o = tranOut(t);
  o.reason = t.reason;
  o.reason_desc = rt(t.reason_desc);
  return o;
}
function acctOut(a) {
  return {
    acct_id: a.acct_id, active_status: rt(a.active_status), curr_bal: money(a.curr_bal),
    credit_limit: money(a.credit_limit), cash_credit_limit: money(a.cash_credit_limit),
    open_date: rt(a.open_date), expiration_date: rt(a.expiration_date), reissue_date: rt(a.reissue_date),
    curr_cyc_credit: money(a.curr_cyc_credit), curr_cyc_debit: money(a.curr_cyc_debit),
    addr_zip: rt(a.addr_zip), group_id: rt(a.group_id)
  };
}
function tcbOut(b) {
  return { acct_id: b.acct_id, type_cd: rt(b.type_cd), cat_cd: b.cat_cd, bal: money(b.bal) };
}

output.transactJson = JSON.stringify(res.posted.map(tranOut));
output.dalyrejsJson = JSON.stringify(res.rejects.map(rejOut));
output.acctdataJson = JSON.stringify(res.accounts.map(acctOut));
output.tcatbalJson = JSON.stringify(res.tcatbal.map(tcbOut));
output.readCount = res.read;
output.postedCount = res.posted.length;
output.rejectedCount = res.rejects.length;
output.duplicateSkippedCount = res.duplicateSkipped;
output.returnCode = res.rejects.length > 0 ? 4 : 0;
output.runStatus = res.rejects.length > 0 ? 'WARNING' : 'COMPLETED';
output.posting = null;

```

_(server: 184 ms, 1 API call, 181 ms in API)_
