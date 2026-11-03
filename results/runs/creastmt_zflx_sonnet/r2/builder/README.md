# CardDemo CREASTMT — statement generation on FlowX.AI

FlowX project `cd_creastmt_zflx_sonnet_r2` (platform 5.13, WIP version `<uuid>`).

## Workflow `creastmt_statement_generation`

- resourceId `<uuid>`
- resourceDefinitionId `<uuid>`

```
Start → List cross references and load files → Build statement data per card
      → Render statement-text (80 col) → Render statement-html (100 col) → Build run summary → End
```

### Input (START slice), file contents as strings

| Key | File | Copybook |
|-----|------|----------|
| `transactFile` (optional) | `transact.dat` | CVTRA05Y (350) |
| `acctdataFile` | `acctdata.dat` | CVACT01Y (300) |
| `cardxrefFile` | `cardxref.dat` | CVACT03Y (50) |
| `custdataFile` | `custdata.dat` | CUSTREC (500) |

### Output (END slice)

| Key | Contract file |
|-----|---------------|
| `creastmt_statements` | `creastmt_statements.txt` (80-column lines, joined by `\n`) |
| `creastmt_statements_html` | `creastmt_statements_html.txt` (100-column lines, joined by `\n`) |
| `runStatus` / `runMessage` / `statementCount` | run summary (`ERROR` if an xref's customer/account is missing, or a line is off width) |

Decisions where the wiki was silent or uncertain: [`assumptions.md`](assumptions.md).

## Test

`test/fixtures/*.dat` cover:

- a cross-reference file out of card order
- a card with no transactions
- unsorted transaction ids
- negative overpunched amounts
- a description longer than 49 characters
- an empty middle name and a two-word city
- a transaction for a card with no cross-reference

Running the workflow on them gives `test/expected/creastmt_statements.txt`, with `runStatus = OK`: all 61 text lines are 80 wide and all 236 HTML lines are 100 wide.
