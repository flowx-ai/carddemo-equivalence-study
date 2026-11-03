# Score: `runs/a17/accrue_zflx_summary/r3/out/c03` vs `runs/A5_golden/c03`

- Equivalence (strict): **1.00%** · business: **2.00%** of 100 records
- Divergent records: 98 (silent 0, flagged 98)
- Flags raised: 11 (unneeded 4) · volatile fields masked: {'intcalc_systran.orig_ts': 50, 'intcalc_systran.proc_ts': 50}

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| intcalc_acctdata | 50 | 50 | 1 | 1 |
| intcalc_systran | 50 | 50 | 0 | 1 |

| Rule | silent | flagged |
|---|---|---|
| R-INT-APPLY | 0 | 48 |
| R-INT-LAST | 0 | 3 |
| R-INT-RATE | 0 | 49 |

First 40 divergences:

| output | key | kind | field | golden | candidate | rule | flagged |
|---|---|---|---|---|---|---|---|
| intcalc_acctdata | 00000000001 | field | curr_bal | 1302.66 | 1433.70 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000002 | field | curr_bal | 1764.21 | 2027.46 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000003 | field | curr_bal | 1890.03 | 2181.50 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000004 | field | curr_bal | 1686.98 | 1905.86 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000005 | field | curr_bal | 1198.69 | 1341.21 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000006 | field | curr_bal | 2606.57 | 2915.99 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000007 | field | curr_bal | 916.29 | 1061.09 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000008 | field | curr_bal | 2167.68 | 2434.10 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000009 | field | curr_bal | 3243.89 | 3571.00 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000010 | field | curr_bal | 1169.87 | 1341.91 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000011 | field | curr_bal | 1565.89 | 1799.08 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000012 | field | curr_bal | 1800.11 | 2065.28 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000013 | field | curr_bal | 2896.04 | 3219.58 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000014 | field | curr_bal | 1503.13 | 1747.44 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000015 | field | curr_bal | 4263.56 | 4722.78 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000016 | field | curr_bal | 1825.71 | 1977.23 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000017 | field | curr_bal | -617.27 | -578.59 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000018 | field | curr_bal | 2725.92 | 3025.37 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000019 | field | curr_bal | 3080.51 | 3377.42 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000020 | field | curr_bal | 1933.76 | 2209.73 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000021 | field | curr_bal | 969.98 | 1069.96 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000022 | field | curr_bal | 2479.81 | 2854.30 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000023 | field | curr_bal | 1173.49 | 1385.15 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000024 | field | curr_bal | 1949.14 | 2192.58 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000025 | field | curr_bal | 763.63 | 942.48 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000026 | field | curr_bal | 1212.86 | 1383.85 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000027 | field | curr_bal | 3540.45 | 3943.73 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000028 | field | curr_bal | 811.89 | 902.90 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000029 | field | curr_bal | 2697.27 | 3054.01 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000030 | field | curr_bal | -898.53 | -895.21 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000031 | field | curr_bal | 341.4 | 416.14 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000032 | field | curr_bal | 475.22 | 607.25 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000033 | field | curr_bal | 3396.8 | 3778.17 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000034 | field | curr_bal | 2401.49 | 2691.05 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000035 | field | curr_bal | 1021.95 | 1172.61 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000036 | field | curr_bal | 2009.3 | 2269.15 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000038 | field | curr_bal | 3098.87 | 3434.99 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000039 | field | curr_bal | 2848.51 | 3079.23 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000040 | field | curr_bal | 1672.53 | 1856.48 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000041 | field | curr_bal | 2047.86 | 2317.81 | R-INT-APPLY | yes |
