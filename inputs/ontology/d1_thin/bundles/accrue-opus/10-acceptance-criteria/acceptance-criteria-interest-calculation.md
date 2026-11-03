# Acceptance Criteria: Interest Calculation

> **Powered by FLOWX.AI Coding Agents** · `@regression`

Verifies [Interest Calculation](../02-processes/process-interest-calculation.md) (`LXB002C`/ACCRUE).

## Configuration Dependencies

| Config | Effect |
|--------|--------|
| Disclosure-group rates (`RATEGRP`) | Interest rate per account group |

## Scenarios

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 1 | Compute interest (happy) | Run over accounts | Interest = balance × group rate; matches legacy |
| 2 | Rounding (boundary) | Balance causing fractional cents | Rounding matches legacy `{{TODO: confirm rounding mode}}` |
| 3 | Zero balance (edge) | Account balance 0 | Zero interest |
| 4 | Multiple disclosure groups (gateway) | Accounts in different groups | Correct rate per group |

## Data Mapping Verification

| Flow | Verify |
|------|--------|
| Compute Interest | balance × rate(groupId) → posted interest |

## Legacy Comparison

| Input | Legacy `LXB002C` | FLOWX |
|-------|-------------------|-------|
| account set | interest amounts | identical per account |

---
*Powered by **FLOWX.AI** Coding Agents*
