# Acceptance Criteria: Reports

> **Powered by FLOWX.AI Coding Agents** · `@regression`

Verifies [Reports](../02-processes/process-reports.md) (`CORPT00C`/CR00).

## Configuration Dependencies

| Config | Effect |
|--------|--------|
| `pdfRendererUrl` | PDF generation |

## Scenarios

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 1 | Generate report (happy) | Valid date range; Generate | Report produced, PDF offered |
| 2 | From > To date (validator) | from 2024-05-31, to 2024-05-01 | Range validation error |
| 3 | Missing required date (validator) | Leave To empty | Required error |
| 4 | Empty result set (edge) | Range with no transactions | Report with zero rows, no error |
| 5 | PDF render failure (integration error) | Renderer unavailable | Error surfaced; retry offered `{{TODO: define retry}}` |

## Data Mapping Verification

| Flow | Verify |
|------|--------|
| Query Report Data | `{from,to,filters}` → aggregate rows |
| Render PDF | report model → PDF ref |

---
*Powered by **FLOWX.AI** Coding Agents*
