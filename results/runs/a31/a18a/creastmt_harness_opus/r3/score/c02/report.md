# Layer 1 score: `runs/a31/a18a/creastmt_harness_opus/r3/out/c02` vs `golden/v1/cases/c02/out`

- Equivalence (strict): **0.00%** · business: **26.00%** of 100 units
- Divergent units: 74 (silent 0, flagged 74)
- Flags raised: 42 (unneeded 32)
- Layout (not part of equivalence): {"creastmt_statements": {"line_match": 0.145}, "creastmt_statements_html": {"line_match": 0.1977}}
- Excluded from equivalence (S4, overflow statements): 0 units, 0 differing

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| creastmt_statements | 50 | 50 | 0 | 26 |
| creastmt_statements_html | 50 | 50 | 0 | 0 |

| Rule | silent | flagged |
|---|---|---|
| R-STMT-ADDR | 0 | 174 |
| R-STMT-NAME | 0 | 50 |

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
| creastmt_statements_html | 1 | field | name | R-STMT-NAME | yes |
| creastmt_statements_html | 1 | field | add1 | R-STMT-ADDR | yes |
| creastmt_statements_html | 1 | field | add2 | R-STMT-ADDR | yes |
| creastmt_statements_html | 1 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements_html | 10 | field | name | R-STMT-NAME | yes |
| creastmt_statements_html | 10 | field | add1 | R-STMT-ADDR | yes |
| creastmt_statements_html | 10 | field | add2 | R-STMT-ADDR | yes |
| creastmt_statements_html | 10 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements_html | 11 | field | name | R-STMT-NAME | yes |
| creastmt_statements_html | 11 | field | add1 | R-STMT-ADDR | yes |
| creastmt_statements_html | 11 | field | add2 | R-STMT-ADDR | yes |
| creastmt_statements_html | 11 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements_html | 12 | field | name | R-STMT-NAME | yes |
| creastmt_statements_html | 12 | field | add1 | R-STMT-ADDR | yes |
| creastmt_statements_html | 12 | field | add2 | R-STMT-ADDR | yes |
| creastmt_statements_html | 12 | field | add3 | R-STMT-ADDR | yes |
