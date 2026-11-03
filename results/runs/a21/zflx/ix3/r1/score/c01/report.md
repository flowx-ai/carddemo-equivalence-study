# Layer 1 score: `runs/a21/zflx/ix3/r1/out/c01` vs `golden/cr7/cases/c01/out`

- Equivalence (strict): **99.68%** · business: **99.68%** of 316 units
- Divergent units: 1 (silent 0, flagged 1)
- Flags raised: 31 (unneeded 28)
- Layout (not part of equivalence): {"tranrept_report": {"line_match": 0.9957, "page_totals_equal": false, "pages_golden": 16, "pages_candidate": 16}}
- Excluded from equivalence (S4, overflow statements): 0 units, 0 differing

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| tranrept_report | 316 | 316 | 315 | 315 |

| Rule | silent | flagged |
|---|---|---|
| R-REPT-LASTDUP | 0 | 1 |

First 40 divergences:

| output | key | kind | field | rule | flagged |
|---|---|---|---|---|---|
| tranrept_report | grand | field | total | R-REPT-LASTDUP | yes |
