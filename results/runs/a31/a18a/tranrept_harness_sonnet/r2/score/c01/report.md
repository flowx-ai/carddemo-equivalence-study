# Layer 1 score: `runs/a31/a18a/tranrept_harness_sonnet/r2/out/c01` vs `golden/v1/cases/c01/out`

- Equivalence (strict): **98.37%** · business: **99.18%** of 367 units
- Divergent units: 3 (silent 0, flagged 3)
- Flags raised: 29 (unneeded 24)
- Layout (not part of equivalence): {"tranrept_report": {"line_match": 0.839, "page_totals_equal": false, "pages_golden": 21, "pages_candidate": 6}}
- Excluded from equivalence (S4, overflow statements): 0 units, 0 differing

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| tranrept_report | 366 | 367 | 361 | 364 |

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
