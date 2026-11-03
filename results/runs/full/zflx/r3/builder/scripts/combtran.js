// COMBTRAN (SORT/REPRO) - merge posted + system transactions, ordered by transaction id
function zenc(c, width) { var neg = c < 0, d = lpad(Math.abs(Math.round(c)), width); var last = parseInt(d.charAt(width - 1), 10); return d.substring(0, width - 1) + (neg ? "}JKLMNOPQR" : "{ABCDEFGHI").charAt(last); }
function encTran(t) {
  return pad(t.tran_id, 16) + pad(t.type_cd, 2) + lpad(t.cat_cd, 4) + pad(t.source, 10) + pad(t.desc, 100) + zenc(Math.round(Number(t.amt) * 100), 11) +
    lpad(t.merchant_id, 9) + pad(t.merchant_name, 50) + pad(t.merchant_city, 50) + pad(t.merchant_zip, 10) + pad(t.card_num, 16) + pad(t.orig_ts, 26) + pad(t.proc_ts, 26) + pad("", 20);
}
function readTrans(base) {
  var v = getIn(base); if (v === null) return [];
  if (typeof v !== "string" && v.length > 0 && typeof v[0] === "object") { var r = []; for (var i = 0; i < v.length; i++) r.push(v[i]); return r; }
  return lines(v).map(function (l) { return tranOut(parseTran(l)); });
}
var a = readTrans("transact"), b = readTrans("systran");
var all = a.concat(b).map(function (t, i) { return { t: t, i: i }; });
all.sort(function (x, y) { var p = pad(x.t.tran_id, 16), q = pad(y.t.tran_id, 16); return p < q ? -1 : p > q ? 1 : x.i - y.i; });
var seen = {}, dups = 0, out = [];
for (var i = 0; i < all.length; i++) { var id = all[i].t.tran_id; if (seen[id]) dups++; seen[id] = true; out.push(all[i].t); }
output.combtran_transact = out;
output.combtran_transact_txt = out.map(encTran);
output.combtran_sysout = ["COMBTRAN: INPUT A " + a.length + ", INPUT B " + b.length + ", OUTPUT " + out.length + ", DUPLICATE KEYS " + dups];
output.combtran_rc = dups > 0 ? 12 : 0;
