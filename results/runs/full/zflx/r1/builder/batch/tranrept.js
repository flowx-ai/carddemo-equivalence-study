// TRANREPT (SORT + CBTRN03C) — wiki process daily transaction report; layout CONTRACT-L1 p232
function main() {
  var T = req('transact.dat'), X = req('cardxref.dat'), TT = req('trantype.dat'), TC = req('trancatg.dat');
  if (missing.length) { abend('tranrept'); return; }
  var sd = String(input.start_date || cfg.reportStartDate || '2022-07-01').substring(0, 10);
  var ed = String(input.end_date || cfg.reportEndDate || '2022-07-31').substring(0, 10);
  var i, xr = {}, ty = {}, ca = {};
  for (i = 0; i < X.length; i++) { var x = parseXref(X[i]); if (xr[x.card_num] === undefined) xr[x.card_num] = x; }
  for (i = 0; i < TT.length; i++) { var l = padR(TT[i], 60); ty[fld(l, 1, 2)] = rt(fld(l, 3, 52)); }
  for (i = 0; i < TC.length; i++) { var m = padR(TC[i], 60); ca[fld(m, 1, 2) + '|' + zn(fld(m, 3, 6))] = rt(fld(m, 7, 56)); }
  var trs = [];
  for (i = 0; i < T.length; i++) {
    var t = parseTran(T[i]); t.seq = i;
    var d = t.proc_ts.substring(0, 10);
    if (d >= sd && d <= ed) trs.push(t);
  }
  // SORT FIELDS=(TRAN-CARD-NUM,A) — stable within a card
  trs.sort(function (p, q) { return p.card_num < q.card_num ? -1 : p.card_num > q.card_num ? 1 : p.seq - q.seq; });
  var out = [], RULE = rep('-', 133), PAGE = 20;
  function W(s) { out.push(padR(s, 133)); }
  function header() {
    W(padR('DALYREPT', 38) + padR('Daily Transaction Report', 41) + 'Date Range: ' + padR(sd, 10) + ' to ' + padR(ed, 10));
    W('');
    W(padR('Transaction ID', 17) + padR('Account ID', 12) + padR('Transaction Type', 19) + padR('Tran Category', 35) +
      padR('Tran Source', 14) + ' ' + padR('        Amount', 16));
    W(RULE);
  }
  var pageTot = 0, acctTot = 0, grand = 0, lines = 0, cur = null, sys = ['START OF EXECUTION OF PROGRAM CBTRN03C'];
  header();
  for (i = 0; i < trs.length; i++) {
    var r = trs[i];
    if (cur !== null && r.card_num !== cur) {
      W('Account Total' + rep('.', 84) + picEd(acctTot, '+')); W(RULE); acctTot = 0;
    }
    cur = r.card_num;
    if (lines > 0 && lines % PAGE === 0) {
      W(padR('Page Total', 11) + rep('.', 86) + picEd(pageTot, '+')); W(RULE); pageTot = 0;
      header();
    }
    var xx = xr[r.card_num], ck = r.type_cd + '|' + r.cat_cd;
    if (!xx) sys.push('CARD NUMBER ' + r.card_num + ' NOT FOUND IN CROSS-REFERENCE - TRAN ID ' + r.tran_id);
    if (ty[r.type_cd] === undefined) sys.push('TRANSACTION TYPE ' + r.type_cd + ' NOT FOUND - TRAN ID ' + r.tran_id);
    if (ca[ck] === undefined) sys.push('TRANSACTION CATEGORY ' + r.type_cd + '-' + padL(r.cat_cd, 4, '0') + ' NOT FOUND - TRAN ID ' + r.tran_id);
    var aid = xx ? padL(xx.acct_id, 11, '0') : '';
    var td = ty[r.type_cd] || '', cd = ca[ck] || '';
    W(padR(r.tran_id, 16) + ' ' + padR(aid, 11) + ' ' + padR(r.type_cd, 2) + '-' + padR(td, 15) + ' ' +
      padL(r.cat_cd, 4, '0') + '-' + padR(cd, 29) + ' ' + padR(r.source, 10) + '    ' + picEd(r.amtC, '-'));
    lines++; pageTot += r.amtC; acctTot += r.amtC; grand += r.amtC;
  }
  W(padR('Page Total', 11) + rep('.', 86) + picEd(pageTot, '+')); W(RULE);
  W(padR('Grand Total', 11) + rep('.', 86) + picEd(grand, '+'));
  output.tranrept_report = out;
  sys.push('TRANSACTIONS REPORTED : ' + lines);
  sys.push('END OF EXECUTION OF PROGRAM CBTRN03C');
  output.tranrept_sysout = sys;
}
main();
