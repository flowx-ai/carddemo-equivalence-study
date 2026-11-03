# Score: `runs/a17/accrue_zflx_code/r3/out/c03` vs `runs/A5_golden/c03`

- Equivalence (strict): **100.00%** · business: **100.00%** of 100 records
- Divergent records: 0 (silent 0, flagged 0)
- Flags raised: 5 (unneeded 5) · volatile fields masked: {'intcalc_systran.orig_ts': 50, 'intcalc_systran.proc_ts': 50}

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| intcalc_acctdata | 50 | 50 | 50 | 50 |
| intcalc_systran | 50 | 50 | 50 | 50 |

| Rule | silent | flagged |
|---|---|---|

First 40 divergences:

| output | key | kind | field | golden | candidate | rule | flagged |
|---|---|---|---|---|---|---|---|
