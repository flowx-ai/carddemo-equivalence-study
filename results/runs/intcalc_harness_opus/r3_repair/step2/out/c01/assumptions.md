# CardDemo interest calculation assumptions

Calculation outcome: FAILED.
Assumption drafting: DRAFTED.
No JSON or Markdown output files were written. Layouts and unresolved legacy behaviour are provisional.

## P01

Assumed: Receive already-decoded file contents in files, not filesystem paths. Treat acctdata.dat and tcatbal.dat as the oracle POSTTRAN outputs. Require acctdata.dat, tcatbal.dat, discgrp.dat and cardxref.dat as strings; accept the other contract files but do not use them in this isolated interest step. Do not rerun POSTTRAN.

Wiki basis: intcalc-opus.pdf p.10 states that an INTCALC candidate "receives the oracle POSTTRAN outputs as its account and category-balance inputs," supporting step isolation without rerunning POSTTRAN. intcalc-opus.pdf p.2 identifies DISCGRP as the source of interest-rate parameters. However, the excerpts do not define an in-memory files interface, required string arguments, or handling of unused contract files; those transport and input-selection choices are provisional.

## P02

Assumed: Use a provisional 300-character account layout in wiki field order: account ID 11, active status 1, current balance 12, credit limit 12, cash credit limit 12, open date 10, expiration date 10, reissue date 10, cycle credit 12, cycle debit 12, ZIP 10, group 10, and ignored filler 178. The copybook offsets are not supplied.

Wiki basis: intcalc-opus.pdf p.5 describes the account record as "300 bytes" and supplies the initial field order and logical sizes; intcalc-opus.pdf p.6 continues with cycle amounts, ZIP and group. intcalc-opus.pdf p.10 specifies acctdata.dat as width 300 but refers to "layouts as in the copybooks." intcalc-opus.pdf p.11 lists the output account names, not physical offsets. Because the supplied excerpts omit the copybook offsets and storage representation, the contiguous character layout and filler placement are provisional.

## P03

Assumed: Use a provisional 50-character category-balance layout: account ID 11, type 2, category 4, signed balance 11, and ignored filler 22. The copybook offsets are not supplied.

Wiki basis: intcalc-opus.pdf p.8 specifies a "50 bytes" category-balance record, the account/type/category composite key, and fields 9(11), X(2), 9(4) and S9(9)V99. intcalc-opus.pdf p.10 confirms tcatbal.dat width 50 but delegates layouts to copybooks. Neither excerpt supplies physical offsets or filler placement, so this character layout remains provisional.

## P04

Assumed: Use a provisional 50-character cross-reference layout: card 16, customer ID 9, account ID 11, and ignored filler 14. The copybook offsets are not supplied.

Wiki basis: intcalc-opus.pdf p.7 identifies CardXref as "50 bytes" and lists a 16-character card number, nine-digit customer ID and eleven-digit account ID. intcalc-opus.pdf p.10 confirms cardxref.dat width 50 while referring to copybook layouts. The excerpts do not provide offsets or filler placement; the proposed contiguous character layout is therefore provisional.

## P05

Assumed: Use an invented, provisional 50-character disclosure layout: group at positions 1–10, six unsigned digits at positions 11–16 representing a rate with two implied decimal places, and ignored filler 34. The supplied wiki contains no disclosure copybook layout.

Wiki basis: intcalc-opus.pdf p.2 says that "interest-rate parameters come from the disclosure-group reference data (DISCGRP)." intcalc-opus.pdf p.10 specifies discgrp.dat width 50 and names CVTRA02Y, but supplies no disclosure fields or offsets. Neither excerpt specifies rate encoding or scale. Consequently, the group position, rate position, unsigned encoding, two-place scale and filler are all provisional rather than verified layout facts.

## P06

Assumed: Accept ASCII-compatible decoded text with one exact-width record per line, LF or CRLF separators, and at most one terminal newline. Monetary fields have two implied decimal places and accept ordinary digits or ASCII zoned final signs {ABCDEFGHI for positive digits 0–9 and }JKLMNOPQR for negative digits 0–9. Do not implement binary packed-decimal or EBCDIC decoding. Right-trim text, but do not left-trim it.

Wiki basis: intcalc-opus.pdf p.5 maps S9(10)V99 to "decimal, scale 2," supporting two-decimal monetary interpretation. intcalc-opus.pdf p.10 specifies "one record per line, fixed width" and permits strings to omit trailing spaces. intcalc-opus.pdf p.11 permits oracle fixed-width dumps as an alternative output, but adds no decoding specification. ASCII, zoned-sign mappings, accepted newline forms, terminal-newline limits, unsupported binary/EBCDIC decoding and the precise trimming policy are not specified in these excerpts; those choices are provisional.

## P07

Assumed: Interpret each parsed disclosure rate as a decimal fractional multiplier and calculate currentBalance times groupRate directly, without percentage conversion, annualisation, period conversion or day-count division. Allow exactly one record per group and require every account to have its group rate, including accounts with zero balances.

Wiki basis: intcalc-opus.pdf p.2 gives "interest = currentBalance × interestRate(groupId)" but leaves exact formula and grouping extraction as a TODO. intcalc-opus.pdf p.4 repeats "Interest = balance × group rate," requires the correct rate per group, and states that a zero balance produces zero interest. Neither excerpt defines rate units, conversion conventions, group-record uniqueness or whether zero balances bypass rate lookup. Those interpretations and lookup requirements are provisional.

## P08

Assumed: Process every account, including inactive accounts and accounts with signed negative balances. Apply neither an eligibility filter nor a positive-interest-only rule.

Wiki basis: intcalc-opus.pdf p.2 describes interest computation "for each account." intcalc-opus.pdf p.5 supplies activeStatus and a signed currentBalance field but gives no eligibility rule based on either. intcalc-opus.pdf p.4 includes zero-balance and multiple-group scenarios without defining inactive-account or negative-balance exclusions. Processing those accounts without filtering is therefore provisional where these cases are unspecified.

## P09

Assumed: Compute products using decimal-string integer arithmetic. Round interest once to cents, half away from zero, and then add that rounded amount. Reject overflow instead of clipping or wrapping. Limit account monetary values to 12 digits of cents and transaction and category monetary values to 11 digits of cents.

Wiki basis: intcalc-opus.pdf p.2 leaves exact rounding as a TODO, and intcalc-opus.pdf p.4 explicitly says "TODO: confirm rounding mode." intcalc-opus.pdf p.5 specifies account amounts as S9(10)V99; intcalc-opus.pdf p.8 specifies transaction and category amounts as S9(9)V99, supporting the respective 12- and 11-digit cent capacities. intcalc-opus.pdf p.10 limits output amounts to at most two decimals. The arithmetic technique, half-away-from-zero mode, single rounding point and overflow rejection are not supplied and remain provisional.

## P10

Assumed: Return every account using the contract field names and change only curr_bal. Preserve active status, credit limits, dates, cycle credit, cycle debit, ZIP and group. Do not increment cycle totals.

Wiki basis: intcalc-opus.pdf p.2 says interest is "posted to balance and category balance." intcalc-opus.pdf p.5 lists account status, balances, limits and dates; intcalc-opus.pdf p.6 adds cycle amounts, ZIP and group. intcalc-opus.pdf p.11 supplies the contract account field names. These excerpts do not specify other account-field mutations or cycle-total updates, so preserving every field except curr_bal and leaving cycle totals unchanged is provisional.

## P11

Assumed: When rounded interest is zero, leave the account balance unchanged and emit neither an interest transaction nor a new interest-category row.

Wiki basis: intcalc-opus.pdf p.4 states "Account balance 0; Zero interest," and intcalc-opus.pdf p.2 describes posting computed interest. intcalc-opus.pdf p.10 requests transaction fields for "every interest transaction written" but does not define whether zero-valued transactions or category rows must be written. Suppressing them, including when nonzero calculated interest rounds to zero, is provisional.

## P12

Assumed: Post each nonzero rounded interest amount to the account's category type 01, category 0, creating that category row if absent. Preserve other category balances. Return categoryBalances as ancillary records rather than as an additional CONTRACT.md output file.

Wiki basis: intcalc-opus.pdf p.2 requires interest to be "posted to balance and category balance." intcalc-opus.pdf p.8 defines the category-balance key as accountId + typeCode + categoryCode. intcalc-opus.pdf p.10 names account and interest-transaction output files, but does not name a category-balance output file. The excerpts do not select type 01/category 0, define row creation or preservation rules, or prescribe an ancillary categoryBalances return; these choices are provisional.

## P13

Assumed: Sort accounts numerically by account ID. Form each interest transaction ID from the ten-digit INTCALC parameter followed by a six-digit emitted-transaction sequence beginning at 000001. Fail if more than 999999 transactions would be emitted. Rerunning identical input reproduces records without maintaining an idempotency ledger.

Wiki basis: intcalc-opus.pdf p.10 provides the INTCALC parameter 2022071800 and permits output objects "in any order," allowing but not requiring numeric account sorting. intcalc-opus.pdf p.2 describes the periodic interest step without specifying transaction identifiers or rerun handling. Neither excerpt defines sequence construction, sequence exhaustion or an idempotency ledger; all of these implementation choices are provisional.

## P14

Assumed: Populate interest transactions with type_cd 01, cat_cd 0, source INTCALC, desc Interest, signed rounded amt, merchant_id 0, and empty merchant_name, merchant_city and merchant_zip. The wiki does not supply these transaction metadata defaults.

Wiki basis: intcalc-opus.pdf p.2 establishes the purpose of posting interest. intcalc-opus.pdf p.8 supplies transaction field types, including signed amount S9(9)V99 and merchant fields. intcalc-opus.pdf p.10 supplies the output names type_cd, cat_cd, source, desc, amt and merchant fields. Neither field list assigns interest-specific codes, labels or merchant defaults. Those population choices, including use of the signed rounded interest amount, are provisional.

## P15

Assumed: For each account, select the lexically smallest card string in cardxref.dat. Permit multiple mappings. If no mapping exists, use an empty card_num rather than suppressing interest.

Wiki basis: intcalc-opus.pdf p.7 says CardXref "Links card ↔ customer ↔ account" and has an alternate index on accountId. intcalc-opus.pdf p.10 includes card_num in interest-transaction output. The excerpts do not define account-to-card multiplicity, card selection order or missing-mapping behaviour. Permitting multiple mappings, choosing the lexical minimum and using an empty card without suppressing interest are provisional.

## P16

Assumed: Default businessDate to 2022-07-18 and intcalcParameter to 2022071800 only when omitted. Set both transaction timestamps to the chosen business date followed by a space and 00:00:00.000000, without using the runtime clock. Preserve existing account dates as ISO dates and allow a blank optional reissue date.

Wiki basis: intcalc-opus.pdf p.10 lists "business date 2022-07-18, INTCALC parameter 2022071800," but does not define omission defaults. intcalc-opus.pdf p.5 identifies account date fields and date conversion; intcalc-opus.pdf p.6 supplies no further date-handling rule. intcalc-opus.pdf p.8 defines originTimestamp and processTimestamp as X(26), without prescribing their values. Default-on-omission semantics, midnight timestamps, clock avoidance, ISO preservation and blank optional reissue handling are therefore provisional.

## P17

Assumed: Validate Gregorian dates, a ten-digit run parameter, required file strings, exact widths, ASCII characters, digit fields, amount ranges, nonblank category type, duplicate account/category/group keys, and category/card references to existing accounts. Invalid input fails the entire calculation with errors and empty output lists; produce neither partial postings nor a reject file. Accept empty files. Fail on missing group rates even when the associated balance is zero.

Wiki basis: intcalc-opus.pdf p.5 provides account keys and typed fields; intcalc-opus.pdf p.8 provides category composite keys and typed amounts. intcalc-opus.pdf p.10 specifies fixed widths and run parameters, while intcalc-opus.pdf p.11 supplies output account fields. intcalc-opus.pdf p.2 requires a group-based rate but does not define missing-rate handling. These excerpts support structural checks but do not specify the complete validation set, empty-file acceptance, atomic failure, reject-file handling or zero-balance lookup exceptions; those rules are provisional. The supplied calculation remains FAILED with "Account has no disclosure-group rate" and empty output lists; documenting this policy does not change that outcome.

## P18

Assumed: Return records and assumptions without writing JSON or Markdown files, scheduling, persistence or input mutation. Keep financial results and policy choices deterministic. Have a model compose explanatory assumptions solely from the supplied choices and wiki excerpts, not account data. If that output fails or lacks complete policy or citation coverage, retain the complete canonical choices and source excerpts with assumptionsStatus FALLBACK and a warning; do not discard valid financial results.

Wiki basis: intcalc-opus.pdf p.2 describes a "Periodic pipeline" but provides no scheduling or persistence interface. intcalc-opus.pdf p.10 describes file-based outputs and states, "The contract fixes formats only. It says nothing about behaviour." intcalc-opus.pdf p.11 permits fixed-width dumps and mentions optional flags.json for declared uncertainties, but does not define model-generated assumptions or fallback handling. Returning records instead of writing files, avoiding side effects, deterministic processing, restricting the model's evidence and retaining canonical material on explanation failure are provisional wrapper choices. Preserving valid financial results on an explanation failure does not turn the supplied FAILED calculation into a successful one.
