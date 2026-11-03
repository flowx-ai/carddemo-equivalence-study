# Workflow: zz_test_seed

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** TEMP: loads test data for build verification. Delete before hand-over.

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae3a3893695c563ea50f79b | <uuid> | (0, 0) | → seed users (seq:<uuid>) |
| seed users | DATA_SOURCE | 6ae3a3903695c563ea50f7a1 | <uuid> | (500, 0) | → seed accounts [SUCCESS] (seq:<uuid>) | responseKey: r_users, endpoint: <uuid> |
| End | END | 6ae3a3933695c563ea50f7a4 | <uuid> | (3000, 0) | — |
| seed accounts | DATA_SOURCE | 6ae3a3973695c563ea50f7a5 | <uuid> | (1000, 0) | → seed customers [SUCCESS] (seq:<uuid>) | responseKey: r_accounts, endpoint: <uuid> |
| seed customers | DATA_SOURCE | 6ae3a39b3695c563ea50f7a8 | <uuid> | (1500, 0) | → seed xref [SUCCESS] (seq:<uuid>) | responseKey: r_customers, endpoint: <uuid> |
| seed xref | DATA_SOURCE | 6ae3a39e3695c563ea50f7ab | <uuid> | (2000, 0) | → seed transactions [SUCCESS] (seq:<uuid>) | responseKey: r_xref, endpoint: <uuid> |
| seed transactions | DATA_SOURCE | 6ae3a3a23695c563ea50f7ae | <uuid> | (2500, 0) | → End [SUCCESS] (seq:<uuid>) | responseKey: r_tran, endpoint: <uuid> |

## Systems
- NOSQL_DB system, resourceDefinitionId <uuid> — bound by DATA_SOURCE node(s): seed users
- NOSQL_DB system, resourceDefinitionId <uuid> — bound by DATA_SOURCE node(s): seed accounts
- NOSQL_DB system, resourceDefinitionId <uuid> — bound by DATA_SOURCE node(s): seed customers
- NOSQL_DB system, resourceDefinitionId <uuid> — bound by DATA_SOURCE node(s): seed xref
- NOSQL_DB system, resourceDefinitionId <uuid> — bound by DATA_SOURCE node(s): seed transactions

## Data source bindings

### seed users (DATA_SOURCE, id=6ae3a3903695c563ea50f7a1)
- **system:** NOSQL_DB — users (resourceDefinitionId: <uuid>)
- **operation:** zzTestSeed — flowxUuid <uuid>
- **responseKey:** r_users
- **variables:** _(none bound)_

### seed accounts (DATA_SOURCE, id=6ae3a3973695c563ea50f7a5)
- **system:** NOSQL_DB — accounts (resourceDefinitionId: <uuid>)
- **operation:** zzTestSeed — flowxUuid <uuid>
- **responseKey:** r_accounts
- **variables:** _(none bound)_

### seed customers (DATA_SOURCE, id=6ae3a39b3695c563ea50f7a8)
- **system:** NOSQL_DB — customers (resourceDefinitionId: <uuid>)
- **operation:** zzTestSeed — flowxUuid <uuid>
- **responseKey:** r_customers
- **variables:** _(none bound)_

### seed xref (DATA_SOURCE, id=6ae3a39e3695c563ea50f7ab)
- **system:** NOSQL_DB — card_xref (resourceDefinitionId: <uuid>)
- **operation:** zzTestSeed — flowxUuid <uuid>
- **responseKey:** r_xref
- **variables:** _(none bound)_

### seed transactions (DATA_SOURCE, id=6ae3a3a23695c563ea50f7ae)
- **system:** NOSQL_DB — transactions (resourceDefinitionId: <uuid>)
- **operation:** zzTestSeed — flowxUuid <uuid>
- **responseKey:** r_tran
- **variables:** _(none bound)_

_(server: 1218 ms, 7 API calls, 1212 ms in API)_
