// CREASTMT (CBSTM03A/B) — wiki process statement generation; layouts CONTRACT-L1 p230-232
function main() {
  var T = req('transact.dat'), X = req('cardxref.dat'), A = req('acctdata.dat'), C = req('custdata.dat');
  if (missing.length) { abend('creastmt'); return; }
  var i, acct = {}, cust = {}, byCard = {};
  for (i = 0; i < A.length; i++) { var a = parseAcct(A[i]); if (acct[a.acct_id] === undefined) acct[a.acct_id] = a; }
  for (i = 0; i < C.length; i++) { var c = parseCust(C[i]); if (cust[c.cust_id] === undefined) cust[c.cust_id] = c; }
  for (i = 0; i < T.length; i++) { var t = parseTran(T[i]); (byCard[t.card_num] = byCard[t.card_num] || []).push(t); }
  var xr = X.map(parseXref);
  xr.sort(function (p, q) { return p.card_num < q.card_num ? -1 : p.card_num > q.card_num ? 1 : 0; });
  var txt = [], html = [], D = rep('-', 80);
  function L(s) { txt.push(padR(s, 80)); }
  function H(s) { html.push(padR(s, 100)); }
  function join(arr) { var o = []; for (var k = 0; k < arr.length; k++) { var v = String(arr[k] || '').trim(); if (v !== '') o.push(v); } return o.join(' '); }
  var TDS = function (w, bg, al) { return '<td style="width:' + w + '; padding:0px 5px; background-color:' + bg + '; text-align:' + al + ';">'; };
  var TDC = function (bg, extra) { return '<td colspan="3" style="padding:0px 5px;background-color:' + bg + ';' + (extra || '') + '">'; };
  for (i = 0; i < xr.length; i++) {
    var x = xr[i], cu = cust[x.cust_id], ac = acct[x.acct_id];
    var name = cu ? join([cu.first_name, cu.middle_name, cu.last_name]) : '';
    var a1 = cu ? cu.addr_line_1.trim() : '', a2 = cu ? cu.addr_line_2.trim() : '';
    var a3 = cu ? join([cu.addr_line_3, cu.addr_state_cd, cu.addr_country_cd, cu.addr_zip]) : '';
    var aid = padR(padL(x.acct_id, 11, '0'), 20);
    var bal = picN(ac ? ac.bal : 0, 9, false);
    var fico = padR(cu ? padL(cu.fico_credit_score, 3, '0') : '', 20);
    var trs = (byCard[x.card_num] || []).slice(0);
    trs.sort(function (p, q) { return p.tran_id < q.tran_id ? -1 : p.tran_id > q.tran_id ? 1 : 0; });
    // ---- plain text statement ----
    L(rep('*', 31) + 'START OF STATEMENT' + rep('*', 31));
    L(padR(name, 75)); L(padR(a1, 50)); L(padR(a2, 50)); L(padR(a3, 80));
    L(D); L(rep(' ', 33) + 'Basic Details'); L(D);
    L('Account ID         :' + aid);
    L('Current Balance    :' + bal);
    L('FICO Score         :' + fico);
    L(D); L(rep(' ', 30) + 'TRANSACTION SUMMARY'); L(D);
    L(padR('Tran ID', 16) + padR('Tran Details', 51) + '  Tran Amount');
    L(D);
    var tot = 0;
    for (var j = 0; j < trs.length; j++) {
      tot += trs[j].amtC;
      L(padR(trs[j].tran_id, 16) + ' ' + padR(trs[j].desc, 49) + '$' + picN(trs[j].amtC, 9, true));
    }
    L(D);
    L('Total EXP:' + rep(' ', 56) + '$' + picN(tot, 9, true));
    L(rep('*', 32) + 'END OF STATEMENT' + rep('*', 32));
    // ---- HTML statement ----
    H('<!DOCTYPE html>'); H('<html lang="en">'); H('<head>'); H('<meta charset="utf-8">');
    H('<title>HTML Table Layout</title>'); H('</head>'); H('<body style="margin:0px;">');
    H('<table  align="center" frame="box" style="width:70%; font:12px Segoe UI,sans-serif;">');
    H('<tr>'); H(TDC('#1d1d96b3')); H('<h3>Statement for Account Number: ' + aid + '</h3>'); H('</td>'); H('</tr>');
    H('<tr>'); H(TDC('#FFAF33')); H('<p style="font-size:16px">Bank of XYZ</p>'); H('<p>410 Terry Ave N</p>');
    H('<p>Seattle WA 99999</p>'); H('</td>'); H('</tr>');
    H('<tr>'); H(TDC('#f2f2f2')); H('<p style="font-size:16px">' + name + '  </p>');
    H('<p>' + a1 + '  </p>'); H('<p>' + a2 + '  </p>'); H('<p>' + a3 + '  </p>'); H('</td>'); H('</tr>');
    H('<tr>'); H(TDC('#33FFD1', ' text-align:center;')); H('<p style="font-size:16px">Basic Details</p>'); H('</td>'); H('</tr>');
    H('<tr>'); H(TDC('#f2f2f2'));
    H('<p>Account ID         : ' + aid + '</p>');
    H('<p>Current Balance    : ' + bal + '</p>');
    H('<p>FICO Score         : ' + fico + '</p>');
    H('</td>'); H('</tr>');
    H('<tr>'); H(TDC('#33FFD1', ' text-align:center;')); H('<p style="font-size:16px">Transaction Summary</p>'); H('</td>'); H('</tr>');
    H('<tr>');
    H(TDS('25%', '#33FF5E', 'left')); H('<p style="font-size:16px">Tran ID</p>'); H('</td>');
    H(TDS('55%', '#33FF5E', 'left')); H('<p style="font-size:16px">Tran Details</p>'); H('</td>');
    H(TDS('20%', '#33FF5E', 'right')); H('<p style="font-size:16px">Amount</p>'); H('</td>');
    H('</tr>');
    for (j = 0; j < trs.length; j++) {
      H('<tr>');
      H(TDS('25%', '#f2f2f2', 'left')); H('<p>' + padR(trs[j].tran_id, 16) + '</p>'); H('</td>');
      H(TDS('55%', '#f2f2f2', 'left')); H('<p>' + padR(trs[j].desc, 49) + '</p>'); H('</td>');
      H(TDS('20%', '#f2f2f2', 'right')); H('<p>' + picN(trs[j].amtC, 9, true) + '</p>'); H('</td>');
      H('</tr>');
    }
    H('<tr>'); H(TDC('#1d1d96b3')); H('<h3>End of Statement</h3>'); H('</td>');
    H('</tr>'); H('</table>'); H('</body>'); H('</html>');
  }
  output.creastmt_statements = txt;
  output.creastmt_statements_html = html;
}
main();
