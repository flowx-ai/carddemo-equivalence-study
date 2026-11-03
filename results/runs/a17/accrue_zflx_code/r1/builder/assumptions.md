# ACCRUE (LXB002C) on FlowX: assumptions and decisions

Implementation: FlowX workflow **`accrue_lxb002c`** in project `ll_a17_accrue_zflx_code_r1` (dev-env),
resourceId `<uuid>`, resourceDefinitionId `<uuid>`.
Nodes: Start → *Parse input files* → *LXB002C accrue interest* → *Format outputs* → End.

Source references cite the paragraph and statement in `LXB002C.cbl` and its copybooks. The source
listing has no sequence numbers, so it cannot be cited by line number.

## How records are read

1. **Balances are processed in ascending key order, not file order.** This rests on
   `SELECT BALCAT-FILE ... ORGANIZATION IS INDEXED / ACCESS MODE IS SEQUENTIAL / RECORD KEY IS FD-TXN-CAT-KEY`.
   A sequential read of an indexed file returns records by key (acct id 11 + type 2 + cat 4). The 17-byte
   key is sorted byte-wise.
2. **A duplicate key keeps the first record loaded.** This applies to ledgacc, balcat, cardlink (card
   number) and rategrp. It rests on an absence: the source never loads the indexed files, and a KSDS or
   indexed file holds one record per key.
3. **One card per account; the first matching cardlink record in file order wins.** This rests on
   `1110-GET-LINK-DATA` (`READ LINK-FILE ... KEY IS FD-LINK-LACC-ID`) and
   `ALTERNATE RECORD KEY IS FD-LINK-LACC-ID`, which is declared without `WITH DUPLICATES`, so a second card
   for the same account cannot be in the alternate index.
4. **Inputs used.** Only LEDGFILE, LINKFILE, BALCATF and RATEGRP are read (FILE-CONTROL). daytxn,
   clntrec, crdrec, txntype and txncatg are not read by this step. Following the step-isolation rule in
   CONTRACT.md, the account and balance inputs come from POSTDAY's outputs:
   - `postday_*.json` is used first.
   - Then the fixed-width `postday_*.txt` dump, assumed to use the LXV022Y / LXV026Y layout.
   - Then `ledgacc.dat` / `balcat.dat`.

   See `run/make_input.py`.
5. **Signed DISPLAY fields** (`PIC S9(..)V99`, trailing overpunched sign) are decoded from three forms:
   - GnuCOBOL ASCII (`p`–`y` = −0…−9)
   - EBCDIC-style (`{`, `A`–`I` positive; `}`, `J`–`R` negative)
   - plain digits

   Spaces in a numeric field are read as zero. The source has no validation of numeric content.

## Main loop

6. **The last account in key order is never rewritten.** This rests on
   `PERFORM UNTIL END-OF-FILE = 'Y'`, which tests before each pass, and on `1000-BALCATF-GET-NEXT` setting
   END-OF-FILE = 'Y' on status `10`. The loop then exits before the outer `ELSE PERFORM 1050-UPDATE-ACCOUNT`
   can run, so that branch is unreachable. The last account's interest transactions are still written, but
   its balance is not posted and its cycle credit and debit are not reset. This is implemented as written.
7. **An account break posts the previous account, even when its interest is 0.** It sets
   curr_cyc_credit = curr_cyc_debit = 0. This rests on `1050-UPDATE-ACCOUNT` being performed on every
   change of `BCAT-LACC-ID` (except the first record), unconditionally, with `MOVE 0 TO LACC-CURR-CYC-CREDIT`
   and `MOVE 0 TO LACC-CURR-CYC-DEBIT`.
8. **The account break compares the 11-character ids.** This rests on
   `IF BCAT-LACC-ID NOT= WS-LAST-LACC-NUM`, a 9(11) field compared with an X(11) field that starts as
   `VALUE SPACES`, so the first record always counts as a break.
9. **REWRITE writes the account held in ACCOUNT-RECORD.** That is the one read at the previous break; its
   balance plus WS-TOTAL-INT is stored. This rests on `REWRITE FD-LEDGFILE-REC FROM ACCOUNT-RECORD` in
   1050, which runs before `1100-GET-LACC-DATA` reads the new account.
10. **The rate-group key is the account's LACC-GROUP-ID (padded to 10) + BCAT-TYPE-CD + BCAT-CD.** The
    account is read once per break, and its group is used for all of that account's categories. This rests
    on the `MOVE LACC-GROUP-ID TO FD-RG-LACC-GROUP-ID` / `MOVE BCAT-CD ...` / `MOVE BCAT-TYPE-CD ...` lines.
11. **Rate fallback to the STANDARD group.** If the group key is not found (status `23`), the lookup is
    retried with group `'STANDARD'` (space-padded to 10) and the same type and category. If that also
    fails, the program abends. This rests on `1200-GET-INTEREST-RATE` (`IF RATEGRP-STATUS = '00' OR '23'`,
    read as the abbreviated relation `= '00' OR = '23'`) and `1200-A-GET-STANDARD-INT-RATE` (status other
    than `00` abends).
12. **A zero rate writes no transaction and does not advance the transaction-id counter.** This rests on
    `IF RG-INT-RATE NOT = 0` around `1300-COMPUTE-INTEREST`.
13. **Fees: none.** This rests on `1400-COMPUTE-FEES`, which is `* To be implemented` / `EXIT.`

## Arithmetic

14. **Monthly interest = balance × rate / 1200, truncated toward zero to 2 decimals.** This rests on
    `COMPUTE WS-MONTHLY-INT = ( TXN-CAT-BAL * RG-INT-RATE) / 1200`, which has no `ROUNDED`. It is computed
    exactly in integers: cents × rate-hundredths / 120000. Negative balances or rates give negative
    interest, because the source has no sign check.
15. **Overflow truncates the high-order digits to the PIC size.** WS-MONTHLY-INT and WS-TOTAL-INT are
    S9(9)V99; LACC-CURR-BAL is S9(10)V99. This rests on the absence of `ON SIZE ERROR` in the COMPUTE, the
    two ADDs, and `ADD WS-TOTAL-INT TO LACC-CURR-BAL`. *Uncertain:* GnuCOBOL can instead leave the target
    unchanged on a size error. Realistic data never reaches this.

## Interest transaction (1300-B-WRITE-TX, LXV030Y)

16. **`tran_id` = PARM-DATE + WS-TRANID-SUFFIX**, for example `2022071800000001`.
    - PARM-DATE is `PIC X(10)` in `EXTERNAL-PARMS`, so it is the first 10 bytes of the EXEC PARM
      (LXZ036M passes PARM-TEXT): `2022071800`, not the business date.
    - The suffix is `PIC 9(06)`. It counts every transaction written in the run, starts at 0, adds 1
      before each write, and wraps after 999999.
17. **`type_cd` = `"07"`; `cat_cd` = 12.** This rests on `MOVE '12' TO TXN-CAT-CD`, which moves an
    alphanumeric literal into a `9(04)` field, giving 0012.
18. **`source` = `"Batch"`.**
19. **`desc` = `"Accrued int "` + LACC-ID as 11 zero-padded digits.** The rest of the 100 bytes is spaces.
    STRING does not clear its target, but the text is always 23 bytes and TXN-RECORD starts as spaces.
20. **`amt` = WS-MONTHLY-INT.**
21. **`merchant_id` = 0; `merchant_name`, `merchant_city` and `merchant_zip` are spaces.** They are
    written as `""` because trailing spaces are dropped, which the contract allows.
22. **`card_num` = LINK-CRD-NUM** of the account's cardlink record.
23. **`orig_ts` = `proc_ts`** = `FUNCTION CURRENT-DATE` at write time, in the form
    `YYYY-MM-DD-HH.MM.SS.hh0000` (`Z-GET-DB2-FORMAT-TIMESTAMP`). The FlowX runtime clock is used; it
    showed UTC in testing. *These values cannot match an oracle run;* only their format is reproduced.

## Abends

24. **Errors abend the run.** A missing account (`1100-GET-LACC-DATA`), a missing card link
    (`1110-GET-LINK-DATA`) or a missing STANDARD rate (`1200-A`) leads to `9999-ABEND-PROGRAM` →
    `CALL 'LXZ009D'` → `STOP RUN RETURNING 16`. The workflow then:
    - stops processing;
    - returns `returnCode` 16 and `abendMessage`;
    - still outputs every transaction written and every account rewritten before the abend.

    This rests on the files not being closed by the program: the runtime closes them at STOP RUN, so
    records already written persist. A break that abends on the *new* account has already rewritten the
    previous one, because 1050 runs before 1100.
25. **DISPLAY output is not part of the contract.** `runLog` keeps only the start, end, error and abend
    messages; the per-record `DISPLAY TXN-CAT-BAL-RECORD` is omitted.

## Outputs (CONTRACT.md)

26. **`accrue_ledgacc` lists every account in the account input**, in input order, after interest. Accounts
    with no balances are unchanged.
    - `expiration_date` ← LACC-EXPIRY-DATE.
    - `acct_id` is an integer.
    - FILLER is not output.
27. **`accrue_systxn` lists every transaction written**, in write order.
28. **Formatting.** Amounts are strings with exactly two decimals (`"-0.12"`); other strings are
    right-trimmed.
