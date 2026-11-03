# POSTTRAN on FlowX: daily transaction posting (P-14)

## FlowX implementation

The implementation lives on dev-env, project `cd_a21_dr8_zflx_r1`:
- app `<uuid>`
- WIP version `<uuid>`

It is one integration workflow, **`posttran_daily_transaction_posting`**:
- resourceId `<uuid>`
- resourceDefinitionId `<uuid>`

```
Start → Load Daily Feed → Order Feed by Amount (BR-10) → Validate and Post → Build Run Summary → End
```

| Node | Does |
|---|---|
| Load Daily Feed | Parses DALYTRAN / ACCTDATA / CARDXREF / TCATBAL fixed-width records (copybook offsets, signed zoned decimals → cents) |
| Order Feed by Amount | BR-10 stable ascending-amount sort |
| Validate and Post | BR-01..BR-04 checks (103 overwrites 102), BR-05 posting (transaction, TCATBAL upsert, account balance and cycle totals), BR-06 rejects, BR-09 one posting per id |
| Build Run Summary | Contract-shaped outputs, counts, BR-07 WARNING / RC 4 |
| End | Returns `{posttran_transact, posttran_dalyrejs, posttran_acctdata, posttran_tcatbal, runSummary}` |

Workflow input: `dailytranLines`, `acctdataLines`, `cardxrefLines`, `tcatbalLines` (arrays of raw record
lines), plus `batchId`, `businessDate` and `feedReference`.

## Running a batch

`posttran_io.py` is only the file adapter; it does not interpret any field.

```
python3 -I posttran_io.py prepare <dir with dailytran.dat acctdata.dat cardxref.dat tcatbal.dat> request.json --business-date 2022-07-18
# run the workflow with request.json as its input body:
#   the zflx MCP `run_workflow`, or the Designer's Run, on workflow <uuid>; save the END output as result.json
python3 -I posttran_io.py emit result.json outputs/
```

`emit` writes `posttran_transact.json`, `posttran_dalyrejs.json`, `posttran_acctdata.json`,
`posttran_tcatbal.json` and `posttran_run_summary.json` into `outputs/`, next to `assumptions.md` and
`flags.json`.

## Verification done

The workflow was run end to end on a 10-record synthetic feed built to the copybook layouts. All
results matched values worked out by hand beforehand:
- Posting order of AC 11 (−50 and 120 posted, 300 rejected 102).
- Reasons 100, 101 and 103; an overlimit-and-expired record gets 103.
- A new TCATBAL is created and an existing one is updated.
- An ASCII-style negative zoned value parses correctly.
- A duplicate id is skipped.
- Status WARNING with RC 4; a one-record clean run gives COMPLETED with RC 0.

The real CardDemo input files were not available in this directory, so the contract outputs have not
been produced yet.
