// READ_UTILS — CBACT01C (account extract), CBACT02C/03C, CBCUS01C (file prints), CBTRN01C (daily tran check)
// input.step selects one program; with no step every program runs (each abends on its own missing inputs).
function printStep(prog, out, file) {
  missing = [];
  var L = req(file);
  if (missing.length) { abend(out); return; }
  var log = ['START OF EXECUTION OF PROGRAM ' + prog];
  for (var i = 0; i < L.length; i++) log.push(L[i]);
  log.push('END OF EXECUTION OF PROGRAM ' + prog);
  output[out + '_sysout'] = log;
}
function cbact01c() {
  missing = [];
  var A = req('acctdata.dat');
  if (missing.length) { abend('acctext'); return; }
  var o = [], arr = [], vb = [], log = ['START OF EXECUTION OF PROGRAM CBACT01C'];
  for (var i = 0; i < A.length; i++) {
    var a = parseAcct(A[i]);
    log.push(A[i]);
    o.push(acctOut(a, true));
    arr.push({ acct_id: a.acct_id, curr_bal_1: money(a.bal), curr_cyc_debit_1: money(a.db),
      curr_bal_2: null, curr_cyc_debit_2: null, curr_bal_3: null, curr_cyc_debit_3: null,
      curr_bal_4: null, curr_cyc_debit_4: null, curr_bal_5: null, curr_cyc_debit_5: null });
    vb.push({ acct_id: a.acct_id, active_status: a.active_status });
    vb.push({ acct_id: a.acct_id, curr_bal: money(a.bal), credit_limit: money(a.lim), reissue_yyyy: a.reissue_date.substring(0, 4) });
  }
  log.push('END OF EXECUTION OF PROGRAM CBACT01C');
  output.acctext_out = o; output.acctext_array = arr; output.acctext_vb = vb; output.acctext_sysout = log;
}
function cbtrn01c() {
  missing = [];
  var D = req('dailytran.dat'), X = req('cardxref.dat'), A = req('acctdata.dat');
  if (missing.length) { abend('dailycheck'); return; }
  var xr = {}, ac = {}, i;
  for (i = 0; i < X.length; i++) { var x = parseXref(X[i]); if (xr[x.card_num] === undefined) xr[x.card_num] = x; }
  for (i = 0; i < A.length; i++) { var a = parseAcct(A[i]); ac[a.acct_id] = true; }
  var log = ['START OF EXECUTION OF PROGRAM CBTRN01C'];
  for (i = 0; i < D.length; i++) {
    var t = parseTran(D[i]);
    log.push(D[i]);
    var xx = xr[t.card_num];
    if (!xx) log.push('CARD NUMBER ' + t.card_num + ' COULD NOT BE VERIFIED. SKIPPING TRANSACTION ID-' + t.tran_id);
    else if (!ac[xx.acct_id]) log.push('ACCOUNT ' + padL(xx.acct_id, 11, '0') + ' NOT FOUND');
  }
  log.push('END OF EXECUTION OF PROGRAM CBTRN01C');
  output.dailycheck_sysout = log;
}
function main() {
  var step = String(input.step || 'ALL').toUpperCase();
  var known = { CBACT01C: 1, CBACT02C: 1, CBACT03C: 1, CBCUS01C: 1, CBTRN01C: 1, ALL: 1 };
  if (!known[step]) { output.readutils_rc = '12'; output.readutils_sysout = ['ERROR: unknown step ' + step]; return; }
  if (step === 'ALL' || step === 'CBACT01C') cbact01c();
  if (step === 'ALL' || step === 'CBACT02C') printStep('CBACT02C', 'cardprint', 'carddata.dat');
  if (step === 'ALL' || step === 'CBACT03C') printStep('CBACT03C', 'xrefprint', 'cardxref.dat');
  if (step === 'ALL' || step === 'CBCUS01C') printStep('CBCUS01C', 'custprint', 'custdata.dat');
  if (step === 'ALL' || step === 'CBTRN01C') cbtrn01c();
}
main();
