# CardDemo on FlowX — assumptions and decisions

Each entry records what was decided, and the wiki statement (or the gap in it) behind the decision.
"Wiki" means `app-sonnet-kk7.pdf`. Page numbers and section ids (BR-, FI-, F-, UI-, P-) refer to that document.

## What was built (for orientation)

- **UI Flow `CardDemo`** (WEB, FLOW_BASED). One page per screen, from sign-on to user administration.
  - Every screen action calls one dispatcher workflow, **`ui_carddemo`**. Its SCRIPT node runs the screen logic.
  - The SCRIPT node reads and writes the FlowX Database stores through a FORK to one DATA_SOURCE node per store operation.
- **Stores** (FlowX Database, one per seed file, as CONTRACT-UI lists): `users`, `accounts`, `customers`, `card_xref`, `cards`, `transactions`, plus `job_requests`. Field names and types are exactly those of the seed files. The stores are empty at handoff, ready for the operator to load.
- **Batch steps**, one workflow per step: `batch_posttran`, `batch_intcalc`, `batch_creastmt`, `batch_tranrept`, `batch_acctext`, `batch_cardprint`, `batch_xrefprint`, `batch_custprint`, `batch_dailycheck`, `batch_export`, `batch_import`.

## Platform-driven decisions

1. **Batch file I/O is the workflow's input and output.**
   - FlowX workflows have no file system, and the gateway the wiki mentions (W-09, Kafka file transfer) is not available.
   - Each batch workflow therefore takes its input files as top-level keys of the run input:
     - the key is the file name, `acctdata.dat` (or `acctdata`);
     - the value is either the file text (lines joined by `\n`) or a list of line strings.
   - It returns every output file under its contract name (`posttran_transact.json`, `tranrept_report.txt`, ...) in the END payload.
     - JSON outputs are lists of objects.
     - Text outputs (`*.txt` reports and sysouts) are lists of lines.
   - A file absent from the input is treated as "absent file" (CONTRACT-BATCH-ADDED: "A missing input is given as an absent file").
   - Blank lines in an input are ignored.
2. **Run date.** Every "today/now" is taken from the project config param `RUN_TIMESTAMP`, defaulting to `2022-07-18 10:00:00` when it is missing (CONTRACT-UI "Run date"). The system clock is never used.
3. **Online timestamps** are `YYYY-MM-DD HH:MM:SS.000000` (26 chars), built from `RUN_TIMESTAMP`. This applies to bill payment `orig_ts`/`proc_ts`. CONTRACT-UI only says the timestamps are "26-char timestamp strings as in legacy file" and gives no online format.
4. **Batch timestamps** (POSTTRAN `proc_ts`, INTCALC `orig_ts`/`proc_ts`) use the DB2 form `YYYY-MM-DD-HH.MM.SS.000000`, built from `RUN_TIMESTAMP`. This follows the legacy `Z-GET-DB2-FORMAT-TIMESTAMP` the wiki describes for the posting and interest programs. The microseconds are zero because the run date has none.
5. **No separate step for COMBTRAN** (P-16).
   - The wiki defines it as a merge-and-sort of SYSTRAN into TRANSACT, and in FlowX "= verification (count, uniqueness)".
   - Under step isolation (CONTRACT.md), each later step receives its inputs from the oracle, so there is nothing to combine.
6. **The EOD chain (P-19) is not orchestrated as one workflow**, and no cron is configured.
   - The contracts test each step in isolation. The wiki's cron is itself a TODO ("propose 0 0 20 * * ?").
   - Each step can be run in chain order: POSTTRAN → INTCALC → (COMBTRAN) → CREASTMT → TRANREPT.
7. **Labels are literal text, not substitution tags.** The wiki gives the exact English messages and titles to show, and there is one language.

## Online screens

8. **Sign-on: case of the stored id and password.**
   - The entered user id and password are upper-cased before comparison (UI-01 BR-03; acceptance "lowercase user0001 uppercased and succeeds").
   - Stored values are compared as stored. User add/update (COUSR01C/02C) stores the id and password as typed, as the legacy programs do; the wiki documents no upper-casing there.
   - A user added with lower-case letters therefore cannot sign on. This is the legacy behaviour.
9. **Sign-on Exit** shows "Thank you for using CardDemo application..." on a farewell page with a "Sign on again" button. The wiki says only "Exit -> thank-you message, process ends"; something has to come after the end in a web UI.
10. **Main menu shows options 1–10. Option 11 (Pending Authorization View) is hidden.**
    - The wiki makes it optional behind `pendingAuthorizationEnabled` and requires COPAUS0C, which is not part of this build.
    - Admin options 5–6 (Transaction Type, Db2) are hidden for the same reason (`transactionTypeMaintenanceEnabled` false).
    - All main-menu options are open to type U users. The wiki notes "no option has type A" ("DECISION keep legacy all available").
11. **Menus by user type.** A sees only the admin menu and U only the main menu (wiki "Roles": legacy U sees only main menu, A only admin menu).
12. **Account View / Update dates are shown ISO (YYYY-MM-DD)** and amounts as `$#,##0.00` (UI-04 "Currency $ #,##0.00, dates ISO"). The SSN is masked `***-**-6789` on view.
13. **Account Update concurrency.**
    - The update filter is the full document as it was read. If it no longer matches, the user sees "Record changed by some one else. Please review" and the fresh data (BR-14 "Optimistic concurrency via snapshot compare").
    - Nothing is locked, because the stores have no READ UPDATE.
14. **Account Update "state + ZIP consistency"** (BR-08) is marked TODO in the wiki. Only the US state code itself is validated.
15. **Card List page size is 7.** The wiki says "page size TODO (conventionally 7)", and the configuration lists "7 cards (TODO)". Transaction and user lists use 10, as documented.
16. **Card List "no match" message** is "Did not find cards for this search condition" (the business rule). The acceptance criterion's alternative, "No records found...", is marked TODO.
17. **List selections are cleared after the selected action returns** to the list. The wiki does not say whether a selection persists.
18. **Card expiry** is shown and edited as MM/YYYY. On update, the day of the stored date is preserved (UI-08 "Expiry day preserved from stored date").
19. **Transaction Add.**
    - Orig/Proc dates are entered and stored as `YYYY-MM-DD` (10 chars) in `orig_ts`/`proc_ts`. The screen collects dates only (UI-11 "YYYY-MM-DD"); no time is entered.
    - **Balances are not updated** (UI-11 "Does NOT update balances (preserve legacy)", F-11). The wiki's FI-14 proposes balance posting as a FlowX improvement, but the screen spec says to preserve legacy, and posting happens in POSTTRAN.
    - The new tran_id is the highest existing tran_id + 1, zero-padded to 16 ("Tran id = last id + 1").
    - "Copy last transaction" pre-fills from the card's transaction with the highest tran_id. The wiki says "latest transaction of card" (STARTBR/READPREV on the key).
20. **Report Request.**
    - Monthly is the first to last day of the `RUN_TIMESTAMP` month; Yearly is Jan 1–Dec 31 of its year.
    - Dates use ISO date pickers (wiki: "FlowX date pickers ISO").
    - End-before-start is refused with "End Date can NOT be earlier than Start Date...". The acceptance criterion says "validation error (TODO)" without text.
    - Confirm Y adds one `job_requests` doc {start_date, end_date}. N clears the screen and stores nothing.
21. **Bill Payment.**
    - The payment transaction is: type 02, cat 2, source "POS TERM", desc "BILL PAYMENT - ONLINE", merchant_id 999999999, merchant_name "BILL PAYMENT", merchant city and zip "N/A", amount = full balance.
    - The merchant values are marked "TODO verify" in the wiki; city/zip "N/A" follow the legacy COBIL00C constants.
    - The balance is set to 0.00. There is no active-status check (as documented).
22. **User Delete self-guard.** An admin cannot delete their own user id ("You can NOT delete your own User ID..."). This is the FlowX improvement FI-16 the wiki lists; legacy has no guard.
23. **User Add type validation**: anything other than A/U gets "User Type must be A or U...". The wiki lists only the empty-field message.

## POSTTRAN (CBTRN02C)

24. **Validation order** is xref → account → limit → expiry.
    - The limit and expiry checks are both evaluated, and the last failing reason is kept, so an expired over-limit transaction is rejected with 103 (acceptance "last failing reason kept").
    - Over-limit means `cyc_credit − cyc_debit + amt > credit_limit` (BR-03).
    - Expired means `expiration_date < orig_ts date`.
25. **Posting.**
    - `curr_bal += amt`.
    - `amt >= 0` adds to `curr_cyc_credit`; a negative amount adds to `curr_cyc_debit`.
    - The tcatbal row is created if absent, otherwise its balance is incremented.
    - `proc_ts` is the DB2 run timestamp (see 4).
26. **Return code 4 when any record is rejected.** It is written to `posttran_rc.txt` as "4", because the legacy step ends with RC 4 and the chain treats it as non-fatal (P-19 "posting rejects RC4 not stop").
27. **Output order.** Posted and rejected transactions keep input order; accounts and tcatbal are sorted by key. The contract says "any order".

## INTCALC (CBACT04C)

28. **Interest = trunc(bal × rate / 1200)** to the cent, truncated toward zero.
    - BR-08 says "rounding COBOL truncation (TODO)"; the acceptance criterion says "rounding to two decimals". Truncation is what a COBOL COMPUTE without ROUNDED does.
    - A 1e-9 tolerance absorbs binary floating error.
29. **The card for an account's interest transactions** is the account's first xref in card-number order (the legacy alternate-index read returns the first one).
30. **A rate missing for both the group and DEFAULT** is logged ("DISCLOSURE GROUP RECORD MISSING") and treated as rate 0, so no transaction is written. The wiki does not cover this case.
31. **Interest transaction fields.**
    - tran_id = PARM (`2022071800`, overridable by input `parm`) + a 6-digit running suffix.
    - Description is `Int. for a/c ` + the 11-digit zero-padded account id.
    - Merchant id is 0 and the merchant strings are empty.
    - Accounts whose categories all have rate 0 (e.g. ZEROAPR) still get the cycle credit/debit reset, because BR-06 runs at every change of account.

## CREASTMT (CBSTM03A/B)

32. **One statement per xref record, in card-number order.**
    - Each statement lists every transaction of that card in tran_id order, with no cycle filter. The wiki says "Legacy prints all txns on file (no cycle filter, TODO)".
    - A card without transactions gets a zero total.
33. **Name and address lines.**
    - The name line is the first word of first, middle and last name, joined by spaces.
    - The third address line is the first word of addr_line_3, state, country and zip, joined by spaces.
    - This mirrors the legacy STRING ... DELIMITED BY SPACE that the CONTRACT-L1 layout implies.
34. **A missing customer or account** for an xref is logged in `creastmt_sysout.txt`, and the statement is printed with blank or zero fields. The wiki does not cover this case.

## TRANREPT (CBTRN03C)

35. **Date range** is from input `startDate`/`endDate`.
    - The defaults are the CONTRACT-L1 run parameters 2022-07-01 / 2022-07-31.
    - The wiki's config (reportStartDate/EndDate 2022-01-01/2022-07-06) is the online screen's custom example, and the contract wins for batch runs.
    - Filtering is on the `proc_ts` date, inclusive. The sort by card number is stable, keeping file order within a card.
36. **Layout mechanics** (the wiki marks the totals layout TODO).
    - The page size is 20 lines, counted the legacy way: headers +4, a total line plus its rule +2, a detail line +1.
    - A page break comes before a detail when the counter is a multiple of 20.
    - An account total is written when the card changes.
    - At the end, the page total and then the grand total are written. The grand total is the sum of the page totals.
37. **Two legacy defects are not reproduced.**
    - The last amount is not added twice at end of file.
    - There is no final account total. Legacy writes the last card's account total only on a further card change.
    - The acceptance criteria ask for correct page totals, card totals and grand total; a double-counted amount would break "total = sum".
38. **An empty range** still prints the headers, a zero page total and a zero grand total ("empty range zero total"). Zero amounts print as blanks, as the `+ZZZ,ZZZ,ZZZ.ZZ` picture does.
39. **An unknown card, type or category** is logged in `tranrept_sysout.txt` and the line is printed with blank descriptions or account. The run continues ("unknown reference -> error flagged, run continues (TODO)"); legacy abends.

## Added steps (CONTRACT-BATCH-ADDED)

40. **Missing input file** in every batch step (including POSTTRAN, INTCALC, CREASTMT and TRANREPT):
    - the sysout gets "ERROR OPENING <DDNAME>" and "ABENDING PROGRAM";
    - `<step>_rc.txt` gets "999" and no other output is produced.
    - This is the legacy abend path (CEE3ABD code 999) the wiki describes as "File I/O error abends ('ABENDING PROGRAM')".
41. **Sequential reads of indexed files are in key order.** acctdata is read by acct_id, carddata and cardxref by card_num, custdata by cust_id, and transact by tran_id (export). dailytran is a sequential file and keeps input order.
42. **CBACT01C acctext.**
    - The sysout per record is the field lines, a 49-dash line, then the record line.
    - Field lines use the legacy labels (`ACCT-ID                 :` + raw field text, including the misspelt `ACCT-EXPIRAION-DATE`).
    - `acctext_out` replaces a zero `curr_cyc_debit` with 2525.00.
    - `acctext_array` holds slot 1 = balance / 1005.00, slot 2 = balance / 1525.00, slot 3 = −1025.00 / −2500.00, and slots 4–5 null.
    - `acctext_vb` has two entries per account. `reissue_yyyy` is the first 4 characters of reissue_date.
    - These constants are the legacy program's literals as the wiki documents them.
43. **Print counts.** CBACT02C prints each card record once. CBACT03C and CBCUS01C print each record **twice** (the legacy double DISPLAY the wiki describes).
44. **CBTRN01C dailycheck.**
    - For each daily record it prints the record line, then:
      - "SUCCESSFUL READ OF XREF FILE" with CARD NUMBER / ACCOUNT ID / CUSTOMER ID lines, or
      - "INVALID CARD NUMBER FOR XREF" with "CARD NUMBER <c> COULD NOT BE VERIFIED. SKIPPING TRANSACTION ID-<id>".
    - The account check then prints "SUCCESSFUL READ OF ACCOUNT FILE", or "INVALID ACCOUNT NUMBER FOUND" with "ACCOUNT <id> NOT FOUND".
    - The legacy loop runs the lookups once more on the last record at end of file, and this step reproduces that (the record line itself is not printed again).
    - Only dailytran, cardxref and acctdata are required. Legacy also opens the customer, card and transaction files, but never reads them for output.
45. **CBEXPORT.**
    - Sections are written in the order customers, accounts, xrefs, transactions, cards; `seq` runs from 1 across all records.
    - `branch_id` is "0001" and `region_code` is "NORTH" (legacy constants).
    - `timestamp` is `RUN_TIMESTAMP` + ".00", i.e. `2022-07-18 10:00:00.00`. The contract says "timestamp as the step writes it".
    - **`ssn` is exported as null.** The wiki's FI-12 says the SSN is "encrypted/excluded" in FlowX, while legacy exports it in clear.
    - The sysout gives a count per section and a total.
46. **CBIMPORT.**
    - Records are split by `rec_type` C/A/X/T/D into the five import files, with only the seed fields: the export metadata (rec_type, seq, branch_id, region_code, timestamp) is removed.
    - Any other type goes to `import_errors.json` as {rec_type, seq, message "Unknown record type: <t>"}, and the run continues ("unknown type Z -> error output, run continues").
    - The sysout gives the read, per-type and error counts. RC is 0.
47. **Sysout wording.** Lines that are not printed records are free text by contract. The legacy START/END-of-execution lines and the legacy messages are used wherever the wiki gives them.

## Data and formats

48. **Amounts** in batch JSON outputs are JSON numbers with at most 2 decimals; whole values print without decimals (e.g. `2525`). Allowed by the contract ("amounts JSON strings or numbers <=2 dec").
49. **Fixed-width parsing.**
    - Signed zoned decimals accept ASCII overpunch (`{A–I` positive, `}J–R` negative, also `p–y` negative) or an explicit leading/trailing sign.
    - Implied decimals follow the copybook (V99), e.g. discgrp `0150{` = 15.00 (wiki DT-07).
50. **Integer fields** (acct_id, cust_id, cat_cd, merchant_id, cvv_cd, fico) are output as numbers without leading zeros (CONTRACT-UI "Integers without leading zeros"). They are zero-padded only inside printed text lines, where the copybook width applies.
