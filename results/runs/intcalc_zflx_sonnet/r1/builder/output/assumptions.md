# INTCALC (interest-calculation, P-15) — assumptions and decisions

Implementation: FlowX workflow `intcalc_interest_calculation` (project `cd_intcalc_zflx_sonnet_r1`,
resourceDefinitionId `<uuid>`). Each entry gives what was decided and
the wiki statement, or the gap in the wiki, that the decision rests on.

## Architecture

- **A-01 One integration workflow, files in / JSON out, no datastore.** The wiki's target design is a
  batch process (P-15) that calls three data-access workflows (W-01, W-04, W-05) over a `carddemo-datastore`
  NOSQL_DB. CONTRACT.md fixes the step as "read these files, write these JSON outputs" per run, and
  the wiki has no step that loads the files into the store for INTCALC. So the process steps
  (LIST_BALANCES_BY_ACCOUNT → GET_DISCLOSURE_RATE → WRITE_INTEREST_TRANSACTION →
  UPDATE_ACCOUNT_AFTER_INTEREST) run as script nodes of one workflow
  (Parse input files → Compute interest and post → Format contract outputs → End). Every input file
  is passed in as text and the END node returns both outputs.
- **A-02 `interestRunDate` is a start input with default `2022071800`.** The wiki says "Configuration
  Parameter default; override at start". CONTRACT.md gives the INTCALC parameter `2022071800`. The
  default sits in the script rather than in a project Configuration Parameter.
- **A-03 `RuntimeSwitches.batchWindowOpen` is not checked.** The acceptance criteria list it as a
  configuration dependency. The batch-chain page puts it on the orchestrator (P-19), not on this step.

## Calculation

- **A-04 Rounding is truncation toward zero, to cents.** BR-08 leaves it open ("{{TODO: confirm
  rounding mode (truncate vs ROUNDED)}}"), but its main text says "COBOL COMPUTE default truncation".
  The acceptance criteria only say "verify interest rounding to two decimals". Negative results
  truncate toward zero too (−2.0825 → −2.08). The arithmetic is exact integer math on cents.
- **A-05 A transaction is written whenever the rate ≠ 0**, even when the computed interest is 0.00
  (zero balance, or a very small balance). This rests on BR-03 "If rate ≠ 0" and AC-5, where only a
  zero rate means "no interest transaction".
- **A-06 Negative category balances produce negative interest.** The wiki is silent on credit
  balances. The formula in BR-03 is applied unchanged.
- **A-07 The account update happens for every account that has at least one category-balance row.**
  It applies even when total interest is 0 (for example group ZEROAPR, or only payment/credit
  categories): `currentBalance += total`, then cycle credit and cycle debit reset to 0. This rests on
  BR-06 "At each change of account …". The wiki doesn't say to skip accounts with no interest.
  Accounts with no category-balance rows are left unchanged but still written to
  `intcalc_acctdata` ("every account, after interest").
- **A-08 Fees: none.** BR-07 says it's a stub, and AC-7's {{DECISION}} is unresolved, so the stub is
  kept.
- **A-09 Divisor 1200** is a constant in the script, as the configuration table says.

## Rate lookup

- **A-10 Key and match.** The key is account `groupId` (trailing spaces ignored) + `typeCode` +
  `categoryCode` (compared as a number), per BR-01. Matching is exact and case-sensitive.
- **A-11 DEFAULT fallback is per type + category.** BR-02 says "retry with group DEFAULT". If DEFAULT
  has no row for that type/category either, the wiki is silent (legacy CBACT04C abends). Here the
  rate is taken as 0 (no interest) and a warning is returned, so one missing row doesn't fail the
  whole run.
- **A-12 Duplicate `discgrp.dat` keys: the first row wins.** The wiki is silent. The legacy KSDS
  can't hold duplicate keys.

## Interest transaction fields (BR-04 / BR-05)

- **A-13 Transaction id.** It is the 10-character run date (`PARM`, e.g. `2022071800`) followed by a
  6-digit zero-padded counter (`2022071800000001`, 16 chars = `TRAN-ID X(16)`). The counter starts
  at 1, runs across the whole run (it isn't reset per account) and goes up only when a transaction
  is written. The wiki only says "run date prefix + running suffix" and "FlowX: … + sequence". The
  width, start value and scope come from the legacy layout (`TRAN-ID X(16)`, PARM of 10 chars).
  A platform sequence was not used, because the ids must be reproducible from the run date.
- **A-14 Posting order.** Category balances are processed in ascending key order (account id, type,
  category), as a VSAM KSDS sequential read returns them. This order sets which suffix each
  transaction gets. The wiki is silent.
- **A-15 Fields BR-04 doesn't name.** `type_cd` "01", `cat_cd` 5, `source` "System", `desc`
  "Int. for a/c " + 11-digit zero-padded account id, `amt` = monthly interest. `merchant_id` is 0;
  `merchant_name`, `merchant_city` and `merchant_zip` are empty. The wiki doesn't say what the
  merchant fields hold for a system transaction.
- **A-16 Card number** comes from `cardxref.dat` for the account. When an account has several
  cards, the lowest card number is used; when it has none, the field is blank and a warning is
  returned. The wiki is silent. The legacy program reads the cross-reference by its account
  alternate index.
- **A-17 Timestamps.** `orig_ts` = `proc_ts` = the runtime clock when the transaction is created, in
  DB2 format `YYYY-MM-DD-HH.MM.SS.hh0000`. The wiki is silent. The format follows `TRAN-ORIG-TS X(26)`.
  So these two fields differ from run to run and can't match an oracle exactly.
- **A-18 Output scope (BR-09).** `intcalc_systran` holds only the transactions this run wrote, so
  "append vs overwrite" (finding F-07) doesn't affect the file.

## Inputs and edge cases

- **A-19 Balance rows for an account missing from `acctdata.dat` are skipped** (no transaction) and
  a warning is returned. The wiki is silent.
- **A-20 Input decoding.** Signed amount fields (`S9(n)V99`) are zoned decimal with a trailing
  overpunch: `{`/`A`–`I` positive, `}`/`J`–`R` negative, and also ASCII `p`–`y` negative. Plain
  digits are positive; text with a decimal point or sign is read as a decimal. The `discgrp.dat` rate
  is the 6-character `DIS-INT-RATE S9(4)V99`. The wiki's example `0150{` shows only 5 characters,
  and its stated value of 15.00 is taken to mean `00150{`.
- **A-21 Step isolation.** The account and category-balance inputs are read from `acctdata.dat` /
  `tcatbal.dat` (fixed width). If those are absent, the oracle's `posttran_acctdata.json` /
  `posttran_tcatbal.json` (contract field names) are used instead. CONTRACT.md doesn't say which
  form the oracle's POSTTRAN outputs arrive in.
- **A-22 Output format.** Amounts are exact 2-decimal JSON strings (`"15.00"`, `"-52.28"`); trailing
  spaces are dropped from strings. Accounts are listed in account-id order and transactions in
  posting order. The contract allows any order.
- **A-23 No overflow handling.** `curr_bal` (S9(10)V99) and `amt` (S9(9)V99) aren't checked for
  overflow. The wiki doesn't describe size errors.
