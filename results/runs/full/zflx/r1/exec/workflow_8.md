# Workflow: batch_readutils

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** Read/print utilities: step = CBACT01C (acctext_*), CBACT02C (cardprint_sysout), CBACT03C (xrefprint_sysout), CBCUS01C (custprint_sysout), CBTRN01C (dailycheck_sysout). Input files as fixed-width text.

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae863303695c563ea51ab4d | <uuid> | (0, 0) | → READ_UTILS (seq:<uuid>) |
| READ_UTILS | SCRIPT | 6ae863393695c563ea51ab54 | <uuid> | (500, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae863423695c563ea51ab5a | <uuid> | (1000, 0) | — |

## Systems
_(none)_

## Scripts

### READ_UTILS (SCRIPT, id=6ae863393695c563ea51ab54)

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
function abend(step, extra) {
  output[step + '_rc'] = '12';
  var s = (extra || []).slice(0);
  s.push('ERROR: required input file missing: ' + missing.join(', '));
  s.push('ABENDING PROGRAM');
  output[step + '_sysout'] = s;
}
// ---- end library ----
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
```

_(server: 95 ms, 1 API call, 92 ms in API)_
