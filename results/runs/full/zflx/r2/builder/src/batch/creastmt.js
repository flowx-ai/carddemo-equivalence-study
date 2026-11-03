// CREASTMT (CBSTM03A/B) — statement generation, text (80) + HTML (100). Prepend _helpers.js.
function n9(c) { var a = Math.abs(c); return lpad(Math.floor(a / 100), 9, '0') + '.' + lpad(a % 100, 2, '0') + (c < 0 ? '-' : ' '); }
function z9(c) { var a = Math.abs(c), ip = Math.floor(a / 100); return lpad(ip === 0 ? '' : String(ip), 9, ' ') + '.' + lpad(a % 100, 2, '0') + (c < 0 ? '-' : ' '); }
function w(s) { s = s || ''; var i = s.indexOf(' '); return i < 0 ? s : s.substring(0, i); }
function rt(s) { return s.replace(/\s+$/, ''); }
var tl = lines(inp(['transact.dat', 'transact'])), al = lines(inp(['acctdata.dat', 'acctdata'])),
    xl = lines(inp(['cardxref.dat', 'cardxref'])), cl = lines(inp(['custdata.dat', 'custdata']));
var sys = ['START OF EXECUTION OF PROGRAM CBSTM03A'], res = {};
var miss = tl === null ? 'TRNXFILE' : xl === null ? 'XREFFILE' : cl === null ? 'CUSTFILE' : al === null ? 'ACCTFILE' : null;
if (miss) {
  sys.push('ERROR OPENING ' + miss); sys.push('ABENDING PROGRAM');
  res = { 'creastmt_sysout.txt': sys, 'creastmt_rc.txt': '999', returnCode: 999 };
} else {
  var acc = {}, cus = {}, byCard = {}, T = [], H = [];
  al.forEach(function (r) { var a = pAcct(r); acc[a.acct_id] = a; });
  cl.forEach(function (r) { var c = pCust(r); cus[c.cust_id] = c; });
  tl.map(pTran).sort(function (p, q) { var a = p.card_num + p.tran_id, b = q.card_num + q.tran_id; return a < b ? -1 : a > b ? 1 : 0; })
    .forEach(function (t) { (byCard[t.card_num] = byCard[t.card_num] || []).push(t); });
  var xr = xl.map(pXref).sort(function (p, q) { return p.card_num < q.card_num ? -1 : p.card_num > q.card_num ? 1 : 0; });
  var D = rep('-', 80);
  var TD = function (wd, bg, al2) { return '<td style="width:' + wd + '; padding:0px 5px; background-color:' + bg + '; text-align:' + al2 + ';">'; };
  xr.forEach(function (q) {
    var c = cus[q.cust_id] || null, a = acc[q.acct_id] || null;
    if (!c) sys.push('CUSTOMER NOT FOUND: ' + lpad(q.cust_id, 9, '0') + ' (CARD ' + q.card_num + ')');
    if (!a) sys.push('ACCOUNT NOT FOUND: ' + lpad(q.acct_id, 11, '0') + ' (CARD ' + q.card_num + ')');
    c = c || pCust(''); a = a || pAcct('');
    var name = w(c.first_name) + ' ' + w(c.middle_name) + ' ' + w(c.last_name) + ' ';
    var a3 = w(c.addr_line_3) + ' ' + w(c.addr_state_cd) + ' ' + w(c.addr_country_cd) + ' ' + w(c.addr_zip) + ' ';
    var aid = lpad(q.acct_id, 11, '0'), fico = lpad(c.fico_credit_score, 3, '0');
    T.push(rep('*', 31) + 'START OF STATEMENT' + rep('*', 31));
    T.push(pad(name, 75) + sp(5)); T.push(pad(c.addr_line_1, 50) + sp(30)); T.push(pad(c.addr_line_2, 50) + sp(30)); T.push(pad(a3, 80));
    T.push(D); T.push(sp(33) + pad('Basic Details', 47)); T.push(D);
    T.push('Account ID         :' + pad(aid, 20) + sp(40));
    T.push('Current Balance    :' + n9(a.curr_bal) + sp(47));
    T.push('FICO Score         :' + pad(fico, 20) + sp(40));
    T.push(D); T.push(sp(30) + pad('TRANSACTION SUMMARY', 50)); T.push(D);
    T.push(pad('Tran ID', 16) + pad('Tran Details', 51) + '  Tran Amount'); T.push(D);
    H.push('<!DOCTYPE html>', '<html lang="en">', '<head>', '<meta charset="utf-8">', '<title>HTML Table Layout</title>', '</head>',
      '<body style="margin:0px;">', '<table  align="center" frame="box" style="width:70%; font:12px Segoe UI,sans-serif;">',
      '<tr>', '<td colspan="3" style="padding:0px 5px;background-color:#1d1d96b3;">', '<h3>Statement for Account Number: ' + pad(aid, 20) + '</h3>',
      '</td>', '</tr>', '<tr>', '<td colspan="3" style="padding:0px 5px;background-color:#FFAF33;">', '<p style="font-size:16px">Bank of XYZ</p>',
      '<p>410 Terry Ave N</p>', '<p>Seattle WA 99999</p>', '</td>', '</tr>', '<tr>', '<td colspan="3" style="padding:0px 5px;background-color:#f2f2f2;">',
      '<p style="font-size:16px">' + rt(name) + '  </p>', '<p>' + rt(c.addr_line_1) + '  </p>', '<p>' + rt(c.addr_line_2) + '  </p>', '<p>' + rt(a3) + '  </p>',
      '</td>', '</tr>', '<tr>', '<td colspan="3" style="padding:0px 5px;background-color:#33FFD1; text-align:center;">', '<p style="font-size:16px">Basic Details</p>',
      '</td>', '</tr>', '<tr>', '<td colspan="3" style="padding:0px 5px;background-color:#f2f2f2;">',
      '<p>Account ID         : ' + pad(aid, 20) + '</p>', '<p>Current Balance    : ' + n9(a.curr_bal) + '</p>', '<p>FICO Score         : ' + pad(fico, 20) + '</p>',
      '</td>', '</tr>', '<tr>', '<td colspan="3" style="padding:0px 5px;background-color:#33FFD1; text-align:center;">', '<p style="font-size:16px">Transaction Summary</p>',
      '</td>', '</tr>', '<tr>',
      TD('25%', '#33FF5E', 'left'), '<p style="font-size:16px">Tran ID</p>', '</td>',
      TD('55%', '#33FF5E', 'left'), '<p style="font-size:16px">Tran Details</p>', '</td>',
      TD('20%', '#33FF5E', 'right'), '<p style="font-size:16px">Amount</p>', '</td>', '</tr>');
    var total = 0;
    (byCard[q.card_num] || []).forEach(function (t) {
      total += t.amt;
      T.push(pad(t.tran_id, 16) + ' ' + pad(t.desc, 49) + '$' + z9(t.amt));
      H.push('<tr>', TD('25%', '#f2f2f2', 'left'), '<p>' + pad(t.tran_id, 16) + '</p>', '</td>',
        TD('55%', '#f2f2f2', 'left'), '<p>' + pad(t.desc, 49) + '</p>', '</td>',
        TD('20%', '#f2f2f2', 'right'), '<p>' + z9(t.amt) + '</p>', '</td>', '</tr>');
    });
    T.push(D); T.push('Total EXP:' + sp(56) + '$' + z9(total)); T.push(rep('*', 32) + 'END OF STATEMENT' + rep('*', 32));
    H.push('<tr>', '<td colspan="3" style="padding:0px 5px;background-color:#1d1d96b3;">', '<h3>End of Statement</h3>', '</td>', '</tr>', '</table>', '</body>', '</html>');
  });
  sys.push('STATEMENTS WRITTEN: ' + xr.length);
  sys.push('END OF EXECUTION OF PROGRAM CBSTM03A');
  res = { 'creastmt_statements.txt': T.map(function (l) { return rt(pad(l, 80)); }),
    'creastmt_statements_html.txt': H.map(function (l) { return rt(pad(l, 100)); }), 'creastmt_sysout.txt': sys, returnCode: 0 };
}
output.result = res;
