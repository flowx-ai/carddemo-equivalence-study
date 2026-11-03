# Acceptance Criteria: Transaction Posting

> **Powered by FLOWX.AI Coding Agents** · `@regression`

Verifies [Transaction Posting](../02-processes/process-transaction-posting.md) (`CBTRN01–03C`/POSTTRAN). **Critical regression** — balances must match the legacy batch exactly.

## Configuration Dependencies

| Config | Effect |
|--------|--------|
| Business date / cycle | Which daily file is posted |

## Scenarios

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 1 | Post a valid daily file (happy) | Run with a known daily file | All valid txns posted; balances match legacy |
| 2 | Over-limit transaction (gateway → reject) | Txn exceeds available credit | Routed to rejects, not posted |
| 3 | Inactive account (gateway → reject) | Account status N | Rejected |
| 4 | Category balance update (business rule) | Valid txn | TCATBAL for account+type+category increased |
| 5 | Empty daily file (edge) | No input | Run completes, nothing posted |
| 6 | Mixed valid/invalid | File with both | Valid posted, invalid rejected; counts match legacy `DALYREJS` |

## Data Mapping Verification

| Flow | Verify |
|------|--------|
| Loop (`inputKey=dailyTransactions`) | each transaction processed once |
| Save Account + Balances | account balance + TCATBAL persisted |

## Legacy Comparison

| Input | Legacy `CBTRN02C` | FLOWX |
|-------|-------------------|-------|
| daily file | posted balances + rejects | identical balances + reject set |

---
*Powered by **FLOWX.AI** Coding Agents*
