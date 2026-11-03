# Workflow: batch_tranrept

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** TRANREPT (CBTRN03C) daily transaction report. Input files {transact.dat, cardxref.dat, trantype.dat, trancatg.dat}, start_date, end_date (default 2022-07-01..2022-07-31). Output tranrept_report (133-col lines).

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae8632e3695c563ea51ab4b | <uuid> | (0, 0) | → TRANREPT (seq:<uuid>) |
| TRANREPT | SCRIPT | 6ae863383695c563ea51ab53 | <uuid> | (500, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae863413695c563ea51ab59 | <uuid> | (1000, 0) | — |

## Systems
_(none)_

## Scripts

### TRANREPT (SCRIPT, id=6ae863383695c563ea51ab53)

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
function picEd(c, sg) {
  if (c === 0) return rep(' ', 15);
  var a = Math.abs(c), ip = Math.floor(a / 100), dp = a % 100;
  var d = padL(ip, 9, '0'), s = '', started = false;
  for (var i = 0; i < 9; i++) {
    if (i === 3 || i === 6) s += started ? ',' : ' ';
    var ch = d.charAt(i); if (ch !== '0') started = true;
    s += started ? ch : ' ';
  }
  var sign = c < 0 ? '-' : (sg === '+' ? '+' : ' ');
  return sign + s + '.' + padL(dp, 2, '0');
}
function parseTran(l) {
  l = padR(l, 350);
  return { tran_id: rt(fld(l, 1, 16)), type_cd: rt(fld(l, 17, 18)), cat_cd: zn(fld(l, 19, 22)), source: rt(fld(l, 23, 32)),
    desc: rt(fld(l, 33, 132)), amtC: zn(fld(l, 133, 143), 2), merchant_id: zn(fld(l, 144, 152)), merchant_name: rt(fld(l, 153, 202)),
    merchant_city: rt(fld(l, 203, 252)), merchant_zip: rt(fld(l, 253, 262)), card_num: rt(fld(l, 263, 278)),
    orig_ts: rt(fld(l, 279, 304)), proc_ts: rt(fld(l, 305, 330)) };
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
// TRANREPT (SORT + CBTRN03C) — wiki process daily transaction report; layout CONTRACT-L1 p232
function main() {
  var T = req('transact.dat'), X = req('cardxref.dat'), TT = req('trantype.dat'), TC = req('trancatg.dat');
  if (missing.length) { abend('tranrept'); return; }
  var sd = String(input.start_date || cfg.reportStartDate || '2022-07-01').substring(0, 10);
  var ed = String(input.end_date || cfg.reportEndDate || '2022-07-31').substring(0, 10);
  var i, xr = {}, ty = {}, ca = {};
  for (i = 0; i < X.length; i++) { var x = parseXref(X[i]); if (xr[x.card_num] === undefined) xr[x.card_num] = x; }
  for (i = 0; i < TT.length; i++) { var l = padR(TT[i], 60); ty[fld(l, 1, 2)] = rt(fld(l, 3, 52)); }
  for (i = 0; i < TC.length; i++) { var m = padR(TC[i], 60); ca[fld(m, 1, 2) + '|' + zn(fld(m, 3, 6))] = rt(fld(m, 7, 56)); }
  var trs = [];
  for (i = 0; i < T.length; i++) {
    var t = parseTran(T[i]); t.seq = i;
    var d = t.proc_ts.substring(0, 10);
    if (d >= sd && d <= ed) trs.push(t);
  }
  trs.sort(function (p, q) { return p.card_num < q.card_num ? -1 : p.card_num > q.card_num ? 1 : p.seq - q.seq; });
  var out = [], RULE = rep('-', 133), PAGE = 20;
  function W(s) { out.push(padR(s, 133)); }
  function header() {
    W(padR('DALYREPT', 38) + padR('Daily Transaction Report', 41) + 'Date Range: ' + padR(sd, 10) + ' to ' + padR(ed, 10));
    W('');
    W(padR('Transaction ID', 17) + padR('Account ID', 12) + padR('Transaction Type', 19) + padR('Tran Category', 35) +
      padR('Tran Source', 14) + ' ' + padR('        Amount', 16));
    W(RULE);
  }
  var pageTot = 0, acctTot = 0, grand = 0, lines = 0, cur = null, sys = ['START OF EXECUTION OF PROGRAM CBTRN03C'];
  header();
  for (i = 0; i < trs.length; i++) {
    var r = trs[i];
    if (cur !== null && r.card_num !== cur) {
      W('Account Total' + rep('.', 84) + picEd(acctTot, '+')); W(RULE); acctTot = 0;
    }
    cur = r.card_num;
    if (lines > 0 && lines % PAGE === 0) {
      W(padR('Page Total', 11) + rep('.', 86) + picEd(pageTot, '+')); W(RULE); pageTot = 0;
      header();
    }
    var xx = xr[r.card_num], ck = r.type_cd + '|' + r.cat_cd;
    if (!xx) sys.push('CARD NUMBER ' + r.card_num + ' NOT FOUND IN CROSS-REFERENCE - TRAN ID ' + r.tran_id);
    if (ty[r.type_cd] === undefined) sys.push('TRANSACTION TYPE ' + r.type_cd + ' NOT FOUND - TRAN ID ' + r.tran_id);
    if (ca[ck] === undefined) sys.push('TRANSACTION CATEGORY ' + r.type_cd + '-' + padL(r.cat_cd, 4, '0') + ' NOT FOUND - TRAN ID ' + r.tran_id);
    var aid = xx ? padL(xx.acct_id, 11, '0') : '';
    var td = ty[r.type_cd] || '', cd = ca[ck] || '';
    W(padR(r.tran_id, 16) + ' ' + padR(aid, 11) + ' ' + padR(r.type_cd, 2) + '-' + padR(td, 15) + ' ' +
      padL(r.cat_cd, 4, '0') + '-' + padR(cd, 29) + ' ' + padR(r.source, 10) + '    ' + picEd(r.amtC, '-'));
    lines++; pageTot += r.amtC; acctTot += r.amtC; grand += r.amtC;
  }
  W(padR('Page Total', 11) + rep('.', 86) + picEd(pageTot, '+')); W(RULE);
  W(padR('Grand Total', 11) + rep('.', 86) + picEd(grand, '+'));
  output.tranrept_report = out;
  sys.push('TRANSACTIONS REPORTED : ' + lines);
  sys.push('END OF EXECUTION OF PROGRAM CBTRN03C');
  output.tranrept_sysout = sys;
}
main();
```

_(server: 97 ms, 1 API call, 94 ms in API)_
