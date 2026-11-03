# CardDemo on FlowX.AI — assumptions and decisions

Each entry records what was decided where the wiki (`app-sonnet-kk7.pdf`) is silent, uncertain or incomplete, and the wiki statement (or absence of one) the decision rests on. Page numbers refer to the PDF.

Environment: FlowX 5.13 (dev-env), app `<uuid>`, WIP version `<uuid>` (left uncommitted).

---

## 0. What was built

| Part | FlowX resource |
|---|---|
| Online screens | UI Flow **carddemo** (`<uuid>`), one page per screen; every action calls the dispatcher workflow **ui_carddemo** (`<uuid>`) |
| Stores | FlowX Databases (NOSQL_DB), one per CONTRACT-UI file: `users`, `accounts`, `customers`, `card_xref`, `cards`, `transactions`, plus `job_requests` |
| POSTTRAN | workflow `batch_posttran` (`<uuid>`) |
| INTCALC | workflow `batch_intcalc` (`<uuid>`) |
| COMBTRAN | workflow `batch_combtran` (`<uuid>`) |
| CREASTMT | workflow `batch_creastmt` (`<uuid>`) |
| TRANREPT | workflow `batch_tranrept` (`<uuid>`) |
| CBACT01C, CBACT02C, CBACT03C, CBCUS01C, CBTRN01C | workflow `batch_readutils` (`<uuid>`), program chosen by `step` |
| CBEXPORT, CBIMPORT | workflow `batch_export_import` (`<uuid>`), program chosen by `step` |

Local copies of the batch step code are in `batch/`. `lib.js` is the shared library copied at the top of every batch SCRIPT node.

---

## 1. Cross-cutting decisions

### A1. Run date and time
- **Decision:** the business date and time come from the project configuration parameter `RUN_TIMESTAMP` (`2022-07-18 10:00:00`). The system clock is never used.
- **Where it applies:**
  - Every timestamp a step writes is `RUN_TIMESTAMP` + `.000000`, i.e. 26 characters, e.g. `2022-07-18 10:00:00.000000`.
  - The "current date" checks in the online screens (date of birth not in the future; monthly/yearly report ranges) use the same value.
- **Rests on:**
  - CONTRACT-BATCH-ADDED p233: "Run parameter: the batch date and time, as RUN_TIMESTAMP".
  - CONTRACT batch run params: business date 2022-07-18.
  - The wiki never says which timestamp format to use for `proc_ts`; the 26-character format of the seed `orig_ts` / `proc_ts` values was reused.

### A2. Store format
- **Decision:** each store holds exactly the CONTRACT-UI fields, with the types given there:
  - integers without leading zeros
  - `tran_id` and `card_num` as 16-character strings
  - dates as `YYYY-MM-DD` strings
  - amounts as JSON numbers
- **Exception:** `job_requests` has extra fields (A40).
- **Rests on:** CONTRACT-UI p226–227: "app may add own fields".

### A3. Batch input and output convention
- **How to run a step:** run its workflow with
  ```json
  {"files": {"acctdata.dat": "<lines>", "cardxref.dat": "...", ...}}
  ```
  - Each file is either one string with lines separated by `\n`, or a list of line strings.
  - A top-level key with dots replaced by underscores (`acctdata_dat`) is also accepted.
  - Blank lines are ignored.
- **Missing files:** a file that is absent from the input counts as a missing file. A file given as `""` or `[]` counts as an empty file.
- **Outputs:** every output file is written as a top-level key of the workflow output, named after the file without its extension: `posttran_transact`, `creastmt_statements`, `acctext_sysout`, …
  - JSON outputs are lists of objects.
  - `.txt` outputs are lists of lines.
- **Return codes:** `<step>_rc` is set only when a step stops on an error or ends with warnings. Otherwise it is omitted.
- **Rests on:** the contracts fix file names and formats but not how a FlowX workflow receives or returns files. CONTRACT-BATCH-ADDED p233 says "a step that ends normally may omit this file".

### A4. Missing required input
- **Decision:** when a required input is missing, the step writes `<step>_rc = "12"` and a sysout of two lines:
  - `ERROR: required input file missing: <names>`
  - `ABENDING PROGRAM`
- It writes no other output.
- **Rests on:**
  - CONTRACT-BATCH-ADDED: "A missing input is given as an absent file … a step that stops on an error writes its return code".
  - The wiki gives no return-code value; 12 is the usual abend code in the legacy JCL.
- **Optional inputs:** POSTTRAN treats `tcatbal.dat` as optional, because the category-balance file may not exist before the first posting.

### A5. Fixed-width parsing
- **Decision:** records are read at the copybook positions listed in the contracts.
- **Signed zoned numbers:**
  - The last character may be a sign overpunch: `{`, `A`–`I` are positive 0–9; `}`, `J`–`R` (or `p`–`y`) are negative 0–9.
  - A leading or trailing `+`/`-` is accepted.
  - An explicit decimal point is accepted.
- **Short lines** are padded with spaces.
- **Rests on:** the INTCALC acceptance criteria p99 give the overpunch example ("rate is a signed decimal, e.g. `0150{` = 15.00"). The wiki does not list the encoding table; the standard EBCDIC/ASCII overpunch table was used.

### A6. Money arithmetic
- **Decision:** amounts are processed as integer cents.
- **Interest:** truncated to the cent, like COBOL `COMPUTE` without `ROUNDED`.
- **Rests on:**
  - The wiki's interest formula "bal × rate / 1200" (p99 and the interest-calculation process, BR-08).
  - The p99 note "verify interest rounding to two decimals" says nothing about rounding versus truncation; truncation is what the legacy program does.

### A7. Sysout format
- **Decision:** the free-text lines follow the legacy pattern:
  - `START OF EXECUTION OF PROGRAM <prog>`
  - …
  - `END OF EXECUTION OF PROGRAM <prog>`
- A "printed record" is the input line exactly as received.
- **Rests on:** CONTRACT-BATCH-ADDED p234: "a printed record is the fixed-width line of the input record. Other lines are free text". The wiki does not dictate the other lines.

---

## 2. Batch steps

### POSTTRAN (CBTRN02C)

**P1. Validation order**
- **Decision:** checks run in this order:
  1. card not in cross-reference → reason 100
  2. account not found → reason 101
  3. overlimit → reason 102
  4. expired → reason 103
- An expired account overwrites an earlier 102 on the same transaction.
- **Rests on:** process daily-transaction-posting BR rules. The wiki lists the checks but not whether 103 can replace 102; the legacy code evaluates both and keeps the last.

**P2. Overlimit test**
- **Decision:** the test is `curr_cyc_credit − curr_cyc_debit + amt > credit_limit`.
- It uses the account values as already updated by earlier transactions in the same run.
- **Rests on:** wiki BR (overlimit formula). The wiki is silent on intra-run effects; a running balance is how the legacy file update behaves.

**P3. Posting**
- **Decision:** for each accepted transaction:
  - `proc_ts` = RUN_TIMESTAMP (A1)
  - `curr_bal += amt`
  - `amt ≥ 0` is added to `curr_cyc_credit`; a negative `amt` is added to `curr_cyc_debit` as is, so the debit total becomes more negative
  - the category balance (`acct_id`, `type_cd`, `cat_cd`) is created or incremented
- **Rests on:** wiki BR for posting. The wiki says "else cyc_debit += amt" without saying to take the absolute value, so it is applied literally.

**P4. Rejects and outputs**
- **Decision:**
  - Rejects are written with `reason` and `reason_desc`; `rc = "4"` when there is at least one reject.
  - `posttran_acctdata` lists every account.
  - `posttran_tcatbal` is sorted by key.
- **Rests on:** CONTRACT batch outputs and the wiki statement "RC 4 if rejects". Output order is not specified, so key order was chosen.

### INTCALC (CBACT04C)

**I1. Processing order and grouping**
- **Decision:** category balances are processed in key order (account, type, category).
- Interest is accumulated per account and applied when the account changes, together with resetting both cycle totals to 0.
- **Rests on:**
  - Wiki process interest-calculation BR.
  - Acceptance criteria p99 #3 ("Account current balance increased by total interest; cycle credit/debit reset").

**I2. Rate lookup**
- **Decision:**
  - The rate key is the account's `group_id` + type + category.
  - If that key is missing, the `DEFAULT` group is used.
  - If DEFAULT is missing too, the rate is 0 and a sysout line is written.
- **Rests on:**
  - p99 #4 ("Rate taken from DEFAULT group").
  - The wiki is silent when DEFAULT is also missing; the run continues instead of abending.

**I3. Zero rate**
- **Decision:** a rate of 0 creates no transaction.
- **Rests on:** p99 #5.

**I4. Interest transaction**
- **Decision:** the generated transaction has:
  - `tran_id` = PARM + 6-digit suffix starting at `000001`
  - type `01`, category `5`, source `System`
  - description `Int. for a/c <11-digit acct>`
  - `card_num` = the first cross-reference card of the account
  - merchant fields empty / 0
  - both timestamps = RUN_TIMESTAMP
- **PARM:** read from input `parm`; the default is the RUN_TIMESTAMP date + `00`, i.e. `2022071800`.
- **Rests on:**
  - p99 #6 ("Transaction ids built from run date plus suffix").
  - CONTRACT run params ("INTCALC PARM 2022071800").
  - The suffix width and the merchant values are not in the wiki.

**I5. Account missing for a balance**
- **Decision:** that account's balances are skipped and a sysout line is written.
- **Rests on:** nothing in the wiki.

**I6. Fees**
- **Decision:** no fees are computed.
- **Rests on:** p99 #7 ("No fee created (legacy stub F-12)").

### COMBTRAN

**C1. Merge and sort**
- **Decision:** `transact.dat` (the backup) and `systran.dat` are merged and sorted by `tran_id`.
- The output `combtran_transact` uses the transaction fields.
- **Rests on:** p100 #1–#4.

**C2. Both inputs required; empty is allowed**
- **Decision:** both inputs must be present, but either may be empty.
- **Rests on:** p100 #3 and #4 ("One source empty", "Both empty → completes with zero records"). An absent file is still treated as missing (A4).

**C3. Duplicate transaction ids**
- **Decision:** the step stops with `rc 12` and lists the duplicates. No output is written.
- **Rests on:** the wiki is silent. The legacy REPRO into a KSDS fails on a duplicate key.

### CREASTMT (CBSTM03A/B)

**S1. Statements and layout**
- **Decision:** one statement per cross-reference record, in `card_num` order.
- The text and HTML layouts follow CONTRACT-L1 p230–232 literally, including the two spaces before `</p>` in the customer block.
- **Rests on:** p101 #1 ("One statement per card"). The order is not stated.

**S2. Customer name**
- **Decision:** first, middle and last names, each trimmed, with empty parts dropped, joined by single spaces.
- **Rests on:** the wiki says only "customer name X(75)".

**S3. Address line 3**
- **Decision:** `addr_line_3`, state, country and zip, joined by single spaces.
- **Rests on:** the wiki has only "address line 3 X(80)", and p101 says "verify … the address formatting" without defining it. City/state/country/zip on one line follows the legacy program.

**S4. Basic details**
- **Decision:**
  - Account id is printed as 11 digits with leading zeros.
  - FICO is printed as 3 digits.
  - Current balance uses `9(9).99-`.
- **Rests on:** CONTRACT-L1 field widths. The 11-digit account id matches its width in the fixed-width files.

**S5. Transaction lines**
- **Decision:** a statement contains the transactions whose `card_num` equals the cross-reference card, in `tran_id` order.
- `Total EXP` is the sum of the transaction amounts; a card with no transactions shows a zero total.
- **Rests on:** p101 #2 and #4.

**S6. Missing customer or account**
- **Decision:** the statement is still printed, with blank customer fields or a zero balance.
- **Rests on:** the wiki is silent.

**S7. HTML statement**
- **Decision:** the whole fixed HTML document, from `<!DOCTYPE html>` to `</html>`, is repeated once per statement. The PDF option is not implemented.
- **Rests on:**
  - CONTRACT-L1 p231: "one statement, lines in this order" starts with `<!DOCTYPE html>`.
  - p101 #6: "Not available in legacy".

### TRANREPT (CBTRN03C)

**R1. Date range**
- **Decision:**
  - The start and end dates are read from inputs `start_date` and `end_date`, then config `reportStartDate` / `reportEndDate`, then default to 2022-07-01 / 2022-07-31.
  - The filter is on the date part of `proc_ts`, inclusive at both ends.
- **Rests on:**
  - CONTRACT-L1 ("Report params: start 2022-07-01, end 2022-07-31").
  - p102 configuration dependencies (`reportStartDate`, `reportEndDate`).
  - The wiki does not say which timestamp is filtered; the legacy SORT INCLUDE uses the processing timestamp.

**R2. Order**
- **Decision:** transactions are sorted by card number, keeping their input order within a card.
- **Rests on:** wiki process transaction-report ("sorted by card number").

**R3. Page size**
- **Decision:** 20 detail lines per page. Only detail lines are counted.
- At a page break the step prints Page Total, then a rule, then a new page header: report header, blank line, column header and rule.
- **Rests on:** CONTRACT-L1 p232 describes the page structure but not the page length. 20 is the legacy page size.

**R4. Account total**
- **Decision:** printed (followed by a rule) when the card number changes. No account total is printed after the last card.
- The report ends with Page Total, a rule, then Grand Total.
- **Rests on:** "account total (card change)" in the wiki, read literally. p102 #2 mentions only "page totals per card and a grand total"; the legacy program also omits the last account total.

**R5. Amount edit pictures**
- **Decision:** a zero value prints as all spaces.
- **Rests on:** CONTRACT-L1 p230 defines Z-pictures with leading zeros as spaces. In COBOL, an all-Z picture blanks a zero value.

**R6. Unknown references**
- **Decision:** when the cross-reference, transaction type or category is not found:
  - the field prints blank
  - a line is written to `tranrept_sysout`
  - the run continues
- **Rests on:** p102 #5: "Error flagged, run continues {{TODO: confirm legacy abend behaviour}}".

### CBACT01C (account extract)

**E1. `acctext_out`**
- **Decision:** the account fields without `addr_zip`.
- **Rests on:** CONTRACT-BATCH-ADDED p233.

**E2. `acctext_array`**
- **Decision:**
  - occurrence 1 = the account's `curr_bal` and `curr_cyc_debit`
  - occurrences 2–5 = `null`
- **Rests on:** the contract lists five occurrences, but the wiki does not say what fills occurrences 2–5. The contract says "A value the step leaves unset is null".

**E3. `acctext_vb`**
- **Decision:** two records per account, in this order:
  1. `{acct_id, active_status}`
  2. `{acct_id, curr_bal, credit_limit, reissue_yyyy}`
- `reissue_yyyy` is the first four characters of `reissue_date`.
- **Rests on:** CONTRACT-BATCH-ADDED p234 ("either … or …"). How often each shape is written is not stated; writing one of each per account mirrors the legacy variable-length file.

**E4. `acctext_sysout`**
- **Decision:** START line, each input record, END line.
- **Rests on:** A7.

### CBACT02C / CBACT03C / CBCUS01C (file prints)

**F1. Sysout content**
- **Decision:** `cardprint_sysout`, `xrefprint_sysout` and `custprint_sysout` each contain the START line, every input record, then the END line.
- **Rests on:** A7. The wiki describes these programs as printing each record.

**F2. Running the read utilities together**
- **Decision:** the read utilities share the `batch_readutils` workflow. With `step` omitted, all five programs run, and each one abends independently if its own input is missing.
- **Rests on:** the wiki does not group them; this was a packaging choice.

### CBTRN01C (daily transaction check)

**D1. Sysout content**
- **Decision:** for each daily transaction, the sysout prints the record line, then one of:
  - `CARD NUMBER <card> COULD NOT BE VERIFIED. SKIPPING TRANSACTION ID-<id>` when the card is not in the cross-reference
  - `ACCOUNT <11-digit acct> NOT FOUND` when the account is missing
- Nothing else is written.
- **Rests on:** the wiki describes only a validation pass that writes no data. The message texts come from the legacy program.

### CBEXPORT / CBIMPORT

**X1. Export sections**
- **Decision:** sections are written in this order: customers (C), accounts (A), cross-references (X), transactions (T), cards (D).
- `seq` runs from 1 across all records.
- **Rests on:** p105 #1 lists the types in that order; the numbering scheme is not given.

**X2. Branch and region**
- **Decision:** `branch_id = "0001"` and `region_code = "NORTH"` on every record.
- **Rests on:** the wiki gives only the field widths (4 and 5 characters); no values are documented.

**X3. Timestamp**
- **Decision:** `timestamp` = RUN_TIMESTAMP (`2022-07-18 10:00:00`).
- **Rests on:** p234 says "`timestamp` as the step writes it", and A1.

**X4. SSN**
- **Decision:** SSN is exported in clear.
- **Rests on:** p105 #6 tags "SSN is encrypted or excluded (FI-12)" as an improvement (@manual), while the import must reproduce the source (#5, round trip). Encrypting would break the round trip, so legacy behaviour (F-04, clear) was kept.

**X5. Import**
- **Decision:**
  - Records are split by `rec_type` into `import_customers`, `import_accounts`, `import_card_xref`, `import_transactions` and `import_cards`, with the seed fields of that type only.
  - Any other type goes to `import_errors` as `{rec_type, seq, message: "Unknown record type: <t>"}` and the run continues.
  - `export.json` may be supplied as a JSON string or as a list.
- **Rests on:** p105 #3–#5.

---

## 3. Online screens

### Overall structure

**U1. Screen rules run server-side**
- **Decision:** one UI Flow page per screen. Every button starts the dispatcher workflow `ui_carddemo` with `{type, op, params}`, and the page is rebuilt from the view model the workflow returns.
- **Rests on:** the wiki maps screens to UI Flows but leaves the mechanism to the implementation. One dispatcher keeps the screen rules in one place.

**U2. Function keys become buttons**
- **Decision:** PF keys are rendered as buttons: Enter → the primary action, F3 → Back/Exit, F4 → Clear, F5 → Save/Copy, F7/F8 → Previous/Next.
- **Rests on:** the screen specs list the PF keys; web pages have no function keys.

**U3. Menus**
- **Decision:** menus are rendered as buttons rather than an option-number field, so "Please enter a valid option number…" cannot occur.
- The optional modules are left out:
  - main-menu option 11 (pending authorizations)
  - admin-menu options 5 and 6
- **Rests on:** the wiki marks those options as optional toggles; the optional modules were not built.

**U4. No page query parameters**
- **Decision:** pages carry no query parameters, so a browser refresh returns the page to its blank state.
- **Rests on:** the wiki is silent.

**U5. Plain-text labels**
- **Decision:** labels are plain text; substitution tags are not used.
- **Rests on:** the wiki has no i18n requirement.

**U6. Formatting is done by the workflow**
- **Decision:** dates and amounts are formatted by the workflow and shown as text:
  - amounts as `$#,##0.00` with a leading `-` when negative
  - dates as `YYYY-MM-DD`
  - the transaction list Date column as `MM/DD/YY`
- **Rests on:** the screen specs give these formats; doing it server-side gives the same output everywhere.

### Sign-on

**U7. Sign-on rules**
- **Decision:**
  - The user id is matched upper-cased (max 8 characters).
  - The password is accepted as typed, or upper-cased (the legacy screen upper-cases input).
  - User type `A` opens the admin menu; anything else opens the main menu.
  - Exit and sign-off show "Thank you for using CardDemo application...".
- **Rests on:** UI Flow signon p2–3. The wiki's {{DECISION}} about using the platform identity provider was not taken, because the stores are loaded with the user file and the screens must verify against it.

### Account view and update

**U8. Account lookup**
- **Decision:** the account id must be a non-zero 11-digit number. The account is resolved through `card_xref` (first record for the account), then `accounts`, then `customers`.
- **Rests on:** the account-view screen spec messages.

**U9. Account update validation**
- **Decision:** the update rules are:
  - Y/N flags
  - `YYYY-MM-DD` dates
  - signed amounts with up to 2 decimals
  - SSN: 9 digits; not 000, 666 or 900–999 in the first part; no zero groups
  - date of birth not after the run date
  - FICO 300–850
  - names alphabetic
  - a valid US state code
  - 5-digit zip
  - 3-letter country
  - phone `(999)999-9999` with non-zero parts
  - 10-digit EFT id
- Validation stops at the first failing rule.
- **Rests on:** account-update BR-01..14. The wiki does not give the phone input format; the formatted form stored in the seed data was used.

**U10. Saving an account update**
- **Decision:**
  - Only changed fields are written.
  - The record is re-read before saving and compared with the values fetched; if it differs, the screen shows "Record changed by some one else. Please review".
  - "No change detected with respect to values fetched." is shown when nothing differs.
- **Rests on:** account-update spec messages.

### Cards

**U11. Card list**
- **Decision:** 7 rows per page, ordered by card number, with optional account and card filters. Each row offers View and Update.
- **Rests on:** card-list spec ("listPageSize (legacy 7)").

**U12. Card update**
- **Decision:**
  - The embossed name is stored upper-cased.
  - The expiry is entered as month + year; the original day of the expiration date is kept.
  - Year 1950–2099, month 1–12.
- **Rests on:**
  - The card-update spec ("expiry day preserved").
  - The upper-casing follows the legacy program; the wiki is silent.

### Transactions

**U13. Transaction list and view**
- **Decision:** the list shows 10 rows per page in ascending `tran_id` order. A start id is zero-padded to 16 digits. The view looks up the id as typed or zero-padded.
- **Rests on:** transaction-list and transaction-view specs.

**U14. Transaction add**
- **Decision:**
  - The new `tran_id` is the highest existing `tran_id` + 1, zero-padded to 16 digits.
  - Orig and proc dates are entered as `YYYY-MM-DD` and stored with ` 00:00:00.000000` appended.
  - The amount must match `[+-]99999999.99`.
  - Balances are not updated.
  - Copy-last (F5) copies the latest transaction for the card.
- **Rests on:**
  - transaction-add spec ("tran id = last+1", "no balance update").
  - The wiki suggests a FlowX sequence for the id; reading the current maximum was used because the stores are reloaded from seed files.

### Bill payment

**U15. Bill payment**
- **Decision:** the payment is the full current balance. It writes a transaction with:
  - type `02`, category `2`, source `POS TERM`
  - description `BILL PAYMENT - ONLINE`
  - merchant id `999999999`, merchant name `BILL PAYMENT`
  - merchant city and zip `N/A`
  - card = the account's first cross-reference card
  - both timestamps = RUN_TIMESTAMP
- It then sets `curr_bal` to 0.
- **Rests on:** bill-payment spec. Merchant city and zip are not given there; `N/A` follows the legacy program.

### Report request

**U16. Report request**
- **Decision:**
  - Monthly = the run month; Yearly = the run year; Custom = the entered dates, validated for format and calendar.
  - Confirming adds one `job_requests` document with `start_date` and `end_date`, plus the app's own fields `report_type`, `requested_by`, `requested_ts` and `status: "SUBMITTED"`.
  - A refused or cancelled request adds nothing.
- **Rests on:** CONTRACT-UI ("when a screen requests a report, add one doc to store job_requests … app may add own fields").

### User administration

**U17. User administration**
- **Decision:** the user list shows 10 rows per page from the start id. Add, update and delete use the wiki messages. A user type is stored upper-cased.
- **Rests on:** user-management spec.

---

## 4. Known gaps

- The end-of-day chain orchestration (scheduler, `batchWindowOpen`, operator tasks) is not built. Each batch step is a separate workflow the operator runs in order, passing the output files of one step as inputs to the next.
- Wiki items tagged @manual or marked as future improvements (FI-xx) are not implemented: PDF statements, notifications, fees, SSN encryption.
- The INTCALC run date is taken from input `parm`. The wiki's configuration name `interestRunDate` is not read.
