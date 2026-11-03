# A21 harness arm: CR3–CR8 on the A20 image — STOPPED after 5 of 18 builds (harness defect D5)

Harness (model gpt-6.1-sol, `org_manager`) on dev-env, Sandbox workspace, A20 image digest f4cd0b26…7eb3 checked before
every build (`digest_check.log`), bundle hashes OK (`hash_check.log`). Driver `auto` with the A8 gate answers, A18 and
A22 retry rules (A22 wiring committed in 8bcf601 before the first build), A2 latest-version scoring. Started after
`runs/a20h/a17/A22_DONE`, 2026-10-28 16:49–20:51 UTC. Subject: AWS CardDemo, open source (Apache-2.0).

- Built: CR3 r1–r3, CR4 r1–r2. **Stopped** at CR4 r2 on harness defect D5 (`HARNESS_DEFECTS.md`): plan PAUSED
  `goal_at_risk` before its first step, executor without the source the planner read, no workflow. Not run: CR4 r3,
  CR5–CR8 (13 builds).
- Retries: none (no A22 retryable stop, no A18 case).
- Interventions (`runs/a21/interventions.log`): (1) `relogin all` after the fxc token expired during CR4 r1 (the
  driver stopped on a state read after the brief approve; same session driven on, plan was READY and ran normally);
  (2) CR4 r2's brief-approve call never returned although the server ended the turn at 18:19:09Z; the hung client was
  stopped at 20:50Z and the same session driven on. 2 h 31 min passed before implementation (disclosed in D5).
- Keymaps and flags written from each build's workflow definition before any output was opened, committed before
  execution (`FLAGS.sha256`, `flagspec/`, PRESCORE rows). CR3 r1 and CR4 r1 take decoded records (MODE records, the
  adapter's own names, no renaming); CR3 r2 and r3 take file text (files maps).
- CR4 r1 requires a `processingTimestamp` run value the contract does not carry; left unset as in every POSTTRAN
  execution (notebook §41), so every postable row ends as a record error (287 on base) and nothing is posted.

## Per-CR results

### CR3 (INTCALC, bundle ni2, rule R-INT-RATE)

| Build | Business % base / c01 / c02 / c03 / c04 | Divergent records (silent / flagged) | Rules silent | Rules flagged | Changed records F / K / X | Outcome (registered) | Build flags only (supplementary) | Build flags the CR rule | Model calls | Wall s | Tokens |
|---|---|---|---|---|---|---|---|---|---|---|---|
| r1 | 99.00 / 99.00 / 98.99 / 99.00 / 99.03 | 5 (5 / 0) | R-INT-LAST | - | 145 / 0 / 0 | followed the change | followed the change | yes | 27 | 948 | 1488193 in / 34367 out |
| r2 | 99.00 / 99.00 / 98.99 / 99.00 / 99.03 | 5 (5 / 0) | R-INT-LAST | - | 145 / 0 / 0 | followed the change | followed the change | yes | 46 | 997 | 2175462 in / 37498 out |
| r3 | 99.00 / 99.00 / 98.99 / 99.00 / 99.03 | 5 (5 / 0) | R-INT-LAST | - | 145 / 0 / 0 | followed the change | followed the change | yes | 28 | 1122 | 1488574 in / 33971 out |

### CR4 (POSTTRAN, bundle va7, rule R-POST-104)

| Build | Business % base / c01 / c02 / c03 / c04 | Divergent records (silent / flagged) | Rules silent | Rules flagged | Changed records F / K / X | Outcome (registered) | Build flags only (supplementary) | Build flags the CR rule | Model calls | Wall s | Tokens |
|---|---|---|---|---|---|---|---|---|---|---|---|
| r1 | 3.11 / 3.72 / 3.11 / 3.33 / 3.08 | 2189 (294 / 1895) | R-POST-102, R-POST-104 | R-POST-BAL, R-POST-TCAT, R-POST-WRITE | 170 / 168 / 333 | other | other | no | 27 | 706 | 1566853 in / 23664 out |
| r2 | 0.00 / 0.00 / 0.00 / 0.00 / 0.00 | 2263 (2263 / 0) | R-ABSENT | - | 170 / 168 / 333 | other | other | no | 32 | 9998 | 1472713 in / 30501 out |
| r3 | not built | | | | | | | | | | |

Wall s is from the first to the last line of the build's `harness_log.txt` (CR4 r2 includes the 2 h 31 min client hang).

## H14h

Registered: a rule refutes at ≥ 2/3 builds "kept legacy, silent"; overall at ≥ 2/6 rules.

| CR | Rule | Builds scored | kept legacy, silent | kept legacy, flagged | followed the change | other | H14h on this rule |
|---|---|---|---|---|---|---|---|
| CR3 | R-INT-RATE | 3 | 0 | 0 | 3 | 0 | not refuted |
| CR4 | R-POST-104 | 2 of 3 | 0 | 0 | 0 | 2 | cannot reach 2/3 (r3 not run) |
| CR5–CR8 | | 0 | | | | | not tested (arm stopped) |

Overall: H14h is not testable as registered (one rule tested out of six). Descriptively, no harness build kept legacy.
Both CR4 outcomes are "other" for reasons outside the change rule: r1 posts nothing (unset run value, §41), r2 has no
workflow (D5).

## Supplementary per-field check of the CR rule (post-hoc, never used for H14h)

As in the zflx SUMMARY: per changed record, only divergences tagged with the CR's rule id.

| Build | Field-level F / K / X |
|---|---|
| CR3 r1 | 145 / 0 / 0 |
| CR3 r2 | 145 / 0 / 0 |
| CR3 r3 | 145 / 0 / 0 |
| CR4 r1 | 502 / 169 / 0 |
| CR4 r2 | 671 / 0 / 0 |

CR4 r2's field-level F is not meaningful: with no output every divergence is tagged R-ABSENT, not R-POST-104.
