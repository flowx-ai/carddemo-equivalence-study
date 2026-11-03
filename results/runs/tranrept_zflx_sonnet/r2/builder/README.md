# CardDemo daily transaction report (TRANREPT) on FlowX

- FlowX (dev-env), project `cd_tranrept_zflx_sonnet_r2`, workflow `tranrept_daily_transaction_report`
  - resourceId `<uuid>`, resourceDefinitionId `<uuid>`
  - Start → Select Transactions in Range → Get Type and Category Names → Add Report Lines and Totals → End
- `src/` — the three node scripts, identical to what is deployed
- `outputs/assumptions.md`, `outputs/flags.json` — decisions where the wiki is silent or uncertain
- `tools/run_local.js` — runs the same scripts with Node against an input directory (not executed in this build session)

## Running a scored run

INPUT (all strings; file contents verbatim):

```json
{"transactFile": "<transact.dat>", "cardxrefFile": "<cardxref.dat>",
 "trantypeFile": "<trantype.dat>", "trancatgFile": "<trancatg.dat>",
 "startDate": "2022-07-01", "endDate": "2022-07-31"}
```

The END output key `tranrept_report` holds the report lines joined by `\n`. Save it as
`outputs/tranrept_report.txt`. Also returned: `lineCount`, `grandTotal`, `errors[]`.

Locally: `node tools/run_local.js <inputDir> outputs 2022-07-01 2022-07-31`.
