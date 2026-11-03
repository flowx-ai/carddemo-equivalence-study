// SCRIPT node "Render Statements Text and HTML" (workflow creastmt_statement_generation)
// Replaces the document templates statement-text (STMTFILE, 80 columns) and
// statement-html (HTMLFILE, 100 columns). Line layouts as in CONTRACT.md (layer 1 supplement).

function pad(s, n) {
  s = (s === null || s === undefined) ? '' : String(s);
  return s.length >= n ? s.substring(0, n) : s + ' '.repeat(n - s.length);
}
function sp(n) { return ' '.repeat(n); }

// 9(9).99-  : nine digits with leading zeros, point, two decimals, trailing sign
function edit9(cents) {
  var a = Math.abs(cents), ip = Math.floor(a / 100) % 1000000000, dp = a % 100;
  return String(ip).padStart(9, '0') + '.' + String(dp).padStart(2, '0') + (cents < 0 ? '-' : ' ');
}
// Z(9).99-  : same with leading zeros printed as spaces
function editZ(cents) {
  var a = Math.abs(cents), ip = Math.floor(a / 100) % 1000000000, dp = a % 100;
  return (ip === 0 ? sp(9) : String(ip).padStart(9, ' ')) + '.' + String(dp).padStart(2, '0') + (cents < 0 ? '-' : ' ');
}
// HTML value: the field up to its first double space (COBOL DELIMITED BY '  ')
function upToDoubleSpace(s) {
  var i = s.indexOf('  ');
  return i < 0 ? s : s.substring(0, i);
}

var RULE = '-'.repeat(80);
var statements = JSON.parse(String(input.statementsJson || '[]'));
var txt = [], html = [];

statements.forEach(function (st) {
  var name = pad(st.customerName, 75);
  var add1 = pad(st.addressLine1, 50), add2 = pad(st.addressLine2, 50), add3 = pad(st.addressLine3, 80);
  var acct = pad(st.accountId, 20), fico = pad(st.ficoScore, 20);

  // ---- text statement (80 columns)
  txt.push('*'.repeat(31) + 'START OF STATEMENT' + '*'.repeat(31));
  txt.push(name + sp(5));
  txt.push(add1 + sp(30));
  txt.push(add2 + sp(30));
  txt.push(add3);
  txt.push(RULE);
  txt.push(pad(sp(33) + 'Basic Details', 80));
  txt.push(RULE);
  txt.push('Account ID         :' + acct + sp(40));
  txt.push('Current Balance    :' + edit9(st.currentBalance) + sp(47));
  txt.push('FICO Score         :' + fico + sp(40));
  txt.push(RULE);
  txt.push(pad(sp(30) + 'TRANSACTION SUMMARY', 80));
  txt.push(RULE);
  txt.push(pad('Tran ID', 16) + pad('Tran Details', 51) + '  Tran Amount');
  txt.push(RULE);
  st.lines.forEach(function (t) {
    txt.push(pad(t.transactionId, 16) + ' ' + pad(t.description, 49) + '$' + editZ(t.amount));
  });
  txt.push(RULE);
  txt.push('Total EXP:' + sp(56) + '$' + editZ(st.totalExpenditure));
  txt.push('*'.repeat(32) + 'END OF STATEMENT' + '*'.repeat(32));

  // ---- HTML statement (100 columns)
  var TD3 = '<td colspan="3" style="padding:0px 5px;background-color:';
  html.push(
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<title>HTML Table Layout</title>',
    '</head>',
    '<body style="margin:0px;">',
    '<table  align="center" frame="box" style="width:70%; font:12px Segoe UI,sans-serif;">',
    '<tr>',
    TD3 + '#1d1d96b3;">',
    '<h3>Statement for Account Number: ' + acct + '</h3>',
    '</td>',
    '</tr>',
    '<tr>',
    TD3 + '#FFAF33;">',
    '<p style="font-size:16px">Bank of XYZ</p>',
    '<p>410 Terry Ave N</p>',
    '<p>Seattle WA 99999</p>',
    '</td>',
    '</tr>',
    '<tr>',
    TD3 + '#f2f2f2;">',
    '<p style="font-size:16px">' + upToDoubleSpace(name) + '  </p>',
    '<p>' + upToDoubleSpace(add1) + '  </p>',
    '<p>' + upToDoubleSpace(add2) + '  </p>',
    '<p>' + upToDoubleSpace(add3) + '  </p>',
    '</td>',
    '</tr>',
    '<tr>',
    TD3 + '#33FFD1; text-align:center;">',
    '<p style="font-size:16px">Basic Details</p>',
    '</td>',
    '</tr>',
    '<tr>',
    TD3 + '#f2f2f2;">',
    '<p>Account ID         : ' + acct + '</p>',
    '<p>Current Balance    : ' + edit9(st.currentBalance) + '</p>',
    '<p>FICO Score         : ' + fico + '</p>',
    '</td>',
    '</tr>',
    '<tr>',
    TD3 + '#33FFD1; text-align:center;">',
    '<p style="font-size:16px">Transaction Summary</p>',
    '</td>',
    '</tr>',
    '<tr>',
    '<td style="width:25%; padding:0px 5px; background-color:#33FF5E; text-align:left;">',
    '<p style="font-size:16px">Tran ID</p>',
    '</td>',
    '<td style="width:55%; padding:0px 5px; background-color:#33FF5E; text-align:left;">',
    '<p style="font-size:16px">Tran Details</p>',
    '</td>',
    '<td style="width:20%; padding:0px 5px; background-color:#33FF5E; text-align:right;">',
    '<p style="font-size:16px">Amount</p>',
    '</td>',
    '</tr>'
  );
  st.lines.forEach(function (t) {
    html.push(
      '<tr>',
      '<td style="width:25%; padding:0px 5px; background-color:#f2f2f2; text-align:left;">',
      '<p>' + pad(t.transactionId, 16) + '</p>',
      '</td>',
      '<td style="width:55%; padding:0px 5px; background-color:#f2f2f2; text-align:left;">',
      '<p>' + pad(t.description, 49) + '</p>',
      '</td>',
      '<td style="width:20%; padding:0px 5px; background-color:#f2f2f2; text-align:right;">',
      '<p>' + editZ(t.amount) + '</p>',
      '</td>',
      '</tr>'
    );
  });
  html.push(
    '<tr>',
    TD3 + '#1d1d96b3;">',
    '<h3>End of Statement</h3>',
    '</td>',
    '</tr>',
    '</table>',
    '</body>',
    '</html>'
  );
});

// Text lines keep their full 80 columns. HTML lines are cut at 100 and returned without
// trailing spaces (CONTRACT.md allows it), which keeps the run payload small.
output.creastmt_statements = txt.map(function (l) { return pad(l, 80); }).join('\n');
output.creastmt_statements_html = html.map(function (l) { return pad(l, 100).replace(/ +$/, ''); }).join('\n');
output.statementsJson = null;
