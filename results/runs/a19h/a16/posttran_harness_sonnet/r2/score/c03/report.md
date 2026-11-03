# Score: `runs/a19h/a16/posttran_harness_sonnet/r2/out/c03` vs `golden/cr2/cases/c03/out`

- Equivalence (strict): **100.00%** · business: **100.00%** of 451 records
- Divergent records: 0 (silent 0, flagged 0)
- Flags raised: 12 (unneeded 12) · volatile fields masked: {'posttran_transact.proc_ts': 265}

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| posttran_transact | 265 | 265 | 265 | 265 |
| posttran_dalyrejs | 36 | 36 | 36 | 36 |
| posttran_acctdata | 50 | 50 | 50 | 50 |
| posttran_tcatbal | 100 | 100 | 100 | 100 |

| Rule | silent | flagged |
|---|---|---|

First 40 divergences:

| output | key | kind | field | golden | candidate | rule | flagged |
|---|---|---|---|---|---|---|---|
