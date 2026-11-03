# Statement generation (CREASTMT): assumptions and decisions

FlowX implementation: the integration workflow `creastmt_statementGeneration` in the FlowX project
`cd_creastmt_zflx_opus_r1` (resourceDefinitionId `<uuid>`).

The wiki describes this step only at a high level. It gives a process outline, a statement *template*
with a few substitution tags, and acceptance criteria that say "figures match legacy". It also leaves
an open `{{TODO: Read CBSTM03A/B + COSTM01.CPY for the exact statement layout and totals.}}`
(document-strategy.md). So most of the record-level behaviour below follows the legacy programs
the wiki names as the source (`CBSTM03A/CBSTM03B via CREASTMT.JCL`). The wiki itself is silent on it.
Each entry gives the decision and the wiki statement (or gap) it rests on.

## A. Scope and architecture

**A1. One integration workflow, not the scheduled process with per-account send/receive loop.**
The wiki process (Scheduled Start → Load → For each account → Build Statement Model → Render PDF →
Notify → More?) is implemented as three SCRIPT nodes:
1. Load accounts + transactions
2. Build statement models (one model per statement)
3. Render

The input files arrive as workflow input (`transact`, `acctdata`, `cardxref`, `custdata` = file
contents). The outputs are returned as `creastmt_statements` and `creastmt_statements_html`
(lines joined by `\n`). CONTRACT allows exactly that ("a run may return the same lines as one string …
under the file's name without extension").
*Rests on:* CONTRACT.md fixes the inputs and outputs per run. The wiki's `{ cycle }` payload and
"FlowX Persistence" data store are not defined anywhere, and a timer start cannot receive the run's
input files. A process wrapper (timer start + send/receive to this workflow) can be added later
without changing the logic.

**A2. PDF rendering is not built.** The outputs are the two text artefacts the legacy CREASTMT step
writes (STMTFILE, HTMLFILE).
*Rests on:* the open `{{DECISION: Use the FlowX document plugin … vs an external PDF microservice}}`
(system-statementpdf.md, document-strategy.md). Also, CONTRACT lists no PDF output for this step.
The statement model built in node 2 is the input a document template or renderer would take.

**A3. "Notify Customer" is not built.**
*Rests on:* `{{TODO: legacy had no email; new capability}}` (process page) and
`{{DECISION: in scope?}}` (acceptance criteria #4). Also, no notification output appears in
CONTRACT. It is out of scope until that decision is made.

**A4. No cycle / date filter on transactions.** Every transaction in `transact.dat` whose card
number matches a cross-reference record goes on that card's statement.
*Rests on:* the wiki says only "Statement cycle" / payload `{ cycle }` and never defines a cycle. CONTRACT
describes `transact.dat` as "the day's combined transaction file", and legacy CBSTM03A applies
no date filter.

**A5. Opening/closing balance, category balances, interest and minimum due are not printed.**
*Rests on:* document-strategy.md lists them as template *content*. CONTRACT's line layout for
`creastmt_statements.txt` has no lines for them, and `tcatbal.dat` is not an input of this step. The
printed figures are the current balance and the total of the listed transactions only, as in legacy
("figures match legacy").

## B. Which statements, in what order

**B1. One statement per card cross-reference record, in ascending card-number order.**
The wiki says "Statement per account". Legacy CBSTM03A drives the loop from XREFFILE (a KSDS read
sequentially, so in card-number key order). For each record it reads the customer
(XREF-CUST-ID) and the account (XREF-ACCT-ID) and prints that card's transactions. `cardxref.dat`
is therefore sorted by card number before processing. An account with two cards would get two
statements.
*Rests on:* the acceptance criteria require "figures match legacy" / "identical figures". In
CardDemo data each account has one card, so "per account" and "per card" coincide there.

**B2. A cross-reference record whose customer or account is missing is skipped.** The skipped cards
are listed in the run's `skippedXrefs`.
*Rests on:* the wiki is silent. Legacy abends ("ERROR READING CUSTFILE/ACCTFILE"), which would end the
whole run. Skipping keeps the remaining statements.

**B3. A card with no transactions still gets a full statement** with no transaction lines and
`Total EXP:` of `.00`.
*Rests on:* acceptance scenario 3: "Account with no activity → Statement with zero activity".

**B4. Transactions are listed per card in ascending transaction-ID order.**
*Rests on:* the wiki is silent. Legacy CREASTMT.JCL sorts TRANSACT by (card number, transaction id)
into the TRXFL KSDS that CBSTM03A reads.

**B5. Transactions whose card is not in `cardxref.dat` are ignored.** A repeated
(card number, transaction id) pair is kept once (first occurrence), as a KSDS REPRO would.
Duplicate cross-reference card numbers likewise keep the first record. Duplicate customer/account
keys use the first record.
*Rests on:* the wiki is silent.

**B6. No limit on cards or transactions per card.** Legacy CBSTM03A holds transactions in a fixed
working-storage table (51 cards × 10 transactions) with no overflow check. This implementation lists
every transaction. If the oracle data has more than 10 transactions for one card, legacy output for
that card is undefined (table overflow), and this implementation will differ from it there.
*Rests on:* the wiki is silent. A table-overflow side effect is not behaviour worth reproducing.

## C. Field content

**C1. Customer name (line 1)** = first name, middle name and last name, each cut at its first
space, each followed by one space (COBOL `STRING … DELIMITED BY ' '`). A blank middle name
therefore yields a double space ("ANNA  SMITH"). The result is truncated/padded to 75.
*Rests on:* the wiki shows only `${customer.firstName}` and does not say how the name is assembled.
CONTRACT says how a name is built "comes from the wiki", and the wiki is silent, so legacy is followed.

**C2. Address lines 1 and 2** = CUST-ADDR-LINE-1 / -2 as stored (X(50)).
**Address line 3** = address line 3, state code, country code and ZIP, each cut at its first space
and followed by one space (legacy `STRING … DELIMITED BY ' '`). A multi-word city such as
"Spring Valley" therefore prints as "Spring". The result is padded to 80.
*Rests on:* the wiki is silent on the address layout. CONTRACT gives line 4 as "address line 3 X(80)",
which matches the legacy concatenated field.

**C3. Account ID** = the 11-digit ACCT-ID with leading zeros, left-aligned in X(20). This is the
account record's own id, read by XREF-ACCT-ID.
**FICO score** = the 3-digit CUST-FICO-CREDIT-SCORE, left-aligned in X(20).
*Rests on:* CONTRACT gives X(20) for both. The wiki gives no formatting. A numeric-to-alphanumeric MOVE
keeps the leading zeros.

**C4. Current balance** = ACCT-CURR-BAL printed `9(9).99-`, the account balance as found in
`acctdata.dat` (already after the day's posting and interest).
*Rests on:* CONTRACT ("accounts after the day's posting and interest"). The wiki's
"opening/closing balance" is not computed (A5).

**C5. Transaction line** = transaction id X(16), the first 49 characters of the transaction
description, and the transaction amount `Z(9).99-`.
*Rests on:* CONTRACT positions. The wiki's "transaction list" does not say which detail is shown;
legacy shows TRAN-DESC.

**C6. Total EXP** = the signed sum of the listed transaction amounts (debits and credits
together, no sign split), accumulated in an S9(9)V99 field. High-order digits are dropped on overflow,
as legacy `ADD` without `ON SIZE ERROR` does.
*Rests on:* the wiki says only "totals". The `Total EXP:` label and the legacy accumulator are followed.

**C7. Numeric parsing.** Signed zoned amounts are read with EBCDIC-style overpunch (`{`/`A`–`I`
positive, `}`/`J`–`R` negative). The GnuCOBOL ASCII negative (`p`–`y`), an explicit `+`/`-` sign and
an explicit decimal point are also accepted. All arithmetic is in integer cents.
*Rests on:* CONTRACT says only "layouts as in the copybooks". The physical sign encoding is not
stated anywhere.

**C8. Lookups by key compare numeric values** (XREF-CUST-ID → CUST-ID, XREF-ACCT-ID → ACCT-ID).
Card numbers compare as exact 16-character strings.
*Rests on:* the copybook PICs (9(n) keys vs X(16) card numbers). The wiki is silent.

## D. Print layout details CONTRACT leaves open

**D1. Line 13 column header**: "Tran ID" padded to 16, "Tran Details" padded to 51, then
"  Tran Amount" (two spaces + 11 characters, ending in column 80), so the heading sits over the
amount column (68–80).
*Rests on:* CONTRACT says "Tran Amount (80 in all)" without the column. Legacy ST-LINE13 is
`'  Tran Amount'` X(13).

**D2. HTML name and address lines** print the value up to its first double space, then the literal
`  </p>` (two spaces). Values containing a double space are therefore cut there: a blank middle name
prints only the first name, and an empty address line 2 prints `<p>  </p>`.
*Rests on:* CONTRACT shows `{customer name}  </p>` / `{address line n}  </p>` with no width, unlike
every other HTML field (all given as X(n)/picture). That means a variable-length value followed by
two spaces. The cut-at-double-space rule mirrors a COBOL `STRING … DELIMITED BY '  '`. **This is the
least certain decision.** If the oracle uses a plain right-trim instead, only names/addresses with
internal double spaces differ.

**D3. HTML "Basic Details" lines** print the label as in the text statement plus one space before
the value (`Account ID         : {X(20)}</p>`). The X(20) / 9(9).99- field keeps its full width,
including trailing spaces, before `</p>`.
*Rests on:* CONTRACT's HTML listing (space after the colon, fixed-width fields).

**D4. The HTML document is repeated whole for each statement** (`<!DOCTYPE html>` through
`</html>`), with no total row.
*Rests on:* CONTRACT: "one statement, lines in this order … then the closing block ends the
statement". It lists no total row.

**D5. Trailing spaces are removed from every output line.** Lines longer than the record length
(80 / 100) are truncated to it. There is no trailing newline after the last line.
*Rests on:* CONTRACT: "Trailing spaces may be omitted" and "lines joined by `\n`".

**D6. Input lines**: `\r\n` and `\n` endings are accepted, blank lines are ignored, and short lines are
right-padded with spaces to the record length.
*Rests on:* CONTRACT: "one record per line, fixed width". Trailing-space trimming of input
lines is not ruled out.

## E. Not decided here (open wiki items carried forward)

- PII (SSN, government id) and PCI (card number) masking: `{{TODO}}`s in project-data-model.md.
  Statements print neither SSN nor government id. The card number is not printed either, except as the
  grouping key.
- `ACCT-EXPIRAION-DATE` typo `{{DECISION}}`: not used by this step.
- Statement PDF renderer auth (`NO_AUTH {{TODO: confirm}}`): not used (A2).
