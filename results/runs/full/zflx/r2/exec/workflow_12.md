# Workflow: batch_acctext

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** Account extract (CBACT01C). Input acctdata.dat. Output acctext_out.json, acctext_array.json, acctext_vb.json, acctext_sysout.txt.

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae87eb03695c563ea51af4a | <uuid> | (0, 0) | → Account extract (seq:<uuid>) |
| Account extract | SCRIPT | 6ae87eb83695c563ea51af57 | <uuid> | (500, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae87ec23695c563ea51af5e | <uuid> | (1000, 0) | — |

## Systems
_(none)_

## Scripts

### Account extract (SCRIPT, id=6ae87eb83695c563ea51af57)

```javascript
function inp(names) { for (var i = 0; i < names.length; i++) { var v = input[names[i]]; if (v !== undefined && v !== null) return v; } return null; }
function lines(v) { if (v === null || v === undefined) return null; var a = []; if (typeof v === 'string') a = v.split(/\r?\n/); else { var c = JSON.parse(JSON.stringify(v)); for (var i = 0; i < c.length; i++) a.push(String(c[i])); } var o = []; for (var j = 0; j < a.length; j++) if (a[j].replace(/\s+$/, '') !== '') o.push(a[j]); return o; }
function sp(k) { var s = ''; while (s.length < k) s += ' '; return s; }
function rep(c, k) { var s = ''; while (s.length < k) s += c; return s; }
function pad(s, k) { s = (s === null || s === undefined) ? '' : String(s); return s.length >= k ? s.substring(0, k) : s + sp(k - s.length); }
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
function rt(s) { return String(s).replace(/\s+$/, ''); }

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
```

_(server: 93 ms, 1 API call, 90 ms in API)_
