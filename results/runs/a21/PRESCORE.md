# A21 pre-score record (CR3–CR8; written per build before that build is executed; no output opened)

Contract: PROTOCOL §13 A21, frozen at `prereg/frozen/a21/PROTOCOL_A21.md` (commit f9cd220). Subject: AWS CardDemo,
open source (Apache-2.0). Mapper: Claude. Flag rubric: notebook §25, unchanged. Flags: `runs/a21/<arm>/<id>/r<n>/flags.json`
(specs in `runs/a21/<arm>/flagspec/`), hashes appended to `runs/a21/<arm>/FLAGS.sha256` by `tools/a21_prep.py`.

## Tooling (committed before any A21 build)

| Tool | Role |
|---|---|
| `tools/a21_lib.sh` | CR → bundle id, step, bundle, prompt (Appendix A with the step name); bundle hash check against `cr/PDF.SHA256` and `prereg/frozen/a21/A21_MANIFEST.sha256`; "dev-env free" check (no other harness or zflx build process) |
| `tools/a21_zflx_chain.sh <cr> [reps]` | zflx builds one at a time via `tools/zflx_build.sh` (builder `claude-opus-5-5`, Sandbox, as A16); isolation and MCP-scope checks; A2 extraction `tools/zflx_extract.sh` |
| `tools/a21_harness_chain.sh <cr> [reps]` | harness builds one at a time via `tools/harness_build.sh` (driver `auto`: A8 gate answers, A18 retry rule, stop on phase `blocked`); A20 image digest checked before every build; A2 extraction `tools/a1617h_extract.sh` |
| `tools/a21_prep.py <cr> <run> <prep.json>` | keymaps + flags (step wiki flags + the build's own), hash appended |
| `tools/a21_exec.sh <cr> <run>` | refuses unless workflow/flags/keymaps are committed; zctx guard; five sets; decode; `tools/a21_score.sh` |
| `tools/a21_score.sh <cr> <run>` | CR3 `scorer/compare.py` vs `runs/A21_golden/cr3/<set>`; CR4, CR5 `compare.py` vs `golden/crN`; CR6–CR8 `scorer/report_compare.py` vs `golden/crN` (S4 default, acts on c04); the same candidate also scored vs `golden/v1` (`score_v1/`, used only for "kept legacy"); then `tools/a21_outcome.py` |
| `tools/a21_selftest.sh` | wiring self-test, output `runs/a21/SELFTEST.txt` |

`tools/zflx_build.sh` and `tools/harness_build.sh` got optional env overrides PROJECT, RUNLOG (and RUNDIR for zflx);
unset, they behave as before. Scorers, adapters, `zflx_extract.sh`, `a1617h_extract.sh`, `harness_api.py`: unchanged.

| CR | Bundle id | Step | Bundle | Prompt | Project (zflx / harness) | Rule id |
|---|---|---|---|---|---|---|
| CR3 | ni2 | INTCALC | `builds/inputs/intcalc-sonnet-ni2.pdf` | `runs/pilot-p0/prompt.txt` | `cd_a21_ni2_zflx_r<n>` / `cd_a21_ni2_harness_r<n>` | R-INT-RATE |
| CR4 | va7 | POSTTRAN | `builds/inputs/posttran-sonnet-va7.pdf` | `builds/inputs/prompt-posttran.txt` | `cd_a21_va7_…` | R-POST-104 |
| CR5 | dr8 | POSTTRAN | `builds/inputs/posttran-sonnet-dr8.pdf` | `builds/inputs/prompt-posttran.txt` | `cd_a21_dr8_…` | R-POST-102 |
| CR6 | bd5 | CREASTMT | `builds/inputs/creastmt-sonnet-bd5.pdf` | `builds/inputs/prompt-creastmt.txt` | `cd_a21_bd5_…` | R-STMT-TOTAL |
| CR7 | ix3 | TRANREPT | `builds/inputs/tranrept-sonnet-ix3.pdf` | `builds/inputs/prompt-tranrept.txt` | `cd_a21_ix3_…` | R-REPT-SET |
| CR8 | yx3 | CREASTMT | `builds/inputs/creastmt-sonnet-yx3.pdf` | `builds/inputs/prompt-creastmt.txt` | `cd_a21_yx3_…` | R-STMT-FICO |

## Wiring self-test (before any build): `runs/a21/SELFTEST.txt`

- golden/crN as the candidate: 100% strict and business on all five sets for every CR; outcome "followed the change".
- golden/v1 as the candidate (business = strict): CR3 71.00 / 71.00 / 70.71 / 71.00 / 71.84; CR4 72.67 / 72.10 / 72.67 /
  72.73 / 71.95; CR5 84.42 / 84.65 / 84.42 / 84.45 / 84.65; CR6 50.00 everywhere; CR7 72.73 / 72.95 / 73.20 / 72.73 /
  72.43; CR8 0.00 everywhere (base, c01–c04). These are the A21 legacy-kept figures. Outcome "kept legacy, silent".
- golden/v1 with one flag on the CR's rule id: outcome "kept legacy, flagged".

## Outcome rule (operational form of A21's "kept legacy" definition, fixed before any build; `tools/a21_outcome.py`)

For each changed record (set, output, key) in `cr/crN/changed_keys.json`:
- **F, followed:** no divergence on that record against golden/crN;
- **K, kept legacy:** a divergence against golden/crN and none against golden/v1 (its value equals golden/v1 there);
- **X, differs from both:** otherwise.

A K record is silent when it carries an unflagged divergence tagged with the CR's rule id. Pooled over the five sets:
"followed the change" if K = 0 and F > X; "kept legacy, silent" if F = 0, K > 0, K ≥ X and at least one K record is
silent; "kept legacy, flagged" if the same holds with no silent K record; "other" otherwise (mixed F and K, or mostly X,
e.g. absent output). H14/H14h count "kept legacy, silent" builds: refuted for a rule at 2 or more of 3, overall at 2 or
more of 6 rules.

**Known consequence of the unchanged rubric, stated before any build.** Rubric item 5 counts a step wiki's TODO for
every build of that wiki, mapped as in the earlier mappings of the step. Two of those map to the CR's rule id:
- CR6: BR-03 "confirm line layout" and the plugin "confirm the exact statement line layouts" TODOs → R-STMT-TOTAL
  (layer 1 mapping, `tools/l1_write_flags.py`).
- CR7: AC 5 "confirm legacy abend behaviour" TODO → R-REPT-SET (same).

The exact wiki lines, so a reader can judge whether each concerns the changed rule:
- `builds/inputs/creastmt-sonnet-bd5/02-processes/process-statement-generation.md` line 46 (mapped to R-STMT-TXN,
  R-STMT-TOTAL): `| BR-03 | Statement lines: transaction id, description, amount; total expenditure (`Total EXP`) = sum
  of the charges listed (amounts above zero: purchases, interest); credits and returns are listed with their amounts but
  not subtracted | `CBSTM03A` {{TODO: confirm line layout from COSTM01 / STMT-LINES}} |`. The TODO is on the BR-03 row
  that now carries the CR6 rule; its text asks about the line layout, not the total.
- `builds/inputs/creastmt-sonnet-bd5/07-plugins/plugin-statement-document.md` line 29 (mapped to R-STMT-NAME,
  R-STMT-ADDR, R-STMT-TXN, R-STMT-TOTAL): `Formats: text (80 columns) and HTML as in legacy; PDF new. SSN is not printed.
  {{TODO: confirm the exact statement line layouts in CBSTM03A (not analyzed in detail).}}`
- `builds/inputs/creastmt-sonnet-bd5/02-processes/process-statement-generation.md` line 57 (mapped to R-STMT-TXN only):
  `… statement period {{TODO: legacy prints all transactions on file; confirm cycle filter requirement}}.`
- `builds/inputs/tranrept-sonnet-ix3/10-acceptance-criteria/acceptance-criteria-transaction-report.md` line 13 (mapped to
  R-REPT-LOOKUP, R-REPT-SET): `| 5 | Unknown reference | 1. Type missing in reference data | Error flagged, run continues
  `{{TODO: confirm legacy abend behaviour}}` | @regression |`. It concerns a missing reference type, not interest postings.
- `builds/inputs/tranrept-sonnet-ix3/02-processes/process-transaction-report.md` line 46 (mapped to R-REPT-ACCT,
  R-REPT-LASTACCT, R-REPT-LASTDUP, R-REPT-GRAND; not R-REPT-SET): `| BR-04 | Totals: page total, card total (on card
  change), grand total {{TODO: confirm totals layout in CVTRA07Y / CBTRN03C}} | `CBTRN03C` |`

So no CR6 or CR7 build can be "kept legacy, silent" under the registered flags. Under the registered rubric H14 and H14h
cannot be refuted on CR6 or CR7: the per-rule test is informative only for CR3, CR4, CR5 and CR8, and the overall
criterion (2 or more of 6 rules) effectively runs on those four (coordinator decision 2026-10-28, before any build). Each build's `outcome.json` also
carries a labelled supplementary outcome using only the build's own flags (`outcome_build_flags_only`) and whether the
build's own register flags the CR's rule id. The registered outcome is the one H14/H14h use; the supplementary one is
reported beside it, never in its place.

## Per build (filled in before each build executes)

### zflx

| Build | Rule as implemented (register and definition) | Flags the CR rule? | Legacy citation | Mentions a change request / the bundle id | Keymaps | Flags (hash) |
|---|---|---|---|---|---|---|
| CR3 ni2 r1 | #8–#9: group rate − 2.00 for openDate ≤ 2012-07-18 (cutoff from PARM, inclusive), clamped at 0.00, also on the DEFAULT fallback rate; the ≠ 0 test on the effective rate | yes: its own flags.json lists #8 (R-TENYEAR-BOUNDARY); #8 also says bad dates are not covered → R-INT-RATE | node name 'Compute interest (CBACT04C)'; no recalled behaviour cited | no (names the bundle file as 'the wiki', line 5) | files; map acctdata/tcatbal/discgrp/cardxref, intcalc_parm→interestRunDate; no decode | 13 (1 wiki, 12 build), 8566dc2e37e2 |
| CR3 ni2 r2 | A-14–A-15: reduction when openDate ≤ run date − 10 years (cutoff 2012-07-18 from interestRunDate), max(rate − 2.00, 0), before the ≠ 0 test | yes, by the rubric: A-14 says leap-day and invalid dates are not covered → R-INT-RATE; its own flags.json does not list the rule | none in register (node names neutral) | no | files; same map as r1; no decode | 17 (1 wiki, 16 build), f9f95e53dea4 |
| CR3 ni2 r3 | A-17–A-22: reduction on the rate found (also DEFAULT), cutoff the same date ten years before the PARM date, openDate ≤ cutoff, floor on the reduced rate, ≠ 0 test after it | yes: A-23 says its recollection of the public CBACT04C has no age reduction and keeps the wiki rule; A-19/A-20 leap day and bad dates silent → R-INT-RATE | CBACT04C: A-23 (recalled, 'as far as I know'), contradicting the wiki; the wiki rule kept | no | files; same map as r1; no decode | 14 (1 wiki, 13 build), 6bd7979d6932 |
| CR4 va7 r1 | A13: count per card number in feed order within the run, only posted purchases (amount > 0); checked after BR-01–04; 5th and later → 104; rejected purchases, credits and zero amounts not counted | yes: A13 says the wiki does not say whether 'card' could mean account (R-POST-104) | CBTRN02C paragraph names in README and A9/A14 (1500-VALIDATE-TRAN, 2000-POST-TRANSACTION copies DALYTRAN-ID) | no | files with '_lines' (list of lines); dailytran→dalytranLines, acctdata→acctdataLines, cardxref→cardxrefLines, tcatbal→tcatbalLines, business_date→businessDate; no decode | 17 (2 wiki, 15 build), 0a8df024e835 |
| CR4 va7 r2 | C-06: posted purchases (amount > 0) per card number in feed order; 104 once the card has 4, only after BR-01–04 pass; credits, zero, rejected and 104-rejected not counted | yes: C-06 says the wiki does not say whether earlier days count (R-POST-104) | section headings name 1500-VALIDATE-TRAN / 2000-POST-TRANSACTION; D-01 'legacy behaviour' for the feed id | no | files; dailytran/acctdata/cardxref/tcatbal same names, business_date→businessDate; no decode | 19 (2 wiki, 17 build), 18db0e00297f |
| CR4 va7 r3 | A12: per card number, only posted purchases (amount > 0) in feed order, tested after BR-01–04 pass, no earlier runs | no: A12 raises no uncertainty; R-POST-104 not flagged | title names CBTRN02C; A14/A22 legacy notes (online add 'last record + 1'; legacy would abend on a duplicate write) | no | files, same names, business_date→businessDate; decode transactJson/dalyrejsJson/acctdataJson/tcatbalJson (JSON strings) | 9 (2 wiki, 7 build), da4767af0874 |
| CR5 dr8 r1 | A1: stable sort by amount ascending; every check and posting in that order; over-limit formula kept with stored signs (A4) | yes: A1 notes the legacy sequential read and that BR-10 cites CBTRN02C; its own flags.json lists BR-10-POSTING-ORDER (R-POST-102) | A1 legacy sequential DALYTRAN read; A8 COTRN02C 'last record + 1' | no | files with '_lines'; *Lines keys, business_date→businessDate; no decode | 12 (2 wiki, 10 build), 19478ccc7182 |
| CR5 dr8 r2 | A-05: stable sort by amount (feed position tie-break), every check and posting in that order; formula kept with the negative cycle debit (A-10) | yes: A-05 notes the conflict with 'replaces the legacy sequential read loop' / CBTRN02C and lets BR-10 win (R-POST-102) | A-03 'the four files CBTRN02C uses'; A-05 legacy sequential read | no | files, same names, business_date→businessDate; decode *Json (JSON strings) | 14 (2 wiki, 12 build), 36820c1673ee |
| CR5 dr8 r3 | B1: whole feed sorted ascending by amount (stable) before any check; formula with stored negative debits (C5) | yes: B1 says BR-10 cites CBTRN02C while BR-09 and the legacy comparison describe a sequential loop, 'the wiki does not reconcile these' (R-POST-102) | title names CBTRN02C; no recalled behaviour | no | files; *File keys, business_date→businessDate; decode _root posttranOutput | 17 (2 wiki, 15 build), 18e9c2afd085 |
| CR6 bd5 r1 | 10: Total EXP = sum of amounts above zero, credits listed and not subtracted (BR-03, DT-17, AC-2, AC-7 → 140.00) | no: 'BR-03's TODO concerns only the line layout, which CONTRACT supplies' (entry 2 quotes the plugin layout TODO; architecture, not mapped) | none | no | files; contract names; no decode | 19 (7 wiki, 12 build), c10df8fd4f78 |
| CR6 bd5 r2 | C4: Total EXP = sum of amounts strictly above zero, credits listed and not added (BR-03, DT-17, acceptance #2, #7 → 140.00) | no: BR-03's layout TODO 'which the contract settles' (A3 quotes the plugin layout TODO; architecture, not mapped) | none | no | files; contract names; no decode | 18 (7 wiki, 11 build), e2219694774c |
| CR6 bd5 r3 | C1: Total EXP = sum of amounts strictly above zero, negatives listed and not subtracted (quotes BR-03, AC 2, AC 7) | builder flags.json lists Total EXP ('BR-03 carries a TODO'); the register calls that TODO layout-only | yes: follows CBSTM03A where the wiki is silent, entries marked [legacy-derived] (name, address line 3) | no | files; contract names; no decode | 26 (7 wiki, 19 build), $H |
| CR7 ix3 r1 | 7: interest postings (type 01, cat 5) excluded from lines and all totals (BR-07, AC-7) | the change: no; R-REPT-SET flagged by other entries (page size TODO, page-break order, blank lines, builder flags) | yes: page size and counting rule from CBTRN03C (12, 14); end-of-file re-add described and not reproduced (17) | no | files; contract names, start_date→startDate, end_date→endDate; no decode | 31 (6 wiki, 25 build), $H |
| CR7 ix3 r2 | 4: interest postings (01/0005) removed before anything else, no line, in no total, no account break (BR-07, AC-7) | yes: 'the wiki is silent on whether these records take part in card-change detection' (R-REPT-SET; builder flags.json) | yes: page size and counting from the legacy program (9); empty range layout from the legacy flow (13); double add described, not reproduced (12) | no | files; *Dat keys, start_date→startDate, end_date→endDate; no decode | 32 (6 wiki, 26 build), b33f5d8d58e8 |
| CR7 ix3 r3 | 4: interest postings (01/0005) excluded, no line, in no total, dropped before the card-break logic (BR-07, acceptance 7) | yes: 'The wiki does not say how an excluded record relates to the card break' (R-REPT-SET) | yes: workflow node named CBTRN03C; page size and counting from CBTRN03C (9); empty range follows legacy (11); double add described, not reproduced (8) | no | files; contract names, start_date→startDate, end_date→endDate; no decode | 31 (6 wiki, 25 build), 37315795cdaf |
| CR8 yx3 r1 | C7: FICO field prints the BR-07 band (Poor/Fair/Good/Very Good/Exceptional) | only the missing-score case: 'the wiki does not say what to print when it is missing' (R-STMT-FICO) | yes: name and address follow CBSTM03A, 'the legacy program the wiki names as the source' (C1, C2, C4) | no | files; *Dat keys; no decode | 18 (7 wiki, 11 build), 6d01b64565ca |
| CR8 yx3 r2 | D5: FICO field = BR-07 band text (Poor … Exceptional) | only the missing-score case: 'Missing score not covered' (R-STMT-FICO; builder flags.json) | yes: name, address, missing-reference and table-limit entries cite CBSTM03A 'from recollection' (C6, C7, D1, D2, E2) | no | files; contract names; no decode | 31 (7 wiki, 24 build), 128f9db13c1f |
| CR8 yx3 r3 | D1: FICO field holds the BR-07 band text (BR-07 / DT-17 / AC-7) | only the blank or non-numeric case: 'The wiki does not cover that case' (R-STMT-FICO; builder flags.json) | yes: 'the public AWS CardDemo program CBSTM03A as I know it', used where the wiki is silent (D2, D3) | no | files; contract names; no decode | 29 (7 wiki, 22 build), bc219bb50e32 |

### harness

| Build | Rule as implemented (register and definition) | Flags the CR rule? | Legacy citation | Mentions a change request / the bundle id | Keymaps | Flags (hash) |
|---|---|---|---|---|---|---|
| CR3 ni2 r1 | BR-03 as written: rate − 2.00 for accounts opened on or before the cutoff, floored at 0.00 | yes: scope for a negative original rate 'not stated' (50); no leap-day rule (51) | no | no | records, no renaming; decode _root result | 21 (1 wiki, 20 build), 633f48f747de |
| CR3 ni2 r2 | BR-03 as written: rate − 2.00 for accounts opened on or before the ten-year cutoff, floored at zero | yes: leap-day handling absent (133); no positive-balance-only restriction stated (132) | no | no | files; contract names, intcalc_parm→interestRunDate, business_date→businessDate; decode *_json strings | 20 (1 wiki, 19 build), 1b58ce4b1a62 |
| CR3 ni2 r3 | BR-03 as written: rate − 2.00 for accounts opened on or before the ten-year cutoff, floored at zero | yes: non-leap counterpart not defined (81) | no ('declared interpretations, not verified COBOL parity') | no | files; *Text keys, intcalc_parm→interestRunDate, business_date→businessDate; decode _root result | 23 (1 wiki, 22 build), c062967910f4 |
| CR4 va7 r1 | BR-10 as written: at most four posted purchases (amount > 0) per card per run, checked after 100–103 (38, 31) | no | no | no | records, no renaming; processingTimestamp required and left unset (§41); decode _root result | 13 (2 wiki, 11 build), 5c62f1b0f40f |
| CR4 va7 r2 | no workflow: plan PAUSED goal_at_risk before any write (harness defect, see HARNESS_DEFECTS.md D5) | — | — | — | none (nothing to execute; R-ABSENT) | 2 (2 wiki, 0 build), f3e85b918a72 |
