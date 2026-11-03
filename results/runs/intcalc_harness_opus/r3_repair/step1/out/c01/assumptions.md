# CardDemo interest calculation assumptions

Calculation outcome: FAILED.
Assumption drafting: DRAFTED.
No JSON or Markdown output files were written. Layouts and unresolved legacy behaviour are provisional.

## P01

Assumed: Receive already-decoded file contents in files, not filesystem paths. Treat acctdata.dat and tcatbal.dat as the oracle POSTTRAN outputs. Require acctdata.dat, tcatbal.dat, discgrp.dat and cardxref.dat to be strings; accept the other contract files but leave them unused in this isolated interest step. Do not rerun POSTTRAN.

Wiki basis: The interest step depends on account balances and DISCGRP reference data according to intcalc-opus.pdf p.2. Step isolation is explicit in intcalc-opus.pdf p.10: the candidate "receives the oracle POSTTRAN outputs as its account and category-balance inputs," supporting use of those outputs without rerunning POSTTRAN. That page lists the input files but does not define an API transport, required string arguments or which other files may be ignored. Those transport and required-input choices are provisional.

## P02

Assumed: Use a provisional 300-character account layout, in wiki order: account ID 11, active status 1, current balance 12, credit limit 12, cash credit limit 12, open date 10, expiration date 10, reissue date 10, cycle credit 12, cycle debit 12, ZIP 10, group 10 and ignored filler 178. The copybook offsets are not supplied.

Wiki basis: intcalc-opus.pdf p.5 identifies the account record as "300 bytes" and supplies the initial field order and logical sizes; intcalc-opus.pdf p.6 supplies the remaining cycle, ZIP and group fields. intcalc-opus.pdf p.10 confirms acctdata.dat has width 300 but requires "layouts as in the copybooks." intcalc-opus.pdf p.11 supplies output field names, not physical offsets. The supplied excerpts contain no copybook offsets, physical sign-storage specification or filler layout, so the contiguous character layout and filler allocation remain provisional.

## P03

Assumed: Use a provisional 50-character category layout: account ID 11, type 2, category 4, signed balance 11 and ignored filler 22. The copybook offsets are not supplied.

Wiki basis: intcalc-opus.pdf p.8 identifies a 50-byte TransactionCategoryBalance record and lists "accountId 9(11), typeCode X(2), categoryCode 9(4), balance S9(9)V99." intcalc-opus.pdf p.10 confirms tcatbal.dat has width 50 and refers to copybook layouts. Neither excerpt supplies physical offsets, sign storage or filler placement; consequently this contiguous character layout is provisional.

## P04

Assumed: Use a provisional 50-character cross-reference layout: card 16, customer ID 9, account ID 11 and ignored filler 14. The copybook offsets are not supplied.

Wiki basis: intcalc-opus.pdf p.7 describes CardXref as "50 bytes" and gives a 16-character card number, nine-digit customer ID and eleven-digit account ID. intcalc-opus.pdf p.10 confirms cardxref.dat has width 50 but refers to the copybook for its layout. The supplied excerpts do not establish physical offsets or filler placement, so this contiguous field arrangement remains provisional.

## P05

Assumed: Use an invented, provisional 50-character disclosure layout: group at positions 1–10, six unsigned digits at positions 11–16 representing a rate with two implied decimal places, and ignored filler 34. The supplied wiki contains no disclosure copybook layout.

Wiki basis: intcalc-opus.pdf p.2 states that "interest-rate parameters come from the disclosure-group reference data (DISCGRP)," establishing its role but not its encoding. intcalc-opus.pdf p.10 lists "discgrp.dat CVTRA02Y 50" without supplying the referenced copybook. Neither excerpt gives group offsets, rate width, sign, decimal scale or filler. The entire selected disclosure layout is therefore provisional, not a verified source layout.

## P06

Assumed: Accept ASCII-compatible decoded text with one exact-width record per line, LF or CRLF line endings and at most one terminal newline. Monetary fields have two implied decimal places and accept ordinary digits or ASCII zoned final signs {ABCDEFGHI for positive digits 0–9 and }JKLMNOPQR for negative digits 0–9. Do not implement binary packed-decimal or EBCDIC decoding. Right-trim text but do not left-trim it.

Wiki basis: intcalc-opus.pdf p.5 describes monetary conversion as "decimal, scale 2," but does not define physical numeric encoding. intcalc-opus.pdf p.10 specifies "one record per line, fixed width" and allows strings to "omit trailing spaces," supporting line-oriented input and trailing-space removal. intcalc-opus.pdf p.11 lists account output fields and permits fixed-width dumps but adds no encoding rules. ASCII, zoned-sign mappings, accepted line endings, terminal-newline limits, left-space preservation and excluded decoders are not specified in the excerpts; those choices are provisional.

## P07

Assumed: Interpret each parsed disclosure rate as a decimal fractional multiplier and calculate currentBalance times groupRate directly, without percentage conversion, annualisation, period conversion or day-count division. Allow exactly one record per group and require a group rate for every account, including zero-balance accounts.

Wiki basis: intcalc-opus.pdf p.2 gives "interest = currentBalance × interestRate(groupId)" while marking the exact formula and grouping as a TODO. intcalc-opus.pdf p.4 similarly gives "Interest = balance × group rate," requires the correct rate per group and states that a zero balance yields zero interest. These statements support group-based multiplication but do not establish rate units, conversion conventions, duplicate-group handling or whether zero balances bypass rate lookup. Those interpretation and lookup rules are provisional.

## P08

Assumed: Process every account, including inactive accounts and accounts with signed negative balances. Apply neither an eligibility filter nor a positive-interest-only rule.

Wiki basis: intcalc-opus.pdf p.2 describes computing interest "for each account." intcalc-opus.pdf p.4 includes a zero-balance scenario but supplies no eligibility or sign restriction. intcalc-opus.pdf p.5 includes activeStatus and a signed currentBalance field without defining either as an interest eligibility condition. Processing inactive and negative-balance accounts without filtering is therefore a provisional interpretation of the broad account population.

## P09

Assumed: Compute products using decimal-string integer arithmetic. Round interest once to cents, half away from zero, and then add that rounded amount. Reject overflow rather than clipping or wrapping. Limit account monetary values to 12 digits of cents and transaction and category monetary values to 11 digits of cents.

Wiki basis: intcalc-opus.pdf p.2 leaves exact rounding unresolved, and intcalc-opus.pdf p.4 explicitly says "TODO: confirm rounding mode." intcalc-opus.pdf p.5 specifies account money as S9(10)V99, while intcalc-opus.pdf p.8 specifies transaction and category money as S9(9)V99; these provide the logical precision behind the selected limits. intcalc-opus.pdf p.10 allows output amounts with "at most two decimals." The excerpts do not prescribe arithmetic machinery, rounding direction, rounding stage or overflow handling, so those choices remain provisional.

## P10

Assumed: Return every account and change only curr_bal. Preserve active status, credit limits, dates, cycle credit, cycle debit, ZIP and group, using the contract field names. Do not increment cycle totals.

Wiki basis: intcalc-opus.pdf p.2 says interest is "posted to balance and category balance," supporting a current-balance update. intcalc-opus.pdf p.5 and intcalc-opus.pdf p.6 enumerate the other account attributes, including cycle totals, but give no instruction to change them during interest calculation. intcalc-opus.pdf p.11 provides the contract account field names. Preserving all non-current-balance fields and not incrementing cycle totals are provisional because the excerpts do not explicitly define those update boundaries.

## P11

Assumed: When rounded interest is zero, leave the account balance unchanged and emit neither an interest transaction nor a new interest-category row.

Wiki basis: intcalc-opus.pdf p.4 states "Account balance 0; Zero interest," and intcalc-opus.pdf p.2 describes posting calculated interest to balances. intcalc-opus.pdf p.10 requires transaction fields "for every interest transaction written" but does not say whether zero-valued transactions must be written. The excerpts also do not address nonzero products rounded to zero or creation of zero-valued category rows. Suppressing both outputs for zero rounded interest is provisional.

## P12

Assumed: Post each nonzero rounded interest amount to the account's category type 01, category 0, creating a category row when absent. Preserve other category balances. Return categoryBalances as ancillary records, not as an additional CONTRACT.md output file.

Wiki basis: intcalc-opus.pdf p.2 explicitly requires posting to "balance and category balance." intcalc-opus.pdf p.8 defines the category composite key as "accountId + typeCode + categoryCode," but supplies no interest-specific key or row-creation rule. intcalc-opus.pdf p.10 names the transaction and account outputs without naming a category-balance output. Choosing type 01/category 0, creating missing rows, preserving other categories and returning ancillary categoryBalances are provisional details not established by the excerpts.

## P13

Assumed: Sort accounts numerically by account ID. Generate interest transaction IDs by concatenating the ten-digit INTCALC parameter with a six-digit emitted-transaction sequence beginning at 000001. Fail above 999999 emitted transactions. A rerun on identical input reproduces the records rather than using an idempotency ledger.

Wiki basis: intcalc-opus.pdf p.2 defines the interest operation but provides no sequencing or rerun semantics. intcalc-opus.pdf p.10 supplies INTCALC parameter 2022071800 and permits output objects "in any order," without prescribing transaction-ID construction. Numeric sorting, sequence allocation, the transaction-count limit and ledger-free reruns are therefore provisional deterministic implementation choices, not documented legacy behavior.

## P14

Assumed: Populate interest transactions with type_cd 01, cat_cd 0, source INTCALC, desc Interest, the signed rounded amt, merchant_id 0, and empty merchant_name, merchant_city and merchant_zip. The wiki does not provide these transaction metadata defaults.

Wiki basis: intcalc-opus.pdf p.2 identifies the amount as calculated interest but supplies no transaction metadata values. intcalc-opus.pdf p.8 defines the transaction fields and their types, including signed amount and merchant fields. intcalc-opus.pdf p.10 provides the output names, including type_cd, cat_cd, source, desc and amt. The field schemas support representing these values, but do not select the codes, labels or merchant defaults; those population choices are provisional.

## P15

Assumed: For each account, select the lexically smallest card string in cardxref.dat. Permit multiple mappings. If no mapping exists, use an empty card_num rather than suppressing interest.

Wiki basis: intcalc-opus.pdf p.7 says CardXref "Links card ↔ customer ↔ account" and has an alternate index on accountId, supporting account-based card lookup without specifying a selection rule. intcalc-opus.pdf p.10 includes card_num in transaction output but does not define missing-card behavior. Multiple mappings, lexical selection and an empty-card fallback without suppressing interest are provisional because the supplied excerpts do not resolve them.

## P16

Assumed: Default businessDate to 2022-07-18 and intcalcParameter to 2022071800 only when omitted. Set both transaction timestamps to the chosen business date followed by a space and 00:00:00.000000; do not use the runtime clock. Preserve existing account dates as ISO dates and allow a blank optional reissue date.

Wiki basis: intcalc-opus.pdf p.10 lists "business date 2022-07-18, INTCALC parameter 2022071800," but does not define omission defaults. intcalc-opus.pdf p.5 identifies the account date fields as X(10) dates; intcalc-opus.pdf p.6 continues the account schema without further date rules. intcalc-opus.pdf p.8 specifies originTimestamp and processTimestamp as X(26). These excerpts do not prescribe timestamp values, separators, runtime-clock use, ISO serialization or blank reissue-date handling. Those choices, including applying the listed parameters only as omission defaults, are provisional.

## P17

Assumed: Validate Gregorian dates, the ten-digit run parameter, required file strings, exact widths, ASCII characters, digit fields, amount ranges, nonblank category type, duplicate account/category/group keys, and category/card references to existing accounts. Invalid input fails the entire calculation with errors and empty output lists, with no partial posting or reject file. Empty files are valid. Missing group rates cause failure even when the associated balance is zero.

Wiki basis: intcalc-opus.pdf p.2 makes calculation depend on a group rate. intcalc-opus.pdf p.5 defines account keys and typed fields, and intcalc-opus.pdf p.8 defines category composite keys and monetary precision. intcalc-opus.pdf p.10 supplies fixed widths and run parameters, while intcalc-opus.pdf p.11 supplies account output fields and permits uncertainty declarations. These statements motivate structural and reference validation but do not specify the complete validation suite, empty-file handling, zero-balance lookup behavior or atomic failure response; those rules are provisional. The supplied calculation is FAILED with "Account has no disclosure-group rate" and empty output lists; this register does not change that outcome.

## P18

Assumed: Return records and assumptions without writing JSON or Markdown files, scheduling, persistence or input mutation. Keep financial results and policy choices deterministic. Have a model compose explanatory assumptions only from the choices and wiki excerpts, not account data. If that output fails or has incomplete policy or citation coverage, retain the complete canonical choices and source excerpts with assumptionsStatus FALLBACK and a warning; do not discard valid financial results.

Wiki basis: intcalc-opus.pdf p.2 describes a periodic financial pipeline but does not require this interface to schedule or persist work. intcalc-opus.pdf p.10 describes "one JSON file per output," and intcalc-opus.pdf p.11 permits fixed-width dumps and mentions "uncertainties declared before scoring." Neither excerpt specifies a return-only API, model-generated explanations, deterministic execution, input immutability or an assumptions fallback protocol. These are provisional interface and failure-isolation choices; returning records rather than writing files is an explicit output limitation relative to the documented file-oriented contract. The supplied calculation remains FAILED; preserving valid financial results during explanatory fallback does not authorize converting that failure into success.
