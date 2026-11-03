# Working notes (condensed from app-sonnet-kk7.pdf, 234 pages)

FlowX env: dev-env, platform 5.13.0, appId <uuid>, appVersionId <uuid>

## FlowX IDs
DB systems (resourceId / resDefId):
- users <uuid> / <uuid>
- accounts <uuid> / <uuid>
- customers <uuid> / <uuid>
- card_xref <uuid> / <uuid>
- cards <uuid> / <uuid>
- transactions <uuid> / <uuid>
- job_requests <uuid> / <uuid>

DB ops (flowxUuid; params):
- users find <uuid> (filter <uuid>, sort <uuid>, limit <uuid>, skip <uuid>)
- users insert <uuid> (doc <uuid>)
- users update <uuid> (filter <uuid>, update <uuid>)
- users delete <uuid> (filter <uuid>)
- accounts find <uuid> (filter <uuid>, sort <uuid>, limit <uuid>, skip <uuid>)
- accounts update <uuid> (filter <uuid>, update <uuid>)
- customers find <uuid> (filter <uuid>, sort <uuid>, limit <uuid>, skip <uuid>)
- customers update <uuid> (filter <uuid>, update <uuid>)
- card_xref find <uuid> (filter <uuid>, sort <uuid>, limit <uuid>, skip <uuid>)
- cards find <uuid> (filter <uuid>, sort <uuid>, limit <uuid>, skip <uuid>)
- cards update <uuid> (filter <uuid>, update <uuid>)
- transactions find <uuid> (filter <uuid>, sort <uuid>, limit <uuid>, skip <uuid>)
- transactions insert <uuid> (doc <uuid>)
- job_requests insert <uuid> (doc <uuid>)
ui_carddemo <uuid> / resDef <uuid> — TESTED OK (all screen types).
FlowX gotcha: object outputs are DEEP-MERGED into existing workflow state -> never default a key in one node and refine in another.
Apply-script fixes DONE (signoff thank-you; delete msg). UI pages ALL built (cards 63430..63690, LOAD actions on every page), analyze_ui_flow 0 errors (warnings: substitution tags, page query params). NEXT: batch workflows.
Test harness (zz_seed_testdata, zz_test_db, zz* DB ops) REMOVED after wiping all stores to empty (2026-11-02).
Batch workflows: see batch/README.md (all 7 configured and tested via run_workflow_node).
UI Flow carddemo <uuid>. Pages (id / flowxUuid):
Home 63382 <uuid> (SignonCard 63383, form 63384, inputs 63385/63386, msg 63388, btn 63387)
AcctView 63393 <uuid>; AcctUpdate 63394 <uuid>
CardList 63395 <uuid>; CardView 63396 <uuid>; CardUpdate 63397 <uuid>
TranList 63398 <uuid>; TranView 63399 <uuid>; TranAdd 63400 <uuid>
Report 63401 <uuid>; BillPay 63402 <uuid>
UserList 63403 <uuid>; UserAdd 63404 <uuid>; UserUpdate 63405 <uuid>; UserDelete 63406 <uuid>
Collection: key = rows path; COLLECTION_PROTOTYPE child; row text ${field}; row button NAVIGATE_TO + collectionItemSaveKey.

## CONTRACT-UI (p226-227)
Stores = FlowX Database (NOSQL_DB), one per file; operator loads from seed JSON, reads back. Fields named as below; app may add own fields. Values read back in type/text loaded unless changed.
- users.json (USRSEC/CSUSR01Y) key usr_id: usr_id, first_name, last_name, pwd, usr_type
- accounts.json key acct_id: acct_id(int), active_status, curr_bal(amt), credit_limit(amt), cash_credit_limit(amt), open_date(date), expiration_date(date), reissue_date(date), curr_cyc_credit(amt), curr_cyc_debit(amt), addr_zip, group_id
- customers.json key cust_id: cust_id(int), first_name, middle_name, last_name, addr_line_1..3, addr_state_cd, addr_country_cd, addr_zip, phone_num_1, phone_num_2, ssn(int), govt_issued_id, dob(date), eft_account_id, pri_card_holder_ind, fico_credit_score(int)
- card_xref.json key card_num (+acct_id, not unique): card_num, cust_id(int), acct_id(int)
- cards.json key card_num (+acct_id): card_num, acct_id(int), cvv_cd(int), embossed_name, expiration_date(date), active_status
- transactions.json key tran_id: tran_id, type_cd, cat_cd(int), source, desc, amt(amt), merchant_id(int), merchant_name, merchant_city, merchant_zip, card_num, orig_ts, proc_ts
Ints no leading zeros; tran_id & card_num 16-char strings; orig_ts/proc_ts 26-char timestamp strings (legacy format e.g. "2022-06-10 19:27:53.000000"?). Dates YYYY-MM-DD strings. Amounts JSON numbers <=2 decimals.
RUN_TIMESTAMP config param "2022-07-18 10:00:00" (YYYY-MM-DD HH:MM:SS); script reads additionalData.applicationConfiguration.RUN_TIMESTAMP. Never system clock.
Dates on screens: format as wiki documents per screen; set date format on components.
Report requests: when a screen requests a report, add one doc to store `job_requests`: start_date(date), end_date(date). Refused request adds none.

## CONTRACT.md (batch POSTTRAN/INTCALC)
Inputs fixed width: dailytran.dat CVTRA06Y 350; acctdata.dat CVACT01Y 300; cardxref.dat CVACT03Y 50; tcatbal.dat CVTRA01Y 50; discgrp.dat CVTRA02Y 50; custdata 500, carddata 150, trantype 60, trancatg 60.
Run params: business date 2022-07-18; INTCALC PARM 2022071800.
Outputs JSON lists: posttran_transact.json, posttran_dalyrejs.json (+reason int, reason_desc), posttran_acctdata.json, posttran_tcatbal.json (acct_id,type_cd,cat_cd,bal), intcalc_systran.json, intcalc_acctdata.json.
Tran fields: tran_id,type_cd,cat_cd(int),source,desc,amt,merchant_id(int),merchant_name,merchant_city,merchant_zip,card_num,orig_ts,proc_ts
Acct fields: acct_id(int),active_status,curr_bal,credit_limit,cash_credit_limit,open_date,expiration_date,reissue_date,curr_cyc_credit,curr_cyc_debit,addr_zip,group_id
Optional flags.json.

## CONTRACT-L1 (statement gen / daily tran report)
Inputs: transact.dat(CVTRA05Y 350), acctdata, cardxref, custdata(CUSTREC 500); report: transact, cardxref, trantype, trancatg.
Report params: start 2022-07-01, end 2022-07-31.
Outputs: creastmt_statements.txt (80), creastmt_statements_html.txt (100), tranrept_report.txt (133). Layouts on p230-232 (see PDF).

## CONTRACT-BATCH-ADDED (p233-234)
RUN_TIMESTAMP. Inputs acctdata.dat, carddata.dat, custdata.dat, cardxref.dat, transact.dat, dailytran.dat; export.json.
Steps: CBACT01C acctext_out.json, acctext_array.json, acctext_vb.json, acctext_sysout.txt; CBACT02C cardprint_sysout.txt; CBACT03C xrefprint_sysout.txt; CBCUS01C custprint_sysout.txt; CBTRN01C dailycheck_sysout.txt; CBEXPORT export.json, export_sysout.txt; CBIMPORT import_customers/accounts/card_xref/transactions/cards.json, import_errors.json, import_sysout.txt.
acctext_out: account fields w/o addr_zip. acctext_array: acct_id, curr_bal_1, curr_cyc_debit_1..curr_bal_5, curr_cyc_debit_5. acctext_vb: either {acct_id, active_status} or {acct_id, curr_bal, credit_limit, reissue_yyyy}. export: rec_type, seq(int), branch_id, region_code, then record fields; timestamp. import_errors: rec_type, seq, message. sysout printed record = fixed-width line of input record.
<step>_rc.txt return code on error.

## Online screens (key messages)
- signon: userId req max8 uppercase; pwd req; "Please enter User ID ...","Please enter Password ...","User not found. Try again ...","Wrong Password. Try again ...","Unable to verify the User ..."; A->admin menu, U->main menu; Exit -> thank-you.
- main menu 11 options (11 pending auth optional toggle); "Please enter a valid option number..."; admin menu 6 options (5,6 optional toggle). Exit->signon.
- account-view: "Account number must be a non zero 11 digit number"; "Did not find this account in account card xref file"; "Did not find this account in account master file"; "Did not find associated customer in master file"; SSN masked ***-**-6789; currency $ #,##0.00; dates ISO.
- account-update: editable fields; validations BR-01..14; "Changes validated.Press F5 to save"; "Changes committed to database"; "Record changed by some one else. Please review"; "No change detected with respect to values fetched."; "Update of record failed"; FICO 300-850; SSN rules; phone 3/3/4; state valid; Y/N.
- card-list: filters acct 11 digits ("Account number must be a 11 digit number"), card 16 ("Card number if supplied must be a 16 digit number"); S view/U update; one row only; listPageSize (legacy 7); "Did not find cards for this search condition"; next/prev.
- card-view: acct+card required; "Account number not provided", "Account number must be a non zero 11 digit number", "Card number if supplied must be a 16 digit number", "No input received", "Did not find cards for this search condition"; shows name, active, expiry MM/YYYY; no CVV.
- card-update: name alpha+spaces "Card name can only contain alphabets and spaces"; "Card Active Status must be Y or N"; "Card expiry month must be between 1 and 12"; "Invalid card expiry year" 1950-2099; no change; concurrency; expiry day preserved. "Changes validated. Press F5 to save"
- transaction-list: 10/page asc tran id; start id numeric "Tran ID must be Numeric ..."; S/s only "Invalid selection. Valid value is S"; "You are already at the top of the page..." / "You are already at the bottom of the page..."; cols Sel, Tran ID, Date(MM/DD/YY), Description, Amount.
- transaction-view: "Tran ID can NOT be empty...", "Transaction ID NOT found...", "Unable to lookup Transaction..."; Fetch/Clear/Back.
- transaction-add: acct or card; xref resolve; "Account or Card Number must be entered...", "Account ID must be Numeric...", "Card Number must be Numeric...", "Account ID NOT found...", "Card Number NOT found...", mandatory field msgs, "Type CD must be Numeric...", "Category CD must be Numeric...", amount "-99999999.99" first char +/-: "Amount should be in format -99999999.99"; dates YYYY-MM-DD "Orig Date should be in format YYYY-MM-DD", "Orig Date - Not a valid date..."; "Merchant ID must be Numeric..."; confirm Y/N "Confirm to add this transaction...", "Invalid value. Valid values are (Y/N)..."; tran id = last+1 (FlowX sequence); no balance update; success "Transaction added successfully. Your Tran ID is n."; copy last tran (PF5) from card's latest.
- report-request: Monthly/Yearly/Custom; "Select a report type to print report..."; custom dates "Start Date - Not a valid date..."; confirm "Please confirm to print the XXX report..." Y/N; success "report submitted for printing ..." ; writes job_requests doc.
- bill-payment: "Acct ID can NOT be empty...","Account ID NOT found...","You have nothing to pay...","Confirm to make a bill payment...", Y pay N clear, other "Invalid value. Valid values are (Y/N)..."; full balance; tran type 02 cat 0002 source "POS TERM" desc "BILL PAYMENT - ONLINE" merchant id 999999999 name "BILL PAYMENT"; balance -= amt; tran id last+1; "Payment successful. Your Transaction ID is n."
- user-mgmt: list 10/page U/D; add/update/delete; "First Name can NOT be empty...","Last Name can NOT be empty...","User ID can NOT be empty...","Password can NOT be empty...","User Type can NOT be empty..."; "User ID already exist..."; "Please modify to update ..."; "User ID NOT found..."; "Invalid selection. Valid values are U and D"; "User xxx has been added/updated/deleted ...".

## Batch
- POSTTRAN (CBTRN02C): per dailytran: xref by card else 100 "INVALID CARD NUMBER FOUND"; acct not found 101 "ACCOUNT RECORD NOT FOUND"; overlimit curr_cyc_credit - curr_cyc_debit + amt > credit_limit -> 102 "OVERLIMIT TRANSACTION"; acct expiry < tran orig date -> 103 "TRANSACTION RECEIVED AFTER ACCT EXPIRATION" (overwrites 102). Post: proc_ts=now; TCATBAL upsert; curr_bal += amt; amt>=0 cyc_credit += amt else cyc_debit += amt. Rejects: 350 image + 4-digit reason + 76 desc. RC 4 if rejects.
- INTCALC (CBACT04C): for each tcatbal (grouped by account): rate key group_id+type+cat; fallback DEFAULT; if rate!=0 interest=(bal*rate)/1200; tran type 01 cat 05 source "System" desc "Int. for a/c <acctId>" amt=interest; tran id = PARM(2022071800)+suffix; on acct change: curr_bal += total interest; cyc credit=0, debit=0. no fees. rounding: COBOL truncation (TODO).
- COMBTRAN: sort TRANSACT.BKUP + SYSTRAN by tran id.
- CREASTMT: per xref (card order) statement; lines layout in CONTRACT-L1.
- TRANREPT: filter proc ts date in range, sorted by card number; type/cat descs; page total, account total(card change), grand total. Report default range from config reportStartDate/reportEndDate.
