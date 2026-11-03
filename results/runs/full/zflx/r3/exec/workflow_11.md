# Workflow: batch_posttran

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** POSTTRAN (CBTRN02C) daily transaction posting. Inputs: dailytran, acctdata, cardxref, tcatbal (fixed-width text). Outputs posttran_* lists.

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae9020a3695c563ea51c05e | <uuid> | (0, 0) | → Post transactions (seq:<uuid>) |
| Post transactions | SCRIPT | 6ae9020c3695c563ea51c05f | <uuid> | (500, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae9020f3695c563ea51c064 | <uuid> | (1000, 0) | — |

## Systems
_(none)_

## Scripts

### Post transactions (SCRIPT, id=6ae9020c3695c563ea51c05f)

```javascript
// ---- common helpers (copied into each batch SCRIPT node) ----
var RT = String(additionalData.applicationConfiguration.RUN_TIMESTAMP || "2022-07-18 10:00:00");
function db2ts(rt) { return rt.substring(0, 10) + "-" + rt.substring(11, 19).replace(/:/g, ".") + ".000000"; }
function getIn(base) {
  var names = [base, base + "_dat", base + ".dat", base + "_txt", base + ".txt", base + "_json", base + ".json"];
  for (var i = 0; i < names.length; i++) { var v = input[names[i]]; if (v !== undefined && v !== null) return v; }
  var f = input.files; if (f) { for (var j = 0; j < names.length; j++) { var w = f[names[j]]; if (w !== undefined && w !== null) return w; } }
  return null;
}
function lines(v) {
  if (v === null || v === undefined) return [];
  var out = [];
  if (typeof v === "string" || v instanceof String) { var p = String(v).split(/\r?\n/); for (var i = 0; i < p.length; i++) if (p[i].replace(/\s+$/, "") !== "") out.push(p[i]); return out; }
  for (var k = 0; k < v.length; k++) { var s = String(v[k]); if (s.replace(/\s+$/, "") !== "") out.push(s); }
  return out;
}
function pad(s, n) { s = (s === null || s === undefined) ? "" : String(s); if (s.length >= n) return s.substring(0, n); return s + new Array(n - s.length + 1).join(" "); }
function lpad(s, n, c) { s = String(s); c = c || "0"; while (s.length < n) s = c + s; return s; }
function rs(s) { return String(s).replace(/\s+$/, ""); }
function num(s) { var d = String(s).replace(/[^0-9]/g, ""); return d === "" ? 0 : parseInt(d, 10); }
function zoned(s) {
  s = String(s); var t = s.replace(/\s+$/, ""); if (t === "") return 0;
  var last = t.charAt(t.length - 1), body = t.substring(0, t.length - 1), neg = false, d = 0;
  var P = "{ABCDEFGHI", N = "}JKLMNOPQR", NL = "pqrstuvwxy";
  if (P.indexOf(last) >= 0) d = P.indexOf(last);
  else if (N.indexOf(last) >= 0) { d = N.indexOf(last); neg = true; }
  else if (NL.indexOf(last) >= 0) { d = NL.indexOf(last); neg = true; }
  else if (last === "-") { neg = true; d = -1; }
  else if (last === "+") { d = -1; }
  else d = parseInt(last, 10) || 0;
  if (body.indexOf("-") >= 0) neg = true;
  var digits = body.replace(/[^0-9]/g, "") + (d >= 0 ? String(d) : "");
  var v = digits === "" ? 0 : parseInt(digits, 10);
  return neg ? -v : v;
}
function amt(c) { return Math.round(c) / 100; }
function parseAcct(l) {
  l = pad(l, 300);
  return { acct_id: num(l.substr(0, 11)), active_status: rs(l.substr(11, 1)), bal: zoned(l.substr(12, 12)), lim: zoned(l.substr(24, 12)),
    cash: zoned(l.substr(36, 12)), open_date: rs(l.substr(48, 10)), expiration_date: rs(l.substr(58, 10)), reissue_date: rs(l.substr(68, 10)),
    cred: zoned(l.substr(78, 12)), deb: zoned(l.substr(90, 12)), addr_zip: rs(l.substr(102, 10)), group_id: rs(l.substr(112, 10)), raw: l };
}
function acctOut(a) {
  return { acct_id: a.acct_id, active_status: a.active_status, curr_bal: amt(a.bal), credit_limit: amt(a.lim), cash_credit_limit: amt(a.cash),
    open_date: a.open_date, expiration_date: a.expiration_date, reissue_date: a.reissue_date, curr_cyc_credit: amt(a.cred), curr_cyc_debit: amt(a.deb),
    addr_zip: a.addr_zip, group_id: a.group_id };
}
function parseTran(l) {
  l = pad(l, 350);
  return { tran_id: rs(l.substr(0, 16)), type_cd: rs(l.substr(16, 2)), cat_cd: num(l.substr(18, 4)), source: rs(l.substr(22, 10)), desc: rs(l.substr(32, 100)),
    amtc: zoned(l.substr(132, 11)), merchant_id: num(l.substr(143, 9)), merchant_name: rs(l.substr(152, 50)), merchant_city: rs(l.substr(202, 50)),
    merchant_zip: rs(l.substr(252, 10)), card_num: rs(l.substr(262, 16)), orig_ts: rs(l.substr(278, 26)), proc_ts: rs(l.substr(304, 26)), raw: l };
}
function tranOut(t) {
  return { tran_id: t.tran_id, type_cd: t.type_cd, cat_cd: t.cat_cd, source: t.source, desc: t.desc, amt: amt(t.amtc), merchant_id: t.merchant_id,
    merchant_name: t.merchant_name, merchant_city: t.merchant_city, merchant_zip: t.merchant_zip, card_num: t.card_num, orig_ts: t.orig_ts, proc_ts: t.proc_ts };
}
function parseXref(l) { l = pad(l, 50); return { card_num: rs(l.substr(0, 16)), cust_id: num(l.substr(16, 9)), acct_id: num(l.substr(25, 11)), raw: l }; }
// ---- end common ----

// POSTTRAN (CBTRN02C) - daily transaction posting
var procTs = db2ts(RT);
var accts = lines(getIn("acctdata")).map(parseAcct), acctMap = {};
for (var i = 0; i < accts.length; i++) acctMap[accts[i].acct_id] = accts[i];
var xrefMap = {}, xl = lines(getIn("cardxref"));
for (var i = 0; i < xl.length; i++) { var x = parseXref(xl[i]); if (!(x.card_num in xrefMap)) xrefMap[x.card_num] = x; }
var tcat = [], tcatMap = {}, tl = lines(getIn("tcatbal"));
for (var i = 0; i < tl.length; i++) {
  var l = pad(tl[i], 50); var r = { acct_id: num(l.substr(0, 11)), type_cd: rs(l.substr(11, 2)), cat_cd: num(l.substr(13, 4)), bal: zoned(l.substr(17, 11)) };
  var k = r.acct_id + "|" + r.type_cd + "|" + r.cat_cd; if (!(k in tcatMap)) { tcatMap[k] = r; tcat.push(r); }
}
var daily = lines(getIn("dailytran")).map(parseTran);
var posted = [], rejects = [], sysout = ["START OF EXECUTION OF PROGRAM CBTRN02C"];
for (var i = 0; i < daily.length; i++) {
  var t = daily[i], reason = 0, rdesc = "", x = xrefMap[t.card_num], a = null;
  if (!x) { reason = 100; rdesc = "INVALID CARD NUMBER FOUND"; }
  else {
    a = acctMap[x.acct_id];
    if (!a) { reason = 101; rdesc = "ACCOUNT RECORD NOT FOUND"; }
    else {
      var temp = a.cred - a.deb + t.amtc;
      if (!(a.lim >= temp)) { reason = 102; rdesc = "OVERLIMIT TRANSACTION"; }
      if (!(a.expiration_date >= t.orig_ts.substring(0, 10))) { reason = 103; rdesc = "TRANSACTION RECEIVED AFTER ACCT EXPIRATION"; }
    }
  }
  if (reason === 0) {
    var p = tranOut(t); p.proc_ts = procTs; posted.push(p);
    var k = x.acct_id + "|" + t.type_cd + "|" + t.cat_cd;
    if (k in tcatMap) tcatMap[k].bal += t.amtc;
    else { var nr = { acct_id: x.acct_id, type_cd: t.type_cd, cat_cd: t.cat_cd, bal: t.amtc }; tcatMap[k] = nr; tcat.push(nr); }
    a.bal += t.amtc;
    if (t.amtc >= 0) a.cred += t.amtc; else a.deb += t.amtc;
  } else {
    var rj = tranOut(t); rj.reason = reason; rj.reason_desc = rdesc; rejects.push(rj);
  }
}
sysout.push("TRANSACTIONS PROCESSED :" + lpad(daily.length, 9));
sysout.push("TRANSACTIONS REJECTED  :" + lpad(rejects.length, 9));
sysout.push("END OF EXECUTION OF PROGRAM CBTRN02C");
output.posttran_transact = posted;
output.posttran_dalyrejs = rejects;
output.posttran_acctdata = accts.map(acctOut);
output.posttran_tcatbal = tcat.map(function (r) { return { acct_id: r.acct_id, type_cd: r.type_cd, cat_cd: r.cat_cd, bal: amt(r.bal) }; });
output.posttran_sysout = sysout;
output.posttran_rc = rejects.length > 0 ? 4 : 0;
```

_(server: 119 ms, 1 API call, 116 ms in API)_
