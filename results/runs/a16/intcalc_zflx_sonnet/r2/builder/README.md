# CardDemo INTCALC on FlowX.AI

FlowX build of P-15 interest-calculation (legacy `INTCALC` / `CBACT04C`).

| Item | Value |
|------|-------|
| Environment | dev-env, app `<uuid>`, version `<uuid>` (WIP, not committed) |
| Workflow | `intcalc_interest_calculation` — resourceId `<uuid>`, resourceDefinitionId `<uuid>` |
| Flow | START → Parse input files (SCRIPT) → Compute interest and update accounts (SCRIPT) → END |
| Script sources | `flowx/01_parse_input_files.js`, `flowx/02_compute_interest.js` (identical to what is deployed) |

## Contract

Input (START slice): `acctdataFile`, `tcatbalFile`, `discgrpFile`, `cardxrefFile` (optional) — the raw
fixed-width file contents — and `interestRunDate` (optional, default `2022071800`).

Output (END payload): `intcalc_systran` and `intcalc_acctdata` (CONTRACT.md field names), plus `runSummary`
(counts and warnings). Each list is written as-is to `outputs/intcalc_systran.json` and
`outputs/intcalc_acctdata.json`.

Decisions taken where the wiki is silent or uncertain: `outputs/assumptions.md`; declared uncertainties:
`outputs/flags.json`.
