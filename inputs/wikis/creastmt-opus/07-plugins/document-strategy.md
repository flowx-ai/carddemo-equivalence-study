# Document Strategy — AWS CardDemo → FLOWX.AI

> **Powered by FLOWX.AI Coding Agents** · *Product Manager View*

CardDemo produces printed/PDF **statements and reports** in the batch tier (`CBSTM03A/B` + `CREASTMT`, rendered to PDF by `TXT2PDF1.JCL`). In FLOWX these become **Document Templates** generated via the document plugin.

## Documents

| Document | Legacy Source | FLOWX Document Template | Produced By |
|----------|---------------|-------------------------|-------------|
| Account Statement | `CBSTM03A/B`, `CREASTMT`, `TXT2PDF1` | `AccountStatement` (PDF) | [Statement Generation](../02-processes/process-statement-generation.md) |
| Transaction Report | `CORPT00C`, `TRANREPT`, `PRTCATBL`, `TXT2PDF1` | `TransactionReport` (PDF) | [Reports](../02-processes/process-reports.md) |

## Template: AccountStatement

- **Content:** account header (holder, account id, period), opening/closing balance, transaction list, category balances, interest, minimum due.
- **Data sources:** [Account](../01-data-model/project-data-model.md#account), [Customer](../01-data-model/project-data-model.md#customer), [Transaction](../01-data-model/project-data-model.md#transaction), [TransactionCategoryBalance](../01-data-model/project-data-model.md#transactioncategorybalance).
- **Substitution Tags:** `${account.accountId}`, `${customer.firstName}`, `${statement.period}`, `${statement.openingBalance}`, `${statement.closingBalance}`, loop over `${transactions}`.
- **Delivery:** attach to [StatementAvailable notification](notification-strategy.md#template-statementavailable) and store a reference.

## Template: TransactionReport

- **Content:** parameterized transaction listing (date range, account, category) with totals.
- **Data sources:** [Transaction](../01-data-model/project-data-model.md#transaction) aggregates.
- **Delivery:** download from the [Reports UI flow](../03-ui-flows/ui-flow-reports.md).

## Rendering Approach

`{{DECISION: Use the FlowX document plugin Document Templates (recommended — replaces TXT2PDF entirely) vs call an external PDF renderer ([Statement PDF Renderer system](../04-integrations/system-statementpdf.md)). The document plugin keeps generation inside the platform and supports substitution tags + conditional sections.}}`

`{{TODO: Read CBSTM03A/B + COSTM01.CPY for the exact statement layout and totals.}}`

See [Plugins Overview](plugins-overview.md).

---
*Powered by **FLOWX.AI** Coding Agents*
