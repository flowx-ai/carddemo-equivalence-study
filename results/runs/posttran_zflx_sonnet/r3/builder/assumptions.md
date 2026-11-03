# Assumptions — daily-transaction-posting (POSTTRAN / CBTRN02C) on FlowX

Each entry: what was decided, and the wiki statement (or gap) it rests on. Page names refer to
the attached wiki (`posttran-sonnet.pdf`).

## A. Shape of the FlowX build

**A1. One integration workflow carries the whole step; no BPMN process, no datastore round-trips.**
The process page (`process-daily-transaction-posting`) draws a BPMN process whose per-record
lookups and writes go through Send/Receive pairs to `workflow-account-data-access`,
`workflow-transaction-data-access`, `workflow-reference-data-access` and `workflow-batch-file-transfer`
on a `carddemo-datastore` NOSQL_DB system and a Kafka `batch-file-gateway`. CONTRACT.md, though, makes
the inputs fixed-width files given per run and the outputs JSON snapshots ("account fields for every
account, after posting"). It says nothing about a persistent store that carries state between runs.
Workflow `daily_transaction_posting` therefore loads the four input images into memory, runs the
CBTRN02C loop, and returns the after-images. Each wiki node maps to a SCRIPT node:
Load Daily Feed → (Validate Record + Post Transaction / Write Reject loop) → Build Run Summary.
The datastore, the Kafka gateway and the per-record Send/Receive pairs were **not** built.

**A2. Only four input files are read.** CONTRACT.md lists nine input files for the chain. CBTRN02C,
as the process page describes it, touches only DALYTRAN (feed), CardXref (BR-01), Account (BR-02..05)
and TCATBAL (BR-05). `custdata`, `carddata`, `trantype`, `trancatg` and `discgrp` are not read.
Type and category codes are **not** validated against `trantype`/`trancatg`, because no business rule
on the process page asks for that check.

**A3. Run parameters.** CONTRACT.md gives business date `2022-07-18`; the process page lists start
data `batchId, businessDate, feedReference`. The workflow accepts `batchId` and `businessDate`
(both optional) and echoes them in `runSummary`. They do not affect posting, because no rule uses
them. `feedReference` is replaced by passing the file contents directly (see A1).

**A4. `postingChunkSize` and `RuntimeSwitches.batchWindowOpen` are not implemented.** The process
page lists a chunk-size configuration parameter. The acceptance criteria list `batchWindowOpen`.
Neither page states a behaviour for this step. Chunking is only needed with paged datastore access,
which A1 removes. The batch window belongs to `end-of-day-batch-chain`.

## B. Record layouts and parsing

**B1. Byte layouts come from the CardDemo copybooks, not the wiki.** CONTRACT.md says "layouts as in
the copybooks". The data-model page gives field lists and PICs but not offsets. Offsets were derived
from those PICs, in the CardDemo copybook field order:
- CVTRA06Y (350): id X16, type X2, cat 9(4), source X10, desc X100, amt S9(9)V99 (11),
  merchant id 9(9), name X50, city X50, zip X10, card X16, orig-ts X26, proc-ts X26, filler X20.
- CVACT01Y (300): id 9(11), status X1, curr-bal / credit-limit / cash-limit S9(10)V99 (12 each),
  open / expiry / reissue dates X10 each, cyc-credit / cyc-debit S9(10)V99, zip X10, group X10, filler 178.
- CVACT03Y (50): card X16, cust 9(9), acct 9(11), filler 14.
- CVTRA01Y (50): acct 9(11), type X2, cat 9(4), bal S9(9)V99 (11), filler 22.

**B2. Signed amounts use ASCII overpunch on the last byte.** The data-model page (DT-07) says seed
files store "signed overpunch (`0150{` = 15.00)". The same encoding is assumed for every
`S9(n)V99` field: `{`/`A`–`I` mean positive 0–9, `}`/`J`–`R` mean negative 0–9. The parser also
accepts plain digits, a separate `+`/`-` sign and an explicit decimal point. Blank numeric fields
read as 0. Amounts are held as integer cents throughout.

**B3. Lines shorter than the record length are right-padded with spaces, and blank lines are skipped.**
CONTRACT.md says only "one record per line, fixed width".

## C. Validation (1500-VALIDATE-TRAN)

**C1. Order and short-circuit.** The legacy-comparison table on the acceptance-criteria page gives
the order xref → account → limit → expiry. The account checks (101/102/103) run only when the card
was found, and limit/expiry run only when the account was found, because they need the xref's
account id and the account record. So acceptance **scenario 6** ("card invalid and account expired →
only the last failing reason") cannot arise. An unknown card always yields 100, since there is no
account to test expiry against.

**C2. 103 overwrites 102.** This follows BR-04 and the DECISION "preserve legacy overwrite order for
parity testing". The "record both reasons as FI-06 improvement" part is **not** implemented: the
contract has a single `reason` field.

**C3. Over-limit test uses the account as already updated in this run.** BR-03 is evaluated against
`currentCycleCredit` / `currentCycleDebit` *including* postings made earlier in the same run. This
rests on the process page modelling the account as read per record and updated per posting (BR-05),
not as a start-of-day snapshot. Boundary: `creditLimit >= credit − debit + amount` passes, because
the wiki rejects only on strictly `>`.

**C4. Expiry test compares dates as text.** BR-04 says `account.expiryDate < transaction original
date`. The account expiry (`YYYY-MM-DD`) is compared as a string with the first 10 characters of
`orig_ts`. Equal dates pass.

**C5. Card matching is exact on the 16-character card number (trailing spaces trimmed on both
sides).** The account is matched on the numeric value of `acct_id`. If a key appears more than once
in an input file, the first record wins, as with a keyed (KSDS) store. The wiki gives the primary
keys (DT-01, DT-04, DT-06) but does not say how duplicates in the files are handled.

## D. Posting (2000-POST-TRANSACTION)

**D1. The posted transaction keeps the feed's `transactionId`.** DT-05 says FlowX uses a "sequence
generator". BR-09, however, makes each record idempotent *via transactionId*, which needs the feed id
to be stable. The id is kept as is and no new one is allocated.

**D2. `proc_ts` = run wall-clock time in the legacy DB2 format `YYYY-MM-DD-HH.MM.SS.hh0000`.** BR-05
says `processedTimestamp = now`. The format matches the 26-character `TRAN-PROC-TS X(26)` and the
`orig_ts` style in the feed. One timestamp is taken per run, in the FlowX runtime's timezone (UTC on
this environment). This field cannot match an oracle produced at a different time.

**D3. TCATBAL upsert key is (xref account id, feed type code, feed category code).** A missing row is
created with balance 0 and the amount is then added (BR-05, acceptance scenario 9). New rows are
appended after the existing ones in the output.

**D4. Account update per BR-05, literally.** `currBal += amount`. If `amount >= 0`,
`currCycCredit += amount`; otherwise `currCycDebit += amount`. A negative amount therefore makes
`currCycDebit` *more negative*; it is not added as an absolute value. Zero counts as a credit.

**D5. TCATBAL is updated before the account, and a failed account rewrite is not modelled.** BR-08
(reason 109, record aborted, not written to rejects) cannot occur here: the account was found
moments earlier in the same in-memory store. 109 is kept in the `RejectReasonCode` enumeration for
completeness. No numeric-overflow truncation of the PIC fields is modelled either, because the wiki
does not mention it.

## E. Rejects and run outcome

**E1. Reject output = the original record's transaction fields + `reason` (int) + `reason_desc`.**
This follows BR-06 and CONTRACT.md. The fields come straight from the input record, so `proc_ts` is
whatever the feed carried (normally blank). Descriptions are the BR texts verbatim: 100 "INVALID
CARD NUMBER FOUND", 101 "ACCOUNT RECORD NOT FOUND", 102 "OVERLIMIT TRANSACTION", 103 "TRANSACTION
RECEIVED AFTER ACCT EXPIRATION". The 76-character width is not padded (CONTRACT.md: strings may omit
trailing spaces). The wiki's own TODO on the trailer layout (DT-12) is left as the 4 + 76 that BR-06
states.

**E2. Run state.** At least one reject gives `WARNING` / returnCode 4 (BR-07). No rejects gives
`COMPLETED` / 0. These are reported in `runSummary`, which is not a contract file.

**E3. Duplicate `transactionId` within one feed: the second occurrence is skipped.** The wiki is
silent on a duplicate id in DALYTRAN. BR-09 ("each record is idempotent via transactionId") was
taken to mean an id already posted is not posted again. The skipped record appears in neither output
and is counted in `runSummary.duplicatesSkipped`, so `read = posted + rejected + duplicatesSkipped`
(the acceptance criteria's `read = posted + rejected` holds when there are no duplicates).
A rejected id may be resubmitted later in the same feed and is validated again.

**E4. Restart (BR-09, acceptance scenario 10 DECISION) is not implemented.** The workflow is a
single in-memory run with no partial commits, so there is no mid-run state to resume from.

## F. Output formatting

**F1.** Amounts are JSON strings with exactly two decimals (`"25.50"`, `"-10.00"`). These ints are
integers: `acct_id`, `cat_cd`, `merchant_id`, `reason`. `type_cd`, `tran_id` and `card_num` are
strings and keep leading zeros. Dates and timestamps are passed through as stored. Trailing spaces
are trimmed from all strings. This follows the CONTRACT.md field list and type notes.

**F2. Output order.** Transactions and rejects are in feed order. Accounts are in file order.
Category balances are in file order, followed by rows created in this run. CONTRACT.md says "any order".

**F3. `posttran_acctdata` lists every account in `acctdata.dat`, posted to or not**, and
`posttran_tcatbal` lists every category balance. This is CONTRACT.md wording ("for every account",
"for every category balance").

**F4. No `flags.json` is produced.** CONTRACT.md marks it optional and points to PROTOCOL.md §6,
which was not provided.
