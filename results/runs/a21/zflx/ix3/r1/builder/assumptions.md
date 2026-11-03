# Assumptions — daily transaction report (TRANREPT / CBTRN03C, P-18)

Implementation: FlowX workflow `transaction-report` in project `cd_a21_ix3_zflx_r1`
(resourceId `<uuid>`, resourceDefinitionId `<uuid>`).
Script sources are mirrored in `flowx/scripts/`.

Each entry: what was decided, and the wiki statement (or gap) it rests on.

## Shape of the build

1. **One integration workflow, not the full P-18 process.** START → *Select Transactions in Range* → *Get Account,
   Type and Category Names* → *Add Report Lines and Totals* → END. The nodes follow the P-18 process flow
   (select → enrich → add lines and totals). The MESSAGE_EVENT pairs, the `carddemo-datastore` collections and
   the reference/transaction data-access workflows are not built. Rests on: CONTRACT supplement ("Inputs (given
   per run)": fixed-width files) versus the wiki's "access always goes through an Integration Workflow
   (DATA_SOURCE node on the carddemo-datastore)". The run receives files, not collections, so the files are parsed
   in the workflow.
2. **Inputs are the file contents as strings**: `transact`, `cardxref`, `trantype`, `trancatg` (one record per line),
   plus `startDate` / `endDate`. A list of lines is also accepted. Rests on: CONTRACT (files listed per run). The
   wiki does not say how files reach FlowX.
3. **Output is `tranrept_report`, a list of strings, one per printed line, each padded to 133 columns.** Also returned:
   `lineCount` (number of detail lines), `grandTotal` (decimal string) and `referenceErrors`. Rests on: CONTRACT
   ("a run may return the same lines … as a list of strings, under the file's name without extension"). P-18
   "Output: reportDocumentRef, lineCount, grandTotal".
4. **No document template, PDF/CSV rendering or report-ready notification.** Rests on: the plugin page (PDF and CSV,
   template `transaction-report` / `TransactionReportTemplate`; the two pages give different names) and AC-6 (@manual).
   The contract only asks for the print lines.

## Selection and order

5. **Date range.** `startDate`/`endDate` inputs; when absent, the defaults are `2022-01-01` / `2022-07-06`. `YYYYMMDD` is
   also accepted. Rests on: BR-05 (default range from PARM-START-DATE/PARM-END-DATE → `reportStartDate`,
   `reportEndDate`, "per-run override"). The defaults are hard-coded in the first script, not read from FlowX
   configuration parameters (the analyser flags this literal; it is deliberate).
6. **Filter on the date part of TRAN-PROC-TS (positions 305–314), inclusive at both ends**, as a string comparison
   in `YYYY-MM-DD` form. Rests on: BR-01 ("processedTimestamp between start and end date inclusive (SORT INCLUDE
   on proc date)"). The original timestamp is not used.
7. **Interest postings excluded**: type `01` with category numerically equal to 5. They get no detail line and are
   counted in no page, card or grand total. A card whose only in-range transactions are interest does not appear
   at all, so it gets no account total. Rests on: BR-07, AC-7.
8. **Sort ascending by the 16-character card number. Equal card numbers keep their order in `transact.dat`.**
   Rests on: BR-02 ("Sorted by card number"). The wiki does not give a secondary key.

## Lookups (BR-03)

9. **Account ID** comes from `cardxref.dat` (XREF-ACCT-ID, 11 digits, printed as stored). If a card number appears
   more than once, the first record wins. Rests on: plugin page detail line ("account id") and AC data-mapping
   verification ("Transaction + CardXref + …"). The wiki does not cover duplicates.
10. **Type description** is looked up by type code. **Category description** is looked up by type code plus the
    numeric category code. They are truncated to 15 and 29 characters. Rests on: BR-03 and the CONTRACT layout
    (X(15), X(29)).
11. **Unknown reference (AC-5, `{{TODO: confirm legacy abend behaviour}}`): the run does not abend.** The detail line
    is still printed and counted. The missing description (or account ID, for a card absent from the xref) is left
    blank. Each miss is recorded in `referenceErrors` (`tranId`, `key`, `reason`). Rests on: AC-5 "Error flagged,
    run continues".

## Layout, paging and totals (BR-04, BR-06)

12. **Page size = 20 lines.** Header, blank, column-header, rule, detail and total lines all count. Before each
    detail line, if the running line count is a multiple of 20, a page total + rule and a new page header are
    written. Rests on: the plugin page's `{{TODO: lines per page in CBTRN03C}}`; the wiki is silent. The value and
    the counting rule come from CBTRN03C (WS-PAGE-SIZE 20, MOD check before each detail), not from the wiki. Side
    effect: an account-total pair can step the counter past a multiple of 20, so that page runs longer.
13. **Account total is written only when the card number changes. No account total is written for the last card at
    the end of the report.** Rests on: BR-04 "card total (on card change)". The plugin page says "break on card
    number", which could imply a final break. The BR-04 wording was taken literally. **Highest-risk decision.**
14. **At a card change, the account total + rule is written before the page-break check.** The old card's total
    therefore stays on the old page, and a new card can start a new page right after it. Rests on: wiki silent
    (CBTRN03C order).
15. **Account totals break on card number, not on account ID.** Rests on: BR-04 "card total", plugin "(break on card
    number)".
16. **Page total accumulates across card changes and resets only at a page break. Grand total = sum of all page
    totals = sum of all listed amounts.** At the end, one final page total + rule is written, then the grand total
    line, with no rule after it. Rests on: BR-04 (`{{TODO: confirm totals layout}}`) and the CONTRACT ("Each page
    total and each account total line is followed by a rule"; nothing said for the grand total).
17. **The last transaction's amount is not added a second time at end of file.** CBTRN03C adds the last TRAN-AMT
    to the page and account totals again before the final totals. The wiki does not document this, so it was not
    reproduced.
18. **Empty range: one page is still printed** (header, blank, column header, rule, page total, rule, grand total).
    Rests on: AC-4 "Report with zero total" and the CONTRACT "A page starts with the report header …". The
    legacy program prints headers only when the first detail line is written.
19. **Zero amounts print as spaces.** `-ZZZ,ZZZ,ZZZ.ZZ` and `+ZZZ,ZZZ,ZZZ.ZZ` have Z in every digit position, so a
    zero detail amount and a zero total are blank, sign included. A non-zero amount below 1 prints as e.g. `.05`.
    The `+` picture shows `+` for positive values and `-` for negative ones. The `-` picture shows a space for
    positive values. Rests on: CONTRACT ("Picture notation … as in COBOL"). AC-4's "zero total" is read as this
    blank edited value.
20. **Values beyond 999,999,999.99 lose their high-order digits**, as a COBOL move into the edited field does.
    Rests on: the CONTRACT picture. The wiki is silent.
21. **Header date range shows the effective run dates** as `YYYY-MM-DD` at positions 92–101 and 106–115. Rests on:
    the CONTRACT layout and the plugin page (Header: "start date, end date").
22. **Column-header "Amount" field** = 8 spaces + `Amount`, padded to 16. Rests on: the CONTRACT ("`Amount` padded
    to 16", with leading spaces whose count is not fully clear in the rendering). Eight is the count in CVTRA07Y.
23. **Category code is printed as 4 digits (zero-padded) from TRAN-CAT-CD.** Source is printed as X(10).

## Input parsing

24. **TRAN-AMT (positions 133–143) is read as S9(9)V99 zoned decimal with the sign overpunched on the last digit**
    (`{`/`A`–`I` positive, `}`/`J`–`R` negative). An explicit leading or trailing `+`/`-` and a decimal point are
    also accepted. Rests on: CONTRACT ("layouts as in the copybooks"). The wiki does not describe the ASCII encoding
    of the sign.
25. **Blank lines are skipped and short lines are padded with spaces to the record length** (trailing spaces may
    have been stripped). Rests on: wiki silent. CONTRACT allows trailing spaces to be omitted on output, and the
    same tolerance is applied on input.
