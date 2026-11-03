# A19 harness arm, A17 wiki ablation: pre-score record (per build, before execution; no output opened)

Builder: dev-env harness on the A19 image (digest checked before every build), Ledgerline workspace,
`ll_a19h_accrue_harness_<arm>_r<n>`, `tools/a1617_harness_chain.sh a17` (same bundles, prompts and frozen hashes as the
zflx arm; A8 gates, A18 retry rule). Mapper: Claude; rubric as A5/A17 zflx (notebook §25): wiki flag for the detailed arm
only (BR-08 TODO → R-INT-TRUNC); build flags from the assumption register in the workflow definition where its basis says
the pages leave the point open. Keymaps (pure renaming of the disguised names) from the definition, committed with flags
before execution. Executed with `VARIANT=d1`, scored against `runs/A5_golden/<set>/` (`tools/a1617_exec.sh a17`).
Recall record: `tools/a17_recall_grep.sh` on the definition (no builder dir for the harness); `DEFAULT` as the FlowX
workflow type is not recall.

| Build | A2 version | CardDemo citations | Undisguised constants | R-INT-LAST | Rounding | Notes |
|---|---|---|---|---|---|---|
| detailed r1 | fe736685 (main WIP, no workflow: planning failed `unsupported_capability`, nothing written) | — | — | — | — | no register; wiki flag only (R-INT-TRUNC); every record R-ABSENT (A2). Harness defect D2 |
