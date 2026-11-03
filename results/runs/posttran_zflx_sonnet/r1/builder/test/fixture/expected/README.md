# Fixture run (verified on FlowX, run 6adf1c2e16836599f394565f, 2026-10-26)

Input: `../dailytran.dat`, `../acctdata.dat`, `../cardxref.dat`, `../tcatbal.dat` (12 daily records).

| Record | Card / account | Amount | Expected | Got |
|---|---|---|---|---|
| ...01 | 4111.. / 1 | +50.00 | posted, tcatbal (1,01,1) 100→150 | posted |
| ...02 | 4111.. / 1 | -20.00 | posted, new tcatbal (1,01,5) -20.00, cycle debit -20.00 | posted |
| ...03 | 4000.. (not in xref) | 10.00 | reject 100 | 100 |
| ...04 | 4999.. → acct 99 (missing) | 10.00 | reject 101 | 101 |
| ...05 | 4222.. / 2 (limit 100, cyc credit 50) | 60.00 | reject 102 (110 > 100) | 102 |
| ...06 | 4333.. / 3 (expired 2022-07-01) | 10.00 | reject 103 | 103 |
| ...07 | 4333.. / 3 | 6000.00 | over limit AND expired → 103 kept | 103 |
| ...08 | 4222.. / 2 | 40.00 | posted (90 ≤ 100) | posted |
| ...09 | 4222.. / 2 | 10.00 | posted (100 = limit) | posted |
| ...10 | 4222.. / 2 | 0.01 | reject 102 (uses balances updated by ...08/...09) | 102 |
| ...01 again | 4111.. / 1 | 50.00 | duplicate id → skipped, not reposted | skipped |
| ...12 | 4111.. / 1, orig date = expiry date 2025-05-20 | 5.00 | posted (equal date is not "after") | posted |

Totals: read 12, posted 5, rejected 6, duplicates 1; status WARNING, return code 4.
Accounts after posting: 1 → bal 135.00 / cyc credit 55.00 / cyc debit -20.00; 2 → bal 50.00 / cyc credit 100.00;
3 and 4 unchanged. Category balances: (1,01,1) 155.00, (4,02,3) -25.00, (1,01,5) -20.00, (2,01,1) 50.00.
