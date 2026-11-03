# Plugin: statement-document

| Property | Value |
|----------|-------|
| Plugin Type | Document Plugin (template-based document generation) |
| Used by | [statement-generation](../02-processes/process-statement-generation.md) (P-17) |
| Legacy Source | `CBSTM03A`, `CBSTM03B`, copybooks `COSTM01`, `CVACT01Y`, `CVCUS01Y`, `CVTRA05Y`; job `CREASTMT.JCL` |
| Mapping | PL-01 |

## Content

| Section | Data | Legacy Source |
|---------|------|---------------|
| Header | statement date, account id | `CBSTM03A` |
| Customer block | name, address (3 lines, state, zip), phone | `CVCUS01Y` |
| Account summary | credit limit, current balance, cycle credit/debit, FICO score band | `CVACT01Y`, `CVCUS01Y` |
| Transaction lines | transaction id, description, amount per card of the account | `CVTRA05Y` |
| Totals | total expenses (sum of transaction amounts) | `CBSTM03A` |

## Data Mapping

| Template variable | Source (process data) |
|-------------------|----------------------|
| `statement.accountId` | `statementData.accountId` |
| `statement.customer.*` | `statementData.customer.*` |
| `statement.transactions[]` | `statementData.transactions[]` |
| `statement.totalExpenses` | `statementData.totalExpenses` |

Formats: text (80 columns) and HTML as in legacy; PDF new. SSN is not printed. {{TODO: confirm the exact statement line layouts in CBSTM03A (not analyzed in detail).}}
