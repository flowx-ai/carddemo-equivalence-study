# Statement generation (CREASTMT, P-17): assumptions and decisions

These are the decisions taken where the wiki (process-statement-generation, acceptance-criteria-statement-generation,
project-data-model, plugin-statement-document, the integration workflows, end-of-day-batch-chain) or CONTRACT.md was
uncertain, incomplete or silent. Each one names what was assumed and the wiki statement (or absence of one) it rests on.
"Legacy" below means the public AWS CardDemo program CBSTM03A as I know it. I used it only where the wiki is silent,
on the strength of the wiki's Legacy Comparison row "Output | STMTFILE and HTMLFILE | document template (text + HTML) | Same".

Implementation: FlowX workflow `creastmt_statement_generation` (see `README.md`).

## A. Shape of the FlowX implementation

**A1. A single integration workflow instead of the P-17 process with message events, a data store and the Document Plugin.**
The process page wires P-17 to `workflow-account-data-access`, `workflow-transaction-data-access`,
`workflow-batch-file-transfer` and `plugin-statement-document`. Those all presuppose a populated `carddemo-datastore`
and a `batch-file-gateway`, and neither exists in this project. CONTRACT.md, on the other hand, hands the step four
flat files and expects two line-oriented text outputs. The FlowX Document Plugin renders PDF/DOCX, not 80/100-column
text. So the workflow takes the files as input and renders both outputs in SCRIPT nodes. The node chain follows the
process-flow boxes:
- Receive data → *Parse Input Files*
- Build Statement Data → *Build Statement Data* (produces DT-17 StatementData)
- Request Document Generation (statement-text / statement-html) → *Render Statement Text* / *Render Statement HTML*
- Build Run Summary → *Build Run Summary*

BR-06 ("FlowX replaces [the 2-D array / ALTER-GO TO] with a loop subprocess") is met by a plain per-card loop, not by a
subprocess.

**A2. Inputs and outputs travel as strings.** Inputs are the four whole file contents (`transact`, `acctdata`, `cardxref`,
`custdata`). Outputs are `creastmt_statements` and `creastmt_statements_html`: lines joined by `\n`, with no trailing
newline. CONTRACT.md allows a run to return "the same lines as one string ... under the file's name without extension".

**A3. Nothing is persisted.** No `statements` collection is written, and no `statementDocumentRef` is produced
(DT-17, process Data Mapping). There is no data store in the project, and the contract asks only for the two outputs.

**A4. Not implemented: delivery channel (AC-5) and PDF (AC-6).** AC-5 is an open `{{DECISION: delivery channel}}`, and
AC-6 says PDF is "Not available in legacy (FI-09)". Both are tagged @manual.

## B. Reading the input files

**B1. Field positions.** The wiki gives no byte offsets. CONTRACT.md says "layouts as in the copybooks". Offsets were
derived from the attribute order and the PIC sizes in the project data model:
- DT-05 Transaction: id 1-16, type 17-18, category 19-22, source 23-32, description 33-132, amount 133-143,
  merchant 144-262, card 263-278, timestamps 279-330.
- DT-01 Account: id 1-11, status 12, current balance 13-24, credit limit 25-36, ..., cycle credit 79-90,
  cycle debit 91-102.
- DT-04 CardXref: card 1-16, customer 17-25, account 26-36.
- DT-02 Customer: id 1-9, first 10-34, middle 35-59, last 60-84, address lines 85-234, state 235-236,
  country 237-239, zip 240-249, phone 250-279, ssn 280-288, ..., FICO 330-332.

**B2. Signed amounts (S9(n)V99) are zoned decimal with two implied decimals.** The parser accepts:
- sign overpunch on the last digit (`{`/`A`-`I` positive, `}`/`J`-`R` negative)
- ASCII-zoned negatives (`p`-`y`)
- an explicit leading or trailing sign
- an explicit decimal point

DT-07 notes that seed files store "signed overpunch (`0150{` = 15.00) — convert at load". The wiki is silent about the
other files. A value that cannot be parsed is read as 0 and reported in `runSummary.parseWarnings`.

**B3. Tolerant line handling.** CRLF or LF line ends are accepted, blank lines are ignored, and short lines are
space-padded to the record length. Numeric keys are matched without regard to leading zeros. If a key is duplicated,
the last record wins. The wiki says nothing on any of these.

**B4. SSN is never read into the statement data.** plugin-statement-document says "SSN is not printed". DT-02 marks it
sensitive.

## C. Which statements, which lines

**C1. One statement per CardXref record, in card-number order.** BR-01: "Statement driven by CardXref order (card
number)". The xref records are sorted by card number, with file order kept on ties. An account with several cards
therefore gets several statements. This follows the BR-01 wording and the Purpose line "one statement per card/account".

**C2. Customer and account are looked up through the xref.** The customer is found by XREF-CUST-ID and the account by
XREF-ACCT-ID (DT-17: "xref → customer → account → transactions").

**C3. A card whose customer or account is missing is skipped.** It is listed in `runSummary.skippedCards`, and the run
still produces the other statements. The wiki is silent on this. The batch chain's BR-02 ("a failing step stops the
chain") argues for aborting, but I chose not to lose every statement over one bad xref row.

**C4. A card's transactions are those whose TRAN-CARD-NUM equals the xref card number.** They are printed in
transaction-id order, with file order kept on ties. BR-02 says transactions are "keyed by card number + transaction id".
Transactions for a card that is not on the xref are not printed; they are counted in
`runSummary.transactionsWithoutXref`.

**C5. Statement period: none. Every transaction in `transact.dat` is printed.** The configuration dependency reads
"{{TODO: legacy prints all transactions on file; confirm cycle filter requirement}}". The contract describes
`transact.dat` as "the day's combined transaction file".

**C6. Total EXP is the signed sum of the printed amounts, so credits and refunds reduce it.** BR-03: "total expenditure =
sum of amounts". AC-2: "total equals the sum of the amounts". A card with no transactions prints an empty transaction
block and `Total EXP` of zero (AC-4).

**C7. No volume limits.** BR-06 says the legacy in-memory table is replaced. Any table limits it had are not reproduced.

## D. Field content

**D1. FICO Score field holds the band text, not the number.** BR-07 / DT-17 / AC-7: below 580 Poor, 580–669 Fair,
670–739 Good, 740–799 Very Good, 800 and above Exceptional. If the score is blank or non-numeric, the field is left
blank. The wiki does not cover that case; DT-02 marks the score not required.

**D2. Customer name: CBSTM03A STRING semantics.** The name is built from first, middle and last name. Each part is
taken up to its first space and followed by one space (`STRING ... DELIMITED BY ' '`), then cut to X(75). Consequences:
- a multi-word name part keeps only its first word
- an empty middle name leaves two spaces between first and last name

The wiki only says "customer name". I followed the legacy because of "Output ... Same". **Uncertain:** if the oracle
joins trimmed parts instead, names with an empty middle name or a multi-word part will differ.

**D3. Address line 3 (X(80)): address line 3, state, country and zip, with the same STRING semantics as D2.** This has
the same truncation effect, for example "West Bernita" becomes "West". plugin-statement-document lists the customer block
as "name, address (3 lines, state, zip)", without country. The legacy STRING includes country, and the wiki says the
output is the "Same" as the legacy, so I kept country. **Uncertain — conflicting wiki statements.**

**D4. Address lines 1 and 2 are printed as stored, in X(50).** The wiki is silent.

**D5. Account ID is ACCT-ID from the account record.** That is 11 digits with leading zeros, left-aligned in X(20).
DT-17 sources accountId from the xref; the value is the same.

**D6. Current Balance is ACCT-CURR-BAL, edited as `9(9).99-`.** The source is S9(10)V99, so a tenth integer digit would
be lost, as in a COBOL MOVE. The picture comes from the contract; the source field from DT-17 ("currentBalance —
Account").

**D7. Transaction lines.** Transaction ID is TRAN-ID X(16). Transaction details are the first 49 characters of
TRAN-DESC. Amount is TRAN-AMT edited as `Z(9).99-`. BR-03 says "id, description, amount".
`{{TODO: confirm line layout from COSTM01}}` is resolved by the contract's line table.

**D8. `Z(9).99-` is edited the COBOL way.** Leading zeros print as spaces, so zero prints as 9 spaces, `.00` and a space.
The sign is `-` or a space.

**D9. Fields the plugin lists but the contract has no slot for are not printed.** That covers phone, credit limit, and
cycle credit/debit (plugin "Content" table). The contract fixes the printed lines.

## E. Output formatting

**E1. Text lines are padded or cut to exactly 80 characters, and HTML lines to exactly 100.** CONTRACT.md says "padded
to 100". A filled HTML line that would exceed 100, such as a 75-character name inside the `<p style=...>` wrapper, is cut
at 100, as a fixed 100-byte record would be.

**E2. HTML name and address paragraphs.** These are the right-trimmed value followed by two spaces and `</p>`, as the
contract shows them (`{customer name}  </p>`). The X(n) fields in the contract — account ID, FICO, transaction ID,
details — keep their padding inside the tag.

**E3. The HTML statement has no total line.** The contract's closing block has no total in it.

**E4. Statements are concatenated in one output each.** Each text statement runs from `START OF STATEMENT` to
`END OF STATEMENT`. Each HTML statement is a complete `<!DOCTYPE html>` ... `</html>` document.

## F. Operational

**F1. Size limit.** Data moves between nodes as JSON strings. Every FlowX SCRIPT node has a payload cap of about 1 MB,
and CardDemo-sized files are far below it. A much larger `transact.dat` would need a paged design: the wiki's
`READ_FILE_PAGE` cursor in workflow-batch-file-transfer.

**F2. `runSummary` (a JSON string) is an extra output for the batch operator.** It holds input counts, statements
produced, transactions printed, skipped cards and parse warnings. The process flow has a "Build Run Summary" step.
