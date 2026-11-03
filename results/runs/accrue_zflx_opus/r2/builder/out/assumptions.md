# ACCRUE (interest calculation): assumptions and decisions

Implementation: FlowX workflow `accrue_interest_calculation` in project `ll_accrue_zflx_opus_r2`
(resourceDefinitionId `<uuid>`). Nodes: Start → Load input files →
Compute interest → Post interest to accounts → End. Script comments refer to the ids below (A1…).

Sources: `02-processes/process-interest-calculation.md` ("process page"),
`10-acceptance-criteria/acceptance-criteria-interest-calculation.md` ("acceptance page"),
`01-data-model/project-data-model.md` ("data model page"), `CONTRACT.md`.

**General basis for gap-filling.** The wiki gives no copybook offsets, no RATEGRP layout, no formula
detail (process page: `{{TODO: Extract exact interest formula, rounding, and grouping from LXB002C +
RATEGRP.}}`) and doesn't mention the interest transactions at all, although CONTRACT.md requires
`accrue_systxn.json`. Every Ledgerline record length in CONTRACT.md (300/150/50/500/50/50/60/60/350)
and every field list in the data model page match the AWS CardDemo sample application record for
record (LXV022Y ≈ CVACT01Y, LXV026Y ≈ CVTRA01Y, LXV027Y ≈ CVTRA02Y, LXB002C ≈ CBACT04C). Where the wiki
is silent, I filled the gap with the CardDemo convention and say so below. The wiki doesn't confirm
that Ledgerline is CardDemo, so each of these is an assumption, not a fact.

## Input layouts

| # | Assumption | Wiki basis |
|---|---|---|
| A1 | `ledgacc.dat` (LXV022Y, 300 B) fields are contiguous, in data-model order, from offset 0: acct_id 9(11) [0–11], active_status X(1) [11], curr_bal S9(10)V99 [12–24], credit_limit [24–36], cash_credit_limit [36–48], open_date X(10) [48–58], expiration_date [58–68], reissue_date [68–78], curr_cyc_credit [78–90], curr_cyc_debit [90–102], addr_zip X(10) [102–112], group_id X(10) [112–122], FILLER to 300. | Data model page lists the attributes and PICs in this order and says "FILLER tails are dropped". It gives no offsets. |
| A2 | `balcat.dat` (LXV026Y, 50 B): acct_id 9(11) [0–11], type_cd X(2) [11–13], cat_cd 9(4) [13–17], balance S9(9)V99 [17–28], FILLER. | Data model page, TransactionCategoryBalance: field order + PICs only. |
| A3 | `rategrp.dat` (LXV027Y, 50 B): group_id X(10) [0–10], type_cd X(2) [10–12], cat_cd 9(4) [12–16], int_rate S9(4)V99 [16–22], FILLER. Key = group + type + category. | **Not documented anywhere** in the wiki. The process page only says "interest-rate parameters come from the disclosure-group reference data (RATEGRP)". This is the CardDemo DIS-GROUP-RECORD layout. |
| A4 | `cardlink.dat` (LXV024Y, 50 B): card_num X(16) [0–16], customer_id 9(9) [16–25], acct_id 9(11) [25–36]. | Data model page, CardXref: order + PICs only. |
| A5 | `txncatg.dat` (LXV029Y, 60 B): type_cd X(2) [0–2], cat_cd 9(4) [2–6], description X(50) [6–56]. | Not in the pages provided (TransactionCategory is only linked). CardDemo TRAN-CAT-RECORD layout. |
| A6 | Each input file arrives as its full text content in a string workflow input (`ledgaccFile`, `balcatFile`, `rategrpFile`, `cardlinkFile`, `txncatgFile`). Blank lines are skipped. Short lines are right-padded with spaces, because trailing spaces may have been stripped. `daytxn.dat`, `clntrec.dat`, `crdrec.dat` and `txntype.dat` are not read: nothing in the interest step uses them. | CONTRACT.md: "one record per line, fixed width". The process page lists only accounts and disclosure groups as inputs. |
| A7 | Signed DISPLAY numerics use the trailing overpunch sign: `{ A–I` = +0…+9, `} J–R` = −0…−9. ASCII `p–y` (−0…−9) and an explicit leading/trailing `+`/`-` are also accepted. Unsigned numerics are plain digits. A non-numeric field is treated as 0 and reported in `runReport.warnings`. The legacy program would most likely abend instead. | Data model page: "Packed/zoned/signed numerics … map to NUMBER". The sign encoding isn't stated. |

## Interest computation

| # | Assumption | Wiki basis |
|---|---|---|
| A8 | **Interest is computed per category balance** (one balcat record = one interest line), not once per account on `currentBalance`. The account's interest is the sum of its category lines. | The process page says `interest = currentBalance × interestRate(groupId)`, and in the same rule "posted to balance **and category balance**". It also lists TransactionCategoryBalance as Related Data (data model page: "Used by: … Interest Calculation") and flags "grouping" as a TODO. The literal per-account formula can't pick one RATEGRP row (A9), and per-category computation is what produces one interest *transaction* per line for `accrue_systxn.json`. **This deviates from the literal formula on the process page.** |
| A9 | Rate lookup key = (account.group_id, balance.type_cd, balance.cat_cd). | The wiki says `rate(groupId)` / "Interest rate per account group". The RATEGRP record (A3) is keyed by group + type + category, so group alone is ambiguous. |
| A10 | `int_rate` is an **annual percentage** (e.g. 18.25 = 18.25 % p.a.) applied for a **monthly** cycle: `interest = balance × rate / 1200`. | Process page: exact formula is a TODO. The literal `balance × rate` with a rate like 18.25 would multiply the balance 18-fold. CardDemo CBACT04C uses `/ 1200`. |
| A11 | **Rounding: truncate toward zero to the cent**, per category line, before summing per account. Exact integer arithmetic is used, with no floating point. | Acceptance page, scenario 2: `{{TODO: confirm rounding mode}}`. COBOL `COMPUTE` without `ROUNDED` into a V99 field truncates, and CardDemo's computation has no ROUNDED. |
| A12 | If (group, type, cat) has no RATEGRP row, the row for group `DEFAULT` (same type/cat) is used. If neither exists, no interest is computed for that line, and a warning is reported. | Wiki silent. Data model page: `groupId` is **not required**, so accounts without a matching group must be handled. CardDemo falls back to `DEFAULT`. |
| A13 | Rate = 0: no interest line and **no transaction**. A zero (or rounded-to-zero) balance with a non-zero rate still produces a transaction of `0.00`, and adds 0 to the account. | Acceptance page, scenario 3: "Account balance 0 → Zero interest". It doesn't say whether a zero transaction is written. CardDemo only skips when the rate is 0. |
| A14 | Category balances are processed in key order (acct_id, type_cd, cat_cd), whatever the file order. This order drives tran_id numbering. | Data model page: composite key accountId + typeCode + categoryCode (a VSAM KSDS is read in key order). |
| A15 | Negative category balances yield negative interest (a credit), truncated toward zero (e.g. −250.00 × 15 % / 12 = −3.125 → −3.12). | Wiki silent. Balances are "signed". |
| A16 | Interest accrues on every account regardless of `active_status`. | Wiki defines no status filter for this step ("computes interest for each account"). |

## Outputs

| # | Assumption | Wiki basis |
|---|---|---|
| A17 | `accrue_ledgacc.json` lists **every** account in ledgacc file order. The account's interest total is added to `curr_bal` (process page: "Post Interest: Add interest to balance"). Accounts with no category balances are written unchanged. A balcat record whose account isn't in ledgacc is skipped, with a warning. | Process page nodes 5–6. CONTRACT.md: "account fields for every account, after interest". |
| A18 | **`curr_cyc_credit` / `curr_cyc_debit` are NOT reset.** The workflow has an optional input `resetCycleTotals` (default false) that zeroes them on posted accounts. | The wiki describes only adding interest to the balance and says nothing about cycle totals. CardDemo's CBACT04C does zero them when it rewrites the account. Turning the flag on gives that behaviour. This is the decision I'm least sure of. |
| A19 | Category balances are not modified, and no balcat output is produced. | Process page: "posted to balance and category balance". CONTRACT.md lists no ACCRUE balcat output, so a category-balance update would be invisible anyway. |
| A20 | One interest transaction per interest line (A8/A13), with: `tran_id` = ACCRUE parameter (`2022071800`) + 6-digit sequence from `000001` (16 chars, TXN-ID X(16)). `type_cd`/`cat_cd` = the first transaction category whose description contains "interest" in `txncatg.dat`, defaulting to `01`/`5`. `source` = `System`. `desc` = `Int. for a/c ` + 11-digit zero-padded account id. `amt` = line interest. `merchant_id` = 0, merchant name/city/zip empty. | The wiki never mentions interest transactions. CONTRACT.md requires `accrue_systxn.json` ("every interest transaction written"). The 10-digit ACCRUE parameter fits the TXN-ID prefix. The constants are CardDemo CBACT04C's. |
| A21 | `card_num` = the first card linked to the account in `cardlink.dat` file order. It's blank (with a warning) if the account has none. | Wiki silent. CardXref has an alternate index on accountId (data model page). |
| A22 | `orig_ts` = `proc_ts` = business date at midnight in DB2 X(26) form: `2022-07-18-00.00.00.000000`. | Wiki silent. Legacy writes the run's current timestamp, which isn't reproducible, so the business date is used. If `businessDate` is omitted it's derived from the ACCRUE parameter, and vice versa. |
| A23 | Formatting: amounts are strings with exactly two decimals (`"-3.12"`), `acct_id` and `merchant_id`/`cat_cd` are JSON integers, strings are trimmed, and dates are passed through as they appear in the record. The legacy `LACC-EXPIRY-DATE` maps to `expiration_date`. | CONTRACT.md field list and amount rule. Data model page `{{DECISION}}` on the expiry-date typo: the recommended rename is used. |
| A24 | The workflow returns each output twice: as a typed array (`accrue_systxn`, `accrue_ledgacc`) and as ready-to-write JSON text (`accrue_systxn_json`, `accrue_ledgacc_json`). The caller writes them to `accrue_systxn.json` / `accrue_ledgacc.json` in this folder. `runReport` carries counts and warnings. | CONTRACT.md: one JSON list per output file. |

## Orchestration

| # | Assumption | Wiki basis |
|---|---|---|
| A25 | Built as a file-in/file-out **workflow**, not the wiki's scheduled process with a per-account loop and Kafka `loadaccounts`/`saveaccount` datastore topics. The three script nodes correspond to the wiki's Load Accounts, Compute Interest, and Post Interest + Save Account. No scheduler/timer start is configured. | The process page describes a scheduled process persisting through FlowX Persistence. CONTRACT.md instead fixes per-run input files and JSON outputs, and that contract wins for this build. |
