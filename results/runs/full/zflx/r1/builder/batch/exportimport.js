// EXPORT_IMPORT — CBEXPORT (multi-record branch export) / CBIMPORT (split by record type)
var BRANCH = '0001', REGION = 'NORTH';
var F = {
  C: ['cust_id', 'first_name', 'middle_name', 'last_name', 'addr_line_1', 'addr_line_2', 'addr_line_3', 'addr_state_cd', 'addr_country_cd',
    'addr_zip', 'phone_num_1', 'phone_num_2', 'ssn', 'govt_issued_id', 'dob', 'eft_account_id', 'pri_card_holder_ind', 'fico_credit_score'],
  A: ['acct_id', 'active_status', 'curr_bal', 'credit_limit', 'cash_credit_limit', 'open_date', 'expiration_date', 'reissue_date',
    'curr_cyc_credit', 'curr_cyc_debit', 'addr_zip', 'group_id'],
  X: ['card_num', 'cust_id', 'acct_id'],
  T: ['tran_id', 'type_cd', 'cat_cd', 'source', 'desc', 'amt', 'merchant_id', 'merchant_name', 'merchant_city', 'merchant_zip',
    'card_num', 'orig_ts', 'proc_ts'],
  D: ['card_num', 'acct_id', 'cvv_cd', 'embossed_name', 'expiration_date', 'active_status']
};
function cbexport() {
  missing = [];
  var C = req('custdata.dat'), A = req('acctdata.dat'), X = req('cardxref.dat'), T = req('transact.dat'), D = req('carddata.dat');
  if (missing.length) { abend('export'); return; }
  var out = [], seq = 0, cnt = {};
  function put(type, rec) {
    seq++; cnt[type] = (cnt[type] || 0) + 1;
    var o = { rec_type: type, seq: seq, timestamp: RT, branch_id: BRANCH, region_code: REGION };
    for (var k = 0; k < F[type].length; k++) o[F[type][k]] = rec[F[type][k]];
    out.push(o);
  }
  var i;
  for (i = 0; i < C.length; i++) put('C', parseCust(C[i]));
  for (i = 0; i < A.length; i++) put('A', acctOut(parseAcct(A[i])));
  for (i = 0; i < X.length; i++) put('X', parseXref(X[i]));
  for (i = 0; i < T.length; i++) put('T', tranOut(parseTran(T[i])));
  for (i = 0; i < D.length; i++) put('D', parseCard(D[i]));
  output.export = out;
  output.export_sysout = ['START OF EXECUTION OF PROGRAM CBEXPORT',
    'CUSTOMER RECORDS EXPORTED    : ' + (cnt.C || 0), 'ACCOUNT RECORDS EXPORTED     : ' + (cnt.A || 0),
    'XREF RECORDS EXPORTED        : ' + (cnt.X || 0), 'TRANSACTION RECORDS EXPORTED : ' + (cnt.T || 0),
    'CARD RECORDS EXPORTED        : ' + (cnt.D || 0), 'TOTAL RECORDS EXPORTED       : ' + seq,
    'END OF EXECUTION OF PROGRAM CBEXPORT'];
}
function cbimport() {
  var v = null;
  if (input.files && input.files['export.json'] !== undefined && input.files['export.json'] !== null) v = input.files['export.json'];
  else if (input.export_json !== undefined && input.export_json !== null) v = input.export_json;
  else if (input['export'] !== undefined && input['export'] !== null) v = input['export'];
  if (v === null) { missing = ['export.json']; abend('import'); return; }
  if (typeof v === 'string' || v instanceof String) v = JSON.parse(String(v));
  var tgt = { C: [], A: [], X: [], T: [], D: [] }, errs = [], cnt = { C: 0, A: 0, X: 0, T: 0, D: 0 };
  for (var i = 0; i < v.length; i++) {
    var r = v[i], ty = String(r.rec_type === undefined || r.rec_type === null ? '' : r.rec_type);
    var sq = r.seq === undefined || r.seq === null ? null : parseInt(String(r.seq), 10);
    if (!F[ty]) { errs.push({ rec_type: ty, seq: sq, message: 'Unknown record type: ' + ty }); continue; }
    var o = {};
    for (var k = 0; k < F[ty].length; k++) { var f = F[ty][k]; o[f] = r[f] === undefined ? null : r[f]; }
    tgt[ty].push(o); cnt[ty]++;
  }
  output.import_customers = tgt.C; output.import_accounts = tgt.A; output.import_card_xref = tgt.X;
  output.import_transactions = tgt.T; output.import_cards = tgt.D; output.import_errors = errs;
  output.import_sysout = ['START OF EXECUTION OF PROGRAM CBIMPORT', 'RECORDS READ                 : ' + v.length,
    'CUSTOMER RECORDS IMPORTED    : ' + cnt.C, 'ACCOUNT RECORDS IMPORTED     : ' + cnt.A,
    'XREF RECORDS IMPORTED        : ' + cnt.X, 'TRANSACTION RECORDS IMPORTED : ' + cnt.T,
    'CARD RECORDS IMPORTED        : ' + cnt.D, 'ERROR RECORDS                : ' + errs.length,
    'END OF EXECUTION OF PROGRAM CBIMPORT'];
}
function main() {
  var step = String(input.step || '').toUpperCase();
  if (step === 'CBEXPORT') cbexport();
  else if (step === 'CBIMPORT') cbimport();
  else { output.export_import_rc = '12'; output.export_import_sysout = ['ERROR: input.step must be CBEXPORT or CBIMPORT']; }
}
main();
