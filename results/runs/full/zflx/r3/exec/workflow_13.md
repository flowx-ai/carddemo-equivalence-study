# Workflow: batch_cbtrn01c

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** Daily transaction check (CBTRN01C). Inputs dailytran, cardxref, acctdata. Output dailycheck_sysout.

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae902783695c563ea51c07a | <uuid> | (0, 0) | → Check daily transactions (seq:<uuid>) |
| Check daily transactions | SCRIPT | 6ae902863695c563ea51c087 | <uuid> | (500, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae902943695c563ea51c092 | <uuid> | (1000, 0) | — |

## Systems
_(none)_

## Scripts

### Check daily transactions (SCRIPT, id=6ae902863695c563ea51c087)

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
function parseXref(l) { l = pad(l, 50); return { card_num: rs(l.substr(0, 16)), cust_id: num(l.substr(16, 9)), acct_id: num(l.substr(25, 11)), raw: l }; }
var R = {};
function openAll(files, sysout) {
  for (var i = 0; i < files.length; i++) {
    if (getIn(files[i][0]) === null) { sysout.push(files[i][1]); sysout.push("FILE STATUS IS: NNNN0035"); sysout.push("ABENDING PROGRAM"); return 999; }
  }
  return 0;
}
function finish(step, sysout, rc) { R[step + "_sysout"] = sysout; if (rc) R[step + "_rc"] = rc; output.result = R; }
// ---- end common ----

// CBTRN01C - daily transaction check (card -> xref -> account), log only
var sysout = ["START OF EXECUTION OF PROGRAM CBTRN01C"];
var rc = openAll([["dailytran", "ERROR OPENING DAILY TRANSACTION FILE"], ["cardxref", "ERROR OPENING CROSS REF FILE"],
  ["acctdata", "ERROR OPENING ACCOUNT FILE"]], sysout);
if (!rc) {
  var xrefMap = {}, xl = lines(getIn("cardxref"));
  for (var i = 0; i < xl.length; i++) { var x = parseXref(xl[i]); if (!(x.card_num in xrefMap)) xrefMap[x.card_num] = x; }
  var acctMap = {}, al = lines(getIn("acctdata"));
  for (var i = 0; i < al.length; i++) { acctMap[num(pad(al[i], 300).substr(0, 11))] = true; }
  var dl = lines(getIn("dailytran"));
  for (var i = 0; i < dl.length; i++) {
    var l = pad(dl[i], 350), tranId = l.substr(0, 16), card = rs(l.substr(262, 16));
    sysout.push(rs(l));
    var x = xrefMap[card];
    if (x) {
      sysout.push("SUCCESSFUL READ OF XREF");
      sysout.push("CARD NUMBER: " + pad(x.card_num, 16));
      sysout.push("ACCOUNT ID : " + lpad(x.acct_id, 11));
      sysout.push("CUSTOMER ID: " + lpad(x.cust_id, 9));
      if (acctMap[x.acct_id]) sysout.push("SUCCESSFUL READ OF ACCOUNT FILE");
      else { sysout.push("INVALID ACCOUNT NUMBER FOUND"); sysout.push("ACCOUNT " + lpad(x.acct_id, 11) + " NOT FOUND"); }
    } else {
      sysout.push("INVALID CARD NUMBER FOR XREF");
      sysout.push("CARD NUMBER " + pad(card, 16) + " COULD NOT BE VERIFIED. SKIPPING TRANSACTION ID-" + tranId);
    }
  }
  sysout.push("END OF EXECUTION OF PROGRAM CBTRN01C");
}
finish("dailycheck", sysout, rc);
```

_(server: 98 ms, 1 API call, 95 ms in API)_
