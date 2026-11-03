# Ledgerline ACCRUE on FlowX

**FlowX workflow** `ll_accrue` in project `ll_a17_accrue_zflx_nowiki_r2` on dev-env, version 787cd179… (WIP, not committed).
- resourceId `<uuid>`, resourceDefinitionId `<uuid>`
- START → SCRIPT "Compute interest" → END
- START INPUT slice: `ledgacc`, `cardlink`, `balcat`, `rategrp`, each holding the raw text of the matching `.dat` file. `parmDate` (default `2022071800`) and `businessDate` (default `2022-07-18`) are optional.
- END returns `{"accrue_systxn": [...], "accrue_ledgacc": [...]}`. Write each list to `accrue_systxn.json` / `accrue_ledgacc.json`.

**Local runner** (same logic): `node impl/run_local.js <dir with .dat files> <output dir>`. The core is in `impl/accrue_core.js`, and its body is identical to the SCRIPT node's.

Decisions: `assumptions.md`. Declared uncertainties: `flags.json`. Synthetic test: `test_fixture/`.
