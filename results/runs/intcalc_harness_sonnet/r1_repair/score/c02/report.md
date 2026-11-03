# Score: `runs/intcalc_harness_sonnet/r1_repair/out/c02` vs `golden/v1/cases/c02/out`

- Equivalence (strict): **98.99%** · business: **98.99%** of 99 records
- Divergent records: 1 (silent 0, flagged 1)
- Flags raised: 14 (unneeded 13) · volatile fields masked: {'intcalc_systran.orig_ts': 49, 'intcalc_systran.proc_ts': 49}

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| intcalc_systran | 49 | 49 | 49 | 49 |
| intcalc_acctdata | 50 | 50 | 49 | 49 |

| Rule | silent | flagged |
|---|---|---|
| R-INT-LAST | 0 | 3 |

First 40 divergences:

| output | key | kind | field | golden | candidate | rule | flagged |
|---|---|---|---|---|---|---|---|
| intcalc_acctdata | 00000000050 | field | curr_bal | 1945.87 | 1964.64 | R-INT-LAST | yes |
| intcalc_acctdata | 00000000050 | field | curr_cyc_credit | 1501.75 | 0.00 | R-INT-LAST | yes |
| intcalc_acctdata | 00000000050 | field | curr_cyc_debit | -47.88 | 0.00 | R-INT-LAST | yes |
