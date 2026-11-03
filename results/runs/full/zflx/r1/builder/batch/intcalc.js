// INTCALC (CBACT04C) — wiki process-interest-calculation BR-01..BR-08
// (deployed with lib.js prepended; deployed copy uses a lib subset whose abend(step) takes no extra lines)
function main() {
  var T = req('tcatbal.dat'), A = req('acctdata.dat'), X = req('cardxref.dat'), G = req('discgrp.dat');
  if (missing.length) { abend('intcalc'); return; }
  var parm = (input.parm !== undefined && input.parm !== null && String(input.parm).trim() !== '') ? String(input.parm).trim()
    : RT.substring(0, 10).replace(/-/g, '') + '00';
  var accts = [], aIdx = {}, xByAcct = {}, rates = {}, i, log = ['START OF EXECUTION OF PROGRAM CBACT04C', 'PARM: ' + parm];
  for (i = 0; i < A.length; i++) { var a = parseAcct(A[i]); accts.push(a); if (aIdx[a.acct_id] === undefined) aIdx[a.acct_id] = a; }
  for (i = 0; i < X.length; i++) { var x = parseXref(X[i]); if (xByAcct[x.acct_id] === undefined) xByAcct[x.acct_id] = x; }
  for (i = 0; i < G.length; i++) { var g = parseDisc(G[i]); rates[g.group_id + '|' + g.type_cd + '|' + g.cat_cd] = g.rate; }
  var tcs = T.map(parseTcat);
  tcs.sort(function (p, q) { return p.acct_id - q.acct_id || (p.type_cd < q.type_cd ? -1 : p.type_cd > q.type_cd ? 1 : p.cat_cd - q.cat_cd); });
  var sys = [], sfx = 0, cur = null, curA = null, total = 0;
  function flush() { if (curA) { curA.bal += total; curA.cr = 0; curA.db = 0; } }
  for (i = 0; i < tcs.length; i++) {
    var tb = tcs[i];
    if (tb.acct_id !== cur) {
      if (cur !== null) flush();
      cur = tb.acct_id; total = 0; curA = aIdx[cur] || null;
      if (!curA) log.push('ACCOUNT NOT FOUND: ' + padL(cur, 11, '0'));
    }
    if (!curA) continue;
    var rate = rates[curA.group_id + '|' + tb.type_cd + '|' + tb.cat_cd];
    if (rate === undefined) rate = rates['DEFAULT|' + tb.type_cd + '|' + tb.cat_cd];
    if (rate === undefined) { log.push('DISCLOSURE GROUP RECORD MISSING: ' + curA.group_id + ' ' + tb.type_cd + ' ' + padL(tb.cat_cd, 4, '0')); rate = 0; }
    if (rate !== 0) {
      var interest = Math.trunc(tb.balC * rate / 120000);
      total += interest; sfx++;
      var xr = xByAcct[cur];
      sys.push({ tran_id: parm + padL(sfx, 6, '0'), type_cd: '01', cat_cd: 5, source: 'System', desc: 'Int. for a/c ' + padL(cur, 11, '0'),
        amt: money(interest), merchant_id: 0, merchant_name: '', merchant_city: '', merchant_zip: '', card_num: xr ? xr.card_num : '',
        orig_ts: RT26, proc_ts: RT26 });
    }
  }
  if (cur !== null) flush();
  log.push('INTEREST TRANSACTIONS WRITTEN: ' + sys.length);
  log.push('END OF EXECUTION OF PROGRAM CBACT04C');
  output.intcalc_systran = sys;
  output.intcalc_acctdata = accts.map(function (q) { return acctOut(q); });
  output.intcalc_sysout = log;
}
main();
