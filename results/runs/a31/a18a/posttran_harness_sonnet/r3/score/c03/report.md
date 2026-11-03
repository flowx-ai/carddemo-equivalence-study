# Score: `runs/a31/a18a/posttran_harness_sonnet/r3/out/c03` vs `golden/v1/cases/c03/out`

- Equivalence (strict): **26.51%** · business: **26.51%** of 713 records
- Divergent records: 524 (silent 0, flagged 524)
- Flags raised: 25 (unneeded 18) · volatile fields masked: none differed

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| posttran_transact | 262 | 262 | 0 | 0 |
| posttran_dalyrejs | 39 | 39 | 39 | 39 |
| posttran_acctdata | 50 | 50 | 50 | 50 |
| posttran_tcatbal | 100 | 100 | 100 | 100 |

| Rule | silent | flagged |
|---|---|---|
| R-POST-WRITE | 0 | 524 |

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
