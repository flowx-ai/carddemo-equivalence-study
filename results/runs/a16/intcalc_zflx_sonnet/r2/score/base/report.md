# Score: `runs/a16/intcalc_zflx_sonnet/r2/out/base` vs `runs/A16_golden/cr1/base`

- Equivalence (strict): **99.00%** · business: **99.00%** of 100 records
- Divergent records: 1 (silent 1, flagged 0)
- Flags raised: 9 (unneeded 9) · volatile fields masked: {'intcalc_systran.proc_ts': 50, 'intcalc_systran.orig_ts': 50}

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| intcalc_acctdata | 50 | 50 | 49 | 49 |
| intcalc_systran | 50 | 50 | 50 | 50 |

| Rule | silent | flagged |
|---|---|---|
| R-INT-LAST | 3 | 0 |

First 40 divergences:

| output | key | kind | field | golden | candidate | rule | flagged |
|---|---|---|---|---|---|---|---|
| intcalc_acctdata | 00000000050 | field | curr_bal | 1945.87 | 1964.64 | R-INT-LAST | no |
| intcalc_acctdata | 00000000050 | field | curr_cyc_credit | 1501.75 | 0.00 | R-INT-LAST | no |
| intcalc_acctdata | 00000000050 | field | curr_cyc_debit | -47.88 | 0.00 | R-INT-LAST | no |
