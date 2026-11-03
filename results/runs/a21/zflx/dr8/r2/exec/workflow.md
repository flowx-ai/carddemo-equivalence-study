# Workflow: posttran_daily_transaction_posting

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** P-14 daily-transaction-posting (legacy POSTTRAN / CBTRN02C). Input: raw fixed-width file contents (dailytran, acctdata, cardxref, tcatbal). Validates each daily transaction (BR-01..04) in BR-10 posting order, posts valid ones (BR-05), rejects the rest (BR-06), and returns posttran_transact / posttran_dalyrejs / posttran_acctdata / posttran_tcatbal as JSON strings plus the run summary (BR-07).

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae1e10b3695c563ea50ac9f | <uuid> | (0, 0) | → Load Daily Feed (seq:<uuid>) |
| Load Daily Feed | SCRIPT | 6ae1e10e3695c563ea50aca0 | <uuid> | (500, 0) | → Load Reference Data (seq:<uuid>) | lang: JAVASCRIPT |
| Load Reference Data | SCRIPT | 6ae1e1103695c563ea50aca1 | <uuid> | (1000, 0) | → Order Feed for Posting (seq:<uuid>) | lang: JAVASCRIPT |
| Order Feed for Posting | SCRIPT | 6ae1e1133695c563ea50aca2 | <uuid> | (1500, 0) | → Validate and Post Records (seq:<uuid>) | lang: JAVASCRIPT |
| Validate and Post Records | SCRIPT | 6ae1e1153695c563ea50aca3 | <uuid> | (2000, 0) | → Build Run Summary (seq:<uuid>) | lang: JAVASCRIPT |
| Build Run Summary | SCRIPT | 6ae1e1183695c563ea50aca4 | <uuid> | (2500, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae1e11a3695c563ea50aca5 | <uuid> | (3000, 0) | — |

## Systems
_(none)_

## Scripts

### Load Daily Feed (SCRIPT, id=6ae1e10e3695c563ea50aca0)

```javascript
// READ_DAILY_FEED: parse DALYTRAN (copybook CVTRA06Y, 350 bytes) into DailyTransaction records.
// Amounts are carried as integer cents to avoid floating-point drift.
function toLines(s) {
  if (s == null) return [];
  var all = String(s).split(/\r?\n/);
  var out = [];
  for (var i = 0; i < all.length; i++) {
    if (all[i].replace(/\s+$/, '').length > 0) out.push(all[i]);
  }
  return out;
}
function fld(line, start, len) {
  var s = line.substring(start, start + len);
  while (s.length < len) s += ' ';
  return s;
}
function rtrim(s) { return s.replace(/\s+$/, ''); }
function num(s) { var t = s.trim(); return /^[0-9]+$/.test(t) ? parseInt(t, 10) : null; }
// Zoned decimal S9(n)V99 with trailing sign overpunch ({,A-I = +0..9; },J-R or p-y = -0..9).
function zonedCents(raw) {
  var s = String(raw).trim();
  if (s === '') return 0;
  if (/^[+-]?[0-9]*\.[0-9]+$/.test(s) || /^[+-][0-9]+$/.test(s)) return Math.round(parseFloat(s) * 100);
  var last = s.charAt(s.length - 1), body = s.substring(0, s.length - 1), d = '0', neg = false;
  if (last >= '0' && last <= '9') d = last;
  else if (last === '{') d = '0';
  else if (last === '}') { d = '0'; neg = true; }
  else if (last >= 'A' && last <= 'I') d = String(last.charCodeAt(0) - 64);
  else if (last >= 'J' && last <= 'R') { d = String(last.charCodeAt(0) - 73); neg = true; }
  else if (last >= 'p' && last <= 'y') { d = String(last.charCodeAt(0) - 112); neg = true; }
  var digits = (body + d).replace(/[^0-9]/g, '');
  var v = digits === '' ? 0 : parseInt(digits, 10);
  return neg ? -v : v;
}

var lines = toLines(input.dailytran);
var feed = [];
for (var i = 0; i < lines.length; i++) {
  var l = lines[i];
  feed.push({
    seq: i,
    tranId: rtrim(fld(l, 0, 16)),
    typeCd: rtrim(fld(l, 16, 2)),
    catCdRaw: fld(l, 18, 4),
    catCd: num(fld(l, 18, 4)),
    source: rtrim(fld(l, 22, 10)),
    desc: rtrim(fld(l, 32, 100)),
    amt: zonedCents(fld(l, 132, 11)),
    merchantId: num(fld(l, 143, 9)),
    merchantName: rtrim(fld(l, 152, 50)),
    merchantCity: rtrim(fld(l, 202, 50)),
    merchantZip: rtrim(fld(l, 252, 10)),
    cardNum: rtrim(fld(l, 262, 16)),
    origTs: fld(l, 278, 26),
    procTs: fld(l, 304, 26)
  });
}
output.feedJson = JSON.stringify(feed);
output.readCount = feed.length;
```

### Load Reference Data (SCRIPT, id=6ae1e1103695c563ea50aca1)

```javascript
// Load the stores the posting reads and updates:
//   acctdata (CVACT01Y, 300) -> Account, cardxref (CVACT03Y, 50) -> CardXref,
//   tcatbal (CVTRA01Y, 50) -> TransactionCategoryBalance.
function toLines(s) {
  if (s == null) return [];
  var all = String(s).split(/\r?\n/);
  var out = [];
  for (var i = 0; i < all.length; i++) {
    if (all[i].replace(/\s+$/, '').length > 0) out.push(all[i]);
  }
  return out;
}
function fld(line, start, len) {
  var s = line.substring(start, start + len);
  while (s.length < len) s += ' ';
  return s;
}
function rtrim(s) { return s.replace(/\s+$/, ''); }
function num(s) { var t = s.trim(); return /^[0-9]+$/.test(t) ? parseInt(t, 10) : null; }
function zonedCents(raw) {
  var s = String(raw).trim();
  if (s === '') return 0;
  if (/^[+-]?[0-9]*\.[0-9]+$/.test(s) || /^[+-][0-9]+$/.test(s)) return Math.round(parseFloat(s) * 100);
  var last = s.charAt(s.length - 1), body = s.substring(0, s.length - 1), d = '0', neg = false;
  if (last >= '0' && last <= '9') d = last;
  else if (last === '{') d = '0';
  else if (last === '}') { d = '0'; neg = true; }
  else if (last >= 'A' && last <= 'I') d = String(last.charCodeAt(0) - 64);
  else if (last >= 'J' && last <= 'R') { d = String(last.charCodeAt(0) - 73); neg = true; }
  else if (last >= 'p' && last <= 'y') { d = String(last.charCodeAt(0) - 112); neg = true; }
  var digits = (body + d).replace(/[^0-9]/g, '');
  var v = digits === '' ? 0 : parseInt(digits, 10);
  return neg ? -v : v;
}

var accounts = [];
var al = toLines(input.acctdata);
for (var i = 0; i < al.length; i++) {
  var a = al[i];
  accounts.push({
    acctId: num(fld(a, 0, 11)),
    activeStatus: rtrim(fld(a, 11, 1)),
    currBal: zonedCents(fld(a, 12, 12)),
    creditLimit: zonedCents(fld(a, 24, 12)),
    cashCreditLimit: zonedCents(fld(a, 36, 12)),
    openDate: fld(a, 48, 10),
    expirationDate: fld(a, 58, 10),
    reissueDate: fld(a, 68, 10),
    currCycCredit: zonedCents(fld(a, 78, 12)),
    currCycDebit: zonedCents(fld(a, 90, 12)),
    addrZip: rtrim(fld(a, 102, 10)),
    groupId: rtrim(fld(a, 112, 10))
  });
}

var xrefs = [];
var xl = toLines(input.cardxref);
for (var j = 0; j < xl.length; j++) {
  var x = xl[j];
  xrefs.push({
    cardNum: rtrim(fld(x, 0, 16)),
    custId: num(fld(x, 16, 9)),
    acctId: num(fld(x, 25, 11))
  });
}

var tcatbal = [];
var tl = toLines(input.tcatbal);
for (var k = 0; k < tl.length; k++) {
  var t = tl[k];
  tcatbal.push({
    acctId: num(fld(t, 0, 11)),
    typeCd: rtrim(fld(t, 11, 2)),
    catCd: num(fld(t, 13, 4)),
    bal: zonedCents(fld(t, 17, 11))
  });
}

output.refJson = JSON.stringify({ accounts: accounts, xrefs: xrefs, tcatbal: tcatbal });
```

### Order Feed for Posting (SCRIPT, id=6ae1e1133695c563ea50aca2)

```javascript
// BR-10 posting order: ascending amount, smallest first (credits, which are negative, come first);
// equal amounts keep their order in the daily feed (stable: tie broken by feed position).
var feed = JSON.parse(input.feedJson);
feed.sort(function (a, b) {
  if (a.amt !== b.amt) return a.amt < b.amt ? -1 : 1;
  return a.seq - b.seq;
});
output.orderedFeedJson = JSON.stringify(feed);
output.feedJson = null;
```

### Validate and Post Records (SCRIPT, id=6ae1e1153695c563ea50aca3)

```javascript
// Per record, in BR-10 order: 1500-VALIDATE-TRAN (BR-01..BR-04), then 2000-POST-TRANSACTION (BR-05)
// or 2500-WRITE-REJECT-REC (BR-06). Updates are applied immediately, so every check sees the
// cycle totals left by the transactions posted before it.
var feed = JSON.parse(input.orderedFeedJson);
var ref = JSON.parse(input.refJson);
var accounts = ref.accounts, tcatbal = ref.tcatbal;

var xrefByCard = {};
for (var i = 0; i < ref.xrefs.length; i++) {
  var x = ref.xrefs[i];
  if (!(x.cardNum in xrefByCard)) xrefByCard[x.cardNum] = x;
}
var acctIdx = {};
for (var j = 0; j < accounts.length; j++) {
  var id = accounts[j].acctId;
  if (id !== null && !(String(id) in acctIdx)) acctIdx[String(id)] = j;
}
var tcatIdx = {};
function tcatKey(acctId, typeCd, catCd) { return acctId + '|' + typeCd + '|' + catCd; }
for (var k = 0; k < tcatbal.length; k++) {
  var tk = tcatKey(tcatbal[k].acctId, tcatbal[k].typeCd, tcatbal[k].catCd);
  if (!(tk in tcatIdx)) tcatIdx[tk] = k;
}

// processedTimestamp = now, in the legacy DB2 layout YYYY-MM-DD-HH.MM.SS.hh0000 (26 chars).
function p(n, w) { var s = String(n); while (s.length < w) s = '0' + s; return s; }
var now = new Date();
var procTs = p(now.getFullYear(), 4) + '-' + p(now.getMonth() + 1, 2) + '-' + p(now.getDate(), 2) + '-' +
  p(now.getHours(), 2) + '.' + p(now.getMinutes(), 2) + '.' + p(now.getSeconds(), 2) + '.' +
  p(Math.floor(now.getMilliseconds() / 10), 2) + '0000';

var posted = [], rejected = [];
for (var r = 0; r < feed.length; r++) {
  var t = feed[r];
  var reason = 0, reasonDesc = '';
  var xref = xrefByCard[t.cardNum];
  var acct = null;
  if (xref === undefined) {
    reason = 100; reasonDesc = 'INVALID CARD NUMBER FOUND';                       // BR-01
  } else {
    var ai = xref.acctId === null ? undefined : acctIdx[String(xref.acctId)];
    if (ai === undefined) {
      reason = 101; reasonDesc = 'ACCOUNT RECORD NOT FOUND';                      // BR-02
    } else {
      acct = accounts[ai];
      var tempBal = acct.currCycCredit - acct.currCycDebit + t.amt;
      if (!(acct.creditLimit >= tempBal)) {
        reason = 102; reasonDesc = 'OVERLIMIT TRANSACTION';                        // BR-03
      }
      if (!(acct.expirationDate >= t.origTs.substring(0, 10))) {
        reason = 103; reasonDesc = 'TRANSACTION RECEIVED AFTER ACCT EXPIRATION';  // BR-04 (overwrites 102)
      }
    }
  }

  if (reason === 0) {
    // BR-05: TCATBAL upsert, then Account update, then Transaction write.
    var key = tcatKey(xref.acctId, t.typeCd, t.catCd);
    if (key in tcatIdx) {
      tcatbal[tcatIdx[key]].bal += t.amt;
    } else {
      tcatIdx[key] = tcatbal.length;
      tcatbal.push({ acctId: xref.acctId, typeCd: t.typeCd, catCd: t.catCd, bal: t.amt });
    }
    acct.currBal += t.amt;
    if (t.amt >= 0) acct.currCycCredit += t.amt; else acct.currCycDebit += t.amt;
    var tran = {};
    for (var f in t) tran[f] = t[f];
    tran.procTs = procTs;
    posted.push(tran);
  } else {
    // BR-06: original record + 4-digit reason + 76-character description.
    var rej = {};
    for (var g in t) rej[g] = t[g];
    rej.reason = reason;
    rej.reasonDesc = reasonDesc;
    rejected.push(rej);
  }
}

output.postingJson = JSON.stringify({ posted: posted, rejected: rejected, accounts: accounts, tcatbal: tcatbal });
output.orderedFeedJson = null;
output.refJson = null;
```

### Build Run Summary (SCRIPT, id=6ae1e1183695c563ea50aca4)

```javascript
// Build Run Summary (end-of-job DISPLAY) and render the four POSTTRAN outputs in the CONTRACT.md
// field layout. BR-07: state WARNING (legacy RETURN-CODE 4) when any reject exists.
var res = JSON.parse(input.postingJson);
function rtrim(s) { return s == null ? s : String(s).replace(/\s+$/, ''); }
function amt(c) {
  var neg = c < 0, a = Math.abs(c);
  var s = String(Math.floor(a / 100)) + '.' + ('0' + (a % 100)).slice(-2);
  return (neg ? '-' : '') + s;
}
function tranOut(t) {
  return {
    tran_id: t.tranId, type_cd: t.typeCd, cat_cd: t.catCd, source: t.source, desc: t.desc,
    amt: amt(t.amt), merchant_id: t.merchantId, merchant_name: t.merchantName,
    merchant_city: t.merchantCity, merchant_zip: t.merchantZip, card_num: t.cardNum,
    orig_ts: rtrim(t.origTs), proc_ts: rtrim(t.procTs)
  };
}
var transact = [], dalyrejs = [], acctdata = [], tcat = [];
for (var i = 0; i < res.posted.length; i++) transact.push(tranOut(res.posted[i]));
for (var j = 0; j < res.rejected.length; j++) {
  var r = tranOut(res.rejected[j]);
  r.reason = res.rejected[j].reason;
  r.reason_desc = res.rejected[j].reasonDesc;
  dalyrejs.push(r);
}
for (var k = 0; k < res.accounts.length; k++) {
  var a = res.accounts[k];
  acctdata.push({
    acct_id: a.acctId, active_status: a.activeStatus, curr_bal: amt(a.currBal),
    credit_limit: amt(a.creditLimit), cash_credit_limit: amt(a.cashCreditLimit),
    open_date: rtrim(a.openDate), expiration_date: rtrim(a.expirationDate), reissue_date: rtrim(a.reissueDate),
    curr_cyc_credit: amt(a.currCycCredit), curr_cyc_debit: amt(a.currCycDebit),
    addr_zip: a.addrZip, group_id: a.groupId
  });
}
for (var m = 0; m < res.tcatbal.length; m++) {
  var b = res.tcatbal[m];
  tcat.push({ acct_id: b.acctId, type_cd: b.typeCd, cat_cd: b.catCd, bal: amt(b.bal) });
}

var read = Number(input.readCount);
output.transactJson = JSON.stringify(transact);
output.dalyrejsJson = JSON.stringify(dalyrejs);
output.acctdataJson = JSON.stringify(acctdata);
output.tcatbalJson = JSON.stringify(tcat);
output.processedCount = transact.length;
output.rejectedCount = dalyrejs.length;
output.readCount = read;
output.countsBalanced = (read === transact.length + dalyrejs.length);
output.returnCode = dalyrejs.length > 0 ? 4 : 0;
output.status = dalyrejs.length > 0 ? 'WARNING' : 'COMPLETED';
output.postingJson = null;
```

_(server: 159 ms, 1 API call, 156 ms in API)_
