# Acceptance Criteria: daily-transaction-posting

**Process:** [daily-transaction-posting](../02-processes/process-daily-transaction-posting.md) (P-14) · **UI Flow:** none (batch, monitored in [view-batch-operations](../06-task-management/view-batch-operations.md)) · **Legacy:** `CBTRN02C` / `POSTTRAN`

## Scenarios

| # | Scenario | Steps | Expected Result | Tags |
|---|----------|-------|-----------------|------|
| 1 | Valid transaction posted | 1. Daily transaction with valid card, account in limit | Transaction stored; category balance and account balance updated | @smoke @regression |
| 2 | Invalid card | 1. Card not in cross-reference | Rejected, reason 100 `INVALID CARD NUMBER FOUND` | @regression |
| 3 | Account not found | 1. Xref points to missing account | Rejected, reason 101 | @regression |
| 4 | Over limit | 1. cycle credit − cycle debit + amount > credit limit | Rejected, reason 102 | @regression |
| 5 | Expired account | 1. Account expiry date before transaction date | Rejected, reason 103 | @regression |
| 6 | Several failures on one record | 1. Card invalid and account expired | Only the last failing reason is kept (legacy F-05) | @regression |
| 7 | Reject file content | 1. Run with rejects | Rejected Transaction holds original data plus reason code and text | @regression |
| 8 | Completion with rejects | 1. Run with ≥1 reject | Process ends with warning status (legacy RC 4) | @regression |
| 9 | New category balance | 1. First transaction for account/type/category | Category balance created | @regression |
| 10 | Restart after failure | 1. Fail mid-run 2. Restart | No duplicate postings `{{DECISION: restart strategy — see process spec}}` | @integration |
| 11 | Daily purchase limit | 1. Five purchases on one card in one run, all within the credit limit | First four posted; the fifth rejected, reason 104 `DAILY PURCHASE LIMIT EXCEEDED` | @regression |

<details>
<summary>Gherkin</summary>

```gherkin
@regression
Feature: Daily transaction posting

  Background:
    Given the batch window is open
    And daily transactions are loaded

  @smoke
  Scenario: Valid transaction is posted
    Given a daily transaction for a card with an active account within limit
    When the posting process runs
    Then a transaction is stored
    And the category balance and the account balances are updated

  Scenario Outline: Rejections
    Given a daily transaction where "<condition>"
    When the posting process runs
    Then it is stored as rejected with reason "<code>"

    Examples:
      | condition                          | code |
      | card is not in the cross-reference | 100  |
      | account does not exist             | 101  |
      | amount exceeds the credit limit    | 102  |
      | account expired before the date    | 103  |
      | fifth purchase on the card this run | 104  |

  Scenario: Warning on rejects
    Given at least one rejected transaction
    When the posting process completes
    Then the process finishes with a warning
```
</details>

## Legacy Comparison

| Behaviour | Legacy | FlowX | Same? |
|-----------|--------|-------|-------|
| Reject reason | last failure overwrites | same, `{{DECISION: keep or collect all reasons}}` | Same |
| Commit | none | per-transaction via Integration Workflow | Improved |

## Configuration Dependencies

`RuntimeSwitches.batchWindowOpen`, [Enumerations](../01-data-model/enumerations.md) reject reasons.

## Data Mapping Verification

DALYTRAN record (350 bytes) → DailyTransaction; DALYREJS (LRECL 430) → RejectedTransaction; verify counts: read = posted + rejected.
