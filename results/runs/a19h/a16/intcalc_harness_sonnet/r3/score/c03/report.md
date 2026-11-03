# Score: `runs/a19h/a16/intcalc_harness_sonnet/r3/out/c03` vs `runs/A16_golden/cr1/c03`

- Equivalence (strict): **99.00%** · business: **99.00%** of 100 records
- Divergent records: 1 (silent 0, flagged 1)
- Flags raised: 27 (unneeded 26) · volatile fields masked: {'intcalc_systran.proc_ts': 50, 'intcalc_systran.orig_ts': 50}

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| intcalc_acctdata | 50 | 50 | 49 | 49 |
| intcalc_systran | 50 | 50 | 50 | 50 |

| Rule | silent | flagged |
|---|---|---|
| R-INT-LAST | 0 | 3 |

First 40 divergences:

| output | key | kind | field | golden | candidate | rule | flagged |
|---|---|---|---|---|---|---|---|
| intcalc_acctdata | 00000000050 | field | curr_bal | 1945.87 | 1964.64 | R-INT-LAST | yes |
| intcalc_acctdata | 00000000050 | field | curr_cyc_credit | 1501.75 | 0.00 | R-INT-LAST | yes |
| intcalc_acctdata | 00000000050 | field | curr_cyc_debit | -47.88 | 0.00 | R-INT-LAST | yes |
