# Ledgerline ACCRUE: FlowX implementation

**FlowX resource**: workflow `accrue_interest_calculation`
- env `dev-env`, project `ll_a17_accrue_zflx_summary_r2` (appId `<uuid>`, WIP version `<uuid>`)
- resourceId `<uuid>`
- resourceDefinitionId `<uuid>`

```
Start ─▶ Parse input files ─▶ Compute interest per category balance ─▶ Update accounts and format outputs ─▶ End
```

| Contract | Fields |
|----------|--------|
| INPUT (Start) | `ledgaccFile`, `balcatFile`, `rategrpFile`, `cardlinkFile`: the raw text of the `.dat` files<br>`accrueParm` (default `2022071800`)<br>`runTimestamp` (optional, fixes `orig_ts`/`proc_ts`) |
| OUTPUT (End) | `accrueSystxnJson` → `accrue_systxn.json`<br>`accrueLedgaccJson` → `accrue_ledgacc.json`<br>`runSummary` (counts, skipped balances) |

## Running a real batch
1. Read `ledgacc.dat`, `balcat.dat`, `rategrp.dat` and `cardlink.dat` from the run's input directory.
2. Start the workflow (zflx `run_workflow`, or the FlowX workflow-run API) with
   `{"ledgaccFile": <text>, "balcatFile": <text>, "rategrpFile": <text>, "cardlinkFile": <text>, "accrueParm": "2022071800"}`.
3. Write `accrueSystxnJson` to `accrue_systxn.json` and `accrueLedgaccJson` to `accrue_ledgacc.json`, each as-is (already JSON lists in the CONTRACT format), next to `assumptions.md`.

## Self-test
`selftest/input/*.dat` are hand-built records. `selftest/output/*.json` holds the workflow's actual output
for them, run on 2026-10-27 with `runTimestamp` set to `2022-07-18-00.00.00.000000`. The test covers:
- the group rate
- the STANDARD fallback (group `ZZZ`)
- a zero rate (no transaction)
- a negative balance with truncation (−1.9998 → −1.99)
- unsorted input
- an unknown account (skipped)
- two cards on one account
- an account with no balances (unchanged)

All values match hand computation.
