# Score: `runs/a17/accrue_zflx_summary/r1/out/c02` vs `runs/A5_golden/c02`

- Equivalence (strict): **49.49%** · business: **98.99%** of 99 records
- Divergent records: 1 (silent 0, flagged 1)
- Flags raised: 14 (unneeded 9) · volatile fields masked: {'intcalc_systran.orig_ts': 49, 'intcalc_systran.proc_ts': 49}

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| intcalc_acctdata | 50 | 50 | 49 | 49 |
| intcalc_systran | 49 | 49 | 0 | 49 |

| Rule | silent | flagged |
|---|---|---|
| R-INT-LAST | 0 | 3 |

First 40 divergences:

| output | key | kind | field | golden | candidate | rule | flagged |
|---|---|---|---|---|---|---|---|
| intcalc_acctdata | 00000000050 | field | curr_bal | 1945.87 | 1964.64 | R-INT-LAST | yes |
| intcalc_acctdata | 00000000050 | field | curr_cyc_credit | 1501.75 | 0.00 | R-INT-LAST | yes |
| intcalc_acctdata | 00000000050 | field | curr_cyc_debit | -47.88 | 0.00 | R-INT-LAST | yes |
| intcalc_systran | 0500024453765740#1 | field | source | Batch | System | R-INT-TXFORMAT | yes |
| intcalc_systran | 0500024453765740#1 | field | desc | Accrued int 00000000050 | Int. for a/c 50 | R-INT-TXFORMAT | yes |
| intcalc_systran | 0683586198171516#1 | field | source | Batch | System | R-INT-TXFORMAT | yes |
| intcalc_systran | 0683586198171516#1 | field | desc | Accrued int 00000000027 | Int. for a/c 27 | R-INT-TXFORMAT | yes |
| intcalc_systran | 0927987108636232#1 | field | source | Batch | System | R-INT-TXFORMAT | yes |
| intcalc_systran | 0927987108636232#1 | field | desc | Accrued int 00000000020 | Int. for a/c 20 | R-INT-TXFORMAT | yes |
| intcalc_systran | 0982496213629795#1 | field | source | Batch | System | R-INT-TXFORMAT | yes |
| intcalc_systran | 0982496213629795#1 | field | desc | Accrued int 00000000012 | Int. for a/c 12 | R-INT-TXFORMAT | yes |
| intcalc_systran | 1014086565224350#1 | field | source | Batch | System | R-INT-TXFORMAT | yes |
| intcalc_systran | 1014086565224350#1 | field | desc | Accrued int 00000000044 | Int. for a/c 44 | R-INT-TXFORMAT | yes |
| intcalc_systran | 1142167692878931#1 | field | source | Batch | System | R-INT-TXFORMAT | yes |
| intcalc_systran | 1142167692878931#1 | field | desc | Accrued int 00000000037 | Int. for a/c 37 | R-INT-TXFORMAT | yes |
| intcalc_systran | 1561409106491600#1 | field | source | Batch | System | R-INT-TXFORMAT | yes |
| intcalc_systran | 1561409106491600#1 | field | desc | Accrued int 00000000035 | Int. for a/c 35 | R-INT-TXFORMAT | yes |
| intcalc_systran | 2745303720002090#1 | field | source | Batch | System | R-INT-TXFORMAT | yes |
| intcalc_systran | 2745303720002090#1 | field | desc | Accrued int 00000000039 | Int. for a/c 39 | R-INT-TXFORMAT | yes |
| intcalc_systran | 2760836797107565#1 | field | source | Batch | System | R-INT-TXFORMAT | yes |
| intcalc_systran | 2760836797107565#1 | field | desc | Accrued int 00000000024 | Int. for a/c 24 | R-INT-TXFORMAT | yes |
| intcalc_systran | 2871968252812490#1 | field | source | Batch | System | R-INT-TXFORMAT | yes |
| intcalc_systran | 2871968252812490#1 | field | desc | Accrued int 00000000006 | Int. for a/c 6 | R-INT-TXFORMAT | yes |
| intcalc_systran | 2940139362300449#1 | field | source | Batch | System | R-INT-TXFORMAT | yes |
| intcalc_systran | 2940139362300449#1 | field | desc | Accrued int 00000000022 | Int. for a/c 22 | R-INT-TXFORMAT | yes |
| intcalc_systran | 2988091353094312#1 | field | source | Batch | System | R-INT-TXFORMAT | yes |
| intcalc_systran | 2988091353094312#1 | field | desc | Accrued int 00000000004 | Int. for a/c 4 | R-INT-TXFORMAT | yes |
| intcalc_systran | 3260763612337560#1 | field | source | Batch | System | R-INT-TXFORMAT | yes |
| intcalc_systran | 3260763612337560#1 | field | desc | Accrued int 00000000010 | Int. for a/c 10 | R-INT-TXFORMAT | yes |
| intcalc_systran | 3766281984155154#1 | field | source | Batch | System | R-INT-TXFORMAT | yes |
| intcalc_systran | 3766281984155154#1 | field | desc | Accrued int 00000000041 | Int. for a/c 41 | R-INT-TXFORMAT | yes |
| intcalc_systran | 3940246016141489#1 | field | source | Batch | System | R-INT-TXFORMAT | yes |
| intcalc_systran | 3940246016141489#1 | field | desc | Accrued int 00000000019 | Int. for a/c 19 | R-INT-TXFORMAT | yes |
| intcalc_systran | 3999169246375885#1 | field | source | Batch | System | R-INT-TXFORMAT | yes |
| intcalc_systran | 3999169246375885#1 | field | desc | Accrued int 00000000003 | Int. for a/c 3 | R-INT-TXFORMAT | yes |
| intcalc_systran | 4011500891777367#1 | field | source | Batch | System | R-INT-TXFORMAT | yes |
| intcalc_systran | 4011500891777367#1 | field | desc | Accrued int 00000000013 | Int. for a/c 13 | R-INT-TXFORMAT | yes |
| intcalc_systran | 4385271476627819#1 | field | source | Batch | System | R-INT-TXFORMAT | yes |
| intcalc_systran | 4385271476627819#1 | field | desc | Accrued int 00000000034 | Int. for a/c 34 | R-INT-TXFORMAT | yes |
| intcalc_systran | 4534784102713951#1 | field | source | Batch | System | R-INT-TXFORMAT | yes |
