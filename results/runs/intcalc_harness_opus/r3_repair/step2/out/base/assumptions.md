# CardDemo interest calculation assumptions

Calculation outcome: FAILED.
Assumption drafting: DRAFTED.
No JSON or Markdown output files were written. Layouts and unresolved legacy behaviour are provisional.

## P01

Assumed: Receive already-decoded file contents in files, not filesystem paths. Treat acctdata.dat and tcatbal.dat as the oracle POSTTRAN outputs. Require acctdata.dat, tcatbal.dat, discgrp.dat and cardxref.dat to be strings. Accept the other contract files but do not use them in this isolated interest step, and do not rerun POSTTRAN.

Wiki basis: intcalc-opus.pdf p.10 explicitly states that an isolated INTCALC candidate receives 'the oracle POSTTRAN outputs as its account and category-balance inputs.' intcalc-opus.pdf p.2 identifies DISCGRP as the source of interest-rate parameters. These statements support using the supplied post-POSTTRAN balances and disclosure data. The excerpts do not specify an in-memory files interface, required string values, or which remaining files must be consumed; those transport and input-selection choices are provisional.

## P02

Assumed: Use a provisional 300-character account layout in wiki field order: account ID 11, active status 1, current balance 12, credit limit 12, cash credit limit 12, open date 10, expiration date 10, reissue date 10, cycle credit 12, cycle debit 12, ZIP 10, group 10, and ignored filler 178. The supplied excerpts do not provide copybook offsets.

Wiki basis: intcalc-opus.pdf p.5 describes an account record of '300 bytes' and gives the initial field definitions. intcalc-opus.pdf p.6 supplies the cycle totals, ZIP and group fields. intcalc-opus.pdf p.10 confirms acctdata.dat has width 300 but refers layouts to the copybooks. intcalc-opus.pdf p.11 supplies output account field names, not physical offsets. Together these support the field inventory and record size, but not contiguous placement, character-based storage widths or filler placement; the proposed layout is therefore provisional.

## P03

Assumed: Use a provisional 50-character category-balance layout: account ID 11, type 2, category 4, signed balance 11, and ignored filler 22. The supplied excerpts do not provide copybook offsets.

Wiki basis: intcalc-opus.pdf p.8 identifies a 50-byte category-balance record and lists 'accountId 9(11), typeCode X(2), categoryCode 9(4), balance S9(9)V99.' intcalc-opus.pdf p.10 confirms tcatbal.dat width 50 and directs readers to copybook layouts. Neither excerpt supplies offsets or filler locations, so the contiguous character layout and ignored remainder are provisional.

## P04

Assumed: Use a provisional 50-character cross-reference layout: card 16, customer ID 9, account ID 11, and ignored filler 14. The supplied excerpts do not provide copybook offsets.

Wiki basis: intcalc-opus.pdf p.7 describes CardXref as a 50-byte record linking card, customer and account, with field lengths 16, 9 and 11 respectively. intcalc-opus.pdf p.10 confirms cardxref.dat width 50 but leaves layout details to the copybook. The excerpts do not establish physical offsets, contiguous field placement or the final 14 characters as filler; those layout choices are provisional.

## P05

Assumed: Use an invented, provisional 50-character disclosure layout: group in positions 1–10, six unsigned digits in positions 11–16 representing a rate with two implied decimal places, and ignored filler 34. The supplied wiki excerpts contain no disclosure copybook layout.

Wiki basis: intcalc-opus.pdf p.2 states that 'interest-rate parameters come from the disclosure-group reference data (DISCGRP),' establishing the reference data's purpose. intcalc-opus.pdf p.10 specifies discgrp.dat width 50 but supplies no disclosure fields, offsets, rate representation or scale. Consequently, the group position, six-digit rate, implied decimals and filler are provisional inventions rather than documented layout facts.

## P06

Assumed: Accept ASCII-compatible decoded text with one exact-width record per line, LF or CRLF line endings, and at most one terminal newline. Interpret monetary fields with two implied decimal places, accepting ordinary digits or ASCII zoned final signs {ABCDEFGHI for positive digits 0–9 and }JKLMNOPQR for negative digits 0–9. Do not implement binary packed-decimal or EBCDIC decoding. Right-trim text without left-trimming it.

Wiki basis: intcalc-opus.pdf p.5 maps S9(10)V99 to a decimal with 'scale 2.' intcalc-opus.pdf p.10 requires 'one record per line, fixed width' and permits strings to omit trailing spaces. intcalc-opus.pdf p.11 lists the account output fields but adds no encoding rules. The excerpts do not define input character encoding, sign-byte representation, newline variants, terminal-newline limits or input trimming. The specific text decoder, sign alphabet, unsupported encodings and trimming rules are therefore provisional.

## P07

Assumed: Interpret each parsed disclosure rate as a decimal fractional multiplier and calculate currentBalance times groupRate directly, without percentage conversion, annualisation, period conversion or day-count division. Allow exactly one record per group. Require every account to have its group rate, including accounts with zero balances.

Wiki basis: intcalc-opus.pdf p.2 gives 'interest = currentBalance × interestRate(groupId)' but also leaves the exact formula and grouping as a TODO. intcalc-opus.pdf p.4 repeats balance times group rate, requires the correct rate per group, and describes zero balance as producing zero interest. Neither page specifies rate units, time conversions, duplicate-group handling or whether zero balances bypass rate lookup. The direct fractional-rate interpretation, uniqueness constraint and universal lookup requirement are provisional.

## P08

Assumed: Process every account, including inactive accounts and accounts with signed negative balances. Apply no eligibility filter and no positive-interest-only rule.

Wiki basis: intcalc-opus.pdf p.2 describes interest computation 'for each account.' intcalc-opus.pdf p.4 presents balance-based scenarios without an eligibility condition. intcalc-opus.pdf p.5 includes activeStatus and a signed currentBalance field, but does not say that either limits processing. Processing all statuses and both balance signs is therefore a provisional interpretation of the stated scope, not a verified eligibility rule.

## P09

Assumed: Compute products using decimal-string integer arithmetic. Round interest once to cents, half away from zero, and then add that rounded amount. Reject overflow instead of clipping or wrapping. Limit account monetary values to 12 digits of cents and transaction and category monetary values to 11 digits of cents.

Wiki basis: intcalc-opus.pdf p.2 leaves exact rounding as a TODO, and intcalc-opus.pdf p.4 expressly says 'TODO: confirm rounding mode.' intcalc-opus.pdf p.5 defines account money as S9(10)V99; intcalc-opus.pdf p.8 defines transaction and category money as S9(9)V99. Those definitions support the stated cent capacities, while intcalc-opus.pdf p.10 limits output amounts to at most two decimals. The arithmetic technique, half-away-from-zero rule, single rounding point and overflow rejection are unspecified and therefore provisional.

## P10

Assumed: Return every account using the contract field names and change only curr_bal. Preserve active status, credit limits, dates, cycle credit, cycle debit, ZIP and group. Do not increment cycle totals.

Wiki basis: intcalc-opus.pdf p.2 says interest is 'posted to balance and category balance,' supporting a current-balance update. intcalc-opus.pdf p.5 and intcalc-opus.pdf p.6 identify the remaining account attributes, including separate cycle-credit and cycle-debit fields. intcalc-opus.pdf p.11 provides the output names: acct_id, active_status, curr_bal, credit_limit, cash_credit_limit, open_date, expiration_date, reissue_date, curr_cyc_credit, curr_cyc_debit, addr_zip and group_id. The excerpts do not specify changes to other account fields or cycle totals; preserving them and returning every account are provisional scope choices.

## P11

Assumed: When rounded interest is zero, leave the account balance unchanged and emit neither an interest transaction nor a new interest-category row.

Wiki basis: intcalc-opus.pdf p.4 states 'Account balance 0; Zero interest,' and intcalc-opus.pdf p.2 describes posting calculated interest to balances. intcalc-opus.pdf p.10 requires output fields for every interest transaction written but does not define whether zero-value transactions must be written. The excerpts also do not address nonzero products that round to zero or zero-value category creation. Suppressing transactions and new category rows for all rounded-zero amounts is provisional.

## P12

Assumed: Post each nonzero rounded interest amount to the account's category type 01, category 0, creating that category row if absent. Preserve all other category balances. Return categoryBalances as ancillary records rather than as an additional CONTRACT.md output file.

Wiki basis: intcalc-opus.pdf p.2 expressly requires interest to be 'posted to balance and category balance.' intcalc-opus.pdf p.8 defines the category key as accountId plus typeCode plus categoryCode, but does not identify an interest category or describe missing-row handling. intcalc-opus.pdf p.10 names intcalc_systran.json and intcalc_acctdata.json, not a categoryBalances output file. The category values, row-creation behavior, preservation of other rows and ancillary return channel are therefore provisional.

## P13

Assumed: Sort accounts numerically by account ID. Form each interest transaction ID from the ten-digit INTCALC parameter followed by a six-digit emitted-transaction sequence beginning 000001. Fail if more than 999999 transactions would be emitted. Identical-input reruns reproduce the records without maintaining an idempotency ledger.

Wiki basis: intcalc-opus.pdf p.10 supplies the INTCALC parameter 2022071800, includes tran_id among output fields, and permits output objects 'in any order.' intcalc-opus.pdf p.2 describes the periodic calculation but gives no transaction-ID construction, sequencing, ordering or rerun-state rules. Thus numerical sorting, parameter-based IDs, the sequence ceiling and record reproduction without an idempotency ledger are provisional implementation choices.

## P14

Assumed: Populate interest transactions with type_cd 01, cat_cd 0, source INTCALC, desc Interest, signed rounded amt, merchant_id 0, and empty merchant_name, merchant_city and merchant_zip. The wiki does not supply these transaction metadata defaults.

Wiki basis: intcalc-opus.pdf p.2 establishes that calculated interest is posted, but provides no transaction metadata values. intcalc-opus.pdf p.8 defines transaction field types, including signed amount and merchant fields. intcalc-opus.pdf p.10 gives their contract names, including type_cd, cat_cd, source, desc, amt and merchant fields. These sources support the output structure, not the selected codes, labels or empty merchant values; those defaults and use of the rounded amount are provisional.

## P15

Assumed: For each account, select the lexically smallest card string in cardxref.dat. Permit multiple mappings. If no mapping exists, use an empty card_num rather than suppressing interest.

Wiki basis: intcalc-opus.pdf p.7 says CardXref 'Links card ↔ customer ↔ account' and has an alternate index on accountId, supporting account-based card lookup. intcalc-opus.pdf p.10 includes card_num in transaction output. Neither excerpt establishes a preferred card, account-level mapping cardinality, or missing-mapping behavior. Lexical selection, acceptance of multiple mappings and an empty-card fallback without suppressing interest are provisional.

## P16

Assumed: Default businessDate to 2022-07-18 and intcalcParameter to 2022071800 only when omitted. Set both transaction timestamps to the chosen business date followed by a space and 00:00:00.000000, without consulting a runtime clock. Preserve existing account dates as ISO dates and allow a blank optional reissue date.

Wiki basis: intcalc-opus.pdf p.10 supplies the business date and INTCALC parameter and names orig_ts and proc_ts. intcalc-opus.pdf p.8 defines both transaction timestamps as X(26). intcalc-opus.pdf p.5 identifies account date fields and date/timestamp conversions; intcalc-opus.pdf p.6 continues the account definition but does not establish reissue-date optionality. The excerpts do not prescribe omission-only defaults, midnight timestamps, clock avoidance, ISO serialization or blank reissue dates. Those temporal conventions are provisional.

## P17

Assumed: Validate Gregorian dates, the ten-digit run parameter, required file strings, exact record widths, ASCII characters, digit fields, amount ranges, nonblank category type, duplicate account/category/group keys, and category/card references to existing accounts. Invalid input fails the entire calculation with errors and empty output lists; produce neither partial postings nor a reject file. Empty files are valid. Missing group rates fail even for zero-balance accounts. The supplied calculation remains FAILED, with the reported error Account has no disclosure-group rate and empty output lists.

Wiki basis: intcalc-opus.pdf p.5 defines account keys and typed fields, while intcalc-opus.pdf p.8 defines the category composite key and monetary fields. intcalc-opus.pdf p.10 establishes fixed-width inputs and run parameters, and intcalc-opus.pdf p.11 lists typed account output fields. intcalc-opus.pdf p.2 makes calculation dependent on a disclosure-group rate. These support structural and reference checks, but do not specify the complete validation set, Gregorian validation, duplicate rejection, empty-file acceptance, zero-balance rate requirements or atomic failure handling. Those choices are provisional. The supplied FAILED outcome is retained as reported, not inferred as documented legacy behavior.

## P18

Assumed: Return records and assumptions without writing JSON or Markdown files, scheduling work, persisting state or mutating input. Keep financial results and policy choices deterministic. Generate explanatory assumptions only from the supplied choices and wiki excerpts, not account data. If explanatory output fails or lacks complete policy or citation coverage, retain the complete canonical choices and source excerpts with assumptionsStatus FALLBACK and a warning; do not discard valid financial results. This explanatory fallback does not convert the supplied FAILED calculation into a successful one.

Wiki basis: intcalc-opus.pdf p.10 describes file-based outputs but cautions that the contract 'fixes formats only' and 'says nothing about behaviour.' intcalc-opus.pdf p.11 permits oracle fixed-width dumps instead and mentions optional uncertainty declarations. intcalc-opus.pdf p.2 defines the financial calculation but provides no model-generated explanation workflow. The excerpts do not specify an in-memory-only return interface, scheduling or persistence limits, immutability, deterministic execution, explanatory data restrictions or FALLBACK handling. These are provisional interface and operational choices, not evidence that files were written or that the failed financial calculation succeeded.
