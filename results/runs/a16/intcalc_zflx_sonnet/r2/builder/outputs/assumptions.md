# INTCALC (P-15 interest-calculation) — build assumptions

Each entry: what was decided, and the wiki statement (or gap) it rests on.
Code references point at `flowx/02_compute_interest.js` (deployed as the SCRIPT node
"Compute interest and update accounts") and `flowx/01_parse_input_files.js` ("Parse input files").

## Architecture and inputs

**A-01 — One integration workflow, no datastore.**
Wiki (process-interest-calculation, Data Mapping; project-data-model DECISION) describes a process that
SENDs `LIST_BALANCES_BY_ACCOUNT`, `GET_DISCLOSURE_RATE`, `WRITE_INTEREST_TRANSACTION`,
`UPDATE_ACCOUNT_AFTER_INTEREST` to three data-access workflows on a `carddemo-datastore` NOSQL_DB.
CONTRACT.md instead fixes a file-in / file-out step with step isolation ("inputs given per run").
Built as one FlowX workflow `intcalc_interest_calculation` (START → Parse input files → Compute interest and
update accounts → END) that receives the file contents and returns both outputs. The four wiki operations are
done in-memory over the parsed files; nothing is persisted between runs. The operation names above map to:
balance grouping (sort + account break), `lookupRate`, the `systran.push`, and the BR-06 account update.

**A-02 — Files read.** `acctdata.dat` (CVACT01Y), `tcatbal.dat` (CVTRA01Y), `discgrp.dat` (CVTRA02Y),
`cardxref.dat` (CVACT03Y). The other contract inputs (dailytran, custdata, carddata, trantype, trancatg)
are not needed by any P-15 business rule and are ignored. Per CONTRACT "Step isolation", acctdata and tcatbal
are the oracle's POSTTRAN outputs.

**A-03 — `interestRunDate`.** Wiki: Configuration Parameter with override at start; CONTRACT: INTCALC
parameter `2022071800`. Implemented as an optional workflow input defaulting to `2022071800`
(no FlowX Configuration Parameter was created).

**A-04 — Record layouts.** Field offsets follow the copybooks CONTRACT.md names (CVACT01Y, CVTRA01Y, CVTRA02Y,
CVACT03Y); the wiki gives the field sizes (project-data-model DT-01, DT-04, DT-06, DT-07). Signed numeric fields
use a trailing overpunch (`{`/`A-I` positive, `}`/`J-R` negative), as the wiki notes for the rate (`0150{` = 15.00);
the same encoding is assumed for every S9 field. Short lines are space-padded to the record length.

## Business rules

**A-05 — Missing DEFAULT row.** BR-02 says retry with group `DEFAULT`; the wiki does not say what happens when
DEFAULT has no row for the type/category either. Treated as rate 0 (no interest) and reported in
`runSummary.warnings`; the run does not abort.

**A-06 — Interest-transaction fields that BR-04 does not name.** BR-04 fixes type `01`, category `05`, source
`System`, description `Int. for a/c <accountId>`, amount. Decided: `merchant_id` = 0; merchant
name/city/zip blank; `card_num` = the card of the account from `cardxref.dat` (first xref row for that
account in file order; blank if none). Rests on silence plus the DT-04 / Relationships link Card → Account,
and on `cardxref.dat` being an INTCALC input in CONTRACT.md. `<accountId>` is written as the 11-digit
zero-padded id (DT-01 String(11) numeric).

**A-07 — Category balance for an unknown account.** Wiki silent. The balance is skipped (no transaction,
no account update) and reported in `runSummary.warnings`.

**A-08 — Timestamps.** Wiki silent on `orig_ts` / `proc_ts` for system transactions. Both are set to the run
day from `interestRunDate` at midnight, in the 26-char DB2 format `YYYY-MM-DD-HH.MM.SS.ffffff`
(DT-05 X(26)), so that a rerun is reproducible.

**A-09 — Transaction id suffix.** BR-05: "run date prefix (PARM) + running suffix" — width and start not given.
Transaction id is 16 chars (DT-05) and the prefix 10, so the suffix is 6 digits, zero-padded, starting at
`000001`, incremented once per transaction written, over the whole run.

**A-10 — Processing order.** TCATBAL is a KSDS keyed `accountId + typeCode + categoryCode` (DT-06). Balances
are processed in ascending key order regardless of the input line order; this fixes which transaction gets
which suffix.

**A-11 — One transaction per category balance.** Acceptance scenario 2: "type 01, category 05 created per
category balance". Each balance with a non-zero rate produces its own transaction; the account receives the
sum (BR-06 `totalInterest`).

**A-12 — Rounding.** BR-08 / Data Mapping Verification: round to the cent, halves away from zero
(1000.40 × 18.00 / 1200 = 15.006 → 15.01; −15.006 → −15.01). Implemented exactly that, in integer cents
(`interestCents`). Each category's interest is rounded before being summed into the account total.
Flagged in `flags.json`: the wiki attributes this to `COMPUTE ... ROUNDED` in CBACT04C; if the legacy COMPUTE
has no ROUNDED clause the oracle truncates instead, and amounts with a third decimal ≥ 5 would differ by 0.01.

**A-13 — Zero rate (BR-10, scenario 5).** No transaction is written for a category whose rate is 0. The account
is still updated per BR-06 ("at each change of account"): balance += total (possibly 0), cycle credit and debit
reset to 0 — scenario 5 only says "no interest transaction".

**A-14 — Accounts without category balances.** BR-06 triggers on account breaks in the balance file, so accounts
with no TCATBAL row are left unchanged (cycle totals not reset). `intcalc_acctdata` still lists every account,
as CONTRACT.md requires ("account fields for every account, after interest"), in input order.

**A-15 — Account status.** Wiki silent on inactive accounts; interest is calculated for every account regardless
of `active_status`.

**A-16 — Fees (BR-07, scenario 7 `{{DECISION}}`).** The decision is left open in the wiki; kept the legacy stub —
no fee transactions.

**A-17 — Output file mode (BR-09).** "FlowX appends" refers to the transaction store. `intcalc_systran.json`
contains only the interest transactions written in this run (CONTRACT: "every interest transaction written").

**A-18 — Key matching.** Group ids are compared with trailing spaces removed (X(10) padded keys); category codes
as the 4-digit string from the file.

**A-19 — Negative balances / rates.** No special case: a credit (negative) balance yields negative interest
(BR-08's own −15.01 example). Negative rates are decoded but none are expected.

**A-20 — Not implemented: orchestration concerns.** `RuntimeSwitches.batchWindowOpen` (acceptance criteria,
Configuration Dependencies) and the `batchId` start datum belong to the P-19 end-of-day chain; this step does
not read them. `usedFallback` is computed but only reflected in warnings, not in the outputs (CONTRACT has no
field for it).

## Output format

Amounts are JSON strings with exactly two decimals (`"15.01"`, `"-15.01"`); `acct_id`, `cat_cd`, `merchant_id`
are integers; strings have trailing spaces removed — all as CONTRACT.md allows.
