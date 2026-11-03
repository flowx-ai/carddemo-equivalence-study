# Assumptions: daily transaction report (TRANREPT / CBTRN03C, process P-18)

Implementation: FlowX workflow `tranrept_daily_transaction_report` in project `cd_tranrept_zflx_sonnet_r2`
(dev-env, resourceId `<uuid>`, resourceDefinitionId
`<uuid>`). Node scripts are mirrored in `../src/`.

Each entry gives the decision and the wiki statement it rests on, or the gap it fills.

## Architecture and I/O

**A1. One integration workflow, no process or datastore.**
The P-18 steps become three SCRIPT nodes in one DEFAULT workflow: *Select Transactions in Range* →
*Get Type and Category Names* → *Add Report Lines and Totals* → End. File contents come in as INPUT
strings. They are not loaded into the `carddemo-datastore` NOSQL_DB, and no report-request process,
message events or Document Plugin are built.
*Rests on:* CONTRACT says the inputs are files given per run and the output is fixed-width text
lines. The wiki's process diagram, `workflow-transaction-data-access` (QUERY_BY_DATE_RANGE) and
`workflow-reference-data-access` (GET_TYPE_DESCRIPTION) describe where the data lives in a full
migration. The behaviour they describe (select by date, look up names) is kept. The plumbing is not.

**A2. Inputs for this step.**
`transact.dat` (CVTRA05Y, 350), `cardxref.dat` (CVACT03Y, 50), `trantype.dat` (CVTRA03Y, 60) and
`trancatg.dat` (CVTRA04Y, 60), passed as `transactFile`, `cardxrefFile`, `trantypeFile` and
`trancatgFile`.
*Rests on:* the CONTRACT layer 1 supplement, "daily transaction report" rows. Field offsets follow
the copybook layouts: card 263–278 and processed timestamp 305–330 in TRANSACT; account 26–36 in
CXREF; description 3–52 in TRANTYPE; type+category 1–6 and description 7–56 in TRANCATG.

**A3. Output.**
The workflow returns `tranrept_report` (lines joined by `\n`, each padded to 133). It also returns
`lineCount` (number of detail lines), `grandTotal` (plain decimal), `startDate`, `endDate` and
`errors[]`. `reportDocumentRef` is not produced, because there is no Document Plugin (A1). The PDF
and CSV outputs the plugin page mentions are not produced either.
*Rests on:* CONTRACT ("a run may return the same lines as one string … under the file's name
without extension") and the P-18 Data Mapping ("Output: reportDocumentRef, lineCount, grandTotal").

**A4. Date range.**
`startDate` and `endDate` are workflow inputs (YYYY-MM-DD). When either is missing, the BR-05
legacy defaults 2022-01-01 / 2022-07-06 apply. The Configuration Parameters
`reportStartDate` / `reportEndDate` are not created. Per-run values arrive as inputs, which the wiki
calls a "per-run override".
*Rests on:* BR-05, P-18 Data Mapping ("Process start data: startDate, endDate"), and the
acceptance-criteria Legacy Comparison ("Dates: PARM in JCL → process inputs, Same").

## Selection and order

**A5. Date filter.**
A record is kept when `TRAN-PROC-TS(1:10)` is ≥ startDate and ≤ endDate (inclusive string
comparison on the date part). Out-of-range records are skipped and processing continues.
*Rests on:* BR-01 ("Filter on processedTimestamp between start and end date inclusive (SORT INCLUDE
on proc date)"). The wiki does not say whether time of day matters. SORT INCLUDE on a 10-byte
proc *date* means it does not.

**A6. Sort.**
Ascending card number. Records with the same card keep their input-file order.
*Rests on:* BR-02 ("Sorted by card number"). The wiki gives no secondary key and does not say
whether the order of ties is preserved.

## Line content

**A7. Account ID comes from CardXref.**
The detail line's account ID is the account the card maps to in `cardxref.dat`, looked up when the
card number changes.
*Rests on:* the plugin page (detail line has "account id") and Data Mapping Verification
("Transaction + CardXref + TransactionType + TransactionCategory → report lines"). The transaction
record has no account field.

**A8. Descriptions.**
The type description is found by type code. The category description is found by type code +
category code (the DT-09 composite PK). They are truncated to the contract widths: X(15) for type
and X(29) for category. The codes are printed as they appear on the transaction.
*Rests on:* BR-03 and the CONTRACT detail layout.

**A9. Unknown references are flagged and the run continues.**
This covers a card with no xref, an unknown type, and an unknown type+category. The affected field
prints as spaces, a message goes into `errors[]`, and the line is still printed and counted in
every total.
*Rests on:* acceptance scenario 5 ("Error flagged, run continues {{TODO: confirm legacy abend
behaviour}}"). Two things are open. The wiki doesn't say what a line with a missing reference
should show. And the TODO suggests the legacy program may abend instead (see flags.json).

## Totals and pagination

**A10. Account total on card change only.**
The account total line, followed by a rule, is printed when the card number changes, before the
first line of the next card. No account total is printed for the last card: the report ends with
page total, rule and grand total only.
*Rests on:* BR-04 ("card total (on card change)") and the plugin ("break on card number"). End of
file is not a card change. This is uncertain: the plugin's "sum of amounts per account/card" could
be read as covering the last card too. BR-04 itself carries a TODO about the totals layout.

**A11. Page size is 20 lines.**
Every line written counts toward the page: the 4 header lines, each detail line, each account
total + rule (2) and each page total + rule (2). Before each detail line, if the count is a
multiple of 20, the program prints the page total and a rule, then a new page header. The first
page header is printed just before the first detail line.
*Rests on:* the plugin's "page size {{TODO: lines per page in CBTRN03C}}". The wiki gives no
value. 20 is my recollection of CBTRN03C's page size and counter scheme; it does not come from the
wiki. The CONTRACT fixes the page start (header, blank, column header, rule) and the rule after each
page total and account total.

**A12. Page and grand totals are plain sums.**
The page total is the sum of the detail amounts on that page and is reset after printing. The grand
total is the sum of all page totals, which equals the sum of every selected amount.
*Rests on:* plugin ("Page total: sum per page", "Grand total: sum for the report"). I believe
CBTRN03C, at end of file, adds the last record's amount to the final page total a second time. The
wiki doesn't document that, so it is not reproduced (flagged).

**A13. Empty range.**
When no transaction falls in the range, the report has three lines: the page total line, a rule,
and the grand total line. Both amounts are zero, so they print blank (A15). No page header is
printed, because headers are triggered by the first detail line.
*Rests on:* acceptance scenario 4 ("Report with zero total"). The wiki doesn't say whether an empty
report has a header.

**A14. No page number in the header.**
The plugin lists "page number" in the header, but the CONTRACT header layout has no page-number
field. The CONTRACT governs format.

## Formatting

**A15. Edited amounts.**
- Detail lines use `-ZZZ,ZZZ,ZZZ.ZZ` at 98–112. Position 98 is `-` for a negative amount and a space otherwise.
- Totals use `+ZZZ,ZZZ,ZZZ.ZZ` at 98–112, with `+` or `-` in position 98.
- Leading zeros, and the commas among them, print as spaces.
- A non-zero amount always shows its decimal point and two decimals, e.g. `.07`.
- A zero amount prints as 15 spaces, the COBOL rule for an all-Z picture with value zero.
- Amounts above 999,999,999.99 lose their high-order digits.

*Rests on:* the CONTRACT picture notation. The wiki is silent on zero values and overflow.

**A16. Input amount decoding.**
`TRAN-AMT S9(9)V99` is read as zoned decimal with the sign overpunched on the last byte: `{`/`A`–`I`
mean +0..9, and `}`/`J`–`R` mean −0..9. `p`–`y` (ASCII negative zone) is also accepted, as is a
plain signed or decimal-point form.
*Rests on:* the DT-05 type (S9(9)V99) and DT-07 ("seed file stores signed overpunch"). The wiki
doesn't describe TRANSACT's text encoding.

**A17. Line hygiene.**
Every output line is padded to 133 characters, including the blank line. No rule follows the grand
total. On input, blank lines are ignored, CRLF is accepted, and short (right-trimmed) records are
padded to their record length.
*Rests on:* BR-06, CONTRACT ("Each page total and each account total line is followed by a rule";
"Trailing spaces may be omitted").

## Not implemented

**A18. Report-ready notification is not implemented.**
Acceptance scenario 6 (@manual, FI-08) belongs to the online report-request flow and the Document
Plugin, which are out of scope for this batch step (A1).
