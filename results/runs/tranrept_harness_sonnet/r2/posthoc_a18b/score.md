# A18(b) first attempt, post-hoc: TRANREPT harness Sonnet r2

Labelled POST-HOC correction (PROTOCOL A18 b, notebook §53/§55). The original score is kept unchanged
(`runs/layer1/tranrept_harness_scores.md`, version cdf2a955 from the second unauthorised retry).

- Version: <uuid> (WIP, branch ai/build-the-carddemo-daily-trans-df2354, 19:37:19Z),
  verified in `first_attempt.txt` (after the first run_started 19:37:18.4Z, before the first behaviour_failed
  19:38:11.2Z and the first retry's run_started 19:38:18.6Z).
- Workflow GenerateDailyTransactionReport b52377b8; its text equals the scored version's once ids are removed.
- Keymap `{"_root":"outputs"}`, map and flags (25: 6 wiki + 19 build, sha256 97492c55…) committed in bbe1639 before execution.
- Executed 2026-10-27 21:53:21–21:56:58Z, file mode, zctx ok before and after, no redo. All five runs FINISHED with an
  END output whose status is FAILED: "Input validation failed; no report generated." (INVALID_INPUT).

| set | strict | business | divergent | silent | flagged | silent rules |
|---|---|---|---|---|---|---|
| base | 0% | 0% | 363 | 363 | 0 | R-ABSENT |
| c01 | 0% | 0% | 366 | 366 | 0 | R-ABSENT |
| c02 | 0% | 0% | 362 | 362 | 0 | R-ABSENT |
| c03 | 0% | 0% | 363 | 363 | 0 | R-ABSENT |
| c04 | 0% | 0% | 370 | 370 | 0 | R-ABSENT |

Same as the original score on every set (absent; the build stops on record 1 of transact.dat, whose FILLER holds NUL
bytes, as §50 records).
