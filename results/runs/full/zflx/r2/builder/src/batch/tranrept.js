// TRANREPT (CBTRN03C) — daily transaction report, 133 cols. Prepend _helpers.js.
function grp(c, plus) {
  if (c === 0) return sp(15);
  var a = Math.abs(c), ip = Math.floor(a / 100), s = ip > 0 ? String(ip) : '', o = '';
  while (s.length > 3) { o = ',' + s.substring(s.length - 3) + o; s = s.substring(0, s.length - 3); }
  o = s + o + '.' + lpad(a % 100, 2, '0');
  return (c < 0 ? '-' : (plus ? '+' : ' ')) + lpad(o, 14, ' ');
}
function rt(s) { return s.replace(/\s+$/, ''); }
var SD = String(inp(['startDate', 'start_date', 'reportStartDate']) || '2022-07-01').substring(0, 10);
var ED = String(inp(['endDate', 'end_date', 'reportEndDate']) || '2022-07-31').substring(0, 10);
var tl = lines(inp(['transact.dat', 'transact'])), xl = lines(inp(['cardxref.dat', 'cardxref'])),
    yl = lines(inp(['trantype.dat', 'trantype'])), gl = lines(inp(['trancatg.dat', 'trancatg']));
var sys = ['START OF EXECUTION OF PROGRAM CBTRN03C'], res = {};
var miss = tl === null ? 'TRANFILE' : xl === null ? 'CARDXREF' : yl === null ? 'TRANTYPE' : gl === null ? 'TRANCATG' : null;
if (miss) {
  sys.push('ERROR OPENING ' + miss); sys.push('ABENDING PROGRAM');
  res = { 'tranrept_sysout.txt': sys, 'tranrept_rc.txt': '999', returnCode: 999 };
} else {
  var xr = {}, ty = {}, ca = {}, R = [], PS = 20, lc = 0, pageT = 0, acctT = 0, grand = 0, cur = null, first = true, acctId = null;
  xl.forEach(function (r) { var q = pXref(r); xr[q.card_num] = q; });
  yl.forEach(function (r) { ty[x(r, 0, 2)] = x(r, 2, 52); });
  gl.forEach(function (r) { ca[x(r, 0, 2) + '|' + n(r, 2, 6)] = x(r, 6, 56); });
  var tx = [];
  tl.forEach(function (r, i) { var t = pTran(r); var d = t.proc_ts.substring(0, 10); if (d >= SD && d <= ED) { t._i = i; tx.push(t); } });
  tx.sort(function (p, q) { return p.card_num < q.card_num ? -1 : p.card_num > q.card_num ? 1 : p._i - q._i; });
  var RULE = rep('-', 133);
  var headers = function () {
    R.push(pad('DALYREPT', 38) + pad('Daily Transaction Report', 41) + 'Date Range: ' + pad(SD, 10) + ' to ' + pad(ED, 10));
    R.push('');
    R.push(pad('Transaction ID', 17) + pad('Account ID', 12) + pad('Transaction Type', 19) + pad('Tran Category', 35) + pad('Tran Source', 14) + ' ' + pad('         Amount', 16));
    R.push(RULE); lc += 4;
  };
  var pageTotals = function () {
    R.push(pad('Page Total', 11) + rep('.', 86) + grp(pageT, true)); grand += pageT; pageT = 0; lc++;
    R.push(RULE); lc++;
  };
  var acctTotals = function () {
    R.push(pad('Account Total', 13) + rep('.', 84) + grp(acctT, true)); acctT = 0; lc++;
    R.push(RULE); lc++;
  };
  tx.forEach(function (t) {
    if (cur !== t.card_num) {
      if (!first) acctTotals();
      cur = t.card_num;
      var q = xr[t.card_num];
      if (!q) { sys.push('INVALID CARD NUMBER : ' + t.card_num + ' (TRAN ' + t.tran_id + ') - CONTINUING'); acctId = null; }
      else acctId = q.acct_id;
    }
    var td = ty[t.type_cd], cd = ca[t.type_cd + '|' + t.cat_cd];
    if (td === undefined) { sys.push('INVALID TRANSACTION TYPE : ' + t.type_cd + ' (TRAN ' + t.tran_id + ') - CONTINUING'); td = ''; }
    if (cd === undefined) { sys.push('INVALID TRAN CATG KEY : ' + t.type_cd + lpad(t.cat_cd, 4, '0') + ' (TRAN ' + t.tran_id + ') - CONTINUING'); cd = ''; }
    if (first) { first = false; headers(); }
    if (lc % PS === 0) { pageTotals(); headers(); }
    pageT += t.amt; acctT += t.amt;
    R.push(pad(t.tran_id, 16) + ' ' + (acctId === null ? sp(11) : lpad(acctId, 11, '0')) + ' ' + pad(t.type_cd, 2) + '-' + pad(td, 15) + ' ' +
      lpad(t.cat_cd, 4, '0') + '-' + pad(cd, 29) + ' ' + pad(t.source, 10) + sp(4) + grp(t.amt, false) + sp(2));
    lc++;
  });
  if (first) headers();
  pageTotals();
  R.push(pad('Grand Total', 11) + rep('.', 86) + grp(grand, true));
  sys.push('TRANSACTIONS REPORTED: ' + tx.length);
  sys.push('END OF EXECUTION OF PROGRAM CBTRN03C');
  res = { 'tranrept_report.txt': R.map(function (l) { return rt(pad(l, 133)); }), 'tranrept_sysout.txt': sys, returnCode: 0 };
}
output.result = res;
