// ---- common helpers (copied into each batch SCRIPT node) ----
var RT = String(additionalData.applicationConfiguration.RUN_TIMESTAMP || "2022-07-18 10:00:00");
function db2ts(rt) { return rt.substring(0, 10) + "-" + rt.substring(11, 19).replace(/:/g, ".") + ".000000"; }
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
function zoned(s) { // signed zoned decimal (overpunch) -> integer of the implied-decimal units
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
function parseAcct(l) {
  l = pad(l, 300);
  return { acct_id: num(l.substr(0, 11)), active_status: rs(l.substr(11, 1)), bal: zoned(l.substr(12, 12)), lim: zoned(l.substr(24, 12)),
    cash: zoned(l.substr(36, 12)), open_date: rs(l.substr(48, 10)), expiration_date: rs(l.substr(58, 10)), reissue_date: rs(l.substr(68, 10)),
    cred: zoned(l.substr(78, 12)), deb: zoned(l.substr(90, 12)), addr_zip: rs(l.substr(102, 10)), group_id: rs(l.substr(112, 10)), raw: l };
}
function acctOut(a) {
  return { acct_id: a.acct_id, active_status: a.active_status, curr_bal: amt(a.bal), credit_limit: amt(a.lim), cash_credit_limit: amt(a.cash),
    open_date: a.open_date, expiration_date: a.expiration_date, reissue_date: a.reissue_date, curr_cyc_credit: amt(a.cred), curr_cyc_debit: amt(a.deb),
    addr_zip: a.addr_zip, group_id: a.group_id };
}
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
function parseXref(l) { l = pad(l, 50); return { card_num: rs(l.substr(0, 16)), cust_id: num(l.substr(16, 9)), acct_id: num(l.substr(25, 11)), raw: l }; }
function parseCard(l) { l = pad(l, 150); return { card_num: rs(l.substr(0, 16)), acct_id: num(l.substr(16, 11)), cvv_cd: num(l.substr(27, 3)), embossed_name: rs(l.substr(30, 50)), expiration_date: rs(l.substr(80, 10)), active_status: rs(l.substr(90, 1)), raw: l }; }
function parseCust(l) {
  l = pad(l, 500);
  return { cust_id: num(l.substr(0, 9)), first_name: rs(l.substr(9, 25)), middle_name: rs(l.substr(34, 25)), last_name: rs(l.substr(59, 25)),
    addr_line_1: rs(l.substr(84, 50)), addr_line_2: rs(l.substr(134, 50)), addr_line_3: rs(l.substr(184, 50)), addr_state_cd: rs(l.substr(234, 2)),
    addr_country_cd: rs(l.substr(236, 3)), addr_zip: rs(l.substr(239, 10)), phone_num_1: rs(l.substr(249, 15)), phone_num_2: rs(l.substr(264, 15)),
    ssn: num(l.substr(279, 9)), govt_issued_id: rs(l.substr(288, 20)), dob: rs(l.substr(308, 10)), eft_account_id: rs(l.substr(318, 10)),
    pri_card_holder_ind: rs(l.substr(328, 1)), fico_credit_score: num(l.substr(329, 3)), raw: l };
}
function strip(o) { var r = {}; for (var k in o) if (k !== "raw") r[k] = o[k]; return r; }
// ---- end common ----
