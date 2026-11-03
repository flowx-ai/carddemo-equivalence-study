# Score: `runs/a20h/a17/accrue_harness_summary/r1/out/c02` vs `runs/A5_golden/c02`

- Equivalence (strict): **0.00%** · business: **0.00%** of 99 records
- Divergent records: 99 (silent 50, flagged 49)
- Flags raised: 9 (unneeded 6) · volatile fields masked: none differed

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| intcalc_acctdata | 50 | 0 | 0 | 0 |
| intcalc_systran | 49 | 0 | 0 | 0 |

| Rule | silent | flagged |
|---|---|---|
| R-INT-RATE | 0 | 49 |
| R-PASSTHRU | 50 | 0 |

First 40 divergences:

| output | key | kind | field | golden | candidate | rule | flagged |
|---|---|---|---|---|---|---|---|
| intcalc_acctdata | 00000000001 | missing |  |  |  | R-PASSTHRU | no |
| intcalc_acctdata | 00000000002 | missing |  |  |  | R-PASSTHRU | no |
| intcalc_acctdata | 00000000003 | missing |  |  |  | R-PASSTHRU | no |
| intcalc_acctdata | 00000000004 | missing |  |  |  | R-PASSTHRU | no |
| intcalc_acctdata | 00000000005 | missing |  |  |  | R-PASSTHRU | no |
| intcalc_acctdata | 00000000006 | missing |  |  |  | R-PASSTHRU | no |
| intcalc_acctdata | 00000000007 | missing |  |  |  | R-PASSTHRU | no |
| intcalc_acctdata | 00000000008 | missing |  |  |  | R-PASSTHRU | no |
| intcalc_acctdata | 00000000009 | missing |  |  |  | R-PASSTHRU | no |
| intcalc_acctdata | 00000000010 | missing |  |  |  | R-PASSTHRU | no |
| intcalc_acctdata | 00000000011 | missing |  |  |  | R-PASSTHRU | no |
| intcalc_acctdata | 00000000012 | missing |  |  |  | R-PASSTHRU | no |
| intcalc_acctdata | 00000000013 | missing |  |  |  | R-PASSTHRU | no |
| intcalc_acctdata | 00000000014 | missing |  |  |  | R-PASSTHRU | no |
| intcalc_acctdata | 00000000015 | missing |  |  |  | R-PASSTHRU | no |
| intcalc_acctdata | 00000000016 | missing |  |  |  | R-PASSTHRU | no |
| intcalc_acctdata | 00000000017 | missing |  |  |  | R-PASSTHRU | no |
| intcalc_acctdata | 00000000018 | missing |  |  |  | R-PASSTHRU | no |
| intcalc_acctdata | 00000000019 | missing |  |  |  | R-PASSTHRU | no |
| intcalc_acctdata | 00000000020 | missing |  |  |  | R-PASSTHRU | no |
| intcalc_acctdata | 00000000021 | missing |  |  |  | R-PASSTHRU | no |
| intcalc_acctdata | 00000000022 | missing |  |  |  | R-PASSTHRU | no |
| intcalc_acctdata | 00000000023 | missing |  |  |  | R-PASSTHRU | no |
| intcalc_acctdata | 00000000024 | missing |  |  |  | R-PASSTHRU | no |
| intcalc_acctdata | 00000000025 | missing |  |  |  | R-PASSTHRU | no |
| intcalc_acctdata | 00000000026 | missing |  |  |  | R-PASSTHRU | no |
| intcalc_acctdata | 00000000027 | missing |  |  |  | R-PASSTHRU | no |
| intcalc_acctdata | 00000000028 | missing |  |  |  | R-PASSTHRU | no |
| intcalc_acctdata | 00000000029 | missing |  |  |  | R-PASSTHRU | no |
| intcalc_acctdata | 00000000030 | missing |  |  |  | R-PASSTHRU | no |
| intcalc_acctdata | 00000000031 | missing |  |  |  | R-PASSTHRU | no |
| intcalc_acctdata | 00000000032 | missing |  |  |  | R-PASSTHRU | no |
| intcalc_acctdata | 00000000033 | missing |  |  |  | R-PASSTHRU | no |
| intcalc_acctdata | 00000000034 | missing |  |  |  | R-PASSTHRU | no |
| intcalc_acctdata | 00000000035 | missing |  |  |  | R-PASSTHRU | no |
| intcalc_acctdata | 00000000036 | missing |  |  |  | R-PASSTHRU | no |
| intcalc_acctdata | 00000000037 | missing |  |  |  | R-PASSTHRU | no |
| intcalc_acctdata | 00000000038 | missing |  |  |  | R-PASSTHRU | no |
| intcalc_acctdata | 00000000039 | missing |  |  |  | R-PASSTHRU | no |
| intcalc_acctdata | 00000000040 | missing |  |  |  | R-PASSTHRU | no |
