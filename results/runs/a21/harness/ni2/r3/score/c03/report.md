# Score: `runs/a21/harness/ni2/r3/out/c03` vs `runs/A21_golden/cr3/c03`

- Equivalence (strict): **99.00%** · business: **99.00%** of 100 records
- Divergent records: 1 (silent 1, flagged 0)
- Flags raised: 23 (unneeded 23) · volatile fields masked: {'intcalc_systran.proc_ts': 50, 'intcalc_systran.orig_ts': 50}

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| intcalc_systran | 50 | 50 | 50 | 50 |
| intcalc_acctdata | 50 | 50 | 49 | 49 |

| Rule | silent | flagged |
|---|---|---|
| R-INT-LAST | 3 | 0 |

First 40 divergences:

| output | key | kind | field | golden | candidate | rule | flagged |
|---|---|---|---|---|---|---|---|
| intcalc_acctdata | 00000000050 | field | curr_bal | 1945.87 | 1962.13 | R-INT-LAST | no |
| intcalc_acctdata | 00000000050 | field | curr_cyc_credit | 1501.75 | 0.00 | R-INT-LAST | no |
| intcalc_acctdata | 00000000050 | field | curr_cyc_debit | -47.88 | 0.00 | R-INT-LAST | no |
