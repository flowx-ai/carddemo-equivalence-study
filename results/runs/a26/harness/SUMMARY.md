# A26 harness arm on the R14 image: stopped at r1 (harness defect D8); 1 of 3 UI builds scored

Harness (gpt-6.1-sol, `org_manager`) on dev-env, Sandbox workspace, R14 digest 260f21f9…bee8 checked before each build,
bundle hashes OK. Frozen `prereg/frozen/a26/`, commit 99aca7f. Subject: AWS CardDemo, open source (Apache-2.0).

| Part | Registered | Status |
|---|---|---|
| 1 smoke | `a26_smoke`, unscored | ran; plan PAUSED `serve_pending` after 13 of 13 items; not a strict pass; gap rule, arm proceeded (`../a24h/smoke/SMOKE.md`) |
| 1 r1 | `cd_a26_sf6_harness_r1` | ran; no plan; **harness defect D8**; scored absent |
| 1 r2, r3 | | **not run: A26 stopped at D8** |
| 2 x1 | `cd_a26_yx3_harness_x1`, exploratory | **not run: A26 stopped at D8** |
| 3 A18 (a), 24 builds | | **not run on R14: the user's decision to move them to a new amendment on R15, not a defect** |
| 4 harness e2e | | **not run on R14: same decision** |

## Verdicts as registered

H15h–H19h are refuted for the harness if two or more of its three builds fail. One build exists, so **no hypothesis
has a verdict**. They are not estimated.

| | r1 | r2 | r3 | Verdict |
|---|---|---|---|---|
| H15h | fails (absent) | not run | not run | undecided |
| H16h | fails (absent) | not run | not run | undecided |
| H17h | fails (0/29) | not run | not run | undecided |
| H18h | fails (no UI flow) | not run | not run | undecided |
| H19h | not run | not run | not run | undecided |

The target claim is not stated for the harness. r1's failures record that no application was built; they are no
evidence about how a built application behaves against legacy. **The harness has still built no scored UI application in
this study.** The smoke shows the gated UI-flow and database operations commit on R14 for a one-page app with no
attachment; its app was not run.

## D7 check

Not run. Whether R14 sends cited pages on a step citing a file by name has not been observed. No `act-time decide
request` line has been seen live yet: neither the smoke nor r1 reached a decide attempt, so the corrected filter is
checked against the R14 source only.

## Tool checks and disclosures

- `tools/a26_lib.sh` differs from `A26_MANIFEST.sha256` by the disclosed filter fix (notebook §85), made before r1.
- `tools/a26_a24h_exec.sh` ran only its `score` step. Its loader, online, browser and e2e steps have not been used.
- H18h's browser step never ran, so the renewed sign-in was not exercised.
- Where a UI build records its assumptions is not settled. r1's harness said it could not save `assumptions.md` and
  offered to supply its contents; the run ended before any were produced.
- The OTS client venv was recreated before the stamp (`runs/a26/interventions.log`).

Interventions: `runs/a26/interventions.log`. Records: `../a24h/` (`chain.log`, `digest_check.log`, `hash_check.log`,
`HARNESS_DEFECTS.md`, `smoke/`, `r1/`).
