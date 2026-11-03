# ACCRUE (LXB002C) — assumptions and decisions

Implementation: FlowX workflow `cmd_accrue_lxb002c` (project `ll_a17_accrue_zflx_code_r2`), one SCRIPT node
whose source is `../flowx/lxb002c_accrue.js`. The attached PDF has no line numbers, so each entry
cites the COBOL **paragraph and the statement quoted from it** (file `LXB002C.cbl` unless a copybook is named).
`js:NN` is the line in `flowx/lxb002c_accrue.js` that implements it.

## Behaviour taken directly from the source (implemented as-is, including defects)

**A-08 — The last account in the balance file is never rewritten.** The main loop is
`PERFORM UNTIL END-OF-FILE = 'Y'` (test before). At EOF, `1000-BALCATF-GET-NEXT` sets `END-OF-FILE` to 'Y'
inside the `IF END-OF-FILE = 'N'` branch, and the loop then exits. So the
`ELSE PERFORM 1050-UPDATE-ACCOUNT` branch can never run. The last account's interest transactions **are**
written to `accrue_systxn`, but its `curr_bal` is not increased and its cycle credit/debit are not zeroed.
(js:203)

**A-10 — Interest formula and rounding.** `1300-COMPUTE-INTEREST`:
`COMPUTE WS-MONTHLY-INT = ( TXN-CAT-BAL * RG-INT-RATE) / 1200` has no `ROUNDED`. The exact quotient is
truncated toward zero to 2 decimals (`WS-MONTHLY-INT PIC S9(09)V99`), e.g. 33.33 × 15.00 / 1200 =
0.416625 → 0.41, and −100 × 18.50 / 1200 → −1.54. This is done in exact integer cents (BigInt). Negative
balances or rates give negative interest; nothing in the source excludes them. (js:197)

**A-12 — Rate lookup and STANDARD fallback.** `1200-GET-INTEREST-RATE` reads RATEGRP with key
(account `LACC-GROUP-ID`, `BCAT-TYPE-CD`, `BCAT-CD`). Only status '23' (record not found) triggers
`MOVE 'STANDARD' TO FD-RG-LACC-GROUP-ID` + `1200-A-GET-STANDARD-INT-RATE`. The group key becomes
`'STANDARD  '` (X(10), space-padded). Type and category stay as they were in the record area, because only
the group id is moved. A group record that exists with rate 0 does **not** fall back. If STANDARD is also
missing, the program abends (A-14). (js:188-194)

**A-13 — Group id comes from the current account.** The `MOVE LACC-GROUP-ID TO FD-RG-LACC-GROUP-ID` runs
after `1100-GET-LACC-DATA` for a new account, so the account read for this balance record's account is the
one used. The 10 bytes, trailing spaces included, are compared exactly. (js:188)

**A-21 — A transaction is written whenever the rate is non-zero.** The guard is only
`IF RG-INT-RATE NOT = 0`. A zero category balance with a non-zero rate still writes a transaction with
`amt` 0.00 and consumes a tran-id suffix. (js:195)

**A-15 — Account update.** `1050-UPDATE-ACCOUNT`: `ADD WS-TOTAL-INT TO LACC-CURR-BAL`, then
`MOVE 0 TO LACC-CURR-CYC-CREDIT` and `MOVE 0 TO LACC-CURR-CYC-DEBIT`, then `REWRITE`. This runs for every
account in the balance file except the last (A-08), even when its total interest is 0 (e.g. all its rates
were 0). Accounts with no balance records are not touched and appear in `accrue_ledgacc` unchanged.
`WS-TOTAL-INT` is reset to 0 on each account change (`MOVE 0 TO WS-TOTAL-INT`). (js:155-159, 179-182)

**A-16 — Fees.** `1400-COMPUTE-FEES` contains only `* To be implemented` / `EXIT.` It is a no-op. (js:200)

**A-17 — Transaction field values** (`1300-B-WRITE-TX`):
- `type_cd` '07'.
- `cat_cd` 12 (`MOVE '12' TO TXN-CAT-CD`, a `PIC 9(04)` field).
- `source` 'Batch'.
- `desc` = `'Accrued int '` followed by the 11-digit `LACC-ID` (`STRING ... DELIMITED BY SIZE`; the rest of
  `TXN-DESC` is the working-storage initial spaces, which are omitted).
- `merchant_id` 0, and the three merchant strings are spaces (output as `""`).
- `card_num` = `LINK-CRD-NUM`.
- `amt` = `WS-MONTHLY-INT`.

(js:161-171)

**A-07 — Transaction id.** `STRING PARM-DATE, WS-TRANID-SUFFIX DELIMITED BY SIZE INTO TXN-ID`.
`PARM-DATE` is `X(10)` (LINKAGE). The run parameter `2022071800` is used as is (padded with spaces or cut to
10 if it were another length). `WS-TRANID-SUFFIX PIC 9(06) VALUE 0` is incremented once per written
transaction across the whole run (not per account), so the first id is `2022071800000001`. On overflow it
wraps to 000000 (no `ON SIZE ERROR`). (js:129-130, 162)

**A-14 — Abend behaviour.** Any of the following leads through `9999-ABEND-PROGRAM` to
`CALL 'LXZ009D'`, which does `STOP RUN RETURNING 16`:
- an account missing from LEDGFILE (`1100`, INVALID KEY → status 23 ≠ '00');
- an account missing from the card link file (`1110`);
- a missing STANDARD rate (`1200-A`).

Earlier `REWRITE`s and `WRITE`s are not undone (no commit/rollback exists, and the runtime closes the files at
STOP RUN). So the outputs reflect the state at the abend, and the workflow result carries `returnCode` 16 and
`abendMessage`. Normal completion gives `returnCode` 0 (GOBACK → LXZ036M `STOP RUN RETURNING RETURN-CODE`).
(js:205-209)

## Decisions where the source is silent or environment-dependent

**A-06 — Processing order of the balance file.** BALCAT-FILE is `ORGANIZATION IS INDEXED`,
`ACCESS MODE IS SEQUENTIAL`, `RECORD KEY IS FD-TXN-CAT-KEY`, so it is read in ascending key order (account id
11, type 2, category 4), whatever order the input lines are in. The key is compared byte-wise (ASCII). This
order decides the tran-id sequence and which account is "last" (A-08). (js:127)

**A-05 — Which card when an account has several.** `READ LINK-FILE ... KEY IS FD-LINK-LACC-ID` reads by the
alternate key. That key is declared with no `WITH DUPLICATES`, so the indexed file can hold one record per
account. I take the **first record in cardlink file order** for each account, i.e. the one a sequential load
would have stored. If the oracle's file was loaded with duplicates allowed, the record returned would still be
the first one inserted, which is the same. (js:104-110)

**A-04 — Duplicate primary keys in an input file.** An indexed file cannot hold them (a load gets status 22
on the second one). The first occurrence is kept and later ones are ignored, for ledgacc, cardlink, rategrp
and balcat. (js:92-125)

**A-09 — Timestamps.** `Z-GET-DB2-FORMAT-TIMESTAMP` uses `FUNCTION CURRENT-DATE`. The format is
`YYYY-MM-DD-HH.MM.SS.hh0000`: `COB-MIL` is the hundredths of a second, then `MOVE '0000' TO DB2-REST`. It is
taken once per transaction and used for both `orig_ts` and `proc_ts`. The clock is the FlowX script runtime's
(observed to be UTC), so these two fields cannot reproduce the oracle's values. An optional `runTimestamp`
input replaces the clock for reproducible runs. (js:132-139)

**A-02 — Signed numeric encoding in the input files.** The `S9(n)V99` fields (`LACC-CURR-BAL`,
`LACC-CREDIT-LIMIT`, `LACC-CASH-CREDIT-LIMIT`, `LACC-CURR-CYC-CREDIT`/`DEBIT` in LXV022Y; `TXN-CAT-BAL` in
LXV026Y; `RG-INT-RATE` in LXV027Y) have no `SIGN` clause, which means a trailing embedded (overpunched) sign.
The parser accepts plain digits, EBCDIC-style overpunch (`{A-I` positive, `}J-R` negative) and GnuCOBOL
ASCII negatives (`p-y`). The implied decimal point is 2 places from the right for all of them. (js:27-44)

**A-03 — Non-numeric numeric fields.** The source validates nothing. A non-numeric amount used in arithmetic
is treated as 0. One echoed unchanged into `accrue_ledgacc` is output as its trimmed raw text. (js:45, 53-57)

**A-11 — Field overflow.** No `ON SIZE ERROR` anywhere. Results are truncated on the high-order side to the
receiving PIC, keeping the sign: `WS-MONTHLY-INT`/`WS-TOTAL-INT` S9(09)V99 and `LACC-CURR-BAL` S9(10)V99. This
is not expected to occur with realistic data. (js:46-47)

**A-01 — Record framing.** One record per line, as in CONTRACT.md. Blank lines are skipped, short lines are
space-padded to the record length (300 / 50 / 50 / 50), and long lines are cut to it.

**A-20 — Input form for the step-isolated inputs.** CONTRACT.md ("Step isolation") supplies the oracle's
POSTDAY outputs as the account and category-balance inputs. The `ledgacc` / `balcat` inputs therefore accept
either fixed-width text in the LXV022Y / LXV026Y layouts (`ledgacc.dat`, `postday_ledgacc.txt`,
`balcat.dat`, `postday_balcat.txt`) or the JSON form (`postday_ledgacc.json`, `postday_balcat.json`). JSON is
converted to the copybook layout before processing. Amounts with more than 2 decimals would be truncated.
(js:60-89)

**A-19 — Files read and written.** LXB002C opens only BALCATF, LINKFILE, RATEGRP and LEDGFILE (I-O), plus
TXNFILE (OUTPUT). `daytxn.dat`, `clntrec.dat`, `crdrec.dat`, `txntype.dat` and `txncatg.dat` are not used.
Outputs are `accrue_systxn.json` (every TXNFILE record written) and `accrue_ledgacc.json` (every LEDGFILE
account after the step). The ledger output is sorted by account id and the transactions are in write order;
the contract allows any order.

**A-18 — Output formatting.** Amounts are JSON strings with exactly 2 decimals (`"-1.54"`). `acct_id`,
`cat_cd` and `merchant_id` are JSON integers. Trailing spaces are removed from strings, as the contract
permits.

**A-22 — Log.** The `DISPLAY` statements (`DISPLAY TXN-CAT-BAL-RECORD`, the "DISCLOSURE GROUP RECORD MISSING"
messages, the abend messages) are kept in the workflow result's `log` field. They are not a contract output.
