# Layer 1 score: `runs/a21/zflx/yx3/r1/out/c03` vs `golden/v1/cases/c03/out`

- Equivalence (strict): **0.00%** · business: **0.00%** of 100 units
- Divergent units: 100 (silent 0, flagged 100)
- Flags raised: 18 (unneeded 16)
- Layout (not part of equivalence): {"creastmt_statements": {"line_match": 0.8998}, "creastmt_statements_html": {"line_match": 0.9305}}
- Excluded from equivalence (S4, overflow statements): 0 units, 0 differing

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| creastmt_statements | 44 | 50 | 0 | 0 |
| creastmt_statements_html | 44 | 50 | 0 | 0 |

| Rule | silent | flagged |
|---|---|---|
| R-STMT-ABEND | 0 | 12 |
| R-STMT-FICO | 0 | 88 |

First 40 divergences:

| output | key | kind | field | rule | flagged |
|---|---|---|---|---|---|
| creastmt_statements | 1 | extra |  | R-STMT-ABEND | yes |
| creastmt_statements | 10 | field | fico | R-STMT-FICO | yes |
| creastmt_statements | 11 | field | fico | R-STMT-FICO | yes |
| creastmt_statements | 12 | field | fico | R-STMT-FICO | yes |
| creastmt_statements | 13 | field | fico | R-STMT-FICO | yes |
| creastmt_statements | 14 | field | fico | R-STMT-FICO | yes |
| creastmt_statements | 15 | field | fico | R-STMT-FICO | yes |
| creastmt_statements | 16 | field | fico | R-STMT-FICO | yes |
| creastmt_statements | 17 | extra |  | R-STMT-ABEND | yes |
| creastmt_statements | 18 | field | fico | R-STMT-FICO | yes |
| creastmt_statements | 19 | field | fico | R-STMT-FICO | yes |
| creastmt_statements | 2 | field | fico | R-STMT-FICO | yes |
| creastmt_statements | 20 | field | fico | R-STMT-FICO | yes |
| creastmt_statements | 21 | field | fico | R-STMT-FICO | yes |
| creastmt_statements | 22 | field | fico | R-STMT-FICO | yes |
| creastmt_statements | 23 | field | fico | R-STMT-FICO | yes |
| creastmt_statements | 24 | field | fico | R-STMT-FICO | yes |
| creastmt_statements | 25 | extra |  | R-STMT-ABEND | yes |
| creastmt_statements | 26 | field | fico | R-STMT-FICO | yes |
| creastmt_statements | 27 | field | fico | R-STMT-FICO | yes |
| creastmt_statements | 28 | field | fico | R-STMT-FICO | yes |
| creastmt_statements | 29 | field | fico | R-STMT-FICO | yes |
| creastmt_statements | 3 | field | fico | R-STMT-FICO | yes |
| creastmt_statements | 30 | field | fico | R-STMT-FICO | yes |
| creastmt_statements | 31 | field | fico | R-STMT-FICO | yes |
| creastmt_statements | 32 | field | fico | R-STMT-FICO | yes |
| creastmt_statements | 33 | field | fico | R-STMT-FICO | yes |
| creastmt_statements | 34 | field | fico | R-STMT-FICO | yes |
| creastmt_statements | 35 | field | fico | R-STMT-FICO | yes |
| creastmt_statements | 36 | field | fico | R-STMT-FICO | yes |
| creastmt_statements | 37 | field | fico | R-STMT-FICO | yes |
| creastmt_statements | 38 | field | fico | R-STMT-FICO | yes |
| creastmt_statements | 39 | field | fico | R-STMT-FICO | yes |
| creastmt_statements | 4 | field | fico | R-STMT-FICO | yes |
| creastmt_statements | 40 | extra |  | R-STMT-ABEND | yes |
| creastmt_statements | 41 | field | fico | R-STMT-FICO | yes |
| creastmt_statements | 42 | field | fico | R-STMT-FICO | yes |
| creastmt_statements | 43 | field | fico | R-STMT-FICO | yes |
| creastmt_statements | 44 | field | fico | R-STMT-FICO | yes |
| creastmt_statements | 45 | field | fico | R-STMT-FICO | yes |
