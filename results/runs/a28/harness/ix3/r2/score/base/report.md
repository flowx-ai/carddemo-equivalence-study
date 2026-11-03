# Layer 1 score: `runs/a28/harness/ix3/r2/out/base` vs `golden/cr7`

- Equivalence (strict): **99.04%** · business: **99.36%** of 314 units
- Divergent units: 2 (silent 0, flagged 2)
- Flags raised: 41 (unneeded 38)
- Layout (not part of equivalence): {"tranrept_report": {"line_match": 0.8732, "page_totals_equal": false, "pages_golden": 15, "pages_candidate": 6}}
- Excluded from equivalence (S4, overflow statements): 0 units, 0 differing

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| tranrept_report | 313 | 314 | 311 | 312 |

| Rule | silent | flagged |
|---|---|---|
| R-REPT-LASTACCT | 0 | 1 |
| R-REPT-LASTDUP | 0 | 1 |

First 40 divergences:

| output | key | kind | field | rule | flagged |
|---|---|---|---|---|---|
| tranrept_report | acct:00000000040 | extra |  | R-REPT-LASTACCT | yes |
| tranrept_report | grand | field | total | R-REPT-LASTDUP | yes |
