# CREASTMT statement generation on FlowX.AI

- **Environment:** dev-env (`<dev-environment>`)
- **Project:** `cd_creastmt_zflx_opus_r1` (appId `<uuid>`, WIP version `<uuid>`, not committed)
- **Workflow:** `creastmt_statementGeneration`
  - resourceId `<uuid>`
  - resourceDefinitionId `<uuid>`

```
Start → Load accounts + transactions → Build statement models → Render statements (text + HTML) → End
```

## Contract

| Direction | Key | Content |
|---|---|---|
| INPUT | `transact` | contents of `transact.dat` (CVTRA05Y, 350) — optional/empty allowed |
| INPUT | `acctdata` | contents of `acctdata.dat` (CVACT01Y, 300) |
| INPUT | `cardxref` | contents of `cardxref.dat` (CVACT03Y, 50) |
| INPUT | `custdata` | contents of `custdata.dat` (CUSTREC, 500) |
| OUTPUT | `creastmt_statements` | lines of `creastmt_statements.txt`, joined by `\n` |
| OUTPUT | `creastmt_statements_html` | lines of `creastmt_statements_html.txt`, joined by `\n` |

Run it with the four file contents as the input body:
- **Designer:** Run workflow.
- **MCP:** `run_workflow { workflowResourceId, inputBody: {"transact": "...", "acctdata": "...", "cardxref": "...", "custdata": "..."} }`

Each output string is the file's lines joined by `\n`, which CONTRACT accepts in place of the file. To get the `.txt` files, write each string to `<key>.txt`.

Decisions taken where the wiki was silent or open: see `assumptions.md`.
