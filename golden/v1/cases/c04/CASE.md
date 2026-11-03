# c04 — INTCALC value partitions

Base sample data plus the daily transactions below (appended, orig date 2022-06-10). Expected outcomes written before the first run.

| Tran ID | Account | Type/cat | Amount | Rule targeted | Expected |
|---|---|---|---|---|---|
| C04T000000000001 | 00000000004 | 01/0002 | -123.45 | I11: negative balance in a rated category (DEFAULT 01/0002 = 25.00) | posted; interest = -123.45 x 25 / 1200 = -2.571875 -> **-2.57** (truncated toward zero; floor would give -2.58) |
| C04T000000000002 | 00000000005 | 01/0002 | 200.00 | I13: second rated category on one account (DEFAULT 25.00) | posted; interest 200.00 x 25 / 1200 = 4.1666.. -> **4.16** |
| C04T000000000003 | 00000000005 | 04/0001 | 300.00 | I13: third rated category on the same account (DEFAULT 04/0001 = 15.00) | posted; interest 300.00 x 15 / 1200 = **3.75** |
| C04T000000000004 | 00000000006 | 01/0001 | 0.00 | P11: amount exactly 0 (>= 0, so added to cycle credit) | posted; no visible effect on balances (adding 0 to credit or debit is the same): P11 is unobservable in the outputs |

Expected at INTCALC: account 00000000004 has two rated categories (01/0001 from the base data, 01/0002 negative) -> two interest transactions on its card; account 00000000005 has three (01/0001, 01/0002, 04/0001) -> three interest transactions on one card, all summed into its balance; 53 interest transactions in total (50 + 1 + 2). Interest IDs after these accounts shift by the extra transactions. The last-account defect still applies to account 00000000050.
