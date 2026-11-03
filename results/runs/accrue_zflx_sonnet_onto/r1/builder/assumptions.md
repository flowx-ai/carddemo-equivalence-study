# ACCRUE (interest-calculation, P-15) — assumptions

Decisions taken where the wiki pages (process-interest-calculation, acceptance-criteria-interest-calculation,
project-data-model, the three data-access workflows, end-of-day-batch-chain), ONTOLOGY.md and CONTRACT.md are
uncertain, incomplete or silent. Each entry gives the decision and the statement (or gap) it rests on.
Uncertainties that can change an output value are also listed in `flags.json`.

## Architecture

1. **A single stateless integration workflow, not the P-15 process plus datastore.** The wiki designs P-15 as a
   process that sends LIST_BALANCES_BY_ACCOUNT / GET_DISCLOSURE_RATE / WRITE_INTEREST_TRANSACTION /
   UPDATE_ACCOUNT_AFTER_INTEREST messages to integration workflows on the `ledgerline-datastore` NOSQL_DB
   (project-data-model DECISION; workflow-account/reference/transaction-data-access). CONTRACT.md is
   file-in/file-out per run and supplies no store. So `accrue_interest_calculation` takes the input files as
   strings and returns both outputs. Its three SCRIPT nodes match those operations: Parse = list balances,
   Accrue = rate lookup with fallback, write transaction and update account, Format = outputs.
   Swapping the parse and format steps for DATA_SOURCE nodes would not change the arithmetic.
2. **interestRunDate is an optional START input, defaulting to `2022071800`.** BR-05 says it is a Configuration
   Parameter with an override at start. CONTRACT.md gives the ACCRUE parameter as `2022071800`. A START input
   with an in-script default does the same thing without adding a project config parameter. The business date
   (2022-07-18) is not used by this step, because the wiki uses only PARM.
3. **Step isolation inputs.** CONTRACT.md: ACCRUE "receives the oracle's POSTDAY outputs as its account and
   category-balance inputs". The runner reads `ledgacc.dat` / `balcat.dat`. If those are absent it reads
   `postday_ledgacc.json` / `postday_balcat.json` (the workflow detects JSON by a leading `[`).
   `clntrec`, `crdrec`, `txntype`, `txncatg` and `daytxn` are not read; the wiki names no use for them in ACCRUE.
4. **`RuntimeSwitches.batchWindowOpen` is ignored.** The acceptance criteria list it as a dependency, but no rule
   ties it to ACCRUE's output, and the batch chain opens and closes the window outside this step.

## Record layouts

5. **Field offsets.** The wiki gives field order and PIC sizes but no offsets. The decision: fields are contiguous
   from column 1 in the listed order, with FILLER last.
   - Account (LXV022Y, 300): id 1-11, status 12, curr_bal 13-24, credit_limit 25-36, cash_credit_limit 37-48,
     open 49-58, expiry 59-68, reissue 69-78, cyc_credit 79-90, cyc_debit 91-102, zip 103-112, group 113-122,
     FILLER 178. DT-01 confirms FILLER 178 (122+178 = 300).
   - CardXref (LXV024Y, 50): card 1-16, customer 17-25, account 26-36, FILLER 14 (ontology CRD-LINK-RECORD).
   - Category balance (LXV026Y, 50): acct 1-11, type 12-13, cat 14-17, bal S9(9)V99 18-28, FILLER 22.
     The FILLER size is inferred from 50 − 28.
   - Disclosure group (LXV027Y, 50): group 1-10, type 11-12, cat 13-16, rate S9(4)V99 17-22, FILLER 28
     (ontology Disclosure Group Record).
6. **Signed numbers use a trailing zoned overpunch** (`{`/A-I positive, `}`/J-R negative) for every S9 field.
   The wiki states this only for the rate ("`0150{` = 15.00", DT-07 and the acceptance criteria). It is applied to
   balances and amounts too, because they share the copybook convention. ASCII-style negative overpunch (`p`-`y`)
   and explicit `+`/`-` signs are also accepted. The wiki example `0150{` has 5 characters, but S9(4)V99 is 6;
   the field is read as 6 characters with 2 implied decimals.
7. **Short or space-trimmed lines are right-padded** to the record length, and blank lines are skipped.
   CONTRACT.md says "one record per line".

## Business rules

8. **Rounding: truncate toward zero to cents (BR-08).** BR-08 is a TODO between truncation and ROUNDED. The
   legacy statement is a plain COMPUTE (BR-08 "COBOL COMPUTE default truncation"; ontology WS-MONTHLY-INT), so
   truncation is implemented with exact integer arithmetic: `bal_cents × rate_hundredths / 120000`.
   The acceptance criterion "verify interest rounding to two decimals" is read as "two decimals", not as
   ROUNDED. Flagged as R-INT-TRUNC.
9. **Rate lookup key and fallback (BR-01, BR-02, reference-data-access).** Key = account group (trimmed) + type
   code (exact 2 characters) + category code (compared numerically, from 9(4)). Lookup is first by the account's
   group, then by `STANDARD` when that row is missing.
10. **Rate missing for both the group and STANDARD.** The wiki is silent. Legacy abends: the ontology shows
    1200-A-GET-STANDARD-INT-RATE performing 9999-ABEND-PROGRAM on a non-00 status. The decision: post no
    interest for that balance, keep processing, and list it in `run_log.json` (`missingRate`). Flagged.
11. **"rate ≠ 0" is the only condition (BR-03, BR-10).** A transaction is written for every balance with a
    non-zero rate. This includes a zero balance (amount 0.00) and a negative balance (negative interest,
    truncated toward zero). The wiki does not mention negative balances; this is how the legacy formula behaves.
12. **Order of processing.** Balances are processed in ascending key order (account, type, category). The ontology
    shows BALCAT-FILE as INDEXED with sequential access on FD-TXN-CAT-KEY, and the wiki says "grouped per
    account". This order also decides which transaction gets which id suffix.
13. **Transaction id (BR-05).** The id is the 10-character PARM followed by a 6-digit suffix. The suffix starts at
    000001 and increases per transaction written in this run (ontology TXN-ID = PARM-DATE + WS-TRANID-SUFFIX).
    The width of 6 is inferred from TXN-ID X(16) − 10. The transaction-data-access "sequence" replaces the
    suffix only for online inserts, so this batch keeps the legacy run-local suffix.
14. **Transaction content (BR-04, ontology TXN-*).**
    - type `07`, category 12, source `Batch`.
    - desc = `Accrued int ` + the 11-digit, zero-padded account id.
    - merchant_id 0; merchant name, city and zip blank. DT-05 marks these fields required, but the ontology says
      ACCRUE sets them to 0 or spaces.
15. **card_num.** The card comes from cardlink by the account alternate key. When an account has several cards,
    the lowest card number is used. The wiki is silent; the ontology shows only that LINK-FILE is read by the
    alternate key FD-LINK-LACC-ID, and an alternate-index read returns duplicates in primary-key order.
    An account with no card gets an empty card_num. Flagged.
16. **orig_ts and proc_ts.** Both are the system clock at write time in DB2 format `YYYY-MM-DD-HH.MM.SS.hh0000`
    (ontology DB2 Timestamp Format, from FUNCTION CURRENT-DATE). The separator layout is inferred from its
    3 dashes and 3 dots plus the remaining digits. The FlowX runtime clock is UTC. The values cannot be
    reproduced against the oracle run. Flagged.
17. **Account rewrite (BR-06).** When the account changes, and at end of file for the last account:
    curr_bal += the sum of that account's interest, and cyc_credit and cyc_debit are set to 0 (ontology
    WS-FIRST-TIME, WS-LAST-LACC-NUM, 1050-UPDATE-ACCOUNT).
    - An account whose balances all have rate 0 is still rewritten, so its cycle totals are reset.
    - An account with no category balance is not touched.
18. **Balance for an account missing from ledgacc.** The wiki is silent, and legacy would fail the rewrite. The
    decision: skip that account's balances, write no transactions for them, and list the account in
    `run_log.json` (`missingAccount`). Flagged.
19. **Duplicate keys** in rategrp or ledgacc are impossible in a KSDS. If they occur, the first record wins.
20. **Fees (BR-07, AC-7).** 1400-COMPUTE-FEES is an empty stub and the AC-7 DECISION is still open. No fee is
    computed or posted.
21. **Overflow.** Overflow of S9(10)V99 or S9(9)V99 is not modelled; the wiki is silent.

## Outputs (CONTRACT.md)

22. `accrue_ledgacc.json` lists every account from the ledgacc input, in input order, after interest.
    `accrue_systxn.json` lists only the transactions written by this run. BR-09 (legacy overwrites, FlowX
    appends) does not change the per-run output.
23. Amounts are strings with exactly two decimals (`"-1.50"`). `acct_id`, `cat_cd` and `merchant_id` are JSON
    integers. Other strings are right-trimmed (CONTRACT: "Strings may omit trailing spaces").
24. `run_log.json` is extra (counts, STANDARD fallbacks, zero-rate balances, missing accounts and rates). It is not
    part of the contract.
