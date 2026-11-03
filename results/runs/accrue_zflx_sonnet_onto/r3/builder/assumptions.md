# ACCRUE (interest-calculation, P-15) — assumptions

Each entry: what was decided, and the wiki statement (or gap) it rests on. "Wiki" means the pages in
`accrue-sonnet-onto.pdf`; "ontology" means the ONTOLOGY.md export / the `ledgerline-accrue` ontology in
the FlowX project. Items also declared in `flags.json` are marked **[flag]**.

## Calculation

1. **Rounding: truncation, not ROUNDED. [flag R-INT-TRUNC]**
   `monthlyInterest = (categoryBalance × rate) / 1200` is computed exactly (integer cents × hundredths of a
   percent / 120000) and truncated toward zero to 2 decimals.
   Rests on BR-08 "Rounding follows COBOL `COMPUTE` default truncation" — the same row carries
   *TODO: confirm rounding mode (truncate vs ROUNDED) — golden-file test required*, and the acceptance
   page asks to "verify interest rounding to two decimals". Truncation is what a `COMPUTE` without
   `ROUNDED` into a `V99` field does.
2. **Negative balances give negative interest**, truncated toward zero (e.g. -123.45 at 24.99 % → -2.57).
   Wiki silent; follows from BR-03 applied to a signed `S9(9)V99` balance (DT-06, ontology TXN-CAT-BAL
   "signed numeric").
3. **"rate ≠ 0" is an exact comparison**; any non-zero rate (including negative) produces a transaction.
   BR-03 "If rate ≠ 0"; BR-10 / acceptance scenario 5 (zero rate → no transaction).
4. **Account total interest = sum of the already-truncated per-category amounts** (WS-TOTAL-INT
   accumulates WS-MONTHLY-INT). Ontology WS-TOTAL-INT "Accumulator for total interest amount",
   BR-06 `currentBalance += totalInterest`.
5. **Fees: none.** BR-07 "`1400-COMPUTE-FEES` is an empty stub — no fees charged"; acceptance scenario 7
   leaves *DECISION: implement fees in FlowX or keep stub* open — the stub is kept so the output matches
   legacy.

## Processing order and account update

6. **Category balances are processed in key order (account, type, category)**, whatever order the input
   arrives in. Ontology BALCAT-FILE: INDEXED, access SEQUENTIAL, record key FD-TXN-CAT-KEY; DT-06
   composite key. Needed because the contract's JSON inputs come "in any order".
7. **The account is rewritten only "at each change of account" — the last account in the balance file is
   NOT rewritten. [flag R-LAST-ACCT-NOT-UPDATED]**
   BR-06 says the update happens "At each change of account"; the ontology shows the legacy control
   fields WS-FIRST-TIME / WS-LAST-LACC-NUM and 1050-UPDATE-ACCOUNT, i.e. a control-break loop that
   rewrites the previous account when the account id changes. Nothing in the wiki says the final
   account is rewritten at end of file. Acceptance scenario 3 ("Account current balance increased by
   total interest") reads as if every account is updated, so the two pages conflict; the legacy-faithful
   reading was chosen. The workflow input `applyFinalAccountUpdate: true` switches to updating the last
   account as well.
8. **Accounts that have category balances but earn no interest are still rewritten**: balance unchanged,
   cycle credit/debit reset to 0. BR-06 ties the rewrite to the change of account, not to interest > 0.
9. **Accounts with no category balance are not touched**, but are still written to
   `accrue_ledgacc.json` (the contract asks for "every account, after interest").

## Rate lookup

10. **Key = account.groupId (trailing spaces ignored) + typeCode + categoryCode**; on miss, retry with
    group `STANDARD` and the same type/category. BR-01, BR-02, acceptance scenario 4, W-05
    GET_DISCLOSURE_GROUP. A blank group id simply misses and falls back.
11. **No STANDARD row either → rate 0 (no interest) and an entry in `runSummary.errors`. [flag
    R-STANDARD-MISSING]** Wiki silent. Ontology 1200-A-GET-STANDARD-INT-RATE sets APPL-RESULT "0 or 12
    depending on RATEGRP-STATUS" and performs 9999-ABEND-PROGRAM, so legacy would abend; the batch is
    kept running and the problem reported instead.
12. **Rate field parsed as `S9(4)V99` zoned with trailing overpunch** (DT-07, ontology RG-INT-RATE
    "signed decimal(6,2)"). The wiki's example `0150{` = 15.00 is one character short of the 6-byte field;
    the parser right-trims and reads the implied 2 decimals from the right, so both `0150{` and `00150{`
    give 15.00.

## Interest transaction

13. **Transaction id = interestRunDate (10 chars, `PARM-DATE X(10)`) + 6-digit zero-padded running
    suffix starting at 000001, counted across the whole run**, giving 16 characters (TXN-ID X(16)). BR-05
    "run date prefix (PARM, e.g. 2022071800) + running suffix"; ontology TXN-ID "PARM-DATE and
    WS-TRANID-SUFFIX". The suffix width (6) is inferred from 16 − 10.
14. **Fields:** type `07`, category `12`, source `Batch`, description `Accrued int ` + the 11-digit
    zero-padded account id, amount = the category's monthly interest, merchant id 0, merchant
    name/city/zip blank (written as empty strings — the contract allows trailing spaces to be omitted).
    BR-04; ontology TXN-TYPE-CD '07', TXN-CAT-CD '12', TXN-SOURCE 'Batch', TXN-DESC "'Accrued int '
    concatenated with LACC-ID", TXN-MERCHANT-ID 0, NAME/CITY/ZIP spaces.
15. **card_num = card from the card cross-reference read by account id**. Ontology TXN-CRD-NUM "set to
    LINK-CRD-NUM", LINK-FILE alternate key FD-LINK-LACC-ID. **If an account has several cards, the lowest
    card number is used. [flag R-XREF-DUPLICATE]** Wiki silent; an alternate-index read returns the first
    duplicate, which for an AIX built from the card-ordered base cluster is the lowest card number.
16. **orig_ts = proc_ts = run time in DB2 format `YYYY-MM-DD-HH.MM.SS.hh0000`.** Ontology DB2-FORMAT-TS
    (built from FUNCTION CURRENT-DATE). The value necessarily differs from the oracle's run (flagged as
    output keys in flags.json). The FlowX runtime clock (server time zone) is used.
17. **One transaction per category balance with non-zero rate**, including when the computed interest
    truncates to 0.00. BR-03 conditions the write on the rate, not on the amount; acceptance scenario 2
    "created per category balance".
18. **`accrue_systxn.json` holds only the transactions this run wrote.** BR-09: legacy overwrites the
    transaction output (FlowX would append); the contract asks for "every interest transaction written".

## Error handling

19. **Balance for an account missing from ledgacc → skipped (no interest, no update); account without a
    card xref → card_num blank. Both are reported in `runSummary.errors`. [flag R-MISSING-ACCOUNT-XREF]**
    Wiki silent for the batch; ontology 1100-GET-LACC-DATA / 1110-GET-LINK-DATA set APPL-RESULT 12 and
    abend. Continuing and reporting was preferred to failing the whole run.

## Inputs, parameters, platform

20. **interestRunDate defaults to `2022071800`** when not supplied. Wiki: "interestRunDate (Configuration
    Parameter default; override at start)"; CONTRACT run parameter "ACCRUE parameter 2022071800". It is
    a workflow input with that default rather than a FlowX configuration parameter (no tool here creates
    configuration parameters).
21. **Inputs:** `ledgacc` / `balcat` come from the oracle's POSTDAY outputs when those files are present
    (`postday_ledgacc.json` / `postday_balcat.json`, or the `.txt` fixed-width dumps), else from
    `ledgacc.dat` / `balcat.dat`. CONTRACT "Step isolation". Each workflow input accepts the
    fixed-width text (copybook layout; short lines are space-padded) or a JSON array with the contract
    field names. For `rategrp` JSON (not a contract output) the rate field name `int_rate` is a guess.
    `daytxn.dat`, `clntrec.dat`, `crdrec.dat`, `txntype.dat` and `txncatg.dat` are not read: LXB002C opens
    only BALCAT, LEDGACC, CARDLINK, RATEGRP and the transaction output (ontology LXB002C uses_file
    relations; ACCOUNT-FILE).
22. **Output encoding:** amounts as strings with exactly two decimals; `acct_id`, `cat_cd`,
    `merchant_id` as integers; text fields right-trimmed. CONTRACT "Outputs".
23. **No FlowX persistence or online interaction.** The wiki's target design reads and writes the
    `ledgerline-datastore` NOSQL_DB through the account/reference/transaction data-access workflows
    (W-01/W-04/W-05), driven by process P-15. The build contract is file-in / file-out, so this step is
    one integration workflow (`accrue_interest_calculation`) that receives the files in its INPUT slice
    and returns the outputs in its OUTPUT slice; no datastore, no process, and the `batchWindowOpen`
    switch (end-of-day chain, DECISION/TODO) is not applied. The step logic (BR-01…BR-10) is the same.
24. **Errors don't stop the run** (legacy would abend, see 11 and 19); they are listed in `runSummary`.
