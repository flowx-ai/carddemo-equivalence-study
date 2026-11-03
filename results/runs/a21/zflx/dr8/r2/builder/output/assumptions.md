# POSTTRAN (daily-transaction-posting, P-14): build decisions

Each entry: what was assumed, and the wiki statement (or gap) it rests on. Page abbreviations:
**PROC** = `02-processes/process-daily-transaction-posting.md`, **AC** = `10-acceptance-criteria/acceptance-criteria-daily-transaction-posting.md`,
**DM** = `01-data-model/project-data-model.md`, **EOD** = `02-processes/process-end-of-day-batch-chain.md`,
**W-xx** = the integration-workflow pages, **CONTRACT** = `CONTRACT.md`.

## Architecture

**A-01. One FlowX integration workflow holds all the logic: `posttran_daily_transaction_posting`, project `cd_a21_dr8_zflx_r2`.**
It has no BPMN process with a per-record loop subprocess, no Send/Receive pairs and no `carddemo-datastore` NOSQL_DB.
The workflow's SCRIPT nodes mirror the PROC nodes: Load Daily Feed → (lookups) → posting order → Validate Record + Post Transaction / Write Reject → Build Run Summary.
- *Rests on:* CONTRACT fixes a file-in/file-out run ("Inputs (given per run)"; outputs are JSON files). No store state survives between runs.
- PROC's Send/Receive integrations (W-01, W-04, W-05, W-09) exist to reach persistent stores, and there are none in this contract.
- The account, category-balance and transaction updates are applied in memory within the run, in the same order PROC describes: TCATBAL upsert, then Account update, then Transaction insert.

**A-02. Input transport.** The four files are passed to the workflow as raw text, one string per file.
- The files are `dailytran`, `acctdata`, `cardxref` and `tcatbal`. The workflow parses them by the copybook offsets: CVTRA06Y, CVACT01Y, CVACT03Y, CVTRA01Y.
- `tools/prepare_input.py` only reads the files and `tools/write_outputs.py` only splits the result. Neither contains business logic.
- *Rests on:* W-09's DECISION that files are returned "as structured records". The page size and cursor of `READ_FILE_PAGE` are not needed: one feed (about 300 records) fits in one run, so `postingChunkSize` (PROC, Configuration Dependencies) is not used.

**A-03. Only the four files CBTRN02C uses are read.** `custdata`, `carddata`, `trantype`, `trancatg` and `discgrp` are listed in CONTRACT as inputs, but no POSTTRAN rule (BR-01…BR-10) refers to them.
- Card validity is decided by the cross-reference alone (BR-01). The card master (`carddata`), including its active status, is not consulted.
- Transaction type and category codes are not validated against `trantype` / `trancatg`.

**A-04. Run parameters.** `batchId` and `businessDate` are accepted (PROC Data Mapping: "Process start data: batchId, businessDate, feedReference") but no rule uses them. The INTCALC parameter belongs to the next step. `RuntimeSwitches.batchWindowOpen` (AC Configuration Dependencies) is the orchestrator's concern (EOD) and is not checked here.

## Posting order

**A-05. BR-10 is implemented as written.** Records are processed in ascending order of amount, credits (negative) first. Equal amounts keep their feed order, using a stable sort with feed position as the tie-breaker.
- Every check (BR-01…BR-04) and every posting (BR-05) happens in that order and sees the cycle totals left by earlier postings. AC scenario 11 shows −50.00, 120.00, 300.00.
- **Note:** PROC also says the process "Replaces the legacy sequential read loop", and BR-10's "Legacy Source" is CBTRN02C. A strictly sequential legacy read would process the feed in file order.
- Where the two differ, the wiki's BR-10 / AC-11 wins. On a card near its limit, this ordering changes which transaction is rejected for 102.

**A-06. Output order.**
- `posttran_transact` and `posttran_dalyrejs` are written in posting order.
- `posttran_acctdata` keeps input-file order.
- `posttran_tcatbal` keeps input-file order, with newly created balances appended in the order they were created.
- *Rests on:* CONTRACT: "a list of objects, in any order".

## Validation (BR-01…BR-04)

**A-07. Check chain.** The checks run cross-reference → account → over-limit → expiry.
- The account is looked up only when the card is in the cross-reference.
- The over-limit and expiry checks run only when the account is found.
- *Rests on:* AC Legacy Comparison "Validation order: xref → account → limit → expiry". BR-02: "Account not found" presupposes a cross-reference hit, since the account id comes from the xref (PROC Data Mapping: "accountId (from xref)").

**A-08. AC scenario 6 ("Card invalid and account expired").** This scenario resolves to reason **100**.
- With no cross-reference record there is no account to test for expiry, so the only failing check is 100.
- "Only the last failing reason is kept" holds trivially.
- *Rests on:* A-07 and BR-01/BR-02. AC-6 gives no expected code.

**A-09. One reason per reject, last failure wins.** 103 overwrites 102 when both apply.
- *Rests on:* BR-04 "{{DECISION: preserve legacy overwrite order for parity testing}}" and the AC Legacy Comparison "{{DECISION: keep or collect all reasons}}", resolved as keep.
- The FI-06 improvement (record both reasons) is not implemented, because the contract has a single `reason` field.

**A-10. Over-limit formula applied literally.** A record is rejected when `currentCycleCredit − currentCycleDebit + amount > creditLimit`.
- The cycle debit accumulates negative amounts (BR-05: "else currentCycleDebit += amount"), so it is held as a negative number and subtracted as written.
- *Rests on:* BR-03 and BR-05.

**A-11. Expiry comparison.** The rule is "expiry date < transaction original date". The account's 10-character expiry date (`YYYY-MM-DD`) is compared as a string with the first 10 characters of `orig_ts`.
- An expiry date equal to the transaction date is **not** a reject.
- *Rests on:* BR-04's strict "<". DM DT-05 `originalTimestamp` X(26). DM DT-01 `expiryDate` X(10) in `YYYY-MM-DD` form.

**A-12. Account status is not checked.** An inactive account (`active_status` = N) still posts.
- *Rests on:* no business rule mentions `activeStatus`. BR-01…BR-04 are the complete validation set.

**A-13. Reject descriptions** are exactly the texts in BR-01…BR-04: `INVALID CARD NUMBER FOUND`, `ACCOUNT RECORD NOT FOUND`, `OVERLIMIT TRANSACTION`, `TRANSACTION RECEIVED AFTER ACCT EXPIRATION`. They are emitted without padding.
- *Rests on:* CONTRACT "Strings may omit trailing spaces". DM DT-12 "{{TODO: confirm trailer layout (4 + 76)}}" is left open, and BR-06 is honoured by carrying the original record fields unchanged.

## Posting (BR-05)

**A-14. Category balance key** = account id **from the cross-reference** + transaction type code + category code. A missing balance is created with balance = amount, and an existing one gets `+= amount`.
- *Rests on:* BR-05 "TCATBAL upsert (create on not found)". DM DT-06 composite key `accountId + typeCode + categoryCode`. PROC Data Mapping "accountId (from xref)".

**A-15. A zero amount is a credit.** `amount ≥ 0` goes to `currentCycleCredit`. *Rests on:* BR-05 "amount ≥ 0 → currentCycleCredit += amount".

**A-16. The posted `tran_id` is the daily transaction's own id.** The sequence generator is not used.
- *Rests on:* BR-09 "each record is idempotent via transactionId", which only works if the id is the feed's. DM DT-11 "Same attributes as Transaction".
- W-04's sequence allocation is described for `ADD_TRANSACTION`, not for posting. PROC's RECEIVE of `transactionId` is read as an echo of that id.

**A-17. `proc_ts` = run time ("now")** in the legacy DB2 layout `YYYY-MM-DD-HH.MM.SS.hh0000` (26 characters), taken from the FlowX runtime clock (server time zone).
- The business date is **not** used.
- Every record posted in one run carries the same timestamp, taken once at the start of the posting step.
- *Rests on:* BR-05 "processedTimestamp = now". DM DT-05 `TRAN-PROC-TS X(26)`. The wiki does not say whether the timestamp is per record or per run.

**A-18. Rejected records keep their original `proc_ts`,** the value in the daily feed. *Rests on:* BR-06 "Rejects carry the original 350-byte image".

**A-19. Reason 109 (BR-08) cannot arise.** The account update is applied in memory to the record just read, so no rewrite can fail.
- No 109 path exists, and nothing is ever written to rejects with 109.

**A-20. No overflow emulation.** Amounts are exact in integer cents. Truncation of the legacy PIC sizes on overflow is not reproduced: S9(10)V99 for account fields and S9(9)V99 for category balances. *Rests on:* the wiki is silent on overflow.

## Restart / idempotency

**A-21. Restart = rerun.** Each run starts from the input files and writes complete outputs, so a rerun with the same inputs produces the same postings. The one difference is `proc_ts`, which is set at run time (A-17).
- There is no checkpoint at "last processed index".
- *Rests on:* BR-09 (no legacy commit; FlowX restart resumes after the last processed index). AC-10 "{{DECISION: restart strategy — see process spec}}" is unresolved. With no persistent store in this contract there is nothing to resume against.

## Run summary (BR-07)

**A-22. Run summary status.**
- **With rejects:** status `WARNING`, `returnCode` 4.
- **Without rejects:** status `COMPLETED`, `returnCode` 0.
- The summary also returns `readCount`, `processedCount` and `rejectedCount`, plus `countsBalanced`, which checks read = posted + rejected.
- *Rests on:* BR-07, the AC "Data Mapping Verification" ("verify counts: read = posted + rejected") and EOD Call Activity OUTPUT `status, processedCount, rejectedCount`. The name of the success state is not given in the wiki.

## Parsing and output format

**A-23. Zoned decimals.** Signed amounts are decoded as zoned decimal with a trailing overpunch: `{`/`A`–`I` mean +0…9, and `}`/`J`–`R` (or ASCII `p`–`y`) mean −0…9. Plain digits mean positive. An explicit `-`/`.` form is also accepted.
- *Rests on:* DM gives the PIC clauses (S9(9)V99, S9(10)V99) but not the ASCII encoding of the files.

**A-24. Line handling.** Blank lines are skipped and short lines are padded with spaces to the record length.
- A key that occurs more than once (cross-reference card, account id, category-balance key) resolves to its **first** occurrence.
- *Rests on:* the wiki is silent; KSDS keys are unique (DM primary keys).

**A-25. Output fields.**
- Strings are right-trimmed.
- `cat_cd`, `merchant_id` and `acct_id` are integers, and a non-numeric value becomes `null`.
- Amounts are strings with exactly two decimals, e.g. `"-50.00"`.
- *Rests on:* CONTRACT field list and types.
