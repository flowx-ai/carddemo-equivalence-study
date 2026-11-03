# Workflow: SaveNote

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** 

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae45b823695c563ea512925 | <uuid> | (0, 0) | → Prepare note (seq:<uuid>) |
| End | END | 6ae45b823695c563ea512926 | <uuid> | (1500, 0) | — |
| Prepare note | SCRIPT | 6ae45b823695c563ea512927 | <uuid> | (300, 0) | → Insert note (seq:<uuid>) | lang: JAVASCRIPT |
| Insert note | DATA_SOURCE | 6ae45b823695c563ea512928 | <uuid> | (600, 0) | → Compose message [SUCCESS] (seq:<uuid>) | responseKey: insertResult, endpoint: <uuid> |
| Compose message | SCRIPT | 6ae45b833695c563ea51292b | <uuid> | (900, 0) | → Escape text (seq:<uuid>) | lang: JAVASCRIPT |
| Escape text | SCRIPT | 6ae45b833695c563ea51292c | <uuid> | (1200, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |

## Systems
- NOSQL_DB system, resourceDefinitionId <uuid> — bound by DATA_SOURCE node(s): Insert note

## Scripts

### Prepare note (SCRIPT, id=6ae45b823695c563ea512927)

```javascript
output = {noteDocument: {text: input.record && input.record.text != null ? input.record.text : ""}};
```

### Compose message (SCRIPT, id=6ae45b833695c563ea51292b)

```javascript
output = {message: "Note saved."};
```

### Escape text (SCRIPT, id=6ae45b833695c563ea51292c)

```javascript
function esc(v) { return v == null ? null : JSON.stringify(String(v)).slice(1, -1).replace(/\\"/g, '"'); }
function at(o, p) { return p.split('.').reduce(function (x, k) { return x == null ? undefined : x[k]; }, o); }
output = {"endText": {t0: esc(at(input, "message"))}};

```

## Data source bindings

### Insert note (DATA_SOURCE, id=6ae45b823695c563ea512928)
- **system:** NOSQL_DB — NoteStore (resourceDefinitionId: <uuid>)
- **operation:** Insert Note — flowxUuid <uuid>
- **responseKey:** insertResult
- **variables:**
  - noteDocument [DB operation param] <uuid> ← `${noteDocument}`

_(server: 291 ms, 3 API calls, 288 ms in API)_
