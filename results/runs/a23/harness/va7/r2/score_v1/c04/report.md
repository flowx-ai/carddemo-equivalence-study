# Score: `runs/a23/harness/va7/r2/out/c04` vs `golden/v1/cases/c04/out`

- Equivalence (strict): **17.01%** · business: **17.01%** of 723 records
- Divergent records: 600 (silent 70, flagged 530)
- Flags raised: 23 (unneeded 8) · volatile fields masked: none differed

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| posttran_transact | 266 | 231 | 0 | 0 |
| posttran_dalyrejs | 38 | 73 | 38 | 38 |
| posttran_acctdata | 50 | 50 | 17 | 17 |
| posttran_tcatbal | 103 | 101 | 68 | 68 |

| Rule | silent | flagged |
|---|---|---|
| R-POST-104 | 70 | 0 |
| R-POST-BAL | 0 | 66 |
| R-POST-TCAT | 0 | 35 |
| R-POST-WRITE | 0 | 462 |

First 40 divergences:

| output | key | kind | field | golden | candidate | rule | flagged |
|---|---|---|---|---|---|---|---|
| posttran_transact | 0000000000000001 | extra |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000000000002 | extra |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000000000003 | extra |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000000000004 | extra |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000000000005 | extra |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000000000006 | extra |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000000000007 | extra |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000000000008 | extra |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000000000009 | extra |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000000000010 | extra |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000000000011 | extra |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000000000012 | extra |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000000000013 | extra |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000000000014 | extra |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000000000015 | extra |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000000000016 | extra |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000000000017 | extra |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000000000018 | extra |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000000000019 | extra |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000000000020 | extra |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000000000021 | extra |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000000000022 | extra |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000000000023 | extra |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000000000024 | extra |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000000000025 | extra |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000000000026 | extra |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000000000027 | extra |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000000000028 | extra |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000000000029 | extra |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000000000030 | extra |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000000000031 | extra |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000000000032 | extra |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000000000033 | extra |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000000000034 | extra |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000000000035 | extra |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000000000036 | extra |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000000000037 | extra |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000000000038 | extra |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000000000039 | extra |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000000000040 | extra |  |  |  | R-POST-WRITE | yes |
