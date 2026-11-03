# Score: `runs/a17/accrue_zflx_code/r2/out/c04` vs `runs/A5_golden/c04`

- Equivalence (strict): **100.00%** · business: **100.00%** of 103 records
- Divergent records: 0 (silent 0, flagged 0)
- Flags raised: 4 (unneeded 4) · volatile fields masked: {'intcalc_systran.orig_ts': 53, 'intcalc_systran.proc_ts': 53}

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| intcalc_acctdata | 50 | 50 | 50 | 50 |
| intcalc_systran | 53 | 53 | 53 | 53 |

| Rule | silent | flagged |
|---|---|---|

First 40 divergences:

| output | key | kind | field | golden | candidate | rule | flagged |
|---|---|---|---|---|---|---|---|
