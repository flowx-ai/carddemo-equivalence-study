// POSTTRAN (CBTRN02C) — daily transaction posting. Prepend _helpers.js.
var dl = lines(inp(['dailytran.dat', 'dailytran'])), al = lines(inp(['acctdata.dat', 'acctdata'])),
    xl = lines(inp(['cardxref.dat', 'cardxref'])), cl = lines(inp(['tcatbal.dat', 'tcatbal']));
var sys = ['START OF EXECUTION OF PROGRAM CBTRN02C'], res = {};
var miss = dl === null ? 'DALYTRAN' : al === null ? 'ACCTFILE' : xl === null ? 'XREFFILE' : cl === null ? 'TCATBALF' : null;
if (miss) {
  sys.push('ERROR OPENING ' + miss); sys.push('ABENDING PROGRAM');
  res = { 'posttran_sysout.txt': sys, 'posttran_rc.txt': '999', returnCode: 999 };
} else {
  var accts = [], aIdx = {}, xr = {}, cats = [], cIdx = {}, posted = [], rej = [];
  al.forEach(function (r) { var a = pAcct(r); aIdx[a.acct_id] = accts.length; accts.push(a); });
  xl.forEach(function (r) { var q = pXref(r); xr[q.card_num] = q; });
  cl.forEach(function (r) { var c = { acct_id: n(r, 0, 11), type_cd: x(r, 11, 13), cat_cd: n(r, 13, 17), bal: zc(r, 17, 28) }; cIdx[c.acct_id + '|' + c.type_cd + '|' + c.cat_cd] = cats.length; cats.push(c); });
  dl.forEach(function (r) {
    var t = pTran(r), reason = 0, desc = '', q = xr[t.card_num], a = null;
    if (!q) { reason = 100; desc = 'INVALID CARD NUMBER FOUND'; }
    else if (aIdx[q.acct_id] === undefined) { reason = 101; desc = 'ACCOUNT RECORD NOT FOUND'; }
    else {
      a = accts[aIdx[q.acct_id]];
      if (!(a.credit_limit >= a.curr_cyc_credit - a.curr_cyc_debit + t.amt)) { reason = 102; desc = 'OVERLIMIT TRANSACTION'; }
      if (!(a.expiration_date >= t.orig_ts.substring(0, 10))) { reason = 103; desc = 'TRANSACTION RECEIVED AFTER ACCT EXPIRATION'; }
    }
    if (reason === 0) {
      var key = q.acct_id + '|' + t.type_cd + '|' + t.cat_cd;
      if (cIdx[key] === undefined) { cIdx[key] = cats.length; cats.push({ acct_id: q.acct_id, type_cd: t.type_cd, cat_cd: t.cat_cd, bal: t.amt }); }
      else cats[cIdx[key]].bal += t.amt;
      a.curr_bal += t.amt;
      if (t.amt >= 0) a.curr_cyc_credit += t.amt; else a.curr_cyc_debit += t.amt;
      t.proc_ts = DB2_TS;
      posted.push(oTran(t));
    } else {
      var o = oTran(t); o.reason = reason; o.reason_desc = desc; rej.push(o);
    }
  });
  accts.sort(function (p, q) { return p.acct_id - q.acct_id; });
  cats.sort(function (p, q) { return p.acct_id !== q.acct_id ? p.acct_id - q.acct_id : p.type_cd !== q.type_cd ? (p.type_cd < q.type_cd ? -1 : 1) : p.cat_cd - q.cat_cd; });
  var rc = rej.length > 0 ? 4 : 0;
  sys.push('TRANSACTIONS PROCESSED :' + lpad(dl.length, 9, '0'));
  sys.push('TRANSACTIONS REJECTED  :' + lpad(rej.length, 9, '0'));
  sys.push('END OF EXECUTION OF PROGRAM CBTRN02C');
  res = {
    'posttran_transact.json': posted, 'posttran_dalyrejs.json': rej,
    'posttran_acctdata.json': accts.map(oAcct),
    'posttran_tcatbal.json': cats.map(function (c) { return { acct_id: c.acct_id, type_cd: c.type_cd, cat_cd: c.cat_cd, bal: amt(c.bal) }; }),
    'posttran_sysout.txt': sys, returnCode: rc
  };
  if (rc) res['posttran_rc.txt'] = String(rc);
}
output.result = res;
