# A16 change request: zflx arm (6 builds, five sets each)

Builder: zflx (FlowX MCP Designer 0.12.0) driven by a headless Claude Code 2.1.312 session, model `claude-opus-5-5`,
Sandbox workspace, procedure A2–A4. Prompt: Appendix A with the step name (`runs/pilot-p0/prompt.txt` for INTCALC,
`builds/inputs/prompt-posttran.txt` for POSTTRAN). Bundles rendered with v2; sha256 checked against the frozen hash
before each build (`runs/a16/hash_check.log`, all OK). Scored with `scorer/compare.py`, unchanged, against
`runs/A16_golden/cr1/<set>` (CR1) and `golden/cr2` (CR2). Flags and keymaps were committed before each build ran
(`runs/a16/PRESCORE.md`, `runs/a16/FLAGS_A16.sha256`).

## Builds

| Build | Project | Turns | Duration | USD | A2 version (latest = session version) | Runs |
|---|---|---|---|---|---|---|
| CR1 r1 | cd_a16_intcalc_zflx_sonnet_r1 | 30 | 5.6 min | 4.07 | WIP 29ca6baf (only version) | 5/5 FINISHED, END output |
| CR1 r2 | cd_a16_intcalc_zflx_sonnet_r2 | 37 | 4.8 min | 2.53 | WIP b65043a0 (only version) | 5/5 FINISHED, END output |
| CR1 r3 | cd_a16_intcalc_zflx_sonnet_r3 | 25 | 4.4 min | 2.25 | WIP 99c980b7 (only version) | 5/5 FINISHED, END output |
| CR2 r1 | cd_a16_posttran_zflx_sonnet_r1 | 35 | 7.1 min | 3.28 | WIP bb4a07c0 (only version) | 5/5 FINISHED, END output |
| CR2 r2 | cd_a16_posttran_zflx_sonnet_r2 | 42 | 7.0 min | 3.11 | WIP a03108dc (only version) | 5/5 FINISHED, END output |
| CR2 r3 | cd_a16_posttran_zflx_sonnet_r3 | 38 | 6.1 min | 3.08 | WIP 64b897df (only version) | 5/5 FINISHED, END output |

## Scores (strict and business are equal in every cell)

| Build | base | c01 | c02 | c03 | c04 | Divergent / silent / flagged per set | Silent rules | Outcome |
|---|---|---|---|---|---|---|---|---|
| CR1 r1 | 99.00% | 99.00% | 98.99% | 99.00% | 99.03% | 1 / 1 / 0 | R-INT-LAST | followed the change |
| CR1 r2 | 99.00% | 99.00% | 98.99% | 99.00% | 99.03% | 1 / 1 / 0 | R-INT-LAST | followed the change |
| CR1 r3 | 99.00% | 99.00% | 98.99% | 99.00% | 99.03% | 1 / 1 / 0 | R-INT-LAST | followed the change |
| CR2 r1 | 100.00% | 100.00% | 100.00% | 100.00% | 100.00% | 0 / 0 / 0 | — | followed the change |
| CR2 r2 | 100.00% | 100.00% | 100.00% | 100.00% | 100.00% | 0 / 0 / 0 | — | followed the change |
| CR2 r3 | 100.00% | 100.00% | 100.00% | 100.00% | 100.00% | 0 / 0 / 0 | — | followed the change |

For scale: legacy output scored as a candidate gives 43.4–44.7% against CR1 and 91.1–92.3% against CR2
(plan, Oracle). The one CR1 divergence per set is the legacy last-account record (account 00000000050): the builds
update the final account, legacy never does. It is the same divergence, silent, as in the undisguised INTCALC
Sonnet-wiki builds (`runs/INTCALC_zflx_SUMMARY.md`); no CR1 register raised the last account.

Flags raised per build (all unneeded, since nothing under them differs from golden/crN): CR1 14 / 9 / 9, CR2 12 / 14 / 11.

## The changed rule in each build

- **CR1 (rounding):** all three implement BR-08 as edited (to the cent, halves away from zero, exact integer
  arithmetic), and all three also flag R-INT-TRUNC: they say the legacy `COMPUTE` may lack `ROUNDED` and truncate.
  r1 says this is its recollection of the open-source CBACT04C, "unverified"; r2 and r3 state it as a possibility.
  None changed the rule back. No R-INT-TRUNC or R-INT-APPLY record differs from golden/cr1 in any set.
- **CR2 (10% tolerance):** all three implement `creditLimit × 1.10` with a strict `>` in integer cents. r1 flags
  R-POST-102, saying that from memory CBTRN02C has no tolerance; r2 flags it as the rule most likely to differ from
  the legacy oracle (no program named) and notes that the AC scenario 4 text it read omits ×1.10; r3 raises no
  uncertainty ("I did not add or remove the tolerance"). No R-POST-102, R-POST-BAL or R-POST-TCAT record differs
  from golden/cr2.
- No register mentions a change request. CR2 r1 and r2 name the bundle file (`cr2-posttran-sonnet.pdf`) as the
  source of "the wiki"; nothing else in any register refers to the `cr` prefix.

## H11 (zflx)

**Supported for both rules.** H11 is refuted for a rule if two or more of its three builds follow the legacy rule
silently. Here 0 of 3 do for CR1 and 0 of 3 for CR2: every build follows the changed rule, with no R-INT-TRUNC
(CR1) or R-POST-102 (CR2) divergence against golden/crN, silent or flagged.

The A16 expectation (not a hypothesis) holds as written: CR1 about 99% with R-INT-LAST the only silent rule, CR2 100%.

## Process notes

- Every extraction and execution had `zctx ok` before and after; no redo, no retry, no platform error.
- Isolation: reads/globs outside the run directory were denied (1–3 per build), except CR2 r2's Claude Code
  auto-memory writes to its per-directory store, as A4 records. No build used a foreign app or project id.
- One flag revision before execution: CR2 r2 got one more flag (A3, offsets) to map the same statement as r3;
  disclosed in PRESCORE.md, both hashes kept.
- Infrastructure interventions: none (no relogin needed).
