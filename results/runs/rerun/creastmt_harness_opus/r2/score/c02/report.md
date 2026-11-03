# Layer 1 score: `runs/rerun/creastmt_harness_opus/r2/out/c02` vs `golden/v1/cases/c02/out`

- Equivalence (strict): **0.00%** · business: **46.00%** of 100 units
- Divergent units: 54 (silent 0, flagged 54)
- Flags raised: 53 (unneeded 28)
- Layout (not part of equivalence): {"creastmt_statements": {"line_match": 0.145}, "creastmt_statements_html": {"line_match": 0.1892}}
- Excluded from equivalence (S4, overflow statements): 0 units, 0 differing

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| creastmt_statements | 50 | 50 | 0 | 26 |
| creastmt_statements_html | 50 | 50 | 0 | 20 |

| Rule | silent | flagged |
|---|---|---|
| R-STMT-ADDR | 0 | 48 |
| R-STMT-NAME | 0 | 1 |
| R-STMT-TXN | 0 | 10 |

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
| creastmt_statements_html | 12 | field | txns | R-STMT-TXN | yes |
| creastmt_statements_html | 14 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements_html | 15 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements_html | 17 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements_html | 19 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements_html | 19 | field | txns | R-STMT-TXN | yes |
| creastmt_statements_html | 2 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements_html | 21 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements_html | 24 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements_html | 25 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements_html | 27 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements_html | 27 | field | txns | R-STMT-TXN | yes |
| creastmt_statements_html | 28 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements_html | 29 | field | txns | R-STMT-TXN | yes |
| creastmt_statements_html | 3 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements_html | 31 | field | name | R-STMT-NAME | yes |
