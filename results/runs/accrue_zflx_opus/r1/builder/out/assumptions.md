# ACCRUE (interest calculation): assumptions and decisions

These are the decisions I had to make where the wiki pages (`process-interest-calculation.md`,
`acceptance-criteria-interest-calculation.md`, `project-data-model.md`) and `CONTRACT.md`
are uncertain, incomplete or silent. Each entry gives what I assumed, the wiki statement (or
absence of one) it rests on, and where it lives in the implementation.

**Overall basis.** The wiki leaves the formula, rounding and grouping as an open TODO, and the
acceptance criteria require results "identical per account" to legacy `LXB002C`. The record
layouts on the data-model page (field order, PICs, the `LACC-EXPIRY-DATE` "legacy typo",
300/50/50-byte records) match the AWS CardDemo copybooks field for field (CVACT01Y, CVTRA01Y,
CVACT03Y, CVTRA02Y). So where the wiki is silent, I followed the behaviour of CardDemo's interest
program CBACT04C, the presumed ancestor of `LXB002C`. That is an inference, not something the wiki
states, and it is why most entries below carry a flag.

Implementation: FlowX workflow `accrue_interest` (project `ll_accrue_zflx_opus_r1`), nodes
Load Accounts → Compute Interest → Post Interest and Save Accounts → End. The node scripts are
mirrored in `../flowx/`, and `../run_accrue.js` runs them offline.

---

## Interest rule

**A-01: Interest is computed per category balance, not on the account's `currentBalance`.**
Assumed: for every `TransactionCategoryBalance` record of an account, interest is computed from
that record's `balance`. The account's interest is the sum over its category balances.
Rests on: the Rule ComputeInterest says `interest = currentBalance × interestRate(groupId)`, but
the same rule carries `{{TODO: Extract exact formula, rounding, and grouping from LXB002C + RATEGRP.}}`.
The process lists `TransactionCategoryBalance` as Related Data, and the data model says
TransactionCategoryBalance is "Used by: … Interest Calculation". The rule says interest is "posted
to balance and category balance". The account `currentBalance` is never read for the
computation. (`flowx/02_compute_interest.js:59-76`)

**A-02: The rate is keyed by (group id, transaction type, category), not by group alone.**
Assumed: `rate = RATEGRP[account.groupId, balance.typeCd, balance.catCd]`.
Rests on: the wiki writes only `rate(group)` / "Interest rate per account group". It gives no
RATEGRP record layout. The 50-byte `rategrp.dat` record (CONTRACT.md) has room for the
CardDemo disclosure-group key (group + type + category). (`flowx/02_compute_interest.js:65`)

**A-03: Fall back to group `DEFAULT` when the account's group has no rate for that type/category.**
Rests on: no wiki statement. Acceptance scenario 4 ("Multiple disclosure groups, correct rate per
group") does not say what happens to an account whose group (or blank `groupId`, which the data
model makes optional, "Required: No") is missing from RATEGRP. If DEFAULT has no row either, no
interest is computed and a warning is recorded (legacy would most likely abend).
(`flowx/02_compute_interest.js:67-71`)

**A-04: The rate is an annual percentage with 2 decimals, so the per-run interest is `balance × rate / 1200`.**
Rests on: the wiki's `interest = balance × rate(group)`, taken literally with a rate such as
`15.00`, would charge 15 times the balance. The 1/1200 (monthly share of an annual percentage) is
not in the wiki. It comes from the presumed legacy (CBACT04C). (`flowx/02_compute_interest.js:52`)

**A-05: Rounding is truncation toward zero, to cents, per category balance (flag R-INT-TRUNC).**
Rests on: acceptance scenario 2, "Rounding matches legacy `{{TODO: confirm rounding mode}}`". The
wiki does not say. I assumed a COBOL `COMPUTE` without `ROUNDED` into a `V99` field, so 6.9444
becomes 6.94 and −0.005 becomes 0.00. The truncation is applied to each category's interest
before summing, not to the account total. (`flowx/02_compute_interest.js:75`)

**A-06: A zero rate produces no interest and no transaction. A zero balance with a non-zero rate produces a 0.00 interest transaction.**
Rests on: acceptance scenario 3, "Account balance 0 → Zero interest". This says the amount is zero
but not whether a transaction is still written. I followed the presumed legacy, which writes one
whenever the rate is non-zero. (`flowx/02_compute_interest.js:72`)

**A-07: Negative balances accrue negative interest.**
Rests on: the wiki has no sign rule. Balances are "decimal(11,2), signed". The formula is applied
as is, with truncation toward zero.

**A-08: Inactive accounts still accrue.**
Rests on: no filter on `activeStatus` is mentioned anywhere in the process or the acceptance
criteria ("Run over accounts").

## Interest transactions (`accrue_systxn.json`)

**A-09: One interest transaction per category balance with a non-zero rate, not one per account.**
Rests on: CONTRACT.md says "transaction fields for every interest transaction written". The wiki
never says how many transactions are written or at what granularity. This follows from A-01 and
the presumed legacy.

**A-10: `tran_id` = ACCRUE parameter (10 chars) + 6-digit sequence starting at 000001 for the run.**
Rests on: CONTRACT.md gives the ACCRUE parameter `2022071800` without stating its use. The wiki
is silent. The sequence follows processing order (A-15). (`flowx/02_compute_interest.js:82`)

**A-11: `type_cd` = `01`, `cat_cd` = 5 (Interest).**
Rests on: no wiki statement. If `txncatg.dat` contains exactly one category whose description
mentions "interest", that category's type and code are used. Otherwise `01`/`0005` is used.
(`flowx/02_compute_interest.js:33-40`)

**A-12: `source` = `System`, `desc` = `Int. for a/c ` + 11-digit zero-padded account id; merchant id 0; merchant name/city/zip blank.**
Rests on: no wiki statement. These values come from the presumed legacy.
(`flowx/02_compute_interest.js:85-91`)

**A-13: `card_num` = the first `cardlink.dat` record for the account, in file order.**
Rests on: no wiki statement. CardXref has an "alternate index on accountId", which suggests a
lookup by account. With several cards per account, I assumed the first record in file order.
With no card, the field is left blank and a warning is recorded. (`flowx/02_compute_interest.js:30`)

**A-14: `orig_ts` = `proc_ts` = business date at midnight, DB2 format `2022-07-18-00.00.00.000000`.**
Rests on: no wiki statement. The legacy most likely stamps the wall-clock time, which cannot be
reproduced. The business date from CONTRACT.md makes the output deterministic.
(`flowx/02_compute_interest.js:51`)

**A-15: Category balances are processed in key order (account id, type code, category code).**
Rests on: no wiki statement. TransactionCategoryBalance has the "Composite key: accountId +
typeCode + categoryCode", and a KSDS is read sequentially in key order. The input is sorted
(ASCII collation) so that the `tran_id` sequence and the per-account grouping do not depend on
the input file's order. (`flowx/02_compute_interest.js:43`)

## Account posting (`accrue_ledgacc.json`)

**A-16: `curr_bal += Σ interest`, and for those accounts `curr_cyc_credit` and `curr_cyc_debit` are reset to 0.00.**
Rests on: Node 5 "Post Interest: Add interest to balance". The wiki says nothing about the cycle
accumulators. The reset comes from the presumed legacy, where interest accrual closes the cycle.
The reset applies to every account that has at least one category balance, even when its total
interest is 0. (`flowx/03_post_interest.js:22-27`)

**A-17: Accounts without any category balance are written out unchanged.**
Rests on: CONTRACT.md says "account fields for every account, after interest". The wiki's loop is
"For each account", but interest only arises from category balances (A-01).

**A-18: Every account that accrues is posted, including the last one in the file.**
Rests on: the process flow ("Save Account → More? → No → End") saves each account inside the
loop. I deliberately did not reproduce a possible legacy end-of-file quirk in which the final
account's update is skipped. If the oracle shows that quirk, this is where the outputs will
differ.

**A-19: Category balances are not updated with interest.**
Rests on: the rule says interest is "posted to balance and category balance". However,
CONTRACT.md defines no ACCRUE category-balance output, and the presumed legacy does not
rewrite TCATBAL in this step. Nothing is posted to category balances.

**A-20: No fees are computed.**
Rests on: the wiki describes interest only.

## Error handling

**A-21: Data problems do not stop the run.** A category balance for an account not in
`ledgacc.dat` is skipped; a missing rate (after DEFAULT) yields no interest; a missing card link
leaves `card_num` blank. Each case is recorded in `accrue_warnings.json`. Unparseable numbers
are taken as 0, also with a warning.
Rests on: the wiki has no error-handling section for this process.

**A-22: Duplicate keys (account, rate, card link): the first record wins.**
Rests on: the wiki gives unique keys for these types, so duplicates should not occur.

## Input layouts and formats

**A-23: Record layouts.** Offsets are 0-based (start, length). Trailing FILLER is ignored, and
short lines are padded with spaces.
- `ledgacc.dat` (LXV022Y): id 9(11) @0; status X(1) @11; curr_bal S9(10)V99 @12; credit_limit @24;
  cash_credit_limit @36; open_date X(10) @48; expiration_date @58; reissue_date @68;
  curr_cyc_credit S9(10)V99 @78; curr_cyc_debit @90; addr_zip X(10) @102; group_id X(10) @112.
  Taken from the Account attribute order and PICs on the data-model page.
- `balcat.dat` (LXV026Y): acct 9(11) @0; type X(2) @11; cat 9(4) @13; bal S9(9)V99 @17. Taken from
  the TransactionCategoryBalance attribute order and PICs.
- `rategrp.dat` (LXV027Y): group X(10) @0; type X(2) @10; cat 9(4) @12; rate S9(4)V99 @16.
  **This layout is not in the wiki at all.** It is assumed (CardDemo DISCGRP).
- `cardlink.dat` (LXV024Y): card X(16) @0; customer 9(9) @16; account 9(11) @25. Taken from CardXref.
- `txncatg.dat` (LXV029Y): type X(2) @0; cat 9(4) @2; description X(50) @6. Assumed; used only by A-11.
- Not read: `daytxn.dat`, `clntrec.dat`, `crdrec.dat`, `txntype.dat`. The wiki process does not use them.

**A-24: Signed numbers are zoned decimal with the sign overpunched on the last digit (ASCII: `{`/`A`-`I` positive, `}`/`J`-`R` negative). Plain digits are read as positive.**
Rests on: the data model gives `S9(10)V99` / `S9(9)V99` without a SIGN clause, and CONTRACT.md
says the files are fixed-width "layouts as in the copybooks". As a safety net, a field with an
explicit `+`/`-`/`.` is also accepted. (`flowx/01_load_accounts.js:24-58`)

**A-25: Step isolation.** `ledgacc.dat` / `balcat.dat` are the oracle's POSTDAY outputs, in the
same fixed-width layout. The runner also accepts `postday_ledgacc.txt` / `postday_balcat.txt`
and, as a last resort, `postday_ledgacc.json` / `postday_balcat.json`, which it rebuilds into
fixed-width records.
Rests on: CONTRACT.md, "receives the oracle's POSTDAY outputs as its account and
category-balance inputs" (the form is not specified).

**A-26: Output formats.** Amounts are written as strings with exactly 2 decimals (`"-13.34"`).
`acct_id`, `cat_cd` and `merchant_id` are integers. Strings are right-trimmed. Accounts are output
in input-file order; transactions in `tran_id` order.
Rests on: CONTRACT.md "Outputs".

## FlowX shape

**A-27: The step is built as one DEFAULT integration workflow that takes the file contents as input, rather than as the scheduled process with Kafka send/receive to "FlowX Persistence" that the wiki sketches.**
Rests on: CONTRACT.md fixes a file-in / JSON-out contract per run, and no persistence store or
paging (`{ page }`) contract exists for this build. The wiki's nodes map one-to-one onto workflow
nodes: Load Accounts → Compute Interest (For each account + ComputeInterest) → Post Interest and
Save Accounts (Post Interest + Save Account / REWRITE LEDGFILE). The scheduled trigger is left to
the caller.
