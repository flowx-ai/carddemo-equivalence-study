# A16 harness pre-score record (written per build before that build is executed; no output opened)

Builder: the dev-env harness on the A18 image (digest checked before every build, `runs/a16/digest_check.log`), driven by
`tools/harness_api.py auto` via `tools/a1617_harness_chain.sh` (A8 gate rules, A18 retry rule). Mapper: Claude. Flag
rubric: PROTOCOL §6 / notebook §25 and §52, unchanged: a ledger entry is a flag only if its basis says the wiki leaves the
point open (silent, unstated, not specified, DECISION/TODO). The register of a harness build is its assumptions ledger
in the workflow definition (`exec/workflow_*.md`). Flags: `runs/a16/<step>_harness_sonnet/r<n>/flags.json` (specs in
`runs/a16/flagspec/<step>_harness_r<n>.json`), hashes in `runs/a16/FLAGS_A16H.sha256`. Wiki flags as the zflx arm:
CR1 none; CR2 the two posttran-sonnet wiki flags (R-POST-PRECEDENCE).

Decode keymaps and input maps: read from each build's workflow definition (`adapter/keymap_source.txt`), committed
with the flags, before execution. A2 version: `exec/a2_pick.txt` (`tools/a1617h_latest.py`).

| Build | A2 version | Rule as implemented (from its ledger and definition) | Legacy citation | Mentions a change request / file prefix |
|---|---|---|---|---|
| CR1 r1 | 4c47d500 (committed branch head = session head) | ledger line 37: integer cents, each category rounded half away from zero (BR-08 as edited); `rounded()` divides by 120000 with half-away rounding. No R-INT-TRUNC uncertainty raised | none (CardDemo only in the workflow name) | cites `cr1-intcalc-sonnet.pdf` pages as the wiki source in every entry; no change request mentioned |
| CR1 r2 | b1b42100 (`main`, "Save changes before implementation"; no build branch, no WIP: nothing was written) | none: plan PAUSED `intent_unparseable` before any write (script over the harness's 20,000-character bound, A4 recurrence; see HARNESS_DEFECTS.md). No workflow, so every record is R-ABSENT (A2) | — | — |

CR1 r2 has no register (no workflow), and CR1 has no wiki flags, so its `flags.json` is empty.
