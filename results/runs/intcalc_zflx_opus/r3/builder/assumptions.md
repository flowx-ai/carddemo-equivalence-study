# INTCALC (interest calculation) — assumptions and decisions

Implementation: FlowX project `cd_intcalc_zflx_opus_r3`, workflow `intcalc_interest_calculation`
(resourceDefinitionId `<uuid>`):
START → Load Accounts → Compute Interest → Post Interest to Balance → Save Accounts and Transactions → END.

Wiki sources: `02-processes/process-interest-calculation.md` (PROC), `10-acceptance-criteria/acceptance-criteria-interest-calculation.md` (AC),
`01-data-model/project-data-model.md` (DM), `CONTRACT.md` (CT).

The wiki states the formula only in outline. It leaves the formula, rounding and grouping as TODOs
("{{TODO: Extract exact interest formula, rounding, and grouping from CBACT04C + DISCGRP.}}") and asks
that results "match legacy" / be "identical per account" (AC scenario 1, Legacy Comparison). Where the
wiki defers to legacy like this, I filled the gap from my reading of the open-source CardDemo program
CBACT04C, and say so below. Where the wiki explicitly states a behaviour, the wiki wins (see A9).

## Interest computation

**A1 — Interest is computed per transaction-category balance, not on the account's current balance.**
PROC says `interest = currentBalance × interestRate(groupId)`. But PROC also lists
TransactionCategoryBalance as Related Data and says interest is "posted to balance and category
balance". CT also gives INTCALC `tcatbal.dat` (POSTTRAN's category balances) as an input. The
disclosure-group file is keyed by group + transaction type + category (A13), so a single per-account
rate does not exist. I therefore compute one interest amount per category balance and sum the amounts
per account. This matches CBACT04C, which reads TCATBALF sequentially.

**A2 — Rate units: DIS-INT-RATE is an annual percentage, and interest is monthly: `bal × rate / 1200`.**
The wiki gives only `balance × rate(group)` and is silent on units. Read literally, a rate of
`15.00` would multiply the balance by 15. The /1200 (÷100 for percent, ÷12 for monthly) is CBACT04C's
`COMPUTE WS-MONTHLY-INT = (TRAN-CAT-BAL * DIS-INT-RATE) / 1200`.

**A3 — Rounding: each category amount is truncated toward zero to 2 decimals (no rounding).**
AC scenario 2 says "Rounding matches legacy {{TODO: confirm rounding mode}}". The legacy COMPUTE has no
ROUNDED clause and stores into `S9(09)V99`, so it truncates. The account total is the sum of the
truncated category amounts. Exact integer arithmetic is used: cents × hundredths-of-percent / 120000.
Negative balances therefore give negative interest, truncated toward zero.

**A4 — Rate lookup key and fallback.** The wiki says only `rate(groupId)`; DISCGRP is listed as config
(AC) with no layout or key. The rate is looked up by (account `group_id`, category `type_cd`,
category `cat_cd`). If that key does not exist, the same type and category under group `DEFAULT` is
used (CBACT04C 1200-A-GET-DEFAULT-INT-RATE). If neither exists, legacy abends. I instead post no
interest for that category balance and record a message in `runLog`. A blank `group_id` simply
falls through to DEFAULT.

**A5 — A zero rate produces no interest transaction.** The wiki is silent; CBACT04C has
`IF DIS-INT-RATE NOT = 0` around compute/write. The account is still "processed" (A8 applies to it).

**A6 — A zero balance with a non-zero rate writes a 0.00 interest transaction.** AC scenario 3 says
"Account balance 0 → Zero interest". It does not say whether a transaction is written. Legacy only
skips on a zero *rate*, so a 0.00 transaction is written.

**A7 — No fees.** The wiki mentions only interest. CBACT04C's 1400-COMPUTE-FEES is an empty stub.

## Interest transaction record (intcalc_systran)

**A8a — The wiki is silent on what the written interest transaction looks like.** PROC says only
"posts the interest to the account". CT requires `intcalc_systran.json`, "every interest transaction
written". Following CBACT04C 1300-B-WRITE-TX, I write one transaction per category balance with a
non-zero rate:
- `tran_id` = INTCALC parameter (`2022071800`, 10 chars) + 6-digit sequence starting at `000001`,
  in processing order (A12).
- `type_cd` `01`, `cat_cd` 5, `source` `System`.
- `desc` = `Int. for a/c ` + 11-digit zero-padded account id.
- `amt` = the category interest (A1–A3).
- `merchant_id` 0, with blank merchant name, city and zip.
- `card_num` = the account's card from `cardxref.dat`. When there are several cards, the first in
  file (card-number) order is used; when there is none, the field is blank and a `runLog` message is
  recorded.
- `orig_ts` = `proc_ts` = run time in DB2 format `YYYY-MM-DD-HH.MM.SS.hh0000`, as legacy
  (current timestamp, not the business date). The workflow input `runTimestamp` can pin it.

## Posting to the account (intcalc_acctdata)

**A8 — Posting adds the account's total interest to `curr_bal` and resets `curr_cyc_credit` and
`curr_cyc_debit` to 0.** PROC says "Add interest to balance". It does not mention the cycle reset;
I took that from CBACT04C 1050-UPDATE-ACCOUNT, per the "identical per account" legacy-comparison
requirement.

**A9 — Every account that has at least one category balance is posted, including the last one
processed.** PROC's flow is "For each account → Compute → Post → Save → More?", which posts every
account. My reading of CBACT04C is that it never rewrites the *last* account in TCATBALF key order:
the `ELSE PERFORM 1050-UPDATE-ACCOUNT` branch is unreachable once end-of-file ends the
`PERFORM UNTIL`. Its interest transactions are still written. I implemented the documented
behaviour, so the oracle may differ for the highest-numbered account that has category balances
(its `curr_bal`, `curr_cyc_credit` and `curr_cyc_debit`). Declared in `flags.json`.

**A10 — Accounts with no category balance are output unchanged** (no interest, no cycle reset).
CT asks for "every account, after interest". All accounts are output in input file order.

**A11 — Category balances are not modified.** PROC says interest is "posted to balance and category
balance". CT defines no INTCALC category-balance output, and CBACT04C opens TCATBALF input-only.
Only accounts are updated.

**A12 — Processing order and unknown accounts.** Category balances are processed in key order
(acct id, type, category), as a sequential KSDS read would return them. That order drives the
`tran_id` sequence. A category balance whose account is not in `acctdata.dat` is skipped and logged;
legacy abends.

## Inputs, formats, platform shape

**A13 — Record layouts.**
- Account (CVACT01Y), CardXref (CVACT03Y) and TransactionCategoryBalance (CVTRA01Y) offsets come from
  the DM attribute order and legacy PIC sizes, which add up to CT's record lengths 300/50/50.
- DISCGRP's layout is **not in the wiki**, which has no DisclosureGroup data type. I used CVTRA02Y:
  group X(10), type X(2), cat 9(4), rate S9(4)V99, filler X(28).
- Signed zoned fields use trailing sign overpunch (`{A-I` positive, `}J-R` negative). Plain digits,
  a leading sign and `p-y` are also accepted. Short lines are space-padded; blank lines are ignored.
- Malformed numerics fail the run rather than being guessed.

**A14 — Run parameters.** INTCALC parameter `2022071800` is used only as the `tran_id` prefix. The
business date `2022-07-18` is not used by this step: the wiki gives it no role, and legacy uses the
current timestamp (A8a). `dailytran.dat`, customer, card, transaction-type and category files are not
read; the wiki gives them no role in this step.

**A15 — Output format.** Per CT: amounts as JSON strings with exactly two decimals (`"-3.16"`);
`acct_id`, `cat_cd` and `merchant_id` as ints; string fields right-trimmed; `type_cd` stays a
2-character string.

**A16 — Platform shape.** PROC describes a scheduled process with Send/Receive tasks to "FlowX
Persistence" over Kafka topics `...loadaccounts` / `...saveaccount`, plus a per-account loop. Those
topics and that persistence service do not exist in this environment, and CT fixes file-in /
JSON-out. So I implemented the step as one FlowX integration workflow:
- Inputs: the raw file contents.
- The four wiki nodes (Load Accounts, Compute Interest, Post Interest, Save Account) are SCRIPT nodes.
- The "for each account / More?" loop runs inside the scripts.
- It is started on demand per run; no scheduled trigger was configured.
