# CREASTMT (statement generation) — FlowX build: assumptions and decisions

Build: FlowX project `cd_a21_yx3_zflx_r1` (dev-env, WIP version `<uuid>`, not committed),
workflow `creastmt_statement_generation` (resourceId `<uuid>`,
resourceDefinitionId `<uuid>`).

Flow: `Start → Parse input files → Build statement data → Render statements → End` (three JavaScript SCRIPT nodes).

| Contract | Workflow |
|---|---|
| `transact.dat`, `acctdata.dat`, `cardxref.dat`, `custdata.dat` | INPUT `transactDat`, `acctdataDat`, `cardxrefDat`, `custdataDat` (file contents as text) |
| `creastmt_statements.txt` | OUTPUT `creastmt_statements` (lines joined by `\n`) |
| `creastmt_statements_html.txt` | OUTPUT `creastmt_statements_html` (lines joined by `\n`) |
| — | OUTPUT `statementCount`, `transactionLineCount`, `skippedCards` (the "Build Run Summary" step) |

Each entry below gives the decision and the wiki statement (or the gap) it rests on.

## A. Architecture

**A1. One integration workflow; no process and no datastore.**
The wiki builds a process: SEND/RECEIVE `GET_STATEMENT_DATA`, a loop subprocess per card, data read through `account-data-access` / `transaction-data-access` on the `carddemo-datastore` NOSQL_DB system, and output written through `batch-file-transfer`. CONTRACT.md instead fixes file inputs given per run and fixed-width line outputs. The build therefore takes the four files as inputs and returns the two outputs directly. Parse, build and render cover the wiki's Receive, Build Statement Data and Request Document Generation steps.
The datastore and file-gateway workflows are not built. The wiki's paging DECISION for `batch-file-transfer` (Kafka message size) does not apply because the files arrive in one run input.

**A2. Rendering is done in a script, not by the Document Plugin templates `statement-text` / `statement-html`.**
Process Data Mapping and `plugin-statement-document` describe the rendering. However, the plugin page itself says "{{TODO: confirm the exact statement line layouts in CBSTM03A}}", while the contract fixes every line and position. A script reproduces those lines exactly; a template engine would not. As a result, `statementDocumentRef` (DT-17) is not produced.

**A3. The "loop subprocess" (BR-06) is a loop over the cross-references inside `Build statement data` / `Render statements`.**
BR-06 only requires that ALTER/GO TO and the 2-D array are replaced by a loop. Consequently, none of the legacy table-size limits are applied: any number of cards and transactions per card is allowed.

## B. Selection and ordering

**B1. One statement per CardXref record, in ascending card-number order.**
Source: BR-01 "Statement driven by CardXref order (card number)". The xref file is sorted by card number before use, in case the given file is not already in key order.

**B2. Two cards on the same account give two statements.**
Each statement lists only its own card's transactions, and each statement shows the account's balance.
- BR-01 drives statements by xref, i.e. by card.
- The process Purpose says "one statement per card/account".
- The plugin page says "transaction id, description, amount per card of the account".
The wiki does not say whether one account's cards are merged; this choice follows the per-card reading.

**B3. All transactions in `transact.dat` for the card are listed; there is no statement-period filter.**
Source: Configuration Dependencies "{{TODO: legacy prints all transactions on file; confirm cycle filter requirement}}". The run parameter business date is therefore not used.

**B4. Within a statement, transactions are listed in ascending transaction-id order.**
Source: BR-02, which describes a sorted copy keyed by card number + transaction id.

**B5. An xref whose customer or account is missing produces no statement and is listed in `skippedCards`.**
The wiki is silent on this case. The account-data-access error table only defines "not found → found=false" for online use.

## C. Statement content

**C1. Customer name: first, middle and last name, each cut at its first space, joined by single spaces with a trailing space.**
This is the legacy CBSTM03A rule (`STRING ... DELIMITED BY ' '`). The wiki says only "customer name" (DT-17 "customerName ← Customer"), and the acceptance criteria ask to "verify the address formatting" without defining it, so I followed the legacy program the wiki names as the source.
Consequences:
- A multi-word name keeps only its first word.
- An empty middle name leaves two spaces ("Larry  Homenick").

**C2. Address line 3 is `addressLine3 state country zip`, each part cut at its first space and separated by single spaces.**
This is also the legacy rule.
- The plugin page lists "address (3 lines, state, zip)", which omits the country.
- The contract gives line 4 as X(80), unlike X(50) for lines 1–2, which fits a composed line.
- I included the country, as the legacy program does.
- A multi-word city keeps only its first word (e.g. "West Bernita" → "West").

**C3. Address lines 1 and 2 are the customer address fields as stored.**
They are truncated or padded to X(50) per the contract.

**C4. In the HTML, the name and address lines carry no field width.**
The contract shows `{customer name}  </p>` with no picture. Each value is cut at its first double space (the legacy `DELIMITED BY '  '`) and followed by the literal `  </p>`. For the composed name, this stops at the double space an empty middle name leaves ("Larry").

**C5. Account ID is the 11-digit account id with leading zeros, left-aligned in X(20).**
Source: DT-01 `accountId String(11) numeric` and the contract field X(20).

**C6. Current balance is the account's `currentBalance` as it appears in `acctdata.dat` (after posting and interest).**
It is printed as `9(9).99-`. The source field is S9(10)V99, so a balance of 1,000,000,000.00 or more loses its high-order digit, as a COBOL MOVE would. The wiki is silent on overflow.

**C7. FICO Score field: band name per BR-07.**
- Below 580 → `Poor`
- 580–669 → `Fair`
- 670–739 → `Good`
- 740–799 → `Very Good`
- 800 and above → `Exceptional`

A blank or non-numeric score is treated as 0, giving `Poor`. DT-02 marks `ficoScore` as not required, and the wiki does not say what to print when it is missing.

**C8. Transaction line: transaction id, description cut to 49 characters, amount as `Z(9).99-`.**
Source: BR-03 "transaction id, description, amount" and the contract's X(49). "Tran Details" is the description only; no merchant or other data is added.

**C9. The total is the signed sum of every listed amount, so credits and returns reduce it.**
Source: BR-03 "total expenditure = sum of amounts" and AC 2 "total equals the sum of the amounts". Nothing in the wiki excludes negative amounts. A card with no transactions gets the full header and footer, an empty detail block and `Total EXP: $ .00` (AC 4).

**C10. Not printed:**
- phone
- credit limit
- cycle credit/debit
- statement date

The plugin "Content" table lists these, but the contract line layouts have no place for them, and the contract fixes the format. SSN is not printed (plugin page).

**C11. Not implemented:**
- Delivery (AC 5, `{{DECISION: delivery channel}}` still open).
- PDF (AC 6 "not available in legacy").
- BR-05: the corrupted STMTFILE DD has no effect, since the outputs are named by the contract.

## D. Input and output handling

**D1. Inputs are one record per line.**
- Blank lines are ignored.
- A short line is padded with spaces to its copybook length.
- Field positions come from the copybooks: CVTRA05Y, CVACT01Y, CVACT03Y and CUSTREC (FICO at 330–332, address at 85–249).

**D2. Signed amounts are read as zoned decimal with an implied 2 decimals and the sign overpunched in the last byte.**
- `{`/`A`–`I` mean positive.
- `}`/`J`–`R` mean negative.

A leading or trailing `-`/`+` or an explicit decimal point is also accepted. Amounts are handled as integer cents, with no floating-point rounding. Source: the data-model note on overpunch (DT-07).

**D3. Output: each file is returned as one string with lines joined by `\n`, which the contract allows.**
- Text lines are padded to 80.
- HTML lines have trailing spaces removed (allowed by the contract), which keeps the payload small. Spaces inside a line, such as the X(20)/X(49) padding before `</p>`, are kept.

## Running it on the real inputs

Start the workflow with the four file contents as the input body:

```json
{"transactDat": "<transact.dat>", "acctdataDat": "<acctdata.dat>", "cardxrefDat": "<cardxref.dat>", "custdataDat": "<custdata.dat>"}
```

Then write `creastmt_statements` to `creastmt_statements.txt` and `creastmt_statements_html` to `creastmt_statements_html.txt`.

The real input files were not available in this directory, so no real outputs are included. `sample_run/` holds the result of a run on a small synthetic fixture covering:
- 3 transactions with mixed signs
- a card with no transactions
- FICO scores 623 / 711 / 793
- an xref with no customer or account
