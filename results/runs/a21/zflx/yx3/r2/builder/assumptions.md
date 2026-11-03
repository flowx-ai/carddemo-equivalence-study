# Statement generation (CREASTMT / P-17) — assumptions

Implementation: FlowX project `cd_a21_yx3_zflx_r2`, workflow `creastmt_statement_generation`
(resourceId `<uuid>`, resourceDefinitionId `<uuid>`).

Each entry: what I decided, and the wiki statement (or gap) it rests on. Where a decision follows the
open-source CBSTM03A program rather than the wiki, it says so — that is my recollection of the legacy
code, not something the wiki states.

## A. Architecture

| # | Decision | Rests on |
|---|----------|----------|
| A1 | One DEFAULT integration workflow instead of the wiki's Process (send/receive per card, loop subprocess, data-access workflows on `carddemo-datastore`, document plugin). Node sequence keeps the wiki's steps: Read input files → Build statement data per card → Render statement-text → Render statement-html → Build run summary. | Process page "Process Flow" + BR-06 (loop replaces ALTER/GO TO). CONTRACT supplement: the inputs are files given per run and outputs are line files, so there is no persistent store to query; the contract fixes only I/O. |
| A2 | Inputs are the file contents as strings: `transact`, `acctdata`, `cardxref`, `custdata` (file name without extension). Outputs are `creastmt_statements` and `creastmt_statements_html`, lines joined by `\n`; also `statementCount` and `runMessages`. | CONTRACT supplement: "a run may return the same lines as one string (lines joined by \n) ... under the file's name without extension". Input form is not specified. |
| A3 | The text/HTML "templates" (`statement-text`, `statement-html`) are SCRIPT renderers, not Document Plugin templates. | Plugin page names a template-based Document Plugin, but that produces PDF/DOCX; the contract requires fixed-width text lines. |
| A4 | No delivery, no PDF, no `statementDocumentRef` persisted. A `statementId` (`STMT-<cardNumber>`) is built in StatementData but not printed. | AC #5 is `{{DECISION: delivery channel}}` @manual; AC #6 PDF "not available in legacy"; DT-17 `statementId` "New" with no format. |

## B. Input reading

| # | Decision | Rests on |
|---|----------|----------|
| B1 | Field positions from the copybooks: CVACT03Y (card 1-16, cust 17-25, acct 26-36), CUSTREC (names 10/35/60 ×25, addr lines 85/135/185 ×50, state 235-236, country 237-239, zip 240-249, FICO 330-332), CVACT01Y (id 1-11, curr bal 13-24), CVTRA05Y (id 1-16, desc 33-132, amt 133-143, card 263-278). | CONTRACT "layouts as in the copybooks"; data model DT-01..DT-05 sizes. |
| B2 | Short lines are space-padded to the record length; blank lines ignored; `\r\n` accepted. | Silent; CONTRACT allows trailing spaces to be omitted on outputs, so inputs may be trimmed too. |
| B3 | Signed amounts (`S9(n)V99`) parsed as zoned decimal with an overpunch last byte (`{A-I` positive, `}J-R` negative, also ASCII `p-y` negative); an explicit `+`/`-` or a decimal point is also accepted. | DT-07 notes the seed files use signed overpunch (`0150{`); not stated for transact/acctdata. |
| B4 | Ids are matched numerically (leading zeros ignored): xref cust id → customer, xref acct id → account. First record wins on a duplicate key. | Relationships: "Card → Customer via CardXref"; DT-04 FKs. Duplicates not addressed. |

## C. Selection and order

| # | Decision | Rests on |
|---|----------|----------|
| C1 | One statement per CardXref record, in ascending card number. | BR-01 "Statement driven by CardXref order (card number)"; AC #1 "One statement per card". |
| C2 | A card's statement lists the transactions whose card number equals the xref card number, sorted by card number + transaction id (ascending, character compare). | BR-02 (sorted copy keyed card + tran id, key length 32). |
| C3 | All transactions in `transact.dat` are printed — no cycle/date filter. | Config Dependencies: "{{TODO: legacy prints all transactions on file; confirm cycle filter}}". |
| C4 | Transactions of a card not in the xref file are not printed anywhere. | Statements are xref-driven (BR-01); silent on orphans. |
| C5 | A card with no transactions still gets a statement, total `.00`. | AC #4 "Statement with zero total". |
| C6 | If the customer or account of an xref is not found, that card gets no statement, the run continues and the card is reported in `runMessages`. | Silent. Legacy CBSTM03A abends on INVALID KEY (recollection); I chose not to stop the batch. |
| C7 | No limit on cards or transactions per card. | BR-06 mentions the legacy 2-D array; the wiki gives no size. (Recollection: CBSTM03A's table is 51 cards × 10 transactions and overflows silently — not reproduced.) |

## D. Content of the fields

| # | Decision | Rests on |
|---|----------|----------|
| D1 | Customer name = first, middle, last name, each taken up to its first space, each followed by one space, truncated to 75 (so an empty middle name gives two spaces). | Silent (DT-17 "customerName ← Customer"; AC "verify ... address formatting"). Follows CBSTM03A `STRING ... DELIMITED BY ' '` (recollection). |
| D2 | Address lines 1 and 2 printed as stored (X(50)). Address line 3 = addr line 3, state, country, zip, each up to its first space, joined by single spaces, X(80). So a multi-word city prints only its first word ("East Jaylen" → "East"). | Plugin "address (3 lines, state, zip)" — no country and no build rule. Follows CBSTM03A `STRING ... DELIMITED BY ' '` (recollection); contract line 4 is X(80). |
| D3 | Account ID printed as the 11-digit ACCT-ID with leading zeros, left-aligned in X(20). | CONTRACT X(20); DT-01 String(11) numeric. |
| D4 | Current balance in `9(9).99-` from ACCT-CURR-BAL (S9(10)V99), high-order digit truncated as a COBOL MOVE would. | CONTRACT picture; DT-01. |
| D5 | FICO field = band text, X(20): <580 `Poor`, 580–669 `Fair`, 670–739 `Good`, 740–799 `Very Good`, ≥800 `Exceptional`. A blank/non-numeric score prints blank. | BR-07 / DT-17. Missing score not covered (ficoScore not required, DT-02). |
| D6 | Transaction line: tran id X(16), description truncated to 49, amount `Z(9).99-`. Total EXP = signed sum of the printed amounts (credits reduce it), `Z(9).99-`. | BR-03 "total expenditure = sum of amounts"; AC #2; CONTRACT line 14/14A. No sign filtering is mentioned, so none applied. |
| D7 | Credit limit, cycle credit/debit and phone are carried in StatementData but not printed. | Plugin "Account summary" lists them, but the CONTRACT layouts have no such lines; CONTRACT wins on format. |
| D8 | SSN not printed. | Plugin page "SSN is not printed". |

## E. HTML specifics

| # | Decision | Rests on |
|---|----------|----------|
| E1 | Every statement is a complete HTML document (`<!DOCTYPE html>` … `</html>`); every line padded/truncated to 100. | CONTRACT "one statement, lines in this order", 100-col. |
| E2 | `{customer name}` and `{address line n}` = the text field up to its first double space (i.e. trailing padding removed), followed by the literal `  </p>`. With an empty middle name the HTML name shows the first name only. | CONTRACT shows `{customer name}  </p>` with no width; the double-space cut is my reading of the legacy delimiter. |
| E3 | Fields with a width in the contract (`account ID X(20)`, `FICO score X(20)`, `transaction ID X(16)`, `transaction details X(49)`) keep their trailing spaces inside the tag. | CONTRACT pictures. |
| E4 | No HTML escaping of data (`&`, `<`). The `<table  align=...>` line keeps the double space as shown. No total row in HTML. | CONTRACT fixed lines; legacy writes raw text. |
