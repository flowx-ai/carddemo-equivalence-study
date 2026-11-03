// statement-generation (P-17) / CREASTMT — node "Render Text Statements (STMTFILE)"
// statement-text template: 80-column lines, ST-LINE0 .. ST-LINE15 of CBSTM03A.

function rpad(s, n) {
  s = s === null || s === undefined ? '' : String(s);
  if (s.length > n) return s.substring(0, n);
  while (s.length < n) s += ' ';
  return s;
}
function rep(c, n) { var s = ''; while (s.length < n) s += c; return s; }
function zpad(n, w) { var s = String(n); while (s.length < w) s = '0' + s; return s; }
// PIC 9(9).99-
function pic9(c) {
  var neg = c < 0, a = Math.abs(c);
  return zpad(Math.floor(a / 100) % 1000000000, 9) + '.' + zpad(a % 100, 2) + (neg ? '-' : ' ');
}
// PIC Z(9).99-
function picZ(c) {
  var neg = c < 0, a = Math.abs(c);
  var ip = Math.floor(a / 100) % 1000000000;
  var s = ip === 0 ? '' : String(ip);
  while (s.length < 9) s = ' ' + s;
  return s + '.' + zpad(a % 100, 2) + (neg ? '-' : ' ');
}

var DASH = rep('-', 80);
var out = [];
var sts = input.statementData || [];
for (var i = 0; i < sts.length; i++) {
  var s = sts[i];
  out.push(rep('*', 31) + 'START OF STATEMENT' + rep('*', 31));          // 0
  out.push(rpad(s.stName, 75) + rep(' ', 5));                            // 1
  out.push(rpad(s.stAdd1, 50) + rep(' ', 30));                           // 2
  out.push(rpad(s.stAdd2, 50) + rep(' ', 30));                           // 3
  out.push(rpad(s.stAdd3, 80));                                          // 4
  out.push(DASH);                                                        // 5
  out.push(rpad(rep(' ', 33) + 'Basic Details', 80));                    // 6
  out.push(DASH);                                                        // 5
  out.push(rpad('Account ID         :' + rpad(s.accountIdDisplay, 20), 80));      // 7
  out.push(rpad('Current Balance    :' + pic9(s.currentBalanceCents), 80));       // 8
  out.push(rpad('FICO Score         :' + rpad(s.ficoScoreDisplay, 20), 80));      // 9
  out.push(DASH);                                                        // 10
  out.push(rpad(rep(' ', 30) + 'TRANSACTION SUMMARY', 80));              // 11
  out.push(DASH);                                                        // 12
  out.push(rpad('Tran ID', 16) + rpad('Tran Details', 51) + '  Tran Amount');      // 13
  out.push(DASH);                                                        // 12
  var lines = s.lines || [];
  for (var j = 0; j < lines.length; j++) {                               // 14
    var l = lines[j];
    out.push(rpad(l.transactionId, 16) + ' ' + rpad(l.description, 49) + '$' + picZ(l.amountCents));
  }
  out.push(DASH);                                                        // 12
  out.push('Total EXP:' + rep(' ', 56) + '$' + picZ(s.totalExpenditureCents));     // 14A
  out.push(rep('*', 32) + 'END OF STATEMENT' + rep('*', 32));            // 15
}

output.creastmt_statements = out.join('\n');
