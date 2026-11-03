# Layer 1 score: `runs/rerun/creastmt_harness_opus/r1/out/c04` vs `golden/v1/cases/c04/out`

- Equivalence (strict): **0.00%** · business: **51.02%** of 98 units
- Divergent units: 48 (silent 0, flagged 48)
- Flags raised: 46 (unneeded 40)
- Layout (not part of equivalence): {"creastmt_statements": {"line_match": 0.1874}, "creastmt_statements_html": {"line_match": 0.304}}
- Excluded from equivalence (S4, overflow statements): 2 units, 2 differing; creastmt_statements 5: total, txns; creastmt_statements_html 5: txns

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| creastmt_statements | 49 | 49 | 0 | 25 |
| creastmt_statements_html | 49 | 49 | 0 | 25 |

| Rule | silent | flagged |
|---|---|---|
| R-STMT-ADDR | 0 | 48 |

First 40 divergences:

| output | key | kind | field | rule | flagged |
|---|---|---|---|---|---|
| creastmt_statements | 14 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 15 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 17 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 19 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 2 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 21 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 24 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 25 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 27 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 28 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 3 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 34 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 36 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 38 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 39 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 4 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 41 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 43 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 44 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 47 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 50 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 6 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 8 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 9 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements_html | 14 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements_html | 15 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements_html | 17 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements_html | 19 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements_html | 2 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements_html | 21 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements_html | 24 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements_html | 25 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements_html | 27 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements_html | 28 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements_html | 3 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements_html | 34 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements_html | 36 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements_html | 38 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements_html | 39 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements_html | 4 | field | add3 | R-STMT-ADDR | yes |
