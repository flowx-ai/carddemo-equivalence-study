# A25 harness arm, part 1: correction to `SUMMARY.md`, labelled post hoc (2026-10-30)

Build: CR6 r2 (`cd_a25_bd5_harness_r2`). Decided by the user on 2026-10-30, after part 1 had ended. Notebook §89.

**The label.** Recorded at the time as the build's own check; corrected post hoc to a harness-side verdict rule.

**Why this is a separate file.** `SUMMARY.md` is listed in `prereg/frozen/a26/A26_MANIFEST.sha256`, and files listed in a
frozen manifest are left alone. This file sits beside it and takes precedence on the lines below. `SUMMARY.md` keeps the
original label.

**What did not change.** The score (0.00 on all five sets), the outcome class (other), changed records F 0 / K 0 / X 243,
the flags and H14h (not refuted on R-STMT-TOTAL and overall). Tally: 9 built, 9 scored, 0 lost. Retries: none on this
build. The workflow scored stays the WIP e7322864 under A2.

## Lines corrected

**CR6 per-CR table, column "Plan end", r2**

| | Text |
|---|---|
| Recorded at the time | FAILED behaviour_failed (the build's own check) |
| Corrected post hoc | FAILED behaviour_failed (recorded at the time as the build's own check; corrected post hoc to a harness-side verdict rule) |

**Parity table, CR6 r2, column "Stop type"**

| | Text |
|---|---|
| Recorded at the time | behaviour_failed (build's own check) |
| Corrected post hoc | behaviour_failed (recorded at the time as the build's own check; corrected post hoc to a harness-side verdict rule) |

**Stops paragraph ("Tally")**

| | Text |
|---|---|
| Recorded at the time | Build's own stops: behaviour_failed ×1 (CR6 r2), goal_at_risk ×1 (CR6 r3). Harness defect: D7 ×1 (CR8 r3; A25 stopped after it). |
| Corrected post hoc | Build's own stops: goal_at_risk ×1 (CR6 r3). Harness-side verdict rule: behaviour_failed ×1 (CR6 r2; recorded at the time as the build's own check; corrected post hoc). Harness defect: D7 ×1 (CR8 r3; A25 stopped after it). |

## What the correction does not do

- **No new stop number.** D1–D8 are stops recorded when they happened, each under the arm's stop rule. This one did not
  stop the arm, and nothing in the numbering requires a number for it.
- **The arm's stop rule, stated plainly.** A25 says a harness defect stops A25 at that build. Had this been classified as
  one at the time, the arm would have stopped at CR6 r2, and CR6 r3, CR7 r1–r3 and CR8 r1–r3 would have waited. It was
  not. Those 7 builds ran on the same image, are scored, and stay counted as registered.

## Related disclosure

`SUMMARY.md` was edited once after A26's freeze (commit eb7735dd, 2026-10-30 about 09:04Z, by the coordinator): the R13
digest suffix was corrected from …2b31 to …b2ca, the value in the frozen A25 protocol. That file is listed in
`prereg/frozen/a26/A26_MANIFEST.sha256`, so it no longer matches that manifest. No score or verdict is affected, and A26
ran no build that reads this file.

## Decision on the later builds

The user decided on 2026-10-30, after this correction: the 7 A25 builds after CR6 r2 stay counted, with the correction
disclosed. An exploratory CR6-CR8 rerun on a later image is added, reported beside A25 and never in place of it.

