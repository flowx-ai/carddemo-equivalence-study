# ACCRUE (interest calculation) — assumptions

Implementation: FlowX workflow `accrue_interest` (project `ll_a17_accrue_zflx_nowiki_r1`,
resourceDefinitionId `<uuid>`), START → SCRIPT "Accrue interest" → END.
I/O plumbing: `tools/accrue_driver.py` (prepare inputs → run workflow → finish writes
`accrue_systxn.json`, `accrue_ledgacc.json`).

The attached pages give record layouts (record-layouts.md) and formats (CONTRACT.md). CONTRACT.md says
explicitly that it "says nothing about behaviour", and there is no wiki. So **every behavioural rule below
is an assumption**. The copybooks match the public AWS CardDemo sample application field for field
(renamed: ACCOUNT-RECORD ≈ CVACT01Y, card xref ≈ CVACT03Y, TRAN-CAT-BAL ≈ CVTRA01Y, disclosure group ≈
CVTRA02Y, TRAN-RECORD ≈ CVTRA05Y). I therefore modelled the step on CardDemo's interest program CBACT04C
as I remember it. That resemblance is an inference, not a statement in the pages. Where it decides an
outcome, the entry below says so.

## Inputs

**A1. Which files ACCRUE reads.**
- Assumed: `ledgacc` (LXV022Y), `balcat` (LXV026Y), `cardlink` (LXV024Y) and `rategrp` (LXV027Y). ACCRUE does not use `daytxn.dat`, `clntrec.dat`, `crdrec.dat`, `txntype.dat` or `txncatg.dat`.
- Rests on: CONTRACT.md lists all input files for the whole chain without assigning them to steps. The copybook headers name `rategrp` the "disclosure group", which carries `RG-INT-RATE`, the only interest field anywhere. The only ACCRUE outputs are transactions and accounts.

**A2. Account and category-balance inputs are POSTDAY results.**
- Assumed: per the CONTRACT.md "Step isolation" paragraph, these may arrive as `ledgacc.dat`/`balcat.dat` in the same layout, or as the oracle's POSTDAY outputs: JSON (`postday_ledgacc.json`, `postday_balcat.json`) or `.txt` fixed-width dumps.
- The workflow accepts fixed-width text or a JSON array (detected by a leading `[`). A `.txt` dump is assumed to follow the copybook layout.
- The pages do not say in which form the POSTDAY outputs are handed over.

**A3. Number encoding in the `.dat` files.**
- Assumed: `PIC S9(n)V99` fields are DISPLAY zoned decimal with an implied decimal point and the sign overpunched on the last digit (`{`/`A`–`I` positive, `}`/`J`–`R` negative). The parser also accepts an explicit leading or trailing `+`/`-`, or a literal `.`.
- Rests on: the copybooks (no `COMP`/`COMP-3`, so DISPLAY usage; `S` with no `SIGN SEPARATE`, so the default trailing embedded sign) and "one record per line, fixed width" in CONTRACT.md.

## Calculation

**A4. Interest formula.**
- Assumed: for each category balance, `interest = TXN-CAT-BAL × RG-INT-RATE / 1200`. In words, `RG-INT-RATE` is an annual percentage and interest is one month's worth.
- The result is **truncated** toward zero to 2 decimals, not rounded. This mirrors a COBOL `COMPUTE` into a `V99` field without `ROUNDED`.
- Computed exactly in integer cents (BigInt).
- Rests on: no statement in the pages. The rate field `S9(04)V99` fits a percentage. The /1200 and the truncation come from the CardDemo analogue. The example rule name `R-INTTRUNC` in CONTRACT.md's flags section hints that truncation of interest is a known point of attention. Flagged.

**A5. Processing order.**
- Assumed: category balances are processed in key order (`BCAT-LACC-ID`, `BCAT-TYPE-CD`, `BCAT-CD`), which is the `TXN-CAT-KEY` group. This order determines the transaction id sequence.
- Rests on: the key group in LXV026Y. The input order is not stated.

**A6. Account update.**
- Assumed: an account with at least one category balance gets the sum of its interest added to `curr_bal`. Its `curr_cyc_credit` and `curr_cyc_debit` are reset to 0, because the cycle closes.
- Accounts with no category balance are written unchanged. Every account is written (CONTRACT.md: "account fields for every account, after interest").
- No other field changes.
- Rests on: CardDemo analogue. The pages give no rule. The cycle reset applies even when the total interest is 0.

**A7. Rate lookup.**
- Assumed: rates are keyed by (`LACC-GROUP-ID`, `TXN-TYPE-CD`, `TXN-CAT-CD`), matching `RG-GROUP-KEY` in LXV027Y. If no record matches, the same type/category under group `DEFAULT` is used.
- Rests on: the key structure in LXV027Y. The `DEFAULT` fallback comes from the CardDemo analogue, not the pages.

**A8. Zero or missing rate.**
- Assumed: a rate of 0, or no rate even under `DEFAULT`, produces no interest and no transaction.
- When the rate is non-zero but the truncated interest is 0.00, a transaction for 0.00 is still written.
- Rests on: CardDemo analogue (it writes a transaction whenever the rate ≠ 0). The original abends on a missing DEFAULT record; this implementation continues.

**A9. Card number on the interest transaction.**
- Assumed: the card linked to the account in `cardlink`. If an account has several cards, the lowest card number is used, which is the first record found by an account-id lookup over a card-ordered file.
- If no link exists, `card_num` is left empty and the summary carries a warning. The original would abend.
- Rests on: LXV024Y has both `LINK-CRD-NUM` and `LINK-LACC-ID`, and the transaction needs `TXN-CRD-NUM`. The choice among several cards is not stated anywhere.

## Interest transaction fields (LXV030Y)

**A10. `tran_id`.**
- Assumed: the 10-character ACCRUE parameter (`2022071800`) followed by a 6-digit run counter starting at `000001`, for 16 characters in total (`TXN-ID X(16)`).
- Rests on: the 10-character parameter in CONTRACT.md "Run parameters" plus the 16-character `TXN-ID`. The construction itself comes from the CardDemo analogue.

**A11. Category balance for an account not in `ledgacc`.**
- Assumed: skipped (no interest, no transaction) with a warning. The original would abend.
- Not addressed in the pages.

**A12. Constant fields.**
- `type_cd "01"`, `cat_cd 5`, `source "System"`.
- `desc "Int. for a/c " + 11-digit account id`.
- `merchant_id 0`; `merchant_name`, `merchant_city` and `merchant_zip` empty (all spaces).
- `orig_ts` = `proc_ts` = the run's timestamp in DB2 form `YYYY-MM-DD-HH.MM.SS.hh0000` (26 characters, matching `X(26)`). The driver's `--timestamp` option can fix it.
- Rests on: CardDemo analogue only. Nothing in the pages defines these values. Timestamps cannot match an oracle run made at a different time.

**A13. Last account in the file.**
- In the CardDemo analogue, the read loop exits at end-of-file before the final account's update is written. That is a known defect: the last account keeps its old balance and cycle totals, although its interest transactions are written.
- Assumed: the last account **is** updated like every other one, because nothing in the pages says an account should be skipped.
- The workflow input `updateLastAccount: false` (driver flag `--no-last-account-update`) reproduces the defect, in case the oracle has it. Flagged.

## Output format

**A14. Output format.**
- Amounts are written as JSON strings with exactly two decimals (`"14.56"`, `"-0.45"`).
- `acct_id`, `cat_cd` and `merchant_id` are JSON integers.
- Strings are right-trimmed, which CONTRACT.md permits.
- Output order is not significant (CONTRACT.md: "in any order"). Accounts keep their input order; transactions follow A5.
