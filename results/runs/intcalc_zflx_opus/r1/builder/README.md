# CardDemo INTCALC on FlowX.AI

Interest-calculation batch step (legacy `CBACT04C` / `INTCALC.jcl`), rebuilt as a FlowX workflow.

## FlowX resources
- Project `cd_intcalc_zflx_opus_r1` (appId `<uuid>`, WIP version `<uuid>`)
- Workflow `intcalc_batch`: resourceId `<uuid>`, resourceDefinitionId `<uuid>`
  - START has an INPUT slice: `acctdata`, `tcatbal`, `cardxref`, `discgrp` (raw fixed-width file text), `parmDate`, and the optional `businessDate` and `postLastAccount`
  - SCRIPT `Compute Interest` (Python) contains `src/intcalc_core.py` + `src/flowx_node_entry.py`
  - END has an OUTPUT slice: `systran[]`, `accounts[]` (the contract field names), plus `warnings[]` and `lastAccountId`

## Running
```
python3 run_intcalc.py --input-dir <dir with the .dat files> --output-dir <out>
```
This writes `intcalc_systran.json`, `intcalc_acctdata.json`, `flags.json` and `assumptions.md` to `<out>`.
It uses the same core code as the FlowX node. To run through FlowX instead:
1. Build the input: `--emit-flowx-input body.json`.
2. Run `intcalc_batch` with that body (Designer, or MCP `run_workflow`) and save the END output.
3. Write the outputs from it: `--from-flowx-result result.json --output-dir <out>`.

## Verification
`test/fixture/*.dat` is a hand-built input covering acceptance scenarios 1 to 4, plus truncation of a negative value, the DEFAULT-group fallback,
a zero rate, an unsorted TCATBAL file, an untouched account and the last-account rule.
`test/expected/*.json` is the output FlowX produced for it (run `6addd6970ad1dbd85dcf9ea8`); it matches the hand calculation.

Decisions and their wiki basis: see `assumptions.md`.
