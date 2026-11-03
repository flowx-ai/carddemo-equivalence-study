# Running the ACCRUE step on FlowX

Workflow `accrue_interest_calculation` lives in project `ll_a17_accrue_zflx_detailed_r2` on dev-env:
- resourceId `<uuid>`
- resourceDefinitionId `<uuid>`

1. Build the input body from the run's input directory:
   `python3 -I tools/build_input.py <input_dir> 2022071800 2022-07-18 > input.json`
2. Run the workflow with that body, e.g. zFLX `run_workflow { workflowResourceId, inputBody }` or the Designer "Run".
3. Save the End-node output (`get_workflow_run` → End node) as `end_payload.json`.
4. Write the contract files:
   `python3 -I tools/write_outputs.py end_payload.json <output_dir>`

The End node returns:
- `accrue_systxn`: every interest transaction written, in CONTRACT.md transaction fields;
- `accrue_ledgacc`: every account after interest, in CONTRACT.md account fields;
- `runSummary`: counts, STANDARD-fallback lookups, balances with no rate or no account.

Design decisions and wiki gaps are in `assumptions.md`.

Verified on 2026-10-28 with a synthetic fixture: 4 accounts and 6 category balances (unsorted). The fixture covered:
- an 18% and a 25% rate, with truncation (6.944 → 6.94);
- a payment category at rate 0, and the ZEROAPR group;
- the STANDARD fallback on a negative balance (-1.85175 → -1.85);
- an unknown account, and an account with no balances.

All outputs matched the hand-computed values. The BigInt path, which covers products above 2^53, was not exercised.
