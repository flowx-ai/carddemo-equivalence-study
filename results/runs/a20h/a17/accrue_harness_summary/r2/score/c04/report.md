# Score: `runs/a20h/a17/accrue_harness_summary/r2/out/c04` vs `runs/A5_golden/c04`

- Equivalence (strict): **47.57%** · business: **47.57%** of 103 records
- Divergent records: 54 (silent 1, flagged 53)
- Flags raised: 12 (unneeded 6) · volatile fields masked: {'intcalc_systran.proc_ts': 53, 'intcalc_systran.orig_ts': 53}

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| intcalc_acctdata | 50 | 50 | 49 | 49 |
| intcalc_systran | 53 | 53 | 0 | 0 |

| Rule | silent | flagged |
|---|---|---|
| R-INT-LAST | 3 | 0 |
| R-INT-TXID | 0 | 53 |

First 40 divergences:

| output | key | kind | field | golden | candidate | rule | flagged |
|---|---|---|---|---|---|---|---|
| intcalc_acctdata | 00000000050 | field | curr_bal | 1945.87 | 1964.64 | R-INT-LAST | no |
| intcalc_acctdata | 00000000050 | field | curr_cyc_credit | 1501.75 | 0.00 | R-INT-LAST | no |
| intcalc_acctdata | 00000000050 | field | curr_cyc_debit | -47.88 | 0.00 | R-INT-LAST | no |
| intcalc_systran | 0500024453765740#1 | field | tran_id | 2022071800000053 | 0000000000000053 | R-INT-TXID | yes |
| intcalc_systran | 0500024453765740#1 | field | source | Batch | LXB002C | R-INT-TXFORMAT | yes |
| intcalc_systran | 0500024453765740#1 | field | desc | Accrued int 00000000050 | Monthly interest | R-INT-TXFORMAT | yes |
| intcalc_systran | 0683586198171516#1 | field | tran_id | 2022071800000030 | 0000000000000030 | R-INT-TXID | yes |
| intcalc_systran | 0683586198171516#1 | field | source | Batch | LXB002C | R-INT-TXFORMAT | yes |
| intcalc_systran | 0683586198171516#1 | field | desc | Accrued int 00000000027 | Monthly interest | R-INT-TXFORMAT | yes |
| intcalc_systran | 0923877193247330#1 | field | tran_id | 2022071800000002 | 0000000000000002 | R-INT-TXID | yes |
| intcalc_systran | 0923877193247330#1 | field | source | Batch | LXB002C | R-INT-TXFORMAT | yes |
| intcalc_systran | 0923877193247330#1 | field | desc | Accrued int 00000000002 | Monthly interest | R-INT-TXFORMAT | yes |
| intcalc_systran | 0927987108636232#1 | field | tran_id | 2022071800000023 | 0000000000000023 | R-INT-TXID | yes |
| intcalc_systran | 0927987108636232#1 | field | source | Batch | LXB002C | R-INT-TXFORMAT | yes |
| intcalc_systran | 0927987108636232#1 | field | desc | Accrued int 00000000020 | Monthly interest | R-INT-TXFORMAT | yes |
| intcalc_systran | 0982496213629795#1 | field | tran_id | 2022071800000015 | 0000000000000015 | R-INT-TXID | yes |
| intcalc_systran | 0982496213629795#1 | field | source | Batch | LXB002C | R-INT-TXFORMAT | yes |
| intcalc_systran | 0982496213629795#1 | field | desc | Accrued int 00000000012 | Monthly interest | R-INT-TXFORMAT | yes |
| intcalc_systran | 1014086565224350#1 | field | tran_id | 2022071800000047 | 0000000000000047 | R-INT-TXID | yes |
| intcalc_systran | 1014086565224350#1 | field | source | Batch | LXB002C | R-INT-TXFORMAT | yes |
| intcalc_systran | 1014086565224350#1 | field | desc | Accrued int 00000000044 | Monthly interest | R-INT-TXFORMAT | yes |
| intcalc_systran | 1142167692878931#1 | field | tran_id | 2022071800000040 | 0000000000000040 | R-INT-TXID | yes |
| intcalc_systran | 1142167692878931#1 | field | source | Batch | LXB002C | R-INT-TXFORMAT | yes |
| intcalc_systran | 1142167692878931#1 | field | desc | Accrued int 00000000037 | Monthly interest | R-INT-TXFORMAT | yes |
| intcalc_systran | 1561409106491600#1 | field | tran_id | 2022071800000038 | 0000000000000038 | R-INT-TXID | yes |
| intcalc_systran | 1561409106491600#1 | field | source | Batch | LXB002C | R-INT-TXFORMAT | yes |
| intcalc_systran | 1561409106491600#1 | field | desc | Accrued int 00000000035 | Monthly interest | R-INT-TXFORMAT | yes |
| intcalc_systran | 2745303720002090#1 | field | tran_id | 2022071800000042 | 0000000000000042 | R-INT-TXID | yes |
| intcalc_systran | 2745303720002090#1 | field | source | Batch | LXB002C | R-INT-TXFORMAT | yes |
| intcalc_systran | 2745303720002090#1 | field | desc | Accrued int 00000000039 | Monthly interest | R-INT-TXFORMAT | yes |
| intcalc_systran | 2760836797107565#1 | field | tran_id | 2022071800000027 | 0000000000000027 | R-INT-TXID | yes |
| intcalc_systran | 2760836797107565#1 | field | source | Batch | LXB002C | R-INT-TXFORMAT | yes |
| intcalc_systran | 2760836797107565#1 | field | desc | Accrued int 00000000024 | Monthly interest | R-INT-TXFORMAT | yes |
| intcalc_systran | 2871968252812490#1 | field | tran_id | 2022071800000009 | 0000000000000009 | R-INT-TXID | yes |
| intcalc_systran | 2871968252812490#1 | field | source | Batch | LXB002C | R-INT-TXFORMAT | yes |
| intcalc_systran | 2871968252812490#1 | field | desc | Accrued int 00000000006 | Monthly interest | R-INT-TXFORMAT | yes |
| intcalc_systran | 2940139362300449#1 | field | tran_id | 2022071800000025 | 0000000000000025 | R-INT-TXID | yes |
| intcalc_systran | 2940139362300449#1 | field | source | Batch | LXB002C | R-INT-TXFORMAT | yes |
| intcalc_systran | 2940139362300449#1 | field | desc | Accrued int 00000000022 | Monthly interest | R-INT-TXFORMAT | yes |
| intcalc_systran | 2988091353094312#1 | field | tran_id | 2022071800000004 | 0000000000000004 | R-INT-TXID | yes |
