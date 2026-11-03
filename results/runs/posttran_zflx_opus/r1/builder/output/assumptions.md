# POSTTRAN (daily transaction posting): assumptions and decisions

Implementation: FlowX workflow `posttran_daily_posting` (project `cd_posttran_zflx_opus_r1`).
Wiki pages used: `02-processes/process-transaction-posting.md` (PROC),
`10-acceptance-criteria/acceptance-criteria-transaction-posting.md` (AC),
`01-data-model/project-data-model.md` (DM), `05-triggers/trigger-inventory.md` (TRG), `CONTRACT.md`.

Each entry gives the decision, then the wiki statement it rests on (or the gap it fills).

## Validation rules

### A-01 Default rule set follows legacy CBTRN02C, not the wiki's one-line rule summary
- **Decision:** The default `validationProfile=LEGACY` implements the reject checks of CBTRN02C
  (open-source CardDemo, Apache-2.0). `validationProfile=WIKI` implements the wiki's PostingValidation
  text literally (A-02, A-03). The runner sends LEGACY.
- **Wiki basis:** The wiki contradicts itself here. PROC "Rule: PostingValidation" says "account must be
  active; transaction must not exceed available credit (`creditLimit - currentBalance`); card active".
  AC says "**Critical regression** — balances must match the legacy batch exactly", scenario 6 says
  "counts match legacy DALYREJS", and the Legacy Comparison table says "identical balances + reject
  set". PROC also ends with `{{TODO: ... See CBTRN01-03C source for exact reject reasons.}}`, so the
  wiki itself says its reject rules are incomplete and points at the legacy source. Where the two
  disagree, the exact-match requirement wins.

### A-02 Credit-limit test (reason 102)
- **Decision (LEGACY):** reject when `creditLimit < currCycCredit - currCycDebit + amount`. The
  intermediate is truncated to S9(09)V99, as WS-TEMP-BAL is. A transaction exactly at the limit is accepted.
- **Decision (WIKI):** reject when `amount > creditLimit - currentBalance`.
- **Wiki basis:** PROC gives only the `creditLimit - currentBalance` text, which is not CBTRN02C's formula
  (see A-01). The wiki says nothing on whether "exceed" is strict; equality is accepted in both profiles.

### A-03 Account-active and card-active checks only under the WIKI profile
- **Decision:** CBTRN02C has no active-status check, so LEGACY posts to inactive accounts and cards.
  WIKI rejects when the account's `activeStatus` is not `Y` (reason 104 `ACCOUNT NOT ACTIVE`) or the
  card's `activeStatus` (from `carddata.dat`) is not `Y` (reason 105 `CARD NOT ACTIVE`).
  A card missing from `carddata.dat` is not rejected by the card check.
- **Wiki basis:** PROC "account must be active ... card active"; AC scenario 3 "Inactive account
  (Account status N) → Rejected". The wiki gives neither a reason code nor a description for these
  rejects, nor the AccountStatus/CardStatus enum values (only links). The codes 104/105 and their texts
  are invented, and so is treating every value other than `Y` as inactive.
  **Consequence:** under the default profile, AC scenario 3 is not met. See A-01 for why.

### A-04 Reject reason codes and descriptions
- **Decision:** 100 `INVALID CARD NUMBER FOUND` (card not in XREF), 101 `ACCOUNT RECORD NOT FOUND`
  (XREF account not in ACCTFILE), 102 `OVERLIMIT TRANSACTION`, 103
  `TRANSACTION RECEIVED AFTER ACCT EXPIRATION`, as in CBTRN02C. 104 and 105 apply under WIKI only (A-03).
- **Wiki basis:** CONTRACT.md requires `reason (int) + reason_desc`. The wiki lists no codes and leaves
  them as a TODO ("See CBTRN01-03C source for exact reject reasons").

### A-05 Order of checks, and which reason wins
- **Decision:** 100 and 101 stop validation immediately. Otherwise every check runs, and when several
  fail the **last** one's reason is kept: 102, then 103 (then 104, 105 under WIKI). For example,
  over-limit plus expired gives 103. Each rejected transaction gets exactly one reason.
- **Wiki basis:** The wiki is silent. This mirrors CBTRN02C, which overwrites WS-VALIDATION-FAIL-REASON
  check by check.

### A-06 Account expiration check (reason 103)
- **Decision:** reject when the account `expirationDate` is earlier than the first 10 characters
  (date part) of the transaction's `origTimestamp`, compared as text (YYYY-MM-DD). Applies in both profiles.
- **Wiki basis:** The wiki does not mention expiration in posting validation. Added from CBTRN02C because
  AC requires the legacy reject set (A-01). The DM `{{DECISION}}` about the ACCT-EXPIRAION-DATE typo
  affects only the name; the field is read from its copybook position.

### A-07 How the owning account is found
- **Decision:** The transaction's card number is looked up in `cardxref.dat` (CardXref). The account
  is the XREF's `accountId`, and that account id is also the TCATBAL key.
- **Wiki basis:** PROC node 4 "Fetch Account — Read owning account" does not say how the account is
  reached; the daily transaction (DM Transaction) has only `cardNumber`. CardXref (DM) "Links card ↔
  customer ↔ account". `cardxref.dat` is a CONTRACT input.

### A-08 Reference codes are not validated
- **Decision:** `typeCode`/`categoryCode` are not checked against `trantype.dat`/`trancatg.dat`;
  `custdata.dat`, `discgrp.dat` and `carddata.dat` (except under WIKI) are not read.
- **Wiki basis:** DM types the fields as ENUM TransactionType/TransactionCategory, but no posting rule
  says to validate them, and CBTRN02C does not.

## Posting

### A-09 Account balance update
- **Decision:** `currentBalance += amount`. When `amount >= 0` the amount is added to
  `currentCycleCredit`, otherwise to `currentCycleDebit` (so debits accumulate as negative numbers).
  A zero amount counts as a credit.
- **Wiki basis:** PROC "posts valid transactions to account balances". The wiki does not say which
  balance fields change; this follows CBTRN02C 2800-UPDATE-ACCOUNT-REC.

### A-10 Category balance update (TCATBAL)
- **Decision:** `balance += amount` on key (XREF account id, `typeCode`, `categoryCode`). If no record
  exists for the key, one is created with balance = amount.
- **Wiki basis:** PROC "Rule: UpdateCategoryBalance — add transaction amount to the matching
  TransactionCategoryBalance (key = account + type + category)". The wiki is silent on a missing key;
  AC scenario 4 only says "TCATBAL ... increased". Creating it follows CBTRN02C 2700-A-CREATE-TCATBAL-REC.

### A-11 Transactions are processed one at a time, in file order
- **Decision:** Each transaction is validated against balances already updated by earlier valid
  transactions in the same run (the over-limit test sees same-day postings).
- **Wiki basis:** PROC flow "For each transaction → … → Next transaction"; AC "each transaction
  processed once". The wiki does not say whether validation sees intra-run updates. A sequential
  read/rewrite loop does.

### A-12 Field overflow
- **Decision:** All arithmetic is done in integer cents. Results are truncated to the size of the
  receiving field (TCATBAL balance and the over-limit intermediate: 9+2 digits; account balances:
  10+2 digits), keeping the low-order digits.
- **Wiki basis:** DM gives the sizes (`decimal(11,2)` for TCATBAL balance, `decimal(12,2)` for account
  amounts) but not the overflow behaviour. Truncation is what COBOL ADD/COMPUTE does without ON SIZE ERROR.

## Run, timing and data

### A-13 Business date and the "daily file"
- **Decision:** The run posts whatever `dailytran.dat` contains. `businessDate` (2022-07-18) is
  accepted and echoed in `posttran_stats` but does not filter transactions, and `origTimestamp` is not
  compared with it.
- **Wiki basis:** AC "Business date / cycle → Which daily file is posted" (it selects the file, not
  records). PROC `{{TODO: Confirm GDG daily-cycle semantics}}` and TRG "GDG daily cycle → dated
  partition" are left open. Here the run is handed its file directly.

### A-14 Processing timestamp of posted transactions
- **Decision:** `proc_ts` of every posted transaction is the run's timestamp in DB2 format
  `YYYY-MM-DD-HH.MM.SS.hh0000` (server clock), or the optional `processingTimestamp` input. A rejected
  transaction keeps the `proc_ts` it had in `dailytran.dat` (normally blank).
- **Wiki basis:** DM Transaction `processTimestamp` "Processing timestamp", with no rule for its value.
  A run-time value cannot match a different run byte for byte, so this field should not be compared exactly.

### A-15 Contents of each output
- **Decision:** `posttran_transact` holds only the transactions posted in this run; transactions from
  earlier days are not included. `posttran_dalyrejs` holds this run's rejects. `posttran_acctdata` holds
  every account, changed or not. `posttran_tcatbal` holds every category balance, existing and created.
- **Wiki basis:** CONTRACT "for every posted transaction", "for every rejected transaction", "for every
  account, after posting", "for every category balance, after posting".

### A-16 Output order
- **Decision:** Transactions and rejects are emitted in input order. Accounts are sorted by `acct_id`,
  and category balances by (`acct_id`, `type_cd`, `cat_cd`), i.e. keyed-file order.
- **Wiki basis:** CONTRACT "a list of objects, in any order".

### A-17 Output formatting
- **Decision:** Amounts are strings with exactly two decimals and a leading `-` when negative
  (`"-25.50"`). `acct_id`, `cat_cd`, `merchant_id` and `reason` are JSON integers. All other fields are
  strings with trailing spaces removed (leading spaces kept). Dates are copied as text, not reformatted.
- **Wiki basis:** CONTRACT "Strings may omit trailing spaces. Amounts are JSON strings or numbers
  holding at most two decimals"; it lists the int fields. DM maps `X(10)` dates to DATE, but the
  contract fixes the output format, so the stored text is passed through.

### A-18 Reading the fixed-width files
- **Decision:** One record per line. `\r` is stripped, blank lines are skipped, and short lines are
  right-padded with spaces (files whose trailing spaces were trimmed). Signed zoned amounts accept
  trailing overpunch (`{`/`A`–`I` positive, `}`/`J`–`R` negative, and the ASCII `p`–`y` negative
  variant), a separate leading or trailing `+`/`-`, or an explicit decimal point. Non-digit characters
  in unsigned numeric fields are ignored, and an all-blank numeric field reads as 0.
- **Wiki basis:** CONTRACT "fixed width, layouts as in the copybooks"; DM "Packed/zoned/signed
  numerics … map to NUMBER". The wiki does not say how the sign is encoded in the text files.

### A-19 Duplicate keys
- **Decision:** In `acctdata.dat`, `cardxref.dat`, `tcatbal.dat` and `carddata.dat`, the first record
  for a key wins and later duplicates are ignored. Duplicate transaction ids in `dailytran.dat` are each
  processed and, if valid, each posted.
- **Wiki basis:** DM says each key is "unique" but not what to do when an input repeats one. CBTRN02C
  would likely abend writing a duplicate TRANSACT key; this build does not reproduce that abend.

### A-20 Empty daily file
- **Decision:** No transactions → nothing posted or rejected. Account and TCATBAL outputs equal the
  inputs (re-formatted), and the run finishes normally.
- **Wiki basis:** AC scenario 5 "Empty daily file (edge) — Run completes, nothing posted".

### A-21 FlowX shape: workflow with an in-script loop, no persistence topics or scheduler
- **Decision:** The batch is one FlowX integration workflow (Start → Load Daily Inputs → Validate and
  Post Transactions → Build Contract Outputs → End). It takes the file contents as input and returns
  the four outputs. The per-transaction loop, the "Account Active & Within Limit?" gateway and the
  Post/Reject branches run inside the "Validate and Post Transactions" script, in file order. The
  Kafka send/receive nodes (`ai.flowx.in.carddemo.datastore.*` topics) and the nightly scheduled
  trigger are not built.
- **Wiki basis:** PROC draws a BPMN process with Send/Receive nodes to "FlowX Persistence" and a
  scheduled start (TRG "cron to be defined"). CONTRACT, however, makes the step file-in/file-out, and
  no persistence service or topic contract exists in the wiki. A gateway and two service tasks per
  transaction would also multiply run events by the file size without changing any result.
  `posttran_stats.returnCode` reports 4 when there are rejects, as the legacy step's return code did.
