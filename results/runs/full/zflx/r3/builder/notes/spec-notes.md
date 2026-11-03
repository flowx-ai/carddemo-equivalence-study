# Spec notes (working file, distilled from app-sonnet-kk7.pdf, 234 pages)

## Contracts (pp. 225-234)
### CONTRACT-UI
- FlowX Database stores, one per seed file: users(usr_id), accounts(acct_id), customers(cust_id), card_xref(card_num; acct_id not unique), cards(card_num), transactions(tran_id). Plus job_requests {start_date, end_date} on each accepted report request (refused -> no doc).
- Fields (copybook order):
  - users: usr_id, first_name, last_name, pwd, usr_type
  - accounts: acct_id(int), active_status, curr_bal, credit_limit, cash_credit_limit, open_date(date), expiration_date(date), reissue_date(date), curr_cyc_credit, curr_cyc_debit, addr_zip, group_id
  - customers: cust_id(int), first_name, middle_name, last_name, addr_line_1..3, addr_state_cd, addr_country_cd, addr_zip, phone_num_1, phone_num_2, ssn(int), govt_issued_id, dob(date), eft_account_id, pri_card_holder_ind, fico_credit_score(int)
  - card_xref: card_num, cust_id(int), acct_id(int)
  - cards: card_num, acct_id(int), cvv_cd(int), embossed_name, expiration_date(date), active_status
  - transactions: tran_id, type_cd, cat_cd(int), source, desc, amt(amount), merchant_id(int), merchant_name, merchant_city, merchant_zip, card_num, orig_ts, proc_ts
- ints w/o leading zeros (display width from copybook); tran_id/card_num 16-char strings; orig_ts/proc_ts 26-char timestamps as in legacy.
- Values read back in type/text loaded unless app changed them. App may add own fields.
- RUN_TIMESTAMP config param "2022-07-18 10:00:00" (YYYY-MM-DD HH:MM:SS); script: additionalData.applicationConfiguration.RUN_TIMESTAMP. Never system clock.
- Dates on screens: format per wiki; set component date format.

### CONTRACT.md (POSTTRAN, INTCALC)
- inputs fixed width: dailytran.dat CVTRA06Y 350; acctdata.dat CVACT01Y 300; cardxref.dat CVACT03Y 50; tcatbal.dat CVTRA01Y 50; discgrp.dat CVTRA02Y 50; custdata CUSTREC 500; carddata CVACT02Y 150; trantype CVTRA03Y 60; trancatg CVTRA04Y 60
- params: business date 2022-07-18, INTCALC parm 2022071800
- INTCALC gets oracle POSTTRAN outputs as inputs (acct + tcatbal)
- outputs JSON list: posttran_transact (txn fields), posttran_dalyrejs (txn fields + reason(int) + reason_desc), posttran_acctdata (all accounts), posttran_tcatbal (acct_id,type_cd,cat_cd,bal), intcalc_systran (txn), intcalc_acctdata (accounts)
- txn fields: tran_id,type_cd,cat_cd(int),source,desc,amt,merchant_id(int),merchant_name,merchant_city,merchant_zip,card_num,orig_ts,proc_ts
- account fields: acct_id(int), active_status, curr_bal, credit_limit, cash_credit_limit, open_date, expiration_date, reissue_date, curr_cyc_credit, curr_cyc_debit, addr_zip, group_id
- optional flags.json

### CONTRACT-L1 (CREASTMT, TRANREPT)
- statement gen inputs: transact.dat(CVTRA05Y 350), acctdata, cardxref, custdata(CUSTREC 500)
- tranrept inputs: transact.dat, cardxref, trantype, trancatg; params start 2022-07-01 end 2022-07-31
- outputs: creastmt_statements.txt (80), creastmt_statements_html.txt (100), tranrept_report.txt (133); may return as string or list of strings keyed by name w/o extension
- statement text layout lines 0..15 (see pdf p.231): 
  0: '*'x31 + 'START OF STATEMENT' + '*'x31
  1: name X(75)+5sp; 2: addr1 X(50); 3: addr2 X(50); 4: addr3 X(80)
  5: '-'x80; 6: 33sp 'Basic Details'; 5: '-'x80
  7: 'Account ID         :' (1-20) + acct X(20)
  8: 'Current Balance    :' + 9(9).99-
  9: 'FICO Score         :' + X(20)
  10: '-'x80; 11: 30sp 'TRANSACTION SUMMARY'; 12 '-'x80
  13: 'Tran ID' pad16 + 'Tran Details' pad51 + '  Tran Amount' (80)
  12: '-'x80
  14 per txn: id X(16) sp details X(49) '$' Z(9).99-
  12: '-'x80
  14A: 'Total EXP:' (1-10) spaces 11-66, '$' at 67, 68-80 Z(9).99-
  15: '*'x32 + 'END OF STATEMENT' + '*'x32
- html layout: pdf pp. 231-233 (copy exactly)
- tranrept line types p.233

### CONTRACT-BATCH-ADDED (7 steps)
- RUN_TIMESTAMP 2022-07-18 10:00:00; inputs acctdata, carddata, custdata, cardxref, transact, dailytran .dat; export.json; missing input = absent file
- outputs JSON list in output order; null for unset; <step>_sysout.txt log lines; <step>_rc.txt on error stop
- CBACT01C acctext: acctext_out.json (account fields w/o addr_zip), acctext_array.json (acct_id, curr_bal_1, curr_cyc_debit_1 .. curr_bal_5, curr_cyc_debit_5), acctext_vb.json (either {acct_id, active_status} or {acct_id, curr_bal, credit_limit, reissue_yyyy}), acctext_sysout.txt
- CBACT02C cardprint_sysout.txt; CBACT03C xrefprint_sysout.txt; CBCUS01C custprint_sysout.txt; CBTRN01C dailycheck_sysout.txt
- CBEXPORT export.json + export_sysout.txt: rec_type, seq(int), branch_id, region_code, then record fields, timestamp
- CBIMPORT import_customers/accounts/card_xref/transactions/cards.json, import_errors.json(rec_type, seq, message), import_sysout.txt
- *_sysout: printed record = fixed-width line of input record.

## UI flows read (pp 2-30): signon, main-menu, admin-menu, account-view, account-update, card-list, card-view, card-update, transaction-list, transaction-view, transaction-add, report-request, bill-payment, user-management
(key messages captured in later build; see pdf for exact texts)

## Copybook layouts (pp 175-180) — 0-based offsets
- CVACT01Y 300: acct_id 9(11)@0, active X1@11, curr_bal S9(10)V99 12@12, credit_limit 12@24, cash_credit_limit 12@36, open_date X10@48, expiration X10@58, reissue X10@68, cyc_credit 12@78, cyc_debit 12@90, addr_zip X10@102, group_id X10@112, filler 178
- CUSTREC/CVCUS01Y 500: cust_id 9(9)@0, first X25@9, middle X25@34, last X25@59, addr1 X50@84, addr2 X50@134, addr3 X50@184, state X2@234, country X3@236, zip X10@239, phone1 X15@249, phone2 X15@264, ssn 9(9)@279, govt X20@288, dob X10@308, eft X10@318, pri X1@328, fico 9(3)@329, filler 168
- CVACT02Y 150: card_num X16@0, acct_id 9(11)@16, cvv 9(3)@27, embossed X50@30, expiration X10@80, active X1@90, filler 59
- CVACT03Y 50: card_num X16@0, cust_id 9(9)@16, acct_id 9(11)@25, filler 14
- CVTRA05Y/06Y 350: tran_id X16@0, type X2@16, cat 9(4)@18, source X10@22, desc X100@32, amt S9(9)V99 11@132, merchant_id 9(9)@143, name X50@152, city X50@202, zip X10@252, card X16@262, orig_ts X26@278, proc_ts X26@304, filler 20
- CVTRA01Y 50: acct 9(11)@0, type X2@11, cat 9(4)@13, bal S9(9)V99 11@17, filler 22
- CVTRA02Y 50: group X10@0, type X2@10, cat 9(4)@12, rate S9(4)V99 6@16, filler 28
- CVTRA03Y 60: type X2, desc X50, filler 8. CVTRA04Y 60: type X2, cat 9(4), desc X50, filler 4
- CSUSR01Y 80: id X8, fname X20, lname X20, pwd X8, type X1, filler 23
- CVEXPORT 500: type X1, ts X26, seq COMP, branch X4, region X5, data 460 (C,A,X,T,D)
- Signed zoned (overpunch): last char {=+0, A-I=+1..9, }=-0, J-R=-1..9 (or plain digit = +)
- Enumerations: types 01 Purchase,02 Payment,03 Credit,04 Authorization,05 Refund,06 Reversal,07 Adjustment; categories p.185-186; disclosure groups A000000000, DEFAULT, ZEROAPR. Account.groupId fallback DEFAULT.

## Business rules (pp 2-125)
- Signon: "Please enter User ID ..." / "Please enter Password ..." / "User not found. Try again ..." / "Wrong Password. Try again ..." / "Unable to verify the User ..."; uppercase id+pwd, max 8; A->admin menu, U->main menu; no pwd in session.
- Main menu 11 opts: 1 acct view,2 acct update,3 card list,4 card view,5 card update,6 tran list,7 tran view,8 tran add,9 report,10 bill pay,11 pending auth (toggle pendingAuthorizationEnabled; not installed -> "This option ... is not installed..."). Invalid "Please enter a valid option number...".
- Admin menu 1-4 user list/add/update/delete, 5-6 tran type (toggle transactionTypeMaintenanceEnabled).
- Account view: "Account number must be a non zero 11 digit number"; "Did not find this account in account card xref file"; "Did not find this account in account master file"; "Did not find associated customer in master file"; SSN masked ***-**-6789; ISO dates; $ #,##0.00.
- Account update: search/edit/review/result. "Account Active Status must be Y or N"; "Credit Limit must be supplied"/"Credit Limit is not valid"; "Name can only contain alphabets and spaces"; SSN p1 not 000/666/900-999, p2 not 00, p3 not 0000; phone 3/3/4; US state + state/zip; "FICO Score: should be between 300 and 850"; primary Y/N; "No change detected with respect to values fetched."; "Changes validated.Press F5 to save"; "Changes committed to database"; "Record changed by some one else. Please review"; "Update of record failed"; "Could not lock account record for update"/"Could not lock customer record for update".
- Card list: filters acct 11 / card 16 ("Account number must be a 11 digit number", "Card number if supplied must be a 16 digit number"); order card_num; page 7; S/U; "Did not find cards for this search condition"; no CVV.
- Card view: "Account number not provided", "No input received"; expiry MM/YYYY.
- Card update: "Card name can only contain alphabets and spaces"; "Card Active Status must be Y or N"; "Card expiry month must be between 1 and 12"; "Invalid card expiry year" 1950-2099; keep day; "No change detected ..."; "Changes validated. Press F5 to save"; "Changes committed to database".
- Tran list: 10/page asc tran_id; "Tran ID must be Numeric ..."; "Invalid selection. Valid value is S"; "You are already at the top of the page..."/"You are already at the bottom of the page..."; cols Sel, Tran ID, Date MM/DD/YY, Description, Amount.
- Tran view: "Tran ID can NOT be empty..."; "Transaction ID NOT found..."; "Unable to lookup Transaction...".
- Tran add: "Account or Card Number must be entered..."; "Account ID NOT found..."; "Card Number NOT found..."; "Account ID must be Numeric..."; "Card Number must be Numeric..."; "<X> can NOT be empty..." (Type CD, Category CD, Source, Description, Amount, Orig Date, Proc Date, Merchant ID, Merchant Name, Merchant City, Merchant Zip); "Type CD must be Numeric..."; "Category CD must be Numeric..."; "Merchant ID must be Numeric..."; "Amount should be in format -99999999.99"; "Orig Date should be in format YYYY-MM-DD"; "Orig Date - Not a valid date..."; "Confirm to add this transaction..."; "Invalid value. Valid values are (Y/N)..."; id=last+1; "Transaction added successfully.  Your Tran ID is n."; PF5 copy last; no balance update.
- Report: Monthly/Yearly/Custom from RUN_TIMESTAMP; "Select a report type to print report..."; "Start Date - Not a valid date..."; confirm Y/N "Please confirm to print the report..."; success "... report submitted for printing ..."; job_requests doc.
- Bill pay: "Acct ID can NOT be empty..."; "Account ID NOT found..."; "You have nothing to pay..."; "Confirm to make a bill payment..."; Y/N; txn type 02 cat 2 source "POS TERM" desc "BILL PAYMENT - ONLINE" merchant 999999999 name "BILL PAYMENT"; bal -= amt; "Payment successful.  Your Transaction ID is n."
- Users: list 10/page; U/D "Invalid selection. Valid values are U and D"; add "First Name can NOT be empty..." etc; "User ID already exist..."; "User X has been added ..."; update "Please modify to update ..."; "User ID NOT found..."; delete "User X has been deleted ...".
- POSTTRAN: 100 INVALID CARD NUMBER FOUND, 101 ACCOUNT RECORD NOT FOUND, 102 OVERLIMIT TRANSACTION (cyc_credit - cyc_debit + amt > limit), 103 TRANSACTION RECEIVED AFTER ACCT EXPIRATION (exp < orig date); last wins; post: proc_ts=now, tcatbal upsert, bal+=amt, amt>=0 credit else debit. Any reject -> RC 4.
- INTCALC: rate by group+type+cat else DEFAULT; interest = bal*rate/1200; txn type 01 cat 05 source "System" desc "Int. for a/c <acct>", id = PARM + 6-digit suffix; per acct bal += total interest, cyc credit/debit = 0.
- CREASTMT by xref order; all txns per card; TRANREPT filter proc date in range, by card, page/account/grand totals.
