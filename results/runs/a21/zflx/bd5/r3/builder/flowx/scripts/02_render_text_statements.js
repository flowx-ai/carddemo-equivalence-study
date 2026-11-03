// CREASTMT / statement-generation (P-17) - node "Render text statements" (STMTFILE, 80 columns, BR-04).
// Line layout per CONTRACT (creastmt_statements.txt); lines joined by "\n".

function rep(c, n) { var s = ''; for (var i = 0; i < n; i++) s += c; return s; }
function padRight(s, n) {
  s = (s === null || s === undefined) ? '' : String(s);
  while (s.length < n) s += ' ';
  return s.length > n ? s.substring(0, n) : s;
}
function padLeft(s, n, c) { s = String(s); while (s.length < n) s = c + s; return s; }
// 9(9).99-  (high-order digits beyond 9 are truncated, as a COBOL MOVE does)
function fmtNine(cents) {
  var neg = cents < 0, a = Math.abs(cents);
  var ip = Math.floor(a / 100) % 1000000000, dp = a % 100;
  return padLeft(String(ip), 9, '0') + '.' + padLeft(String(dp), 2, '0') + (neg ? '-' : ' ');
}
// Z(9).99-  (leading zeros of the integer part printed as spaces)
function fmtZ(cents) {
  var neg = cents < 0, a = Math.abs(cents);
  var ip = Math.floor(a / 100) % 1000000000, dp = a % 100;
  return padLeft(ip === 0 ? '' : String(ip), 9, ' ') + '.' + padLeft(String(dp), 2, '0') + (neg ? '-' : ' ');
}

var statements = JSON.parse(input.statementDataJson);
var DASH = rep('-', 80);
var out = [];
for (var i = 0; i < statements.length; i++) {
  var st = statements[i];
  out.push(rep('*', 31) + 'START OF STATEMENT' + rep('*', 31));                    // 0
  out.push(padRight(padRight(st.customerName, 75), 80));                           // 1
  out.push(padRight(padRight(st.addressLine1, 50), 80));                           // 2
  out.push(padRight(padRight(st.addressLine2, 50), 80));                           // 3
  out.push(padRight(st.addressLine3, 80));                                         // 4
  out.push(DASH);                                                                  // 5
  out.push(padRight(rep(' ', 33) + 'Basic Details', 80));                          // 6
  out.push(DASH);                                                                  // 5
  out.push(padRight('Account ID         :' + padRight(st.accountId, 20), 80));     // 7
  out.push(padRight('Current Balance    :' + fmtNine(st.currentBalanceCents), 80)); // 8
  out.push(padRight('FICO Score         :' + padRight(st.ficoScore, 20), 80));     // 9
  out.push(DASH);                                                                  // 10
  out.push(padRight(rep(' ', 30) + 'TRANSACTION SUMMARY', 80));                    // 11
  out.push(DASH);                                                                  // 12
  out.push(padRight('Tran ID', 16) + padRight('Tran Details', 51) + '  Tran Amount'); // 13
  out.push(DASH);                                                                  // 12
  for (var j = 0; j < st.lines.length; j++) {                                      // 14
    var ln = st.lines[j];
    out.push(padRight(ln.transactionId, 16) + ' ' + padRight(ln.description, 49) + '$' + fmtZ(ln.amountCents));
  }
  out.push(DASH);                                                                  // 12
  out.push('Total EXP:' + rep(' ', 56) + '$' + fmtZ(st.totalExpenditureCents));    // 14A
  out.push(rep('*', 32) + 'END OF STATEMENT' + rep('*', 32));                      // 15
}
output.creastmt_statements = out.join('\n');
