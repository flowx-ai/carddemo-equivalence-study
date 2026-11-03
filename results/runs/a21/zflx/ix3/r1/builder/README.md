# CardDemo daily transaction report (TRANREPT) on FlowX

FlowX project `cd_a21_ix3_zflx_r1` (dev-env), workflow **`transaction-report`**
- resourceId `<uuid>`
- resourceDefinitionId `<uuid>`

Flow: Start → Select Transactions in Range (BR-01/02/05/07) → Get Account, Type and Category Names (BR-03)
→ Add Report Lines and Totals (BR-04/06) → End.

**Input** (START slice): `transact`, `cardxref`, `trantype`, `trancatg` are the file contents as strings, one record
per line. `startDate` and `endDate` (`YYYY-MM-DD`) are optional and default to 2022-01-01 / 2022-07-06.

**Output** (END slice): `tranrept_report`, the 133-column print lines in order. Also `lineCount`, `grandTotal` and
`referenceErrors`.

For the contract run, pass the four files with `startDate: "2022-07-01"`, `endDate: "2022-07-31"` and take
`tranrept_report` (a list of strings, as the contract allows).

- `flowx/scripts/*.js` hold the script-node sources, identical to the deployed nodes.
- `flowx/run_local.js` and `flowx/make_testdata.js` are a Node harness for running the same scripts offline.
  They have not been executed. The scripts were tested on the platform.
- Decisions: `assumptions.md`. Declared uncertainties: `flags.json`.
