# CREASTMT statement generation — FlowX build

- Environment: dev-env, project `cd_a21_yx3_zflx_r2` (version `<uuid>`, WIP, not committed).
- Workflow: `creastmt_statement_generation`, resourceId `<uuid>`.

Run it with the file contents as the input body:

```json
{ "transact": "<transact.dat>", "acctdata": "<acctdata.dat>", "cardxref": "<cardxref.dat>", "custdata": "<custdata.dat>" }
```

The END node returns `creastmt_statements` (80-col lines joined by `\n`), `creastmt_statements_html`
(100-col lines joined by `\n`), `statementCount` and `runMessages` (cards skipped, or `OK`).
Write the two strings to `creastmt_statements.txt` and `creastmt_statements_html.txt`.

Decisions: `assumptions.md`. Declared uncertainties: `flags.json`.
