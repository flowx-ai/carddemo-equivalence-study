# Score: `runs/a19h/a16/posttran_harness_sonnet/r3/out/c03` vs `golden/cr2/cases/c03/out`

- Equivalence (strict): **0.00%** · business: **0.00%** of 451 records
- Divergent records: 451 (silent 186, flagged 265)
- Flags raised: 6 (unneeded 5) · volatile fields masked: none differed

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| posttran_transact | 265 | 0 | 0 | 0 |
| posttran_dalyrejs | 36 | 0 | 0 | 0 |
| posttran_acctdata | 50 | 0 | 0 | 0 |
| posttran_tcatbal | 100 | 0 | 0 | 0 |

| Rule | silent | flagged |
|---|---|---|
| R-PASSTHRU | 50 | 0 |
| R-POST-101 | 1 | 0 |
| R-POST-102 | 35 | 0 |
| R-POST-TCAT | 100 | 0 |
| R-POST-WRITE | 0 | 265 |

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
| posttran_transact | 0000000111054243 | missing |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000115716061 | missing |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000130111733 | missing |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000132831571 | missing |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000137879630 | missing |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000139910093 | missing |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000142315472 | missing |  |  |  | R-POST-WRITE | yes |
| posttran_transact | 0000000143386237 | missing |  |  |  | R-POST-WRITE | yes |
