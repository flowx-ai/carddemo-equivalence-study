# ACCRUE on FlowX — how to run

FlowX: project `ll_a17_accrue_zflx_detailed_r1` (dev-env), workflow `interest-calculation`
(resourceId `<uuid>`).

1. `python3 -I tools/make_input.py <input_dir> run_input.json`
2. Run the workflow with `run_input.json` as the input body. You can do this from the Designer, or
   with the MCP `run_workflow { workflowResourceId, inputBody }`.
3. Save the End node payload as `end_payload.json`, then run
   `python3 -I tools/split_output.py end_payload.json .`

Step 3 writes `accrue_systxn.json` and `accrue_ledgacc.json` here, next to `assumptions.md` and
`flags.json`.
