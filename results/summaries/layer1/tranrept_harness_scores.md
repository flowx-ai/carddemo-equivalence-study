Pre-registered scorer (frozen at 79d5e60). Strict / business equivalence per set; base layout line match and page count
(legacy: 18 pages); units that differ on base.

| Build | base | c01 | c02 | c03 | c04 | layout base (line match, pages) | differing units on base |
|---|---|---|---|---|---|---|---|
| harness sonnet/r1 | 98.90% / 99.18% (3 flagged) | 98.91% / 99.18% (3 flagged) | 98.90% / 99.17% (3 flagged) | 98.90% / 99.18% (3 flagged) | 98.65% / 99.19% (3 flagged) | 0.85, 7 | grand total (LASTDUP), extra last-account total (LASTACCT), header date range (HEADER); strict only: one zero-amount detail line (`.00` where legacy prints blank) |
| harness sonnet/r2 | 0% / 0% absent | 0% / 0% absent | 0% / 0% absent | 0% / 0% absent | 0% / 0% absent | – | – (FAILED "Input validation failed") |
| harness sonnet/r3 | 0% / 0% absent | 0% / 0% absent | 0% / 0% absent | 0% / 0% absent | 0% / 0% absent | – | – (FAILED "transact.dat line 1: non-ASCII text") |
| harness opus/r1 | 0% / 0% absent | 0% / 0% absent | 0% / 0% absent | 0% / 0% absent | 0% / 0% absent | – | – (no workflow) |
| harness opus/r2 | 0% / 0% absent | 0% / 0% absent | 0% / 0% absent | 0% / 0% absent | 0% / 0% absent | – | – (FAILED "transact.dat: invalid record at line 1.") |
| harness opus/r3 | 0% / 0% absent | 0% / 0% absent | 0% / 0% absent | 0% / 0% absent | 0% / 0% absent | – | – (no workflow) |

Absent units are scored R-ABSENT, silent (pre-registered). Sonnet r2, Sonnet r3 and Opus r2 stop on record 1 of
transact.dat on every set; as sent, its only non-printable characters are the 20 NUL bytes of the trailing FILLER
(positions 331–350), and their registers require printable ASCII (Sonnet r2 entry 4, Opus r2 A06) or ASCII text
(Sonnet r3 A01).

Adapter correction (before reading any report content, logged in LAB_NOTEBOOK §50): Sonnet r1's decode root was set
to `filesChecked`, a script-node key, where the END node returns `files`; Sonnet r2's to `reportFiles` where the END
node returns `outputs`. Both corrected from the responses' own structure and rescored offline from the saved responses
(no re-execution). The first Sonnet r1 score (0%, all absent) is kept in `runs/tranrept_harness_sonnet/r1/superseded_decode/`.
Sonnet r2's score is unchanged by the correction (empty report on every set).
