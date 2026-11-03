# POSTTRAN (step 2 of §7): scores (2026-10-26)

Amendment A11 was committed before any POSTTRAN build. For each build, the scored flags were committed before its outputs were opened (`tools/posttran_write_flags.py`, hashes in `runs/FLAGS_POSTTRAN.sha256`). This run did not timestamp them. Each row covers 5 sets (base, c01–c04) and four outputs (`posttran_transact`, `posttran_dalyrejs`, `posttran_acctdata`, `posttran_tcatbal`). Business and strict equivalence are equal in every cell, because reason texts never decide a match. The metric is **equivalence with the legacy outputs, not correctness**: a divergence "differs from legacy", and the column says whether the build flagged it or was silent.

| Builder | Wiki | Run | Business = strict (5 sets) | Divergent records, base (silent / flagged) | Divergent rules |
|---|---|---|---|---|---|
| zflx | Sonnet | r1 | **100%** | 0 | none |
| zflx | Sonnet | r2 | **100%** | 0 | none |
| zflx | Sonnet | r3 | **100%** | 0 | none |
| zflx | Opus | r1 | **100%** | 0 | none (legacy rules recalled, §41) |
| zflx | Opus | r2 | 84.7–87.4% | 0 / 60 | R-POST-102, -103, -BAL, -PRECEDENCE, -TCAT, all flagged |
| zflx | Opus | r3 | 85.7–87.4% | 0 / 60 | R-POST-102, -BAL, -TCAT, all flagged |
| harness | Sonnet | r1 | 0% | 450 / 0 | R-ABSENT, silent: stops on "group_id has invalid length 0" |
| harness | Sonnet | r2 | **100%** | 0 | none |
| harness | Sonnet | r3 | 0% | 450 / 0 | R-ABSENT, silent: "Integer overflow" (card numbers above 2^53) |
| harness | Opus | r1 | 72.4–74.5% | 0 / 121 | R-POST-100..103, -7, -BAL, -TCAT, all flagged |
| harness | Opus | r2 | 0% | 450 / 0 | R-ABSENT: plan FAILED, restart deadlock, no workflow saved (HARNESS_ISSUES A9) |
| harness | Opus | r3 | 72.4–74.5% | 0 / 121 | same rules as r1, all flagged |

Per-set detail: `python3 tools/posttran_table.py zflx` and `… harness`. The lowest set is always c01, which adds expired-card and overlimit cases.

## What the numbers say

- **Sonnet wiki:** every Sonnet build that returned records matches legacy exactly (zflx r1–r3, harness r2). The Sonnet wiki states every posting rule. The harness Sonnet builds that score 0 (r1, r3) never posted anything: they stop on validation of fields the step does not need. One rejects a blank `group_id`. The other parses card numbers as JavaScript numbers.
- **Opus wiki:** the Opus wiki gives a credit rule that differs from legacy (`amount > creditLimit − currentBalance`, plus active-status checks), and it leaves the reject codes as a TODO. Builds that follow its text differ from legacy on about 12 postings per set, and they flag every one of those differences. The harness Opus builds also use reason codes of their own and the opposite sign for cycle totals; both are flagged, and they asked no question about either (HARNESS_ISSUES B5).
- **No silent divergence in any build that returned records.** The only silent outcomes are R-ABSENT: three harness builds returned nothing on any set.

## Caveats

- **Recall confound (§25, §41):** all three zflx Opus builds cite CBTRN02C from memory. Opus r1 chose the recalled legacy rules over the wiki and reaches 100%. Like INTCALC Opus r1, it cannot be credited to the wiki. The harness builds were not checked for recall.
- **Flag granularity (§6):** flags are matched by rule. A build that lists R-POST-102 as uncertain therefore has all of its 102 divergences counted as flagged, however many records that is.
- **Superseded executions (§42):** the first executions of harness Sonnet r1 and r2 ran with an adapter that dropped the blank `proc_ts` field. They are kept in `superseded_proc_ts/` and are not reported. Both builds were re-executed with the corrected adapter. File mode (all zflx builds) was never affected.
- **Infra (§42):** the zflx project context is shared across sessions. It moved once during an execution, and the two affected sets were retried once.
- **Adapter changes after A11:** opt-in card records (harness Opus r3, committed with its flags before execution) and per-key dotted paths in the decoder. Both are pure renamings, and the selftest stays at 100% strict on all five sets.
