# INTCALC (P-15 interest-calculation) — assumptions and decisions

Implementation: FlowX integration workflow `intcalc_interest_calculation`
(project `cd_a21_ni2_zflx_r2`, env dev-env, resourceId `<uuid>`,
resourceDefinitionId `<uuid>`).

Flow: START → *Parse input files* → *Compute interest and update accounts* → *Format contract outputs* → END.
INPUT slice: `acctdata`, `tcatbal`, `discgrp` (required), `cardxref`, `interestRunDate` (optional) — each file's
full text, one fixed-width record per line. END returns `{ intcalc_systran[], intcalc_acctdata[], runSummary, warnings[] }`;
the two arrays are written as `intcalc_systran.json` and `intcalc_acctdata.json`.

Each entry: **decision** — *wiki basis*.

## Architecture

- **A-01. One self-contained integration workflow, not a BPMN process with message events calling the three data-access workflows over `carddemo-datastore`.**
  *Basis:* The wiki's process flow (SEND/RECEIVE to account-, reference- and transaction-data-access over NOSQL_DB) assumes a populated datastore. CONTRACT.md requires file in → JSON out per run, with step isolation. Loading the files into a datastore, then exporting them again, would add a load/export step the contract does not define.
  The three SCRIPT nodes keep the wiki's stages: lookup (W-05), compute (BR-03), and the transaction write and account update (W-04, W-01).
- **A-02. `interestRunDate` is a workflow input, defaulting to `2022071800` when it is absent or unreadable.**
  *Basis:* Data Mapping says "Configuration Parameter default; override at start". CONTRACT gives the INTCALC parameter `2022071800`.
- **A-03. Only `acctdata`, `tcatbal`, `discgrp` and `cardxref` are read. `dailytran`, `custdata`, `carddata`, `trantype` and `trancatg` are not.**
  *Basis:* The process page lists copybooks CVTRA01Y, CVTRA02Y, CVACT01Y, CVACT03Y and CVTRA05Y (the output) only.

## Input parsing

- **A-04. Field offsets are taken from the copybook layouts:**
  - CVACT01Y: id 0–11, status 11, then 12-byte amounts and 10-byte dates in copybook order, zip 102–112, group 112–122.
  - CVTRA01Y: acct 0–11, type 11–13, cat 13–17, bal 17–28.
  - CVTRA02Y: group 0–10, type 10–12, cat 12–16, rate 16–22.
  - CVACT03Y: card 0–16, cust 16–25, acct 25–36.

  *Basis:* The data model attribute tables (PIC sizes). The wiki gives no byte offsets.
- **A-05. Signed numerics are zoned decimal with a trailing overpunch: `{`/`A`–`I` positive, `}`/`J`–`R` negative.**
  ASCII `p`–`y` negatives, plain digits and explicit decimals are also accepted. Amounts become integer cents, and rates integer hundredths, so no floating-point arithmetic is used.
  *Basis:* DT-07 / W-05: "signed overpunch (`0150{` = 15.00) — convert at load". The full set of overpunch characters is not listed.
- **A-06. Blank lines are skipped. A record whose key is not numeric is skipped with a warning. A short record is padded with spaces.**
  *Basis:* The wiki is silent.
- **A-07. The group-id match is exact after trimming trailing spaces, and case-sensitive.**
  *Basis:* BR-01 key = `groupId + typeCode + categoryCode`. Both are X(10) fields.
- **A-08. On a duplicate disclosure key, the first record wins.** *Basis:* Silent; VSAM keys are unique.

## Processing order and grouping

- **A-09. Category balances are processed in key order (account, type, category), using a stable sort of the file.**
  The account "change" (BR-06) is detected on consecutive records in that order. The transaction-id suffixes follow the same order.
  *Basis:* TCATBAL is a KSDS (DT-06, composite key), which a sequential read returns in key order. The wiki does not say whether the input file is pre-sorted.
- **A-10. A category balance whose account is not in `acctdata` is skipped: no transaction, no update, and a warning.**
  *Basis:* The wiki is silent. The legacy behaviour (abend versus continue) is not documented.
- **A-11. Accounts with no category balance are written to `intcalc_acctdata` unchanged.** The output keeps the `acctdata` file order.
  *Basis:* CONTRACT: "account fields for every account, after interest". BR-06 updates only "at each change of account".
- **A-12. An account that has balances is always updated (BR-06), even when its total interest is 0.**
  This covers ZEROAPR, payment/credit-only, and rates reduced to 0. Its cycle credit and debit are reset to 0.
  *Basis:* BR-06 is tied to the account change, not to interest > 0.

## Rate and interest

- **A-13. If the group row is missing, retry with `DEFAULT` + the same type + category (BR-02).**
  If DEFAULT is also missing, the rate is 0 (no interest) and a warning is raised.
  *Basis:* BR-02 does not cover a missing DEFAULT row.
- **A-14. The ten-year reduction (BR-03) applies when `openDate` ≤ (run date − 10 years), compared as ISO `YYYY-MM-DD` strings.**
  For run date 20220718 the cut-off is 2012-07-18, so 2012-07-18 is reduced and 2012-07-19 is not (AC-8, AC-9).
  A 29-Feb run date maps to 28-Feb. A blank or malformed `openDate` gets no reduction.
  *Basis:* BR-03's "on or before the same calendar date ten years before". The leap-day case and invalid dates are not covered.
- **A-15. The reduction is `max(rate − 2.00, 0.00)` and is applied before the "rate ≠ 0" test.**
  So a 1.50 rate on an old account produces no transaction. A negative base rate on an old account becomes 0.
  *Basis:* BR-03's "never below 0.00" and "If the effective rate ≠ 0". The wiki does not discuss negative rates.
- **A-16. `monthlyInterest = balance × effectiveRate / 1200`, truncated toward zero at 2 decimals (COBOL COMPUTE without ROUNDED).**
  So 333.33 × 15 / 1200 = 4.166… gives 4.16, and negative balances give negative interest (−500 × 18 / 1200 = −7.50).
  *Basis:* BR-08 says "follows COBOL COMPUTE default truncation" but carries a `{{TODO: confirm rounding mode}}`. AC-8 (10.83) holds under either mode. Declared in `flags.json`.
- **A-17. A transaction is written whenever the effective rate ≠ 0, even if the computed interest is 0.00** (for example, a zero balance).
  *Basis:* BR-03 / BR-04 condition on the rate, not the amount.
- **A-18. No fees are charged (BR-07, stub).** *Basis:* BR-07 / AC-7; the `{{DECISION}}` was left as "keep stub".
- **A-19. The total interest is added to `currentBalance` without an overflow check.** *Basis:* Silent.

## Interest transaction fields (BR-04 / BR-05)

- **A-20. `tran_id` = the first 10 characters of `interestRunDate` + a 6-digit zero-padded suffix.**
  The suffix starts at 000001 and increases by one per transaction written in this run.
  *Basis:* BR-05 says "run date prefix + running suffix", with no width or start value. `tran_id` is String(16), and 10 + 6 = 16.
- **A-21. `desc` = `Int. for a/c ` + the account id as 11 zero-padded digits.**
  *Basis:* BR-04 `Int. for a/c <accountId>`. `accountId` is String(11) numeric.
- **A-22. `type_cd` = `01`, `cat_cd` = 5, `source` = `System`.** *Basis:* BR-04.
- **A-23. `card_num` is the account's card from `cardxref`. With several cards, the lowest card number is used.**
  With no card, it is blank and a warning is raised.
  *Basis:* CVACT03Y is a listed copybook and Transaction.cardNumber is required, but the wiki does not say how the card is chosen. The legacy read is via the account alternate index.
- **A-24. `merchant_id` = 0; `merchant_name`, `merchant_city` and `merchant_zip` are empty.**
  *Basis:* The fields are required (DT-05) but not mentioned for interest transactions.
- **A-25. `orig_ts` = `proc_ts` = the run's current time in DB2 format `YYYY-MM-DD-HH.MM.SS.ffffff` (UTC), one value per run.**
  *Basis:* The wiki is silent. These values cannot match an oracle run made at a different time.
- **A-26. Output file semantics: the step produces only the transactions created in this run.**
  BR-09 (legacy overwrites, FlowX appends) concerns a persistent store, which does not exist here.

## Output format

- **A-27. Amounts are written as JSON strings with exactly two decimals. `acct_id` and `cat_cd` are written as integers. Strings are right-trimmed.**
  *Basis:* CONTRACT.md permits all three.
