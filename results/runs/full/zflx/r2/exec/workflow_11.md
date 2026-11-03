# Workflow: batch_cardprint

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** Card file print (CBACT02C). Input carddata.dat. Output cardprint_sysout.txt.

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae87eb03695c563ea51af4c | <uuid> | (0, 0) | → Card print (seq:<uuid>) |
| Card print | SCRIPT | 6ae87eb93695c563ea51af58 | <uuid> | (500, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae87ec33695c563ea51af5f | <uuid> | (1000, 0) | — |

## Systems
_(none)_

## Scripts

### Card print (SCRIPT, id=6ae87eb93695c563ea51af58)

```javascript
function inp(names) { for (var i = 0; i < names.length; i++) { var v = input[names[i]]; if (v !== undefined && v !== null) return v; } return null; }
function lines(v) { if (v === null || v === undefined) return null; var a = []; if (typeof v === 'string') a = v.split(/\r?\n/); else { var c = JSON.parse(JSON.stringify(v)); for (var i = 0; i < c.length; i++) a.push(String(c[i])); } var o = []; for (var j = 0; j < a.length; j++) if (a[j].replace(/\s+$/, '') !== '') o.push(a[j]); return o; }
function rt(s) { return String(s).replace(/\s+$/, ''); }
function printStep(S, P, F, D, K, T) {
  var ll = lines(inp([F + '.dat', F])), sys = ['START OF EXECUTION OF PROGRAM ' + P], res;
  if (ll === null) { sys.push('ERROR OPENING ' + D); sys.push('ABENDING PROGRAM'); res = {}; res[S + '_sysout.txt'] = sys; res[S + '_rc.txt'] = '999'; res.returnCode = 999; return res; }
  ll.map(function (r) { return { r: r, k: K(r) }; }).sort(function (p, q) { return p.k < q.k ? -1 : p.k > q.k ? 1 : 0; })
    .forEach(function (e) { for (var i = 0; i < T; i++) sys.push(rt(e.r)); });
  sys.push('END OF EXECUTION OF PROGRAM ' + P);
  res = {}; res[S + '_sysout.txt'] = sys; res.returnCode = 0; return res;
}
output.result = printStep('cardprint', 'CBACT02C', 'carddata', 'CARDFILE', function (r) { return r.substring(0, 16); }, 1);
```

_(server: 161 ms, 1 API call, 158 ms in API)_
