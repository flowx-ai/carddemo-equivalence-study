# Score: `runs/posttran_harness_opus/r1/out/c01` vs `golden/v1/cases/c01/out`

- Equivalence (strict): **72.38%** · business: **72.38%** of 478 records
- Divergent records: 132 (silent 0, flagged 132)
- Flags raised: 33 (unneeded 15) · volatile fields masked: {'posttran_transact.proc_ts': 261}

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| posttran_transact | 265 | 278 | 261 | 261 |
| posttran_dalyrejs | 42 | 29 | 0 | 0 |
| posttran_acctdata | 50 | 50 | 0 | 0 |
| posttran_tcatbal | 100 | 100 | 85 | 85 |

| Rule | silent | flagged |
|---|---|---|
| R-POST-100 | 0 | 1 |
| R-POST-102 | 0 | 55 |
| R-POST-103 | 0 | 3 |
| R-POST-7 | 0 | 8 |
| R-POST-BAL | 0 | 115 |
| R-POST-TCAT | 0 | 15 |

First 40 divergences:

| output | key | kind | field | golden | candidate | rule | flagged |
|---|---|---|---|---|---|---|---|
| posttran_transact | 0000000107748365 | missing |  |  |  | R-POST-7 | yes |
| posttran_transact | 0000000211219588 | missing |  |  |  | R-POST-7 | yes |
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
| posttran_transact | 0000000822135100 | missing |  |  |  | R-POST-7 | yes |
| posttran_transact | 0000000823157599 | extra |  |  |  | R-POST-102 | yes |
| posttran_transact | 0000000873232405 | extra |  |  |  | R-POST-102 | yes |
| posttran_transact | 0000000887771179 | extra |  |  |  | R-POST-102 | yes |
| posttran_transact | 0000000910081354 | extra |  |  |  | R-POST-102 | yes |
| posttran_transact | 0000000961186055 | extra |  |  |  | R-POST-102 | yes |
| posttran_transact | C01T000000000003 | extra |  |  |  | R-POST-103 | yes |
| posttran_transact | C01T000000000006 | missing |  |  |  | R-POST-7 | yes |
| posttran_transact | C01T000000000007 | extra |  |  |  | R-POST-102 | yes |
| posttran_dalyrejs | 0000000040455859 | field | reason | 102 | 7 | R-POST-102 | yes |
| posttran_dalyrejs | 0000000040455859 | field | reason_desc | OVERLIMIT TRANSACTION | Available credit exceeded | R-POST-COPY | yes |
| posttran_dalyrejs | 0000000107748365 | extra |  |  |  | R-POST-7 | yes |
| posttran_dalyrejs | 0000000108402349 | field | reason | 102 | 7 | R-POST-102 | yes |
| posttran_dalyrejs | 0000000108402349 | field | reason_desc | OVERLIMIT TRANSACTION | Available credit exceeded | R-POST-COPY | yes |
| posttran_dalyrejs | 0000000111054243 | field | reason | 102 | 7 | R-POST-102 | yes |
| posttran_dalyrejs | 0000000111054243 | field | reason_desc | OVERLIMIT TRANSACTION | Available credit exceeded | R-POST-COPY | yes |
| posttran_dalyrejs | 0000000148803688 | field | reason | 102 | 7 | R-POST-102 | yes |
| posttran_dalyrejs | 0000000148803688 | field | reason_desc | OVERLIMIT TRANSACTION | Available credit exceeded | R-POST-COPY | yes |
| posttran_dalyrejs | 0000000183226769 | field | reason | 102 | 7 | R-POST-102 | yes |
| posttran_dalyrejs | 0000000183226769 | field | reason_desc | OVERLIMIT TRANSACTION | Available credit exceeded | R-POST-COPY | yes |
| posttran_dalyrejs | 0000000211219588 | extra |  |  |  | R-POST-7 | yes |
| posttran_dalyrejs | 0000000220001505 | field | reason | 102 | 7 | R-POST-102 | yes |
| posttran_dalyrejs | 0000000220001505 | field | reason_desc | OVERLIMIT TRANSACTION | Available credit exceeded | R-POST-COPY | yes |
| posttran_dalyrejs | 0000000252891459 | field | reason | 102 | 7 | R-POST-102 | yes |
| posttran_dalyrejs | 0000000252891459 | field | reason_desc | OVERLIMIT TRANSACTION | Available credit exceeded | R-POST-COPY | yes |
| posttran_dalyrejs | 0000000277916619 | field | reason | 102 | 7 | R-POST-102 | yes |
| posttran_dalyrejs | 0000000277916619 | field | reason_desc | OVERLIMIT TRANSACTION | Available credit exceeded | R-POST-COPY | yes |
| posttran_dalyrejs | 0000000329446511 | field | reason | 102 | 7 | R-POST-102 | yes |
