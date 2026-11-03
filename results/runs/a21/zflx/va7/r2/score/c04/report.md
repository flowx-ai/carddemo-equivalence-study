# Score: `runs/a21/zflx/va7/r2/out/c04` vs `golden/cr4/cases/c04/out`

- Equivalence (strict): **100.00%** · business: **100.00%** of 455 records
- Divergent records: 0 (silent 0, flagged 0)
- Flags raised: 19 (unneeded 19) · volatile fields masked: {'posttran_transact.proc_ts': 231}

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| posttran_transact | 231 | 231 | 231 | 231 |
| posttran_dalyrejs | 73 | 73 | 73 | 73 |
| posttran_acctdata | 50 | 50 | 50 | 50 |
| posttran_tcatbal | 101 | 101 | 101 | 101 |

| Rule | silent | flagged |
|---|---|---|

First 40 divergences:

| output | key | kind | field | golden | candidate | rule | flagged |
|---|---|---|---|---|---|---|---|
