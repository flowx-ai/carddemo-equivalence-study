# Harness on the A19 image (PROTOCOL A19): A16 change request and A17 ablation — stopped by defect D2

Builder: dev-env harness, A19 image `local-2cd4ec072-1793149068` (digest sha256:8deba674…8f16, checked before every
build: `a16/digest_check.log`, `a17/digest_check.log`), model gpt-6.1-sol (org manager), driven by `tools/harness_api.py
auto` (A8 gates, A18 retry rule) through `tools/a1617_harness_chain.sh` (8c4112b). Bundles, prompts and frozen hashes as
the zflx arm (`hash_check.log`, all OK). A2 latest version by `tools/a1617h_latest.py`. Keymaps and flags committed
before each execution (`a16/PRESCORE.md`, `a17/PRESCORE.md`, `FLAGS.sha256`); scored with `scorer/compare.py`, unchanged,
via `tools/a1617_exec.sh`. Reported next to zflx (`runs/a16/SUMMARY.md`, `runs/a17/SUMMARY.md`) and next to the partial
arm "harness, A18 image (stopped by D1)" (`runs/a16/SUMMARY_HARNESS.md`); never pooled.

**Status:** A16 complete (6/6). A17 stopped after detailed r1 on harness defect D2 (`HARNESS_DEFECTS.md`); 11 A17 builds
and all of A18(a) not run.

## A16 builds

| Build | Project | Plan | A18 retries | Calls | A2 version | Runs |
|---|---|---|---|---|---|---|
| CR1 r1 | cd_a19h_intcalc_harness_sonnet_r1 | COMPLETED | 1 (FAILED committed_preview_changed) | 40 | ceecec1c (branch head) | 5/5 FINISHED |
| CR1 r2 | cd_a19h_intcalc_harness_sonnet_r2 | COMPLETED | 1 (committed_preview_changed) | 41 | b8a3d3c1 (branch head) | 5/5 FINISHED |
| CR1 r3 | cd_a19h_intcalc_harness_sonnet_r3 | COMPLETED | 1 (committed_preview_changed) | 29 | 816b5977 (branch head) | 5/5 FINISHED |
| CR2 r1 | cd_a19h_posttran_harness_sonnet_r1 | COMPLETED | 2 (PAUSED decide_timeout, harness side) | 68 | 13dc18cb (branch head) | 5/5 FINISHED |
| CR2 r2 | cd_a19h_posttran_harness_sonnet_r2 | COMPLETED | 1 (committed_preview_changed) | 40 | 3daa162a (branch head) | 5/5 FINISHED |
| CR2 r3 | cd_a19h_posttran_harness_sonnet_r3 | COMPLETED | 0 | 45 | 2facb880 (branch head) | 5/5 FINISHED |

## A16 scores (strict = business in every cell)

| Build | base | c01 | c02 | c03 | c04 | Divergent / silent / flagged (base) | Silent rules | Outcome |
|---|---|---|---|---|---|---|---|---|
| CR1 r1 | 99.00 | 99.00 | 98.99 | 99.00 | 99.03 | 1 / 1 / 0 | R-INT-LAST | followed the change |
| CR1 r2 | 99.00 | 99.00 | 98.99 | 99.00 | 99.03 | 1 / 1 / 0 | R-INT-LAST | followed the change |
| CR1 r3 | 99.00 | 99.00 | 98.99 | 99.00 | 99.03 | 1 / 0 / 1 | — (R-INT-LAST flagged) | followed the change |
| CR2 r1 | 2.67 | 3.28 | 2.67 | 2.88 | 2.63 | 438 / 24 / 414 | R-POST-102 (24–25 missing rejects) | other: rule changed in code, no postings (caller timestamp required, unset) |
| CR2 r2 | 100.00 | 100.00 | 100.00 | 100.00 | 100.00 | 0 / 0 / 0 | — | followed the change |
| CR2 r3 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 450 / 185 / 265 | R-POST-102, R-POST-TCAT, R-PASSTHRU (empty lists) | other: rule changed in code, empty output (caller timestamp and start id required, unset) |
| zflx CR1 r1–r3 (beside) | 99.00 | 99.00 | 98.99 | 99.00 | 99.03 | 1 / 1 / 0 | R-INT-LAST | followed the change |
| zflx CR2 r1–r3 (beside) | 100 | 100 | 100 | 100 | 100 | 0 | — | followed the change |
| harness A18 image CR1 r1 / r2 (beside) | 99.00 / 0 | 99.00 / 0 | 98.99 / 0 | 99.00 / 0 | 99.03 / 0 | — | R-INT-LAST / R-ABSENT | followed / other (D1) |

- **CR1:** all three implement BR-08 as edited (each category rounded to the cent, halves away from zero, exact integer
  arithmetic) and raise no R-INT-TRUNC doubt; no R-INT-TRUNC or R-INT-APPLY record differs from golden/cr1. The one
  differing record per set is the last account (R-INT-LAST): r1 and r2 silent, r3 flags it ("end-of-input flush not
  described"). Identical to zflx CR1 on every set.
- **CR2:** all three implement `credit − debit + amount > 1.10 × limit` (integer, strict >) and let expiry overwrite 102;
  none flags the tolerance. r2 takes the processing timestamp as optional and matches golden/cr2 on every record. r1
  requires a caller `processingTimestamp`, r3 also a `nextTransactionId`; the adapter is a pure renaming and passes
  neither (as every POSTTRAN execution, notebook §41), so r1 posts nothing (289 records stop on its own check; its 11
  rejects are the 102s that do not need prior postings) and r3 returns four empty lists. Checked on request: the
  requests carry the four inputs under the definitions' keys, and the END outputs carry the builds' own errors — no
  decoder or map miss (`a16/exec.log`). The silent R-POST-102 records are golden/cr2 rejects these builds never reach,
  not the legacy rule.
- No register mentions a change request; all cite the `cr1-`/`cr2-` bundle file as the wiki source.

## H11h (harness, A19 image; never pooled with zflx)

- **CR1: supported.** 3/3 follow the changed rule with no R-INT-TRUNC divergence against golden/cr1; 0/3 silent legacy.
- **CR2: not refuted; the per-build criterion holds for 1 of 3.** No build follows the legacy rule (0/3 silent legacy;
  every definition holds ×1.10). r2 meets the criterion fully. r1 and r3 carry silent R-POST-102 records against golden/cr2,
  caused by missing postings/outputs (required caller parameters the adapter cannot supply), not by the legacy rule.
  Read strictly ("no silent R-POST-102 divergence"), H11h is supported for CR2 by r2 only.

## A17 (stopped after 1 of 12 builds)

| Build | Project | Outcome | Scores (all sets) |
|---|---|---|---|
| detailed r1 | ll_a19h_accrue_harness_detailed_r1 | planning failed `unsupported_capability` after its approved brief (D2), nothing written | 0% business and strict, silent R-ABSENT |
| summary/nowiki/code r1, all r2–r3 | — | not run (arm stopped on D2) | — |

**H12, H13, instrument check (harness): untested** (one build, no arm complete).

## Interventions

- 2026-10-28T08:01:23Z `relogin all` after AUTH_UNAUTHORIZED at the end of A17 detailed r1 (nothing in flight).
- Driver gap disclosed in D2: `auto` does not stop on phase `blocked`; it polled ~2.7 h until the logins expired. No
  effect on any build outcome.
