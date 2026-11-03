# Ledgerline ACCRUE (interest calculation) on FlowX.AI

- FlowX app `ll_accrue_zflx_sonnet_r3` (dev-env), workflow **`accrue_interest_calculation`**
  - resourceId `<uuid>`, resourceDefinitionId `<uuid>`
  - Start → Parse legacy inputs → Calculate interest (P-15) → Map contract outputs → End (payload `${result}`)
  - Input: `interestRunDate`, `ledgaccDat`, `balcatDat`, `rategrpDat`, `cardlinkDat` (whole file contents);
    optional `runTimestamp`, `roundingMode` (`TRUNCATE`|`HALF_UP`), `updateFinalAccount`
  - Output: `{accrue_systxn[], accrue_ledgacc[], warnings[], stats}`
- `flowx/*.js` — the SCRIPT node sources as deployed
- `assumptions.md` — every decision taken where the wiki is uncertain/silent; `flags.json` — the same, in scorer form

## Running one run

```sh
python3 run_accrue.py prepare --input-dir <run>/in --run-date 2022071800 --out body.json
# run the workflow with body.json as input (MCP: run_workflow { workflowResourceId, inputBody }),
# save the END output as result.json
python3 run_accrue.py split --result result.json --output-dir <run>/out
```

`split` writes `accrue_systxn.json` and `accrue_ledgacc.json`, and copies `assumptions.md` and `flags.json` beside them.
