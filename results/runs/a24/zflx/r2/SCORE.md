# A24 zflx r2 (cd_a24_sf6_zflx_r2): score

**Disclosure.** The builder session was cut off by the account's 7-day usage limit after 363 tool calls
(rate_limit_event rejected, seven_day). This is not a builder decision. The build is scored as it stands under the
frozen A24 §7 rule:
- latest project version <uuid>;
- 0 flags, because the session ended before any register (assumptions.md) was written.

The build's own "TEMP test data" operations and its zz_test_seed workflow are still in the project as built. Sample
passwords in the transcript and in one store's test-data operation are masked; the raw copies are kept outside the
repository.

Build: $12.04, 365 turns, 20:08:42Z end (START 19:45:05Z).

## Hypotheses (frozen rules, fixes 1–6)

| | verdict | detail |
|---|---|---|
| H15 payment files | holds | 0 silent units |
| H16 core screens | fails | 171 silent core units (0 flags) |
| H17 account view | fails | 12/29 fields |
| H18 browser subset | fails | 24/25 steps; o-avw-01 step 4: the page shows ADTOPEN, AEXPDT, AREISDT and ACSTDOB differently from the workflow's values |
| H19 end to end | fails | payment differs from legacy (see below) |

## Pooled screen equivalence (descriptive)

- untagged: 178/533
- tagged: 54/172

## Post hoc columns (descriptive only)

**Blank extras excluded** (coordinator ruling; the same rule as for r1). 187 units are
excluded. The rest:
- H16 core silent units: 121;
- screen untagged: 178/435;
- screen tagged: 54/83.

**Fix 6 sensitivity (B)**, ERRMSG ← bill.error only: an offline replay of this run's own logged responses (the identity
replay reproduces all 17 cases).
- H16 core silent units: 176;
- screen untagged: 177/533;
- screen tagged: 47/172;
- H15, H17 and the case outcomes are unchanged.

## H19 detail

The frozen verdict is *payment differs from legacy*. The payment's own TRANREPT detail (0000000996722788) is missing in the session
chain. The grand total differs in both chains, so it is inherited. H19 fails by construction for zflx: the zflx
POSTTRAN build stamps the wall clock, so TRANREPT's July 2022 window drops every row in both chains.

The 8 non-TRANREPT payment units (combtran, CREASTMT ×5, INTCALC and POSTTRAN curr_bal) carry through.

Known instrument property, unchanged: a payment unit whose whole TRANREPT unit is missing in both chains is keyed
`missing`, so it counts as not differing.
