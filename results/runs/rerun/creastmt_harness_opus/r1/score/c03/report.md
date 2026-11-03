# Layer 1 score: `runs/rerun/creastmt_harness_opus/r1/out/c03` vs `golden/v1/cases/c03/out`

- Equivalence (strict): **0.00%** · business: **48.00%** of 100 units
- Divergent units: 52 (silent 0, flagged 52)
- Flags raised: 46 (unneeded 35)
- Layout (not part of equivalence): {"creastmt_statements": {"line_match": 0.154}, "creastmt_statements_html": {"line_match": 0.2071}}
- Excluded from equivalence (S4, overflow statements): 0 units, 0 differing

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| creastmt_statements | 44 | 50 | 0 | 24 |
| creastmt_statements_html | 44 | 50 | 0 | 24 |

| Rule | silent | flagged |
|---|---|---|
| R-STMT-ABEND | 0 | 12 |
| R-STMT-ADDR | 0 | 40 |

First 40 divergences:

| output | key | kind | field | rule | flagged |
|---|---|---|---|---|---|
| creastmt_statements | 1 | extra |  | R-STMT-ABEND | yes |
| creastmt_statements | 14 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 15 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 17 | extra |  | R-STMT-ABEND | yes |
| creastmt_statements | 19 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 2 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 21 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 24 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 25 | extra |  | R-STMT-ABEND | yes |
| creastmt_statements | 27 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 28 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 3 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 34 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 36 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 38 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 39 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 4 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 40 | extra |  | R-STMT-ABEND | yes |
| creastmt_statements | 41 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 43 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 44 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 47 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 50 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 6 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 8 | extra |  | R-STMT-ABEND | yes |
| creastmt_statements | 9 | extra |  | R-STMT-ABEND | yes |
| creastmt_statements_html | 1 | extra |  | R-STMT-ABEND | yes |
| creastmt_statements_html | 14 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements_html | 15 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements_html | 17 | extra |  | R-STMT-ABEND | yes |
| creastmt_statements_html | 19 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements_html | 2 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements_html | 21 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements_html | 24 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements_html | 25 | extra |  | R-STMT-ABEND | yes |
| creastmt_statements_html | 27 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements_html | 28 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements_html | 3 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements_html | 34 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements_html | 36 | field | add3 | R-STMT-ADDR | yes |
