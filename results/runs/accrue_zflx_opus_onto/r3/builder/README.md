# Ledgerline ACCRUE (interest calculation) on FlowX.AI

**Implementation:** FlowX workflow `accrue_interest_calculation`
- project app `<uuid>`, version `<uuid>` (WIP, not committed)
- resourceId `<uuid>`
- resourceDefinitionId `<uuid>`

```
Start ──► Decode input files (SCRIPT) ──► Compute and post interest (SCRIPT) ──► End
```

## Contract
INPUT (Start slice), with file contents passed as strings:

| key | content |
|---|---|
| `ledgacc` | `ledgacc.dat` (LXV022Y, 300). Per CONTRACT.md step isolation, pass the POSTDAY account output |
| `cardlink` | `cardlink.dat` (LXV024Y, 50) |
| `balcat` | `balcat.dat` (LXV026Y, 50). Pass the POSTDAY category-balance output |
| `rategrp` | `rategrp.dat` (LXV027Y, 50) |
| `parmDate` | optional, ACCRUE parameter, default `2022071800` |
| `runTimestamp` | optional, fixes `orig_ts`/`proc_ts` (DB2 format); default is the current time |

OUTPUT (End slice):
- `accrue_systxn` → write as `accrue_systxn.json`
- `accrue_ledgacc` → write as `accrue_ledgacc.json`
- `summary`: counts, total interest, and non-fatal errors

## Running a batch
Start the workflow with the four files' contents (Designer **Run**, the `run_workflow` MCP tool, or a
parent process/workflow). Then save `accrue_systxn` and `accrue_ledgacc` from the End output into
`output/`, next to `assumptions.md` and `flags.json`.

The real input files were not available in this workspace, so `output/` does not yet contain the two
JSON results.

## Files
- `output/assumptions.md`: every decision where the wiki was uncertain or silent (A1–A16), with the wiki
  or ontology statement it rests on. The script comments cite the same A-numbers.
- `output/flags.json`: the same uncertainties in CONTRACT.md flag form.
- `test-fixture/`: synthetic inputs that cover the AC scenarios, plus the outputs the FlowX workflow
  produced for them (run `6ade41124b977556e6003a95`, with `runTimestamp` fixed). Hand-checked:
  - happy path: 1000.00 @ 15 % → 12.50
  - truncation boundary: 10.04 @ 25 % → 0.2091… → 0.20
  - multiple groups: account 2 @ 12 %
  - zero balance with the standard-group fallback: account 3
  - zero rate writes no transaction
  - negative balance (ASCII overpunch) → -0.12
  - account without balances stays unchanged
  - unsorted balcat
  - orphan balance record is reported
