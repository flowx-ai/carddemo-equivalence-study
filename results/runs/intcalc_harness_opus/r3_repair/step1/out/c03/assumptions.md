# CardDemo interest calculation assumptions

Calculation outcome: FAILED.
Assumption drafting: DRAFTED.
No JSON or Markdown output files were written. Layouts and unresolved legacy behaviour are provisional.

## P01

Assumed: Receive already-decoded file contents in files, not filesystem paths. Treat acctdata.dat and tcatbal.dat as the oracle POSTTRAN outputs. Require acctdata.dat, tcatbal.dat, discgrp.dat and cardxref.dat as strings; accept the other contract files but do not use them in this isolated interest step. Do not rerun POSTTRAN.

Wiki basis: intcalc-opus.pdf p.10 explicitly says an isolated INTCALC candidate “receives the oracle POSTTRAN outputs as its account and category-balance inputs” and lists the contract input files. intcalc-opus.pdf p.2 identifies DISCGRP as the interest-rate reference source. These statements support consuming prepared inputs, but do not specify an in-memory strings interface, the required subset or treatment of other files. Those transport and input-selection choices are provisional.

## P02

Assumed: Use a provisional 300-character account layout in wiki field order: account ID 11, active status 1, current balance 12, credit limit 12, cash credit limit 12, open date 10, expiration date 10, reissue date 10, cycle credit 12, cycle debit 12, ZIP 10, group 10 and ignored filler 178. The supplied excerpts do not provide the copybook offsets.

Wiki basis: intcalc-opus.pdf p.5 describes ACCOUNT-RECORD as “300 bytes” and supplies the first account fields and their logical sizes; intcalc-opus.pdf p.6 continues with cycle credit, cycle debit, ZIP and group. intcalc-opus.pdf p.10 confirms a 300-byte acctdata.dat format but refers to layouts “as in the copybooks.” intcalc-opus.pdf p.11 lists the output account field names, not input offsets. No supplied excerpt establishes the physical offsets or filler, so this sequential character layout remains provisional.

## P03

Assumed: Use a provisional 50-character category layout: account ID 11, type 2, category 4, signed balance 11 and ignored filler 22. The supplied excerpts do not provide the copybook offsets.

Wiki basis: intcalc-opus.pdf p.8 identifies a 50-byte TransactionCategoryBalance record and lists accountId 9(11), typeCode X(2), categoryCode 9(4) and balance S9(9)V99. intcalc-opus.pdf p.10 confirms tcatbal.dat has width 50 and defers layouts to the copybooks. These logical definitions do not supply physical offsets or filler placement; the stated character layout is provisional.

## P04

Assumed: Use a provisional 50-character cross-reference layout: card 16, customer ID 9, account ID 11 and ignored filler 14. The supplied excerpts do not provide the copybook offsets.

Wiki basis: intcalc-opus.pdf p.7 describes CardXref as “50 bytes” and gives cardNumber as 16 characters, customerId as 9 digits and accountId as 11 digits. intcalc-opus.pdf p.10 likewise lists cardxref.dat as width 50 but refers to the unavailable copybook layout. Neither excerpt establishes field offsets or filler placement, so the sequential character layout is provisional.

## P05

Assumed: Use an invented, provisional 50-character disclosure layout: group at positions 1–10, six unsigned digits at positions 11–16 representing a rate with two implied decimal places, and ignored filler 34. The supplied wiki excerpts contain no disclosure copybook layout.

Wiki basis: intcalc-opus.pdf p.2 states that “interest-rate parameters come from the disclosure-group reference data (DISCGRP)” but leaves exact formula and grouping extraction as a TODO. intcalc-opus.pdf p.10 establishes only the 50-byte discgrp.dat record size and copybook reference. Neither excerpt gives disclosure fields, offsets, rate encoding or scale; all stated disclosure layout details are therefore provisional.

## P06

Assumed: Accept ASCII-compatible decoded text containing one exact-width record per line, using LF or CRLF and at most one terminal newline. Monetary fields have two implied decimal places and accept ordinary digits or ASCII zoned final signs {ABCDEFGHI for positive digits 0–9 and }JKLMNOPQR for negative digits 0–9. Do not implement binary packed-decimal or EBCDIC decoding. Right-trim text without left-trimming it.

Wiki basis: intcalc-opus.pdf p.5 defines S9(10)V99 as decimal scale 2. intcalc-opus.pdf p.10 specifies “one record per line, fixed width” and permits strings to omit trailing spaces. intcalc-opus.pdf p.11 permits oracle fixed-width dumps as an alternative output representation. These statements support scale and fixed-width handling, but do not define character encoding, zoned-sign mappings, newline variants, terminal-newline limits, decoding exclusions or left-trim behavior. Those implementation details are provisional.

## P07

Assumed: Interpret each parsed disclosure rate as a decimal fractional multiplier and multiply currentBalance by groupRate directly, without percentage conversion, annualisation, period conversion or day-count division. Allow exactly one record per group and require a group rate for every account, including zero-balance accounts.

Wiki basis: intcalc-opus.pdf p.2 gives “interest = currentBalance × interestRate(groupId)” while explicitly leaving the exact formula and grouping for extraction. intcalc-opus.pdf p.4 repeats “Interest = balance × group rate,” requires the correct rate per group and states that a zero balance produces zero interest. Neither page specifies rate units, conversion factors, duplicate-group handling or whether a zero balance avoids lookup. The direct fractional interpretation and lookup constraints are provisional.

## P08

Assumed: Process every account, including inactive accounts and accounts with signed negative balances. Apply no eligibility filter and no positive-interest-only rule.

Wiki basis: intcalc-opus.pdf p.2 describes computing interest “for each account.” intcalc-opus.pdf p.4 gives balance-times-rate scenarios without an eligibility condition. intcalc-opus.pdf p.5 includes activeStatus and a signed currentBalance field, but assigns no interest eligibility behavior to either. The excerpts do not specify inactive-account exclusions or treatment of negative interest; processing these cases without filtering is provisional.

## P09

Assumed: Compute products using decimal-string integer arithmetic. Round interest once to cents, half away from zero, and then add the rounded amount. Reject overflow rather than clipping or wrapping. Limit account monetary fields to 12 digits of cents and transaction and category monetary fields to 11 digits of cents.

Wiki basis: intcalc-opus.pdf p.2 leaves exact rounding as a TODO, and intcalc-opus.pdf p.4 explicitly says “TODO: confirm rounding mode.” intcalc-opus.pdf p.5 defines account money as S9(10)V99; intcalc-opus.pdf p.8 defines transaction and category money as S9(9)V99. intcalc-opus.pdf p.10 limits output amounts to at most two decimals. The declared precisions support the chosen cent capacities, but the excerpts do not prescribe arithmetic machinery, half-away-from-zero rounding, rounding placement or overflow handling. Those choices are provisional.

## P10

Assumed: Return every account and change only curr_bal. Preserve active status, credit limits, dates, cycle credit, cycle debit, ZIP and group. Use the contract output field names and do not increment cycle totals.

Wiki basis: intcalc-opus.pdf p.2 says interest is “posted to balance and category balance.” intcalc-opus.pdf p.5 and intcalc-opus.pdf p.6 identify the other account attributes, including cycle credit and cycle debit, without directing interest-related updates to them. intcalc-opus.pdf p.11 supplies the contract names, including curr_bal, curr_cyc_credit and curr_cyc_debit. The excerpts do not explicitly define preservation or cycle-total behavior; limiting account changes to curr_bal is provisional.

## P11

Assumed: When rounded interest is zero, leave the account balance unchanged and emit neither an interest transaction nor a new interest-category row.

Wiki basis: intcalc-opus.pdf p.4 states “Account balance 0; Zero interest,” and intcalc-opus.pdf p.2 describes posting calculated interest to account and category balances. intcalc-opus.pdf p.10 requires output fields for “every interest transaction written,” but does not require a transaction for a zero amount. None of these excerpts specifies suppression of zero-rounded transactions or category-row creation, so that suppression policy is provisional.

## P12

Assumed: Post each nonzero rounded interest amount to the account's category type 01, category 0, creating that category row if absent. Preserve other category balances. Return categoryBalances as ancillary records, not as an additional CONTRACT.md output file.

Wiki basis: intcalc-opus.pdf p.2 explicitly requires interest to be “posted to balance and category balance.” intcalc-opus.pdf p.8 defines the category composite key as accountId + typeCode + categoryCode. intcalc-opus.pdf p.10 lists intcalc_systran.json and intcalc_acctdata.json as outputs, without naming a category-balance output file. The excerpts do not identify the interest category, row-creation rules, preservation behavior or an ancillary return channel. These posting and return details are provisional.

## P13

Assumed: Sort accounts numerically by account ID. Form each interest transaction ID from the ten-digit INTCALC parameter followed by a six-digit emitted-transaction sequence beginning at 000001. Fail if more than 999999 transactions would be emitted. Rerunning identical input reproduces records rather than consulting or maintaining an idempotency ledger.

Wiki basis: intcalc-opus.pdf p.2 describes interest computation and posting but supplies no sequencing or rerun rules. intcalc-opus.pdf p.10 supplies INTCALC parameter 2022071800 and allows output objects “in any order.” It does not prescribe sorting, transaction-ID construction, sequence exhaustion or idempotency tracking. The deterministic ordering, ID scheme, limit and rerun behavior are provisional.

## P14

Assumed: Populate interest transactions with type_cd 01, cat_cd 0, source INTCALC, desc Interest, the signed rounded interest as amt, merchant_id 0, and empty merchant_name, merchant_city and merchant_zip. The wiki does not supply these transaction metadata defaults.

Wiki basis: intcalc-opus.pdf p.2 establishes the purpose of interest posting but gives no transaction metadata values. intcalc-opus.pdf p.8 defines transaction field types, including signed amount and merchant fields. intcalc-opus.pdf p.10 gives the corresponding contract field names. Neither field definition nor contract naming establishes interest-specific codes, labels or merchant defaults, so the stated metadata population is provisional.

## P15

Assumed: For an account, select the lexically smallest card string in cardxref.dat. Permit multiple mappings. If the account has no mapping, use an empty card_num rather than suppressing interest.

Wiki basis: intcalc-opus.pdf p.7 says CardXref “Links card ↔ customer ↔ account” and has an alternate index on accountId. intcalc-opus.pdf p.10 includes cardxref.dat as an input and card_num as a transaction output field. These excerpts do not specify account-to-card cardinality, selection among several cards or behavior when an account lacks a mapping. The lexical selection, multiple-mapping acceptance and empty-card fallback are provisional.

## P16

Assumed: Default businessDate to 2022-07-18 and intcalcParameter to 2022071800 only when omitted. Set both transaction timestamps to the chosen business date followed by a separating space and 00:00:00.000000, without using the runtime clock. Preserve existing account dates as ISO dates and allow a blank optional reissue date.

Wiki basis: intcalc-opus.pdf p.10 lists “business date 2022-07-18, INTCALC parameter 2022071800,” but does not state omission/default semantics. intcalc-opus.pdf p.5 identifies account date fields and date/timestamp conversions; intcalc-opus.pdf p.6 continues the account schema without adding timestamp behavior. intcalc-opus.pdf p.8 defines originTimestamp and processTimestamp as X(26). The excerpts do not specify midnight values, equal timestamps, clock avoidance, ISO preservation or blank reissue-date acceptance. These date and default behaviors are provisional.

## P17

Assumed: Validate Gregorian dates, a ten-digit run parameter, required file strings, exact widths, ASCII characters, digit fields, amount ranges, nonblank category type, duplicate account/category/group keys, and category/card references to existing accounts. Any invalid input fails the entire calculation with errors and empty output lists, without partial posting or a reject file. Empty files are valid. Missing group rates fail even when the associated balance is zero. The supplied calculation remains FAILED with the reported error 'Card cross-reference refers to a missing account' and empty output lists.

Wiki basis: intcalc-opus.pdf p.5 supplies account keys, numeric sizes and date types; intcalc-opus.pdf p.8 supplies the category composite key and field types. intcalc-opus.pdf p.2 makes the group rate a calculation dependency. intcalc-opus.pdf p.10 specifies fixed widths and run parameters but states, “The contract fixes formats only. It says nothing about behaviour.” intcalc-opus.pdf p.11 supplies output fields and optional uncertainty reporting, not validation outcomes. The excerpts do not define the full validation suite, duplicate/reference handling, empty-file acceptance, zero-balance lookup requirement or atomic failure response. Those choices are provisional; documenting them does not change the supplied failed outcome.

## P18

Assumed: Return records and assumptions without writing JSON or Markdown files, scheduling work, persisting state or mutating input. Keep financial results and policy choices deterministic. Use a model to compose explanatory assumptions from the choices and wiki excerpts only, not from account data. If that explanatory output fails or lacks complete policy/citation coverage, retain the complete canonical choices and source excerpts with assumptionsStatus FALLBACK and a warning; do not discard valid financial results. This explanatory fallback does not turn the supplied FAILED calculation into a successful one.

Wiki basis: intcalc-opus.pdf p.2 describes a periodic interest pipeline but does not prescribe scheduling, persistence or explanatory-model integration. intcalc-opus.pdf p.10 describes JSON-file outputs, whereas intcalc-opus.pdf p.11 permits oracle fixed-width dumps and mentions optional flags.json for uncertainties. Neither excerpt specifies an in-memory-only return, input immutability, deterministic explanations, model data boundaries or an assumptionsStatus FALLBACK mechanism. These execution and explanation-output limitations are provisional interface choices rather than established wiki behavior, and they provide no basis for changing a failed financial outcome.
