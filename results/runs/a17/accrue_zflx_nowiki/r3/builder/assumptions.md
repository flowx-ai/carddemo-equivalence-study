# ACCRUE (interest calculation) – assumptions

Implementation: FlowX workflow `accrue_interest` (app `ll_a17_accrue_zflx_nowiki_r3`, dev-env,
resourceId `<uuid>`), START → SCRIPT "Accrue interest" → END.
Source copy of the script: `flowx/accrue_script.js` (comments carry the A-nn numbers below).

The attached pages (record-layouts.md, CONTRACT.md) fix **formats only**; CONTRACT.md says explicitly
that it "says nothing about behaviour". So every behavioural rule below is a decision.

**Basis of the behavioural decisions.** The copybooks are structurally identical to the open-source
AWS CardDemo application, with names changed. LXV022Y = CVACT01Y, LXV024Y = CVACT03Y, LXV026Y = CVTRA01Y,
LXV027Y = CVTRA02Y, LXV030Y = CVTRA05Y. The "interest calculation" step reading category balances,
disclosure groups, card xref and accounts matches CardDemo's CBACT04C. The rules marked
**[recalled]** come from my memory of that program, not from the attached pages. They are
unverifiable here and the oracle may differ. Rules marked **[pages]** rest on a statement in the
pages, and rules marked **[none]** rest on nothing (default or judgement).

## Inputs / formats

| # | Decision | Basis |
|---|----------|-------|
| A-01 | ACCRUE reads `balcat.dat`, `ledgacc.dat` (the oracle's POSTDAY outputs), `cardlink.dat` and `rategrp.dat`. `daytxn.dat`, `clntrec.dat`, `crdrec.dat`, `txntype.dat` and `txncatg.dat` are not needed for this step. | [pages] CONTRACT.md "Step isolation … POSTDAY outputs as its account and category-balance inputs"; the input table. The choice of files is [recalled]. |
| A-02 | Fixed-width records are split on newlines (CR/LF tolerated). Blank lines are skipped and short lines are right-padded with spaces to RECLN. Field offsets follow the copybooks: account 300, xref 50, cat-bal 50, disclosure group 50. Because "POSTDAY outputs" may arrive in the contract's JSON form instead, `ledgacc` and `balcat` are also accepted as a JSON list using the contract field names. | [pages] "one record per line, fixed width, layouts as in the copybooks"; "A run may instead leave … fixed-width dumps". |
| A-03 | Category balances are processed in ascending key order (acct_id, type_cd, cat_cd), as a VSAM KSDS would deliver them sequentially. The input is sorted first. | [none]/[recalled] LXV026Y defines `TXN-CAT-KEY`; the pages state no file organisation. |
| A-04 | Signed numeric fields `S9(n)V99` are zoned decimal with the sign overpunched on the last digit. `{`, `A`–`I` are +0..9; `}`, `J`–`R` are −0..9; ASCII `p`–`y` are also read as −0..9. A leading `+`/`-` and unpunched digits are tolerated. The implied 2 decimals are applied. | [pages] PIC clauses only; the sign encoding in the text files is not stated. |

## Calculation

| # | Decision | Basis |
|---|----------|-------|
| A-05 | The rate for a category balance comes from the disclosure group keyed (account `group_id`, `type_cd`, `cat_cd`). If no such record exists, the group `DEFAULT` with the same type/cat is used. | [recalled]. The pages only give the LXV027Y key (`RG-LACC-GROUP-ID`, type, cat) and `LACC-GROUP-ID`. |
| A-06 | The card number on the interest transaction is the account's card from the xref, looked up by account id. If an account has several cards, the lowest card number wins, as in an alternate-index read on a file in card-number key order. | [recalled] for the lookup; [none] for the tie-break. |
| A-07 | A transaction is written for every category balance whose rate ≠ 0, even if the computed interest is 0.00. Rate 0 produces no transaction. | [recalled]. |
| A-08 | Monthly interest = `balance × rate / 1200`. The rate is an annual percentage (`S9(04)V99`), divided by 12. The result is **truncated toward zero** to 2 decimals (COBOL COMPUTE without ROUNDED), and arithmetic is exact (BigInt cents). Negative balances give negative interest. Fees: none. | [recalled]. The contract's flag example mentions a rule "R-INTTRUNC", which suggests that truncation of interest matters. |
| A-09 | When the account changes, the account record is rewritten: `curr_bal += sum of that account's interest`, `curr_cyc_credit = 0`, `curr_cyc_debit = 0`. This happens for every account that has at least one category balance, even if its total interest is 0. Accounts without category balances are output unchanged. All other account fields are unchanged. | [recalled]. The pages say only "account fields for every account, after interest". |
| A-10 | **The last account in key order is NOT rewritten.** Its interest transactions are still written. This reproduces the legacy loop as I recall it: the final account's update sits in an ELSE branch that the PERFORM UNTIL never reaches. It can be switched with the workflow input `updateLastAccount = "Y"`. | [recalled], uncertain. A plain reading of CONTRACT.md ("every account, after interest") would apply it, so this is flagged in `flags.json`. |
| A-11 | `tran_id` = ACCRUE parameter (10 chars, `2022071800`) followed by a 6-digit sequence starting at 000001, incremented per interest transaction in processing order. | [pages] for the parameter value "ACCRUE parameter 2022071800"; layout [recalled]. |
| A-12 | Interest transaction constants: `type_cd "01"`, `cat_cd 5`, `source "System"`, `desc "Int. for a/c " + 11-digit zero-padded acct id`, `merchant_id 0`, merchant name/city/zip blank. | [recalled]. |
| A-13 | `orig_ts` = `proc_ts` = `2022-07-18-00.00.00.000000` (DB2 timestamp format, 26 chars = `TXN-ORIG-TS PIC X(26)`). The legacy step stamps the wall-clock time, which no run can reproduce, so the business date at midnight is used to stay deterministic. Override with the input `procTs`. | [pages] business date 2022-07-18 and PIC X(26); time-of-day is [none]. |
| A-14 | Error handling. The legacy program abends on a missing account, a missing xref or a missing DEFAULT rate [recalled]. To keep producing output, this build: skips category balances whose account is missing; leaves `card_num` blank when there is no xref; treats a missing DEFAULT rate as 0 (no transaction). Each case is reported in the workflow output `anomalies`. | [none]. |
| A-15 | Monthly interest is not checked for overflow against `S9(09)V99`, nor the balance against `S9(10)V99`. Values are kept exact. | [none]. |

## Output format

| # | Decision | Basis |
|---|----------|-------|
| A-16 | `accrue_systxn.json` holds the interest transactions in write order. `accrue_ledgacc.json` holds every input account in input order. Amounts are strings with exactly 2 decimals, strings are right-trimmed, `acct_id`/`cat_cd`/`merchant_id` are ints, and `type_cd` stays a string ("01"). `expiration_date` maps `LACC-EXPIRY-DATE`. | [pages] CONTRACT.md Outputs, field lists, "Strings may omit trailing spaces", "Amounts are JSON strings … at most two decimals". |
