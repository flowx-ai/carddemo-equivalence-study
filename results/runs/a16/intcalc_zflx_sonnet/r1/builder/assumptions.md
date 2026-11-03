# INTCALC (interest calculation): decisions and assumptions

These are the places where the wiki pages were uncertain, incomplete or silent, and what this build decided.
Each entry gives the decision and the wiki statement, or the missing statement, it rests on. Rule ids
(BR-xx) refer to `02-processes/process-interest-calculation.md` unless another page is named.

## Architecture

**A-01: One integration workflow processes the whole file in memory. There is no per-record SEND/RECEIVE choreography and no NOSQL datastore.**
The wiki models P-15 as a process. For each balance it would SEND `LIST_BALANCES_BY_ACCOUNT`, `GET_DISCLOSURE_RATE`,
`WRITE_INTEREST_TRANSACTION` and `UPDATE_ACCOUNT_AFTER_INTEREST` to the W-01/W-04/W-05 workflows on the
`carddemo-datastore` NOSQL_DB. CONTRACT.md, however, fixes the step's I/O as files: the four fixed-width input files
and two JSON lists. The build therefore implements the business rules once, in a single SCRIPT node of the workflow
`intcalc_interest_calculation`, and takes the file contents as workflow inputs. Loading and re-exporting a datastore
per run would add nothing to the rules. The wiki's own data-access layer is a {{DECISION}} ("one workflow per
Project Data Type"), not a fixed requirement.

**A-02: `interestRunDate` is a workflow input (`parmDate`), defaulting to `2022071800`.**
BR-05 and the Data Mapping section call it a Configuration Parameter "default; override at start". The run
parameter in CONTRACT.md is `2022071800`. A workflow input with that default reproduces "default, override at start"
without a project configuration parameter.

## Reading the inputs

**A-03: Fields are taken at the copybook byte offsets. Signed numeric fields are zoned decimal with the sign
overpunched on the last byte (`{`/`A`–`I` positive, `}`/`J`–`R` negative). Implied decimals follow the PIC.**
DT-07 says the "seed file stores signed overpunch (`0150{` = 15.00) — convert at load", and CONTRACT.md says
"layouts as in the copybooks". The wiki gives no rule for the other signed fields (`TRAN-CAT-BAL`, `ACCT-CURR-BAL`,
cycle totals, limits), so the same overpunch decoding is applied to all of them. A leading or trailing `-`/`+`, an
explicit decimal point, and ASCII `p`–`y` negative overpunch are also accepted, as a defensive measure. A value that
cannot be parsed becomes 0 and is reported in the run summary's warnings.

The wiki's example `0150{` has 5 characters, but `DIS-INT-RATE` is S9(4)V99, which is 6 bytes. The build reads the
6 bytes at offset 16 of the 50-byte DISCGRP record.

**A-04: Lines shorter than the record length are padded with spaces, and blank lines are ignored.**
CONTRACT.md says "one record per line, fixed width". It does not say whether trailing FILLER spaces survive.

## Processing order

**A-05: Category balances are processed in key order: account id, then type code, then category code. The file is
sorted first.**
BR-06 ("at each change of account") and the "running suffix" of BR-05 both depend on the read order. The wiki never
states that order. Legacy TCATBALF is a KSDS read sequentially, i.e. in key order (DT-06 composite key
`accountId + typeCode + categoryCode`).

## Rate lookup

**A-06: The lookup key is the account's `groupId` (trailing spaces ignored) + `typeCode` + `categoryCode` (compared
numerically). On a miss the build retries with group `DEFAULT` once. It never falls back when a row exists with
rate 0.**
This follows BR-01 and BR-02 ("if not found (file status 23), retry with group DEFAULT") and acceptance scenario 5
(`ZEROAPR` gives no interest, so that group's rows must exist with rate 0 rather than trigger the fallback).

**A-07: If neither the group nor DEFAULT has a row, the balance earns no interest. The run continues and records a
warning.**
The wiki is silent on this case. It says only what happens when the group is missing.

**A-08: A category balance whose account is not in `acctdata.dat` is skipped, with a warning. No transaction is
written and no account is updated.**
The wiki is silent. Without the account there is no `groupId` (BR-01) and nothing to update (BR-06).

## Interest computation

**A-09: `monthlyInterest = (balance × rate) / 1200`, rounded to the cent, with halves rounded away from zero. The
arithmetic is exact (integer cents), not floating point.**
This follows BR-03 and BR-08, and the acceptance criteria's "Data Mapping Verification" (1000.40 × 18.00 / 1200 =
15.006 → 15.01; −15.006 → −15.01). The wiki states this rule explicitly, so it was implemented as written. See flag
`R-INT-TRUNC` in `flags.json`: the builder's recollection is that the open-source CBACT04C `COMPUTE WS-MONTHLY-INT`
has no `ROUNDED` clause, which would truncate instead. This is unverified, because no COBOL source was supplied.

**A-10: A transaction is written whenever the rate is non-zero, even when the computed interest is 0.00 (balance
0). This also applies to negative balances, which produce negative interest.**
BR-03 conditions only on "rate ≠ 0". Nothing in the wiki excludes zero or negative balances.

**A-11: No fees are charged.**
BR-07 says 1400-COMPUTE-FEES is an empty stub. Acceptance scenario 7 leaves "implement fees in FlowX or keep stub"
as an open {{DECISION}}, and the build keeps the stub.

## Interest transaction fields

**A-12: `tran_id` is the run parameter (10 chars) followed by a 6-digit, zero-padded running counter that starts
at 000001 for the run and is shared across all accounts. Example: `2022071800000001`.**
BR-05 says "run date prefix (PARM) + running suffix". The suffix's width, start value and scope are not stated.
6 digits is what makes the id fill `TRAN-ID X(16)` exactly (DT-05).

**A-13: `desc` is `Int. for a/c ` followed by the 11-digit account id with leading zeros
(`Int. for a/c 00000000001`).**
BR-04 says `Int. for a/c <accountId>`. DT-01 defines `accountId` as String(11) numeric, from `ACCT-ID 9(11)`.

**A-14: `card_num` is the card cross-referenced to the account in `cardxref.dat`. If several cards share the
account, the lowest card number is used. If there is none, the field is blank and a warning is recorded.**
The wiki pages for this step never say which card an interest transaction carries, but DT-05 makes `cardNumber`
required. `cardxref.dat` is one of the step's contract inputs, and the account→card relation is via CardXref (DT-04,
secondary index on `accountId`). When an alternate index has duplicates, the first record read is the lowest key
loaded.

**A-15: `merchant_id` is 0. `merchant_name`, `merchant_city` and `merchant_zip` are empty strings.**
BR-04 lists only type, category, source, description and amount. DT-05 marks the merchant fields as required, but a
system transaction has no merchant, so they hold the zero/space defaults.

**A-16: `orig_ts` and `proc_ts` both hold the processing time, in DB2 timestamp format `YYYY-MM-DD-HH.MM.SS.hh0000`
(UTC).**
The wiki is silent on timestamps for interest transactions. DT-05 makes both required DateTime fields, X(26). As a
result these two fields differ from run to run.

**A-17: `type_cd` is the string `"01"`, `cat_cd` is the integer `5`, and `source` is `"System"`.**
This follows BR-04 and the CONTRACT.md field types (`cat_cd (int)`).

## Account update

**A-18: Every account that has at least one category balance is updated at its change of account:
`currentBalance += totalInterest`, with cycle credit and cycle debit set to 0. This happens even when its total
interest is 0, for example when every category is at a zero rate (ZEROAPR, payment/credit categories). The last
account is updated at end of file.**
BR-06 says "at each change of account … rewrite account" without excluding zero totals. Acceptance scenario 3 says
the cycle totals are reset.

**A-19: Accounts with no category balance are passed through unchanged.**
The wiki only describes updates triggered by a balance. CONTRACT.md asks for "account fields for every account,
after interest".

## Output format

**A-20: Amounts are emitted as JSON strings with exactly two decimals (`"15.01"`, `"-20.01"`). `acct_id`,
`cat_cd` and `merchant_id` are integers. Other strings have trailing spaces removed. Records appear in processing
order for `intcalc_systran.json` and in file order for `intcalc_acctdata.json`.**
CONTRACT.md allows "JSON strings or numbers holding at most two decimals", allows omitting trailing spaces, and
accepts any order.

**A-21: Output is the two files only. The legacy overwrite-versus-append behaviour of the transaction file is
irrelevant here.**
BR-09 says legacy overwrites and FlowX appends. CONTRACT.md defines `intcalc_systran.json` as "every interest
transaction written", i.e. this run's transactions only.
