# Workflow: batch_intcalc

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** INTCALC (CBACT04C) interest calculation. Inputs: tcatbal, acctdata, cardxref, discgrp (fixed-width text), optional parm. Outputs intcalc_systran, intcalc_acctdata, intcalc_sysout.

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae9026f3695c563ea51c06a | <uuid> | (0, 0) | → Calculate interest (seq:<uuid>) |
| Calculate interest | SCRIPT | 6ae9027d3695c563ea51c07f | <uuid> | (500, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae9028b3695c563ea51c08a | <uuid> | (1000, 0) | — |

## Systems
_(none)_

## Scripts

### Calculate interest (SCRIPT, id=6ae9027d3695c563ea51c07f)

```javascript
// ---- common helpers ----
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
function parseXref(l) { l = pad(l, 50); return { card_num: rs(l.substr(0, 16)), cust_id: num(l.substr(16, 9)), acct_id: num(l.substr(25, 11)), raw: l }; }
// ---- end common ----

// INTCALC (CBACT04C) - interest calculation
var R = {};
var parm = input.parm ? String(input.parm) : (RT.substring(0, 4) + RT.substring(5, 7) + RT.substring(8, 10) + "00");
var ts = db2ts(RT);
var accts = lines(getIn("acctdata")).map(parseAcct), acctMap = {};
for (var i = 0; i < accts.length; i++) acctMap[accts[i].acct_id] = accts[i];
var xrefByAcct = {}, xl = lines(getIn("cardxref"));
for (var i = 0; i < xl.length; i++) { var x = parseXref(xl[i]); if (!(x.acct_id in xrefByAcct)) xrefByAcct[x.acct_id] = x; }
var disc = {}, dl = lines(getIn("discgrp"));
for (var i = 0; i < dl.length; i++) { var l = pad(dl[i], 50); var k = rs(l.substr(0, 10)) + "|" + rs(l.substr(10, 2)) + "|" + num(l.substr(12, 4)); if (!(k in disc)) disc[k] = zoned(l.substr(16, 6)); }
var tl = lines(getIn("tcatbal"));
var systran = [], suffix = 0, lastAcct = null, total = 0, sysout = ["START OF EXECUTION OF PROGRAM CBACT04C"];
function updateAccount(id, tot) { var a = acctMap[id]; if (!a) return; a.bal += tot; a.cred = 0; a.deb = 0; }
for (var i = 0; i < tl.length; i++) {
  var l = pad(tl[i], 50);
  var acctId = num(l.substr(0, 11)), type = rs(l.substr(11, 2)), cat = num(l.substr(13, 4)), bal = zoned(l.substr(17, 11));
  sysout.push(rs(l));
  if (acctId !== lastAcct) {
    if (lastAcct !== null) updateAccount(lastAcct, total);
    total = 0; lastAcct = acctId;
    if (!acctMap[acctId]) sysout.push("ACCOUNT NOT FOUND: " + lpad(acctId, 11));
  }
  var a = acctMap[acctId]; if (!a) continue;
  var grp = a.group_id, rate = disc[grp + "|" + type + "|" + cat];
  if (rate === undefined) rate = disc["DEFAULT|" + type + "|" + cat];
  if (rate === undefined) rate = 0;
  if (rate !== 0) {
    var prod = bal * rate, mag = Math.floor(Math.abs(prod) / 120000), interest = prod < 0 ? -mag : mag;
    total += interest; suffix++;
    var xr = xrefByAcct[acctId];
    systran.push({ tran_id: parm + lpad(suffix, 6), type_cd: "01", cat_cd: 5, source: "System", desc: "Int. for a/c " + lpad(acctId, 11),
      amt: amt(interest), merchant_id: 0, merchant_name: "", merchant_city: "", merchant_zip: "", card_num: xr ? xr.card_num : "", orig_ts: ts, proc_ts: ts });
  }
}
if (lastAcct !== null) updateAccount(lastAcct, total);
sysout.push("END OF EXECUTION OF PROGRAM CBACT04C");
R.intcalc_systran = systran;
R.intcalc_acctdata = accts.map(acctOut);
R.intcalc_sysout = sysout;
output.result = R;
```

_(server: 140 ms, 1 API call, 137 ms in API)_
