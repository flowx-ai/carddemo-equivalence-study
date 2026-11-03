# ACCRUE (Interest Calculation): assumptions and decisions

Implementation: FlowX workflow `ledgerline_accrue_interest` (project dev-env; resourceDefinitionId
`<uuid>`). It runs START, then **Load Inputs**, **Compute Interest**,
**Post Interest and Save**, then END. The code of the three SCRIPT nodes is in `../flowx/scripts/`. `../run_accrue.js`
runs the same three scripts locally against an input directory and writes `accrue_systxn.json`
and `accrue_ledgacc.json` here.

Sources: **P** is `02-processes/process-interest-calculation.md`, **AC** is
`10-acceptance-criteria/acceptance-criteria-interest-calculation.md`, **DM** is
`01-data-model/project-data-model.md`, **ONT** is ONTOLOGY.md (I also queried the live ontology
`ledgerline-accrue`, and it held nothing beyond the export), and **C** is CONTRACT.md.

The wiki says very little about this step. P has one formula line plus
`{{TODO: Extract exact interest formula, rounding, and grouping from LXB002C + RATEGRP.}}`, and
the source of LXB002C was not provided. Some decisions below therefore rest on my knowledge of the
public program family that Ledgerline appears to be derived from: LXB002C, ACCRUE and RATEGRP
correspond to CardDemo's CBACT04C, INTCALC and DISCGRP, and the record layouts match field for
field. Each such decision is marked **[lineage]**. They are inference, not wiki fact.

## Inputs

**A1. Files read.** The step reads `ledgacc` (LXV022Y), `balcat` (LXV026Y), `rategrp` (LXV027Y) and
`cardlink` (LXV024Y). `daytxn`, `clntrec`, `crdrec`, `txntype` and `txncatg` are not used.
- Basis: P lists Related Data as Account and TransactionCategoryBalance, plus disclosure config RATEGRP. ONT `LXB002C uses_file` names BALCAT-FILE, ACCOUNT-FILE, LINK-FILE, RATEGRP-FILE and TXNFILE-FILE (output only). The link file is needed only to fill the transaction's `card_num`.

**A1b. Step isolation.** Account and category-balance inputs come from POSTDAY's outputs when those
are present. The runner looks for `postday_ledgacc.json`, then `postday_ledgacc.txt`, then
`ledgacc.dat`, and does the same for balcat. The parser accepts both fixed-width records and the
JSON-object form of C.
- Basis: C says "A candidate for ACCRUE receives the oracle's POSTDAY outputs as its account and category-balance inputs". It does not say in which form.

**A1c. Record layouts.** I took field offsets from DM and the ONT copybook concepts:
- LXV022Y: id 0–11, status 11, balances `S9(10)V99` at 12/24/36, dates at 48/58/68, cycle credit and debit at 78/90, zip at 102, group at 112.
- LXV026Y: acct 0–11, type 11–13, cat 13–17, bal `S9(9)V99` 17–28.
- LXV027Y: group 0–10, type 10–12, cat 12–16, rate `S9(4)V99` 16–22 (ONT: "signed decimal(6,2)").
- LXV024Y: card 0–16, client 16–25, acct 25–36.

Signed DISPLAY numerics are decoded with a trailing overpunch (`{A–I` positive, `}J–R` negative,
GnuCOBOL `p–y` negative). A separate `+`/`-` or an explicit decimal point is also accepted. DM does
not state the encoding.

## Calculation

**A2. Iteration unit and order.** The step iterates over **category-balance records** in key order
(account id, type code, category code), not over account records. Each account's category records
are contiguous, and that run plays the role of P's "For each account" loop.
- Basis: P "For each account" and AC "Correct rate per group". The rate key RG-GROUP-KEY is group + type + category (ONT), so a rate only exists per category. BALCAT-FILE is INDEXED with SEQUENTIAL access (ONT), which means it is read in key order. The input file is sorted to reproduce that order.

**A3. Which balance.** The interest base is the **category balance** (`TXN-CAT-BAL`), not the
account's `currentBalance`.
- Basis: P literally writes `interest = currentBalance × interestRate(groupId)` but flags it as TODO. The rate depends on type and category (RG-GROUP-KEY), which only a category balance carries. DM lists Interest Calculation under "Used by" for TransactionCategoryBalance. **[lineage]** CBACT04C computes from TRAN-CAT-BAL.

**A4. Rate scale (monthly accrual).** `RG-INT-RATE` is an annual percentage, so a run accrues one
month: `interest = balance × rate / 1200`.
- Basis: the wiki is silent (TODO). A `S9(4)V99` rate field such as `15.00` only makes sense as a percent. P names the trigger "Interest cycle". **[lineage]** CBACT04C uses `(TRAN-CAT-BAL * DIS-INT-RATE) / 1200`.

**A5. Rounding.** Interest is **truncated toward zero** to 2 decimals per category record, and the
truncated amounts are summed per account. Arithmetic is exact integer math in cents.
- Basis: P has a TODO on rounding, and AC scenario 2 says "Rounding matches legacy {{TODO: confirm rounding mode}}". COBOL `COMPUTE` without `ROUNDED` truncates. Flagged as R-INT-TRUNC.

**A6. Missing rate leads to the DEFAULT group.** If no RATEGRP record exists for (account group,
type, category), the lookup is retried with group id `DEFAULT`.
- Basis: the wiki is silent about missing rates. **[lineage]** CBACT04C falls back to the `DEFAULT` disclosure group on a not-found status (23).

**A7. No DEFAULT record either.** The rate is taken as 0, so the category gets no interest and no
transaction. The case is reported in `computeIssues`. The legacy program would most likely abend.
- Basis: the wiki is silent. I chose to continue the batch rather than fail it.

**A8. Zero rate and zero balance.** A rate of 0 produces no transaction. A zero balance with a
non-zero rate produces a transaction with `amt` `0.00`.
- Basis: AC scenario 3 says "Account balance 0 → Zero interest" but does not say whether the posting is written. **[lineage]** CBACT04C only guards on `DIS-INT-RATE NOT = 0`.

**A9. Negative balances.** A negative balance accrues negative interest (truncated toward zero),
and that amount is written and posted.
- Basis: the wiki is silent. The formula is applied as written.

**A17. Fees.** No fees are computed.
- Basis: the wiki mentions only interest. **[lineage]** The fee paragraph in CBACT04C is an empty stub.

## Posting (accrue_ledgacc)

**A10. Account update.** For every account that has at least one category-balance record:
`curr_bal += Σ interest`, and `curr_cyc_credit` and `curr_cyc_debit` are reset to `0.00`.
- Basis: P says "Post Interest: Add interest to balance". It does not mention the cycle fields. ONT concept "Account Record" (LXB002C chunk 8, the same chunk as the rewrite status) ties LACC-CURR-BAL, LACC-CURR-CYC-CREDIT and LACC-CURR-CYC-DEBIT to the update, which suggests the rewrite touches all three. **[lineage]** CBACT04C zeroes both. Flagged.

**A14. Unaffected accounts.** Accounts with no category balances are output unchanged. The output
contains every input account, in input order.
- Basis: C requires "account fields for every account, after interest".

**A15. Category balances are not changed.** P says interest is "posted to balance and category
balance", but C defines no ACCRUE category-balance output. I assume the category effect comes from
the interest transactions, which the next posting run processes.

**A16. Last account.** Every account is posted, including the last one in key order.
- Basis: P posts interest to each account. Note: in the CBACT04C lineage, the end-of-file logic of the main loop never reaches its final "update account" branch, so the **last** account's rewrite is skipped there. If LXB002C kept that defect, the oracle would show the last account without its interest and with its cycle fields untouched. I followed the wiki. Flagged.

**A13. Unknown account.** A category balance whose account is missing from ledgacc is skipped and
reported. The legacy program would abend; the wiki is silent.

## Interest transactions (accrue_systxn)

The wiki defines none of these field values. All of them are **[lineage]** decisions, and all are
flagged.

**A11.** `card_num` is the account's first card in LINK-FILE alternate-key order, which means the
lowest card number. If the account has no link, `card_num` is empty. Basis: ONT LINK-FILE has
alternate key `FD-LINK-LACC-ID`.

**A12a.** `tran_id` is the 10-character ACCRUE parameter (`2022071800`) followed by a 6-digit
sequence starting at `000001`, incremented for each written transaction across the whole run.
Basis: C gives the ACCRUE parameter `2022071800`, and 10 + 6 = 16 matches `TXN-ID X(16)`.

**A12b.** The fixed values are:
- `type_cd` `"01"`, `cat_cd` `5`
- `source` `"System"`
- `desc` `"Int. for a/c "` followed by the 11-digit zero-padded account id
- `merchant_id` `0`, with merchant name, city and zip blank

**A12c.** `orig_ts` and `proc_ts` use the DB2 format from ONT (DB2-FORMAT-TS:
`YYYY-MM-DD-HH.MM.SS.mm` + `0000`). The legacy program stamps the wall-clock time, which cannot be
reproduced, so I use the business date at midnight: `2022-07-18-00.00.00.000000`.

## Formatting

**A18.** Amounts are written as JSON strings with exactly two decimals, for example `"-190.32"`.
`acct_id`, `cat_cd` and `merchant_id` are integers. Trailing spaces are trimmed, as C allows.

**A20.** If a key is duplicated in rategrp, cardlink or ledgacc, the first record wins.

**A21.** Group ids are compared without trailing spaces and are case-sensitive. Type codes are
compared in ASCII order.
