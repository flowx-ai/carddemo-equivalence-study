# Assumptions — daily-transaction-posting (P-14, legacy POSTTRAN / CBTRN02C)

Each entry: what was decided, and the wiki statement (or gap) it rests on.
"Process page" = `02-processes/process-daily-transaction-posting.md`; "AC" = `10-acceptance-criteria/acceptance-criteria-daily-transaction-posting.md`.

## Architecture

**A1. One integration workflow with in-run stores, instead of the process, Send/Receive pairs, carddemo-datastore and batch-file-gateway.**
The process page draws a BPMN process (Load Daily Feed → For Each Record subprocess → Validate → Post/Reject Send/Receive pairs → Build Run Summary). Those pairs call `workflow-batch-file-transfer`, `workflow-account-data-access`, `workflow-transaction-data-access` and `workflow-reference-data-access` over the `carddemo-datastore` NOSQL_DB and the `batch-file-gateway` Kafka connector. CONTRACT.md, however, supplies the store contents as flat files on every run and expects full after-posting snapshots back. Nothing in the wiki says how the datastore gets seeded from those files, and the Kafka gateway is not defined (only referenced). So this build is the FlowX workflow `posttran_daily_transaction_posting`. Its nodes follow the wiki steps:
- *Load Daily Feed*: READ_DAILY_FEED plus loading the reference stores.
- *Validate and Post Records*: For Each Record, Validate Record, Post Transaction / Write Reject.
- *Build Run Summary*.

The account, xref and category-balance stores live in memory for the run. A persisted carddemo-datastore variant would swap those reads and writes for DATA_SOURCE nodes without changing the rules.

**A2. No process wrapper / Call Activity built.**
The process page names end-of-day-batch-chain (P-19) as the caller, with output `status, processedCount, rejectedCount`. The workflow returns the equivalent `runStatus`, `returnCode`, `readCount`, `postedCount`, `rejectedCount`. P-19 is outside this step.

**A3. Results leave the workflow as JSON-string attributes** (`transactJson`, `dalyrejsJson`, `acctdataJson`, `tcatbalJson`). `tools/posttran_driver.py unpack` writes them out as the CONTRACT.md files. This is an implementation choice; the wiki is silent.

## Input reading

**A4. One record per line; blank lines skipped; short lines right-padded with spaces to the record length.**
CONTRACT.md says "one record per line, fixed width". It also allows strings to omit trailing spaces in outputs, so input lines may arrive trimmed too.

**A5. Signed amounts are ASCII zoned decimal with an overpunched last character** (`{A–I` = +0..9, `}J–R` = −0..9; `p–y` and explicit `+`/`-` also accepted), with an implied 2 decimals. The copybook PICs are S9(n)V99. The project data model notes overpunch for `discgrp` (`0150{` = 15.00) but says nothing about the other files.

**A6. Files not read: custdata, carddata, trantype, trancatg, discgrp.**
The process page's rules BR-01…BR-10 use only CardXref, Account, TransactionCategoryBalance and the feed. No rule checks card or account active status or validates type/category codes, so none is applied. This matches the rules as written.

**A7. Duplicate keys in an input store: the first occurrence wins.** The wiki is silent.

## Validation (BR-01 … BR-04, BR-10)

**A8. An invalid card short-circuits: no account lookup, reason 100 only.**
BR-01 and BR-02 are "lookup xref, then the account it points to". AC 6 ("Card invalid and account expired → only the last failing reason is kept") cannot yield 103 when the card is unknown, because without a xref there is no account to test. So that case ends at 100.

**A9. BR-03 and BR-04 are both evaluated; 103 overwrites 102.**
This follows the BR-04 text "overwrites 102 when both apply" and its DECISION to preserve the legacy overwrite order. Collecting all reasons (the FI-06 improvement and the AC's "keep or collect all reasons") is not done: CONTRACT.md has a single `reason` field.

**A10. BR-03 formula applied verbatim with stored signs:** reject when `creditLimit < currentCycleCredit − currentCycleDebit + amount`. Equality is accepted. Debits are stored with their sign (BR-05 adds negative amounts to `currentCycleDebit`), so the formula is not re-signed.

**A11. BR-04 compares strings:** the account expiry `YYYY-MM-DD` against the first 10 characters of the original timestamp. The same day is accepted. A blank expiry date compares low and is therefore rejected (103). The wiki only says "expiryDate < transaction original date".

**A12. BR-10 daily purchase limit:**
- It counts per card number (the rule says "a card").
- It counts only purchases actually posted in this run (amount > 0), in feed order.
- It is tested only after BR-01–BR-04 pass ("a further purchase that passes BR-01–BR-04").
- No history from earlier runs is considered ("in one run").
- The description is exactly `DAILY PURCHASE LIMIT EXCEEDED`.

**A13. `businessDate` is not used by any rule.** BR-04 uses the transaction's original timestamp, and BR-05 says `processedTimestamp = now`. The business date is accepted as input only.

## Posting (BR-05)

**A14. `tran_id` of the posted Transaction = the daily record's id**, not a newly allocated sequence value. BR-09 makes `transactionId` the idempotency key of a record. DT-11 says DailyTransaction has the same attributes as Transaction. The "sequence generator" in DT-05 and ADD_TRANSACTION belongs to online add (legacy "last record + 1"), not to posting.

**A15. Zero amounts go to `currentCycleCredit`.** BR-05: "amount ≥ 0 → currentCycleCredit += amount".

**A16. The category balance key is the account id from the xref plus the daily type code and category code.** A missing balance is created at 0 and the amount is added. This follows BR-05 ("TCATBAL upsert, create on not found"), AC 9, and DT-06's composite key.

**A17. `proc_ts` = wall-clock time when the record is posted**, in the legacy DB2 format `YYYY-MM-DD-HH.MM.SS.hh0000`, in UTC. BR-05 says "processedTimestamp = now" but gives neither the format nor the time zone. The format is DT-05's TRAN-PROC-TS X(26). This value cannot match an oracle run made at another time.

**A18. Amounts are not truncated to their PIC size** (TCATBAL S9(9)V99, account S9(10)V99). The wiki is silent on overflow.

## Rejects, run state, restart

**A19. A reject record is the original record unchanged (including its own `proc_ts`) plus `reason` (int) and `reason_desc`.** This follows BR-06 ("original 350-byte image + 4-digit reason + 76-char description") and AC 7. The description texts come from the BR table: 100 INVALID CARD NUMBER FOUND, 101 ACCOUNT RECORD NOT FOUND, 102 OVERLIMIT TRANSACTION, 103 TRANSACTION RECEIVED AFTER ACCT EXPIRATION, 104 DAILY PURCHASE LIMIT EXCEEDED. Trailing pad spaces are omitted, as CONTRACT.md allows.

**A20. Run state is `WARNING` with return code 4 when any record is rejected** (BR-07, AC 8). Otherwise it is `COMPLETED` with return code 0. The wiki does not name the success state.

**A21. Reason 109 (BR-08) is never produced.** An in-run store rewrite cannot fail, so the account-rewrite-failure path does not exist here.

**A22. Restart and idempotency (BR-09, AC 10):** a run is stateless and is recomputed entirely from its input files, so re-running after a failure posts nothing twice. Within one feed, a second record whose `tran_id` was already posted is skipped: it is not posted and not rejected, and it is counted in `duplicateSkippedCount`. This applies BR-09's "each record is idempotent via transactionId". Legacy would abend on the duplicate TRANSACT write. Only in this case does `read = posted + rejected` (AC data-mapping check) not hold; the skipped records make up the difference.

**A23. Not implemented because none affects the outputs:**
- `postingChunkSize`: the whole feed is processed in one pass.
- `RuntimeSwitches.batchWindowOpen`: gating belongs to P-19.
- The `RejectReasonCode` enumeration: codes are emitted as integers.
- The `reviewStatus` reject attribute: it is not in the contract.

## Output shape

**A24. Output order:**
- Posted transactions and rejects: feed order.
- Accounts: input order.
- Category balances: input order, then new ones in creation order.

CONTRACT.md: "a list of objects, in any order".

**A25. Field types:**
- `type_cd` stays a 2-character string.
- `cat_cd`, `merchant_id` and `acct_id` are integers (a non-numeric value becomes 0).
- Amounts are strings with exactly two decimals.
- Trailing spaces are trimmed.

Field types follow the CONTRACT.md field list.

**A26. No `flags.json` is produced.** It is optional, and the PROTOCOL.md §6 it refers to was not provided.
