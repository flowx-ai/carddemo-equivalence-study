# Statement generation (CREASTMT / CBSTM03A-B) — assumptions and decisions

These are the points where the wiki (`02-processes/process-statement-generation.md`,
`10-acceptance-criteria/acceptance-criteria-statement-generation.md`, `01-data-model/project-data-model.md`,
`04-integrations/system-statementpdf.md`, `07-plugins/document-strategy.md`) was uncertain, incomplete or
silent, and what this build decided. The CONTRACT fixes the line layouts and is followed as written; everything
below is about behaviour and about the places where the layout left room.

The wiki itself defers the statement content to the legacy program: *"{{TODO: Read CBSTM03A/B + COSTM01.CPY for
the exact statement layout and totals.}}"* (document-strategy.md), and the acceptance criteria require *"figures
match legacy"* / *"identical figures"*. Where the wiki is silent, the decision below therefore follows the legacy
CBSTM03A behaviour, and says so.

Code references are to `flowx/scripts/*.js`, which are the bodies of the three SCRIPT nodes in the FlowX
workflow `creastmt_statement_generation`.

## Shape of the implementation

**A1 — One integration workflow, files in / strings out; no scheduled process, Kafka topics or PDF system.**
The wiki describes a scheduled process with Send/Receive tasks on `ai.flowx.in.carddemo.datastore.loadstatementdata`
and `ai.flowx.in.carddemo.pdf.render`, a per-account loop and a notification task. CONTRACT instead hands every
run four fixed-width files and expects two line outputs, and explicitly allows a run to return the lines as one
string under the file name without extension. Built as a FlowX DEFAULT workflow:
`Start → Load accounts + transactions → Build statement models → Render statements → End`. INPUT slice:
`transact`, `acctdata`, `cardxref`, `custdata` (file contents as text). OUTPUT slice: `creastmt_statements`,
`creastmt_statements_html` (lines joined by `\n`). The wiki's node names are kept as SCRIPT nodes. The
"For each account" loop is a loop inside the build node, not a BPMN loop.

**A2 — The PDF render step is not built.**
Both the system page and the document strategy leave PDF rendering open (`{{DECISION: Use the FlowX document plugin
... vs an external PDF microservice}}`, Auth `{{TODO: confirm}}`, `pdfRendererUrl` not given). CONTRACT asks for
the text statement file and the HTML statement file, not a PDF. No Document Template or REST system was created, and
`pdfRendererUrl` is not used. The HTML output is the render-ready artefact.

**A3 — No customer notification.**
Node 6 is `{{TODO: legacy had no email; new capability}}` and acceptance scenario 4 is `{{DECISION: in scope?}}`.
It is treated as out of scope: no notification is sent, and nothing in the outputs depends on it.

## Which statements, which transactions

**A4 — No cycle or date filter: every record in `transact.dat` is a candidate.**
The wiki's Load payload is `{ cycle }` and the acceptance step is "Run cycle", but no page defines what a cycle
selects. CONTRACT gives no run parameter for statement generation (the dates it lists belong to the daily
transaction report) and describes `transact.dat` as "the day's combined transaction file". Legacy CBSTM03A
filters nothing either.

**A5 — One statement per account. Accounts are reached through the card cross-reference and ordered by card
number.** (`02_build_statement_models.js:23,33`)
The wiki says "For each account" and "Statement per account". It is silent on order and on accounts with several
cards. The cross-reference is processed in card-number order (legacy XREFFILE is a KSDS read sequentially in key
order; a stable sort keeps file order for equal keys). An account's statement appears at the position of its
lowest card number, and it lists the transactions of all of that account's cards.
*Divergence risk:* legacy CBSTM03A writes one statement per cross-reference record, i.e. per card. The two agree
whenever each account has a single card. That holds for the stock CardDemo data, but not necessarily for every
input.

**A6 — Transactions within a statement are ordered by card number, then transaction ID** (plain character
comparison). The wiki is silent. This is the order of the legacy CREASTMT SORT step (`TRAN-CARD-NUM`,
`TRAN-ID`).

**A7 — Unmatched records produce nothing.** (`02_build_statement_models.js:36`)
- A transaction whose card number is not in `cardxref.dat` is not printed.
- An account that no cross-reference record points to gets no statement.
- A cross-reference record whose account or customer record is missing is skipped. Legacy abends in this case; the
  wiki is silent.

The customer is the one named by the cross-reference record (`XREF-CUST-ID`), as the CardXref page describes the
card ↔ customer ↔ account link.

**A8 — An account with no transactions still gets a full statement**, with an empty transaction block and
`Total EXP:` of `.00`. This is acceptance scenario 3, "Statement with zero activity".

## Figures

**A9 — Opening/closing balance, category balances, interest and minimum due are not printed.**
The document strategy lists them as AccountStatement content, and the acceptance criteria list "opening/closing
balance, transaction list, totals". However, the CONTRACT layout has exactly one balance line (Current Balance) and
one total (`Total EXP:`), and `tcatbal.dat` is not an input to this step. Mapping:
- Current Balance = `ACCT-CURR-BAL` from `acctdata.dat` (accounts after posting and interest).
- Total EXP = signed sum of `TRAN-AMT` over the statement's printed transactions, reset for each statement.

**A10 — Picture overflow is truncated as a COBOL MOVE would** (`03_render_statements.js:17,23`).
`ACCT-CURR-BAL` is S9(10)V99, but `9(9).99-` holds nine integer digits, so the high-order digit is dropped.
Totals and amounts in `Z(9).99-` are treated the same way. The sign is a trailing `-` for negative values and a
space otherwise; a value that is zero after truncation prints with a space.

**A11 — Signed zoned decimals.** Amount fields are read as display numerics with the sign overpunched on the last
digit:
- ASCII `{`/`A`–`I` is positive, and `}`/`J`–`R` is negative.
- GnuCOBOL's ASCII `p`–`y` is negative.
- Plain digits, an explicit leading or trailing `+`/`-`, and an embedded `.` are also accepted.

The data model page only says these fields are signed with scale 2.

## Text placed on the lines

**A12 — Customer name (line 1) is legacy `STRING ... DELIMITED BY ' '`** (`02_build_statement_models.js:10,52`).
The wiki only shows `${customer.firstName}`. The name is first name, middle name and last name, each cut at its
first embedded space and each followed by one space, truncated to 75 characters. An empty middle name therefore
gives two spaces between first and last name. A multi-word first or last name keeps only its first word.

**A13 — Address line 3 (line 4, X(80)) is composed like legacy CBSTM03A** (`02_build_statement_models.js:55`).
CONTRACT prints an 80-character "address line 3", while the customer field is only X(50), so a composed value is
implied. It is `CUST-ADDR-LINE-3`, state code, country code and ZIP, each cut at its first embedded space and
joined by single spaces. A multi-word city is therefore shortened to its first word (for example
"New Gladyceburgh" → "New"). This legacy quirk is kept deliberately, because the acceptance criteria require
identical output. Address lines 1 and 2 are `CUST-ADDR-LINE-1/2` as stored.

**A14 — Account ID and FICO score are the stored digits, left-aligned in X(20).** Account ID is the 11 digits with
leading zeros; FICO is the 3 digits. This mirrors a numeric DISPLAY item moved to an alphanumeric one.

**A15 — "Transaction details" is the first 49 characters of `TRAN-DESC`.** The wiki does not say which field the
details are. The merchant fields are not used.

**A16 — Column header (line 13): `Tran Amount` is right-aligned to column 80.** It occupies positions 70–80, after
two spaces, so `Tran ID`(16) + `Tran Details`(51) + `  Tran Amount` = 80. CONTRACT gives only "Tran Amount (80 in
all)" (`03_render_statements.js:61`).

**A17 — HTML inserted values.**
- Account ID and FICO keep their X(20) padding inside the tag.
- Balance and amounts use the same pictures as the text file.
- Name and address lines are the text-file value with trailing spaces removed, followed by the two literal spaces
  CONTRACT shows before `</p>` (`03_render_statements.js:94`).
- The HTML address line 3 is the same composed value as the text file.

## Output encoding

**A18 — Line endings and padding.**
- Lines are joined by `\n`, with no trailing newline in the returned string.
- Text lines are padded to 80 characters.
- HTML lines have their trailing spaces removed rather than padded to 100, as CONTRACT allows; this keeps the
  workflow payload small.
- Statements follow each other directly, with no separator line; CONTRACT lists none.

**A19 — No capacity limits.** The legacy program keeps transactions in a fixed in-memory table (51 cards × 10
transactions). That limit is not reproduced, and every transaction is printed. The wiki does not mention it.

**A20 — An empty `transact` input is accepted** (it is optional in the INPUT slice). The other three files are
mandatory.
