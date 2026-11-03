# Score: `runs/posttran_zflx_sonnet/r2/out/base` vs `golden/v1`

- Equivalence (strict): **100.00%** · business: **100.00%** of 450 records
- Divergent records: 0 (silent 0, flagged 0)
- Flags raised: 24 (unneeded 24) · volatile fields masked: {'posttran_transact.proc_ts': 262}

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| posttran_transact | 262 | 262 | 262 | 262 |
| posttran_dalyrejs | 38 | 38 | 38 | 38 |
| posttran_acctdata | 50 | 50 | 50 | 50 |
| posttran_tcatbal | 100 | 100 | 100 | 100 |

| Rule | silent | flagged |
|---|---|---|

First 40 divergences:

| output | key | kind | field | golden | candidate | rule | flagged |
|---|---|---|---|---|---|---|---|
