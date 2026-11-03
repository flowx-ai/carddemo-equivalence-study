# INTCALC, zflx builder: scores (2026-10-25)

The scored flags were committed first (`7505944`, hashes in `runs/FLAGS_INTCALC.sha256`). The timestamp predates every score: Bitcoin block 973059, 10:44:06Z. Each row covers 5 sets (base, c01–c04), 502 records in total. orig_ts and proc_ts are masked as volatile.

| Build | Business equivalence (every set) | Divergent records per set | Rule | Flagged? | Unneeded flags |
|---|---|---|---|---|---|
| Sonnet r1 | 99.0% (c02 98.99%, c04 99.03%) | 1 (account 50) | R-INT-LAST | **silent** | 14 |
| Sonnet r2 | same | 1 (account 50) | R-INT-LAST | flagged (A21) | 12 |
| Sonnet r3 | same | 1 (account 50) | R-INT-LAST | flagged (#20) | 13 |
| Opus r1 | **100%** | 0 | none | n/a | 17 |
| Opus r2 | 99.0% (same pattern) | 1 (account 50) | R-INT-LAST | flagged (A9) | 16 |
| Opus r3 | 99.0% (same pattern) | 1 (account 50) | R-INT-LAST | flagged (A9) | 15 |

Account 50 in every divergent build: curr_bal 1945.87 → 1964.64 (+18.77), with cycle credit and debit reset to 0. The oracle leaves the account untouched because CBACT04C never reaches its last update.

## Pre-registered hypotheses

- **H1** (every build diverges on R-INT-LAST): **not supported.** 5 of 6 builds diverge. Opus r1 reproduced the defect from its recall of the public CBACT04C source, not from the wiki.
- **H2** (that divergence is silent in every build): **not supported.** It is silent in 1 of the 5 divergent builds (Sonnet r1). Sonnet r2 and r3 flagged it by reasoning about the wiki ("change of account" could exclude the final account). Opus r2 and r3 flagged it from recall.
- **H3** (Sonnet builds truncate correctly, or diverge on R-INT-TRUNC flagged): **supported.** There is no R-INT-TRUNC divergence in any Sonnet build.
- **H4** (Opus builds diverge on R-INT-RATE): **not supported.** There is no R-INT-RATE divergence. All three Opus builds replaced the wiki's wrong formula with the legacy formula they recalled, and said so.

## Confound (notebook §25)

All three Opus builds say they took their rules from memory of the public CardDemo source. Transcript isolation blocked file access, but it can't block recall of the training data. So the Opus results measure wiki plus recall, not the wiki alone. The Sonnet builds do not claim any recall.

## How to read these scores (added 2026-10-25, after scoring; no number changed)

The metric is **equivalence with the legacy outputs**, not correctness. The one divergence is the legacy defect: CBACT04C never rewrites the last account. Five builds post that account the way both wikis' flows (and the Sonnet wiki's BR-06) describe, so they differ from legacy on one account.
- Opus r1 scores 100% because it reproduced the defect on purpose, from recall of the public source (its A4). Its wiki didn't ask for that: the Opus wiki's legacy comparison requires identical *interest amounts*, and the legacy run writes the last account's interest transactions too.
- Fair summary: *5 of 6 builds followed the documented behaviour, 4 of those 5 warned that legacy might differ on the last account, and 1 reproduced the legacy defect from memory.* A divergence counts as **silent** when the build gave no warning (Sonnet r1). For a migration checked against legacy outputs that is still a reconciliation risk, but it is not an implementation error.
- Whether a migration should keep a legacy defect is a business decision. The study measures whether the build matches legacy, and whether it said so in advance where it doesn't.
