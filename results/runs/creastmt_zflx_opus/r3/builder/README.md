# CardDemo statement generation on FlowX.AI

- **FlowX project:** `cd_creastmt_zflx_opus_r3` (appId `<uuid>`, WIP version `<uuid>`)
- **Workflow:** `creastmt_statement_generation`
  - resourceId `<uuid>`
  - resourceDefinitionId `<uuid>`

## Run contract

Input body:

```json
{
  "transactData": "<contents of transact.dat>",
  "acctData":     "<contents of acctdata.dat>",
  "cardxrefData": "<contents of cardxref.dat>",
  "custData":     "<contents of custdata.dat>",
  "emulateLegacyTableLimits": true
}
```

`emulateLegacyTableLimits` is optional and defaults to `true` (see assumptions.md B5).

Output from the END node:

| Key | Meaning |
|-----|---------|
| `creastmt_statements` | 80-column text statements (lines joined by `\n`) |
| `creastmt_statements_html` | 100-column HTML statements (lines joined by `\n`) |
| `statementCount` | Number of statements produced |
| `abendMessage` | Set only when the run stopped on a missing customer or account |
| `loadSummary` | Record counts, plus any card with more than 10 transactions |

## Files

| Path | Content |
|------|---------|
| `flowx/01_load_accounts_transactions.js` | Mirror of the *Load Accounts + Transactions* node script |
| `flowx/02_build_statement_model.js` | Mirror of the *Build Statement Model* node script |
| `flowx/03_render_statements.js` | Mirror of the *Render Statements* node script |
| `assumptions.md` | Every decision made where the wiki was silent or uncertain |
| `flags.json` | The same decisions as machine-readable flags |
| `test/creastmt_statements.txt` | Text output of the synthetic-fixture run (3 statements) |
