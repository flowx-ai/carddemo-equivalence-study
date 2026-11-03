# CardDemo online screens on FlowX.AI — assumptions and decisions

Project `cd_a24_sf6_zflx_r2b` (appId `<uuid>`, version `<uuid>`), FlowX 5.13 on dev-env.

Each entry states what was decided and which wiki statement (or the absence of one) it rests on.
"Wiki" means the attached `online-sonnet-sf6.pdf`, including CONTRACT-UI.md.

## What was built

| Resource | Kind | Purpose |
|---|---|---|
| `carddemo_online` | UI Flow (WEB) | One page with the screens Sign-on, Main Menu, Admin Menu, Account View, Bill Payment and Goodbye |
| `ui_signon` | workflow | COSGN00C: validate input, read `users`, check password, route by user type |
| `ui_menu` | workflow | COMEN01C / COADM01C: validate the option number and route |
| `ui_account_view` | workflow | COACTVWC: validate the account id, read `card_xref`, `accounts`, `customers`, build the view |
| `ui_bill_payment` | workflow | COBIL00C: validate, show the balance, confirm Y/N, pay the full balance |
| `users`, `accounts`, `customers`, `card_xref`, `transactions` | FlowX Database (NOSQL_DB) systems | The five stores CONTRACT-UI.md lists |
| UserSec, AccountRec, CustomerRec, CardXrefRec, TransactionRec | project data types | Store schemas |

## A. Architecture

**A1. UI Flow + workflows instead of a BPMN process.**
The wiki describes pseudo-conversational CICS screens: each one receives a map, does its work and sends a map back, with no long-running state. That maps directly onto a UI Flow whose buttons start a short workflow per screen. The wiki does not prescribe a target architecture.

**A2. One page that acts as a screen state machine.**
- A `screen` state key (SIGNON / MENU / ADMIN / ACCT / BILL / BYE) decides which card is visible.
- Each workflow returns only the UI state keys it changes. That return value includes `screen`, which is how the legacy XCTL transfers between programs are reproduced.
- Static moves (Exit, Back, Clear) are client-side scripts.

The wiki describes XCTL / RETURN TRANSID between programs, not web navigation. This design keeps every transfer explicit and avoids depending on navigation after an asynchronous workflow returns.

**A3. Session state lives in the browser session.**
- The signed-on user (`session.userId`, `userType`, names) is held in UI Flow state. It stands in for the COMMAREA, which the wiki says carries user id and user type between programs.
- `ui_menu` trusts the `userType` the page sends. No server-side session store is described in the wiki.

**A4. One START_WORKFLOW per screen action, not one page dispatcher.**
The analyzer suggests a single `ui_<page>` dispatcher. The wiki keeps one program per screen, so one workflow per screen preserves that traceability.

## B. Data stores (CONTRACT-UI.md)

**B1. Store names and keys.**
- Each store is named after its seed file's base name: `users`, `accounts`, `customers`, `card_xref`, `transactions`.
- The keys are the ones CONTRACT-UI.md gives: `usr_id`, `acct_id`, `cust_id`, `card_num` (with `acct_id` not unique), `tran_id`.

**B2. Field types follow the contract's format rules.**
- Amounts are numbers (FLOAT).
- Dates and the 26-character timestamps are strings.
- `acct_id`, `cust_id`, `ssn`, `fico_credit_score`, `cat_cd` and `merchant_id` are integers.
- `card_num`, `tran_id`, `usr_id`, `zip`, `phone`, `group_id` and `eft_account_id` are strings.

This follows the contract rule that values read back in the type and text they were loaded in.

**B3. No fields of the app's own are added to seeded documents.**
The contract allows extra fields. None was needed: the bill payment changes only `curr_bal` on the account and inserts complete transaction documents.

**B4. Indexes are defined but not unique, and not yet applied.**
- Defined: `users.usr_id`, `accounts.acct_id`, `customers.cust_id`, `card_xref(acct_id, card_num)`, `transactions.tran_id` (DESC).
- They are non-unique so that a seed file with an unexpected duplicate does not fail the operator's load. The wiki states which fields are keys but says nothing about enforcing uniqueness on load.
- Index definitions reach MongoDB only when a build is committed and "Apply indexes" runs on it. That has not been done. The app works without them; they only matter for performance.

## C. Sign-on (COSGN00C)

**C1. Passwords are checked against `users.pwd`.**
The contract loads `pwd` into the users store, and the wiki's sign-on reads USRSEC and compares passwords. No external identity provider is described. Real CardDemo security (RACF) is out of scope.

**C2. Case handling.**
- User id and password are upper-cased before lookup and comparison.
- The comparison is against the stored `pwd` trimmed of trailing spaces.

The legacy map fields are upper-case (the program upper-cases the input) and the stored values are space-padded PIC X fields. The wiki does not say whether seed passwords are mixed case.

**C3. Messages are the legacy literals.**
"Please enter User ID ...", "Please enter Password ...", "Wrong Password. Try again ...", "User not found. Try again ...", "Unable to verify the User ...".

On error the entered user id is kept and the password is cleared. The wiki's screen description shows the password field re-sent blank.

**C4. Routing after sign-on.**
- `usr_type` = `A` goes to the Admin Menu; anything else goes to the Main Menu.
- The wiki says admins are transferred to COADM01C and regular users to COMEN01C. It does not define user types other than A/U.

**C5. Exit (PF3) shows a goodbye screen.**
The goodbye text is "Thank you for using CardDemo application..." (the CSMSG01Y common message). The wiki says PF3 ends the session with a thank-you message but does not render the screen. From there, "Sign On Again" returns to sign-on, standing in for a new CICS transaction.

## D. Menus (COMEN01C / COADM01C)

**D1. Option names and order are taken from COMEN02Y and COADM02Y as the wiki lists them.**
Admin options are shown with "(Security)" / "(Db2)" suffixes as on the legacy screen.

**D2. Only Account View (1) and Bill Payment (10) are wired.**
Every other valid, installed option answers "This option is coming soon ...". The task scopes the build to sign-on, menus, account view and bill payment. The wiki itself uses "coming soon" for options whose program is not available.

**D3. Optional modules are constants, default off.**
- The toggles are `pendingAuthorizationEnabled` (user option 11) and `transactionTypeMaintenanceEnabled` (admin options 5–6), both false.
- They are kept in sync between `ui_menu` and the UI's initial state.
- The wiki describes these options as present only when the optional module is installed, and gives no installation flag.
- When off, the option is hidden from the list. Typing its number anyway gives "This option <name> is not installed...". The wiki describes the not-installed message but not whether the line is shown.

**D4. Input validation.**
- A non-numeric, zero or out-of-range option gives "Please enter a valid option number...".
- An admin-only option chosen by a non-admin gives "No access - Admin Only option...".
- All user options are type U, so the second check never fires on the user menu. This keeps the legacy behaviour the wiki notes (F-02).

**D5. Menu Exit returns to sign-on and clears the session.**
The wiki: PF3 on a menu returns to the sign-on screen.

**D6. The admin menu is minimal.**
The four security options are listed and answer "coming soon". The wiki covers the admin menu only as a routing target.

## E. Account view (COACTVWC)

**E1. Validation.**
- The account number must be exactly 11 digits and not all zeros; otherwise "Account number must be a non zero 11 digit number".
- Empty and non-numeric input fall under the same message.
- The wiki states the 11-digit, non-zero rule. It does not give a separate message for blank input.

**E2. Message precedence: account master first.**
- If the account is missing from `accounts`: "Did not find this account in account master file". This applies even when the xref is also missing.
- Otherwise, if no `card_xref` row exists: "Did not find this account in account card xref file".
- Otherwise, if the customer is missing: "Did not find associated customer in master file".

The legacy program reads the xref first. The wiki's acceptance criterion for a non-existent account (99999999999) expects the account-master message, so that criterion decides the order. A read failure that is not a not-found gives "Error reading … file".

**E3. Choosing the card when an account has several.**
The xref with the lowest `card_num` is used. The contract says `acct_id` is not unique in card_xref. The legacy alternate-index read returns the first record in key order.

**E4. Display formats.**
The wiki shows the screen fields but not their web rendering. Edit masks are mirrored where the legacy map has one:
- Currency is `$ #,##0.00`, with negatives as `-$ 12.30`.
- Dates are shown as stored (`YYYY-MM-DD`).
- The account id is zero-padded to 11 digits and the customer id to 9.
- The SSN is masked as `***-**-NNNN` (the last four of the 9-digit, zero-padded number). The wiki shows SSN on the screen; it is masked because only the last four are needed for identification and the rest is personal data.
- The name is "first middle last". The address is the non-empty parts joined with commas.

**E5. "Update Account" is a placeholder.**
It answers "This option is coming soon ..." because account update is out of scope. Back returns to the Main Menu.

## F. Bill payment (COBIL00C)

**F1. Order of checks follows the legacy program.**
1. Empty account id → "Acct ID can NOT be empty...".
2. The confirm value is checked before any read:
   - N/n clears the screen.
   - Any value other than blank, Y, y, N or n → "Invalid value. Valid values are (Y/N)...".
3. The account is read:
   - Not found → "Account ID NOT found...".
   - Balance ≤ 0 → "You have nothing to pay...".
   - Blank confirm → the balance is shown with "Confirm to make a bill payment...".
4. Y/y pays.

**F2. A non-numeric or over-long account id is treated as not found.**
The answer is "Account ID NOT found..." with no read. The wiki does not give a format message for bill payment, unlike account view.

**F3. Confirm is a one-character free-text field, not a Yes/No control.**
The legacy CONFIRM field accepts any character, and the wiki documents the invalid-value message. A two-option control would make that message unreachable.

**F4. Amount paid.**
The full current balance is paid, and the new balance is curr_bal − amt = 0. The wiki says the payment is the full balance; partial payment is not supported.

**F5. Transaction id.**
- The new id is the highest existing `tran_id` + 1, zero-padded to 16 digits.
- On an empty store it is `0000000000000001`.
- The wiki says the program browses TRANSACT from HIGH-VALUES backwards and adds 1.
- The highest id is found by sorting the 16-character strings, which matches numeric order because the contract fixes their length.

**F6. Transaction literals.**
- `type_cd` "02", `cat_cd` 2, `source` "POS TERM", `desc` "BILL PAYMENT - ONLINE", `merchant_id` 999999999, `merchant_name` "BILL PAYMENT".
- `merchant_city` and `merchant_zip` are "N/A".
- `card_num` comes from the xref (see E3).

These follow the wiki's field list for the bill-payment record.

**F7. Timestamps.**
- `orig_ts` and `proc_ts` are both the current time as `YYYY-MM-DD HH:MM:SS.ffffff` (26 characters), in UTC.
- Microseconds are milliseconds followed by `000`.
- The wiki and contract give the 26-character format but no time zone.

**F8. Write order, concurrency and compensation.**
- The account balance is updated first, guarded by `acct_id` and the balance just read, so a concurrent change makes the update match nothing. That case answers "Unable to Update Account...".
- The transaction is inserted afterwards.
- If the insert fails, the balance is restored with the same guarded update and the user sees "Unable to Add Bill pay Transaction...".
- The stores have no multi-document transaction, and the wiki does not specify write order or failure handling between the two writes.
- The compensation path is built but was not exercised in testing, because forcing an insert failure would have meant breaking the store.

**F9. Success.**
"Payment successful. Your Transaction ID is <id>." The account and confirm fields are cleared, as the legacy program re-initialises the screen after a successful write.

**F10. An account with no card xref.**
Answering Y gives "Account ID NOT found..." (legacy message on the CXACAIX read). A blank confirm still shows the balance, because the xref is needed only to write the transaction.

## G. UI details

**G1. Labels are plain text, not substitution tags.**
The wiki defines a single language (English). Legacy literals are kept verbatim so tests can match them.

**G2. Navigation keys become buttons.**
- PF3 → Exit / Back.
- PF4 on bill payment → Clear.
- ENTER → Sign On / Submit / View.

The wiki's PF keys have no web equivalent.

**G3. Input length limits mirror the map field lengths.**
User id 8, password 8, option 2, account id 11, confirm 1.

**G4. The header shows "AWS CardDemo" and "Credit Card Demo Application for Mainframe Modernization".**
It also shows the signed-on user id. The legacy title, transaction, program and date/time lines were reduced to this, because they have no meaning on the web.

## H. Testing and handover state

**H1. Test data.**
- The workflows were tested against temporary documents (users ZZUSER01 / ZZADMN01, accounts 88888888801–05, customer 888888801, cards 8888000011112201–04).
- These were deleted, with their temporary operations and helper workflow, before handover.
- All five stores were left empty for the operator's seed load.

**H2. Tested paths.**
- Sign-on: success (user and admin), wrong password, unknown user, missing fields.
- Menu: invalid option, not-installed option, routing to account view and bill payment.
- Account view: found, account missing, xref missing, customer missing, invalid id.
- Bill payment: empty id, invalid confirm, N, balance prompt, zero balance, not found, payment with stored transaction and zero balance, id increment, Y with no xref.

**H3. Not exercised.**
- The bill-payment compensation path.
- The UI Flow in a browser: its structure was checked with the analyzer, and the workflows it calls were run directly.
