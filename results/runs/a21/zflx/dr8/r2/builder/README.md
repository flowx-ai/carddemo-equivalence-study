# CardDemo POSTTRAN (daily-transaction-posting) on FlowX.AI

## What was built

FlowX project **`cd_a21_dr8_zflx_r2`** (env dev-env, WIP version `<uuid>`).

The integration workflow **`posttran_daily_transaction_posting`** has:
- resourceId `<uuid>`
- resourceDefinitionId `<uuid>`

Its graph is:

```
Start → Load Daily Feed → Load Reference Data → Order Feed for Posting (BR-10)
      → Validate and Post Records (BR-01..06) → Build Run Summary (BR-07) → End
```

- **INPUT slice (Start):**
  - Required: `dailytran`, `acctdata`, `cardxref`, raw file contents as strings.
  - Optional: `tcatbal`, `batchId`, `businessDate`.
- **OUTPUT slice (End):**
  - The contract outputs: `transactJson`, `dalyrejsJson`, `acctdataJson`, `tcatbalJson`, each a JSON-encoded list in the CONTRACT.md field layout.
  - The run summary: `readCount`, `processedCount`, `rejectedCount`, `countsBalanced`, `returnCode`, `status`.

All parsing, validation and posting logic runs inside the workflow. The two scripts in `tools/` are I/O adapters only.

Decisions taken where the wiki is silent or unsure: [`output/assumptions.md`](output/assumptions.md).

## Running it on a set of input files

1. `python3 -I tools/prepare_input.py <dir with *.dat> body.json --business-date 2022-07-18`
2. Run the workflow with `body.json` as the input body. Use the Designer's Run, or zflx `run_workflow` on the resourceId above.
3. Save the END-node output as `run_output.json`.
4. `python3 -I tools/write_outputs.py run_output.json output/`

Step 4 writes `posttran_transact.json`, `posttran_dalyrejs.json`, `posttran_acctdata.json` and `posttran_tcatbal.json` next to `output/assumptions.md`.

## Verification done

`test/input/` is a synthetic 11-record feed covering AC scenarios 1–9 and 11:
- invalid card, missing account, over limit, expired, 102 overwritten by 103
- a new category balance
- the posting-order case (300.00, 120.00, −50.00 on one card)
- an equal-amount tie

The workflow ran FINISHED on it. `test/output/` holds the result, and it matches the hand-computed expectation:
- 5 posted, 6 rejected, read 11 = 5 + 6, status WARNING, RC 4
- account 3 posts −50.00 then 120.00 and rejects 300.00 with 102

The two Python adapters have **not** been executed: there was no shell in the build session.
