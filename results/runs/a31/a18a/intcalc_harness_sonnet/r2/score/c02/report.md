# Score: `runs/a31/a18a/intcalc_harness_sonnet/r2/out/c02` vs `golden/v1/cases/c02/out`

- Equivalence (strict): **6.06%** · business: **6.06%** of 99 records
- Divergent records: 93 (silent 45, flagged 93)
- Flags raised: 22 (unneeded 14) · volatile fields masked: {'intcalc_systran.orig_ts': 2, 'intcalc_systran.proc_ts': 2}

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| intcalc_acctdata | 50 | 50 | 4 | 4 |
| intcalc_systran | 49 | 2 | 2 | 2 |

| Rule | silent | flagged |
|---|---|---|
| R-INT-APPLY | 45 | 0 |
| R-INT-CYC | 0 | 91 |
| R-INT-RATE | 0 | 47 |

First 40 divergences:

| output | key | kind | field | golden | candidate | rule | flagged |
|---|---|---|---|---|---|---|---|
| intcalc_acctdata | 00000000004 | field | curr_bal | 1686.98 | 1662.66 | R-INT-APPLY | no |
| intcalc_acctdata | 00000000004 | field | curr_cyc_credit | 0 | 1945.65 | R-INT-CYC | yes |
| intcalc_acctdata | 00000000004 | field | curr_cyc_debit | 0 | -322.99 | R-INT-CYC | yes |
| intcalc_acctdata | 00000000005 | field | curr_bal | 1198.69 | 1182.86 | R-INT-APPLY | no |
| intcalc_acctdata | 00000000005 | field | curr_cyc_credit | 0 | 1266.85 | R-INT-CYC | yes |
| intcalc_acctdata | 00000000005 | field | curr_cyc_debit | 0 | -428.99 | R-INT-CYC | yes |
| intcalc_acctdata | 00000000006 | field | curr_bal | 2606.57 | 2572.19 | R-INT-APPLY | no |
| intcalc_acctdata | 00000000006 | field | curr_cyc_credit | 0 | 2750.41 | R-INT-CYC | yes |
| intcalc_acctdata | 00000000006 | field | curr_cyc_debit | 0 | -396.22 | R-INT-CYC | yes |
| intcalc_acctdata | 00000000007 | field | curr_bal | 916.29 | 900.21 | R-INT-APPLY | no |
| intcalc_acctdata | 00000000007 | field | curr_cyc_credit | 0 | 1287.09 | R-INT-CYC | yes |
| intcalc_acctdata | 00000000007 | field | curr_cyc_debit | 0 | -579.88 | R-INT-CYC | yes |
| intcalc_acctdata | 00000000008 | field | curr_bal | 2167.68 | 2138.08 | R-INT-APPLY | no |
| intcalc_acctdata | 00000000008 | field | curr_cyc_credit | 0 | 2368.19 | R-INT-CYC | yes |
| intcalc_acctdata | 00000000008 | field | curr_cyc_debit | 0 | -835.11 | R-INT-CYC | yes |
| intcalc_acctdata | 00000000009 | field | curr_bal | 3243.89 | 3207.55 | R-INT-APPLY | no |
| intcalc_acctdata | 00000000009 | field | curr_cyc_credit | 0 | 2907.66 | R-INT-CYC | yes |
| intcalc_acctdata | 00000000009 | field | curr_cyc_debit | 0 | -260.11 | R-INT-CYC | yes |
| intcalc_acctdata | 00000000010 | field | curr_bal | 1169.87 | 1150.76 | R-INT-APPLY | no |
| intcalc_acctdata | 00000000010 | field | curr_cyc_credit | 0 | 1529.20 | R-INT-CYC | yes |
| intcalc_acctdata | 00000000010 | field | curr_cyc_debit | 0 | -537.44 | R-INT-CYC | yes |
| intcalc_acctdata | 00000000011 | field | curr_bal | 1565.89 | 1539.99 | R-INT-APPLY | no |
| intcalc_acctdata | 00000000011 | field | curr_cyc_credit | 0 | 2072.76 | R-INT-CYC | yes |
| intcalc_acctdata | 00000000011 | field | curr_cyc_debit | 0 | -744.77 | R-INT-CYC | yes |
| intcalc_acctdata | 00000000012 | field | curr_bal | 1800.11 | 1770.65 | R-INT-APPLY | no |
| intcalc_acctdata | 00000000012 | field | curr_cyc_credit | 0 | 2357.09 | R-INT-CYC | yes |
| intcalc_acctdata | 00000000012 | field | curr_cyc_debit | 0 | -762.44 | R-INT-CYC | yes |
| intcalc_acctdata | 00000000013 | field | curr_bal | 2896.04 | 2860.10 | R-INT-APPLY | no |
| intcalc_acctdata | 00000000013 | field | curr_cyc_credit | 0 | 2875.87 | R-INT-CYC | yes |
| intcalc_acctdata | 00000000013 | field | curr_cyc_debit | 0 | -56.77 | R-INT-CYC | yes |
| intcalc_acctdata | 00000000014 | field | curr_bal | 1503.13 | 1475.99 | R-INT-APPLY | no |
| intcalc_acctdata | 00000000014 | field | curr_cyc_credit | 0 | 2171.65 | R-INT-CYC | yes |
| intcalc_acctdata | 00000000014 | field | curr_cyc_debit | 0 | -710.66 | R-INT-CYC | yes |
| intcalc_acctdata | 00000000015 | field | curr_bal | 4263.56 | 4212.54 | R-INT-APPLY | no |
| intcalc_acctdata | 00000000015 | field | curr_cyc_credit | 0 | 4081.98 | R-INT-CYC | yes |
| intcalc_acctdata | 00000000015 | field | curr_cyc_debit | 0 | -358.44 | R-INT-CYC | yes |
| intcalc_acctdata | 00000000016 | field | curr_bal | 1825.71 | 1808.88 | R-INT-APPLY | no |
| intcalc_acctdata | 00000000016 | field | curr_cyc_credit | 0 | 1346.87 | R-INT-CYC | yes |
| intcalc_acctdata | 00000000016 | field | curr_cyc_debit | 0 | -270.99 | R-INT-CYC | yes |
| intcalc_acctdata | 00000000017 | field | curr_bal | -617.27 | -621.56 | R-INT-APPLY | no |
