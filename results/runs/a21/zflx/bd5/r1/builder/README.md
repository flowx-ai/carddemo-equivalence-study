# CardDemo CREASTMT (statement generation) on FlowX.AI

- Environment: dev-env (`<dev-environment>`), FlowX 5.13
- Project: `cd_a21_bd5_zflx_r1` (appId `<uuid>`, WIP version `<uuid>`)
- Workflow: `creastmt_statement_generation`
  - resourceId `<uuid>`
  - resourceDefinitionId `<uuid>`

```
Start ──► Build Statement Data ──► Render Text Statements ──► Render HTML Statements ──► End
          (parse CVACT03Y/CVCUS01Y/  (STMTFILE, 80 cols)        (HTMLFILE, 100 cols)
           CVACT01Y/CVTRA05Y,
           BR-01..03 → StatementData)
```

## Contract

INPUT slice on Start (all mandatory, STRING; each is the full content of the file, one record per line):

| key        | file           | copybook  | record |
|------------|----------------|-----------|--------|
| `transact` | transact.dat   | CVTRA05Y  | 350    |
| `acctdata` | acctdata.dat   | CVACT01Y  | 300    |
| `cardxref` | cardxref.dat   | CVACT03Y  | 50     |
| `custdata` | custdata.dat   | CUSTREC   | 500    |

OUTPUT slice on End:

| key                        | file                            | form |
|----------------------------|---------------------------------|------|
| `creastmt_statements`      | creastmt_statements.txt (80)    | lines joined by `\n`, trailing spaces omitted |
| `creastmt_statements_html` | creastmt_statements_html.txt (100) | same |
| `statementCount`           | —                               | number of statements (optional) |

## Running it

Run the workflow with an input body holding the four files' contents, for example with the MCP tool
`run_workflow { workflowResourceId: "<uuid>", inputBody: "{\"transact\": \"…\", …}" }`.
Then write each output string to `<key>.txt` next to `assumptions.md`. The outputs come back in the
`<name without extension>` → string form that CONTRACT.md accepts.

No input files were supplied in this directory, so no real outputs were produced. `selftest/` contains synthetic
inputs (3 cards: one with no transactions, one matching the AC-7 credit scenario, and one with a negative balance, a
long description and overpunched amounts) and the outputs the deployed workflow produced for them
(run `6ae1e5c53695c563ea50ad5e`, all nodes COMPLETED).

Decisions where the wiki is silent or uncertain: see `assumptions.md`.
