# Layer 1 score: `runs/tranrept_zflx_sonnet/r2/out/c01` vs `golden/v1/cases/c01/out`

- Equivalence (strict): **99.73%** · business: **99.73%** of 366 units
- Divergent units: 1 (silent 0, flagged 1)
- Flags raised: 22 (unneeded 20)
- Layout (not part of equivalence): {"tranrept_report": {"line_match": 0.9575, "page_totals_equal": false, "pages_golden": 21, "pages_candidate": 21}}
- Excluded from equivalence (S4, overflow statements): 0 units, 0 differing

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| tranrept_report | 366 | 366 | 365 | 365 |

| Rule | silent | flagged |
|---|---|---|
| R-REPT-LASTDUP | 0 | 1 |

First 40 divergences:

| output | key | kind | field | rule | flagged |
|---|---|---|---|---|---|
| tranrept_report | grand | field | total | R-REPT-LASTDUP | yes |
