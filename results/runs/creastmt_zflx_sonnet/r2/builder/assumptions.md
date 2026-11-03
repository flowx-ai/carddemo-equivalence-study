# CREASTMT (statement generation) — assumptions

Implementation: FlowX project `cd_creastmt_zflx_sonnet_r2`, workflow `creastmt_statement_generation`
(resourceId `<uuid>`, resourceDefinitionId `<uuid>`).

Each entry: what was decided, and the wiki statement (or absence of one) it rests on.

## A. Platform shape

| # | Decision | Rests on |
|---|----------|----------|
| A1 | The step is one DEFAULT integration workflow. Its nodes follow the wiki process flow: *List cross references* → *Build statement data per card* (the "for each card" loop, including the GET_STATEMENT_DATA lookup) → *Render statement-text* → *Render statement-html* (the two document templates) → *Build run summary*. No BPMN process, NOSQL `carddemo-datastore` collections or Kafka `batch-file-gateway` were built. | Process page: flow and integrations. CONTRACT.md: the inputs are fixed-width files given per run and nothing else, so there is no datastore to read. BR-06: the legacy loop is replaced by a loop. |
| A2 | Inputs are the file contents as strings: `transactFile`, `acctdataFile`, `cardxrefFile`, `custdataFile` (`transactFile` is optional, so an empty file is allowed). Outputs are returned as one string per file under the file name without extension: `creastmt_statements` and `creastmt_statements_html`, lines joined by `\n`, no trailing newline. `runStatus`, `runMessage` and `statementCount` are returned too. | CONTRACT.md layer 1 supplement: "a run may return the same lines as one string ... under the file's name without extension". |
| A3 | The two templates are rendered by SCRIPT nodes, not by the Document Plugin / TEMPLATE_FILLING. | The plugin page asks for "text (80 columns) and HTML as in legacy"; the contract fixes exact fixed-length lines. The FlowX document plugin renders PDF/DOCX, so it cannot produce either. |
| A4 | Not produced: `statementDocumentRef`, persistence to a `statements` collection, delivery to the customer, PDF. | AC #5: delivery is an open `{{DECISION}}`. AC #6: PDF is not available in legacy. The contract lists only the two text outputs. |
| A5 | Output lines are padded to the full width (80 / 100). Longer content is truncated to the width. | BR-04. The contract allows trailing spaces to be omitted but does not require it. |

## B. Which statements and which lines

| # | Decision | Rests on |
|---|----------|----------|
| B1 | One statement per card cross-reference record, in ascending card-number order. Duplicate card numbers keep file order. Two cards on the same account give two statements with the same account and customer data. | BR-01: "Statement driven by CardXref order (card number)". Purpose: "one statement per card/account". |
| B2 | No filter on account or card status: every xref gets a statement. | The wiki is silent on status filtering. |
| B3 | A card's transactions are all records in `transact.dat` whose card number equals the xref card number. There is no date or cycle filter. Transactions for cards with no xref are not printed. | Config Dependencies: `{{TODO: legacy prints all transactions on file; confirm cycle filter requirement}}`. The legacy behaviour was kept. |
| B4 | Transaction lines are ordered by card number + transaction id (ascending). Equal ids keep input order. | BR-02: TRXFL.SEQ is a sorted copy keyed by card number + transaction id. |
| B5 | No limit on cards or transactions per card. The legacy in-memory table had fixed bounds; they are not reproduced. | BR-06: the 2-D array is replaced by a loop. The wiki gives no limits. |
| B6 | Total expenditure is the sum of all printed amounts, negatives included, and is reset for each statement. A card without transactions prints a zero total (`.00`). The running sum keeps only 9 integer digits, emulating the legacy `S9(9)V99` accumulator; this only matters above 999,999,999.99. | BR-03; AC #2 ("total equals the sum of the amounts"); AC #4 ("Statement with zero total"). The overflow behaviour is not in the wiki. |
| B7 | If an xref's customer or account record is missing, the run stops there. The statements already built are returned, with `runStatus = ERROR` and a message naming the missing key. | The wiki is silent. This mirrors the legacy program, which abends on a failed keyed read; output written before the abend remains. |
| B8 | Keys are matched numerically: xref customer id against customer id, xref account id against account id, ignoring leading zeros. If a key appears twice, the first record wins. | The wiki is silent. The data model defines these as primary keys, so duplicates are not expected. |

## C. Field content and formatting

| # | Decision | Rests on |
|---|----------|----------|
| C1 | Customer name is first, middle and last name, each taken up to its first space and separated by one space; truncated to 75 characters. An empty middle name therefore gives two spaces between first and last name. | The wiki only says "customer name" (DT-17: "customerName — Customer"). The composition follows CBSTM03A (`STRING ... DELIMITED BY ' '`). |
| C2 | Address line 1 and line 2 are `CUST-ADDR-LINE-1/2` unchanged. Address line 3 is built from four parts: address line 3, state code, country code, zip. Each part is taken up to its first space, and the parts are separated by one space. A multi-word city keeps only its first word. | Plugin page: "address (3 lines, state, zip)". AC: "verify ... the address formatting". The exact composition, including the country code, follows CBSTM03A because the wiki does not give it. |
| C3 | Not printed: phone (plugin "Customer block"), credit limit and cycle credit/debit (plugin "Account summary"), statement date (plugin "Header"). | The contract's line tables have no place for these fields. The contract fixes the format, so it wins. The plugin page itself has `{{TODO: confirm the exact statement line layouts}}`. |
| C4 | Account ID is the 11-digit account number from the account record, leading zeros kept, left-aligned in X(20). The FICO score is the 3-digit customer field as stored, in X(20); a blank score prints blank. | Contract: X(20) fields. The data model gives `ficoScore` as optional 9(3) and the wiki does not define a display rule. |
| C5 | Current balance is `ACCT-CURR-BAL` printed with `9(9).99-`. A balance at or above 1,000,000,000.00 loses its high-order digit. | Contract picture. The data model gives the source as S9(10)V99. |
| C6 | Transaction details are the first 49 characters of the 100-character description. Amounts use `Z(9).99-`, with a trailing `-` for negative amounts. | Contract: X(49) and `Z(9).99-`. BR-03: "id, description, amount". |
| C7 | HTML: customer name and address lines are inserted with trailing spaces removed, followed by the template's literal `  </p>`. The fixed fields (account ID X(20), FICO X(20), transaction ID X(16), details X(49), amounts) keep their full padded width. | The contract gives a width for the fixed fields but none for `{customer name}` / `{address line n}`. |
| C8 | Signed zoned-decimal amounts are decoded from trailing overpunch: `{`/`A`–`I` positive, `}`/`J`–`R` negative, `p`–`y` negative. Plain digits and an explicit `+`/`-` sign are also accepted. | The data model (DT-07) notes that the seed files store signed overpunch (`0150{` = 15.00). The other signed fields are assumed to use the same convention. |
| C9 | Records are read one per line. CR/LF is tolerated, blank lines are skipped, and short lines are space-padded to the copybook length. `custdata.dat` is read with the CUSTREC layout (FICO at 330–332). | CONTRACT.md inputs: fixed width, layouts as in the copybooks, trailing spaces possibly omitted. |
