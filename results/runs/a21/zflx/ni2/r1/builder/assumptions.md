# INTCALC (interest calculation, P-15) — build assumptions

Implementation: FlowX project `cd_a21_ni2_zflx_r1`, workflow `intcalc_batch`
(resourceDefinitionId `<uuid>`).
Wiki = the pages in `intcalc-sonnet-ni2.pdf`. "P-15" = process-interest-calculation, "AC" = its acceptance criteria.

Each entry gives the decision, then what in the wiki it rests on (or what the wiki leaves out).

## Architecture and inputs

1. **One integration workflow instead of the P-15 process plus three data-access workflows.**
   `intcalc_batch` is START → *Parse input files* → *Compute interest (CBACT04C)* → *Build contract outputs* → END.
   The wiki's design has a process sending one message per balance to W-01, W-04 and W-05 over a `carddemo-datastore` NOSQL_DB.
   CONTRACT.md defines this step as files in and JSON files out, with step isolation. Neither the contract nor the step needs a persistent store.
   So the store lookups (accounts, `disclosure_groups`, `card_xrefs`) become in-memory maps over the input files.
   The business rules BR-01..BR-10 are implemented as written.
2. **Files read:** `acctdata.dat` (CVACT01Y), `tcatbal.dat` (CVTRA01Y), `discgrp.dat` (CVTRA02Y) and `cardxref.dat` (CVACT03Y).
   The other contract inputs are for other steps; P-15 integrates only W-01/W-04/W-05.
   Per CONTRACT "step isolation", `acctdata`/`tcatbal` are the post-POSTTRAN files.
3. **Run date.** `interestRunDate` is a workflow input that defaults to `2022071800`. P-15 Data Mapping: "Configuration Parameter default; override at start".
   The business date is its first 8 characters (YYYYMMDD). BR-03: "the date in PARM: 2022071800 → 2022-07-18".
   The trailing `00` is used only as part of the transaction-id prefix (BR-05). The wiki gives it no other meaning.
4. **Layouts.** Field positions follow the copybooks named in CONTRACT.md (DT-01, DT-06, DT-07, DT-04 attribute lists).
   Signed fields (`S9(n)V99`) accept trailing-overpunch zoned decimals (`{A-I` positive, `}J-R` negative). DT-07: "0150{ = 15.00".
   They also accept ASCII-style `p-y` negatives, an explicit `+`/`-` sign and an explicit decimal point.
   An unparseable amount fails the run instead of being guessed.
   Blank lines are ignored. Lines shorter than the record are space-padded.

## Business rules

5. **Processing order = TCATBAL key order.** Balances are sorted by account id + type + category before processing (DT-06 composite key).
   P-15 calls the step "for each account/type/category balance". The legacy store is a KSDS read sequentially.
   The order matters because it fixes the transaction-id suffixes.
6. **Rate lookup (BR-01/BR-02).** The key is the account `groupId` (trailing spaces ignored) + 2-char type code + numeric category code.
   When no row matches, the `DEFAULT` group with the same type and category is used.
   If the key appears twice in discgrp, the first row wins (DT-07 keyed store, which allows no duplicate keys).
7. **No DEFAULT row either.** That balance earns no interest and is listed in the run report under `missingRates`; the run continues.
   The wiki covers only the DEFAULT fallback (W-05 Error Handling). It does not say what happens when DEFAULT is missing.
8. **Ten-year rule (BR-03).**
   - "On or before the same calendar date ten years before the run date" is inclusive: run 2022-07-18 → cutoff 2012-07-18.
     So AC 8 (2010-02-13) is reduced and AC 9 (2012-07-19) is not; 2012-07-18 itself is reduced.
   - For a 29 February run date the cutoff is compared numerically (YYYYMMDD), so an account opened 28 February of the earlier year counts.
   - An open date that is not 8 digits after stripping separators counts as not long-standing. The wiki does not cover bad dates.
   - The 2.00 reduction also applies to a rate that came from the `DEFAULT` fallback. BR-03 says "the disclosure-group rate", with no exception.
   - "Never below 0.00" clamps the *reduced* rate. A negative group rate on an account that is not long-standing is used unchanged.
     The clamp is worded as part of the reduction clause.
9. **"If the effective rate ≠ 0" (BR-03).** The test uses the effective rate, after the reduction.
   A long-standing account whose group rate is ≤ 2.00 therefore gets no transaction.
10. **Zero balance with a non-zero rate.** A `0.00` interest transaction is still written.
    The only condition in BR-03/BR-04 is the rate; nothing tests the balance.
11. **Rounding (BR-08 TODO).** Interest = balance × effective rate / 1200 is computed exactly in integer hundredths.
    It is then **truncated toward zero** to 2 decimals (COBOL `COMPUTE` without `ROUNDED`). BR-08 states truncation; its TODO asks for a golden-file test.
    AC 8 (10.8333 → 10.83) holds under either mode. Negative balances differ (e.g. −100.10 × 25 / 1200 → −2.08, not −2.09).
12. **No field-size overflow.** The legacy PIC sizes (S9(9)V99 interest, S9(10)V99 balance) are not enforced, so high-order digits are never dropped.
    The wiki types these as "Number (2 dec)".
13. **Fees (BR-07, AC 7).** None are charged. The AC 7 `{{DECISION}}` is resolved as "keep the stub".

## Interest transaction (BR-04, BR-05)

14. **Transaction id** = the 10-character PARM + a 6-digit zero-padded running suffix: `2022071800000001`, `…000002`, …
    It counts interest transactions only, across the whole run, starting at 1.
    DT-05 makes `transactionId` String(16), and 16 − 10 = 6 digits. BR-05 says "running suffix" without a width or start value.
15. **Description:** `Int. for a/c ` + the 11-digit zero-padded account id (DT-01 `accountId` String(11) numeric).
16. **Card number.** Taken from `cardxref` by account id (DT-04 secondary index on `accountId`). If the account has several cards, the lowest card number is used.
    With no cross-reference the field is blank and the account is listed in `missingXref`.
    BR-04 does not name the card. DT-05 makes `cardNumber` required.
17. **Merchant fields:** `merchant_id` 0, name/city/zip blank. BR-04 lists no merchant data, and a system transaction has no merchant.
18. **Timestamps.** `orig_ts` = `proc_ts` = the run time in DB2 form `YYYY-MM-DD-HH.MM.SS.ff0000` (26 chars, DT-05 X(26)).
    A `runTimestamp` input can override it. The wiki does not say what timestamp an interest transaction carries.
19. **Overwrite vs append (BR-09).** `intcalc_systran.json` holds exactly the interest transactions written by this run.

## Account update (BR-06)

20. **Every account with at least one category balance is updated once.** That includes the last account in key order.
    The update sets `currentBalance += totalInterest` and `currentCycleCredit = currentCycleDebit = 0`.
    It happens even when the total interest is 0 (ZEROAPR, a clamped rate).
    Basis: the P-15 Purpose ("updates the account balance, resetting cycle credit/debit totals"), the flow diagram ("Account done?" → Update account) and AC 3.
    BR-06 says "**at each change of account**". Read literally, that could leave out the final account, which is never followed by a change.
    The wiki's flow and purpose describe an update per account, so that reading was not used. This is flagged.
21. **Accounts with no category balance** are not touched (cycle totals kept). They still appear in `intcalc_acctdata.json` (CONTRACT: "every account").
22. **Category balances are not reset or written.** The wiki does not ask for it, and the contract has no tcatbal output for this step.
23. **A balance for an account missing from acctdata** is skipped and listed in `missingAccounts`. The wiki is silent on this.
24. **`batchWindowOpen` / RuntimeSwitches** (AC Configuration Dependencies) is not checked. The window belongs to the end-of-day chain (P-19), not to this step run on its own.

## Output format (CONTRACT.md)

25. Amounts are JSON strings with exactly two decimals (`"-139.42"`). `acct_id`, `cat_cd` and `merchant_id` are integers. `type_cd` is the string `"01"`.
    Other strings have trailing spaces removed. Accounts are written in input-file order, transactions in processing order.
