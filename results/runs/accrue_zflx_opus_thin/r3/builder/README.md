# Ledgerline ACCRUE on FlowX.AI

Workflow `accrue_interest_calculation` (resourceId `<uuid>`,
resourceDefinitionId `<uuid>`) in the `dev-env` project.

## Run

Start the workflow with the raw file contents as strings (one fixed-width record per line):

```json
{
  "ledgacc":  "<contents of ledgacc.dat>",
  "cardlink": "<contents of cardlink.dat>",
  "balcat":   "<contents of balcat.dat>",
  "rategrp":  "<contents of rategrp.dat>",
  "accrueParm": "2022071800",
  "businessDate": "2022-07-18"
}
```

Optional switches (see assumptions.md): `resetCycleTotals` (default true, A-13), `postLastAccount` (default true, A-12).

The End node returns `{ accrue_systxn: [...], accrue_ledgacc: [...], accrue_summary: {...} }`.
Write `accrue_systxn` to `accrue_systxn.json` and `accrue_ledgacc` to `accrue_ledgacc.json`, alongside
`assumptions.md` and `flags.json`. `accrue_summary.warnings` lists any record that was skipped or defaulted.
