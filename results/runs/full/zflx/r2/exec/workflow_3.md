# Workflow: batch_posttran

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** POSTTRAN (CBTRN02C): daily transaction posting over fixed-width input files; returns posttran_* outputs.

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae87c553695c563ea51af1d | <uuid> | (0, 0) | → Post transactions (seq:<uuid>) |
| Post transactions | SCRIPT | 6ae87c583695c563ea51af1e | <uuid> | (500, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae87c5b3695c563ea51af1f | <uuid> | (1000, 0) | — |

## Systems
_(none)_

## Scripts

### Post transactions (SCRIPT, id=6ae87c583695c563ea51af1e)

```javascript
var RUN_TS = String((typeof additionalData !== 'undefined' && additionalData && additionalData.applicationConfiguration && additionalData.applicationConfiguration.RUN_TIMESTAMP) || '2022-07-18 10:00:00');
var DB2_TS = RUN_TS.substring(0, 10) + '-' + RUN_TS.substring(11, 13) + '.' + RUN_TS.substring(14, 16) + '.' + RUN_TS.substring(17, 19) + '.000000';
function inp(names) { for (var i = 0; i < names.length; i++) { var v = input[names[i]]; if (v !== undefined && v !== null) return v; } return null; }
function lines(v) { if (v === null || v === undefined) return null; var a = []; if (typeof v === 'string') a = v.split(/\r?\n/); else { var c = JSON.parse(JSON.stringify(v)); for (var i = 0; i < c.length; i++) a.push(String(c[i])); } var o = []; for (var j = 0; j < a.length; j++) if (a[j].replace(/\s+$/, '') !== '') o.push(a[j]); return o; }
function sp(k) { var s = ''; while (s.length < k) s += ' '; return s; }
function rep(c, k) { var s = ''; while (s.length < k) s += c; return s; }
function pad(s, k) { s = (s === null || s === undefined) ? '' : String(s); return s.length >= k ? s.substring(0, k) : s + sp(k - s.length); }
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
function pTran(r) { return { tran_id: x(r, 0, 16), type_cd: x(r, 16, 18), cat_cd: n(r, 18, 22), source: x(r, 22, 32), desc: x(r, 32, 132), amt: zc(r, 132, 143), merchant_id: n(r, 143, 152), merchant_name: x(r, 152, 202), merchant_city: x(r, 202, 252), merchant_zip: x(r, 252, 262), card_num: x(r, 262, 278), orig_ts: x(r, 278, 304), proc_ts: x(r, 304, 330) }; }
function oTran(t) { return { tran_id: t.tran_id, type_cd: t.type_cd, cat_cd: t.cat_cd, source: t.source, desc: t.desc, amt: amt(t.amt), merchant_id: t.merchant_id, merchant_name: t.merchant_name, merchant_city: t.merchant_city, merchant_zip: t.merchant_zip, card_num: t.card_num, orig_ts: t.orig_ts, proc_ts: t.proc_ts }; }
function pXref(r) { return { card_num: x(r, 0, 16), cust_id: n(r, 16, 25), acct_id: n(r, 25, 36) }; }

var dl = lines(inp(['dailytran.dat', 'dailytran'])), al = lines(inp(['acctdata.dat', 'acctdata'])),
    xl = lines(inp(['cardxref.dat', 'cardxref'])), cl = lines(inp(['tcatbal.dat', 'tcatbal']));
var sys = ['START OF EXECUTION OF PROGRAM CBTRN02C'], res = {};
var miss = dl === null ? 'DALYTRAN' : al === null ? 'ACCTFILE' : xl === null ? 'XREFFILE' : cl === null ? 'TCATBALF' : null;
if (miss) {
  sys.push('ERROR OPENING ' + miss); sys.push('ABENDING PROGRAM');
  res = { 'posttran_sysout.txt': sys, 'posttran_rc.txt': '999', returnCode: 999 };
} else {
  var accts = [], aIdx = {}, xr = {}, cats = [], cIdx = {}, posted = [], rej = [];
  al.forEach(function (r) { var a = pAcct(r); aIdx[a.acct_id] = accts.length; accts.push(a); });
  xl.forEach(function (r) { var q = pXref(r); xr[q.card_num] = q; });
  cl.forEach(function (r) { var c = { acct_id: n(r, 0, 11), type_cd: x(r, 11, 13), cat_cd: n(r, 13, 17), bal: zc(r, 17, 28) }; cIdx[c.acct_id + '|' + c.type_cd + '|' + c.cat_cd] = cats.length; cats.push(c); });
  dl.forEach(function (r) {
    var t = pTran(r), reason = 0, desc = '', q = xr[t.card_num], a = null;
    if (!q) { reason = 100; desc = 'INVALID CARD NUMBER FOUND'; }
    else if (aIdx[q.acct_id] === undefined) { reason = 101; desc = 'ACCOUNT RECORD NOT FOUND'; }
    else {
      a = accts[aIdx[q.acct_id]];
      if (!(a.credit_limit >= a.curr_cyc_credit - a.curr_cyc_debit + t.amt)) { reason = 102; desc = 'OVERLIMIT TRANSACTION'; }
      if (!(a.expiration_date >= t.orig_ts.substring(0, 10))) { reason = 103; desc = 'TRANSACTION RECEIVED AFTER ACCT EXPIRATION'; }
    }
    if (reason === 0) {
      var key = q.acct_id + '|' + t.type_cd + '|' + t.cat_cd;
      if (cIdx[key] === undefined) { cIdx[key] = cats.length; cats.push({ acct_id: q.acct_id, type_cd: t.type_cd, cat_cd: t.cat_cd, bal: t.amt }); }
      else cats[cIdx[key]].bal += t.amt;
      a.curr_bal += t.amt;
      if (t.amt >= 0) a.curr_cyc_credit += t.amt; else a.curr_cyc_debit += t.amt;
      t.proc_ts = DB2_TS;
      posted.push(oTran(t));
    } else {
      var o = oTran(t); o.reason = reason; o.reason_desc = desc; rej.push(o);
    }
  });
  accts.sort(function (p, q) { return p.acct_id - q.acct_id; });
  cats.sort(function (p, q) { return p.acct_id !== q.acct_id ? p.acct_id - q.acct_id : p.type_cd !== q.type_cd ? (p.type_cd < q.type_cd ? -1 : 1) : p.cat_cd - q.cat_cd; });
  var rc = rej.length > 0 ? 4 : 0;
  sys.push('TRANSACTIONS PROCESSED :' + lpad(dl.length, 9, '0'));
  sys.push('TRANSACTIONS REJECTED  :' + lpad(rej.length, 9, '0'));
  sys.push('END OF EXECUTION OF PROGRAM CBTRN02C');
  res = {
    'posttran_transact.json': posted, 'posttran_dalyrejs.json': rej,
    'posttran_acctdata.json': accts.map(oAcct),
    'posttran_tcatbal.json': cats.map(function (c) { return { acct_id: c.acct_id, type_cd: c.type_cd, cat_cd: c.cat_cd, bal: amt(c.bal) }; }),
    'posttran_sysout.txt': sys, returnCode: rc
  };
  if (rc) res['posttran_rc.txt'] = String(rc);
}
output.result = res;
```

_(server: 99 ms, 1 API call, 96 ms in API)_
