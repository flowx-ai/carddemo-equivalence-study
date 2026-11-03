# Assumptions — CardDemo statement generation (CREASTMT / P-17) on FlowX.AI

Each entry gives the decision, then the wiki statement it rests on, or the gap it fills.
"Wiki" means the pages in `creastmt-sonnet.pdf`. "Contract" means CONTRACT.md and its layer 1 supplement.

## A. How the step runs in FlowX

**A1. The step is an integration workflow, `creastmt_statement_generation`, not a BPMN process with a per-card loop subprocess and SEND/RECEIVE pairs.**
- Rests on: BR-06 ("FlowX replaces it with a loop subprocess") and the Process Flow diagram (Send/Receive → Subprocess for Each Card → Request Document Generation → More cards? → Build Run Summary).
- The workflow keeps the same stages as nodes: Build Statement Data → Render Text (STMTFILE) → Render HTML (HTMLFILE) → Build Run Summary. The per-card loop runs inside the first node.
- Reason: the contract hands the step whole files per run and expects whole files back. A batch step has no user tasks (Acceptance Criteria: "UI Flow: none (batch)").
- The end-of-day-batch-chain process can call this workflow as its "statement-generation" step through a SEND/RECEIVE pair or a SUBWORKFLOW node.

**A2. Input files arrive as workflow INPUT strings; outputs leave as workflow OUTPUT strings.**
- Inputs: `transact`, `acctdata`, `cardxref`, `custdata`, each holding the whole file content.
- Outputs: `creastmt_statements` and `creastmt_statements_html`, with lines joined by `\n`.
- Rests on: the contract ("a run may return the same lines as one string under the file's name without extension") and workflow-batch-file-transfer (READ_FILE_PAGE / PUBLISH_FILE).
- The Kafka `batch-file-transfer` gateway and the `carddemo-datastore` NOSQL collections (workflow-account-data-access, workflow-transaction-data-access) are not used. They do not exist in this project, and the contract's unit of exchange is the file.
- Paging (the batch-file-transfer DECISION) is not needed at CardDemo volumes. The raw files are dropped from workflow state after the first node, to stay under the SCRIPT payload cap.

**A3. The `statement-text` and `statement-html` "templates" are rendered by SCRIPT nodes, not by the Document Plugin.**
- Rests on: plugin-statement-document ("Formats: text (80 columns) and HTML as in legacy; PDF new") and the contract's exact line layouts.
- The Document Plugin renders PDF/DOCX files. It cannot return fixed-width lines inline, as the contract requires.
- The PDF format is not built. Acceptance Criteria scenario 6 is `@manual` and "Not available in legacy (FI-09)".

**A4. Statements are not persisted to the `statements` collection and are not delivered to customers.**
- Rests on: Acceptance Criteria scenario 5, still open as `{{DECISION: delivery channel – see notification-strategy}}`. The contract asks only for the two files.
- `statementDocumentRef` is filled with a position reference into the output file.

**A5. A missing customer or account for an xref record stops the run.**
- The run returns `status = FAILED` with a `runMessage`, plus the statements built before that record.
- Rests on: nothing for this batch; the wiki is silent. workflow-account-data-access defines "not found → found=false" only for online use.
- This mirrors the legacy CBSTM03A behaviour, which abends on a non-zero file status. The end-of-day-batch-chain BR-02 says "a failing step stops the chain".

## B. Which statements and which lines

**B1. One statement per CardXref record (per card), in ascending card-number order.**
- Rests on: BR-01 ("Statement driven by CardXref order (card number)"), Acceptance Criteria scenario 1 ("One statement per card") and DT-04 (primary key `cardNumber`).
- An account with two cards gets two statements, each listing only that card's transactions.
- The xref file is sorted by card number, as a KSDS sequential read would deliver it. A duplicate card key keeps the first record.

**B2. Every transaction on file for the card is printed. There is no statement-period or cycle filter.**
- Rests on: process Configuration Dependencies, `{{TODO: legacy prints all transactions on file; confirm cycle filter requirement}}`. The contract describes `transact.dat` as "the day's combined transaction file".

**B3. Transactions are matched to a statement by card number and printed in transaction-id order.**
- Rests on: BR-02 (sorted copy keyed by card number + transaction id, key length 32).
- Sorting uses ASCII collation of the raw 16-character fields.
- A duplicate card + id key keeps the first record, as a KSDS load would.
- A transaction whose card is not in the xref file appears on no statement.

**B4. A card without transactions still gets a statement.** Its transaction section is empty and its total is zero (`$         .00 `).
- Rests on: Acceptance Criteria scenario 4 ("Statement with zero total").

**B5. "Total EXP" is the signed sum of the printed line amounts.** Refunds and credits reduce it.
- Rests on: BR-03 ("total expenditure = sum of amounts") and Acceptance Criteria scenario 2.
- The sum is kept in cents. It is truncated to S9(9)V99, like the legacy accumulator.
- It is printed as `Z(9).99-` per the contract.

**B6. The HTML statement has no total row.**
- Rests on: the contract's HTML layout, where the closing block follows the last transaction block directly. The plugin's "Totals" section therefore applies to the text format only.

## C. Field content and formatting

**C1. Customer name = first word of first name + " " + first word of middle name + " " + first word of last name, cut to 75 characters.**
- A blank middle name gives a double space ("Mary  Smith"). A multi-word first name keeps only its first word.
- Rests on: the wiki only says "customer name" (DT-17 `customerName` from Customer). The Legacy Comparison table states the output is the "Same" as legacy STMTFILE/HTMLFILE.
- This is the legacy CBSTM03A assembly (`STRING ... DELIMITED BY ' '`), so it is reproduced as-is.

**C2. Address lines 1 and 2 are printed verbatim (X(50)).** Address line 3 = first word of address line 3 + state + country + ZIP, single-space separated, in X(80).
- Rests on: plugin-statement-document ("address (3 lines, state, zip)"), the contract's 4 name/address lines (line 3 is X(80)), and Acceptance Criteria ("verify ... the address formatting"; no rule given).
- Country is included because legacy builds line 3 this way. The first-word truncation of a multi-word city ("New York" → "New") is the legacy behaviour and is reproduced, per the "Same" output claim.

**C3. In the HTML, the name and address fields are each followed by two spaces and `</p>`.** Each field is the corresponding text-statement field up to its first double space.
- Rests on: the contract shows `{customer name}  </p>` with no picture clause. Every fixed-width field elsewhere carries a width (X(20), X(16), ...), so these are taken to be variable-length.
- The double-space cut is a judgement call. It differs from a simple right-trim only when a field contains an internal double space (for example a blank middle name: HTML shows "Mary").

**C4. Account ID is the 11-digit `ACCT-ID` from the account record, left-aligned in X(20).**
- **Current Balance** is `ACCT-CURR-BAL` (S9(10)V99) printed as `9(9).99-`, so a tenth integer digit would be dropped, as a COBOL MOVE does.
- **FICO Score** is the raw 3-digit `CUST-FICO-CREDIT-SCORE` in X(20).
- Rests on: the contract pictures, DT-01, DT-02 and DT-17.

**C5. The statement prints only what the contract layout has.**
- Statement date, phone, credit limit and cycle credit/debit are listed in plugin-statement-document "Content" but are not printed.
- Rests on: the plugin's `{{TODO: confirm the exact statement line layouts in CBSTM03A}}` together with the contract, which fixes every printed line.
- SSN is never printed (plugin: "SSN is not printed").

**C6. The bank block is the fixed text "Bank of XYZ / 410 Terry Ave N / Seattle WA 99999".**
- Rests on: the contract's HTML layout. The wiki has no configuration parameter for it.

**C7. Each transaction line prints the description cut to 49 characters (X(49)) and the 16-character transaction id.**
- Rests on: the contract line 14 and BR-03 ("transaction id, description, amount").

## D. Input parsing and output encoding

**D1. Input records are read leniently.**
- One record per line; blank lines are ignored and CRLF is accepted.
- A short line (trailing filler stripped) is space-padded to its copybook length.
- Numeric keys (customer id, account id) are matched by value.
- Rests on: the contract ("fixed width, one record per line, layouts as in the copybooks"). Nothing says how robust the reader must be.

**D2. Signed amounts (`S9(n)V99` DISPLAY) are decoded from the sign forms below.** They are kept in integer cents.
- Accepted forms: trailing overpunch (`{`, `A`–`I` positive; `}`, `J`–`R` negative), the ASCII sign nibble (`p`–`y` negative), or an explicit `+`/`-`.
- Rests on: DT-07 ("seed file stores signed overpunch (`0150{` = 15.00) — convert at load"). The wiki does not say which sign convention the other files use.

**D3. Outputs follow the contract's line widths.**
- Every text line is padded to 80 characters and every HTML line to 100; longer content is cut.
- Lines are joined by `\n` with no trailing newline.
- Each statement in the HTML file is a complete `<!DOCTYPE html>` … `</html>` document, as the contract's "one statement, lines in this order" layout states.

**D4. The legacy in-memory table limits (CBSTM03A 2-D table) are not reproduced.** There is no cap on cards or on transactions per card.
- Rests on: BR-06 (the 2-D array and control-block addressing are replaced) and DT-17 ("Built in memory ... using 2-D table, ALTER/GO TO control flow").

**D5. BR-05 (the corrupted STMTFILE DD, finding F-14) has no effect.** The output names come from the contract (`creastmt_statements.txt`, `creastmt_statements_html.txt`).
