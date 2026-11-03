# Assumptions — daily transaction posting (POSTTRAN / CBTRN02C → FlowX P-14)

Each entry: **what I decided**, then **what it rests on** (a wiki statement, a conflict between two, or
the wiki's silence). "Wiki" = the pages in `posttran-sonnet-dr8.pdf`; "CONTRACT" = its CONTRACT.md.

## A. Architecture

**A1. One integration workflow, state held in memory for the run.**
Implemented as the FlowX workflow `posttran_daily_transaction_posting` (project `cd_a21_dr8_zflx_r3`):
Start → Load Daily Feed → Order Feed BR-10 → Validate and Post Records → Build Run Summary → End.
The Send/Receive pairs and the `account-data-access`, `transaction-data-access`,
`reference-data-access` and `batch-file-transfer` workflows (carddemo-datastore NOSQL_DB, Kafka
batch-file-gateway) are not built.
*Rests on:* CONTRACT gives the inputs as files per run and the outputs as JSON files ("formats
only"). The wiki's integration workflows assume a persistent store and a Kafka file gateway that this
contract does not provide. The process' Nodes table (Load Daily Feed, For Each Record / Validate
Record / Post Transaction / Write Reject, Build Run Summary) is mirrored node by node; the per-record
loop runs inside one script node.

**A2. File contents are passed to the workflow as text inputs.**
`dailytranFile`, `acctdataFile`, `cardxrefFile`, `tcatbalFile` (plus optional `batchId`,
`businessDate`). `tools/build_input.py` builds that body from an input folder.
*Rests on:* CONTRACT "Inputs (given per run)". The wiki's READ_DAILY_FEED via `batch-file-transfer`
(paged Kafka reads) has no counterpart here (A1).

**A3. Only the four files POSTTRAN reads are used.**
custdata, carddata, trantype, trancatg and discgrp are not read. Type and category codes are not
checked against the reference tables.
*Rests on:* the process page names only the feed, CardXref, Account and TransactionCategoryBalance.
BR-01..BR-04 are the only checks the wiki lists.

**A4. `postingChunkSize` is not used. `RejectReasonCode` exists as a project enumeration (100–103).**
*Rests on:* Configuration Dependencies on the process page. With no chunked loop (A1) there is
nothing to chunk.

## B. Order of processing

**B1. Every record is checked and posted in ascending order of amount; equal amounts keep feed order.**
The sort covers the whole feed before any check runs, so the BR-03 over-limit check sees totals left
by smaller (earlier-sorted) records.
*Rests on:* BR-10 ("Every check (BR-01–BR-04) and every posting (BR-05) happens in that order") and
acceptance scenario 11 (300, 120, −50 processed as −50, 120, 300). Implemented as written, although
BR-10 cites `CBTRN02C` while BR-09 and the legacy comparison describe a plain sequential read loop.
The wiki does not reconcile these.

**B2. Rejects and posted transactions are listed in processing (BR-10) order.**
*Rests on:* CONTRACT "a list of objects, in any order".

## C. Validation (BR-01..BR-04)

**C1. Checks run xref → account → limit → expiry. A missing card (100) skips the account checks, and a
missing account (101) skips the limit and expiry checks.**
*Rests on:* the legacy comparison "Validation order: xref → account → limit → expiry". The wiki does
not say whether later checks still run after 100/101; without an account, limit and expiry cannot be
evaluated.

**C2. When both 102 and 103 apply, 103 is kept. Only one reason per reject.**
*Rests on:* BR-04 "overwrites 102 when both apply … preserve legacy overwrite order for parity" and
scenario 6 "Only the last failing reason is kept". The open `{{DECISION: keep or collect all
reasons}}` is resolved as "keep last".

**C3. Scenario 6 ("card invalid and account expired") yields reason 100.**
*Rests on:* C1 — an invalid card has no xref, so no account is found and expiry is never evaluated.

**C4. The account is reached through the xref's `accountId`.**
*Rests on:* the POST_TRANSACTION mapping "accountId (from xref)" and `GET_ACCOUNT_BY_CARD` in
account-data-access.

**C5. Over limit means `currentCycleCredit − currentCycleDebit + amount > creditLimit` (strict).**
Values are taken as stored, so debits held as a negative running total increase the sum.
*Rests on:* BR-03 formula, read literally, with BR-05 storing debits by adding a negative amount.

**C6. "Transaction original date" is the first 10 characters (`YYYY-MM-DD`) of `originalTimestamp`.**
It is compared as text with `account.expiryDate`. A blank expiry date sorts below any date and is
rejected 103.
*Rests on:* BR-04 names a date, while DT-05/DT-11 hold only `originalTimestamp` (X(26)).
Account `expiryDate` is `YYYY-MM-DD` (DT-01). The wiki is silent on blank dates.

**C7. Each check sees the account totals left by the records processed before it in the same run.**
*Rests on:* scenario 11 "each check sees the cycle totals left by the transactions before it".

**C8. Account active status, card active status and card expiry are not checked.**
*Rests on:* they are absent from BR-01..BR-04.

## D. Posting (BR-05)

**D1. An amount of exactly 0 counts as a credit.**
*Rests on:* BR-05 "amount ≥ 0 → currentCycleCredit += amount".

**D2. The category balance key is (xref accountId, typeCode, categoryCode).**
A missing balance is created with balance 0 and then the amount is added.
*Rests on:* BR-05 "TCATBAL upsert (create on not found)", DT-06 composite key and scenario 9.

**D3. A posted transaction keeps the daily record's `transactionId` (no new sequence id).**
*Rests on:* a conflict in the wiki. DT-05 and `transaction-data-access` ADD_TRANSACTION say FlowX
allocates ids by sequence. BR-09 says each record is idempotent via `transactionId`, and DT-11 says
DailyTransaction has the same attributes as Transaction. A freshly allocated id would make restart
idempotency impossible, so the daily id is kept.

**D4. `proc_ts` is the wall-clock time of posting (UTC), in the legacy 26-character layout `YYYY-MM-DD-HH.MM.SS.hh0000`.**
*Rests on:* BR-05 "processedTimestamp = now" and DT-05 `TRAN-PROC-TS X(26)`. The wiki does not give
the format. It is not the business date, so it cannot equal a timestamp from another run.

**D5. Arithmetic overflow keeps the low-order digits, sized to the legacy fields.**
Account amounts use S9(10)V99, category balances S9(9)V99, and the over-limit intermediate 11 digits.
*Rests on:* silence. The data model says "Number (2 dec)" with those legacy PICs. Real data stays far
below these limits.

**D6. Reason 109 (account rewrite failure, BR-08) has no path.**
*Rests on:* BR-08. The account update is in memory and cannot fail independently of the run.

## E. Rejects (BR-06)

**E1. A reject is the original record's transaction fields plus `reason` (int) and `reason_desc`.**
`proc_ts` is the value the daily record carried (normally blank). Descriptions are exactly:
100 "INVALID CARD NUMBER FOUND", 101 "ACCOUNT RECORD NOT FOUND", 102 "OVERLIMIT TRANSACTION",
103 "TRANSACTION RECEIVED AFTER ACCT EXPIRATION".
*Rests on:* BR-01..BR-04 texts, BR-06 "original 350-byte image" and the CONTRACT field list. The
4+76 trailer layout (DT-12 TODO) matters only for fixed-width output, which this build does not
write.

## F. Run state, restart, counts (BR-07, BR-09)

**F1. Status is WARNING (returnCode 4) when there is at least one reject; otherwise COMPLETED (returnCode 0).**
*Rests on:* BR-07 and scenario 8. The wiki does not name the no-reject state.

**F2. Restart (BR-09 / scenario 10): a run either finishes or leaves nothing behind, so rerunning on the same inputs cannot post twice.**
No per-record checkpoint or resume index is kept.
*Rests on:* BR-09 / FI-11 describe restart against a persistent store, which this build does not have
(A1). The `{{DECISION: restart strategy}}` in scenario 10 is resolved this way.

**F3. If two feed records share a `transactionId`, only the first valid one is posted.**
Later valid ones are neither posted nor rejected; they are counted in `duplicatesSkipped`, so
`read = posted + rejected + duplicatesSkipped`.
*Rests on:* BR-09 "each record is idempotent via transactionId". This conflicts with "read = posted +
rejected" (Data Mapping Verification) only when a feed contains duplicate ids. Rejects are never
de-duplicated.

**F4. `batchId` and `businessDate` are accepted and echoed in the run summary; neither drives validation.**
*Rests on:* process start data lists them, and no business rule uses them (BR-04 uses the
transaction's own date).

## G. Input parsing

**G1. One record per line at the copybook offsets.**
Lines are right-padded to the record length and blank lines are skipped. A line holding several whole
records back to back is split. A missing tcatbal file means no existing balances.
*Rests on:* CONTRACT "one record per line, fixed width, layouts as in the copybooks". It is silent on
short or blank lines.

**G2. Signed DISPLAY amounts accept trailing overpunch in EBCDIC style and GnuCOBOL ASCII style, plus an explicit sign or decimal point.**
EBCDIC style: `{`, `A`–`I` positive; `}`, `J`–`R` negative. GnuCOBOL ASCII style: `p`–`y` negative.
V99 is implied.
*Rests on:* CONTRACT names the copybooks but not the sign encoding.

**G3. Duplicate keys in acctdata, cardxref or tcatbal: the first occurrence is used.**
*Rests on:* silence. The legacy stores are KSDS with unique keys.

## H. Output format

**H1. Contract field names and types.**
- Amounts are JSON strings with exactly two decimals (`"-50.00"`).
- `acct_id`, `cat_cd` and `merchant_id` are integers.
- All other fields are right-trimmed strings.

`posttran_acctdata.json` lists every input account in file order, touched or not.
`posttran_tcatbal.json` lists the existing balances in file order, then new ones in creation order.
A `posttran_run_summary.json` (status, counts) is written in addition.
*Rests on:* CONTRACT Outputs ("for every account / category balance, after posting").
