# Assumptions — CREASTMT statement generation (FlowX build `cd_a21_bd5_zflx_r3`)

Each entry gives the decision, then the wiki statement (or the gap in the wiki) it rests on.
"Wiki" means the pages bundled in `creastmt-sonnet-bd5.pdf`; "CONTRACT" means CONTRACT.md and
its layer 1 supplement in the same bundle. CONTRACT fixes formats and the wiki fixes behaviour.
Where the wiki was silent on behaviour, I followed the legacy program CBSTM03A, which the wiki
names as the source. The wiki's Legacy Comparison says the output is the **Same** as legacy:
"STMTFILE and HTMLFILE → document template (text + HTML) → Same". Every place where the legacy
program was the only guide is marked **[legacy-derived]**.

## A. Architecture

**A1. One FlowX workflow instead of the P-17 process topology.**
- **Decision.** The step is the DEFAULT workflow `creastmt_statement_generation`, laid out as
  START → *Build statement data* → *Render text statements* → *Render HTML statements* →
  *Build run summary* → END.
- **What it replaces.**
  - The P-17 process with its SEND/RECEIVE message pairs.
  - The per-card loop subprocess.
  - The `account-data-access` and `transaction-data-access` workflows on `carddemo-datastore`.
  - The `statement-document` plugin.
- **Basis.**
  - CONTRACT says the inputs are fixed-width files "given per run" and the outputs are
    fixed-width text files. Nothing in the wiki loads those files into the `accounts` /
    `card_xrefs` / `transactions` collections for this step.
  - BR-06 allows replacing the legacy ALTER/GO TO and 2-D table with a loop. I loop inside a
    script node, which is equivalent and avoids one process instance per card.
  - The plugin page leaves the line layouts open: "TODO: confirm the exact statement line layouts".
    CONTRACT gives them exactly, so they are rendered in script nodes rather than in document
    templates.
- **Node mapping to the wiki flow.**
  - "List Cross References" / "Get Statement Data" / "Customer Account Transactions" map to
    *Build statement data*.
  - "Request Document Generation" maps to the two *Render* nodes.
  - "Build Run Summary" maps to *Build run summary*.

**A2. I/O transport.**
- **Inputs.** The workflow input is the four file contents as strings: `transact`, `acctdata`,
  `cardxref`, `custdata`.
- **Outputs.** The two outputs come back as strings `creastmt_statements` and
  `creastmt_statements_html`, with lines joined by `\n`.
- **Basis.** CONTRACT: "Instead of a file, a run may return the same lines as one string … under
  the file's name without extension." The `batch-file-transfer` workflow (Kafka gateway) is not
  used; there is no gateway system in this environment, and CONTRACT hands the files over directly.

**A3. Delivery and storage are out of scope.**
- **Decision.** No `statements` collection write, no `statementDocumentRef`, no PDF.
- **Basis.**
  - AC 5 (Delivery) is an open `{{DECISION: delivery channel}}` tagged @manual.
  - AC 6 says PDF is "Not available in legacy".
  - CONTRACT lists only the two text outputs for this step.

**A4. BR-05 (corrupt STMTFILE DD, F-14) has no effect.** Output names come from CONTRACT.

## B. Which statements, which lines

**B1. One statement per CardXref record, in ascending card-number order.**
- **Decision.** The xref records are sorted by card number, keeping file order for ties, even if
  the file arrives unsorted.
- **Basis.** BR-01: "Statement driven by CardXref order (card number)". DT-04: the primary key
  is `cardNumber`, so a KSDS read returns key order.

**B2. Transactions on a statement are all `transact.dat` records whose card number equals the
xref card number.**
- **Decision.** No date or cycle filter is applied.
- **Basis.** The Configuration Dependencies TODO: "legacy prints all transactions on file;
  confirm cycle filter requirement". The requirement was never confirmed, so I kept the legacy
  behaviour.

**B3. Line order is card number + transaction id, ascending (byte order); ties keep file order.**
- **Basis.** BR-02: transactions are keyed by card number + transaction id (sorted copy
  TRXFL.SEQ).

**B4. No cap on cards or transactions per card.**
- **Basis.** BR-06: the legacy in-memory 2-D table is replaced. The legacy size limits are
  therefore not carried over.

**B5. Transactions whose card is not on the xref file are not printed anywhere.**
- **Basis.** BR-01: statements are xref-driven. The wiki has no "orphan transaction" output.

**B6. A card whose customer or account cannot be found is skipped and the run continues.**
- **Decision.** The skip is reported in the workflow's `runSummary` output.
- **Basis.** The wiki is silent. The legacy program abends on a failed keyed read, and a whole
  batch run lost to one bad reference seemed worse than one missing statement.
  **[decision; differs from legacy]**

**B7. The account comes from the xref account id and the customer from the xref customer id.**
- **Decision.** Ids are matched numerically, so leading zeros are ignored. For duplicate keys
  the first record wins.
- **Basis.** DT-17: built from "xref → customer → account". Relationships: "Card → Customer via
  CardXref". DT-01 and DT-02 primary keys are unique (KSDS).

**B8. A card with no transactions still gets a statement.** It has no detail lines and a zero total.
- **Basis.** AC 4: "Card without transactions → Statement with zero total".

## C. Values

**C1. Total EXP is the sum of the amounts strictly above zero.**
- **Decision.** Negative amounts (credits, returns, payments) are listed with their sign but
  not subtracted. Zero amounts add nothing.
- **Basis.**
  - BR-03: "total expenditure = sum of the charges listed (amounts above zero …); credits and
    returns are listed with their amounts but not subtracted".
  - AC 2 and AC 7 (100.00 + 40.00 + return −30.00 → total 140.00).
  - Plugin "Totals" row.
- **Caveat.** BR-03 still carries a TODO about the line layout. That TODO is about layout, not
  about the total rule, which the AC confirm.

**C2. Customer name (text line 1) is assembled word by word. [legacy-derived]**
- **Decision.** The name is the first word of first name, a space, the first word of middle
  name, a space, the first word of last name, and a trailing space, all in X(75). This follows
  COBOL `STRING … DELIMITED BY ' '`.
- **Effects.**
  - A multi-word name part keeps only its first word ("Mary Ann" → "Mary").
  - An empty middle name leaves two spaces.
- **Basis.** The wiki only says "customer name" (DT-17 `customerName ← Customer`, AC 1). It is
  silent on how the name is assembled.

**C3. Address. [legacy-derived for line 3]**
- **Lines 1 and 2.** Customer address line 1 and line 2 as stored.
- **Line 3.** The first word of each of address line 3, state code, country code and ZIP,
  separated by single spaces, in X(80). Example: `Altenwerthshire NC USA 12546`.
- **Basis.** The plugin page lists "address (3 lines), state, zip". CONTRACT has room for only
  three address lines, so state and ZIP must be folded into one of them. Including the country
  and cutting each part at its first word follow the legacy program. AC "Data Mapping
  Verification" asks to "verify … the address formatting" but does not define it.

**C4. Account ID is the 11-digit `ACCT-ID` as stored (leading zeros kept), left-justified in X(20).**

**C5. Current Balance is `ACCT-CURR-BAL` from `acctdata.dat`, printed as `9(9).99-`.**
- **Decision.** Only the low 9 integer digits of the S9(10)V99 field are kept, as a COBOL MOVE
  truncates. A negative balance prints a trailing `-`.
- **Basis.** CONTRACT picture. DT-17: `currentBalance ← Account`.

**C6. FICO score is the raw 3-character `CUST-FICO-CREDIT-SCORE`, left-justified in X(20).**
- **Basis.** CONTRACT X(20). DT-17: "Printed on statement".

**C7. Transaction details are `TRAN-DESC`, cut to its first 49 characters.**
- **Basis.** CONTRACT X(49). The plugin page lists "transaction id, description, amount".

**C8. Not printed, although listed on the plugin page:**
- statement date, phone, credit limit, cycle credit/debit, and SSN (the plugin itself says
  "SSN is not printed").
- **Basis.** CONTRACT's line layouts have no position for them, and CONTRACT fixes the format.

**C9. Amount pictures.**
- `Z(9).99-` prints leading integer zeros as spaces, so 0 prints as `         .00 ` and the
  zero total of AC 4 shows `$         .00`.
- The sign position is a space for zero and for positive values.

**C10. Signed amounts in the input files.**
- **Decision.** Read as zoned decimal with two implied decimals. The parser accepts:
  - plain digits;
  - a trailing overpunch: `{`/`A`–`I` positive, `}`/`J`–`R` negative, and the ASCII form
    `p`–`y` negative;
  - a separate `+`/`-` sign;
  - an explicit decimal point.
- **Basis.** CONTRACT: "layouts as in the copybooks" (S9(n)V99). The wiki does not say how the
  sign is encoded in the ASCII files, so every common form is accepted.

**C11. Input lines.**
- CR characters are stripped.
- Blank lines are ignored.
- Short lines (trailing spaces trimmed) are padded back to the record length before fields are cut.

## D. HTML output

**D1. Every statement is a complete HTML document, from `<!DOCTYPE html>` to `</html>`.**
- **Basis.** CONTRACT: "creastmt_statements_html.txt: one statement, lines in this order",
  starting at `<!DOCTYPE html>`.

**D2. Name and address placeholders print the value with trailing spaces removed, then `  </p>`.**
- **Example.** `<p style="font-size:16px">{customer name}  </p>` and `<p>{address line N}  </p>`.
  The two spaces before `</p>` are kept exactly as in the CONTRACT template.
- **Basis.** CONTRACT gives these fields no fixed width, unlike `{account ID X(20)}`, so they
  are treated as variable length. Address line 3 is the same composed value as text line 4.

**D3. The bank block (`Bank of XYZ`, `410 Terry Ave N`, `Seattle WA 99999`) is literal text from CONTRACT.**

**D4. Values are not HTML-escaped.**
- **Basis.** The wiki does not mention escaping, and the legacy output is the reference ("Same").

**D5. Trailing spaces of HTML lines are omitted, and any line is cut at 100 columns.**
- **Basis.** CONTRACT: "Trailing spaces may be omitted" and HTML is 100 columns (BR-04). The
  text output, in contrast, is padded to exactly 80.

## E. Verification performed

- I ran the workflow end to end on the FlowX platform (dev-env, project `cd_a21_bd5_zflx_r3`)
  with the synthetic fixtures in `../test-inputs/`. The files in this folder are that run's output.
- **Fixtures cover:**
  - AC 1: one statement per card with name, address, account id, balance and FICO.
  - AC 2 and AC 7: three lines; 100.00 + 40.00 with a −30.00 return → 140.00.
  - AC 3: both formats.
  - AC 4: a card without transactions → `.00`.
  - Edge cases:
    - an unsorted xref file and an unsorted transaction file;
    - all three negative-sign encodings;
    - a description longer than 49 characters;
    - a negative balance;
    - a transaction for a card that is not on the xref;
    - a card whose customer is missing.
- **Not verified.** No real CardDemo data or oracle output was available here, so the
  legacy-derived choices (C2, C3) are unconfirmed against the oracle.
