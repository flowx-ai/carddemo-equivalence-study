# Synthetic fixture check (not Ledgerline data)

Fixture = `impl/make_fixture.js` (same records sent inline to FlowX run `6ae1315d3695c563ea5095b2`, workflow `ll_accrue`).
Expected values were hand-computed before the run; the platform output matched every one.

| balcat record (acct/type/cat, bal) | rate used | interest = trunc(bal*rate/1200) | txn |
|---|---|---|---|
| 1/01/0001, 1000.33 | A000000000 15.00 | 12.504125 -> **12.50** | 2022071800000001, card 4111111111111111 (lowest of 2) |
| 1/01/0002, 999.99 | A000000000 0.00 | rate 0 -> no txn | - |
| 1/03/0001, 77.77 | none (no group, no DEFAULT) | no txn | - |
| 2/01/0001, -12.35 | group ZZZ missing -> DEFAULT 24.99 | -0.2572 -> **-0.25** (toward zero) | 2022071800000002 |
| 4/02/0001, 50.00 | A000000000 missing for 02/0001 -> DEFAULT 10.00 | 0.41666 -> **0.41** | 2022071800000003 |

Accounts after interest:
- 1: 1940.00 + 12.50 = **1952.50**, cycle credit/debit -> 0.00
- 2: -50.50 - 0.25 = **-50.75**, cycle credit/debit -> 0.00
- 3: no category balances -> unchanged (cycle 10.00 / -20.00 kept)
- 4: last account in key order -> **not updated** (A-12): 123.45, cycle 10.00 / -20.00 kept
