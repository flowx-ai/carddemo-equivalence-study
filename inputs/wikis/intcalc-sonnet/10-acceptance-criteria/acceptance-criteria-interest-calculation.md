# Acceptance Criteria: interest-calculation

**Process:** [interest-calculation](../02-processes/process-interest-calculation.md) (P-15) · **UI Flow:** none (batch) · **Legacy:** `CBACT04C` / `INTCALC`

## Scenarios

| # | Scenario | Steps | Expected Result | Tags |
|---|----------|-------|-----------------|------|
| 1 | Monthly interest | 1. Category balance 1000.00, rate 18.00 | Interest 15.00 (balance × rate / 1200) | @smoke @regression |
| 2 | Interest transaction | 1. Run | System transaction type 01, category 05 created per category balance | @regression |
| 3 | Account update | 1. Run | Account current balance increased by total interest; cycle credit/debit reset | @regression |
| 4 | Missing group | 1. Account group has no rate row | Rate taken from `DEFAULT` group | @regression |
| 5 | Zero rate | 1. Group `ZEROAPR` | No interest transaction | @regression |
| 6 | Run date | 1. Provide `interestRunDate` | Transaction ids built from run date plus suffix | @regression |
| 7 | Fees | 1. Run | No fee created (legacy stub F-12) {{DECISION: implement fees in FlowX or keep stub}} | @manual |

<details>
<summary>Gherkin</summary>

```gherkin
@regression
Feature: Interest calculation

  Background:
    Given the batch window is open
    And disclosure groups are loaded

  @smoke
  Scenario Outline: Interest amount
    Given a category balance of <balance> and an annual rate of <rate>
    When interest is calculated
    Then the interest is <interest>

    Examples:
      | balance | rate  | interest |
      | 1000.00 | 18.00 | 15.00    |
      | 2400.00 | 12.00 | 24.00    |
      | 500.00  | 0.00  | 0.00     |

  Scenario: Fallback to the DEFAULT group
    Given an account group without a rate for the category
    When interest is calculated
    Then the DEFAULT group rate is used
```
</details>

## Legacy Comparison

| Behaviour | Legacy | FlowX | Same? |
|-----------|--------|-------|-------|
| Formula | bal × rate / 1200 | same | Same |
| Fee computation | stub (F-12, FI-15) | stub / decision | Same |
| Rate lookup | DISCGRP read with DEFAULT fallback | W-05 reference-data-access | Same |

## Configuration Dependencies

`interestRunDate` (legacy PARM `2022071800`), `RuntimeSwitches.batchWindowOpen`.

## Data Mapping Verification

TCATBAL → TransactionCategoryBalance, DISCGRP → DisclosureGroup (rate is a signed decimal, e.g. `0150{` = 15.00); verify interest rounding to two decimals.
