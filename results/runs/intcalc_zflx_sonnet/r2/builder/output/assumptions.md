# INTCALC (interest calculation) — assumptions and decisions

Each entry: what was decided, and the wiki statement (or gap) it rests on. Wiki page abbreviations:
**P-15** = `process-interest-calculation.md`, **AC** = `acceptance-criteria-interest-calculation.md`,
**DM** = `project-data-model.md`, **W-01/W-04/W-05** = account/transaction/reference data-access
workflows, **P-19** = `process-end-of-day-batch-chain.md`, **CONTRACT** = `CONTRACT.md`.

## Architecture

**A1. One integration workflow, no persistence layer.** The step is built as the DEFAULT workflow
`intcalc_interest_calculation` (Start → Parse input files → Lookup rate and compute interest →
Write interest transactions → Update accounts → End), not as the P-15 process that calls
W-01/W-04/W-05 over a `carddemo-datastore` NOSQL_DB through message events.
*Basis:* CONTRACT supplies every input as a file per run and wants every output as a file. Under
"Step isolation", the account and category-balance inputs come from the oracle's POSTTRAN outputs,
so the FlowX store would hold nothing the run can use. AC: "UI Flow: none (batch)". The P-15
SEND/RECEIVE steps map one-to-one onto nodes: `LIST_BALANCES_BY_ACCOUNT` → parse and sort balances;
`GET_DISCLOSURE_RATE {rate, usedFallback}` → lookup node (it records `groupIdUsed`/`usedFallback`);
`WRITE_INTEREST_TRANSACTION` → write node; `UPDATE_ACCOUNT_AFTER_INTEREST {accountId, totalInterest}`
→ update node. The W-01 retry/version-conflict and W-05 timeout handling have no counterpart because
there is no store call.

**A2. `interestRunDate` is a required workflow input, not a Configuration Parameter.** P-15 says
"Configuration Parameter default; override at start". This build always passes it at start. The
runner defaults it to `2022071800`, the INTCALC parameter in CONTRACT. The workflow fails fast when
it is empty.

**A3. `batchId` is not used.** P-15 lists it as process start data but gives it no role in any rule
of this step.

**A4. `RuntimeSwitches.batchWindowOpen` is not checked.** AC lists it as a configuration
dependency. P-19 makes opening and closing the window the orchestrator's job (the "Open/Close Batch
Window" service tasks), not this step's.

## Reading the inputs

**A5. Only TCATBAL, ACCTDAT, DISCGRP and CARDXREF are read.** P-15's legacy source lists the
copybooks CVTRA01Y, CVTRA02Y, CVACT01Y, CVACT03Y and CVTRA05Y. CVTRA05Y is the output layout. The
other CONTRACT inputs (dailytran, custdata, carddata, trantype, trancatg) feed other steps.

**A6. Signed amounts use zoned-decimal overpunch.** DM DT-07 documents the rate as "signed
overpunch (`0150{` = 15.00)". The wiki says nothing about how the other `S9(n)V99` fields
(TRAN-CAT-BAL, ACCT-CURR-BAL, ...) are encoded, so they are assumed to be encoded the same way. The
parser accepts the EBCDIC-style overpunch (`{A–I` positive, `}J–R` negative), the ASCII/GnuCOBOL
negative overpunch (`p–y`), an explicit `+`/`-` sign, and text with a decimal point. Any other
content stops the run with an error rather than being guessed.

**A7. Record lines.** CONTRACT: "one record per line, fixed width". Lines shorter than the record
length are padded with spaces (trailing FILLER may be stripped). Blank lines are ignored.

**A8. Keys.** Account ids are matched numerically (leading zeros ignored), since DM types them as
"String(11) numeric". Disclosure group ids are matched exactly after trimming trailing spaces. Type
codes are matched exactly. Category codes are matched numerically (`9(4)`). If a key repeats, the
first record wins (DM: accountId and groupId+type+category are primary keys, so a repeat should not
occur).

## Interest calculation (BR-01 … BR-03, BR-08, BR-10)

**A9. Processing order is TCATBAL key order (accountId, typeCode, categoryCode).** P-15:
"balances[] grouped per account". DM DT-06: composite key `accountId + typeCode + categoryCode`;
legacy reads that KSDS sequentially. Input records are sorted by that key (a stable sort, so ties
keep their file order) before processing. The order decides the transaction-id suffixes.

**A10. Rounding is truncation toward zero to 2 decimals.** BR-08: "Rounding follows COBOL `COMPUTE`
default truncation; {{TODO: confirm rounding mode}}". AC: "verify interest rounding to two
decimals". The calculation `(balance × rate) / 1200` uses exact integer arithmetic (cents ×
hundredths, BigInt beyond 2^53) and drops everything below the cent. A negative balance gives
negative interest, truncated toward zero (−2.25825 → −2.25). The wiki says nothing about negative
balances; the formula is applied as written.

**A11. DEFAULT fallback.** BR-02 / AC 4: when no `groupId + type + category` row exists, the
`DEFAULT` row with the same type and category is used. The wiki is silent on what happens when the
DEFAULT row is missing too; the rate is then taken as 0 (no interest) and a run warning is recorded.

**A12. Zero rate means no transaction.** BR-03 ("If rate ≠ 0"), BR-10 (payment/credit categories
have rate 0), AC 5 (`ZEROAPR` → no interest transaction).

**A13. A transaction is written whenever the rate is ≠ 0, even when the truncated amount is 0.00.**
BR-03 gates on the rate, not the amount, and AC 2 says "created per category balance". The wiki
gives no rule for suppressing zero amounts.

**A14. Fees are not computed.** BR-07: "an empty stub — no fees charged". AC 7 leaves
"implement fees or keep stub" open; this build keeps the stub.

## Interest transaction (BR-04, BR-05, BR-09)

**A15. Transaction id = PARM (10 characters) + 6-digit zero-padded suffix.** BR-05 says "run date
prefix (PARM, e.g. 2022071800) + running suffix" without a suffix width. DM DT-05 makes
`transactionId` String(16), which leaves 6 digits after the 10-character PARM. The suffix runs
across the whole run, starts at 000001, and counts only transactions written (A12). For example:
`2022071800000001`.

**A16. Fixed values.** BR-04: type `01`, category `05` (output `cat_cd` 5), source `System` (case
as written in BR-04), description `Int. for a/c ` followed by the account id. The id is written as
the 11-digit zero-padded value, because DM DT-01 types `accountId` as "String(11) numeric".

**A17. Merchant fields.** BR-04 and the wiki say nothing about them for a system transaction:
`merchant_id` = 0, and name, city and zip are blank.

**A18. Card number = the first CARDXREF record with the account's id.** The wiki does not say which
card a system transaction carries. DM DT-05 requires `cardNumber` (FK to Card), and DT-04 gives
CardXref a secondary index on `accountId`. If no xref exists, the card number is blank and a run
warning is recorded (the wiki has no error rule for this).

**A19. Timestamps.** The wiki does not say what goes in TRAN-ORIG-TS / TRAN-PROC-TS (DM: DateTime,
legacy X(26)). Both are set to the processing time (UTC) in DB2 timestamp format
`YYYY-MM-DD-HH.MM.SS.ffffff`. They are run-dependent and will not equal another run's values.

**A20. The output holds only this run's transactions.** BR-09: legacy overwrites the transaction
output, FlowX appends. `intcalc_systran.json` contains "every interest transaction written" by this
run (CONTRACT), so earlier transactions are not included.

## Account update (BR-06)

**A21. Every account that has at least one category balance is updated once.** The update adds the
total interest to `currentBalance` and sets cycle credit and cycle debit to 0. This includes
accounts whose total interest is 0 (e.g. all categories at rate 0, `ZEROAPR`) and the **last
account in the file**. BR-06 says "At each change of account"; the P-15 Purpose says it "updates the
account balance, resetting cycle credit/debit totals" for each account it processes. A literal
reading of "change of account" could exclude the final account, but the wiki gives no reason to
treat that account differently, so it is updated like the rest.

**A22. Accounts with no category balances are not touched,** and are still written to
`intcalc_acctdata.json` (CONTRACT: "every account, after interest") with their input values.

**A23. Balances found for an account that is missing from ACCTDAT are skipped** (no transaction, no
update) and a run warning is recorded. The wiki is silent on this case.

**A24. No overflow emulation.** Results that would exceed `S9(10)V99` (account) or `S9(9)V99`
(transaction) are not truncated the way a COBOL MOVE would truncate them. The wiki is silent on
overflow.

## Output format

**A25.** Amounts are written as strings with exactly two decimals, `acct_id`, `cat_cd` and
`merchant_id` as integers, and strings with trailing spaces removed — all within what CONTRACT
allows. Accounts keep their input order. Transactions are in transaction-id order.
