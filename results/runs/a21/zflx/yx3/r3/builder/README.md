# CardDemo statement generation (CREASTMT / P-17) on FlowX.AI

## Where it lives
- Environment `dev-env` (platform 5.13.0), app `<uuid>`, WIP version
  `<uuid>` (not committed).
- Workflow **`creastmt_statement_generation`**: resourceId `<uuid>`,
  resourceDefinitionId `<uuid>`.

```
Start ─▶ Parse Input Files ─▶ Build Statement Data ─▶ Render Statement Text ─▶ Render Statement HTML ─▶ Build Run Summary ─▶ End
```
The node scripts are mirrored in `flowx/scripts/`, one file per SCRIPT node in that order.

## Contract
| Direction | Key | Content |
|-----------|-----|---------|
| INPUT  | `transact` | full text of `transact.dat` (CVTRA05Y, 350) |
| INPUT  | `acctdata` | full text of `acctdata.dat` (CVACT01Y, 300) |
| INPUT  | `cardxref` | full text of `cardxref.dat` (CVACT03Y, 50) |
| INPUT  | `custdata` | full text of `custdata.dat` (CUSTREC, 500) |
| OUTPUT | `creastmt_statements` | the lines of `creastmt_statements.txt` (80 columns), joined by `\n` |
| OUTPUT | `creastmt_statements_html` | the lines of `creastmt_statements_html.txt` (100 columns), joined by `\n` |
| OUTPUT | `runSummary` | JSON string: input counts, statements, skipped cards, parse warnings |

To produce the two files, write each output string to `<key>.txt`. The contract also accepts the strings as they are,
under the key names.

## Running it
Use `run_workflow` with `workflowResourceId = <uuid>` and an `inputBody` of
`{"transact": "...", "acctdata": "...", "cardxref": "...", "custdata": "..."}`. Equivalently, use the Designer's Run
button with the same body.

## Test
`test/fixture_input.json` is a small hand-built fixture. It contains:
- 3 customers with FICO 623 / 711 / 793
- a card with 3 out-of-order transactions, one of them negative
- a card with no transactions
- an xref row with no customer or account
- a transaction for a card that is not on the xref

`test/fixture_creastmt_statements.txt` is the text output of a run on that fixture (run `6ae1f54a3695c563ea50af90`,
FINISHED), with trailing spaces trimmed.

Decisions: `assumptions.md`. Declared uncertainties: `flags.json`.
