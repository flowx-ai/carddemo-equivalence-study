# Wiki notes (from app-sonnet-kk7.pdf, 234 pages)

FlowX context: profile full_ui, appId <uuid>, appVersionId <uuid>, platform 5.13.0

## CONTRACT-UI.md (p.226-227) — data contract (FORMATS ONLY)
- Stores: FlowX Database stores, one store per file. Operator loads each store from seed file before testing, reads back after with platform doc tools. Documents hold fields of its file under names below; app may add its own fields. Values read back in type/text as loaded unless app changed them.
- Seed files: JSON list of objects, any order. Strings no trailing spaces. Amounts = JSON numbers <=2 decimals. Dates = strings YYYY-MM-DD.
  | seed | legacy | copybook | key |
  | users.json | USRSEC | CSUSR01Y | usr_id |
  | accounts.json | ACCTDAT | CVACT01Y | acct_id |
  | customers.json | CUSTDAT | CVCUS01Y | cust_id |
  | card_xref.json | CCXREF | CVACT03Y | card_num (and acct_id, not unique) |
  | cards.json | CARDDAT | CVACT02Y | card_num (and acct_id, not unique) |
  | transactions.json | TRANSACT | CVTRA05Y | tran_id |
- Fields (copybook order; type when not string):
  - users: usr_id, first_name, last_name, pwd, usr_type
  - accounts: acct_id (int), active_status, curr_bal (amount), credit_limit (amount), cash_credit_limit (amount), open_date (date), expiration_date (date), reissue_date (date), curr_cyc_credit (amount), curr_cyc_debit (amount), addr_zip, group_id
  - customers: cust_id (int), first_name, middle_name, last_name, addr_line_1, addr_line_2, addr_line_3, addr_state_cd, addr_country_cd, addr_zip, phone_num_1, phone_num_2, ssn (int), govt_issued_id, dob (date), eft_account_id, pri_card_holder_ind, fico_credit_score (int)
  - card_xref: card_num, cust_id (int), acct_id (int)
  - cards: card_num, acct_id (int), cvv_cd (int), embossed_name, expiration_date (date), active_status
  - transactions: tran_id, type_cd, cat_cd (int), source, desc, amt (amount), merchant_id (int), merchant_name, merchant_city, merchant_zip, card_num, orig_ts, proc_ts
- Integers without leading zeros; copybook width gives display width. tran_id and card_num 16-char strings. orig_ts/proc_ts 26-char timestamp strings as in legacy file.
- Run date: project config param RUN_TIMESTAMP = "2022-07-18 10:00:00" (YYYY-MM-DD HH:MM:SS). Everywhere app needs today/now (screens, workflows, batch) read this param, never system clock. Workflow script reads `additionalData.applicationConfiguration.RUN_TIMESTAMP`. Operator creates the param.
- Dates on screens: shown in format wiki documents for that screen. FlowX renderer formats ISO-looking text in project's date display format unless component's date formatting says otherwise. Set the format wherever a screen shows a date.
- Report requests: when a screen requests a report, app adds one doc to store `job_requests`: start_date (date), end_date (date). Refused request adds no doc.

## CONTRACT.md (p.228-229) — batch I/O (POSTTRAN, INTCALC)
- Inputs fixed-width, one record per line: dailytran.dat CVTRA06Y 350; acctdata.dat CVACT01Y 300; cardxref.dat CVACT03Y 50; tcatbal.dat CVTRA01Y 50; discgrp.dat CVTRA02Y 50; custdata.dat CUSTREC 500, carddata.dat CVACT02Y 150, trantype.dat CVTRA03Y 60, trancatg.dat CVTRA04Y 60.
- Run params: business date 2022-07-18, INTCALC parm 2022071800.
- Step isolation: INTCALC gets oracle POSTTRAN outputs as acct & tcatbal inputs.
- Outputs JSON list any order; strings may omit trailing spaces; amounts JSON strings or numbers <=2 dec.
  - posttran_transact.json (POSTTRAN): transaction fields for every posted txn
  - posttran_dalyrejs.json: txn fields + reason (int) + reason_desc for each rejected
  - posttran_acctdata.json: account fields every account after posting
  - posttran_tcatbal.json: acct_id, type_cd, cat_cd, bal
  - intcalc_systran.json (INTCALC): txn fields every interest txn written
  - intcalc_acctdata.json: account fields every account after interest
  - Txn fields: tran_id, type_cd, cat_cd (int), source, desc, amt, merchant_id (int), merchant_name, merchant_city, merchant_zip, card_num, orig_ts, proc_ts
  - Account fields: acct_id (int), active_status, curr_bal, credit_limit, cash_credit_limit, open_date, expiration_date, reissue_date, curr_cyc_credit, curr_cyc_debit, addr_zip, group_id
- Run may instead leave oracle fixed-width dumps <name>.txt. Optional flags.json.

## CONTRACT-L1.md (p.230-233) — statement gen + daily txn report
- Inputs: statement gen: transact.dat (combined day txn file, CVTRA05Y 350), acctdata.dat (after posting+interest, 300), cardxref.dat 50, custdata.dat CUSTREC 500. Daily txn report: transact.dat 350, cardxref.dat 50, trantype.dat/trancatg.dat 60,60.
- Run params: report start 2022-07-01, end 2022-07-31.
- Outputs text fixed-length lines (trailing spaces may be omitted), or same lines as one string joined by \n or list of strings under file name w/o extension:
  - creastmt_statements.txt (80), creastmt_statements_html.txt (100), tranrept_report.txt (133)
- Picture: X(n) left-aligned space-padded; 9(9).99- 9 digits leading zeros, point, 2 dec, trailing sign (- or space); Z(9).99- same leading zeros as spaces; +ZZZ,ZZZ,ZZZ.ZZ / -ZZZ,ZZZ,ZZZ.ZZ sign first position (+/- or space/-), leading zeros and their commas spaces.
- creastmt_statements.txt one statement, lines:
  0: '*'x31 + 'START OF STATEMENT' + '*'x31  (=80)
  1: 1-75 customer name X(75); 76-80 spaces
  2: 1-50 addr line 1 X(50); spaces to 80
  3: 1-50 addr line 2 X(50); spaces
  4: 1-80 addr line 3 X(80)
  5: '-'x80
  6: 33 spaces + 'Basic Details' + spaces to 80
  5: '-'x80
  7: 1-20 'Account ID         :' ; 21-40 account ID X(20); spaces to 80
  8: 1-20 'Current Balance    :' ; 21-33 current balance 9(9).99- ; spaces to 80
  9: 1-20 'FICO Score         :' ; 21-40 FICO X(20); spaces
  10: '-'x80
  11: 30 spaces + 'TRANSACTION SUMMARY' + spaces
  12: '-'x80
  13: 'Tran ID' padded to 16, 'Tran Details' padded to 51, '  Tran Amount' (80 in all)
  12: '-'x80
  14: per txn: 1-16 tran ID X(16); 17 space; 18-66 details X(49); 67 '$'; 68-80 amount Z(9).99-
  12: '-'x80
  14A: 1-10 'Total EXP:'; 11-66 spaces; 67 '$'; 68-80 total Z(9).99-
  15: '*'x32 + 'END OF STATEMENT' + '*'x32
- creastmt_statements_html.txt: each line padded to 100. Lines (exact):
```
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>HTML Table Layout</title>
</head>
<body style="margin:0px;">
<table  align="center" frame="box" style="width:70%; font:12px Segoe UI,sans-serif;">
<tr>
<td colspan="3" style="padding:0px 5px;background-color:#1d1d96b3;">
<h3>Statement for Account Number: {account ID X(20)}</h3>
</td>
</tr>
<tr>
<td colspan="3" style="padding:0px 5px;background-color:#FFAF33;">
<p style="font-size:16px">Bank of XYZ</p>
<p>410 Terry Ave N</p>
<p>Seattle WA 99999</p>
</td>
</tr>
<tr>
<td colspan="3" style="padding:0px 5px;background-color:#f2f2f2;">
<p style="font-size:16px">{customer name}  </p>
<p>{address line 1}  </p>
<p>{address line 2}  </p>
<p>{address line 3}  </p>
</td>
</tr>
<tr>
<td colspan="3" style="padding:0px 5px;background-color:#33FFD1; text-align:center;">
<p style="font-size:16px">Basic Details</p>
</td>
</tr>
<tr>
<td colspan="3" style="padding:0px 5px;background-color:#f2f2f2;">
<p>Account ID         : {account ID X(20)}</p>
<p>Current Balance    : {current balance 9(9).99-}</p>
<p>FICO Score         : {FICO score X(20)}</p>
</td>
</tr>
<tr>
<td colspan="3" style="padding:0px 5px;background-color:#33FFD1; text-align:center;">
<p style="font-size:16px">Transaction Summary</p>
</td>
</tr>
<tr>
<td style="width:25%; padding:0px 5px; background-color:#33FF5E; text-align:left;">
<p style="font-size:16px">Tran ID</p>
</td>
<td style="width:55%; padding:0px 5px; background-color:#33FF5E; text-align:left;">
<p style="font-size:16px">Tran Details</p>
</td>
<td style="width:20%; padding:0px 5px; background-color:#33FF5E; text-align:right;">
<p style="font-size:16px">Amount</p>
</td>
</tr>
--- transaction block, once per transaction ---
<tr>
<td style="width:25%; padding:0px 5px; background-color:#f2f2f2; text-align:left;">
<p>{transaction ID X(16)}</p>
</td>
<td style="width:55%; padding:0px 5px; background-color:#f2f2f2; text-align:left;">
<p>{transaction details X(49)}</p>
</td>
<td style="width:20%; padding:0px 5px; background-color:#f2f2f2; text-align:right;">
<p>{amount Z(9).99-}</p>
</td>
</tr>
--- closing block ---
<tr>
<td colspan="3" style="padding:0px 5px;background-color:#1d1d96b3;">
<h3>End of Statement</h3>
</td>
</tr>
</table>
</body>
</html>
```
- tranrept_report.txt (133):
  - report header: 1-38 'DALYREPT'; 39-79 'Daily Transaction Report'; 80-91 'Date Range: '; 92-101 start date; 102-105 ' to '; 106-115 end date
  - blank line: spaces
  - column header: 'Transaction ID' padded 17, 'Account ID' to 12, 'Transaction Type' to 19, 'Tran Category' to 35, 'Tran Source' to 14, one space, '         Amount' padded to 16  (exact spacing ambiguous)
  - rule: '-'x133
  - detail: 1-16 tran id; 17 sp; 18-28 acct id; 29 sp; 30-31 type code; 32 '-'; 33-47 type desc X(15); 48 sp; 49-52 cat code 9(4); 53 '-'; 54-82 cat desc X(29); 83 sp; 84-93 source X(10); 94-97 spaces; 98-112 amount -ZZZ,ZZZ,ZZZ.ZZ; 113-114 spaces
  - page total: 1-11 'Page Total'; 12-97 '.'x86; 98-112 +ZZZ,ZZZ,ZZZ.ZZ
  - account total: 1-13 'Account Total'; 14-97 '.'x84; 98-112 total
  - grand total: 1-11 'Grand Total'; 12-97 '.'x86; 98-112
  - A page starts with report header, blank, column header, rule. Each page total and each account total line followed by a rule.

## CONTRACT-BATCH-ADDED.md (p.233-234) — 7 added steps
- Run param RUN_TIMESTAMP 2022-07-18 10:00:00.
- Inputs fixed-width per copybooks: acctdata.dat, carddata.dat, custdata.dat, cardxref.dat, transact.dat, dailytran.dat. Missing input = absent file. export.json = list of export records.
- Outputs JSON list in output order; strings may omit trailing spaces; amounts strings/numbers <=2dec; unset = null. Printed log lines -> <step>_sysout.txt one line per printed line in order. Step stopping on error writes return code to <step>_rc.txt.
  | Account extract CBACT01C | acctext_out.json, acctext_array.json, acctext_vb.json, acctext_sysout.txt |
  | Card file print CBACT02C | cardprint_sysout.txt |
  | Xref print CBACT03C | xrefprint_sysout.txt |
  | Customer print CBCUS01C | custprint_sysout.txt |
  | Daily txn check CBTRN01C | dailycheck_sysout.txt |
  | Export CBEXPORT | export.json, export_sysout.txt |
  | Import CBIMPORT | import_customers.json, import_accounts.json, import_card_xref.json, import_transactions.json, import_cards.json, import_errors.json, import_sysout.txt |
- Fields: acctext_out = account record fields without addr_zip. acctext_array: acct_id (int), curr_bal_1, curr_cyc_debit_1 .. curr_bal_5, curr_cyc_debit_5 (amounts). acctext_vb: either {acct_id, active_status} or {acct_id, curr_bal, credit_limit, reissue_yyyy}. export: rec_type, seq (int), branch_id, region_code, then fields of record type (customer/account/xref/transaction/card seed fields). timestamp as step writes it. import_*: seed file fields of that type. import_errors: rec_type, seq (int), message. *_sysout: a printed record = fixed-width line of input record; other lines free text.

## Processes p.61-80
- validate-date (P-27): input dateValue, dateFormat (default YYYY-MM-DD), fieldLabel. Output isValid, severity(0 ok), messageText e.g. "Orig Date - Not a valid date...". BR-01 format YYYY-MM-DD; BR-02 calendar validity incl leap years; BR-03 feedback 2513 treated as valid by COTRN02C; BR-04 DOB not in future; BR-05 year range 1900-2099 (TODO).
- daily-transaction-posting (P-14, POSTTRAN CBTRN02C): per dailytran record:
  BR-01 card not in xref -> reject 100 "INVALID CARD NUMBER FOUND"
  BR-02 account not found -> 101 "ACCOUNT RECORD NOT FOUND"
  BR-03 over limit: currCycCredit - currCycDebit + amount > creditLimit -> 102 "OVERLIMIT TRANSACTION"
  BR-04 account.expiryDate < transaction orig date -> 103 "TRANSACTION RECEIVED AFTER ACCT EXPIRATION" (overwrites 102 when both apply; preserve legacy overwrite)
  BR-05 Post: processedTimestamp = now; TCATBAL upsert (create if not found); acct.curr_bal += amt; amt>=0 -> curr_cyc_credit += amt else curr_cyc_debit += amt
  BR-06 rejects carry original 350-byte image + 4-digit reason + 76-char desc
  BR-07 run ends WARNING (RC=4) when any reject
  BR-08 reason 109 (acct rewrite fail) aborts record, not written to rejects
- interest-calculation (P-15, INTCALC CBACT04C, PARM 2022071800): for each account/type/category balance (tcatbal):
  BR-01 rate key group_id + type + cat (discgrp); BR-02 not found -> retry group 'DEFAULT'; BR-03 if rate != 0: monthlyInterest = (catBal * rate)/1200; BR-04 interest txn type 01 cat 05 source 'System' desc 'Int. for a/c <acctId>', amt=interest; BR-05 tran id = PARM (2022071800) + running suffix; BR-06 at each change of account: curr_bal += totalInterest; curr_cyc_credit=0; curr_cyc_debit=0; rewrite; BR-07 no fees; BR-08 rounding COBOL truncation (TODO); BR-10 payment/credit types rate 0.
- combine-transactions (P-16): merge SYSTRAN into TRANSACT sorted by tran id; dup keys fail. In FlowX = verification (count, uniqueness).
- statement-generation (P-17, CREASTMT CBSTM03A/B): driven by CardXref order (card number); txns keyed by card+tran id (sorted); lines tran id, desc, amount; total exp = sum amounts. Text 80, HTML 100. Legacy prints all txns on file (no cycle filter, TODO).
- transaction-report (P-18, TRANREPT CBTRN03C): filter proc ts date between start & end inclusive; sorted by card number; each line type/category descriptions via lookup; totals: page total, card(account) total on card change, grand total (TODO layout); default range 2022-01-01..2022-07-06 config reportStartDate/reportEndDate; width 133.
- end-of-day-batch-chain (P-19): order POSTTRAN -> INTCALC -> COMBTRAN -> CREASTMT -> TRANREPT. failing step stops chain; posting rejects RC4 not stop.
- master-data-load (P-21): ACCTFILE/CARDFILE/... loads; discgrp signed overpunch (0150{ = 15.00); sample users ADMIN001-005 (A), USER0001-0005 (U) pwd <dark>; upsert by key; record sizes ACCOUNT 300 CARD 150 CUSTOMER 500 XREF 50 TRAN 350 TCATBAL 50 DISCGRP 50 TRANTYPE 60 TRANCATG 60 USRSEC 80.
- customer-data-export-import (P-20, CBEXPORT/CBIMPORT, CVEXPORT): export sections order customers, accounts, xrefs, transactions, cards; per-section counts and total reported; export record carries export date and time; import splits by record type, rejected records to error file; File I/O error abends ("ABENDING PROGRAM").

## Acceptance criteria p.81-100 (notable)
- signon: lowercase user0001 uppercased and succeeds; Exit -> thank-you message, process ends.
- menu: enter A or 0 or 12 -> "Please enter a valid option number..."; option 11 hidden unless toggle; admin 5,6 hidden if toggle off; Exit back to sign-on.
- account-view: empty/ABC/00000000000 -> "Account number must be a non zero 11 digit number"; 99999999999 -> "Did not find this account in account master file" (TODO text). Currency 2 decimals.
- account-update: invalid date 2025-02-30 as expiry -> date error; FICO 900 -> error; SSN 000-12-3456 error; concurrency; cancel at confirm -> no change.
- card-list: ordered by card number; filter by account; two rows selected -> error only one selection; No match "No records found for this search condition" (TODO) vs BR "Did not find cards for this search condition". cvv absent.
- card-view: from list selected S shows details w/o search; expiry MM/YYYY.
- card-update: J0hn -> "Card name can only contain alphabets and spaces"; 13/2026 month err; 12/1900 year err.
- transaction-list: 10 in id order; start at id; etc.
- transaction-add: 52.4 -> "Amount should be in format -99999999.99"; 15/05/2022 -> "Orig Date should be in format YYYY-MM-DD"; confirm blank -> "Confirm to add this transaction..."; copy last -> latest transaction of card.
- report-request: custom 2022-01-01..2022-07-06; start 2022-13-01 -> "Start Date - Not a valid date..."; end<start -> validation error (TODO); confirm N -> not submitted.
- bill-payment: balance 194.00 -> payment created, balance 0.00, message with Tran ID; confirm N -> screen cleared; Z -> "Invalid value. Valid values are (Y/N)..."
- user-admin: 10/page; add "User USER0006 has been added ..."; etc.
- validate-date: 2022-13-01 invalid "Not a valid date"; 2022-02-30 invalid; 2024-02-29 valid; 2023-02-29 invalid; 20AB-01-01 invalid; empty -> "can NOT be empty" by caller.
- posting: validation order xref -> account -> limit -> expiry; last failing reason kept; DALYREJS LRECL 430; read = posted + rejected.
- interest: bal 1000 rate 18 -> 15.00; ZEROAPR group -> no txn; rounding to two decimals.
- combine: output = A + B sorted by id.

## p.101-120
- statement AC: one statement per card (name, address, acct id, balance, FICO); total = sum amounts; card w/o txns -> zero total; text + HTML.
- tranrept AC: only txns in range; page totals per card + grand total; type/cat names from ref data; empty range zero total; unknown reference -> error flagged, run continues (TODO).
- EOD chain: CLOSEFIL→POSTTRAN→INTCALC→COMBTRAN→CREASTMT→TRANREPT→OPENFIL; rejects → chain continues.
- master load: dup key -> second rejected and reported; short record -> rejected with line number; record sizes acct 300, card 150, cust 500, xref 50, tran 350, catbal 50, discgrp 50, type 60, category 60, user 80.
- export/import: 500-byte records, types C A X T D; unknown type Z -> error output, run continues; SSN encrypted/excluded (FI-12) [legacy clear].
- COACTUP: validations: status Y/N, amounts numeric, dates valid (CSUTLDPY), names alphabetic, phone format, state/ZIP, FICO 300–850; no-change: nothing to save; conflict "Record changed by some one else. Please review"; success "Changes committed to database". Phone (AAA)BBB-CCCC.
- COACTVW: read xref (by acct, CXACAIX), account, customer; not-found messages.
- COADM01 admin options: 1 User List, 2 User Add, 3 User Update, 4 User Delete, 5 Transaction Type List/Update (Db2), 6 Transaction Type Maintenance (Db2).
- COBIL00: "Acct ID can NOT be empty...", "Account ID NOT found...", "You have nothing to pay..." (bal<=0), "Confirm to make a bill payment..." (blank confirm), "Invalid value. Valid values are (Y/N)..."; card via CXACAIX; payment type 02 cat 0002 source "POS TERM" desc "BILL PAYMENT - ONLINE" amount = full balance; balance -= payment; no active-status check; success message with tran id.

## p.121-140
- COCRDLI: S view / U update, other value error; page size TODO; "Did not find cards for this search condition".
- COCRDSL: account 11 digits; "Card number if supplied must be a 16 digit number"; read by card or account index; expiry MM/YYYY display.
- COCRDUP: "Card name can only contain alphabets and spaces"; status Y/N; month 1-12, year in range; READ UPDATE compare REWRITE.
- COMEN01: 11 options (1 Account View, 2 Account Update, 3 Credit Card List, 4 Credit Card View, 5 Credit Card Update, 6 Transaction List, 7..11 per COMEN02Y — 7 Transaction View, 8 Transaction Add, 9 Transaction Reports, 10 Bill Payment, 11 Pending Authorizations). "No access - Admin Only option..." (no option has type A). Option 11 requires COPAUS0C.
- CORPT00: legacy dates MM/DD/YYYY; FlowX date pickers ISO; custom dates validated CSUTLDTC; Y submits N cancels.
- COSGN00: "Please enter User ID ...", "Please enter Password ...", "User not found. Try again ...", "Wrong Password. Try again ..."; A→admin menu, U→main menu; F3 thank-you. Title "This is a Credit Card Demo Application for Mainframe Modernization"; FlowX title "Welcome to AWS CardDemo".
- COTRN00: "Tran ID must be Numeric ..."; 10 rows; "Invalid selection. Valid value is S"; columns id, date, desc, amount.

## p.141-160
- COTRN01: "Tran ID can NOT be empty...", "Transaction ID NOT found..."; displays card, type/cat, source, desc, amount, merchant id/name/city/zip, orig/proc ts; F4 clear; type/cat descriptions from lookups.
- COTRN02: account or card (one of two), resolved via CXACAIX/CCXREF; "Type CD can NOT be empty..." and the like for every field; "Amount should be in format -99999999.99"; dates valid (CSUTLDTC); merchant id numeric; "Confirm to add this transaction..." (Y required, N/blank cancels); F5 copy last (STARTBR/READPREV); id = last id + 1 (legacy; FlowX: sequence); legacy write does NOT update balances (F-11), FlowX adds balance posting (FI-14). Fields: type 2 chars, cat 4 chars, amount signed 2 decimals, orig/proc date, merchant id/name/city/zip all mandatory.
- COUSR00: list rows: user id, first, last, type; "Invalid selection. Valid values are U and D"; page size TODO.
- COUSR01: "First Name can NOT be empty...", "Last Name can NOT be empty...", "User ID can NOT be empty...", "Password can NOT be empty...", "User Type can NOT be empty..." (A or U), "User ID already exist..."; first/last 20 chars, id 8, pwd 8.
- COUSR02: "User ID can NOT be empty...", "User ID NOT found...", field checks same, "Please modify to update ..."; READ UPDATE REWRITE.
- COUSR03: "User ID can NOT be empty...", "User ID NOT found..."; F5 delete.

## p.161-180 (transformation matrix, triggers, data model)
- COUSR03: no self-delete guard in legacy; FlowX adds self-delete guard (FI-16). Delete confirmation dialog.
- Posting reasons: 100 invalid card, 101 account not found, 102 over limit, 103 expired (109 internal).
- Interest = balance x rate / 1200 per category.
- Copybook sizes: CVACT01Y 300, CVCUS01Y 500, CVACT02Y 150, CVACT03Y 50, CVTRA05Y 350, CVTRA01Y 50, CVTRA02Y 50, CVTRA03Y 60, CVTRA04Y 60, CSUSR01Y 80, CVTRA06Y 350, DALYREJS 430.
- Scheduled: EOD chain cron TODO (propose 0 0 20 * * ?); interest monthly; TIMETO=23:00 -> schedulerEndTime.
- DT-01 Account (CVACT01Y): ACCT-ID 9(11), ACTIVE-STATUS X(1), CURR-BAL S9(10)V99, CREDIT-LIMIT S9(10)V99, CASH-CREDIT-LIMIT S9(10)V99, OPEN-DATE X(10), EXPIRAION-DATE X(10), REISSUE-DATE X(10), CURR-CYC-CREDIT S9(10)V99, CURR-CYC-DEBIT S9(10)V99, ADDR-ZIP X(10), GROUP-ID X(10), FILLER 178. => offsets: id 0-11, status 11, bal 12-24, limit 24-36, cash 36-48, open 48-58, exp 58-68, reissue 68-78, cyccr 78-90, cycdb 90-102, zip 102-112, group 112-122, filler.
- DT-02 Customer (CVCUS01Y 500): ID 9(9), FIRST X(25), MIDDLE X(25), LAST X(25), ADDR-LINE-1..3 X(50) each, STATE X(2), COUNTRY X(3), ZIP X(10), PHONE-1 X(15), PHONE-2 X(15), SSN 9(9), GOVT-ID X(20), DOB X(10), EFT X(10), PRI-CARD-HOLDER X(1), FICO 9(3), filler.
- DT-03 Card (150): NUM X(16), ACCT-ID 9(11), CVV 9(3), EMBOSSED-NAME X(50), EXPIRAION-DATE X(10), ACTIVE-STATUS X(1), filler.
- DT-04 Xref (50): CARD-NUM X(16), CUST-ID 9(9), ACCT-ID 9(11), filler.
- DT-05 Transaction (350): ID X(16), TYPE-CD X(2), CAT-CD 9(4), SOURCE X(10), DESC X(100), AMT S9(9)V99, MERCHANT-ID 9(9), MERCHANT-NAME X(50), CITY X(50), ZIP X(10), CARD-NUM X(16), ORIG-TS X(26), PROC-TS X(26), filler 20.
- DT-06 Catbal (50): ACCT-ID 9(11), TYPE-CD X(2), CAT-CD 9(4), BAL S9(9)V99, filler.
- DT-07 Discgrp (50): GROUP-ID X(10), TYPE-CD X(2), CAT-CD 9(4), INT-RATE S9(4)V99 (overpunch 0150{ = 15.00), filler.
- DT-08 Trantype (60): TYPE X(2), DESC X(50). DT-09 Trancatg (60): TYPE-CD X(2), CAT-CD 9(4), DESC X(50).
- DT-10 User (80): ID X(8), FNAME X(20), LNAME X(20), PWD X(8), TYPE X(1), filler.
- DT-11 DailyTransaction = CVTRA06Y same as Transaction layout.
- DT-12 Rejected: 350 txn image + reason 9(4) + desc X(76) (TODO).

## p.181-200
- DT-18 export record: type(1) C/A/X/T/D, timestamp(26), sequence COMP, branch id(4), region(5), then 460-byte data area per type => 500 bytes. Legacy exports SSN in clear.
- Statement data: xref→customer→account→transactions; lines id, description, amount; totalExpenditure = sum.
- EN-02/03 messages: "Account Active Status must be Y or N" / "Card Active Status must be Y or N".
- Types: 01 Purchase, 02 Payment, 03 Credit, 04 Authorization, 05 Refund, 06 Reversal, 07 Adjustment. Categories: 01/0001 Regular Sales Draft, 01/0002 Regular Cash Advance, 01/0003 Convenience Check Debit, 01/0004 ATM Cash Advance, 01/0005 Interest Amount, 02/0001 Cash payment, 02/0002 Electronic payment, 02/0003 Check payment, 03/0001 Credit to Account, 03/0002 Credit to Purchase balance, 03/0003 Credit to Cash balance, 04/0001 Zero dollar authorization, 04/0002 Online purchase authorization, 04/0003 Travel booking authorization, 05/0001 Refund credit, 06/0001 Fraud reversal, 06/0002 Non-fraud reversal, 07/0001 Sales draft credit adjustment.
- Reject codes: 100 Invalid card number (not in xref), 101 Account record not found, 102 Over credit limit, 103 Transaction received after account expiry, 109 rewrite failure (not written).
- Main menu: all 11 options type U (option 8 'Admin Only' comment but U; DECISION keep legacy all available). Option 11 Pending Authorization View (toggle).
- ConfirmFlag invalid: "Invalid value. Valid values are (Y/N)...".
- Config: interestRunDate 2022071800, reportStartDate/EndDate 2022-01-01/2022-07-06, listPageSize 10 (txns, users) / 7 cards (TODO), schedulerEndTime 23:00.
- Roles: regular user U = P-02..P-12; admin A = admin menu only (user admin); legacy U sees only main menu, A only admin menu. Field access: SSN masked; CVV never shown.
- W-01 account: GET_ACCOUNT, GET_ACCOUNT_BY_CARD, UPDATE_ACCOUNT (version check), ADJUST_BALANCES; conflict -> "Record changed by some one else. Please review".
- W-09 batch file transfer: READ_FILE_PAGE etc. (kafka gateway — not available; we use stores).

## UI flows read (p.1-30) — summary
- signon (UI-01, COSGN00): User ID (req, max 8, uppercased), Password (req, max 8). Msgs: "Please enter User ID ...", "Please enter Password ...", "User not found. Try again ...", "Wrong Password. Try again ...", other "Unable to verify the User ...". Type A -> admin menu, U -> main menu. Exit -> thank-you message. Upper-case both userId and password before compare (BR-03).
- main-menu (UI-02): 11 options: 1 Account View, 2 Account Update, 3 Credit Card List, 4 Credit Card View, 5 Credit Card Update, 6 Transaction List, 7 Transaction View, 8 Transaction Add, 9 Transaction Reports, 10 Bill Payment, 11 Pending Authorization View (optional, shown only if OptionalModuleToggles.pendingAuthorizationEnabled). Option input numeric 1..count; "Please enter a valid option number..."; "No access - Admin Only option..."; not installed: "This option ... is not installed...". Exit -> signon.
- admin-menu (UI-03): 1 User List, 2 User Add, 3 User Update, 4 User Delete (Security) -> user-administration; 5 Transaction Type List/Update, 6 Transaction Type Maintenance -> optional (hidden when transactionTypeMaintenanceEnabled false). numeric 1-6 "Please enter a valid option number...". Exit -> signon.
- account-view (UI-04): Search acct (11 digits, non-zero: "Account number must be a non zero 11 digit number"). Details: Active status, Opened, Expiry, Reissue, Credit Limit, Cash Credit Limit, Current Balance, Cycle Credit/Debit, Group; Customer: Id, Name, SSN masked ***-**-6789, DOB, FICO, Address, Phone1/2, EFT account / Primary holder. Currency $ #,##0.00, dates ISO. Msgs: "Did not find this account in account card xref file", "Did not find this account in account master file", "Did not find associated customer in master file". Reads xref by acct (CXACAIX), account, customer. Buttons Back, Update Account -> account-update.
- account-update (UI-05): Search -> Edit -> Confirm (table attribute/current/new) -> Result. Editable: Account: activeStatus, openDate, expiryDate, reissueDate, creditLimit, cashCreditLimit, currentBalance, currentCycleCredit, currentCycleDebit, groupId. Customer: first/middle/last name, addr lines 1-3, state, country, zip, phone1, phone2, ssn (3 part), DOB, governmentId, eftAccountId, primaryCardHolder, ficoScore.
  Rules: BR-01 acct 11-digit non zero; BR-02 "Account Active Status must be Y or N"; BR-03 "Credit Limit must be supplied"/"Credit Limit is not valid" (signed numeric for cash limit, balances, cycle amounts); BR-04 dates valid (validate-date); BR-05 "Name can only contain alphabets and spaces"; BR-06 SSN part1 not 000/666/900-999, part2 not 00, part3 not 0000; BR-07 phone 3/3/4 digits; BR-08 state valid US state, state+zip prefix consistent (TODO); BR-09 FICO 300-850 ("FICO Score: should be between 300 and 850"); BR-10 primary holder Y/N; BR-11 "No change detected with respect to values fetched."; BR-12 "Changes validated.Press F5 to save" then "Changes committed to database"; BR-13 "Could not lock account record for update"/"Could not lock customer record for update"; BR-14 "Record changed by some one else. Please review"; write fail "Update of record failed". Optimistic concurrency via snapshot compare.
- card-list (UI-06): filters acct (11 digits "Account number must be a 11 digit number"), card (16 digits "Card number if supplied must be a 16 digit number"). Rows: Select, Account, Card Number, Active. Row action S view / U update, only one row. Page size TODO (conventionally 7). "Did not find cards for this search condition". Next/Prev page.
- card-view (UI-07): acct (req 11 digits; "Account number not provided", "Account number must be a non zero 11 digit number"), card (16 digits; "Card number if supplied must be a 16 digit number"); neither: "No input received". Shows Name on card, Card Active, Expiry (MM/YYYY). "Did not find cards for this search condition". CVV never shown.
- card-update (UI-08): edit embossed name (req alpha+spaces "Card name can only contain alphabets and spaces"), active Y/N ("Card Active Status must be Y or N"), expiry month 1-12 ("Card expiry month must be between 1 and 12"), year 1950-2099 ("Invalid card expiry year"); "No change detected ..."; "Changes validated. Press F5 to save"; "Changes committed to database"; "Could not lock record for update"; "Record changed by some one else. Please review". Expiry day preserved from stored date.
- transaction-list (UI-09): Search Tran ID numeric ("Tran ID must be Numeric ..."), 10 rows/page ascending tran id; columns Sel, Tran ID, Date (MM/DD/YY), Description, Amount. Selection S/s -> view else "Invalid selection. Valid value is S". "You are already at the top of the page...", "You are already at the bottom of the page...".
- transaction-view (UI-10): Tran ID req ("Tran ID can NOT be empty..."), "Transaction ID NOT found...", "Unable to lookup Transaction...". Shows Tran ID, Card Number, Type CD, Category CD, Source, Description, Amount, Orig Date, Proc Date, Merchant ID, Name, City, Zip. Clear, Back, Fetch.
- transaction-add (UI-11): acct or card (one required "Account or Card Number must be entered..."; "Account ID must be Numeric..."/"Card Number must be Numeric..."; "Account ID NOT found..."/"Card Number NOT found..."), Type CD, Category CD, Source, Description, Amount (-99999999.99 "Amount should be in format -99999999.99", first char - or +), Orig Date, Proc Date (YYYY-MM-DD "Orig Date should be in format YYYY-MM-DD", "Orig Date - Not a valid date..."), Merchant ID (numeric "Merchant ID must be Numeric..."), Name, City, Zip. Mandatory msgs "Type CD can NOT be empty...", "Category CD can NOT be empty...", "Source can NOT be empty...", "Description can NOT be empty...", "Amount can NOT be empty...", "Orig Date can NOT be empty...", "Proc Date can NOT be empty...", "Merchant ID can NOT be empty...", "Merchant Name can NOT be empty...", "Merchant City can NOT be empty...", "Merchant Zip can NOT be empty...". "Type CD must be Numeric...", "Category CD must be Numeric...". Confirm Y/y; "Confirm to add this transaction..."; other "Invalid value. Valid values are (Y/N)...". Tran id = last id + 1. Success "Transaction added successfully. Your Tran ID is n." Copy last transaction (PF5) pre-fills from latest txn of card. Does NOT update balances (preserve legacy).
- report-request (UI-13): type Monthly/Yearly/Custom ("Select a report type to print report..."); Monthly = first..last day current month; Yearly = Jan 1..Dec 31 current year; Custom start/end dates required ("Start Date - Month can NOT be empty..." etc), "Start Date - Not a valid date..."; confirm Y/N ("Please confirm to print the XXX report..."; "Invalid value. Valid values are (Y/N)..."); success " report submitted for printing ..." / UI "Report request submitted...". Starts transaction-report (P-18).
- bill-payment (UI-12): acct id req ("Acct ID can NOT be empty..."), not found "Account ID NOT found...", balance <=0 "You have nothing to pay...", confirm "Confirm to make a bill payment..." Y pays N clears, other "Invalid value. Valid values are (Y/N)...". Payment = full balance; txn type 02 cat 0002 source "POS TERM" desc "BILL PAYMENT - ONLINE" merchant id 999999999 name "BILL PAYMENT" (TODO verify); balance reduced by amount; tran id last+1; "Payment successful. Your Transaction ID is n." No activeStatus check.
- user-management (UI-14..17): list 10/page with Sel U/D ("Invalid selection. Valid values are U and D"), search user id, Forward/Backward ("You are already at the top of the page..."). Add: First/Last name, User ID(8), Password(8), Type A/U; "First Name can NOT be empty...", "Last Name can NOT be empty...", "User ID can NOT be empty...", "Password can NOT be empty...", "User Type can NOT be empty..."; dup "User ID already exist..."; success "User xxx has been added ...". Update: "Please modify to update ..."; "User ID NOT found..."; "User xxx has been updated ...". Delete: confirm F5; "User xxx has been deleted ...".
