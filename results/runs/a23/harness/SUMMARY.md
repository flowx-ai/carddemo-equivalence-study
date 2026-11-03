# A23 harness arm: CR4–CR8 on the A23 image — STOPPED after 8 of 15 builds (harness defect D6)

Harness (model gpt-6.1-sol, `org_manager`) on dev-env, Sandbox workspace, A23 image digest 1eff15db…0003 (R12)
checked before every build (`digest_check.log`), bundle hashes OK (`hash_check.log`). Driver `auto` with the A8 gate
answers, the A18 and A22 retry rules and the A23 stream-read fix; A2 latest-version scoring. Builds ran 2026-10-29,
11:45–18:03 UTC, one at a time, via `tools/a23_harness_chain.sh`. Subject: AWS CardDemo, open source (Apache-2.0).

- **Built and scored:** CR4 r1–r3, CR5 r1–r3, CR6 r1–r2 (8 builds).
- **Stopped** at CR6 r2 on harness defect D6 (`HARNESS_DEFECTS.md`; user-approved classification). The plan paused
  `goal_at_risk` at step 1 because the executor did not have p.28 of the attached PDF, which the planner had read. No
  workflow was written.
- **Not run (arm stopped at D6):** CR6 r3, CR7 r1–r3, CR8 r1–r3 (7 builds). They are not estimated.
- **Retries:**
  - A18, one each on CR4 r1, r2 and r3 (`committed_preview_changed` on the first commit, a platform code). r1 and r2
    then completed. r3 then paused `goal_at_risk`, the build's own stop.
  - A22: none.
- **Interventions** (`runs/a21/interventions.log`):
  - `relogin all` at 11:46Z, before any session existed (CR4 r1);
  - `relogin all` at 18:03Z, after CR6 r2 had ended, before its A2 extraction;
  - two operator pauses (12:54–14:30Z and 16:42–17:44Z), between builds;
  - concurrent non-study demo UI activity, 11:13–12:40Z, logged with start and end.
  No harness stop fell in a concurrent-activity window.
- **Disclosures:**
  - CR5 r2 executed with the opt-in `_named` adapter key (notebook §73). It was a byte-identity check, a pure
    restructuring.
  - CR4 r3's START requires a `batchId` the contract does not carry. It was left unset (§41), so every set returns a
    configuration error and R-ABSENT.
- **CR3** stands from the A20 image (`runs/a21/harness/`, 3 of 3). **CR4 r1–r2 on the A20 image** are a separate
  partial result, "A20 image (stopped by D5)", never pooled.

## Per-CR results

Strict and business are equal on every A23 build below.

### CR4 (POSTTRAN, bundle va7, rule R-POST-104)

| Build | Business % base / c01 / c02 / c03 / c04 | Divergent (silent / flagged) | Rules silent | Rules flagged | Changed F / K / X | Outcome (registered) | Build flags CR rule | Plan end | Calls | Wall s |
|---|---|---|---|---|---|---|---|---|---|---|
| r1 | 100.00 / 100.00 / 100.00 / 100.00 / 99.12 | 4 (0 / 4) | - | R-POST-104, R-POST-BAL, R-POST-TCAT | 667 / 3 / 1 | other | yes | COMPLETED (1 A18 retry) | 46 | 1822 |
| r2 | 32.55 / 32.85 / 32.55 / 32.65 / 32.65 | 2298 (0 / 2298) | - | R-POST-WRITE | 671 / 0 / 0 | followed the change | no | COMPLETED (1 A18 retry) | 37 | 1809 |
| r3 | 0.00 / 0.00 / 0.00 / 0.00 / 0.00 | 2263 (2263 / 0) | R-ABSENT | - | 170 / 168 / 333 | other | no | PAUSED goal_at_risk (1 A18 retry) | 56 | 2612 |

r1 "other": 3 changed records keep legacy, each with a flagged R-POST-104 divergence (c04), and 1 record differs from both
(X). r2 differs from legacy on transaction-record writing (R-POST-WRITE, flagged), and not on the CR rule. r3: unset
`batchId` (§41), so no output.

### CR5 (POSTTRAN, bundle dr8, rule R-POST-102)

| Build | Business % base / c01 / c02 / c03 / c04 | Divergent (silent / flagged) | Rules silent | Rules flagged | Changed F / K / X | Outcome (registered) | Build flags CR rule | Plan end | Calls | Wall s |
|---|---|---|---|---|---|---|---|---|---|---|
| r1 | 100.00 × 5 | 0 | - | - | 370 / 0 / 0 | followed the change | yes | COMPLETED | 31 | 899 |
| r2 | 100.00 × 5 | 0 | - | - | 370 / 0 / 0 | followed the change | no | COMPLETED | 29 | 1094 |
| r3 | 100.00 × 5 | 0 | - | - | 370 / 0 / 0 | followed the change | no | COMPLETED | 39 | 1154 |

### CR6 (CREASTMT, bundle bd5, rule R-STMT-TOTAL)

| Build | Business % base / c01 / c02 / c03 / c04 | Divergent (silent / flagged) | Rules silent | Rules flagged | Changed F / K / X | Outcome (registered) | Build flags CR rule | Plan end | Calls | Wall s |
|---|---|---|---|---|---|---|---|---|---|---|
| r1 | 0.00 × 5 | 488 (488 / 0) | R-ABSENT | - | 0 / 0 / 243 | other | no | PAUSED goal_at_risk, step 1 of 2 (build's own stop, A18) | 36 | 1016 |
| r2 | 0.00 × 5 | 488 (488 / 0) | R-ABSENT | - | 0 / 0 / 243 | other | no | PAUSED goal_at_risk, step 1 of 2 (**harness defect D6**) | 33 | 1089 |
| r3 | not run (arm stopped at D6) | | | | | | | | | |

- r1: the step required banners 82 characters wide against the 80-character line. The planner added two spaces; the
  bundle's banners are exactly 80.
- r2: the executor lacked p.28 of the attached PDF (D6).
- Neither has a workflow. Both are scored with absent outputs.

### CR7 (TRANREPT, bundle ix3, rule R-REPT-SET) and CR8 (CREASTMT, bundle yx3, rule R-STMT-FICO)

Not run (arm stopped at D6): 0 of 3 builds each.

Wall s runs from the first to the last line of the build's `harness_log.txt`. Model calls are the harness's own count.

## H14h

Registered (A21, A23): a rule is refuted for the harness if ≥ 2 of its 3 builds "kept legacy, silent". The overall
criterion is refuted if that happens on ≥ 2 of the six rules. Per A23, CR3 counts its A20 builds and CR4–CR8 their A23
builds; the overall criterion counts the six rules across the two images.

| CR | Rule | Image | Builds scored | kept legacy, silent | kept legacy, flagged | followed the change | other | H14h on this rule |
|---|---|---|---|---|---|---|---|---|
| CR3 | R-INT-RATE | A20 | 3 of 3 | 0 | 0 | 3 | 0 | not refuted |
| CR4 | R-POST-104 | A23 | 3 of 3 | 0 | 0 | 1 | 2 | not refuted |
| CR5 | R-POST-102 | A23 | 3 of 3 | 0 | 0 | 3 | 0 | not refuted |
| CR6 | R-STMT-TOTAL | A23 | 2 of 3 | 0 | 0 | 0 | 2 | not refuted. Even if r3 kept legacy silently it would be 1 of 3; no CR6 build produced output, so whether the harness follows this rule is untested |
| CR7 | R-REPT-SET | A23 | 0 of 3 | | | | | not tested (not run) |
| CR8 | R-STMT-FICO | A23 | 0 of 3 | | | | | not tested (not run) |

**Overall:** not decidable as registered.
- Three rules are tested and not refuted (CR3, CR4, CR5). CR6 cannot be refuted. CR7 and CR8 are untested.
- If both untested rules were refuted, the count would reach the registered threshold of 2. So neither "refuted" nor
  "not refuted" can be claimed for the overall criterion.
- What can be said: across the 11 harness CR builds scored (3 on A20, 8 on A23), none kept legacy silently on its
  rule's changed records.
- Of the 8 A23 builds, 4 followed the change (CR4 r2, CR5 r1–r3). 4 are "other": CR4 r1 differs from legacy on 1
  changed record and keeps it on 3 with a flag; CR4 r3, CR6 r1 and CR6 r2 have no output.
- The two images are never pooled except in this rule count, as A23 states.

## Parity (stops and losses, A23 harness arm)

| Build | First plan end | Stop type | Retry | Final plan | Scored | Lost |
|---|---|---|---|---|---|---|
| CR4 r1 | FAILED | committed_preview_changed (platform) | A18, 1 | COMPLETED | yes | no |
| CR4 r2 | FAILED | committed_preview_changed (platform) | A18, 1 | COMPLETED | yes | no |
| CR4 r3 | FAILED → PAUSED | committed_preview_changed, then goal_at_risk (build's own stop) | A18, 1 | PAUSED | yes (latest version) | no |
| CR5 r1 | COMPLETED | - | - | COMPLETED | yes | no |
| CR5 r2 | COMPLETED | - | - | COMPLETED | yes | no |
| CR5 r3 | COMPLETED | - | - | COMPLETED | yes | no |
| CR6 r1 | PAUSED | goal_at_risk (build's own stop: banner width inside the step) | - | PAUSED | yes (no workflow, 0%) | no |
| CR6 r2 | PAUSED | goal_at_risk (harness defect D6: executor without p.28) | - | PAUSED | yes (no workflow, 0%) | no |
| CR6 r3, CR7 r1–r3, CR8 r1–r3 | — | not run (arm stopped at D6) | | | no | — |

Tally: 8 built, 8 scored, 0 lost. Platform stops: `committed_preview_changed` ×3, all retried once under A18 (two
recovered to COMPLETED). Build's own stops: `goal_at_risk` ×2 (CR4 r3, CR6 r1). Harness defect: D6 ×1 (CR6 r2, arm
stopped). Not run: 7.

## Supplementary per-field check of the CR rule (post-hoc, never used for H14h)

Per changed record, only divergences tagged with the CR's rule id (as the A21 SUMMARYs).

| Build | Field-level F / K / X |
|---|---|
| CR4 r1 | 669 / 2 / 0 |
| CR4 r2 | 671 / 0 / 0 |
| CR4 r3 | n/a (no output; every divergence is R-ABSENT) |
| CR5 r1–r3 | 370 / 0 / 0 each |
| CR6 r1, r2 | n/a (no output) |

Per-build files: `<bundle id>/r<n>/` (`outcome.json`, `score/`, `score_v1/`, `flags.json`, `adapter/`, `exec/`),
pre-score rows in `runs/a23/PRESCORE.md`, flags hashes in `FLAGS.sha256`, execution log `exec.log`.
