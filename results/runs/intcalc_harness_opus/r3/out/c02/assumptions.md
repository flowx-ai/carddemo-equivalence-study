# CardDemo interest calculation assumptions

Calculation outcome: FAILED.
Assumption drafting: DRAFTED.
No JSON or Markdown output files were written. Layouts and unresolved legacy behaviour are provisional.

## P01

Assumed: Receive already-decoded file contents in files, not filesystem paths. Treat acctdata.dat and tcatbal.dat as the oracle POSTTRAN outputs. Require acctdata.dat, tcatbal.dat, discgrp.dat and cardxref.dat to be strings; accept the other contract files but do not use them in this isolated interest step. Do not rerun POSTTRAN.

Wiki basis: The wiki states that an INTCALC candidate "receives the oracle POSTTRAN outputs as its account and category-balance inputs" (intcalc-opus.pdf p.10), supporting step isolation without rerunning POSTTRAN. DISCGRP supplies the interest-rate parameters (intcalc-opus.pdf p.2). The excerpts list contract inputs but do not specify an in-memory files transport, a required-string subset or handling of unused files; those interface choices are provisional.

## P02

Assumed: Use a provisional 300-character account layout in wiki field order: account ID 11, active status 1, current balance 12, credit limit 12, cash credit limit 12, open date 10, expiration date 10, reissue date 10, cycle credit 12, cycle debit 12, ZIP 10, group 10 and ignored filler 178. The copybook offsets are not supplied.

Wiki basis: The account definition identifies a "300 bytes" record and gives the initial field types and lengths (intcalc-opus.pdf p.5); the continuation supplies cycle totals, ZIP and group fields (intcalc-opus.pdf p.6). The contract confirms acctdata.dat has width 300 and refers to "layouts as in the copybooks" (intcalc-opus.pdf p.10), while the output account field list confirms the corresponding names (intcalc-opus.pdf p.11). None of these excerpts supplies copybook offsets, physical signed-number encoding or filler placement. The sequential character layout and filler allocation are therefore provisional.

## P03

Assumed: Use a provisional 50-character category-balance layout: account ID 11, type 2, category 4, signed balance 11 and ignored filler 22. The copybook offsets are not supplied.

Wiki basis: The wiki identifies TransactionCategoryBalance as a "50 bytes" record, lists accountId 9(11), typeCode X(2), categoryCode 9(4) and balance S9(9)V99, and names its composite key (intcalc-opus.pdf p.8). The contract also specifies tcatbal.dat width 50 but defers layouts to copybooks (intcalc-opus.pdf p.10). Actual offsets, physical sign representation and filler placement are absent, so this sequential character layout is provisional.

## P04

Assumed: Use a provisional 50-character cross-reference layout: card 16, customer ID 9, account ID 11 and ignored filler 14. The copybook offsets are not supplied.

Wiki basis: CardXref is described as a "50 bytes" record linking card, customer and account, with field lengths 16, 9 and 11 respectively (intcalc-opus.pdf p.7). The contract confirms cardxref.dat width 50 and refers to copybook layouts (intcalc-opus.pdf p.10). The supplied excerpts do not establish physical offsets or filler placement, making the chosen sequential layout provisional.

## P05

Assumed: Use an invented, provisional 50-character disclosure layout: group at positions 1–10, six unsigned digits at positions 11–16 representing a rate with two implied decimal places, and ignored filler 34. The supplied wiki contains no disclosure copybook layout.

Wiki basis: The wiki identifies DISCGRP as the source of "interest-rate parameters" but leaves exact formula and grouping extraction as a TODO (intcalc-opus.pdf p.2). The contract specifies discgrp.dat CVTRA02Y width 50 without providing its fields (intcalc-opus.pdf p.10). Group width, rate position, digit count, decimal scale and filler are all absent from the evidence; this entire field layout is therefore provisional rather than a verified copybook interpretation.

## P06

Assumed: Accept ASCII-compatible decoded text with one exact-width record per line, LF or CRLF line endings and at most one terminal newline. Monetary fields have two implied decimal places and accept ordinary digits or ASCII zoned final signs {ABCDEFGHI for positive digits 0–9 and }JKLMNOPQR for negative digits 0–9. Do not implement binary packed-decimal or EBCDIC decoding. Right-trim text, but do not left-trim it.

Wiki basis: The conversion note specifies monetary "decimal, scale 2" (intcalc-opus.pdf p.5). The contract requires "one record per line, fixed width" and permits strings to omit trailing spaces (intcalc-opus.pdf p.10); the alternative fixed-width dumps mentioned in intcalc-opus.pdf p.11 do not add encoding details. ASCII transport, line-ending and terminal-newline rules, zoned-sign mappings, exclusion of binary/EBCDIC decoding and preservation of leading spaces are not specified. These encoding and parsing choices are provisional.

## P07

Assumed: Interpret each parsed disclosure rate as a decimal fractional multiplier and multiply currentBalance by groupRate directly, without percentage conversion, annualisation, period conversion or day-count division. Allow exactly one record per group and require every account to have its group rate, including zero-balance accounts.

Wiki basis: The rule states "interest = currentBalance × interestRate(groupId)" but also includes a TODO for the exact formula and grouping (intcalc-opus.pdf p.2). The scenarios repeat "Interest = balance × group rate", require the correct rate per group and state that a zero balance gives zero interest (intcalc-opus.pdf p.4). Neither excerpt defines stored rate units, conversion factors, duplicate-group handling or whether zero balances bypass rate lookup. Direct fractional interpretation, uniqueness and mandatory lookup are therefore provisional.

## P08

Assumed: Process every account, including inactive accounts and accounts with signed negative balances. Apply no eligibility filter and no positive-interest-only rule.

Wiki basis: The business description says interest is computed "for each account" (intcalc-opus.pdf p.2), and the scenarios describe balance-based calculation without an eligibility restriction (intcalc-opus.pdf p.4). Account data includes activeStatus and a signed currentBalance field (intcalc-opus.pdf p.5), but no excerpt explains how activity status or negative balances affect eligibility. Including both without a filter is therefore a provisional interpretation, not an established eligibility rule.

## P09

Assumed: Compute products using decimal-string integer arithmetic. Round interest once to cents, half away from zero, then add that rounded amount. Reject overflow instead of clipping or wrapping. Limit account monetary values to 12 digits of cents and transaction and category monetary values to 11 digits of cents.

Wiki basis: The posting formula leaves rounding extraction unfinished (intcalc-opus.pdf p.2), and the boundary scenario explicitly says "TODO: confirm rounding mode" (intcalc-opus.pdf p.4). Account S9(10)V99 fields support a 12-digit cents capacity (intcalc-opus.pdf p.5), while transaction and category S9(9)V99 fields support 11 digits (intcalc-opus.pdf p.8). Output amounts may hold "at most two decimals" (intcalc-opus.pdf p.10). The arithmetic method, half-away-from-zero mode, single rounding point and overflow response are not specified and remain provisional.

## P10

Assumed: Return every account and change only curr_bal. Preserve active status, credit limits, dates, cycle credit, cycle debit, ZIP and group, using the contract field names. Do not increment cycle totals.

Wiki basis: Interest is to be "posted to balance and category balance" (intcalc-opus.pdf p.2). The account definitions distinguish current balance from status, limits and dates (intcalc-opus.pdf p.5), and separately list cycle credit, cycle debit, ZIP and group (intcalc-opus.pdf p.6). The output field names are supplied in intcalc-opus.pdf p.11. No excerpt directs changes to these other fields or cycle totals, so preserving them and restricting account mutation to curr_bal are provisional posting choices.

## P11

Assumed: When rounded interest is zero, leave the account balance unchanged and emit neither an interest transaction nor a new interest-category row.

Wiki basis: The scenario "Account balance 0; Zero interest" supports a zero monetary result (intcalc-opus.pdf p.4), and the general rule posts calculated interest to balances (intcalc-opus.pdf p.2). The contract describes transaction output as fields for "every interest transaction written" but does not require a transaction for a zero amount (intcalc-opus.pdf p.10). No excerpt specifies zero-rounded transaction or category-row creation, so suppressing those records is provisional.

## P12

Assumed: Post each nonzero rounded interest amount to the account's category type 01, category 0, creating the category row if absent. Preserve other category balances. Return categoryBalances as ancillary records rather than as an additional CONTRACT.md output file.

Wiki basis: The rule explicitly requires posting interest to "balance and category balance" (intcalc-opus.pdf p.2). The category schema defines the accountId + typeCode + categoryCode composite key and a signed balance (intcalc-opus.pdf p.8). The contract lists account and interest-transaction outputs but no separate categoryBalances output file (intcalc-opus.pdf p.10). The destination codes, row-creation rule, preservation of other categories and ancillary return mechanism are unspecified and therefore provisional.

## P13

Assumed: Sort accounts numerically by account ID. Generate interest transaction IDs by concatenating the ten-digit INTCALC parameter with a six-digit emitted-transaction sequence starting at 000001, and fail if more than 999999 transactions would be emitted. Rerunning identical input reproduces records rather than consulting an idempotency ledger.

Wiki basis: The contract supplies INTCALC parameter 2022071800, includes tran_id among output fields and permits output objects "in any order" (intcalc-opus.pdf p.10). The interest rule does not describe transaction numbering or rerun handling (intcalc-opus.pdf p.2). Numeric sorting, concatenated IDs, sequence start and ceiling, and the absence of an idempotency ledger are not specified; they are provisional deterministic implementation choices.

## P14

Assumed: Populate interest transactions with type_cd 01, cat_cd 0, source INTCALC, desc Interest, signed rounded amt, merchant_id 0 and empty merchant_name, merchant_city and merchant_zip. The wiki does not supply these transaction metadata defaults.

Wiki basis: The business rule establishes the interest amount and posting purpose but supplies no transaction metadata values (intcalc-opus.pdf p.2). The transaction schema defines code, source, description, amount and merchant field types (intcalc-opus.pdf p.8), and the contract gives their output names (intcalc-opus.pdf p.10). These schemas support the fields, not the selected codes, labels or empty merchant values; those defaults are provisional.

## P15

Assumed: Select the lexically smallest card string in cardxref.dat for each account. Permit multiple mappings. If an account has no mapping, use an empty card_num instead of suppressing interest.

Wiki basis: CardXref "Links card ↔ customer ↔ account" and has an alternate index on accountId (intcalc-opus.pdf p.7), while card_num is a transaction output field (intcalc-opus.pdf p.10). The excerpts do not define account-level mapping cardinality, a preferred-card rule or missing-mapping behaviour. Allowing multiple mappings, selecting the lexical minimum and using an empty card without suppressing interest are therefore provisional.

## P16

Assumed: Default businessDate to 2022-07-18 and intcalcParameter to 2022071800 only when omitted. Set both transaction timestamps to the chosen business date followed by a space and 00:00:00.000000, without using the runtime clock. Preserve existing account dates as ISO dates and allow a blank optional reissue date.

Wiki basis: The contract lists "business date 2022-07-18" and "INTCALC parameter 2022071800" but does not define omission-only defaulting or timestamp derivation (intcalc-opus.pdf p.10). Account dates are X(10) date fields (intcalc-opus.pdf p.5); the account continuation supplies no additional date rules (intcalc-opus.pdf p.6). Transaction timestamps are X(26) fields (intcalc-opus.pdf p.8). ISO preservation, blank reissue acceptance, equal midnight timestamps, the separating space and exclusion of the runtime clock are unspecified and provisional.

## P17

Assumed: Validate Gregorian dates, the ten-digit run parameter, required file strings, exact widths, ASCII characters, digit fields, amount ranges, nonblank category type, duplicate account/category/group keys and category/card references to existing accounts. Invalid input fails the entire calculation with errors and empty output lists, without partial posting or a reject file. Empty files are valid. Missing group rates fail even when the associated balance is zero.

Wiki basis: Account keys, numeric types and date types provide structural validation evidence (intcalc-opus.pdf p.5); category composite keys and monetary types provide further constraints (intcalc-opus.pdf p.8). Fixed widths and run parameter examples appear in intcalc-opus.pdf p.10, and account output fields and optional uncertainty flags appear in intcalc-opus.pdf p.11. Group-rate lookup follows the formula in intcalc-opus.pdf p.2. The excerpts do not prescribe the complete validation set, Gregorian checks, reference checks, group uniqueness, empty-file acceptance, zero-balance lookup or atomic failure/reject-file handling; those choices are provisional. The supplied calculation outcome remains FAILED with error "Duplicate disclosure group" and empty output lists; documenting these policies does not change that outcome.

## P18

Assumed: Return records and assumptions without writing JSON or Markdown files, scheduling, persistence or input mutation. Keep financial results and policy choices deterministic. Have the model compose explanatory assumptions only from the supplied choices and wiki excerpts, not account data. If that explanatory output fails or lacks complete policy or citation coverage, retain the complete canonical choices and source excerpts with assumptionsStatus FALLBACK and a warning; do not discard valid financial results.

Wiki basis: The wiki describes a "Periodic pipeline" but does not specify scheduling or persistence for this interface (intcalc-opus.pdf p.2). The contract describes "one JSON file per output" (intcalc-opus.pdf p.10), and permits alternative fixed-width dumps and optional uncertainty flags (intcalc-opus.pdf p.11). It does not define an in-memory-only return, input immutability, deterministic execution, model evidence restrictions or an assumptionsStatus FALLBACK mechanism. Those transport and explanatory-output limitations are provisional interface choices, not claims that contract files were written. Preserving valid results on explanatory failure does not convert the supplied FAILED calculation into a successful one.
