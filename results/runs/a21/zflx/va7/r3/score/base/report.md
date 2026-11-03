# Score: `runs/a21/zflx/va7/r3/out/base` vs `golden/cr4`

- Equivalence (strict): **100.00%** · business: **100.00%** of 450 records
- Divergent records: 0 (silent 0, flagged 0)
- Flags raised: 9 (unneeded 9) · volatile fields masked: {'posttran_transact.proc_ts': 229}

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| posttran_transact | 229 | 229 | 229 | 229 |
| posttran_dalyrejs | 71 | 71 | 71 | 71 |
| posttran_acctdata | 50 | 50 | 50 | 50 |
| posttran_tcatbal | 100 | 100 | 100 | 100 |

| Rule | silent | flagged |
|---|---|---|

First 40 divergences:

| output | key | kind | field | golden | candidate | rule | flagged |
|---|---|---|---|---|---|---|---|
