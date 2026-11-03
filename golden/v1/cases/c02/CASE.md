# c02 — INTCALC disclosure-group paths

Base sample data with ACCT-GROUP-ID (bytes 113–122, blank in the shipped data) set on three accounts, and one DISCGRP row added (`C02GRP24`, type 01, category 0001, rate 24.00):

| Account | Group | Path targeted |
|---|---|---|
| 00000000001 | `C02GRP24` | group found in DISCGRP (row added: type 01 / cat 0001 at 24.00, vs DEFAULT 15.00): own rate used, no fallback; its type 03 balance has no C02GRP24 row, so that one falls back to DEFAULT |
| 00000000002 | `ZEROAPR` | group rate is 0: no interest transaction written, account still closed (cycle totals reset) |
| 00000000003 | `NOSUCHGRP` | group missing from DISCGRP: falls back to DEFAULT |

The last-account defect (notebook §7) still applies to account 00000000050.
