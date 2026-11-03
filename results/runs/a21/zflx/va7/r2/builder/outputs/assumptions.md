# POSTTRAN (P-14 daily-transaction-posting) — build decisions and assumptions

Implementation: FlowX workflow `posttran_daily_transaction_posting`
(project `cd_a21_va7_zflx_r2`, resourceId `<uuid>`,
resourceDefinitionId `<uuid>`).

`Start → Load Daily Feed → Validate and Post Records → Build Run Summary → Format Contract Outputs → End`

Each entry below gives what was assumed or decided, and the wiki statement it rests on, or the
place where the wiki says nothing. "Wiki" means the pages in `posttran-sonnet-va7.pdf`.

## A. Architecture and scope

**A-01 One integration workflow instead of the process + loop + four integration workflows.**
The process page draws a BPMN process (Send/Receive pairs, a For Each Record subprocess) over
`workflow-batch-file-transfer`, `workflow-account-data-access`, `workflow-transaction-data-access`
and `workflow-reference-data-access`, all backed by the `carddemo-datastore` NOSQL_DB. CONTRACT.md
instead fixes file inputs and JSON outputs per run. I built one DEFAULT workflow whose script nodes
follow the process nodes (Load Daily Feed, Validate Record + Post / Write Reject in the loop, Build
Run Summary), with the files as workflow input and the four outputs as the END payload. No
datastore, Kafka gateway or per-record Send/Receive is used.
*Rests on:* CONTRACT.md ("fixes formats only"; inputs are given per run as files) versus the process
page's integration design. The wiki gives no FlowX source for the files other than a Kafka gateway
that does not exist here.

**A-02 Inputs are passed as text in the workflow input.** The START INPUT slice declares
`dailytran`, `acctdata`, `cardxref` (required), and `tcatbal`, `businessDate`, `batchId` (optional).
Each holds a whole file, one fixed-width record per line.
*Rests on:* `workflow-batch-file-transfer` READ_FILE_PAGE returns `records[]`, but no system is
defined. Paging is unnecessary at CardDemo sizes, and so is the `postingChunkSize` config parameter
(see A-05).

**A-03 Files read.** POSTTRAN reads only `dailytran.dat`, `acctdata.dat`, `cardxref.dat` and
`tcatbal.dat`. `custdata`, `carddata`, `trantype`, `trancatg` and `discgrp` are not read.
*Rests on:* the process page's Legacy Source copybooks (CVTRA06Y, CVTRA05Y, CVACT01Y, CVACT03Y,
CVTRA01Y) and BR-01..BR-10. No rule refers to customers, cards, types or categories.
`VALIDATE_REFERENCES` names no reference table beyond the xref and account lookups.

**A-04 No batch-window check.** The workflow does not check `RuntimeSwitches.batchWindowOpen`.
*Rests on:* the acceptance criteria list it as a configuration dependency, but the end-of-day chain
opens and closes the window. P-14 has no rule that says what to do when the window is closed.

**A-05 No chunking or restart state (BR-09).** All records are processed in one script, in memory,
in feed order. Nothing is committed per record, so there is no partial state to resume from. A
failed run is simply re-run from the same input files, which posts nothing twice because the
outputs are rebuilt from the inputs each time. AC-10 (restart) is satisfied in that sense only.
*Rests on:* BR-09 ("each record is idempotent via transactionId; restart resumes after the last
processed index") and AC-10's open `{{DECISION: restart strategy}}`. The wiki assumes a persistent
store, which this build does not have.

## B. Input parsing

**B-01 Layouts.** These are the copybook offsets used:
- DALYTRAN (CVTRA06Y, 350): id 0-16, type 16-18, cat 18-22, source 22-32, desc 32-132,
  amt S9(9)V99 132-143, merchant id 143-152, name 152-202, city 202-252, zip 252-262,
  card 262-278, orig ts 278-304, proc ts 304-330.
- ACCOUNT (CVACT01Y, 300): id 0-11, status 11, curr bal 12-24, credit limit 24-36,
  cash limit 36-48, open 48-58, expiry 58-68, reissue 68-78, cyc credit 78-90, cyc debit 90-102,
  zip 102-112, group 112-122.
- XREF (CVACT03Y, 50): card 0-16, cust 16-25, acct 25-36.
- TCATBAL (CVTRA01Y, 50): acct 0-11, type 11-13, cat 13-17, bal S9(9)V99 17-28.

*Rests on:* CONTRACT.md ("layouts as in the copybooks") and the data-model PIC clauses. The
data-model page lists attributes, not byte offsets, so the offsets come from the copybooks' PIC
sequence.

**B-02 Signed amounts.** S9(n)V99 fields are decoded as ASCII zoned decimal with the sign overpunched
on the last digit (`{`/A–I positive, `}`/J–R negative). Plain digits, an explicit `+`/`-` sign and an
explicit decimal point are also accepted. All arithmetic is done in integer cents.
*Rests on:* DT-07 ("seed file stores signed overpunch (`0150{` = 15.00)") for the CardDemo ASCII
files. The wiki does not state the encoding of the other files, so the parser is lenient.

**B-03 Short or blank lines.** Lines shorter than the record length are right-padded with spaces,
since stripped trailing spaces are common in text files. Wholly blank lines are skipped and are not
counted as records.
*Rests on:* silence.

**B-04 Duplicate keys in the reference files.** If acctdata, cardxref or tcatbal holds two records
with the same key, the first one wins.
*Rests on:* these are KSDS files (DT-01/04/06), which hold one record per key. The wiki says nothing
about duplicates in an input.

## C. Validation (1500-VALIDATE-TRAN)

**C-01 Check order and reason overwrite.** The checks run in this order: xref lookup (100), then
account lookup (101), then over-limit (102), then expiry (103). A later failure overwrites an earlier
reason, so when both 102 and 103 apply, 103 is reported (verified in the test run, record 6).
Following the wiki's `{{DECISION: preserve legacy overwrite order for parity testing}}`, I did not
implement FI-06 ("record both reasons"). The contract has one `reason` field.
*Rests on:* BR-04 and AC-6, and the Legacy Comparison row "last failure overwrites … Same".

**C-02 AC-6 "card invalid and account expired".** When the card is not in the xref, no account can be
reached, so the expiry check cannot run and the reject is **100**. This is not "103 overwriting 100".
*Rests on:* BR-02/BR-03/BR-04 all need the account found through the xref (BR-02 says "Xref points to
missing account"). The wiki does not say how an account would be found for an unknown card.

**C-03 Over-limit uses the cycle totals, not the current balance.**
`currentCycleCredit − currentCycleDebit + amount > creditLimit` rejects; equality passes. The account
state used is the running state, so earlier postings in the same run count.
*Rests on:* BR-03 (formula, strict `>`). Sequential processing replaces "the legacy sequential read
loop" (Purpose). The wiki does not say whether to use a start-of-day snapshot; I assumed the running
state, as the legacy loop rewrites the account before the next read.

**C-04 Expiry comparison.** The check is `account.expiryDate < first 10 characters of origTs`, compared
as `YYYY-MM-DD` text. A blank expiry date therefore compares as earlier and rejects with 103.
*Rests on:* BR-04 ("expiryDate < transaction original date"). The wiki does not say how to treat a
blank or malformed date.

**C-05 No other checks.** The workflow does not check account active status, card active status,
card expiry, or whether the transaction type/category exists.
*Rests on:* BR-01..BR-10 list no such rule (silence).

**C-06 Daily purchase limit (BR-10, reason 104).**
- **What is counted:** only purchases (amount > 0) actually *posted* in this run, per **card number**,
  in feed order.
- **When 104 applies:** a purchase that has passed BR-01..BR-04 is rejected 104 when its card already
  has 4 counted purchases.
- **What is not counted:** credits, zero amounts, rejected purchases and 104-rejected purchases.
  Credits and zero amounts never get 104.
- **Configuration:** the limit 4 is a constant in the script, because the wiki lists no config
  parameter for it.
- **Precedence:** 104 is only checked when no other reason applies, so it never overwrites 100–103.

*Rests on:* BR-10 and AC-11. The wiki says "posted in one run, counted in feed order". It does not say
whether earlier days' purchases count (assumed not: "in one run").

**C-07 Reason 109 (BR-08) cannot occur.** An account-rewrite failure cannot happen with in-memory
state, so this code path does not exist.
*Rests on:* BR-08.

## D. Posting (2000-POST-TRANSACTION)

**D-01 `tran_id` = the DALYTRAN id.** The id from the feed is kept and no new sequence value is
allocated.
*Rests on:* BR-09 ("idempotent via transactionId" only works if the id is stable across reruns) and the
legacy behaviour. DT-05 and `transaction-data-access` ADD_TRANSACTION mention a FlowX sequence
generator. I did not use it, because a generated id would differ on every run and from the oracle.

**D-02 `proc_ts` = run time.** It is the wall-clock time of the run, in UTC, written in the legacy DB2
text format `YYYY-MM-DD-HH.MM.SS.hh0000`. One value is used for the whole run.
*Rests on:* BR-05 ("processedTimestamp = now"). The wiki does not give the format or time zone; the
format follows DT-05's legacy X(26) TRAN-PROC-TS. This field cannot match an oracle produced at a
different time.

**D-03 Category balance upsert.** The key is (xref account id, DALYTRAN type, DALYTRAN category). If no
record exists one is created with balance = amount; otherwise the amount is added (AC-9).
*Rests on:* BR-05 ("TCATBAL upsert (create on not found)") and DT-06's composite key.

**D-04 Account update and zero amounts.** `currentBalance += amount`. When amount ≥ 0,
`currentCycleCredit += amount`; otherwise `currentCycleDebit += amount`. A negative amount therefore
makes the cycle-debit total *more negative*, which reproduces BR-05 literally. A zero amount goes to
the credit bucket and changes nothing.
*Rests on:* BR-05's "amount ≥ 0". The sign convention of cycle debit is not discussed in the wiki.

**D-05 Other account fields are not changed.** Every account is output, posted to or not, in
input-file order.
*Rests on:* the CONTRACT "account fields for every account, after posting".

## E. Rejects and run status

**E-01 Reject output.** Each reject carries the original record's fields unchanged (including its
own, usually blank, `proc_ts`), plus `reason` (int) and `reason_desc`. The description is the legacy
text, without padding to 76 characters.
*Rests on:* BR-06 and DT-12. DT-12 has `{{TODO: confirm trailer layout (4 + 76)}}`; the contract
asks for fields rather than a 430-byte image.

**E-02 Reason descriptions.** These are the texts used. BR-02 gives no literal text; I used the
reason text the wiki shows for the code.

| Code | Description |
|------|-------------|
| 100 | INVALID CARD NUMBER FOUND |
| 101 | ACCOUNT RECORD NOT FOUND |
| 102 | OVERLIMIT TRANSACTION |
| 103 | TRANSACTION RECEIVED AFTER ACCT EXPIRATION |
| 104 | DAILY PURCHASE LIMIT EXCEEDED |

*Rests on:* BR-01..BR-04 and BR-10.

**E-03 Run status.** Any reject → `WARNING` / returnCode 4; no rejects → `COMPLETED` / 0. If read ≠
posted + rejected, the run reports `FAILED` / 16. This last guard is my own addition and never fires
in normal operation.
*Rests on:* BR-07 and the acceptance criteria "verify counts: read = posted + rejected". The wiki
does not define a status for a failed count check.

**E-04 Duplicate transaction ids in the feed.** These are processed like any other record (no
de-duplication).
*Rests on:* silence. BR-09's idempotency is about restarts, not about duplicates inside one feed.

## F. Output formatting

**F-01 Amounts** are JSON strings with exactly two decimals (`"-15.00"`).
**F-02 Integer fields** are parsed as integers: `acct_id`, `cat_cd`, `merchant_id`. A blank or
non-numeric value becomes `null` (not specified).
**F-03 Text fields** have trailing spaces stripped and leading spaces kept. The card number is
trimmed on both sides for the xref match.
**F-04 Output order** is: posted and rejected in feed order; accounts in file order; category
balances with existing ones in file order, then new ones in order of creation.

*Rests on:* CONTRACT.md ("any order", "strings may omit trailing spaces", "at most two decimals").

## G. What the files in this folder are

No CardDemo input files were supplied with the wiki. The JSON files here come from a FlowX run
(instance `6ae1dbec3695c563ea50ab27`) on the **synthetic** feed in `../test-inputs/`, which covers
AC-1..AC-9 and AC-11. To produce outputs for the real run, invoke the workflow with
`{"businessDate":"2022-07-18","dailytran":<dailytran.dat text>,"acctdata":<…>,"cardxref":<…>,"tcatbal":<…>}`
and write each array in the END payload to its `posttran_*.json` file.
