# Build IDs (FlowX dev-env, app <uuid>, WIP <uuid>)

Generic DB ops verified: params OBJECT substituted (filter with $in works). FIND result at <responseKey>.data (array, _id projected out). INSERT result at <responseKey>.data (doc with _id).

## Systems (name: resourceId / resourceDefinitionId)
- users: <uuid> / <uuid>
  - find <uuid>: filter <uuid>, sort <uuid>, limit <uuid>, skip <uuid>
  - insert <uuid>: doc <uuid>
  - update <uuid>: filter <uuid>, update <uuid>
  - delete <uuid>: filter <uuid>
- accounts: <uuid> / <uuid>
  - find <uuid>: filter <uuid>, sort <uuid>, limit <uuid>, skip <uuid>
  - update <uuid>: filter <uuid>, update <uuid>
- customers: <uuid> / <uuid>
  - find <uuid>: filter <uuid>, sort <uuid>, limit <uuid>, skip <uuid>
  - update <uuid>: filter <uuid>, update <uuid>
- card_xref: <uuid> / <uuid>
  - find <uuid>: filter <uuid>, sort <uuid>, limit <uuid>, skip <uuid>
- cards: <uuid> / <uuid>
  - find <uuid>: filter <uuid>, sort <uuid>, limit <uuid>, skip <uuid>
  - update <uuid>: filter <uuid>, update <uuid>
- transactions: <uuid> / <uuid>
  - find <uuid>: filter <uuid>, sort <uuid>, limit <uuid>, skip <uuid>
  - insert <uuid>: doc <uuid>
- job_requests: <uuid> / <uuid>
  - insert <uuid>: doc <uuid>

## Data types (resourceDefinitionId)
User <uuid>, Account <uuid>, Customer <uuid>, CardXref <uuid>, Card <uuid>, Transaction <uuid>, JobRequest <uuid>

## db_exec workflow (queue runner, verified looping)
- resourceId <uuid> / resDefId <uuid>
- input ops:[{k:"<store>.<op>", p:{filter,sort,limit,skip,doc,update}}] -> returns {results:[{k,ok,data}]}
- keys: users.find/insert/update/delete, accounts.find/update, customers.find/update, card_xref.find, cards.find/update, transactions.find/insert, job_requests.insert

## ui_carddemo dispatcher (online screens, verified: signon, acctview, admin list, user add/delete)
- resourceId <uuid> / resDefId <uuid>
- step SCRIPT node 6ae906783695c563ea51c146 = scripts/ui_carddemo.js
- startParams {"type":"<action>","sess":${sess},"f":${<screen key>}}; returns view keys that override UI state

## UI Flow CardDemo
- resourceId <uuid>, PAGE 64148 (flowxUuid <uuid>)

## Scratch
- zz_test_db workflow deleted; test users ZZTEST01/ZZTEST02 deleted. Stores are empty (operator seeds them).
- Final checks: analyze_ui_flow 0 errors (213 warnings, all label-not-substitution-tag — see assumptions A6); analyze_workflow ui_carddemo clean.
