// INTCALC (CBACT04C) — interest calculation. Prepend _helpers.js.
var PARM = String(inp(['parm', 'PARM', 'interestRunDate']) || '2022071800');
var tl = lines(inp(['tcatbal.dat', 'tcatbal'])), al = lines(inp(['acctdata.dat', 'acctdata'])),
    xl = lines(inp(['cardxref.dat', 'cardxref'])), gl = lines(inp(['discgrp.dat', 'discgrp']));
var sys = ['START OF EXECUTION OF PROGRAM CBACT04C'], res = {};
var miss = tl === null ? 'TCATBALF' : xl === null ? 'XREFFILE' : gl === null ? 'DISCGRP' : al === null ? 'ACCTFILE' : null;
if (miss) {
  sys.push('ERROR OPENING ' + miss); sys.push('ABENDING PROGRAM');
  res = { 'intcalc_sysout.txt': sys, 'intcalc_rc.txt': '999', returnCode: 999 };
} else {
  var accts = [], aIdx = {}, xByAcct = {}, rate = {}, cats = [], tx = [], suffix = 0;
  al.forEach(function (r) { var a = pAcct(r); aIdx[a.acct_id] = accts.length; accts.push(a); });
  xl.map(pXref).sort(function (p, q) { return p.card_num < q.card_num ? -1 : p.card_num > q.card_num ? 1 : 0; })
    .forEach(function (q) { if (!xByAcct[q.acct_id]) xByAcct[q.acct_id] = q; });
  gl.forEach(function (r) { rate[x(r, 0, 10) + '|' + x(r, 10, 12) + '|' + n(r, 12, 16)] = zc(r, 16, 22); });
  tl.forEach(function (r) { cats.push({ acct_id: n(r, 0, 11), type_cd: x(r, 11, 13), cat_cd: n(r, 13, 17), bal: zc(r, 17, 28) }); });
  cats.sort(function (p, q) { return p.acct_id !== q.acct_id ? p.acct_id - q.acct_id : p.type_cd !== q.type_cd ? (p.type_cd < q.type_cd ? -1 : 1) : p.cat_cd - q.cat_cd; });
  var last = null, total = 0, acct = null, xref = null;
  var upd = function () { if (acct) { acct.curr_bal += total; acct.curr_cyc_credit = 0; acct.curr_cyc_debit = 0; } };
  cats.forEach(function (c) {
    if (c.acct_id !== last) {
      if (last !== null) upd();
      total = 0; last = c.acct_id;
      acct = aIdx[c.acct_id] === undefined ? null : accts[aIdx[c.acct_id]];
      xref = xByAcct[c.acct_id] || null;
      if (!acct) sys.push('ACCOUNT NOT FOUND: ' + lpad(c.acct_id, 11, '0'));
      if (!xref) sys.push('CARD XREF NOT FOUND FOR ACCOUNT: ' + lpad(c.acct_id, 11, '0'));
    }
    var grp = acct ? acct.group_id : '';
    var r = rate[grp + '|' + c.type_cd + '|' + c.cat_cd];
    if (r === undefined) r = rate['DEFAULT|' + c.type_cd + '|' + c.cat_cd];
    if (r === undefined) { sys.push('DISCLOSURE GROUP RECORD MISSING: ' + grp + ' ' + c.type_cd + ' ' + lpad(c.cat_cd, 4, '0')); r = 0; }
    if (r !== 0) {
      // bal (cents) * rate (hundredths of %) / 1200 -> cents; COBOL COMPUTE truncation
      var raw = c.bal * r / 120000, intc = raw < 0 ? -Math.floor(-raw + 1e-9) : Math.floor(raw + 1e-9);
      total += intc; suffix++;
      tx.push({ tran_id: PARM + lpad(suffix, 6, '0'), type_cd: '01', cat_cd: 5, source: 'System',
        desc: 'Int. for a/c ' + lpad(c.acct_id, 11, '0'), amt: amt(intc), merchant_id: 0, merchant_name: '',
        merchant_city: '', merchant_zip: '', card_num: xref ? xref.card_num : '', orig_ts: DB2_TS, proc_ts: DB2_TS });
    }
  });
  if (last !== null) upd();
  accts.sort(function (p, q) { return p.acct_id - q.acct_id; });
  sys.push('END OF EXECUTION OF PROGRAM CBACT04C');
  res = { 'intcalc_systran.json': tx, 'intcalc_acctdata.json': accts.map(oAcct), 'intcalc_sysout.txt': sys, returnCode: 0 };
}
output.result = res;
