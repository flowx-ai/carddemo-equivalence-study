# Ledgerline ACCRUE (interest calculation) on FlowX.AI

## What was built

FlowX project `<uuid>`, version `<uuid>` (WIP, not committed),
host `<dev-environment>`.

Integration workflow **`accrue_interest_calculation`**
- resourceId `<uuid>`, resourceDefinitionId `<uuid>`
- `Start → Load inputs → Compute and post interest → Build outputs → End` (JavaScript SCRIPT nodes)

| Node | Wiki node | Does |
|---|---|---|
| Load inputs | 2 Load Accounts | Parses ledgacc / balcat / cardlink / rategrp (fixed width per copybook, zoned/overpunch signs; ledgacc/balcat also as POSTDAY JSON) |
| Compute and post interest | 3–5 For each / Compute Interest / Post Interest | LXB002C loop: key-ordered category balances, control break per account, rate by group+type+cat with DEFAULT fallback, monthly interest truncated to cents, one interest txn per category, total posted to the account |
| Build outputs | 6 Save Account | Shapes `accrue_systxn` and `accrue_ledgacc` per CONTRACT.md |

**INPUT slice** (START): `ledgacc`, `balcat`, `cardlink`, `rategrp` — the file contents as strings; `parmDate` (optional, default `2022071800`).
**OUTPUT slice** (END): `accrue_systxn[]`, `accrue_ledgacc[]`, `runSummary` (status COMPLETED/ABENDED, counts).

## Running it on a real input set

1. Run the workflow with `inputBody` = `{"parmDate":"2022071800","ledgacc":<ledgacc.dat or postday_ledgacc.json text>,
   "balcat":<balcat.dat or postday_balcat.json text>,"cardlink":<cardlink.dat text>,"rategrp":<rategrp.dat text>}`
   (Designer "Run", or the `run_workflow` MCP tool).
2. Write the END output's `accrue_systxn` to `outputs/accrue_systxn.json` and `accrue_ledgacc` to `outputs/accrue_ledgacc.json`.
   `outputs/assumptions.md` and `outputs/flags.json` already sit there.

The run's input files were not part of the attachment, so `outputs/` holds no result files yet.

## Verification done

`test/inputs/*.dat` is a synthetic set written to the copybook layouts. It covers a non-zero rate, a zero rate, the DEFAULT-group fallback,
a negative balance, a zero balance, an account without category balances, two cards on one account and out-of-order balcat records.
`test/outputs/*.json` is the workflow's actual output for it. Every value matched a hand computation
(1234.56 × 15.00 / 1200 = 15.432 → 15.43; −250.75 × 18.99 / 1200 = −3.968… → −3.96).
The same data given in the POSTDAY JSON form produced identical output. The abend path (account missing from ledgacc) was also exercised.
`analyze_workflow` reports 0 errors and 0 warnings.

Decisions where the wiki is silent or uncertain: `outputs/assumptions.md`.
