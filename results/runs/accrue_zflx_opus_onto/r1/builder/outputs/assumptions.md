# ACCRUE (interest calculation) — assumptions and decisions

Implementation: FlowX workflow `accrue_interest_calculation` (see `../README.md`).
Sources consulted: `02-processes/process-interest-calculation.md` (PROC), `10-acceptance-criteria/acceptance-criteria-interest-calculation.md` (AC),
`01-data-model/project-data-model.md` (DM), `ONTOLOGY.md` (ONT; the live `ledgerline-accrue` ontology in the FlowX project was queried
and returned the same concepts), `CONTRACT.md` (CON).

Each entry: **what was decided** — *what it rests on*. Rule ids match `flags.json`.

## Interest computation

- **A1 R-INT-FORMULA — Monthly interest = category balance × rate / 1200.** The rate is an annual percentage
  (15.00 = 15 %), so it is divided by 100 and by 12.
  *PROC only says `interest = currentBalance × interestRate(groupId)` and carries `{{TODO: Extract exact interest formula, rounding, and grouping}}`.
  ONT: RG-INT-RATE "Interest rate used to compute monthly interest", WS-MONTHLY-INT "computed monthly interest amount",
  RG-INT-RATE is "signed decimal(6,2)" (a percentage-sized field). The divisor 1200 is not stated anywhere; it is inferred from "monthly" + percent.*
- **A2 R-INT-TRUNC — Interest is truncated toward zero to 2 decimals (no rounding).**
  *AC scenario 2: "Rounding matches legacy `{{TODO: confirm rounding mode}}`". No rounding mode documented; a COBOL COMPUTE into
  a V99 field without ROUNDED truncates, so truncation is assumed (e.g. 15.432 → 15.43, −3.968 → −3.96).*
- **A3 R-INT-BASIS — Interest is computed per transaction-category balance record (BALCAT), not on the account's current balance.**
  One interest transaction per category record; the sum of the account's category interests is posted to the account.
  *PROC/AC say "balance × rate(group)" with `currentBalance`; ONT says TXN-CAT-BAL is "the balance amount for the transaction category
  used in interest calculation", BALCAT-FILE is the sequentially read driver file, the rate key is group + type code + category code
  (RG-GROUP-KEY), and WS-TOTAL-INT is an accumulator. The ONT reading was preferred over the wiki's `currentBalance`.*
- **A4 R-INT-NEG — Negative (credit) category balances produce negative interest** and are posted as such.
  *Wiki silent; TXN-CAT-BAL is "signed numeric" and no sign test is documented.*
- **A5 R-INT-ZERO-RATE — When the resolved rate is 0, no interest is computed and no transaction is written.**
  *Not documented in wiki or ONT (absence). Chosen to avoid writing transactions for non-interest-bearing categories, matching the usual pattern of this legacy program family.*
- **A6 R-INT-ZERO-BAL — A zero balance with a non-zero rate writes a transaction with amount 0.00.**
  *AC scenario 3 says only "Zero interest"; it is silent on whether a transaction is written. Only the rate is tested (A5), not the balance.*
- **A7 — Amounts are computed exactly (integer cents / hundredths of a percent); no high-order truncation is emulated**
  if a result exceeds the copybook width (S9(9)V99 transaction amount, S9(10)V99 balance). *DM gives the widths but no overflow behaviour.*

## Rate (disclosure group) lookup

- **A8 R-RATE-KEY — Rate key = account `group_id` + category `type_cd` + `cat_cd`**, trimmed group id, exact case.
  *ONT: Disclosure Group Record / RG-GROUP-KEY = RG-LACC-GROUP-ID X(10) + RG-TXN-TYPE-CD X(2) + RG-TXN-CAT-CD 9(4); FD-RG-* fields.*
- **A9 R-RATE-DEFAULT — When that key is not found, the rate for group `DEFAULT` with the same type/category is used.**
  *ONT: 1200-A-GET-STANDARD-INT-RATE "performed to get the standard interest rate when the disclosure group status is '23'" (record not found).
  The literal group id of the "standard" rate (`DEFAULT`) is NOT in the wiki or the ontology; it is an assumption. This also covers accounts with a blank group id.*
- **A10 R-ABEND — If the standard (DEFAULT) record is also missing, the run abends** (stops; see A18).
  *ONT: 1200-A sets APPL-RESULT "0 or 12 depending on RATEGRP-STATUS" and performs 9910-DISPLAY-IO-STATUS / 9999-ABEND-PROGRAM.*
- **A11 — Duplicate rate-group keys: the last record read wins.** *Not possible in the legacy KSDS; wiki silent.*

## Processing order and account posting

- **A12 R-ORDER — Category balances are processed in key order (acct_id, type_cd, cat_cd) with a control break on account id:**
  the account is read when the id changes, its interest is accumulated, and it is posted when the next account starts and at end of file.
  *ONT: BALCAT-FILE indexed, sequential access (so key order), WS-FIRST-TIME, WS-LAST-LACC-NUM, WS-TOTAL-INT, 1050-UPDATE-ACCOUNT. Input records are sorted by key before processing.*
- **A13 R-ACCT-POST — Posting adds the account's total interest to `curr_bal` and sets `curr_cyc_credit` and `curr_cyc_debit` to 0.00.**
  *PROC: "Add interest to balance". ONT: the account-update chunk (LXB002C-8, "ERROR RE-WRITING ACCOUNT FILE") touches balance,
  current_cycle_credit and current_cycle_debit. That those two cycle fields are reset to zero (start of a new cycle) is an assumption;
  ONT names them but does not give their new value.*
- **A14 — An account that has category records is posted (cycle fields reset) even when its total interest is 0.00**, because posting happens per account on the control break regardless of amount. *Follows from A12/A13; wiki silent.*
- **A15 — Accounts with no category-balance records are left unchanged. `accrue_ledgacc` lists every input account, in input order.**
  *CON: "account fields for every account, after interest".*
- **A16 R-BALCAT-NOT-UPDATED — Category balances are NOT updated with the interest.**
  *PROC says the interest is "posted to balance and category balance", but ONT shows BALCAT-FILE opened for sequential input only, with no
  rewrite procedure, and CON lists no ACCRUE category-balance output. The ONT reading was followed.*
- **A17 — Empty category-balance input: nothing is posted and no transactions are written.** *Wiki silent.*

## Errors

- **A18 R-ABEND — Account missing from ledgacc, or account with no card link: the run abends.** Processing stops at that record;
  accounts already posted and transactions already written stay in the outputs, and `runSummary.status = ABENDED` with the reason.
  *ONT: 1110-GET-LINK-DATA sets APPL-RESULT 0/12 and performs 9910-DISPLAY-IO-STATUS; the file-error paths all perform 9999-ABEND-PROGRAM.
  Whether the oracle's partial output survives an abend is unknown.*

## Interest transaction fields (accrue_systxn)

- **A19 R-TXN-FIELDS — `type_cd "07"`, `cat_cd 12`, `source "Batch"`, `merchant_id 0`, merchant name/city/zip blank (written as "", trailing spaces omitted as CON allows).**
  *ONT: TXN-TYPE-CD "set to '07'", TXN-CAT-CD "set to '12'", TXN-SOURCE "set to 'Batch'", TXN-MERCHANT-ID "set to 0", merchant name/city/zip "set to spaces".*
- **A20 R-TXN-DESC — `desc = "Accrued int " + account id as 11 zero-padded digits`** (e.g. `Accrued int 00000000001`).
  *ONT: TXN-DESC "composed of the string 'Accrued int ' concatenated with LACC-ID". LACC-ID is PIC 9(11) (DM), so it is assumed to be zero-padded.*
- **A21 R-TXN-ID — `tran_id = PARM-DATE + 6-digit suffix`**, PARM-DATE being the ACCRUE parameter (`2022071800`), and the suffix a counter
  starting at 000001 and increasing by 1 per interest transaction across the whole run, in processing order (A12).
  *ONT: TXN-ID "composed by concatenating PARM-DATE and WS-TRANID-SUFFIX". The width (16 − 10 = 6, TXN-ID X(16)), start value and
  increment are assumptions. If no parameter is passed, `2022071800` (CON) is used.*
- **A22 R-CARD-PICK — `card_num` is the account's card from the card-link file; with several cards per account the lowest card number is used.**
  *ONT: TXN-CRD-NUM "set to LINK-CRD-NUM"; LINK-FILE is read by alternate key FD-LINK-LACC-ID. Which duplicate an alternate-key read returns is not documented;
  the first in primary-key (card number) order is assumed.*
- **A23 R-TXN-TS — `orig_ts` = `proc_ts` = the run's current wall-clock time in DB2 format `YYYY-MM-DD-HH.MM.SS.hh0000`**, the same value on both
  fields of a transaction, and the time zone of the FlowX script runtime (UTC).
  *ONT: TXN-ORIG-TS / TXN-PROC-TS "set to DB2-FORMAT-TS"; DB2 Timestamp Format built from the Current Date Function with dash/dot separators,
  milliseconds field and a "rest" filler. The business date 2022-07-18 is not used. These values cannot match an oracle run byte for byte.*
- **A24 R-FEES — 1400-COMPUTE-FEES is not implemented** (no fee transactions). *ONT names the procedure ("compute fees related to transactions") but no logic, amounts or rules are documented anywhere.*

## Inputs, formats and platform mapping

- **A25 — Inputs are the fixed-width files of CON, read with the copybook offsets of DM/ONT:** ledgacc (LXV022Y, 300), balcat (LXV026Y, 50),
  cardlink (LXV024Y, 50), rategrp (LXV027Y, 50). Signed numerics are zoned decimal with an over-punched last digit (`{`/A–I positive,
  `}`/J–R negative); an explicit leading/trailing sign or decimal point is also accepted. Short lines are space-padded; blank lines are ignored.
  *DM: S9(n)V99 → decimal scale 2; the physical sign encoding is not documented.*
- **A26 — ledgacc and balcat may also be given as the POSTDAY JSON outputs** (`postday_ledgacc.json`, `postday_balcat.json`, contract field names).
  *CON "Step isolation": ACCRUE receives the oracle's POSTDAY outputs as its account and category-balance inputs; their form is not fixed.*
- **A27 — daytxn, clntrec, crdrec, txntype, txncatg are not read by ACCRUE.** *ONT: LXB002C uses only BALCAT, LINK, RATEGRP, TXNFILE (output) and the account file.*
- **A28 — Platform mapping:** the wiki's Scheduled Start + Kafka `datastore.loadaccounts/saveaccount` touchpoints are replaced by one FlowX
  integration workflow that takes the file contents as input and returns both outputs (CON defines file I/O, not topics). The scheduled
  trigger (ACCRUE.jcl) is not modelled. *PROC Integration Touchpoints vs CON.*
- **A29 — Field naming:** the legacy `LACC-EXPIRY-DATE` typo is emitted as `expiration_date` (CON field list; DM `{{DECISION}}` recommends correcting it).
  Dates are passed through as the 10-character strings read.
- **A30 — Output amounts are JSON strings with exactly two decimals** (`"15.43"`, `"-3.96"`, `"0.00"`); `acct_id`, `cat_cd`, `merchant_id` are integers. *CON.*
