# CardDemo interest calculation assumptions

Calculation outcome: FAILED.
Assumption drafting: DRAFTED.
No JSON or Markdown output files were written. Layouts and unresolved legacy behaviour are provisional.

## P01

Assumed: Receive already-decoded file contents in files, not filesystem paths. Treat acctdata.dat and tcatbal.dat as the oracle POSTTRAN outputs. Require acctdata.dat, tcatbal.dat, discgrp.dat and cardxref.dat strings; accept the other contract files but do not use them in this isolated interest step. Do not rerun POSTTRAN.

Wiki basis: intcalc-opus.pdf p.10 states that an isolated INTCALC candidate "receives the oracle POSTTRAN outputs as its account and category-balance inputs," supporting reuse rather than rerunning POSTTRAN. intcalc-opus.pdf p.2 identifies account balances and DISCGRP as interest inputs. The excerpts do not specify an in-memory files interface, the exact required subset of contract files, or how unused files are handled; these transport and input-selection choices are provisional.

## P02

Assumed: Use a provisional 300-character account layout in wiki order: account ID 11, active status 1, current balance 12, credit limit 12, cash credit limit 12, open date 10, expiration date 10, reissue date 10, cycle credit 12, cycle debit 12, ZIP 10, group 10 and ignored filler 178. The copybook offsets are not supplied.

Wiki basis: intcalc-opus.pdf p.5 identifies the account record as "300 bytes" and lists the initial fields and their types; intcalc-opus.pdf p.6 supplies cycle credit, cycle debit, ZIP and group fields. intcalc-opus.pdf p.10 requires fixed-width records with "layouts as in the copybooks," while intcalc-opus.pdf p.11 lists the account output fields. These excerpts establish record size and logical fields, but provide neither copybook offsets nor physical sign storage or filler placement. The sequential character layout and ignored filler are therefore provisional.

## P03

Assumed: Use a provisional 50-character category layout: account ID 11, type 2, category 4, signed balance 11 and ignored filler 22. The copybook offsets are not supplied.

Wiki basis: intcalc-opus.pdf p.8 describes TransactionCategoryBalance as "50 bytes" and lists accountId 9(11), typeCode X(2), categoryCode 9(4) and balance S9(9)V99. intcalc-opus.pdf p.10 specifies tcatbal.dat as a 50-wide copybook-based input. Neither excerpt supplies offsets, physical sign encoding or filler placement, so the proposed contiguous character layout is provisional.

## P04

Assumed: Use a provisional 50-character cross-reference layout: card 16, customer ID 9, account ID 11 and ignored filler 14. The copybook offsets are not supplied.

Wiki basis: intcalc-opus.pdf p.7 identifies CardXref as "50 bytes" and gives cardNumber as 16 characters, customerId as 9 digits and accountId as 11 digits. intcalc-opus.pdf p.10 identifies cardxref.dat as a 50-wide copybook-based input. These descriptions do not supply copybook offsets or filler placement; the sequential layout and ignored filler are provisional.

## P05

Assumed: Use an invented, provisional 50-character disclosure layout: group at positions 1–10, six unsigned digits at positions 11–16 representing a rate with two implied decimal places, and ignored filler 34. The supplied wiki contains no disclosure copybook layout.

Wiki basis: intcalc-opus.pdf p.2 says that "interest-rate parameters come from the disclosure-group reference data (DISCGRP)." intcalc-opus.pdf p.10 establishes discgrp.dat as a 50-wide CVTRA02Y input, but supplies no disclosure field definitions, offsets, rate precision or encoding. Consequently, the group position, six-digit unsigned rate, implied scale and filler are invented provisional choices, not a documented disclosure layout.

## P06

Assumed: Accept ASCII-compatible decoded text with one exact-width record per line, LF or CRLF line endings and at most one terminal newline. Interpret monetary fields with two implied decimal places, accepting ordinary digits or ASCII zoned final signs {ABCDEFGHI for positive digits 0–9 and }JKLMNOPQR for negative digits 0–9. Do not implement binary packed-decimal or EBCDIC decoding. Right-trim text, but do not left-trim it.

Wiki basis: intcalc-opus.pdf p.5 maps S9(10)V99 to "decimal, scale 2," supporting two-decimal monetary interpretation. intcalc-opus.pdf p.10 requires "one record per line, fixed width" and permits strings to omit trailing spaces. intcalc-opus.pdf p.11 permits oracle fixed-width dumps as an alternative output, but supplies no input decoder. The excerpts do not define a character encoding, zoned-sign alphabet, newline variants, terminal-newline limit or left-trimming behavior. Those encoding and parsing restrictions, including unsupported packed-decimal and EBCDIC decoding, are provisional.

## P07

Assumed: Interpret each parsed disclosure rate as a decimal fractional multiplier and multiply currentBalance directly by groupRate, with no percentage conversion, annualisation, period conversion or day-count division. Allow exactly one record per group and require a group rate for every account, including zero-balance accounts.

Wiki basis: intcalc-opus.pdf p.2 gives "interest = currentBalance × interestRate(groupId)" but leaves exact formula and grouping extraction as a TODO. intcalc-opus.pdf p.4 repeats "Interest = balance × group rate," requires the correct rate per group and states that zero balance yields zero interest. Neither excerpt defines rate units, conversion factors, group-record cardinality or whether zero balances bypass lookup. Direct fractional-rate interpretation, uniqueness and mandatory lookup for every account are therefore provisional.

## P08

Assumed: Process every account, including inactive accounts and accounts with signed negative balances. Apply no eligibility filter and no positive-interest-only rule.

Wiki basis: intcalc-opus.pdf p.2 describes computing interest "for each account," and intcalc-opus.pdf p.4 presents balance-times-rate scenarios without an eligibility condition. intcalc-opus.pdf p.5 includes activeStatus and a signed currentBalance field, but does not prescribe how either affects eligibility. Processing inactive accounts and negative balances without filtering is therefore a provisional interpretation of the stated scope, not verified eligibility behavior.

## P09

Assumed: Compute products using decimal-string integer arithmetic. Round interest once to cents, half away from zero, and then add that rounded amount. Reject overflow rather than clipping or wrapping. Limit account monetary fields to 12 digits of cents and transaction and category monetary fields to 11 digits of cents.

Wiki basis: intcalc-opus.pdf p.2 leaves exact rounding as a TODO, and intcalc-opus.pdf p.4 explicitly says "TODO: confirm rounding mode." intcalc-opus.pdf p.5 specifies account money as S9(10)V99, while intcalc-opus.pdf p.8 specifies transaction and category money as S9(9)V99; these support the respective decimal capacities. intcalc-opus.pdf p.10 permits output amounts with "at most two decimals." The excerpts do not establish arithmetic representation, rounding direction or timing, or overflow handling. Decimal-string arithmetic, single half-away-from-zero rounding and overflow rejection are provisional.

## P10

Assumed: Return every account using the contract field names and change only curr_bal. Preserve active status, credit limits, dates, cycle credit, cycle debit, ZIP and group. Do not increment cycle totals.

Wiki basis: intcalc-opus.pdf p.2 directs that interest be "posted to balance and category balance." intcalc-opus.pdf p.5 lists the initial account fields, and intcalc-opus.pdf p.6 lists cycle totals, ZIP and group. intcalc-opus.pdf p.11 supplies the contract field names, including curr_bal and the cycle fields. The excerpts do not specify other account-field changes or cycle-total increments. Preserving all fields except curr_bal, returning every account and leaving cycle totals untouched are provisional posting-scope choices.

## P11

Assumed: When rounded interest is zero, leave the account balance unchanged and emit neither an interest transaction nor a new interest-category row.

Wiki basis: intcalc-opus.pdf p.4 states "Account balance 0; Zero interest," and intcalc-opus.pdf p.2 describes posting interest to account and category balances. intcalc-opus.pdf p.10 calls for transaction fields for "every interest transaction written," but does not say whether a zero-interest transaction must be written. The excerpts also do not address products that round to zero or creation of zero-valued category rows. Suppressing those transactions and new rows is provisional.

## P12

Assumed: Post every nonzero rounded interest amount to the account's category type 01, category 0, creating that category row if absent. Preserve all other category balances. Return categoryBalances as ancillary records, not as an additional CONTRACT.md output file.

Wiki basis: intcalc-opus.pdf p.2 explicitly requires interest to be "posted to balance and category balance." intcalc-opus.pdf p.8 defines the category composite key as "accountId + typeCode + categoryCode," but does not identify an interest type or category or prescribe missing-row handling. intcalc-opus.pdf p.10 names the interest transaction and account output files, without specifying a categoryBalances output file. Type 01, category 0, row creation, preservation of other categories and ancillary-only category output are provisional choices.

## P13

Assumed: Sort accounts numerically by account ID. Generate interest transaction IDs by concatenating the ten-digit INTCALC parameter with a six-digit emitted-transaction sequence starting at 000001. Fail if more than 999999 transactions would be emitted. Identical-input reruns reproduce records rather than using an idempotency ledger.

Wiki basis: intcalc-opus.pdf p.10 supplies the INTCALC parameter 2022071800 and permits output objects "in any order," but gives no sorting, transaction-ID construction, sequence or rerun rules. intcalc-opus.pdf p.2 describes the interest pipeline without specifying persistent run tracking. Numeric ordering, parameter-plus-sequence IDs, the sequence limit and record-reproducing reruns without an idempotency ledger are therefore provisional.

## P14

Assumed: Populate interest transactions with type_cd 01, cat_cd 0, source INTCALC, desc Interest, the signed rounded interest as amt, merchant_id 0, and empty merchant_name, merchant_city and merchant_zip. These transaction metadata defaults are not supplied by the wiki.

Wiki basis: intcalc-opus.pdf p.2 establishes that interest is posted, but gives no transaction metadata values. intcalc-opus.pdf p.8 defines transaction fields and a signed amount, while intcalc-opus.pdf p.10 supplies their contract names and integer types for cat_cd and merchant_id. Neither specifies interest type/category codes, source, description or merchant defaults. Those values are provisional metadata choices; the signed rounded amount follows the separate calculation policy rather than a documented rounding rule here.

## P15

Assumed: For each account, select the lexically smallest card string in cardxref.dat. Permit multiple mappings. If no mapping exists, use an empty card_num rather than suppressing interest.

Wiki basis: intcalc-opus.pdf p.7 says CardXref "Links card ↔ customer ↔ account" and has an alternate index on accountId, providing a basis for account-to-card lookup. intcalc-opus.pdf p.10 includes card_num in the transaction output. Neither excerpt defines selection among multiple cards or behavior when no mapping exists. Lexical selection, permitting multiple mappings and using an empty card without suppressing interest are provisional.

## P16

Assumed: Default businessDate to 2022-07-18 and intcalcParameter to 2022071800 only when omitted. Set both transaction timestamps to the chosen business date, a separating space and 00:00:00.000000; do not use the runtime clock. Preserve existing account dates as ISO dates and allow a blank optional reissue date.

Wiki basis: intcalc-opus.pdf p.10 lists "business date 2022-07-18" and "INTCALC parameter 2022071800," but does not define omitted-parameter defaults or timestamp population. intcalc-opus.pdf p.5 defines account date fields and date/timestamp conversions; intcalc-opus.pdf p.6 continues the account schema without defining reissue-date optionality. intcalc-opus.pdf p.8 defines originTimestamp and processTimestamp as X(26). Midnight timestamps, the separating-space format, avoidance of the runtime clock, ISO preservation and blank reissue-date acceptance are provisional because the excerpts do not specify those behaviors.

## P17

Assumed: Validate Gregorian dates, the ten-digit run parameter, required file strings, exact widths, ASCII characters, digit fields, amount ranges, nonblank category type, duplicate account/category/group keys, and category/card references to existing accounts. Invalid input fails the entire calculation with errors and empty output lists; produce neither partial postings nor a reject file. Empty files are valid. Missing group rates fail even when the associated balance is zero. The supplied calculation remains FAILED, with the reported missing disclosure-group-rate error and empty output lists.

Wiki basis: intcalc-opus.pdf p.5 defines account keys, dates and numeric types; intcalc-opus.pdf p.8 defines category composite keys and monetary fields. intcalc-opus.pdf p.10 establishes fixed widths and run parameters, and intcalc-opus.pdf p.11 lists account output fields without defining error outputs. intcalc-opus.pdf p.2 requires a group-derived interest rate, but does not prescribe failure when a rate is missing. The excerpts do not define the complete validation suite, Gregorian validation, referential checks, empty-file acceptance, atomic failure, reject-file handling or a zero-balance exception. These validation and failure policies are provisional. The reported FAILED outcome is retained as supplied, not inferred as verified wiki behavior.

## P18

Assumed: Return records and assumptions without writing JSON or Markdown files, scheduling work, persisting data or mutating input. Keep financial results and policy choices deterministic. Use a model only to write explanatory assumptions from the supplied choices and wiki excerpts, not account data. If model output fails or lacks complete policy or citation coverage, retain the complete canonical choices and source excerpts with assumptionsStatus FALLBACK and a warning; do not discard valid financial results. This explanatory process does not change the supplied FAILED calculation outcome.

Wiki basis: intcalc-opus.pdf p.2 describes a periodic interest pipeline but specifies no scheduling, persistence or explanatory-model mechanism for this isolated interface. intcalc-opus.pdf p.10 describes "one JSON file per output," while intcalc-opus.pdf p.11 permits oracle fixed-width dumps and mentions optional uncertainty declarations. Neither defines an in-memory-only return, immutability, deterministic execution, model data boundaries, coverage checks or assumptionsStatus FALLBACK. Those operational and output limitations are provisional interface choices rather than claims that contract files were produced. The fallback preserves any valid financial results; it provides no basis for turning a failed calculation into a successful one.
