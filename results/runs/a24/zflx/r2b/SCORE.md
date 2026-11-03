# A24 zflx r2b (cd_a24_sf6_zflx_r2b): score. EXPLORATORY, POST HOC

**Label.** r2b is a sensitivity run for r2, added after r2's builder session was cut off by the account's 7-day usage
limit. It is reported beside r2, never in its place, and it never counts toward H15–H19. Same prompt, model and
instrument (fixes 1–6) as the registered builds. r2's score stands.

Build: $10.83, 367 turns (07:39–08:13Z). The account was on usage overage: four seven_day rate_limit_events with
overage allowed, none interrupted the build. 79 flags from the build's register.
- Isolation: one denied Read of the builder's own per-directory memory file.
- The builder's final message repeats the "/compact" note from the user's global instructions file, so that file reached
  the builder session. It has no bearing on the app.

## Same rules as H15–H19 (not counted)

| | result | detail |
|---|---|---|
| H15 rule, payment files | holds | 0 silent units |
| H16 rule, core screens | fails | 12 silent core units |
| H17 rule, account view | fails | 19/29 fields; the other 10 are under flags: name and address combined on the page (9), SSN masked (1) |
| H18 rule, browser subset | fails | 14/25 steps as run; see below |
| H19 rule, end to end | fails | payment differs from legacy |

## Browser subset: 10 of the 11 failed steps come from my screen map, not from the build

The map's browser section lists COMEN1A before COBIL0A and detects COMEN1A by a Submit button. The bill payment card also
has one, so the check read the bill payment card as the menu (the o-bil-01 step 3 screenshot shows the bill payment
card). From there it found no inputs for the page it assumed and looked for an Exit button that the card does not have.
This accounts for o-bil-01 steps 3–7 and o-bil-03 steps 3–7.

The map was committed before outputs were opened and is left as it was, and 14/25 stands as the recorded result. It is not
a measure of the page. The eleventh failure is o-avw-01 step 4: the page shows ADTOPEN, AEXPDT, AREISDT and ACSTDOB
differently from the workflow's values, the same step and fields as r1, r2 and r3. So the H18 rule fails for r2b on
that step alone. No corrected browser run was made.

## Pooled screen equivalence (descriptive)

- untagged: 369/559
- tagged: 54/221

## Post hoc column (descriptive only)

**Blank extras excluded.** 255 units are excluded. The rest:
- H16 core silent units: 3;
- screen untagged: 369/435;
- screen tagged: 54/90.

The 12 silent core units under the frozen rule: OPTION on the menu (9), INFOMSG missing on the account view (2), OPTN012 (1).

## H19 detail

The frozen verdict is *payment differs from legacy*, by construction as in r1–r3: the zflx POSTTRAN build stamps the wall
clock, so TRANREPT's July 2022 window drops every row. The 8 non-TRANREPT payment units carry through.

## Execution notes (runs/a24/interventions.log)

- dev-env answered 500 and 503 on workflow runs from at least 08:24Z to about 08:28Z. The first online start stopped in its
  first store load, before any build workflow ran, and is kept as `online_aborted_platform_500/`. The rerun started at
  08:30:48Z.
- e2e rc=1 is the known check_secrets false positive on the repo's own tools/fxc_relogin.sh through the scratch-root
  symlink, after scoring completed.
- One project-context call at 08:22Z went to the shared default zflx profile by mistake. It was restored at once to its
  prior value, with no workflow run in between, and the a24_ui context was then set to r2b.
