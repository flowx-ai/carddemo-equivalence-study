# Acceptance Criteria: Statement Generation

> **Powered by FLOWX.AI Coding Agents** · `@regression`

Verifies [Statement Generation](../02-processes/process-statement-generation.md) (`CBSTM03A/B`/CREASTMT).

## Configuration Dependencies

| Config | Effect |
|--------|--------|
| `pdfRendererUrl` / document plugin | Statement rendering |

## Scenarios

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 1 | Generate statements (happy) | Run cycle | Statement per account; figures match legacy |
| 2 | PDF rendering (integration) | Render each statement | PDF produced with correct layout |
| 3 | Account with no activity (edge) | No transactions in cycle | Statement with zero activity |
| 4 | Customer notified (new capability) | Statement ready | StatementAvailable notification sent `{{DECISION: in scope?}}` |

## Data Mapping Verification

| Flow | Verify |
|------|--------|
| Build Statement Model | opening/closing balance, transaction list, totals |
| Render PDF | model → PDF ref |

## Legacy Comparison

| Input | Legacy `CBSTM03*` | FLOWX |
|-------|-------------------|-------|
| cycle | statement figures | identical figures |

---
*Powered by **FLOWX.AI** Coding Agents*
