# Score: `runs/a21/zflx/dr8/r2/out/c03` vs `golden/v1/cases/c03/out`

- Equivalence (strict): **84.45%** · business: **84.45%** of 476 records
- Divergent records: 74 (silent 0, flagged 74)
- Flags raised: 14 (unneeded 9) · volatile fields masked: {'posttran_transact.proc_ts': 247}

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| posttran_transact | 262 | 257 | 247 | 247 |
| posttran_dalyrejs | 39 | 44 | 29 | 29 |
| posttran_acctdata | 50 | 50 | 38 | 38 |
| posttran_tcatbal | 100 | 100 | 88 | 88 |

| Rule | silent | flagged |
|---|---|---|
| R-POST-102 | 0 | 50 |
| R-POST-BAL | 0 | 24 |
| R-POST-TCAT | 0 | 12 |

First 40 divergences:

| output | key | kind | field | golden | candidate | rule | flagged |
|---|---|---|---|---|---|---|---|
| posttran_transact | 0000000010229018 | missing |  |  |  | R-POST-102 | yes |
| posttran_transact | 0000000032979555 | missing |  |  |  | R-POST-102 | yes |
| posttran_transact | 0000000051205286 | missing |  |  |  | R-POST-102 | yes |
| posttran_transact | 0000000060921254 | missing |  |  |  | R-POST-102 | yes |
| posttran_transact | 0000000107748365 | missing |  |  |  | R-POST-102 | yes |
| posttran_transact | 0000000109340521 | missing |  |  |  | R-POST-102 | yes |
| posttran_transact | 0000000160469204 | missing |  |  |  | R-POST-102 | yes |
| posttran_transact | 0000000173069364 | missing |  |  |  | R-POST-102 | yes |
| posttran_transact | 0000000211219588 | missing |  |  |  | R-POST-102 | yes |
| posttran_transact | 0000000220745261 | missing |  |  |  | R-POST-102 | yes |
| posttran_transact | 0000000224060323 | missing |  |  |  | R-POST-102 | yes |
| posttran_transact | 0000000273137276 | missing |  |  |  | R-POST-102 | yes |
| posttran_transact | 0000000329446511 | extra |  |  |  | R-POST-102 | yes |
| posttran_transact | 0000000341155503 | missing |  |  |  | R-POST-102 | yes |
| posttran_transact | 0000000373973344 | missing |  |  |  | R-POST-102 | yes |
| posttran_transact | 0000000499424514 | missing |  |  |  | R-POST-102 | yes |
| posttran_transact | 0000000523110055 | extra |  |  |  | R-POST-102 | yes |
| posttran_transact | 0000000564257675 | extra |  |  |  | R-POST-102 | yes |
| posttran_transact | 0000000575834812 | extra |  |  |  | R-POST-102 | yes |
| posttran_transact | 0000000667157384 | extra |  |  |  | R-POST-102 | yes |
| posttran_transact | 0000000742447110 | extra |  |  |  | R-POST-102 | yes |
| posttran_transact | 0000000781205695 | extra |  |  |  | R-POST-102 | yes |
| posttran_transact | 0000000873232405 | extra |  |  |  | R-POST-102 | yes |
| posttran_transact | 0000000887771179 | extra |  |  |  | R-POST-102 | yes |
| posttran_transact | 0000000910081354 | extra |  |  |  | R-POST-102 | yes |
| posttran_dalyrejs | 0000000010229018 | extra |  |  |  | R-POST-102 | yes |
| posttran_dalyrejs | 0000000032979555 | extra |  |  |  | R-POST-102 | yes |
| posttran_dalyrejs | 0000000051205286 | extra |  |  |  | R-POST-102 | yes |
| posttran_dalyrejs | 0000000060921254 | extra |  |  |  | R-POST-102 | yes |
| posttran_dalyrejs | 0000000107748365 | extra |  |  |  | R-POST-102 | yes |
| posttran_dalyrejs | 0000000109340521 | extra |  |  |  | R-POST-102 | yes |
| posttran_dalyrejs | 0000000160469204 | extra |  |  |  | R-POST-102 | yes |
| posttran_dalyrejs | 0000000173069364 | extra |  |  |  | R-POST-102 | yes |
| posttran_dalyrejs | 0000000211219588 | extra |  |  |  | R-POST-102 | yes |
| posttran_dalyrejs | 0000000220745261 | extra |  |  |  | R-POST-102 | yes |
| posttran_dalyrejs | 0000000224060323 | extra |  |  |  | R-POST-102 | yes |
| posttran_dalyrejs | 0000000273137276 | extra |  |  |  | R-POST-102 | yes |
| posttran_dalyrejs | 0000000329446511 | missing |  |  |  | R-POST-102 | yes |
| posttran_dalyrejs | 0000000341155503 | extra |  |  |  | R-POST-102 | yes |
| posttran_dalyrejs | 0000000373973344 | extra |  |  |  | R-POST-102 | yes |
