# Layer 1 score: `runs/full/zflx/r3/batch/core/creastmt/out/c03` vs `~/Dev/_tests/carddemo-oracle/golden/v1/cases/c03/out`

- Equivalence (strict): **86.27%** · business: **86.27%** of 102 units
- Divergent units: 14 (silent 14, flagged 0)
- Flags raised: 1 (unneeded 1)
- Layout (not part of equivalence): {"creastmt_statements": {"line_match": 0.9294}, "creastmt_statements_html": {"line_match": 0.9327}}
- Excluded from equivalence (S4, overflow statements): 0 units, 0 differing

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| creastmt_statements | 44 | 51 | 44 | 44 |
| creastmt_statements_html | 44 | 51 | 44 | 44 |

| Rule | silent | flagged |
|---|---|---|
| R-STMT-ABEND | 14 | 0 |

First 40 divergences:

| output | key | kind | field | rule | flagged |
|---|---|---|---|---|---|
| creastmt_statements | 1 | extra |  | R-STMT-ABEND | no |
| creastmt_statements | 17 | extra |  | R-STMT-ABEND | no |
| creastmt_statements | 25 | extra |  | R-STMT-ABEND | no |
| creastmt_statements | 40 | extra |  | R-STMT-ABEND | no |
| creastmt_statements | 8 | extra |  | R-STMT-ABEND | no |
| creastmt_statements | 9 | extra |  | R-STMT-ABEND | no |
| creastmt_statements | 99999999999 | extra |  | R-STMT-ABEND | no |
| creastmt_statements_html | 1 | extra |  | R-STMT-ABEND | no |
| creastmt_statements_html | 17 | extra |  | R-STMT-ABEND | no |
| creastmt_statements_html | 25 | extra |  | R-STMT-ABEND | no |
| creastmt_statements_html | 40 | extra |  | R-STMT-ABEND | no |
| creastmt_statements_html | 8 | extra |  | R-STMT-ABEND | no |
| creastmt_statements_html | 9 | extra |  | R-STMT-ABEND | no |
| creastmt_statements_html | 99999999999 | extra |  | R-STMT-ABEND | no |
