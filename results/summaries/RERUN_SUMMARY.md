# A15 re-run arm: summary

**Exploratory. The re-run results are never pooled with the scored arms (A8, A11).** Each harness build of the
scored arm was re-built once on the fixed image `harness:local-eb96f3cbe-1793050303` (digest sha256:08e4428b…),
using the same driver, prompts, wiki bundles, adapters and pre-registered scorers. Builder model gpt-6.1-sol in every
build, scored and re-run: "Sonnet" and "Opus" name the wiki the build was given, not the builder. A2 latest-version
rule; infrastructure retries only. Flags were mapped from each build's own ledger and committed with a hash before
execution (`runs/rerun/FLAGS_RERUN.sha256`). Methods log: LAB_NOTEBOOK §52. Per-step tables:
`runs/rerun/{intcalc,posttran,creastmt,tranrept}_scores.md`.

**Incomplete: TRANREPT was stopped early by user decision** after its first build (Sonnet r1), so that the fixed
harness could be deployed to dev-env. TRANREPT has 1 of 6 re-run builds. Sonnet r2–r3 and Opus r1–r3 were not run.

Cells are strict / business equivalence, and for the layer-2 steps the two are equal. "Silent" means at least one
divergent record that no flag covers.

## INTCALC (scored A8 vs re-run A15)

| Build | Scored | Re-run |
|---|---|---|
| Sonnet r1 | 0% (R-ABSENT) | **0% (R-ABSENT, decoder as first scored)**; **99.00–99.03% (POST-HOC decoder correction)**, silent R-INT-LAST |
| Sonnet r2 | R-ABSENT (no workflow) | 99.00–99.03%, silent R-INT-LAST |
| Sonnet r3 | 0% (R-ABSENT) | 0% (R-ABSENT; dotted-key loss inside the build, A16) |
| Opus r1 | 0% (R-ABSENT) | 0.97–1.00%, silent R-INT-APPLY; flagged R-INT-CYC, R-INT-RATE |
| Opus r2 | 0% (R-ABSENT) | 0.97–1.01%, silent R-INT-APPLY; flagged R-INT-CYC, R-INT-RATE, R-INT-TXFORMAT |
| Opus r3 | 0% (R-ABSENT) | 0.97–1.01%, silent R-INT-APPLY; flagged R-INT-CYC, R-INT-RATE, R-INT-TXFORMAT |

## POSTTRAN (scored A11 vs re-run A15)

| Build | Scored | Re-run |
|---|---|---|
| Sonnet r1 | 0% (R-ABSENT) | 0% (R-ABSENT; AI-node failure, A17) |
| Sonnet r2 | 100% | 100% |
| Sonnet r3 | 0% (R-ABSENT) | 100% |
| Opus r1 | 72.38–74.53%, all flagged | 72.38–74.53%, all flagged |
| Opus r2 | 0% (R-ABSENT) | 72.38–74.53%, all flagged |
| Opus r3 | 72.38–74.53%, all flagged | 0% (empty lists, A16), no silent rule |

## CREASTMT (layer 1, scored A11 vs re-run A15)

| Build | Scored | Re-run |
|---|---|---|
| Sonnet r1 | 0%, all flagged; c03 absent | **0% (R-ABSENT, no keymap as first scored)**; **0%, all flagged (POST-HOC `_root` keymap)** |
| Sonnet r2 | absent | absent (no workflow: END refuses the key `assumptions.md`, A16) |
| Sonnet r3 | 0%, all flagged; c03 absent | 0%, all flagged (keymap written during its runs, before decode) |
| Opus r1 | absent | 0% / 48–52.0%, all flagged |
| Opus r2 | 0%, all flagged; c03 absent | 0% / 43–46%, all flagged |
| Opus r3 | absent | absent (no workflow: decide_budget_exhausted, A13) |

Strict stays 0% for every CREASTMT build because the layout lines differ from legacy (text line match 0.80 for
Sonnet builds, 0.14 for Opus builds).

## TRANREPT (layer 1, scored A11 vs re-run A15; stopped early, 1 of 6)

| Build | Scored | Re-run |
|---|---|---|
| Sonnet r1 | 98.65–98.91% / 99.17–99.19%, 3 flagged units | 98.92–99.18% / 99.45–99.46%, 2 flagged units (LASTDUP, LASTACCT) |
| Sonnet r2–r3, Opus r1–r3 | see `runs/layer1/tranrept_harness_scores.md` | **not run** (stopped early by user decision) |

## What changed between the arms

- **More builds produce scorable output.** Builds that were absent in the scored arm and produced output in the
  re-run: INTCALC 5 (Sonnet r1 only after the post-hoc decoder correction), POSTTRAN 2, CREASTMT 1. Builds that had output
  in the scored arm and none in the re-run: POSTTRAN Opus r3 (A16) and CREASTMT Sonnet r1 as first scored (keymap omitted, my fault).
- **Silent divergence:** in the re-run, silent divergences appear only in INTCALC. R-INT-LAST affects the Sonnet builds and
  R-INT-APPLY the Opus builds. In POSTTRAN, CREASTMT and TRANREPT every re-run divergence is flagged.
- **Still failing on the A15 image** (HARNESS_ISSUES): A15 (NUL byte in plan JSON; 6 builds paused: INTCALC Sonnet r1, r2; POSTTRAN Opus r2; CREASTMT Sonnet r1, r3, Opus r2), A16 (dotted output
  keys nested by scripts and refused by the END; 2 builds lost their output (INTCALC Sonnet r3, POSTTRAN Opus r3), 1 needed the post-hoc decoder (INTCALC Sonnet r1), 1 committed nothing (CREASTMT Sonnet r2)), A17 (AI-node
  failure reported only as a roll-up), A13 recurrence (`decide_timeout` then budget exhausted, CREASTMT Opus r3).
  The image deployed after this arm was not tested here.

## Disclosures

- Post-hoc corrections, each reported beside the first score: the INTCALC decoder `get()` (literal, then dotted key)
  for Sonnet r1, and the CREASTMT Sonnet r1 `_root` keymap. Every other decoder and map change was committed before
  its step executed. Sonnet r3's CREASTMT keymap was written while its runs were in flight, before its decode.
- Infrastructure interventions: logins refreshed between calls (INTCALC start; after the CREASTMT chain), one
  INTCALC retry after another session switched the shared zflx context, and the context guard (`zctx_check.sh`).
  A guard false positive on POSTTRAN Sonnet r1 was scored on its first attempt; the redo is kept.
- A2 picks: where `l1_latest.sh` fell back to the pre-implementation `main` snapshot, the branch head was taken
  instead. The discarded picks are kept.
