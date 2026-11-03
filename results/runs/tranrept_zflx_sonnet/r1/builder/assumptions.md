# Assumptions: daily transaction report (TRANREPT / CBTRN03C, P-18)

Implementation: FlowX workflow `transaction-report` in project `cd_tranrept_zflx_sonnet_r1`
(resourceId `<uuid>`, resourceDefinitionId `<uuid>`).
Script sources: `flowx/scripts/01_select_transactions.js`, `02_load_reference_data.js`, `03_build_report.js`.

Each entry gives what was decided and which wiki statement (or missing statement) it rests on.
"Wiki" means the attached pages; "contract" means CONTRACT.md and its layer 1 supplement.

## Platform shape

**A-01 One integration workflow, with the files as run inputs.**
The wiki describes a BPMN process that reads `transactions` through `workflow-transaction-data-access`
(QUERY_BY_DATE_RANGE), gets names from `workflow-reference-data-access` (GET_TYPE_DESCRIPTION) and renders
through the Document Plugin (PDF/CSV). The contract instead gives fixed-width files per run and expects
a 133-column text file. I built one DEFAULT workflow whose INPUT slice takes the contents of `transact.dat`,
`cardxref.dat`, `trantype.dat` and `trancatg.dat`, plus `startDate` and `endDate`. Its three SCRIPT nodes
follow the wiki's process-flow stages: *Select Transactions in Range* → *Load Reference Data* (stands in
for the type/category name lookup) → *Add Report Lines and Totals*. The OUTPUT slice returns
`tranrept_report` (the lines joined by `\n`, which the contract accepts), `lineCount`, `detailCount`,
`grandTotal`, `status` and `referenceErrors`.
The following are not built: the NOSQL datastore, the report-request and end-of-day-chain triggers, the
document template and Document Plugin (so there is no `reportDocumentRef`), and the "report ready"
notification (AC #6, tagged @manual).

**A-02 The dates come from the run, not from configuration parameters.**
The wiki names both the process start data `startDate`/`endDate` and the configuration parameters
`reportStartDate`/`reportEndDate` ("per-run override"). The workflow takes `startDate`/`endDate` as input.
It does not read configuration parameters.

**A-03 Default range.**
If no dates are supplied, the range is 2022-01-01 to 2022-07-06 (BR-05). The contract run supplies
2022-07-01 to 2022-07-31.

## Selection and order

**A-04 The date filter uses the date part of the processed timestamp.**
BR-01 says to filter `processedTimestamp` "between start and end date inclusive (SORT INCLUDE on proc date)".
The filter compares characters 305–314 of the record (`TRAN-PROC-TS(1:10)`, YYYY-MM-DD) as strings against
the start and end dates, both inclusive. So every time on the end date is included.
`originalTimestamp` is not used.

**A-05 The sort is stable.**
BR-02 says only "sorted by card number". Records are sorted ascending by the 16-character card number,
compared as characters. Records with the same card keep their input order. The wiki does not say how ties
are ordered.

## Lookups

**A-06 The account ID comes from CardXref.**
The plugin page lists "account id" on each detail line. The acceptance criteria name the join
"Transaction + CardXref + …". The account ID is `XREF-ACCT-ID` (positions 26–36 of `cardxref.dat`),
looked up by card number when the card changes.

**A-07 Lookup keys and truncation.**
- The type description is looked up by the 2-character type code (DT-08 PK).
- The category description is looked up by type code + 4-digit category code (DT-09 composite PK).
- Descriptions are cut to the contract widths: X(15) for type and X(29) for category.
- If a reference file has a duplicate key, the first record wins. The wiki says nothing about duplicates;
  the legacy files are keyed and unique.

**A-08 A missing reference is flagged and the run continues.**
AC #5 says "Error flagged, run continues". Its own `{{TODO: confirm legacy abend behaviour}}` admits the
legacy program may abend instead. I followed the stated criterion:
- The missing field prints as spaces.
- Each miss is listed in `referenceErrors` (transaction ID, which reference, key).
- `status` becomes `COMPLETED_WITH_ERRORS`.

A legacy run with the same data would stop at the first miss.

## Totals and paging (BR-04 is marked `{{TODO: confirm totals layout}}`)

**A-09 The account total breaks on the card number.**
The plugin page says "sum of amounts per account/card (break on card number)" and BR-04 says
"card total (on card change)". The break is therefore on the card number, and the line is labelled
`Account Total` as the contract requires.

**A-10 No account total after the last card.**
BR-04 says the card total is written "on card change". End of file is not a card change, so the last card's
account total is not printed and the report ends with the page total and grand total. The plugin page's
"sum … per account/card" could be read as wanting the last one too, so this is flagged.

**A-11 Page size and what counts as a line.**
The wiki has no number: the plugin page leaves `{{TODO: lines per page in CBTRN03C}}`. I chose:
- Page size of 20 lines.
- Every printed line counts: report header, blank line, column header, rules, details, account totals and
  page totals.
- Before each detail line, if the line count is a multiple of 20, a page total and a rule are printed, then
  a new page header.
- An account total can step the count past a multiple of 20 (19 → 21). The next break then waits for the
  following multiple.

Both choices follow the legacy line-counter convention of CBTRN03C as I understand it. The wiki does not
support them. Flagged.

**A-12 What the page and grand totals hold.**
Page total: the sum of the detail amounts printed since the last page total. It resets after printing and
is added into the grand total. Grand total: the sum of the page totals, which is the sum of every selected
transaction (plugin page: "Grand total: sum for the report").
As I recall CBTRN03C, at end of file it adds the last transaction's amount to the page total a second time
before printing the final page and grand totals. The wiki does not document this and it contradicts
"sum per page" and "sum for the report", so it is **not** reproduced. If the oracle is the unmodified COBOL,
the last page total and the grand total will differ from it by the last selected transaction's amount.
Flagged.

**A-13 End-of-report order.**
At the end, the final page total, a rule, then the grand total. No rule follows the grand total. The
contract says page and account totals are each followed by a rule and says nothing about one after the
grand total.

**A-14 Empty range.**
AC #4 says "Report with zero total". The report then has one page header (contract: "A page starts with the
report header, the blank line, the column header and a rule"), a page total, a rule and a grand total.
Both totals print blank, per A-15.

## Formatting

**A-15 Zero amounts print blank.**
The contract says its pictures work "as in COBOL". Under COBOL editing, `-ZZZ,ZZZ,ZZZ.ZZ` and
`+ZZZ,ZZZ,ZZZ.ZZ` print a zero value as all spaces (sign included), because every digit position is Z.
A non-zero amount under 1.00 prints as `.NN` with its sign in column 1, e.g. `-           .12`.
On a detail line a positive amount has a space for the sign; on a total line it has `+`. Flagged, because
the contract's prose ("leading zeros … printed as spaces") does not cover the zero case explicitly.

**A-16 Overflow.**
Totals over 999,999,999.99 lose their high-order digits, as the 9-integer-digit picture would. The wiki is
silent.

**A-17 Column header.**
`Amount` is left-aligned in its 16-character field (contract: "`Amount` padded to 16").

**A-18 Header dates.**
The start and end dates print in the header exactly as supplied (YYYY-MM-DD), each in 10 positions.

**A-19 Output lines are full width.**
Every output line is padded to 133 characters, the blank line included. The contract allows trailing spaces
to be dropped.

## Input decoding

**A-20 Amount field.**
`TRAN-AMT` S9(9)V99 sits at positions 133–143. It is read as zoned decimal with a trailing overpunch:
`{`/`A`–`I` positive, `}`/`J`–`R` negative, and ASCII `p`–`y` also negative. A separate leading or trailing
sign, or an explicit decimal point, is accepted too. The wiki gives only the picture ("Format -99999999.99"),
not the file encoding.

**A-21 Record handling.**
- Records are split on `\n` and a trailing `\r` is removed.
- Blank lines are ignored.
- Lines shorter than the record length are padded with spaces, so a file with trailing spaces trimmed still
  parses.
- Other fields are taken from the copybook positions: CVTRA05Y, CVACT03Y, CVTRA03Y, CVTRA04Y.
