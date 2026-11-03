# Score: `runs/full/zflx/r3/batch/core/posttran/out/c04` vs `~/Dev/_tests/carddemo-oracle/golden/v1/cases/c04/out`

- Equivalence (strict): **100.00%** · business: **100.00%** of 457 records
- Divergent records: 0 (silent 0, flagged 0)
- Flags raised: 1 (unneeded 1) · volatile fields masked: none differed

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| posttran_transact | 266 | 266 | 266 | 266 |
| posttran_dalyrejs | 38 | 38 | 38 | 38 |
| posttran_acctdata | 50 | 50 | 50 | 50 |
| posttran_tcatbal | 103 | 103 | 103 | 103 |

| Rule | silent | flagged |
|---|---|---|

First 40 divergences:

| output | key | kind | field | golden | candidate | rule | flagged |
|---|---|---|---|---|---|---|---|
