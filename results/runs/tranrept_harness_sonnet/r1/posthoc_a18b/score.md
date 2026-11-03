# A18(b) first attempt, post-hoc: TRANREPT harness Sonnet r1

Labelled POST-HOC correction (PROTOCOL A18 b, notebook §53/§55). The original score is kept unchanged
(`runs/layer1/tranrept_harness_scores.md`, version d5ebed04 from the second unauthorised retry).

- Version: <uuid> (WIP, branch ai/carddemo-daily-transaction-rep-968c40, 19:14:58Z),
  verified in `first_attempt.txt` (after the first run_started 19:14:56.9Z, before the first behaviour_failed
  19:15:40.8Z and the first retry's run_started 19:15:56.9Z).
- Workflow DailyTransactionReport cebbec9f; its text equals the scored version's once ids are removed (`def_compare.txt`).
- Keymap `{"_root":"files"}`, map and flags (29: 6 wiki + 23 build, sha256 e326ec71…) committed in bbe1639 before execution.
- Executed 2026-10-27 21:51:31–21:53:21Z, file mode, zctx ok before and after, no redo. All five runs FINISHED with an END output.
- Scorer: `scorer/report_compare.py` (layer 1, pre-registered), via `tools/l1_score.sh`, settings as the original.

| set | strict | business | divergent | silent | flagged | flagged rules |
|---|---|---|---|---|---|---|
| base | 98.90% | 99.18% | 3 | 0 | 3 | R-REPT-HEADER, R-REPT-LASTACCT, R-REPT-LASTDUP |
| c01 | 98.91% | 99.18% | 3 | 0 | 3 | same |
| c02 | 98.90% | 99.17% | 3 | 0 | 3 | same |
| c03 | 98.90% | 99.18% | 3 | 0 | 3 | same |
| c04 | 98.65% | 99.19% | 3 | 0 | 3 | same |

The decoded report is byte-identical to the original scored output on all five sets, so the post-hoc score equals the
original score. The original figure stands; it did not depend on the unauthorised retries.
