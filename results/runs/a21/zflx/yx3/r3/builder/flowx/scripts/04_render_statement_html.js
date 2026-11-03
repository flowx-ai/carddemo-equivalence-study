// Node "Render Statement HTML" — template statement-html: one HTML document per statement,
// every line padded to 100 columns (BR-04, layout of creastmt_statements_html.txt in
// CONTRACT.md layer 1).

var statements = JSON.parse(String(input.statementDataJson));
var W = 100;

function padR(s, n) {
  s = (s === null || s === undefined) ? '' : String(s);
  if (s.length > n) return s.substring(0, n);
  while (s.length < n) s += ' ';
  return s;
}
function rtrim(s) { return String(s === null || s === undefined ? '' : s).replace(/\s+$/, ''); }
function twoDec(c) { return (c < 10 ? '0' : '') + c; }
// 9(9).99-
function fmtNum(cents) {
  var a = Math.abs(cents);
  var s = String(Math.floor(a / 100) % 1000000000);
  while (s.length < 9) s = '0' + s;
  return s + '.' + twoDec(a % 100) + (cents < 0 ? '-' : ' ');
}
// Z(9).99-
function fmtZ(cents) {
  var a = Math.abs(cents);
  var ip = Math.floor(a / 100) % 1000000000;
  var s = ip === 0 ? '' : String(ip);
  while (s.length < 9) s = ' ' + s;
  return s + '.' + twoDec(a % 100) + (cents < 0 ? '-' : ' ');
}

var TD_BANNER = '<td colspan="3" style="padding:0px 5px;background-color:#1d1d96b3;">';
var TD_GREY = '<td colspan="3" style="padding:0px 5px;background-color:#f2f2f2;">';
var TD_SECTION = '<td colspan="3" style="padding:0px 5px;background-color:#33FFD1; text-align:center;">';

var out = [];
function add(s) { out.push(padR(s, W)); }

for (var i = 0; i < statements.length; i++) {
  var st = statements[i];
  add('<!DOCTYPE html>');
  add('<html lang="en">');
  add('<head>');
  add('<meta charset="utf-8">');
  add('<title>HTML Table Layout</title>');
  add('</head>');
  add('<body style="margin:0px;">');
  add('<table  align="center" frame="box" style="width:70%; font:12px Segoe UI,sans-serif;">');
  add('<tr>');
  add(TD_BANNER);
  add('<h3>Statement for Account Number: ' + padR(st.accountId, 20) + '</h3>');
  add('</td>');
  add('</tr>');
  add('<tr>');
  add('<td colspan="3" style="padding:0px 5px;background-color:#FFAF33;">');
  add('<p style="font-size:16px">Bank of XYZ</p>');
  add('<p>410 Terry Ave N</p>');
  add('<p>Seattle WA 99999</p>');
  add('</td>');
  add('</tr>');
  add('<tr>');
  add(TD_GREY);
  add('<p style="font-size:16px">' + rtrim(st.customerName) + '  </p>');
  add('<p>' + rtrim(st.addressLine1) + '  </p>');
  add('<p>' + rtrim(st.addressLine2) + '  </p>');
  add('<p>' + rtrim(st.addressLine3) + '  </p>');
  add('</td>');
  add('</tr>');
  add('<tr>');
  add(TD_SECTION);
  add('<p style="font-size:16px">Basic Details</p>');
  add('</td>');
  add('</tr>');
  add('<tr>');
  add(TD_GREY);
  add('<p>Account ID         : ' + padR(st.accountId, 20) + '</p>');
  add('<p>Current Balance    : ' + fmtNum(st.currentBalanceCents) + '</p>');
  add('<p>FICO Score         : ' + padR(st.ficoBand, 20) + '</p>');
  add('</td>');
  add('</tr>');
  add('<tr>');
  add(TD_SECTION);
  add('<p style="font-size:16px">Transaction Summary</p>');
  add('</td>');
  add('</tr>');
  add('<tr>');
  add('<td style="width:25%; padding:0px 5px; background-color:#33FF5E; text-align:left;">');
  add('<p style="font-size:16px">Tran ID</p>');
  add('</td>');
  add('<td style="width:55%; padding:0px 5px; background-color:#33FF5E; text-align:left;">');
  add('<p style="font-size:16px">Tran Details</p>');
  add('</td>');
  add('<td style="width:20%; padding:0px 5px; background-color:#33FF5E; text-align:right;">');
  add('<p style="font-size:16px">Amount</p>');
  add('</td>');
  add('</tr>');
  for (var k = 0; k < st.lines.length; k++) {
    var t = st.lines[k];
    add('<tr>');
    add('<td style="width:25%; padding:0px 5px; background-color:#f2f2f2; text-align:left;">');
    add('<p>' + padR(t.transactionId, 16) + '</p>');
    add('</td>');
    add('<td style="width:55%; padding:0px 5px; background-color:#f2f2f2; text-align:left;">');
    add('<p>' + padR(t.description, 49) + '</p>');
    add('</td>');
    add('<td style="width:20%; padding:0px 5px; background-color:#f2f2f2; text-align:right;">');
    add('<p>' + fmtZ(t.amountCents) + '</p>');
    add('</td>');
    add('</tr>');
  }
  add('<tr>');
  add(TD_BANNER);
  add('<h3>End of Statement</h3>');
  add('</td>');
  add('</tr>');
  add('</table>');
  add('</body>');
  add('</html>');
}

output.creastmt_statements_html = out.join('\n');
