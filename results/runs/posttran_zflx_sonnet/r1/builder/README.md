# CardDemo POSTTRAN on FlowX.AI

Daily transaction posting (wiki P-14, legacy POSTTRAN / CBTRN02C) as a FlowX workflow.

- Project: `cd_posttran_zflx_sonnet_r1` (appId `<uuid>`, WIP version `2aab8ee4-...`)
- Workflow: `posttran_daily_transaction_posting`
  resourceId `<uuid>`, resourceDefinitionId `<uuid>`
- Flow: `Start → Validate & Post Daily Transactions → Build Run Summary → End` (END returns `${result}`)
- Enumeration: `RejectReasonCode` (100, 101, 102, 103, 109)
- Script source: `flowx/scripts/` (kept identical to the nodes)

## Running it

1. Start the workflow (Designer "Run", or the MCP `run_workflow`) with this input body, where each value is the
   full text of the file (lines separated by `\n`):
   ```json
   {"dailytran": "<dailytran.dat>", "acctdata": "<acctdata.dat>", "cardxref": "<cardxref.dat>",
    "tcatbal": "<tcatbal.dat>", "businessDate": "2022-07-18", "batchId": "<optional>"}
   ```
2. Write each list in the END output to its own file in `output/`: `posttran_transact.json`, `posttran_dalyrejs.json`,
   `posttran_acctdata.json`, `posttran_tcatbal.json`. `runSummary` holds the counts and the WARNING / RC 4 outcome.

Decisions taken where the wiki is silent or open are listed in `output/assumptions.md`.
`test/fixture/` holds a 12-record fixture and its verified results.
