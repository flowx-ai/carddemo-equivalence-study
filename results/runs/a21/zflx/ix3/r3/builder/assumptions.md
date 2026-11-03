# TRANREPT (daily transaction report): assumptions

Implementation: FlowX project `cd_a21_ix3_zflx_r3` (dev-env), workflow
`tranrept_daily_transaction_report` (resourceId `<uuid>`,
resourceDefinitionId `<uuid>`):

`Start → SCRIPT "TRANREPT SORT" → SCRIPT "CBTRN03C" → End`

- INPUT: `transact`, `cardxref`, `trantype`, `trancatg` (file contents, one record per line), plus
  `startDate` and `endDate` (YYYY-MM-DD).
- OUTPUT: `tranrept_report`, the printed lines joined by `\n`, each 133 characters. CONTRACT allows
  this form ("as one string under the file's name without extension"). The workflow also returns
  `lineCount` (detail lines), `grandTotal` and `referenceErrors`.

Each numbered item below says what was decided and which wiki statement (or missing statement) it
rests on.

## Selection and order

1. **Date filter.** A record is kept when `TRAN-PROC-TS(1:10)` (bytes 305–314) is between
   `startDate` and `endDate`, inclusive. Dates are compared as plain YYYY-MM-DD text.
   *Rests on* BR-01 ("Filter on processedTimestamp between start and end date inclusive (SORT
   INCLUDE on proc date)"). The wiki says nothing about timestamp format, so only the first 10
   characters are used.
2. **Sort.** Records are sorted ascending by `TRAN-CARD-NUM`. Within a card the original file
   order is kept (stable sort).
   *Rests on* BR-02 ("Sorted by card number"). The wiki does not say how ties are ordered.
3. **Default range.** If `startDate` or `endDate` is missing, 2022-01-01 / 2022-07-06 is used.
   *Rests on* BR-05. Each run receives 2022-07-01 / 2022-07-31 per the contract.
4. **Interest postings are excluded.** A transaction with type `01` and category `0005` gets no
   detail line and is added to no page, account or grand total. It also does not cause a card
   break: it is dropped before the break logic, the same way as an out-of-range record.
   *Rests on* BR-07 and acceptance scenario 7. The wiki does not say how an excluded record
   relates to the card break; this follows from "left out of the report".

## Lookups and missing references

5. **Account ID** on a detail line is `XREF-ACCT-ID` from `cardxref.dat` for the transaction's
   card. Type and category descriptions come from `trantype.dat` (key = type) and `trancatg.dat`
   (key = type + category). The report never prints codes in place of names.
   *Rests on* BR-03, plugin "Detail line", and acceptance "Data Mapping Verification"
   (Transaction + CardXref + TransactionType + TransactionCategory).
6. **Unknown reference.** If the type, category or xref entry is missing, the run continues. The
   missing field (description or account ID) prints as spaces, and a message goes into
   `referenceErrors`. The legacy program abends here.
   *Rests on* acceptance scenario 5: "Error flagged, run continues
   {{TODO: confirm legacy abend behaviour}}". The wiki does not say what the line shows, so the
   choice of blanks is ours.

## Totals and pagination

7. **Account (card) total.** An `Account Total` line and a rule are printed when the card number
   changes, before the new card's first detail. **No account total is printed after the last
   card.** The report ends with the page total, a rule and the grand total.
   *Rests on* BR-04 ("card total (on card change)", read literally) and the legacy CBTRN03C
   end-of-file path. The plugin page ("sum of amounts per account/card (break on card number)")
   could be read as also wanting a total for the last card. Declared in `flags.json`.
8. **Grand total** is the exact sum of the amounts listed (the sum of the page totals). The
   legacy program adds the last record's amount to the page total a second time at end of file.
   That is **not** reproduced.
   *Rests on* plugin "Grand total: sum for the report" and acceptance scenario 2. The wiki never
   mentions the double add. Declared in `flags.json`.
9. **Page size is 20 lines**, using the CBTRN03C counting rule:
   - every written line adds to the counter, including headers, totals and rules;
   - before each detail line, if `counter mod 20 = 0`, a page total, a rule and a new header block
     are written.

   Because totals add 2 at a time, a page can run past 20 lines.
   *Rests on* the plugin page: "page size {{TODO: lines per page in CBTRN03C}}". The wiki gives no
   value, so 20 is the legacy `WS-PAGE-SIZE`. Declared in `flags.json`.
10. **Page header** (report header, blank line, column header, rule) is first written with the
    first detail line, and after that only at page breaks.
    *Rests on* the contract ("A page starts with the report header, the blank line, the column
    header and a rule"). The wiki is silent on an empty report.
11. **Empty range.** The output is a page total, a rule and a grand total, both totals zero and
    no header block.
    *Rests on* acceptance scenario 4 ("Report with zero total"). Whether a header is printed is
    not stated; we follow legacy, which writes the header only with the first detail.
    Declared in `flags.json`.

## Formatting

12. **Edited amounts** follow COBOL picture rules exactly:
    - detail amounts use `-ZZZ,ZZZ,ZZZ.ZZ`: `-` or space in the first position;
    - totals use `+ZZZ,ZZZ,ZZZ.ZZ`: `+` or `-` in the first position;
    - when the value is non-zero but under 1, the integer part is blank (`           .50`);
    - **a zero value prints as 15 spaces**, because every digit position is a `Z`. So a zero
      total shows no figure.

    *Rests on* the contract ("Picture notation ... as in COBOL"). The wiki only says "verify
    amount formatting and totals". Declared in `flags.json`.
13. **Column header.** The amount heading is `          Amount` (10 spaces + `Amount` = 16
    characters) after one separating space. Its text therefore ends in column 114, while
    detail amounts end in column 112.
    *Rests on* the contract image, where the number of spaces could only be read approximately.
    Declared in `flags.json`.
14. **Category code** prints as 4 digits (`9(4)`). Descriptions are cut to 15 characters (type)
    and 29 characters (category), per the contract layout.
15. **Line length.** Every line is padded to 133 characters (BR-06). Blank lines are 133 spaces.

## Input parsing

16. **`TRAN-AMT S9(9)V99`** (bytes 133–143) is read as zoned decimal with a trailing overpunch
    sign: `{`/`A`–`I` positive, `}`/`J`–`R` negative, `p`–`y` ASCII negative, a plain digit
    positive. If the field holds an explicit `+`, `-` or `.`, it is parsed as a readable signed
    decimal instead.
    *Rests on* the contract ("layouts as in the copybooks"). The wiki does not describe sign
    encoding beyond the `0150{` example on DT-07.
17. Short lines (trailing spaces trimmed) are padded back to the record length. Blank lines are
    ignored. Both `\n` and `\r\n` line ends are accepted.

## Architecture

18. **Simplified architecture.** The wiki's P-18 process uses message events into
    `transaction-data-access` / `reference-data-access` over a NOSQL_DB datastore, and the
    document plugin (template `transaction-report` / `TransactionReportTemplate`, PDF + CSV).
    This build replaces all of that with one integration workflow that reads the contract's
    input files directly and returns the 133-column text.
    *Rests on* CONTRACT.md, which fixes file inputs and a text output. The datastore and template
    pieces are not needed to produce that output. The wiki's own Legacy Comparison lists layout
    as "Redesigned", but the contract requires the legacy print layout, so that layout was kept.
