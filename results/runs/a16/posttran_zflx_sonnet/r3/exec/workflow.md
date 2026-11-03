# Workflow: posttran_daily_transaction_posting

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** P-14 daily-transaction-posting (legacy POSTTRAN / CBTRN02C): validates each DALYTRAN record (xref, account, over-limit with 10% tolerance, expiry), posts valid ones (Transaction, TCATBAL upsert, Account balances) and returns rejects with reason codes 100-103 plus a run summary (WARNING / RC 4 on rejects).

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae127c63695c563ea509455 | <uuid> | (0, 0) | → Validate and post (seq:<uuid>) |
| Validate and post | SCRIPT | 6ae127c93695c563ea509456 | <uuid> | (500, 0) | → Build run summary (seq:<uuid>) | lang: JAVASCRIPT |
| Build run summary | SCRIPT | 6ae127cc3695c563ea509457 | <uuid> | (1000, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae127cf3695c563ea509458 | <uuid> | (1500, 0) | — |

## Systems
_(none)_

## Scripts

### Validate and post (SCRIPT, id=6ae127c93695c563ea509456)

```javascript
// POSTTRAN / CBTRN02C — daily transaction posting (process P-14, daily-transaction-posting).
// Deployed verbatim as the SCRIPT node "Validate and post" of workflow posttran_daily_transaction_posting.
// input.dailytran / acctdata / cardxref / tcatbal: file contents, one fixed-width record per line
// (CVTRA06Y 350, CVACT01Y 300, CVACT03Y 50, CVTRA01Y 50).
// Amounts are handled as integer cents throughout.

function toLines(content, recLen) {
  var out = [];
  if (content === null || content === undefined) return out;
  var arr = String(content).split(/\r?\n/);
  for (var i = 0; i < arr.length; i++) {
    var l = arr[i];
    if (l.replace(/\s+$/, '').length === 0) continue;
    while (l.length < recLen) l += ' ';
    out.push(l);
  }
  return out;
}

function rtrim(s) { return s.replace(/\s+$/, ''); }

function toInt(s) {
  var n = parseInt(String(s).trim(), 10);
  return isNaN(n) ? 0 : n;
}

// Signed zoned decimal (overpunch on the last byte, as in the CardDemo ASCII files), also
// tolerating a leading/trailing sign or an explicit decimal point. Returns cents (scale 2).
function zonedToCents(raw) {
  var s = String(raw).trim();
  if (s === '') return 0;
  var neg = false;
  var first = s.charAt(0);
  if (first === '-' || first === '+') { neg = first === '-'; s = s.substring(1); }
  var last = s.charAt(s.length - 1);
  if (last === '-' || last === '+') { neg = last === '-'; s = s.substring(0, s.length - 1); }
  if (s.indexOf('.') >= 0) {
    var parts = s.split('.');
    var frac = (parts[1] + '00').substring(0, 2);
    var c1 = toInt(parts[0] || '0') * 100 + toInt(frac);
    return neg ? -c1 : c1;
  }
  var POS = '{ABCDEFGHI';
  var NEG = '}JKLMNOPQR';
  last = s.charAt(s.length - 1);
  if (POS.indexOf(last) >= 0) {
    s = s.substring(0, s.length - 1) + POS.indexOf(last);
  } else if (NEG.indexOf(last) >= 0) {
    s = s.substring(0, s.length - 1) + NEG.indexOf(last);
    neg = true;
  }
  var c = toInt(s);
  return neg ? -c : c;
}

function fmtCents(c) {
  var neg = c < 0;
  var a = Math.abs(c);
  var s = Math.floor(a / 100) + '.' + ('0' + (a % 100)).slice(-2);
  return neg ? '-' + s : s;
}

function pad2(n) { return ('0' + n).slice(-2); }

// DB2-style timestamp as produced by CBTRN02C Z-GET-DB2-FORMAT-TIMESTAMP: YYYY-MM-DD-HH.MM.SS.hh0000
function db2Now() {
  var d = new Date();
  var hh = Math.floor(d.getMilliseconds() / 10);
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + '-' +
    pad2(d.getHours()) + '.' + pad2(d.getMinutes()) + '.' + pad2(d.getSeconds()) + '.' + pad2(hh) + '0000';
}

// ---- parse masters -------------------------------------------------------------------------
var accounts = [];          // CVACT01Y, input order preserved
var accountById = {};
var acctLines = toLines(input.acctdata, 300);
for (var a = 0; a < acctLines.length; a++) {
  var r = acctLines[a];
  var acct = {
    acct_id: toInt(r.substring(0, 11)),
    active_status: rtrim(r.substring(11, 12)),
    curr_bal: zonedToCents(r.substring(12, 24)),
    credit_limit: zonedToCents(r.substring(24, 36)),
    cash_credit_limit: zonedToCents(r.substring(36, 48)),
    open_date: rtrim(r.substring(48, 58)),
    expiration_date: rtrim(r.substring(58, 68)),
    reissue_date: rtrim(r.substring(68, 78)),
    curr_cyc_credit: zonedToCents(r.substring(78, 90)),
    curr_cyc_debit: zonedToCents(r.substring(90, 102)),
    addr_zip: rtrim(r.substring(102, 112)),
    group_id: rtrim(r.substring(112, 122))
  };
  accounts.push(acct);
  accountById[acct.acct_id] = acct;
}

var xrefByCard = {};        // CVACT03Y, key XREF-CARD-NUM X(16)
var xrefLines = toLines(input.cardxref, 50);
for (var x = 0; x < xrefLines.length; x++) {
  var xr = xrefLines[x];
  xrefByCard[xr.substring(0, 16)] = { cust_id: toInt(xr.substring(16, 25)), acct_id: toInt(xr.substring(25, 36)) };
}

var tcatbals = [];          // CVTRA01Y, key acct + type + category
var tcatByKey = {};
var tcatLines = toLines(input.tcatbal, 50);
for (var t = 0; t < tcatLines.length; t++) {
  var tr = tcatLines[t];
  var tc = {
    acct_id: toInt(tr.substring(0, 11)),
    type_cd: rtrim(tr.substring(11, 13)),
    cat_cd: toInt(tr.substring(13, 17)),
    bal: zonedToCents(tr.substring(17, 28))
  };
  tcatbals.push(tc);
  tcatByKey[tc.acct_id + '|' + tc.type_cd + '|' + tc.cat_cd] = tc;
}

// ---- main loop over DALYTRAN (CVTRA06Y) -----------------------------------------------------
var REASONS = {
  100: 'INVALID CARD NUMBER FOUND',
  101: 'ACCOUNT RECORD NOT FOUND',
  102: 'OVERLIMIT TRANSACTION',
  103: 'TRANSACTION RECEIVED AFTER ACCT EXPIRATION'
};

var posted = [];
var rejects = [];
var postedIds = {};
var skippedDuplicates = [];
var feed = toLines(input.dailytran, 350);

for (var i = 0; i < feed.length; i++) {
  var d = feed[i];
  var tran = {
    tran_id: rtrim(d.substring(0, 16)),
    type_cd: rtrim(d.substring(16, 18)),
    cat_cd: toInt(d.substring(18, 22)),
    source: rtrim(d.substring(22, 32)),
    desc: rtrim(d.substring(32, 132)),
    amt: zonedToCents(d.substring(132, 143)),
    merchant_id: toInt(d.substring(143, 152)),
    merchant_name: rtrim(d.substring(152, 202)),
    merchant_city: rtrim(d.substring(202, 252)),
    merchant_zip: rtrim(d.substring(252, 262)),
    card_num: rtrim(d.substring(262, 278)),
    orig_ts: rtrim(d.substring(278, 304)),
    proc_ts: rtrim(d.substring(304, 330))
  };

  // BR-09: idempotent on transactionId — never post the same id twice.
  if (postedIds[tran.tran_id]) { skippedDuplicates.push(tran.tran_id); continue; }

  // 1500-VALIDATE-TRAN: xref -> account -> limit -> expiry; later failures overwrite earlier ones.
  var reason = 0;
  var xref = xrefByCard[d.substring(262, 278)];
  var acct = null;
  if (!xref) {
    reason = 100;                                             // BR-01
  } else {
    acct = accountById[xref.acct_id];
    if (!acct) {
      reason = 101;                                           // BR-02
    } else {
      // BR-03: currentCycleCredit - currentCycleDebit + amount > creditLimit x 1.10 (exact, in cents)
      var tempBal = acct.curr_cyc_credit - acct.curr_cyc_debit + tran.amt;
      if (tempBal * 100 > acct.credit_limit * 110) reason = 102;
      // BR-04: expiry before the transaction's original date (overwrites 102)
      if (acct.expiration_date < tran.orig_ts.substring(0, 10)) reason = 103;
    }
  }

  if (reason !== 0) {
    // 2500-WRITE-REJECT-REC (BR-06)
    var rej = {};
    for (var k in tran) rej[k] = tran[k];
    rej.amt = fmtCents(tran.amt);
    rej.reason = reason;
    rej.reason_desc = REASONS[reason];
    rejects.push(rej);
    continue;
  }

  // 2000-POST-TRANSACTION (BR-05)
  var out = {};
  for (var k2 in tran) out[k2] = tran[k2];
  out.proc_ts = db2Now();
  out.amt = fmtCents(tran.amt);
  posted.push(out);
  postedIds[tran.tran_id] = true;

  // 2700-UPDATE-TCATBAL: upsert, create on not found
  var key = xref.acct_id + '|' + tran.type_cd + '|' + tran.cat_cd;
  var cb = tcatByKey[key];
  if (!cb) {
    cb = { acct_id: xref.acct_id, type_cd: tran.type_cd, cat_cd: tran.cat_cd, bal: 0 };
    tcatbals.push(cb);
    tcatByKey[key] = cb;
  }
  cb.bal += tran.amt;

  // 2800-UPDATE-ACCOUNT-REC
  acct.curr_bal += tran.amt;
  if (tran.amt >= 0) acct.curr_cyc_credit += tran.amt;
  else acct.curr_cyc_debit += tran.amt;
}

// ---- outputs (CONTRACT.md formats) ----------------------------------------------------------
var acctOut = [];
for (var j = 0; j < accounts.length; j++) {
  var ac = accounts[j];
  acctOut.push({
    acct_id: ac.acct_id,
    active_status: ac.active_status,
    curr_bal: fmtCents(ac.curr_bal),
    credit_limit: fmtCents(ac.credit_limit),
    cash_credit_limit: fmtCents(ac.cash_credit_limit),
    open_date: ac.open_date,
    expiration_date: ac.expiration_date,
    reissue_date: ac.reissue_date,
    curr_cyc_credit: fmtCents(ac.curr_cyc_credit),
    curr_cyc_debit: fmtCents(ac.curr_cyc_debit),
    addr_zip: ac.addr_zip,
    group_id: ac.group_id
  });
}
var tcatOut = [];
for (var m = 0; m < tcatbals.length; m++) {
  var c = tcatbals[m];
  tcatOut.push({ acct_id: c.acct_id, type_cd: c.type_cd, cat_cd: c.cat_cd, bal: fmtCents(c.bal) });
}

output.posttran_transact = posted;
output.posttran_dalyrejs = rejects;
output.posttran_acctdata = acctOut;
output.posttran_tcatbal = tcatOut;
output.counts = {
  read: feed.length,
  posted: posted.length,
  rejected: rejects.length,
  skippedDuplicates: skippedDuplicates.length
};

```

### Build run summary (SCRIPT, id=6ae127cc3695c563ea509457)

```javascript
// "Build Run Summary" (end-of-job DISPLAY of CBTRN02C). BR-07: WARNING / RC 4 when any reject exists.
var c = input.counts;
var rejected = c ? c.rejected : 0;
output.runSummary = {
  batchId: input.batchId ? String(input.batchId) : null,
  businessDate: input.businessDate ? String(input.businessDate) : null,
  transactionsProcessed: c ? c.read : 0,
  transactionsPosted: c ? c.posted : 0,
  transactionsRejected: rejected,
  duplicatesSkipped: c ? c.skippedDuplicates : 0,
  status: rejected > 0 ? 'WARNING' : 'COMPLETED',
  returnCode: rejected > 0 ? 4 : 0
};
// Drop the raw feed/master images from the run state once posted.
output.dailytran = null;
output.acctdata = null;
output.cardxref = null;
output.tcatbal = null;

```

_(server: 324 ms, 1 API call, 321 ms in API)_
