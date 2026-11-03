# INTCALC (P-15 interest-calculation) — build decisions

Implementation: FlowX project `cd_a21_ni2_zflx_r3` (dev-env), workflow
`intcalc_interest_calculation` (resourceDefinitionId `<uuid>`):
START → *Parse input files* → *Compute interest per category balance* → *Format contract outputs* → END
(payload `${result}` = `{intcalc_systran, intcalc_acctdata, summary}`).

Each entry: **what was decided** — *wiki basis (or its absence)*.

## Architecture

- **A-01 One stateless workflow instead of a BPMN process + three integration workflows + a NOSQL_DB store.**
  The rate lookup (W-05 GET_DISCLOSURE_GROUP), account read/update (W-01) and transaction write (W-04)
  are done in-memory inside SCRIPT nodes over the input files of the run.
  — *Wiki: process-interest-calculation "Process Flow"/"Data Mapping", project-data-model "{{DECISION: Keep one
  NOSQL_DB System}}". CONTRACT.md fixes the I/O as files per run and requires step isolation, so a persistent
  store would add state that is not part of the contract. Behaviour (rules BR-01..BR-10) is unchanged.*
- **A-02 Inputs are passed as the raw fixed-width file contents** (`acctdata`, `tcatbal`, `discgrp`,
  `cardxref`) plus `interestRunDate`; `tools/make_input.py` builds that body, `tools/split_output.py`
  writes the two JSON files from the END payload. — *CONTRACT.md "Inputs (given per run)"; wiki silent on file ingestion.*
- **A-03 Only acctdata, tcatbal, discgrp and cardxref are read.** dailytran, custdata, carddata, trantype,
  trancatg are not needed by this step. — *Wiki legacy source lists CVTRA01Y, CVTRA02Y, CVACT01Y, CVACT03Y, CVTRA05Y only.*
- **A-04 `interestRunDate` is a start input (default 2022071800 in make_input.py), not a Configuration Parameter.**
  — *Wiki BR-05/Data Mapping: "Configuration Parameter default; override at start"; CONTRACT.md fixes PARM 2022071800.*
- **A-05 `batchId` and `RuntimeSwitches.batchWindowOpen` are not implemented.** — *Wiki mentions them as process start data /
  configuration but defines no behaviour for this step.*

## Reading the files

- **A-06 Field positions follow the copybooks** CVACT01Y (300), CVTRA01Y (50), CVTRA02Y (50), CVACT03Y (50).
  — *CONTRACT.md "layouts as in the copybooks"; project-data-model DT-01, DT-04, DT-06, DT-07 give the field list and
  PIC sizes; the wiki does not give offsets, they are derived from the PIC sizes in order.*
- **A-07 Signed numerics are zoned decimal with an overpunched last byte** (`{`,`A`–`I` = +0..+9; `}`,`J`–`R` = −0..−9;
  ASCII `p`–`y` also read as negative; a plain digit is positive). — *Wiki DT-07 / acceptance criteria: "rate is a signed
  decimal, e.g. 0150{ = 15.00"; the same encoding is assumed for every S9..V99 field.*
- **A-08 Blank lines are ignored; short lines are padded with spaces; blank numeric fields read as 0.** — *Wiki silent.*
- **A-09 Duplicate keys: the first record wins** (account id, disclosure group+type+category). — *Wiki DT-01/DT-07 declare
  them as primary/composite keys, so duplicates should not exist; behaviour for them is not stated.*

## Processing order and grouping

- **A-10 Category balances are processed in ascending key order (accountId, typeCode, categoryCode)**, regardless of the
  input file order, and grouped by account. — *Wiki DT-06 composite key; BR-06 "At each change of account" implies a
  sequential read in key order (legacy KSDS). The order determines the transaction id suffixes.*
- **A-11 An account is updated (BR-06) once, after its last category balance**, even when its total interest is 0
  (cycle credit/debit are still reset). — *Wiki BR-06 "At each change of account …"; acceptance criteria scenario 3.
  The wiki does not exempt zero-interest accounts.*
- **A-12 Accounts with no category balance are written to `intcalc_acctdata` unchanged** (cycle totals not reset).
  — *CONTRACT.md "account fields for every account, after interest"; BR-06 only acts on accounts reached through balances.*
- **A-13 A category balance whose account is not in acctdata is skipped** (no transaction, no update), and reported in
  `summary.warnings`. — *Wiki silent (W-01 error handling only says found = false).*

## Rate lookup

- **A-14 Lookup key = account.groupId + typeCode + categoryCode; group compared with trailing spaces removed,
  category compared numerically.** — *Wiki BR-01.*
- **A-15 Fallback to group `DEFAULT` only when the row is missing**, never when the row exists with rate 0.
  — *Wiki BR-02 "If not found (file status 23)"; scenario 5 (ZEROAPR → no interest).*
- **A-16 If neither the group nor DEFAULT has a row, the rate is treated as 0** (no interest, warning in summary).
  — *Wiki silent; the reference-data-access workflow defines no outcome for a missing DEFAULT row.*

## Effective rate (BR-03)

- **A-17 The 2.00 reduction is applied to the rate actually found, including a DEFAULT fallback rate.**
  — *Wiki BR-03 "the disclosure-group rate"; it does not distinguish the fallback.*
- **A-18 The cutoff is the same calendar date ten years before the PARM date (first 8 characters, YYYYMMDD);
  accounts with `openDate <= cutoff` are reduced** (2022071800 → opened on or before 2012-07-18).
  — *Wiki BR-03 and scenarios 8/9.*
- **A-19 If the run date is 29 February and the year ten years earlier is not a leap year, the cutoff is 28 February.**
  — *Wiki silent.*
- **A-20 An openDate that is not `YYYY-MM-DD` gets no reduction.** — *Wiki silent; DT-01 declares openDate as YYYY-MM-DD.*
- **A-21 The floor of 0.00 applies to the reduced rate only;** a rate that is negative in discgrp and not reduced is
  used as is. — *Wiki BR-03: "reduced by 2.00 … never below 0.00" qualifies the reduction.*
- **A-22 After the reduction, a rate of exactly 0 means no transaction for that balance** (so a 1.00–2.00 rate on a
  long-standing account posts nothing). — *Wiki BR-03 "If the effective rate ≠ 0".*
- **A-23 Note:** the wiki attributes BR-03 to `CBACT04C 1300-COMPUTE-INTEREST`. As far as I know, the public AWS CardDemo
  CBACT04C computes `TRAN-CAT-BAL * DIS-INT-RATE / 1200` with no age-based reduction. I implemented BR-03 because the
  task is to implement what the wiki documents, and acceptance scenarios 8 and 9 require it.

## Interest amount

- **A-24 `monthlyInterest = balance × effectiveRate / 1200`, truncated toward zero to 2 decimals** (no ROUNDED),
  computed exactly in integer hundredths (BigInt). — *Wiki BR-03, BR-08 "follows COBOL COMPUTE default truncation"
  ({{TODO: confirm rounding mode}} left open), scenario 8 (10.8333 → 10.83). Negative balances truncate toward zero
  (−0.18465 → −0.18).*
- **A-25 A transaction is still written when the effective rate ≠ 0 but the computed interest is 0.00**
  (e.g. a zero balance). — *Wiki BR-03/BR-04 condition the transaction on the rate only, not on the amount.*
- **A-26 Account total interest is the sum of the truncated per-category amounts.** — *Wiki BR-06 `+= totalInterest`.*
- **A-27 No fees are charged.** — *Wiki BR-07, scenario 7 (stub; the {{DECISION}} there is left as "keep stub").*

## Interest transaction fields (BR-04/BR-05)

- **A-28 `tran_id` = the 10-character PARM + a 6-digit zero-padded running suffix starting at 000001, incremented per
  transaction across the whole run** (e.g. `2022071800000001`). — *Wiki BR-05 "run date prefix + running suffix";
  the width comes from DT-05 transactionId String(16) minus the 10-character PARM. Start value and scope not stated.*
- **A-29 `type_cd` "01", `cat_cd` 5, `source` "System", `desc` "Int. for a/c " + the 11-digit zero-padded account id.**
  — *Wiki BR-04; the zero padding follows ACCT-ID 9(11).*
- **A-30 `merchant_id` 0, `merchant_name`/`merchant_city`/`merchant_zip` empty.** — *Wiki silent; DT-05 marks them
  required, but a system transaction has no merchant.*
- **A-31 `card_num` = the card cross-referenced to the account (cardxref by account id); if an account has several
  cards, the lowest card number; empty if none (warning).** — *Wiki W-01 GET_ACCOUNT_BY_CARD / DT-04 secondary index
  on accountId; which card to pick is not stated.*
- **A-32 `orig_ts` = `proc_ts` = run timestamp in DB2 format `YYYY-MM-DD-HH.MM.SS.hh0000`** (workflow clock, or
  `runTimestamp` input when given). — *Wiki silent on the transaction timestamps for this step; DT-05 X(26).*
- **A-33 `intcalc_systran` holds only the interest transactions written by this run.** — *Wiki BR-09 (legacy overwrites,
  FlowX appends) concerns the persistent store; CONTRACT.md asks for "every interest transaction written".*

## Output format

- **A-34 Amounts are emitted as strings with exactly two decimals** (`"60.83"`, `"-25.00"`); `acct_id` as int,
  `cat_cd` and `merchant_id` as int; strings with trailing spaces removed. — *CONTRACT.md "Outputs".*
- **A-35 Account fields are passed through unchanged except `curr_bal`, `curr_cyc_credit`, `curr_cyc_debit`.**
  — *Wiki BR-06.*
