# Workflow: batch_cbact02c

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** Card file print (CBACT02C). Input carddata. Output cardprint_sysout.

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae902763695c563ea51c074 | <uuid> | (0, 0) | → Print card file (seq:<uuid>) |
| Print card file | SCRIPT | 6ae902823695c563ea51c084 | <uuid> | (500, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae902903695c563ea51c08f | <uuid> | (1000, 0) | — |

## Systems
_(none)_

## Scripts

### Print card file (SCRIPT, id=6ae902823695c563ea51c084)

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

// CBACT02C - card file print
var P = { prog: "CBACT02C", step: "cardprint", input: "carddata", err: "ERROR OPENING CARDFILE", width: 150 };
var sysout = ["START OF EXECUTION OF PROGRAM " + P.prog];
var rc = openAll([[P.input, P.err]], sysout);
if (!rc) {
  var ll = lines(getIn(P.input));
  for (var i = 0; i < ll.length; i++) sysout.push(rs(pad(ll[i], P.width)));
  sysout.push("END OF EXECUTION OF PROGRAM " + P.prog);
}
finish(P.step, sysout, rc);
```

_(server: 96 ms, 1 API call, 92 ms in API)_
