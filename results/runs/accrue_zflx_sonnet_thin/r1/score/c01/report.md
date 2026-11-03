# Score: `runs/accrue_zflx_sonnet_thin/r1/out/c01` vs `runs/A5_golden/c01`

- Equivalence (strict): **99.00%** · business: **99.00%** of 100 records
- Divergent records: 1 (silent 0, flagged 1)
- Flags raised: 13 (unneeded 12) · volatile fields masked: {'intcalc_systran.orig_ts': 50, 'intcalc_systran.proc_ts': 50}

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| intcalc_systran | 50 | 50 | 50 | 50 |
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
