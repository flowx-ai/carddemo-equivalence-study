# Layer 1 score: `runs/a31/a18a/creastmt_harness_sonnet/r2/out/c03` vs `golden/v1/cases/c03/out`

- Equivalence (strict): **0.00%** · business: **0.00%** of 100 units
- Divergent units: 100 (silent 0, flagged 100)
- Flags raised: 40 (unneeded 22)
- Layout (not part of equivalence): {"creastmt_statements": {"line_match": 0.7146}, "creastmt_statements_html": {"line_match": 0.8727}}
- Excluded from equivalence (S4, overflow statements): 0 units, 0 differing

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| creastmt_statements | 44 | 50 | 0 | 0 |
| creastmt_statements_html | 44 | 50 | 0 | 0 |

| Rule | silent | flagged |
|---|---|---|
| R-STMT-ABEND | 0 | 12 |
| R-STMT-ADDR | 0 | 88 |
| R-STMT-NAME | 0 | 1 |
| R-STMT-TXN | 0 | 8 |

First 40 divergences:

| output | key | kind | field | rule | flagged |
|---|---|---|---|---|---|
| creastmt_statements | 1 | extra |  | R-STMT-ABEND | yes |
| creastmt_statements | 10 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 11 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 12 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 13 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 14 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 15 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 16 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 17 | extra |  | R-STMT-ABEND | yes |
| creastmt_statements | 18 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 19 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 2 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 20 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 21 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 22 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 23 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 24 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 25 | extra |  | R-STMT-ABEND | yes |
| creastmt_statements | 26 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 27 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 28 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 29 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 3 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 30 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 31 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 32 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 33 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 34 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 35 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 36 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 37 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 38 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 39 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 4 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 40 | extra |  | R-STMT-ABEND | yes |
| creastmt_statements | 41 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 42 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 43 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 44 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 45 | field | add3 | R-STMT-ADDR | yes |
