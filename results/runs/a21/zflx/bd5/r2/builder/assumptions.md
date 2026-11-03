# Statement generation (P-17, legacy CREASTMT / CBSTM03A+B): assumptions

This file lists the decisions taken where the wiki is uncertain, incomplete or silent. Each entry
gives the decision and the wiki statement it rests on, or the gap it fills.

FlowX build: project `cd_a21_bd5_zflx_r2`, workflow `creastmt_statement_generation`
(resourceDefinitionId `<uuid>`).

## A. Architecture

| # | Decision | Rests on |
|---|----------|----------|
| A1 | The step is one DEFAULT integration workflow: Start → *Read files and build statement data* → *Render text statements (statement-text)* → *Render HTML statements (statement-html)* → *Build run summary* → End. It takes the four input files as text and returns both outputs. The wiki's process design (Send/Receive to `account-data-access` / `transaction-data-access`, a per-card loop subprocess, and a Document Plugin) is not built. The per-card loop and the two templates are inside SCRIPT nodes. | CONTRACT supplement: inputs are "given per run" as fixed-width files and outputs are line files. The `carddemo-datastore` NOSQL system and the `batch-file-gateway` Kafka connector the wiki relies on do not exist for this run. BR-06 only requires that the ALTER/GO TO driver be replaced by a loop. |
| A2 | Inputs are the workflow INPUT keys `transact`, `acctdata`, `cardxref` and `custdata`, each holding the raw file content (one record per line). Outputs are the END keys `creastmt_statements` and `creastmt_statements_html` (lines joined by `\n`), plus `statementCount` and `runWarnings`. | CONTRACT supplement: "a run may return the same lines as one string (lines joined by `\n`) … under the file's name without extension." |
| A3 | The text and HTML layouts come from the contract's line tables, not from configured Document Templates. No `statementDocumentRef` is produced. PDF is not produced. | The process page's Data Mapping names templates `statement-html` / `statement-text`, but the plugin page has a TODO ("confirm the exact statement line layouts … not analyzed in detail"). The contract fixes the layouts. Acceptance #6 says PDF is "not available in legacy". |
| A4 | Delivery to the customer (acceptance #5) is not implemented. The statements are only returned as outputs. | Acceptance #5 is an open `{{DECISION: delivery channel}}` and is tagged @manual. |

## B. Input parsing

| # | Decision | Rests on |
|---|----------|----------|
| B1 | Field offsets are derived from the attribute order and PIC sizes in the project data model: DT-01 Account, DT-02 Customer (CUSTREC), DT-04 CardXref and DT-05 Transaction. | Data model pages. CONTRACT: "layouts as in the copybooks". |
| B2 | Signed amounts (`S9(n)V99`) are read as zoned decimal with 2 implied decimals. The sign may be an overpunch on the last digit (`{`/`A`–`I` positive, `}`/`J`–`R` negative, ASCII `p`–`y` negative) or an explicit leading or trailing `+`/`-`. An explicit decimal point is also accepted. | DT-07 notes the seed files store "signed overpunch (`0150{` = 15.00)". The wiki says nothing about the encoding of the other files, so all common forms are accepted. |
| B3 | Blank lines are ignored. Short lines are padded with spaces to the record length. | Not covered by the wiki (robustness). |
| B4 | Keys are matched with leading zeros and spaces ignored: xref customer id ↔ customer id, xref account id ↔ account id. Card numbers are matched after trimming trailing spaces: xref card ↔ `TRAN-CARD-NUM`. If a key occurs twice in the account or customer file, the first record is used and a warning is added. | DT-04 says `customerId` / `accountId` are FKs. The data model does not say how duplicate keys are handled (a KSDS key is unique, so duplicates are not expected). |

## C. Statement content (behaviour)

| # | Decision | Rests on |
|---|----------|----------|
| C1 | One statement is produced for each CardXref record. Statements are ordered by card number; if two records have the same card number, file order is kept. | BR-01 "Statement driven by CardXref order (card number)". Purpose: "one statement per card/account". |
| C2 | A card's transactions are all records in `transact.dat` with that card number, sorted by transaction id (file order for equal ids). | BR-02 "keyed by card number + transaction id". |
| C3 | No statement-period or date filter is applied: every transaction on file for the card is listed. | Process page: `{{TODO: legacy prints all transactions on file; confirm cycle filter requirement}}`. The open TODO is resolved in favour of the documented legacy behaviour. |
| C4 | `Total EXP` is the sum of the line amounts that are strictly greater than zero. Credits and returns (≤ 0) are listed with their signed amount but not added. | BR-03, DT-17 `totalExpenditure`, plugin Totals, acceptance #2 and #7 (100 + 40 with a −30 return → 140.00). BR-03 also carries a TODO to confirm the line layout, which the contract settles. |
| C5 | A card with no transactions still gets a statement: header, account block, an empty transaction section and `Total EXP` .00. | Acceptance #4 "Statement with zero total". |
| C6 | If the xref's customer or account cannot be found, no statement is produced for that card. The run continues, and a line is added to `runWarnings`. | Not covered by the wiki. A statement cannot be addressed without the customer, and the run summary node is where the wiki puts run results. |
| C7 | Customer name = first, middle and last name, each trimmed, joined by single spaces. An empty middle name is skipped. The result is truncated to 75 characters. | DT-17 `customerName` comes from Customer, but the wiki does not say how it is assembled. |
| C8 | Address line 1 and line 2 are `addressLine1` and `addressLine2` as on file (X(50)). Address line 3 is `addressLine3`, state and zip, each trimmed and joined by single spaces (X(80)). Country is **not** printed. | Plugin Customer block: "address (3 lines, state, zip)". Contract: line 3 is X(80), wider than the 50-character source field, so it is a composed line. Acceptance asks to "verify … the address formatting" but gives no format. |
| C9 | Phone is not printed. Statement date and cycle credit/debit are not printed either. | The plugin Content table lists phone, statement date and cycle credit/debit, but the contract's line layouts have no place for them. The contract wins on format. |
| C10 | Account ID is printed as the 11-digit id from the xref record (leading zeros kept), left-aligned in X(20). | DT-17 `accountId` "from xref". Contract: X(20). DT-01: `accountId` is String(11) numeric. |
| C11 | FICO score is printed as the 3-digit field from the customer record (leading zeros kept), left-aligned in X(20). | DT-02 `ficoScore` from `CUST-FICO-CREDIT-SCORE 9(3)`. Contract: X(20). |
| C12 | Current balance is printed as `9(9).99-` from `ACCT-CURR-BAL`. Values that do not fit in 9 integer digits lose their high-order digits, as COBOL truncation would. | Contract picture. DT-01 is S9(10)V99. The wiki says nothing about overflow. |
| C13 | Transaction details are `TRAN-DESC` truncated to 49 characters. | Contract: "transaction details X(49)". DT-05: description X(100). |
| C14 | In `Z(9).99-`, only the integer part is zero-suppressed, so 0 prints as `         .00 ` and 0.5 as `         .50 `. | COBOL editing semantics of the picture given in the contract. |

## D. HTML rendering

| # | Decision | Rests on |
|---|----------|----------|
| D1 | Each statement is a complete HTML document, from `<!DOCTYPE html>` to `</html>`. These documents are concatenated in statement order. | Contract: "creastmt_statements_html.txt: one statement, lines in this order". |
| D2 | Customer name and address lines are inserted with trailing spaces removed, followed by the literal two spaces and `</p>` shown in the template. | The contract gives these placeholders no picture. A fixed X(75) name would make that line 107 characters, which exceeds the 100-column line, so the values must be variable length. |
| D3 | Fields that have a picture (account id X(20), balance 9(9).99-, FICO X(20), tran id X(16), details X(49), amount Z(9).99-) are inserted at their full fixed width, trailing spaces included. | Contract template. |
| D4 | The label spacing in the HTML account block (`Account ID         : `, `Current Balance    : `, `FICO Score         : `) is the text layout's 19-character label, then `: `. | Contract template (its rendering does not make the exact space count unambiguous). |
| D5 | Inserted values are not HTML-escaped. | The contract inserts fields verbatim, and the legacy output is plain string concatenation. |
| D6 | Every text line is space-padded to 80 characters and every HTML line to 100. Lines are truncated if longer, though none of the fixed lines are. | Contract line lengths. |

## E. Out of scope

- BR-05 / F-14: the corrupted STMTFILE DD is not migrated. The outputs are returned by the workflow instead.
- Orchestration by `end-of-day-batch-chain` (call order, `batchWindowOpen`, COND handling) is not part of this step's contract. The workflow can be called by that chain as a single step.
