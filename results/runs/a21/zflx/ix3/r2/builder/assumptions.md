# Assumptions: daily transaction report (TRANREPT / CBTRN03C, P-18)

FlowX implementation: workflow `tranrept_daily_transaction_report` in project `cd_a21_ix3_zflx_r2`.
Output: `tranrept_report` (133-column lines joined by `\n`).

Each entry gives the decision, then the wiki statement it rests on (or the gap it fills).

## Input selection and order

1. **Which date is compared.** The date compared is the first 10 characters of `TRAN-PROC-TS`
   (`YYYY-MM-DD`), as a string, with both ends inclusive. The original timestamp is not used.
   *Wiki:* BR-01 "Filter on `processedTimestamp` between start and end date inclusive (SORT
   INCLUDE on proc date)".

2. **Run parameters.** The run parameters `startDate`/`endDate` take precedence. If either is
   empty, the workflow falls back to 2022-01-01 / 2022-07-06. Those defaults are hard-coded in
   the script because no configuration-parameter store is wired in.
   *Wiki:* BR-05 (the default comes from `PARM-START-DATE`/`PARM-END-DATE`, giving 2022-01-01 ...
   2022-07-06, and maps to `reportStartDate`/`reportEndDate`), plus the "per-run override" in
   Configuration Dependencies. *Contract:* run parameters 2022-07-01 / 2022-07-31.

3. **Sort order.** Records are sorted ascending by card number (as a 16-character string). Records
   with the same card keep their order from `transact.dat` (stable sort).
   *Wiki:* BR-02 "Sorted by card number". The wiki is silent on tie order; a stable sort is
   assumed.

4. **Interest postings.** Records with type `01` and category `0005` are removed before anything
   else happens. They get no detail line and are not added to any page, account or grand total.
   They also do not trigger an account break: a card whose only in-range records are interest
   gets no account-total line.
   *Wiki:* BR-07 and AC-7. The wiki is silent on whether these records take part in card-change
   detection; I chose "removed entirely", which is the reading most consistent with "left out of
   the report".

5. **Blank lines in input files.** Empty or all-blank lines in any input file are ignored. Short
   lines are space-padded to the copybook length.
   *Wiki/contract:* silent; "one record per line, fixed width".

## Lookups (BR-03)

6. **Account ID.** The account ID comes from `cardxref.dat` (`XREF-ACCT-ID`, 11 digits including
   leading zeros), looked up by the transaction's card number.
   *Wiki:* the plugin page lists "account id" in the detail line, and Data Mapping Verification
   lists "Transaction + CardXref + TransactionType + TransactionCategory → report lines".

7. **Type and category descriptions.** The type description is looked up by type code. The
   category description is looked up by the pair (type code, category code). The descriptions are
   truncated to their columns: type X(15), category X(29).
   *Wiki:* BR-03 and DT-09 (composite key). *Contract:* the field widths.

8. **Unknown references.** If the card has no xref, or the type or category code is missing, the
   run does not stop. The error is added to the `errors` output (with `errorCount`), and the
   missing field prints as blanks on the detail line. The amount still counts in the totals.
   *Wiki:* AC-5 "Error flagged, run continues" (it carries a TODO about the legacy abend). I
   followed the stated expected result, not the legacy abend.

## Totals and pagination (BR-04, which carries a TODO on the totals layout)

9. **Page size.** A page holds 20 lines, counted the legacy way:
   - Every written line is counted (headers 4, detail 1, account total plus rule 2, page total
     plus rule 2). The grand-total line is not counted.
   - A page break is checked only just before a detail line, when the line counter is an exact
     multiple of 20. The break writes the page total, its rule, then the four header lines.
   *Wiki:* the plugin page "page size {{TODO: lines per page in CBTRN03C}}". The value 20 and the
   counting scheme are taken from the legacy program the wiki cites (`WS-PAGE-SIZE`).

10. **Account total on card change.** The account total is written when the card number changes,
    after the previous card's last detail line. It is followed by a rule. It is not written
    before the first card.
    *Wiki:* BR-04 "card total (on card change)" and the plugin's "break on card number". *Contract:*
    "Each page total and each account total line is followed by a rule".

11. **No account total for the last card.** At end of file the report writes only the final page
    total (plus rule) and the grand total. There is no account total for the last card, because no
    card change happens.
    *Wiki:* BR-04 says the account total is written "on card change". The wiki is silent on end of
    file; this is the literal reading, and it matches the legacy flow. It is flagged in `flags.json`.

12. **Totals are true sums.** The page total is the sum of the details on that page, and the grand
    total is the sum of all page totals. At end of file the legacy program adds the last
    transaction's amount to the page total a second time; that double count is **not**
    reproduced.
    *Wiki:* plugin page "Page total: sum per page", "Grand total: sum for the report", and AC-2.
    The wiki does not describe the double count, so I followed the documented "sum". This is
    flagged in `flags.json`.

13. **Empty range.** If nothing is selected, the report is: page total line, rule, grand total
    line. No header is written, because headers are written on the first detail line. Both
    amounts are zero, and a zero prints as blanks (see 15).
    *Wiki:* AC-4 "Report with zero total". The layout is the legacy flow, since the wiki gives none.

## Formatting (contract layout)

14. **Fixed lines.** The header shows the effective run dates. The column header puts 8 spaces
    before `Amount` inside its 16-character field, so `Amount` ends in column 112 above the
    amounts. Lines are space-padded to 133 characters.
    *Contract:* "Amount padded to 16" with leading spaces. The exact number of spaces is not legible
    in the contract, so it was taken from CVTRA07Y.

15. **Amount editing.** Amounts follow COBOL edited-picture rules:
    - The sign is fixed in column 98. In the detail picture `-ZZZ,ZZZ,ZZZ.ZZ` it is a space or
      `-`. In the total picture `+ZZZ,ZZZ,ZZZ.ZZ` it is `+` or `-`.
    - Leading zeros and their commas print as spaces. Digits after the decimal point always print
      once the value is non-zero (for example, `.50`).
    - A value of exactly zero prints as 15 spaces, the COBOL rule for all-Z pictures.
    - Values beyond 9 integer digits are truncated at the high-order end.

    *Contract:* picture notation. The zero-value rule is not spelled out there, so standard COBOL
    behaviour is assumed.

16. **Reading `TRAN-AMT`.** `TRAN-AMT` (S9(9)V99, positions 133–143) is read as zoned decimal with
    an overpunched sign: `{A-I` is positive 0–9, `}J-R` is negative 0–9, and `p-y` (GnuCOBOL
    ASCII) is negative. A plain digit or an explicit leading or trailing sign is also accepted.
    Arithmetic is done in integer cents.
    *Wiki:* DT-05 "amount Number (2 dec), S9(9)V99". The encoding is not stated.

17. **Category code column.** The category code prints exactly as it appears in the record
    (4 digits).

## Architecture

18. **No datastore, process or Document Plugin.** The step is a single DEFAULT integration
    workflow: START → Select Transactions in Range → Get Type and Category Names → Add Report Lines
    and Totals → END. Its input is the four fixed-width files passed in as strings. The wiki's
    `carddemo-datastore` NOSQL collections, the P-18 process, its send/receive message pairs and
    the Document Plugin (PDF/CSV) are not built, because the contract supplies flat files per run
    and asks for text lines. The three script nodes follow the wiki's process-flow steps.
    *Wiki:* process flow diagram, plugin page. *Contract:* inputs and outputs.

19. **Extra outputs.** `lineCount` and `grandTotal` are returned as the wiki's process output. The
    wiki's `reportDocumentRef` has no equivalent, because no document is generated. The workflow
    also returns `detailCount`, `excludedInterestCount`, `errorCount` and `errors` for
    traceability.
    *Wiki:* P-18 Data Mapping "Output: reportDocumentRef, lineCount, grandTotal".
