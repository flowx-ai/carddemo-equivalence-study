# Score: `runs/a21/harness/va7/r1/out/c03` vs `golden/v1/cases/c03/out`

- Equivalence (strict): **3.33%** · business: **3.33%** of 451 records
- Divergent records: 436 (silent 25, flagged 411)
- Flags raised: 13 (unneeded 4) · volatile fields masked: none differed

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| posttran_transact | 262 | 0 | 0 | 0 |
| posttran_dalyrejs | 39 | 14 | 14 | 14 |
| posttran_acctdata | 50 | 50 | 0 | 0 |
| posttran_tcatbal | 100 | 50 | 1 | 1 |

| Rule | silent | flagged |
|---|---|---|
| R-POST-102 | 25 | 0 |
| R-POST-BAL | 0 | 149 |
| R-POST-TCAT | 0 | 99 |
| R-POST-WRITE | 0 | 262 |

First 40 divergences:

| output | key | kind | field | golden | candidate | rule | flagged |
|---|---|---|---|---|---|---|---|
| posttran_transact | 0000000000683580 | missing |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000001774260 | missing |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000006292564 | missing |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000009101861 | missing |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000010142252 | missing |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000010229018 | missing |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000016259484 | missing |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000017874199 | missing |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000019065428 | missing |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000021711604 | missing |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000025430891 | missing |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000028097268 | missing |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000030755266 | missing |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000032979555 | missing |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000033688127 | missing |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000043636099 | missing |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000051205286 | missing |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000054288996 | missing |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000054727064 | missing |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000058866561 | missing |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000060921254 | missing |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000061394789 | missing |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000070754800 | missing |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000072220498 | missing |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000084515950 | missing |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000085824369 | missing |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000095706092 | missing |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000099965527 | missing |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000100915314 | missing |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000107748365 | missing |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000109340521 | missing |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000109506921 | missing |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000115716061 | missing |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000130111733 | missing |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000132831571 | missing |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000137879630 | missing |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000139910093 | missing |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000142315472 | missing |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000143386237 | missing |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000152467982 | missing |  |  |  | R-POST-WRITE | yes |
