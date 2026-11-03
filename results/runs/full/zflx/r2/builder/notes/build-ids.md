# Build IDs

## Data types (resDefId)
- User <uuid> (resId <uuid>)
- Account <uuid>
- Customer <uuid>
- CardXref <uuid>
- Card <uuid>
- Transaction <uuid>
- JobRequest <uuid>

## DB systems (resourceId / resDefId)
- users <uuid> / <uuid>
- accounts <uuid> / <uuid>
- customers <uuid> / <uuid>
- card_xref <uuid> / <uuid>
- cards <uuid> / <uuid>
- transactions <uuid> / <uuid>
- job_requests <uuid> / <uuid>

## Workflow ui_carddemo: resId <uuid> / resDefId <uuid>
- Logic node 6ae873bb3695c563ea51ad1a (uuid 495b9a79-...), Route FORK 6ae873be3695c563ea51ad1b, End 6ae873c73695c563ea51ad1c

## TEMP test ops/workflows: zzInsertMany / zzDeleteMany ops and zz_fixture / zz_test_db / zz_batchgen workflows — ALL DELETED (2026-11-02); stores left empty.

## Batch workflows (resourceId / resourceDefinitionId) — one SCRIPT node each, END payload ${result}
- batch_posttran <uuid> / <uuid>
- batch_intcalc <uuid> / <uuid>
- batch_creastmt <uuid> / <uuid>
- batch_tranrept <uuid> / <uuid>
- batch_acctext <uuid> / <uuid>
- batch_cardprint <uuid> / <uuid>
- batch_xrefprint <uuid> / <uuid>
- batch_custprint <uuid> / <uuid>
- batch_dailycheck <uuid> / <uuid>
- batch_export <uuid> / <uuid>
- batch_import <uuid> / <uuid>

## Ops: route -> op flowxUuid | params (filter,sort,limit,skip) or (filter,update) or (doc)
- users.find <uuid> | <uuid>, <uuid>, <uuid>, <uuid>
- users.insert <uuid> | <uuid>
- users.update <uuid> | <uuid>, <uuid>
- users.delete <uuid> | <uuid>
- accounts.find <uuid> | <uuid>, <uuid>, <uuid>, <uuid>
- accounts.update <uuid> | <uuid>, <uuid>
- customers.find <uuid> | <uuid>, <uuid>, <uuid>, <uuid>
- customers.update <uuid> | <uuid>, <uuid>
- card_xref.find <uuid> | <uuid>, <uuid>, <uuid>, <uuid>
- cards.find <uuid> | <uuid>, <uuid>, <uuid>, <uuid>
- cards.update <uuid> | <uuid>, <uuid>
- transactions.find <uuid> | <uuid>, <uuid>, <uuid>, <uuid>
- transactions.insert <uuid> | <uuid>
- job_requests.insert <uuid> | <uuid>
