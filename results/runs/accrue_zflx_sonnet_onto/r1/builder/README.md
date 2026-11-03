# Ledgerline ACCRUE (interest calculation) on FlowX.AI

FlowX project `<uuid>` (version `<uuid>`, profile `dev-env`), integration workflow
**`accrue_interest_calculation`**, resourceId `<uuid>`, resourceDefinitionId `<uuid>`:

```
Start (INPUT: ledgaccDat, balcatDat, cardlinkDat, rategrpDat, interestRunDate?)
  → Parse input files   (flowx/01_parse_inputs.js)    copybook decode, overpunch signs
  → Accrue interest     (flowx/02_accrue_interest.js) BR-01..BR-10: rate + STANDARD fallback, bal×rate/1200, txn 07/12, account rewrite
  → Format outputs      (flowx/03_format_outputs.js)  contract field names and formats
  → End (payload ${result} = { accrue_systxn, accrue_ledgacc, runLog })
```

`flowx/*.js` are the exact sources deployed in the three SCRIPT nodes.

## Running

```
node run_accrue.mjs <inputDir> <outDir>                      # runs the deployed node scripts locally
node run_accrue.mjs <inputDir> <outDir> --emit-flowx-input   # writes flowx_input.json, the START body for a platform run
node run_accrue.mjs <inputDir> <outDir> --from-flowx-result  # splits <outDir>/flowx_result.json (END output) into the contract files
```

Either path writes `accrue_systxn.json`, `accrue_ledgacc.json` and `run_log.json`, and copies `assumptions.md` and
`flags.json` next to them.

`test/fixture` holds synthetic records for the acceptance criteria. `test/flowx_run` holds the platform outputs for
those records, with the hand-checked expectations.
