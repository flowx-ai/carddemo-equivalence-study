# ACCRUE (interest-calculation, P-15): implementation assumptions

The FlowX implementation is the DEFAULT workflow `accrue_interest_calculation` (resourceDefinitionId
`<uuid>`): START (input slice: `ledgacc`, `cardlink`, `balcat`, `rategrp`,
optional `interestRunDate`, `runTimestamp`) → SCRIPT `Accrue interest (LXB002C)` → END (output slice:
`accrueSystxn`, `accrueLedgacc`, `runSummary`, `warnings`, all JSON text). The script body is
`flowx/accrue_core.js` plus a wrapper; `run_accrue.js` runs that same code locally on the `.dat`
files and writes `accrue_systxn.json` / `accrue_ledgacc.json` here.

Rules implemented as the wiki states them: BR-01 (rate key group + type + category), BR-02 (fallback
group `STANDARD`), BR-03 (`balance × rate / 1200`, only when rate ≠ 0), BR-04 (type `07`, category
`12`, source `Batch`, description `Accrued int <accountId>`, amount = interest), BR-05 (transaction id
= run PARM + running suffix), BR-06 (balance += total interest, cycle credit/debit = 0), BR-07 (no fees),
BR-10 (zero-rate categories produce nothing).

Each decision below says what was assumed and which wiki statement, or absence of one, it rests on.

## A-01 Rounding: truncate to 2 decimals, toward zero
BR-08: "Rounding follows COBOL `COMPUTE` default truncation; {{TODO: confirm rounding mode (truncate vs
ROUNDED) — golden-file test required}}". The acceptance criteria say "verify interest rounding to two
decimals" without naming a mode. I kept the legacy behaviour BR-08 describes: the exact value of
`balance × rate / 1200` is truncated to cents, toward zero for negative balances (COBOL truncation
drops digits; it does not floor). Exact integer arithmetic (BigInt in hundredths) is used, so there
is no floating-point drift. Flagged as `R-INT-TRUNC`.

## A-02 Processing order = BALCAT key order
The ontology describes BALCAT-FILE as "INDEXED, access SEQUENTIAL, record key FD-TXN-CAT-KEY", and the
DT-06 key is `accountId + typeCode + categoryCode`. The wiki does not say the input file is sorted, so
balances are sorted by account id (numeric), type code, then category code, as a KSDS read would
return them. The order fixes both the account grouping for BR-06 and the transaction-id suffixes (A-06).

## A-03 Last account is not rewritten (BR-06 taken literally)
BR-06 says "At **each change of account**: `currentBalance += totalInterest`; `currentCycleCredit = 0`;
`currentCycleDebit = 0`; rewrite account". The update is therefore triggered when the next account's
first balance arrives. The wiki describes no end-of-file update, so the last account of the BALCAT
order is not rewritten. Its interest transactions are still written, but its balance and cycle totals
stay unchanged in `accrue_ledgacc.json`. This matches the legacy control-break pattern BR-06 is
describing.
- **Conflicting evidence:** the process-flow diagram ("Account done? → Send Update Account") and
  acceptance scenario 3 ("Account current balance increased by total interest") read as if every
  account is updated.
- **How to flip:** set `ACCRUE.UPDATE_LAST_ACCOUNT` to true (or pass `updateLastAccount`).
- Flagged as `R-LAST-ACCT`.

## A-04 Which accounts get updated and output
BR-06 applies to every account that has at least one category balance, including accounts whose
rates are all 0 (ZEROAPR, BR-10). For those, the balance is unchanged (total interest 0), but the
cycle credit and debit are still reset to 0. BR-06 resets per account change, not per interest
posted. Accounts with no category balance are not touched. Per CONTRACT.md ("account fields for
every account, after interest"), `accrue_ledgacc.json` lists every input account in input order.

## A-05 Missing rate even in STANDARD
BR-02 and the reference-data workflow only say "if missing, find with group STANDARD"; they are silent
when STANDARD has no row for that type/category either. That balance produces no interest, and a
warning is returned. An empty or unknown account group id also falls back to STANDARD (BR-02 applies
to any "not found").

## A-06 Transaction id and suffix
BR-05 says "run date prefix (`PARM`, e.g. 2022071800) + running suffix". DT-05 sets `transactionId` to
String(16). With a 10-character PARM, that leaves a 6-digit, zero-padded suffix starting at `000001`
and increasing by 1 for each interest transaction written in the run, in A-02 order (e.g.
`2022071800000001`). The suffix is not reset per account. The PARM defaults to `2022071800` (CONTRACT
run parameter and the `interestRunDate` Configuration Parameter default). It can be overridden at
start, as the process "Data Mapping" allows.

## A-07 Card number on the interest transaction
The wiki does not say where `card_num` (DT-05 `cardNumber`, required) comes from. CONTRACT.md feeds
`cardlink.dat` to this step, and the ontology says LXB002C uses LINK-FILE with alternate key
FD-LINK-LACC-ID. So the card is looked up by account id in the xref. If an account has several cards,
the one with the lowest card number is used, which is the first record a VSAM alternate-index read
returns. If an account has no xref row, `card_num` is blank and a warning is returned (the legacy
program would most likely abend).

## A-08 Other interest-transaction fields
- **Merchant fields:** BR-04 lists only type, category, source, description and amount. Merchant id is
  set to `0`; merchant name, city and zip are empty.
- **Description:** `Accrued int ` + the account id as the 11-digit zero-padded legacy `9(11)` value,
  e.g. `Accrued int 00000000001`.
- **Interest of 0.00:** when the rate is non-zero, a transaction is written even if the truncated
  interest is 0.00. BR-03 conditions only on rate ≠ 0.
- **`orig_ts` and `proc_ts`:** the wiki is silent. The ontology lists a "DB2 Timestamp Format" built
  from the current date (DB2-YYYY, DB2-MM, DB2-DD, DB2-HH, DB2-MIN, DB2-SS, DB2-MIL and DB2-REST, with
  dash and dot separators). Both fields are set to the run's current timestamp,
  `YYYY-MM-DD-HH.MM.SS.cc0000` (26 characters). One value is taken per run, and the `runTimestamp`
  input or `--ts` overrides it for reproducible runs. These values cannot match an oracle run made at
  a different time. Flagged as `R-TXN-TS`.
- **Field types:** `type_cd` is output as the string `"07"`. `cat_cd` is the integer `12`, as
  CONTRACT.md requires.

## A-09 Input decoding
DT-07 says rates are stored as signed overpunch (`0150{` = 15.00). All signed numeric fields
(S9(n)V99) are decoded with two implied decimals:
- EBCDIC-style overpunch: `{`, `A`–`I` positive; `}`, `J`–`R` negative.
- ASCII overpunch `p`–`y` (negative) and explicit signs or decimal points are also accepted.
- Lines shorter than the record length are padded with spaces, and blank lines are ignored.

Record layouts follow the DT-01, DT-04, DT-06 and DT-07 attribute order and the copybook sizes.
Outputs are amounts as strings with exactly two decimals, and right-trimmed strings, as CONTRACT.md
allows.

## A-10 Balance for an unknown account
The wiki does not cover a BALCAT account missing from LEDGACC. Its balances are skipped (no rate group
can be resolved) and a warning is returned. CONTRACT.md's step isolation feeds consistent POSTDAY
outputs, so this should not occur.

## A-11 Transaction output is append-only, interest transactions only
BR-09 says legacy overwrites the transaction output and "FlowX appends". `accrue_systxn.json` holds
exactly the interest transactions this run writes (CONTRACT.md: "every interest transaction
written"). Appending to a transaction store is left to the caller.

## A-12 Fees
BR-07 and acceptance scenario 7 call fees an empty stub, with "{{DECISION: implement fees in FlowX or
keep stub}}". The stub is kept: no fee transaction is created and fees do not affect the account.

## A-13 Architecture: workflow instead of process + datastore
The wiki models P-15 as a BPMN process that calls reference, account and transaction data-access
workflows on the `ledgerline-datastore` NOSQL_DB. CONTRACT.md defines this build's I/O as fixed-width
files in and JSON lists out, so the step is one integration workflow that takes the file contents and
returns the outputs. No persistence or datastore is used. Also not implemented, because they are not
needed for the file contract:
- the `batchWindowOpen` / `RuntimeSwitches` flag;
- the `interestRunDate` Configuration Parameter (input with a default instead);
- the error/retry policies of the data-access workflows.
