# Online oracle v2 coverage, group 5

Traces: 5 case runs. Statement coverage over original source statements (EXEC CICS = one statement); paragraph coverage over paragraphs. Method in tools/coverage_online.py.

| program | statements hit | statements | % | paragraphs hit | paragraphs |
|---|---|---|---|---|---|
| COADM01C | 81 | 95 | 85.3 | 8 | 8 |
| CORPT00C | 215 | 233 | 92.3 | 10 | 10 |
| CSUTLDTC | 24 | 35 | 68.6 | 2 | 2 |
| all | 320 | 363 | 88.2 | 20 | 20 |

## COADM01C: statements not executed

- COADM01C.cbl:122 `FROM LENGTH OF OPTIONI OF COADM1AI BY -1 UNTIL`
- COADM01C.cbl:150 `MOVE SPACES             TO WS-MESSAGE`
- COADM01C.cbl:151 `MOVE DFHGREEN           TO ERRMSGC  OF COADM1AO`
- COADM01C.cbl:152 `STRING 'This option '       DELIMITED BY SIZE`
- COADM01C.cbl:157 `PERFORM SEND-MENU-SCREEN`
- COADM01C.cbl:254 `WHEN 7`
- COADM01C.cbl:255 `MOVE WS-ADMIN-OPT-TXT TO OPTN007O`
- COADM01C.cbl:256 `WHEN 8`
- COADM01C.cbl:257 `MOVE WS-ADMIN-OPT-TXT TO OPTN008O`
- COADM01C.cbl:258 `WHEN 9`
- COADM01C.cbl:259 `MOVE WS-ADMIN-OPT-TXT TO OPTN009O`
- COADM01C.cbl:260 `WHEN 10`
- COADM01C.cbl:261 `MOVE WS-ADMIN-OPT-TXT TO OPTN010O`
- COADM01C.cbl:263 `CONTINUE`

Paragraphs not entered: (none)

## CORPT00C: statements not executed

- CORPT00C.cbl:199 `EXEC CICS RETURN`
- CORPT00C.cbl:226 `ADD 1           TO WS-CURDATE-YEAR`
- CORPT00C.cbl:227 `MOVE 1          TO WS-CURDATE-MONTH`
- CORPT00C.cbl:348 `MOVE 'Start Date - Not a valid Year...'`
- CORPT00C.cbl:350 `MOVE 'Y'     TO WS-ERR-FLG`
- CORPT00C.cbl:351 `MOVE -1       TO SDTYYYYL OF CORPT0AI`
- CORPT00C.cbl:352 `PERFORM SEND-TRNRPT-SCREEN`
- CORPT00C.cbl:374 `MOVE 'End Date - Not a valid Year...'`
- CORPT00C.cbl:376 `MOVE 'Y'     TO WS-ERR-FLG`
- CORPT00C.cbl:377 `MOVE -1       TO EDTYYYYL OF CORPT0AI`
- CORPT00C.cbl:378 `PERFORM SEND-TRNRPT-SCREEN`
- CORPT00C.cbl:529 `DISPLAY 'RESP:' WS-RESP-CD 'REAS:' WS-REAS-CD`
- CORPT00C.cbl:530 `MOVE 'Y'     TO WS-ERR-FLG`
- CORPT00C.cbl:531 `MOVE 'Unable to Write TDQ (JOBS)...' TO`
- CORPT00C.cbl:533 `MOVE -1       TO MONTHLYL OF CORPT0AI`
- CORPT00C.cbl:534 `PERFORM SEND-TRNRPT-SCREEN`
- CORPT00C.cbl:543 `MOVE 'COSGN00C' TO CDEMO-TO-PROGRAM`
- CORPT00C.cbl:571 `EXEC CICS SEND`

Paragraphs not entered: (none)

## CSUTLDTC: statements not executed

- CSUTLDTC.cbl:132 `MOVE 'Insufficient'       TO WS-RESULT`
- CSUTLDTC.cbl:136 `MOVE 'Invalid Era    '    TO WS-RESULT`
- CSUTLDTC.cbl:139 `WHEN FC-INVALID-MONTH`
- CSUTLDTC.cbl:140 `MOVE 'Invalid month  '    TO WS-RESULT`
- CSUTLDTC.cbl:141 `WHEN FC-BAD-PIC-STRING`
- CSUTLDTC.cbl:142 `MOVE 'Bad Pic String '    TO WS-RESULT`
- CSUTLDTC.cbl:143 `WHEN FC-NON-NUMERIC-DATA`
- CSUTLDTC.cbl:144 `MOVE 'Nonnumeric data'    TO WS-RESULT`
- CSUTLDTC.cbl:145 `WHEN FC-YEAR-IN-ERA-ZERO`
- CSUTLDTC.cbl:146 `MOVE 'YearInEra is 0 '    TO WS-RESULT`
- CSUTLDTC.cbl:148 `MOVE 'Date is invalid'    TO WS-RESULT`

Paragraphs not entered: (none)
