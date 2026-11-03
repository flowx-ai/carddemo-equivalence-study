# Layer 1 score: `runs/rerun/creastmt_harness_opus/r2/out/c03` vs `golden/v1/cases/c03/out`

- Equivalence (strict): **0.00%** · business: **43.00%** of 100 units
- Divergent units: 57 (silent 0, flagged 57)
- Flags raised: 53 (unneeded 23)
- Layout (not part of equivalence): {"creastmt_statements": {"line_match": 0.154}, "creastmt_statements_html": {"line_match": 0.1999}}
- Excluded from equivalence (S4, overflow statements): 0 units, 0 differing

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| creastmt_statements | 44 | 50 | 0 | 24 |
| creastmt_statements_html | 44 | 50 | 0 | 19 |

| Rule | silent | flagged |
|---|---|---|
| R-STMT-ABEND | 0 | 12 |
| R-STMT-ADDR | 0 | 40 |
| R-STMT-NAME | 0 | 1 |
| R-STMT-TXN | 0 | 8 |

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
| creastmt_statements_html | 12 | field | txns | R-STMT-TXN | yes |
| creastmt_statements_html | 14 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements_html | 15 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements_html | 17 | extra |  | R-STMT-ABEND | yes |
| creastmt_statements_html | 19 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements_html | 19 | field | txns | R-STMT-TXN | yes |
| creastmt_statements_html | 2 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements_html | 21 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements_html | 24 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements_html | 25 | extra |  | R-STMT-ABEND | yes |
| creastmt_statements_html | 27 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements_html | 27 | field | txns | R-STMT-TXN | yes |
| creastmt_statements_html | 28 | field | add3 | R-STMT-ADDR | yes |
