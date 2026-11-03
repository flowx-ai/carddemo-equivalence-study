# POSTTRAN on FlowX — daily transaction posting (P-14)

## What is in FlowX (dev-env, project `cd_a16_posttran_zflx_sonnet_r1`, WIP version, not committed)

| Resource | Id |
|---|---|
| Workflow `posttran_daily_transaction_posting` | resourceId `<uuid>`, resourceDefinitionId `<uuid>` |
| Enumeration `RejectReasonCode` (100, 101, 102, 103, 109) | resourceDefinitionId `<uuid>` |

Workflow: `Start → Load Daily Feed → Validate And Post Records → Build Run Summary → End`

- **INPUT** (Start): `dailytran`, `acctdata`, `cardxref` (raw file text, required); `tcatbal`, `batchId`,
  `businessDate`, `processedTimestamp` (optional).
- **OUTPUT** (End): `posttran_transact`, `posttran_dalyrejs`, `posttran_acctdata`, `posttran_tcatbal`
  (each a JSON string holding the CONTRACT.md list), and `runSummary` (counts, `status` WARNING/COMPLETED,
  `returnCode` 4/0).

## Running one batch

```sh
python3 -I posttran_runner.py prepare /path/to/run-inputs > posttran_input.json
# run workflow posttran_daily_transaction_posting with posttran_input.json as inputBody
#   (zflx MCP run_workflow, or Run in the Designer); save the END output as posttran_result.json
python3 -I posttran_runner.py emit posttran_result.json .
```

`emit` writes `posttran_transact.json`, `posttran_dalyrejs.json`, `posttran_acctdata.json` and
`posttran_tcatbal.json` (plus `posttran_run_summary.json`) next to `assumptions.md`. It accepts either the bare END
output or a whole `get_workflow_run` node dump.

## Verified

Two runs on dev-env with a synthetic feed: 9 records, 4 accounts, 5 xrefs, 1 category balance. Results:

- valid post; account and existing category balance updated
- reject 100 (invalid card), 101 (xref → missing account), 102 (one cent over 110%), 103 (expired account)
- a record at exactly 110% of the limit is posted
- limit and expiry both failing → 103
- a negative amount goes to the cycle debit; a new category balance is created
- a duplicate id is skipped
- run status WARNING / RC 4
- a second run with no `tcatbal` input and no rejects → COMPLETED / RC 0

No real CardDemo input files were available in this workspace, so no contract output files have been produced yet.
`posttran_runner.py` has not been executed (no shell was available during the build).
