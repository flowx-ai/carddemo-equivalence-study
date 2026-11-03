# Acceptance Criteria: statement-generation

**Process:** [statement-generation](../02-processes/process-statement-generation.md) (P-17) · **UI Flow:** none (batch) · **Plugin:** [plugin-statement-document](../07-plugins/plugin-statement-document.md) · **Legacy:** `CBSTM03A/B` / `CREASTMT`

## Scenarios

| # | Scenario | Steps | Expected Result | Tags |
|---|----------|-------|-----------------|------|
| 1 | Statement per card | 1. Run with transactions | One statement per card with customer name, address, account id, balance, FICO score | @smoke @regression |
| 2 | Transaction lines | 1. Card with 3 transactions | 3 lines, total equals the sum of the amounts | @regression |
| 3 | Two formats | 1. Run | Text and HTML statements both available | @regression |
| 4 | Card without transactions | 1. Run | Statement with zero total | @regression |
| 5 | Delivery | 1. Run | Statement stored for the customer `{{DECISION: delivery channel — see notification-strategy}}` | @manual |
| 6 | PDF statement | 1. Request PDF | Not available in legacy (FI-09) | @manual |

<details>
<summary>Gherkin</summary>

```gherkin
@regression
Feature: Statement generation

  Background:
    Given the batch window is open

  @smoke
  Scenario: Statement contents
    Given a card with 3 transactions in the period
    When statements are generated
    Then a statement lists the customer, the account and the 3 transactions
    And the total equals the sum of the three amounts

  Scenario Outline: Formats
    When statements are generated
    Then a "<format>" statement exists for the card

    Examples:
      | format |
      | text   |
      | HTML   |
```
</details>

## Legacy Comparison

| Behaviour | Legacy | FlowX | Same? |
|-----------|--------|-------|-------|
| Program structure | ALTER / GO TO, in-memory table | Process Definition + document plugin | Redesigned |
| Output | STMTFILE and HTMLFILE | document template (text + HTML) | Same |

## Configuration Dependencies

Document template `StatementTemplate`; `StmtFile` DD is corrupted in the legacy JCL (F-14) — recreate from the program.

## Data Mapping Verification

StatementData built from Customer, Account, Card, CardXref, Transactions; verify the total and the address formatting.
