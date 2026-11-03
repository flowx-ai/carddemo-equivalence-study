# Score: `runs/full/zflx/r2/batch/core/posttran/out/c03` vs `~/Dev/_tests/carddemo-oracle/golden/v1/cases/c03/out`

- Equivalence (strict): **100.00%** · business: **100.00%** of 451 records
- Divergent records: 0 (silent 0, flagged 0)
- Flags raised: 1 (unneeded 1) · volatile fields masked: none differed

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| posttran_transact | 262 | 262 | 262 | 262 |
| posttran_dalyrejs | 39 | 39 | 39 | 39 |
| posttran_acctdata | 50 | 50 | 50 | 50 |
| posttran_tcatbal | 100 | 100 | 100 | 100 |

| Rule | silent | flagged |
|---|---|---|

First 40 divergences:

| output | key | kind | field | golden | candidate | rule | flagged |
|---|---|---|---|---|---|---|---|
