// POSTTRAN (CBTRN02C) — wiki process-daily-transaction-posting BR-01..BR-07
function main() {
  var D = req('dailytran.dat'), A = req('acctdata.dat'), X = req('cardxref.dat'), T = inFile('tcatbal.dat') || [];
  if (missing.length) { abend('posttran'); return; }
  var accts = [], aIdx = {}, xr = {}, tc = {}, i;
  for (i = 0; i < A.length; i++) { var a = parseAcct(A[i]); accts.push(a); if (aIdx[a.acct_id] === undefined) aIdx[a.acct_id] = a; }
  for (i = 0; i < X.length; i++) { var x = parseXref(X[i]); if (xr[x.card_num] === undefined) xr[x.card_num] = x; }
  for (i = 0; i < T.length; i++) { var tb = parseTcat(T[i]); tc[tb.acct_id + '|' + tb.type_cd + '|' + tb.cat_cd] = tb; }
  var posted = [], rejs = [];
  for (i = 0; i < D.length; i++) {
    var t = parseTran(D[i]), reason = 0, desc = '', xx = xr[t.card_num], ac = null;
    if (!xx) { reason = 100; desc = 'INVALID CARD NUMBER FOUND'; }
    else {
      ac = aIdx[xx.acct_id];
      if (!ac) { reason = 101; desc = 'ACCOUNT RECORD NOT FOUND'; }
      else {
        if (ac.cr - ac.db + t.amtC > ac.lim) { reason = 102; desc = 'OVERLIMIT TRANSACTION'; }
        if (ac.expiration_date < t.orig_ts.substring(0, 10)) { reason = 103; desc = 'TRANSACTION RECEIVED AFTER ACCT EXPIRATION'; }
      }
    }
    if (reason) { var r = tranOut(t); r.reason = reason; r.reason_desc = desc; rejs.push(r); continue; }
    t.proc_ts = RT26;
    var k = xx.acct_id + '|' + t.type_cd + '|' + t.cat_cd;
    if (tc[k]) tc[k].balC += t.amtC; else tc[k] = { acct_id: xx.acct_id, type_cd: t.type_cd, cat_cd: t.cat_cd, balC: t.amtC };
    ac.bal += t.amtC;
    if (t.amtC >= 0) ac.cr += t.amtC; else ac.db += t.amtC;
    posted.push(tranOut(t));
  }
  var keys = Object.keys(tc).map(function (q) { return tc[q]; });
  keys.sort(function (p, q) { return p.acct_id - q.acct_id || (p.type_cd < q.type_cd ? -1 : p.type_cd > q.type_cd ? 1 : p.cat_cd - q.cat_cd); });
  output.posttran_transact = posted;
  output.posttran_dalyrejs = rejs;
  output.posttran_acctdata = accts.map(function (q) { return acctOut(q); });
  output.posttran_tcatbal = keys.map(function (q) { return { acct_id: q.acct_id, type_cd: q.type_cd, cat_cd: q.cat_cd, bal: money(q.balC) }; });
  output.posttran_sysout = ['START OF EXECUTION OF PROGRAM CBTRN02C', 'TRANSACTIONS PROCESSED :' + padL(D.length, 9, '0'),
    'TRANSACTIONS REJECTED  :' + padL(rejs.length, 9, '0'), 'END OF EXECUTION OF PROGRAM CBTRN02C'];
  if (rejs.length) output.posttran_rc = '4';
}
main();
