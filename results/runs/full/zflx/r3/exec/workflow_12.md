# Workflow: batch_combtran

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** COMBTRAN (SORT/REPRO) combine posted and system transactions ordered by tran id. Inputs: transact, systran. Outputs combtran_transact (+ fixed-width combtran_transact_txt).

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae902703695c563ea51c06c | <uuid> | (0, 0) | → Combine transactions (seq:<uuid>) |
| Combine transactions | SCRIPT | 6ae9027e3695c563ea51c080 | <uuid> | (500, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae9028c3695c563ea51c08b | <uuid> | (1000, 0) | — |

## Systems
_(none)_

## Scripts

### Combine transactions (SCRIPT, id=6ae9027e3695c563ea51c080)

```javascript
// ---- common helpers ----
function getIn(base) {
  var names = [base, base + "_dat", base + ".dat", base + "_txt", base + ".txt", base + "_json", base + ".json"];
  for (var i = 0; i < names.length; i++) { var v = input[names[i]]; if (v !== undefined && v !== null) return v; }
  var f = input.files; if (f) { for (var j = 0; j < names.length; j++) { var w = f[names[j]]; if (w !== undefined && w !== null) return w; } }
  return null;
}
function lines(v) {
  if (v === null || v === undefined) return [];
  var out = [];
  if (typeof v === "string" || v instanceof String) { var p = String(v).split(/\r?\n/); for (var i = 0; i < p.length; i++) if (p[i].replace(/\s+$/, "") !== "") out.push(p[i]); return out; }
  for (var k = 0; k < v.length; k++) { var s = String(v[k]); if (s.replace(/\s+$/, "") !== "") out.push(s); }
  return out;
}
function pad(s, n) { s = (s === null || s === undefined) ? "" : String(s); if (s.length >= n) return s.substring(0, n); return s + new Array(n - s.length + 1).join(" "); }
function lpad(s, n, c) { s = String(s); c = c || "0"; while (s.length < n) s = c + s; return s; }
function rs(s) { return String(s).replace(/\s+$/, ""); }
function num(s) { var d = String(s).replace(/[^0-9]/g, ""); return d === "" ? 0 : parseInt(d, 10); }
function zoned(s) {
  s = String(s); var t = s.replace(/\s+$/, ""); if (t === "") return 0;
  var last = t.charAt(t.length - 1), body = t.substring(0, t.length - 1), neg = false, d = 0;
  var P = "{ABCDEFGHI", N = "}JKLMNOPQR", NL = "pqrstuvwxy";
  if (P.indexOf(last) >= 0) d = P.indexOf(last);
  else if (N.indexOf(last) >= 0) { d = N.indexOf(last); neg = true; }
  else if (NL.indexOf(last) >= 0) { d = NL.indexOf(last); neg = true; }
  else if (last === "-") { neg = true; d = -1; }
  else if (last === "+") { d = -1; }
  else d = parseInt(last, 10) || 0;
  if (body.indexOf("-") >= 0) neg = true;
  var digits = body.replace(/[^0-9]/g, "") + (d >= 0 ? String(d) : "");
  var v = digits === "" ? 0 : parseInt(digits, 10);
  return neg ? -v : v;
}
function amt(c) { return Math.round(c) / 100; }
function parseTran(l) {
  l = pad(l, 350);
  return { tran_id: rs(l.substr(0, 16)), type_cd: rs(l.substr(16, 2)), cat_cd: num(l.substr(18, 4)), source: rs(l.substr(22, 10)), desc: rs(l.substr(32, 100)),
    amtc: zoned(l.substr(132, 11)), merchant_id: num(l.substr(143, 9)), merchant_name: rs(l.substr(152, 50)), merchant_city: rs(l.substr(202, 50)),
    merchant_zip: rs(l.substr(252, 10)), card_num: rs(l.substr(262, 16)), orig_ts: rs(l.substr(278, 26)), proc_ts: rs(l.substr(304, 26)), raw: l };
}
function tranOut(t) {
  return { tran_id: t.tran_id, type_cd: t.type_cd, cat_cd: t.cat_cd, source: t.source, desc: t.desc, amt: amt(t.amtc), merchant_id: t.merchant_id,
    merchant_name: t.merchant_name, merchant_city: t.merchant_city, merchant_zip: t.merchant_zip, card_num: t.card_num, orig_ts: t.orig_ts, proc_ts: t.proc_ts };
}
// ---- end common ----

// COMBTRAN (SORT/REPRO) - merge posted + system transactions, ordered by transaction id
var R = {};
function zenc(c, width) { var neg = c < 0, d = lpad(Math.abs(Math.round(c)), width); var last = parseInt(d.charAt(width - 1), 10); return d.substring(0, width - 1) + (neg ? "}JKLMNOPQR" : "{ABCDEFGHI").charAt(last); }
function encTran(t) {
  return pad(t.tran_id, 16) + pad(t.type_cd, 2) + lpad(t.cat_cd, 4) + pad(t.source, 10) + pad(t.desc, 100) + zenc(Math.round(Number(t.amt) * 100), 11) +
    lpad(t.merchant_id, 9) + pad(t.merchant_name, 50) + pad(t.merchant_city, 50) + pad(t.merchant_zip, 10) + pad(t.card_num, 16) + pad(t.orig_ts, 26) + pad(t.proc_ts, 26) + pad("", 20);
}
function readTrans(base) {
  var v = getIn(base); if (v === null) return [];
  if (typeof v === "string" || v instanceof String) {
    var s = String(v).replace(/^\s+/, "");
    if (s.charAt(0) === "[") v = JSON.parse(s); else return lines(v).map(function (l) { return tranOut(parseTran(l)); });
  }
  var r = [];
  for (var i = 0; i < v.length; i++) {
    var e = v[i];
    if (typeof e === "string" || e instanceof String) r.push(tranOut(parseTran(String(e))));
    else r.push({ tran_id: String(e.tran_id), type_cd: String(e.type_cd), cat_cd: Number(e.cat_cd), source: e.source, desc: e.desc, amt: Number(e.amt),
      merchant_id: Number(e.merchant_id), merchant_name: e.merchant_name, merchant_city: e.merchant_city, merchant_zip: e.merchant_zip, card_num: e.card_num,
      orig_ts: e.orig_ts, proc_ts: e.proc_ts });
  }
  return r;
}
var a = readTrans("transact"), b = readTrans("systran");
var all = a.concat(b).map(function (t, i) { return { t: t, i: i }; });
all.sort(function (x, y) { var p = pad(x.t.tran_id, 16), q = pad(y.t.tran_id, 16); return p < q ? -1 : p > q ? 1 : x.i - y.i; });
var seen = {}, dups = 0, out = [];
for (var i = 0; i < all.length; i++) { var id = all[i].t.tran_id; if (seen[id]) dups++; seen[id] = true; out.push(all[i].t); }
R.combtran_transact = out;
R.combtran_transact_txt = out.map(encTran);
R.combtran_sysout = ["COMBTRAN: INPUT A " + a.length + ", INPUT B " + b.length + ", OUTPUT " + out.length + ", DUPLICATE KEYS " + dups];
if (dups > 0) R.combtran_rc = 12;
output.result = R;
```

_(server: 97 ms, 1 API call, 94 ms in API)_
