# CardDemo INTCALC on FlowX.AI

| What | Where |
|------|-------|
| FlowX project | `cd_intcalc_zflx_sonnet_r3` (appId `<uuid>`), env `dev-env` |
| Workflow | `intcalc_interest_calculation` — resourceId `<uuid>`, resourceDefinitionId `<uuid>` |
| Graph | `START → SCRIPT "Calculate interest (CBACT04C)" → END` |
| Script (mirror) | `flowx/intcalc_calculate.js` |
| Decisions | `assumptions.md`; declared uncertainties in `flags.json` |
| Synthetic test | `verification/inputs/*.dat` → `verification/outputs/*.json` (run `6addd3290ad1dbd85dcf9e3f`, FINISHED) |

## Contract

- INPUT slice (START): `acctdata`, `tcatbal`, `discgrp` (required), `cardxref`, `interestRunDate` (optional, default `2022071800`).
  Each file input is the full text content of the `.dat` file, one fixed-width record per line.
- OUTPUT slice (END): `intcalcSystran[]` → `intcalc_systran.json`, `intcalcAcctdata[]` → `intcalc_acctdata.json`,
  plus `runSummary` (counts and warnings).

## Running on a real input set

Run the workflow with
`{"interestRunDate":"2022071800","acctdata":<acctdata.dat text>,"tcatbal":<tcatbal.dat text>,"discgrp":<discgrp.dat text>,"cardxref":<cardxref.dat text>}`.
You can do this from the Designer's Run, or with the zFLX MCP `run_workflow`. Then write `intcalcSystran` to
`intcalc_systran.json` and `intcalcAcctdata` to `intcalc_acctdata.json`, both in this directory next to
`assumptions.md`.
