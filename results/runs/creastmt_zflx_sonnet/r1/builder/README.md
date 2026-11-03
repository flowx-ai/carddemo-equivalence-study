# CardDemo CREASTMT (statement generation, P-17) on FlowX.AI

FlowX project **cd_creastmt_zflx_sonnet_r1** (appId `<uuid>`,
WIP version `<uuid>`, platform 5.13.0).

## Workflows

| Workflow | resourceId | resourceDefinitionId | Purpose |
|---|---|---|---|
| `creastmt_statement_generation` | `<uuid>` | `<uuid>` | The step |
| `creastmt_test_harness` | `<uuid>` | `<uuid>` | Generates synthetic inputs and calls the step |

`creastmt_statement_generation`:
START → Build Statement Data → Render Text Statements (STMTFILE) → Render HTML Statements (HTMLFILE) → Build Run Summary → END

- **INPUT (START)**: `transact`, `acctdata`, `cardxref`, `custdata`. Each is the full content of `<name>.dat` (fixed width, one record per line).
- **OUTPUT (END)**:
  - `creastmt_statements`: the lines of `creastmt_statements.txt`, 80 columns, joined by `\n`
  - `creastmt_statements_html`: the lines of `creastmt_statements_html.txt`, 100 columns, joined by `\n`
  - `statementCount`
  - `status` (`COMPLETED` / `FAILED`)
  - `runMessage`

To produce the contract files, write each output string to `<key>.txt`.

## Sources

- `flowx/scripts/*.js`: the exact script of each SCRIPT node (01–04 for the step, `test_generate_input.js` for the harness).
- `test/synthetic/creastmt_statements.txt`: text output of the harness run (instance `6adf4b1316836599f3946a1d`).
- `tools/make_test_data.py`: offline generator for the same synthetic files. It was written but not executed in this session (no shell). The FlowX harness script is the verified equivalent.
- `assumptions.md`: every decision taken where the wiki is silent or uncertain.
