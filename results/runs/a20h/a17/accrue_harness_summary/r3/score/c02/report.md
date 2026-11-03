# Score: `runs/a20h/a17/accrue_harness_summary/r3/out/c02` vs `runs/A5_golden/c02`

- Equivalence (strict): **49.49%** · business: **49.49%** of 99 records
- Divergent records: 50 (silent 1, flagged 49)
- Flags raised: 10 (unneeded 6) · volatile fields masked: {'intcalc_systran.orig_ts': 49, 'intcalc_systran.proc_ts': 49}

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| intcalc_acctdata | 50 | 50 | 49 | 49 |
| intcalc_systran | 49 | 49 | 0 | 0 |

| Rule | silent | flagged |
|---|---|---|
| R-INT-LAST | 3 | 0 |
| R-INT-TXID | 0 | 49 |

First 40 divergences:

| output | key | kind | field | golden | candidate | rule | flagged |
|---|---|---|---|---|---|---|---|
| intcalc_acctdata | 00000000050 | field | curr_bal | 1945.87 | 1964.64 | R-INT-LAST | no |
| intcalc_acctdata | 00000000050 | field | curr_cyc_credit | 1501.75 | 0.00 | R-INT-LAST | no |
| intcalc_acctdata | 00000000050 | field | curr_cyc_debit | -47.88 | 0.00 | R-INT-LAST | no |
| intcalc_systran | 0500024453765740#1 | field | tran_id | 2022071800000049 | 0000000000000049 | R-INT-TXID | yes |
| intcalc_systran | 0500024453765740#1 | field | source | Batch | ACCRUE | R-INT-TXFORMAT | yes |
| intcalc_systran | 0500024453765740#1 | field | desc | Accrued int 00000000050 | Monthly interest | R-INT-TXFORMAT | yes |
| intcalc_systran | 0683586198171516#1 | field | tran_id | 2022071800000026 | 0000000000000026 | R-INT-TXID | yes |
| intcalc_systran | 0683586198171516#1 | field | source | Batch | ACCRUE | R-INT-TXFORMAT | yes |
| intcalc_systran | 0683586198171516#1 | field | desc | Accrued int 00000000027 | Monthly interest | R-INT-TXFORMAT | yes |
| intcalc_systran | 0927987108636232#1 | field | tran_id | 2022071800000019 | 0000000000000019 | R-INT-TXID | yes |
| intcalc_systran | 0927987108636232#1 | field | source | Batch | ACCRUE | R-INT-TXFORMAT | yes |
| intcalc_systran | 0927987108636232#1 | field | desc | Accrued int 00000000020 | Monthly interest | R-INT-TXFORMAT | yes |
| intcalc_systran | 0982496213629795#1 | field | tran_id | 2022071800000011 | 0000000000000011 | R-INT-TXID | yes |
| intcalc_systran | 0982496213629795#1 | field | source | Batch | ACCRUE | R-INT-TXFORMAT | yes |
| intcalc_systran | 0982496213629795#1 | field | desc | Accrued int 00000000012 | Monthly interest | R-INT-TXFORMAT | yes |
| intcalc_systran | 1014086565224350#1 | field | tran_id | 2022071800000043 | 0000000000000043 | R-INT-TXID | yes |
| intcalc_systran | 1014086565224350#1 | field | source | Batch | ACCRUE | R-INT-TXFORMAT | yes |
| intcalc_systran | 1014086565224350#1 | field | desc | Accrued int 00000000044 | Monthly interest | R-INT-TXFORMAT | yes |
| intcalc_systran | 1142167692878931#1 | field | tran_id | 2022071800000036 | 0000000000000036 | R-INT-TXID | yes |
| intcalc_systran | 1142167692878931#1 | field | source | Batch | ACCRUE | R-INT-TXFORMAT | yes |
| intcalc_systran | 1142167692878931#1 | field | desc | Accrued int 00000000037 | Monthly interest | R-INT-TXFORMAT | yes |
| intcalc_systran | 1561409106491600#1 | field | tran_id | 2022071800000034 | 0000000000000034 | R-INT-TXID | yes |
| intcalc_systran | 1561409106491600#1 | field | source | Batch | ACCRUE | R-INT-TXFORMAT | yes |
| intcalc_systran | 1561409106491600#1 | field | desc | Accrued int 00000000035 | Monthly interest | R-INT-TXFORMAT | yes |
| intcalc_systran | 2745303720002090#1 | field | tran_id | 2022071800000038 | 0000000000000038 | R-INT-TXID | yes |
| intcalc_systran | 2745303720002090#1 | field | source | Batch | ACCRUE | R-INT-TXFORMAT | yes |
| intcalc_systran | 2745303720002090#1 | field | desc | Accrued int 00000000039 | Monthly interest | R-INT-TXFORMAT | yes |
| intcalc_systran | 2760836797107565#1 | field | tran_id | 2022071800000023 | 0000000000000023 | R-INT-TXID | yes |
| intcalc_systran | 2760836797107565#1 | field | source | Batch | ACCRUE | R-INT-TXFORMAT | yes |
| intcalc_systran | 2760836797107565#1 | field | desc | Accrued int 00000000024 | Monthly interest | R-INT-TXFORMAT | yes |
| intcalc_systran | 2871968252812490#1 | field | tran_id | 2022071800000005 | 0000000000000005 | R-INT-TXID | yes |
| intcalc_systran | 2871968252812490#1 | field | source | Batch | ACCRUE | R-INT-TXFORMAT | yes |
| intcalc_systran | 2871968252812490#1 | field | desc | Accrued int 00000000006 | Monthly interest | R-INT-TXFORMAT | yes |
| intcalc_systran | 2940139362300449#1 | field | tran_id | 2022071800000021 | 0000000000000021 | R-INT-TXID | yes |
| intcalc_systran | 2940139362300449#1 | field | source | Batch | ACCRUE | R-INT-TXFORMAT | yes |
| intcalc_systran | 2940139362300449#1 | field | desc | Accrued int 00000000022 | Monthly interest | R-INT-TXFORMAT | yes |
| intcalc_systran | 2988091353094312#1 | field | tran_id | 2022071800000003 | 0000000000000003 | R-INT-TXID | yes |
| intcalc_systran | 2988091353094312#1 | field | source | Batch | ACCRUE | R-INT-TXFORMAT | yes |
| intcalc_systran | 2988091353094312#1 | field | desc | Accrued int 00000000004 | Monthly interest | R-INT-TXFORMAT | yes |
| intcalc_systran | 3260763612337560#1 | field | tran_id | 2022071800000009 | 0000000000000009 | R-INT-TXID | yes |
