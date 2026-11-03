# A21 zflx arm: CR3–CR8 × r1–r3 (18 builds)

Builder `claude-opus-5-5` via zflx on dev-env, Sandbox workspace, 2026-10-28, first build started 10:52 UTC, last build finished 13:17 UTC. Contract: PROTOCOL.md §13
A21 (frozen `prereg/frozen/a21`), A22 for the order. Subject: AWS CardDemo, open source (Apache-2.0).

- Every build: bundle hash checked against `cr/PDF.SHA256` and `A21_MANIFEST.sha256` (all ok, `hash_check.log`); no
  other build on dev-env before starting; isolation and MCP scope checks passed; A2 extraction found the latest version
  equal to the session version (WIP) on all 18.
- Keymaps and flags written from each build's register before any output was opened and committed before execution;
  hashes in `FLAGS.sha256`, specs in `flagspec/`, one PRESCORE row per build (`runs/a21/PRESCORE.md`).
- Execution: 5/5 sets FINISHED on all 18 builds, zflx context unchanged before and after, no redo.
- Scoring: CR3 against `runs/A21_golden/cr3`, CR4/CR5 against `golden/crN` (`scorer/compare.py`), CR6–CR8 against
  `golden/crN` (`scorer/report_compare.py`, S4); every candidate also against `golden/v1` for "kept legacy".
- Infrastructure interventions: none (no relogin; `runs/a21/interventions.log` has the header only).
- Adapter: CR4 r1 and CR5 r1 use the opt-in `_lines` key (the build's START takes lists of lines), committed before
  execution, accepted by the coordinator as inside A2 (notebook §64).

## Per-CR results

### CR3 (INTCALC, bundle ni2, rule R-INT-RATE)

| Build | Business % base / c01 / c02 / c03 / c04 | Divergent records (silent / flagged) | Rules silent | Rules flagged | Changed records F / K / X | Outcome (registered) | Build flags only (supplementary) | Build flags the CR rule | Turns | Wall s | USD |
|---|---|---|---|---|---|---|---|---|---|---|---|
| r1 | 99.00 / 99.00 / 98.99 / 99.00 / 99.03 | 5 (0 / 5) | - | R-INT-LAST | 145 / 0 / 0 | followed the change | followed the change | yes | 35 | 413 | 4.39 |
| r2 | 99.00 / 99.00 / 98.99 / 99.00 / 99.03 | 5 (5 / 0) | R-INT-LAST | - | 145 / 0 / 0 | followed the change | followed the change | yes | 26 | 286 | 2.24 |
| r3 | 99.00 / 99.00 / 98.99 / 99.00 / 99.03 | 5 (5 / 0) | R-INT-LAST | - | 145 / 0 / 0 | followed the change | followed the change | yes | 30 | 319 | 2.56 |

### CR4 (POSTTRAN, bundle va7, rule R-POST-104)

| Build | Business % base / c01 / c02 / c03 / c04 | Divergent records (silent / flagged) | Rules silent | Rules flagged | Changed records F / K / X | Outcome (registered) | Build flags only (supplementary) | Build flags the CR rule | Turns | Wall s | USD |
|---|---|---|---|---|---|---|---|---|---|---|---|
| r1 | 100.00 / 100.00 / 100.00 / 100.00 / 100.00 | 0 (0 / 0) | - | - | 671 / 0 / 0 | followed the change | followed the change | yes | 31 | 382 | 3.08 |
| r2 | 100.00 / 100.00 / 100.00 / 100.00 / 100.00 | 0 (0 / 0) | - | - | 671 / 0 / 0 | followed the change | followed the change | yes | 36 | 390 | 3.14 |
| r3 | 100.00 / 100.00 / 100.00 / 100.00 / 100.00 | 0 (0 / 0) | - | - | 671 / 0 / 0 | followed the change | followed the change | no | 35 | 399 | 3.03 |

### CR5 (POSTTRAN, bundle dr8, rule R-POST-102)

| Build | Business % base / c01 / c02 / c03 / c04 | Divergent records (silent / flagged) | Rules silent | Rules flagged | Changed records F / K / X | Outcome (registered) | Build flags only (supplementary) | Build flags the CR rule | Turns | Wall s | USD |
|---|---|---|---|---|---|---|---|---|---|---|---|
| r1 | 100.00 / 100.00 / 100.00 / 100.00 / 100.00 | 0 (0 / 0) | - | - | 370 / 0 / 0 | followed the change | followed the change | yes | 30 | 435 | 3.37 |
| r2 | 100.00 / 100.00 / 100.00 / 100.00 / 100.00 | 0 (0 / 0) | - | - | 370 / 0 / 0 | followed the change | followed the change | yes | 41 | 476 | 3.64 |
| r3 | 100.00 / 100.00 / 100.00 / 100.00 / 100.00 | 0 (0 / 0) | - | - | 370 / 0 / 0 | followed the change | followed the change | yes | 39 | 424 | 3.15 |

### CR6 (CREASTMT, bundle bd5, rule R-STMT-TOTAL)

| Build | Business % base / c01 / c02 / c03 / c04 | Divergent records (silent / flagged) | Rules silent | Rules flagged | Changed records F / K / X | Outcome (registered) | Build flags only (supplementary) | Build flags the CR rule | Turns | Wall s | USD |
|---|---|---|---|---|---|---|---|---|---|---|---|
| r1 | 0.00 / 0.00 / 0.00 / 0.00 / 0.00 | 500 (0 / 500) | - | R-STMT-ABEND, R-STMT-ADDR | 0 / 0 / 243 | other | other | yes | 31 | 369 | 2.79 |
| r2 | 0.00 / 0.00 / 0.00 / 0.00 / 0.00 | 498 (0 / 498) | - | R-STMT-ABEND, R-STMT-ADDR | 0 / 0 / 243 | other | other | yes | 33 | 340 | 3.04 |
| r3 | 100.00 / 100.00 / 100.00 / 88.00 / 100.00 | 12 (0 / 12) | - | R-STMT-ABEND | 243 / 0 / 0 | followed the change | followed the change | yes | 42 | 527 | 3.92 |

### CR7 (TRANREPT, bundle ix3, rule R-REPT-SET)

| Build | Business % base / c01 / c02 / c03 / c04 | Divergent records (silent / flagged) | Rules silent | Rules flagged | Changed records F / K / X | Outcome (registered) | Build flags only (supplementary) | Build flags the CR rule | Turns | Wall s | USD |
|---|---|---|---|---|---|---|---|---|---|---|---|
| r1 | 99.68 / 99.68 / 99.68 / 99.68 / 99.68 | 5 (0 / 5) | - | R-REPT-LASTDUP | 491 / 0 / 5 | followed the change | followed the change | yes | 33 | 387 | 3.04 |
| r2 | 99.68 / 99.68 / 99.68 / 99.68 / 99.68 | 5 (0 / 5) | - | R-REPT-LASTDUP | 491 / 0 / 5 | followed the change | followed the change | yes | 31 | 369 | 2.87 |
| r3 | 99.68 / 99.68 / 99.68 / 99.68 / 99.68 | 5 (0 / 5) | - | R-REPT-LASTDUP | 491 / 0 / 5 | followed the change | followed the change | yes | 25 | 357 | 2.72 |

### CR8 (CREASTMT, bundle yx3, rule R-STMT-FICO)

| Build | Business % base / c01 / c02 / c03 / c04 | Divergent records (silent / flagged) | Rules silent | Rules flagged | Changed records F / K / X | Outcome (registered) | Build flags only (supplementary) | Build flags the CR rule | Turns | Wall s | USD |
|---|---|---|---|---|---|---|---|---|---|---|---|
| r1 | 100.00 / 100.00 / 100.00 / 88.00 / 100.00 | 12 (0 / 12) | - | R-STMT-ABEND | 486 / 0 / 0 | followed the change | followed the change | yes | 28 | 380 | 2.92 |
| r2 | 100.00 / 100.00 / 100.00 / 88.00 / 100.00 | 12 (0 / 12) | - | R-STMT-ABEND | 486 / 0 / 0 | followed the change | followed the change | yes | 33 | 443 | 3.19 |
| r3 | 100.00 / 100.00 / 100.00 / 88.00 / 100.00 | 12 (0 / 12) | - | R-STMT-ABEND | 486 / 0 / 0 | followed the change | followed the change | yes | 44 | 558 | 3.91 |

### H14 (registered: a rule refutes at >= 2/3 builds "kept legacy, silent"; overall at >= 2/6 rules)

| CR | Rule | kept legacy, silent | kept legacy, flagged | followed the change | other | H14 on this rule |
|---|---|---|---|---|---|---|
| CR3 | R-INT-RATE | 0/3 | 0/3 | 3/3 | 0/3 | not refuted |
| CR4 | R-POST-104 | 0/3 | 0/3 | 3/3 | 0/3 | not refuted |
| CR5 | R-POST-102 | 0/3 | 0/3 | 3/3 | 0/3 | not refuted |
| CR6 | R-STMT-TOTAL | 0/3 | 0/3 | 1/3 | 2/3 | not refuted |
| CR7 | R-REPT-SET | 0/3 | 0/3 | 3/3 | 0/3 | not refuted |
| CR8 | R-STMT-FICO | 0/3 | 0/3 | 3/3 | 0/3 | not refuted |

Overall: 0/6 rules refuted, so H14 is not refuted.

### Supplementary per-field check of the CR rule (post-hoc, never used for H14)

For each changed record, only divergences tagged with the CR's rule id are looked at: F = no such divergence against golden/crN; K = one against crN and none against golden/v1; X = one against both.

| Build | Field-level F / K / X |
|---|---|
| CR3 r1 | 145 / 0 / 0 |
| CR3 r2 | 145 / 0 / 0 |
| CR3 r3 | 145 / 0 / 0 |
| CR4 r1 | 671 / 0 / 0 |
| CR4 r2 | 671 / 0 / 0 |
| CR4 r3 | 671 / 0 / 0 |
| CR5 r1 | 370 / 0 / 0 |
| CR5 r2 | 370 / 0 / 0 |
| CR5 r3 | 370 / 0 / 0 |
| CR6 r1 | 243 / 0 / 0 |
| CR6 r2 | 243 / 0 / 0 |
| CR6 r3 | 243 / 0 / 0 |
| CR7 r1 | 496 / 0 / 0 |
| CR7 r2 | 496 / 0 / 0 |
| CR7 r3 | 496 / 0 / 0 |
| CR8 r1 | 486 / 0 / 0 |
| CR8 r2 | 486 / 0 / 0 |
| CR8 r3 | 486 / 0 / 0 |

Totals: 18 builds, 603 turns, 120.9 builder minutes, USD 57.00.

## Notes (facts)

- **H14 under the registered rubric** is informative only for CR3, CR4, CR5 and CR8: the CR6 and CR7 wikis carry a TODO
  the rubric maps to the CR rule id, so any "kept legacy" build there would count as flagged (notebook §64). No build
  kept legacy in any CR, so this does not change the result.
- **Record-level outcome rule (post-hoc observation).** The registered outcome classifies a changed record as a whole.
  It cannot separate the CR field from an unrelated divergence on the same record. CR6 r1 and r2 follow the total change
  on every changed record (R-STMT-TOTAL equals cr6 on all 243, differs from v1 on all 243), but every statement also
  differs from cr6 on address line 3 (country code not printed, flagged by both builds: r1 entry 12, r2 C8). Each changed
  record is therefore X and the build is "other". This was found when CR6 r1 was scored, after the A21 stamp, so the
  per-field check above is post-hoc and supplementary; the registered outcome stands and is the one used for H14.
- **CR7 X = 5** on every build: the grand-total record (one per set) differs from cr7 by the legacy end-of-file re-add
  of the last amount, which all three builds describe and decline to reproduce (flagged, R-REPT-LASTDUP), and it
  differs from v1 too (v1 totals include the interest postings).
- **CR3:** five records per build differ from cr3 on the last account (R-INT-LAST); r1 flags it, r2 and r3 are silent.
  The rate change itself (R-INT-RATE) is followed on all 145 changed records.
- **c03 88% on CR6 r3 and CR8 r1–r3:** the 12 statements c03's missing references would abend in legacy (R-STMT-ABEND),
  flagged by each build (skipped cards, wiki silent).
- **Legacy recall** (register text): CR3 r3 cites a recalled CBACT04C detail; CR6 r3 and CR8 r1–r3 follow CBSTM03A for
  name and address where the wiki is silent (CR8 r2 says "recollection"); CR7 r1–r3 take the page size and counting from
  CBTRN03C. No register mentions a change request, a marker or the bundle id.
