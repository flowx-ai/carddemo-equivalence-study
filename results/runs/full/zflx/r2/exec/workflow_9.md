# Workflow: batch_import

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** Customer data import (CBIMPORT). Input export.json. Output import_customers/accounts/card_xref/transactions/cards/errors .json, import_sysout.txt.

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae87eb43695c563ea51af56 | <uuid> | (0, 0) | → Import (seq:<uuid>) |
| Import | SCRIPT | 6ae87ebe3695c563ea51af5d | <uuid> | (500, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae87ec83695c563ea51af6c | <uuid> | (1000, 0) | — |

## Systems
_(none)_

## Scripts

### Import (SCRIPT, id=6ae87ebe3695c563ea51af5d)

```javascript
function inp(names) { for (var i = 0; i < names.length; i++) { var v = input[names[i]]; if (v !== undefined && v !== null) return v; } return null; }
var v = inp(['export.json', 'export']), sys = ['CBIMPORT: Starting Customer Data Import'], res;
if (v === null) { sys.push('ERROR OPENING EXPFILE'); sys.push('ABENDING PROGRAM'); res = { 'import_sysout.txt': sys, 'import_rc.txt': '999', returnCode: 999 }; }
else {
  var recs = typeof v === 'string' ? JSON.parse(v) : JSON.parse(JSON.stringify(v));
  var M = { C: [], A: [], X: [], T: [], D: [] }, E = [], META = { rec_type: 1, seq: 1, branch_id: 1, region_code: 1, timestamp: 1 };
  recs.forEach(function (r) {
    var t = r.rec_type === undefined || r.rec_type === null ? '' : String(r.rec_type);
    if (M[t]) { var o = {}; for (var k in r) if (!META[k]) o[k] = r[k]; M[t].push(o); }
    else E.push({ rec_type: t, seq: r.seq === undefined ? null : r.seq, message: 'Unknown record type: ' + t });
  });
  sys.push('CBIMPORT: Total Records Read: ' + recs.length);
  sys.push('CBIMPORT: Customers Imported: ' + M.C.length); sys.push('CBIMPORT: Accounts Imported: ' + M.A.length);
  sys.push('CBIMPORT: XRefs Imported: ' + M.X.length); sys.push('CBIMPORT: Transactions Imported: ' + M.T.length);
  sys.push('CBIMPORT: Cards Imported: ' + M.D.length); sys.push('CBIMPORT: Errors Found: ' + E.length);
  sys.push('CBIMPORT: Import completed');
  res = { 'import_customers.json': M.C, 'import_accounts.json': M.A, 'import_card_xref.json': M.X, 'import_transactions.json': M.T,
    'import_cards.json': M.D, 'import_errors.json': E, 'import_sysout.txt': sys, returnCode: 0 };
}
output.result = res;
```

_(server: 130 ms, 1 API call, 126 ms in API)_
