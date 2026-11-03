# Score: `runs/rerun/posttran_harness_opus/r2/out/base` vs `golden/v1`

- Equivalence (strict): **74.15%** · business: **74.15%** of 468 records
- Divergent records: 121 (silent 0, flagged 121)
- Flags raised: 34 (unneeded 21) · volatile fields masked: {'posttran_transact.proc_ts': 259}

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| posttran_transact | 262 | 274 | 259 | 259 |
| posttran_dalyrejs | 38 | 26 | 0 | 0 |
| posttran_acctdata | 50 | 50 | 0 | 0 |
| posttran_tcatbal | 100 | 100 | 88 | 88 |

| Rule | silent | flagged |
|---|---|---|
| R-POST-102 | 0 | 53 |
| R-POST-6 | 0 | 6 |
| R-POST-BAL | 0 | 112 |
| R-POST-TCAT | 0 | 12 |

First 40 divergences:

| output | key | kind | field | golden | candidate | rule | flagged |
|---|---|---|---|---|---|---|---|
| posttran_transact | 0000000107748365 | missing |  |  |  | R-POST-6 | yes |
| posttran_transact | 0000000211219588 | missing |  |  |  | R-POST-6 | yes |
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
| posttran_transact | 0000000822135100 | missing |  |  |  | R-POST-6 | yes |
| posttran_transact | 0000000823157599 | extra |  |  |  | R-POST-102 | yes |
| posttran_transact | 0000000873232405 | extra |  |  |  | R-POST-102 | yes |
| posttran_transact | 0000000887771179 | extra |  |  |  | R-POST-102 | yes |
| posttran_transact | 0000000910081354 | extra |  |  |  | R-POST-102 | yes |
| posttran_transact | 0000000961186055 | extra |  |  |  | R-POST-102 | yes |
| posttran_dalyrejs | 0000000040455859 | field | reason | 102 | 6 | R-POST-102 | yes |
| posttran_dalyrejs | 0000000040455859 | field | reason_desc | OVERLIMIT TRANSACTION | CREDIT LIMIT EXCEEDED | R-POST-COPY | yes |
| posttran_dalyrejs | 0000000107748365 | extra |  |  |  | R-POST-6 | yes |
| posttran_dalyrejs | 0000000108402349 | field | reason | 102 | 6 | R-POST-102 | yes |
| posttran_dalyrejs | 0000000108402349 | field | reason_desc | OVERLIMIT TRANSACTION | CREDIT LIMIT EXCEEDED | R-POST-COPY | yes |
| posttran_dalyrejs | 0000000111054243 | field | reason | 102 | 6 | R-POST-102 | yes |
| posttran_dalyrejs | 0000000111054243 | field | reason_desc | OVERLIMIT TRANSACTION | CREDIT LIMIT EXCEEDED | R-POST-COPY | yes |
| posttran_dalyrejs | 0000000148803688 | field | reason | 102 | 6 | R-POST-102 | yes |
| posttran_dalyrejs | 0000000148803688 | field | reason_desc | OVERLIMIT TRANSACTION | CREDIT LIMIT EXCEEDED | R-POST-COPY | yes |
| posttran_dalyrejs | 0000000183226769 | field | reason | 102 | 6 | R-POST-102 | yes |
| posttran_dalyrejs | 0000000183226769 | field | reason_desc | OVERLIMIT TRANSACTION | CREDIT LIMIT EXCEEDED | R-POST-COPY | yes |
| posttran_dalyrejs | 0000000211219588 | extra |  |  |  | R-POST-6 | yes |
| posttran_dalyrejs | 0000000220001505 | field | reason | 102 | 6 | R-POST-102 | yes |
| posttran_dalyrejs | 0000000220001505 | field | reason_desc | OVERLIMIT TRANSACTION | CREDIT LIMIT EXCEEDED | R-POST-COPY | yes |
| posttran_dalyrejs | 0000000252891459 | field | reason | 102 | 6 | R-POST-102 | yes |
| posttran_dalyrejs | 0000000252891459 | field | reason_desc | OVERLIMIT TRANSACTION | CREDIT LIMIT EXCEEDED | R-POST-COPY | yes |
| posttran_dalyrejs | 0000000277916619 | field | reason | 102 | 6 | R-POST-102 | yes |
| posttran_dalyrejs | 0000000277916619 | field | reason_desc | OVERLIMIT TRANSACTION | CREDIT LIMIT EXCEEDED | R-POST-COPY | yes |
| posttran_dalyrejs | 0000000329446511 | field | reason | 102 | 6 | R-POST-102 | yes |
| posttran_dalyrejs | 0000000329446511 | field | reason_desc | OVERLIMIT TRANSACTION | CREDIT LIMIT EXCEEDED | R-POST-COPY | yes |
| posttran_dalyrejs | 0000000424689871 | missing |  |  |  | R-POST-102 | yes |
| posttran_dalyrejs | 0000000502617711 | missing |  |  |  | R-POST-102 | yes |
