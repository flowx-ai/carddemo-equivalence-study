# A25 harness arm, part 1: CR6–CR8 fresh on the R13 image — 9 of 9 builds scored; A25 STOPPED at CR8 r3 (harness defect D7)

Harness (model gpt-6.1-sol, `org_manager`) on dev-env, Sandbox workspace, R13 image digest 7360d185…b2ca
(`harness:local-3cc15a66e-1793305090`), checked before every build (`digest_check.log`), bundle hashes OK
(`hash_check.log`). Driver `auto` with the A8 gate answers, the A18 and A22 retry rules; A2 latest-version scoring.
Builds ran 2026-10-29 20:47Z to 2026-10-30 00:45Z, one at a time, via `tools/a25_harness_chain.sh`, each under the
dev-env lock. CR8 r3 was executed at 05:42Z after an operator-side usage stop (no dev-env activity in between).
Subject: AWS CardDemo, open source (Apache-2.0).

- **Built and scored:** CR6 r1–r3, CR7 r1–r3, CR8 r1–r3 (9 builds). No build lost. No rollback.
- **Stopped** at CR8 r3 on harness defect D7 (`HARNESS_DEFECTS.md`; coordinator classification from a user-run
  read-only journal query). The last check paused `goal_at_risk` because its decide requests carried no cited PDF pages:
  the step cites the PDF by file name only. CR8 r3 was the last CR build, so part 1 is complete.
- **Not run on R13 (A25 stopped at D7):** part 2 (harness A24 arm: smoke, r1–r3; H15h–H19h), part 3 (A18 (a), 24
  builds), part 4 (harness end to end). They wait for the user and a later amendment. They are not estimated.
- **Retries:** A18 on harness-attributed `item_evidence` pauses: CR6 r3 ×2, CR7 r2 ×1, CR8 r3 ×2. No platform-code
  retry (no `committed_preview_changed` on any build), no A22.
- **Interventions** (`runs/a25/interventions.log`): one `relogin all` at 05:42Z, before CR8 r3's execution, after
  its build had ended. One diagnostic run of `tools/a21_exec.sh` outside the lock at 05:42Z (no zflx build in flight;
  it stopped on the expired login before any workflow run). One waiting line at 20:28Z (a zflx execution held dev-env).
- **Disclosures:**
  - CR6 r2 was re-extracted at the run's WIP e7322864 under A2. The tool's pick was the `main` snapshot (no workflow),
    because the session's write target named `main` while the run's WIP sat on its own branch. The tool's pick is kept
    in `bd5/r2/exec/` (`a2_pick_tool.txt`, `context_tool.json`, `exec/tool_pick/`), as §52.
  - CR8 r3 is scored as it ended (A2); the D7 classification does not change its score.
- **CR6 counting rule (A25):** the A25 fresh set of three is the registered CR6 test. A23's CR6 r1–r2 are reported
  beside it and never pooled.

## Per-CR results

Strict and business are equal on every build below. Divergent records are summed over the five sets.

### CR6 (CREASTMT, bundle bd5, rule R-STMT-TOTAL)

| Build | Business % base / c01 / c02 / c03 / c04 | Divergent (silent / flagged) | Rules silent | Rules flagged | Changed F / K / X | Outcome (registered) | Build flags CR rule | Plan end | Calls | Wall s |
|---|---|---|---|---|---|---|---|---|---|---|
| r1 | 0.00 × 5 | 498 (0 / 498) | - | R-STMT-ADDR, R-STMT-ABEND (c03) | 0 / 0 / 243 | other | yes | COMPLETED | 40 | 1547 |
| r2 | 0.00 × 5 | 498 (0 / 498) | - | R-STMT-ADDR, R-STMT-ABEND (c03) | 0 / 0 / 243 | other | yes | FAILED behaviour_failed (the build's own check) | 31 | 760 |
| r3 | 0.00 × 5 | 498 (0 / 498) | - | R-STMT-ADDR, R-STMT-ABEND (c03) | 0 / 0 / 243 | other | yes | PAUSED goal_at_risk, 5 of 8 steps (build's own stop; 2 A18 retries first) | 48 | 1387 |

Every statement in every build differs from legacy on address line 3 (the builds leave the country out, a choice the
wiki does not settle and each build flags). That one line makes each changed record "differs from both" (X) at record
level. On the CR rule's own field the changed records follow the change (field-level table below, post-hoc).

**Beside it, never pooled — A23 image (stopped by D6):** CR6 r1 PAUSED goal_at_risk (build's own stop), CR6 r2 PAUSED
goal_at_risk (harness defect D6); neither wrote a workflow; both 0%, outcome other, changed F 0 / K 0 / X 243
(`runs/a23/harness/SUMMARY.md`).

### CR7 (TRANREPT, bundle ix3, rule R-REPT-SET)

| Build | Business % base / c01 / c02 / c03 / c04 | Divergent (silent / flagged) | Rules silent | Rules flagged | Changed F / K / X | Outcome (registered) | Build flags CR rule | Plan end | Calls | Wall s |
|---|---|---|---|---|---|---|---|---|---|---|
| r1 | 99.36 / 99.37 / 99.36 / 99.36 / 99.37 | 10 (0 / 10) | - | R-REPT-LASTACCT, R-REPT-LASTDUP | 491 / 0 / 5 | followed the change | yes | COMPLETED | 33 | 1637 |
| r2 | 99.36 / 99.37 / 99.36 / 99.36 / 99.37 | 10 (0 / 10) | - | R-REPT-LASTACCT, R-REPT-LASTDUP | 491 / 0 / 5 | followed the change | yes | COMPLETED (1 A18 retry) | 35 | 1442 |
| r3 | 99.36 / 99.37 / 99.36 / 99.36 / 99.37 | 10 (0 / 10) | - | R-REPT-LASTACCT, R-REPT-LASTDUP | 491 / 0 / 5 | followed the change | yes | COMPLETED | 34 | 916 |

The 5 X records differ from legacy on the flagged last-account handling.

### CR8 (CREASTMT, bundle yx3, rule R-STMT-FICO)

| Build | Business % base / c01 / c02 / c03 / c04 | Divergent (silent / flagged) | Rules silent | Rules flagged | Changed F / K / X | Outcome (registered) | Build flags CR rule | Plan end | Calls | Wall s |
|---|---|---|---|---|---|---|---|---|---|---|
| r1 | 0.00 × 5 | 498 (0 / 498) | - | R-STMT-ADDR, R-STMT-NAME, R-STMT-ABEND (c03) | 0 / 0 / 486 | other | yes | COMPLETED | 31 | 998 |
| r2 | 0.00 × 5 | 498 (0 / 498) | - | R-STMT-ADDR, R-STMT-NAME, R-STMT-TXN, R-STMT-ABEND (c03) | 0 / 0 / 486 | other | yes | COMPLETED | 42 | 1628 |
| r3 | 0.00 × 5 | 498 (0 / 498) | - | R-STMT-ADDR, R-STMT-ABEND (c03) | 0 / 0 / 486 | other | yes | PAUSED goal_at_risk at step 4 of 4 (2 A18 retries first; **harness defect D7**) | 37 | 1638 |

As CR6: every statement differs from legacy on address line 3 (all builds); r1–r2 also on the HTML name and address
lines (r2 also on HTML transaction text), all flagged. On the CR rule's own field the changed records follow the
change (post-hoc table below).

**CR8 r3's stop.** The plan built and committed the workflow (version 28d6678b), then paused at its last step
(`prove-statement-bands`, a behaviour check) with `missing.what = source`, naming "creastmt-sonnet-yx3.pdf pages 2 and
26–29": the check wanted expected outputs transcribed independently from those pages and said its evidence held the
implementation and the assumptions text, not the PDF layouts. It offered an alternative (revise the check to verify
the bands and zero expenditure without claiming layout verification). The step text cites the PDF by file name only.
The decision journal (read-only, metadata only, run by the user) shows both decide requests for that step (63,926 and
64,311 characters) carried no cited pages at all. The executor lacked material the planner had cited: harness defect
D7, the D4–D6 class. The score above stands (A2); the workflow scored is the one the build committed.

Wall s runs from the first to the last line of the build's `harness_log.txt`. Model calls are the harness's own count.

## H14h

Registered (A21, A23, A25): a rule is refuted for the harness if ≥ 2 of its 3 builds "kept legacy, silent". The overall
criterion is refuted if that happens on ≥ 2 of the six rules. Per A25, CR3 counts its A20 builds, CR4 and CR5 their A23
builds, CR6–CR8 their A25 builds; the overall criterion counts the six rules across three images.

| CR | Rule | Image | Builds scored | kept legacy, silent | kept legacy, flagged | followed the change | other | H14h on this rule |
|---|---|---|---|---|---|---|---|---|
| CR3 | R-INT-RATE | A20 | 3 of 3 | 0 | 0 | 3 | 0 | not refuted |
| CR4 | R-POST-104 | A23 | 3 of 3 | 0 | 0 | 1 | 2 | not refuted |
| CR5 | R-POST-102 | A23 | 3 of 3 | 0 | 0 | 3 | 0 | not refuted |
| CR6 | R-STMT-TOTAL | R13 (A25) | 3 of 3 | 0 | 0 | 0 | 3 | not refuted |
| CR7 | R-REPT-SET | R13 (A25) | 3 of 3 | 0 | 0 | 3 | 0 | not refuted |
| CR8 | R-STMT-FICO | R13 (A25) | 3 of 3 | 0 | 0 | 0 | 3 | not refuted |

**Overall: not refuted.** None of the 6 rules has ≥ 2 builds that kept legacy silently; across the 18 counted builds
none kept legacy silently on its rule's changed records. The count spans three images, as registered; nothing else is
pooled across images.

What "not refuted" does not say: CR6 and CR8 are "other" on every build because each changed record also differs from
legacy on a flagged field outside the CR rule (address line 3, and in CR8 r1–r2 more). The registered record-level
outcome does not show the CR rule followed for those two rules; the post-hoc per-field check does.

## Parity (stops and losses, A25 harness arm part 1)

| Build | First plan end | Stop type | Retry | Final plan | Scored | Lost |
|---|---|---|---|---|---|---|
| CR6 r1 | COMPLETED | - | - | COMPLETED | yes | no |
| CR6 r2 | FAILED | behaviour_failed (build's own check) | - | FAILED | yes (latest version; A2 re-extraction at WIP e7322864) | no |
| CR6 r3 | PAUSED → PAUSED | item_evidence ×2 (harness-attributed), then goal_at_risk (build's own stop) | A18, 2 | PAUSED | yes | no |
| CR7 r1 | COMPLETED | - | - | COMPLETED | yes | no |
| CR7 r2 | PAUSED | item_evidence (harness-attributed) | A18, 1 | COMPLETED | yes | no |
| CR7 r3 | COMPLETED | - | - | COMPLETED | yes | no |
| CR8 r1 | COMPLETED | - | - | COMPLETED | yes | no |
| CR8 r2 | COMPLETED | - | - | COMPLETED | yes | no |
| CR8 r3 | PAUSED → PAUSED | item_evidence ×2 (harness-attributed), then goal_at_risk, missing source (**harness defect D7**: no cited pages sent) | A18, 2 | PAUSED | yes (committed version 28d6678b) | no |

Tally: 9 built, 9 scored, 0 lost. Platform stops: none. Build's own stops: behaviour_failed ×1 (CR6 r2), goal_at_risk ×1
(CR6 r3). Harness defect: D7 ×1 (CR8 r3; A25 stopped after it). Not run: parts 2–4.

## Supplementary per-field check of the CR rule (post-hoc, never used for H14h)

Per changed record, only divergences tagged with the CR's rule id (`tools/a25_fieldcheck.py`).

| Build | Field-level F / K / X |
|---|---|
| CR6 r1–r3 | 243 / 0 / 0 each |
| CR7 r1–r3 | 496 / 0 / 0 each |
| CR8 r1–r3 | 486 / 0 / 0 each |

Per-build files: `<bundle id>/r<n>/` (`outcome.json`, `score/`, `score_v1/`, `flags.json`, `adapter/`, `exec/`),
pre-score rows in `runs/a25/PRESCORE.md`, flag specs in `flagspec/`, flags hashes in `FLAGS.sha256`, execution log
`exec.log`, chain log `chain.log`.
