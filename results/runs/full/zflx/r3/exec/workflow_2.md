# Workflow: batch_tranrept

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** TRANREPT (CBTRN03C) daily transaction report. Inputs: transact, cardxref, trantype, trancatg, start_date/end_date (default 2022-07-01..2022-07-31). Output tranrept_report (133-col lines).

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae902723695c563ea51c070 | <uuid> | (0, 0) | → Transaction report (seq:<uuid>) |
| Transaction report | SCRIPT | 6ae902803695c563ea51c082 | <uuid> | (500, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae9028e3695c563ea51c08d | <uuid> | (1000, 0) | — |

## Systems
_(none)_

## Scripts

### Transaction report (SCRIPT, id=6ae902803695c563ea51c082)

```javascript
// ---- common helpers ----
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
function parseTran(l) {
  l = pad(l, 350);
  return { tran_id: rs(l.substr(0, 16)), type_cd: rs(l.substr(16, 2)), cat_cd: num(l.substr(18, 4)), source: rs(l.substr(22, 10)), desc: rs(l.substr(32, 100)),
    amtc: zoned(l.substr(132, 11)), merchant_id: num(l.substr(143, 9)), merchant_name: rs(l.substr(152, 50)), merchant_city: rs(l.substr(202, 50)),
    merchant_zip: rs(l.substr(252, 10)), card_num: rs(l.substr(262, 16)), orig_ts: rs(l.substr(278, 26)), proc_ts: rs(l.substr(304, 26)), raw: l };
}
function parseXref(l) { l = pad(l, 50); return { card_num: rs(l.substr(0, 16)), cust_id: num(l.substr(16, 9)), acct_id: num(l.substr(25, 11)), raw: l }; }
// ---- end common ----

// TRANREPT (CBTRN03C) - daily transaction report, 133 columns
var R = {};
function rep(c, n) { return new Array(n + 1).join(c); }
function zfmt(c, signPos) { // sign position + ZZZ,ZZZ,ZZZ.ZZ (15 chars). signPos "+" -> +/-, "-" -> space/-
  var a = Math.abs(Math.round(c));
  if (a === 0) return rep(" ", 15);
  var sign = c < 0 ? "-" : (signPos === "+" ? "+" : " ");
  var ip = Math.floor(a / 100), dp = lpad(a % 100, 2), s = "";
  if (ip > 0) s = String(ip).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return sign + lpad(s, 11, " ") + "." + dp;
}
var start = String(input.start_date || input.startDate || "2022-07-01"), end = String(input.end_date || input.endDate || "2022-07-31");
var xrefMap = {}, xl = lines(getIn("cardxref"));
for (var i = 0; i < xl.length; i++) { var x = parseXref(xl[i]); if (!(x.card_num in xrefMap)) xrefMap[x.card_num] = x; }
var types = {}, tyl = lines(getIn("trantype"));
for (var i = 0; i < tyl.length; i++) { var l = pad(tyl[i], 60); types[rs(l.substr(0, 2))] = rs(l.substr(2, 50)); }
var cats = {}, cal = lines(getIn("trancatg"));
for (var i = 0; i < cal.length; i++) { var l = pad(cal[i], 60); cats[rs(l.substr(0, 2)) + "|" + num(l.substr(2, 4))] = rs(l.substr(6, 50)); }
var trs = lines(getIn("transact")).map(function (l, i) { var t = parseTran(l); t.i = i; return t; })
  .filter(function (t) { var d = t.proc_ts.substring(0, 10); return d >= start && d <= end; });
trs.sort(function (p, q) { return p.card_num < q.card_num ? -1 : p.card_num > q.card_num ? 1 : p.i - q.i; });
var out = [], lineCounter = 0, PAGE = 20, pageTotal = 0, acctTotal = 0, grandTotal = 0, first = true, curCard = null, sysout = [];
function W(s) { out.push(pad(s, 133)); }
function headers() {
  W(pad("DALYREPT", 38) + pad("Daily Transaction Report", 41) + "Date Range: " + pad(start, 10) + " to " + pad(end, 10)); lineCounter++;
  W(""); lineCounter++;
  W(pad("Transaction ID", 17) + pad("Account ID", 12) + pad("Transaction Type", 19) + pad("Tran Category", 35) + pad("Tran Source", 14) + " " + pad("        Amount", 16)); lineCounter++;
  W(rep("-", 133)); lineCounter++;
}
function pageTotals() { W(pad("Page Total", 11) + rep(".", 86) + zfmt(pageTotal, "+")); grandTotal += pageTotal; pageTotal = 0; lineCounter++; W(rep("-", 133)); lineCounter++; }
function acctTotals() { W(pad("Account Total", 13) + rep(".", 84) + zfmt(acctTotal, "+")); acctTotal = 0; lineCounter++; W(rep("-", 133)); lineCounter++; }
function grandTotals() { W(pad("Grand Total", 11) + rep(".", 86) + zfmt(grandTotal, "+")); }
for (var i = 0; i < trs.length; i++) {
  var t = trs[i];
  if (curCard !== t.card_num) { if (!first) acctTotals(); curCard = t.card_num; }
  var x = xrefMap[t.card_num], tdesc = types[t.type_cd], cdesc = cats[t.type_cd + "|" + t.cat_cd];
  if (!x) sysout.push("INVALID CARD NUMBER : " + t.card_num);
  if (tdesc === undefined) { sysout.push("INVALID TRANSACTION TYPE : " + t.type_cd); tdesc = ""; }
  if (cdesc === undefined) { sysout.push("INVALID TRAN CATG KEY : " + t.type_cd + lpad(t.cat_cd, 4)); cdesc = ""; }
  if (first) { first = false; headers(); }
  else if (lineCounter % PAGE === 0) { pageTotals(); headers(); }
  pageTotal += t.amtc; acctTotal += t.amtc;
  W(pad(t.tran_id, 16) + " " + (x ? lpad(x.acct_id, 11) : rep(" ", 11)) + " " + pad(t.type_cd, 2) + "-" + pad(tdesc, 15) + " " + lpad(t.cat_cd, 4) + "-" +
    pad(cdesc, 29) + " " + pad(t.source, 10) + rep(" ", 4) + zfmt(t.amtc, "-") + "  ");
  lineCounter++;
}
if (first) headers(); else acctTotals();
pageTotals();
grandTotals();
R.tranrept_report = out;
if (sysout.length) R.tranrept_sysout = sysout;
output.result = R;
```

_(server: 98 ms, 1 API call, 96 ms in API)_
