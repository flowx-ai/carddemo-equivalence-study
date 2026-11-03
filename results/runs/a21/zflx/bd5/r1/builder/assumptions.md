# Statement generation (CREASTMT / P-17) — assumptions

Implementation: FlowX workflow `creastmt_statement_generation` in project `cd_a21_bd5_zflx_r1`
(resourceId `<uuid>`, resourceDefinitionId `<uuid>`).
Each entry gives the decision and the wiki statement it rests on (or the absence of one).

## Architecture

1. **One integration workflow instead of the process + data-access workflows + document plugin.**
   The wiki's target design (process-statement-generation flow; workflow-account-data-access,
   workflow-transaction-data-access over the `carddemo-datastore` NOSQL_DB; workflow-batch-file-transfer over a
   Kafka `batch-file-gateway`; plugin-statement-document) assumes a persistence layer and a file gateway that do not
   exist for this step. CONTRACT.md fixes the I/O as the raw fixed-width files in and text lines out. So the
   steps "Build Statement Data" and "Request Document Generation" are SCRIPT nodes
   (Start → Build Statement Data → Render Text Statements → Render HTML Statements → End). BR-06 ("FlowX replaces
   [the ALTER/GO TO driver] with a loop subprocess") is met with an in-script loop over CardXref records rather than
   a subprocess per card.
2. **Rendering is not done with a FlowX document template.** The plugin page says the formats are "text (80 columns)
   and HTML as in legacy" and has a TODO: "confirm the exact statement line layouts in CBSTM03A (not analyzed in
   detail)". FlowX TEMPLATE_FILLING produces PDF/DOCX, not fixed-width lines, so the line layouts come from the
   CONTRACT layer-1 supplement. The PDF format (AC-6, "not available in legacy") and delivery
   (AC-5, `{{DECISION: delivery channel}}`) are not implemented, and statements are not persisted to a
   `statements` collection.
3. **Inputs** are passed as the full text of each file (`transact`, `acctdata`, `cardxref`, `custdata`).
   **Outputs** are returned as one string per file, lines joined by `\n`, under `creastmt_statements` and
   `creastmt_statements_html`. CONTRACT allows this form. Trailing spaces are omitted, which CONTRACT also permits.

## Which records go into a statement

4. **One statement per CardXref record, in ascending card-number order.** BR-01: "Statement driven by CardXref order
   (card number)"; AC-1: "One statement per card". The xref records are sorted explicitly, so the order does not
   depend on the input file already being in key order.
5. **A statement lists the transactions whose TRAN-CARD-NUM equals the xref card number.** BR-02: "Transactions are
   keyed by card number + transaction id". Sharing a card's account is not enough: a second card on the same
   account gets its own statement with its own transactions. The plugin page's "per card of the account" is read
   the same way.
6. **Transaction lines are in ascending transaction-id order within the card.** BR-02: the "sorted copy
   TRXFL.SEQ … key card number + transaction id". When two records have the same id, they keep their file order.
7. **There is no statement-period or date filter: every transaction on file is printed.** process-statement-generation
   Configuration Dependencies: "{{TODO: legacy prints all transactions on file; confirm cycle filter requirement}}".
   Nothing defines a filter, so the legacy behaviour is kept.
8. **There is no filter on account or card status (active / inactive).** The wiki defines none for this step.
9. **An xref whose customer or account is missing still produces a statement.** The missing parts print blank, the
   balance prints as zero, and a warning is added to `statementWarnings` in workflow state. The wiki is silent for
   batch; workflow-account-data-access only says "found = false → process shows the not found message", which has no
   batch equivalent. AC-1's "one statement per card" was given precedence.

## Values and totals

10. **Total EXP = the sum of the transaction amounts greater than zero.** Credits and returns are listed with their
    sign and not subtracted; a zero amount adds nothing. Sources: BR-03, DT-17 `totalExpenditure`, the plugin's Totals
    row, AC-2 and AC-7 (100.00 + 40.00 − 30.00 → 140.00). A card with no transactions prints a zero total (AC-4).
    BR-03's TODO concerns only the line layout, which CONTRACT supplies.
11. **Customer name = first, middle and last name, each trimmed of spaces, joined by single spaces.** An empty middle
    name is skipped. The wiki says only "customer name" (DT-17, plugin Customer block); it is silent on how the name
    is assembled.
12. **Address lines.** Line 1 = CUST-ADDR-LINE-1 and line 2 = CUST-ADDR-LINE-2 (trimmed). Line 3 = CUST-ADDR-LINE-3,
    state code and ZIP, joined by single spaces, empty parts skipped. The plugin's Customer block lists
    "name, address (3 lines, state, zip), phone", and CONTRACT has only three address print lines, so state and ZIP
    go onto the third. **The country code is not printed**, because the wiki's list omits it. **The phone is not
    printed**, because the CONTRACT layout has no line for it. AC "verify … the address formatting" gives no format.
13. **Account ID = the 11-digit ACCT-ID from the account record, with its leading zeros,** left-aligned in X(20). If the
    account record is missing, the xref's account id is used. DT-17: accountId comes from the xref. The wiki is silent
    on edit formatting.
14. **Current Balance = ACCT-CURR-BAL** (DT-17: currentBalance from Account), printed as 9(9).99-.
    The plugin also lists credit limit and cycle credit/debit under "Account summary". The CONTRACT layout has no line
    for them, so they are not printed.
15. **FICO Score = the 3-digit CUST-FICO-CREDIT-SCORE exactly as stored, leading zeros kept** (e.g. `080`), left-aligned
    in X(20). DT-02 types it as 9(3). The wiki is silent on its print form.
16. **Truncation:** the transaction description is cut at 49 characters, the name at 75, address lines 1–2 at 50 and
    line 3 at 80, as the CONTRACT pictures fix them. A line longer than 100 characters in the HTML output is cut at
    100 ("padded to 100").
17. **Number edits follow COBOL picture semantics.** Z(9).99- suppresses the integer zeros but always prints `.dd`, so
    zero prints as `.00`. The sign position is `-` for a negative value and a space otherwise. A value with more than
    9 integer digits loses its high-order digits, as a COBOL MOVE does. Amounts are computed in integer cents, so there
    is no floating-point rounding.

## Input parsing

18. **Signed zoned-decimal fields** (TRAN-AMT S9(9)V99, ACCT-CURR-BAL S9(10)V99) are decoded with ASCII trailing
    overpunch: `{`/`A`–`I` are +0..9 and `}`/`J`–`R` are −0..9. An explicit leading or trailing `+`/`-`, or a decimal
    point, is also accepted. CONTRACT says only "layouts as in the copybooks"; the encoding of the sign is not stated.
19. **Record lines.** Blank lines are ignored, CR/LF line endings are accepted, and a line shorter than its record
    length is padded with spaces. Keys are matched on their numeric value (customer id, account id) or on the trimmed
    value (card number).

## HTML

20. **Customer name and address values are inserted trimmed, followed by two spaces before `</p>`.** This copies the
    CONTRACT template (`{customer name}  </p>`). ID, amount and FICO fields are inserted at their full picture width
    (X(20), X(16), X(49), 9(9).99-, Z(9).99-), including any trailing spaces inside the tag.
21. **No HTML escaping of `<`, `>` or `&` in data values.** The wiki says the HTML is "as in legacy" and is otherwise
    silent.
22. **The HTML statement has no total line.** The CONTRACT HTML layout has none; the total appears only in the text
    statement.

## Operational limits

23. The workflow's SCRIPT nodes run on a runner capped at about 1 MB of input per node. The raw files are cleared from
    workflow state after parsing, but very large input files (well over ~0.8 MB together) would have to be fed in
    chunks.
