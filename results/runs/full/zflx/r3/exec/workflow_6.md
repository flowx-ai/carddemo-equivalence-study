# Workflow: batch_creastmt

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** CREASTMT (CBSTM03A/B) account statements. Inputs: transact, acctdata, cardxref, custdata. Outputs creastmt_statements (80) and creastmt_statements_html (100) as line lists.

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae902713695c563ea51c06e | <uuid> | (0, 0) | → Create statements (seq:<uuid>) |
| Create statements | SCRIPT | 6ae9027f3695c563ea51c081 | <uuid> | (500, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae9028d3695c563ea51c08c | <uuid> | (1000, 0) | — |

## Systems
_(none)_

## Scripts

### Create statements (SCRIPT, id=6ae9027f3695c563ea51c081)

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
function parseAcct(l) {
  l = pad(l, 300);
  return { acct_id: num(l.substr(0, 11)), active_status: rs(l.substr(11, 1)), bal: zoned(l.substr(12, 12)), lim: zoned(l.substr(24, 12)),
    cash: zoned(l.substr(36, 12)), open_date: rs(l.substr(48, 10)), expiration_date: rs(l.substr(58, 10)), reissue_date: rs(l.substr(68, 10)),
    cred: zoned(l.substr(78, 12)), deb: zoned(l.substr(90, 12)), addr_zip: rs(l.substr(102, 10)), group_id: rs(l.substr(112, 10)), raw: l };
}
function parseTran(l) {
  l = pad(l, 350);
  return { tran_id: rs(l.substr(0, 16)), type_cd: rs(l.substr(16, 2)), cat_cd: num(l.substr(18, 4)), source: rs(l.substr(22, 10)), desc: rs(l.substr(32, 100)),
    amtc: zoned(l.substr(132, 11)), merchant_id: num(l.substr(143, 9)), merchant_name: rs(l.substr(152, 50)), merchant_city: rs(l.substr(202, 50)),
    merchant_zip: rs(l.substr(252, 10)), card_num: rs(l.substr(262, 16)), orig_ts: rs(l.substr(278, 26)), proc_ts: rs(l.substr(304, 26)), raw: l };
}
function parseXref(l) { l = pad(l, 50); return { card_num: rs(l.substr(0, 16)), cust_id: num(l.substr(16, 9)), acct_id: num(l.substr(25, 11)), raw: l }; }
function parseCust(l) {
  l = pad(l, 500);
  return { cust_id: num(l.substr(0, 9)), first_name: rs(l.substr(9, 25)), middle_name: rs(l.substr(34, 25)), last_name: rs(l.substr(59, 25)),
    addr_line_1: rs(l.substr(84, 50)), addr_line_2: rs(l.substr(134, 50)), addr_line_3: rs(l.substr(184, 50)), addr_state_cd: rs(l.substr(234, 2)),
    addr_country_cd: rs(l.substr(236, 3)), addr_zip: rs(l.substr(239, 10)), phone_num_1: rs(l.substr(249, 15)), phone_num_2: rs(l.substr(264, 15)),
    ssn: num(l.substr(279, 9)), govt_issued_id: rs(l.substr(288, 20)), dob: rs(l.substr(308, 10)), eft_account_id: rs(l.substr(318, 10)),
    pri_card_holder_ind: rs(l.substr(328, 1)), fico_credit_score: num(l.substr(329, 3)), fico_raw: l.substr(329, 3), raw: l };
}
// ---- end common ----

// CREASTMT (CBSTM03A/B) - account statements, text (80) and HTML (100)
var R = {};
function rep(c, n) { return new Array(n + 1).join(c); }
function f9(c) { var a = Math.abs(Math.round(c)); return lpad(Math.floor(a / 100), 9) + "." + lpad(a % 100, 2) + (c < 0 ? "-" : " "); }
function fz9(c) { var a = Math.abs(Math.round(c)), ip = Math.floor(a / 100); return (ip === 0 ? rep(" ", 9) : lpad(ip, 9, " ")) + "." + lpad(a % 100, 2) + (c < 0 ? "-" : " "); }
function firstWord(s) { s = String(s || ""); var i = s.indexOf(" "); return i < 0 ? s : s.substring(0, i); }
var accts = {}, al = lines(getIn("acctdata"));
for (var i = 0; i < al.length; i++) { var a = parseAcct(al[i]); if (!(a.acct_id in accts)) accts[a.acct_id] = a; }
var custs = {}, cl = lines(getIn("custdata"));
for (var i = 0; i < cl.length; i++) { var c = parseCust(cl[i]); if (!(c.cust_id in custs)) custs[c.cust_id] = c; }
var xrefs = lines(getIn("cardxref")).map(parseXref).map(function (x, i) { x.i = i; return x; });
xrefs.sort(function (p, q) { return p.card_num < q.card_num ? -1 : p.card_num > q.card_num ? 1 : p.i - q.i; });
var byCard = {}, tl = lines(getIn("transact"));
for (var i = 0; i < tl.length; i++) { var t = parseTran(tl[i]); t.i = i; (byCard[t.card_num] = byCard[t.card_num] || []).push(t); }
for (var k in byCard) byCard[k].sort(function (p, q) { var a1 = pad(p.tran_id, 16), b1 = pad(q.tran_id, 16); return a1 < b1 ? -1 : a1 > b1 ? 1 : p.i - q.i; });
var txt = [], html = [];
function H(s) { html.push(pad(s, 100)); }
function T(s) { txt.push(pad(s, 80)); }
for (var n = 0; n < xrefs.length; n++) {
  var x = xrefs[n], cu = custs[x.cust_id] || {}, ac = accts[x.acct_id] || { bal: 0 };
  var name = firstWord(cu.first_name) + " " + firstWord(cu.middle_name) + " " + firstWord(cu.last_name) + " ";
  var add1 = cu.addr_line_1 || "", add2 = cu.addr_line_2 || "";
  var add3 = firstWord(cu.addr_line_3) + " " + firstWord(cu.addr_state_cd) + " " + firstWord(cu.addr_country_cd) + " " + firstWord(cu.addr_zip) + " ";
  var acctId = pad(lpad(x.acct_id, 11), 20), fico = pad(cu.fico_raw === undefined ? "" : cu.fico_raw, 20), bal = f9(ac.bal);
  var trs = byCard[x.card_num] || [], total = 0;
  T(rep("*", 31) + "START OF STATEMENT" + rep("*", 31));
  T(pad(name, 75)); T(pad(add1, 50)); T(pad(add2, 50)); T(pad(add3, 80));
  T(rep("-", 80)); T(rep(" ", 33) + "Basic Details"); T(rep("-", 80));
  T("Account ID         :" + acctId); T("Current Balance    :" + bal); T("FICO Score         :" + fico);
  T(rep("-", 80)); T(rep(" ", 30) + "TRANSACTION SUMMARY"); T(rep("-", 80));
  T(pad("Tran ID", 16) + pad("Tran Details", 51) + "  Tran Amount"); T(rep("-", 80));
  for (var j = 0; j < trs.length; j++) { total += trs[j].amtc; T(pad(trs[j].tran_id, 16) + " " + pad(trs[j].desc, 49) + "$" + fz9(trs[j].amtc)); }
  T(rep("-", 80));
  T("Total EXP:" + rep(" ", 56) + "$" + fz9(total));
  T(rep("*", 32) + "END OF STATEMENT" + rep("*", 32));
  H("<!DOCTYPE html>"); H('<html lang="en">'); H("<head>"); H('<meta charset="utf-8">'); H("<title>HTML Table Layout</title>"); H("</head>");
  H('<body style="margin:0px;">');
  H('<table  align="center" frame="box" style="width:70%; font:12px Segoe UI,sans-serif;">');
  H("<tr>"); H('<td colspan="3" style="padding:0px 5px;background-color:#1d1d96b3;">');
  H("<h3>Statement for Account Number: " + acctId + "</h3>"); H("</td>"); H("</tr>");
  H("<tr>"); H('<td colspan="3" style="padding:0px 5px;background-color:#FFAF33;">');
  H('<p style="font-size:16px">Bank of XYZ</p>'); H("<p>410 Terry Ave N</p>"); H("<p>Seattle WA 99999</p>"); H("</td>"); H("</tr>");
  H("<tr>"); H('<td colspan="3" style="padding:0px 5px;background-color:#f2f2f2;">');
  H('<p style="font-size:16px">' + rs(name) + "  </p>"); H("<p>" + rs(add1) + "  </p>"); H("<p>" + rs(add2) + "  </p>"); H("<p>" + rs(add3) + "  </p>");
  H("</td>"); H("</tr>");
  H("<tr>"); H('<td colspan="3" style="padding:0px 5px;background-color:#33FFD1; text-align:center;">');
  H('<p style="font-size:16px">Basic Details</p>'); H("</td>"); H("</tr>");
  H("<tr>"); H('<td colspan="3" style="padding:0px 5px;background-color:#f2f2f2;">');
  H("<p>Account ID         : " + acctId + "</p>"); H("<p>Current Balance    : " + bal + "</p>"); H("<p>FICO Score         : " + fico + "</p>");
  H("</td>"); H("</tr>");
  H("<tr>"); H('<td colspan="3" style="padding:0px 5px;background-color:#33FFD1; text-align:center;">');
  H('<p style="font-size:16px">Transaction Summary</p>'); H("</td>"); H("</tr>");
  H("<tr>");
  H('<td style="width:25%; padding:0px 5px; background-color:#33FF5E; text-align:left;">'); H('<p style="font-size:16px">Tran ID</p>'); H("</td>");
  H('<td style="width:55%; padding:0px 5px; background-color:#33FF5E; text-align:left;">'); H('<p style="font-size:16px">Tran Details</p>'); H("</td>");
  H('<td style="width:20%; padding:0px 5px; background-color:#33FF5E; text-align:right;">'); H('<p style="font-size:16px">Amount</p>'); H("</td>");
  H("</tr>");
  for (var j = 0; j < trs.length; j++) {
    H("<tr>");
    H('<td style="width:25%; padding:0px 5px; background-color:#f2f2f2; text-align:left;">'); H("<p>" + pad(trs[j].tran_id, 16) + "</p>"); H("</td>");
    H('<td style="width:55%; padding:0px 5px; background-color:#f2f2f2; text-align:left;">'); H("<p>" + pad(trs[j].desc, 49) + "</p>"); H("</td>");
    H('<td style="width:20%; padding:0px 5px; background-color:#f2f2f2; text-align:right;">'); H("<p>" + fz9(trs[j].amtc) + "</p>"); H("</td>");
    H("</tr>");
  }
  H("<tr>"); H('<td colspan="3" style="padding:0px 5px;background-color:#1d1d96b3;">'); H("<h3>End of Statement</h3>"); H("</td>"); H("</tr>");
  H("</table>"); H("</body>"); H("</html>");
}
R.creastmt_statements = txt;
R.creastmt_statements_html = html;
output.result = R;
```

_(server: 100 ms, 1 API call, 97 ms in API)_
