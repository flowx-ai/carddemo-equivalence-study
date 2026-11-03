# Layer 1 score: `runs/full/zflx/r3/batch/core/tranrept/out/c01` vs `~/Dev/_tests/carddemo-oracle/golden/v1/cases/c01/out`

- Equivalence (strict): **99.46%** · business: **99.46%** of 367 units
- Divergent units: 2 (silent 2, flagged 0)
- Flags raised: 0 (unneeded 0)
- Layout (not part of equivalence): {"tranrept_report": {"line_match": 0.9945, "page_totals_equal": false, "pages_golden": 21, "pages_candidate": 21}}
- Excluded from equivalence (S4, overflow statements): 0 units, 0 differing

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| tranrept_report | 366 | 367 | 365 | 365 |

| Rule | silent | flagged |
|---|---|---|
| R-REPT-LASTACCT | 1 | 0 |
| R-REPT-LASTDUP | 1 | 0 |

First 40 divergences:

| output | key | kind | field | rule | flagged |
|---|---|---|---|---|---|
| tranrept_report | acct:00000000040 | extra |  | R-REPT-LASTACCT | no |
| tranrept_report | grand | field | total | R-REPT-LASTDUP | no |
