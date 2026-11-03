# Workflow: batch_cbact01c

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** Account extract (CBACT01C). Input acctdata. Outputs acctext_out, acctext_array, acctext_vb, acctext_sysout.

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae902753695c563ea51c072 | <uuid> | (0, 0) | → Account extract (seq:<uuid>) |
| Account extract | SCRIPT | 6ae902813695c563ea51c083 | <uuid> | (500, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae9028f3695c563ea51c08e | <uuid> | (1000, 0) | — |

## Systems
_(none)_

## Scripts

### Account extract (SCRIPT, id=6ae902813695c563ea51c083)

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
var R = {};
function openAll(files, sysout) {
  for (var i = 0; i < files.length; i++) {
    if (getIn(files[i][0]) === null) { sysout.push(files[i][1]); sysout.push("FILE STATUS IS: NNNN0035"); sysout.push("ABENDING PROGRAM"); return 999; }
  }
  return 0;
}
function finish(step, sysout, rc) { R[step + "_sysout"] = sysout; if (rc) R[step + "_rc"] = rc; output.result = R; }
// ---- end common ----

// CBACT01C - account extract
var sysout = ["START OF EXECUTION OF PROGRAM CBACT01C"], outRecs = [], arrRecs = [], vbRecs = [];
var rc = openAll([["acctdata", "ERROR OPENING ACCTFILE"]], sysout);
if (!rc) {
  var al = lines(getIn("acctdata"));
  for (var i = 0; i < al.length; i++) {
    var a = parseAcct(al[i]), r = a.raw;
    sysout.push("ACCT-ID                 :" + r.substr(0, 11));
    sysout.push("ACCT-ACTIVE-STATUS      :" + r.substr(11, 1));
    sysout.push("ACCT-CURR-BAL           :" + r.substr(12, 12));
    sysout.push("ACCT-CREDIT-LIMIT       :" + r.substr(24, 12));
    sysout.push("ACCT-CASH-CREDIT-LIMIT  :" + r.substr(36, 12));
    sysout.push("ACCT-OPEN-DATE          :" + r.substr(48, 10));
    sysout.push("ACCT-EXPIRAION-DATE     :" + r.substr(58, 10));
    sysout.push("ACCT-REISSUE-DATE       :" + r.substr(68, 10));
    sysout.push("ACCT-CURR-CYC-CREDIT    :" + r.substr(78, 12));
    sysout.push("ACCT-CURR-CYC-DEBIT     :" + r.substr(90, 12));
    sysout.push("ACCT-GROUP-ID           :" + r.substr(112, 10));
    sysout.push("-------------------------------------------------");
    outRecs.push({ acct_id: a.acct_id, active_status: a.active_status, curr_bal: amt(a.bal), credit_limit: amt(a.lim), cash_credit_limit: amt(a.cash),
      open_date: a.open_date, expiration_date: a.expiration_date, reissue_date: a.reissue_date.replace(/-/g, ""),
      curr_cyc_credit: amt(a.cred), curr_cyc_debit: a.deb === 0 ? 2525.00 : null, group_id: a.group_id });
    arrRecs.push({ acct_id: a.acct_id, curr_bal_1: amt(a.bal), curr_cyc_debit_1: 1005.00, curr_bal_2: amt(a.bal), curr_cyc_debit_2: 1525.00,
      curr_bal_3: -1025.00, curr_cyc_debit_3: -2500.00, curr_bal_4: null, curr_cyc_debit_4: null, curr_bal_5: null, curr_cyc_debit_5: null });
    vbRecs.push({ acct_id: a.acct_id, active_status: a.active_status });
    vbRecs.push({ acct_id: a.acct_id, curr_bal: amt(a.bal), credit_limit: amt(a.lim), reissue_yyyy: a.reissue_date.substring(0, 4) });
    sysout.push(rs(r));
  }
  sysout.push("END OF EXECUTION OF PROGRAM CBACT01C");
}
R.acctext_out = outRecs;
R.acctext_array = arrRecs;
R.acctext_vb = vbRecs;
finish("acctext", sysout, rc);
```

_(server: 98 ms, 1 API call, 94 ms in API)_
