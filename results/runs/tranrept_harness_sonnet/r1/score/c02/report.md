# Layer 1 score: `runs/tranrept_harness_sonnet/r1/out/c02` vs `golden/v1/cases/c02/out`

- Equivalence (strict): **98.90%** · business: **99.17%** of 363 units
- Divergent units: 3 (silent 0, flagged 3)
- Flags raised: 29 (unneeded 25)
- Layout (not part of equivalence): {"tranrept_report": {"line_match": 0.8512, "page_totals_equal": false, "pages_golden": 17, "pages_candidate": 7}}
- Excluded from equivalence (S4, overflow statements): 0 units, 0 differing

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| tranrept_report | 362 | 363 | 359 | 360 |

| Rule | silent | flagged |
|---|---|---|
| R-REPT-HEADER | 0 | 1 |
| R-REPT-LASTACCT | 0 | 1 |
| R-REPT-LASTDUP | 0 | 1 |

First 40 divergences:

| output | key | kind | field | rule | flagged |
|---|---|---|---|---|---|
| tranrept_report | acct:00000000040 | extra |  | R-REPT-LASTACCT | yes |
| tranrept_report | grand | field | total | R-REPT-LASTDUP | yes |
| tranrept_report | header | field | range | R-REPT-HEADER | yes |
