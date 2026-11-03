# Score: `runs/intcalc_zflx_opus/r1/out/c02` vs `golden/v1/cases/c02/out`

- Equivalence (strict): **100.00%** · business: **100.00%** of 99 records
- Divergent records: 0 (silent 0, flagged 0)
- Flags raised: 17 (unneeded 17) · volatile fields masked: {'intcalc_systran.proc_ts': 49, 'intcalc_systran.orig_ts': 49}

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| intcalc_systran | 49 | 49 | 49 | 49 |
| intcalc_acctdata | 50 | 50 | 50 | 50 |

| Rule | silent | flagged |
|---|---|---|

First 40 divergences:

| output | key | kind | field | golden | candidate | rule | flagged |
|---|---|---|---|---|---|---|---|
