# Score: `runs/a20h/a17/accrue_harness_detailed/r2/out/c02` vs `runs/A5_golden/c02`

- Equivalence (strict): **49.49%** · business: **98.99%** of 99 records
- Divergent records: 1 (silent 0, flagged 1)
- Flags raised: 9 (unneeded 7) · volatile fields masked: {'intcalc_systran.orig_ts': 49, 'intcalc_systran.proc_ts': 49}

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
| intcalc_systran | 0500024453765740#1 | field | desc | Accrued int 00000000050 | Accrued int 50 | R-INT-TXFORMAT | yes |
| intcalc_systran | 0683586198171516#1 | field | desc | Accrued int 00000000027 | Accrued int 27 | R-INT-TXFORMAT | yes |
| intcalc_systran | 0927987108636232#1 | field | desc | Accrued int 00000000020 | Accrued int 20 | R-INT-TXFORMAT | yes |
| intcalc_systran | 0982496213629795#1 | field | desc | Accrued int 00000000012 | Accrued int 12 | R-INT-TXFORMAT | yes |
| intcalc_systran | 1014086565224350#1 | field | desc | Accrued int 00000000044 | Accrued int 44 | R-INT-TXFORMAT | yes |
| intcalc_systran | 1142167692878931#1 | field | desc | Accrued int 00000000037 | Accrued int 37 | R-INT-TXFORMAT | yes |
| intcalc_systran | 1561409106491600#1 | field | desc | Accrued int 00000000035 | Accrued int 35 | R-INT-TXFORMAT | yes |
| intcalc_systran | 2745303720002090#1 | field | desc | Accrued int 00000000039 | Accrued int 39 | R-INT-TXFORMAT | yes |
| intcalc_systran | 2760836797107565#1 | field | desc | Accrued int 00000000024 | Accrued int 24 | R-INT-TXFORMAT | yes |
| intcalc_systran | 2871968252812490#1 | field | desc | Accrued int 00000000006 | Accrued int 6 | R-INT-TXFORMAT | yes |
| intcalc_systran | 2940139362300449#1 | field | desc | Accrued int 00000000022 | Accrued int 22 | R-INT-TXFORMAT | yes |
| intcalc_systran | 2988091353094312#1 | field | desc | Accrued int 00000000004 | Accrued int 4 | R-INT-TXFORMAT | yes |
| intcalc_systran | 3260763612337560#1 | field | desc | Accrued int 00000000010 | Accrued int 10 | R-INT-TXFORMAT | yes |
| intcalc_systran | 3766281984155154#1 | field | desc | Accrued int 00000000041 | Accrued int 41 | R-INT-TXFORMAT | yes |
| intcalc_systran | 3940246016141489#1 | field | desc | Accrued int 00000000019 | Accrued int 19 | R-INT-TXFORMAT | yes |
| intcalc_systran | 3999169246375885#1 | field | desc | Accrued int 00000000003 | Accrued int 3 | R-INT-TXFORMAT | yes |
| intcalc_systran | 4011500891777367#1 | field | desc | Accrued int 00000000013 | Accrued int 13 | R-INT-TXFORMAT | yes |
| intcalc_systran | 4385271476627819#1 | field | desc | Accrued int 00000000034 | Accrued int 34 | R-INT-TXFORMAT | yes |
| intcalc_systran | 4534784102713951#1 | field | desc | Accrued int 00000000036 | Accrued int 36 | R-INT-TXFORMAT | yes |
| intcalc_systran | 4859452612877065#1 | field | desc | Accrued int 00000000007 | Accrued int 7 | R-INT-TXFORMAT | yes |
| intcalc_systran | 5407099850479866#1 | field | desc | Accrued int 00000000021 | Accrued int 21 | R-INT-TXFORMAT | yes |
| intcalc_systran | 5656830544981216#1 | field | desc | Accrued int 00000000046 | Accrued int 46 | R-INT-TXFORMAT | yes |
| intcalc_systran | 5671184478505844#1 | field | desc | Accrued int 00000000018 | Accrued int 18 | R-INT-TXFORMAT | yes |
| intcalc_systran | 5787351228879339#1 | field | desc | Accrued int 00000000047 | Accrued int 47 | R-INT-TXFORMAT | yes |
| intcalc_systran | 5975117516616077#1 | field | desc | Accrued int 00000000042 | Accrued int 42 | R-INT-TXFORMAT | yes |
| intcalc_systran | 6009619150674526#1 | field | desc | Accrued int 00000000005 | Accrued int 5 | R-INT-TXFORMAT | yes |
| intcalc_systran | 6349250331648509#1 | field | desc | Accrued int 00000000015 | Accrued int 15 | R-INT-TXFORMAT | yes |
| intcalc_systran | 6503535181795992#1 | field | desc | Accrued int 00000000048 | Accrued int 48 | R-INT-TXFORMAT | yes |
| intcalc_systran | 6509230362553816#1 | field | desc | Accrued int 00000000030 | Accrued int 30 | R-INT-TXFORMAT | yes |
| intcalc_systran | 6723000463207764#1 | field | desc | Accrued int 00000000028 | Accrued int 28 | R-INT-TXFORMAT | yes |
| intcalc_systran | 6727055190616014#1 | field | desc | Accrued int 00000000016 | Accrued int 16 | R-INT-TXFORMAT | yes |
| intcalc_systran | 6832676047698087#1 | field | desc | Accrued int 00000000033 | Accrued int 33 | R-INT-TXFORMAT | yes |
| intcalc_systran | 7026637615032277#1 | field | desc | Accrued int 00000000031 | Accrued int 31 | R-INT-TXFORMAT | yes |
| intcalc_systran | 7058267261837752#1 | field | desc | Accrued int 00000000043 | Accrued int 43 | R-INT-TXFORMAT | yes |
| intcalc_systran | 7094142751055551#1 | field | desc | Accrued int 00000000032 | Accrued int 32 | R-INT-TXFORMAT | yes |
| intcalc_systran | 7251508149188883#1 | field | desc | Accrued int 00000000029 | Accrued int 29 | R-INT-TXFORMAT | yes |
| intcalc_systran | 7379335634661142#1 | field | desc | Accrued int 00000000045 | Accrued int 45 | R-INT-TXFORMAT | yes |
