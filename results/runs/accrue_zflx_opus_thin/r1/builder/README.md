# Ledgerline ACCRUE (interest calculation) on FlowX.AI

FlowX project `<uuid>` (version `<uuid>`, env `dev-env`), workflow
**`accrue_interest_calculation`** (resourceId `<uuid>`,
resourceDefinitionId `<uuid>`):

```
Start ──▶ Load inputs ──▶ Compute interest ──▶ Post interest ──▶ End
 INPUT: ledgaccFile, balcatFile, cardlinkFile, rategrpFile (file text), parmDate, businessDate
 OUTPUT: systxn[] (accrue_systxn.json), ledgacc[] (accrue_ledgacc.json)
```

The node scripts are kept verbatim in `flowx/scripts/`. Decisions are in `assumptions.md`;
declared uncertainties are in `flags.json`.

## Running

```sh
# local execution of the workflow's node scripts → out/accrue_systxn.json, out/accrue_ledgacc.json
node runner/accrue.mjs --in <inputDir> --out out

# or run on FlowX: build the START body, run the workflow (Designer Run / MCP run_workflow),
# save the END output, then split it into the contract files
node runner/accrue.mjs --in <inputDir> --emit-input start.json
node runner/accrue.mjs --from-result end-output.json --out out
```

`<inputDir>` holds the CONTRACT.md inputs. For account and category balances the runner prefers the
oracle's `postday_ledgacc.json` / `postday_balcat.json` (or the `.txt` dumps) over
`ledgacc.dat` / `balcat.dat`. Defaults: `--parm 2022071800 --date 2022-07-18`.
Every run copies `assumptions.md` and `flags.json` into the output directory.

`tests/fixtures` + `tests/expected` hold a synthetic case (4 accounts, 6 category balances) whose
expected results were checked by hand and reproduced by a run of the FlowX workflow.
