# INTCALC (interest calculation) — assumptions and decisions

Implementation: FlowX project `cd_intcalc_zflx_sonnet_r3`, workflow **`intcalc_interest_calculation`**
(resourceId `<uuid>`, resourceDefinitionId `<uuid>`),
`START → SCRIPT "Calculate interest (CBACT04C)" → END`. The script source is mirrored in `flowx/intcalc_calculate.js`.

Each entry below says what I decided and which wiki statement it rests on, or which statement is missing.
"Wiki" refers to the pages bundled in `intcalc-sonnet.pdf`. P-15 is `process-interest-calculation`, AC is
`acceptance-criteria-interest-calculation`, DM is `project-data-model`, W-01/W-04/W-05 are the data-access workflows.

## Architecture

1. **One stateless workflow, not a process with SEND/RECEIVE to data-access workflows.** P-15 describes a process
   that calls `LIST_BALANCES_BY_ACCOUNT`, `GET_DISCLOSURE_RATE`, `WRITE_INTEREST_TRANSACTION` and
   `UPDATE_ACCOUNT_AFTER_INTEREST` against a `carddemo-datastore` NOSQL_DB (DM decision box). CONTRACT.md defines the
   step as file in, file out per run, with step isolation ("receives the oracle's POSTTRAN outputs as its account and
   category-balance inputs"). Persisting into a shared datastore would add state that leaks between runs. So the
   workflow takes the raw file contents as INPUT and returns the two contract outputs as OUTPUT. The behaviour of the
   datastore operations is implemented inline as functions named after the rules: `lookupRate` is
   W-05 GET_DISCLOSURE_GROUP with DEFAULT fallback, and `updateAccount` is W-01 / BR-06.
2. **Inputs used:** `acctdata.dat`, `tcatbal.dat`, `discgrp.dat` and `cardxref.dat` (see #12 for why cardxref).
   The other contract inputs (dailytran, custdata, carddata, trantype, trancatg) are not read. P-15 cites only
   CVTRA01Y, CVTRA02Y, CVACT01Y, CVACT03Y and CVTRA05Y.
3. **`batchId`, `RuntimeSwitches.batchWindowOpen` and the business date 2022-07-18 are not used.** P-15 lists
   `batchId` as start data but no rule consumes it. `batchWindowOpen` belongs to the batch chain, which is out of
   scope for this step. Only the INTCALC PARM drives this step (BR-05).

## Parsing

4. **Signed numeric fields are zoned decimal with a trailing overpunch sign** (`{`/`A`–`I` positive, `}`/`J`–`R`
   negative), with implied decimals from the copybook PIC. The wiki only states this for the disclosure rate
   ("rate is a signed decimal, e.g. `0150{` = 15.00", AC and DT-07). I applied the same encoding to TRAN-CAT-BAL and
   to the account amounts. A plain leading or trailing `-`/`+` is also accepted.
5. **The disclosure rate is read as 6 characters, S9(4)V99, at offset 16.** The wiki example `0150{` has 5 characters,
   while DT-07 / CVTRA02Y say S9(4)V99, which is 6. I followed the PIC: field positions come from the copybooks named
   in CONTRACT.md.
6. **Matching keys.** Group ids are compared after right-trimming, so a blank account group finds no row and falls
   back to DEFAULT. Type codes are trimmed. Category codes are normalised to 4 digits. BR-01 gives the key fields but
   not the comparison rules.

## Calculation

7. **Rounding: each category's interest is truncated toward zero to 2 decimals.** BR-08 says "COBOL COMPUTE default
   truncation" but carries a TODO ("confirm rounding mode, truncate vs ROUNDED"). I took the stated default and did
   not use ROUNDED. Example: 333.33 × 15 / 1200 = 4.166625 → 4.16. The arithmetic is exact (integer cents ×
   hundredths, using BigInt), so there is no floating-point drift.
8. **Total interest per account is the sum of the truncated per-category amounts.** BR-06 adds "totalInterest". It
   accumulates the same monthlyInterest values that are posted.
9. **"Rate ≠ 0" is the only condition for posting.** BR-03, BR-10 and AC-5 cover this. A zero rate produces no
   transaction, whether it comes from type 02/03, ZEROAPR or a missing row. A negative balance, or a non-zero
   negative rate, still posts a (negative) transaction. The wiki is silent on negative balances.
10. **Missing rate in both the account group and DEFAULT → rate 0, with a warning in `runSummary`.** BR-02 only
    defines the first fallback. The legacy program would most likely abend here, but the wiki is silent. I chose
    not to stop the run.
11. **Fees: none** (BR-07, AC-7 "{{DECISION: implement fees in FlowX or keep stub}}" — kept the stub).

## Interest transaction (intcalc_systran.json)

12. **`card_num` is taken from the first `cardxref.dat` record whose XREF-ACCT-ID equals the account.** BR-04 does
    not mention the card number. However, W-01 lists "CARDXREF alternate-index reads in … CBACT04C", CONTRACT
    supplies `cardxref.dat`, and DT-05 makes `cardNumber` required on a transaction. If no xref exists the field is
    blank and a warning is logged.
13. **`tran_id` = interestRunDate (10 chars) + a 6-digit zero-padded suffix.** The suffix starts at 000001 and
    increments once per interest transaction across the whole run; it is not reset per account. BR-05 says "run date
    prefix + running suffix" and DT-05 says the id is String(16), which leaves 6 digits. The suffix width and its
    start value are not stated.
14. **Processing order is tcatbal key order** (account id, type code, category code), sorted in the workflow. TCATBAL
    is a VSAM KSDS (DM DT-06) read sequentially. The order determines which suffix each transaction gets. The wiki
    does not state the order explicitly.
15. **`desc` = `"Int. for a/c "` + the account id as 11 zero-padded digits** (BR-04 `<accountId>`; DT-01 says
    accountId is String(11) numeric).
16. **`type_cd` = "01", `cat_cd` = 5, `source` = "System"** (BR-04). `merchant_id` = 0 and merchant
    name/city/zip are blank. The wiki is silent on merchant fields for system transactions.
17. **`orig_ts` = `proc_ts` = the run's wall-clock time in DB2 timestamp form** `YYYY-MM-DD-HH.MM.SS.ffffff`
    (26 chars, matching DT-05 X(26)), in UTC. The microseconds are milliseconds followed by `000`. The wiki does not
    say which time to use, so these values cannot match a legacy run byte for byte.
18. **The output holds only the transactions written by this run.** BR-09 notes that legacy overwrites the
    transaction output while FlowX appends. Per CONTRACT, `intcalc_systran.json` is "every interest transaction
    written", so earlier transactions are not repeated.

## Account update (intcalc_acctdata.json)

19. **Every account with at least one tcatbal record is updated:** `currentBalance += totalInterest`,
    `currentCycleCredit = 0`, `currentCycleDebit = 0`. This applies even when total interest is 0, for example
    ZEROAPR. Basis: BR-06 and AC-3.
20. **The last account in tcatbal order is updated too.** BR-06 says "at each change of account". Read literally,
    that could leave out the final account, since no account change follows it, and the wiki does not say whether
    there is an end-of-file update. I followed the intent of AC-3 ("Account current balance increased by total
    interest; cycle credit/debit reset"), which makes no exception. This is flagged in `flags.json`.
21. **Accounts with no tcatbal records are output unchanged.** Their cycle totals are not reset. CONTRACT asks for
    "every account, after interest", and BR-06 only acts on accounts that are processed.
22. **A tcatbal account missing from acctdata is skipped with a warning**, and no transactions are written for it.
    The wiki is silent on this case.
23. **No high-order truncation on overflow** (S9(9)V99 for the monthly interest, S9(10)V99 for the balance). The wiki
    is silent, and real values are far below these limits.

## Output formatting

24. Amounts are JSON strings with exactly two decimals (`"-2.57"`). `acct_id`, `cat_cd` and `merchant_id` are
    integers. Strings are right-trimmed. Account records keep their input order. All of this follows CONTRACT.md.
25. `interestRunDate` is a workflow input that defaults to `2022071800` (the CONTRACT run parameter and BR-05 example).
    I did not create a FlowX Configuration Parameter resource, because this run's PARM is supplied per run.
