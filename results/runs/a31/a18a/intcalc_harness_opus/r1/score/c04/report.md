# Score: `runs/a31/a18a/intcalc_harness_opus/r1/out/c04` vs `golden/v1/cases/c04/out`

- Equivalence (strict): **0.97%** · business: **0.97%** of 103 records
- Divergent records: 102 (silent 0, flagged 102)
- Flags raised: 25 (unneeded 14) · volatile fields masked: none differed

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| intcalc_acctdata | 50 | 50 | 1 | 1 |
| intcalc_systran | 53 | 0 | 0 | 0 |

| Rule | silent | flagged |
|---|---|---|
| R-INT-APPLY | 0 | 48 |
| R-INT-CYC | 0 | 97 |
| R-INT-RATE | 0 | 53 |

First 40 divergences:

| output | key | kind | field | golden | candidate | rule | flagged |
|---|---|---|---|---|---|---|---|
| intcalc_acctdata | 00000000001 | field | curr_bal | 1302.66 | 1288.10 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000001 | field | curr_cyc_credit | 0 | 1164.87 | R-INT-CYC | yes |
| intcalc_acctdata | 00000000001 | field | curr_cyc_debit | 0 | -70.77 | R-INT-CYC | yes |
| intcalc_acctdata | 00000000002 | field | curr_bal | 1764.21 | 1734.97 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000002 | field | curr_cyc_credit | 0 | 2339.97 | R-INT-CYC | yes |
| intcalc_acctdata | 00000000002 | field | curr_cyc_debit | 0 | -763.00 | R-INT-CYC | yes |
| intcalc_acctdata | 00000000003 | field | curr_bal | 1890.03 | 1857.65 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000003 | field | curr_cyc_credit | 0 | 2590.87 | R-INT-CYC | yes |
| intcalc_acctdata | 00000000003 | field | curr_cyc_debit | 0 | -880.22 | R-INT-CYC | yes |
| intcalc_acctdata | 00000000004 | field | curr_bal | 1560.96 | 1539.21 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000004 | field | curr_cyc_credit | 0 | 1945.65 | R-INT-CYC | yes |
| intcalc_acctdata | 00000000004 | field | curr_cyc_debit | 0 | -446.44 | R-INT-CYC | yes |
| intcalc_acctdata | 00000000005 | field | curr_bal | 1706.6 | 1682.86 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000005 | field | curr_cyc_credit | 0 | 1766.85 | R-INT-CYC | yes |
| intcalc_acctdata | 00000000005 | field | curr_cyc_debit | 0 | -428.99 | R-INT-CYC | yes |
| intcalc_acctdata | 00000000006 | field | curr_bal | 2606.57 | 2572.19 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000006 | field | curr_cyc_credit | 0 | 2750.41 | R-INT-CYC | yes |
| intcalc_acctdata | 00000000006 | field | curr_cyc_debit | 0 | -396.22 | R-INT-CYC | yes |
| intcalc_acctdata | 00000000007 | field | curr_bal | 916.29 | 900.21 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000007 | field | curr_cyc_credit | 0 | 1287.09 | R-INT-CYC | yes |
| intcalc_acctdata | 00000000007 | field | curr_cyc_debit | 0 | -579.88 | R-INT-CYC | yes |
| intcalc_acctdata | 00000000008 | field | curr_bal | 2167.68 | 2138.08 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000008 | field | curr_cyc_credit | 0 | 2368.19 | R-INT-CYC | yes |
| intcalc_acctdata | 00000000008 | field | curr_cyc_debit | 0 | -835.11 | R-INT-CYC | yes |
| intcalc_acctdata | 00000000009 | field | curr_bal | 3243.89 | 3207.55 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000009 | field | curr_cyc_credit | 0 | 2907.66 | R-INT-CYC | yes |
| intcalc_acctdata | 00000000009 | field | curr_cyc_debit | 0 | -260.11 | R-INT-CYC | yes |
| intcalc_acctdata | 00000000010 | field | curr_bal | 1169.87 | 1150.76 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000010 | field | curr_cyc_credit | 0 | 1529.20 | R-INT-CYC | yes |
| intcalc_acctdata | 00000000010 | field | curr_cyc_debit | 0 | -537.44 | R-INT-CYC | yes |
| intcalc_acctdata | 00000000011 | field | curr_bal | 1565.89 | 1539.99 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000011 | field | curr_cyc_credit | 0 | 2072.76 | R-INT-CYC | yes |
| intcalc_acctdata | 00000000011 | field | curr_cyc_debit | 0 | -744.77 | R-INT-CYC | yes |
| intcalc_acctdata | 00000000012 | field | curr_bal | 1800.11 | 1770.65 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000012 | field | curr_cyc_credit | 0 | 2357.09 | R-INT-CYC | yes |
| intcalc_acctdata | 00000000012 | field | curr_cyc_debit | 0 | -762.44 | R-INT-CYC | yes |
| intcalc_acctdata | 00000000013 | field | curr_bal | 2896.04 | 2860.10 | R-INT-APPLY | yes |
| intcalc_acctdata | 00000000013 | field | curr_cyc_credit | 0 | 2875.87 | R-INT-CYC | yes |
| intcalc_acctdata | 00000000013 | field | curr_cyc_debit | 0 | -56.77 | R-INT-CYC | yes |
| intcalc_acctdata | 00000000014 | field | curr_bal | 1503.13 | 1475.99 | R-INT-APPLY | yes |
