# Score: `runs/a23/harness/va7/r1/out/c04` vs `golden/cr4/cases/c04/out`

- Equivalence (strict): **99.12%** · business: **99.12%** of 457 records
- Divergent records: 4 (silent 0, flagged 4)
- Flags raised: 24 (unneeded 15) · volatile fields masked: {'posttran_transact.proc_ts': 231}

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| posttran_transact | 231 | 232 | 231 | 231 |
| posttran_dalyrejs | 73 | 72 | 72 | 72 |
| posttran_acctdata | 50 | 50 | 49 | 49 |
| posttran_tcatbal | 101 | 102 | 101 | 101 |

| Rule | silent | flagged |
|---|---|---|
| R-POST-104 | 0 | 2 |
| R-POST-BAL | 0 | 2 |
| R-POST-TCAT | 0 | 1 |

First 40 divergences:

| output | key | kind | field | golden | candidate | rule | flagged |
|---|---|---|---|---|---|---|---|
| posttran_transact | C04T000000000003 | extra |  |  |  | R-POST-104 | yes |
| posttran_dalyrejs | C04T000000000003 | missing |  |  |  | R-POST-104 | yes |
| posttran_acctdata | 00000000005 | field | curr_bal | 747.42 | 1047.42 | R-POST-BAL | yes |
| posttran_acctdata | 00000000005 | field | curr_cyc_credit | 831.41 | 1131.41 | R-POST-BAL | yes |
| posttran_tcatbal | 00000000005|04|0001 | extra |  |  |  | R-POST-TCAT | yes |
