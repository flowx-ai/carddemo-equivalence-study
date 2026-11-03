# CardDemo interest calculation assumptions

Calculation outcome: FAILED.
Assumption drafting: DRAFTED.
No JSON or Markdown output files were written. Layouts and unresolved legacy behaviour are provisional.

## P01

Assumed: Receive already-decoded file contents in files, not filesystem paths. Treat acctdata.dat and tcatbal.dat as the oracle POSTTRAN outputs. Require acctdata.dat, tcatbal.dat, discgrp.dat and cardxref.dat strings; accept the other contract files but leave them unused in this isolated interest step. Do not rerun POSTTRAN.

Wiki basis: intcalc-opus.pdf p.10 states that an isolated INTCALC candidate "receives the oracle POSTTRAN outputs as its account and category-balance inputs," supporting use of those inputs without rerunning POSTTRAN. intcalc-opus.pdf p.2 identifies account balances and DISCGRP as interest inputs. Neither excerpt specifies an in-memory files interface, decoded strings, this required-file set or the handling of other contract files; those interface choices are provisional.

## P02

Assumed: Use a provisional 300-character account layout in wiki order: account ID 11, active status 1, current balance 12, credit limit 12, cash credit limit 12, open date 10, expiration date 10, reissue date 10, cycle credit 12, cycle debit 12, ZIP 10, group 10 and ignored filler 178. The copybook offsets are not supplied.

Wiki basis: intcalc-opus.pdf p.5 describes the account record as "300 bytes" and lists the initial fields and their types; intcalc-opus.pdf p.6 continues with cycle amounts, ZIP and group. intcalc-opus.pdf p.10 specifies acctdata.dat as fixed-width CVACT01Y with length 300, while intcalc-opus.pdf p.11 supplies the output account field names. These excerpts do not supply physical copybook offsets, a contiguous character representation or filler placement. The stated ordering, character widths and filler are therefore provisional, not a verified copybook layout.

## P03

Assumed: Use a provisional 50-character category layout: account ID 11, type 2, category 4, signed balance 11 and ignored filler 22. The copybook offsets are not supplied.

Wiki basis: intcalc-opus.pdf p.8 describes a "50 bytes" category-balance record with accountId 9(11), typeCode X(2), categoryCode 9(4) and balance S9(9)V99. intcalc-opus.pdf p.10 identifies tcatbal.dat as fixed-width CVTRA01Y of length 50. Neither supplies physical offsets, signed-field encoding or filler placement, so this contiguous character layout is provisional.

## P04

Assumed: Use a provisional 50-character cross-reference layout: card 16, customer ID 9, account ID 11 and ignored filler 14. The copybook offsets are not supplied.

Wiki basis: intcalc-opus.pdf p.7 describes CardXref as "50 bytes" and gives cardNumber as 16 characters, customerId as 9 digits and accountId as 11 digits. intcalc-opus.pdf p.10 lists cardxref.dat as fixed-width CVACT03Y of length 50. The supplied excerpts contain no copybook offsets or filler definition; contiguous placement in this order and the 14-character filler are provisional.

## P05

Assumed: Use an invented, provisional 50-character disclosure layout: group at positions 1-10, six unsigned digits at positions 11-16 representing a rate with two implied decimal places, and ignored filler 34. The supplied wiki has no disclosure copybook layout.

Wiki basis: intcalc-opus.pdf p.2 says that "interest-rate parameters come from the disclosure-group reference data (DISCGRP)." intcalc-opus.pdf p.10 supplies only the discgrp.dat copybook identifier CVTRA02Y and length 50. Neither supplies disclosure fields, offsets, rate encoding or scale. Consequently, the group position, six-digit rate, two implied decimals and filler are invented provisional choices.

## P06

Assumed: Accept ASCII-compatible decoded text with one exact-width record per line, LF or CRLF line endings and at most one terminal newline. Monetary fields have two implied decimal places and accept ordinary digits or ASCII zoned final signs {ABCDEFGHI for positive digits 0-9 and }JKLMNOPQR for negative digits 0-9. Do not implement binary packed-decimal or EBCDIC decoding. Right-trim text, but do not left-trim it.

Wiki basis: intcalc-opus.pdf p.5 specifies decimal "scale 2" for S9(10)V99. intcalc-opus.pdf p.10 requires "one record per line, fixed width" and permits strings to omit trailing spaces. intcalc-opus.pdf p.11 identifies the account output fields and permits an alternative fixed-width dump, but supplies no encoding rules. ASCII transport, zoned-sign mappings, implied-decimal parsing, accepted newline forms, terminal-newline limits, exclusion of binary/EBCDIC decoding and preservation of leading spaces are not specified; these implementation details are provisional.

## P07

Assumed: Interpret each parsed disclosure rate as a decimal fractional multiplier and calculate currentBalance times groupRate directly, without percentage conversion, annualisation, period conversion or day-count division. Allow exactly one record per group. Require every account to have its group rate, including zero-balance accounts.

Wiki basis: intcalc-opus.pdf p.2 gives "interest = currentBalance × interestRate(groupId)" but explicitly leaves the exact formula and grouping as a TODO. intcalc-opus.pdf p.4 likewise says "Interest = balance × group rate" and describes zero balance as yielding zero interest. Neither defines rate units, conversions, group-record cardinality or whether zero balances bypass rate lookup. Direct fractional-multiplier units, uniqueness and mandatory lookup for every account are therefore provisional.

## P08

Assumed: Process every account, including inactive accounts and signed negative balances. Apply no eligibility filter and no positive-interest-only rule.

Wiki basis: intcalc-opus.pdf p.2 describes computing interest "for each account," and intcalc-opus.pdf p.4 gives balance-times-rate scenarios without an eligibility restriction. intcalc-opus.pdf p.5 includes activeStatus and a signed currentBalance field, but does not prescribe how status or negative balances affect interest. Processing inactive and negative-balance accounts without filtering is therefore provisional rather than established eligibility behaviour.

## P09

Assumed: Compute products using decimal-string integer arithmetic. Round interest once to cents, half away from zero, and then add the rounded amount. Reject overflow rather than clipping or wrapping. Limit account monetary values to 12 digits of cents and transaction and category monetary values to 11 digits of cents.

Wiki basis: intcalc-opus.pdf p.2 leaves exact rounding as a TODO, and intcalc-opus.pdf p.4 explicitly says "TODO: confirm rounding mode." Account S9(10)V99 in intcalc-opus.pdf p.5 and transaction/category S9(9)V99 in intcalc-opus.pdf p.8 support the respective decimal capacities. intcalc-opus.pdf p.10 limits output amounts to "at most two decimals." The excerpts do not select an arithmetic implementation, rounding direction, rounding stage or overflow response; decimal-string arithmetic, single half-away-from-zero rounding and overflow rejection are provisional.

## P10

Assumed: Return every account and change only curr_bal. Preserve active status, credit limits, dates, cycle credit, cycle debit, ZIP and group, using the contract field names. Do not increment cycle totals.

Wiki basis: intcalc-opus.pdf p.2 says interest is "posted to balance and category balance," supporting a current-balance update. intcalc-opus.pdf p.5 and intcalc-opus.pdf p.6 enumerate the other account fields, including cycle credit and debit. intcalc-opus.pdf p.11 supplies their contract names, including curr_bal, curr_cyc_credit and curr_cyc_debit. None specifies additional account-field updates or cycle-total effects. Preserving all fields other than curr_bal, including not incrementing cycle totals, is a provisional scope choice.

## P11

Assumed: When rounded interest is zero, leave the account balance unchanged and emit neither an interest transaction nor a new interest-category row.

Wiki basis: intcalc-opus.pdf p.4 states "Account balance 0; Zero interest," while intcalc-opus.pdf p.2 describes posting interest to account and category balances. intcalc-opus.pdf p.10 requests transaction fields for "every interest transaction written," but does not state whether zero-interest transactions must be written. The excerpts also do not address nonzero products that round to zero or creation of zero-valued category rows. Suppressing both outputs for rounded-zero interest is provisional.

## P12

Assumed: Post each nonzero rounded interest amount to the account's category type 01, category 0, creating that category row when absent. Preserve all other category balances. Return categoryBalances as ancillary records, not as an additional CONTRACT.md output file.

Wiki basis: intcalc-opus.pdf p.2 requires interest to be "posted to balance and category balance." intcalc-opus.pdf p.8 defines the category composite key as "accountId + typeCode + categoryCode," but does not identify an interest category or missing-row behaviour. intcalc-opus.pdf p.10 lists intcalc_systran.json and intcalc_acctdata.json, not a categoryBalances output file. Type 01/category 0, row creation, preservation of other categories and ancillary category return are therefore provisional implementation choices.

## P13

Assumed: Sort accounts numerically by account ID. Form interest transaction IDs from the ten-digit INTCALC parameter followed by a six-digit emitted-transaction sequence starting at 000001. Fail if more than 999999 transactions would be emitted. Reproduce records on an identical-input rerun rather than maintaining an idempotency ledger.

Wiki basis: intcalc-opus.pdf p.10 provides the INTCALC parameter 2022071800 and permits output objects "in any order." intcalc-opus.pdf p.2 describes a periodic interest pipeline but gives no transaction-ID construction or rerun protocol. Neither assigned excerpt specifies numerical ordering, sequence allocation, sequence exhaustion or an idempotency ledger. These deterministic ordering, identifier and rerun choices are provisional.

## P14

Assumed: Populate interest transactions with type_cd 01, cat_cd 0, source INTCALC, desc Interest, signed rounded amt, merchant_id 0, and empty merchant_name, merchant_city and merchant_zip. The wiki does not provide these transaction metadata defaults.

Wiki basis: intcalc-opus.pdf p.2 establishes that the posting represents interest. intcalc-opus.pdf p.8 defines transaction field types, including signed amount S9(9)V99 and merchant fields; intcalc-opus.pdf p.10 supplies the output names type_cd, cat_cd, source, desc, amt and merchant fields. Those schemas do not prescribe interest-specific codes, descriptive text or merchant defaults. The selected metadata values and signed rounded amount population are provisional, not wiki-defined transaction defaults.

## P15

Assumed: Select the lexically smallest card string in cardxref.dat for each account. Permit multiple mappings. If an account has no mapping, use an empty card_num rather than suppressing interest.

Wiki basis: intcalc-opus.pdf p.7 says CardXref "Links card ↔ customer ↔ account" and has an alternate index on accountId. intcalc-opus.pdf p.10 includes card_num in the transaction output. Neither states how to choose among multiple account mappings or what to do when no mapping exists. Lexical selection, permission for multiple mappings and an empty-card fallback without suppressing interest are provisional.

## P16

Assumed: Default businessDate to 2022-07-18 and intcalcParameter to 2022071800 only when omitted. Set both transaction timestamps to the chosen business date followed by a space and 00:00:00.000000; do not use the runtime clock. Preserve existing account dates as ISO dates and allow a blank optional reissue date.

Wiki basis: intcalc-opus.pdf p.10 lists "business date 2022-07-18, INTCALC parameter 2022071800," but does not define omission defaults. intcalc-opus.pdf p.5 identifies X(10) account dates and X(26) timestamps; intcalc-opus.pdf p.6 continues the account schema without specifying date-preservation behaviour. intcalc-opus.pdf p.8 names originTimestamp and processTimestamp as X(26). The excerpts do not prescribe midnight timestamps, their separator, clock avoidance, ISO preservation or optional blank reissue dates. These temporal conventions and defaulting rules are provisional.

## P17

Assumed: Validate Gregorian dates, a ten-digit run parameter, required file strings, exact widths, ASCII characters, digit fields, amount ranges, nonblank category type, duplicate account/category/group keys, and category/card references to existing accounts. Invalid input fails the entire calculation with errors and empty output lists, without partial posting or a reject file. Empty files are valid. Missing group rates fail even when the associated balance is zero.

Wiki basis: intcalc-opus.pdf p.5 supplies account types and the account key; intcalc-opus.pdf p.8 supplies transaction/category types and the category composite key. intcalc-opus.pdf p.10 specifies fixed widths and run parameters, and intcalc-opus.pdf p.11 supplies account output fields. intcalc-opus.pdf p.2 makes the group rate an input to the formula. These statements motivate structural checks but do not define the complete validation set, Gregorian validation, ASCII restrictions, duplicate/reference handling, empty-file acceptance or atomic failure semantics; those choices are provisional. The supplied calculation remains FAILED with "Account has no disclosure-group rate" and empty output lists; this register does not repair or reinterpret that outcome.

## P18

Assumed: Return records and assumptions without writing JSON or Markdown files, scheduling, persistence or input mutation. Keep financial results and policy choices deterministic. Have a model compose explanatory assumptions solely from implementation choices and wiki excerpts, not account data. If model output fails or lacks complete policy/citation coverage, retain the complete canonical choices and source excerpts with assumptionsStatus FALLBACK and a warning; do not discard valid financial results.

Wiki basis: intcalc-opus.pdf p.2 describes a periodic pipeline but specifies no scheduling or persistence mechanism. intcalc-opus.pdf p.10 describes JSON-file outputs, whereas intcalc-opus.pdf p.11 permits oracle fixed-width dumps and mentions "uncertainties declared before scoring." Neither defines an in-memory response-only interface, input immutability, model-generated explanations, deterministic execution or an assumptions-generation fallback. Those operational and output limitations are provisional departures or additions to the described file-oriented contract. Retaining valid results on an explanation failure does not make this supplied FAILED calculation successful; its failure remains unchanged.
