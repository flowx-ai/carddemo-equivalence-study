# CardDemo statement generation on FlowX

- Environment: dev-env. Project `cd_a21_bd5_zflx_r2` (appId `<uuid>`, WIP version `<uuid>`).
- Workflow `creastmt_statement_generation`: resourceId `<uuid>`, resourceDefinitionId `<uuid>`.

## Running it

Run the workflow with an input body that holds the raw content of each input file:

```json
{ "transact": "<transact.dat>", "acctdata": "<acctdata.dat>", "cardxref": "<cardxref.dat>", "custdata": "<custdata.dat>" }
```

The END node returns:
- `creastmt_statements`: the lines of `creastmt_statements.txt` (80 columns), joined by `\n`.
- `creastmt_statements_html`: the lines of `creastmt_statements_html.txt` (100 columns), joined by `\n`.
- `statementCount` and `runWarnings`: the run summary (for example, cards skipped because their customer or account is missing).

Decisions taken where the wiki is silent or uncertain are in `assumptions.md`.
