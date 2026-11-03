# POSTTRAN on FlowX.AI — daily transaction posting (P-14)

**FlowX:** dev-env, project `cd_a16_posttran_zflx_sonnet_r3`, workflow
`posttran_daily_transaction_posting` (resourceId `<uuid>`,
resourceDefinitionId `<uuid>`).

```
START (input: dailytran, acctdata, cardxref, tcatbal file contents; businessDate, batchId)
  → SCRIPT "Validate and post"   flowx/scripts/01_validate_and_post.js   (CBTRN02C main loop)
  → SCRIPT "Build run summary"   flowx/scripts/02_build_run_summary.js   (WARNING / RC 4)
  → END    returns {posttran_transact, posttran_dalyrejs, posttran_acctdata, posttran_tcatbal, runSummary}
```

## Running

The input files are supplied per run (CONTRACT.md); none were in this folder, so no real outputs
have been produced yet. With an input directory `<in>`:

```sh
node run_posttran.js prepare <in> body.json     # FlowX START body → run the workflow with it
                                                #  (Designer "Run", or zflx run_workflow inputBody)
node run_posttran.js extract result.json out/   # END payload (or {output: ...}) → contract files
node run_posttran.js local   <in> out/          # same two deployed scripts, executed under Node
```

Outputs go to `out/` next to `out/assumptions.md` (every decision taken where the wiki is silent
or uncertain).

## Verification done

Synthetic feed in `tests/synthetic/` (8 records), run on FlowX (run `6ae128333695c563ea509459`):

| Rec | Case | Result |
|---|---|---|
| 1 | valid, card 4111… | posted, TCATBAL 01/0001 100.00 → 150.00 |
| 2 | card not in xref | reject 100 |
| 3 | xref → missing account 99 | reject 101 |
| 4 | 2150.00 → cycle total exactly 110% of 2000.00 | posted (boundary), new TCATBAL 01/0002 |
| 5 | 0.01 over 110% | reject 102 |
| 6 | expired account and over limit | reject 103 (overwrites 102) |
| 7 | −25.00 payment | posted, cyc debit −25.00, new TCATBAL 02/0001 |
| 8 | duplicate id of record 1 | skipped (idempotent) |

Account 1 after the run: balance 2369.00, cycle credit 2200.00, cycle debit −25.00. A second run
(`6ae128453695c563ea50945f`) confirmed the END payload and `runSummary` WARNING / RC 4.
`run_posttran.js` itself was not executed here (no shell was available in this session).
