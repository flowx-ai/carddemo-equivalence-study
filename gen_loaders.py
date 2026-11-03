# Generates one COBOL loader per indexed file: LINE SEQUENTIAL input -> INDEXED output (the IDCAMS REPRO step).
import pathlib
OUT = pathlib.Path(__file__).parent / "loaders"
# name: (record length, key offset (1-based), key length, alt key (offset, length) or None)
SPECS = {
    "acctdata": (300, 1, 11, None),
    "carddata": (150, 1, 16, None),
    "cardxref": (50, 1, 16, (26, 11)),
    "custdata": (500, 1, 9, None),
    "discgrp":  (50, 1, 16, None),
    "tcatbal":  (50, 1, 17, None),
    "trancatg": (60, 1, 6, None),
    "trantype": (60, 1, 2, None),
    "transact": (350, 1, 16, None),   # COMBTRAN reload
    "trxfl":    (350, 1, 32, None),   # CREASTMT: card + tran id
}
def fields(n, ko, kl, alt):
    parts, pos = [], 1
    spans = sorted([(ko, kl, "OUT-KEY")] + ([(alt[0], alt[1], "OUT-ALT")] if alt else []))
    for o, l, nm in spans:
        if o > pos: parts.append(f"           05 FILLER PIC X({o-pos}).")
        parts.append(f"           05 {nm} PIC X({l})."); pos = o + l
    if pos <= n: parts.append(f"           05 FILLER PIC X({n-pos+1}).")
    return "\n".join(parts)
for name, (n, ko, kl, alt) in SPECS.items():
    altc = "\n               ALTERNATE RECORD KEY IS OUT-ALT WITH DUPLICATES" if alt else ""
    src = f"""       IDENTIFICATION DIVISION.
       PROGRAM-ID. LD{name[:6].upper()}.
       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT IN-FILE ASSIGN TO INFILE
               ORGANIZATION IS LINE SEQUENTIAL.
           SELECT OUT-FILE ASSIGN TO OUTFILE
               ORGANIZATION IS INDEXED
               ACCESS MODE IS RANDOM
               RECORD KEY IS OUT-KEY{altc}.
       DATA DIVISION.
       FILE SECTION.
       FD IN-FILE.
       01 IN-REC PIC X({n}).
       FD OUT-FILE.
       01 OUT-REC.
{fields(n, ko, kl, alt)}
       WORKING-STORAGE SECTION.
       01 WS-EOF PIC X VALUE 'N'.
       01 WS-N   PIC 9(7) VALUE 0.
       PROCEDURE DIVISION.
           OPEN INPUT IN-FILE OUTPUT OUT-FILE
           PERFORM UNTIL WS-EOF = 'Y'
              READ IN-FILE AT END MOVE 'Y' TO WS-EOF
                NOT AT END
                  MOVE IN-REC TO OUT-REC
                  WRITE OUT-REC INVALID KEY
                     DISPLAY 'DUPLICATE KEY ' OUT-KEY
                  NOT INVALID KEY ADD 1 TO WS-N END-WRITE
              END-READ
           END-PERFORM
           CLOSE IN-FILE OUT-FILE
           DISPLAY '{name} loaded ' WS-N
           STOP RUN.
"""
    (OUT / f"ld_{name}.cbl").write_text(src)
print("ok")

# Unloaders: INDEXED -> LINE SEQUENTIAL in key order, to inspect and diff outputs.
for name, (n, ko, kl, alt) in SPECS.items():
    altc = "\n               ALTERNATE RECORD KEY IS OUT-ALT WITH DUPLICATES" if alt else ""
    src = f"""       IDENTIFICATION DIVISION.
       PROGRAM-ID. UL{name[:6].upper()}.
       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT IDX-FILE ASSIGN TO INFILE
               ORGANIZATION IS INDEXED
               ACCESS MODE IS SEQUENTIAL
               RECORD KEY IS OUT-KEY{altc}.
           SELECT OUT-FILE ASSIGN TO OUTFILE
               ORGANIZATION IS LINE SEQUENTIAL.
       DATA DIVISION.
       FILE SECTION.
       FD IDX-FILE.
       01 OUT-REC.
{fields(n, ko, kl, alt)}
       FD OUT-FILE.
       01 TXT-REC PIC X({n}).
       WORKING-STORAGE SECTION.
       01 WS-EOF PIC X VALUE 'N'.
       PROCEDURE DIVISION.
           OPEN INPUT IDX-FILE OUTPUT OUT-FILE
           PERFORM UNTIL WS-EOF = 'Y'
              READ IDX-FILE NEXT AT END MOVE 'Y' TO WS-EOF
                NOT AT END WRITE TXT-REC FROM OUT-REC
              END-READ
           END-PERFORM
           CLOSE IDX-FILE OUT-FILE
           STOP RUN.
"""
    (OUT / f"ul_{name}.cbl").write_text(src)
print("unloaders ok")
