# CardDemo INTCALC on FlowX.AI

- **FlowX:** project `cd_intcalc_zflx_opus_r2`, workflow `intcalc_batch`
  (resourceId `<uuid>`, resourceDefinitionId `<uuid>`)
  - INPUT (Start): `acctdata`, `tcatbal`, `cardxref`, `discgrp` (whole file contents as strings), `parmDate` (`2022071800`), optional `runTimestamp`
  - OUTPUT (End): `intcalc_systran` (IntcalcTransaction[]), `intcalc_acctdata` (IntcalcAccount[]); these are the contract files
- `flowx/scripts/` — the source of the three SCRIPT nodes, identical to what is configured on the workflow
- `run_intcalc.js` — runs the same three scripts locally and writes the contract files:
  `node run_intcalc.js <input_dir> <output_dir> 2022071800`. It also copies `assumptions.md` and `flags.json` next to the outputs.
- `testdata/` — a hand-built fixture; `testdata/expected/` holds the FlowX workflow's output for it
  (run `6addda400ad1dbd85dcf9f0d`, with `runTimestamp` fixed)
- `assumptions.md` — every decision the wiki did not settle; `flags.json` — the same decisions, declared up front for the scorer
