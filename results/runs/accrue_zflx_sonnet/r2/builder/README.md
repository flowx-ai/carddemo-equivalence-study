# Ledgerline ACCRUE (interest calculation) on FlowX.AI

## What was built (FlowX project `ll_accrue_zflx_sonnet_r2`)

The step is the integration workflow **`accrue_interest_calculation`**:
- resourceId `<uuid>`
- resourceDefinitionId `<uuid>`

```
Start ─► Parse input files ─► Calculate interest and build transactions ─► Update accounts and assemble outputs ─► End
```

| Node | Rules |
|---|---|
| Parse input files | Reads the LXV022Y / LXV026Y / LXV027Y / LXV024Y fixed-width records, decoding signed overpunch, or the JSON-list form of the POSTDAY outputs |
| Calculate interest and build transactions | BR-01/02: rate lookup with the STANDARD fallback. BR-03/08: (balance × rate) / 1200, truncated. BR-04/05: transaction type 07 / category 12, id = run date + suffix. BR-07: no fees. BR-10: zero rates produce nothing |
| Update accounts and assemble outputs | BR-06: balance += total interest, cycle credit and debit reset to 0 |

Script sources: `flowx/workflow-accrue_interest_calculation/*.js`. They are copies of what is deployed on the nodes.

**Contract**

| Direction | Fields |
|---|---|
| INPUT (Start slice) | `ledgacc`, `balcat`, `rategrp` (required, the file contents as strings); `cardlink`, `interestRunDate` (default `2022071800`), `runTimestamp` (optional) |
| OUTPUT (End slice) | `accrue_systxn[]`, `accrue_ledgacc[]` (CONTRACT field names and types), `runSummary` (counts and warnings) |

## Running it on a set of input files

1. `python3 -I tools/accrue_io.py pack <input_dir> > body.json`
2. Run the workflow with that body as input:
   - in the Designer (Run, paste the body), or
   - through the MCP: `run_workflow { workflowResourceId: "<uuid>", inputBody: <body.json> }`.
3. Save the END output to `result.json`, then run `python3 -I tools/accrue_io.py unpack result.json output/`.

## Folder contents

| Path | What it is |
|---|---|
| `output/accrue_systxn.json`, `output/accrue_ledgacc.json` | Result of the verified run on the synthetic inputs in `testdata/input/` (run date `2022071800`, timestamp fixed to `2022-07-18-23.00.00.000000`) |
| `output/assumptions.md` | Every decision the wiki left open, with its basis |
| `output/flags.json` | The uncertainties declared up front (CONTRACT optional file) |
| `testdata/input/*.dat` | Synthetic records covering the acceptance scenarios. The 178-byte FILLER is omitted from the `ledgacc` lines; the parser does not need it |

## Verification status

**Run and checked:**
- the workflow on `testdata/input/`, with every value matching a hand calculation;
- a JSON-form input run;
- `analyze_workflow`, which found no issues.

**Not run:**
- the real oracle input files, which were not in this folder;
- `tools/accrue_io.py`: the build session had no shell. It is a short stdlib script, but treat it as untested.
