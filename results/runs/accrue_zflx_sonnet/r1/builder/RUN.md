# ACCRUE on FlowX — how to run

FlowX environment `dev-env`, project `ll_accrue_zflx_sonnet_r1` (appId `<uuid>`),
workflow `accrue_interest_calculation`:

- resourceId `<uuid>`
- resourceDefinitionId `<uuid>`

Nodes: Start → Parse input files → Calculate interest and post → Build contract outputs → End (payload `${result}`).
Script sources are mirrored in `flowx/scripts/`.

## Input (Start INPUT slice)

| Key | Content | Required |
|-----|---------|----------|
| `ledgaccDat` | full text of `ledgacc.dat` (oracle POSTDAY output) | yes |
| `balcatDat` | full text of `balcat.dat` (oracle POSTDAY output) | yes |
| `rategrpDat` | full text of `rategrp.dat` | yes |
| `cardlinkDat` | full text of `cardlink.dat` | no (card_num blank without it) |
| `interestRunDate` | ACCRUE PARM, default `2022071800` | no |
| `processingTimestamp` | fixed orig/proc timestamp for reproducible runs | no |
| `batchId` | not used | no |

`daytxn.dat`, `clntrec.dat`, `crdrec.dat`, `txntype.dat` and `txncatg.dat` are not read by this step.

## Running

Run the workflow (Designer "Run", or MCP `run_workflow`) with:

```json
{"ledgaccDat": "<ledgacc.dat>", "balcatDat": "<balcat.dat>", "rategrpDat": "<rategrp.dat>",
 "cardlinkDat": "<cardlink.dat>", "interestRunDate": "2022071800"}
```

The END output is `{ accrue_systxn: [...], accrue_ledgacc: [...], summary: {...} }`. Write
`accrue_systxn` to `output/accrue_systxn.json` and `accrue_ledgacc` to `output/accrue_ledgacc.json`.
Check `summary.messages` for skipped accounts, missing xrefs or missing rates.
