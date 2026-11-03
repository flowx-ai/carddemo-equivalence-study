# ACCRUE (interest calculation): assumptions and decisions

These are the decisions taken where the wiki pages (`process-interest-calculation.md`,
`acceptance-criteria-interest-calculation.md`, `project-data-model.md`) are uncertain, incomplete
or silent. The ontology was used as a second source: the export (ONTOLOGY.md) and the project's own
ontology `ledgerline-accrue`, which I queried with a RETRIEVE probe. Both hold the same concepts:
record layouts, file organisations and status codes for LXB002C. Neither contains the interest
arithmetic.

Implementation: the FlowX workflow `accrue_interest_calculation`
(`Start → Load inputs → Compute interest → Post interest → End`). Node sources are in
`flowx/scripts/`. Each item below gives what was assumed and the wiki statement, or missing
statement, it rests on. Items marked **[flagged]** are also declared in `flags.json`.

## Computation

**A1. Formula: monthly interest = balance × rate / 1200. [flagged]**
The wiki gives `interest = currentBalance × interestRate(groupId)` and adds
`{{TODO: Extract exact interest formula, rounding, and grouping from LXB002C + RATEGRP.}}`.
The rate field `RG-INT-RATE` is `signed decimal(6,2)` (ontology, Disclosure Group Record / LXV027Y):
an annual percentage such as `15.00`. Taken literally, balance × 15.00 would charge 1500 % in a
single run. So I read the rate as an annual percentage and the run as a monthly cycle: ÷100 for the
percentage and ÷12 for the month, giving ÷1200. The wiki does not state the period.

**A2. Rounding: truncate toward zero to the cent. [flagged]**
Acceptance scenario 2 says "Rounding matches legacy `{{TODO: confirm rounding mode}}`". Legacy
LXB002C is COBOL, and a COBOL `COMPUTE` into a `V99` field without `ROUNDED` truncates. The
product is kept exact (integer cents × rate hundredths, BigInt) and truncated once at the end.
Example: 1000.00 × 24.99 / 1200 = 20.825 gives **20.82**. A negative result truncates toward zero:
-1.8825 gives -1.88.

**A3. Interest is computed per category balance, not on the account's current balance. [flagged]**
The wiki rule reads `currentBalance × interestRate(groupId)`. The other evidence points to the
category balances:
- the process page lists `TransactionCategoryBalance` as Related Data;
- the data model lists *Interest Calculation* under "Used by" for TransactionCategoryBalance;
- the ontology shows LXB002C using `BALCAT-FILE`, opened sequentially;
- the rate key `RG-GROUP-KEY` is group + transaction type + transaction category. A rate keyed by
  type and category only makes sense when applied to a type/category balance.

So each `balcat` record (account, type, category, balance) is charged at the rate for
(account `group_id`, type, category). The account's total interest is the sum over its records.

**A4. Missing group falls back to the `DEFAULT` group. [flagged]**
The wiki and ontology say nothing about a group with no rate row. I look up
(group, type, category) first, then (`DEFAULT`, type, category). That is the usual convention for
this disclosure-group file and costs nothing when no `DEFAULT` rows exist. If neither row exists,
no interest is charged for that balance and a warning is logged. The legacy program may instead
abend.

**A5. A zero rate writes no transaction; a zero balance with a non-zero rate writes a 0.00
transaction. [flagged]**
Acceptance scenario 3 only says "Zero balance → zero interest". I treat a zero rate as "no
interest applies", so no posting record. A non-zero rate on a zero balance is still computed and
recorded, with amount 0.00.

**A6. No fees.** The wiki mentions interest only, so nothing else is charged.

## Posting to the account

**A7. Balance update: `curr_bal += sum of the account's interest`.**
From the wiki: "Post Interest: Add interest to balance". The wiki also says interest is "posted to
balance and category balance". CONTRACT.md lists no category-balance output for ACCRUE, so the
category balances are read but not rewritten.

**A8. Current-cycle credit and debit reset to 0 on every account the run processes. [flagged]**
The wiki is silent. The ontology's *Account Record* concept, taken from the LXB002C chunk that
rewrites the ledger record (LXB002C-8, "attempting to rewrite the ledger file record"), lists
exactly `LACC-CURR-BAL`, `LACC-CURR-CYC-CREDIT` and `LACC-CURR-CYC-DEBIT`. The interest run
therefore writes those three fields. I took that to mean the cycle accumulators are closed (zeroed)
when interest is posted. This applies even when the account's total interest is 0.00.

**A9. Every account that has category balances is posted, including the last one in key order.
[flagged]**
The wiki loop is "For each account → Compute → Post → Save → More?". I implemented exactly that.
Note for reviewers: in batch programs of this shape, the last account's rewrite sits in an
end-of-file branch, and it is easy for that branch never to execute. If the oracle leaves the
final account unposted, only that account's `curr_bal` and cycle fields will differ.

**A10. Accounts with no category balance are passed through unchanged.**
CONTRACT.md wants "account fields for every account, after interest", so all accounts are output,
sorted by `acct_id`.

## Interest transactions (`accrue_systxn.json`)

**A11. Transaction content. [flagged]**
The wiki does not say an interest transaction is written; CONTRACT.md does ("every interest
transaction written"). The field values are my decisions:
| field | value | basis |
|---|---|---|
| `tran_id` | ACCRUE run parameter (`2022071800`, 10 chars) + 6-digit sequence from `000001` in processing order | the parameter is 10 characters and `TXN-ID` is `X(16)` |
| `type_cd` / `cat_cd` | `01` / `5` | no interest type/category is given anywhere; 01/0005 assumed as the interest code |
| `source` | `System` | batch-generated |
| `desc` | `Int. for a/c ` + 11-digit zero-padded account id | none |
| `amt` | the per-balance interest (A1, A2) | wiki rule |
| `merchant_id` / name / city / zip | `0` / blank | not a merchant transaction |
| `card_num` | card linked to the account in `cardlink.dat`; with several cards, the lowest card number (alternate-index read order) | ontology: LINK-FILE alternate key `FD-LINK-LACC-ID` |
| `orig_ts`, `proc_ts` | business date at midnight in DB2 format, `2022-07-18-00.00.00.000000` | ontology *DB2 Timestamp Format* (LXB002C-20) gives the format. The legacy program uses the wall clock; I chose the business date for reproducibility |

**A12. One transaction per category balance with a non-zero rate**, not one per account. This
follows from A3 and A5.

## Processing order and data quality

**A13. Category balances are processed in key order: account id, type code, category code.**
The ontology gives BALCAT-FILE as INDEXED, read SEQUENTIAL with key `FD-TXN-CAT-KEY`, so legacy
reads in key order. The contract says JSON lists may come "in any order", so inputs are sorted.
The order drives `tran_id` numbering.

**A14. Category balance for an account missing from `ledgacc`: skipped with a warning.**
No transaction and no posting. The legacy random read would fail; the wiki has no error path.

**A15. No card cross-reference for an account: `card_num` is blank**, with a warning.

## Inputs, formats, orchestration

**A16. Inputs follow CONTRACT.md "Step isolation".**
The account and category-balance inputs are the oracle's POSTDAY outputs. The runner looks for
`postday_ledgacc.json`, then `postday_ledgacc.txt`, then `ledgacc.dat`, and the same three for
`balcat`. `cardlink.dat` and `rategrp.dat` are read as given. `daytxn.dat`, `clntrec.dat`,
`crdrec.dat`, `txntype.dat` and `txncatg.dat` are not used by this step.

**A17. Record parsing.**
Fixed-width per the copybook layouts: ledgacc LXV022Y 300 bytes, balcat LXV026Y 50, cardlink
LXV024Y 50, rategrp LXV027Y 50. Field order and widths come from the data model page and the
ontology. Signed numerics are zoned decimal with an implied decimal point and the sign overpunched
on the last digit (`{`–`I` positive, `}`–`R` negative). Values with an explicit point or sign are
also accepted. JSON inputs use the contract field names (`acct_id`, `curr_bal`, … / `acct_id`,
`type_cd`, `cat_cd`, `bal`); amounts may be strings or numbers.

**A18. Output formatting.**
Amounts are strings with exactly two decimals. `acct_id`, `cat_cd` and `merchant_id` are integers.
Trailing spaces are trimmed (CONTRACT.md allows it). `expiration_date` uses the corrected name, per
the data-model DECISION on the `LACC-EXPIRY-DATE` typo.

**A19. Orchestration.**
The wiki describes a scheduled process with "Load Accounts" and "Save Account" message tasks
against FlowX Persistence (`ai.flowx.in.ledgerline.datastore.*`). Those topics and stores do not
exist in this project, and CONTRACT.md fixes file-in/file-out. So the step is a single FlowX
workflow taking the file contents as START input and returning both outputs from its END node. A
scheduled process could call it through a send/receive pair later. Rates are read from `rategrp.dat`
each run rather than from a FlowX Configuration Parameter, because the contract supplies them per
run.

**A20. Run parameters** come from CONTRACT.md: business date `2022-07-18`, ACCRUE parameter
`2022071800`.
