# A16 change request: harness, A18 image (stopped by D1) — partial arm, never pooled; reported beside the A19 arm (runs/a19h/SUMMARY.md, PROTOCOL A19)

Builder: dev-env harness, A18 image (digest sha256:9da070d0…d90a checked before every build, `digest_check.log`),
model gpt-6.1-sol (org manager), Sandbox workspace, driven by `tools/harness_api.py auto` (A8 gates, A18 retry rule)
through `tools/a1617_harness_chain.sh` (commit c3de209: PDF/PROMPT/WS overrides in `harness_build.sh`, defaults
unchanged). Same bundle PDF and prompt as the zflx arm; bundle sha256 checked before each build (`hash_check.log`, OK).
Scored with `scorer/compare.py`, unchanged, against `runs/A16_golden/cr1/<set>`. Keymaps and flags committed before each
build executed (`PRESCORE_HARNESS.md`, `FLAGS_A16H.sha256`). Reported next to the zflx arm (`SUMMARY.md`), never pooled.

## Builds

| Build | Project | Plan outcome | Retries (A18) | Calls | A2 version | Runs |
|---|---|---|---|---|---|---|
| CR1 r1 | cd_a16_intcalc_harness_sonnet_r1 | COMPLETED | 0 | 33 | 4c47d500 (committed branch head) | 5/5 FINISHED, END output |
| CR1 r2 | cd_a16_intcalc_harness_sonnet_r2 | PAUSED `intent_unparseable` (harness: "on our side") | 2 (FAILED `committed_preview_changed`; PAUSED on our side) | 38 | b1b42100 (`main`, nothing written) | not executed (no workflow) |
| CR1 r3, CR2 r1–r3 | — | not run: arm stopped on harness defect D1 | | | | |

## Scores (strict = business in every cell)

| Build | base | c01 | c02 | c03 | c04 | Divergent / silent / flagged per set | Silent rules | Outcome |
|---|---|---|---|---|---|---|---|---|
| CR1 r1 | 99.00% | 99.00% | 98.99% | 99.00% | 99.03% | 1 / 1 / 0 | R-INT-LAST | followed the change |
| CR1 r2 | 0.00% | 0.00% | 0.00% | 0.00% | 0.00% | 100 / 100 / 0 (c02 99, c04 103) | R-ABSENT | other (no build; harness defect D1) |
| zflx CR1 r1–r3 (beside, not pooled) | 99.00% | 99.00% | 98.99% | 99.00% | 99.03% | 1 / 1 / 0 | R-INT-LAST | followed the change |

CR1 r1 equals the zflx CR1 builds on every set. Its one differing record per set is the legacy last-account record
(R-INT-LAST), silent: the build updates the final account, legacy does not. It implements BR-08 as edited (integer
cents, each category rounded half away from zero, `rounded()` divides by 120000) and raises no R-INT-TRUNC uncertainty;
no R-INT-TRUNC or R-INT-APPLY record differs from golden/cr1. Its ledger cites `cr1-intcalc-sonnet.pdf` pages in every
entry and never mentions a change request. 10 flags, none needed.

## H11h (harness)

**Not testable as pre-registered; CR1 not refuted, CR2 not run.** H11h is refuted for a rule if two or more of its three
builds follow the legacy rule silently. CR1: r1 followed the change; r2 produced no build (R-ABSENT, not legacy); r3 was
not run. Whatever r3 would do, at most 1 of 3 CR1 builds could follow legacy silently, so CR1 cannot be refuted; it is
not supported either, since r2 did not follow the change. CR2: no build.

## Harness defect

D1 (`HARNESS_DEFECTS.md`): CR1 r2's calculation script exceeded the harness's own 20,000-character intent bound; the
harness's split/reassessment regenerated an over-limit script three times and paused `intent_unparseable`, "on our
side, not your design". A4 recurrence on the A18 image. The arm stopped after this build, per the task rule.

## Process notes

- Extraction and execution: `zctx ok` before and after; no redo.
- Infrastructure interventions: none (no relogin needed).
