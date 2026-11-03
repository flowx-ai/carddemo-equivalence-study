# ACCRUE (interest-calculation, P-15): assumptions

Each entry records a decision the wiki did not settle, the wiki statement (or gap) it rests on,
and where it lives in the implementation. Wiki page short names:
**P-15** = `02-processes/process-interest-calculation.md`, **AC** = `10-acceptance-criteria/acceptance-criteria-interest-calculation.md`,
**DM** = `01-data-model/project-data-model.md`, **W-01/W-04/W-05** = the account / transaction / reference data-access workflow pages,
**P-19** = `02-processes/process-end-of-day-batch-chain.md`, **CONTRACT** = `CONTRACT.md`.

Implementation: FlowX workflow `accrue_interest_calculation` (project `ll_accrue_zflx_sonnet_r2`), three SCRIPT nodes.
Their source is copied in `../flowx/workflow-accrue_interest_calculation/`.

## Architecture and inputs

**A-01. One integration workflow replaces the P-15 process and its three data-access workflows.**
P-15 describes a BPMN process that calls W-05 (`GET_DISCLOSURE_RATE`), W-04 (`WRITE_INTEREST_TRANSACTION`) and W-01 (`UPDATE_ACCOUNT_AFTER_INTEREST`) on the `ledgerline-datastore` NOSQL_DB (DM: "All legacy VSAM / IMS / DB2 stores are replaced by FlowX Persistence").
CONTRACT instead gives files per run and expects JSON lists back, and says nothing about a datastore. So the build is a single DEFAULT workflow:
- it takes the file contents as input;
- each data-access call becomes an in-memory step: the rate lookup (W-05), the transaction write (W-04) and the account rewrite (W-01);
- it returns the two output lists.

The business rules are unchanged. What is not built is the persistence, the datastore collections and the message-event plumbing.

**A-02. Only `ledgacc`, `balcat`, `rategrp` and `cardlink` are read.**
P-15 BR-01..BR-10 use only Account, TransactionCategoryBalance and DisclosureGroup.
`cardlink` is used only to fill the transaction's card number (see A-18). W-01 lists `LXB002C` among the legacy readers of the `CARDLINK` alternate index, and DM DT-05 makes `cardNumber` a required Transaction field.
`daytxn`, `clntrec`, `crdrec`, `txntype` and `txncatg` are not used by this step. Nothing in P-15 or AC refers to them.

**A-03. Account and category-balance inputs may be fixed-width or JSON.**
CONTRACT ("Step isolation") says ACCRUE receives "the oracle's POSTDAY outputs" as its account and category-balance inputs, but not in which form: the `.dat` / `.txt` fixed-width dump, or `postday_ledgacc.json` / `postday_balcat.json`.
The parse step therefore accepts either. Text starting with `[` is read as a JSON list in the CONTRACT field names. Anything else is read as fixed-width records.

**A-04. Record layouts are derived from DM, because the copybooks were not supplied.**
Offsets come from the attribute PIC sizes in DM DT-01, DT-04, DT-06 and DT-07. Each layout adds up to the stated record size:

| Record | Layout | Size |
|---|---|---|
| Account | 11+1+12+12+12+10+10+10+12+12+10+10 + FILLER 178 | 300 |
| Category balance | 11+2+4+11 + filler 22 | 50 |
| Disclosure group | 10+2+4+6 + filler 28 | 50 |
| Card xref | 16+9+11 + filler 14 | 50 |

Signed `S9(n)V99` fields are read as zoned decimal with the sign overpunched on the last byte: `{`/`A`–`I` positive, `}`/`J`–`R` negative.
This rests on DM DT-07 ("seed file stores signed overpunch (`0150{` = 15.00)") and AC "Data Mapping Verification".
A field holding an explicit sign or decimal point is accepted too.

**A-05. `interestRunDate` is a workflow input, default `2022071800`.**
P-15 makes it a Configuration Parameter with an override at start. CONTRACT gives the ACCRUE parameter `2022071800` per run.
No configuration parameter was created. The run value is passed in, and the script falls back to `2022071800` when it is absent.

## Calculation

**A-06. Interest is truncated to 2 decimals, toward zero.** (flagged)
BR-08 says "Rounding follows COBOL COMPUTE default truncation; {{TODO: confirm rounding mode (truncate vs ROUNDED) — golden-file test required}}". AC asks to "verify interest rounding to two decimals".
I followed the stated default: no ROUNDED, so truncate. The arithmetic is exact (integer cents × rate hundredths ÷ 120000, using BigInt), with no intermediate rounding.
Example: 100.00 at 17.00 % gives 1.41, where rounding would give 1.42.

**A-07. One interest amount and one transaction per category balance whose rate is non-zero, even when the balance is 0.** (flagged)
BR-03 "If rate ≠ 0: monthlyInterest = …" carries no condition on the balance. AC #2 says "created per category balance".
So a zero balance with a non-zero rate produces a `0.00` transaction.
Interest is per balance row, summed per account for BR-06. It is not computed on the account total.

**A-08. Negative category balances produce negative interest.**
The wiki is silent. The BR-03 formula is applied as written, with no floor at zero.

**A-09. Zero-rate categories are decided by the data, not hard-coded.**
BR-10 says payment (02) and credit (03) categories "have rate 0 in `rategrp.txt`, hence no interest". So the code relies on the rate table rather than excluding type 02/03.

**A-10. Rate lookup is an exact match on group + type + category, with the STANDARD fallback.**
This follows BR-01 and BR-02, W-05, and AC #4.
The account `groupId` is compared after trimming trailing spaces. The keys are `X(10)` padded, so this is equivalent to the padded compare. A blank group never matches and falls back to `STANDARD`.

**A-11. If the STANDARD row is missing too, the rate is 0 and a warning is raised.**
BR-02 and W-05 cover only the first miss. What the legacy job does when the fallback also misses (stop or continue) is not documented.
I chose to continue: no interest for that category, and a warning in `runSummary.warnings`.

**A-12. Duplicate rate keys: the first row wins.**
DM DT-07 declares a composite key, so duplicates should not occur. The wiki is silent on what happens if they do.

## Account update

**A-13. Every account with at least one category-balance row is updated, even when its interest is 0.** (flagged)
BR-06: "At each change of account: account.currentBalance += totalInterest; currentCycleCredit = 0; currentCycleDebit = 0; rewrite account". AC #3: "cycle credit/debit reset".
The control break is driven by the category-balance read, not by interest > 0. So a ZEROAPR account that has balances still gets its cycle totals reset.
Accounts with no category-balance rows never reach the break and are output unchanged.

**A-14. A category balance with no matching account is skipped, with a warning.**
The wiki is silent: W-01 maps "not found" to `found = false` for online processes only.
The batch keeps going rather than failing the whole run. The row produces no transaction and no account update.

**A-15. Balances are processed in key order: accountId + typeCode + categoryCode.**
DM DT-06 gives that composite key, and P-15 reads balances "grouped per account".
The rows are sorted before processing, which fixes both the control-break grouping and the order of transaction id suffixes.
`accrue_ledgacc` keeps the account file's order. CONTRACT says list order does not matter.

**A-16. Fixed-width input lines are not length-checked.**
Short or right-trimmed lines are tolerated: a missing trailing field reads as blank or zero. Blank lines are ignored. Duplicate account ids are output as they appear, and the last one wins for the interest lookup.
The wiki is silent.

## Transaction fields

**A-17. `tran_id` = interestRunDate + a 6-digit zero-padded running suffix starting at `000001`, cut to 16 characters.**
BR-05 says "run date prefix (`PARM`, e.g. 2022071800) + running suffix". DM DT-05 makes `transactionId` `String(16)`. AC #6 says "built from run date plus suffix".
10 + 6 = 16 fixes the suffix width. The starting value (1) and the one-suffix-per-written-transaction counter, shared across all accounts, are my choice.

**A-18. `card_num` is the first `cardlink` record for the account, in file order.**
BR-04 lists no card number for the interest transaction, but DT-05 requires one, and W-01 lists `LXB002C` as a reader of `CARDLINK`.
With several cards per account, the first in file order wins, i.e. card-number (primary-key) order.
With no xref, the card number is blank and a warning is raised.

**A-19. `desc` = `"Accrued int "` + the account id as 11 digits, zero-padded.**
BR-04: "description `Accrued int <accountId>`". DT-01 defines `accountId` as `String(11) numeric`.

**A-20. `type_cd` = `"07"`, `cat_cd` = `12`, `source` = `"Batch"`.**
These come from BR-04. CONTRACT types `cat_cd` as int, so it is output as `12`. `type_cd` stays the string `"07"`.

**A-21. `merchant_id` = 0; `merchant_name`, `merchant_city` and `merchant_zip` are empty.**
BR-04 is silent on merchant fields. DT-05 marks them required, and a system-generated transaction has no merchant.

**A-22. `orig_ts` = `proc_ts` = one timestamp for the whole run, format `YYYY-MM-DD-HH.MM.SS.ffffff` (26 characters).** (flagged)
The wiki is silent on both value and format. DT-05 gives `X(26)`, which matches the DB2 timestamp layout.
The optional workflow input `runTimestamp` sets it. When absent, the current UTC time is used.
The sample outputs in this folder used `2022-07-18-23.00.00.000000` (the business date at the P-19 23:00 TIMETO), so they are reproducible.

**A-23. The output contains only the transactions this run wrote.**
BR-09 contrasts legacy OUTPUT (overwrite) with FlowX append. That concerns the transaction store, and the CONTRACT output is "every interest transaction written". So `accrue_systxn` holds this run's transactions only.

## Scope

**A-24. No fees are charged.**
BR-07 calls fees an empty stub. AC #7 expects "No fee created" but leaves "{{DECISION: implement fees in FlowX or keep stub}}" open. I kept the stub.

**A-25. `batchWindowOpen` / `RuntimeSwitches` are not checked.**
AC lists `RuntimeSwitches.batchWindowOpen` as a configuration dependency. P-19 makes opening and closing the window the job of the end-of-day chain, not of this step.

**A-26. Output formatting.**
Amounts are strings with exactly 2 decimals (e.g. `"-0.63"`), as CONTRACT allows. `acct_id`, `cat_cd` and `merchant_id` are ints. Strings carry no trailing spaces.
Unchanged account fields pass through untouched, including the credit limits and dates.

## Verification status

- Ran the workflow on the synthetic files in `../testdata/input/`. They cover AC #1, #2, #3, #4, #5 and #6, plus truncation, a negative balance, an account with no balances and an orphan balance row.
  - Every output matched a hand calculation.
  - These are the JSON files in this folder.
- Ran it a second time with JSON-form account and balance inputs (A-03): same result.
- Not run against the real oracle input files: they were not supplied.
- `../tools/accrue_io.py` was not executed: there was no shell in the build session. See `../README.md`.
