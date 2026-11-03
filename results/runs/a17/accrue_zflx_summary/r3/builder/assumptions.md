# ACCRUE (interest calculation): build assumptions

FlowX project `ll_a17_accrue_zflx_summary_r3`, workflow **`accrue_interest_calculation`**
(resourceId `<uuid>`, resourceDefinitionId `<uuid>`).

- Input slice: `ledgacc`, `balcat`, `rategrp`, `cardlink` (the raw contents of the `.dat` files, one record per line) and `parm` (default `2022071800`).
- Output slice: `accrue_systxn` and `accrue_ledgacc`, the two ACCRUE outputs in CONTRACT.md. Each is written as-is to `accrue_systxn.json` and `accrue_ledgacc.json`.
- Graph: Start → *Parse fixed-width inputs* (SCRIPT) → *Compute interest, post transactions, update accounts* (SCRIPT) → End.
  The script sources are also kept in `flowx/`.

The wiki supplied is a summary only: one Purpose sentence, a flow diagram and the copybooks. Where it
does not specify behaviour, I decided as follows. Several of these decisions follow the usual
behaviour of the legacy pattern this program appears to be: it is structurally the same as the
interest calculator in the public AWS CardDemo sample (CBACT04C). The wiki does not say that, so
each decision below rests on judgment, and I have marked the ones I'm least sure of as **[flag]**.

## What the wiki states (implemented directly)

| Behaviour | Wiki source |
|---|---|
| The work is driven by the account/type/category balances (balcat), grouped by account | Purpose: "For each account/type/category balance…"; flow: "List Category Balances by Account → For Each Account" |
| Rate lookup by the account's disclosure group, type and category (LXV027Y key) | Purpose: "finds the disclosure-group interest rate"; flow: "Get Disclosure Rate" |
| If there is no rate for the group, use the `STANDARD` group with the same type and category | Flow: "Rate found for group? No → Get STANDARD Rate" |
| Interest and a transaction only when the rate is not 0 | Flow: "Rate not 0? → Write Interest Transaction" |
| Transaction type `07`, category `12` | Purpose: "posts a batch transaction (type 07, category 12)" |
| Per account: add the accumulated interest to the balance and reset cycle credit/debit to 0 | Purpose: "updates the account balance, resetting cycle credit/debit totals"; flow: "Accumulate Total Interest → Account done? → Update Account" |

## Decisions where the wiki is silent or unclear

1. **Interest formula: `monthly = category balance × rate / 1200`** (the rate is an annual percentage, `RG-INT-RATE` S9(04)V99, so 18.00 means 18 %).
   The wiki only says "computes monthly interest". **[flag R-INTFORMULA]**
2. **Rounding: truncate toward zero to 2 decimals.** This is how COBOL `COMPUTE` behaves without `ROUNDED` when the target is V99. The wiki says nothing about rounding. The arithmetic uses exact integers (BigInt cents), not floats. **[flag R-INTTRUNC]**
3. **Each interest transaction is computed per category balance and truncated on its own.** The account total is the sum of the truncated per-category amounts, not the truncation of a summed amount. This rests on the flow order "Compute Interest → Write Interest Transaction → Accumulate Total Interest".
4. **One transaction per category balance with a non-zero rate, even if the computed amount is 0.00.** The diagram's gate is "Rate not 0?", not "interest not 0?".
5. **Every account that has at least one balcat record gets its balance updated and cycle totals reset**, including the last account in the file and accounts whose rates were all 0. The diagram shows "Account done? → Update Account" for every account.
   **[flag R-LASTACCT]** A known defect of the CardDemo pattern is that the program never updates the *last* account, because the end-of-file branch is unreachable. If LXB002C has that defect, the oracle's last account keeps its old balance and cycle totals. I followed the wiki.
6. **Accounts with no category balance are output unchanged.** `accrue_ledgacc` lists every account ("for every account, after interest"), in ledgacc input order. The wiki only has processing driven by balances.
7. **Active status is not checked.** Inactive accounts with balances accrue like active ones. The wiki mentions no status filter.
8. **Processing order is ascending (account id, type, category)**, because a sequentially read indexed file comes back in key order. This order fixes the transaction-id sequence. The wiki gives no order.
9. **Transaction id = first 10 characters of PARM (`2022071800`) + a 6-digit sequence starting at `000001`.** The sequence runs across the whole run, in processing order. This gives a 16-character `TXN-ID`. The wiki only names PARM='2022071800' for the job. **[flag R-TRANID]**
10. **Transaction text fields:** `source` = `System`, `desc` = `Int. for a/c ` + the account id zero-padded to 11 digits, `merchant_id` = 0, merchant name/city/zip blank. The wiki gives none of these. **[flag R-TXNFIELDS]**
11. **`card_num` comes from cardlink (LXV024Y) by `LINK-LACC-ID`.** If an account has several cards, the first one in file order is used. If it has none, the field is left blank (the legacy program would probably abend). The wiki only lists LXV024Y among the copybooks. **[flag R-CARDXREF]**
12. **Timestamps:** `orig_ts` = `proc_ts` = the time of the run, in DB2 format `YYYY-MM-DD-HH.MM.SS.hh0000` (26 characters, matching `PIC X(26)`). It is not derived from the business date 2022-07-18. The wiki does not define either one. **[flag R-TXNTS]**
13. **Missing reference data does not stop the run.** A balcat record whose account is not in ledgacc is skipped. A balance with no rate for either its own group or `STANDARD` is treated as rate 0 (no interest). Both cases are listed in the run's `warnings`. The wiki has no error path; the legacy program would likely abend instead.
14. **The group is matched with trailing spaces ignored** (`LACC-GROUP-ID` / `RG-LACC-GROUP-ID` are X(10)). `STANDARD` is the literal from the diagram.
15. **The account balance does not overflow:** an amount outside the PIC range is not truncated on the left. The wiki says nothing, and the test data is not expected to overflow.

## Input/format decisions

16. **Signed numeric fields are zoned decimal with the sign over-punched on the last digit.** `{`/`A`–`I` mean positive, `}`/`J`–`R` mean negative, and GnuCOBOL ASCII `p`–`y` also mean negative. The copybooks give `S9(n)V99` without `SIGN SEPARATE`, and the record lengths (300/50) only add up without a separate sign byte. Plain digits, a leading or trailing `+`/`-`, and an explicit decimal point are accepted too.
17. **Lines shorter than the record length are padded with spaces.** Blank lines are ignored. CRLF and LF both work.
18. **Outputs:** amounts are JSON strings with exactly 2 decimals (`"-13.01"`). `acct_id`, `cat_cd` and `merchant_id` are integers, `type_cd` is a 2-character string, and string fields have trailing spaces trimmed (CONTRACT.md allows this). The account output keeps every field as read, except `curr_bal`, `curr_cyc_credit` and `curr_cyc_debit`.
19. **ACCRUE only reads `ledgacc`, `balcat`, `rategrp` and `cardlink`.** The other contract inputs (daytxn, clntrec, crdrec, txntype, txncatg) are not used. The wiki names only copybooks LXV026Y/027Y/022Y/024Y/030Y for this step.

## Verification done

The workflow was run on a small synthetic fixture with 3 accounts, 3 balances, the STANDARD fallback, a 0 rate, a negative balance and an account with no balance:

- 1234.56 × 18 / 1200 gave 18.51, so account 1 went from 1000.00 to 1018.51.
- 999.99 × 15 / 1200 (STANDARD fallback) gave 12.49, so account 2 went from −25.50 to −13.01.
- The 0-rate balance produced no transaction.
- Account 3 came out unchanged.
- The cycle totals were reset, the card number was found and the transaction ids came out in sequence.

The real run inputs were not in the working directory, so `accrue_systxn.json` and `accrue_ledgacc.json` have not been produced yet.
