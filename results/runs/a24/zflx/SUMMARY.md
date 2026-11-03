# A24, zflx arm: summary

The zflx arm of A24 refutes H16, H17, H18 and H19 under the frozen rules. H15 is not refuted. **The target claim is not
stated for zflx.** The part that holds is the payment's file state: H15 has 0 silent units in all three builds.

Rule: a hypothesis is refuted for a builder if two or more of its three builds fail it. Fixes 1–6 apply.

## Verdicts as registered (r1, r2 as it stands, r3)

| | r1 | r2 | r3 | verdict |
|---|---|---|---|---|
| H15 payment files, silent units | 0, holds | 0, holds | 0, holds | not refuted (0 of 3 fail) |
| H16 core screens, silent units | 23, fails | 171, fails | 113, fails | refuted (3 of 3) |
| H17 account view, fields equal | 16/29, fails | 12/29, fails | 12/29, fails | refuted (3 of 3) |
| H18 browser subset, steps | 24/25, fails | 24/25, fails | 24/25, fails | refuted (3 of 3) |
| H19 end to end | payment differs, fails | payment differs, fails | payment differs, fails | refuted (3 of 3) |

**Sensitivity, exploratory and post hoc, not counted: r2b in r2's place.** The verdicts do not change: H15 not refuted (r2b:
0 silent units); H16, H17, H18 and H19 refuted (r2b: 12 silent units; 19/29; 14/25 as run, of which 10 failures come from my
screen map, see r2b/SCORE.md, and the eleventh is the same o-avw-01 step 4; payment differs).

## Descriptive columns (no threshold)

| | r1 | r2 | r3 | r2b (not counted) |
|---|---|---|---|---|
| Screen units equal, untagged | 186/547 | 178/533 | 177/533 | 369/559 |
| Screen units equal, tagged | 58/200 | 54/172 | 55/172 | 54/221 |
| File units equal, untagged | 6747/6747 | 6747/6747 | 6747/6747 | 6747/6747 |
| File units equal, tagged | 8/8 | 6/8 | 6/8 | 6/8 |
| Flags | 82 | 0 | 93 | 79 |
| Post hoc, blank extras excluded: H16 silent units | 3 | 121 | 93 | 3 |
| Post hoc: screen units equal, untagged | 186/435 | 178/435 | 177/435 | 369/435 |
| Post hoc: screen units equal, tagged | 58/88 | 54/83 | 55/83 | 54/90 |
| Cost | $10.25 | $12.04 | $13.64 | $10.83 |
| Builder wall clock | 18 min | 24 min | 24 min | 34 min |
| Turns | 326 | 365 | 348 | 367 |

r2 under fix 6 sensitivity (B), ERRMSG ← bill.error only: H16 176 silent units, screen untagged 177/533, tagged 47/172;
H15, H17 and the case outcomes are unchanged.

## What the failures are

- **H16.** Two kinds of silent difference make up nearly all of it. The menu's option labels differ from legacy in r2 and r3
  ("1. Account View" where legacy shows "01. Account View"). Blank inputs that the legacy step does not send are the rest:
  USERID on sign-on and OPTION on the menu in every build, and more fields in r2. They account for 20 of r1's 23 units, 50 of
  r2's 171 and 20 of r3's 113. The post hoc column excludes them, and that exclusion is not part of the frozen rule. In r1 and
  r2b, the 3 units that remain are INFOMSG on the account view (2) and OPTN012 (1).
- **H17.** The fields that differ have no separate value the map could read, mostly name and address (9 fields in every
  build), and the SSN is masked ("***-**-3888") in every build. r2's differences are silent, because r2 has no flags; in r1, r3
  and r2b they are under flags.
- **H18.** All three registered builds fail at the same step: o-avw-01 step 4, where the page shows ADTOPEN, AEXPDT, AREISDT
  and ACSTDOB differently from the workflow's values (r1: as M/D/YY). The same fields fail in every build, which points to
  how the platform renders dates, not to a builder decision. That cause is an inference and has not been tested.
- **H19.** H19 fails by construction for zflx: the zflx POSTTRAN build stamps the wall clock, so TRANREPT's July 2022 window
  drops every row, and the payment's own TRANREPT detail is missing in the session chain. The verdict is reported as frozen.
  The 8 non-TRANREPT payment units (combtran, CREASTMT ×5, INTCALC and POSTTRAN curr_bal) carry through in all builds.

## Instrument changes made during the arm

- **Fix 5 (`scorer/report_compare.py`).** The report scorer crashed on a blank TRANREPT total. A blank or missing total now
  parses as missing, and the frozen H19 rule applies as written. Self-tests pass, 77/77 layer-1 report sets re-score
  identical, and the e2e control passes 7/7. TRANREPT was not rerun with other dates.
- **Fix 6 (`tools/adapter_online.py`).** The show path "a|b|c" takes the one non-empty text; two or more non-empty texts are
  recorded as an ambiguous marker that differs from legacy, and logged. The ruling was written before r2 was executed. It
  does not apply to r1, and r3 and r2b do not need it (one message value).
- **Known instrument property, unchanged.** A payment unit whose whole TRANREPT unit is missing in both chains is keyed
  `missing`, so it counts as not differing.

## Disclosures

- **r2.** The builder session was cut off by the account's 7-day usage limit after 363 tool calls (rate_limit_event rejected,
  seven_day); this is not a builder decision. Scored as it stands under §7: latest version, 0 flags, TEMP DB operations as
  built.
- **r3 H18.** Run 08:14–08:17Z, after the user signed in again in the browser profile. The earlier attempts stopped before
  any case ran.
- **Usage overage.** r3 and r2b ran on usage overage, with rate-limit events but no interruption.
- **Account change.** The Claude CLI login changed account at about 08:24Z, after every registered build and r2b's build had
  ended, with the same model id. No build ran across the change.
- **Platform errors.** dev-env answered 500 and 503 on workflow runs from at least 08:24Z to about 08:28Z, during r2b's
  execution only. No case had started; the run was restarted.
- **Operator slips, both r2b only.** The browser detection order in r2b's map, and one context call to the shared zflx profile,
  restored at once.
- **Builder environment.** r2b's final message repeats a note from the user's global instructions file, so that file reached
  the builder session.

Details: r1/SCORE.md, r2/SCORE.md, r3/SCORE.md, r2b/SCORE.md, ../interventions.log.
