// CREASTMT / statement-generation (P-17) - node "Render HTML statements" (HTMLFILE, 100 columns, BR-04).
// Line layout per CONTRACT (creastmt_statements_html.txt); each statement is a complete HTML document.
// Lines are cut at 100 columns; trailing spaces are omitted (CONTRACT allows it).

function padRight(s, n) {
  s = (s === null || s === undefined) ? '' : String(s);
  while (s.length < n) s += ' ';
  return s.length > n ? s.substring(0, n) : s;
}
function rtrim(s) { return String(s).replace(/\s+$/, ''); }
function padLeft(s, n, c) { s = String(s); while (s.length < n) s = c + s; return s; }
function fmtNine(cents) {
  var neg = cents < 0, a = Math.abs(cents);
  var ip = Math.floor(a / 100) % 1000000000, dp = a % 100;
  return padLeft(String(ip), 9, '0') + '.' + padLeft(String(dp), 2, '0') + (neg ? '-' : ' ');
}
function fmtZ(cents) {
  var neg = cents < 0, a = Math.abs(cents);
  var ip = Math.floor(a / 100) % 1000000000, dp = a % 100;
  return padLeft(ip === 0 ? '' : String(ip), 9, ' ') + '.' + padLeft(String(dp), 2, '0') + (neg ? '-' : ' ');
}

var statements = JSON.parse(input.statementDataJson);
var out = [];
function w(s) { out.push(rtrim(String(s).substring(0, 100))); }

var TD_DARK = '<td colspan="3" style="padding:0px 5px;background-color:#1d1d96b3;">';
var TD_GREY = '<td colspan="3" style="padding:0px 5px;background-color:#f2f2f2;">';
var TD_TEAL = '<td colspan="3" style="padding:0px 5px;background-color:#33FFD1; text-align:center;">';

for (var i = 0; i < statements.length; i++) {
  var st = statements[i];
  var acctId = padRight(st.accountId, 20);
  w('<!DOCTYPE html>');
  w('<html lang="en">');
  w('<head>');
  w('<meta charset="utf-8">');
  w('<title>HTML Table Layout</title>');
  w('</head>');
  w('<body style="margin:0px;">');
  w('<table  align="center" frame="box" style="width:70%; font:12px Segoe UI,sans-serif;">');
  w('<tr>');
  w(TD_DARK);
  w('<h3>Statement for Account Number: ' + acctId + '</h3>');
  w('</td>');
  w('</tr>');
  w('<tr>');
  w('<td colspan="3" style="padding:0px 5px;background-color:#FFAF33;">');
  w('<p style="font-size:16px">Bank of XYZ</p>');
  w('<p>410 Terry Ave N</p>');
  w('<p>Seattle WA 99999</p>');
  w('</td>');
  w('</tr>');
  w('<tr>');
  w(TD_GREY);
  w('<p style="font-size:16px">' + rtrim(st.customerName) + '  </p>');
  w('<p>' + rtrim(st.addressLine1) + '  </p>');
  w('<p>' + rtrim(st.addressLine2) + '  </p>');
  w('<p>' + rtrim(st.addressLine3) + '  </p>');
  w('</td>');
  w('</tr>');
  w('<tr>');
  w(TD_TEAL);
  w('<p style="font-size:16px">Basic Details</p>');
  w('</td>');
  w('</tr>');
  w('<tr>');
  w(TD_GREY);
  w('<p>Account ID         : ' + acctId + '</p>');
  w('<p>Current Balance    : ' + fmtNine(st.currentBalanceCents) + '</p>');
  w('<p>FICO Score         : ' + padRight(st.ficoScore, 20) + '</p>');
  w('</td>');
  w('</tr>');
  w('<tr>');
  w(TD_TEAL);
  w('<p style="font-size:16px">Transaction Summary</p>');
  w('</td>');
  w('</tr>');
  w('<tr>');
  w('<td style="width:25%; padding:0px 5px; background-color:#33FF5E; text-align:left;">');
  w('<p style="font-size:16px">Tran ID</p>');
  w('</td>');
  w('<td style="width:55%; padding:0px 5px; background-color:#33FF5E; text-align:left;">');
  w('<p style="font-size:16px">Tran Details</p>');
  w('</td>');
  w('<td style="width:20%; padding:0px 5px; background-color:#33FF5E; text-align:right;">');
  w('<p style="font-size:16px">Amount</p>');
  w('</td>');
  w('</tr>');
  for (var j = 0; j < st.lines.length; j++) {
    var ln = st.lines[j];
    w('<tr>');
    w('<td style="width:25%; padding:0px 5px; background-color:#f2f2f2; text-align:left;">');
    w('<p>' + padRight(ln.transactionId, 16) + '</p>');
    w('</td>');
    w('<td style="width:55%; padding:0px 5px; background-color:#f2f2f2; text-align:left;">');
    w('<p>' + padRight(ln.description, 49) + '</p>');
    w('</td>');
    w('<td style="width:20%; padding:0px 5px; background-color:#f2f2f2; text-align:right;">');
    w('<p>' + fmtZ(ln.amountCents) + '</p>');
    w('</td>');
    w('</tr>');
  }
  w('<tr>');
  w(TD_DARK);
  w('<h3>End of Statement</h3>');
  w('</td>');
  w('</tr>');
  w('</table>');
  w('</body>');
  w('</html>');
}
output.creastmt_statements_html = out.join('\n');
