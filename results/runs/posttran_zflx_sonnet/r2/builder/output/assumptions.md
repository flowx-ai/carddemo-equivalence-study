# POSTTRAN (daily-transaction-posting, P-14): assumptions and decisions

Each entry gives what was decided and which wiki statement, or missing statement, it rests on.
"Wiki" means the pages bundled in `posttran-sonnet.pdf`. "Contract" means `CONTRACT.md` in that bundle.

## A. Architecture

**A1. One FlowX integration workflow instead of the process, per-record subprocess, and Kafka/datastore round trips.**
The wiki process (Load Daily Feed → For Each Record subprocess → Validate → Post / Write Reject → Build Run Summary) runs as one workflow, `posttran_daily_transaction_posting`. Its SCRIPT nodes are *Load Daily Feed*, *Validate and Post Records* and *Build Run Summary*. Inside *Validate and Post Records*, the per-record branch "Reason code = 0? → Post Transaction / Write Reject" is a loop.
Rests on: the contract says the step "reads the input files" and "writes the outputs" as files. The wiki's `batch-file-gateway` (Kafka custom connector) and `carddemo-datastore` collections are not provisioned for this build. The wiki also gives no sizing for `postingChunkSize`.
Effect: the business rules (BR-01 to BR-09) are unchanged. Only the transport differs.

**A2. Only four input files are read: `dailytran.dat`, `acctdata.dat`, `cardxref.dat`, `tcatbal.dat`.**
Rests on: the process page lists the copybooks CVTRA06Y, CVTRA05Y, CVACT01Y, CVACT03Y and CVTRA01Y, and the rules use only xref, account and TCATBAL. The contract lists other files (`discgrp`, `custdata`, `carddata`, `trantype`, `trancatg`) for the whole chain. This step's rules never consult them. In particular, the wiki defines no type/category existence check for posting.

**A3. File I/O sits outside FlowX.**
`posttran_driver.py prepare` turns the `.dat` files into the workflow input. `emit` turns the workflow result into the contract JSON files.
Rests on: FlowX has no local-filesystem access. The wiki's file gateway is not available (see A1).

## B. Input parsing

**B1. Layouts follow the copybooks.**
- DALYTRAN (350): id 16, type 2, cat 4, source 10, desc 100, amt S9(9)V99 (11), merchant id 9, name 50, city 50, zip 10, card 16, orig ts 26, proc ts 26, filler 20.
- Account (300): id 11, status 1, then curr bal, credit limit and cash limit, each S9(10)V99 (12). Then open, expiry and reissue dates (10 each), cycle credit and cycle debit (12 each), zip 10, group 10, filler.
- Xref (50): card 16, cust 9, acct 11.
- TCATBAL (50): acct 11, type 2, cat 4, bal S9(9)V99 (11).

Rests on: the contract says "layouts as in the copybooks". The data-model page gives the field sizes, but not the field order inside DailyTransaction ("same attributes as Transaction"). The order is taken from the CardDemo copybooks.

**B2. Signed amounts are zoned decimal with an overpunched last digit.**
`{`/`A`–`I` mean +0..+9. `}`/`J`–`R` mean −0..−9. ASCII-zoned `p`–`y` and explicit `+`/`-` signs are also accepted. A decimal point, if present, is honoured.
Rests on: the data-model page (DT-07) says the seed files store a "signed overpunch (`0150{` = 15.00)". The wiki does not state the format of the other files, so the same encoding is assumed for them.

**B3. Short lines are padded with spaces, and blank lines are skipped.**
A non-numeric amount is read as 0 and reported in `summary.loadWarnings`.
Rests on: wiki is silent about malformed records.

**B4. Lookup keys are the raw fixed-width fields.**
- Xref: the 16-character card number.
- Account: the 11-digit `XREF-ACCT-ID`.
- TCATBAL: account id + type + category.

If a key appears twice in a master file, the first record wins.
Rests on: the data-model page gives the primary keys (DT-01, DT-04, DT-06). A KSDS cannot hold duplicate keys, and the wiki says nothing about duplicates.

## C. Validation (BR-01 to BR-04)

**C1. Validation order is xref → account → over-limit → expiry.**
A missing xref (100) or account (101) stops further checks. That is why the expiry check (103) only runs when the account was found.
Rests on: "Legacy Comparison" says the validation order is "xref → account → limit → expiry", and BR-02 says the account is looked up "from xref". Acceptance scenario 6 ("card invalid and account expired") cannot occur in that order: with no xref, there is no account whose expiry could be checked. The only real multi-failure case is 102 plus 103.

**C2. When several checks fail, the last failure wins (103 overwrites 102).**
All failures are also kept inside the workflow, in `posting.rejectedTransactions[].allReasons`, but they are not written to the contract file.
Rests on: BR-04 `{{DECISION: preserve legacy overwrite order for parity testing, record both reasons as FI-06 improvement}}` and the AC "Reject reason: last failure overwrites". The contract fixes the reject fields to `reason` and `reason_desc`, so the second reason is not emitted.

**C3. The over-limit test rejects when `currentCycleCredit − currentCycleDebit + amount > creditLimit`. Equality posts.**
The test uses the account as already updated by earlier records in the same run, because records are processed sequentially in file order.
Rests on: BR-03 (strict `>`), plus "Replaces the legacy sequential read loop". BR-05 updates the account per record. The wiki does not discuss in-run ordering, so the legacy one-record-at-a-time semantics were kept. The cycle debit is subtracted as stored; under BR-05 it holds negative amounts.

**C4. The expiry test is a text comparison of `expiryDate` (YYYY-MM-DD) with the first 10 characters of the transaction's original timestamp.**
It rejects when `expiryDate < date`, so a transaction on the expiry date posts. A blank expiry date sorts before any date, which means reject.
Rests on: BR-04 "`account.expiryDate < transaction original date` → reject 103". The wiki does not say how the timestamp becomes a date.

**C5. No other validations are performed.**
In particular, the account's active status, the card's status and whether the type/category exists are not checked.
Rests on: BR-01 to BR-04 are the complete list in the wiki.

**C6. Reject descriptions are the exact wiki texts.**
`INVALID CARD NUMBER FOUND`, `ACCOUNT RECORD NOT FOUND`, `OVERLIMIT TRANSACTION`, `TRANSACTION RECEIVED AFTER ACCT EXPIRATION`. Trailing spaces from the 76-character trailer are dropped in JSON.
Rests on: BR-01 to BR-04 and BR-06. The contract says strings may omit trailing spaces.

## D. Posting (BR-05) and rejects (BR-06)

**D1. TCATBAL is keyed by (account id from the xref, transaction type, transaction category).**
It is created with balance 0 and then incremented when no row exists. A balance is incremented by the signed amount.
Rests on: BR-05 "TCATBAL upsert (create on not found)", DT-06's composite key, and AC 9. The wiki does not say which account id is used. The xref account is used, as in the POST_TRANSACTION mapping "accountId (from xref)".

**D2. Account update.** `currentBalance += amount`. If `amount ≥ 0` then `currentCycleCredit += amount`, otherwise `currentCycleDebit += amount`. A negative amount therefore makes the debit more negative; it is not added as an absolute value.
Rests on: BR-05, read literally.

**D3. Overflow keeps the low-order digits, as COBOL `ADD` does without `ON SIZE ERROR`.**
TCATBAL keeps 11 digits (S9(9)V99). Account amounts keep 12 digits (S9(10)V99). The over-limit work value is not truncated.
Rests on: the wiki is silent about overflow. The field sizes come from DT-01 and DT-06.

**D4. `processedTimestamp` (`proc_ts`) is the time of posting, in DB2 timestamp form `YYYY-MM-DD-HH.MM.SS.hh0000`, using the FlowX runtime clock (UTC).**
The business date `2022-07-18` is not used for it. Rejected records keep the `proc_ts` from the input image, which is usually blank.
Rests on: BR-05 "`processedTimestamp = now`". The wiki gives no format; X(26) in DT-05 matches the DB2 layout, so the CardDemo DB2 format was used. This field will not match an oracle run made at another time.

**D5. The posted `tran_id` is the daily record's id. No new id is generated.**
Rests on: the wiki's "sequence generator" (DT-05) and ADD_TRANSACTION describe online adds. POST_TRANSACTION returns a `transactionId`, and BR-09 makes posting idempotent *via* `transactionId`. That only works if the id is the one carried by the daily record.

**D6. Rejects carry every transaction field of the original image plus `reason` (int) and `reason_desc`.**
Rests on: BR-06 and the contract's `posttran_dalyrejs` field list.

## E. Run control (BR-07 to BR-09)

**E1. Run status.** The status is `WARNING` with return code 4 when at least one record was rejected, and `COMPLETED` with return code 0 otherwise. The counts are processed, posted, rejected, aborted and duplicates.
Rests on: BR-07 and "Build Run Summary: processed / rejected counts, return state". The wiki gives no name for the no-reject state, so `COMPLETED` was chosen.

**E2. Reason 109 (account rewrite failure) aborts the record without writing a reject.**
The record is listed under `summary.abortedRecords` instead. With in-memory master data this cannot happen, because the account was read moments earlier; the path exists only to follow BR-08.
Rests on: BR-08.

**E3. A `transactionId` that was already posted in the same run is skipped.**
It is neither re-posted nor rejected, and it is reported in `summary.duplicateRecords`. Because of this, read = posted + rejected + duplicates + aborted.
Rests on: BR-09 "each record is idempotent via `transactionId`" and AC 10 "No duplicate postings". The legacy behaviour, which is not described in the wiki, would end the job on a duplicate key. AC 10 `{{DECISION: restart strategy}}` is still open. Each run starts from the supplied files, so a rerun of the whole step is the restart. No resume-from-index state is kept between runs.

**E4. `batchWindowOpen`, `postingChunkSize` and the RejectReasonCode enumeration are not used as runtime configuration.**
The reason codes are constants in the workflow.
Rests on: the "Configuration Dependencies" sections name these items, but the wiki gives no values. The end-of-day chain, not this step, opens and closes the window.

## F. Output format

**F1. Field types follow the contract.**
`cat_cd`, `merchant_id`, `acct_id` and `reason` are integers. In `posttran_tcatbal`, `acct_id` and `cat_cd` are also integers, matching the same fields elsewhere; the contract gives no type for them. Amounts are strings with exactly two decimals (`"-15.00"`). Other strings are copied with their trailing spaces removed.
Rests on: CONTRACT.md "Outputs".

**F2. Record order.**
- `posttran_acctdata`: every input account in input order, posted or not.
- `posttran_tcatbal`: the existing rows in input order, then newly created rows in order of creation.
- `posttran_transact` and `posttran_dalyrejs`: feed order.

Rests on: the contract says "a list of objects, in any order" and asks for "every account" and "every category balance, after posting".
