# Ledgerline ACCRUE (interest calculation) on FlowX.AI

## FlowX implementation
- Project `ll_accrue_zflx_opus_r1`, workflow **`accrue_interest`**
  (resourceId `<uuid>`, resourceDefinitionId `<uuid>`).
- Graph: Start → Load Accounts → Compute Interest → Post Interest and Save Accounts → End.
- INPUT slice: `businessDate`, `accrueParam`, `ledgaccText`, `balcatText`, `rategrpText`,
  `cardlinkText`, `txncatgText` (optional). Each `*Text` holds the raw contents of the matching `.dat` file.
- OUTPUT slice: `systxnJson` (→ `accrue_systxn.json`), `ledgaccJson` (→ `accrue_ledgacc.json`),
  `warningsJson`, `summary`.

The node scripts are mirrored in `flowx/01_load_accounts.js`, `flowx/02_compute_interest.js` and
`flowx/03_post_interest.js`. Keep these files and the FlowX nodes in sync.

## Producing the outputs for a run
```
node run_accrue.js <dir with ledgacc.dat balcat.dat rategrp.dat cardlink.dat [txncatg.dat]> [out] [2022-07-18] [2022071800]
```
This writes `out/accrue_systxn.json`, `out/accrue_ledgacc.json` and `out/accrue_warnings.json`. It
executes the same three node scripts the FlowX workflow runs. To run inside FlowX instead, start
`accrue_interest` with the file contents in the INPUT slice and save `systxnJson` / `ledgaccJson`.

`out/assumptions.md` lists every decision made where the wiki is uncertain or silent.
`out/flags.json` declares those decisions as flags.

## Verification
`test/fixtures/*.dat` cover the acceptance scenarios: happy path, fractional-cent rounding, zero
balance, several groups, the DEFAULT fallback, a negative balance, a zero rate, an account without
balances and an unknown account. `test/expected/*.json` is the output of the FlowX workflow
run on those fixtures (instance `6ade1b3b0ad1dbd85dcfa5c2`), which matched the hand calculation.
