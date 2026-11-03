# POSTTRAN on FlowX — daily transaction posting

FlowX project `cd_a21_dr8_zflx_r3` (dev-env), workflow `posttran_daily_transaction_posting`:

- resourceId `<uuid>`
- resourceDefinitionId `<uuid>`

```
Start ─▶ Load Daily Feed ─▶ Order Feed BR-10 ─▶ Validate and Post Records ─▶ Build Run Summary ─▶ End
         (parse copybook     (amount ascending,   (BR-01..04 checks, BR-05      (BR-07 state,       payload
          layouts)            stable)              posting, BR-06 rejects)       counts)            ${posttranOutput}
```

The `RejectReasonCode` project enumeration holds codes 100–103.

## Run on a set of inputs

1. Build the input body:
   `python3 -I tools/build_input.py <input_dir> 2022-07-18 > input_body.json`
2. Run the workflow with that body (MCP `run_workflow`, or the Designer's Run with the same JSON)
   and save the END-node output as `result.json`.
3. Write the contract files next to `assumptions.md`:
   `python3 -I tools/write_outputs.py result.json .`

This writes `posttran_transact.json`, `posttran_dalyrejs.json`, `posttran_acctdata.json`,
`posttran_tcatbal.json` and `posttran_run_summary.json`.

## Test fixture

`test/input/` holds a synthetic feed covering acceptance scenarios 1–9 and 11:

- invalid card, missing account, over limit, expired, and over limit + expired (gives 103)
- a new category balance
- posting order: purchases 300 and 120 and credits of −50 on one card
- both overpunch sign encodings

`test/output/` is what FlowX run `6ae1e3c73695c563ea50acf3` produced for it. It matches the
hand-computed result: 3 posted, 5 rejected, WARNING / RC 4.

Decisions taken where the wiki is open: see `assumptions.md`.
