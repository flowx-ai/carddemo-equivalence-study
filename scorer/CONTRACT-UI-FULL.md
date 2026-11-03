<!-- DRAFT for the full-application study. Not frozen. Extends builds/inputs/online-sonnet-sf6/CONTRACT-UI.md (A24's copy stays as it is). This comment does not render in the bundle. -->
# Data contract

The formats in which the operator loads data into the application and reads it back, and the run date the application uses. The contract fixes **formats only**. It says nothing about behaviour.

## Stores

The application keeps the data below in FlowX Database stores, one store per file. The operator loads each store
from its seed file before testing and reads each store back after testing, with the platform's own document tools.
A store's documents hold the fields of its file under the names below; the application may add fields of its own.
Values are read back in the type and text in which they were loaded, unless the application changed them.

## Seed files

One JSON file per store: a list of objects, one per record, in any order. Each file comes from the legacy file
named, with the copybook's layout. Strings carry no trailing spaces. Amounts are JSON numbers with at most two
decimals. Dates are strings `YYYY-MM-DD`.

| Seed file | Legacy file | Copybook | Key |
|---|---|---|---|
| `users.json` | USRSEC | CSUSR01Y | `usr_id` |
| `accounts.json` | ACCTDAT | CVACT01Y | `acct_id` |
| `customers.json` | CUSTDAT | CVCUS01Y | `cust_id` |
| `card_xref.json` | CCXREF | CVACT03Y | `card_num` (and `acct_id`, not unique) |
| `cards.json` | CARDDAT | CVACT02Y | `card_num` (and `acct_id`, not unique) |
| `transactions.json` | TRANSACT | CVTRA05Y | `tran_id` |

Fields, in copybook order (type in brackets when it is not a string):

- **users:** `usr_id, first_name, last_name, pwd, usr_type`
- **accounts:** `acct_id (int), active_status, curr_bal (amount), credit_limit (amount), cash_credit_limit
  (amount), open_date (date), expiration_date (date), reissue_date (date), curr_cyc_credit (amount),
  curr_cyc_debit (amount), addr_zip, group_id`
- **customers:** `cust_id (int), first_name, middle_name, last_name, addr_line_1, addr_line_2, addr_line_3,
  addr_state_cd, addr_country_cd, addr_zip, phone_num_1, phone_num_2, ssn (int), govt_issued_id, dob (date),
  eft_account_id, pri_card_holder_ind, fico_credit_score (int)`
- **card_xref:** `card_num, cust_id (int), acct_id (int)`
- **cards:** `card_num, acct_id (int), cvv_cd (int), embossed_name, expiration_date (date), active_status`
- **transactions:** `tran_id, type_cd, cat_cd (int), source, desc, amt (amount), merchant_id (int),
  merchant_name, merchant_city, merchant_zip, card_num, orig_ts, proc_ts`

Integers are written without leading zeros; the copybook width gives their display width. `tran_id` and `card_num`
are 16-character strings. `orig_ts` and `proc_ts` are 26-character timestamp strings as found in the legacy file.

## Run date

The application takes the current date and time from one project configuration parameter, `RUN_TIMESTAMP`, whose
value is `2022-07-18 10:00:00` in the format `YYYY-MM-DD HH:MM:SS`. Wherever the application needs today's date or the current
time, for a value it shows, stores or computes with, it reads this parameter, in screens, workflows and batch steps alike,
and it does not read the system clock. The operator creates the parameter in the project before the build starts and may set a
different value between tests. A workflow script reads it as `additionalData.applicationConfiguration.RUN_TIMESTAMP`. This fixes where the
date comes from; which behaviour uses it comes from the wiki.

## Dates on screens

A date a screen shows appears in the format the wiki documents for that screen. The FlowX web renderer formats any text value that
looks like an ISO date (`YYYY-MM-DD`, with or without a time) in the project's date display format, even when the attribute is a
string, unless the component's own date formatting says otherwise. Set the format wherever a screen shows a date.

## Report requests

When a screen requests a report, the application adds one document to a store named `job_requests`, in addition to
whatever else it does: `start_date (date), end_date (date)`, the period the report was requested for. The operator
reads this store back after testing. A request that the application refuses adds no document.
