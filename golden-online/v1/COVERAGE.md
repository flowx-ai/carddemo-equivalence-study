# Online oracle coverage (slice 1)

Traces: 17 case runs. Statement coverage over original source statements (EXEC CICS = one statement); paragraph coverage over paragraphs. Method in tools/coverage_online.py.

| program | statements hit | statements | % | paragraphs hit | paragraphs |
|---|---|---|---|---|---|
| COSGN00C | 69 | 77 | 89.6 | 6 | 6 |
| COMEN01C | 89 | 110 | 80.9 | 7 | 7 |
| COACTVWC | 204 | 246 | 82.9 | 28 | 35 |
| COACTVWC copybooks | 14 | 58 | 24.1 | 2 | 2 |
| COBIL00C | 174 | 209 | 83.3 | 16 | 16 |
| all | 550 | 700 | 78.6 | 59 | 66 |

## COSGN00C: statements not executed

- COSGN00C.cbl:124 `MOVE 'Y'      TO WS-ERR-FLG`
- COSGN00C.cbl:125 `MOVE 'Please enter Password ...' TO WS-MESSAGE`
- COSGN00C.cbl:126 `MOVE -1       TO PASSWDL OF COSGN0AI`
- COSGN00C.cbl:127 `PERFORM SEND-SIGNON-SCREEN`
- COSGN00C.cbl:253 `MOVE 'Y'      TO WS-ERR-FLG`
- COSGN00C.cbl:254 `MOVE 'Unable to verify the User ...' TO WS-MESSAGE`
- COSGN00C.cbl:255 `MOVE -1       TO USERIDL OF COSGN0AI`
- COSGN00C.cbl:256 `PERFORM SEND-SIGNON-SCREEN`

Paragraphs not entered: (none)

## COMEN01C: statements not executed

- COMEN01C.cbl:83 `MOVE 'COSGN00C' TO CDEMO-FROM-PROGRAM`
- COMEN01C.cbl:84 `PERFORM RETURN-TO-SIGNON-SCREEN`
- COMEN01C.cbl:118 `FROM LENGTH OF OPTIONI OF COMEN1AI BY -1 UNTIL`
- COMEN01C.cbl:130 `MOVE 'Y'     TO WS-ERR-FLG`
- COMEN01C.cbl:131 `MOVE 'Please enter a valid option number...' TO`
- COMEN01C.cbl:133 `PERFORM SEND-MENU-SCREEN`
- COMEN01C.cbl:138 `SET ERR-FLG-ON          TO TRUE`
- COMEN01C.cbl:139 `MOVE SPACES             TO WS-MESSAGE`
- COMEN01C.cbl:140 `MOVE 'No access - Admin Only option... ' TO`
- COMEN01C.cbl:142 `PERFORM SEND-MENU-SCREEN`
- COMEN01C.cbl:153 `MOVE WS-TRANID    TO CDEMO-FROM-TRANID`
- COMEN01C.cbl:154 `MOVE WS-PGMNAME   TO CDEMO-FROM-PROGRAM`
- COMEN01C.cbl:155 `MOVE ZEROS        TO CDEMO-PGM-CONTEXT`
- COMEN01C.cbl:156 `EXEC CICS XCTL`
- COMEN01C.cbl:170 `MOVE SPACES             TO WS-MESSAGE`
- COMEN01C.cbl:171 `MOVE DFHGREEN           TO ERRMSGC  OF COMEN1AO`
- COMEN01C.cbl:172 `STRING 'This option '       DELIMITED BY SIZE`
- COMEN01C.cbl:199 `MOVE 'COSGN00C' TO CDEMO-TO-PROGRAM`
- COMEN01C.cbl:297 `WHEN 12`
- COMEN01C.cbl:298 `MOVE WS-MENU-OPT-TXT TO OPTN012O`
- COMEN01C.cbl:300 `CONTINUE`

Paragraphs not entered: (none)

## COACTVWC: statements not executed

- COACTVWC.cbl:285 `INITIALIZE CARDDEMO-COMMAREA`
- COACTVWC.cbl:330 `MOVE LIT-MENUTRANID  TO CDEMO-TO-TRANID`
- COACTVWC.cbl:336 `MOVE LIT-MENUPGM     TO CDEMO-TO-PROGRAM`
- COACTVWC.cbl:376 `MOVE LIT-THISPGM    TO ABEND-CULPRIT`
- COACTVWC.cbl:377 `MOVE '0001'         TO ABEND-CODE`
- COACTVWC.cbl:378 `MOVE SPACES         TO ABEND-REASON`
- COACTVWC.cbl:379 `MOVE 'UNEXPECTED DATA SCENARIO'`
- COACTVWC.cbl:381 `PERFORM SEND-PLAIN-TEXT`
- COACTVWC.cbl:387 `IF INPUT-ERROR`
- COACTVWC.cbl:388 `MOVE WS-RETURN-MSG  TO CCARD-ERROR-MSG`
- COACTVWC.cbl:389 `PERFORM 1000-SEND-MAP`
- COACTVWC.cbl:409 `EXIT`
- COACTVWC.cbl:412 `EXIT`
- COACTVWC.cbl:463 `SET  WS-PROMPT-FOR-INPUT TO TRUE`
- COACTVWC.cbl:568 `MOVE DFHBMDAR           TO INFOMSGC OF CACTVWAO`
- COACTVWC.cbl:630 `MOVE LOW-VALUES           TO  CC-ACCT-ID`
- COACTVWC.cbl:810 `SET INPUT-ERROR                 TO TRUE`
- COACTVWC.cbl:811 `SET FLG-ACCTFILTER-NOT-OK                TO TRUE`
- COACTVWC.cbl:812 `MOVE 'READ'                     TO ERROR-OPNAME`
- COACTVWC.cbl:813 `MOVE LIT-ACCTFILENAME           TO ERROR-FILE`
- COACTVWC.cbl:814 `MOVE WS-RESP-CD                 TO ERROR-RESP`
- COACTVWC.cbl:815 `MOVE WS-REAS-CD                 TO ERROR-RESP2`
- COACTVWC.cbl:816 `MOVE WS-FILE-ERROR-MESSAGE      TO WS-RETURN-MSG`
- COACTVWC.cbl:859 `SET INPUT-ERROR                 TO TRUE`
- COACTVWC.cbl:860 `SET FLG-CUSTFILTER-NOT-OK                TO TRUE`
- COACTVWC.cbl:861 `MOVE 'READ'                     TO ERROR-OPNAME`
- COACTVWC.cbl:862 `MOVE LIT-CUSTFILENAME           TO ERROR-FILE`
- COACTVWC.cbl:863 `MOVE WS-RESP-CD                 TO ERROR-RESP`
- COACTVWC.cbl:864 `MOVE WS-REAS-CD                 TO ERROR-RESP2`
- COACTVWC.cbl:865 `MOVE WS-FILE-ERROR-MESSAGE      TO WS-RETURN-MSG`
- COACTVWC.cbl:878 `EXEC CICS SEND TEXT`
- COACTVWC.cbl:885 `EXEC CICS RETURN`
- COACTVWC.cbl:889 `EXIT`
- COACTVWC.cbl:897 `EXEC CICS SEND TEXT`
- COACTVWC.cbl:904 `EXEC CICS RETURN`
- COACTVWC.cbl:908 `EXIT`
- COACTVWC.cbl:918 `IF ABEND-MSG EQUAL LOW-VALUES`
- COACTVWC.cbl:919 `MOVE 'UNEXPECTED ABEND OCCURRED.' TO ABEND-MSG`
- COACTVWC.cbl:922 `MOVE LIT-THISPGM       TO ABEND-CULPRIT`
- COACTVWC.cbl:924 `EXEC CICS SEND`
- COACTVWC.cbl:930 `EXEC CICS HANDLE ABEND`
- COACTVWC.cbl:934 `EXEC CICS ABEND`
- CSSTRPFY.CPY:25 `(generated or copybook line)`
- CSSTRPFY.CPY:27 `(generated or copybook line)`
- CSSTRPFY.CPY:29 `(generated or copybook line)`
- CSSTRPFY.CPY:31 `(generated or copybook line)`
- CSSTRPFY.CPY:33 `(generated or copybook line)`
- CSSTRPFY.CPY:37 `(generated or copybook line)`
- CSSTRPFY.CPY:40 `(generated or copybook line)`
- CSSTRPFY.CPY:41 `(generated or copybook line)`
- CSSTRPFY.CPY:42 `(generated or copybook line)`
- CSSTRPFY.CPY:43 `(generated or copybook line)`
- CSSTRPFY.CPY:44 `(generated or copybook line)`
- CSSTRPFY.CPY:45 `(generated or copybook line)`
- CSSTRPFY.CPY:46 `(generated or copybook line)`
- CSSTRPFY.CPY:47 `(generated or copybook line)`
- CSSTRPFY.CPY:48 `(generated or copybook line)`
- CSSTRPFY.CPY:49 `(generated or copybook line)`
- CSSTRPFY.CPY:50 `(generated or copybook line)`
- CSSTRPFY.CPY:51 `(generated or copybook line)`
- CSSTRPFY.CPY:52 `(generated or copybook line)`
- CSSTRPFY.CPY:53 `(generated or copybook line)`
- CSSTRPFY.CPY:54 `(generated or copybook line)`
- CSSTRPFY.CPY:55 `(generated or copybook line)`
- CSSTRPFY.CPY:56 `(generated or copybook line)`
- CSSTRPFY.CPY:57 `(generated or copybook line)`
- CSSTRPFY.CPY:58 `(generated or copybook line)`
- CSSTRPFY.CPY:59 `(generated or copybook line)`
- CSSTRPFY.CPY:60 `(generated or copybook line)`
- CSSTRPFY.CPY:61 `(generated or copybook line)`
- CSSTRPFY.CPY:62 `(generated or copybook line)`
- CSSTRPFY.CPY:63 `(generated or copybook line)`
- CSSTRPFY.CPY:64 `(generated or copybook line)`
- CSSTRPFY.CPY:65 `(generated or copybook line)`
- CSSTRPFY.CPY:66 `(generated or copybook line)`
- CSSTRPFY.CPY:67 `(generated or copybook line)`
- CSSTRPFY.CPY:68 `(generated or copybook line)`
- CSSTRPFY.CPY:69 `(generated or copybook line)`
- CSSTRPFY.CPY:70 `(generated or copybook line)`
- CSSTRPFY.CPY:71 `(generated or copybook line)`
- CSSTRPFY.CPY:72 `(generated or copybook line)`
- CSSTRPFY.CPY:73 `(generated or copybook line)`
- CSSTRPFY.CPY:74 `(generated or copybook line)`
- CSSTRPFY.CPY:75 `(generated or copybook line)`
- CSSTRPFY.CPY:76 `(generated or copybook line)`
- CSSTRPFY.CPY:77 `(generated or copybook line)`

Paragraphs not entered: 0000-MAIN-EXIT (COACTVWC.cbl:437), 0000-MAIN-EXIT (COACTVWC.cbl:440), ABEND-ROUTINE (COACTVWC.cbl:1002), SEND-LONG-TEXT (COACTVWC.cbl:969), SEND-LONG-TEXT-EXIT (COACTVWC.cbl:993), SEND-PLAIN-TEXT (COACTVWC.cbl:937), SEND-PLAIN-TEXT-EXIT (COACTVWC.cbl:961)

## COBIL00C: statements not executed

- COBIL00C.cbl:118 `MOVE CDEMO-CB00-TRN-SELECTED TO`
- COBIL00C.cbl:120 `PERFORM PROCESS-ENTER-KEY`
- COBIL00C.cbl:130 `MOVE 'COMEN01C' TO CDEMO-TO-PROGRAM`
- COBIL00C.cbl:276 `MOVE 'COSGN00C' TO CDEMO-TO-PROGRAM`
- COBIL00C.cbl:366 `DISPLAY 'RESP:' WS-RESP-CD 'REAS:' WS-REAS-CD`
- COBIL00C.cbl:367 `MOVE 'Y'     TO WS-ERR-FLG`
- COBIL00C.cbl:368 `MOVE 'Unable to lookup Account...' TO`
- COBIL00C.cbl:370 `MOVE -1       TO ACTIDINL OF COBIL0AI`
- COBIL00C.cbl:371 `PERFORM SEND-BILLPAY-SCREEN`
- COBIL00C.cbl:390 `WHEN DFHRESP(NOTFND)`
- COBIL00C.cbl:391 `MOVE 'Y'     TO WS-ERR-FLG`
- COBIL00C.cbl:392 `MOVE 'Account ID NOT found...' TO`
- COBIL00C.cbl:394 `MOVE -1       TO ACTIDINL OF COBIL0AI`
- COBIL00C.cbl:395 `PERFORM SEND-BILLPAY-SCREEN`
- COBIL00C.cbl:397 `DISPLAY 'RESP:' WS-RESP-CD 'REAS:' WS-REAS-CD`
- COBIL00C.cbl:398 `MOVE 'Y'     TO WS-ERR-FLG`
- COBIL00C.cbl:399 `MOVE 'Unable to Update Account...' TO`
- COBIL00C.cbl:401 `MOVE -1       TO ACTIDINL OF COBIL0AI`
- COBIL00C.cbl:402 `PERFORM SEND-BILLPAY-SCREEN`
- COBIL00C.cbl:461 `DISPLAY 'RESP:' WS-RESP-CD 'REAS:' WS-REAS-CD`
- COBIL00C.cbl:462 `MOVE 'Y'     TO WS-ERR-FLG`
- COBIL00C.cbl:463 `MOVE 'Unable to lookup Transaction...' TO`
- COBIL00C.cbl:465 `MOVE -1       TO ACTIDINL OF COBIL0AI`
- COBIL00C.cbl:466 `PERFORM SEND-BILLPAY-SCREEN`
- COBIL00C.cbl:488 `MOVE ZEROS TO TRAN-ID`
- COBIL00C.cbl:534 `WHEN DFHRESP(DUPREC)`
- COBIL00C.cbl:535 `MOVE 'Y'     TO WS-ERR-FLG`
- COBIL00C.cbl:536 `MOVE 'Tran ID already exist...' TO`
- COBIL00C.cbl:538 `MOVE -1       TO ACTIDINL OF COBIL0AI`
- COBIL00C.cbl:539 `PERFORM SEND-BILLPAY-SCREEN`
- COBIL00C.cbl:541 `DISPLAY 'RESP:' WS-RESP-CD 'REAS:' WS-REAS-CD`
- COBIL00C.cbl:542 `MOVE 'Y'     TO WS-ERR-FLG`
- COBIL00C.cbl:543 `MOVE 'Unable to Add Bill pay Transaction...' TO`
- COBIL00C.cbl:545 `MOVE -1       TO ACTIDINL OF COBIL0AI`
- COBIL00C.cbl:546 `PERFORM SEND-BILLPAY-SCREEN`

Paragraphs not entered: (none)
