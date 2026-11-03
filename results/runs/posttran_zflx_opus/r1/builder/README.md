# CardDemo POSTTRAN on FlowX.AI

Daily transaction posting (legacy POSTTRAN / CBTRN02C), built from `posttran-opus.pdf`
(wiki pages + CONTRACT.md).

## FlowX resources (project `cd_posttran_zflx_opus_r1`, WIP version `<uuid>`)

| Workflow | resourceId | resourceDefinitionId | Purpose |
|---|---|---|---|
| `posttran_daily_posting` | `<uuid>` | `<uuid>` | The batch step |
| `posttran_regression_harness` | `<uuid>` | `<uuid>` | Generates fixed-width test files, runs the step as a subworkflow, asserts the results |

`posttran_daily_posting`: Start → **Load Daily Inputs** (copybook parsing) → **Validate and Post
Transactions** (PostingValidation + UpdateCategoryBalance, sequential loop) → **Build Contract
Outputs** → End.

- **Input (START slice):** `dailytranDat`, `acctdataDat`, `cardxrefDat`, `tcatbalDat`, `carddataDat`
  (raw file text); `businessDate`; optional `processingTimestamp`; optional `validationProfile`
  (`LEGACY` default, or `WIKI`; see `output/assumptions.md` A-01..A-03).
- **Output (END slice):** `posttran_transact`, `posttran_dalyrejs`, `posttran_acctdata`,
  `posttran_tcatbal` (CONTRACT.md shapes) and `posttran_stats`.

## Running a day

```sh
python3 runner/posttran_runner.py prepare <input_dir> body.json      # reads the *.dat files
# run posttran_daily_posting with body.json as input (MCP run_workflow, or the Designer);
# save the END node output as result.json
python3 runner/posttran_runner.py emit result.json output/          # writes the 4 posttran_*.json
```

`output/` already holds `assumptions.md` (every decision taken where the wiki is silent or
contradicts itself) and `flags.json` (the same uncertainties, in the CONTRACT.md flag format).

## Verification done

Harness runs, all PASS:
- `LEGACY`, mixed file: 32 checks. Covers posted/rejected split; reasons 100/101/102/103; 102 vs 103
  precedence; balance and cycle-credit/debit updates; TCATBAL update and creation; intra-run balance
  carry-over; ASCII and EBCDIC-style overpunch; an 11-digit account id; field trimming.
- `WIKI`, mixed file: 32 checks (adds the inactive-account reject 104 and the wiki over-limit formula).
- Empty daily file: 8 checks.
- A direct run of `posttran_daily_posting` returns the END output slice.

Not done: no run against the real CardDemo input files, which are not in this folder, so the outputs
have not been compared with the legacy oracle.
