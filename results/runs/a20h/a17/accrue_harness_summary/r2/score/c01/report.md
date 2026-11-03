# Score: `runs/a20h/a17/accrue_harness_summary/r2/out/c01` vs `runs/A5_golden/c01`

- Equivalence (strict): **49.00%** · business: **49.00%** of 100 records
- Divergent records: 51 (silent 1, flagged 50)
- Flags raised: 12 (unneeded 6) · volatile fields masked: {'intcalc_systran.orig_ts': 50, 'intcalc_systran.proc_ts': 50}

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| intcalc_acctdata | 50 | 50 | 49 | 49 |
| intcalc_systran | 50 | 50 | 0 | 0 |

| Rule | silent | flagged |
|---|---|---|
| R-INT-LAST | 3 | 0 |
| R-INT-TXID | 0 | 50 |

First 40 divergences:

| output | key | kind | field | golden | candidate | rule | flagged |
|---|---|---|---|---|---|---|---|
| intcalc_acctdata | 00000000050 | field | curr_bal | 1945.87 | 1964.64 | R-INT-LAST | no |
| intcalc_acctdata | 00000000050 | field | curr_cyc_credit | 1501.75 | 0.00 | R-INT-LAST | no |
| intcalc_acctdata | 00000000050 | field | curr_cyc_debit | -47.88 | 0.00 | R-INT-LAST | no |
| intcalc_systran | 0500024453765740#1 | field | tran_id | 2022071800000050 | 0000000000000050 | R-INT-TXID | yes |
| intcalc_systran | 0500024453765740#1 | field | source | Batch | LXB002C | R-INT-TXFORMAT | yes |
| intcalc_systran | 0500024453765740#1 | field | desc | Accrued int 00000000050 | Monthly interest | R-INT-TXFORMAT | yes |
| intcalc_systran | 0683586198171516#1 | field | tran_id | 2022071800000027 | 0000000000000027 | R-INT-TXID | yes |
| intcalc_systran | 0683586198171516#1 | field | source | Batch | LXB002C | R-INT-TXFORMAT | yes |
| intcalc_systran | 0683586198171516#1 | field | desc | Accrued int 00000000027 | Monthly interest | R-INT-TXFORMAT | yes |
| intcalc_systran | 0923877193247330#1 | field | tran_id | 2022071800000002 | 0000000000000002 | R-INT-TXID | yes |
| intcalc_systran | 0923877193247330#1 | field | source | Batch | LXB002C | R-INT-TXFORMAT | yes |
| intcalc_systran | 0923877193247330#1 | field | desc | Accrued int 00000000002 | Monthly interest | R-INT-TXFORMAT | yes |
| intcalc_systran | 0927987108636232#1 | field | tran_id | 2022071800000020 | 0000000000000020 | R-INT-TXID | yes |
| intcalc_systran | 0927987108636232#1 | field | source | Batch | LXB002C | R-INT-TXFORMAT | yes |
| intcalc_systran | 0927987108636232#1 | field | desc | Accrued int 00000000020 | Monthly interest | R-INT-TXFORMAT | yes |
| intcalc_systran | 0982496213629795#1 | field | tran_id | 2022071800000012 | 0000000000000012 | R-INT-TXID | yes |
| intcalc_systran | 0982496213629795#1 | field | source | Batch | LXB002C | R-INT-TXFORMAT | yes |
| intcalc_systran | 0982496213629795#1 | field | desc | Accrued int 00000000012 | Monthly interest | R-INT-TXFORMAT | yes |
| intcalc_systran | 1014086565224350#1 | field | tran_id | 2022071800000044 | 0000000000000044 | R-INT-TXID | yes |
| intcalc_systran | 1014086565224350#1 | field | source | Batch | LXB002C | R-INT-TXFORMAT | yes |
| intcalc_systran | 1014086565224350#1 | field | desc | Accrued int 00000000044 | Monthly interest | R-INT-TXFORMAT | yes |
| intcalc_systran | 1142167692878931#1 | field | tran_id | 2022071800000037 | 0000000000000037 | R-INT-TXID | yes |
| intcalc_systran | 1142167692878931#1 | field | source | Batch | LXB002C | R-INT-TXFORMAT | yes |
| intcalc_systran | 1142167692878931#1 | field | desc | Accrued int 00000000037 | Monthly interest | R-INT-TXFORMAT | yes |
| intcalc_systran | 1561409106491600#1 | field | tran_id | 2022071800000035 | 0000000000000035 | R-INT-TXID | yes |
| intcalc_systran | 1561409106491600#1 | field | source | Batch | LXB002C | R-INT-TXFORMAT | yes |
| intcalc_systran | 1561409106491600#1 | field | desc | Accrued int 00000000035 | Monthly interest | R-INT-TXFORMAT | yes |
| intcalc_systran | 2745303720002090#1 | field | tran_id | 2022071800000039 | 0000000000000039 | R-INT-TXID | yes |
| intcalc_systran | 2745303720002090#1 | field | source | Batch | LXB002C | R-INT-TXFORMAT | yes |
| intcalc_systran | 2745303720002090#1 | field | desc | Accrued int 00000000039 | Monthly interest | R-INT-TXFORMAT | yes |
| intcalc_systran | 2760836797107565#1 | field | tran_id | 2022071800000024 | 0000000000000024 | R-INT-TXID | yes |
| intcalc_systran | 2760836797107565#1 | field | source | Batch | LXB002C | R-INT-TXFORMAT | yes |
| intcalc_systran | 2760836797107565#1 | field | desc | Accrued int 00000000024 | Monthly interest | R-INT-TXFORMAT | yes |
| intcalc_systran | 2871968252812490#1 | field | tran_id | 2022071800000006 | 0000000000000006 | R-INT-TXID | yes |
| intcalc_systran | 2871968252812490#1 | field | source | Batch | LXB002C | R-INT-TXFORMAT | yes |
| intcalc_systran | 2871968252812490#1 | field | desc | Accrued int 00000000006 | Monthly interest | R-INT-TXFORMAT | yes |
| intcalc_systran | 2940139362300449#1 | field | tran_id | 2022071800000022 | 0000000000000022 | R-INT-TXID | yes |
| intcalc_systran | 2940139362300449#1 | field | source | Batch | LXB002C | R-INT-TXFORMAT | yes |
| intcalc_systran | 2940139362300449#1 | field | desc | Accrued int 00000000022 | Monthly interest | R-INT-TXFORMAT | yes |
| intcalc_systran | 2988091353094312#1 | field | tran_id | 2022071800000004 | 0000000000000004 | R-INT-TXID | yes |
