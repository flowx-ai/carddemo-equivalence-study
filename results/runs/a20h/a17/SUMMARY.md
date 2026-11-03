# A17 wiki ablation: harness on the A20 image (PROTOCOL A20, A22): 12 builds, five sets each

Builder: dev-env harness, A20 image `local-7efcc95ef-1793176993` (digest sha256:f4cd0b26…7eb3, checked before every
build, unchanged: `digest_check.log`), model gpt-6.1-sol (org manager), driven by `tools/harness_api.py auto` (A8 gates,
A18 retry rule, driver change 81513d0 kept) through `tools/a1617_harness_chain.sh`. Ledgerline workspace, projects
`ll_a20h_accrue_harness_<arm>_r<n>`, arms interleaved per rep (detailed, summary, no wiki, code). Bundles, prompts and
frozen hashes as the zflx arm (`hash_check.log`, all OK). A2 latest version by `tools/a1617h_latest.py`. Keymaps,
flags (`FLAGS.sha256`) and the recall record (`PRESCORE.md`) committed before each execution. Executed with the d1
rate file (VARIANT=d1) and scored with `scorer/compare.py`, unchanged, against `runs/A5_golden/<set>/`. One build or
execution on dev-env at a time; the remaining seven builds ran after the zflx CR3–CR8 arm finished (A22 order).
Reported next to zflx (`runs/a17/SUMMARY.md`) and next to "A19 image (stopped by D2)" (`runs/a19h/SUMMARY.md`);
never pooled.

**Status:** complete, 12 of 12 builds scored. Two builds ended without a workflow on harness defects and are scored
R-ABSENT as A2 requires: summary r2's first attempt (D3, retried under A22; the retry is the build's score) and code
r3 (D4, no retry applies). Records: `runs/a20h/HARNESS_DEFECTS.md`.

## Builds

| Build | Plan | A18 retries | Gates (A2/A8 answers) | Calls | A2 version | Runs |
|---|---|---|---|---|---|---|
| detailed r1 | COMPLETED | 0 | no question; brief approved | 37 | 97292fb0 (branch head) | 5/5 (files) |
| summary r1 | COMPLETED | 0 | no question; brief approved | 24 | c15525b6 (branch head) | 5/5 (files) |
| no wiki r1 | COMPLETED | 1 | 1 ask_user (recommended); brief approved | 33 | cd0716cf (branch head) | 5/5 (files) |
| code r1 | COMPLETED | 1 | 1 ask_user (recommended); brief approved | 36 | 352f1ad3 (branch head) | 5/5 (files) |
| detailed r2 | COMPLETED | 1 | 2 ask_user (recommended), 1 with no recommendation (first option); brief approved | 45 | 11f11a4d (branch head) | 5/5 (records) |
| summary r2 | attempt 1: turn `lease_expired` (D3), not scored; A22 retry (same project, new session): COMPLETED | 1 (retry) | 3 ask_user (recommended); brief approved | 1 + 42 | 01a2137e (branch head) | 5/5 (files) |
| no wiki r2 | COMPLETED | 0 | 1 ask_user (recommended); brief approved | 24 | 8701ed1b (branch head) | 5/5 (files) |
| code r2 | COMPLETED | 0 | 1 ask_user (recommended); brief approved | 22 | 95f651f0 (branch head) | 5/5 (files) |
| detailed r3 | COMPLETED | 1 | 1 ask_user (recommended); brief approved | 28 | 0ce4b3c5 (branch head) | 5/5 (files) |
| summary r3 | COMPLETED | 1 | 1 ask_user (recommended); brief approved | 41 | a1695a7c (branch head) | 5/5 (files) |
| no wiki r3 | COMPLETED | 0 | 1 ask_user (recommended); brief approved | 22 | 4dbe0542 (branch head) | 5/5 (files) |
| code r3 | PAUSED `goal_at_risk` (D4) | 0 (not platform-attributed) | 2 ask_user (recommended); brief approved | 36 | 8db3fea6 (main WIP, no workflow) | not executed (R-ABSENT) |

Every A18 retry was a FAILED `committed_preview_changed` and succeeded first time. No planning refusal (D2 did not
recur). No relogin, no other intervention.

## Scores: business (strict) per set

| Build | base | c01 | c02 | c03 | c04 | Silent / flagged records per set | Divergent rules |
|---|---|---|---|---|---|---|---|
| detailed r1 | 99.00 | 99.00 | 98.99 | 99.00 | 99.03 | 1 / 0 | R-INT-LAST, silent |
| detailed r2 | 99.00 (49.00) | 99.00 (49.00) | 98.99 (49.49) | 99.00 (49.00) | 99.03 (47.57) | 0 / 1 | R-INT-LAST, flagged; strict only: midnight timestamps |
| detailed r3 | 99.00 | 99.00 | 98.99 | 99.00 | 99.03 | 1 / 0 | R-INT-LAST, silent |
| summary r1 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 50 / 49–53 | status `failed`, empty lists (note 1) |
| summary r2 | 49.00 | 49.00 | 49.49 | 49.00 | 47.57 | 1 / 49–53 | R-INT-TXID flagged; R-INT-LAST silent |
| summary r3 | 49.00 | 49.00 | 49.49 | 49.00 | 47.57 | 1 / 49–53 | as r2 |
| no wiki r1 | 1.00 | 1.00 | 1.01 | 1.00 | 0.97 | 0 / 98–102 | R-INT-RATE, R-INT-APPLY, R-INT-CYC (+ R-INT-TXFORMAT on c02), all flagged |
| no wiki r2 | 1.00 | 1.00 | 1.01 | 1.00 | 0.97 | 0 / 98–102 | as r1 |
| no wiki r3 | 1.00 | 1.00 | 1.01 | 1.00 | 0.97 | 0 / 98–102 | as r1 |
| code r1 | 100.00 | 100.00 | 100.00 | 100.00 | 100.00 | 0 / 0 | none (reproduces the last-account behaviour from the code) |
| code r2 | 100.00 | 100.00 | 100.00 | 100.00 | 100.00 | 0 / 0 | as r1 |
| code r3 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 99–103 / 0 | R-ABSENT (D4) |

Notes.
1. *Summary r1* requires all nine contract input contents as strings, the five chain files it never reads included,
   and fails before calculating when any is missing. The adapter passes only its canonical set, as in every earlier run
   (notebook line 321); recorded in PRESCORE before execution.
2. *Summary r2 and r3* number transactions from 1 (16 digits) because the summary wiki gives no identifier rule; both
   flag it. The identifier is a business field, so every transaction record differs from legacy, flagged. Each also
   flushes the final account at end of file without flagging it (R-INT-LAST silent).
3. *No wiki, all three builds:* none substitutes a rate when the account's group has none (each flags it), so the d1
   data gives no interest; accounts are returned unchanged. None names CardDemo. No wiki r2 sets `type_cd '01'`, the
   legacy interest type, while its register says the bundle gives no type (a possible recall signal, recorded before
   execution; it can touch only the one c02 transaction, whose difference is flagged).
4. *Instrument fix, our side:* `tools/run_build.py` decodes the END output from its opening brace (a Markdown fence
   inside a build log had cut the old regex); identical on all earlier A20 run logs (A22 discloses it).

## Recall signature (before execution; `tools/a17_recall_grep.sh`)

No build names CardDemo or a legacy program. `DEFAULT` appears once per build as the workflow type. The only
undisguised legacy constant is no wiki r2's `type_cd '01'` (note 3). Detailed and code use the disguised values their
bundles give (`Batch`, `Accrued int`, `STANDARD`, `LXB002C`); summary and no wiki invent their own.

## Verdicts (harness, A20, per builder, not pooled)

Arm medians of business equivalence. Primary figure: the median over the 3 builds of each build's mean over the
5 sets. Per set: the median over the 3 builds on that set.

| Arm | Median (mean over sets) | base | c01 | c02 | c03 | c04 | Range of build means | zflx median |
|---|---|---|---|---|---|---|---|---|
| detailed | 99.004 | 99.00 | 99.00 | 98.99 | 99.00 | 99.03 | 99.004–99.004 | 99.004 |
| summary | 48.812 | 49.00 | 49.00 | 49.49 | 49.00 | 47.57 | 0.000–48.812 | 99.004 |
| no wiki | 0.996 | 1.00 | 1.00 | 1.01 | 1.00 | 0.97 | 0.996–0.996 | 2.396 |
| code | 100.000 | 100.00 | 100.00 | 100.00 | 100.00 | 100.00 | 0.000–100.000 | 100.000 |

- **H12 (detailed no more than 1 point below code): supported, at the margin.** Code minus detailed is 0.996 points
  on the mean over sets; per set 1.00 / 1.00 / 1.01 / 1.00 / 0.97, so c02 alone is 0.01 over the limit. As for zflx, the
  whole gap is the one last-account record (R-INT-LAST): silent in detailed r1 and r3, flagged in r2. The code builds
  reproduce the legacy behaviour from the source. The code median rests on r1 and r2; r3 is R-ABSENT (D4).
- **H13 (detailed more than 1 point above summary): supported.** 99.004 − 48.812 = 50.2 points; per set 50.00 / 50.00 /
  49.50 / 50.00 / 51.46. The gap is the transaction identifier: the summary wiki gives no rule and both scorable
  summary builds number from 1, flagged (note 2). Summary r1 adds a 0 for a reason outside the wiki's content (note 1),
  which the median does not use. This differs from zflx, where the summary builds filled the same gap from recall
  and H13 was not supported.
- **Instrument check (no wiki more than 5 points below detailed): passes.** 99.004 − 0.996 = 98.0 points, on every set
  97.98–98.06. Unlike the zflx no-wiki builds, these name no CardDemo program and recall no fallback; the gap measures
  the wiki against a builder that invents its own rules and flags them.

## Beside the other harness runs (never pooled)

- **A19 image (stopped by D2):** A17 detailed r1 = 0.00% on all five sets (R-ABSENT, planning refused
  `unsupported_capability`). On A20 the three detailed builds score 99.00–99.03%.
- **A16 on the A19 image** stands as reported in `runs/a19h/SUMMARY.md` (not rerun, per A20).
- **A18 image (stopped by D1):** no A17 harness build was run (`runs/a17/SUMMARY_HARNESS.md`).
