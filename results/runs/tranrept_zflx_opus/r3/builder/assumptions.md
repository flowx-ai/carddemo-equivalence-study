# Assumptions — daily transaction report (TRANREPT)

The wiki describes this step only at the level of an online "Reports" process (`process-reports.md`:
"Query Report Data … Aggregate transactions … `TRANREPT` logic"). It names the legacy sources
(`TRANREPT.jcl`, `CORPT00C`, `CSUTLDTC`) but says nothing about selection, ordering, paging,
totals or abnormal cases. CONTRACT.md fixes only the line layouts. Wherever the wiki is silent,
the implementation follows the legacy batch chain the wiki names as its source (`TRANREPT.jcl`:
SORT step + program `CBTRN03C`), on the reasoning that the wiki says this step reproduces
"`TRANREPT` logic". Each decision is listed below with the statement it rests on.

## Scope

| # | Assumption | Rests on |
|---|---|---|
| S1 | Only the batch report text (`tranrept_report.txt`) is produced. PDF rendering (Statement PDF Renderer), the Download/View user task and the UI form are not built. | CONTRACT.md lists one output for this step. The wiki's PDF step depends on `pdfRendererUrl` and has an open `{{DECISION: document plugin vs external PDF microservice}}`. |
| S2 | The account / category / report-type filters from the UI form (`report.accountId`, `report.type`) are not applied. The batch report covers every transaction in the date range. | The wiki's business description mentions "date range, account, category" for the online screen. CONTRACT.md gives only a start and end date as run parameters, and the legacy batch job has no other selection. |
| S3 | Inputs are passed as file contents (strings): `transactFile`, `cardxrefFile`, `trantypeFile`, `trancatgFile`, plus `startDate` / `endDate`. The output is returned as one string, `tranrept_report`, with lines joined by `\n`. | CONTRACT.md: "a run may return the same lines as one string … under the file's name without extension". The wiki's integration topic `ai.flowx.in.carddemo.datastore.queryreport` / FlowX Persistence has no defined store, so no database is used. |

## Parameters and validation

| # | Assumption | Rests on |
|---|---|---|
| P1 | Both dates are required and must be real `YYYY-MM-DD` calendar dates, with start ≤ end. Otherwise the workflow ends on "Validation Error End" with `validationError`, and no report is produced. | `ui-flow-reports.md` validators ("required, valid range (from ≤ to)"); acceptance scenarios 2 and 3; Date Utility "Parse/Validate Date → Valid?". The wiki does not say which formats `CSUTLDTC` accepts beyond legacy `X(10)` dates; ISO is the contract's format. The Date Utility is implemented inline, as its `{{DECISION}}` recommends. |
| P2 | A transaction is selected when the first 10 characters of `TRAN-PROC-TS` (processing date) fall between start and end inclusive, compared as text. The origination timestamp is not used. | The wiki is silent on which date is filtered. The legacy `TRANREPT.jcl` sort step includes on `TRAN-PROC-DT` (position 305, length 10), GE start AND LE end. |

## Ordering and grouping

| # | Assumption | Rests on |
|---|---|---|
| O1 | Selected transactions are sorted ascending by card number. Ties keep input-file order (stable sort). | The wiki is silent. The legacy sort step uses `SORT FIELDS=(TRAN-CARD-NUM,A)`. Stability is not stated anywhere; DFSORT EQUALS/NOEQUALS depends on the installation. |
| O2 | "Account Total" lines break on a change of **card number**, not account id. Two cards on the same account therefore get separate account totals. | The wiki is silent. The legacy program controls the break on `TRAN-CARD-NUM`. |
| O3 | The account id printed on a detail line comes from `cardxref.dat` (card → account). It is looked up when the card number changes. | Data model: CardXref "Links card ↔ customer ↔ account", used by the transaction flows. |
| O4 | The type description is from `trantype.dat` (key = type code), truncated to 15. The category description is from `trancatg.dat` (key = type code + category code), truncated to 29. | Data model: TransactionType / TransactionCategory references. Widths are from CONTRACT.md. |

## Paging and totals (wiki silent; legacy `CBTRN03C` behaviour reproduced)

| # | Assumption | Rests on |
|---|---|---|
| T1 | The report header block (header, blank, column header, rule) is written once before the first detail line. | CONTRACT.md: "A page starts with the report header, the blank line, the column header and a rule". |
| T2 | Page size is 20 by a running line counter that counts **every** written line (headers, details, totals, rules). Before each detail line, if counter mod 20 = 0, a Page Total line plus rule and a new header block are written. Pages are therefore not uniform. If an account-total pair jumps the counter over a multiple of 20, no break occurs until the next multiple. | The wiki is silent on page length. This is the legacy `WS-PAGE-SIZE 20` / `MOD(WS-LINE-COUNTER, WS-PAGE-SIZE)` logic. |
| T3 | The Grand Total is the sum of the printed page totals. | The wiki is silent. Legacy behaviour: the grand total accumulates in the page-total paragraph. |
| T4 | At end of file the **last selected transaction's amount is added a second time** to the final page total, and so to the grand total. Then the final Page Total + rule and the Grand Total are written. **No Account Total is written for the last card.** | The wiki is silent. This reproduces the legacy end-of-file branch, where the record area still holds the last record. It is a known legacy defect and was kept for fidelity with the oracle; see flags.json. |
| T5 | Empty selection (no transaction in range): only "Page Total" (amount blank) + rule + "Grand Total" (amount blank) are written, with no header block. The run ends normally, without an error. | Acceptance scenario 4 ("Report with zero rows, no error"). The exact lines follow the legacy end-of-file branch. |
| T6 | Accumulators behave as `S9(9)V99`: totals are kept modulo 10^9 currency units (high-order truncation), with no rounding. | The data model maps `S9(n)V99` to decimal scale 2. Overflow is not discussed. |

## Formatting

| # | Assumption | Rests on |
|---|---|---|
| F1 | Amount edit pictures `-ZZZ,ZZZ,ZZZ.ZZ` / `+ZZZ,ZZZ,ZZZ.ZZ`: the sign is fixed in column 98, leading zeros and their commas become spaces, and the decimals always print for a non-zero value (e.g. `            .50`). **A zero value prints as 15 spaces**, sign included, because every digit position is `Z`. | CONTRACT.md picture notation. CONTRACT.md does not cover the all-zero case, so standard COBOL editing rules are applied. |
| F2 | Column header "`Amount` padded to 16" is left-aligned in columns 99–114, read literally as X(16). | CONTRACT.md column-header row. The legacy copybook may right-align it over the amount column; flagged. |
| F3 | The detail account id is the raw 11-digit `XREF-ACCT-ID` with leading zeros. The category code is printed as 4 digits. | CONTRACT.md "18–28 account ID", "49–52 category code 9(4)". |
| F4 | Every line is padded to 133 characters. The header date fields print the run parameters exactly as given (10 chars). | CONTRACT.md line length 133 and positions 92–101 / 106–115. |
| F5 | `TRAN-AMT S9(9)V99` is read from columns 133–143 as zoned decimal. Accepted forms: trailing overpunch (`{A-I` positive, `}J-R` negative, ASCII `p-y` negative), or an explicit leading/trailing sign. | CONTRACT.md "layouts as in the copybooks". The wiki does not specify the text encoding of signed fields. |
| F6 | Input lines may be shorter than the record length (trailing spaces stripped). They are right-padded before slicing, and blank lines are ignored. | CONTRACT.md "Trailing spaces may be omitted" (stated for outputs; applied to inputs defensively). |

## Abnormal cases

| # | Assumption | Rests on |
|---|---|---|
| A1 | A card number missing from `cardxref.dat`, a type code missing from `trantype.dat`, or a type+category missing from `trancatg.dat` stops the report at that point (legacy abend). Lines already written are returned, with `abendMessage` set. No totals follow, and the run itself completes. | The wiki is silent on lookup failures. The legacy program abends on INVALID KEY. Returning partial output (rather than failing the run) is a FlowX design choice so the result stays inspectable. |
| A2 | Records outside the date range are dropped before processing, so the legacy `NEXT SENTENCE` quirk in the date check never triggers. | Legacy job pre-filters in the sort step (P2). |
