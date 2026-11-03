# Workflow: batch_intcalc

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** INTCALC (CBACT04C): monthly interest over tcatbal/acctdata/cardxref/discgrp; returns intcalc_* outputs. Input parm defaults to 2022071800.

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae87cc93695c563ea51af2d | <uuid> | (0, 0) | → Calculate interest (seq:<uuid>) |
| Calculate interest | SCRIPT | 6ae87ccd3695c563ea51af2e | <uuid> | (500, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae87cd03695c563ea51af2f | <uuid> | (1000, 0) | — |

## Systems
_(none)_

## Scripts

### Calculate interest (SCRIPT, id=6ae87ccd3695c563ea51af2e)

```javascript
var RUN_TS = String((typeof additionalData !== 'undefined' && additionalData && additionalData.applicationConfiguration && additionalData.applicationConfiguration.RUN_TIMESTAMP) || '2022-07-18 10:00:00');
var DB2_TS = RUN_TS.substring(0, 10) + '-' + RUN_TS.substring(11, 13) + '.' + RUN_TS.substring(14, 16) + '.' + RUN_TS.substring(17, 19) + '.000000';
function inp(names) { for (var i = 0; i < names.length; i++) { var v = input[names[i]]; if (v !== undefined && v !== null) return v; } return null; }
function lines(v) { if (v === null || v === undefined) return null; var a = []; if (typeof v === 'string') a = v.split(/\r?\n/); else { var c = JSON.parse(JSON.stringify(v)); for (var i = 0; i < c.length; i++) a.push(String(c[i])); } var o = []; for (var j = 0; j < a.length; j++) if (a[j].replace(/\s+$/, '') !== '') o.push(a[j]); return o; }
function lpad(s, k, c) { s = String(s); while (s.length < k) s = (c || ' ') + s; return s; }
function x(r, a, b) { return r.substring(a, b).replace(/\s+$/, ''); }
function n(r, a, b) { var v = parseInt(r.substring(a, b).trim(), 10); return isNaN(v) ? 0 : v; }
function zc(r, a, b) {
  var t = r.substring(a, b).trim(); if (!t) return 0; var neg = false, k;
  if (t.charAt(0) === '-' || t.charAt(0) === '+') { neg = t.charAt(0) === '-'; t = t.substring(1); }
  var e = t.charAt(t.length - 1);
  if (e === '-' || e === '+') { if (e === '-') neg = true; t = t.substring(0, t.length - 1); e = t.charAt(t.length - 1); }
  if ((k = '{ABCDEFGHI'.indexOf(e)) >= 0) t = t.substring(0, t.length - 1) + k;
  else if ((k = '}JKLMNOPQR'.indexOf(e)) >= 0) { t = t.substring(0, t.length - 1) + k; neg = true; }
  else if ((k = 'pqrstuvwxy'.indexOf(e)) >= 0) { t = t.substring(0, t.length - 1) + k; neg = true; }
  var v = t.indexOf('.') >= 0 ? Math.round(parseFloat(t) * 100) : parseInt(t, 10); if (isNaN(v)) v = 0;
  return neg ? -v : v;
}
function amt(c) { return c === 0 ? 0 : Number((c / 100).toFixed(2)); }
function pAcct(r) { return { acct_id: n(r, 0, 11), active_status: x(r, 11, 12), curr_bal: zc(r, 12, 24), credit_limit: zc(r, 24, 36), cash_credit_limit: zc(r, 36, 48), open_date: x(r, 48, 58), expiration_date: x(r, 58, 68), reissue_date: x(r, 68, 78), curr_cyc_credit: zc(r, 78, 90), curr_cyc_debit: zc(r, 90, 102), addr_zip: x(r, 102, 112), group_id: x(r, 112, 122) }; }
function oAcct(a) { return { acct_id: a.acct_id, active_status: a.active_status, curr_bal: amt(a.curr_bal), credit_limit: amt(a.credit_limit), cash_credit_limit: amt(a.cash_credit_limit), open_date: a.open_date, expiration_date: a.expiration_date, reissue_date: a.reissue_date, curr_cyc_credit: amt(a.curr_cyc_credit), curr_cyc_debit: amt(a.curr_cyc_debit), addr_zip: a.addr_zip, group_id: a.group_id }; }
function pXref(r) { return { card_num: x(r, 0, 16), cust_id: n(r, 16, 25), acct_id: n(r, 25, 36) }; }

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
```

_(server: 114 ms, 1 API call, 111 ms in API)_
