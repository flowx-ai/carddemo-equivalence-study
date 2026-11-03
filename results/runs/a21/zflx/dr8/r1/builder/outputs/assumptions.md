# POSTTRAN (daily-transaction-posting, P-14): assumptions and decisions

Each decision gives what was assumed and the wiki statement it rests on, or the gap it fills. "Wiki"
means the pages in `posttran-sonnet-dr8.pdf`.

## Behaviour

**A1 — Posting order is ascending amount, not feed order.**
The run sorts the feed by amount ascending, smallest first; equal amounts keep their feed order (a
stable sort). Every check and every posting happens in that order, so each over-limit check sees the
cycle totals left by the records posted before it.
Rests on: BR-10 ("ascending order of amount, smallest first (credits, which carry negative amounts,
come first); transactions with equal amounts keep their order in the daily feed. Every check
(BR-01–BR-04) and every posting (BR-05) happens in that order") and acceptance scenario 11.
Note: the legacy program reads DALYTRAN sequentially. The Purpose section says the process "replaces
the legacy sequential read loop" without saying the order changes. BR-10 still cites `CBTRN02C` as its
source. I followed BR-10 because it is the explicit rule. Where cycle totals push a record across its
credit limit, this can reject (102) a different record from the one a feed-order run would reject.

**A2 — Validation order is xref → account → limit → expiry, and an xref miss stops validation.**
If the card is not in CardXref, the reason is 100 and no account checks run, because the account is
only reachable through the xref. If the account is missing, the reason is 101 and the limit and
expiry checks do not run.
Rests on: BR-01/BR-02, the Legacy Comparison row "xref → account → limit → expiry", and the
GET_ACCOUNT_BY_CARD operation (xref first, then account). Acceptance scenario 6 ("card invalid and
account expired → only the last failing reason is kept") cannot happen literally: with no xref there
is no account to test for expiry. Such a record gets 100.

**A3 — Limit and expiry are both evaluated; 103 overwrites 102. Reasons are not collected.**
Rests on: BR-04 ("overwrites 102 when both apply … preserve legacy overwrite order for parity
testing") and the Legacy Comparison row "Reject reason: last failure overwrites — same". The open
`{{DECISION: keep or collect all reasons}}` is resolved as "keep the last" (parity).

**A4 — The over-limit test is strict.**
The record is rejected only when `currentCycleCredit − currentCycleDebit + amount > creditLimit`. A
result exactly equal to the limit passes. The test uses the account's cycle totals as already updated
by earlier postings in the same run.
Rests on: BR-03 (the formula and the ">") and scenario 11 ("each check sees the cycle totals left by
the transactions before it").

**A5 — Expiry compares dates as text.**
The account `expiryDate` (YYYY-MM-DD) is compared with the first 10 characters of the transaction's
`orig_ts`. The record is rejected only when expiry < transaction date; the same day passes.
Rests on: BR-04 ("account.expiryDate < transaction original date"). The wiki does not say which part
of the 26-character timestamp is the date. The leading YYYY-MM-DD is the only date it contains.

**A6 — A zero amount counts as a credit.**
`amount ≥ 0` goes to `currentCycleCredit`, otherwise to `currentCycleDebit`; `currentBalance += amount`
always.
Rests on: BR-05 as written.

**A7 — A new category balance starts at the transaction amount.**
When no TransactionCategoryBalance exists for (account id from xref, type, category), one is created
with balance = amount. Otherwise the amount is added to it.
Rests on: BR-05 ("TCATBAL upsert (create on not found)"), scenario 9, and DT-06 (composite key
accountId + typeCode + categoryCode).

**A8 — A posted transaction keeps the feed's transaction id.**
No new id is generated from a sequence.
Rests on: DT-11 ("same attributes as Transaction"), BR-09 ("each record is idempotent via
transactionId", which needs a stable id) and the POST_TRANSACTION mapping (passes the
`dailyTransaction`). DT-05 says FlowX allocates ids from a sequence, and transaction-data-access
ADD_TRANSACTION does too. I read that as applying to online adds (COTRN02C's "last record + 1"), not to
posting a feed record that already has an id.

**A9 — `proc_ts` of a posted transaction is the posting time ("now").**
It uses the legacy DB2 timestamp layout `YYYY-MM-DD-HH.MM.SS.hh0000` (26 characters) and the FlowX
script runner's clock (UTC). It is not derived from the business date.
Rests on: BR-05 ("processedTimestamp = now") and DT-05 (`TRAN-PROC-TS X(26)`). The wiki gives no
format. Consequence: `proc_ts` cannot match an oracle run made at another time; it is flagged in
`flags.json`.

**A10 — A reject is the feed record unchanged plus the reason code and text.**
That includes the feed's own `proc_ts`. Reason texts are exactly the wiki strings: 100 "INVALID CARD
NUMBER FOUND", 101 "ACCOUNT RECORD NOT FOUND", 102 "OVERLIMIT TRANSACTION", 103 "TRANSACTION RECEIVED
AFTER ACCT EXPIRATION".
Rests on: BR-06 ("original 350-byte image + 4-digit reason + 76-character description"), BR-01..BR-04
and scenario 7.

**A11 — Reason 109 (account rewrite failure) cannot occur.**
Account updates happen inside one workflow run against the account just validated, so the rewrite
cannot fail. No record is ever dropped under BR-08.
Rests on: BR-08. It describes a store-write failure this design does not have.

**A12 — A transaction id is posted at most once per run.**
A later record with an already-posted id is neither posted nor rejected. It is listed in the run
summary (`duplicateTransactionIds`, `duplicateCount`), and the count check becomes
read = posted + rejected + duplicates.
Rests on: BR-09 (idempotent via `transactionId`). The wiki says nothing about duplicate ids inside one
feed. Legacy would fail its TRANSACT write on a duplicate key.

**A13 — Restart means re-running from the start.**
The whole feed is processed in one workflow instance, and output files are written only after it
finishes. A failed run therefore leaves no partial postings and is simply re-run.
Rests on: BR-09 ("restart resumes after the last processed index") and scenario 10 ("no duplicate
postings"). Resuming mid-feed matters only when postings are committed one by one to a persistent
store (see A14). With all-or-nothing outputs, a re-run gives the same result with no duplicates.

**A14 — Persistence and integrations are collapsed into one workflow working on the files.**
The wiki designs a BPMN process: Load Daily Feed, then a For-Each subprocess, then Send/Receive pairs
to account-, transaction- and reference-data-access workflows over the `carddemo-datastore` NOSQL_DB,
plus WRITE_REJECT. Instead, one integration workflow `posttran_daily_transaction_posting` does the
same steps in memory as SCRIPT nodes: Load Daily Feed → Order Feed by Amount (BR-10) → Validate and
Post → Build Run Summary. The records come in from the CONTRACT input files and go out to the CONTRACT
output files through `posttran_io.py`, which stands in for batch-file-transfer.
Rests on: CONTRACT.md (inputs are the legacy files; outputs are JSON files). The datastore is not part
of the contract, and no data-access workflow or datastore exists in this project. For the same reason
`postingChunkSize` is not applied: one run covers the whole feed.

**A15 — The account is found through the xref's account id; ids are compared as numbers.**
Leading zeros are ignored, so `00000000001` matches `1`.
Rests on: BR-02 and the POST_TRANSACTION mapping ("accountId (from xref)"). The DT-01/DT-04 ids are
numeric strings.

**A16 — The account's active status is not checked.**
Every account is written to `posttran_acctdata.json` after posting, changed or not. Fields other than
balance and cycle totals pass through untouched.
Rests on: the absence of an active-status rule among BR-01..BR-10, and CONTRACT ("account fields for
every account, after posting").

**A17 — The run is WARNING with return code 4 when any record is rejected, otherwise COMPLETED with 0.**
This is reported in `posttran_run_summary.json`, which is not a contract output.
Rests on: BR-07 and scenario 8.

**A18 — Run parameters and the batch window do not affect posting.**
The business date and batch id are carried into the run summary only. No posting rule uses them: dates
come from `orig_ts`, and `proc_ts` is "now". `RuntimeSwitches.batchWindowOpen` is not checked here.
Rests on: the process start data (batchId, businessDate, feedReference) with no rule consuming them.
The batch window is owned by end-of-day-batch-chain.

## Input reading

**A19 — Signed amounts may arrive in several encodings, and all are accepted.**
The last byte of a signed field (`S9(n)V99`) may be an overpunch: `{`, `A`–`I` positive; `}`, `J`–`R`
negative. The ASCII-style negative `p`–`y` and a plain digit (positive) are also accepted, as is a
literal decimal point or sign. An unreadable amount fails the run, naming the field.
Rests on: CONTRACT ("layouts as in the copybooks"), which gives no sign encoding, and the wiki's note
that seed files store signed overpunch (`0150{`).

**A20 — Line handling and duplicate master keys.**
- Lines shorter than the record length are padded with spaces.
- Blank lines are skipped.
- Records are read by the CVTRA06Y / CVACT01Y / CVACT03Y / CVTRA01Y offsets.
- `tcatbal.dat` may be absent and is then treated as empty.
- When a master file holds the same key twice, the first record wins.

Rests on: CONTRACT ("one record per line, fixed width"). The wiki says nothing about short lines,
blank lines or duplicate keys.

## Output format

**A21 — Field types and values.**
- `cat_cd`, `merchant_id` and `acct_id` are integers. A blank numeric field becomes 0.
- In the category-balance output, `acct_id` and `cat_cd` are integers as well; CONTRACT does not type
  them, so this matches the other outputs.
- Amounts are strings with exactly two decimals (`"-50.00"`).
- Strings are right-trimmed.

Rests on: CONTRACT's field lists and its amount rule.

**A22 — Record order in the outputs.**
- Posted transactions: posting order (A1).
- Rejects: processing order.
- Accounts: input file order.
- Category balances: input order, with new ones appended in creation order.

Rests on: CONTRACT ("a list of objects, in any order").
