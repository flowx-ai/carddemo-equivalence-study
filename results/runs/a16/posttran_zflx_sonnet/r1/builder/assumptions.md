# POSTTRAN (daily-transaction-posting, P-14) — assumptions and decisions

Implementation: FlowX project `cd_a16_posttran_zflx_sonnet_r1` (dev-env), integration workflow
`posttran_daily_transaction_posting` (resourceDefinitionId `<uuid>`),
enumeration `RejectReasonCode`. Local `posttran_runner.py` only moves files in and out.

Each entry gives what was decided and the wiki statement (or gap) it rests on. "Wiki" means the pages in
`cr2-posttran-sonnet.pdf`. References: P = process-daily-transaction-posting, AC =
acceptance-criteria-daily-transaction-posting, DM = project-data-model, W-xx = integration workflow pages.

## Architecture

**A1. One integration workflow with in-memory master data, not a process with a per-record subprocess and datastore calls.**
The wiki (P, Process Flow / Nodes) describes a process with Send/Receive pairs to the `account-data-access`,
`transaction-data-access`, `reference-data-access` and `batch-file-transfer` workflows over the
`carddemo-datastore` NOSQL_DB (DM, intro). CONTRACT.md defines the step as fixed-width files in and JSON files out,
and no datastore content is given. So the workflow loads the four input files, keeps the masters in memory, and
returns the updated masters as output. The node names follow the wiki: *Load Daily Feed* (READ_DAILY_FEED);
*Validate And Post Records* (For Each Record + Validate Record + Post Transaction / Write Reject); *Build Run Summary*.
The per-record loop runs inside one script, not as one subprocess per record. This keeps a run to a handful of node
executions.

**A2. Records are processed one at a time in feed order, and earlier postings affect later validation.**
P, Purpose: the step "replaces the legacy sequential read loop". BR-05 updates the account cycle totals that
BR-03 reads. So record *n* is checked against the account as updated by records 1..n-1 of the same run.

**A3. `postingChunkSize` and `RuntimeSwitches.batchWindowOpen` are not used.**
The wiki names both (P, Configuration Dependencies; AC, Configuration Dependencies) but gives no behaviour for
either inside this step. The whole feed is one chunk. The batch-window flag belongs to the end-of-day chain
(process-end-of-day-batch-chain, DECISION on `batchWindowOpen`).

**A4. Only `dailytran`, `acctdata`, `cardxref` and `tcatbal` are read. `custdata`, `carddata`, `trantype`, `trancatg` and `discgrp` are ignored.**
No business rule in P uses customers, cards, transaction types/categories or disclosure groups. BR-01 checks the
card against **CardXref**, not the card file. The *Validate Record* row mentions lookups via
`VALIDATE_REFERENCES`, but the only lookups with a rule are xref (BR-01) and account (BR-02). Type and category
codes are therefore **not** checked against reference data.

## Validation (BR-01 .. BR-04)

**A5. Order xref → account → limit → expiry, with short-circuits after 100 and 101.**
AC, Legacy Comparison: "Validation order xref → account → limit → expiry". The account is found through the xref
(P, Data Mapping: "accountId (from xref)"). After reason 100 no account can be looked up, and after 101 there is no
account to test limit or expiry against. So 100 and 101 end validation.

**A6. When both limit and expiry fail, reason 103 overwrites 102.**
BR-04: "(overwrites 102 when both apply — finding F-05; DECISION: preserve legacy overwrite order for parity
testing, record both reasons as FI-06 improvement)". AC scenario 6 and Legacy Comparison: "last failure
overwrites". The output has a single `reason`, so only the last reason is kept. Collecting both reasons (FI-06) is
not implemented. AC scenario 6 says "Card invalid and account expired". That combination cannot occur, because an
invalid card never reaches the account (A5). 102 → 103 is the only reachable overwrite.

**A7. Over-limit test exactly as BR-03, including the 10% tolerance.**
BR-03 and AC scenario 4: `currentCycleCredit − currentCycleDebit + amount > creditLimit × 1.10` → 102. The test is a
strict `>`, so exactly 110% still posts. It is computed in integer cents (`temp × 100 > limit × 110`), so there is
no floating-point rounding. The cycle values used are the ones after earlier postings in the run (A2).
*Uncertainty (flagged):* the wiki states the tolerance twice, and I followed the wiki as instructed. From memory,
not from this pack: the published CBTRN02C compares `ACCT-CREDIT-LIMIT >= WS-TEMP-BAL` with no tolerance. If the
oracle is the COBOL program, records whose new cycle total falls between 100% and 110% of the limit will differ:
we post them, legacy rejects them with 102. That knock-on also affects balances.

**A8. Expiry test: `account.expiryDate < first 10 chars of the original timestamp` → 103.**
BR-04 compares the account expiry date with the "transaction original date". The original timestamp is 26 chars
starting `YYYY-MM-DD` (DT-05 `originalTimestamp`, TRAN-ORIG-TS X(26)), so its first 10 chars are compared as text with
the `YYYY-MM-DD` expiry. A transaction dated on the expiry day posts. A blank expiry sorts below any date and is
rejected. The wiki says nothing about blank expiry dates.

**A9. No check on account or card active status.**
P lists no rule for `activeStatus`, and DT-01/DT-03 define the field without a posting rule. Inactive accounts post
normally.

## Posting (BR-05)

**A10. `tran_id` of a posted transaction = the daily record's id.**
DT-11: DailyTransaction has "same attributes as Transaction", which includes `transactionId`. BR-09 makes posting
"idempotent via `transactionId`", which only works if the id is stable for a given input record. The sequence
allocation in DT-05 / W-04 ADD_TRANSACTION ("replaces last record + 1") is the online-add path. P's POST_TRANSACTION
returns `transactionId` but says nothing about allocating a new one.

**A11. `proc_ts` = wall-clock time when the run starts, UTC, in the legacy 26-char DB2 layout `YYYY-MM-DD-HH.MI.SS.hh0000`. One value is used for the whole run.**
BR-05: "processedTimestamp = now". The wiki gives no format or time zone. DT-05 types it DateTime, and legacy
TRAN-PROC-TS is X(26). The run date is not substituted by the business date (2022-07-18), because the wiki says
"now". For reproducible comparisons the workflow input `processedTimestamp` (runner: `--processed-timestamp`)
pins the value.

**A12. The category balance key is (xref account id, daily type code, daily category code). A missing row is created with balance = amount.**
BR-05: "TCATBAL upsert (create on not found)". DT-06 key: accountId + typeCode + categoryCode. P, Data Mapping:
accountId comes from the xref. AC scenario 9: "Category balance created".

**A13. Account update: `currentBalance += amount`. For `amount ≥ 0`, `currentCycleCredit += amount`, otherwise `currentCycleDebit += amount`.**
BR-05 is applied literally. A negative amount is added to the debit total, so the debit total goes more negative,
which matches the legacy sign convention. Zero counts as a credit (`≥ 0`).

## Rejects (BR-06 .. BR-08)

**A14. A reject record = the daily record's transaction fields + `reason` + `reason_desc`.**
BR-06 says rejects carry "the original 350-byte image + 4-digit reason + 76-character description", and CONTRACT.md
says "transaction fields + reason (int) + reason_desc". Because the image is the original record, `proc_ts` in a
reject is the feed's own DALYTRAN-PROC-TS, not "now". `reason_desc` is the BR text without its padding to 76 chars
(CONTRACT: strings may omit trailing spaces). The trailer layout is a wiki TODO (DT-12); the texts are taken from
BR-01..BR-04.

**A15. Reason 109 is never produced.**
BR-08: 109 = account rewrite failure, which "aborts the record and is not written to rejects". Here the account
update is in memory and cannot fail. 109 is listed in the `RejectReasonCode` enumeration only.

**A16. Run status WARNING / return code 4 when any reject exists, otherwise COMPLETED / 0.**
BR-07 and AC scenario 8. This is reported in the workflow's `runSummary` and in the extra file
`posttran_run_summary.json`, which is not a contract output. The wiki does not name the no-reject state, so COMPLETED
is my choice.

## Idempotency / restart (BR-09, AC scenario 10)

**A17. A daily record whose `transactionId` was already posted earlier in the same run is skipped: not posted again, not rejected.**
BR-09: "each record is idempotent via `transactionId`". It is counted as `duplicatesSkipped` in the summary, so
read = posted + rejected + duplicatesSkipped. AC's "read = posted + rejected" check holds whenever the feed has no
duplicate ids. The wiki does not cover a duplicate id inside one feed. Only an id that was *posted* blocks a later
record; a rejected id does not.

**A18. Restart-from-last-index is not implemented.**
BR-09 / AC scenario 10 leave the restart strategy as a DECISION placeholder. Under the file contract every run starts
from the master files it is given and keeps no state between runs, so a re-run produces the same outputs and nothing
is posted twice.

## Input parsing and output format

**A19. Fixed-width parsing follows the copybook offsets: CVTRA06Y 350, CVACT01Y 300, CVACT03Y 50, CVTRA01Y 50.**
Signed amounts (`S9(n)V99`) are zoned decimal with an implied 2 decimals. The last character may be an overpunch:
`{`/`A`–`I` positive, `}`/`J`–`R` or ASCII `p`–`y` negative. A plain digit, an explicit `+`/`-`, or a decimal
point is also accepted. A blank numeric field reads as 0. Short lines are padded with spaces (trailing spaces may
have been stripped), blank lines are skipped, and both LF and CRLF are accepted. The wiki/CONTRACT only say "layouts
as in the copybooks". The sign encoding of the ASCII files is not stated.

**A20. If a master file repeats a key, the first record wins.**
VSAM KSDS keys are unique (DM, DT-01/DT-04/DT-06 primary keys). The wiki says nothing about duplicate keys in the
input.

**A21. Amounts are output as strings with exactly two decimals (`"-10.00"`). Ints (`acct_id`, `cat_cd`, `merchant_id`, `reason`) are output as JSON numbers. Strings have trailing spaces removed and leading spaces kept.**
CONTRACT.md, Outputs.

**A22. Output order: transactions and rejects in feed order. Accounts in input-file order. Category balances in input-file order, followed by new rows in order of creation.**
CONTRACT.md: "a list of objects, in any order".

**A23. `posttran_acctdata` contains every account in `acctdata.dat`, including untouched ones. `posttran_tcatbal` contains every category balance, existing and created.**
CONTRACT.md: "for every account, after posting" / "for every category balance, after posting".

**A24. `businessDate` and `batchId` are only echoed in the run summary.**
P, Data Mapping lists them as process start data, but no rule uses them. The INTCALC parameter (`2022071800`)
does not apply to this step.
