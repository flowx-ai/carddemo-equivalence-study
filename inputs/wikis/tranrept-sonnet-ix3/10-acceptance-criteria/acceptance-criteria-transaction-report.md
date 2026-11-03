# Acceptance Criteria: transaction-report

**Process:** [transaction-report](../02-processes/process-transaction-report.md) (P-18) · **UI Flow:** started from [report-request](../03-ui-flows/ui-flow-report-request.md) · **Plugin:** [plugin-transaction-report-document](../07-plugins/plugin-transaction-report-document.md) · **Legacy:** `CBTRN03C` / `TRANREPT`

## Scenarios

| # | Scenario | Steps | Expected Result | Tags |
|---|----------|-------|-----------------|------|
| 1 | Date range report | 1. 2022-01-01 to 2022-07-06 | Only transactions in range | @smoke @regression |
| 2 | Totals | 1. Run | Page totals per card and a grand total | @regression |
| 3 | Type and category names | 1. Run | Names from reference data, not codes | @regression |
| 4 | Empty range | 1. No transactions | Report with zero total | @regression |
| 5 | Unknown reference | 1. Type missing in reference data | Error flagged, run continues `{{TODO: confirm legacy abend behaviour}}` | @regression |
| 6 | Report ready notification | 1. Run from online request | User is informed (FI-08) | @manual |
| 7 | Interest postings | 1. Range holds a card's purchases and its interest posting (type 01, category 0005) | Only the purchases are listed; the card total and the grand total leave the interest out | @regression |

<details>
<summary>Gherkin</summary>

```gherkin
@regression
Feature: Transaction report

  @smoke
  Scenario Outline: Date range filter
    Given transactions on "2022-01-01", "2022-03-15" and "2022-08-01"
    When I run the report from "<from>" to "<to>"
    Then the report contains <count> transactions

    Examples:
      | from       | to         | count |
      | 2022-01-01 | 2022-07-06 | 2     |
      | 2022-08-01 | 2022-08-31 | 1     |

  Scenario: Totals
    When the report is produced
    Then each card has a total and the report has a grand total
```
</details>

## Legacy Comparison

| Behaviour | Legacy | FlowX | Same? |
|-----------|--------|-------|-------|
| Layout | 133-column print file | document template | Redesigned |
| Dates | PARM in JCL | process inputs | Same |

## Configuration Dependencies

`reportStartDate`, `reportEndDate`; document template `TransactionReportTemplate`.

## Data Mapping Verification

Transaction + CardXref + TransactionType + TransactionCategory → report lines; verify amount formatting and totals.
