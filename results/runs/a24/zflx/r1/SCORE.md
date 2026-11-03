# A24 zflx r1 (cd_a24_sf6_zflx_r1): score

Build: $10.25, 18 min (18:59:50–19:17:56Z). 82 flags from the build's register.

## Hypotheses (frozen rules, fixes 1–5; fix 6 does not apply, because each card has one message text)

| | verdict | detail |
|---|---|---|
| H15 payment files | holds | 0 silent units |
| H16 core screens | fails | 23 silent core units |
| H17 account view | fails | 16/29 fields |
| H18 browser subset | fails | 24/25 steps; o-avw-01 step 4: the page shows the account dates and the birth date as M/D/YY |
| H19 end to end | fails | payment differs from legacy |

## Pooled screen equivalence (descriptive)

- untagged: 186/547
- tagged: 58/200

## Post hoc column (descriptive only)

**Blank extras excluded.** 224 units are excluded. The rest:
- H16 core silent units: 3;
- screen untagged: 186/435;
- screen tagged: 58/88.

## H19 detail

The frozen verdict is *payment differs from legacy*. H19 fails by construction for zflx: the zflx POSTTRAN build stamps the wall
clock, so TRANREPT's July 2022 window drops every row in both chains, and the payment's own TRANREPT detail is missing
in the session chain.

The 8 non-TRANREPT payment units carry through.
