# Process: Interest Calculation (Batch Pipeline)

> **Powered by FLOWX.AI Coding Agents**

| Field | Value |
|-------|-------|
| **Name** | Interest Calculation |
| **Type** | Scheduled Process (orchestration) |
| **Legacy Source** | `CBACT04C` (+ `CBACT01–03C`) via `INTCALC.jcl`; disclosure config `DISCGRP.jcl` |
| **Status** | Draft |
| **Related Data** | [Account](../01-data-model/project-data-model.md#account), [TransactionCategoryBalance](../01-data-model/project-data-model.md#transactioncategorybalance) |

## Business Description

Periodic pipeline that computes interest for each account based on its balance and disclosure/interest group, then posts the interest to the account. Replaces the `CBACT04C`/`INTCALC` batch. The interest-rate parameters come from the disclosure-group reference data (`DISCGRP`).

## Process Flow

```mermaid
flowchart LR
    Start((Scheduled Start)) --> ST0["Send/Receive:<br/>Load Accounts"]
    ST0 --> Loop["Service Task:<br/>For each account"]
    Loop --> ST1["Service Task:<br/>Compute Interest"]
    ST1 --> ST2["Service Task:<br/>Post Interest to Balance"]
    ST2 --> ST3["Send/Receive:<br/>Save Account"]
    ST3 --> GWEnd{{"More?"}}
    GWEnd -->|"Yes"| Loop
    GWEnd -->|"No"| End((End))
    style Start fill:#4A90D9,color:#fff
    style End fill:#D0021B,color:#fff
```

## Nodes

| # | Node | Type | Description | Legacy Reference |
|---|------|------|-------------|------------------|
| 1 | Scheduled Start | Start Event (Scheduled Trigger) | Interest cycle | `INTCALC.jcl` |
| 2 | Load Accounts | Send/Receive Message Task | Read accounts | `CBACT01C` read |
| 3 | For each account | Service Task (loop) | Iterate | main loop |
| 4 | Compute Interest | Service Task (NoOpHandler) | `interest = balance × rate(group)` | `CBACT04C` |
| 5 | Post Interest | Service Task (NoOpHandler) | Add interest to balance | balance update |
| 6 | Save Account | Send/Receive Message Task | Persist | `REWRITE ACCTFILE` |

## Business Rules

#### Rule: ComputeInterest
- **Legacy source:** `CBACT04C` interest computation using disclosure-group rate.
- **Logic:** `interest = currentBalance × interestRate(groupId)`; posted to balance and category balance.
- **FLOWX implementation:** NoOpHandler; interest rate from disclosure-group reference data / Configuration Parameter.
- `{{TODO: Extract exact interest formula, rounding, and grouping from CBACT04C + DISCGRP.}}`

## Integration Touchpoints

| Send Node | Topic | Payload | Receive | System |
|-----------|-------|---------|---------|--------|
| Load Accounts | `ai.flowx.in.carddemo.datastore.loadaccounts` | `{ page }` | Account[] | FlowX Persistence |
| Save Account | `ai.flowx.in.carddemo.datastore.saveaccount` | Account | ack | FlowX Persistence |

## Swimlanes

- **System**

---
*Powered by **FLOWX.AI** Coding Agents*
