# POSTTRAN (daily-transaction-posting, P-14) — assumptions and decisions

Implementation: FlowX project `cd_a16_posttran_zflx_sonnet_r3` (dev-env), workflow
`posttran_daily_transaction_posting` (resourceDefinitionId `<uuid>`):
START → SCRIPT "Validate and post" → SCRIPT "Build run summary" → END (returns the four
CONTRACT outputs + `runSummary`). Script sources: `../flowx/scripts/`. Runner: `../run_posttran.js`.

Each entry: what I decided, and the wiki statement (or gap) it rests on.

## Architecture

**A1. One integration workflow, in-memory over the run's files, instead of a per-record process loop
with Send/Receive calls to account/transaction/reference data-access workflows on a NOSQL_DB.**
Wiki: process page shows Load Daily Feed → For Each Record subprocess → per-record
`POST_TRANSACTION` / `WRITE_REJECT` Send/Receive, backed by `carddemo-datastore`. CONTRACT.md says
inputs are "given per run" as fixed-width files and outputs are JSON lists of the final state — no
datastore exists to post into. I kept the node semantics (Validate Record, Post Transaction,
Write Reject, Build Run Summary) as named sections of the script, and the store is the run state.
The data-access workflows (account / transaction / reference / batch-file-transfer) are therefore
not built; their operations are replaced by map lookups/updates on the parsed files.

**A2. Restart / no duplicate postings (BR-09, AC scenario 10, `{{DECISION: restart strategy}}`).**
The run is atomic: nothing is persisted until the END payload is returned, so a failure mid-run
leaves no partial postings and a re-run from the same inputs is safe. Within a run, posting is
idempotent on `transactionId`: a feed record whose id was already posted in this run is skipped
(neither posted nor rejected; counted as `duplicatesSkipped` in the run summary). No
"resume after last processed index" cursor is implemented — there is no persisted state to resume.
Note this means `read = posted + rejected` (AC Data Mapping Verification) holds only when the feed
has no duplicate ids. Legacy (F-08) would abend on a duplicate TRANSACT key.

**A3. `postingChunkSize`, `RuntimeSwitches.batchWindowOpen`, `RejectReasonCode` enumeration** are
named as configuration dependencies but have no behavioural rule on this step. Not implemented as
platform resources; reason codes/texts are constants in the script (BR-01..BR-04 texts).

**A4. Inputs not read.** CONTRACT lists `custdata.dat`, `carddata.dat`, `trantype.dat`,
`trancatg.dat`, `discgrp.dat`. No posting rule uses customer, card, type/category descriptions or
disclosure groups (the wiki's VALIDATE_REFERENCES lookups are xref + account only — BR-01/BR-02),
so they are ignored. Card active status is not checked (no rule says so).

## Validation (1500-VALIDATE-TRAN)

**V1. Order and overwrite (BR-04, AC scenario 6, `{{DECISION: preserve legacy overwrite order}}`,
`{{DECISION: keep or collect all reasons}}`).** Order xref → account → limit → expiry; one reason
kept per record, the last failing one. 100 and 101 stop validation of that record (without an xref
there is no account to check; without an account there is no limit or expiry), so "card invalid and
account expired" yields 100. 102 and 103 are both evaluated; 103 overwrites 102. The wiki's FI-06
idea of recording both reasons is not implemented (the contract has a single `reason`).

**V2. Over-limit uses the 10% tolerance exactly as written (BR-03, AC scenario 4):**
reject 102 when `currCycCredit − currCycDebit + amount > creditLimit × 1.10`. Strictly greater, so
exactly 110% of the limit posts. Computed in integer cents (`tempBal×100 > limit×110`) — no
rounding. (I implemented the wiki as documented; I did not add or remove the tolerance.)

**V3. Limit check runs against the account as already updated by earlier postings in the same run**
(sequential processing; wiki: "Replaces the legacy sequential read loop"). `currCycDebit` is stored
as a signed value (negative for debits, see P2), so subtracting it adds its magnitude.

**V4. Expiry check (BR-04):** reject 103 when `account.expiryDate < transaction original date`,
comparing `expiration_date` (YYYY-MM-DD) with the first 10 characters of `orig_ts` as strings.
Equal dates pass. A blank expiry date compares lower than any date and therefore rejects 103.

**V5. Account lookup key** is the xref's account id (numeric value of `XREF-ACCT-ID`), matched to
`ACCT-ID` by numeric value; card lookup is the exact 16-character card number. Account
`active_status` is not checked (no rule).

## Posting (2000-POST-TRANSACTION)

**P1. Posted `tran_id` = the daily record's id.** Wiki: transaction-data-access `ADD_TRANSACTION`
allocates ids by sequence, but the POST_TRANSACTION mapping sends `dailyTransaction` and BR-09 makes
each record "idempotent via transactionId", which only works if the id is the feed's id. All other
transaction fields are copied unchanged from the daily record.

**P2. Balances (BR-05):** `currentBalance += amount`; amount ≥ 0 → `currentCycleCredit += amount`,
else `currentCycleDebit += amount` (so the debit total goes more negative — the wiki adds the
signed amount; it does not say to add the absolute value). Zero counts as credit.

**P3. `processedTimestamp = now` (BR-05)** — the wall-clock time of the FlowX run, per record, in the
legacy DB2 26-char format `YYYY-MM-DD-HH.MM.SS.hh0000` (Transaction `processedTimestamp` is legacy
`TRAN-PROC-TS X(26)`). It is *not* derived from the business date `2022-07-18`; the wiki says "now".
Time zone is the FlowX script runtime's (UTC on dev-env).

**P4. TCATBAL upsert (BR-05, AC scenario 9):** key = xref account id + transaction type code +
category code; created with balance = amount when absent, otherwise balance += amount. New rows are
appended to the output after the existing ones (CONTRACT: "any order").

**P5. Reason 109 / account rewrite failure (BR-08)** cannot occur in-memory; not implemented.
No overflow truncation of `S9(10)V99` / `S9(9)V99` fields is applied (wiki silent).

## Rejects (2500-WRITE-REJECT-REC)

**R1. Reject content (BR-06, AC scenario 7):** `posttran_dalyrejs` holds the original record's
transaction fields (as parsed from the 350-byte image, `proc_ts` as it appears in the feed —
usually blank) plus `reason` (int) and `reason_desc`. The 76-character trailer text is the BR-01..04
text without padding (CONTRACT: strings may omit trailing spaces). Wiki `{{TODO: confirm trailer
layout (4 + 76)}}` is moot for the JSON output.

**R2. Reason texts:** 100 `INVALID CARD NUMBER FOUND`, 101 `ACCOUNT RECORD NOT FOUND`,
102 `OVERLIMIT TRANSACTION`, 103 `TRANSACTION RECEIVED AFTER ACCT EXPIRATION` (BR-01..BR-04 verbatim).

## Run outcome

**S1. (BR-07, AC scenario 8)** `runSummary.status = "WARNING"`, `returnCode = 4` when any reject
exists, else `"COMPLETED"` / `0`. The workflow itself still finishes normally (BR-03 of the batch
chain: rejects do not stop the chain). The summary is written to `posttran_run_summary.json`, which
is not a CONTRACT output.

## Formats and parsing

**F1. Fixed-width layouts** taken from the copybooks named in CONTRACT (CVTRA06Y, CVACT01Y,
CVACT03Y, CVTRA01Y), standard CardDemo field offsets; the wiki data model gives field names/PICs but
not offsets. Short lines are right-padded with spaces; blank lines are ignored.

**F2. Signed numeric fields** (`S9(n)V99`) are read as zoned decimal with the sign overpunched on
the last byte (`{`/`A`–`I` positive, `}`/`J`–`R` negative), with an implied 2-decimal scale. A
leading/trailing `+`/`-` or an explicit decimal point is also accepted. The wiki does not state the
ASCII encoding of these fields (it only notes an overpunch for `discgrp.txt` interest rates).

**F3. Output types (CONTRACT):** amounts as strings with exactly two decimals (`"-25.00"`);
`acct_id`, `cat_cd`, `merchant_id`, `reason` as integers; other strings right-trimmed. Accounts are
emitted in input order, all of them (posted to or not); `type_cd` kept as the 2-character code.
