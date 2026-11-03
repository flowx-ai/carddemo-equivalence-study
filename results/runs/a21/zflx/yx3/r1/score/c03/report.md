# Layer 1 score: `runs/a21/zflx/yx3/r1/out/c03` vs `golden/cr8/cases/c03/out`

- Equivalence (strict): **88.00%** · business: **88.00%** of 100 units
- Divergent units: 12 (silent 0, flagged 12)
- Flags raised: 18 (unneeded 17)
- Layout (not part of equivalence): {"creastmt_statements": {"line_match": 0.9369}, "creastmt_statements_html": {"line_match": 0.9375}}
- Excluded from equivalence (S4, overflow statements): 0 units, 0 differing

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| creastmt_statements | 44 | 50 | 44 | 44 |
| creastmt_statements_html | 44 | 50 | 44 | 44 |

| Rule | silent | flagged |
|---|---|---|
| R-STMT-ABEND | 0 | 12 |

First 40 divergences:

| output | key | kind | field | rule | flagged |
|---|---|---|---|---|---|
| creastmt_statements | 1 | extra |  | R-STMT-ABEND | yes |
| creastmt_statements | 17 | extra |  | R-STMT-ABEND | yes |
| creastmt_statements | 25 | extra |  | R-STMT-ABEND | yes |
| creastmt_statements | 40 | extra |  | R-STMT-ABEND | yes |
| creastmt_statements | 8 | extra |  | R-STMT-ABEND | yes |
| creastmt_statements | 9 | extra |  | R-STMT-ABEND | yes |
| creastmt_statements_html | 1 | extra |  | R-STMT-ABEND | yes |
| creastmt_statements_html | 17 | extra |  | R-STMT-ABEND | yes |
| creastmt_statements_html | 25 | extra |  | R-STMT-ABEND | yes |
| creastmt_statements_html | 40 | extra |  | R-STMT-ABEND | yes |
| creastmt_statements_html | 8 | extra |  | R-STMT-ABEND | yes |
| creastmt_statements_html | 9 | extra |  | R-STMT-ABEND | yes |
