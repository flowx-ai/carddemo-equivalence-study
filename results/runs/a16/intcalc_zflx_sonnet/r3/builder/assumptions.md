# INTCALC (P-15 interest-calculation): assumptions and decisions

Implementation: FlowX project `cd_a16_intcalc_zflx_sonnet_r3` (dev-env), workflow **`interest-calculation`**
(resourceId `<uuid>`, resourceDefinitionId `<uuid>`).

`Start → Load input files → Compute interest and update accounts → Format contract outputs → End`

- Input slice: `acctdata`, `tcatbal`, `discgrp` (required), plus `cardxref` and `interestRunDate` (optional). Each file is passed as the raw fixed-width text.
- The END node returns `{ intcalc_systran: [...], intcalc_acctdata: [...], summary }`. Those two arrays are the contents of `intcalc_systran.json` and `intcalc_acctdata.json`.

Each entry below gives the decision first, then the wiki statement it rests on, or the gap it fills.

## Architecture

- **A1. One integration workflow instead of a process with data-access workflows.**
  - The wiki models P-15 as a BPMN process. That process calls `workflow-reference-data-access`, `workflow-account-data-access` and `workflow-transaction-data-access` over the `carddemo-datastore` NOSQL_DB.
  - CONTRACT.md, however, gives the step as files in and JSON out, per run.
  - So the same steps run in sequence inside one workflow:
    - list balances by account (`LIST_BALANCES_BY_ACCOUNT`)
    - look up the rate (`GET_DISCLOSURE_RATE`, with DEFAULT fallback)
    - write the interest transactions (`WRITE_INTEREST_TRANSACTION`)
    - update each account (`UPDATE_ACCOUNT_AFTER_INTEREST`)
  - Nothing is persisted to the datastore. Loading the per-run files into collections and reading them straight back would add nothing to this contract.
- **A2. `interestRunDate` is a workflow input with default `2022071800`.**
  - BR-05 and the Data Mapping say it is a Configuration Parameter that can be overridden at start.
  - The MCP tooling cannot create configuration parameters, so it is an optional start input. The default is the CONTRACT run parameter (`2022071800`).
- **A3. `batchId` and `RuntimeSwitches.batchWindowOpen` are not used.**
  - The wiki lists them as start data and a configuration dependency, but no rule of this step reads them.
  - The batch window belongs to the end-of-day chain (P-19), not to INTCALC.

## Input reading

- **A4. Layouts follow the copybooks named in CONTRACT.md. Amounts are signed zoned decimals.**

  | Copybook | Fields read (character positions) |
  |---|---|
  | CVACT01Y (300) | id 1-11, status 12, curr-bal 13-24, credit-limit 25-36, cash-limit 37-48, open/expiry/reissue dates 49-78, cycle credit 79-90, cycle debit 91-102, zip 103-112, group 113-122 |
  | CVTRA01Y (50) | acct 1-11, type 12-13, cat 14-17, bal 18-28 |
  | CVTRA02Y (50) | group 1-10, type 11-12, cat 13-16, rate 17-22 |
  | CVACT03Y (50) | card 1-16, cust 17-25, acct 26-36 |

  - The trailing overpunch is decoded as `{`/A-I = positive, `}`/J-R = negative. Explicit `+`/`-` signs are also accepted.
  - Basis: DT-07 says the rate "seed file stores signed overpunch (`0150{` = 15.00)". The wiki writes the example as 5 characters, but the field is S9(4)V99, i.e. 6 characters (`00150{`). The decoding is generic, so both forms read as 15.00.
  - Short or blank lines are padded or skipped.
- **A5. Balances are processed in key order (account + type + category), whatever the line order in the file.**
  - The legacy file is a KSDS read sequentially, and BR-06 ("at each change of account") assumes records arrive grouped by account.
  - The order also fixes which transaction gets which id suffix.

## Business rules

- **A6. Rate lookup keys and fallback (BR-01/BR-02).**
  - The lookup key is the account's `groupId` + tcatbal `typeCode` + `categoryCode`. Group ids are compared with trailing spaces removed.
  - If no row matches, the `DEFAULT` group is used for the same type and category.
  - **If DEFAULT is missing too:** the wiki is silent; legacy would abend. Here the rate is treated as 0 (no interest) and an issue is reported in `summary.issues`.
- **A7. Interest is computed only when the rate ≠ 0, even if the balance is 0 (BR-03, AC 2 "created per category balance").**
  - A non-zero rate with a zero balance writes a 0.00 interest transaction.
  - A rate of 0 writes nothing: ZEROAPR (AC 5), and payment/credit categories (BR-10).
- **A8. Rounding follows the wiki: to the nearest cent, halves away from zero (BR-08, AC Data Mapping Verification).** Examples: 15.006 → 15.01 and −15.006 → −15.01.
  - The calculation uses exact integer arithmetic (cents × hundredths / 120000, with BigInt).
  - Uncertain: the wiki attributes this to `COMPUTE ... ROUNDED`. If the legacy statement actually truncates, results differ by 0.01 on some rows. Flagged in `flags.json`.
- **A9. Negative category balances produce negative interest.** BR-08's −15.006 → −15.01 example shows the formula applies to negative balances.
- **A10. Interest transaction fields (BR-04).**

  | Field | Value | Basis |
  |---|---|---|
  | `type_cd` | `01` | BR-04 |
  | `cat_cd` | `5` | BR-04 |
  | `source` | `System` | BR-04 |
  | `desc` | `Int. for a/c ` + the 11-digit zero-padded account id | Format is an assumption: "accountId String(11) numeric" |
  | `amt` | the computed interest | BR-04 |
  | `merchant_id` | `0` | Wiki silent; legacy zero value for a numeric field |
  | `merchant_name`, `merchant_city`, `merchant_zip` | empty | Wiki silent; legacy spaces (contract allows trailing spaces to be omitted) |

- **A11. `card_num` comes from the cardxref record for the account.**
  - The wiki is silent, but DT-05 makes `cardNumber` required, and DT-04 links accounts to cards through CardXref `accountId`.
  - When an account has several cards, the first one in `cardxref.dat` order is used (the file is ordered by card number).
  - If no xref exists, the field is left blank and an issue is logged. Legacy would abend.
- **A12. `orig_ts` = `proc_ts` = the run's current timestamp in DB2 format `YYYY-MM-DD-HH.MM.SS.hh0000` (server clock).**
  - The wiki is silent. The format follows the other legacy timestamps (TRAN-ORIG-TS/TRAN-PROC-TS X(26)).
  - These values cannot match an oracle run byte for byte.
- **A13. Transaction id = the first 10 characters of `interestRunDate` + a 6-digit zero-padded counter (16 characters total).**
  - The counter starts at 000001 and runs across the whole run, not per account. Example: `2022071800000001`.
  - Basis: BR-05 / AC 6 ("run date prefix + running suffix") and TRAN-ID X(16). The suffix width is not stated in the wiki, so it is derived from 16 − 10.
- **A14. Account update (BR-06, AC 3).**
  - Each account that has at least one tcatbal record is updated once, after its last balance: `curr_bal += total interest`, and the cycle credit and cycle debit are set to 0.
  - This happens even when the total interest is 0 (e.g. ZEROAPR), because BR-06 resets on every change of account regardless of the amount.
  - Accounts with no tcatbal records are written unchanged.
- **A15. Balances for an account missing from acctdata are skipped and logged.**
  - The wiki is silent; legacy would abend on an account read failure.
  - CONTRACT step isolation gives consistent POSTTRAN outputs, so this should not occur.
- **A16. No fees are charged (BR-07, AC 7 "keep stub").** The AC 7 `{{DECISION}}` is resolved as "keep stub".
- **A17. Output contents.** BR-09 (legacy overwrites, FlowX appends) has no effect on the JSON contract.
  - `intcalc_systran` holds only the transactions written by this run.
  - `intcalc_acctdata` holds every input account, in input order, after interest.
- **A18. Output formats.**
  - Amounts are strings with exactly 2 decimals (e.g. `"-15.01"`).
  - `acct_id`, `cat_cd` and `merchant_id` are integers.
  - Strings have trailing spaces trimmed. `group_id` is trimmed (e.g. `DEFAULT`).
  - `type_cd` stays a 2-character string.
