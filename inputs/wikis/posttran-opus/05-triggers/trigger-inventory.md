# Trigger Inventory — AWS CardDemo → FLOWX.AI

> **Powered by FLOWX.AI Coding Agents**

How each process starts. Legacy online transactions are user-initiated (CICS tran codes / menu); batch is JCL job submission; authorization is MQ-message driven.

## Manual / Start-Event Triggers (Online)

Online transactions become FLOWX processes started from the FLOWX SDK UI or navigation. Each legacy tran code maps to a manual start.

| Process | Legacy Entry | FLOWX Trigger |
|---------|--------------|---------------|
| [Signon](../02-processes/process-signon.md) | CC00 | Manual (login page) |
| [Main Menu Router](../02-processes/process-main-menu.md) | CM00 | Call Activity from Signon / navigation |
| [Admin Menu Router](../02-processes/process-admin-menu.md) | CA00 | Call Activity from Signon / navigation |
| Account / Card / Transaction / Bill / Reports | CAVW…CR00 | Manual from menu navigation |
| [User Administration](../02-processes/process-user-administration.md) | CU00–CU03 | Manual from admin menu |

## Scheduled Triggers (Batch JCL)

The 37 JCL jobs become FLOWX **Scheduled Triggers** starting orchestration processes. Key schedules (cron to be defined per operations window):

| Scheduled Process | Legacy JCL | Suggested Schedule | Notes |
|-------------------|-----------|--------------------|-------|
| [Transaction Posting](../02-processes/process-transaction-posting.md) | `POSTTRAN`, `COMBTRAN`, `DALYREJS` | Nightly | GDG daily cycle → dated partition |
| [Interest Calculation](../02-processes/process-interest-calculation.md) | `INTCALC` | Monthly cycle | Depends on disclosure groups |
| [Statement Generation](../02-processes/process-statement-generation.md) | `CREASTMT`, `TXT2PDF1` | Monthly | After posting + interest |
| [Data Export](../04-integrations/workflow-dataexport.md) | `CBEXPORT`, `FTPJCL` | Daily/on-demand | Export file delivery |
| [Data Import](../04-integrations/workflow-dataimport.md) | `CBIMPORT` | On-demand | Bulk load |
| Purge Expired Authorizations | `CBPAUP0C`/`CBPAUP0J` | Daily | Auth module |
| Reference/report jobs | `TRANREPT`, `PRTCATBL` | Scheduled/on-demand | Reporting |

**Replaced infrastructure:** the Assembler/COBOL timers (`MVSWAIT`/`COBSWAIT`, `WAITSTEP.jcl`, `INTRDRJ1/2`) become platform scheduler waits — no explicit timer program needed.

**File-definition / utility JCL** (`ACCTFILE`, `CARDFILE`, `CUSTFILE`, `XREFFILE`, `TRANFILE`, `TCATBALF`, `DEFGDGB/D`, `OPENFIL`, `CLOSEFIL`, `ESDSRRDS`, `DEFCUST`, `DISCGRP`, `DUSRSECJ`, `READACCT/CARD/CUST/XREF`): these define/load/seed datasets. In FLOWX they become **one-time data-migration ETL** (see [implementation-overview](../11-implementation-plan/implementation-overview.md)), not runtime triggers.

## Message Triggers

| Process | Legacy Source | FLOWX Trigger |
|---------|---------------|---------------|
| [Authorization](../02-processes/process-authorization.md) | `COPAUA0C` MQ-triggered (CP00) | **Message Trigger** — [Authorization Gateway](../04-integrations/system-authorizationgateway.md) publishes requests to a Kafka topic that message-starts the process |

## Email Triggers

None in the legacy system. `{{TODO: Evaluate whether inbound email (e.g., statement requests, dispute intake) should start any process — a new capability.}}`

---
*Powered by **FLOWX.AI** Coding Agents*
