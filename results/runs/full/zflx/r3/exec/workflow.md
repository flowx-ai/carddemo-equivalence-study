# Workflow: db_exec

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** Runs a queued list of CardDemo store operations (ops: [{k:"<store>.<op>", p:{...}}]) in order and returns results[] (one {ok, data} per op). Shared by the ui_* screen dispatchers.

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae904673695c563ea51c0b0 | <uuid> | (0, 0) | → next (seq:<uuid>) |
| next | SCRIPT | 6ae9046a3695c563ea51c0b5 | <uuid> | (500, 0) | → route op (seq:<uuid>) | lang: JAVASCRIPT |
| route op | FORK | 6ae9046d3695c563ea51c0b7 | <uuid> | (1000, 0) | → users.find [cond:<uuid>] (seq:<uuid>), → users.insert [cond:<uuid>] (seq:<uuid>), → users.update [cond:<uuid>] (seq:<uuid>), → users.delete [cond:<uuid>] (seq:<uuid>), → accounts.find [cond:<uuid>] (seq:<uuid>), → accounts.update [cond:<uuid>] (seq:<uuid>), → customers.find [cond:<uuid>] (seq:<uuid>), → customers.update [cond:<uuid>] (seq:<uuid>), → card_xref.find [cond:<uuid>] (seq:<uuid>), → cards.find [cond:<uuid>] (seq:<uuid>), → cards.update [cond:<uuid>] (seq:<uuid>), → transactions.find [cond:<uuid>] (seq:<uuid>), → transactions.insert [cond:<uuid>] (seq:<uuid>), → job_requests.insert [cond:<uuid>] (seq:<uuid>), → End [cond:<uuid>] (seq:<uuid>) | lang: JAVASCRIPT |
| End | END | 6ae904783695c563ea51c0c6 | <uuid> | (2000, -400) | — |
| users.find | DATA_SOURCE | 6ae904793695c563ea51c0cb | <uuid> | (1500, 0) | → next [SUCCESS] (seq:<uuid>), → next [FAIL] (seq:<uuid>) | responseKey: r, endpoint: <uuid> |
| users.insert | DATA_SOURCE | 6ae9047b3695c563ea51c0ce | <uuid> | (1500, 200) | → next [SUCCESS] (seq:<uuid>), → next [FAIL] (seq:<uuid>) | responseKey: r, endpoint: <uuid> |
| users.update | DATA_SOURCE | 6ae9047c3695c563ea51c0d3 | <uuid> | (1500, 400) | → next [SUCCESS] (seq:<uuid>), → next [FAIL] (seq:<uuid>) | responseKey: r, endpoint: <uuid> |
| users.delete | DATA_SOURCE | 6ae9047d3695c563ea51c0d6 | <uuid> | (1500, 600) | → next [SUCCESS] (seq:<uuid>), → next [FAIL] (seq:<uuid>) | responseKey: r, endpoint: <uuid> |
| accounts.find | DATA_SOURCE | 6ae9047f3695c563ea51c0d9 | <uuid> | (1500, 800) | → next [SUCCESS] (seq:<uuid>), → next [FAIL] (seq:<uuid>) | responseKey: r, endpoint: <uuid> |
| accounts.update | DATA_SOURCE | 6ae904803695c563ea51c0de | <uuid> | (1500, 1000) | → next [SUCCESS] (seq:<uuid>), → next [FAIL] (seq:<uuid>) | responseKey: r, endpoint: <uuid> |
| customers.find | DATA_SOURCE | 6ae904823695c563ea51c0e1 | <uuid> | (1500, 1200) | → next [SUCCESS] (seq:<uuid>), → next [FAIL] (seq:<uuid>) | responseKey: r, endpoint: <uuid> |
| customers.update | DATA_SOURCE | 6ae904853695c563ea51c0e8 | <uuid> | (1500, 1400) | → next [SUCCESS] (seq:<uuid>), → next [FAIL] (seq:<uuid>) | responseKey: r, endpoint: <uuid> |
| card_xref.find | DATA_SOURCE | 6ae904863695c563ea51c0eb | <uuid> | (1500, 1600) | → next [SUCCESS] (seq:<uuid>), → next [FAIL] (seq:<uuid>) | responseKey: r, endpoint: <uuid> |
| cards.find | DATA_SOURCE | 6ae904883695c563ea51c0f0 | <uuid> | (1500, 1800) | → next [SUCCESS] (seq:<uuid>), → next [FAIL] (seq:<uuid>) | responseKey: r, endpoint: <uuid> |
| cards.update | DATA_SOURCE | 6ae904893695c563ea51c0f4 | <uuid> | (1500, 2000) | → next [SUCCESS] (seq:<uuid>), → next [FAIL] (seq:<uuid>) | responseKey: r, endpoint: <uuid> |
| transactions.find | DATA_SOURCE | 6ae9048b3695c563ea51c0f5 | <uuid> | (1500, 2200) | → next [SUCCESS] (seq:<uuid>), → next [FAIL] (seq:<uuid>) | responseKey: r, endpoint: <uuid> |
| transactions.insert | DATA_SOURCE | 6ae9048c3695c563ea51c0f6 | <uuid> | (1500, 2400) | → next [SUCCESS] (seq:<uuid>), → next [FAIL] (seq:<uuid>) | responseKey: r, endpoint: <uuid> |
| job_requests.insert | DATA_SOURCE | 6ae9048d3695c563ea51c0f7 | <uuid> | (1500, 2600) | → next [SUCCESS] (seq:<uuid>), → next [FAIL] (seq:<uuid>) | responseKey: r, endpoint: <uuid> |

## Systems
- NOSQL_DB system, resourceDefinitionId <uuid> — bound by DATA_SOURCE node(s): users.find, users.insert, users.update, users.delete
- NOSQL_DB system, resourceDefinitionId <uuid> — bound by DATA_SOURCE node(s): accounts.find, accounts.update
- NOSQL_DB system, resourceDefinitionId <uuid> — bound by DATA_SOURCE node(s): customers.find, customers.update
- NOSQL_DB system, resourceDefinitionId <uuid> — bound by DATA_SOURCE node(s): card_xref.find
- NOSQL_DB system, resourceDefinitionId <uuid> — bound by DATA_SOURCE node(s): cards.find, cards.update
- NOSQL_DB system, resourceDefinitionId <uuid> — bound by DATA_SOURCE node(s): transactions.find, transactions.insert
- NOSQL_DB system, resourceDefinitionId <uuid> — bound by DATA_SOURCE node(s): job_requests.insert

## Scripts

### next (SCRIPT, id=6ae9046a3695c563ea51c0b5)

```javascript
// Queue runner: record the result of the op that just ran (if any), then pick the next op.
var res = [];
var prev = input.dbres;
if (prev) for (var j = 0; j < prev.length; j++) res.push(prev[j]);
if (input.cur) {
  var r = input.r;
  var ok = (r !== undefined && r !== null);
  res.push({ k: input.cur.k, ok: ok, data: (ok && r.data !== undefined) ? r.data : null });
}
var ops = input.ops || [];
var i = input.dbi || 0;
var cur = null;
if (i < ops.length) {
  var o = ops[i], p = o.p || {};
  cur = { k: String(o.k), p: { filter: p.filter || {}, sort: p.sort || {}, limit: (p.limit === undefined || p.limit === null) ? 1000 : p.limit,
    skip: p.skip || 0, doc: p.doc || {}, update: p.update || {} } };
}
output.dbi = i + 1;
output.cur = cur;
output.dbres = res;
output.r = null;
output.result = { results: res };
```

### route op (FORK, id=6ae9046d3695c563ea51c0b7)
  0. [IF] input.cur != null && input.cur.k === 'users.find'  (id: <uuid>)
  1. [ELSE_IF] input.cur != null && input.cur.k === 'users.insert'  (id: <uuid>)
  2. [ELSE_IF] input.cur != null && input.cur.k === 'users.update'  (id: <uuid>)
  3. [ELSE_IF] input.cur != null && input.cur.k === 'users.delete'  (id: <uuid>)
  4. [ELSE_IF] input.cur != null && input.cur.k === 'accounts.find'  (id: <uuid>)
  5. [ELSE_IF] input.cur != null && input.cur.k === 'accounts.update'  (id: <uuid>)
  6. [ELSE_IF] input.cur != null && input.cur.k === 'customers.find'  (id: <uuid>)
  7. [ELSE_IF] input.cur != null && input.cur.k === 'customers.update'  (id: <uuid>)
  8. [ELSE_IF] input.cur != null && input.cur.k === 'card_xref.find'  (id: <uuid>)
  9. [ELSE_IF] input.cur != null && input.cur.k === 'cards.find'  (id: <uuid>)
  10. [ELSE_IF] input.cur != null && input.cur.k === 'cards.update'  (id: <uuid>)
  11. [ELSE_IF] input.cur != null && input.cur.k === 'transactions.find'  (id: <uuid>)
  12. [ELSE_IF] input.cur != null && input.cur.k === 'transactions.insert'  (id: <uuid>)
  13. [ELSE_IF] input.cur != null && input.cur.k === 'job_requests.insert'  (id: <uuid>)
  14. [ELSE]   (id: <uuid>)

## Data source bindings

### users.find (DATA_SOURCE, id=6ae904793695c563ea51c0cb)
- **system:** NOSQL_DB — users (resourceDefinitionId: <uuid>)
- **operation:** find — flowxUuid <uuid>
- **responseKey:** r
- **variables:**
  - filter [DB operation param] <uuid> ← `${cur.p.filter}`
  - sort [DB operation param] <uuid> ← `${cur.p.sort}`
  - limit [DB operation param] <uuid> ← `${cur.p.limit}`
  - skip [DB operation param] <uuid> ← `${cur.p.skip}`

### users.insert (DATA_SOURCE, id=6ae9047b3695c563ea51c0ce)
- **system:** NOSQL_DB — users (resourceDefinitionId: <uuid>)
- **operation:** insert — flowxUuid <uuid>
- **responseKey:** r
- **variables:**
  - doc [DB operation param] <uuid> ← `${cur.p.doc}`

### users.update (DATA_SOURCE, id=6ae9047c3695c563ea51c0d3)
- **system:** NOSQL_DB — users (resourceDefinitionId: <uuid>)
- **operation:** update — flowxUuid <uuid>
- **responseKey:** r
- **variables:**
  - filter [DB operation param] <uuid> ← `${cur.p.filter}`
  - update [DB operation param] <uuid> ← `${cur.p.update}`

### users.delete (DATA_SOURCE, id=6ae9047d3695c563ea51c0d6)
- **system:** NOSQL_DB — users (resourceDefinitionId: <uuid>)
- **operation:** delete — flowxUuid <uuid>
- **responseKey:** r
- **variables:**
  - filter [DB operation param] <uuid> ← `${cur.p.filter}`

### accounts.find (DATA_SOURCE, id=6ae9047f3695c563ea51c0d9)
- **system:** NOSQL_DB — accounts (resourceDefinitionId: <uuid>)
- **operation:** find — flowxUuid <uuid>
- **responseKey:** r
- **variables:**
  - filter [DB operation param] <uuid> ← `${cur.p.filter}`
  - sort [DB operation param] <uuid> ← `${cur.p.sort}`
  - limit [DB operation param] <uuid> ← `${cur.p.limit}`
  - skip [DB operation param] <uuid> ← `${cur.p.skip}`

### accounts.update (DATA_SOURCE, id=6ae904803695c563ea51c0de)
- **system:** NOSQL_DB — accounts (resourceDefinitionId: <uuid>)
- **operation:** update — flowxUuid <uuid>
- **responseKey:** r
- **variables:**
  - filter [DB operation param] <uuid> ← `${cur.p.filter}`
  - update [DB operation param] <uuid> ← `${cur.p.update}`

### customers.find (DATA_SOURCE, id=6ae904823695c563ea51c0e1)
- **system:** NOSQL_DB — customers (resourceDefinitionId: <uuid>)
- **operation:** find — flowxUuid <uuid>
- **responseKey:** r
- **variables:**
  - filter [DB operation param] <uuid> ← `${cur.p.filter}`
  - sort [DB operation param] <uuid> ← `${cur.p.sort}`
  - limit [DB operation param] <uuid> ← `${cur.p.limit}`
  - skip [DB operation param] <uuid> ← `${cur.p.skip}`

### customers.update (DATA_SOURCE, id=6ae904853695c563ea51c0e8)
- **system:** NOSQL_DB — customers (resourceDefinitionId: <uuid>)
- **operation:** update — flowxUuid <uuid>
- **responseKey:** r
- **variables:**
  - filter [DB operation param] <uuid> ← `${cur.p.filter}`
  - update [DB operation param] <uuid> ← `${cur.p.update}`

### card_xref.find (DATA_SOURCE, id=6ae904863695c563ea51c0eb)
- **system:** NOSQL_DB — card_xref (resourceDefinitionId: <uuid>)
- **operation:** find — flowxUuid <uuid>
- **responseKey:** r
- **variables:**
  - filter [DB operation param] <uuid> ← `${cur.p.filter}`
  - sort [DB operation param] <uuid> ← `${cur.p.sort}`
  - limit [DB operation param] <uuid> ← `${cur.p.limit}`
  - skip [DB operation param] <uuid> ← `${cur.p.skip}`

### cards.find (DATA_SOURCE, id=6ae904883695c563ea51c0f0)
- **system:** NOSQL_DB — cards (resourceDefinitionId: <uuid>)
- **operation:** find — flowxUuid <uuid>
- **responseKey:** r
- **variables:**
  - filter [DB operation param] <uuid> ← `${cur.p.filter}`
  - sort [DB operation param] <uuid> ← `${cur.p.sort}`
  - limit [DB operation param] <uuid> ← `${cur.p.limit}`
  - skip [DB operation param] <uuid> ← `${cur.p.skip}`

### cards.update (DATA_SOURCE, id=6ae904893695c563ea51c0f4)
- **system:** NOSQL_DB — cards (resourceDefinitionId: <uuid>)
- **operation:** update — flowxUuid <uuid>
- **responseKey:** r
- **variables:**
  - filter [DB operation param] <uuid> ← `${cur.p.filter}`
  - update [DB operation param] <uuid> ← `${cur.p.update}`

### transactions.find (DATA_SOURCE, id=6ae9048b3695c563ea51c0f5)
- **system:** NOSQL_DB — transactions (resourceDefinitionId: <uuid>)
- **operation:** find — flowxUuid <uuid>
- **responseKey:** r
- **variables:**
  - filter [DB operation param] <uuid> ← `${cur.p.filter}`
  - sort [DB operation param] <uuid> ← `${cur.p.sort}`
  - limit [DB operation param] <uuid> ← `${cur.p.limit}`
  - skip [DB operation param] <uuid> ← `${cur.p.skip}`

### transactions.insert (DATA_SOURCE, id=6ae9048c3695c563ea51c0f6)
- **system:** NOSQL_DB — transactions (resourceDefinitionId: <uuid>)
- **operation:** insert — flowxUuid <uuid>
- **responseKey:** r
- **variables:**
  - doc [DB operation param] <uuid> ← `${cur.p.doc}`

### job_requests.insert (DATA_SOURCE, id=6ae9048d3695c563ea51c0f7)
- **system:** NOSQL_DB — job_requests (resourceDefinitionId: <uuid>)
- **operation:** insert — flowxUuid <uuid>
- **responseKey:** r
- **variables:**
  - doc [DB operation param] <uuid> ← `${cur.p.doc}`

_(server: 374 ms, 9 API calls, 354 ms in API)_
