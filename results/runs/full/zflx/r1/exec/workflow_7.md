# Workflow: batch_posttran

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** POSTTRAN (CBTRN02C) daily transaction posting. Input: files {dailytran.dat, acctdata.dat, cardxref.dat, tcatbal.dat} as fixed-width text. Output: posttran_transact, posttran_dalyrejs, posttran_acctdata, posttran_tcatbal (+ posttran_sysout, posttran_rc).

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae862a33695c563ea51aaf3 | <uuid> | (0, 0) | → POSTTRAN (seq:<uuid>) |
| POSTTRAN | SCRIPT | 6ae862a63695c563ea51aaf4 | <uuid> | (500, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae862a93695c563ea51aaf5 | <uuid> | (1000, 0) | — |

## Systems
_(none)_

## Scripts

### POSTTRAN (SCRIPT, id=6ae862a63695c563ea51aaf4)

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
function cents(v) { if (v === null || v === undefined || v === '') return 0; return Math.round(parseFloat(String(v)) * 100); }
function num(v) { if (v === null || v === undefined || String(v).trim() === '') return 0; var n = parseInt(String(v), 10); return isNaN(n) ? 0 : n; }
function picN(c, n, z) {
  var a = Math.abs(c), ip = Math.floor(a / 100), dp = a % 100;
  var is = padL(ip, n, '0'); if (z) { is = ip === 0 ? rep(' ', n) : padL(String(ip), n, ' '); }
  return is + '.' + padL(dp, 2, '0') + (c < 0 ? '-' : ' ');
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
function parseTcat(l) { l = padR(l, 50); return { acct_id: zn(fld(l, 1, 11)), type_cd: rt(fld(l, 12, 13)), cat_cd: zn(fld(l, 14, 17)), balC: zn(fld(l, 18, 28), 2) }; }
function abend(step, extra) {
  output[step + '_rc'] = '12';
  var s = (extra || []).slice(0);
  s.push('ERROR: required input file missing: ' + missing.join(', '));
  s.push('ABENDING PROGRAM');
  output[step + '_sysout'] = s;
}
// ---- end library ----
// POSTTRAN (CBTRN02C) — wiki process-daily-transaction-posting BR-01..BR-07
function main() {
  var D = req('dailytran.dat'), A = req('acctdata.dat'), X = req('cardxref.dat'), T = inFile('tcatbal.dat') || [];
  if (missing.length) { abend('posttran'); return; }
  var accts = [], aIdx = {}, xr = {}, tc = {}, i;
  for (i = 0; i < A.length; i++) { var a = parseAcct(A[i]); accts.push(a); if (aIdx[a.acct_id] === undefined) aIdx[a.acct_id] = a; }
  for (i = 0; i < X.length; i++) { var x = parseXref(X[i]); if (xr[x.card_num] === undefined) xr[x.card_num] = x; }
  for (i = 0; i < T.length; i++) { var tb = parseTcat(T[i]); tc[tb.acct_id + '|' + tb.type_cd + '|' + tb.cat_cd] = tb; }
  var posted = [], rejs = [];
  for (i = 0; i < D.length; i++) {
    var t = parseTran(D[i]), reason = 0, desc = '', xx = xr[t.card_num], ac = null;
    if (!xx) { reason = 100; desc = 'INVALID CARD NUMBER FOUND'; }
    else {
      ac = aIdx[xx.acct_id];
      if (!ac) { reason = 101; desc = 'ACCOUNT RECORD NOT FOUND'; }
      else {
        if (ac.cr - ac.db + t.amtC > ac.lim) { reason = 102; desc = 'OVERLIMIT TRANSACTION'; }
        if (ac.expiration_date < t.orig_ts.substring(0, 10)) { reason = 103; desc = 'TRANSACTION RECEIVED AFTER ACCT EXPIRATION'; }
      }
    }
    if (reason) { var r = tranOut(t); r.reason = reason; r.reason_desc = desc; rejs.push(r); continue; }
    t.proc_ts = RT26;
    var k = xx.acct_id + '|' + t.type_cd + '|' + t.cat_cd;
    if (tc[k]) tc[k].balC += t.amtC; else tc[k] = { acct_id: xx.acct_id, type_cd: t.type_cd, cat_cd: t.cat_cd, balC: t.amtC };
    ac.bal += t.amtC;
    if (t.amtC >= 0) ac.cr += t.amtC; else ac.db += t.amtC;
    posted.push(tranOut(t));
  }
  var keys = Object.keys(tc).map(function (q) { return tc[q]; });
  keys.sort(function (p, q) { return p.acct_id - q.acct_id || (p.type_cd < q.type_cd ? -1 : p.type_cd > q.type_cd ? 1 : p.cat_cd - q.cat_cd); });
  output.posttran_transact = posted;
  output.posttran_dalyrejs = rejs;
  output.posttran_acctdata = accts.map(function (q) { return acctOut(q); });
  output.posttran_tcatbal = keys.map(function (q) { return { acct_id: q.acct_id, type_cd: q.type_cd, cat_cd: q.cat_cd, bal: money(q.balC) }; });
  output.posttran_sysout = ['START OF EXECUTION OF PROGRAM CBTRN02C', 'TRANSACTIONS PROCESSED :' + padL(D.length, 9, '0'),
    'TRANSACTIONS REJECTED  :' + padL(rejs.length, 9, '0'), 'END OF EXECUTION OF PROGRAM CBTRN02C'];
  if (rejs.length) output.posttran_rc = '4';
}
main();
```

_(server: 101 ms, 1 API call, 98 ms in API)_
