# Workflow: batch_cbcus01c

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** Customer print (CBCUS01C). Input custdata. Output custprint_sysout.

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae902773695c563ea51c078 | <uuid> | (0, 0) | → Print customer file (seq:<uuid>) |
| Print customer file | SCRIPT | 6ae902853695c563ea51c086 | <uuid> | (500, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae902933695c563ea51c091 | <uuid> | (1000, 0) | — |

## Systems
_(none)_

## Scripts

### Print customer file (SCRIPT, id=6ae902853695c563ea51c086)

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
var R = {};
function openAll(files, sysout) {
  for (var i = 0; i < files.length; i++) {
    if (getIn(files[i][0]) === null) { sysout.push(files[i][1]); sysout.push("FILE STATUS IS: NNNN0035"); sysout.push("ABENDING PROGRAM"); return 999; }
  }
  return 0;
}
function finish(step, sysout, rc) { R[step + "_sysout"] = sysout; if (rc) R[step + "_rc"] = rc; output.result = R; }
// ---- end common ----

// CBCUS01C - customer file print
var P = { prog: "CBCUS01C", step: "custprint", input: "custdata", err: "ERROR OPENING CUSTFILE", width: 500 };
var sysout = ["START OF EXECUTION OF PROGRAM " + P.prog];
var rc = openAll([[P.input, P.err]], sysout);
if (!rc) {
  var ll = lines(getIn(P.input));
  for (var i = 0; i < ll.length; i++) sysout.push(rs(pad(ll[i], P.width)));
  sysout.push("END OF EXECUTION OF PROGRAM " + P.prog);
}
finish(P.step, sysout, rc);
```

_(server: 159 ms, 1 API call, 156 ms in API)_
