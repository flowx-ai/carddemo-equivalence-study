# ACCRUE on FlowX: how to run

FlowX workflow `interest_calculation` (env dev-env, project app `<uuid>`,
version `<uuid>`), resourceId `<uuid>`.

## Per run

1. Build the workflow input from the run's files. Each value is the **raw file text**, either fixed-width or JSON:

   | input key        | file (first one present)                                         |
   |------------------|------------------------------------------------------------------|
   | `ledgacc`        | `postday_ledgacc.json` / `postday_ledgacc.txt` / `ledgacc.dat`   |
   | `balcat`         | `postday_balcat.json` / `postday_balcat.txt` / `balcat.dat`      |
   | `rategrp`        | `rategrp.dat`                                                    |
   | `cardlink`       | `cardlink.dat`                                                   |
   | `interestRunDate`| `2022071800` (ACCRUE PARM; optional, this is the default)        |
   | `runTimestamp`   | optional, pins `orig_ts`/`proc_ts` (DB2 format)                  |

2. Run it, for example with the MCP tool `run_workflow { workflowResourceId, inputBody }`.
3. The END payload is `{ accrue_systxn: [...], accrue_ledgacc: [...], summary: {...} }`.
   Write `accrue_systxn` to `accrue_systxn.json` and `accrue_ledgacc` to `accrue_ledgacc.json`,
   next to `assumptions.md`. `summary` holds counts and notes (skipped balances, missing rates).

Decisions and wiki gaps are in `assumptions.md`; declared uncertainties are in `flags.json`.

## Verified (synthetic fixtures, run on dev-env)

- 1000.00 @ 18.00 → 15.00 (AC1)
- 10.00 @ 23.99 → 0.19 (truncated, not 0.20)
- −200.50 @ STANDARD 12.00 → −2.00 (AC4; truncated toward zero)
- ZEROAPR and payment-type rate 0 → no transaction (AC5, BR-10)
- ids 2022071800000001… (AC6)
- account balance += total interest, cycle totals reset (AC3), including the last account
- untouched accounts output unchanged
- JSON-form inputs parse the same as fixed-width
