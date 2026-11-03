# CardDemo POSTTRAN (daily transaction posting) on FlowX.AI

## FlowX implementation
- Environment `dev-env`, project `cd_a21_va7_zflx_r3` (appId `<uuid>`, WIP version `<uuid>`)
- Workflow `posttran_daily_transaction_posting`: resourceId `<uuid>`, resourceDefinitionId `<uuid>`

```
Start ─▶ Load Daily Feed ─▶ Validate and Post Records ─▶ Build Run Summary ─▶ End
```

| Contract | Fields |
|----------|--------|
| INPUT (Start) | `dailytran`, `acctdata`, `cardxref` (file contents, required); `tcatbal`, `businessDate`, `batchId` (optional) |
| OUTPUT (End) | `transactJson`, `dalyrejsJson`, `acctdataJson`, `tcatbalJson`, `runStatus`, `returnCode`, `readCount`, `postedCount`, `rejectedCount`, `duplicateSkippedCount` |

## Running a feed
```sh
python3 -I tools/posttran_driver.py prepare <dir with *.dat> run/input_body.json
# run the workflow with run/input_body.json as its input (zFLX run_workflow, or Designer > Run)
# save the run result / END output as run/result.json
python3 -I tools/posttran_driver.py unpack run/result.json outputs/
```
`outputs/` then holds `posttran_transact.json`, `posttran_dalyrejs.json`, `posttran_acctdata.json`, `posttran_tcatbal.json` and `posttran_run_summary.json`, next to `assumptions.md`.

## Verification
`tests/fixture/*.dat` is a synthetic feed covering AC 1–11, a negative zoned amount and a duplicate id. It was run through the workflow on dev-env (run `6ae1dda63695c563ea50abd6`). The results are in `tests/expected/` (`proc_ts` is the run time) and were checked by hand against BR-01–BR-10.
The real CardDemo `.dat` inputs were not available in this workspace, so no run on them has been made.
