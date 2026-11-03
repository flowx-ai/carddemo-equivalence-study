# Plugin: transaction-report-document

| Property | Value |
|----------|-------|
| Plugin Type | Document Plugin |
| Used by | [transaction-report](../02-processes/process-transaction-report.md) (P-18), started by [report-request](../02-processes/process-report-request.md) |
| Legacy Source | `CBTRN03C`, copybooks `CVTRA05Y`, `CVTRA03Y`, `CVTRA04Y`, `CVACT03Y`; job `TRANREPT.jcl`; PARM date range |
| Mapping | PL-02 |

## Content

| Section | Data | Legacy Source |
|---------|------|---------------|
| Header | report title, start date, end date, page number | `CBTRN03C` |
| Detail line | transaction id, account id, type code and description, category code and description, source, amount | `CBTRN03C` |
| Account total | sum of amounts per account/card (break on card number) | `CBTRN03C` |
| Page total | sum per page | `CBTRN03C` |
| Grand total | sum for the report | `CBTRN03C` |

## Data Mapping

| Template variable | Source |
|-------------------|--------|
| `report.startDate`, `report.endDate` | process start data `reportStartDate`, `reportEndDate` |
| `report.lines[]` | `transactionResult.transactions[]` enriched with type and category descriptions from [reference-data-access](../04-integrations/workflow-reference-data-access.md) |
| `report.totals` | computed in the process |

Legacy layout: 133 columns, page size {{TODO: lines per page in CBTRN03C}}. Output formats: PDF and CSV.
