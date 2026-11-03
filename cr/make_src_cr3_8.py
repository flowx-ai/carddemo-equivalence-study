# Writes the patched COBOL sources for CR3-CR8 (A21 draft) into cr/<n>/src/ from the unchanged originals, so every
# patch is reproducible and checked: each anchor must occur exactly once. CR1/CR2 sources are not touched.
#   python3 cr/make_src_cr3_8.py
import pathlib
HERE = pathlib.Path(__file__).resolve().parent.parent

def patch(src, out, edits):
    text = (HERE / src).read_text()
    for anchor, mode, lines in edits:
        assert all(len(x) <= 72 for x in lines), (out, [x for x in lines if len(x) > 72])
        hits = [i for i, l in enumerate(text.split("\n")) if l.rstrip() == anchor.rstrip()]
        assert len(hits) == 1, (out, anchor, len(hits))
        L = text.split("\n"); i = hits[0]
        if mode == "after": L[i + 1:i + 1] = lines
        elif mode == "before": L[i:i] = lines
        elif mode == "replace": L[i:i + 1] = lines
        text = "\n".join(L)
    p = HERE / out; p.parent.mkdir(parents=True, exist_ok=True); p.write_text(text)
    print("wrote", out)

# CR3, INTCALC: accounts opened at least ten years before the run date pay the group rate minus 2.00 (not below 0).
patch("src/CBACT04C.cbl", "cr/cr3/src/CBACT04C.cbl", [
    ("           05 WS-FIRST-TIME             PIC X(01) VALUE 'Y'.", "after", [
        "           05 WS-TEN-YYYY               PIC 9(04).",
        "           05 WS-TEN-CUTOFF.",
        "              10 WS-TEN-CY              PIC 9(04).",
        "              10 FILLER                 PIC X(01) VALUE '-'.",
        "              10 WS-TEN-CM              PIC X(02).",
        "              10 FILLER                 PIC X(01) VALUE '-'.",
        "              10 WS-TEN-CD              PIC X(02)."]),
    ("           PERFORM 0400-TRANFILE-OPEN.", "after", [
        "           MOVE PARM-DATE (1:4) TO WS-TEN-YYYY",
        "           COMPUTE WS-TEN-CY = WS-TEN-YYYY - 10",
        "           MOVE PARM-DATE (5:2) TO WS-TEN-CM",
        "           MOVE PARM-DATE (7:2) TO WS-TEN-CD."]),
    ("                     PERFORM 1200-GET-INTEREST-RATE", "after", [
        "                     IF ACCT-OPEN-DATE <= WS-TEN-CUTOFF",
        "                       IF DIS-INT-RATE > 2",
        "                         SUBTRACT 2 FROM DIS-INT-RATE",
        "                       ELSE",
        "                         MOVE 0 TO DIS-INT-RATE",
        "                       END-IF",
        "                     END-IF"]),
])

# CR4, POSTTRAN: at most four purchases (amount > 0) posted per card per run; a further one is rejected 104.
patch("src/CBTRN02C.cbl", "cr/cr4/src/CBTRN02C.cbl", [
    ("           05 WS-CREATE-TRANCAT-REC         PIC X(01) VALUE 'N'.", "after", [
        "       01 WS-PURCH-COUNT.",
        "           05 WS-PC-CNT                 PIC 9(04) VALUE 0.",
        "           05 WS-PC-I                   PIC 9(04).",
        "           05 WS-PC-IDX                 PIC 9(04).",
        "           05 WS-PC-ENTRY OCCURS 2000 TIMES.",
        "              10 WS-PC-CARD             PIC X(16).",
        "              10 WS-PC-N                PIC 9(04)."]),
    ("      * ADD MORE VALIDATIONS HERE", "after", [
        "           IF WS-VALIDATION-FAIL-REASON = 0",
        "              AND DALYTRAN-AMT > 0",
        "              PERFORM 1500-C-CHECK-PURCHASE-COUNT",
        "           END-IF"]),
    ("       2000-POST-TRANSACTION.", "before", [
        "       1500-C-CHECK-PURCHASE-COUNT.",
        "           MOVE 0 TO WS-PC-IDX",
        "           PERFORM VARYING WS-PC-I FROM 1 BY 1",
        "                   UNTIL WS-PC-I > WS-PC-CNT",
        "              IF WS-PC-CARD (WS-PC-I) = DALYTRAN-CARD-NUM",
        "                 MOVE WS-PC-I TO WS-PC-IDX",
        "              END-IF",
        "           END-PERFORM",
        "           IF WS-PC-IDX = 0",
        "              ADD 1 TO WS-PC-CNT",
        "              MOVE WS-PC-CNT TO WS-PC-IDX",
        "              MOVE DALYTRAN-CARD-NUM TO WS-PC-CARD (WS-PC-IDX)",
        "              MOVE 0 TO WS-PC-N (WS-PC-IDX)",
        "           END-IF",
        "           IF WS-PC-N (WS-PC-IDX) >= 4",
        "              MOVE 104 TO WS-VALIDATION-FAIL-REASON",
        "              MOVE 'DAILY PURCHASE LIMIT EXCEEDED'",
        "                TO WS-VALIDATION-FAIL-REASON-DESC",
        "           ELSE",
        "              ADD 1 TO WS-PC-N (WS-PC-IDX)",
        "           END-IF",
        "           EXIT.",
        "      *---------------------------------------------------------------*"]),
])

# CR5, POSTTRAN: the run posts its transactions in ascending amount order; equal amounts keep their file order.
patch("src/CBTRN02C.cbl", "cr/cr5/src/CBTRN02C.cbl", [
    ("           05 WS-CREATE-TRANCAT-REC         PIC X(01) VALUE 'N'.", "after", [
        "       01 WS-DT-TABLE.",
        "           05 WS-DT-LOADED              PIC X(01) VALUE 'N'.",
        "           05 WS-DT-CNT                 PIC 9(05) VALUE 0.",
        "           05 WS-DT-POS                 PIC 9(05) VALUE 0.",
        "           05 WS-DT-ENTRY OCCURS 1 TO 5000 TIMES",
        "                          DEPENDING ON WS-DT-CNT.",
        "              10 WS-DT-AMT              PIC S9(09)V99.",
        "              10 WS-DT-SEQ              PIC 9(05).",
        "              10 WS-DT-REC              PIC X(350)."]),
    ("       1000-DALYTRAN-GET-NEXT.", "replace", [
        "       1000-DALYTRAN-GET-NEXT.",
        "           IF WS-DT-LOADED = 'N'",
        "              MOVE 'Y' TO WS-DT-LOADED",
        "              PERFORM 1000-A-DALYTRAN-READ",
        "              PERFORM UNTIL END-OF-FILE = 'Y'",
        "                 ADD 1 TO WS-DT-CNT",
        "                 MOVE DALYTRAN-AMT TO WS-DT-AMT (WS-DT-CNT)",
        "                 MOVE WS-DT-CNT TO WS-DT-SEQ (WS-DT-CNT)",
        "                 MOVE DALYTRAN-RECORD TO WS-DT-REC (WS-DT-CNT)",
        "                 PERFORM 1000-A-DALYTRAN-READ",
        "              END-PERFORM",
        "              IF WS-DT-CNT > 1",
        "                 SORT WS-DT-ENTRY",
        "                      ON ASCENDING KEY WS-DT-AMT WS-DT-SEQ",
        "              END-IF",
        "              MOVE 'N' TO END-OF-FILE",
        "           END-IF",
        "           ADD 1 TO WS-DT-POS",
        "           IF WS-DT-POS > WS-DT-CNT",
        "              MOVE 'Y' TO END-OF-FILE",
        "           ELSE",
        "              MOVE WS-DT-REC (WS-DT-POS) TO DALYTRAN-RECORD",
        "           END-IF",
        "           EXIT.",
        "       1000-A-DALYTRAN-READ."]),
])

# CR6, CREASTMT: Total EXP sums the charges (amount > 0) only; credits and returns are listed but not netted.
patch("ported/CBSTM03A.CBL", "cr/cr6/src/CBSTM03A.CBL", [
    ("                       ADD TRNX-AMT TO WS-TOTAL-AMT", "replace", [
        "                       IF TRNX-AMT > 0",
        "                         ADD TRNX-AMT TO WS-TOTAL-AMT",
        "                       END-IF"]),
])

# CR7, TRANREPT: interest postings (type 01, category 0005) are left out of the report: no line, no totals.
patch("src/CBTRN03C.cbl", "cr/cr7/src/CBTRN03C.cbl", [
    ("       1000-TRANFILE-GET-NEXT.", "replace", [
        "       1000-TRANFILE-GET-NEXT.",
        "           PERFORM 1000-A-TRANFILE-READ",
        "           PERFORM 1000-A-TRANFILE-READ",
        "             UNTIL END-OF-FILE = 'Y'",
        "                OR FD-TRANS-DATA (17:6) NOT = '010005'",
        "           IF END-OF-FILE = 'N'",
        "              MOVE FD-TRANFILE-REC TO TRAN-RECORD",
        "           END-IF",
        "           EXIT.",
        "       1000-A-TRANFILE-READ."]),
    ("           READ TRANSACT-FILE INTO TRAN-RECORD.", "replace", [
        "           READ TRANSACT-FILE."]),
])

# CR8, CREASTMT: the statement shows the FICO score band (Poor / Fair / Good / Very Good / Exceptional), not the score.
patch("ported/CBSTM03A.CBL", "cr/cr8/src/CBSTM03A.CBL", [
    ("           MOVE CUST-FICO-CREDIT-SCORE TO ST-FICO-SCORE.", "replace", [
        "           EVALUATE TRUE",
        "             WHEN CUST-FICO-CREDIT-SCORE < 580",
        "               MOVE 'Poor' TO ST-FICO-SCORE",
        "             WHEN CUST-FICO-CREDIT-SCORE < 670",
        "               MOVE 'Fair' TO ST-FICO-SCORE",
        "             WHEN CUST-FICO-CREDIT-SCORE < 740",
        "               MOVE 'Good' TO ST-FICO-SCORE",
        "             WHEN CUST-FICO-CREDIT-SCORE < 800",
        "               MOVE 'Very Good' TO ST-FICO-SCORE",
        "             WHEN OTHER",
        "               MOVE 'Exceptional' TO ST-FICO-SCORE",
        "           END-EVALUATE."]),
])
