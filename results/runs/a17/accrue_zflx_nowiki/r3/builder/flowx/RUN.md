# Running ACCRUE in FlowX

Workflow `accrue_interest`: app `ll_a17_accrue_zflx_nowiki_r3` on dev-env, WIP version `<uuid>`.
resourceId `<uuid>`, resourceDefinitionId `<uuid>`.

INPUT slice on START (all strings):
- `ledgacc`, `balcat`, `cardlink`, `rategrp`: the full contents of the input files. `ledgacc`/`balcat` may
  also be the JSON-list form of the POSTDAY outputs.
- optional: `parmDate` (default `2022071800`), `businessDate` (default `2022-07-18`), `procTs`,
  `updateLastAccount` (`Y` to also rewrite the last account; default off, see assumptions A-10).

OUTPUT slice on END:
- `systxnJson`: write verbatim to `accrue_systxn.json`
- `ledgaccJson`: write verbatim to `accrue_ledgacc.json`
- `anomalies`, `stats`: diagnostics

Run it with `run_workflow { workflowResourceId, inputBody }`, or POST from the Designer's run panel.
Verified on 2026-10-28 against two synthetic fixtures (fixed-width and JSON input, DEFAULT-group
fallback, negative truncation, last-account skip/apply). It has not been run on the real input files,
which were not supplied.
