# CardDemo on FlowX — assumptions and decisions

Each entry says what was decided and which wiki statement it rests on, or which gap left it open.
"Wiki" means `online-sonnet-sf6.pdf`; CONTRACT-UI.md is its last page.

## What was built (for reference)

| Resource | Kind | Purpose |
|---|---|---|
| `users`, `accounts`, `customers`, `card_xref`, `transactions` | FlowX Database (NOSQL_DB) | The CONTRACT-UI stores (USRSEC, ACCTDAT, CUSTDAT, CCXREF/CXACAIX, TRANSACT) |
| `UserRecord`, `AccountRecord`, `CustomerRecord`, `CardXrefRecord`, `TransactionRecord` | Project data types | Collection schemas, using the contract's field names |
| `ui_signon` | Workflow | COSGN00C sign-on and exit |
| `ui_menu` | Workflow | COMEN01C main menu and COADM01C admin menu |
| `ui_account_view` | Workflow | COACTVWC account view |
| `ui_bill_payment` | Workflow | COBIL00C bill payment |
| `CardDemo` | UI Flow (WEB) | One page; one card per screen |

## Architecture

1. **UI Flow plus workflows instead of BPMN processes.**
   - The wiki describes CICS programs that exchange a COMMAREA. It does not prescribe a FlowX construct.
   - Each legacy program became one workflow that a UI Flow button starts.
   - The workflow returns the screen's view model, and its keys overwrite the UI state.
   - Rests on: the absence of any statement requiring processes, user tasks or call activities.

2. **One page, with a `screen` state key choosing the visible card.**
   - Each legacy program (XCTL to the next program) maps to a value of `screen`: SIGNON, EXIT, MAIN_MENU, ADMIN_MENU, ACCOUNT_SEARCH, ACCOUNT_DETAILS, BILL_PAYMENT.
   - Navigation is therefore decided server-side, as it was with XCTL. The browser never navigates on its own.
   - Rests on: the wiki's program-to-program XCTL flow, with no URL or route model given.

3. **Workflows return only an explicit `ui` object (END payload `${ui}`).**
   - Raw store responses never reach the browser. This matters most for the user record, which holds `pwd`.
   - Rests on: the wiki's silence on what the client may see. The legacy COMMAREA never carries the password onward either.

4. **The wiki's validations run in the workflows, not as UI validators.**
   - The only UI validators are `maxlength` limits that mirror the BMS field lengths (user ID 8, password 8, option 2, account 11, confirm 1).
   - "Required" is deliberately not a UI validator, so the legacy messages ("Please enter User ID ...", "Acct ID can NOT be empty..." and so on) appear exactly as documented.

5. **The session lives in UI state as `session {userId, userType, firstName, lastName}`.**
   - It never contains the password.
   - Rests on: the SessionContext / COMMAREA description. The session is cleared on exit or sign-off.
   - The wiki's `session.accountId` "skip the search when an account is already selected" behaviour is **not** implemented. Account View always starts at the search field, as COACTVWC does on first entry.

## Sign-on (COSGN00C)

6. **The app-level credential check against USRSEC is kept.**
   - The wiki's coexistence DECISION leaves room for an external identity provider. Nothing in the wiki configures one, and CONTRACT-UI includes the users store.

7. **The user ID and password are upper-cased before comparison. The stored `pwd` is compared exactly as stored.**
   - Rests on: BR-03 (upper-case conversion of the input fields).
   - The wiki does not say whether the stored value is normalised, so the stored value is not transformed.

8. **No lockout after failed attempts.**
   - The wiki marks `maxFailedAttempts` as a TODO with no value and no behaviour.

9. **The exit text is "Thank you for using CardDemo application...".**
   - Taken from CSMSG01Y (CCDA-MSG-THANK-YOU), which BR-08 references.
   - Exit shows an EXIT card with a "Sign On Again" button. The wiki says the transaction ends; a web page cannot end, so this button stands in for re-entering the transaction.

10. **Unknown `usr_type`.** User type "A" goes to the admin menu. Every other value goes to the main menu (BR-07: "A" means admin, anything else means regular).

11. **The "Unable to verify the User ..." message is shown for store errors other than not-found** (BR-06).

## Menus (COMEN01C / COADM01C)

12. **Option entry is a typed number, not clickable tiles.** The legacy flow (type an option, press Enter) and its error messages are kept, with the option list shown as text above the field.

13. **The optional-module toggles are both `false`, hard-coded in `ui_menu`.**
    - `pendingAuthorizationEnabled` and `transactionTypeMaintenanceEnabled` (DT-19) default to false in the wiki.
    - The wiki gives no runtime source for them (no configuration store in CONTRACT-UI).
    - Option 11 on the main menu (Pending Authorization View) and the two Db2 options on the admin menu are therefore not listed.
    - Typing such an option still gives "This option <label> is not installed...".

14. **Main-menu options 2–9 return "This option <label> is not installed...".**
    - Those functions are outside the requested scope (sign-on, menu, account view, bill payment).
    - The legacy "not installed" path (BR-03) is the documented behaviour for an option whose program is absent.

15. **The admin menu is minimal: all of its options return "not installed".**
    - The admin functions (user CRUD, transaction types) are out of scope.
    - Admin users have no route to Account View or Bill Payment, because the legacy admin menu does not list them.

16. **BR-02 ("No access - Admin Only option...") is implemented but cannot fire.** Every option in the legacy table COMEN02Y is type U. The check is kept in case the table changes.

17. **Invalid options give "Please enter a valid option number...".** This covers a non-numeric value, an empty value, 0, and a number larger than the option count (BR-01).

## Account View (COACTVWC)

18. **The account ID must be exactly 11 digits and non-zero.** Otherwise the message is "Account number must be a non zero 11 digit number" (BR-01 of COACTVWC). Shorter numeric input is not zero-padded.

19. **Read order is account, then card cross-reference, then customer.**
    - BR-02 lists the xref read first.
    - Acceptance scenario 5 expects "Did not find this account in account master file" for an account that does not exist.
    - Reading the account first satisfies both. The not-found messages are reported in this order:
      1. "Did not find this account in account master file"
      2. "Did not find this account in account card xref file"
      3. "Did not find associated customer in master file"

20. **The first card of an account (lowest `card_num`) supplies the customer ID and the selected card.**
    - CXACAIX is a non-unique alternate index. A keyed READ returns the first match, which in key order is the lowest card number.

21. **Store errors other than not-found give "Unable to read the account data. Try again later...".** The wiki names the condition but gives no exact text for this screen.

22. **Display formatting.**
    - Money: `$ 1,234.56`, negatives `-$ 1,234.56`.
    - Account ID padded to 11 digits; customer ID padded to 9.
    - SSN masked as `***-**-NNNN`, last 4 digits only. The wiki shows the SSN on the screen but lists it as sensitive, and gives no masking rule.
    - Address: the non-blank parts, comma-joined.
    - Phones: joined with " / ".
    - Dates: shown as stored.

23. **No "Update Account" action on the details screen.** Account Update (COACTUPC) is out of scope.

## Bill Payment (COBIL00C)

24. **Validation order follows COBIL00C.**
    1. An empty account ID gives "Acct ID can NOT be empty...".
    2. The confirm value is checked:
       - `N`/`n` clears the screen.
       - Anything other than Y/y/N/n/blank gives "Invalid value. Valid values are (Y/N)...".
    3. The account is read. Not found gives "Account ID NOT found...".
    4. A balance ≤ 0 gives "You have nothing to pay...".
    5. A blank confirm shows the balance and "Confirm to make a bill payment...".
    6. `Y`/`y` pays.

25. **Account ID input of 1–11 digits is accepted and read numerically.**
    - A non-numeric ID gives "Account ID NOT found...", since such a key can never exist.
    - The wiki does not define a format check for this screen.

26. **The transaction ID is the highest `tran_id` + 1, zero-padded to 16 digits.**
    - This mirrors COBIL00C's STARTBR / READPREV on HIGH-VALUES.
    - It is computed on the decimal string, so 16-digit IDs keep full precision.

27. **Payment transaction literals are the ones COBIL00C writes:**
    - `type_cd` "02", `cat_cd` 2, `source` "POS TERM", `desc` "BILL PAYMENT - ONLINE"
    - `amt` = the full current balance
    - `merchant_id` 999999999, `merchant_name` "BILL PAYMENT", `merchant_city` "N/A", `merchant_zip` "N/A"
    - `card_num` from the account's xref (the same first card as in #20)

28. **Timestamps are 26 characters, `YYYY-MM-DD HH:MM:SS.ffffff`, in UTC.**
    - `orig_ts` and `proc_ts` are equal.
    - Microseconds are milliseconds followed by "000".
    - The wiki gives the DB2-style format but no time zone.

29. **The new balance is the old balance minus the amount (always 0.00). The update is guarded by the balance that was read.**
    - The `updateBalance` filter includes `curr_bal = <balance read>`.
    - If 0 documents are modified (a concurrent change) or the update fails, the inserted transaction is deleted as compensation and "Unable to Update Account..." is shown.
    - The wiki relies on CICS READ UPDATE locking and a syncpoint, which a document store does not provide.

30. **Success message: "Payment successful. Your Transaction ID is <id>."** All fields are then cleared, as INITIALIZE-ALL-FIELDS does in the legacy program. The message kind is `success` (green in the legacy map); errors are `error`.

31. **There is no `active_status` check before payment.** The wiki lists this as a legacy defect/finding (F-09) and says the behaviour is preserved.

32. **Store errors use COBIL00C's texts:**
    - "Unable to lookup Account..."
    - "Unable to lookup XREF AIX file..."
    - "Unable to lookup Transaction..."
    - "Unable to Add Bill pay Transaction..."
    - "Unable to Update Account..."

## Data stores

33. **Field names and types follow CONTRACT-UI exactly (snake_case).**
    - IDs that the contract gives as numbers (`acct_id`, `cust_id`, `cat_cd`, `merchant_id`, `fico_credit_score`) are stored and queried as numbers.
    - `card_num`, `tran_id`, `usr_id` and dates are strings.
    - Amounts are written as JSON numbers.

34. **Indexes are defined, not applied.**
    - Indexes are defined on `usr_id`, `acct_id`, `cust_id` and `tran_id` (all unique), and on `(acct_id, card_num)` for card_xref.
    - Applying them to MongoDB needs a committed build ("Apply indexes"). The project version was not committed, because that was not requested.

35. **The stores were left empty.** Test data was used during the build, then deleted. The operator's seed files are the only data source.

## Not verified

- The workflows were each run against test data. Sign-on, menu, every account-view case, every bill-payment branch, and the compensation pieces were run node by node.
- The UI Flow passed static analysis with 0 errors. It was **not** exercised in a browser.
- Remaining analyzer warnings were accepted:
  - Labels are literal text rather than substitution tags. The project has a single language.
  - The page starts four workflows rather than one dispatcher, so each legacy program stays a separately testable unit.
