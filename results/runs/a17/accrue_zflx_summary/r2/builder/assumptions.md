# ACCRUE (interest calculation): assumptions

Implementation: FlowX workflow `accrue_interest_calculation` (project `ll_a17_accrue_zflx_summary_r2`,
resourceDefinitionId `<uuid>`). Sources: `process-interest-calculation.md`
(summary only), `record-layouts.md`, `CONTRACT.md`. The wiki gives only a one-sentence purpose and a flow
diagram, so most of the details below are decisions rather than documented facts.

Each entry lists the decision and then the wiki statement it rests on, or notes that the wiki is silent.

## Inputs

| # | Decision | Basis |
|---|----------|-------|
| A1 | ACCRUE reads only `ledgacc.dat`, `balcat.dat`, `rategrp.dat` and `cardlink.dat`. `daytxn.dat`, client, card, txntype and txncatg files are ignored. | The legacy source lists copybooks LXV026Y, LXV027Y, LXV022Y, LXV024Y and LXV030Y only. LXV030Y is the transaction being written, not read. |
| A2 | Per CONTRACT "Step isolation", `ledgacc.dat` and `balcat.dat` are the POSTDAY outputs the run receives. | CONTRACT.md, Step isolation. |
| A3 | Records are one per line. Short lines are right-padded with spaces to the record length, and blank lines are skipped. | CONTRACT: "one record per line, fixed width". It says nothing about trailing-space trimming. |
| A4 | Signed numeric fields (`S9…V99`) are read as zoned decimal. The sign may be an overpunch on the last byte (`{ A–I` positive, `} J–R` negative; ASCII `p–y` negative). A leading or trailing `+`/`-` is also accepted, as are plain digits. Blank fields read as 0. | The copybooks give `PIC S9(n)V99` only. The encoding of the sign in the text files is not documented. |
| A5 | Implied decimals: balances and amounts have 2, and the rate `RG-INT-RATE S9(04)V99` has 2 (so `00185{` = 18.50, meaning 18.50 % per year). | Copybook PICs. That the rate is an annual percentage is an assumption (see C2). |

## Processing

| # | Decision | Basis |
|---|----------|-------|
| B1 | Category balances are processed in key order (account id, type code, category code), whatever order the file is in. | The diagram shows "List Category Balances by Account" then "For Each Account". LXV026Y has a key group `TXN-CAT-KEY`, so a keyed (sorted) read is assumed. The order sets the transaction-id sequence (D1). |
| B2 | Rate lookup key = (account `LACC-GROUP-ID`, balance type code, balance category code), matched against `RG-GROUP-KEY`. Group ids are compared after trimming trailing spaces. | Purpose: "finds the disclosure-group interest rate". The copybook key layouts match field for field. |
| B3 | If no disclosure record exists for the account's group, the same type and category are looked up under group `STANDARD`. A record that exists with rate 0 does **not** fall back. | Diagram: "Rate found for group? → No → Get STANDARD Rate". The fallback is triggered by *not found*, not by a zero rate. |
| B4 | If the STANDARD record is also missing, the rate is treated as 0 (no interest) and the run continues. | The wiki does not say what happens; the legacy job probably abended. I chose not to stop the batch. The count is reported in `runSummary.noRateFound`. |
| B5 | Interest is computed and a transaction written only when the rate is not 0. | Diagram: "Rate not 0? → Yes → Compute Interest / Write Interest Transaction"; No goes straight to "Account done?". |
| C1 | Monthly interest = category balance × rate ÷ 1200. | Purpose: "computes monthly interest". 1200 = 12 months × 100 (percent). The formula itself is not written in the wiki. |
| C2 | The result is **truncated** toward zero to 2 decimals (no rounding), and that applies to negative balances too (−1.9998 → −1.99). | The wiki is silent. COBOL `COMPUTE` without `ROUNDED` into a `V99` field truncates. CONTRACT's flags example names a rule `R-INT-TRUNC`. Exact integer (BigInt) arithmetic is used. |
| C3 | Interest is computed on negative (credit) balances as well, giving negative interest transactions. | The wiki gives no sign rule; the only condition shown is "Rate not 0?". |
| C4 | Total interest per account = the sum of its per-balance truncated amounts. Truncation is per transaction, not on the total. | Diagram: "Accumulate Total Interest" after each written transaction. |
| E1 | Every account that has at least one category balance, including accounts whose interest is 0 because every rate was 0 or missing, is updated: `curr_bal += total interest`, `curr_cyc_credit = 0`, `curr_cyc_debit = 0`. All other fields are unchanged. | Purpose: "updates the account balance, resetting cycle credit/debit totals". The diagram's "Account done? → Update Account" sits outside the rate branch. |
| E2 | The **last** account in the file is also updated. | The diagram ends with "Update Account → End". I did not replicate the common COBOL control-break defect where the last group is not flushed at end of file. |
| E3 | Accounts with no category balance are passed through unchanged. Every account from `ledgacc.dat` appears in `accrue_ledgacc.json`, in input order. | CONTRACT: "account fields for every account, after interest". |
| E4 | A category balance whose account is not in `ledgacc.dat` is skipped: no transaction and no update. It is listed in `runSummary.skippedUnknownAccount`. | The wiki is silent. The legacy job probably abended on an account read failure; I chose to skip and report. |
| E5 | `balcat` balances are not changed by ACCRUE, and no balcat output is produced. | CONTRACT lists no ACCRUE balcat output, and the purpose does not mention changing category balances. |
| E6 | Balance overflow past `S9(10)V99` is not emulated (no high-order truncation). | The wiki is silent. It is unlikely with real data. |

## Interest transaction fields (`accrue_systxn.json`)

| # | Field | Decision | Basis |
|---|-------|----------|-------|
| D1 | `tran_id` | ACCRUE parameter (10 chars, `2022071800`) followed by a 6-digit running sequence starting at `000001`, in processing order (B1). That makes 16 chars, e.g. `2022071800000001`. | The wiki is silent. `PARM='2022071800'` is 10 chars and `TXN-ID` is `X(16)`, which leaves 6 for a counter. |
| D2 | `type_cd`, `cat_cd` | `"07"`, `12` (int). | Purpose: "posts a batch transaction (type 07, category 12)". |
| D3 | `source` | `"System"`. | The wiki is silent. It is a system-generated batch posting; I chose this literal. |
| D4 | `desc` | `"Int. for a/c "` + account id zero-padded to 11 digits. | The wiki is silent. I chose a description that identifies the account. |
| D5 | `merchant_id` / `merchant_name` / `merchant_city` / `merchant_zip` | `0` / `""` / `""` / `""`. | The wiki is silent. An interest posting has no merchant. |
| D6 | `card_num` | The card linked to the account in `cardlink.dat` (LXV024Y). If several cards are linked, the lowest card number is used; if none, the field is blank. | LXV024Y is in the job's copybooks, and it is the only source for the transaction's `card_num`. The choice among multiple cards follows how an alternate index on the account id would order duplicates (by primary key = card number). |
| D7 | `orig_ts`, `proc_ts` | Both set to the run's timestamp in DB2 format `YYYY-MM-DD-HH.MM.SS.hh0000` (hundredths, then `0000`), taken from the FlowX runtime clock. Input `runTimestamp` can override it for reproducible runs. | The wiki is silent. The value cannot match a historical oracle run either way. The self-test pins it to `2022-07-18-00.00.00.000000` (the business date). |
| D8 | `amt` | Monthly interest (C1/C2) as a string with 2 decimals. | CONTRACT amount format. |

## Output format

| # | Decision | Basis |
|---|----------|-------|
| F1 | Amounts are written as JSON strings with exactly two decimals (`"-1.99"`). Ids and int fields are JSON numbers. String fields have trailing spaces removed. | CONTRACT field types; "Strings may omit trailing spaces". |
| F2 | The business date `2022-07-18` is not used in any calculation; only the ACCRUE parameter is used (D1). | The wiki gives no use for the business date in ACCRUE. |
| F3 | No `flags.json` is produced (PROTOCOL.md was not provided). The uncertainties are listed here instead. C2 corresponds to CONTRACT's `R-INT-TRUNC` example. | CONTRACT: `flags.json` is optional. |
