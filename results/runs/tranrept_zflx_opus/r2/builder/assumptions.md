# Daily transaction report (TRANREPT) — assumptions

Build: FlowX project `cd_tranrept_zflx_opus_r2` (dev-env, platform 5.13), workflow
`tranrept_daily_transaction_report` (resourceDefinitionId `<uuid>`).
Output: `tranrept_report`, the printed lines as a list of 133-character strings (CONTRACT supplement,
"Outputs": a run may return the lines as a list of strings under the file name without extension).

Each decision below gives its source:

- **[W]** a wiki statement.
- **[C]** the I/O contract. It fixes formats only.
- **[gap]** the wiki is silent, so the choice is mine.
- **[L]** wherever I filled a gap with what I know of the public AWS CardDemo source (CBTRN03C,
  TRANREPT.jcl), I mark it **[L]**. That knowledge is **not** in the supplied wiki, so these lines
  measure my outside knowledge, not the wiki.

## Inputs and record layouts

- **A1.** The step reads `transact.dat`, `cardxref.dat`, `trantype.dat` and `trancatg.dat`, plus a start
  and an end date. [C supplement, "Inputs" table + run parameters] The wiki's process gives the query
  payload as `{ from, to, filters }`. [W process-reports, Integration Touchpoints] The UI filters
  `report.accountId` and `report.type` [W ui-flow-reports, Data Bindings] are not batch parameters. The
  contract gives only the two dates, so these filters are not implemented. The PDF render and download
  steps are out of scope too, because the contract output is the text report only.
- **A2.** The workflow receives each file's content as a string, one record per line. A list of lines is
  also accepted. Blank lines are skipped. Lines whose trailing spaces were stripped are padded back to the
  record length. [gap: the contract says the files are "given per run" but not how they reach a
  service]
- **A3.** Transaction layout (CVTRA05Y, 350 bytes) is taken from the wiki's Transaction attribute order
  and legacy pictures, with a 20-byte filler tail. [W project-data-model, Transaction] The resulting
  offsets are:

  | Field | Positions |
  |-------|-----------|
  | TRAN-ID X(16) | 1–16 |
  | TYPE X(2) | 17–18 |
  | CAT 9(4) | 19–22 |
  | SOURCE X(10) | 23–32 |
  | DESC X(100) | 33–132 |
  | AMT S9(9)V99 | 133–143 |
  | CARD-NUM | 263–278 |
  | PROC-TS | 305–330 |

- **A4.** The card cross-reference layout (CVACT03Y) is card X(16), customer 9(9), account 9(11). [W
  project-data-model, CardXref, attribute order] The account id is read from positions 26–36.
- **A5.** The `trantype.dat` (CVTRA03Y) and `trancatg.dat` (CVTRA04Y) layouts are **not in the supplied
  wiki pages**. The TransactionType and TransactionCategory pages and the Enumerations page are linked
  but not included. I assumed type code X(2) + description X(50) + filler (60), and type code X(2) +
  category 9(4) + description X(50) + filler (60). [gap; layout from my knowledge of the copybooks
  [L], consistent with the 60-byte record length in C]
- **A6.** TRAN-AMT S9(9)V99 is zoned decimal with the sign overpunched on the last digit: `{`,`A`–`I` are
  +0..9 and `}`,`J`–`R` are −0..9. ASCII `p`–`y` (negative), plain digits, an explicit leading sign or a
  decimal point are also accepted. Amounts are kept as integer cents, so there is no floating-point drift.
  [W project-data-model: "S9(10)V99 → NUMBER (decimal, scale 2)"; the encoding itself is a gap]

## Selection and order

- **A7.** "Date range" means the **processing** timestamp, TRAN-PROC-TS positions 1–10 (YYYY-MM-DD).
  Both ends are inclusive. [W ui-flow-reports: "valid range (from ≤ to)"; process-reports: payload
  `{from, to}`. Which timestamp to use is a gap; I chose processing date from [L], where TRANREPT.jcl
  filters on TRAN-PROC-DT]
- **A8.** Selected transactions are ordered by card number ascending. Ties keep input order (stable
  sort). [gap; [L] the legacy JCL sorts on TRAN-CARD-NUM] The wiki never says how the report is
  ordered.
- **A9.** The account ID printed on a detail line comes from the card cross-reference
  (card → account). [W project-data-model, CardXref "Links card ↔ customer ↔ account"; the contract
  detail line has an account ID but the transaction record has none]
- **A10.** The type and category descriptions come from `trantype.dat` (by type code) and `trancatg.dat`
  (by type + category code). They are truncated to 15 and 29 characters. [C detail layout; the lookup
  keys follow W TransactionCategoryBalance "Composite key ... typeCode + categoryCode"]
- **A11.** A transaction whose card, type or type+category is missing from the lookup files stops the
  run with an error naming the keys. No partial report is produced. [gap; [L] the legacy program
  abends on an invalid key. The wiki AC only covers renderer failure (scenario 5)]

## Report layout and control flow

- **A12.** All line layouts follow the CONTRACT supplement exactly. Every line is padded to 133
  characters. [C]
- **A13.** Page size is 20 lines, counted from the report header. Before each detail line, if the line
  count is a multiple of 20, the page total, a rule and a new page header are written. Header lines (4),
  detail lines, and total lines with their rules (2) all count. Because a total adds 2 lines, a count
  can skip past a multiple of 20, which makes the next page longer. [gap: the contract describes a
  "page total" but no page length; 20 and the counting rule are [L]]
- **A14.** An "Account Total" is printed when the **card number** changes. It is labelled Account Total
  even when two cards share an account, so one account can get two totals. [gap: the wiki never
  defines account grouping; [L] the legacy control break is on TRAN-CARD-NUM]
- **A15.** At end of file the last selected transaction's amount is **added a second time** to the page
  and account totals. Then the final page total, a rule and the grand total are printed. **No Account
  Total is printed for the last card group.** [L, reproducing a known legacy defect for output
  fidelity; the wiki does not mention it. A clean re-implementation would print a final account total
  and not double-count. If the scorer's oracle is not the legacy program, this choice is wrong.]
- **A16.** The grand total is the sum of all page totals, so it includes the A15 double count. [L]
- **A17.** Edited amounts use `-ZZZ,ZZZ,ZZZ.ZZ` (detail) and `+ZZZ,ZZZ,ZZZ.ZZ` (totals). A value that
  is exactly zero prints as 15 spaces, following COBOL: every digit position is Z, so the whole item is
  blanked. A non-zero value below 1 prints as `.50`, with no leading zero. Values beyond 9 integer
  digits keep the low-order 9 (COBOL truncation). [C picture notation; the zero case is a gap]
- **A18.** Empty result set: the report is still produced. It has the page header, then a blank Page
  Total, a rule and a blank Grand Total, and no error. [W acceptance-criteria scenario 4 "Report with
  zero rows, no error". Printing the header is my reading of "report"; [L] the legacy program would
  print the totals without a header]
- **A19.** The report header prints the run's start and end dates exactly as given (YYYY-MM-DD). [C]

## Validation (Date Utility)

- **A20.** The Date Utility call activity is implemented inline as a validation script, not as a
  separate subprocess. [W process-date-utility DECISION: "In most cases replace with the platform date
  library inline"]
- **A21.** Start and end date are required and must be real calendar dates in YYYY-MM-DD. The start must
  not be after the end. A failed check ends the workflow on the `Invalid parameters` END with
  `validation.errors` and no report. [W ui-flow-reports Data Bindings "required, valid range (from ≤
  to)"; W acceptance-criteria scenarios 2–3]

## Not implemented

- **A22.** Not implemented, because the batch contract has no output for them and these wiki parts are
  marked Draft/TODO:
  - PDF rendering (Statement PDF Renderer, `pdfRendererUrl`)
  - the retry on renderer failure (AC 5, `{{TODO: define retry}}`)
  - the User Task screens

  [W system-statementpdf Status Draft; W acceptance-criteria scenario 5]
