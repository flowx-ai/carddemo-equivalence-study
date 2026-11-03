# Layer 1 score: `runs/rerun/tranrept_harness_sonnet/r1/out/c04` vs `golden/v1/cases/c04/out`

- Equivalence (strict): **98.92%** · business: **99.46%** of 371 units
- Divergent units: 2 (silent 0, flagged 2)
- Flags raised: 37 (unneeded 34)
- Layout (not part of equivalence): {"tranrept_report": {"line_match": 0.8514, "page_totals_equal": false, "pages_golden": 19, "pages_candidate": 7}}
- Excluded from equivalence (S4, overflow statements): 0 units, 0 differing

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| tranrept_report | 370 | 371 | 367 | 369 |

| Rule | silent | flagged |
|---|---|---|
| R-REPT-LASTACCT | 0 | 1 |
| R-REPT-LASTDUP | 0 | 1 |

First 40 divergences:

| output | key | kind | field | rule | flagged |
|---|---|---|---|---|---|
| tranrept_report | acct:00000000040 | extra |  | R-REPT-LASTACCT | yes |
| tranrept_report | grand | field | total | R-REPT-LASTDUP | yes |
