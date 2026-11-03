// statement-generation (P-17) / CREASTMT — node "Render HTML Statements (HTMLFILE)"
// statement-html template: 100-column lines, one complete HTML document per statement.

function rpad(s, n) {
  s = s === null || s === undefined ? '' : String(s);
  if (s.length > n) return s.substring(0, n);
  while (s.length < n) s += ' ';
  return s;
}
function zpad(n, w) { var s = String(n); while (s.length < w) s = '0' + s; return s; }
function pic9(c) {
  var neg = c < 0, a = Math.abs(c);
  return zpad(Math.floor(a / 100) % 1000000000, 9) + '.' + zpad(a % 100, 2) + (neg ? '-' : ' ');
}
function picZ(c) {
  var neg = c < 0, a = Math.abs(c);
  var ip = Math.floor(a / 100) % 1000000000;
  var s = ip === 0 ? '' : String(ip);
  while (s.length < 9) s = ' ' + s;
  return s + '.' + zpad(a % 100, 2) + (neg ? '-' : ' ');
}
// variable-length name/address text: the statement field up to its first double space
function upToDoubleSpace(s, size) {
  s = rpad(s, size);
  var at = s.indexOf('  ');
  return at >= 0 ? s.substring(0, at) : s;
}

var TD_BAR = '<td colspan="3" style="padding:0px 5px;background-color:#1d1d96b3;">';
var TD_GREY = '<td colspan="3" style="padding:0px 5px;background-color:#f2f2f2;">';
var TD_SECTION = '<td colspan="3" style="padding:0px 5px;background-color:#33FFD1; text-align:center;">';
function tdCol(width, color, align) {
  return '<td style="width:' + width + '; padding:0px 5px; background-color:' + color + '; text-align:' + align + ';">';
}

var out = [];
function w(line) { out.push(rpad(line, 100)); }

var sts = input.statementData || [];
for (var i = 0; i < sts.length; i++) {
  var s = sts[i];
  w('<!DOCTYPE html>');
  w('<html lang="en">');
  w('<head>');
  w('<meta charset="utf-8">');
  w('<title>HTML Table Layout</title>');
  w('</head>');
  w('<body style="margin:0px;">');
  w('<table  align="center" frame="box" style="width:70%; font:12px Segoe UI,sans-serif;">');
  w('<tr>');
  w(TD_BAR);
  w('<h3>Statement for Account Number: ' + rpad(s.accountIdDisplay, 20) + '</h3>');
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
  w('<p style="font-size:16px">' + upToDoubleSpace(s.stName, 75) + '  </p>');
  w('<p>' + upToDoubleSpace(s.stAdd1, 50) + '  </p>');
  w('<p>' + upToDoubleSpace(s.stAdd2, 50) + '  </p>');
  w('<p>' + upToDoubleSpace(s.stAdd3, 80) + '  </p>');
  w('</td>');
  w('</tr>');
  w('<tr>');
  w(TD_SECTION);
  w('<p style="font-size:16px">Basic Details</p>');
  w('</td>');
  w('</tr>');
  w('<tr>');
  w(TD_GREY);
  w('<p>Account ID         : ' + rpad(s.accountIdDisplay, 20) + '</p>');
  w('<p>Current Balance    : ' + pic9(s.currentBalanceCents) + '</p>');
  w('<p>FICO Score         : ' + rpad(s.ficoScoreDisplay, 20) + '</p>');
  w('</td>');
  w('</tr>');
  w('<tr>');
  w(TD_SECTION);
  w('<p style="font-size:16px">Transaction Summary</p>');
  w('</td>');
  w('</tr>');
  w('<tr>');
  w(tdCol('25%', '#33FF5E', 'left'));
  w('<p style="font-size:16px">Tran ID</p>');
  w('</td>');
  w(tdCol('55%', '#33FF5E', 'left'));
  w('<p style="font-size:16px">Tran Details</p>');
  w('</td>');
  w(tdCol('20%', '#33FF5E', 'right'));
  w('<p style="font-size:16px">Amount</p>');
  w('</td>');
  w('</tr>');
  var lines = s.lines || [];
  for (var j = 0; j < lines.length; j++) {
    var l = lines[j];
    w('<tr>');
    w(tdCol('25%', '#f2f2f2', 'left'));
    w('<p>' + rpad(l.transactionId, 16) + '</p>');
    w('</td>');
    w(tdCol('55%', '#f2f2f2', 'left'));
    w('<p>' + rpad(l.description, 49) + '</p>');
    w('</td>');
    w(tdCol('20%', '#f2f2f2', 'right'));
    w('<p>' + picZ(l.amountCents) + '</p>');
    w('</td>');
    w('</tr>');
  }
  w('<tr>');
  w(TD_BAR);
  w('<h3>End of Statement</h3>');
  w('</td>');
  w('</tr>');
  w('</table>');
  w('</body>');
  w('</html>');
}

output.creastmt_statements_html = out.join('\n');
