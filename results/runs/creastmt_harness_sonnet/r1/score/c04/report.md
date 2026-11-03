# Layer 1 score: `runs/creastmt_harness_sonnet/r1/out/c04` vs `golden/v1/cases/c04/out`

- Equivalence (strict): **0.00%** · business: **0.00%** of 98 units
- Divergent units: 98 (silent 0, flagged 98)
- Flags raised: 28 (unneeded 12)
- Layout (not part of equivalence): {"creastmt_statements": {"line_match": 0.7984}, "creastmt_statements_html": {"line_match": 0.9377}}
- Excluded from equivalence (S4, overflow statements): 2 units, 2 differing; creastmt_statements 5: add3, fico, total, txns; creastmt_statements_html 5: add3, fico, txns

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| creastmt_statements | 49 | 49 | 0 | 0 |
| creastmt_statements_html | 49 | 49 | 0 | 0 |

| Rule | silent | flagged |
|---|---|---|
| R-STMT-ADDR | 0 | 98 |
| R-STMT-FICO | 0 | 98 |
| R-STMT-NAME | 0 | 1 |
| R-STMT-TXN | 0 | 10 |

First 40 divergences:

| output | key | kind | field | rule | flagged |
|---|---|---|---|---|---|
| creastmt_statements | 1 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 1 | field | fico | R-STMT-FICO | yes |
| creastmt_statements | 10 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 10 | field | fico | R-STMT-FICO | yes |
| creastmt_statements | 11 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 11 | field | fico | R-STMT-FICO | yes |
| creastmt_statements | 12 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 12 | field | fico | R-STMT-FICO | yes |
| creastmt_statements | 13 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 13 | field | fico | R-STMT-FICO | yes |
| creastmt_statements | 14 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 14 | field | fico | R-STMT-FICO | yes |
| creastmt_statements | 15 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 15 | field | fico | R-STMT-FICO | yes |
| creastmt_statements | 16 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 16 | field | fico | R-STMT-FICO | yes |
| creastmt_statements | 17 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 17 | field | fico | R-STMT-FICO | yes |
| creastmt_statements | 18 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 18 | field | fico | R-STMT-FICO | yes |
| creastmt_statements | 19 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 19 | field | fico | R-STMT-FICO | yes |
| creastmt_statements | 2 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 2 | field | fico | R-STMT-FICO | yes |
| creastmt_statements | 20 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 20 | field | fico | R-STMT-FICO | yes |
| creastmt_statements | 21 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 21 | field | fico | R-STMT-FICO | yes |
| creastmt_statements | 22 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 22 | field | fico | R-STMT-FICO | yes |
| creastmt_statements | 23 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 23 | field | fico | R-STMT-FICO | yes |
| creastmt_statements | 24 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 24 | field | fico | R-STMT-FICO | yes |
| creastmt_statements | 25 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 25 | field | fico | R-STMT-FICO | yes |
| creastmt_statements | 26 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 26 | field | fico | R-STMT-FICO | yes |
| creastmt_statements | 27 | field | add3 | R-STMT-ADDR | yes |
| creastmt_statements | 27 | field | fico | R-STMT-FICO | yes |
