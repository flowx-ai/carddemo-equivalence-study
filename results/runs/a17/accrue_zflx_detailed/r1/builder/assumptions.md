# ACCRUE (interest calculation) — build assumptions

Implementation: FlowX project `ll_a17_accrue_zflx_detailed_r1`, integration workflow
`interest-calculation` (resourceId `<uuid>`,
resourceDefinitionId `<uuid>`):
`Start → Parse input files (SCRIPT) → Accrue interest (SCRIPT) → End`.
The End node returns `{accrue_systxn, accrue_ledgacc, summary}`. `tools/make_input.py` builds the
run input from an input directory, and `tools/split_output.py` writes the two CONTRACT output files.

Each entry gives what was decided and the wiki statement it rests on, or the gap it fills.

## Architecture

**A1. One file-in/file-out workflow instead of the P-15 BPMN process with NOSQL integration workflows.**
The wiki models P-15 as a process that does SEND/RECEIVE against `reference-data-access`,
`account-data-access` and `transaction-data-access` over the `ledgerline-datastore` NOSQL_DB
(project-data-model DECISION; P-15 "Data Mapping"). CONTRACT.md defines the step as files in and
JSON files out per run. So the persistence round-trips are replaced by parsing the input files in
the workflow. Each wiki operation is kept as an in-script step:
- `LIST_BALANCES_BY_ACCOUNT`: sorted balances
- `GET_DISCLOSURE_RATE`: the `interestRate` function
- `WRITE_INTEREST_TRANSACTION`: transaction records
- `UPDATE_ACCOUNT_AFTER_INTEREST`: `closeAccount`

The business behaviour (BR-01..BR-10) is unchanged. The datastore, the three data-access workflows
and the BPMN process are not built.

**A2. `interestRunDate` is a workflow input defaulting to `2022071800`.** P-15 lists it as a
Configuration Parameter with an override at start. CONTRACT.md fixes the ACCRUE parameter at
`2022071800`. The default sits in the script; a run can override it. `businessDate` is accepted but
not used, because no BR depends on it.

**A3. `RuntimeSwitches.batchWindowOpen` is not checked.** It appears only as a configuration
dependency (acceptance criteria; end-of-day chain DECISION). It is the chain's concern, and no ACCRUE
behaviour is defined for it.

## Input reading

**A4. Record layouts come from the PIC sizes in the data-model page.** CONTRACT.md says "layouts as
in the copybooks", but the copybooks are not included. Offsets used (0-based, end exclusive):
- LXV022Y account: id 0–11, status 11–12, curr_bal 12–24, credit_limit 24–36, cash_credit_limit 36–48,
  open 48–58, expiry 58–68, reissue 68–78, cyc_credit 78–90, cyc_debit 90–102, zip 102–112,
  group 112–122. This adds up to 122 bytes, and with the 178-byte FILLER the wiki mentions, to 300.
- LXV026Y balance: acct 0–11, type 11–13, cat 13–17, bal 17–28.
- LXV027Y rate: group 0–10, type 10–12, cat 12–16, rate 16–22.
- LXV024Y xref: card 0–16, customer 16–25, acct 25–36.

Short lines are treated as space-padded.

**A5. Every signed field (S9…V99) is zoned decimal with a trailing overpunch sign.** The wiki shows
this only for the rate (`0150{` = 15.00, DT-07 and acceptance criteria). It is applied to all signed
fields:
- `{` / `A`–`I` positive, `}` / `J`–`R` negative.
- ASCII `p`–`y` is also accepted as negative.
- A plain final digit means positive.

The example `0150{` is 5 characters, but the field is S9(4)V99 (6). Decimals are implied by the PIC,
so `00150{` = 15.00.

**A6. Account and balance inputs may be the oracle's POSTDAY outputs.** Per CONTRACT.md "Step
isolation", these arrive as `postday_*.json` (contract field names) or as fixed-width dumps. The
workflow accepts a JSON array or copybook-layout records for these two inputs.
`tools/make_input.py` prefers the `postday_*` files over `ledgacc.dat` / `balcat.dat` when both are
present. A `.txt` dump is assumed to use the copybook layout.

**A7. Inputs not read:** `daytxn.dat`, `clntrec.dat`, `crdrec.dat`, `txntype.dat`, `txncatg.dat`.
No P-15 rule uses them.

## Calculation

**A8. Rounding is truncation toward zero to 2 decimals.** BR-08 has "{{TODO: confirm rounding mode
(truncate vs ROUNDED)}}", and the acceptance criteria say "verify interest rounding to two decimals".
I followed the BR-08 statement: COBOL `COMPUTE` without `ROUNDED`.
- The calculation is exact integer arithmetic: `cents = trunc(balanceCents × rateHundredths / 120000)`.
- A negative balance gives a negative interest, truncated toward zero.
- The account total is the sum of the truncated per-category amounts.

**A9. Interest is written when the rate is ≠ 0, even if the amount is 0.00.** BR-03 conditions on
the rate only ("If rate ≠ 0"), and BR-04 posts the computed interest.

**A10. Balances are processed in key order (accountId, typeCode, categoryCode).** The legacy reads
the BALCATF KSDS sequentially, and P-15 groups balances per account. The input is sorted before
processing. This order decides the transaction-id suffixes.

**A11. Rate lookup (BR-01/BR-02).**
- The key is account `groupId` (trimmed) + balance `typeCode` + `categoryCode` (numeric).
- If that key is missing, `STANDARD` + the same type and category is used.
- If the `STANDARD` row is also missing, the rate is 0 and no interest is posted. The wiki is silent
  on this; the legacy would probably abend.
- A ZEROAPR row with rate 0 means no interest (acceptance criterion 5). A ZEROAPR group without a
  row for that type/category falls back to STANDARD, as BR-02 says.

**A12. The last account is updated at end of file.** BR-06 says "At each change of account". The
wiki does not say what happens to the final account. I treat end of file as the last change of
account, so every account that has balances gets its interest added and its cycle totals reset.
(Flagged: a legacy loop could skip this final rewrite.)

**A13. Every account with category balances gets the BR-06 update, even when its total interest is
0.** That covers ZEROAPR accounts and accounts with only payment/credit balances: `currentBalance +=
0` and both cycle totals are reset to 0. BR-06 applies at every change of account, with no
interest condition. Accounts with no category balance are left unchanged.

**A14. A balance whose account is not in the account file is skipped:** no transaction, no update.
The wiki is silent here; the legacy would abend on the failed read.

**A15. No fees are charged.** This follows BR-07 (empty stub) and acceptance criterion 7
("{{DECISION: implement fees in FlowX or keep stub}}"). I kept the stub, which matches the legacy
column "Same".

## Interest transaction fields (BR-04 / BR-05)

**A16. `tran_id` = PARM + 6-digit zero-padded running suffix, starting at `000001` per run.**
Example: `2022071800000001`. BR-05 says "run date prefix + running suffix" but gives no width and no
start. The width follows from TXN-ID X(16) minus the 10-character PARM.

**A17. `desc` = `Accrued int ` + account id zero-padded to 11 digits.** Example:
`Accrued int 00000000001`. BR-04 gives `Accrued int <accountId>`, and the account id is 9(11).

**A18. Fixed transaction values:** `type_cd` = `"07"`, `cat_cd` = 12, `source` = `Batch`
(from BR-04), and `amt` = the interest for one category balance.

**A19. `card_num` comes from the card xref (cardlink) for the account.** BR-04 does not name a card,
but a Transaction requires `cardNumber` (DT-05), and CardXref has a secondary index on `accountId`
(DT-04). If an account has several cards, the first record in file order is used. If it has none,
`card_num` is empty (the legacy would probably abend).

**A20. Merchant fields: `merchant_id` = 0; `merchant_name`, `merchant_city` and `merchant_zip` are
empty.** DT-05 marks them required, but BR-04 is silent and a batch interest posting has no
merchant.

**A21. `orig_ts` = `proc_ts` = run wall-clock time (UTC) in DB2 format `YYYY-MM-DD-HH.MM.SS.hh0000`
(26 characters, matching X(26)).** The wiki is silent on timestamps for system-generated
transactions. I used the run time rather than the business date, as a batch posting does.

**A22. `accrue_systxn` holds only this run's interest transactions.** BR-09's overwrite-vs-append
difference concerns the shared transaction file, not this output.

## Output format

**A23. Output formats.**
- Amounts are JSON strings with exactly 2 decimals (`"-1.50"`).
- `acct_id`, `cat_cd` and `merchant_id` are integers.
- Strings are trimmed.
- `accrue_ledgacc` lists every account in the input, in input order, including untouched ones
  ("account fields for every account, after interest").
