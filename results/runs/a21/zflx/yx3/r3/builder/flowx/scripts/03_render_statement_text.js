// Node "Render Statement Text" — template statement-text: 80-column statements
// (BR-04, layout of creastmt_statements.txt in CONTRACT.md layer 1).

var statements = JSON.parse(String(input.statementDataJson));
var W = 80;

function padR(s, n) {
  s = (s === null || s === undefined) ? '' : String(s);
  if (s.length > n) return s.substring(0, n);
  while (s.length < n) s += ' ';
  return s;
}
function rep(ch, n) {
  var s = '';
  for (var i = 0; i < n; i++) s += ch;
  return s;
}
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

var out = [];
function add(s) { out.push(padR(s, W)); }
var dashes = rep('-', W);

for (var i = 0; i < statements.length; i++) {
  var st = statements[i];
  add(rep('*', 31) + 'START OF STATEMENT' + rep('*', 31));
  add(padR(st.customerName, 75));
  add(padR(st.addressLine1, 50));
  add(padR(st.addressLine2, 50));
  add(padR(st.addressLine3, 80));
  add(dashes);
  add(rep(' ', 33) + 'Basic Details');
  add(dashes);
  add(padR('Account ID', 19) + ':' + padR(st.accountId, 20));
  add(padR('Current Balance', 19) + ':' + fmtNum(st.currentBalanceCents));
  add(padR('FICO Score', 19) + ':' + padR(st.ficoBand, 20));
  add(dashes);
  add(rep(' ', 30) + 'TRANSACTION SUMMARY');
  add(dashes);
  add(padR('Tran ID', 16) + padR('Tran Details', 51) + '  Tran Amount');
  add(dashes);
  for (var k = 0; k < st.lines.length; k++) {
    var t = st.lines[k];
    add(padR(t.transactionId, 16) + ' ' + padR(t.description, 49) + '$' + fmtZ(t.amountCents));
  }
  add(dashes);
  add('Total EXP:' + rep(' ', 56) + '$' + fmtZ(st.totalExpenditureCents));
  add(rep('*', 32) + 'END OF STATEMENT' + rep('*', 32));
}

output.creastmt_statements = out.join('\n');
