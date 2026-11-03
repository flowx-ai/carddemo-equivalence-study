# Statement generation (CREASTMT / CBSTM03A-B) — assumptions and decisions

Implementation: FlowX workflow **`creastmt_statement_generation`** in project `cd_creastmt_zflx_opus_r3`
(resourceId `<uuid>`, resourceDefinitionId `<uuid>`).
Node scripts are mirrored in `flowx/`.

The wiki pages for this step are thin on behaviour. Statement content and layout are fixed by CONTRACT.md; how values are
selected and computed is mostly not described. The process page lists node names. The acceptance criteria say
**"Statement per account; figures match legacy"** and "Legacy CBSTM03* → identical figures". The document-strategy page
carries `{{TODO: Read CBSTM03A/B + COSTM01.CPY for the exact statement layout and totals.}}`. Where the wiki is silent, I
fell back on the legacy program's behaviour (CBSTM03A/CBSTM03B and the CREASTMT.JCL sort step), as I know it from the open-source
AWS CardDemo code. That code is **not** in the wiki, so every such point is listed below as an assumption.

## A. Shape of the implementation

| # | Decision | Wiki basis |
|---|----------|-----------|
| A1 | The step is one DEFAULT workflow: START → *Load Accounts + Transactions* → *Build Statement Model* → *Render Statements* → END. The inputs are the raw contents of `transact.dat`, `acctdata.dat`, `cardxref.dat` and `custdata.dat`, passed as strings `transactData`, `acctData`, `cardxrefData` and `custData`. The outputs are `creastmt_statements` and `creastmt_statements_html`: lines joined by `\n`, which CONTRACT.md allows "under the file's name without extension". | The process page has a *Scheduled Start* and loads data through a Kafka send/receive to "FlowX Persistence". CONTRACT.md says the step instead receives fixed-width files per run. The contract wins. No timer trigger is configured because the scorer starts the run. |
| A2 | The *For each account* loop and *More?* gateway from the process diagram live inside the script nodes. They are not BPMN nodes. | Process Flow diagram. A per-account token loop adds nothing for a batch of file inputs. |
| A3 | **Render PDF is not implemented.** No REST "Statement PDF Renderer" system and no `AccountStatement` document template were created. The two outputs are the legacy text and HTML statement files that TXT2PDF used to consume. | The system-statementpdf and document-strategy pages leave `{{DECISION: document plugin vs external PDF}}` open. CONTRACT.md requires only `creastmt_statements.txt` and `creastmt_statements_html.txt`. |
| A4 | **Notify Customer is not implemented.** | The process page says `{{TODO: legacy had no email; new capability}}`. Acceptance scenario 4 says `{{DECISION: in scope?}}`. The contract defines no notification output. |
| A5 | The `{ cycle }` payload and the run parameters (business date 2022-07-18, report dates) are not used to filter. Every record in `transact.dat` is a statement candidate. | The wiki never defines what a "cycle" selects. The contract calls `transact.dat` "the day's combined transaction file" and names no cycle parameter for this step. |

## B. What a statement covers

| # | Decision | Wiki basis |
|---|----------|-----------|
| B1 | One statement per **card cross-reference record**, in ascending card-number order. Customer comes from the xref customer id and account from the xref account id. An account with two cards would get two statements, each listing only that card's transactions. | The wiki says "Statement per account" and also "figures match legacy". Legacy CBSTM03A drives its loop off XREFFILE. In CardDemo data cards and accounts are 1:1, so the two readings coincide. |
| B2 | A statement lists the transactions whose `TRAN-CARD-NUM` equals the xref card number. They are ordered by card number, then transaction id, as in the CREASTMT.JCL SORT step. Transactions for cards not in `cardxref.dat` appear on no statement. | Silent. The data-mapping table only says "transaction list". |
| B3 | Every account in the xref gets a statement whatever its active status. Inactive accounts are not skipped. | Silent. Scenario 3 requires a statement even with zero activity. |
| B4 | An account with no transactions prints the full statement with no detail lines and `Total EXP:` of `.00`. | Scenario 3: "Statement with zero activity". |
| B5 | **Legacy table limit (flagged).** CBSTM03A keeps transactions in a working-storage table of 51 cards × 10 transactions, with no bounds check. By default (`emulateLegacyTableLimits` absent or `true`) the workflow reproduces that storage byte-for-byte. A card's 11th and later transactions are written into the next card's slot and get partly overwritten when that card loads. They print as garbled lines, typically with the next card's number as Tran ID and an amount from blank bytes of `.00`, and those garbled amounts are what goes into the total. Pass `emulateLegacyTableLimits: false` to list every transaction cleanly. `loadSummary` names any card with more than 10 transactions. Beyond 51 distinct cards the buffer simply extends; whatever the legacy program overwrites there is not modelled. | The wiki is silent. The emulation rests on "figures match legacy" and on my recollection of the OCCURS sizes, not on wiki text, so it is in `flags.json`. |
| B6 | Duplicate keys keep the first record in file order: a repeated transaction (card + id), a repeated xref card, or a repeated account or customer id. | Silent. The legacy files are KSDS with unique keys. |
| B7 | If an xref points at a customer or account that does not exist, processing **stops** there, as the legacy program abends. Statements already produced are returned, and `abendMessage` says what was missing. | Silent. |

## C. Field values

| # | Decision | Wiki basis |
|---|----------|-----------|
| C1 | **Customer name** (line 1, X(75)) is the first, middle and last name. Each part is cut at its first space, as in `STRING … DELIMITED BY ' '`. The parts are joined by single spaces with one trailing space, then truncated to 75. An empty middle name therefore gives a double space ("Jo  Smith"). | Silent. Contract: "customer name X(75)". The data model has firstName/middleName/lastName. |
| C2 | **Address line 1 and 2** (X(50)) are `CUST-ADDR-LINE-1` and `CUST-ADDR-LINE-2` as stored. | Silent beyond "address line 1/2 X(50)". |
| C3 | **Address line 3** (X(80)) is `CUST-ADDR-LINE-3`, then state code, country code and ZIP, each cut at its first space and space-separated with a trailing space. So the city "New York" prints as "New". The account's own `addressZip` is not used. | Silent. Contract only says "address line 3 X(80)". |
| C4 | **Account ID** is `ACCT-ID` as 11 digits with leading zeros, left-aligned in X(20). The same value goes in the HTML heading. | Contract: "account ID X(20)". The wiki types accountId as an 11-digit NUMBER. |
| C5 | **Current Balance** is `ACCT-CURR-BAL` from `acctdata.dat` (the accounts after posting and interest), printed as `9(9).99-`. It is not recomputed, and a 10th integer digit is dropped as a COBOL MOVE does. No opening or closing balance, category balances, interest or minimum due are printed. | The data-mapping row says "opening/closing balance, transaction list, totals", and the AccountStatement template lists more content. CONTRACT.md's layout has exactly one balance field, so the contract layout wins. |
| C6 | **FICO Score** is `CUST-FICO-CREDIT-SCORE` as 3 digits with leading zeros, left-aligned in X(20). | Contract: "FICO score X(20)". |
| C7 | **Transaction details** are the first 49 characters of `TRAN-DESC`. Merchant name and city are not appended. | Silent. Contract: "transaction details X(49)". |
| C8 | **Total EXP** is the signed sum of the listed transaction amounts, so credits reduce it. It is kept as S9(9)V99 and digits beyond 9 integer places are lost. | Data mapping says "totals". The formula is not given. |
| C9 | Numeric editing follows COBOL. `9(9).99-` keeps leading zeros. `Z(9).99-` blanks leading zeros, so zero prints as `.00` with the point kept. The sign position is `-` for a negative non-zero value and a space otherwise. | Contract picture notation. |
| C10 | Signed zoned amounts accept EBCDIC-style overpunch (`{ A–I` positive, `} J–R` negative), GnuCOBOL ASCII negatives (`p–y`), and plain digits as positive. | Contract: "layouts as in the copybooks". The file encoding of the sign is not stated. |

## D. HTML file

| # | Decision | Wiki basis |
|---|----------|-----------|
| D1 | The `{customer name}` and `{address line 1/2/3}` fields hold the same values as the text statement, cut at the first double space (`DELIMITED BY '  '`). Each is followed by the literal `  </p>` shown in the contract. One consequence: an empty middle name leaves only the first name on the HTML name line. | The contract shows `{customer name}  </p>` with no width. The wiki is silent. |
| D2 | Account ID and FICO keep their X(20) padding inside the tag, as in `00000000001         </h3>`. Balance and amount use the same edited pictures as the text file. | Contract HTML template. |
| D3 | The template lines are reproduced verbatim, including the double space in `<table  align=…`, with no leading indentation. | Contract HTML template. |

## E. Input and output handling

| # | Decision | Wiki basis |
|---|----------|-----------|
| E1 | Input records are split on `\n` or `\r\n`. Fully blank lines are ignored. Short lines are space-padded to the record length and long lines truncated. | Contract: "one record per line, fixed width". |
| E2 | Output lines are built at full width (80 or 100), truncated to that width, and then have trailing spaces removed. | Contract: "Trailing spaces may be omitted." |

## Verification done

The fixture run is in `test/`. It produced 3 statements:
- a card with 12 transactions, showing the B5 artefact
- a card with negative `}` and `q` overpunched amounts
- an account with no activity, a negative balance and an empty middle name

Further single-node runs checked:
- the non-emulated path
- the missing-account stop (B7)
- 10-digit balance truncation (C5)
- HTML name and address padding

Nothing has been compared against real oracle outputs, because none were provided.
