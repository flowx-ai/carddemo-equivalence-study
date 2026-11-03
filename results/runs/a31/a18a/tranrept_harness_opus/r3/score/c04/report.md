# Layer 1 score: `runs/a31/a18a/tranrept_harness_opus/r3/out/c04` vs `golden/v1/cases/c04/out`

- Equivalence (strict): **98.65%** · business: **99.19%** of 371 units
- Divergent units: 3 (silent 1, flagged 2)
- Flags raised: 28 (unneeded 26)
- Layout (not part of equivalence): {"tranrept_report": {"line_match": 0.1707, "page_totals_equal": false, "pages_golden": 19, "pages_candidate": 7}}
- Excluded from equivalence (S4, overflow statements): 0 units, 0 differing

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| tranrept_report | 370 | 371 | 366 | 368 |

| Rule | silent | flagged |
|---|---|---|
| R-REPT-HEADER | 0 | 1 |
| R-REPT-LASTACCT | 0 | 1 |
| R-REPT-LASTDUP | 1 | 0 |

First 40 divergences:

| output | key | kind | field | rule | flagged |
|---|---|---|---|---|---|
| tranrept_report | acct:00000000040 | extra |  | R-REPT-LASTACCT | yes |
| tranrept_report | grand | field | total | R-REPT-LASTDUP | no |
| tranrept_report | header | field | range | R-REPT-HEADER | yes |
