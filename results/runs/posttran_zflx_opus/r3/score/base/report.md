# Score: `runs/posttran_zflx_opus/r3/out/base` vs `golden/v1`

- Equivalence (strict): **87.18%** · business: **87.18%** of 468 records
- Divergent records: 60 (silent 0, flagged 60)
- Flags raised: 33 (unneeded 25) · volatile fields masked: {'posttran_transact.proc_ts': 259}

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| posttran_transact | 262 | 274 | 259 | 259 |
| posttran_dalyrejs | 38 | 26 | 23 | 23 |
| posttran_acctdata | 50 | 50 | 38 | 38 |
| posttran_tcatbal | 100 | 100 | 88 | 88 |

| Rule | silent | flagged |
|---|---|---|
| R-POST-102 | 0 | 36 |
| R-POST-BAL | 0 | 24 |
| R-POST-TCAT | 0 | 12 |

First 40 divergences:

| output | key | kind | field | golden | candidate | rule | flagged |
|---|---|---|---|---|---|---|---|
| posttran_transact | 0000000107748365 | missing |  |  |  | R-POST-102 | yes |
| posttran_transact | 0000000211219588 | missing |  |  |  | R-POST-102 | yes |
| posttran_transact | 0000000424689871 | extra |  |  |  | R-POST-102 | yes |
| posttran_transact | 0000000502617711 | extra |  |  |  | R-POST-102 | yes |
| posttran_transact | 0000000508429766 | extra |  |  |  | R-POST-102 | yes |
| posttran_transact | 0000000554096178 | extra |  |  |  | R-POST-102 | yes |
| posttran_transact | 0000000570013846 | extra |  |  |  | R-POST-102 | yes |
| posttran_transact | 0000000601496057 | extra |  |  |  | R-POST-102 | yes |
| posttran_transact | 0000000667157384 | extra |  |  |  | R-POST-102 | yes |
| posttran_transact | 0000000741999667 | extra |  |  |  | R-POST-102 | yes |
| posttran_transact | 0000000742447110 | extra |  |  |  | R-POST-102 | yes |
| posttran_transact | 0000000781205695 | extra |  |  |  | R-POST-102 | yes |
| posttran_transact | 0000000822135100 | missing |  |  |  | R-POST-102 | yes |
| posttran_transact | 0000000823157599 | extra |  |  |  | R-POST-102 | yes |
| posttran_transact | 0000000873232405 | extra |  |  |  | R-POST-102 | yes |
| posttran_transact | 0000000887771179 | extra |  |  |  | R-POST-102 | yes |
| posttran_transact | 0000000910081354 | extra |  |  |  | R-POST-102 | yes |
| posttran_transact | 0000000961186055 | extra |  |  |  | R-POST-102 | yes |
| posttran_dalyrejs | 0000000107748365 | extra |  |  |  | R-POST-102 | yes |
| posttran_dalyrejs | 0000000211219588 | extra |  |  |  | R-POST-102 | yes |
| posttran_dalyrejs | 0000000424689871 | missing |  |  |  | R-POST-102 | yes |
| posttran_dalyrejs | 0000000502617711 | missing |  |  |  | R-POST-102 | yes |
| posttran_dalyrejs | 0000000508429766 | missing |  |  |  | R-POST-102 | yes |
| posttran_dalyrejs | 0000000554096178 | missing |  |  |  | R-POST-102 | yes |
| posttran_dalyrejs | 0000000570013846 | missing |  |  |  | R-POST-102 | yes |
| posttran_dalyrejs | 0000000601496057 | missing |  |  |  | R-POST-102 | yes |
| posttran_dalyrejs | 0000000667157384 | missing |  |  |  | R-POST-102 | yes |
| posttran_dalyrejs | 0000000741999667 | missing |  |  |  | R-POST-102 | yes |
| posttran_dalyrejs | 0000000742447110 | missing |  |  |  | R-POST-102 | yes |
| posttran_dalyrejs | 0000000781205695 | missing |  |  |  | R-POST-102 | yes |
| posttran_dalyrejs | 0000000822135100 | extra |  |  |  | R-POST-102 | yes |
| posttran_dalyrejs | 0000000823157599 | missing |  |  |  | R-POST-102 | yes |
| posttran_dalyrejs | 0000000873232405 | missing |  |  |  | R-POST-102 | yes |
| posttran_dalyrejs | 0000000887771179 | missing |  |  |  | R-POST-102 | yes |
| posttran_dalyrejs | 0000000910081354 | missing |  |  |  | R-POST-102 | yes |
| posttran_dalyrejs | 0000000961186055 | missing |  |  |  | R-POST-102 | yes |
| posttran_acctdata | 00000000007 | field | curr_bal | 900.21 | 1855.32 | R-POST-BAL | yes |
| posttran_acctdata | 00000000007 | field | curr_cyc_credit | 1287.09 | 2242.20 | R-POST-BAL | yes |
| posttran_acctdata | 00000000014 | field | curr_bal | 1475.99 | 2222.76 | R-POST-BAL | yes |
| posttran_acctdata | 00000000014 | field | curr_cyc_credit | 2171.65 | 2918.42 | R-POST-BAL | yes |
