# Score: `runs/a21/harness/ni2/r1/out/c01` vs `golden/v1/cases/c01/out`

- Equivalence (strict): **70.00%** · business: **70.00%** of 100 records
- Divergent records: 30 (silent 1, flagged 29)
- Flags raised: 21 (unneeded 11) · volatile fields masked: {'intcalc_systran.proc_ts': 50, 'intcalc_systran.orig_ts': 50}

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| intcalc_systran | 50 | 50 | 35 | 35 |
| intcalc_acctdata | 50 | 50 | 35 | 35 |

| Rule | silent | flagged |
|---|---|---|
| R-INT-APPLY | 0 | 14 |
| R-INT-LAST | 3 | 0 |
| R-INT-RATE | 0 | 15 |

First 40 divergences:

| output | key | kind | field | golden | candidate | rule | flagged |
|---|---|---|---|---|---|---|---|
| intcalc_systran | 0500024453765740#1 | field | amt | 18.77 | 16.26 | R-INT-RATE | yes |
| intcalc_systran | 0982496213629795#1 | field | amt | 29.46 | 25.53 | R-INT-RATE | yes |
| intcalc_systran | 3940246016141489#1 | field | amt | 32.98 | 28.59 | R-INT-RATE | yes |
| intcalc_systran | 4385271476627819#1 | field | amt | 32.17 | 27.88 | R-INT-RATE | yes |
| intcalc_systran | 5407099850479866#1 | field | amt | 11.12 | 9.63 | R-INT-RATE | yes |
| intcalc_systran | 6349250331648509#1 | field | amt | 51.02 | 44.22 | R-INT-RATE | yes |
| intcalc_systran | 6509230362553816#1 | field | amt | 0.36 | 0.31 | R-INT-RATE | yes |
| intcalc_systran | 7058267261837752#1 | field | amt | 36.72 | 31.83 | R-INT-RATE | yes |
| intcalc_systran | 7379335634661142#1 | field | amt | 30.09 | 26.08 | R-INT-RATE | yes |
| intcalc_systran | 7443870988897530#1 | field | amt | 37.34 | 32.36 | R-INT-RATE | yes |
| intcalc_systran | 8040580410348680#1 | field | amt | 18.99 | 16.46 | R-INT-RATE | yes |
| intcalc_systran | 8112545834239735#1 | field | amt | 23.51 | 20.38 | R-INT-RATE | yes |
| intcalc_systran | 8517866958206008#1 | field | amt | 27.14 | 23.52 | R-INT-RATE | yes |
| intcalc_systran | 8931369351894783#1 | field | amt | 29.6 | 25.65 | R-INT-RATE | yes |
| intcalc_systran | 9805583408996588#1 | field | amt | 20.43 | 17.71 | R-INT-RATE | yes |
| intcalc_acctdata | 00000000008 | field | curr_bal | 2167.68 | 2163.73 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000012 | field | curr_bal | 1800.11 | 1796.18 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000014 | field | curr_bal | 1503.13 | 1499.51 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000015 | field | curr_bal | 4263.56 | 4256.76 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000019 | field | curr_bal | 3080.51 | 3076.12 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000021 | field | curr_bal | 971 | 969.51 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000023 | field | curr_bal | 1173.49 | 1170.36 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000026 | field | curr_bal | 1212.86 | 1210.33 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000030 | field | curr_bal | -898.53 | -898.58 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000034 | field | curr_bal | 2401.49 | 2397.20 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000038 | field | curr_bal | 3098.87 | 3093.89 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000040 | field | curr_bal | 1672.53 | 1669.81 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000043 | field | curr_bal | 3341.91 | 3337.02 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000045 | field | curr_bal | 2278.86 | 2274.85 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000050 | field | curr_bal | 1945.87 | 1962.13 | R-INT-LAST | no |
| intcalc_acctdata | 00000000050 | field | curr_cyc_credit | 1501.75 | 0.00 | R-INT-LAST | no |
| intcalc_acctdata | 00000000050 | field | curr_cyc_debit | -47.88 | 0.00 | R-INT-LAST | no |
