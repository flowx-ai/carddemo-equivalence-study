# CardDemo interest calculation assumptions

Calculation outcome: FAILED.
Assumption drafting: DRAFTED.
No JSON or Markdown output files were written. Layouts and unresolved legacy behaviour are provisional.

## P01

Assumed: Receive already-decoded file contents in files, not filesystem paths. Treat acctdata.dat and tcatbal.dat as the oracle POSTTRAN outputs. Require acctdata.dat, tcatbal.dat, discgrp.dat and cardxref.dat to be strings; accept the other contract files but do not use them in this isolated interest step. Do not rerun POSTTRAN.

Wiki basis: intcalc-opus.pdf p.10 states that an INTCALC candidate "receives the oracle POSTTRAN outputs as its account and category-balance inputs," supporting step isolation rather than rerunning POSTTRAN. intcalc-opus.pdf p.2 identifies DISCGRP as the source of interest-rate parameters. The excerpts do not define an in-memory files interface, a required-string validation rule or which remaining files must be unused; those interface and file-selection choices are provisional.

## P02

Assumed: Use a provisional 300-character account layout in wiki order: account ID 11, active status 1, current balance 12, credit limit 12, cash credit limit 12, open date 10, expiration date 10, reissue date 10, cycle credit 12, cycle debit 12, ZIP 10, group 10 and ignored filler 178. The copybook offsets are not supplied.

Wiki basis: intcalc-opus.pdf p.5 describes the account record as "300 bytes" and lists the initial fields and their types. intcalc-opus.pdf p.6 continues the field list with cycle credit, cycle debit, ZIP and group. intcalc-opus.pdf p.10 specifies acctdata.dat as CVACT01Y 300 with "layouts as in the copybooks," while intcalc-opus.pdf p.11 supplies output field names rather than input offsets. These excerpts do not supply the copybook offsets or filler layout, so the stated character layout and placement remain provisional.

## P03

Assumed: Use a provisional 50-character category layout: account ID 11, type 2, category 4, signed balance 11 and ignored filler 22. The copybook offsets are not supplied.

Wiki basis: intcalc-opus.pdf p.8 describes a 50-byte TransactionCategoryBalance record and lists "accountId 9(11), typeCode X(2), categoryCode 9(4), balance S9(9)V99." intcalc-opus.pdf p.10 specifies tcatbal.dat CVTRA01Y 50 and refers to copybook layouts. Neither excerpt supplies offsets, a physical sign encoding or filler placement; the stated sequential character layout is therefore provisional.

## P04

Assumed: Use a provisional 50-character cross-reference layout: card 16, customer ID 9, account ID 11 and ignored filler 14. The copybook offsets are not supplied.

Wiki basis: intcalc-opus.pdf p.7 describes CardXref as "50 bytes" and gives cardNumber as 16 characters, customerId as 9 digits and accountId as 11 digits. intcalc-opus.pdf p.10 lists cardxref.dat CVACT03Y 50 but delegates its layout to the copybook. Exact offsets and filler placement are absent, making this sequential character layout provisional.

## P05

Assumed: Use an invented, provisional 50-character disclosure layout: group at positions 1–10, six unsigned digits at positions 11–16 representing a rate with two implied decimal places, and ignored filler 34. The supplied wiki contains no disclosure copybook layout.

Wiki basis: intcalc-opus.pdf p.2 says that "interest-rate parameters come from the disclosure-group reference data (DISCGRP)," establishing the reference data's purpose. intcalc-opus.pdf p.10 specifies only discgrp.dat CVTRA02Y 50 and refers to copybooks. Neither excerpt supplies disclosure fields, offsets, rate encoding or decimal scale; consequently the entire stated disclosure layout is provisional, not a documented copybook layout.

## P06

Assumed: Accept ASCII-compatible decoded text with one exact-width record per line, LF or CRLF line endings and at most one terminal newline. Monetary fields have two implied decimal places and accept ordinary digits or ASCII zoned final signs {ABCDEFGHI for positive digits 0–9 and }JKLMNOPQR for negative digits 0–9. Do not implement binary packed-decimal or EBCDIC decoding. Right-trim text without left-trimming it.

Wiki basis: intcalc-opus.pdf p.5 maps S9(10)V99 to "decimal, scale 2," supporting two-decimal monetary interpretation. intcalc-opus.pdf p.10 requires "one record per line, fixed width" and permits strings to omit trailing spaces; intcalc-opus.pdf p.11 also allows oracle fixed-width dumps as an alternative output. The excerpts do not specify ASCII, zoned-sign mappings, line-ending variants, terminal-newline limits, packed-decimal or EBCDIC handling, or left-trimming behaviour. Those encoding, transport and trimming details are provisional.

## P07

Assumed: Interpret each parsed disclosure rate as a decimal fractional multiplier and calculate currentBalance times groupRate directly, without percentage conversion, annualisation, period conversion or day-count division. Allow exactly one record per group and require every account to have its group rate, including zero-balance accounts.

Wiki basis: intcalc-opus.pdf p.2 gives "interest = currentBalance × interestRate(groupId)" but leaves exact formula and grouping extraction as a TODO. intcalc-opus.pdf p.4 repeats "Interest = balance × group rate," calls for the correct rate per group and states that a zero balance produces zero interest. Neither excerpt defines rate units, conversion periods, duplicate-group handling or whether zero-balance accounts may skip rate lookup. Direct fractional-rate interpretation, uniqueness and mandatory lookup are therefore provisional.

## P08

Assumed: Process every account, including inactive accounts and accounts with signed negative balances. Apply neither an eligibility filter nor a positive-interest-only rule.

Wiki basis: intcalc-opus.pdf p.2 describes computing interest "for each account." intcalc-opus.pdf p.5 lists activeStatus and a signed currentBalance but supplies no eligibility rule based on either. intcalc-opus.pdf p.4 discusses zero balances and different groups without defining inactive-account or negative-balance exclusions. Processing all accounts is consistent with that broad scope, but the specific inclusion of inactive and negative-balance accounts and the absence of a positive-interest-only restriction remain provisional because those cases are not specified.

## P09

Assumed: Compute products using decimal-string integer arithmetic. Round interest once to cents, half away from zero, then add the rounded amount. Reject overflow instead of clipping or wrapping. Limit account monetary values to 12 digits of cents and transaction and category monetary values to 11 digits of cents.

Wiki basis: intcalc-opus.pdf p.2 leaves exact rounding as a TODO, and intcalc-opus.pdf p.4 explicitly says "TODO: confirm rounding mode." intcalc-opus.pdf p.5 defines account money as S9(10)V99, while intcalc-opus.pdf p.8 defines transaction and category money as S9(9)V99; these types support the respective 12- and 11-digit cent capacities. intcalc-opus.pdf p.10 permits output amounts with "at most two decimals." The excerpts do not establish arithmetic machinery, half-away-from-zero rounding, rounding order or overflow handling, so those implementation details are provisional.

## P10

Assumed: Return every account using the contract field names and change only curr_bal. Preserve active status, credit limits, dates, cycle credit, cycle debit, ZIP and group. Do not increment cycle totals.

Wiki basis: intcalc-opus.pdf p.2 says interest is "posted to balance and category balance," identifying the account balance as a posting target. intcalc-opus.pdf p.5 and intcalc-opus.pdf p.6 list the other account fields, including cycle totals, without directing that interest alter them. intcalc-opus.pdf p.11 supplies the contract names, including curr_bal, curr_cyc_credit and curr_cyc_debit. Preservation of all other fields and the decision not to increment cycle totals are provisional because the excerpts do not define those update effects.

## P11

Assumed: When rounded interest is zero, leave the account balance unchanged and emit neither an interest transaction nor a new interest-category row.

Wiki basis: intcalc-opus.pdf p.4 states "Account balance 0; Zero interest," and the formula in intcalc-opus.pdf p.2 supports no balance change when the interest amount is zero. intcalc-opus.pdf p.10 requires transaction fields for "every interest transaction written" but does not say whether zero-valued interest must produce a transaction. The excerpts also do not address amounts that become zero through rounding or category-row creation for zero interest. Suppressing those transactions and new rows is therefore provisional.

## P12

Assumed: Post every nonzero rounded interest amount to the account's category type 01, category 0, creating that category row if it is absent. Preserve all other category balances. Return categoryBalances as ancillary records, not as an additional CONTRACT.md output file.

Wiki basis: intcalc-opus.pdf p.2 requires interest to be "posted to balance and category balance." intcalc-opus.pdf p.8 identifies the category composite key as "accountId + typeCode + categoryCode," supporting an account-specific category posting. intcalc-opus.pdf p.10 names only intcalc_systran.json and intcalc_acctdata.json as interest-step outputs. The excerpts do not identify the interest category codes, define row creation or preservation rules, or specify an ancillary categoryBalances return value; those choices are provisional.

## P13

Assumed: Sort accounts numerically by account ID. Construct interest transaction IDs by concatenating the ten-digit INTCALC parameter with a six-digit emitted-transaction sequence starting at 000001, and fail if more than 999999 transactions would be emitted. Rerunning identical input reproduces the records rather than consulting or maintaining an idempotency ledger.

Wiki basis: intcalc-opus.pdf p.10 supplies "INTCALC parameter 2022071800" and allows output objects "in any order," leaving room for a deterministic numeric ordering without requiring it. intcalc-opus.pdf p.2 defines interest computation and posting but does not define transaction sequencing or rerun handling. Neither excerpt specifies ID construction, a sequence ceiling or an idempotency mechanism. These ordering, identifier, failure and rerun choices are provisional.

## P14

Assumed: Populate interest transactions with type_cd 01, cat_cd 0, source INTCALC, desc Interest, the signed rounded interest amount as amt, merchant_id 0, and empty merchant_name, merchant_city and merchant_zip. These transaction metadata defaults are not supplied by the wiki.

Wiki basis: intcalc-opus.pdf p.2 establishes the interest-posting purpose. intcalc-opus.pdf p.8 defines transaction field types, including a signed amount, and intcalc-opus.pdf p.10 gives the contract names type_cd, cat_cd, source, desc, amt and the merchant fields. Neither excerpt prescribes interest-specific codes, labels or merchant defaults. The stated metadata population is therefore provisional rather than documented transaction behaviour.

## P15

Assumed: For each account, select the lexically smallest card string in cardxref.dat. Permit multiple mappings. If no mapping exists, use an empty card_num rather than suppressing interest.

Wiki basis: intcalc-opus.pdf p.7 says CardXref "Links card ↔ customer ↔ account" and provides an alternate index on accountId, supporting its use to find an account's card. intcalc-opus.pdf p.10 includes card_num in the transaction output fields. The excerpts do not specify how to choose among multiple mappings or what to do when a mapping is absent. Lexical selection, permitting multiple mappings and emitting an empty card number without suppressing interest are provisional.

## P16

Assumed: Default businessDate to 2022-07-18 and intcalcParameter to 2022071800 only when omitted. Set both transaction timestamps to the chosen business date followed by a space and 00:00:00.000000; do not use the runtime clock. Preserve existing account dates as ISO dates and allow a blank optional reissue date.

Wiki basis: intcalc-opus.pdf p.10 supplies the business date and INTCALC parameter values but does not define omission-only defaulting. intcalc-opus.pdf p.5 identifies account dates as X(10) date fields, and intcalc-opus.pdf p.8 defines both transaction timestamps as X(26). intcalc-opus.pdf p.6 continues the account fields without adding date-update rules. The excerpts do not specify ISO rendering, midnight timestamps, equality of the timestamps, runtime-clock exclusion or an optional blank reissue date; those date-handling decisions are provisional.

## P17

Assumed: Validate Gregorian dates, the ten-digit run parameter, required file strings, exact record widths, ASCII characters, digit fields, amount ranges, nonblank category type, duplicate account/category/group keys, and category/card references to existing accounts. Invalid input fails the entire calculation with errors and empty output lists; produce neither partial postings nor a reject file. Empty files are valid. Missing group rates cause failure even when the associated balance is zero.

Wiki basis: intcalc-opus.pdf p.5 provides account key, numeric and date types; intcalc-opus.pdf p.8 provides the category composite key and numeric field definitions. intcalc-opus.pdf p.10 specifies fixed-width line records and run parameters, while intcalc-opus.pdf p.11 defines output account fields without an error protocol. intcalc-opus.pdf p.2 requires a group rate for its formula but does not define missing-rate handling. The excerpts do not specify the full validation regime, referential checks, empty-file acceptance, atomic failure, reject-file policy or zero-balance lookup failure; these are provisional. The supplied calculation remains FAILED with the reported error "Account has no disclosure-group rate" and empty output lists; documenting the policy does not change that outcome.

## P18

Assumed: Return records and assumptions without writing JSON or Markdown files, scheduling work, persisting state or mutating input. Keep financial results and policy choices deterministic. Have a model compose explanatory assumptions only from the implementation choices and wiki excerpts, not account data. If that explanatory output fails or has incomplete policy or citation coverage, retain the complete canonical choices and source excerpts with assumptionsStatus FALLBACK and a warning; do not discard valid financial results.

Wiki basis: intcalc-opus.pdf p.10 describes "one JSON file per output," and intcalc-opus.pdf p.11 permits oracle fixed-width dumps and optional uncertainty flags. Neither specifies this return-only transport, persistence limitations, model-generated explanations or fallback handling. intcalc-opus.pdf p.2 describes financial computation and posting but provides no model-dependent control over results. The stated non-writing interface, determinism and explanatory fallback are provisional implementation boundaries, not documented file-output behaviour. Retaining valid results on an explanation failure does not convert the supplied FAILED calculation into a successful one.
