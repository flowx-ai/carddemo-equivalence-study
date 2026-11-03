# POSTTRAN (daily transaction posting): assumptions and decisions

Implementation: FlowX workflow `posttran_daily_transaction_posting`
(project `cd_posttran_zflx_sonnet_r1`, resourceDefinitionId `<uuid>`),
`Start → Validate & Post Daily Transactions (SCRIPT) → Build Run Summary (SCRIPT) → End`.
The script source is in `../flowx/scripts/`. Wiki pages cited: *process* = 02-processes/process-daily-transaction-posting,
*AC* = 10-acceptance-criteria/acceptance-criteria-daily-transaction-posting, *data model* = 01-data-model/project-data-model,
*chain* = 02-processes/process-end-of-day-batch-chain, and the 04-integrations workflow pages.

Each entry gives what was decided and the wiki statement (or missing statement) it rests on.

## A. Architecture

1. **One stateless integration workflow, not a process with a per-record subprocess and datastore calls.**
   The *process* page describes a BPMN process with a "For Each Record" subprocess and Send/Receive pairs to
   `account-data-access`, `transaction-data-access` and `reference-data-access` on the `carddemo-datastore` NOSQL_DB.
   CONTRACT.md defines the step as fixed-width files in and JSON lists out, and gives no datastore contents,
   so persisting to a datastore would add nothing the contract can see. The rules (BR-01..BR-09) are therefore applied in one
   SCRIPT node that keeps accounts, cross-references and category balances in memory for the run.
   Records are processed strictly in file order, so each record's validation sees the account updates made by the records
   before it. That matches the legacy sequential read loop the *process* page says this replaces.
2. **Files arrive as run input, not through `batch-file-transfer`.** That workflow uses a Kafka connector
   (`batch-file-gateway`, *batch-file-transfer* page) that does not exist in this project. The workflow's INPUT slice takes
   `dailytran`, `acctdata`, `cardxref` (required) and `tcatbal`, `businessDate`, `batchId` (optional), each file as its full
   text. Paging (`READ_FILE_PAGE`, `postingChunkSize`) is not needed for one-shot input, so `postingChunkSize` is not used.
3. **Outputs come back as the END payload** (`result.posttran_transact`, `posttran_dalyrejs`, `posttran_acctdata`,
   `posttran_tcatbal`, plus `runSummary` and `parseWarnings`). Each list is written to `<name>.json` in this folder.
   The wiki does not say how outputs leave FlowX. CONTRACT.md only fixes the file names and fields.
4. **Restart / idempotency (BR-09, AC scenario 10).** A run changes nothing until it returns, so a failed run leaves no partial
   postings, and a restart is a re-run over the same input files that gives the same result.
   "Resume after the last processed index" is not needed for that reason. Within one run, BR-09's idempotency
   via `transactionId` is applied (see C-6).
5. **`RuntimeSwitches.batchWindowOpen` is not checked.** It appears only under the AC's "Configuration Dependencies".
   The *chain* page makes opening and closing the window the orchestrator's job, and the contract has no such input.
6. **`businessDate` and `batchId` are accepted and echoed in the run summary, but no rule uses them.** None of BR-01..BR-09
   refers to the business date. Legacy CBTRN02C uses the system clock (see D-1).
7. **`custdata`, `carddata`, `trantype`, `trancatg` and `discgrp` are not read.** No POSTTRAN rule uses them. In particular,
   type and category codes are not validated against reference data, and the wiki lists no such rule.

## B. Reading the fixed-width input

1. Layouts are the copybook offsets: CVTRA06Y (350), CVACT01Y (300), CVACT03Y (50), CVTRA01Y (50), per CONTRACT.md.
   A line shorter than its record length is padded with spaces, because trailing FILLER/spaces are often stripped.
   A trailing `\r` is removed and empty lines are skipped.
2. **Signed amounts are zoned decimal with a trailing overpunch sign** (`{`/`A`–`I` = +0..+9, `}`/`J`–`R` = −0..−9) and
   an implied 2 decimals. The wiki states overpunch only for the disclosure-group seed file (*data model* DT-07,
   "`0150{` = 15.00"). It is assumed for every `S9(n)V99` field. As a fallback, an explicit leading or trailing `+`/`-`
   and an explicit decimal point are also accepted. An unparseable amount is taken as 0 and listed in `parseWarnings`.
3. Card lookup uses an exact match on the 16-character card number (XREF primary key, DT-04). Account lookup compares
   account ids numerically (11-digit `9(11)` keys, DT-01/DT-04).
4. If a reference file holds a duplicate key, the first record is kept and a warning is raised. The wiki is silent here;
   indexed VSAM files cannot hold duplicate keys.

## C. Validation and posting rules

1. **Validation order is xref → account → limit → expiry** (AC "Legacy Comparison"). A missing xref (100) stops validation,
   because the account is reached through the xref, and with no account found (101) neither the limit nor the expiry
   can be checked. Limit (102) and expiry (103) are both evaluated, and 103 overwrites 102 (BR-04, "overwrites 102 when both apply").
2. **AC scenario 6 ("Card invalid and account expired → only the last failing reason is kept")** cannot happen literally:
   with an invalid card there is no account to test for expiry. Such a record gets reason **100**. The "last reason wins"
   behaviour is implemented where it can occur, which is 102 followed by 103 (BR-04).
3. **Only one reason per reject.** BR-04's `{{DECISION: preserve legacy overwrite order ... record both reasons as FI-06
   improvement}}` and the AC's `{{DECISION: keep or collect all reasons}}` leave this open. The legacy overwrite order is kept,
   because the contract has a single `reason` (int) and `reason_desc` per reject.
4. **Over-limit check (BR-03):** `currentCycleCredit − currentCycleDebit + amount > creditLimit` rejects, so equality posts.
   The cycle debit is used as stored. Posted debits are added as negative amounts (C-5), so a stored debit is ≤ 0.
   The wiki gives the formula but not the sign convention, and the formula is applied literally.
   The intermediate result is truncated to `S9(9)V99` (legacy WS-TEMP-BAL; see C-8).
5. **Posting (BR-05):** `currentBalance += amount`; amount ≥ 0 (zero included) → `currentCycleCredit += amount`, otherwise
   `currentCycleDebit += amount`, so debits accumulate as negative numbers. This is the literal reading of
   "else `currentCycleDebit += amount`".
6. **Category balance (BR-05, AC 9):** the key is the account id from the xref + the daily record's type code + category code.
   If the key exists, the amount is added. If not, a balance is created with balance = amount. New balances are listed after
   the existing ones, in the order they were created.
7. **The expiry check (BR-04)** compares the account `expiryDate` with the first 10 characters (`YYYY-MM-DD`) of the
   transaction's original timestamp, as text. A transaction dated on the expiry day is valid; only a strictly later date
   is rejected ("`expiryDate < transaction original date`").
8. **Numeric overflow** follows the legacy PIC sizes: account amounts `S9(10)V99`, category balance and limit work field
   `S9(9)V99`, with high-order digits dropped (COBOL ADD/COMPUTE without ON SIZE ERROR). The wiki is silent here, and
   CardDemo data does not come near these limits.
9. **Rejected records change nothing.** They do not update the account, the category balance or the transaction store
   (*process* Purpose: only valid records are posted).
10. **Duplicate `transactionId` within the feed:** the second and later occurrences of an id that was already posted are
    skipped. They are not posted, not rejected, are counted as `duplicatesSkipped`, and appear in `parseWarnings`.
    This rests on BR-09, "each record is idempotent via `transactionId`". It means AC's "read = posted + rejected" holds
    whenever the feed has no duplicate ids. The summary's `countsReconcile` checks
    read = posted + rejected + duplicates. An id that was only rejected may appear again and is validated again.
11. **Reason 109 (BR-08)** is not reachable: the account update is in memory and cannot fail. It exists only as an
    enumeration value (`RejectReasonCode`).
12. **Card and account status are not checked**, for example a closed card or `activeStatus = N`. BR-01..BR-04 do not list
    such a check, and posting is only refused for the four reasons the wiki gives.

## D. Output values

1. **`tran_id` is the daily record's id**, with no new sequence value. `transaction-data-access` describes sequence
   allocation for `ADD_TRANSACTION`, and DT-05 says "FlowX: sequence generator". However, BR-09 makes `transactionId` the
   idempotency key for posting, which only works if the incoming id is kept. The *process* data mapping passes
   `dailyTransaction` through unchanged.
2. **`proc_ts` of a posted transaction is the time it was posted** (BR-05 "`processedTimestamp = now`"), taken per record from
   the FlowX script runtime clock (UTC on this platform), in the legacy DB2 text form `YYYY-MM-DD-HH.MM.SS.hh0000`
   (the same 26 characters as `TRAN-PROC-TS X(26)`). The business date is not used. The wiki says "now" and gives no format.
3. **Reject records keep every field of the daily record as received,** `proc_ts` included, plus `reason` (int) and
   `reason_desc`. The description texts are the ones quoted in BR-01..BR-04. For 103, BR-04 gives
   "TRANSACTION RECEIVED AFTER ACCT EXPIRATION". The 350-byte image + 80-byte trailer of BR-06 / DALYREJS LRECL 430 is
   represented by the contract's JSON fields, not as a raw image.
4. **Field types follow CONTRACT.md:** `acct_id`, `cat_cd`, `merchant_id` and `reason` are integers; amounts are strings
   with exactly two decimals (`"-20.00"`); text fields have trailing spaces removed (allowed by the contract).
   A non-numeric `cat_cd` or `merchant_id`, which the wiki never mentions, is passed through as its trimmed text rather
   than invented as a number.
5. **`posttran_acctdata` lists every account in the input file, in input order,** whether or not it was posted to
   ("account fields for every account, after posting").
6. **Run outcome (BR-07):** `runSummary.status` is `WARNING` with `returnCode` 4 when at least one record was rejected,
   otherwise `COMPLETED` / 0. Nothing in the contract outputs carries it. It is in the workflow result for the end-of-day chain
   (*chain* BR-03: rejects do not stop the chain).

## E. Not produced

- `flags.json`: CONTRACT.md refers to PROTOCOL.md §6 for what counts as a flag, and PROTOCOL.md was not provided.
  The uncertainties are recorded here instead.
- No output files for real data were produced during the build: the CONTRACT.md input files were not in the workspace.
  The workflow was verified on a hand-built fixture (`../test/fixture/`, expected results in
  `../test/fixture/expected/README.md`) that covers AC scenarios 1–9 and the boundary cases.
