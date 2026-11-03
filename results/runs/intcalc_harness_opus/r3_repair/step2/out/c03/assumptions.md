# CardDemo interest calculation assumptions

Calculation outcome: FAILED.
Assumption drafting: DRAFTED.
No JSON or Markdown output files were written. Layouts and unresolved legacy behaviour are provisional.

## P01

Assumed: Receive already-decoded file contents in files, not filesystem paths. Treat acctdata.dat and tcatbal.dat as the oracle POSTTRAN outputs. Require acctdata.dat, tcatbal.dat, discgrp.dat and cardxref.dat strings; accept the other contract files but leave them unused in this isolated interest step. Do not rerun POSTTRAN.

Wiki basis: intcalc-opus.pdf p.10 states that an INTCALC candidate 'receives the oracle POSTTRAN outputs as its account and category-balance inputs', supporting isolation without rerunning POSTTRAN. intcalc-opus.pdf p.2 identifies DISCGRP as the source of interest-rate parameters. The excerpts do not define an in-memory files interface, the required-string subset or handling of other contract files; those transport and input-selection choices are provisional.

## P02

Assumed: Use a provisional 300-character account layout in wiki field order: account ID 11, active status 1, current balance 12, credit limit 12, cash credit limit 12, open date 10, expiration date 10, reissue date 10, cycle credit 12, cycle debit 12, ZIP 10, group 10 and ignored filler 178. The copybook offsets are not supplied.

Wiki basis: intcalc-opus.pdf p.5 identifies the account record as '300 bytes' and supplies the initial fields and their picture sizes; intcalc-opus.pdf p.6 supplies cycle amounts, ZIP and group. intcalc-opus.pdf p.10 confirms the 300-width contract but refers to 'layouts as in the copybooks'. intcalc-opus.pdf p.11 supplies output account field names, not physical offsets. These excerpts support the field inventory and nominal width, but do not establish contiguous offsets, character-based width or filler placement; the proposed layout remains provisional.

## P03

Assumed: Use a provisional 50-character category layout: account ID 11, type 2, category 4, signed balance 11 and ignored filler 22. The copybook offsets are not supplied.

Wiki basis: intcalc-opus.pdf p.8 describes a '50 bytes' category-balance record with accountId 9(11), typeCode X(2), categoryCode 9(4) and balance S9(9)V99. intcalc-opus.pdf p.10 confirms tcatbal.dat width 50 while referring to copybook layouts. Neither excerpt supplies offsets, the physical sign representation or filler placement; this contiguous character layout is provisional.

## P04

Assumed: Use a provisional 50-character cross-reference layout: card 16, customer ID 9, account ID 11 and ignored filler 14. The copybook offsets are not supplied.

Wiki basis: intcalc-opus.pdf p.7 describes CardXref as a '50 bytes' record linking card, customer and account, with field lengths 16, 9 and 11 respectively. intcalc-opus.pdf p.10 confirms cardxref.dat width 50 but delegates layouts to copybooks. The excerpts do not supply physical offsets or filler placement, so the chosen character layout is provisional.

## P05

Assumed: Use an invented, provisional 50-character disclosure layout: group at positions 1-10, six unsigned digits at positions 11-16 representing a rate with two implied decimal places, and ignored filler 34. The supplied wiki contains no disclosure copybook layout.

Wiki basis: intcalc-opus.pdf p.2 says that 'interest-rate parameters come from the disclosure-group reference data (DISCGRP)', establishing the reference data's role. intcalc-opus.pdf p.10 lists discgrp.dat CVTRA02Y with width 50. Neither excerpt provides disclosure fields, offsets, sign encoding or rate scale. Consequently, the group positions, six-digit rate representation, two-decimal scale and filler are provisional inventions, not a documented disclosure layout.

## P06

Assumed: Accept ASCII-compatible decoded text with one exact-width record per line, LF or CRLF line endings and at most one terminal newline. Monetary fields have two implied decimal places and accept ordinary digits or ASCII zoned final signs {ABCDEFGHI for positive digits 0-9 and }JKLMNOPQR for negative digits 0-9. Do not implement binary packed-decimal or EBCDIC decoding. Right-trim text without left-trimming it.

Wiki basis: intcalc-opus.pdf p.5 maps S9(10)V99 to a decimal with 'scale 2'. intcalc-opus.pdf p.10 specifies 'one record per line, fixed width' and permits strings to omit trailing spaces. intcalc-opus.pdf p.11 lists output account fields and permits oracle fixed-width dumps, but adds no encoding rules. The excerpts do not specify ASCII, zoned-sign mappings, newline variants or counts, binary/EBCDIC support, or left-trimming behaviour. Those encoding and parsing choices are provisional; the scale and trailing-space allowance provide only partial support.

## P07

Assumed: Interpret each parsed disclosure rate as a decimal fractional multiplier: multiply currentBalance directly by groupRate, with no percentage conversion, annualisation, period conversion or day-count division. Allow exactly one record per group, and require every account to have its group rate, including zero-balance accounts.

Wiki basis: intcalc-opus.pdf p.2 gives 'interest = currentBalance × interestRate(groupId)' but also leaves a TODO to extract the exact formula and grouping. intcalc-opus.pdf p.4 repeats 'Interest = balance × group rate', expects the correct rate for each group and states that a zero balance produces zero interest. Neither page defines rate units, conversion factors, group-record uniqueness or whether zero balances bypass rate lookup. The direct fractional interpretation, absence of conversions and lookup constraints are therefore provisional.

## P08

Assumed: Process every account, including inactive accounts and signed negative balances. Apply no eligibility filter and no positive-interest-only rule.

Wiki basis: intcalc-opus.pdf p.2 describes computing interest 'for each account'. intcalc-opus.pdf p.5 includes activeStatus and a signed currentBalance field, but supplies no eligibility rule based on either. intcalc-opus.pdf p.4 covers zero balances and different groups without defining inactive-account or negative-balance treatment. Processing all accounts is consistent with the broad description, but the absence of eligibility and positive-interest filters remains a provisional behavioural choice.

## P09

Assumed: Compute products using decimal-string integer arithmetic. Round interest once to cents, half away from zero, and then add that rounded amount. Reject overflow rather than clipping or wrapping. Limit account monetary fields to 12 digits of cents and transaction and category monetary fields to 11 digits of cents.

Wiki basis: intcalc-opus.pdf p.2 leaves exact rounding as a TODO, and intcalc-opus.pdf p.4 explicitly says 'TODO: confirm rounding mode'. intcalc-opus.pdf p.5 gives account money as S9(10)V99, while intcalc-opus.pdf p.8 gives transaction and category money as S9(9)V99, supporting the respective decimal capacities. intcalc-opus.pdf p.10 limits output amounts to at most two decimals. The excerpts do not select an arithmetic algorithm, rounding mode, rounding stage or overflow response; decimal-string arithmetic, one half-away-from-zero rounding and overflow rejection are provisional.

## P10

Assumed: Return every account and change only curr_bal. Preserve active status, credit limits, dates, cycle credit, cycle debit, ZIP and group, using the contract field names. Do not increment cycle totals.

Wiki basis: intcalc-opus.pdf p.2 says interest is 'posted to balance and category balance'. intcalc-opus.pdf p.5 and intcalc-opus.pdf p.6 enumerate the other account fields, including cycle totals, but do not direct changes to them during interest calculation. intcalc-opus.pdf p.11 supplies the contract names acct_id, active_status, curr_bal, credit_limit, cash_credit_limit, open_date, expiration_date, reissue_date, curr_cyc_credit, curr_cyc_debit, addr_zip and group_id. Returning every account is the supplied implementation choice; these pages do not fully specify preservation or cycle-total posting, so changing only curr_bal and leaving cycle totals untouched is provisional.

## P11

Assumed: When rounded interest is zero, leave the account balance unchanged and emit neither an interest transaction nor a new interest-category row.

Wiki basis: intcalc-opus.pdf p.4 states 'Account balance 0; Zero interest', and intcalc-opus.pdf p.2 describes posting calculated interest to account and category balances. intcalc-opus.pdf p.10 requires transaction fields for 'every interest transaction written' but does not say whether zero-valued transactions must be written. The excerpts also do not address nonzero products that round to zero or creation of zero-valued category rows. Suppression of those transactions and new rows is provisional.

## P12

Assumed: Post each nonzero rounded interest amount to the account's category type 01, category 0, creating that category row if absent. Preserve all other category balances. Return categoryBalances as ancillary records, not as an additional CONTRACT.md output file.

Wiki basis: intcalc-opus.pdf p.2 explicitly requires interest to be 'posted to balance and category balance'. intcalc-opus.pdf p.8 defines the category-balance composite key as 'accountId + typeCode + categoryCode'. intcalc-opus.pdf p.10 identifies the interest transaction and account output files, but does not list a categoryBalances output file. The excerpts do not select type 01/category 0, prescribe missing-row creation or state how other rows are preserved. Those posting details and the ancillary-record interface are provisional.

## P13

Assumed: Sort accounts numerically by account ID. Form interest transaction IDs from the ten-digit INTCALC parameter followed by a six-digit emitted-transaction sequence starting at 000001, and fail if more than 999999 transactions would be emitted. Identical-input reruns reproduce records rather than using an idempotency ledger.

Wiki basis: intcalc-opus.pdf p.10 provides INTCALC parameter 2022071800 and allows output lists 'in any order', so numeric sorting is an implementation ordering rather than a contract requirement. intcalc-opus.pdf p.2 describes periodic calculation and posting without defining transaction-ID generation or rerun handling. Neither page specifies a sequence, its limit, parameter-based identifiers or an idempotency ledger. All of those choices are provisional.

## P14

Assumed: Populate interest transactions with type_cd 01, cat_cd 0, source INTCALC, desc Interest, signed rounded amt, merchant_id 0, and empty merchant_name, merchant_city and merchant_zip. These transaction metadata defaults are not supplied by the wiki.

Wiki basis: intcalc-opus.pdf p.2 establishes the interest-posting purpose. intcalc-opus.pdf p.8 specifies transaction field types, including a signed amount, and intcalc-opus.pdf p.10 supplies the output names type_cd, cat_cd, source, desc, amt, merchant_id and merchant location fields. These excerpts define the available fields but not their interest-specific values. The selected codes, source, description, merchant defaults and rounded-amount population are provisional, not verified transaction defaults.

## P15

Assumed: Choose the lexically smallest card string in cardxref.dat for each account. Permit multiple mappings. If an account has no mapping, use an empty card_num rather than suppressing interest.

Wiki basis: intcalc-opus.pdf p.7 says CardXref 'Links card ↔ customer ↔ account' and has an alternate index on accountId, supporting its use to find an account's card. intcalc-opus.pdf p.10 includes card_num among transaction output fields. Neither page defines selection among multiple mappings, account-level mapping cardinality or missing-mapping behaviour. Lexical selection, permitting multiple mappings and emitting an empty card number without suppressing interest are provisional.

## P16

Assumed: Default businessDate to 2022-07-18 and intcalcParameter to 2022071800 only when omitted. Set both transaction timestamps to the chosen business date followed by a space and 00:00:00.000000; do not use the runtime clock. Preserve existing account dates as ISO dates, allowing a blank optional reissue date.

Wiki basis: intcalc-opus.pdf p.10 supplies 'business date 2022-07-18' and 'INTCALC parameter 2022071800', but does not define omission defaults. intcalc-opus.pdf p.5 identifies X(10) account dates and X(26) timestamp conversion, intcalc-opus.pdf p.6 adds no date-handling rules, and intcalc-opus.pdf p.8 identifies originTimestamp and processTimestamp as X(26). The excerpts do not require midnight, equal timestamps, exclusion of the runtime clock, ISO preservation or a blank reissue date. These date and defaulting choices are provisional.

## P17

Assumed: Validate Gregorian dates, a ten-digit run parameter, required file strings, exact record widths, ASCII characters, digit fields, amount ranges, nonblank category type, duplicate account/category/group keys, and category/card references to existing accounts. Invalid input fails the entire calculation with errors and empty output lists, with no partial posting or reject file. Empty files are valid. Missing group rates fail even when the associated balance is zero. The supplied calculation remains FAILED.

Wiki basis: intcalc-opus.pdf p.5 identifies the account key and typed date and amount fields; intcalc-opus.pdf p.8 identifies the category composite key and field types. intcalc-opus.pdf p.10 specifies fixed-width inputs and run parameters, while intcalc-opus.pdf p.11 supplies output account fields but no failure protocol. intcalc-opus.pdf p.2 requires group-based rates, supporting the need for a lookup without defining missing-rate handling. The excerpts do not specify this complete validation set, Gregorian strictness, empty-file acceptance, reference enforcement, atomic failure or reject-file behaviour. Those rules are provisional. The supplied FAILED outcome is retained, not recalculated or converted into success.

## P18

Assumed: Return records and assumptions without writing JSON or Markdown files, scheduling, persistence or input mutation. Keep financial results and policy choices deterministic. Have a model compose explanatory assumptions only from the supplied choices and wiki excerpts, not account data. If that output fails or lacks complete policy or citation coverage, retain the complete canonical choices and source excerpts with assumptionsStatus FALLBACK and a warning; do not discard valid financial results. This fallback does not turn the supplied FAILED calculation into a successful one.

Wiki basis: intcalc-opus.pdf p.2 describes a periodic pipeline but does not specify this interface's scheduling or persistence responsibilities. intcalc-opus.pdf p.10 describes 'one JSON file per output', while intcalc-opus.pdf p.11 allows oracle fixed-width dumps and optional flags.json for declared uncertainties. Neither page defines a records-only response, Markdown generation, input mutation, deterministic explanatory generation or an assumptionsStatus fallback. The no-write interface is a provisional limitation relative to the documented file outputs, and the explanation/fallback mechanism is also provisional. It preserves the supplied financial outcome rather than providing grounds to alter a FAILED calculation.
