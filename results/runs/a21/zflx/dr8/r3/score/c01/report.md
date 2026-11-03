# Score: `runs/a21/zflx/dr8/r3/out/c01` vs `golden/cr5/cases/c01/out`

- Equivalence (strict): **100.00%** · business: **100.00%** of 457 records
- Divergent records: 0 (silent 0, flagged 0)
- Flags raised: 17 (unneeded 17) · volatile fields masked: {'posttran_transact.proc_ts': 260}

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| posttran_transact | 260 | 260 | 260 | 260 |
| posttran_dalyrejs | 47 | 47 | 47 | 47 |
| posttran_acctdata | 50 | 50 | 50 | 50 |
| posttran_tcatbal | 100 | 100 | 100 | 100 |

| Rule | silent | flagged |
|---|---|---|

First 40 divergences:

| output | key | kind | field | golden | candidate | rule | flagged |
|---|---|---|---|---|---|---|---|
