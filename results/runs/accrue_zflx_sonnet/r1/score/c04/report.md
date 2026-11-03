# Score: `runs/accrue_zflx_sonnet/r1/out/c04` vs `runs/A5_golden/c04`

- Equivalence (strict): **99.03%** · business: **99.03%** of 103 records
- Divergent records: 1 (silent 1, flagged 0)
- Flags raised: 12 (unneeded 12) · volatile fields masked: {'intcalc_systran.orig_ts': 53, 'intcalc_systran.proc_ts': 53}

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| intcalc_systran | 53 | 53 | 53 | 53 |
| intcalc_acctdata | 50 | 50 | 49 | 49 |

| Rule | silent | flagged |
|---|---|---|
| R-INT-LAST | 3 | 0 |

First 40 divergences:

| output | key | kind | field | golden | candidate | rule | flagged |
|---|---|---|---|---|---|---|---|
| intcalc_acctdata | 00000000050 | field | curr_bal | 1945.87 | 1964.64 | R-INT-LAST | no |
| intcalc_acctdata | 00000000050 | field | curr_cyc_credit | 1501.75 | 0.00 | R-INT-LAST | no |
| intcalc_acctdata | 00000000050 | field | curr_cyc_debit | -47.88 | 0.00 | R-INT-LAST | no |
