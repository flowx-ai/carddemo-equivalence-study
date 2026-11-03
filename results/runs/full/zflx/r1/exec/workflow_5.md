# Workflow: batch_export_import

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** CBEXPORT / CBIMPORT branch export-import. step = CBEXPORT (files custdata/acctdata/cardxref/transact/carddata .dat -> export, export_sysout) or CBIMPORT (files export.json -> import_*, import_errors, import_sysout).

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae863313695c563ea51ab4f | <uuid> | (0, 0) | → EXPORT_IMPORT (seq:<uuid>) |
| EXPORT_IMPORT | SCRIPT | 6ae8633a3695c563ea51ab55 | <uuid> | (500, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae863433695c563ea51ab5b | <uuid> | (1000, 0) | — |

## Systems
_(none)_

## Scripts

### EXPORT_IMPORT (SCRIPT, id=6ae8633a3695c563ea51ab55)

```javascript
// ---- shared batch library (copied at the top of every batch_* SCRIPT node) ----
var cfg = (typeof additionalData !== 'undefined' && additionalData.applicationConfiguration) ? additionalData.applicationConfiguration : {};
var RT = String(cfg.RUN_TIMESTAMP || '2022-07-18 10:00:00');
var RT26 = (RT + '.000000').substring(0, 26);
var SP = '                                                                                                                                              ';
function padR(s, n) { s = (s === null || s === undefined) ? '' : String(s); while (s.length < n) s += SP.substring(0, Math.min(SP.length, n - s.length)); return s.substring(0, n); }
function padL(s, n, c) { s = String(s); c = c || ' '; while (s.length < n) s = c + s; return s.substring(s.length - n); }
function rep(c, n) { var s = ''; for (var i = 0; i < n; i++) s += c; return s; }
function rt(s) { return String(s).replace(/\s+$/, ''); }
function fld(l, a, b) { return l.substring(a - 1, b); }
function inFile(name) {
  var v = null, f = input.files;
  if (f !== undefined && f !== null && f[name] !== undefined && f[name] !== null) v = f[name];
  else { var k = name.replace(/\./g, '_'); if (input[k] !== undefined && input[k] !== null) v = input[k]; }
  if (v === null) return null;
  var lines = [];
  if (typeof v === 'string' || v instanceof String) lines = String(v).replace(/\r/g, '').split('\n');
  else { for (var i = 0; i < v.length; i++) lines.push(String(v[i]).replace(/[\r\n]/g, '')); }
  var out = [];
  for (var j = 0; j < lines.length; j++) if (lines[j].replace(/\s+/g, '') !== '') out.push(lines[j]);
  return out;
}
var missing = [];
function req(n) { var x = inFile(n); if (x === null) { missing.push(n); return []; } return x; }
function zn(str, dec) {
  dec = dec || 0; var s = String(str).trim(); if (s === '') return 0;
  var neg = false;
  if (s.charAt(0) === '-') { neg = true; s = s.substring(1); } else if (s.charAt(0) === '+') s = s.substring(1);
  var last = s.charAt(s.length - 1);
  if (last === '-') { neg = true; s = s.substring(0, s.length - 1); }
  else if (last === '+') s = s.substring(0, s.length - 1);
  else {
    var i = '{ABCDEFGHI'.indexOf(last);
    if (i >= 0) s = s.substring(0, s.length - 1) + i;
    else { i = '}JKLMNOPQR'.indexOf(last); if (i < 0) i = 'pqrstuvwxy'.indexOf(last);
      if (i >= 0) { s = s.substring(0, s.length - 1) + i; neg = true; } }
  }
  var n;
  if (s.indexOf('.') >= 0) n = Math.round(parseFloat(s.replace(/[^0-9.]/g, '')) * Math.pow(10, dec));
  else n = parseInt(s.replace(/[^0-9]/g, '') || '0', 10);
  if (isNaN(n)) n = 0;
  return neg ? -n : n;
}
function money(c) { return c / 100; }
function parseTran(l) {
  l = padR(l, 350);
  return { tran_id: rt(fld(l, 1, 16)), type_cd: rt(fld(l, 17, 18)), cat_cd: zn(fld(l, 19, 22)), source: rt(fld(l, 23, 32)),
    desc: rt(fld(l, 33, 132)), amtC: zn(fld(l, 133, 143), 2), merchant_id: zn(fld(l, 144, 152)), merchant_name: rt(fld(l, 153, 202)),
    merchant_city: rt(fld(l, 203, 252)), merchant_zip: rt(fld(l, 253, 262)), card_num: rt(fld(l, 263, 278)),
    orig_ts: rt(fld(l, 279, 304)), proc_ts: rt(fld(l, 305, 330)) };
}
function tranOut(t) {
  return { tran_id: t.tran_id, type_cd: t.type_cd, cat_cd: t.cat_cd, source: t.source, desc: t.desc, amt: money(t.amtC),
    merchant_id: t.merchant_id, merchant_name: t.merchant_name, merchant_city: t.merchant_city, merchant_zip: t.merchant_zip,
    card_num: t.card_num, orig_ts: t.orig_ts, proc_ts: t.proc_ts };
}
function parseAcct(l) {
  l = padR(l, 300);
  return { acct_id: zn(fld(l, 1, 11)), active_status: rt(fld(l, 12, 12)), bal: zn(fld(l, 13, 24), 2), lim: zn(fld(l, 25, 36), 2),
    cash: zn(fld(l, 37, 48), 2), open_date: rt(fld(l, 49, 58)), expiration_date: rt(fld(l, 59, 68)), reissue_date: rt(fld(l, 69, 78)),
    cr: zn(fld(l, 79, 90), 2), db: zn(fld(l, 91, 102), 2), addr_zip: rt(fld(l, 103, 112)), group_id: rt(fld(l, 113, 122)), line: l };
}
function acctOut(a, noZip) {
  var o = { acct_id: a.acct_id, active_status: a.active_status, curr_bal: money(a.bal), credit_limit: money(a.lim),
    cash_credit_limit: money(a.cash), open_date: a.open_date, expiration_date: a.expiration_date, reissue_date: a.reissue_date,
    curr_cyc_credit: money(a.cr), curr_cyc_debit: money(a.db) };
  if (!noZip) o.addr_zip = a.addr_zip;
  o.group_id = a.group_id;
  return o;
}
function parseXref(l) { l = padR(l, 50); return { card_num: rt(fld(l, 1, 16)), cust_id: zn(fld(l, 17, 25)), acct_id: zn(fld(l, 26, 36)) }; }
function parseCard(l) { l = padR(l, 150); return { card_num: rt(fld(l, 1, 16)), acct_id: zn(fld(l, 17, 27)), cvv_cd: zn(fld(l, 28, 30)), embossed_name: rt(fld(l, 31, 80)), expiration_date: rt(fld(l, 81, 90)), active_status: rt(fld(l, 91, 91)) }; }
function parseCust(l) {
  l = padR(l, 500);
  return { cust_id: zn(fld(l, 1, 9)), first_name: rt(fld(l, 10, 34)), middle_name: rt(fld(l, 35, 59)), last_name: rt(fld(l, 60, 84)),
    addr_line_1: rt(fld(l, 85, 134)), addr_line_2: rt(fld(l, 135, 184)), addr_line_3: rt(fld(l, 185, 234)), addr_state_cd: rt(fld(l, 235, 236)),
    addr_country_cd: rt(fld(l, 237, 239)), addr_zip: rt(fld(l, 240, 249)), phone_num_1: rt(fld(l, 250, 264)), phone_num_2: rt(fld(l, 265, 279)),
    ssn: zn(fld(l, 280, 288)), govt_issued_id: rt(fld(l, 289, 308)), dob: rt(fld(l, 309, 318)), eft_account_id: rt(fld(l, 319, 328)),
    pri_card_holder_ind: rt(fld(l, 329, 329)), fico_credit_score: zn(fld(l, 330, 332)) };
}
function abend(step, extra) {
  output[step + '_rc'] = '12';
  var s = (extra || []).slice(0);
  s.push('ERROR: required input file missing: ' + missing.join(', '));
  s.push('ABENDING PROGRAM');
  output[step + '_sysout'] = s;
}
// ---- end library ----
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
```

_(server: 194 ms, 1 API call, 191 ms in API)_
