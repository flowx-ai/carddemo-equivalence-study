# ACCRUE (interest calculation): assumptions

Sources: the attached `accrue-nowiki.pdf` ("record-layouts.md" = copybooks LXV022Y/024Y/026Y/027Y/030Y, and
"CONTRACT.md"). The pages specify formats only. CONTRACT.md says: *"The contract fixes formats only. It says
nothing about behaviour."* So the pages give no basis for any behaviour below.

**Where the behaviour comes from.** The copybooks match the AWS CardDemo sample application with the names
changed: ACCOUNT-RECORD, CARD-XREF, TRAN-CAT-BAL, DIS-GROUP and TRAN-RECORD have the same field order and
PICs, and DIS-GROUP has the same key (group id, type cd, cat cd). Its interest program, CBACT04C, reads
exactly these files. Where the pages are silent I followed CBACT04C as I remember it. I had no CBACT04C source
available during this build, and Ledgerline may differ from CardDemo. Each item below says whether it rests
on the pages or on this recollection ("CardDemo recall").

## Inputs and parsing

- **A-01 — Files read.** ACCRUE reads `ledgacc.dat` (LXV022Y), `cardlink.dat` (LXV024Y), `balcat.dat`
  (LXV026Y) and `rategrp.dat` (LXV027Y). It does not read `daytxn.dat`, clntrec, crdrec, txntype or
  txncatg. *Basis:* CONTRACT lists all files for the whole chain without saying which step reads which; the
  disclosure-group layout (LXV027Y) is the only one with a rate, and the category balance (LXV026Y) is the
  only per-category amount. *Step isolation* says ACCRUE gets the POSTDAY account and category-balance
  outputs, so `ledgacc.dat`/`balcat.dat` are those POSTDAY outputs.
- **A-02 — Record framing.** One record per line (`\n` or `\r\n`). Short lines are padded with spaces to the
  record length, and blank lines are ignored. Offsets come from the copybooks. *Basis:* CONTRACT
  ("one record per line, fixed width, layouts as in the copybooks").
- **A-03 — Signed numerics (`S9(n)V99`).** The input is display zoned decimal with an implied decimal point
  and the sign overpunched on the last digit: `{`/`A–I` mean +0..9, `}`/`J–R` mean −0..9, and ASCII
  `p–y` also means −0..9. Explicit leading or trailing `+`/`-` is accepted as well. *Basis:* copybook PICs;
  the encoding is not stated anywhere, so this parser accepts the common variants.

## Calculation

- **A-04 — Monthly interest formula.** Interest per category balance = `bal × rate / 1200`. The rate
  (`RG-INT-RATE`, S9(4)V99) is an annual percentage. The result is **truncated** toward zero to 2 decimals,
  not rounded. *Basis:* CardDemo recall (COMPUTE without ROUNDED into an S9(9)V99 field). The pages are
  silent. CONTRACT's example flag rule name `R-INTTRUNC` hints that truncation matters. Arithmetic is exact
  (BigInt cents).
- **A-05 — Processing order.** Category balances are processed in ascending key order: account id, then
  type cd, then cat cd. *Basis:* `TXN-CAT-KEY` is the record key (an indexed file read sequentially). This
  order determines the transaction-id sequence and which account is "last" (A-12).
- **A-06 — Zero rate.** A category whose resolved rate is 0 produces no transaction and adds nothing.
  *Basis:* CardDemo recall (`IF DIS-INT-RATE NOT = 0`).
- **A-07 — Rate lookup and fallback.** The lookup key is (account `LACC-GROUP-ID`, `BCAT-TYPE-CD`,
  `BCAT-CD`). If that key is missing, the group `DEFAULT` is used with the same type/cat. *Basis:* CardDemo
  recall. If DEFAULT is missing too, the rate is treated as 0 (no interest). In CardDemo that case abends;
  this build does not abend. If an account record is missing, its group id is blank, so only DEFAULT applies.
- **A-08 — Transaction id.** `tran_id` = ACCRUE parameter `2022071800` (10 chars) + a 6-digit sequence
  number starting at 000001. It increments once per interest transaction across the whole run.
  *Basis:* CONTRACT gives the ACCRUE parameter, and 10 + 6 = 16 = `TXN-ID PIC X(16)`. The layout of the id
  is CardDemo recall.
- **A-09 — Interest transaction fields.** `type_cd` = `"01"`, `cat_cd` = 5, `source` = `"System"`,
  `desc` = `"Int. for a/c "` + the 11-digit zero-padded account id, `merchant_id` = 0,
  merchant name/city/zip = blank, and `amt` = the A-04 interest (it can be negative).
  *Basis:* CardDemo recall; none of this is in the pages.
- **A-10 — Timestamps.** CardDemo stamps `orig_ts`/`proc_ts` with the wall-clock time in DB2 format
  (`YYYY-MM-DD-HH.MM.SS.ffffff`, 26 chars = `PIC X(26)`). A wall-clock value cannot match an oracle, so this
  build uses the business date at midnight: `2022-07-18-00.00.00.000000`. *Basis:* the CONTRACT business date
  plus the PIC X(26) width. The oracle value is expected to differ.
- **A-11 — Card number.** `card_num` = the card linked to the account in `cardlink.dat`. When an account
  has several cards, the lowest card number is used, which matches how an alternate-index read on the
  account id returns cards in primary-key (card number) order. If no card is found, `card_num` is blank
  (CardDemo would abend). *Basis:* LXV024Y layout plus CardDemo recall.

## Account update

- **A-14 — What happens to an account.** For each account that has at least one category-balance record:
  `curr_bal` += the sum of its interest, and `curr_cyc_credit` and `curr_cyc_debit` are set to 0. This
  applies even when the sum is 0. Every other field, and every account with no category balances, is left
  unchanged. *Basis:* CardDemo recall. The CONTRACT phrase "account fields for every account, after
  interest" gives the output scope.
- **A-12 — The last account is not updated (replicated defect).** In CardDemo's CBACT04C, the account update
  fires on a change of account id. The end-of-file update sits in an `ELSE` branch that can never be
  reached, so the **last account in key order still gets its interest transactions written, but its
  balance and cycle fields are not updated**. I replicated this because the scorer compares against the
  COBOL oracle. *Basis:* CardDemo recall only, and this is the riskiest assumption here. If Ledgerline fixed
  the defect, set `SKIP_LAST_ACCOUNT_UPDATE = false` (SCRIPT node and `impl/accrue_core.js`).
- **A-13 — Duplicate or missing keys.** A duplicate account id or disclosure key: the first record wins
  (indexed files have unique keys). A category balance for an account missing from `ledgacc.dat`: its
  transactions are still written and no account is updated. CardDemo would abend here.

## Output

- **A-15 — Output form.** The outputs are `accrue_systxn.json` and `accrue_ledgacc.json`, each a JSON list.
  Amounts are strings with exactly 2 decimals (e.g. `"-0.25"`). `acct_id`, `cat_cd` and `merchant_id` are
  ints. Trailing spaces are trimmed from strings, and dates are passed through as stored. Accounts appear in
  input order. *Basis:* CONTRACT Outputs section.
- **A-16 — No COMPUTE-FEES.** No fee transactions are produced. *Basis:* CardDemo recall (the fee paragraph
  is an empty stub); the pages are silent.
- **A-17 — No input data was available.** The working directory contained only the PDF, so no real outputs
  were produced. The implementation was verified on a synthetic fixture
  (`test_fixture/expected_and_actual.md`).
