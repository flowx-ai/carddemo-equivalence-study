# Score: `runs/a23/harness/dr8/r1/out/base` vs `golden/cr5`

- Equivalence (strict): **100.00%** · business: **100.00%** of 450 records
- Divergent records: 0 (silent 0, flagged 0)
- Flags raised: 13 (unneeded 13) · volatile fields masked: {'posttran_transact.proc_ts': 257}

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| posttran_transact | 257 | 257 | 257 | 257 |
| posttran_dalyrejs | 43 | 43 | 43 | 43 |
| posttran_acctdata | 50 | 50 | 50 | 50 |
| posttran_tcatbal | 100 | 100 | 100 | 100 |

| Rule | silent | flagged |
|---|---|---|

First 40 divergences:

| output | key | kind | field | golden | candidate | rule | flagged |
|---|---|---|---|---|---|---|---|
