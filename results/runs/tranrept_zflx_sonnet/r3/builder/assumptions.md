# Assumptions: daily transaction report (TRANREPT / CBTRN03C, P-18)

Each entry says what was decided and the wiki statement (or gap) it rests on.
"Wiki" means the attached pages; "contract" means CONTRACT.md and its layer 1 supplement.

## Scope and shape

**A-01: One integration workflow, with file contents as inputs.**
The step is the FlowX workflow `tranrept_daily_transaction_report`:
START → Select Transactions In Range Sorted By Card → Lookup Account Type And Category Names → Build Report Lines And Totals → END.
The workflow receives the contents of `transact.dat`, `cardxref.dat`, `trantype.dat` and `trancatg.dat` as strings. It does not read the `carddemo-datastore` NOSQL_DB collections.
*Basis:* the contract says the input files are "given per run", in fixed-width copybook layout. The wiki's data access goes through `transaction-data-access` (QUERY_BY_DATE_RANGE) and `reference-data-access` (GET_TYPE_DESCRIPTION) on a datastore. The contract supplies no datastore, so those two operations are done in-memory by the first two script nodes, which are named after them.

**A-02: The BPMN process, document plugin and notification are not built.**
The P-18 process wrapper is not built. Neither is the `report-request` trigger, the Document Plugin PDF/CSV rendering, or the "report ready" notification (AC 6, FI-08).
*Basis:* the contract's only output for this step is `tranrept_report.txt` (133-column lines). The wiki's own template name is inconsistent: `transaction-report` in process-transaction-report, `TransactionReportTemplate` in the acceptance criteria. The wiki also marks the plugin layout as "Redesigned", but the contract fixes the legacy print layout.

**A-03: Output form.**
`tranrept_report` is a list of strings, one per printed line, in print order. The contract allows this instead of a file. The workflow also returns:
- `lineCount`: number of detail lines.
- `grandTotal`: a decimal string.
- `errors`: lookup problems (see A-10).

`reportDocumentRef` is not produced.
*Basis:* process-transaction-report Data Mapping ("Output: reportDocumentRef, lineCount, grandTotal") and the contract's alternative output form. There is no document, so there is no reference.

## Selection and order

**A-04: Date range source and default.**
`startDate` and `endDate` (YYYY-MM-DD) are optional workflow inputs. When absent, they default to 2022-01-01 and 2022-07-06. Values that are not YYYY-MM-DD fail the run.
*Basis:* BR-05 gives those defaults and calls them Configuration Parameters `reportStartDate` / `reportEndDate` "per-run override". The project has no such configuration parameters, so the defaults are constants in the first script node. The contract's run parameters (2022-07-01 / 2022-07-31) are passed as inputs. Date validation belongs to `report-request` (BR-04 there), so this step only rejects malformed values and does not re-validate calendar dates.

**A-05: Date filter.**
A transaction is selected when the first 10 characters of TRAN-PROC-TS (positions 305–314) fall between start and end inclusive, compared as text.
*Basis:* BR-01, "Filter on processedTimestamp between start and end date inclusive (SORT INCLUDE on proc date)". The wiki does not say how a timestamp compares with a date. Comparing the date part as text is what an INCLUDE on the date portion does. The original timestamp is not used.

**A-06: Sort order and ties.**
Ascending by TRAN-CARD-NUM, compared as 16-character text. Transactions with the same card keep their order in `transact.dat`.
*Basis:* BR-02 says only "Sorted by card number". It is silent on ties, so a stable sort is used. The combined file is in transaction-id order, so ties come out by transaction id.

## Lookups

**A-07: Account ID comes from CardXref.**
The detail line's account ID is XREF-ACCT-ID, found by the transaction's card number in `cardxref.dat`.
*Basis:* acceptance criteria, Data Mapping Verification: "Transaction + CardXref + TransactionType + TransactionCategory → report lines". The plugin's detail line has "account id", and the Transaction record carries no account ID.

**A-08: Type and category descriptions.**
- The type description is looked up by TRAN-TYPE-CD.
- The category description is looked up by TRAN-TYPE-CD + TRAN-CAT-CD. The category code is compared as a number (9(4)), so `1` and `0001` match.
- On the line, the type description is cut to 15 characters and the category description to 29.

*Basis:* BR-03, AC 3 ("Names from reference data, not codes") and the DT-09 composite key. The truncation widths come from the contract's detail layout (X(15), X(29)).

**A-09: Detail line content.**
Transaction ID, account ID, type code and description, category code and description, source, and amount. The positions are those in the contract.
*Basis:* plugin-transaction-report-document "Detail line" and the contract layout. TRAN-DESC and the merchant fields are not printed; the wiki does not list them.

**A-10: Unknown reference data.**
When a card is missing from `cardxref.dat`, or a type or category is missing from the reference files:
- The run does not stop.
- The missing field prints as blanks on the detail line.
- A message such as `INVALID CARD NUMBER : …` or `INVALID TRANSACTION TYPE : …` is added to `errors`.

*Basis:* AC 5, "Error flagged, run continues {{TODO: confirm legacy abend behaviour}}". The wiki chooses "continue" while noting the legacy program may abend. This build follows the wiki. If the legacy abends, a run with a missing reference would differ from the oracle (the oracle report would stop at that point).

## Totals and pagination

**A-11: Account (card) total is printed only on a card change.**
When the card number changes, an `Account Total` line for the previous card is printed, followed by a rule. No account total is printed for the last card in the report.
*Basis:* BR-04, "card total (on card change)", with the TODO "confirm totals layout in CVTRA07Y / CBTRN03C". The plugin says "break on card number". End of file is not a card change, and the wiki never mentions a closing account total.

**A-12: Page and grand totals.**
- The page total is the sum of the detail amounts printed on that page. It is printed when a page breaks and once at the end of the report, followed by a rule.
- The grand total is the sum of all page totals, which equals the sum of all selected amounts. It is printed last, with no rule after it.
- Amounts are added up in whole cents.

*Basis:* plugin Content ("Page total: sum per page", "Grand total: sum for the report"), AC 2, and the contract note "Each page total and each account total line is followed by a rule".
*Uncertainty:* the public CBTRN03C source, at end of file, adds the last transaction's amount a second time to the page and account totals before printing the final page total. The wiki documents no such behaviour; its statements are "sum per page" and "sum for the report". This build follows the wiki. If the oracle reproduces the legacy end-of-file add, the last `Page Total` and the `Grand Total` lines will differ by the last transaction's amount.

**A-13: Page size and when a page breaks.**
- A page is 20 lines.
- Every line written counts toward the 20: header, blank, column header, rule, detail, account total and page total lines.
- The page-size check is made only before a detail line is printed. When the running line count is a multiple of 20, the page total and its rule are printed, then a new page header, then the detail.
- The first page header is printed before the first detail.

So a page can run past 20 lines when account-total lines push the count past a multiple of 20.
*Basis:* the plugin says "page size {{TODO: lines per page in CBTRN03C}}" and the wiki gives no number. The value 20, and counting all lines, come from CBTRN03C in the public CardDemo source (WS-PAGE-SIZE). The page-start sequence (report header, blank line, column header, rule) is from the contract.

**A-14: Empty date range.**
With no selected transactions the report has three lines: `Page Total` (blank amount), a rule, and `Grand Total` (blank amount). No page header is printed. `lineCount` is 0 and `grandTotal` is "0.00".
*Basis:* AC 4, "No transactions → Report with zero total". The wiki does not say whether a header is printed when there are no details. The header is printed only before the first detail line, as in the legacy program flow. A zero total prints as blanks per A-15.

## Formatting

**A-15: Amount editing.**
- Detail amounts use `-ZZZ,ZZZ,ZZZ.ZZ`: `-` or a space in position 1.
- Totals use `+ZZZ,ZZZ,ZZZ.ZZ`: `+` or `-` in position 1.
- Leading zeros and the commas between them print as spaces. Amounts below 1 print as `.NN`.
- A value of exactly zero prints as 15 spaces, because every digit position is Z (COBOL blank-when-zero for an all-Z picture). This applies to totals that are zero too.

*Basis:* the contract's picture notation. The wiki is silent on how zero prints.

**A-16: Column header "Amount".**
The last column header is `Amount` left-aligned in a 16-character field, after one space.
*Basis:* contract, "one space, Amount padded to 16", read the same way as the other "padded to" headers.

**A-17: Header dates.**
The report header prints the effective start and end dates (after the A-04 defaults), as X(10).
*Basis:* plugin Header, "report title, start date, end date". The plugin also lists "page number", but the contract's header layout has no page-number field, so none is printed.

**A-18: Line width.**
Every line is padded with spaces to 133 characters, and the blank line is 133 spaces.
*Basis:* BR-06 "Report width 133 columns" and the contract line length. The contract allows trailing spaces to be dropped; they are kept.

## Input reading

**A-19: Reading the fixed-width files.**
- Lines may end with LF or CRLF.
- Empty lines are skipped.
- Short lines (trailing spaces removed) are padded back to the record length.
- TRAN-AMT S9(9)V99 is read as 11 zoned digits with implied 2 decimals. Accepted sign encodings:
  - Trailing overpunch: `{`, `A`–`I` positive; `}`, `J`–`R` negative.
  - GnuCOBOL ASCII negative digits `p`–`y`.
  - Plain digits (positive).
  - An explicit sign or decimal point.

*Basis:* the contract says records use the copybook layouts but does not give the sign encoding of the ASCII files. The project data model notes that seed files "store signed overpunch (0150{ = 15.00)". An unreadable amount fails the run instead of being guessed.
