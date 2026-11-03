# Score: `runs/a23/harness/dr8/r1/out/c04` vs `golden/cr5/cases/c04/out`

- Equivalence (strict): **100.00%** · business: **100.00%** of 457 records
- Divergent records: 0 (silent 0, flagged 0)
- Flags raised: 13 (unneeded 13) · volatile fields masked: {'posttran_transact.proc_ts': 261}

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| posttran_transact | 261 | 261 | 261 | 261 |
| posttran_dalyrejs | 43 | 43 | 43 | 43 |
| posttran_acctdata | 50 | 50 | 50 | 50 |
| posttran_tcatbal | 103 | 103 | 103 | 103 |

| Rule | silent | flagged |
|---|---|---|

First 40 divergences:

| output | key | kind | field | golden | candidate | rule | flagged |
|---|---|---|---|---|---|---|---|
