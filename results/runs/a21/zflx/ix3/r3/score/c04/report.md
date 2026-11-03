# Layer 1 score: `runs/a21/zflx/ix3/r3/out/c04` vs `golden/cr7/cases/c04/out`

- Equivalence (strict): **99.68%** · business: **99.68%** of 317 units
- Divergent units: 1 (silent 0, flagged 1)
- Flags raised: 31 (unneeded 28)
- Layout (not part of equivalence): {"tranrept_report": {"line_match": 0.9563, "page_totals_equal": false, "pages_golden": 19, "pages_candidate": 19}}
- Excluded from equivalence (S4, overflow statements): 0 units, 0 differing

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| tranrept_report | 317 | 317 | 316 | 316 |

| Rule | silent | flagged |
|---|---|---|
| R-REPT-LASTDUP | 0 | 1 |

First 40 divergences:

| output | key | kind | field | rule | flagged |
|---|---|---|---|---|---|
| tranrept_report | grand | field | total | R-REPT-LASTDUP | yes |
