# POSTTRAN (daily transaction posting) on FlowX.AI

FlowX build of the CardDemo POSTTRAN / CBTRN02C batch step (wiki process P-14).

## What is on the platform

Environment `dev-env`, project **cd_posttran_zflx_sonnet_r3** (appId `<uuid>`,
WIP version `<uuid>`, not committed).

| Resource | Id |
|---|---|
| Workflow `daily_transaction_posting` | resourceId `<uuid>`, resourceDefinitionId `<uuid>` |
| Enumeration `RejectReasonCode` (100, 101, 102, 103, 109) | resourceId `<uuid>` |

Workflow graph: `Start → Load Daily Feed → Validate and Post Records → Build Run Summary → End`.

| Node | Source in this repo | Legacy |
|---|---|---|
| Load Daily Feed (SCRIPT) | `flowx/01_load_daily_feed.js` | file OPEN/READ, copybook layouts |
| Validate and Post Records (SCRIPT) | `flowx/02_validate_and_post.js` | 1500-VALIDATE-TRAN, 2000/2700/2800/2900, 2500-WRITE-REJECT-REC |
| Build Run Summary (SCRIPT) | `flowx/03_build_run_summary.js` | end-of-job DISPLAY, RETURN-CODE |
| End (payload) | `flowx/04_end_payload.txt` | — |

The `.js` files are the exact text deployed in the nodes. If you edit one, push it again with
`configure_script_node`.

## Running it for a set of input files

Input (START slice, all strings): `dailytranFile`, `acctdataFile`, `cardxrefFile` (required),
`tcatbalFile`, `batchId`, `businessDate` (optional). Each file value is the **raw content** of the
`.dat` file (newline-separated fixed-width records).

Run it with the MCP tool `run_workflow` (or the Designer's Run), for example:

```json
{ "batchId": "2022-07-18", "businessDate": "2022-07-18",
  "dailytranFile": "<contents of dailytran.dat>", "acctdataFile": "<contents of acctdata.dat>",
  "cardxrefFile": "<contents of cardxref.dat>", "tcatbalFile": "<contents of tcatbal.dat>" }
```

The END output has one key per contract file. Write each array to its file next to `assumptions.md`:

| END key | file |
|---|---|
| `posttran_transact` | `posttran_transact.json` |
| `posttran_dalyrejs` | `posttran_dalyrejs.json` |
| `posttran_acctdata` | `posttran_acctdata.json` |
| `posttran_tcatbal` | `posttran_tcatbal.json` |

`runSummary` (read / processed / rejected / duplicatesSkipped / state / returnCode) is informational.

## Verification done

There were no real input files in this directory, so nothing was produced for the oracle's data.
The workflow was run on synthetic fixtures (`test/fixtures/*.dat`) that cover each acceptance scenario
the step can actually reach:
valid post (credit and debit), new category balance, reasons 100/101/102/103, 103 overriding 102,
a duplicate transaction id, and the WARNING end state. The results are in `test/run-output/` and
match hand-computed expectations.
Run ids: `6adf1fbf16836599f39456c8` (full fixture), `6adf1fd016836599f39456ca` (END payload check).

Every decision taken where the wiki was silent or uncertain is in `assumptions.md`.
