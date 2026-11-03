# CardDemo INTCALC on FlowX.AI

FlowX project `cd_a16_intcalc_zflx_sonnet_r1` (app `<uuid>`, WIP version
`<uuid>`, dev-env).

Workflow **`intcalc_interest_calculation`**
(resourceId `<uuid>`, resourceDefinitionId `<uuid>`):

```
Start ──► Calculate interest (CBACT04C) [SCRIPT, JS] ──► End (returns intcalc_systran, intcalc_acctdata, intcalc_summary)
```

- INPUT slice: `parmDate` (optional, default `2022071800`), `tcatbal`, `acctdata`, `cardxref`, `discgrp`.
  Each file input is the raw fixed-width file content.
- The script source is `flowx/intcalc_script.js`, a verbatim copy of what the node runs.
- Business decisions are recorded in `assumptions.md`. Declared uncertainties are in `flags.json`.

## Producing the outputs for a run

```sh
python3 -I flowx/intcalc_io.py prepare <input_dir> 2022071800 > body.json
# run the workflow with body.json as inputBody (Designer "Run", zflx/MCP run_workflow), save the END output as end.json
python3 -I flowx/intcalc_io.py split end.json .        # -> intcalc_systran.json, intcalc_acctdata.json
```

## Verification done

`flowx/test/synthetic_input.json` holds hand-built test data covering these wiki cases:
- 1000.00 at 18% → 15.00, and 1000.40 → 15.01
- a missing group falling back to DEFAULT, with a negative balance: −20.008 → −20.01
- ZEROAPR → no transaction, cycle reset
- a payment category at rate 0
- an account with no balances, left untouched
- out-of-order balance rows
- an account with two cards (the lowest is used)

FlowX run `6ae120fb3695c563ea509366` returned exactly the hand-computed results.
The real CardDemo input files were not available in this workspace, so no contract outputs have been produced yet.
