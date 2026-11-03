# Workflow: batch_cbexport

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** Customer data export (CBEXPORT). Inputs custdata, acctdata, cardxref, transact, carddata. Outputs export, export_sysout.

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae902793695c563ea51c07c | <uuid> | (0, 0) | → Export (seq:<uuid>) |
| Export | SCRIPT | 6ae902873695c563ea51c088 | <uuid> | (500, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae902953695c563ea51c093 | <uuid> | (1000, 0) | — |

## Systems
_(none)_

## Scripts

### Export (SCRIPT, id=6ae902873695c563ea51c088)

```javascript
// ---- common helpers ----
var RT = String(additionalData.applicationConfiguration.RUN_TIMESTAMP || "2022-07-18 10:00:00");
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
function parseXref(l) { l = pad(l, 50); return { card_num: rs(l.substr(0, 16)), cust_id: num(l.substr(16, 9)), acct_id: num(l.substr(25, 11)) }; }
function parseCard(l) { l = pad(l, 150); return { card_num: rs(l.substr(0, 16)), acct_id: num(l.substr(16, 11)), cvv_cd: num(l.substr(27, 3)), embossed_name: rs(l.substr(30, 50)), expiration_date: rs(l.substr(80, 10)), active_status: rs(l.substr(90, 1)) }; }
function parseCust(l) {
  l = pad(l, 500);
  return { cust_id: num(l.substr(0, 9)), first_name: rs(l.substr(9, 25)), middle_name: rs(l.substr(34, 25)), last_name: rs(l.substr(59, 25)),
    addr_line_1: rs(l.substr(84, 50)), addr_line_2: rs(l.substr(134, 50)), addr_line_3: rs(l.substr(184, 50)), addr_state_cd: rs(l.substr(234, 2)),
    addr_country_cd: rs(l.substr(236, 3)), addr_zip: rs(l.substr(239, 10)), phone_num_1: rs(l.substr(249, 15)), phone_num_2: rs(l.substr(264, 15)),
    ssn: num(l.substr(279, 9)), govt_issued_id: rs(l.substr(288, 20)), dob: rs(l.substr(308, 10)), eft_account_id: rs(l.substr(318, 10)),
    pri_card_holder_ind: rs(l.substr(328, 1)), fico_credit_score: num(l.substr(329, 3)) };
}
var R = {};
function openAll(files, sysout) {
  for (var i = 0; i < files.length; i++) {
    if (getIn(files[i][0]) === null) { sysout.push(files[i][1]); sysout.push("FILE STATUS IS: NNNN0035"); sysout.push("ABENDING PROGRAM"); return 999; }
  }
  return 0;
}
function finish(step, sysout, rc) { R[step + "_sysout"] = sysout; if (rc) R[step + "_rc"] = rc; output.result = R; }
// ---- end common ----

// CBEXPORT - customer data export: C, A, X, T, D sections in that order
var sysout = ["CBEXPORT: Starting Customer Data Export"], recs = [];
var rc = openAll([["custdata", "CBEXPORT: Error opening customer file"], ["acctdata", "CBEXPORT: Error opening account file"],
  ["cardxref", "CBEXPORT: Error opening cross reference file"], ["transact", "CBEXPORT: Error opening transaction file"],
  ["carddata", "CBEXPORT: Error opening card file"]], sysout);
if (!rc) {
  var stamp = RT.substring(0, 19) + ".00", seq = 0, counts = { C: 0, A: 0, X: 0, T: 0, D: 0 };
  var emit = function (type, fields) {
    seq++; counts[type]++;
    var r = { rec_type: type, seq: seq, branch_id: "0001", region_code: "NORTH" };
    for (var k in fields) r[k] = fields[k];
    r.timestamp = stamp; recs.push(r);
  };
  sysout.push("CBEXPORT: Export Date: " + RT.substring(0, 10));
  sysout.push("CBEXPORT: Export Time: " + RT.substring(11, 19));
  lines(getIn("custdata")).forEach(function (l) { var c = parseCust(l); c.ssn = null; emit("C", c); }); // BR-04: SSN excluded from the export
  sysout.push("CBEXPORT: Customers exported: " + counts.C);
  lines(getIn("acctdata")).forEach(function (l) { emit("A", acctOut(parseAcct(l))); });
  sysout.push("CBEXPORT: Accounts exported: " + counts.A);
  lines(getIn("cardxref")).forEach(function (l) { emit("X", parseXref(l)); });
  sysout.push("CBEXPORT: Cross-references exported: " + counts.X);
  lines(getIn("transact")).forEach(function (l) { emit("T", tranOut(parseTran(l))); });
  sysout.push("CBEXPORT: Transactions exported: " + counts.T);
  lines(getIn("carddata")).forEach(function (l) { emit("D", parseCard(l)); });
  sysout.push("CBEXPORT: Cards exported: " + counts.D);
  sysout.push("CBEXPORT: Export completed");
  sysout.push("CBEXPORT: Total Records Exported: " + seq);
}
R.export = recs;
finish("export", sysout, rc);
```

_(server: 138 ms, 1 API call, 135 ms in API)_
