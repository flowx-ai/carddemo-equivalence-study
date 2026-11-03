# CardDemo CREASTMT (statement generation) on FlowX.AI

## Where it lives

- **Environment:** dev-env (`<dev-environment>`)
- **Project:** `cd_a21_bd5_zflx_r3`
  - app `<uuid>`
  - WIP version `<uuid>`
- **Workflow:** `creastmt_statement_generation`
  - resourceId `<uuid>`
  - resourceDefinitionId `<uuid>`

```
START ─▶ Build statement data ─▶ Render text statements ─▶ Render HTML statements ─▶ Build run summary ─▶ END
```

## Contract

**INPUT slice on START.** Each field holds a whole file's content as a string.

| key        | file            | copybook  |
|------------|-----------------|-----------|
| `transact` | `transact.dat`  | CVTRA05Y  |
| `acctdata` | `acctdata.dat`  | CVACT01Y  |
| `cardxref` | `cardxref.dat`  | CVACT03Y  |
| `custdata` | `custdata.dat`  | CUSTREC   |

**OUTPUT slice on END.**

| key                         | contents |
|-----------------------------|----------|
| `creastmt_statements`       | lines of `creastmt_statements.txt` (80 cols), joined by `\n` |
| `creastmt_statements_html`  | lines of `creastmt_statements_html.txt` (100 cols), joined by `\n` |
| `statementCount`, `runSummary` | run information |

## Running it

Pass the four file contents as the JSON input body, for example with the zflx MCP tool:
`run_workflow { workflowResourceId: "<uuid>", inputBody: {"transact": "...", "acctdata": "...", "cardxref": "...", "custdata": "..."} }`.
Write each output string to `<key>.txt`.

## Files

| path | what |
|------|------|
| `flowx/scripts/*.js` | the exact code deployed in the four SCRIPT nodes |
| `test-inputs/*.dat` | synthetic fixtures covering the acceptance criteria |
| `outputs/creastmt_statements*.txt` | the platform run's output for those fixtures |
| `outputs/assumptions.md` | every decision taken where the wiki was uncertain or silent |
| `outputs/flags.json` | the same decisions in flag form |
