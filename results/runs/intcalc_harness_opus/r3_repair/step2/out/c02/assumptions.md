# CardDemo interest calculation assumptions

Calculation outcome: FAILED.
Assumption drafting: DRAFTED.
No JSON or Markdown output files were written. Layouts and unresolved legacy behaviour are provisional.

## P01

Assumed: Receive already-decoded file contents in files, not filesystem paths. Treat acctdata.dat and tcatbal.dat as the oracle POSTTRAN outputs. Require strings for acctdata.dat, tcatbal.dat, discgrp.dat and cardxref.dat; accept the other contract files but do not use them in this isolated interest step. Do not rerun POSTTRAN.

Wiki basis: intcalc-opus.pdf p.10 states that an isolated INTCALC candidate "receives the oracle POSTTRAN outputs as its account and category-balance inputs," supporting use of those inputs without rerunning POSTTRAN. intcalc-opus.pdf p.2 identifies DISCGRP as the interest-rate reference source. The excerpts do not specify an in-memory files interface, the exact required subset or how unused contract inputs are handled; those interface choices are provisional.

## P02

Assumed: Use a provisional 300-character account layout, in wiki field order: account ID 11, active status 1, current balance 12, credit limit 12, cash credit limit 12, open date 10, expiration date 10, reissue date 10, cycle credit 12, cycle debit 12, ZIP 10, group 10 and ignored filler 178. The copybook offsets are not supplied.

Wiki basis: intcalc-opus.pdf p.5 describes the account record as "300 bytes" and supplies the initial field types and widths; intcalc-opus.pdf p.6 supplies the cycle amounts, ZIP and group fields. intcalc-opus.pdf p.10 specifies acctdata.dat as width 300 with "layouts as in the copybooks," while intcalc-opus.pdf p.11 lists the output account fields. These excerpts support the field inventory and record length but do not provide physical copybook offsets or filler placement. Consequently, sequential character placement and the stated filler are provisional, not a verified copybook layout.

## P03

Assumed: Use a provisional 50-character category layout: account ID 11, type 2, category 4, signed balance 11 and ignored filler 22. The copybook offsets are not supplied.

Wiki basis: intcalc-opus.pdf p.8 describes a "50 bytes" category-balance record and fields accountId 9(11), typeCode X(2), categoryCode 9(4) and balance S9(9)V99. intcalc-opus.pdf p.10 also gives tcatbal.dat width 50 and refers to copybook layouts. Neither excerpt supplies physical offsets, signed-field encoding or filler placement, so the stated character layout remains provisional.

## P04

Assumed: Use a provisional 50-character cross-reference layout: card 16, customer ID 9, account ID 11 and ignored filler 14. The copybook offsets are not supplied.

Wiki basis: intcalc-opus.pdf p.7 describes CardXref as "50 bytes" and gives cardNumber as 16 characters, customerId as 9 digits and accountId as 11 digits. intcalc-opus.pdf p.10 specifies cardxref.dat width 50. These descriptions support the record length and field sizes but do not establish physical offsets or filler placement; the proposed sequential layout is provisional.

## P05

Assumed: Use an invented, provisional 50-character disclosure layout: group at positions 1–10, six unsigned digits at positions 11–16 representing a rate with two implied decimal places, and ignored filler 34. The supplied wiki has no disclosure copybook layout.

Wiki basis: intcalc-opus.pdf p.2 says that "interest-rate parameters come from the disclosure-group reference data (DISCGRP)," establishing the reference data's purpose. intcalc-opus.pdf p.10 specifies discgrp.dat, copybook CVTRA02Y and width 50, but supplies no disclosure fields, offsets, rate encoding or scale. Thus only the record length and purpose are evidenced; the group placement, six-digit rate representation, implied decimals and filler are provisional inventions.

## P06

Assumed: Accept ASCII-compatible decoded text with one exact-width record per line, LF or CRLF line endings and at most one terminal newline. Monetary fields have two implied decimal places and accept ordinary digits or ASCII zoned final signs: {ABCDEFGHI for positive digits 0–9 and }JKLMNOPQR for negative digits 0–9. Do not implement binary packed-decimal or EBCDIC decoding. Right-trim text, but do not left-trim it.

Wiki basis: intcalc-opus.pdf p.5 maps S9(10)V99 to "decimal, scale 2." intcalc-opus.pdf p.10 requires "one record per line, fixed width" and permits strings to omit trailing spaces. intcalc-opus.pdf p.11 lists the account output fields but adds no encoding rules. The excerpts do not define ASCII, zoned-sign mappings, binary or EBCDIC handling, accepted newline sequences, terminal-newline limits or left-trimming behaviour. Those transport and parsing choices are provisional; scale two and omission of trailing spaces have explicit support.

## P07

Assumed: Interpret each parsed disclosure rate as a decimal fractional multiplier and multiply currentBalance by groupRate directly, without percentage conversion, annualisation, period conversion or day-count division. Allow exactly one record per group. Require a group rate for every account, including zero-balance accounts.

Wiki basis: intcalc-opus.pdf p.2 states "interest = currentBalance × interestRate(groupId)" but also leaves exact formula and grouping extraction as a TODO. intcalc-opus.pdf p.4 states "Interest = balance × group rate," expects the correct rate per group and identifies zero balance as producing zero interest. Neither excerpt establishes rate units, time conversions, duplicate-group handling or whether zero balances bypass rate lookup. Direct fractional interpretation, one-record-per-group enforcement and mandatory lookup for all accounts are therefore provisional.

## P08

Assumed: Process every account, including inactive accounts and signed negative balances. Apply no eligibility filter and no positive-interest-only rule.

Wiki basis: intcalc-opus.pdf p.2 describes computing interest "for each account." intcalc-opus.pdf p.5 includes activeStatus and a signed currentBalance field, but supplies no eligibility rule based on either. intcalc-opus.pdf p.4 covers ordinary multiplication and zero balances without defining exclusions for inactive accounts or negative amounts. Processing those cases without a filter is provisional because the excerpts do not explicitly resolve eligibility or negative-interest posting.

## P09

Assumed: Compute products using decimal-string integer arithmetic. Round interest once to cents, half away from zero, and then add that rounded amount. Reject overflow rather than clipping or wrapping. Limit account monetary fields to 12 digits of cents and transaction and category monetary fields to 11 digits of cents.

Wiki basis: intcalc-opus.pdf p.2 leaves exact rounding as a TODO, and intcalc-opus.pdf p.4 explicitly says "TODO: confirm rounding mode." intcalc-opus.pdf p.5 gives account money as S9(10)V99; intcalc-opus.pdf p.8 gives transaction and category money as S9(9)V99, supporting the respective decimal capacities. intcalc-opus.pdf p.10 permits output amounts with "at most two decimals." The excerpts do not specify arithmetic machinery, rounding mode or stage, or overflow handling. Decimal-string arithmetic, one half-away-from-zero rounding before addition and overflow rejection are provisional choices.

## P10

Assumed: Return every account and change only curr_bal. Preserve active status, credit limits, dates, cycle credit, cycle debit, ZIP and group. Use the contract field names and do not increment cycle totals.

Wiki basis: intcalc-opus.pdf p.2 requires interest to be "posted to balance and category balance," supporting a current-balance update. intcalc-opus.pdf p.5 and intcalc-opus.pdf p.6 identify the other account fields, including cycle totals. intcalc-opus.pdf p.11 supplies contract names such as curr_bal, curr_cyc_credit and curr_cyc_debit. The excerpts do not specify secondary account mutations or cycle-total increments; preserving all fields except curr_bal and leaving cycle totals unchanged is provisional.

## P11

Assumed: When rounded interest is zero, leave the account balance unchanged and emit neither an interest transaction nor a new interest-category row.

Wiki basis: intcalc-opus.pdf p.4 states "Account balance 0; Zero interest," and intcalc-opus.pdf p.2 describes posting calculated interest to balances. intcalc-opus.pdf p.10 requires transaction fields for "every interest transaction written" but does not require writing a zero-amount transaction. No excerpt specifies suppression of zero transactions or category-row creation, including when a nonzero product rounds to zero. Those suppression choices are provisional.

## P12

Assumed: Post each nonzero rounded interest amount to the account's category type 01, category 0, creating that category row if absent. Preserve other category balances. Return categoryBalances as ancillary records, not as an additional CONTRACT.md output file.

Wiki basis: intcalc-opus.pdf p.2 explicitly requires interest to be "posted to balance and category balance." intcalc-opus.pdf p.8 defines the category composite key as "accountId + typeCode + categoryCode." intcalc-opus.pdf p.10 names only intcalc_systran.json and intcalc_acctdata.json as interest-step outputs. The excerpts do not identify the interest category codes, define missing-row creation or unrelated-row handling, or specify an ancillary categoryBalances response. Those details are provisional, while category-balance posting itself is supported.

## P13

Assumed: Sort accounts numerically by account ID. Form interest transaction IDs from the ten-digit INTCALC parameter followed by a six-digit emitted-transaction sequence beginning at 000001. Fail if more than 999999 transactions would be emitted. Rerunning identical input reproduces records rather than consulting or maintaining an idempotency ledger.

Wiki basis: intcalc-opus.pdf p.10 gives the INTCALC parameter 2022071800 and permits output objects "in any order," leaving deterministic numeric ordering available as an implementation choice. intcalc-opus.pdf p.2 defines interest computation and posting but no transaction-ID generation, sequence limit or rerun protocol. Neither supplied excerpt specifies the parameter-plus-sequence scheme or an idempotency ledger. Ordering, ID construction, sequence-limit failure and reproducible reruns without a ledger are provisional.

## P14

Assumed: Populate interest transactions with type_cd 01, cat_cd 0, source INTCALC, desc Interest, the signed rounded interest as amt, merchant_id 0, and empty merchant_name, merchant_city and merchant_zip. These metadata defaults are not supplied by the wiki.

Wiki basis: intcalc-opus.pdf p.2 establishes that the posting represents calculated interest. intcalc-opus.pdf p.8 supplies transaction field types, including a signed amount, while intcalc-opus.pdf p.10 supplies output names such as type_cd, cat_cd, source, desc and amt. The excerpts do not prescribe interest-specific type/category codes, source text, description or merchant defaults. These population defaults and use of the chosen rounded amount are provisional, not documented transaction metadata behaviour.

## P15

Assumed: For each account, select the lexically smallest card string in cardxref.dat. Permit multiple mappings. If no mapping exists, set card_num to an empty string rather than suppressing interest.

Wiki basis: intcalc-opus.pdf p.7 says CardXref "Links card ↔ customer ↔ account" and has an alternate index on accountId, supporting account-based card lookup. intcalc-opus.pdf p.10 includes card_num among transaction output fields. Neither excerpt defines account-to-card cardinality, selection among multiple cards or treatment of an unmapped account. Lexical selection, multiple mappings and an empty card_num without interest suppression are provisional.

## P16

Assumed: Default businessDate to 2022-07-18 and intcalcParameter to 2022071800 only when omitted. Set both transaction timestamps to the chosen business date followed by a space and 00:00:00.000000; do not use the runtime clock. Preserve existing account dates as ISO dates and allow a blank optional reissue date.

Wiki basis: intcalc-opus.pdf p.10 lists "business date 2022-07-18, INTCALC parameter 2022071800," but does not define omission-only defaulting. intcalc-opus.pdf p.5 identifies account dates as X(10) date fields, and intcalc-opus.pdf p.6 continues the account inventory without further date rules. intcalc-opus.pdf p.8 defines originTimestamp and processTimestamp as X(26). The excerpts do not specify timestamp values, separators, runtime-clock use, ISO preservation or optional blank reissue dates. Those date-handling and defaulting details are provisional.

## P17

Assumed: Validate Gregorian dates, a ten-digit run parameter, required file strings, exact record widths, ASCII characters, digit fields, amount ranges, nonblank category type, duplicate account/category/group keys, and category/card references to existing accounts. Invalid input fails the entire calculation with errors and empty output lists; produce no partial posting or reject file. Accept empty files. Missing group rates fail even when the associated account balance is zero.

Wiki basis: intcalc-opus.pdf p.5 supplies account field types and an account key; intcalc-opus.pdf p.8 supplies category types, amount precision and a composite key. intcalc-opus.pdf p.10 specifies fixed-width inputs and run parameters but warns, "The contract fixes formats only. It says nothing about behaviour." intcalc-opus.pdf p.11 lists output account fields without defining failure outputs. intcalc-opus.pdf p.2 makes group-rate lookup part of the interest formula. These statements motivate structural checks, but do not define the complete validation regime, Gregorian enforcement, reference checks, duplicate rejection, empty-file acceptance, atomic failure, reject-file handling or mandatory rate lookup for zero balances. Those choices are provisional. The supplied calculation remains FAILED with the reported error "Account has no disclosure-group rate" and empty output lists; this register does not change that outcome.

## P18

Assumed: Return records and assumptions without writing JSON or Markdown files, scheduling work, persisting state or mutating input. Keep financial results and policy choices deterministic. Have the model compose explanatory assumptions solely from the choices and wiki excerpts, not account data. If that explanatory output fails or has incomplete policy or citation coverage, retain the complete canonical choices and source excerpts with assumptionsStatus FALLBACK and a warning; do not discard valid financial results because explanation generation failed.

Wiki basis: intcalc-opus.pdf p.2 describes a periodic financial pipeline but does not define scheduling or persistence for this interface. intcalc-opus.pdf p.10 describes "one JSON file per output," whereas intcalc-opus.pdf p.11 permits oracle fixed-width dumps and mentions optional uncertainty flags. These are output-format alternatives, not a specification for an in-memory response or an explanatory model. The excerpts do not define no-write transport, input immutability, determinism, explanation-source restrictions, coverage validation or an assumptionsStatus FALLBACK mechanism. Those interface and explanation-failure policies are provisional. Preserving valid financial results during an explanation failure does not convert the supplied FAILED calculation into a successful one.
