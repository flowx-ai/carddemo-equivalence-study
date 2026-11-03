# A17 wiki ablation: zflx arm (12 builds, five sets each)

Builder: zflx (FlowX MCP Designer 0.12.0) driven by a headless Claude Code 2.1.312 session, model `claude-opus-5-5`,
Ledgerline workspace (prefix `ll`, run dirs under the neutral parent `~/Dev/_tests/ll-builds/a17`), procedure A2–A4
as A5/A7. Arms interleaved per rep: detailed, summary, no wiki, code. Prompts: `disguise/d1/prompt.txt` (detailed) and
`disguise/d1/ablation/{summary,nowiki,code}/prompt.txt`. Bundle sha256 checked against the frozen hash before each
build (`runs/a17/hash_check.log`, all OK). Decode maps, keymaps, flags (`runs/a17/FLAGS_A17.sha256`) and the recall
pre-score record (`runs/a17/PRESCORE.md`) committed before any output was opened. Executed with the d1 rate file
(VARIANT=d1) and scored with `scorer/compare.py`, unchanged, against `runs/A5_golden/<set>/`. One build or execution
on dev-env at a time. No retries, no redo, no relogin, no interventions.

## Builds

| Arm | Rep | Project | Turns | USD | A2 version (latest = session version) | Runs |
|---|---|---|---|---|---|---|
| detailed | r1 | ll_a17_accrue_zflx_detailed_r1 | 29 | 2.66 | WIP 5ca1d53b (only version) | 5/5 FINISHED |
| summary | r1 | ll_a17_accrue_zflx_summary_r1 | 27 | 1.94 | WIP bda86fbb (only version) | 5/5 FINISHED |
| no wiki | r1 | ll_a17_accrue_zflx_nowiki_r1 | 20 | 1.56 | WIP f16463cb (only version) | 5/5 FINISHED |
| code | r1 | ll_a17_accrue_zflx_code_r1 | 27 | 2.62 | WIP e1301d04 (only version) | 5/5 FINISHED |
| detailed | r2 | ll_a17_accrue_zflx_detailed_r2 | 30 | 2.47 | WIP 978f2ba2 (only version) | 5/5 FINISHED |
| summary | r2 | ll_a17_accrue_zflx_summary_r2 | 33 | 2.12 | WIP b77c6f4f (only version) | 5/5 FINISHED |
| no wiki | r2 | ll_a17_accrue_zflx_nowiki_r2 | 34 | 2.56 | WIP 787cd179 (only version) | 5/5 FINISHED |
| code | r2 | ll_a17_accrue_zflx_code_r2 | 39 | 3.11 | WIP f9be9d35 (only version) | 5/5 FINISHED |
| detailed | r3 | ll_a17_accrue_zflx_detailed_r3 | 31 | 2.79 | WIP 603a2763 (only version) | 5/5 FINISHED |
| summary | r3 | ll_a17_accrue_zflx_summary_r3 | 24 | 1.87 | WIP c69bb0b7 (only version) | 5/5 FINISHED |
| no wiki | r3 | ll_a17_accrue_zflx_nowiki_r3 | 22 | 1.81 | WIP 90d46889 (only version) | 5/5 FINISHED |
| code | r3 | ll_a17_accrue_zflx_code_r3 | 33 | 3.29 | WIP d67001cd (only version) | 5/5 FINISHED |

## Scores: business (strict) per set

| Build | base | c01 | c02 | c03 | c04 | Silent / flagged records per set | Divergent rules |
|---|---|---|---|---|---|---|---|
| detailed r1 | 99.00 | 99.00 | 98.99 | 99.00 | 99.03 | 0 / 1 | R-INT-LAST, flagged |
| detailed r2 | 99.00 | 99.00 | 98.99 | 99.00 | 99.03 | 1 / 0 | R-INT-LAST, silent |
| detailed r3 | 99.00 | 99.00 | 98.99 | 99.00 | 99.03 | 0 / 1 | R-INT-LAST, flagged |
| summary r1 | 99.00 (49.00) | 99.00 (49.00) | 98.99 (49.49) | 99.00 (49.00) | 99.03 (47.57) | 0 / 1 | R-INT-LAST flagged; strict only: R-INT-TXFORMAT |
| summary r2 | 99.00 (49.00) | 99.00 (49.00) | 98.99 (49.49) | 99.00 (49.00) | 99.03 (47.57) | 0 / 1 | as r1 |
| summary r3 | 2.00 (1.00) | 2.00 (1.00) | 3.03 (2.02) | 2.00 (1.00) | 1.94 (0.97) | 0 / 95–101 | R-INT-RATE, R-INT-APPLY, R-INT-LAST, all flagged |
| no wiki r1 | 1.00 | 1.00 | 3.03 | 1.00 | 0.97 | 0 / 96–102 | R-INT-APPLY, R-INT-RATE, R-INT-LAST (+ R-INT-TXFORMAT on c02), all flagged |
| no wiki r2 | 2.00 | 2.00 | 4.04 | 2.00 | 1.94 | 0 / 95–101 | all flagged |
| no wiki r3 | 2.00 | 2.00 | 4.04 | 2.00 | 1.94 | 0 / 95–101 | all flagged |
| code r1 | 100.00 | 100.00 | 100.00 | 100.00 | 100.00 | 0 / 0 | none (reproduces the last-account behaviour from the code, unflagged) |
| code r2 | 100.00 | 100.00 | 100.00 | 100.00 | 100.00 | 0 / 0 | as r1 |
| code r3 | 100.00 | 100.00 | 100.00 | 100.00 | 100.00 | 0 / 0 | as r1 |

Strict equals business except in the summary arm. There, r1 and r2 differ from legacy in strict only, on the
transaction source and description text (R-INT-TXFORMAT): the bundle gives no constant, and the builds fill in
values recalled from CardDemo. Summary r3 divides by `12000n` where it needs `120000n` (workflow definition lines
262–263), so its interest is 10× legacy (e.g. 18.77 against 187.71). Its own register states the formula correctly.
Every differing record is flagged.

## Recall signature (`tools/a17_recall_grep.sh`, recorded before execution)

- **No wiki, all three builds:** each names CardDemo/CBACT04C. Each uses the recalled DEFAULT rate fallback, which
  gives no systran output, so candidates show 0 transactions. Each uses the recalled 01 / 5 / `System` /
  `Int. for a/c` constants. None of this is in the bundle.
- **Summary:** recalled source and description in all three builds. r3 cites CardDemo twice.
- **Detailed and code:** no CardDemo identifiers in the workflow definition.

## Verdicts (zflx, per builder, not pooled)

Arm medians of business equivalence. Primary figure: the median over the 3 builds of each build's mean over the
5 sets. Per set: the median over the 3 builds on that set.

| Arm | Median (mean over sets) | base | c01 | c02 | c03 | c04 | Range of build means |
|---|---|---|---|---|---|---|---|
| detailed | 99.004 | 99.00 | 99.00 | 98.99 | 99.00 | 99.03 | 99.004–99.004 |
| summary | 99.004 | 99.00 | 99.00 | 98.99 | 99.00 | 99.03 | 2.194–99.004 |
| no wiki | 2.396 | 2.00 | 2.00 | 4.04 | 2.00 | 1.94 | 1.400–2.396 |
| code | 100.000 | 100.00 | 100.00 | 100.00 | 100.00 | 100.00 | 100.000–100.000 |

- **H12 (detailed no more than 1 point below code): supported, at the margin.** Code minus detailed is 0.996 points
  on the mean over sets. Per set it is 1.00 / 1.00 / 1.01 / 1.00 / 0.97, so on c02 alone the gap is 0.01 over the
  limit. The whole gap is the one last-account record (R-INT-LAST). The detailed wiki describes it, and 2 of 3
  builds flag it. The code arm reproduces the legacy behaviour without comment.
- **H13 (detailed more than 1 point above summary): not supported.** The difference of the medians is 0.00 on every
  set. The summary arm's median is carried by r1 and r2, which equal detailed in business terms. r3 drops to 2.19
  because of an arithmetic slip, with every differing record flagged. In strict terms the summary arm is ~50 points
  lower (median 48.81 against 99.00), but the hypothesis is stated on business equivalence.
- **Instrument check (no wiki more than 5 points below detailed): passes.** 99.004 − 2.396 = 96.6 points, and the
  gap holds on every set. The ablation is informative. Caveat: the no-wiki builds identified the program as CardDemo
  and filled gaps from recall, and what they recalled differs from legacy here (fallback and constants). So the gap
  measures the wiki against recall, not the wiki against a builder with no prior.

A5 detailed (zflx, earlier run, reported beside this rerun, not pooled): 99 / 99 / 100 on base. This rerun's
detailed arm: 99.00 / 99.00 / 99.00.
