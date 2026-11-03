// The seven added batch steps (CONTRACT-BATCH-ADDED). Each section is the logic of one SCRIPT node,
// deployed after the shared helpers of _helpers.js (plus rt()).
function rt(s) { return String(s).replace(/\s+$/, ''); }
function abend(step, prog, file) { return { sys: ['START OF EXECUTION OF PROGRAM ' + prog, 'ERROR OPENING ' + file, 'ABENDING PROGRAM'], rc: '999' }; }
function byNum(k) { return function (p, q) { return p[k] - q[k]; }; }
function byStr(k) { return function (p, q) { return p[k] < q[k] ? -1 : p[k] > q[k] ? 1 : 0; }; }

// ===== acctext (CBACT01C) =====
(function () {
  var al = lines(inp(['acctdata.dat', 'acctdata'])), sys = ['START OF EXECUTION OF PROGRAM CBACT01C'], res;
  if (al === null) { sys.push('ERROR OPENING ACCTFILE'); sys.push('ABENDING PROGRAM'); res = { 'acctext_sysout.txt': sys, 'acctext_rc.txt': '999', returnCode: 999 }; }
  else {
    var L = [['ACCT-ID', 0, 11], ['ACCT-ACTIVE-STATUS', 11, 12], ['ACCT-CURR-BAL', 12, 24], ['ACCT-CREDIT-LIMIT', 24, 36], ['ACCT-CASH-CREDIT-LIMIT', 36, 48],
      ['ACCT-OPEN-DATE', 48, 58], ['ACCT-EXPIRAION-DATE', 58, 68], ['ACCT-REISSUE-DATE', 68, 78], ['ACCT-CURR-CYC-CREDIT', 78, 90], ['ACCT-CURR-CYC-DEBIT', 90, 102], ['ACCT-GROUP-ID', 112, 122]];
    var recs = al.map(function (r) { return { r: r, a: pAcct(r) }; }).sort(function (p, q) { return p.a.acct_id - q.a.acct_id; });
    var out = [], arr = [], vb = [];
    recs.forEach(function (e) {
      var r = pad(e.r, 300), a = e.a;
      L.forEach(function (f) { sys.push(rt(pad(f[0], 24) + ':' + r.substring(f[1], f[2]))); });
      sys.push(rep('-', 49)); sys.push(rt(e.r));
      var o = oAcct(a); delete o.addr_zip; if (a.curr_cyc_debit === 0) o.curr_cyc_debit = 2525; out.push(o);
      arr.push({ acct_id: a.acct_id, curr_bal_1: amt(a.curr_bal), curr_cyc_debit_1: 1005, curr_bal_2: amt(a.curr_bal), curr_cyc_debit_2: 1525,
        curr_bal_3: -1025, curr_cyc_debit_3: -2500, curr_bal_4: null, curr_cyc_debit_4: null, curr_bal_5: null, curr_cyc_debit_5: null });
      vb.push({ acct_id: a.acct_id, active_status: a.active_status });
      vb.push({ acct_id: a.acct_id, curr_bal: amt(a.curr_bal), credit_limit: amt(a.credit_limit), reissue_yyyy: a.reissue_date.substring(0, 4) });
    });
    sys.push('END OF EXECUTION OF PROGRAM CBACT01C');
    res = { 'acctext_out.json': out, 'acctext_array.json': arr, 'acctext_vb.json': vb, 'acctext_sysout.txt': sys, returnCode: 0 };
  }
  output.result = res;
})();

// ===== cardprint (CBACT02C) / xrefprint (CBACT03C) / custprint (CBCUS01C) =====
// generic: P = program, F = file key, D = DD name, K = key extractor, T = times each record is printed, S = step
function printStep(S, P, F, D, K, T) {
  var ll = lines(inp([F + '.dat', F])), sys = ['START OF EXECUTION OF PROGRAM ' + P], res;
  if (ll === null) { sys.push('ERROR OPENING ' + D); sys.push('ABENDING PROGRAM'); res = {}; res[S + '_sysout.txt'] = sys; res[S + '_rc.txt'] = '999'; res.returnCode = 999; return res; }
  ll.map(function (r) { return { r: r, k: K(r) }; }).sort(function (p, q) { return p.k < q.k ? -1 : p.k > q.k ? 1 : 0; })
    .forEach(function (e) { for (var i = 0; i < T; i++) sys.push(rt(e.r)); });
  sys.push('END OF EXECUTION OF PROGRAM ' + P);
  res = {}; res[S + '_sysout.txt'] = sys; res.returnCode = 0; return res;
}
// cardprint: output.result = printStep('cardprint', 'CBACT02C', 'carddata', 'CARDFILE', function (r) { return r.substring(0, 16); }, 1);
// xrefprint: output.result = printStep('xrefprint', 'CBACT03C', 'cardxref', 'XREFFILE', function (r) { return r.substring(0, 16); }, 2);
// custprint: output.result = printStep('custprint', 'CBCUS01C', 'custdata', 'CUSTFILE', function (r) { return r.substring(0, 9); }, 2);

// ===== dailycheck (CBTRN01C) =====
(function () {
  var dl = lines(inp(['dailytran.dat', 'dailytran'])), xl = lines(inp(['cardxref.dat', 'cardxref'])), al = lines(inp(['acctdata.dat', 'acctdata']));
  var sys = ['START OF EXECUTION OF PROGRAM CBTRN01C'], res;
  var miss = dl === null ? 'DALYTRAN' : xl === null ? 'XREFFILE' : al === null ? 'ACCTFILE' : null;
  if (miss) { sys.push('ERROR OPENING ' + miss); sys.push('ABENDING PROGRAM'); res = { 'dailycheck_sysout.txt': sys, 'dailycheck_rc.txt': '999', returnCode: 999 }; }
  else {
    var xr = {}, acc = {};
    xl.forEach(function (r) { var q = pXref(r); xr[q.card_num] = q; });
    al.forEach(function (r) { acc[n(r, 0, 11)] = true; });
    var check = function (t) {
      var q = xr[t.card_num];
      if (q) {
        sys.push('SUCCESSFUL READ OF XREF FILE'); sys.push('CARD NUMBER: ' + q.card_num);
        sys.push('ACCOUNT ID : ' + lpad(q.acct_id, 11, '0')); sys.push('CUSTOMER ID: ' + lpad(q.cust_id, 9, '0'));
        if (acc[q.acct_id]) sys.push('SUCCESSFUL READ OF ACCOUNT FILE');
        else { sys.push('INVALID ACCOUNT NUMBER FOUND'); sys.push('ACCOUNT ' + lpad(q.acct_id, 11, '0') + ' NOT FOUND'); }
      } else {
        sys.push('INVALID CARD NUMBER FOR XREF');
        sys.push('CARD NUMBER ' + pad(t.card_num, 16) + ' COULD NOT BE VERIFIED. SKIPPING TRANSACTION ID-' + t.tran_id);
      }
    };
    var last = null;
    dl.forEach(function (r) { sys.push(rt(r)); check(pTran(r)); last = r; });
    if (last !== null) check(pTran(last)); // legacy: the lookup runs once more on the last record at end of file
    sys.push('END OF EXECUTION OF PROGRAM CBTRN01C');
    res = { 'dailycheck_sysout.txt': sys, returnCode: 0 };
  }
  output.result = res;
})();

// ===== export (CBEXPORT) =====
(function () {
  var cl = lines(inp(['custdata.dat', 'custdata'])), al = lines(inp(['acctdata.dat', 'acctdata'])), xl = lines(inp(['cardxref.dat', 'cardxref'])),
      tl = lines(inp(['transact.dat', 'transact'])), dl = lines(inp(['carddata.dat', 'carddata']));
  var sys = ['CBEXPORT: Starting Customer Data Export'], res;
  var miss = cl === null ? 'CUSTFILE' : al === null ? 'ACCTFILE' : xl === null ? 'XREFFILE' : tl === null ? 'TRANSACT' : dl === null ? 'CARDFILE' : null;
  if (miss) { sys.push('ERROR OPENING ' + miss); sys.push('ABENDING PROGRAM'); res = { 'export_sysout.txt': sys, 'export_rc.txt': '999', returnCode: 999 }; }
  else {
    var TS = RUN_TS + '.00', seq = 0, out = [];
    var put = function (ty, o) { var e = { rec_type: ty, seq: ++seq, branch_id: '0001', region_code: 'NORTH', timestamp: TS }; for (var k in o) e[k] = o[k]; out.push(e); };
    var C = cl.map(pCust).sort(byNum('cust_id')), A = al.map(pAcct).sort(byNum('acct_id')), X = xl.map(pXref).sort(byStr('card_num')),
        T = tl.map(pTran).sort(byStr('tran_id')), D = dl.map(pCard).sort(byStr('card_num'));
    C.forEach(function (c) { c.ssn = null; put('C', c); });
    A.forEach(function (a) { put('A', oAcct(a)); });
    X.forEach(function (q) { put('X', q); });
    T.forEach(function (t) { put('T', oTran(t)); });
    D.forEach(function (d) { put('D', d); });
    sys.push('CBEXPORT: Customers Exported: ' + C.length); sys.push('CBEXPORT: Accounts Exported: ' + A.length);
    sys.push('CBEXPORT: XRefs Exported: ' + X.length); sys.push('CBEXPORT: Transactions Exported: ' + T.length);
    sys.push('CBEXPORT: Cards Exported: ' + D.length); sys.push('CBEXPORT: Total Records Exported: ' + out.length);
    sys.push('CBEXPORT: Export completed');
    res = { 'export.json': out, 'export_sysout.txt': sys, returnCode: 0 };
  }
  output.result = res;
})();

// ===== import (CBIMPORT) =====
(function () {
  var v = inp(['export.json', 'export']), sys = ['CBIMPORT: Starting Customer Data Import'], res;
  if (v === null) { sys.push('ERROR OPENING EXPFILE'); sys.push('ABENDING PROGRAM'); res = { 'import_sysout.txt': sys, 'import_rc.txt': '999', returnCode: 999 }; }
  else {
    var recs = typeof v === 'string' ? JSON.parse(v) : JSON.parse(JSON.stringify(v));
    var M = { C: [], A: [], X: [], T: [], D: [] }, E = [], META = { rec_type: 1, seq: 1, branch_id: 1, region_code: 1, timestamp: 1 };
    recs.forEach(function (r) {
      var t = r.rec_type === undefined || r.rec_type === null ? '' : String(r.rec_type);
      if (M[t]) { var o = {}; for (var k in r) if (!META[k]) o[k] = r[k]; M[t].push(o); }
      else E.push({ rec_type: t, seq: r.seq === undefined ? null : r.seq, message: 'Unknown record type: ' + t });
    });
    sys.push('CBIMPORT: Total Records Read: ' + recs.length);
    sys.push('CBIMPORT: Customers Imported: ' + M.C.length); sys.push('CBIMPORT: Accounts Imported: ' + M.A.length);
    sys.push('CBIMPORT: XRefs Imported: ' + M.X.length); sys.push('CBIMPORT: Transactions Imported: ' + M.T.length);
    sys.push('CBIMPORT: Cards Imported: ' + M.D.length); sys.push('CBIMPORT: Errors Found: ' + E.length);
    sys.push('CBIMPORT: Import completed');
    res = { 'import_customers.json': M.C, 'import_accounts.json': M.A, 'import_card_xref.json': M.X, 'import_transactions.json': M.T,
      'import_cards.json': M.D, 'import_errors.json': E, 'import_sysout.txt': sys, returnCode: 0 };
  }
  output.result = res;
})();
