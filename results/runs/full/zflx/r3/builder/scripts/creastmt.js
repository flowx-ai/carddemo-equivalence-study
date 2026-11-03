// CREASTMT (CBSTM03A/B) - account statements, text (80) and HTML (100)
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
  var acctId = pad(lpad(x.acct_id, 11), 20), fico = pad(cu.fico_credit_score === undefined ? "" : lpad(cu.fico_credit_score, 3), 20), bal = f9(ac.bal);
  var trs = byCard[x.card_num] || [], total = 0;
  // text
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
  // html
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
output.creastmt_statements = txt;
output.creastmt_statements_html = html;
