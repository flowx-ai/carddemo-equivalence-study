# Workflow: batch_creastmt

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** CREASTMT (CBSTM03A/B) statements. Input files {transact.dat, acctdata.dat, cardxref.dat, custdata.dat}. Output creastmt_statements (80-col lines), creastmt_statements_html (100-col lines).

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae8632d3695c563ea51ab49 | <uuid> | (0, 0) | → CREASTMT (seq:<uuid>) |
| CREASTMT | SCRIPT | 6ae863373695c563ea51ab52 | <uuid> | (500, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae863403695c563ea51ab58 | <uuid> | (1000, 0) | — |

## Systems
_(none)_

## Scripts

### CREASTMT (SCRIPT, id=6ae863373695c563ea51ab52)

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
function picN(c, n, z) {
  var a = Math.abs(c), ip = Math.floor(a / 100), dp = a % 100;
  var is = padL(ip, n, '0'); if (z) { is = ip === 0 ? rep(' ', n) : padL(String(ip), n, ' '); }
  return is + '.' + padL(dp, 2, '0') + (c < 0 ? '-' : ' ');
}
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
function parseXref(l) { l = padR(l, 50); return { card_num: rt(fld(l, 1, 16)), cust_id: zn(fld(l, 17, 25)), acct_id: zn(fld(l, 26, 36)) }; }
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
// CREASTMT (CBSTM03A/B) — wiki process statement generation; layouts CONTRACT-L1 p230-232
function main() {
  var T = req('transact.dat'), X = req('cardxref.dat'), A = req('acctdata.dat'), C = req('custdata.dat');
  if (missing.length) { abend('creastmt'); return; }
  var i, acct = {}, cust = {}, byCard = {};
  for (i = 0; i < A.length; i++) { var a = parseAcct(A[i]); if (acct[a.acct_id] === undefined) acct[a.acct_id] = a; }
  for (i = 0; i < C.length; i++) { var c = parseCust(C[i]); if (cust[c.cust_id] === undefined) cust[c.cust_id] = c; }
  for (i = 0; i < T.length; i++) { var t = parseTran(T[i]); (byCard[t.card_num] = byCard[t.card_num] || []).push(t); }
  var xr = X.map(parseXref);
  xr.sort(function (p, q) { return p.card_num < q.card_num ? -1 : p.card_num > q.card_num ? 1 : 0; });
  var txt = [], html = [], D = rep('-', 80);
  function L(s) { txt.push(padR(s, 80)); }
  function H(s) { html.push(padR(s, 100)); }
  function join(arr) { var o = []; for (var k = 0; k < arr.length; k++) { var v = String(arr[k] || '').trim(); if (v !== '') o.push(v); } return o.join(' '); }
  var TDS = function (w, bg, al) { return '<td style="width:' + w + '; padding:0px 5px; background-color:' + bg + '; text-align:' + al + ';">'; };
  var TDC = function (bg, extra) { return '<td colspan="3" style="padding:0px 5px;background-color:' + bg + ';' + (extra || '') + '">'; };
  for (i = 0; i < xr.length; i++) {
    var x = xr[i], cu = cust[x.cust_id], ac = acct[x.acct_id];
    var name = cu ? join([cu.first_name, cu.middle_name, cu.last_name]) : '';
    var a1 = cu ? cu.addr_line_1.trim() : '', a2 = cu ? cu.addr_line_2.trim() : '';
    var a3 = cu ? join([cu.addr_line_3, cu.addr_state_cd, cu.addr_country_cd, cu.addr_zip]) : '';
    var aid = padR(padL(x.acct_id, 11, '0'), 20);
    var bal = picN(ac ? ac.bal : 0, 9, false);
    var fico = padR(cu ? padL(cu.fico_credit_score, 3, '0') : '', 20);
    var trs = (byCard[x.card_num] || []).slice(0);
    trs.sort(function (p, q) { return p.tran_id < q.tran_id ? -1 : p.tran_id > q.tran_id ? 1 : 0; });
    L(rep('*', 31) + 'START OF STATEMENT' + rep('*', 31));
    L(padR(name, 75)); L(padR(a1, 50)); L(padR(a2, 50)); L(padR(a3, 80));
    L(D); L(rep(' ', 33) + 'Basic Details'); L(D);
    L('Account ID         :' + aid);
    L('Current Balance    :' + bal);
    L('FICO Score         :' + fico);
    L(D); L(rep(' ', 30) + 'TRANSACTION SUMMARY'); L(D);
    L(padR('Tran ID', 16) + padR('Tran Details', 51) + '  Tran Amount');
    L(D);
    var tot = 0;
    for (var j = 0; j < trs.length; j++) {
      tot += trs[j].amtC;
      L(padR(trs[j].tran_id, 16) + ' ' + padR(trs[j].desc, 49) + '$' + picN(trs[j].amtC, 9, true));
    }
    L(D);
    L('Total EXP:' + rep(' ', 56) + '$' + picN(tot, 9, true));
    L(rep('*', 32) + 'END OF STATEMENT' + rep('*', 32));
    H('<!DOCTYPE html>'); H('<html lang="en">'); H('<head>'); H('<meta charset="utf-8">');
    H('<title>HTML Table Layout</title>'); H('</head>'); H('<body style="margin:0px;">');
    H('<table  align="center" frame="box" style="width:70%; font:12px Segoe UI,sans-serif;">');
    H('<tr>'); H(TDC('#1d1d96b3')); H('<h3>Statement for Account Number: ' + aid + '</h3>'); H('</td>'); H('</tr>');
    H('<tr>'); H(TDC('#FFAF33')); H('<p style="font-size:16px">Bank of XYZ</p>'); H('<p>410 Terry Ave N</p>');
    H('<p>Seattle WA 99999</p>'); H('</td>'); H('</tr>');
    H('<tr>'); H(TDC('#f2f2f2')); H('<p style="font-size:16px">' + name + '  </p>');
    H('<p>' + a1 + '  </p>'); H('<p>' + a2 + '  </p>'); H('<p>' + a3 + '  </p>'); H('</td>'); H('</tr>');
    H('<tr>'); H(TDC('#33FFD1', ' text-align:center;')); H('<p style="font-size:16px">Basic Details</p>'); H('</td>'); H('</tr>');
    H('<tr>'); H(TDC('#f2f2f2'));
    H('<p>Account ID         : ' + aid + '</p>');
    H('<p>Current Balance    : ' + bal + '</p>');
    H('<p>FICO Score         : ' + fico + '</p>');
    H('</td>'); H('</tr>');
    H('<tr>'); H(TDC('#33FFD1', ' text-align:center;')); H('<p style="font-size:16px">Transaction Summary</p>'); H('</td>'); H('</tr>');
    H('<tr>');
    H(TDS('25%', '#33FF5E', 'left')); H('<p style="font-size:16px">Tran ID</p>'); H('</td>');
    H(TDS('55%', '#33FF5E', 'left')); H('<p style="font-size:16px">Tran Details</p>'); H('</td>');
    H(TDS('20%', '#33FF5E', 'right')); H('<p style="font-size:16px">Amount</p>'); H('</td>');
    H('</tr>');
    for (j = 0; j < trs.length; j++) {
      H('<tr>');
      H(TDS('25%', '#f2f2f2', 'left')); H('<p>' + padR(trs[j].tran_id, 16) + '</p>'); H('</td>');
      H(TDS('55%', '#f2f2f2', 'left')); H('<p>' + padR(trs[j].desc, 49) + '</p>'); H('</td>');
      H(TDS('20%', '#f2f2f2', 'right')); H('<p>' + picN(trs[j].amtC, 9, true) + '</p>'); H('</td>');
      H('</tr>');
    }
    H('<tr>'); H(TDC('#1d1d96b3')); H('<h3>End of Statement</h3>'); H('</td>');
    H('</tr>'); H('</table>'); H('</body>'); H('</html>');
  }
  output.creastmt_statements = txt;
  output.creastmt_statements_html = html;
}
main();
```

_(server: 116 ms, 1 API call, 113 ms in API)_
