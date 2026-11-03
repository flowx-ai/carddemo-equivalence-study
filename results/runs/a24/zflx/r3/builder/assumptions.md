# CardDemo online screens on FlowX.AI: assumptions and decisions

Build: FlowX 5.13, project `cd_a24_sf6_zflx_r3`. The WIP version is not committed.
Source: `online-sonnet-sf6.pdf`, which contains the wiki pages and CONTRACT-UI.md.

Each entry below gives:
- **Decision**: what I assumed or chose.
- **Basis**: the wiki statement it rests on, or the gap it fills.

## What was built

| Resource | Purpose |
|---|---|
| UI Flow `carddemo_online` (WEB) | One page. Panels are shown or hidden by the `screen` key: signon, menu, adminMenu, acctSearch, acctDetail, billPay, goodbye |
| Workflow `ui_signon` | COSGN00C: validate, read the user, check the password, build the session, route by user type |
| Workflow `ui_menu` | COMEN01C/COADM01C: validate the option, apply the module toggles, route; `back`/`exit` commands |
| Workflow `ui_account_view` | COACTVWC: validate the account number, then read account → card xref (by account) → customer, then format |
| Workflow `ui_bill_payment` | COBIL00C: lookup / confirm / pay. Inserts a transaction, does a guarded balance update, and on failure runs a compensating delete |
| Reusable function `optionalModuleToggles` | Optional-module switches; all are `false` |
| FlowX Databases `users`, `accounts`, `customers`, `card_xref`, `transactions` | The CONTRACT-UI stores, with CONTRACT field names and types |
| Project data types `UserSecRecord`, `AccountRecord`, `CustomerRecord`, `CardXrefRecord`, `TransactionRecord` | Collection schemas, field-for-field as in CONTRACT-UI.md |

## Data stores (CONTRACT-UI.md)

1. **Store names and keys.**
   - **Decision:** Each store is a FlowX Database whose name matches the seed file's base name (`users`, `accounts`, `customers`, `card_xref`, `transactions`). The partition key is the default `_id`, and business keys are found through filters.
   - **Basis:** CONTRACT-UI.md lists the stores and seed files but does not name a FlowX persistence mechanism or a primary-key strategy.

2. **Field formats are kept exactly as the contract gives them.**
   - **Decision:**
     - Ids without leading zeros (`acct_id`, `cust_id`, `ssn`, `fico_credit_score`, `cat_cd`, `merchant_id`) are numbers.
     - `card_num` and `tran_id` are 16-character strings.
     - Dates are `YYYY-MM-DD` strings.
     - Amounts are numbers with at most 2 decimals.
     - `orig_ts`/`proc_ts` are 26-character strings.
   - **Basis:** CONTRACT-UI.md format section. Leading zeros are added back only for display: account id to 11 digits, customer id to 9 digits.

3. **Indexes are defined but not applied.**
   - **Decision:** Indexes exist on `usr_id`, `acct_id`, `cust_id`, (`acct_id`,`card_num`) and `tran_id` DESC. They are applied to MongoDB only when a build's indexes are applied, which happens after commit.
   - **Basis:** None — the wiki says nothing about performance. They mirror the legacy VSAM keys and the CXACAIX alternate index.

4. **Transaction-id ordering.**
   - **Decision:** "Last transaction" is the document with the highest `tran_id` when sorted as a string. This works because ids are zero-padded to 16 characters.
   - **Basis:** Bill-payment BR-06 says "transaction id = last + 1"; legacy uses STARTBR HIGH-VALUES / READPREV.

## Architecture

5. **One UI Flow and page-level workflows instead of BPMN processes.**
   - **Decision:** The wiki describes processes P-01/P-02/P-03/P-11 with user tasks, call activities and send/receive messages to integration workflows. I built one UI Flow page with panels. Each panel action starts a workflow that returns the next view model.
   - **Basis:** The process pages describe structure only. The observable behaviour (screens, messages, data effects) is kept. The analyzer warns that the page uses 4 workflows and suggests one dispatcher; I accepted that warning so each workflow maps 1:1 to a wiki process.

6. **The session lives in UI-flow state.**
   - **Decision:** `SessionContext` (userId, userType, firstName, lastName, accountId) is held in UI state and passed to every workflow. A workflow called without a session returns the sign-on screen.
   - **Basis:** Sign-on "Builds the SessionContext (replacement of the COMMAREA)". The wiki does not say where the session is stored.

7. **Visible text is not in substitution tags.**
   - **Decision:** Labels and messages are literal English strings, not substitution tags.
   - **Basis:** The wiki gives English legacy texts only and no i18n requirement.

## Sign-on (COSGN00C / P-01)

8. **The credential check is done inside the app.**
   - **Decision:** The password is checked against `users.pwd`.
   - **Basis:** The wiki has a {{DECISION}} that authentication is delegated to the FlowX identity provider, with the legacy check kept "for the coexistence phase only". However, CONTRACT-UI.md defines `users` with `pwd`, and the operator tests through the stores. So I implemented the coexistence check.

9. **Upper-casing.**
   - **Decision:** The user id and password are trimmed and upper-cased (BR-03). They are compared with the stored `usr_id` and `pwd` as stored, without upper-casing the stored values.
   - **Basis:** BR-03 says "User ID and password are upper-cased before comparison" but does not say the stored value is transformed. Legacy stores upper-case values.

10. **No lockout and no password expiry.**
    - **Decision:** Neither is implemented.
    - **Basis:** Legacy has neither, and the wiki leaves the policy as a TODO.

11. **Messages.**
    - **Decision:** The messages are exactly BR-01…BR-06. "Unable to verify the User ..." is used when the store read itself fails.
    - **Basis:** Sign-on BR-01 to BR-06.

12. **Exit (PF3) on sign-on.**
    - **Decision:** It shows a goodbye panel with "Thank you for using CardDemo application...", plus a "Sign on again" button.
    - **Basis:** BR-08 says "exits the application with a thank-you message {{TODO: confirm exit text}}". The text is my choice. A web app cannot close itself.

13. **Field rules.**
    - **Decision:** Max 8 characters on the user id and password inputs. Required-field checks happen server-side so that the legacy messages appear.
    - **Basis:** Sign-on UI flow element table.

## Menu (COMEN01C / COADM01C / P-02)

14. **User routing.**
    - **Decision:** `usr_type` `A` goes to the Admin menu; anything else goes to the main menu.
    - **Basis:** Sign-on BR-07.

15. **Options that are listed but not built.**
    - **Decision:** Only options 1 (Account View) and 10 (Bill Payment) open screens. Main-menu options 2–9 and admin options 1–4 answer "This option <name> is coming soon ...".
    - **Basis:** The task scope is sign-on, menu, account view and bill payment. The wiki gives no message for options outside the build, so the text is mine.

16. **Optional modules.**
    - **Decision:** Option 11 (Pending Authorization View) and admin options 5–6 (DB2 transaction type) are controlled by toggles in `optionalModuleToggles`, all `false`. They are hidden from the list, and entering their number gives "This option <name> is not installed...". The option range stays 1–11 / 1–6.
    - **Basis:** The menu process says optional modules are switched by configuration. The default is not stated, and those modules are not in this build.

17. **Option validation.**
    - **Decision:** An empty, non-numeric or out-of-range value gives "Please enter a valid option number...".
    - **Basis:** Menu BR-01.

18. **Exit on a menu.**
    - **Decision:** Exit (PF3) ends the session and returns to sign-on.
    - **Basis:** Menu BR-05.

19. **Back buttons.**
    - **Decision:** Back on the account and bill-payment screens returns to the menu that matches the user type.
    - **Basis:** "Back returns to the main menu". Admin users reach these screens only through the main-menu path; legacy returns to the calling menu.

## Account view (COACTVWC / P-03)

20. **Account number format.**
    - **Decision:** Exactly 11 digits, not all zeros; otherwise "Account number must be a non zero 11 digit number". This includes an empty field.
    - **Basis:** BR-01 and the UI element table ("numeric, 11 digits, non-zero"). The wiki gives no separate empty-field message.

21. **Read order: account → xref → customer.**
    - **Decision:** The account is read first, then the xref, then the customer.
    - **Basis:** The BR numbering lists the xref first (BR-02), then the account (BR-03). With account-first, an unknown account gets the "account master" message, which is the natural reading of BR-03. An account with no card gets the xref message (BR-02). The customer id comes from the xref, so the customer is read last (BR-04).

22. **Xref by account.**
    - **Decision:** Use the first xref document for the account, ordered by `card_num`.
    - **Basis:** The contract says `acct_id` in card_xref is not unique. Legacy reads the CXACAIX alternate index and takes the first record.

23. **Messages.**
    - **Decision:** The messages are the BR-02/03/04 texts as written, although the wiki marks them {{TODO: confirm exact texts}}. If a store read fails (as opposed to not finding the record), the message is "Unable to read the … file. Try again later". That text is mine.
    - **Basis:** COACTVWC BR-02 to BR-04.

24. **SSN masking.**
    - **Decision:** The SSN is shown as `***-**-NNNN`: the stored number is left-padded to 9 digits and all but the last 4 are masked.
    - **Basis:** BR-05 {{DECISION}} and the UI note "masked in the new UI (FI-04)".

25. **Display formats.**
    - **Decision:**
      - Amounts are formatted `$ #,##0.00`, with a leading `-` for negatives (`-$ 5.25`).
      - Dates are shown as stored (ISO).
      - The address is the non-empty address lines, state, country and zip, joined with ", ".
      - The cycle credit/debit figures and the EFT account / primary-holder flag are shown as pairs.
      - The card number is shown too.
    - **Basis:** UI element table ("currency $ #,##0.00, dates ISO") and the screenshot. Neither gives a negative format or an address layout.

26. **Account search prefill.**
    - **Decision:** The search field is prefilled with the session's last account id (`session.accountId`), and a successful view updates it.
    - **Basis:** Legacy COMMAREA carries the last account id. The wiki says the session is a COMMAREA replacement but does not say whether to skip the search.

27. **Update Account button.**
    - **Decision:** It shows "This option Account Update is coming soon ...".
    - **Basis:** The flow says it starts `account-update`, which is outside this build.

## Bill payment (COBIL00C / P-11)

28. **Validation order.**
    - **Decision:** The checks run in this order:
      1. Empty account id → "Acct ID can NOT be empty...".
      2. Confirm `N`/`n` → clear the screen.
      3. Confirm not blank/Y/y/N/n → "Invalid value. Valid values are (Y/N)...".
      4. Read the account.
    - **Basis:** BR-01 and BR-04; the order follows COBIL00C PROCESS-ENTER-KEY. The wiki lists the rules but not their order.

29. **Account id format.**
    - **Decision:** The account id must be 11 digits; any other input gives "Account ID NOT found...".
    - **Basis:** The UI says "(11 digits)". BR-02 gives the not-found text {{TODO: confirm text}}, used as written. A key that is not 11 digits cannot match a legacy record.

30. **Blank confirm.**
    - **Decision:** A blank confirm with a valid account shows the balance and "Confirm to make a bill payment...".
    - **Basis:** BR-04 and the flow diagram (Balance > 0 → Confirm Payment).

31. **Nothing to pay.**
    - **Decision:** Balance ≤ 0 → "You have nothing to pay...". This applies both on lookup and on Y.
    - **Basis:** BR-03.

32. **Confirm is a free-text field.**
    - **Decision:** Confirm is a one-character text input, not a Y/N select.
    - **Basis:** The screenshot shows a dropdown, but BR-04 requires an "other value" error, which a select could never produce.

33. **No status check and no partial payment.**
    - **Decision:** The full current balance is paid, and `active_status` is not checked.
    - **Basis:** BR-07 {{DECISION}} "preserve for release 1".

34. **The payment transaction record.**
    - **Decision:** The new transaction has these values:

      | Field | Value |
      |---|---|
      | `type_cd` | `"02"` |
      | `cat_cd` | `2` |
      | `source` | `"POS TERM"` |
      | `desc` | `"BILL PAYMENT - ONLINE"` |
      | `amt` | current balance |
      | `merchant_id` | `999999999` |
      | `merchant_name` | `"BILL PAYMENT"` |
      | `merchant_city` | `"N/A"` |
      | `merchant_zip` | `"N/A"` |
      | `card_num` | from the xref by account |

    - **Basis:** BR-05 gives the type, category, source, description, merchant id and name, but its literals are marked {{TODO: verify literals}}. The wiki does not give `merchant_city` or `merchant_zip`; I used the COBIL00C values `N/A`. `cat_cd` 0002 is stored as the number 2 because the contract stores `cat_cd` as an int without leading zeros.

35. **Timestamps.**
    - **Decision:** `orig_ts` = `proc_ts` = the current UTC time as `YYYY-MM-DD HH:MM:SS.000000` (26 characters).
    - **Basis:** The contract format is 26 characters. The wiki names no time zone and no sub-second precision.

36. **Transaction id.**
    - **Decision:** The new id is the highest existing `tran_id` + 1, zero-padded to 16 characters. String arithmetic is used, so there is no precision loss. An empty store gives `0000000000000001`.
    - **Basis:** BR-06.

37. **Balance update.**
    - **Decision:** Only `curr_bal` changes, to `curr_bal − amt` (that is, 0). The update is guarded by the balance that was read (optimistic check). The cycle credit/debit fields are not touched.
    - **Basis:** BR-06 says "balance is reduced by the payment and the account rewritten", and the data mapping passes `expectedVersion`. Legacy COBIL00C updates only the balance.

38. **Atomicity.**
    - **Decision:** The transaction is inserted first, then the account is updated. If the update fails or matches nothing (the balance changed meanwhile), the inserted transaction is deleted and "Unable to Update Account..." is shown.
    - **Basis:** The data-mapping {{DECISION}} calls for a compensating step because persistence has no cross-collection transaction. The message text follows COBIL00C.

39. **Success.**
    - **Decision:** On success the screen is cleared and shows "Payment successful. Your Transaction ID is <16-digit id>.".
    - **Basis:** BR-08 says "Payment successful. Your Transaction ID is ." {{TODO: confirm text}}. I filled in the id, as the screenshot shows (`…0000000000000012.`).

40. **Clear and Back.**
    - **Decision:** Clear empties the fields and message. Back returns to the menu. The session's account id is updated after any successful account lookup.
    - **Basis:** UI flow "Back → menu"; the Clear button is in the screenshot. The account-id update follows the COMMAREA convention (as in #26).

41. **Other store-error messages.**
    - **Decision:** "Unable to lookup Account...", "Unable to lookup XREF AIX file..." and "Unable to Add Bill pay Transaction..." are taken from COBIL00C.
    - **Basis:** The wiki is silent on technical read and write errors.

## Testing notes

- Every workflow was run against temporary test documents for each documented path:
  - **Sign-on:** missing fields, unknown user, wrong password, U and A users.
  - **Menu:** invalid option, coming-soon option, not-installed option, routing.
  - **Account view:** BR-01 to BR-04, and the happy path with formatting.
  - **Bill payment:** empty id, invalid confirm, nothing to pay, confirm prompt, a successful payment (transaction and account both checked in the stores), id increment, compensating delete.
- All test documents, the temporary operations and the temporary seed workflow were removed afterwards. The stores are empty, ready for the operator's seed load.
- The UI Flow passed `analyze_ui_flow` with no errors after the fixes. Two warning groups remain: literal text instead of substitution tags (#7) and multiple workflows per page (#5). The UI was not exercised in a browser session.
