# Ledgerline ACCRUE (interest calculation, P-15) on FlowX.AI

## What is in FlowX (project app `<uuid>`, version `<uuid>`, platform 5.13)

- Workflow **`accrue_interest_calculation`**
  (resourceId `<uuid>`, resourceDefinitionId `<uuid>`):
  `Start → Load input files → Accrue interest (LXB002C main loop) → Build contract outputs → End`
  - INPUT (Start): `ledgacc`, `balcat`, `rategrp`, `cardlink` (file contents: fixed-width text or JSON
    array), optional `interestRunDate` (default `2022071800`), `batchId`, `applyFinalAccountUpdate`.
  - OUTPUT (End): `accrueSystxn` (AccrueTransaction[]), `accrueLedgacc` (AccrueAccount[]), `runSummary`.
- Project data types **AccrueTransaction** and **AccrueAccount** — the CONTRACT.md field sets.

`flowx/*.js` are copies of the three SCRIPT nodes.

## Running a step

```sh
python3 -I tools/run_accrue.py build-input --input-dir <inputs> --parm 2022071800 --out run_input.json
# run the workflow with run_input.json as the input body (FlowX MCP run_workflow, or the Designer),
# save the END output as run_output.json, then:
python3 -I tools/run_accrue.py write-outputs --run-output run_output.json   # -> accrue_systxn.json, accrue_ledgacc.json
```

`tools/make_test_inputs.py` writes a synthetic fixed-width input set.

## Decisions

See `assumptions.md`. The uncertainties declared before scoring are in `flags.json`.
