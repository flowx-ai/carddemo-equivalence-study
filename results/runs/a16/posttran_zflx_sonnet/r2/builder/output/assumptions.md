# POSTTRAN (daily-transaction-posting, P-14) — build assumptions

Every place where the wiki was uncertain, incomplete or silent and a decision had to be made.
"Wiki" refers to the pages bundled in `cr2-posttran-sonnet.pdf`. Code references are to the
FlowX workflow `posttran_daily_transaction_posting` (scripts mirrored in `../flowx/`).

## Architecture

**A1. One integration workflow, files in / JSON out — no datastore, no process loop.**
The wiki describes a BPMN process (Send/Receive pairs, a For-Each subprocess, four integration
workflows over the `carddemo-datastore` NOSQL_DB). CONTRACT.md instead fixes the step as
"fixed-width input files → JSON output files". I built a single DEFAULT workflow whose three
SCRIPT nodes carry the wiki's node names (Load Daily Feed → Validate and Post Records → Build Run
Summary) and whose START input slice takes the file images as strings. The datastore, the
`account-/transaction-/reference-data-access` workflows and the Kafka `batch-file-transfer` gateway
are not built.
*Rests on:* process page "Integration" + project-data-model DECISION (one NOSQL_DB system) vs
CONTRACT.md "Inputs (given per run)" / "Outputs".

**A2. Only four of the contract input files are read.**
`dailytran.dat`, `cardxref.dat`, `acctdata.dat`, `tcatbal.dat`. `custdata`, `carddata`, `trantype`,
`trancatg`, `discgrp` are ignored.
*Rests on:* BR-01…BR-05 only reference CardXref, Account and TransactionCategoryBalance; the
"Validate Record" node mentions lookups via `VALIDATE_REFERENCES`, which is defined nowhere, so no
extra type/category/card validation was invented.

**A3. Byte layouts.** The wiki lists attributes and PIC sizes but no offsets. Offsets were taken
from the attribute order and sizes in the data-model tables (= copybooks CVTRA06Y/CVTRA05Y,
CVACT01Y, CVACT03Y, CVTRA01Y): e.g. DALYTRAN amount at bytes 133-143, card number 263-278,
original timestamp 279-304; account expiry 59-68, cycle credit 79-90, cycle debit 91-102; TCATBAL
balance 18-28. *Rests on:* DT-01, DT-04, DT-05/DT-11 ("same attributes as Transaction"), DT-06.

**A4. Signed numeric encoding.** Wiki silent on how `S9(n)V99` appears in the ASCII files. The
parser accepts trailing overpunch (`{`,`A`–`I` positive; `}`,`J`–`R` and `p`–`y` negative), an
explicit leading/trailing `+`/`-`, and a literal decimal point; two implied decimals. Unparseable
numeric fields become 0. *Rests on:* DT-07 mentions the overpunch convention (`0150{`) for seed data.

## Validation (1500-VALIDATE-TRAN)

**A5. Short-circuiting.** Reason 100 (no xref) ends validation — without an xref there is no
account to check. Reason 101 likewise. When the account exists, both 102 and 103 are evaluated and
103 overwrites 102. Acceptance scenario 6 ("card invalid **and** account expired → only the last
reason kept") cannot happen under this order, since an invalid card yields no account; such a
record gets 100. *Rests on:* BR-04 (103 overwrites 102), Legacy Comparison "xref → account →
limit → expiry", scenario 6.

**A6. Over-limit rule implemented literally, with the 10 % tolerance.**
Reject 102 when `currentCycleCredit − currentCycleDebit + amount > creditLimit × 1.10` (strict `>`,
exact integer-cent arithmetic). `currentCycleDebit` holds negative amounts (BR-05 adds negative
amounts to it), and the formula is applied exactly as written. *Rests on:* BR-03 and acceptance
scenario 4. Note: scenario 4's text omits the ×1.10; I followed BR-03, which states it explicitly.
This is flagged in `flags.json` because it is the single rule most likely to differ from the legacy
oracle.

**A7. Expiry rule.** Reject 103 when `account.expirationDate < first 10 chars of orig_ts`
(`YYYY-MM-DD` string compare, strict). A blank expiry date compares lower and so rejects.
*Rests on:* BR-04 ("transaction original date"); timestamp format not specified.

**A8. No other checks.** Account `activeStatus`, card status and the business date are not used in
validation. *Rests on:* absence of any such rule in BR-01…BR-09.

## Posting (2000-POST-TRANSACTION)

**A9. Running state within a run.** Records are processed in file order; each posting's account
and category-balance update is visible to later records (e.g. a second purchase can go over limit
because of the first). *Rests on:* purpose "replaces the legacy sequential read loop", BR-05.

**A10. `tran_id` of a posted transaction = the daily record's id.** Not a newly allocated
sequence value. The wiki conflicts: DT-05 / transaction-data-access `ADD_TRANSACTION` speak of a
sequence generator, while BR-09 makes "each record idempotent via `transactionId`" and DT-11 says a
DailyTransaction has the same attributes as a Transaction. Keeping the id is what makes BR-09
possible and keeps the posted record traceable to its feed record.

**A11. Duplicate `transactionId` within one feed.** The second (and later) valid occurrence of an
already-posted id is **skipped** — not posted, not rejected (no reject reason exists for it) — and
counted in `runSummary.duplicatesSkipped`. Invalid duplicates are still rejected normally.
*Rests on:* BR-09 (idempotent per `transactionId`); the reject enumeration has only 100-103.

**A12. `proc_ts` of posted transactions.** Run time in UTC, legacy DB2 26-char format
`YYYY-MM-DD-HH.MM.SS.hh0000`, one value for the whole run. An optional `runTimestamp` input
overrides it (for reproducible reruns). *Rests on:* BR-05 "processedTimestamp = now"; DT-05
`TRAN-PROC-TS X(26)`; wiki silent on timezone and format.

**A13. Category balance upsert.** Key = xref account id + daily `type_cd` + daily `cat_cd`; when
missing, a row is created whose balance is the transaction amount. *Rests on:* BR-05, DT-06
composite key, scenario 9.

**A14. Account update.** `curr_bal += amt`; `amt ≥ 0` → `curr_cyc_credit += amt`, else
`curr_cyc_debit += amt` (debit becomes more negative). *Rests on:* BR-05 verbatim.

**A15. Field overflow not modelled.** PIC size truncation of `S9(10)V99` / `S9(9)V99` is not
emulated. *Rests on:* wiki silent.

**A16. Reason 109 is never produced.** Updates are in-memory and cannot fail mid-record.
*Rests on:* BR-08 (109 = account rewrite failure, not written to rejects).

## Rejects (2500-WRITE-REJECT-REC)

**A17. Reject content.** The original record unchanged (including its own `proc_ts`, usually
blank) plus `reason` (int) and `reason_desc` (trimmed of the 76-char padding). *Rests on:* BR-06,
DT-12 (its trailer layout is itself a TODO in the wiki), CONTRACT "strings may omit trailing spaces".

## Run control

**A18. Run status.** `WARNING` / return code 4 when ≥1 reject, otherwise `COMPLETED` / 0 (the
success name is my choice; the wiki only names WARNING). Reported in `runSummary` together with
read / posted / rejected / duplicatesSkipped counts and a `countsBalance` check
(read = posted + rejected + duplicates). *Rests on:* BR-07, AC "verify counts: read = posted + rejected".

**A19. Restart / chunking.** The workflow is a pure function of its inputs and commits nothing
part-way, so a failed run is simply re-run with the same inputs and cannot double-post; there is
no "resume after last processed index" and `postingChunkSize` is not used. *Rests on:* BR-09,
scenario 10 (DECISION left open in the wiki), Configuration Dependencies.

**A20. `RuntimeSwitches.batchWindowOpen` is not checked.** It belongs to the end-of-day chain
that opens/closes the window. *Rests on:* end-of-day-batch-chain DECISION; acceptance page
"Configuration Dependencies".

## Data handling

**A21.** Lines are split on LF/CRLF; blank lines are skipped; short lines are right-padded to the
record length. Duplicate keys in reference files: first record wins. Output lists keep input order
for accounts and category balances (new category rows appended in creation order); posted and
rejected transactions keep feed order. Every account is written, touched or not. Amounts are
emitted as strings with two decimals (`"-20.00"`); numeric ids (`acct_id`, `cat_cd`,
`merchant_id`, `reason`) as integers. *Rests on:* CONTRACT.md output rules; wiki silent otherwise.

## Evidence

No real CardDemo input files were supplied with the task, so the JSON files in this directory are
the output of one end-to-end run (`run_workflow`, instance `6ae1269c3695c563ea50944d`, status
FINISHED) on the synthetic set in `../sample-input/`, which exercises every acceptance scenario
except restart: valid post, 100, 101, 102 (incl. a post inside the 10 % tolerance and a reject once
the running cycle total passes it), 103, 102+103 → 103, a negative amount, a new category balance
and a duplicate id. All results matched hand-computed expectations. Their `proc_ts` is the run time.
