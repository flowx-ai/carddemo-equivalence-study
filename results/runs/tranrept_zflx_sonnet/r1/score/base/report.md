# Layer 1 score: `runs/tranrept_zflx_sonnet/r1/out/base` vs `golden/v1`

- Equivalence (strict): **99.72%** · business: **99.72%** of 363 units
- Divergent units: 1 (silent 0, flagged 1)
- Flags raised: 23 (unneeded 21)
- Layout (not part of equivalence): {"tranrept_report": {"line_match": 0.9615, "page_totals_equal": false, "pages_golden": 18, "pages_candidate": 18}}
- Excluded from equivalence (S4, overflow statements): 0 units, 0 differing

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| tranrept_report | 363 | 363 | 362 | 362 |

| Rule | silent | flagged |
|---|---|---|
| R-REPT-LASTDUP | 0 | 1 |

First 40 divergences:

| output | key | kind | field | rule | flagged |
|---|---|---|---|---|---|
| tranrept_report | grand | field | total | R-REPT-LASTDUP | yes |
