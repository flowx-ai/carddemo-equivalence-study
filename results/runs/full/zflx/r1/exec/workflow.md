# Workflow: batch_combtran

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** COMBTRAN: merge transact backup + interest SYSTRAN sorted by tran id. Input files {transact.dat, systran.dat}. Output combtran_transact.

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae8632c3695c563ea51ab47 | <uuid> | (0, 0) | → COMBTRAN (seq:<uuid>) |
| COMBTRAN | SCRIPT | 6ae863363695c563ea51ab51 | <uuid> | (500, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae8633f3695c563ea51ab57 | <uuid> | (1000, 0) | — |

## Systems
_(none)_

## Scripts

### COMBTRAN (SCRIPT, id=6ae863363695c563ea51ab51)

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
function abend(step, extra) {
  output[step + '_rc'] = '12';
  var s = (extra || []).slice(0);
  s.push('ERROR: required input file missing: ' + missing.join(', '));
  s.push('ABENDING PROGRAM');
  output[step + '_sysout'] = s;
}
// ---- end library ----
// COMBTRAN (DFSORT + IDCAMS REPRO) — wiki process combine transactions
function main() {
  var A = req('transact.dat'), B = req('systran.dat');
  if (missing.length) { abend('combtran'); return; }
  var all = A.concat(B).map(parseTran);
  all.sort(function (p, q) { return p.tran_id < q.tran_id ? -1 : p.tran_id > q.tran_id ? 1 : 0; });
  var dups = [];
  for (var i = 1; i < all.length; i++) if (all[i].tran_id === all[i - 1].tran_id) dups.push(all[i].tran_id);
  var log = ['RECORDS READ FROM TRANSACT BACKUP : ' + A.length, 'RECORDS READ FROM SYSTRAN         : ' + B.length];
  if (dups.length) {
    log.push('DUPLICATE TRANSACTION ID(S): ' + dups.join(', '));
    log.push('REPRO FAILED - DUPLICATE KEY');
    output.combtran_rc = '12';
    output.combtran_sysout = log;
    return;
  }
  log.push('RECORDS WRITTEN TO TRANSACT       : ' + all.length);
  output.combtran_transact = all.map(tranOut);
  output.combtran_sysout = log;
}
main();
```

_(server: 92 ms, 1 API call, 89 ms in API)_
