# Online oracle v2: results against the predictions

Preparation for a full-application study, not scored. Each case's CASE.md (cases-online-v2/) was committed before
its first run. Verdicts: **match** = every stated prediction holds; **partial** = at least one stated step differs;
**mismatch** = the main outcome differs. Outputs are frozen per group with tools/freeze_online_v2.sh (no overwrite)
and SHA256SUMS.g<n>; tools/check_secrets.py is run on every frozen group.

## Group 1: read-only screens (cases committed in 3be613b; frozen 2026-10-30)

Instrument event, disclosed: the first run (on 2026-10-29) crashed in 6 of 12 cases (o2-trl-*, o2-trv-01, o2-usl-*). A
browse from LOW-VALUES put X'00' into a cics.log line, and the LINE SEQUENTIAL writer stopped with status 71. Fix
(cabcae6): log text only. A LOW-VALUES key is logged as `LOW-VALUES`, and any other X'00' in a key as `.`. After the fix:
v1 regression 17/17 byte-identical, self-tests 76/76 (v2) and 48/48 (v1). The 6 cases that had run were byte-identical
on the rerun. No case or prediction was changed.

| case | verdict | notes |
|---|---|---|
| o2-ccl-01 | partial | Step 5: PF7 back to page 1 already shows 'NO PREVIOUS PAGES TO DISPLAY'. 1400-SETUP-MESSAGE tests CA-FIRST-PAGE after 9100-READ-BACKWARDS has set the page to 1. I predicted no message until a second PF7. Steps 3, 4, 6 and 7 match. |
| o2-ccl-02 | match | Page 8 = card 9805583408996588 with 'NO MORE RECORDS TO SHOW'; PF8 again 'NO MORE PAGES TO DISPLAY'; PF7 page 7. |
| o2-ccl-03 | match | The account-filter error re-sends the rows kept in the commarea, with no browse (cics.log shows none). |
| o2-ccl-04 | match | S on row 2 shows card 0683586198171516; PF3 returns to page 1. |
| o2-csl-01 | match | Blank input marks both filters with '*'. |
| o2-csl-02 | match | Account 00000000001 with card 1561409106491600 shows the card (the account filter is not used). |
| o2-trl-01 | partial | Step 3 sends twice: PROCESS-ENTER-KEY sends from inside PROCESS-PAGE-FORWARD, then MAIN-PARA sends again. Not predicted. Step 5 (PF7): the first SEND, from READPREV ENDFILE, shows page 2 and 'You have reached the top of the page...'. The final SEND shows **page 1**: when the last READPREV hits ENDFILE, the ELSE arm sets the page to 1. I predicted that page 2 would stay ("page number quirk"), which was wrong. So step 6 (PF7) is 'You are already at the top of the page...', sent without ERASE, where I had predicted a blank list. |
| o2-trl-02 | match | Rows 1-4 = the last four ids, then a mid-loop SEND; PF8 is sent without ERASE and the rows stay; 'Tran ID must be Numeric ...'; a start id above the last key gives NOTFND, 'You are at the top of the page...', then ENDBR with no browse: **AEIP abend**, as predicted. |
| o2-trl-03 | match | COTRN01C entered with a selected id sends twice (PROCESS-ENTER-KEY, then MAIN-PARA). The content is as predicted; the count was not predicted. |
| o2-trv-01 | match | PF5 to the list: EIBAID stays PF5, so the page starts at transaction 2 (0000000001774260 ... 0000000025430891), as predicted. |
| o2-usl-01 | partial | Step 3 has **three** SENDs (predicted two): the ENDFILE SEND, the PROCESS-PAGE-FORWARD SEND and the MAIN-PARA SEND. Everything else matches, including the lost 'Invalid selection' message and the ignored option after the handled PGMIDERR. |
| o2-usl-02 | partial | Step 3 has two SENDs (predicted one; same cause as o2-trl-01). Steps 6-7 differ for the same reason as o2-trl-01: PF7 lands on page 1 labelled 1, and a second PF7 gives 'You are already at the top of the page...'. |

Totals: 12 cases: 8 match, 4 partial, 0 mismatch. All partials come from two misreadings on my side. (1) The first entry
of the list programs sends twice, once inside the paging paragraph and once in MAIN-PARA. (2) The ELSE arm after the
ENDFILE READPREV resets the page number to 1. No stub rule was involved in any mismatch.

No file changes in any group-1 case: every unloaded file equals the slice-1 no-change output (o-avw-01). The one
exception is USRSEC in o2-usl-02, which holds the two added users.

Coverage (COVERAGE.g1.md, 12 traced runs; the trace build reproduces the frozen screens.log, cics.log and files):

| program | statements | paragraphs |
|---|---|---|
| COCRDLIC | 393/478 (82.2%) | 34/39 |
| COCRDSLC | 176/234 (75.2%) | 26/34 |
| COTRN00C | 291/335 (86.9%) | 16/16 |
| COTRN01C | 93/102 (91.2%) | 9/9 |
| COUSR00C | 268/330 (81.2%) | 16/16 |
| COADM01C (navigation only) | 75/95 (78.9%) | 8/8 |

## Group 2: transaction add, COTRN02C (cases committed before the run; frozen 2026-10-30)

| case | verdict | notes |
|---|---|---|
| o2-tad-01 | match | Confirm prompt, then 0000000996722788 written with the typed data; the orig and proc timestamps hold '2022-07-18' followed by blanks. |
| o2-tad-02 | match | Each key error ends the task at its SEND, because SEND-TRNADD-SCREEN contains the RETURN. |
| o2-tad-03 | match | CEEDAYS 2508 for 2022-02-30 and 2023-02-29. 1500-01-01 gives 2513 (R-CEE-RANGE), which COTRN02C lets through, as predicted. |
| o2-tad-04 | match | PF5 copies the last transaction (amount +00000603.22) and writes it as ...788 with the typed card; then ...789 with orig '1500-01-01'. |
| e2e-o2-tad-01 | match | The online row joins through the TRANSACT backup: POSTTRAN and INTCALC are unchanged, COMBTRAN gains the row. CREASTMT for account 1 lists '0000000996722788 ONLINE TEST PURCHASE $12.34' and its total goes 1108.66 to 1121.00. TRANREPT lists it as 01-Purchase / 0001-Regular Sales Draft; the account total goes to 1,121.00 and the grand total to 79,266.63. |

Totals: 4 online cases + 1 end-to-end: 5 match. The CEEDAYS replacement decided 19 calls: R-CEE-OK, R-CEE-DATE and
R-CEE-RANGE. No frozen case depends on the month-out-of-range assumption (K08/K09 in the self-tests).

Coverage (COVERAGE.g2.md): COTRN02C 245/334 statements (73.4%), 18/18 paragraphs. CSUTLDTC 24/35 (68.6%), 2/2. The
CSUTLDTC lines not run are the feedback codes the modelled CEEDAYS never returns (2507, 2509, 2517, 2518, 2520, 2521).

## Group 3: user add, update, delete, COUSR01C-03C (cases committed before the run; frozen 2026-10-30)

Instrument event, disclosed: tools/check_secrets.py failed on the first run of o2-uad-01. After the DUPREC error
screen, the receive flag X'80' left in PASSWDA came back as an attribute override (R-ATTR-OVERRIDE). The password
field was then no longer dark, and the receive log printed the password typed from the @data reference. That run's
outputs were deleted, not committed. Fix (stub, R-LOG-SECRET, self-test V12): a logged field whose value equals a
resolved @data value is shown as `<secret>`. After the fix: v1 regression 17/17, self-tests 77/77 (v2) and 48/48 (v1),
v2 regression 16/16 frozen group-1/2 cases byte-identical. The cases were not changed. (Under the model the
password would be visible on the real 3270 screen at that step. That is a property of the program's habit of
sending the received attribute bytes back. It is recorded here, not scored.)

| case | verdict | notes |
|---|---|---|
| o2-uad-01 | match | DUPREC on USER0001: 'User ID already exist...'; TESTU001 added; the list then shows 11 users with the read-ahead finding USER0005 (two SENDs). |
| o2-uup-01 | match | Three SENDs on entry (the READ sends before the fields are filled); PF5 unchanged gives 'Please modify to update ...'; PF5 with first name CHANGED gives REWRITE; PF3 runs the update check again, then returns to the list, which shows CHANGED. |
| o2-uup-02 | match | Empty id, NOTFND, empty first name; REWRITE with first name RESTORED and type A; PF12 to the admin menu. |
| o2-udl-01 | match | READ UPDATE then DELETE (R-DELETE-UPD) of USER0005; the list then has 9 users and shows the bottom message. |
| o2-udl-02 | match | Empty id, NOTFND, show, PF4 clear, PF12. |

Totals: 5 cases, 5 match. Instrument property noted, not scored: COUSR01C writes SEC-USR-FILLER as it stands in
WORKING-STORAGE with no VALUE. GnuCOBOL gives X'00' bytes (TESTU001's record, columns 58-80). On z/OS the content
depends on the LE STORAGE runtime option, and the source does not determine it. No screen shows it.

Uncovered on purpose: COUSR03C PF5 for a user that does not exist. DELETE-USER-INFO goes on to an EXEC CICS DELETE
with no RIDFLD and no READ UPDATE token. The stub stops that as not modelled (R-DELETE-UPD): the exact RESP2 for that
INVREQ is not settled from the mainframe text at hand.

Coverage (COVERAGE.g3.md): COUSR01C 78/104 (75.0%), 8/9 paragraphs; COUSR02C 116/163 (71.2%), 9/11; COUSR03C
100/126 (79.4%), 11/11.

## Group 4a: card update, COCRDUPC (cases committed before the run; frozen 2026-10-30)

Stub change between the first run and the freeze, disclosed: R-LEN-NOTMOD (self-test V13). A WRITE or REWRITE whose
LENGTH differs from the record length now stops as not modelled. I added it because I believed CARD-UPDATE-RECORD was
91 bytes; it is 150 (FILLER X(59)), so the REWRITE passes the full record length. The rerun after the change was
byte-identical to the first run for all four cases. v1 regression 17/17, self-tests 78/78 (v2) and 48/48 (v1), v2
regression 21/21.

| case | verdict | notes |
|---|---|---|
| o2-cup-01 | match (one detail wrong) | Search by account and card, edit, F5, REWRITE of 9805583408996588 with name DAVON E EMMERICH and expiry 2023-10-27. The CVV prediction was wrong: I predicted '000', GnuCOBOL writes spaces (see the instrument note below). The CASE.md flagged this as a compiler property, not a CICS rule. |
| o2-cup-02 | mismatch (my misreading), then case error | Steps 4-7 match. Step 8: I predicted month '07' fails VALID-MONTH because I read the 88 as sitting on PIC X(2). It sits on the numeric REDEFINES CARD-MONTH-CHECK-N, so 07 is valid and status N + month 07 gave 'Changes validated.Press F5 to save'. Step 9 then typed into EXPMON, which is protected after validation, and the stub stopped the case as FATAL R-PROT-REFUSED. Steps 9-12 (month 13, year, all-pass, PF3) did not run. The program is not at fault; the case is. These edits move to o2-cup-05. |
| o2-cup-03 | match | Update from the card list (S on a row): F5 saves status N, SYNCPOINT, then the next key returns to COCRDLIC, which shows status N. |
| o2-cup-04 | match | A background step changes the record between fetch and F5: 'Record changed by some one else. Please review', the screen shows DAVON Q EMMERICH, no REWRITE. |

Totals: 4 cases: 3 match (one with a wrong compiler-property detail), 1 mismatch caused by my misreading of the
source, ending in a case error.

Instrument property noted, not scored: COCRDUPC REWRITEs CARD-UPDATE-RECORD, whose FILLER X(59) has no VALUE and is
not touched by INITIALIZE. GnuCOBOL writes 59 X'00' bytes there. On z/OS the content depends on the LE STORAGE
option. No screen shows it. The CVV spaces are a second instrument property: COCRDUPC moves CCUP-NEW-CVV-CD (spaces)
into CARD-CVV-CD-X, then CARD-CVV-CD-N (a 9(3) REDEFINES holding spaces) into CARD-UPDATE-CVV-CD 9(3). That is a
numeric move of invalid data; GnuCOBOL copies the bytes. On z/OS the result depends on the code Enterprise COBOL
generates for that move (copy or pack/unpack) and its options, so the source does not determine it.

Coverage (COVERAGE.g4a.md): COCRDUPC 372/474 statements (78.5%), 42/45 paragraphs. Main gaps: the blank-field and
non-numeric branches of the account and card filters, the month and year error branches (o2-cup-05), the lock-error
and REWRITE-failed paths (not reachable without a forced file error), and the ABEND-ROUTINE fallthrough.

## Group 4b: COCRDUPC month and year edits, o2-cup-05 (case committed before the run; frozen 2026-10-30)

Written after o2-cup-02 stopped early, to run the edits that case never reached (month 13, year 1900, a saved change).

| case | verdict | notes |
|---|---|---|
| o2-cup-05 | match | Month 13 and month '00' (blank branch, shown '*') give the month message; year 1900 and '0000' give 'Invalid card expiry year'; month 13 with year 1900 gives the month message (first set wins). PF12 after validation re-reads the card and shows 12/2024 unprotected. Year 2026 is then validated and saved: CARDDAT 4859452612877065 expiry 2026-12-13, name COOPER MAYERT; CVV spaces and FILLER X'00' as in o2-cup-01 (instrument properties). ENTER gives the fresh search screen, PF3 the menu after SYNCPOINT. |

Totals for COCRDUPC (groups 4a + 4b): 5 cases, 4 match, 1 mismatch (my misreading of VALID-MONTH, then a case error).

Uncovered on purpose: a non-numeric month or year. VALID-MONTH and VALID-YEAR are tested on PIC 9 REDEFINES; with
non-digits in them the z/OS result depends on how Enterprise COBOL compiles the comparison (and on NUMCHECK), so the
source does not settle it.

Coverage (COVERAGE.g4b.md, cases o2-cup-01..05): COCRDUPC 396/474 statements (83.5%), 42/45 paragraphs.

## Group 4c: account update, COACTUPC, and e2e-o2-aup-01 (cases committed before each run; frozen 2026-10-30)

The CEEDAYS assumption (R-CEE-PIC8) and its mainframe source were written into ONLINE_ORACLE.md section 9.2 and committed
before the first COACTUPC run. Every COACTUPC case past a change depends on it: 4 CSUTLDTC calls per edit run. Self-tests
K17-K20 added; v1 regression 17/17, self-tests 48/48 (v1) and 82/82 (v2), v2 regression 26/26 after the change.

| case | verdict | notes |
|---|---|---|
| o2-aup-01 | mismatch at steps 9-11 (my misreading) | Search errors match. Step 7 predicted RESP2 80 in the message; the message field is 75 bytes, so it ends at 'Reas:0000'. At step 8 I predicted group A000000000; the screen shows no group. Steps 9-11: I predicted 'No change detected'; the result is 'FICO Score: should be between 300 and 850', with the typed name IMMANUEL shown. Cause below. |
| o2-aup-02 | match | FICO, then phone 2 area, then 'Invalid zip code for state', then confirm. 16 R-CEE-PIC8 calls over 4 edit runs. ENTER on the confirm screen skips the edits. PF12 restores. |
| o2-aup-03 | partial | Screens match except the group at step 8: predicted ZEROAPR, shown blank. Files: predicted 'group ZEROAPR, every other field as before'. Actual: ZEROAPR sits at the ACCT-ADDR-ZIP offset, over A000000000, and ACCT-GROUP-ID holds X'00'. CUSTDAT matches. |
| o2-aup-04 | match | 'Record changed by some one else'; the screen keeps the fetched values; PF12 shows 2,000.00; the save keeps it. The GO TO from inside PERFORM 9700 to the exit of the outer range returned to the outer caller, as a small test of the compiler predicted. The ACCTDAT group and zip offsets change as in o2-aup-03 (not stated in the prediction). |
| o2-aup-05 | partial, 26 of 27 messages | Step 15: SSN part 1 '000': predicted the 000/666/900 message; 1245 fires first: 'SSN: First 3 chars must not be zero.'. My misreading. The range message is covered with 666 in o2-aup-07. |
| o2-aup-06 | match | The customer compare fails after the account compare passes; no REWRITE. |
| o2-aup-07 | partial, 14 of 15 messages | With a non-blank group (background), 'No change detected' is reached, no CEEDAYS call. Step 13: predicted 'Current Cycle Credit Limit is not valid'; WS-EDIT-VARIABLE-NAME is X(25), so 'Current Cycle Credit Limi is not valid'. Blank phone 1 passes, as predicted. |
| e2e-o2-aup-01 | match | Files of o2-aup-03 through the chain. POSTTRAN rc=4 as golden. 1 line each in posttran_acctdata (2288.10) and intcalc_acctdata (2302.66). CREASTMT: the name, the address zip, Current Balance 2302.66, FICO 700. Interest, COMBTRAN, TRANREPT unchanged. |

Totals: 7 cases + 1 end-to-end: 4 match (including the e2e), 3 partial, 1 mismatch. All deviations are my misreadings.

Two properties of the original program that this group found. Neither is a stub rule; both follow from the source:

1. **'No change' is unreachable on sample accounts.** ACCT-GROUP-ID is blank in all 50 sample accounts. The screen shows
   blank, RECEIVE returns spaces, and 1100 turns spaces into LOW-VALUES, so 1205 compares LOW-VALUES with spaces and
   finds a change on every ENTER. Then the edits run, and every sample customer has at least one field the edits reject
   (0 of 50 pass, by a scan of the data).
2. **Saving an account damages the record.** ACCT-UPDATE-RECORD (COACTUPC) has no ACCT-ADDR-ZIP, while ACCOUNT-RECORD
   (CVACT01Y) does. So the typed group goes to the zip offset and the group offset gets FILLER bytes. A group typed
   on the screen never reaches ACCT-GROUP-ID. INTCALC falls back to DEFAULT in both cases, so the e2e interest does
   not change. Under GnuCOBOL the FILLER is X'00'; on z/OS it depends on the LE STORAGE option. A FILLER that matched a
   real group key is possible in principle, and the source does not exclude it.

Uncovered on purpose: non-numeric month or year (PIC 9 REDEFINES with non-digits, z/OS not settled by the source);
CEEDAYS severity 3 reaching CSUTLDPY (section 9.2); lock, READ and REWRITE failures including SYNCPOINT ROLLBACK (no
way to force them without a modelled file error); CDEMO-FROM-PROGRAM paths other than the menu. Instrument note:
3200 tests CC-ACCT-ID-N = 0 with LOW-VALUES or 'ABC' in the field before it tests the flag; under GnuCOBOL this has no
visible effect, and on z/OS an invalid-data compare could depend on compiler options.

Coverage (COVERAGE.g4c.md): COACTUPC 936/1116 statements (83.9%), 78/85 paragraphs; its copybooks 134/182 (73.6%);
CSUTLDTC 18/35 (the feedback codes R-CEE-PIC8 never returns).

## Group 5: reports and admin, CORPT00C and COADM01C, with two TD JOBS end-to-end cases (cases committed before the run; frozen 2026-10-30)

tools/run_chain_online.sh gained TRANREPT_START and TRANREPT_END. The defaults are unchanged: e2e-o2-tad-01's report was
byte-identical after the change. tools/e2e_tdq.sh reads the dates from td/JOBS.txt and runs the chain with them. It does
not execute the JCL.

| case | verdict | notes |
|---|---|---|
| o2-rpt-01 | match | All messages. N clears the fields. Y writes 17 records with 2022-07-01 and 2022-07-31. |
| o2-rpt-02 | match | Yearly with 'y': 2022-01-01 and 2022-12-31. |
| o2-rpt-03 | match | 13 error messages in program order. 1500-07-01 gets 2513 and is let through. Short input 7 and 1 becomes 07 and 01. 34 records in all. |
| o2-adm-01 | partial | Step 8: I predicted 'This option is not installed' for option 6. COADM01C moves zero to CDEMO-PGM-CONTEXT before the XCTL, so after the PGMIDERR at step 7 the commarea says first entry: step 8 sends a fresh menu and ignores the typed 6. My misreading. COTRTUPC is therefore never tried in this case. |
| o2-adm-02 | partial | Step 1 matches. Step 2: I predicted the sign-on screen; it comes with 'Please enter User ID ...'. CORPT00C's XCTL passes a commarea (length 160), so COSGN00C runs its ENTER path. I had read this in COSGN00C and did not write it in the case. |
| e2e-o2-rpt-01 | match | Every output byte-identical to golden/v1. |
| e2e-o2-rpt-02 | match | Only tranrept_report.txt differs: the 18 'Date Range' header lines. Same line count (519). |

Totals: 5 cases + 2 end-to-end: 5 match, 2 partial.

Uncovered on purpose: non-numeric date parts in CORPT00C (NUMVAL-C with no TEST-NUMVAL-C, not settled by the source on
z/OS); month 00 (2508 or 2517); WRITEQ TD failure.

Coverage (COVERAGE.g5.md): CORPT00C 215/233 (92.3%), 10/10 paragraphs; COADM01C 81/95 (85.3%), 8/8; CSUTLDTC 24/35.

## All of v2

42 predictions: 31 match, 9 partial, 2 mismatch (o2-cup-02, o2-aup-01). Every deviation was a misreading of the source
or a detail I left out of a prediction. None led to a change in a stub rule. 38 online cases and 4 end-to-end cases are
frozen. Final checks: v2 regression 38/38, v1 regression 17/17, self-tests 82/82 (v2) and 48/48 (v1), check_secrets clean
on each freeze.

Coverage over all 38 cases (COVERAGE.all.md): 3624/4515 statements (80.3%), 309/335 paragraphs. This is statement
coverage and says nothing about branches.
