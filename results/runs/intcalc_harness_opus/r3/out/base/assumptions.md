# CardDemo interest calculation assumptions

Calculation outcome: FAILED.
Assumption drafting: DRAFTED.
No JSON or Markdown output files were written. Layouts and unresolved legacy behaviour are provisional.

## P01

Assumed: Receive already-decoded file contents in files, not filesystem paths. Require acctdata.dat, tcatbal.dat, discgrp.dat and cardxref.dat as strings. Treat acctdata.dat and tcatbal.dat as the oracle POSTTRAN outputs; do not rerun POSTTRAN. Accept the other contract files but do not use them in this isolated interest step.

Wiki basis: intcalc-opus.pdf p.10 states that an INTCALC candidate "receives the oracle POSTTRAN outputs as its account and category-balance inputs," supporting step isolation without rerunning POSTTRAN. intcalc-opus.pdf p.2 identifies account balances and DISCGRP as interest inputs. The excerpts do not specify an in-memory files transport, this exact required-file set, or acceptance without use of the remaining files; those interface choices are provisional.

## P02

Assumed: Use a provisional 300-character account layout in wiki field order: account ID 11, active status 1, current balance 12, credit limit 12, cash credit limit 12, open date 10, expiration date 10, reissue date 10, cycle credit 12, cycle debit 12, ZIP 10, group 10 and ignored filler 178. The supplied excerpts do not provide copybook offsets.

Wiki basis: intcalc-opus.pdf p.5 identifies an account record of "300 bytes" and supplies the initial field types and widths; intcalc-opus.pdf p.6 supplies the cycle, ZIP and group fields. intcalc-opus.pdf p.10 specifies acctdata.dat as CVACT01Y with width 300 and says layouts are "as in the copybooks." intcalc-opus.pdf p.11 lists the output account fields. None supplies copybook offsets or filler placement, so the sequential character layout and ignored filler remain provisional.

## P03

Assumed: Use a provisional 50-character category-balance layout: account ID 11, type 2, category 4, signed balance 11 and ignored filler 22. The supplied excerpts do not provide copybook offsets.

Wiki basis: intcalc-opus.pdf p.8 describes a "50 bytes" category-balance record with accountId 9(11), typeCode X(2), categoryCode 9(4) and balance S9(9)V99. intcalc-opus.pdf p.10 confirms tcatbal.dat has width 50 but defers layouts to copybooks. Exact offsets and filler are absent, making this character layout provisional.

## P04

Assumed: Use a provisional 50-character cross-reference layout: card 16, customer ID 9, account ID 11 and ignored filler 14. The supplied excerpts do not provide copybook offsets.

Wiki basis: intcalc-opus.pdf p.7 describes CardXref as "50 bytes" and gives cardNumber as 16 characters, customerId as 9 digits and accountId as 11 digits. intcalc-opus.pdf p.10 confirms cardxref.dat has width 50 and refers to copybook layouts. Neither supplies offsets or filler placement, so the proposed sequential character layout is provisional.

## P05

Assumed: Use an invented, provisional 50-character disclosure layout: group at positions 1–10, six unsigned digits at positions 11–16 representing a rate with two implied decimal places, and ignored filler 34. No disclosure copybook layout is supplied.

Wiki basis: intcalc-opus.pdf p.2 says that "interest-rate parameters come from" DISCGRP, establishing its role but not its encoding. intcalc-opus.pdf p.10 identifies discgrp.dat as CVTRA02Y with width 50. Neither excerpt supplies disclosure fields, offsets, rate precision or filler; all proposed internal layout details are therefore provisional.

## P06

Assumed: Accept ASCII-compatible decoded text with one exact-width record per line, LF or CRLF line endings and at most one terminal newline. Monetary fields have two implied decimal places and accept ordinary digits or ASCII zoned final signs: {ABCDEFGHI for positive digits 0–9 and }JKLMNOPQR for negative digits 0–9. Do not implement binary packed-decimal or EBCDIC decoding. Right-trim text without left-trimming it.

Wiki basis: intcalc-opus.pdf p.5 specifies monetary conversion as "decimal, scale 2." intcalc-opus.pdf p.10 requires "one record per line, fixed width" and permits strings to omit trailing spaces. intcalc-opus.pdf p.11 permits oracle fixed-width dumps as an alternative output. These excerpts do not define input character encoding, zoned-sign characters, newline variants, terminal-newline limits or input trimming. Those details and the unsupported decoding formats are provisional implementation boundaries.

## P07

Assumed: Interpret each parsed disclosure rate as a decimal fractional multiplier and multiply currentBalance directly by groupRate, without percentage conversion, annualisation, period conversion or day-count division. Allow exactly one record per group and require a group rate for every account, including zero-balance accounts.

Wiki basis: intcalc-opus.pdf p.2 gives "interest = currentBalance × interestRate(groupId)" but leaves exact formula and grouping extraction as a TODO. intcalc-opus.pdf p.4 repeats "Interest = balance × group rate," requires the correct rate per group and describes zero balance as producing zero interest. Neither defines rate units, duplicate-group handling or whether zero balances bypass rate lookup. Direct fractional units and these lookup constraints are provisional, not verified legacy behaviour.

## P08

Assumed: Process every account, including inactive accounts and accounts with signed negative balances. Apply no eligibility filter and no positive-interest-only rule.

Wiki basis: intcalc-opus.pdf p.2 describes interest computation "for each account." intcalc-opus.pdf p.5 includes activeStatus and a signed currentBalance, but gives no eligibility test based on either. intcalc-opus.pdf p.4 discusses balance-based interest and zero balances without defining inactive-account or negative-balance exclusions. Processing all such accounts without sign-based suppression is therefore provisional where those cases are unspecified.

## P09

Assumed: Compute products using decimal-string integer arithmetic. Round interest once to cents, half away from zero, and then add the rounded amount. Reject overflow rather than clipping or wrapping. Limit account monetary fields to 12 digits of cents and transaction and category monetary fields to 11 digits of cents.

Wiki basis: intcalc-opus.pdf p.2 leaves rounding extraction as a TODO, and intcalc-opus.pdf p.4 explicitly says "TODO: confirm rounding mode." intcalc-opus.pdf p.5 gives account money as S9(10)V99; intcalc-opus.pdf p.8 gives transaction and category money as S9(9)V99, supporting the respective digit capacities. intcalc-opus.pdf p.10 allows amounts with "at most two decimals." Arithmetic representation, rounding mode and timing, and overflow handling are not specified and remain provisional.

## P10

Assumed: Return every account using the contract field names and change only curr_bal. Preserve active status, credit limits, dates, cycle credit, cycle debit, ZIP and group. Do not increment cycle totals.

Wiki basis: intcalc-opus.pdf p.2 says interest is posted to the account balance. intcalc-opus.pdf p.5 and intcalc-opus.pdf p.6 enumerate account fields, including separate cycle totals, without directing that interest update those totals or other attributes. intcalc-opus.pdf p.11 supplies the contract account field names. Preservation of every non-balance field and unchanged cycle totals are provisional because the supplied excerpts do not define those update semantics.

## P11

Assumed: When rounded interest is zero, leave the account balance unchanged and emit neither an interest transaction nor a new interest-category row.

Wiki basis: intcalc-opus.pdf p.4 states "Account balance 0; Zero interest," and intcalc-opus.pdf p.2 describes posting computed interest to balances. intcalc-opus.pdf p.10 requests transaction fields for "every interest transaction written" but does not require zero-value transactions. No excerpt specifies suppression after rounding or zero-value category-row creation; those suppression choices are provisional.

## P12

Assumed: Post each nonzero rounded interest amount to the account's category type 01, category 0, creating that category row if absent. Preserve all other category balances. Return categoryBalances as ancillary records, not as an additional CONTRACT.md output file.

Wiki basis: intcalc-opus.pdf p.2 explicitly says interest is "posted to balance and category balance." intcalc-opus.pdf p.8 defines the category composite key as accountId + typeCode + categoryCode. intcalc-opus.pdf p.10 lists account and interest-transaction outputs but no categoryBalances output file. The interest category values, missing-row creation, preservation rules and ancillary return mechanism are unspecified and provisional.

## P13

Assumed: Sort accounts numerically by account ID. Form each interest transaction ID from the ten-digit INTCALC parameter followed by a six-digit emitted-transaction sequence starting at 000001. Fail if more than 999999 transactions would be emitted. Identical-input reruns reproduce records without maintaining an idempotency ledger.

Wiki basis: intcalc-opus.pdf p.10 supplies the INTCALC parameter and permits output lists "in any order," allowing but not requiring numeric account sorting. intcalc-opus.pdf p.2 describes periodic interest processing without specifying transaction-ID construction or rerun state. Neither assigned excerpt defines sequencing, sequence exhaustion or an idempotency ledger. These deterministic ordering and identifier choices are provisional.

## P14

Assumed: Populate interest transactions with type_cd 01, cat_cd 0, source INTCALC, desc Interest, signed rounded amt, merchant_id 0, and empty merchant_name, merchant_city and merchant_zip. These transaction metadata defaults are not supplied by the wiki.

Wiki basis: intcalc-opus.pdf p.2 establishes that computed interest is posted. intcalc-opus.pdf p.8 defines transaction field types, including a signed amount, and intcalc-opus.pdf p.10 supplies the contract transaction field names. The excerpts do not prescribe interest type/category codes, source, description or merchant defaults. Those population values are provisional; the signed amount follows the selected rounded-interest policy rather than a verified legacy mapping.

## P15

Assumed: For an account, select the lexically smallest card string in cardxref.dat. Permit multiple mappings. If no mapping exists, use an empty card_num rather than suppressing interest.

Wiki basis: intcalc-opus.pdf p.7 says CardXref "Links card ↔ customer ↔ account" and has an alternate index on accountId, supporting account-based card lookup. intcalc-opus.pdf p.10 includes card_num in transaction output. Neither defines selection among multiple mappings or handling of an unmapped account. Multiple-mapping acceptance, lexical selection and the empty-card fallback are provisional.

## P16

Assumed: Default businessDate to 2022-07-18 and intcalcParameter to 2022071800 only when omitted. Set both transaction timestamps to the chosen business date followed by a space and 00:00:00.000000; do not use the runtime clock. Preserve existing account dates as ISO dates and allow a blank optional reissue date.

Wiki basis: intcalc-opus.pdf p.10 lists "business date 2022-07-18" and "INTCALC parameter 2022071800," but does not define omitted-value defaults. intcalc-opus.pdf p.5 defines account dates as X(10) date fields, while intcalc-opus.pdf p.8 defines two X(26) transaction timestamps. intcalc-opus.pdf p.6 continues the account schema but supplies no date-update rule. Default precedence, midnight timestamp population, clock exclusion, ISO preservation and blank reissue-date acceptance are unspecified and provisional.

## P17

Assumed: Validate Gregorian dates, the ten-digit run parameter, required file strings, exact record widths, ASCII characters, digit fields, amount ranges, nonblank category type, duplicate account/category/group keys, and category/card references to existing accounts. Invalid input fails the entire calculation with errors and empty output lists, without partial posting or a reject file. Accept empty files. Fail on missing group rates even for zero-balance accounts. The supplied calculation remains FAILED with the error Duplicate disclosure group and empty output lists.

Wiki basis: intcalc-opus.pdf p.5 identifies accountId as a key and supplies date and numeric types; intcalc-opus.pdf p.8 defines a category composite key and monetary capacities. intcalc-opus.pdf p.10 fixes record widths and run parameters, and intcalc-opus.pdf p.11 supplies output account fields. intcalc-opus.pdf p.2 makes the group rate an input to interest. These provide validation targets, but do not define the complete validator, empty-file acceptance, referential checks, duplicate-group rejection or atomic failure behaviour. Those choices are provisional. The supplied calculation status, separately from the wiki evidence, records failure and is not changed by documenting these policies.

## P18

Assumed: Return records and assumptions without writing JSON or Markdown files, scheduling, persisting state or mutating input. Keep financial results and policy choices deterministic. Generate explanatory assumptions only from the supplied choices and wiki excerpts, not account data. If explanation generation fails or policy/citation coverage is incomplete, retain the complete canonical choices and source excerpts with assumptionsStatus FALLBACK and a warning; do not discard valid financial results. This fallback does not convert the supplied FAILED calculation into a success.

Wiki basis: intcalc-opus.pdf p.2 describes a "Periodic pipeline" but does not require this isolated interface to schedule or persist work. intcalc-opus.pdf p.10 describes JSON-file outputs; intcalc-opus.pdf p.11 permits fixed-width dumps and optional uncertainty declarations. Neither specifies a record-only transport, model-generated explanations, determinism, input immutability or an explanation-failure fallback. These are provisional interface and reporting limitations, not claims of file production or verified legacy behaviour. Preserving valid results during explanation fallback does not override an already failed calculation.
