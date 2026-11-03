# Harness × Sonnet wiki × INTCALC, r1 (A8): scored

- Build: project `cd_intcalc_harness_sonnet_r1` (app 8ab2645e…), version 2fc3c2d3… (COMMITTED, branch
  `ai/carddemo-interest-calculation-b240ac`), workflow `CalculateCardDemoInterest` (resource 13c50e54…):
  Start → script "Calculate interest" → AI "Draft assumptions" → script "Finalize result" → End.
- Builder: harness on dev-env, gpt-6.1-sol, 29 model calls, 1.41 M in / 30.4 k out.
- Flags: 14 (1 wiki, 13 build), mapped from the build's assumption catalogue in its workflow script before execution
  (commit d906ce6, `FLAGS.sha256`).
- Execution: adapter `encode` with a pure renaming map (`interest_rate` → `interestRate` in disclosure rows); five
  instances FINISHED (`adapter/runs.log`).
- Result on every set: the build returns status FAILED, error `Empty group_id`, and no records. Its account
  validation rejects a blank `group_id`, and every account in the CardDemo data has a blank group (the legacy program
  looks the blank group up, finds no row, and falls back to DEFAULT). Under A2 these outputs are absent.

| set | records | strict | business | divergent (silent / flagged) | rule |
|---|---|---|---|---|---|
| base | 100 | 0.00% | 0.00% | 100 (100 / 0) | R-ABSENT |
| c01 | 100 | 0.00% | 0.00% | 100 (100 / 0) | R-ABSENT |
| c02 | 99 | 0.00% | 0.00% | 99 (99 / 0) | R-ABSENT |
| c03 | 100 | 0.00% | 0.00% | 100 (100 / 0) | R-ABSENT |
| c04 | 103 | 0.00% | 0.00% | 103 (103 / 0) | R-ABSENT |

- The blank-group rejection is not flagged. The catalogue's validation entry (`[validation]`, line 25) says decoded-input
  validation is unstated in the wiki, but it names no rule and does not mention the group id, so it was not mapped.
- Scoring note: a first pass decoded the FAILED result as empty lists, and the scorer tagged the missing records
  R-INT-RATE (flagged) and R-PASSTHRU (silent). That contradicts A2 (an error result leaves the outputs absent). The
  decoder now writes no lists for an error result with no records; no earlier run returned such a result, so no
  earlier score changes. The reports above are from the corrected pass.
