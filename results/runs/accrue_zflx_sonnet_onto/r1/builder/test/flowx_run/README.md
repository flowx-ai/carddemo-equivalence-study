Outputs of FlowX run `6ade34f40ad1dbd85dcfa856` of workflow `accrue_interest_calculation` on the
`../fixture/*.dat` records (interestRunDate 2022071800). These are synthetic acceptance-criteria cases, not the
contract run inputs.

Hand-checked expectations:
- acct 1 / 01 / 0001: 1000.00 × 18.00 / 1200 = 15.00 (AC-1 smoke)
- acct 1 / 01 / 0002: 999.99 × 18.00 / 1200 = 14.99985, truncated to 14.99 (BR-08)
- acct 1 / 02 / 0001: payment category with rate 0, no transaction (BR-10)
- acct 2 (group MISSINGGRP): STANDARD fallback, 200.00 × 24 / 1200 = 4.00; −120.07 × 15 / 1200 = −1.50 (AC-4)
- acct 3 (ZEROAPR): no transaction, cycle credit/debit reset (AC-5, BR-06)
- acct 4: no balances, record unchanged
- acct 5: balance without an account record, skipped and logged
- balances arrive unsorted and are processed in key order; acct 1 uses its lower card number
- balances: acct 1 500.00 + 29.99 = 529.99; acct 2 −10.00 + 2.50 = −7.50
