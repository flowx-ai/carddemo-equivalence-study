# Layer 1 score: `runs/full/zflx/r2/batch/core/creastmt/out/c04` vs `~/Dev/_tests/carddemo-oracle/golden/v1/cases/c04/out`

- Equivalence (strict): **100.00%** · business: **100.00%** of 98 units
- Divergent units: 0 (silent 0, flagged 0)
- Flags raised: 4 (unneeded 4)
- Layout (not part of equivalence): {"creastmt_statements": {"line_match": 0.9984}, "creastmt_statements_html": {"line_match": 0.9996}}
- Excluded from equivalence (S4, overflow statements): 2 units, 2 differing; creastmt_statements 5: total, txns; creastmt_statements_html 5: txns

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| creastmt_statements | 49 | 49 | 49 | 49 |
| creastmt_statements_html | 49 | 49 | 49 | 49 |

| Rule | silent | flagged |
|---|---|---|

First 40 divergences:

| output | key | kind | field | rule | flagged |
|---|---|---|---|---|---|
