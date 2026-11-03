# CardDemo statement generation on FlowX.AI

Project `cd_creastmt_zflx_opus_r2` (app `<uuid>`, WIP version
`<uuid>`), workflow **`creastmt_statement_generation`**
(resourceId `<uuid>`, resourceDefinitionId `<uuid>`).

```
Start → Load accounts + transactions → Build statement models → Render statements → End
```

| Contract | Workflow key | Direction |
|---|---|---|
| `transact.dat` (CVTRA05Y, 350) | `transact` | INPUT (optional, may be empty) |
| `acctdata.dat` (CVACT01Y, 300) | `acctdata` | INPUT |
| `cardxref.dat` (CVACT03Y, 50) | `cardxref` | INPUT |
| `custdata.dat` (CUSTREC, 500) | `custdata` | INPUT |
| `creastmt_statements.txt` (80) | `creastmt_statements` | OUTPUT, lines joined by `\n` |
| `creastmt_statements_html.txt` (100) | `creastmt_statements_html` | OUTPUT, lines joined by `\n` |

Run it with the file contents as strings, e.g. `run_workflow` with
`{"transact": "<file text>", "acctdata": "...", "cardxref": "...", "custdata": "..."}`
(`tests/sample/inputBody.json` is a complete example). Write each OUTPUT string to the `.txt` file of the same name.

- `assumptions.md` lists every decision the wiki did not settle; `flags.json` lists the same ones as declared flags.
- `flowx/scripts/` holds the three SCRIPT node bodies, the same code that is deployed.
- `tools/run_local.js` runs those bodies under Node against a directory of `.dat` files. It was not run during
  this build, because no shell was available; the workflow itself was run in FlowX.
- `tests/sample/` holds a synthetic input set covering:
  - a two-card account,
  - an account with no transactions,
  - negative overpunched amounts,
  - an overflowing balance,
  - an empty middle name,
  - a multi-word city,
  - a transaction on a card not in the cross-reference.

  It also holds the text output the deployed workflow produced for that input (run `6adf6eb216836599f394752e`, FINISHED).
