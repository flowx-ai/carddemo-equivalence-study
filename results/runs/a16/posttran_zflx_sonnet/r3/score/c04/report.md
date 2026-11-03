# Score: `runs/a16/posttran_zflx_sonnet/r3/out/c04` vs `golden/cr2/cases/c04/out`

- Equivalence (strict): **100.00%** · business: **100.00%** of 457 records
- Divergent records: 0 (silent 0, flagged 0)
- Flags raised: 11 (unneeded 11) · volatile fields masked: {'posttran_transact.proc_ts': 269}

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| posttran_transact | 269 | 269 | 269 | 269 |
| posttran_dalyrejs | 35 | 35 | 35 | 35 |
| posttran_acctdata | 50 | 50 | 50 | 50 |
| posttran_tcatbal | 103 | 103 | 103 | 103 |

| Rule | silent | flagged |
|---|---|---|

First 40 divergences:

| output | key | kind | field | golden | candidate | rule | flagged |
|---|---|---|---|---|---|---|---|
