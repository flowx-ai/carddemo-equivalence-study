# Score: `runs/a17/accrue_zflx_nowiki/r3/out/c03` vs `runs/A5_golden/c03`

- Equivalence (strict): **2.00%** · business: **2.00%** of 100 records
- Divergent records: 98 (silent 0, flagged 98)
- Flags raised: 16 (unneeded 8) · volatile fields masked: none differed

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| intcalc_acctdata | 50 | 50 | 2 | 2 |
| intcalc_systran | 50 | 0 | 0 | 0 |

| Rule | silent | flagged |
|---|---|---|
| R-INT-APPLY | 0 | 48 |
| R-INT-RATE | 0 | 50 |

First 40 divergences:

| output | key | kind | field | golden | candidate | rule | flagged |
|---|---|---|---|---|---|---|---|
| intcalc_acctdata | 00000000001 | field | curr_bal | 1302.66 | 1288.10 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000002 | field | curr_bal | 1764.21 | 1734.97 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000003 | field | curr_bal | 1890.03 | 1857.65 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000004 | field | curr_bal | 1686.98 | 1662.66 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000005 | field | curr_bal | 1198.69 | 1182.86 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000006 | field | curr_bal | 2606.57 | 2572.19 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000007 | field | curr_bal | 916.29 | 900.21 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000008 | field | curr_bal | 2167.68 | 2138.08 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000009 | field | curr_bal | 3243.89 | 3207.55 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000010 | field | curr_bal | 1169.87 | 1150.76 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000011 | field | curr_bal | 1565.89 | 1539.99 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000012 | field | curr_bal | 1800.11 | 1770.65 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000013 | field | curr_bal | 2896.04 | 2860.10 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000014 | field | curr_bal | 1503.13 | 1475.99 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000015 | field | curr_bal | 4263.56 | 4212.54 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000016 | field | curr_bal | 1825.71 | 1808.88 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000017 | field | curr_bal | -617.27 | -621.56 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000018 | field | curr_bal | 2725.92 | 2692.65 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000019 | field | curr_bal | 3080.51 | 3047.53 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000020 | field | curr_bal | 1933.76 | 1903.10 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000021 | field | curr_bal | 969.98 | 958.88 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000022 | field | curr_bal | 2479.81 | 2438.20 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000023 | field | curr_bal | 1173.49 | 1149.98 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000024 | field | curr_bal | 1949.14 | 1922.10 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000025 | field | curr_bal | 763.63 | 743.76 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000026 | field | curr_bal | 1212.86 | 1193.87 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000027 | field | curr_bal | 3540.45 | 3495.65 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000028 | field | curr_bal | 811.89 | 801.78 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000029 | field | curr_bal | 2697.27 | 2657.64 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000030 | field | curr_bal | -898.53 | -898.89 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000031 | field | curr_bal | 341.4 | 333.10 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000032 | field | curr_bal | 475.22 | 460.56 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000033 | field | curr_bal | 3396.8 | 3354.43 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000034 | field | curr_bal | 2401.49 | 2369.32 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000035 | field | curr_bal | 1021.95 | 1005.21 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000036 | field | curr_bal | 2009.3 | 1980.43 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000038 | field | curr_bal | 3098.87 | 3061.53 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000039 | field | curr_bal | 2848.51 | 2822.88 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000040 | field | curr_bal | 1672.53 | 1652.10 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000041 | field | curr_bal | 2047.86 | 2017.87 | R-INT-APPLY | yes |
