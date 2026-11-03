# Assumptions — POSTTRAN / daily-transaction-posting (FlowX build)

FlowX implementation: project `cd_a21_va7_zflx_r1` (dev-env), workflow `posttran_daily_transaction_posting`
(resourceDefinitionId `<uuid>`):
`Start → Load Daily Feed → Validate and Post Records → Build Run Summary → End`.

Each entry: what was decided, and the wiki statement (or gap) it rests on. Wiki page abbreviations:
**P14** = process-daily-transaction-posting, **AC** = acceptance-criteria-daily-transaction-posting,
**DM** = project-data-model, **W-ACC / W-TRN / W-REF / W-BFT** = the account / transaction / reference /
batch-file-transfer integration workflows, **EOD** = process-end-of-day-batch-chain, **CONTRACT** = CONTRACT.md.

## Architecture

**A1. One integration workflow instead of process + per-record subprocess + message events + datastore.**
P14 describes a BPMN process with a per-record subprocess and SEND/RECEIVE calls into four integration
workflows. Those workflows read and write a `carddemo-datastore` NOSQL_DB and a Kafka `batch-file-transfer`
connector. I built one DEFAULT workflow instead. It reads the input files' records and returns the output
files' records, and its three SCRIPT nodes mirror the P14 nodes (Load Daily Feed; Validate Record +
Post Transaction + Write Reject; Build Run Summary).
*Rests on:* CONTRACT says the build reads the given fixed-width files and writes JSON outputs; P14 says the
process "Replaces the legacy sequential read loop" but does not change any business rule. The
`batch-file-transfer` gateway (W-BFT) does not exist in this environment. The record-by-record order, and
each posting being visible to the next record's checks, are preserved exactly.

**A2. No paging / chunking.** W-BFT's `READ_FILE_PAGE` cursor and P14's `postingChunkSize` config
parameter are not used. The whole feed is processed in one run, in file order.
*Rests on:* W-BFT gives paging as a transport DECISION (Kafka message size), not a behaviour rule. No value
for `postingChunkSize` is given anywhere.

**A3. Restart / idempotency (BR-09, AC #10).** The run is a single atomic workflow execution: nothing is
persisted part-way, so a failed run is restarted by re-running it on the same inputs, and duplicate postings
cannot arise.
*Rests on:* BR-09 ("each record is idempotent via transactionId; restart resumes after the last processed
index"); AC #10 leaves the restart strategy as an open `{{DECISION}}`.

**A4. `RuntimeSwitches.batchWindowOpen` is not checked.**
*Rests on:* AC "Configuration Dependencies" names it. Its behaviour is only described in EOD (it blocks
*online* processes during the batch), and EOD still has an open TODO about whether to block at all.

## Input parsing

**A5. Record layouts.** Each line is one record, cut by the copybook offsets: CVTRA06Y (350), CVACT01Y
(300), CVACT03Y (50), CVTRA01Y (50). Short lines (trailing spaces stripped) are right-padded to the record
length. Blank lines are skipped. `carddata`, `custdata`, `discgrp`, `trantype` and `trancatg` are not read,
because CBTRN02C / P14 never consult them.
*Rests on:* CONTRACT ("one record per line, fixed width, layouts as in the copybooks"). P14 lists only the
CVTRA06Y/05Y, CVACT01Y/03Y and CVTRA01Y copybooks.

**A6. Signed amounts (PIC S9(n)V99, no decimal point).** The last character may be an overpunch:
`{`/`A`–`I` mean +0..+9, `}`/`J`–`R` mean −0..−9, and GnuCOBOL's `p`–`y` mean −0..−9. A plain digit, an
explicit leading/trailing `+`/`-`, or a literal `.` are also accepted. All arithmetic is done in integer
cents.
*Rests on:* the wiki gives only the PIC clauses (DM). DM DT-07 mentions the overpunch convention
(`0150{`) for the seed files, and nothing states the encoding of the daily feed.

**A7. Duplicate keys** in acctdata / cardxref / tcatbal: the first occurrence wins.
*Rests on:* DM says these are VSAM KSDS (unique primary keys). The wiki is silent on duplicates in the
flat-file images.

**A8. Key matching.** The card number is matched as the exact 16-character field. Account ids are matched
numerically (`00000000001` = `1`). The category-balance key is account id + 2-character type code +
numeric 4-digit category.
*Rests on:* DM DT-04 / DT-06 key definitions.

## Validation (BR-01 … BR-04, BR-10)

**A9. Check order and short-circuit.** The order is xref (100), then account (101), then overlimit (102),
then expiry (103). The account checks run only if the card is in the xref, and 102/103 only if the account
exists. Consequently AC #6 ("card invalid and account expired") yields **100**: the expiry is never
evaluated when the card is unknown.
*Rests on:* BR-01–BR-04 as written. BR-04's "(overwrites 102 when both apply — finding F-05)" is the only
overwrite the wiki states. AC #6 says "Only the last failing reason is kept (legacy F-05)" without naming
the reason. The legacy 1500-VALIDATE-TRAN performs the account lookup only when the xref lookup succeeded.

**A10. 102 + 103 → 103, one reason only** (legacy overwrite order kept, not "collect all reasons").
*Rests on:* BR-04 `{{DECISION: preserve legacy overwrite order for parity testing, record both reasons as
FI-06 improvement}}`. The AC Legacy Comparison says "same" for the reject reason. The output has a single
`reason` field (CONTRACT).

**A11. Overlimit formula exactly as BR-03:** reject when
`creditLimit < currentCycleCredit − currentCycleDebit + amount` (equality passes). The formula uses the
account's running cycle totals, including postings made earlier in the same run. Because BR-05 adds
negative amounts to `currentCycleDebit` (so it becomes negative), subtracting it increases the total. This
is kept literally for parity.
*Rests on:* BR-03 and BR-05 text. The wiki does not discuss the sign interaction.

**A12. Expiry check (BR-04):** a plain string comparison of the account `expiryDate` (YYYY-MM-DD) with the
first 10 characters of the transaction `orig_ts`. Reject when expiry < date. A blank expiry date therefore
sorts low and is rejected with 103. The run's business date (2022-07-18) is not used.
*Rests on:* BR-04 "account.expiryDate < transaction original date". The wiki does not say how blank dates
are handled.

**A13. Daily purchase limit (BR-10, AC #11):**
- **Counting:** the count is kept per card number (not per account), in feed order, within one run. Only
  posted purchases (amount > 0) count.
- **Check:** the check runs only for a purchase that passed BR-01–BR-04. The 5th and later such purchases
  are rejected with 104 `DAILY PURCHASE LIMIT EXCEEDED`.
- **Not counted:** a purchase rejected for 100–104 does not count. Credits (amount < 0) and zero amounts
  are never counted and never get 104.
- **Interaction:** a 104-rejected purchase does not touch the account, so it does not affect later
  overlimit checks.

*Rests on:* BR-10 text ("posted in one run", "counted in feed order", "passes BR-01–BR-04"). The wiki does
not say whether "card" could mean account; I read it literally as the card number.

## Posting (BR-05)

**A14. Transaction id.** A posted transaction keeps the daily record's id (`tran_id` = DALYTRAN id). It is
not allocated from a sequence.
*Rests on:* P14 Data Mapping lists `transactionId` as a RECEIVE value of POST_TRANSACTION, and DM DT-05
says "FlowX: sequence generator". However, BR-09 makes `transactionId` the per-record idempotency key,
which only works if it is the feed's own id. The legacy 2000-POST-TRANSACTION also copies DALYTRAN-ID.

**A15. `proc_ts` of posted transactions** = the actual time of posting, in the legacy DB2 timestamp format
`YYYY-MM-DD-HH.MM.SS.hh0000`, taken from the FlowX script-runner clock (UTC). It is not the business date.
Rejected records keep the `proc_ts` from the input image unchanged.
*Rests on:* BR-05 "processedTimestamp = now". BR-06 says rejects carry "the original 350-byte image". The
wiki is silent on format and time zone.

**A16. Category balance upsert.** The key is the account id **from the xref** + transaction type +
category. An existing balance gets `+= amount`. A missing one is created with `balance = amount`. The
output lists every category balance: input rows in input order, then rows created in this run.
*Rests on:* BR-05 "TCATBAL upsert (create on not found)", P14 SEND mapping "accountId (from xref)", and
CONTRACT ("for every category balance, after posting").

**A17. Account update.** `currentBalance += amount`. When `amount ≥ 0`, `currentCycleCredit += amount`
(a zero amount is therefore a no-op credit); otherwise `currentCycleDebit += amount`. All accounts are
output, changed or not.
*Rests on:* BR-05 and CONTRACT.

**A18. Reason 109 (BR-08) has no reachable path.** The account being rewritten is the one just read in
the same in-memory run, so the rewrite cannot fail. Nothing is written for 109.
*Rests on:* BR-08 (109 aborts the record and is not written to rejects).

**A19. No PIC-size truncation.** Balances are not truncated to S9(10)V99 / S9(9)V99 on overflow (legacy
COBOL `ADD` without `ON SIZE ERROR` would silently drop high-order digits).
*Rests on:* the wiki is silent on overflow. It cannot occur with values of CardDemo's magnitude.

**A20. No account `activeStatus` or card checks.** Accounts with status `N` and inactive or expired cards
still post if BR-01–BR-04 and BR-10 pass.
*Rests on:* no business rule in P14 / AC mentions active status or the Card record.

## Outputs

**A21. `posttran_transact.json`** contains only the transactions posted in this run, not earlier history.
*Rests on:* CONTRACT "for every posted transaction". In EOD, TRANBKP (backup and reset of the transaction
store) runs before posting.

**A22. Rejects (BR-06).** Each reject carries all the transaction fields of the original image, plus
`reason` (int) and `reason_desc` (the 76-character text, right-trimmed). Reason texts: 100 `INVALID CARD
NUMBER FOUND`, 101 `ACCOUNT RECORD NOT FOUND`, 102 `OVERLIMIT TRANSACTION`, 103 `TRANSACTION RECEIVED
AFTER ACCT EXPIRATION`, 104 `DAILY PURCHASE LIMIT EXCEEDED`.
*Rests on:* BR-01–BR-04 and BR-10. DM DT-12 still has an open TODO about the 4 + 76 trailer layout.

**A23. Formatting.**
- Amounts are emitted as strings with exactly two decimals (`"-20.00"`).
- All string fields are right-trimmed; leading spaces are kept.
- `cat_cd`, `merchant_id`, `acct_id` and `reason` are integers taken from their digits; a field with no
  digits becomes 0.
- Records within each file are emitted in processing order.

*Rests on:* CONTRACT (types, "strings may omit trailing spaces", "any order").

**A24. Run state (BR-07)** is returned in the workflow result as `runSummary`
(`status` WARNING / COMPLETED, `returnCode` 4 / 0, processed / posted / rejected counts, and a
`countsReconcile` check read = posted + rejected). It is not a contract output file.
*Rests on:* BR-07 and AC "Data Mapping Verification".
