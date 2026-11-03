// TRANREPT (CBTRN03C) - daily transaction report, 133 columns
function rep(c, n) { return new Array(n + 1).join(c); }
function zfmt(c, signPos) { // sign + ZZZ,ZZZ,ZZZ.ZZ  (15 chars); signPos '+' for +ZZZ.. totals, '-' for -ZZZ.. detail
  var a = Math.abs(Math.round(c)), sign = c < 0 ? "-" : (signPos === "+" ? "+" : " ");
  if (a === 0) return signPos === "+" ? rep(" ", 15) : rep(" ", 15);
  var ip = Math.floor(a / 100), dp = lpad(a % 100, 2), s = "";
  if (ip > 0) { s = String(ip).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  var body = lpad(s, 11, " ") + "." + dp;
  return sign + body;
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
  sysout.push(t.raw);
  if (curCard !== t.card_num) { if (!first) acctTotals(); curCard = t.card_num; }
  var x = xrefMap[t.card_num], tdesc = types[t.type_cd], cdesc = cats[t.type_cd + "|" + t.cat_cd];
  if (!x) sysout.push("INVALID CARD NUMBER : " + t.card_num);
  if (tdesc === undefined) { sysout.push("INVALID TRANSACTION TYPE : " + t.type_cd); tdesc = ""; }
  if (cdesc === undefined) { sysout.push("INVALID TRAN CATG KEY : " + t.type_cd + lpad(t.cat_cd, 4)); cdesc = ""; }
  if (first) { first = false; headers(); }
  if (lineCounter % PAGE === 0) { pageTotals(); headers(); }
  pageTotal += t.amtc; acctTotal += t.amtc;
  W(pad(t.tran_id, 16) + " " + (x ? lpad(x.acct_id, 11) : rep(" ", 11)) + " " + pad(t.type_cd, 2) + "-" + pad(tdesc, 15) + " " + lpad(t.cat_cd, 4) + "-" +
    pad(cdesc, 29) + " " + pad(t.source, 10) + rep(" ", 4) + zfmt(t.amtc, "-") + "  ");
  lineCounter++;
}
if (first) { headers(); }
if (!first) acctTotals();
pageTotals();
grandTotals();
output.tranrept_report = out;
output.tranrept_sysout = sysout;
