# Score: `runs/a21/zflx/va7/r3/out/c02` vs `golden/v1/cases/c02/out`

- Equivalence (strict): **72.67%** · business: **72.67%** of 483 records
- Divergent records: 132 (silent 66, flagged 66)
- Flags raised: 9 (unneeded 5) · volatile fields masked: {'posttran_transact.proc_ts': 229}

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| posttran_transact | 262 | 229 | 229 | 229 |
| posttran_dalyrejs | 38 | 71 | 38 | 38 |
| posttran_acctdata | 50 | 50 | 17 | 17 |
| posttran_tcatbal | 100 | 100 | 67 | 67 |

| Rule | silent | flagged |
|---|---|---|
| R-POST-104 | 66 | 0 |
| R-POST-BAL | 0 | 66 |
| R-POST-TCAT | 0 | 33 |

First 40 divergences:

| output | key | kind | field | golden | candidate | rule | flagged |
|---|---|---|---|---|---|---|---|
| posttran_transact | 0000000312439873 | missing |  |  |  | R-POST-104 | no |
| posttran_transact | 0000000585883106 | missing |  |  |  | R-POST-104 | no |
| posttran_transact | 0000000603071214 | missing |  |  |  | R-POST-104 | no |
| posttran_transact | 0000000635121182 | missing |  |  |  | R-POST-104 | no |
| posttran_transact | 0000000669905307 | missing |  |  |  | R-POST-104 | no |
| posttran_transact | 0000000703553020 | missing |  |  |  | R-POST-104 | no |
| posttran_transact | 0000000749493129 | missing |  |  |  | R-POST-104 | no |
| posttran_transact | 0000000751145919 | missing |  |  |  | R-POST-104 | no |
| posttran_transact | 0000000751696292 | missing |  |  |  | R-POST-104 | no |
| posttran_transact | 0000000760577632 | missing |  |  |  | R-POST-104 | no |
| posttran_transact | 0000000762269241 | missing |  |  |  | R-POST-104 | no |
| posttran_transact | 0000000772421231 | missing |  |  |  | R-POST-104 | no |
| posttran_transact | 0000000824152956 | missing |  |  |  | R-POST-104 | no |
| posttran_transact | 0000000838587312 | missing |  |  |  | R-POST-104 | no |
| posttran_transact | 0000000845039454 | missing |  |  |  | R-POST-104 | no |
| posttran_transact | 0000000874953803 | missing |  |  |  | R-POST-104 | no |
| posttran_transact | 0000000882360848 | missing |  |  |  | R-POST-104 | no |
| posttran_transact | 0000000898285002 | missing |  |  |  | R-POST-104 | no |
| posttran_transact | 0000000899241176 | missing |  |  |  | R-POST-104 | no |
| posttran_transact | 0000000903281896 | missing |  |  |  | R-POST-104 | no |
| posttran_transact | 0000000909001545 | missing |  |  |  | R-POST-104 | no |
| posttran_transact | 0000000926624843 | missing |  |  |  | R-POST-104 | no |
| posttran_transact | 0000000942960329 | missing |  |  |  | R-POST-104 | no |
| posttran_transact | 0000000943918566 | missing |  |  |  | R-POST-104 | no |
| posttran_transact | 0000000956474921 | missing |  |  |  | R-POST-104 | no |
| posttran_transact | 0000000957695517 | missing |  |  |  | R-POST-104 | no |
| posttran_transact | 0000000957864065 | missing |  |  |  | R-POST-104 | no |
| posttran_transact | 0000000961714986 | missing |  |  |  | R-POST-104 | no |
| posttran_transact | 0000000973907278 | missing |  |  |  | R-POST-104 | no |
| posttran_transact | 0000000974167587 | missing |  |  |  | R-POST-104 | no |
| posttran_transact | 0000000976770816 | missing |  |  |  | R-POST-104 | no |
| posttran_transact | 0000000982241353 | missing |  |  |  | R-POST-104 | no |
| posttran_transact | 0000000996722787 | missing |  |  |  | R-POST-104 | no |
| posttran_dalyrejs | 0000000312439873 | extra |  |  |  | R-POST-104 | no |
| posttran_dalyrejs | 0000000585883106 | extra |  |  |  | R-POST-104 | no |
| posttran_dalyrejs | 0000000603071214 | extra |  |  |  | R-POST-104 | no |
| posttran_dalyrejs | 0000000635121182 | extra |  |  |  | R-POST-104 | no |
| posttran_dalyrejs | 0000000669905307 | extra |  |  |  | R-POST-104 | no |
| posttran_dalyrejs | 0000000703553020 | extra |  |  |  | R-POST-104 | no |
| posttran_dalyrejs | 0000000749493129 | extra |  |  |  | R-POST-104 | no |
