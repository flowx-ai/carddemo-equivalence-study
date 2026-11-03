# A26 harness smoke (a26_smoke, unscored, non-study)

R14 digest and hashes OK. gpt-6.1-sol (org_manager), 21 calls, 08:53:12–08:57:09Z. No attachment. Under the lock.

| A24 criterion | Result |
|---|---|
| plan COMPLETED | **not met:** plan PAUSED `serve_pending` after 13 of 13 items completed |
| UI flow with page, bound form control, submit-to-workflow button, committed | met: Page01, INPUT `note.text` in a form, Save starts workflow SaveNote (head 1d659e2e, COMMITTED) |
| store and insert operation committed | met: one store with INSERT "Insert Note" |
| no item ends `unverified_render_unavailable` | met: 0 occurrences in the events and the session record |

**Classification under A26:**
- Strictly, the smoke does **not pass**: its first criterion is not met.
- It does not show "capability unavailable": every gated UI-flow and database operation ran and committed.
- It is not a harness defect: the build finished and stopped at a publish gate.
- So A26's gap rule applies: reported as it ended, and the arm proceeds to r1–r3.

**The stop.** `serve_pending`: the harness says serving changes what every user gets, and offers "confirm the publish step, or Run to finish without serving". A8 has no gate answer for it and the driver stops there. It was not answered: choosing would be an operator decision, and nothing was published.

**Consequence for r1–r3 (expected, not yet seen).** A UI build that finishes may also end PAUSED `serve_pending`, not COMPLETED. It is scored at its A2 version as any other build. Its plan state is reported as it ended, and it is not counted as a failure of the plan.

**Not shown by the smoke.** The app was not run: no workflow was executed and no page was opened. The build's own summary says "Not proven" for the database write and the visible message, and says the page lacks a place for the returned message, although the definition holds a text `SaveMessage` showing `${message}`.

**Tools checked on this build.**
- `tools/a1617h_extract.sh`, `tools/a26_ui_extract.sh` and `tools/a24_map_helper.py` worked.
- The pilot check is "no".
- `tools/a26_lib.sh` had a filter bug, now fixed (notebook §85). No decide attempt occurred in this build, so the line itself is not yet seen live.
- This build recorded no assumption register, so where a UI build records one is not settled by the smoke.
