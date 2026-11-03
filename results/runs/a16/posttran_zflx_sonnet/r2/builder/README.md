# CardDemo POSTTRAN on FlowX.AI — daily transaction posting

## Where it lives
- Environment `dev-env`, project `cd_a16_posttran_zflx_sonnet_r2` (WIP version `<uuid>`, not committed)
- Workflow `posttran_daily_transaction_posting`
  - resourceId `<uuid>`
  - resourceDefinitionId `<uuid>`
- Graph: `Start → Load Daily Feed → Validate and Post Records → Build Run Summary → End`
  (SCRIPT nodes, JavaScript; sources mirrored in `flowx/`). The END payload is `${result}`.

## Contract
INPUT (START slice): `businessDate`, `dailytranFile`, `cardxrefFile`, `acctdataFile` (required);
`tcatbalFile`, `batchId`, `runTimestamp` (optional). Each `*File` is the full text of the
corresponding `.dat` file (fixed width, one record per line).

OUTPUT: `{ posttran_transact, posttran_dalyrejs, posttran_acctdata, posttran_tcatbal, runSummary }` —
the first four are written one-to-one to the CONTRACT.md files of the same name.

## Running on a new input set
`run_workflow` on the workflow with
`{"businessDate":"2022-07-18","dailytranFile":"<dailytran.dat>","cardxrefFile":"<cardxref.dat>","acctdataFile":"<acctdata.dat>","tcatbalFile":"<tcatbal.dat>"}`
and save each of the four lists from the END output as `<key>.json`.

## Layout
- `output/` — outputs of the sample run, `assumptions.md`, `flags.json`
- `sample-input/` — synthetic fixed-width inputs used for that run (no real inputs were supplied)
- `flowx/` — the three node scripts
