# CREASTMT (statement generation, P-17): assumptions and decisions

FlowX project `cd_creastmt_zflx_sonnet_r3` (WIP version `<uuid>`), host `<dev-environment>`.

What was built:

| Resource | Id | Role |
|---|---|---|
| Workflow `creastmt_statement_generation` | resourceId `<uuid>`, resDefId `<uuid>` | START (input: `transact`, `acctdata`, `cardxref`, `custdata` as file text) → SCRIPT *Read Files and Build Statement Data* → SCRIPT *Render Statements Text and HTML* → END (output: `creastmt_statements`, `creastmt_statements_html`, `statementCount`, `warnings`) |
| Process `statementGeneration` | resourceId `<uuid>` | P-17 entry point: Start → Send/Receive to the workflow → End. Data under `statementRun.*`. It has an INPUT slice on Start and an OUTPUT slice on End, so `end-of-day-batch-chain` can call it as a Call Activity. |

The script sources are also kept in `src/`. `sample_run/` holds a synthetic test input and the output it produced. It is not oracle data.

Each entry below gives the decision, then the wiki statement (or gap) it rests on. **L** marks a decision taken from my knowledge of the public CardDemo `CBSTM03A` source, where the wiki says nothing. I used that source because the wiki's acceptance criteria page says *Legacy Comparison → Output: STMTFILE and HTMLFILE → "Same"*. I recalled it; I did not re-read it, so it is the least certain part of this list.

## A. Architecture

1. **Input files reach the workflow as text, and the outputs come back as text.** The wiki routes all reads through `workflow-batch-file-transfer` (Kafka `batch-file-gateway`, READ_FILE_PAGE) and the `carddemo-datastore` NOSQL_DB (`workflow-account-data-access`, `workflow-transaction-data-access`). It sends the rendering to a Document Plugin with templates `statement-html` / `statement-text`. None of those systems exist in this environment. CONTRACT.md defines a run as "files given per run", and says a run "may return the same lines as one string (lines joined by `\n`) … under the file's name without extension". So file reading, data access and template rendering are done in two SCRIPT nodes. The node split follows the process flow's "Build Statement Data" → "Request Document Generation".
2. **No loop subprocess.** BR-06 says the legacy ALTER/GO TO and 2-D array become "a loop subprocess". The loop over cards runs inside the build script instead. It produces the same thing (one StatementData per card) in a single node execution, without one subprocess instance per card. Consequence: the legacy table limits (51 cards × 10 transactions per card) do not apply. Every card and every transaction is printed.
3. **No PDF and no delivery.** Acceptance scenario 6 marks PDF as "Not available in legacy". Scenario 5 (delivery) is an open `{{DECISION: delivery channel}}`. Neither is in CONTRACT.md, so neither is built.
4. **The template-id configuration parameters (`statement-html`, `statement-text`) are not created**, because no Document Plugin template is used (see 1).
5. **BR-05** (corrupt STMTFILE DD, finding F-14) needs no action. The output files are defined by CONTRACT.md.

## B. Reading the input files

6. Record layouts and offsets: `transact.dat` uses CVTRA05Y (350), `acctdata.dat` CVACT01Y (300), `cardxref.dat` CVACT03Y (50), `custdata.dat` CUSTREC (500). CONTRACT.md names CUSTREC; the wiki's DT-02 cites CVCUS01Y, and the two have the same field positions. Fields used:
   - transaction: id 1–16, description 33–132, amount 133–143, card 263–278
   - account: id 1–11, current balance 13–24, credit limit 25–36
   - xref: card 1–16, customer id 17–25, account id 26–36
   - customer: id 1–9, names 10–84, address lines 85–234, state 235–236, country 237–239, zip 240–249, FICO 330–332
7. Line handling (the wiki and contract only say "one record per line"):
   - `\r\n` is accepted.
   - Blank lines are skipped.
   - Lines shorter than the record length are padded with spaces, since trailing spaces may have been stripped.
   - A file with no line breaks whose length is a multiple of the record length is cut into records.
8. Signed amounts (`S9(n)V99`, DT-01 / DT-05; the wiki only notes signed overpunch for discgrp) are read as zoned decimal with an implied 2 decimals. The last character may be a digit, an EBCDIC-style overpunch (`{`,`A`–`I` positive; `}`,`J`–`R` negative) or an ASCII/GnuCOBOL negative overpunch (`p`–`y`). A field with an explicit `.` or a leading/trailing `+`/`-` sign is also accepted. Calculations use integer cents.
9. Customer and account ids are matched by numeric value, so leading zeros do not matter. If a key appears twice, the first record wins, as a KSDS load would keep it. The wiki does not cover duplicates.

## C. Which statements, which transactions, in what order

10. **One statement per CardXref record, in card-number order.** BR-01: "Statement driven by CardXref order (card number)". The xref records are sorted by card number with a stable sort; a file that is already in key order is unchanged. Two cards on the same account give two statements, each listing only its own card's transactions (BR-02 keys transactions by card number).
11. **All transactions on file are printed. There is no statement-period filter.** The wiki has `{{TODO: legacy prints all transactions on file; confirm cycle filter requirement}}` and gives no period parameter.
12. **Transactions within a statement are ordered by transaction id.** BR-02 says the transactions are a sorted copy keyed by card number + transaction id. Ties keep file order.
13. **A transaction whose card has no xref record is not printed.** Statements are driven by the xref (BR-01).
14. **If the customer or account of an xref record is missing, that card gets no statement and a line is added to the `warnings` output.** The wiki is silent on this. The legacy program abends at that point (L). For a migrated batch, skipping the card and reporting it seemed better than stopping the whole run. If the oracle data is consistent, this never happens.
15. **A card without transactions still gets a full statement with an empty transaction block and a zero total** (acceptance scenario 4). The total prints as `         .00 ` per the contract picture `Z(9).99-`.

## D. Statement content

16. **Customer name (text line 1) = first, middle and last name, each cut at its first space, each followed by one space, in a 75-character field** (L: `STRING … DELIMITED BY ' '`). The wiki only says "customer name". Two visible effects:
    - A blank middle name gives a double space ("Mary  Smith").
    - A multi-word first name keeps only its first word ("Mary Ann" → "Mary").
17. **Address line 3 (text line 4) = address line 3, state, country code and ZIP, each cut at its first space and followed by one space** (L). The plugin page lists "address (3 lines, state, zip)" and DT-02 has a country code. A city made of several words keeps only its first word ("New Altenwerth" → "New"). Address lines 1 and 2 are printed unchanged. The acceptance page asks to "verify … the address formatting" and gives no rule, so this is the most uncertain content rule.
18. **HTML name and address paragraphs** show the same values cut at their first double space (L: `DELIMITED BY '  '`), followed by the literal `  </p>` that CONTRACT.md shows. Consequence: with a blank middle name, the HTML shows only the first name.
19. **Account ID** is the 11-digit `ACCT-ID` from the account record, zeros kept, in an `X(20)` field. DT-17 says the account id comes from the xref; it is the same value because the xref is the lookup key.
20. **Current balance** uses `9(9).99-`, from CONTRACT.md. The account field is `S9(10)V99`, so a 10th integer digit would be lost, as in a COBOL MOVE. Zero prints with a blank sign.
21. **FICO score** is the customer's 3-digit `CUST-FICO-CREDIT-SCORE` as stored (e.g. `058`), in an `X(20)` field.
22. **Transaction details** are the transaction description cut to 49 characters. The wiki says "transaction id, description, amount", and BR-03 has `{{TODO: confirm line layout}}`; X(49) comes from CONTRACT.md. Merchant data is not printed.
23. **Total expenditure** is the signed sum of the printed transaction amounts of that card (BR-03, acceptance scenario 2). Refunds and credits reduce it. The total restarts at zero for every statement.
24. Plugin-page items **not printed**, because CONTRACT.md's line layouts have no place for them:
    - statement date
    - phone
    - credit limit
    - cycle credit / cycle debit
    - an HTML total row

    SSN is not printed either, as the plugin page says. Credit limit is still carried in the StatementData built by node 1.
25. **Text column header (line 13):** `Tran ID` padded to 16, `Tran Details` padded to 51, then `  Tran Amount` with the two padding spaces *before* the text, so it ends at column 80 above the amount (L: a 13-character filler `'  Tran Amount'`). CONTRACT.md says only "(80 in all)".
26. **HTML account-number heading** is `<h3>Statement for Account Number: ` + account id `X(20)` + `</h3>`, with the space after the colon exactly as the contract prints it. The HTML Basic Details rows likewise follow the contract's `label : value` text literally.
27. All fixed HTML lines are copied exactly from CONTRACT.md, including the double space in `<table  align=…`. The `--- transaction block ---` / `--- closing block ---` markers are read as separators, not as output lines.

## E. Output format

28. Each output is one string, with lines joined by `\n` and no trailing newline, under the file name without extension: `creastmt_statements` and `creastmt_statements_html`.
    - Text lines are returned at their full 80 columns.
    - HTML lines are cut at 100 columns and returned **without trailing spaces**, which CONTRACT.md allows. This keeps the run payload well below the script runner's 1 MB limit for a full CardDemo file set.
29. Within each output, the statements follow the order of item 10. Each HTML statement is a complete `<!DOCTYPE html>…</html>` document, repeated once per statement in the same file, as CONTRACT.md lays it out.
