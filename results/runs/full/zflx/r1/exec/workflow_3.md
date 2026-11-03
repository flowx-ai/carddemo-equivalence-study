# Workflow: batch_intcalc

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** INTCALC (CBACT04C) interest calculation. Input files {tcatbal.dat, acctdata.dat, cardxref.dat, discgrp.dat}, optional parm (default RUN_TIMESTAMP date + "00"). Output intcalc_systran, intcalc_acctdata.

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae8632b3695c563ea51ab45 | <uuid> | (0, 0) | → INTCALC (seq:<uuid>) |
| INTCALC | SCRIPT | 6ae863353695c563ea51ab50 | <uuid> | (500, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae8633e3695c563ea51ab56 | <uuid> | (1000, 0) | — |

## Systems
_(none)_

## Scripts

### INTCALC (SCRIPT, id=6ae863353695c563ea51ab50)

```javascript
// ---- shared batch library (subset of batch/lib.js) ----
var cfg = (typeof additionalData !== 'undefined' && additionalData.applicationConfiguration) ? additionalData.applicationConfiguration : {};
var RT = String(cfg.RUN_TIMESTAMP || '2022-07-18 10:00:00');
var RT26 = (RT + '.000000').substring(0, 26);
function padR(s, n) { s = (s === null || s === undefined) ? '' : String(s); while (s.length < n) s += ' '; return s.substring(0, n); }
function padL(s, n, c) { s = String(s); c = c || ' '; while (s.length < n) s = c + s; return s.substring(s.length - n); }
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
function parseAcct(l) {
  l = padR(l, 300);
  return { acct_id: zn(fld(l, 1, 11)), active_status: rt(fld(l, 12, 12)), bal: zn(fld(l, 13, 24), 2), lim: zn(fld(l, 25, 36), 2),
    cash: zn(fld(l, 37, 48), 2), open_date: rt(fld(l, 49, 58)), expiration_date: rt(fld(l, 59, 68)), reissue_date: rt(fld(l, 69, 78)),
    cr: zn(fld(l, 79, 90), 2), db: zn(fld(l, 91, 102), 2), addr_zip: rt(fld(l, 103, 112)), group_id: rt(fld(l, 113, 122)) };
}
function acctOut(a) {
  return { acct_id: a.acct_id, active_status: a.active_status, curr_bal: money(a.bal), credit_limit: money(a.lim),
    cash_credit_limit: money(a.cash), open_date: a.open_date, expiration_date: a.expiration_date, reissue_date: a.reissue_date,
    curr_cyc_credit: money(a.cr), curr_cyc_debit: money(a.db), addr_zip: a.addr_zip, group_id: a.group_id };
}
function parseXref(l) { l = padR(l, 50); return { card_num: rt(fld(l, 1, 16)), cust_id: zn(fld(l, 17, 25)), acct_id: zn(fld(l, 26, 36)) }; }
function parseTcat(l) { l = padR(l, 50); return { acct_id: zn(fld(l, 1, 11)), type_cd: rt(fld(l, 12, 13)), cat_cd: zn(fld(l, 14, 17)), balC: zn(fld(l, 18, 28), 2) }; }
function parseDisc(l) { l = padR(l, 50); return { group_id: rt(fld(l, 1, 10)), type_cd: rt(fld(l, 11, 12)), cat_cd: zn(fld(l, 13, 16)), rate: zn(fld(l, 17, 22), 2) }; }
function abend(step) {
  output[step + '_rc'] = '12';
  output[step + '_sysout'] = ['ERROR: required input file missing: ' + missing.join(', '), 'ABENDING PROGRAM'];
}
// ---- end library ----
// INTCALC (CBACT04C) — wiki process-interest-calculation BR-01..BR-08
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
  output.intcalc_acctdata = accts.map(acctOut);
  output.intcalc_sysout = log;
}
main();
```

_(server: 93 ms, 1 API call, 90 ms in API)_
