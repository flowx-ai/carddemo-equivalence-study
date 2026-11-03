# Score: `runs/posttran_zflx_opus/r2/out/c01` vs `golden/v1/cases/c01/out`

- Equivalence (strict): **84.73%** · business: **84.73%** of 478 records
- Divergent records: 73 (silent 0, flagged 73)
- Flags raised: 37 (unneeded 16) · volatile fields masked: {'posttran_transact.proc_ts': 261}

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| posttran_transact | 265 | 278 | 261 | 261 |
| posttran_dalyrejs | 42 | 29 | 24 | 24 |
| posttran_acctdata | 50 | 50 | 35 | 35 |
| posttran_tcatbal | 100 | 100 | 85 | 85 |

| Rule | silent | flagged |
|---|---|---|
| R-POST-102 | 0 | 40 |
| R-POST-103 | 0 | 2 |
| R-POST-BAL | 0 | 30 |
| R-POST-PRECEDENCE | 0 | 1 |
| R-POST-TCAT | 0 | 15 |

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
| posttran_transact | C01T000000000003 | extra |  |  |  | R-POST-103 | yes |
| posttran_transact | C01T000000000006 | missing |  |  |  | R-POST-102 | yes |
| posttran_transact | C01T000000000007 | extra |  |  |  | R-POST-102 | yes |
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
| posttran_dalyrejs | C01T000000000003 | missing |  |  |  | R-POST-103 | yes |
