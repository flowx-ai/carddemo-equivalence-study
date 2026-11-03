# LXB002C (ACCRUE) on FlowX — assumptions and decisions

Implementation: FlowX project `ll_a17_accrue_zflx_code_r3` (WIP version `<uuid>`), workflow
**`accrue_lxb002c`** (resourceId `<uuid>`,
resourceDefinitionId `<uuid>`):
`Start → LXB002C accrue interest (SCRIPT) → End (returns ${result})`.
The script source is mirrored in `flowx/lxb002c_script.js`; its comments carry the A-nn tags below.
How to run it and turn the result into `accrue_systxn.json` / `accrue_ledgacc.json` is in `flowx/README.md`.

The source has no sequence numbers, so references are given as *paragraph — statement* (copybook name for layouts).

## Behaviour carried over exactly as the source implements it

**A-06 The last account in BALCAT never receives its interest.**
Main loop: `PERFORM UNTIL END-OF-FILE = 'Y'` … `ELSE PERFORM 1050-UPDATE-ACCOUNT`. `PERFORM UNTIL` tests
before each iteration; when `1000-BALCATF-GET-NEXT` sets `END-OF-FILE` to 'Y', the loop ends without
re-entering, so the `ELSE` branch is unreachable. The last account's interest *transactions* are still
written (1300-B runs per category record), but its `LACC-CURR-BAL` is not increased, and its cycle
credit/debit are not zeroed. Implemented as is, not "fixed".

**A-08 Every other account seen in BALCAT is rewritten, even with zero interest.**
`1050-UPDATE-ACCOUNT` runs on every account change (`IF WS-FIRST-TIME NOT = 'Y' PERFORM 1050`), not only
when interest was accrued: `ADD WS-TOTAL-INT TO LACC-CURR-BAL`, `MOVE 0 TO LACC-CURR-CYC-CREDIT`,
`MOVE 0 TO LACC-CURR-CYC-DEBIT`. An account with no BALCAT record is never read and is output unchanged.

**A-07 Interest is truncated, not rounded, and is signed.**
`1300-COMPUTE-INTEREST — COMPUTE WS-MONTHLY-INT = (TXN-CAT-BAL * RG-INT-RATE) / 1200` has no `ROUNDED`,
so the result is truncated toward zero to 2 decimals (computed exactly in integer cents:
`bal_cents × rate_hundredths / 120000`). A negative balance (or rate) gives a negative interest
transaction. The only guard is `IF RG-INT-RATE NOT = 0`; the balance sign is never checked.

**A-13 Rate lookup and the STANDARD fallback.**
`1200-GET-INTEREST-RATE` keys RATEGRP on `LACC-GROUP-ID` (from the account record, X(10), space padded),
`BCAT-TYPE-CD`, `BCAT-CD`. Only status `'23'` triggers the retry with `'STANDARD'` (padded to 10) and the
same type/category (`1200-A-GET-STANDARD-INT-RATE`). The condition `IF RATEGRP-STATUS = '00' OR '23'` is
read as the abbreviated combined condition *status = '00' OR status = '23'*. A rate of 0 writes no
transaction (A-08 still applies to the account).

**A-12 Abends (RC 16) and what the outputs then contain.**
These conditions abend through `9999-ABEND-PROGRAM` → `LXZ009D` (`STOP RUN RETURNING 16`):
- account not found (`1100-GET-LACC-DATA`, status 23)
- card link not found (`1110-GET-LINK-DATA`)
- STANDARD rate missing (`1200-A`, status ≠ '00')
- an input file that cannot be opened (`0000`–`0300` OPEN paragraphs)

I assumed `STOP RUN` closes the open files, so every transaction written and every account rewritten
before the abend persists. The outputs are therefore the partial state at the abend point. The
workflow still finishes and reports `returnCode: 16` plus the DISPLAY lines in `displayLog`. The
account whose read succeeded right before a failing link read is **not** rewritten, because its 1050
would only run on the next account change.

**A-10 Transaction field values** (`1300-B-WRITE-TX`):
- `tran_id` = `STRING PARM-DATE, WS-TRANID-SUFFIX DELIMITED BY SIZE`. That is the first 10 bytes of the
  PARM (`PARM-DATE PIC X(10)`, space padded if shorter) followed by a 6-digit counter starting at
  `000001` for each run. With PARM `2022071800` the first id is `2022071800000001`. The business date
  2022-07-18 is not read by this step.
- `type_cd` `'07'`; `cat_cd`: `MOVE '12'` into `TXN-CAT-CD PIC 9(04)` is an alphanumeric-to-numeric
  move, giving 0012, output as int `12`.
- `source` is `'Batch'`.
- `desc` = `'Accrued int '` + `LACC-ID`, the 11-digit zero-padded id from the account record, e.g.
  `Accrued int 00000000001`. STRING does not clear the rest of the field, but every write has the same
  length, so the rest stays spaces and is trimmed.
- `merchant_id` 0. `merchant_name`, `merchant_city` and `merchant_zip` are SPACES, output as `""`; the
  contract allows trailing spaces to be omitted.
- `card_num` is `LINK-CRD-NUM` from the link record of the current account.

**A-14** `1400-COMPUTE-FEES` contains only `* To be implemented`, so no fees are computed.

**A-16** BALCAT is opened `INPUT` and never written, so ACCRUE has no BALCAT output. The only outputs
are `accrue_systxn` and `accrue_ledgacc`.

**A-19** `IF BCAT-LACC-ID NOT= WS-LAST-LACC-NUM` compares a `9(11)` with an `X(11)` that starts as
SPACES, which is a character comparison. The first record therefore always counts as an account
change.

## Decisions where the source is silent or environment-dependent

**A-01 BALCAT processing order.** `SELECT BALCAT-FILE … ORGANIZATION IS INDEXED, ACCESS MODE IS
SEQUENTIAL, RECORD KEY IS FD-TXN-CAT-KEY` reads in ascending primary-key order, whatever order the
records had in `balcat.dat`. I sort on the 17-byte key (`acct 9(11)` + `type X(2)` + `cat 9(4)`) using
byte (ASCII) order. Account grouping, the transaction-id sequence and which account is "last" (A-06)
all follow from this order. EBCDIC collation would differ only if a type code mixed letters and
digits.

**A-04 Duplicate keys.** The program never loads its indexed files. I assumed loading the `.dat` into
a KSDS keeps the first record for a primary key and rejects later duplicates (status 22). This applies
to BALCAT, LEDGACC, CARDLINK and RATEGRP.

**A-05 Card link by alternate key.** `ALTERNATE RECORD KEY IS FD-LINK-LACC-ID` has no `WITH
DUPLICATES`, so an account can have only one link record. When `cardlink.dat` has several cards for an
account, the first one in file order is used (the later ones would have been rejected on load), and
so is its card number.

**A-02 Input framing.** Each record is one line. Lines shorter than the record length are padded with
spaces, and blank lines are skipped. A single line that is an exact multiple of the record length is
split into records. Because of step isolation (ACCRUE gets the oracle's POSTDAY outputs), each input
may also be the JSON list form using the CONTRACT.md field names (for example `postday_balcat.json`:
`acct_id, type_cd, cat_cd, bal`). It is detected by a leading `[`. The oracle's `.txt` dumps are taken
as the fixed-width layout of the copybook.

**A-03 Signed numeric decoding.** `S9(n)V99` DISPLAY fields (`LACC-CURR-BAL`, `TXN-CAT-BAL`,
`RG-INT-RATE`, …) carry the sign overpunched in the last byte. Both conventions are accepted:
- mainframe/EBCDIC style: `{ A-I` positive, `} J-R` negative
- GnuCOBOL ASCII style: `p-y` negative, and a plain digit is positive

A separate leading or trailing `+`/`-` is also accepted, as is an explicit decimal point. Non-digit
bytes inside a numeric field (e.g. spaces) are read as 0.

**A-11 Overflow.** None of `COMPUTE WS-MONTHLY-INT`, `ADD … TO WS-TOTAL-INT` (`S9(09)V99`) or
`ADD WS-TOTAL-INT TO LACC-CURR-BAL` (`S9(10)V99`) has `ON SIZE ERROR`, so high-order digits are dropped
(the value modulo 10^9 or 10^10 currency units, sign kept). `WS-TRANID-SUFFIX 9(06)` wraps after
999999. None of these is expected with realistic data.

**A-09 Timestamps.** `Z-GET-DB2-FORMAT-TIMESTAMP` uses `FUNCTION CURRENT-DATE`, the wall clock at run
time, formatted `YYYY-MM-DD-HH.MM.SS.hh0000`, where `hh` is hundredths (`COB-MIL`) and `DB2-REST` is
`'0000'`. The FlowX script runtime reports UTC, and the batch's own time zone is unknown, so I used
UTC. `orig_ts` and `proc_ts` are identical within a transaction. These values cannot match the oracle
and should be excluded from comparison.

**A-15 Output form.** `accrue_ledgacc` holds every account in the ledger input after the run, in
primary-key order:
- `acct_id` as an int
- amounts as strings with 2 decimals (`"-244.45"`)
- string fields right-trimmed

`accrue_systxn` lists the transactions in write order.

**A-20 Not modelled.** `9910-DISPLAY-IO-STATUS` is simplified to `FILE STATUS IS: NNNN00xx`. The
`DISPLAY` texts are kept verbatim in `displayLog`, including the mislabelled `'ERROR OPENING DALY
REJECTS FILE'` for RATEGRP, but they are diagnostics and not contract outputs. `displayLog` is capped
at 5000 lines.

## Verification done

The workflow was run in FlowX (dev-env) on synthetic fixed-width and JSON inputs. Every value below
matched a hand calculation:
- unsorted BALCAT
- zero rate
- STANDARD fallback
- a duplicate alternate key
- overpunch `p`, `}` and `R`
- last account left unchanged (A-06)
- account not in BALCAT left unchanged
- link-missing abend with partial output (A-12)

No real input files came with the task, so no `accrue_*.json` has been produced yet. Generate them
per run as described in `flowx/README.md`.
