# CardDemo on FlowX: assumptions and decisions

This file lists every point where the wiki (app-sonnet-kk7.pdf) was uncertain, incomplete or silent and I had to choose. Each entry gives the decision and the wiki statement it rests on, or notes that the wiki has none.

Section references use the wiki page paths, for example `03-ui-flows/ui-flow-bill-payment.md`, and the contract names (CONTRACT-UI, CONTRACT, CONTRACT-L1, CONTRACT-BATCH-ADDED).

---

## 1. Platform shape (applies to everything)

| # | Decision | Rests on |
|---|---|---|
| A1 | All online screens are one UI Flow (**CardDemo**) with one page. Each wiki screen is a CARD, shown or hidden according to a `screen` state key. Moving between screens changes that key instead of loading a new route. | The wiki describes screens and transitions (`03-ui-flows/*`) but gives no URL or route model. One page keeps the session, error and message state in one place. |
| A2 | All screen logic runs in one dispatcher workflow, **ui_carddemo**. Every button sends `{type, sess, f}` to it and gets back the state keys to overwrite. Database access goes through a generic queue runner, **db_exec** (find, insert, update and delete per store). | The wiki describes behaviour per program (COSGN00C, COACTVWC, …) and does not prescribe an architecture. |
| A3 | The signed-on user is held in client-side UI state (`sess`: uid, type, names, last account and card) and passed with every call. The password is never kept. | The signon flow says the session holds the user id and type, and says nothing about the password ("no pwd in session"). The wiki gives no server-side session store. COMMAREA becomes the per-call state. |
| A4 | Every action except signon is refused if no user is signed on. Admin-only actions are refused for type `U` with "No access - Admin Only option...". | The admin-menu flow is for Administrator only. Where the refusal is enforced is not specified. |
| A5 | CICS PF keys are buttons whose labels carry the key, for example "Save (F5)", "Cancel (F12)", "Back (F3)", "Clear (F4)", "Backward (PF7)", "Forward (PF8)". Enter is the main button. | The wiki mock-ups show buttons such as Fetch, Clear, Back, Continue, Pay and Submit, and the validation tables refer to PF keys. Keeping both lets either reading be tested. |
| A6 | Labels and messages are hard-coded English. Substitution tags are not used. | The wiki is single-language, and the messages are quoted verbatim from legacy programs. |
| A7 | Dates are shown and entered as `YYYY-MM-DD` strings, except where the wiki shows another format (transaction list `MM/DD/YY`, card expiry `MM/YYYY`). | CONTRACT-UI: "Dates on screens: format per wiki". |
| A8 | Amounts are shown as `$#,##0.00` on account view and bill payment, and as plain signed `-0.00` on the transaction screens. | Account-view mock-up and validation table (`$ #,##0.00`). The transaction-list and transaction-view mock-ups show `-52.47` and `+194.00`. |
| A9 | `RUN_TIMESTAMP` (a project configuration parameter, `2022-07-18 10:00:00`) is the only clock. It is read through `additionalData.applicationConfiguration`, and the system clock is never used. | CONTRACT-UI and CONTRACT-BATCH-ADDED: "RUN_TIMESTAMP … Never system clock." |

## 2. Data stores (CONTRACT-UI)

| # | Decision | Rests on |
|---|---|---|
| D1 | There is one FlowX Database per seed file (`users`, `accounts`, `customers`, `card_xref`, `cards`, `transactions`) plus `job_requests`. Field names and types follow CONTRACT-UI exactly. Integer fields are `INTEGER`, amounts are numbers, and dates and timestamps are strings as loaded. | CONTRACT-UI field lists ("ints without leading zeros", "tran_id/card_num 16-char strings", 26-char timestamps). |
| D2 | Each store has a **non-unique** index on its key field (and `card_xref` also on `acct_id`). Keys stay unique because the application checks (for example user add re-reads before inserting) and the operator's seed data is clean. | CONTRACT-UI states the key of each store and that `card_xref.acct_id` is not unique. It does not say whether the platform must enforce uniqueness. Unique indexes would make a seed load with any duplicate fail outright. |
| D3 | `job_requests` documents carry only `start_date` and `end_date` (`YYYY-MM-DD`). No user, report type or timestamp is added. | CONTRACT-UI: "job_requests {start_date, end_date} on each accepted report request (refused → no doc)". |
| D4 | The master-data load and unload jobs are not built. The operator seeds the stores before testing and reads them back afterwards. | User instruction: "the operator loads them from the seed files before testing and reads them back after". |
| D5 | Fields the application did not change are written back with their loaded type and text. Updates use `$set` on the changed fields only. | CONTRACT-UI: "values read back in type/text loaded unless app changed them". |

## 3. Online screens

### Signon / menus

| # | Decision | Rests on |
|---|---|---|
| U1 | User id and password are upper-cased before comparison. Type `A` goes to the admin menu and type `U` goes to the main menu. | Signon flow ("uppercase id+pwd, max 8"; A → admin, U → main menu). |
| U2 | Exit (F3) on signon or a menu shows "Thank you for using CardDemo application..." with a "Sign on again" button, and clears the session. | The wiki says Exit ends the session but gives no farewell text. The text is modelled on the legacy COSGN00C send-plain-text. |
| U3 | Main-menu option 11 (Pending Authorization View) and admin options 5–6 (Transaction Type list and maintenance) are listed but answer "This option <name> is not installed...". `pendingAuthorizationEnabled` and `transactionTypeMaintenanceEnabled` are both false. | The main-menu and admin-menu flows make these options conditional on the toggles. The optional modules are not described as part of this build. |
| U4 | An option is typed into an input field (1–11 or 1–6), as on the 3270 screen, rather than chosen from a list. | Menu flows: invalid entries give "Please enter a valid option number...", which only makes sense for free-typed input. |
| U5 | When account view, card view or card update opens from the menu, the account and card last used in the session are prefilled but not fetched automatically. | The legacy COMMAREA carries the last account and card. The wiki does not say whether to auto-fetch. |

### Account view / account update

| # | Decision | Rests on |
|---|---|---|
| U6 | Lookup order is xref by account (first card by card number), then account, then customer. Each miss gives the wiki's message for that file. | Account-view flow messages ("Did not find this account in account card xref file", …). |
| U7 | Values are shown as "Label: value" strings, one per field. SSN is masked `***-**-` plus the last 4 digits. | Account-view flow (SSN masked `***-**-6789`). |
| U8 | Account update uses steps SEARCH, EDIT, CONFIRM and saved. Validation runs in the legacy field order, and the first error wins. The CONFIRM step shows a Markdown table of attribute, current value and new value. | The account-update flow describes search, edit, review and result, and the "review" content is not specified. The table makes the pending changes visible before F5. |
| U9 | No state/zip consistency check is made, because the wiki gives no state-to-zip table. The state must be a US state or territory code, and the zip must be 5 digits. | The account-update flow mentions "US state + state/zip", but no lookup data is in the wiki. |
| U10 | Phones are entered as 3/3/4 parts and stored as `(aaa)bbb-cccc`. A phone left entirely blank is allowed. SSN is entered as 3/2/4 parts and stored as an integer. The EFT account id must be numeric if given. The messages for these follow the legacy wording pattern ("<field>: Area code must be a 3 digit number", "EFT Account Id must be a number"). | The account-update flow names the rules (phone 3/3/4; SSN part rules) but not every message text. |
| U11 | Save uses optimistic locking. Account and customer are re-read and compared with the values fetched; any difference gives "Record changed by some one else. Please review" and reloads the current values. | Account-update flow messages ("Record changed by some one else…", "Could not lock … record for update"). CICS READ UPDATE becomes a re-read and compare. |

### Card list / view / update

| # | Decision | Rests on |
|---|---|---|
| U12 | Each page holds 7 rows, ordered by card number. Account and card filters are optional and combine. Each row has a selection input that takes `S` (view) or `U` (update), case-insensitive. | Card-list flow ("page 7", "S/U"). The message for any other code ("Invalid selection. Valid values are S and U") follows the transaction-list wording because the card-list page gives none. |
| U13 | Card view and card update fetch by **both** card number and account. A card under a different account is "Did not find cards for this search condition". | The card-view flow requires both keys. Legacy COCRDSLC reads by card and checks the account. |
| U14 | Card update edits only name, active status and expiry month and year. The day of the expiry date is kept. CVV is never sent to the screen. | Card-update flow ("keep day"); card-list flow ("no CVV"). |
| U15 | Back from card view or card update returns to wherever the user came from (card list, refreshed, or the menu). | Navigation sections ("Back → card-list" when reached from the list, "Back → menu" otherwise). |

### Transaction list / view / add

| # | Decision | Rests on |
|---|---|---|
| U16 | Each page holds 10 rows in ascending transaction id order. The search id is left-padded with zeros to 16 digits and used as a "start at" key. | Transaction-list flow ("10 rows per page", "Search Tran ID (16 characters)"). |
| U17 | In transaction view, a short numeric id is left-padded to 16 digits. Clear (F4) empties the screen. | Transaction-view flow (Fetch, Clear, Back). The padding is my choice so that "1" finds `0000000000000001`. |
| U18 | Transaction add: if both account and card are entered, the **account wins** and the card is taken from the xref (the first card of the account by card number). If only the card is entered, the account comes from the xref. | Transaction-add table: "one required; account → xref lookup of card, card → xref lookup of account". Precedence when both are given is not stated. |
| U19 | The new transaction id is the highest existing `tran_id` plus 1, zero-padded to 16. `orig_ts` and `proc_ts` are `<date> 00:00:00.000000`, built from the entered dates. The account balance is **not** updated. | Transaction-add flow ("id = last+1", "no balance update"). The time part is not specified. |
| U20 | The Y/N confirm is a field on the same screen. Blank or `N` gives "Confirm to add this transaction...", and any other value gives "Invalid value. Valid values are (Y/N)...". | The transaction-add mock-up shows a confirm modal, and the validation table says "Y/y to add; otherwise 'Confirm to add this transaction...'". Using one field keeps the legacy one-screen behaviour. |
| U21 | Copy last transaction (F5) pre-fills from the transaction with the highest id **for the resolved card**. | Transaction-add table: "pre-fills from the latest transaction of the card". "Latest" is read as highest tran id, because ids are sequential. |

### Report request

| # | Decision | Rests on |
|---|---|---|
| U22 | Monthly means the first to last day of the RUN_TIMESTAMP month, and Yearly means 1 January to 31 December of the RUN_TIMESTAMP year. Custom requires both dates, each valid, with end ≥ start. | Report-request flow ("Monthly (current month)", "Yearly (current year)"); A9. The end ≥ start message is the legacy CORPT00C one. |
| U23 | The success message is "<Monthly/Yearly/Custom> report submitted for printing ...", and the form is cleared. | The validation table quotes legacy CORPT00C. The mock-up's "Report request submitted. You will be notified when it is ready." is illustrative mock text. I kept the legacy wording, consistent with every other message. |
| U24 | Confirm `N` clears the form without writing anything. A blank confirm gives "Please confirm to print the <type> report...". | Report-request table: "Y/N ('Please confirm to print the XXX report...')". |

### Bill payment

| # | Decision | Rests on |
|---|---|---|
| U25 | The full current balance is paid, so the new balance is 0.00. The payment transaction is type `02`, category 2, source `POS TERM`, description `BILL PAYMENT - ONLINE`, merchant id 999999999, merchant name `BILL PAYMENT`, and `orig_ts`/`proc_ts` = RUN_TIMESTAMP + `.000000`. The card is the account's first xref card. | Bill-payment flow and Actions (finding F-09: full balance). |
| U26 | Merchant city and zip on the payment transaction are `N/A`. | The wiki gives no values for them. |
| U27 | The balance is shown after Enter. If it is ≤ 0, "You have nothing to pay..." appears and nothing is written. Confirm `N` clears the screen. | Bill-payment validation table. |

### User administration

| # | Decision | Rests on |
|---|---|---|
| U28 | The user list has 10 per page, ordered by user id. The selection is `U` (update) or `D` (delete). | User-management flow. |
| U29 | The user id and password are upper-cased and truncated to 8 characters, and names to 20. The user type must be `A` or `U` ("User Type must be A or U..."). | Signon flow (upper-case, max 8); CSUSR01Y layout (8/20/20/8/1). The wiki gives no type-validation message, so it is modelled on the "can NOT be empty..." style. |
| U30 | In user update, a blank password keeps the current one, and the password is never displayed. With no real change, "Please modify to update ..." appears. | The user-management flow says the password should not be redisplayed. It does not say what a blank password means. |
| U31 | User update and delete have their own Fetch (Enter) step, then F5 to save or delete. Delete shows "Press F5 to confirm deletion" after the fetch. | Legacy COUSR02C and COUSR03C (Enter fetches, PF5 acts). The wiki gives no prompt text. |

## 4. Batch steps

| # | Decision | Rests on |
|---|---|---|
| B1 | Each batch step is its own workflow (`batch_posttran`, `batch_intcalc`, `batch_combtran`, `batch_creastmt`, `batch_tranrept`, `batch_cbact01c`, `batch_cbact02c`, `batch_cbact03c`, `batch_cbcus01c`, `batch_cbtrn01c`, `batch_cbexport`, `batch_cbimport`). A file is passed in the start input under its base name, for example `acctdata`, `acctdata_dat`, `acctdata.dat`, or under `files.<name>`. Fixed-width files are passed as text or as a list of lines. Outputs come back as keys named exactly as the contract files, without extension. | CONTRACT, CONTRACT-L1 and CONTRACT-BATCH-ADDED list the files, not how they reach a FlowX workflow. |
| B2 | The EOD chain (POSTTRAN → INTCALC → COMBTRAN → CREASTMT/TRANREPT) is run step by step, and each step's outputs feed the next. CLOSEFIL/OPENFIL (closing and opening the CICS files) are dropped. | The wiki describes them as CICS housekeeping around the batch window. They have no counterpart when no CICS region holds the files. |
| B3 | Fixed-width parsing follows the copybook offsets. Signed fields use zoned overpunch (`{A–I` positive, `}J–R` negative). A plain trailing digit, or a trailing `+`/`-`, is also accepted. | Copybook pages (CVACT01Y, CVTRA05Y/06Y, …). The extra forms make files saved by other tools load. |
| B4 | POSTTRAN rejects with reason 100, 101, 102 or 103. When more than one applies, **the last check wins** (103 over 102). `proc_ts` = RUN_TIMESTAMP in DB2 form `YYYY-MM-DD-HH.MM.SS.000000`. RC is 4 when any rejects occur. | The POSTTRAN rules list the codes and the order of evaluation. The legacy code overwrites the reason, so the last check wins. The timestamp format follows the legacy DB2 FORMAT-DB2-TIMESTAMP. |
| B5 | INTCALC sets interest to `balance × rate / 1200`, **truncated** to the cent (toward zero). The rate comes from group+type+category, then DEFAULT+type+category, then 0 (no transaction). The id is the PARM (`2022071800`) plus a 6-digit running suffix. The card is the account's first xref card. | The INTCALC rules give the formula. Truncation follows COBOL COMPUTE without ROUNDED. |
| B6 | COMBTRAN merges posted and system transactions, stable-sorted by `tran_id`. Duplicate keys are kept and counted, and RC is 12 when there are any. | The wiki describes SORT/REPRO. It does not say how duplicates are handled. |
| B7 | CREASTMT runs in xref order (by card number). Each statement takes all of the card's transactions. Name and city line are built from the **first word** of each part, joined with single spaces. The HTML lines are padded or truncated to 100 characters and the text lines to 80. | CONTRACT-L1 layouts (pp. 231–233). The first-word assembly follows the legacy STRING … DELIMITED BY SPACE. |
| B8 | TRANREPT filters on proc date in `[start, end]`, from the parameters, defaulting to `2022-07-01`/`2022-07-31` when none is passed. Transactions are grouped by card. A page holds 20 lines, followed by page, account and grand totals. Lines are 133 characters. | CONTRACT-L1 parameters. The legacy CBTRN03C page size is 20. BR-05 also says the report covers a date range, and the contract's dates are used when the caller gives none. |
| B9 | When any input of a CONTRACT-BATCH-ADDED step is missing, the step logs the legacy open-error text, then `FILE STATUS IS: NNNN0035` and `ABENDING PROGRAM`, and returns `<step>_rc` = 999. No other output is produced. | CONTRACT-BATCH-ADDED ("missing input = absent file"; "<step>_rc.txt on error stop"). 999 is the legacy U999 abend. |
| B10 | CBTRN01C needs `dailytran`, `cardxref` and `acctdata`. It only writes the log. | CONTRACT-BATCH-ADDED lists only `dailycheck_sysout.txt` as its output. |
| B11 | The print steps (CBACT02C, CBACT03C, CBCUS01C) print each record once, as a fixed-width line with trailing spaces trimmed. | CONTRACT-BATCH-ADDED: "printed record = fixed-width line of input record" (singular). The wiki does not say how many times each record is printed or whether it is trimmed. |
| B12 | CBACT01C reproduces the legacy test values: debit 2525.00 when zero; array slots 1005.00/1525.00/-1025.00/-2500.00; reissue date without dashes in `acctext_out`; and VB records split into the two shapes. | CONTRACT-BATCH-ADDED field lists plus the legacy CBACT01C logic, which the wiki documents as-is. |
| B13 | CBEXPORT sets branch `0001`, region `NORTH`, and timestamp = RUN_TIMESTAMP `YYYY-MM-DD HH:MM:SS.00`. Customer `ssn` is `null`. | CONTRACT-BATCH-ADDED record header; BR-04 (SSN excluded from the export). |
| B14 | CBIMPORT sends any `rec_type` other than C/A/X/T/D to `import_errors` with the message "Unknown record type encountered". | CONTRACT-BATCH-ADDED (`import_errors`: rec_type, seq, message). The message text is not given. |
| B15 | Unset output fields are `null`. Outputs are JSON lists in input order. | CONTRACT-BATCH-ADDED ("null for unset"). |

## 5. Known limits

- The online screens were exercised against the live dispatcher. Tested: signon (all branches), account view, admin menu and user list, user add, user delete, and the card and transaction list paths. The stores were then empty, so the populated-page paths (paging F7/F8, selection, update saves) were checked by review and not on seeded data.
- Rendering in the browser was checked with the static UI analyzer only (0 errors).
