# ACCRUE (interest calculation): build assumptions

FlowX implementation: workflow `accrue_interest_calculation` in project `ll_a17_accrue_zflx_summary_r1`
(env dev-env, resourceId `<uuid>`, resourceDefinitionId
`<uuid>`). Graph: START → *Parse fixed-width inputs* (SCRIPT) →
*Compute interest and update accounts* (SCRIPT) → END. Script sources are in `../src/`.

Sources used: `02-processes/process-interest-calculation.md` (Purpose + Process Flow diagram),
`record-layouts.md` (copybooks), `CONTRACT.md`. Only the summary sections were available. The
linked acceptance criteria, the integration-workflow pages and the LXB002C source were not.

## Inputs and outputs

| # | Decision | Rests on |
|---|----------|----------|
| A1 | The workflow takes the **contents** of `ledgacc.dat`, `balcat.dat`, `rategrp.dat` and `cardlink.dat` as STRING inputs (one record per line), plus the optional `accrueParm` (default `2022071800`). A FlowX workflow cannot open local files, so the caller passes the text in. | CONTRACT.md "Inputs": fixed width, one record per line. The process page names three data-access integrations but never describes them. |
| A2 | ACCRUE reads only the account (LXV022Y), card link (LXV024Y), category balance (LXV026Y) and disclosure group (LXV027Y) files. `daytxn.dat` and the other reference files are not read. | The process page lists copybooks LXV026Y, LXV027Y, LXV022Y, LXV024Y, LXV030Y. LXV030Y is the layout of the output transaction. |
| A3 | Per CONTRACT.md "Step isolation", `ledgacc`/`balcat` should be the oracle's POSTDAY outputs. If they are only available as JSON or `.txt` dumps, they have to be turned back into the fixed-width layout before the call. | CONTRACT.md "Step isolation". |
| A4 | Outputs are the END node's `accrue_systxn` and `accrue_ledgacc` arrays. Each one is written unchanged to the `.json` file of the same name. Amounts are strings with exactly two decimals. Strings have trailing spaces removed. `acct_id`, `cat_cd` and `merchant_id` are ints. | CONTRACT.md "Outputs". |
| A5 | `accrue_ledgacc` holds **every** account in `ledgacc.dat`, in file order. Accounts with no category balance come out unchanged. | CONTRACT.md: "account fields for every account, after interest". |

## Parsing

| # | Decision | Rests on |
|---|----------|----------|
| P1 | Field offsets come straight from the copybooks. Short lines (trailing spaces trimmed) are padded to the record length. Blank lines are skipped. | record-layouts.md; CONTRACT.md "Strings may omit trailing spaces". |
| P2 | Signed DISPLAY fields (`S9(n)V99`, `S9(4)V99`) are decoded as zoned decimal with a trailing overpunch sign. Accepted forms: `{A–I` positive and `}J–R` negative (mainframe), `p–y` negative (GnuCOBOL ASCII), or an explicit `+`/`-`. Plain digits are positive. | The copybooks give `S` pictures but the wiki never says how signs are encoded in the `.dat` files. |
| P3 | `V99` is an implied decimal point, so all amounts are held as integer cents (rate as hundredths of a percent). This keeps the arithmetic exact. | Copybook PIC clauses. |

## Behaviour

| # | Decision | Rests on |
|---|----------|----------|
| B1 | `balcat` is processed in file order. A change of `BCAT-LACC-ID` closes the previous account (update) and opens the next one. The interest total restarts at 0 for each account. If an account appears again later in the file, its updates add up. | Process flow: "For Each Account … Accumulate Total Interest → Account done? → Update Account". The wiki does not state the sort order. |
| B2 | Rate lookup key is (account `LACC-GROUP-ID`, balance `BCAT-TYPE-CD`, balance `BCAT-CD`) against (`RG-LACC-GROUP-ID`, `RG-TXN-TYPE-CD`, `RG-TXN-CAT-CD`). Group ids are compared with trailing spaces removed. | Purpose: "finds the disclosure-group interest rate". The flow's "Get Disclosure Rate" step. |
| B3 | If that key is missing, the lookup is repeated with group id **`STANDARD`** and the same type/category. | Flow: "Rate found for group? → No → Get STANDARD Rate → Default Rate". |
| B4 | If the STANDARD row is missing too, the rate is treated as 0 and the balance is skipped. | The wiki is silent on this case. The legacy job may abend here instead. |
| B5 | A transaction is written only when the rate is not 0. A non-zero rate on a zero balance still writes a `0.00` transaction. | Flow: "Rate not 0? → Yes → Write Interest Transaction". The gate is on the rate, not on the computed amount. |
| B6 | **Monthly interest = balance × annual rate ÷ 1200**, truncated toward zero to cents (no rounding). The rate is read as an annual percentage. | Purpose says only "computes monthly interest". The /12 and the percent scale are inferred. Truncation follows COBOL's default with no `ROUNDED`, and the contract hints at it (`R-INTTRUNC` in the flags.json example). **High-uncertainty item.** |
| B7 | Fees: none. | The wiki does not mention any fee calculation for this step. |
| B8 | The account update is: `curr_bal += total interest of the account`, `curr_cyc_credit = 0`, `curr_cyc_debit = 0`. It is applied to every account that has at least one balance row, **including the last account in the file** and accounts whose rates were all 0. | Purpose: "updates the account balance, resetting cycle credit/debit totals". Flow: Update Account follows "Account done?". The wiki does not say whether the last account is flushed at end of file. **Flag:** a legacy EOF quirk that skips the last account would show up here. |
| B9 | Active status, expiry date and credit limit do not affect accrual. Inactive accounts accrue too. | The wiki mentions no filter. |
| B10 | A balance row whose account is missing from `ledgacc` is skipped: no transaction, no update. | The wiki is silent. The legacy job would probably abend. |

## Interest transaction fields (LXV030Y)

| # | Field | Decision | Rests on |
|---|-------|----------|----------|
| T1 | `tran_id` | `ACCRUE parm (10 chars) + 6-digit running counter`. The counter starts at 000001 and runs across the whole job, not per account. Example: `2022071800000001`. | The wiki is silent on id generation. CONTRACT.md gives the 10-char parameter `2022071800` and TXN-ID is X(16) = 10 + 6. **Flag.** |
| T2 | `type_cd` / `cat_cd` | `07` / `12`. | Purpose: "posts a batch transaction (type 07, category 12)". |
| T3 | `source` | `System`. | The wiki is silent; the transaction is system-generated. **Flag.** |
| T4 | `desc` | `Int. for a/c <acct_id without leading zeros>`. | The wiki is silent. **Flag.** The legacy text may carry the 11-digit zero-padded id. |
| T5 | `amt` | The truncated monthly interest (B6), signed. | B6. |
| T6 | merchant fields | `merchant_id` 0, name/city/zip empty. | The wiki is silent; interest has no merchant. |
| T7 | `card_num` | The first `cardlink` record (file order) whose `LINK-LACC-ID` matches the account. Empty if there is none. | Copybook LXV024Y is on the step's list. The wiki does not say how the card is chosen or what happens when none is found. |
| T8 | `orig_ts` / `proc_ts` | Both `YYYY-MM-DD-00.00.00.000000`, with the date taken from the parameter (2022-07-18). | The wiki is silent. The legacy job probably stamps the wall-clock run time, which a migration cannot reproduce, so a deterministic business-date timestamp in 26-char DB2 format (X(26)) is used instead. **Flag.** |

## Verification done

- `analyze_workflow`: 0 errors, 0 warnings.
- One `run_workflow` on synthetic records (`../test/input.json`) finished, and the results matched hand calculation:
  - 1000.00 @ 18.00 % gives 15.00.
  - 333.33 @ 24.99 % gives 6.94, truncated from 6.9416.
  - −250.55 @ STANDARD 15.00 % gives −3.13, truncated from −3.1319.
  - A rate-0 row was skipped.
  - An orphan balance was skipped.
  - The account with no balances came out unchanged.
  - Results are in `../test/`.
- The real Ledgerline input files were **not** in the working directory, so no real `accrue_systxn.json` / `accrue_ledgacc.json` were produced. They come from running the workflow on the real files' contents (A1, A3).
