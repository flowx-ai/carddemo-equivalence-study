# A17 wiki ablation: harness, A18 image (stopped by D1) — not run; the harness arm runs on the A19 image (runs/a19h/SUMMARY.md)

No A17 harness build was started. The harness arm runs after A16 (PROTOCOL, order for A16 and A17), and the A16 harness
arm stopped after CR1 r2 on harness defect D1 (`runs/a16/HARNESS_DEFECTS.md`: script over the harness's 20,000-character
bound, `intent_unparseable`, A4 recurrence). H12, H13 and the instrument check are therefore untested for the harness.
The zflx results (`SUMMARY.md`) stand alone and are not pooled with anything.

Ready for a later run: `tools/a1617_harness_chain.sh a17 <arm> <rep>` (Ledgerline workspace, `ll_a17_accrue_harness_<arm>_r<n>`,
`runs/a17/accrue_harness_<arm>/r<n>`, same bundles, prompts and frozen hashes as the zflx arm). Any image change first
needs a new amendment.

Later runs, reported separately and never pooled: A19 image, stopped by D2 after detailed r1 (`runs/a19h/SUMMARY.md`);
A20 image, stopped by D3 after 6 of 12 builds (`runs/a20h/a17/SUMMARY.md`).
