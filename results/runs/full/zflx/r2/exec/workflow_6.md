# Workflow: batch_dailycheck

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** Daily transaction check (CBTRN01C). Input dailytran.dat, cardxref.dat, acctdata.dat. Output dailycheck_sysout.txt.

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae87eb33695c563ea51af52 | <uuid> | (0, 0) | → Daily check (seq:<uuid>) |
| Daily check | SCRIPT | 6ae87ebc3695c563ea51af5b | <uuid> | (500, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae87ec63695c563ea51af68 | <uuid> | (1000, 0) | — |

## Systems
_(none)_

## Scripts

### Daily check (SCRIPT, id=6ae87ebc3695c563ea51af5b)

```javascript
function inp(names) { for (var i = 0; i < names.length; i++) { var v = input[names[i]]; if (v !== undefined && v !== null) return v; } return null; }
function lines(v) { if (v === null || v === undefined) return null; var a = []; if (typeof v === 'string') a = v.split(/\r?\n/); else { var c = JSON.parse(JSON.stringify(v)); for (var i = 0; i < c.length; i++) a.push(String(c[i])); } var o = []; for (var j = 0; j < a.length; j++) if (a[j].replace(/\s+$/, '') !== '') o.push(a[j]); return o; }
function sp(k) { var s = ''; while (s.length < k) s += ' '; return s; }
function pad(s, k) { s = (s === null || s === undefined) ? '' : String(s); return s.length >= k ? s.substring(0, k) : s + sp(k - s.length); }
function lpad(s, k, c) { s = String(s); while (s.length < k) s = (c || ' ') + s; return s; }
function x(r, a, b) { return r.substring(a, b).replace(/\s+$/, ''); }
function n(r, a, b) { var v = parseInt(r.substring(a, b).trim(), 10); return isNaN(v) ? 0 : v; }
function pXref(r) { return { card_num: x(r, 0, 16), cust_id: n(r, 16, 25), acct_id: n(r, 25, 36) }; }
function rt(s) { return String(s).replace(/\s+$/, ''); }

var dl = lines(inp(['dailytran.dat', 'dailytran'])), xl = lines(inp(['cardxref.dat', 'cardxref'])), al = lines(inp(['acctdata.dat', 'acctdata']));
var sys = ['START OF EXECUTION OF PROGRAM CBTRN01C'], res;
var miss = dl === null ? 'DALYTRAN' : xl === null ? 'XREFFILE' : al === null ? 'ACCTFILE' : null;
if (miss) { sys.push('ERROR OPENING ' + miss); sys.push('ABENDING PROGRAM'); res = { 'dailycheck_sysout.txt': sys, 'dailycheck_rc.txt': '999', returnCode: 999 }; }
else {
  var xr = {}, acc = {};
  xl.forEach(function (r) { var q = pXref(r); xr[q.card_num] = q; });
  al.forEach(function (r) { acc[n(r, 0, 11)] = true; });
  var check = function (r) {
    var card = x(r, 262, 278), tid = x(r, 0, 16), q = xr[card];
    if (q) {
      sys.push('SUCCESSFUL READ OF XREF FILE'); sys.push('CARD NUMBER: ' + q.card_num);
      sys.push('ACCOUNT ID : ' + lpad(q.acct_id, 11, '0')); sys.push('CUSTOMER ID: ' + lpad(q.cust_id, 9, '0'));
      if (acc[q.acct_id]) sys.push('SUCCESSFUL READ OF ACCOUNT FILE');
      else { sys.push('INVALID ACCOUNT NUMBER FOUND'); sys.push('ACCOUNT ' + lpad(q.acct_id, 11, '0') + ' NOT FOUND'); }
    } else {
      sys.push('INVALID CARD NUMBER FOR XREF');
      sys.push('CARD NUMBER ' + pad(card, 16) + ' COULD NOT BE VERIFIED. SKIPPING TRANSACTION ID-' + tid);
    }
  };
  var last = null;
  dl.forEach(function (r) { sys.push(rt(r)); check(r); last = r; });
  if (last !== null) check(last);
  sys.push('END OF EXECUTION OF PROGRAM CBTRN01C');
  res = { 'dailycheck_sysout.txt': sys, returnCode: 0 };
}
output.result = res;
```

_(server: 99 ms, 1 API call, 96 ms in API)_
