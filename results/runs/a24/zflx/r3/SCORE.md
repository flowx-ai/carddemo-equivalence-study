# A24 zflx r3 (cd_a24_sf6_zflx_r3): score

Build: $13.64, 348 turns (06:54:01–07:17:33Z). The account was on usage overage: the transcript has three seven_day
rate_limit_events with overage allowed, and none of them interrupted the build. 93 flags from the build's register
(41 entries).
- Isolation: 8 Greps of the builder's own session transcript.
- Scope: one `list_project_versions` call on its own app.

## Hypotheses (frozen rules, fixes 1–6; fix 6 is not needed, because bill payment has one message value)

| | verdict | detail |
|---|---|---|
| H15 payment files | holds | 0 silent units |
| H16 core screens | fails | 113 silent core units |
| H17 account view | fails | 12/29 fields |
| H18 browser subset | fails | 24/25 steps (run 08:14–08:17Z, after the user signed in again; the 07:31Z attempt stopped at the sign-in before any case ran); o-avw-01 step 4: the page shows ADTOPEN, AEXPDT, AREISDT and ACSTDOB differently from the workflow's values, as in r1 and r2 |
| H19 end to end | fails | payment differs from legacy |

## Pooled screen equivalence (descriptive)

- untagged: 177/533
- tagged: 55/172

## Post hoc column (descriptive only)

**Blank extras excluded.** 187 units are excluded. The rest:
- H16 core silent units: 93;
- screen untagged: 177/435;
- screen tagged: 55/83.

The silent core units that remain differ from legacy in these places:
- the option labels ("1. Account View" where legacy shows "01. Account View");
- INFOMSG missing on the account view;
- OPTN012.

## H19 detail

The frozen verdict is *payment differs from legacy*. H19 fails by construction for zflx: the zflx POSTTRAN build stamps the wall
clock, so TRANREPT's July 2022 window drops every row in both chains.

The 8 non-TRANREPT payment units carry through.
