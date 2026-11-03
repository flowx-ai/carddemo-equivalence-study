# ACCRUE (P-15 interest-calculation): build assumptions

FlowX implementation: workflow `accrue_interest_calculation` in project `ll_a17_accrue_zflx_detailed_r2`
(dev-env; resourceId `<uuid>`, resourceDefinitionId
`<uuid>`). Nodes: Start → Parse input files → Compute interest →
Build contract outputs → End. See `RUN.md` for how to run it.

Each entry: what was decided, and the wiki statement (or gap) it rests on.

## Architecture

**A1. File-in / file-out workflow, not the datastore + process design.**
The workflow takes the raw contents of the fixed-width input files as INPUT and returns the two ACCRUE outputs from its End node. The wiki models P-15 as a process with SEND/RECEIVE calls to `reference-data-access` (W-05), `account-data-access` (W-01) and `transaction-data-access` (W-04) on the `ledgerline-datastore` NOSQL_DB (process page, *Integration* and *Data Mapping*; project data model, *DECISION: keep one NOSQL_DB System*). CONTRACT.md fixes file inputs and JSON file outputs per run. So the data-access operations are done in memory inside the workflow:
- GET_DISCLOSURE_GROUP with the STANDARD fallback;
- LIST_CATEGORY_BALANCES;
- the account read and rewrite;
- the transaction write.

The process shell and the end-of-day-chain Call Activity are not built.

**A2. Configuration-dependent switches are not evaluated.**
`RuntimeSwitches.batchWindowOpen` is listed as a configuration dependency (acceptance criteria). The wiki defines no interest-calculation behaviour that depends on it; it blocks *online* processes (end-of-day-chain DECISION). So it is not checked.

**A3. `interestRunDate` is an optional workflow input that defaults to `2022071800`.**
The process page says: "Configuration Parameter default; override at start", and the legacy PARM is `2022071800`. No FlowX Configuration Parameter was created. The default sits in the Compute script, and the caller can override it. `businessDate` is likewise optional, defaulting to `2022-07-18` (the contract run parameter).

## Reading the inputs

**A4. Field layouts.**
Offsets come from the attribute order and PICs in the data-model page:
- DT-01 Account (LXV022Y, 300): id 9(11), status X(1), 3×S9(10)V99, 3 dates X(10), 2×S9(10)V99, zip X(10), group X(10), FILLER.
- DT-06 TransactionCategoryBalance (LXV026Y, 50): acct 9(11), type X(2), cat 9(4), balance S9(9)V99.
- DT-07 DisclosureGroup (LXV027Y, 50): group X(10), type X(2), cat 9(4), rate S9(4)V99.
- DT-04 CardXref (LXV024Y, 50): card X(16), customer 9(9), account 9(11).

The field order is assumed to be the order the wiki lists. FILLER is ignored. Lines shorter than the record length are space-padded, because trailing blanks may have been stripped. Blank lines are skipped.

**A5. Signed numbers are ASCII zoned decimal with a trailing overpunched sign.**
The overpunch characters are `{`, `A`–`I` for positive 0–9 and `}`, `J`–`R` for negative 0–9. Plain digits and an explicit `+`/`-` are also accepted.
- Basis: DT-07 "seed file stores signed overpunch (`0150{` = 15.00)", and the acceptance criteria "rate is a signed decimal, e.g. `0150{` = 15.00".
- The wiki example has 5 characters, but S9(4)V99 is 6. The full 6-character field is read, so `00150{` = 15.00.

**A6. Inputs not used.**
These files are not read: `daytxn.dat`, `clntrec.dat`, `crdrec.dat`, `txntype.dat`, `txncatg.dat`. Nothing in the P-15 rules uses them. Per "Step isolation" in CONTRACT.md, `ledgacc.dat` and `balcat.dat` are taken to be the post-POSTDAY files.

## Interest rules

**A7. Rate lookup key and fallback.**
The lookup key is `account.groupId` (10 characters, space-padded) + `typeCode` + `categoryCode` (BR-01). When that exact key is missing, the same type and category are looked up under group `STANDARD` (BR-02, "file status 23" = record not found).
- The fallback is per key, not per group: a group that has some rows but not this type/category also falls back.
- If `STANDARD` has no row either, the wiki is silent (legacy would most likely abend). The rate is taken as 0, so no interest, and the key is listed in `runSummary.categoriesWithoutAnyRate`.

**A8. Formula and rounding: truncation toward zero to the cent.**
`monthlyInterest = trunc(categoryBalance × rate / 1200)`, computed exactly in integer cents.
- Basis: BR-03, plus BR-08 "Rounding follows COBOL COMPUTE default truncation". That rule carries an open *TODO: confirm rounding mode (truncate vs ROUNDED)*, and the acceptance criteria only say "verify interest rounding to two decimals".
- The rule is applied as written to negative balances too, which gives a negative interest transaction (truncated toward zero). The wiki does not exclude them.

**A9. Zero rate means no transaction.**
"If rate ≠ 0" (BR-03), BR-10 for payment and credit categories, and acceptance scenario 5 for ZEROAPR. A non-zero rate that yields 0.00 interest (a tiny balance) still writes a 0.00 transaction, because the legacy condition is on the rate, not on the amount.

**A10. Processing order and "change of account".**
Category balances are processed in ascending key order (account + type + category), as a sequential VSAM KSDS read would deliver them. "Change of account" (BR-06) is a change between consecutive records in that order. The transaction-id suffix is assigned in this order. The wiki never states the order explicitly.

**A11. Account update.**
At each change of account, and after the last record:
- `currentBalance += totalInterest`;
- `currentCycleCredit = 0`;
- `currentCycleDebit = 0`.

This applies to every account that has at least one category balance, even when its total interest is 0 (ZEROAPR, or only payment/credit categories). BR-06 says "at each change of account", with no condition on interest, and acceptance scenario 3 agrees. Accounts without any category balance are left unchanged. Every account still appears in `accrue_ledgacc` ("account fields for every account, after interest"), in `ledgacc.dat` order.

**A12. No eligibility filters.**
Inactive or expired accounts are not skipped. Neither BR-01..BR-10 nor the acceptance criteria mention any such filter.

**A13. Category balances for an account not in `ledgacc.dat`.**
They are skipped: no transaction and no update. They are listed in `runSummary.balancesForUnknownAccounts`. The wiki is silent.

**A14. Fees.**
No fee transactions are created. Basis: BR-07 (empty stub, F-12), and acceptance scenario 7, where *DECISION: implement fees in FlowX or keep stub* is unresolved, so the stub is kept.

## Interest transaction record

**A15. Transaction id.**
`interestRunDate` (10 characters) + a 6-digit zero-padded running suffix starting at `000001` for each run, for example `2022071800000001`.
- Basis: BR-05 "run date prefix + running suffix", acceptance scenario 6, and DT-05 `transactionId` String(16), which forces 10 + 6.
- DT-05 also says "FlowX: sequence generator". BR-05 and scenario 6 are specific to this step, so they win here.

**A16. Fixed fields (BR-04).**
- `type_cd` `07`.
- `cat_cd` 12 (category stored as `0012` in the 9(4) field).
- `source` `Batch`.
- `desc` = `Accrued int ` + the account id as the 11-digit zero-padded string, for example `Accrued int 00000000001`. BR-04 writes `<accountId>`, and DT-01 types accountId as String(11) numeric. The exact spacing and padding are not given beyond that example.

**A17. Card number.**
The card number comes from `cardlink.dat` for the transaction's account; when an account has several cards, the lowest card number is used.
- The wiki never says the interest transaction carries a card number. DT-05 makes `cardNumber` required, and W-01 lists `LXB002C` among the CARDLINK alternate-index readers.
- An account with no cross-reference gets an empty card number (wiki silent).

**A18. Merchant fields.**
`merchant_id` 0; `merchant_name`, `merchant_city` and `merchant_zip` empty. The wiki is silent for system-generated transactions.

**A19. Timestamps.**
`orig_ts` = `proc_ts` = business date at midnight in DB2 format, `2022-07-18-00.00.00.000000` (26 characters, DT-05 X(26)). The wiki is silent. The legacy program would stamp the wall clock; a deterministic value was chosen instead.

**A20. Contents of `accrue_systxn`.**
It holds only the interest transactions written by this run. BR-09 says legacy overwrites and FlowX appends; this choice is the same under both readings for one run's output.

## Output format

**A21. Output values.**
- Amounts are strings with exactly two decimals (`"15.00"`, `"-1.85"`).
- `acct_id`, `cat_cd` and `merchant_id` are integers.
- Other strings have trailing spaces removed.
- Dates are passed through exactly as stored.

This follows CONTRACT.md. The End node also returns `runSummary` (counts and anomalies), which is not a contract output.
