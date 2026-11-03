# CardDemo interest calculation assumptions

Calculation outcome: FAILED.
Assumption drafting: DRAFTED.
No JSON or Markdown output files were written. Layouts and unresolved legacy behaviour are provisional.

## P01

Assumed: Receive already-decoded file contents in files, not filesystem paths. acctdata.dat and tcatbal.dat are the oracle POSTTRAN outputs. Require acctdata.dat, tcatbal.dat, discgrp.dat and cardxref.dat strings; the other contract files are accepted but unused in this isolated interest step. No POSTTRAN is rerun.

Wiki basis: intcalc-opus.pdf p.10 states that an INTCALC candidate receives "the oracle POSTTRAN outputs as its account and category-balance inputs," supporting step isolation rather than rerunning POSTTRAN. intcalc-opus.pdf p.2 identifies DISCGRP as the interest-rate source. Although p.10 lists the contract input files, it does not specify an in-memory transport, required string arguments or which remaining files an isolated implementation must consume. Those interface and unused-file choices are provisional.

## P02

Assumed: Use a provisional 300-character account layout in wiki order: account ID 11, active status 1, current balance 12, credit limit 12, cash credit limit 12, open date 10, expiration date 10, reissue date 10, cycle credit 12, cycle debit 12, ZIP 10, group 10 and ignored filler 178. The copybook offsets are not supplied.

Wiki basis: intcalc-opus.pdf p.5 describes the account record as "300 bytes" and lists the initial fields and their logical sizes; intcalc-opus.pdf p.6 supplies the cycle totals, ZIP and group fields. intcalc-opus.pdf p.10 requires fixed-width input with "layouts as in the copybooks," while intcalc-opus.pdf p.11 lists the account output fields. These excerpts do not provide copybook offsets or filler placement, nor establish that the byte length is a character length. The sequential character layout and ignored filler are therefore provisional, not verified copybook positions.

## P03

Assumed: Use a provisional 50-character category layout: account ID 11, type 2, category 4, signed balance 11 and ignored filler 22. The copybook offsets are not supplied.

Wiki basis: intcalc-opus.pdf p.8 identifies a "50 bytes" category-balance record and lists accountId 9(11), typeCode X(2), categoryCode 9(4) and balance S9(9)V99. intcalc-opus.pdf p.10 lists tcatbal.dat as width 50 but delegates layouts to copybooks. Neither excerpt supplies physical offsets, signed-number encoding or filler placement. Treating these logical sizes as consecutive character fields followed by filler is provisional.

## P04

Assumed: Use a provisional 50-character cross-reference layout: card 16, customer ID 9, account ID 11 and ignored filler 14. The copybook offsets are not supplied.

Wiki basis: intcalc-opus.pdf p.7 describes CardXref as "50 bytes" and gives cardNumber as 16 characters, customerId as 9 digits and accountId as 11 digits. intcalc-opus.pdf p.10 also lists cardxref.dat at width 50 and refers to copybook layouts. The supplied excerpts omit actual offsets and filler placement, so the consecutive character layout and ignored trailing filler remain provisional.

## P05

Assumed: Use an invented, provisional 50-character disclosure layout: group at positions 1–10, six unsigned digits at positions 11–16 representing a rate with two implied decimal places, and ignored filler 34. The supplied wiki has no disclosure copybook layout.

Wiki basis: intcalc-opus.pdf p.2 says that "interest-rate parameters come from the disclosure-group reference data (DISCGRP)," establishing the reference data's purpose. intcalc-opus.pdf p.10 specifies discgrp.dat CVTRA02Y at width 50, but supplies no disclosure fields, offsets, rate encoding or scale. The proposed group/rate/filler layout and two-decimal rate scale are therefore provisional inventions, not documented disclosure-copybook details.

## P06

Assumed: Input is ASCII-compatible decoded text, with one exact-width record per line, LF or CRLF separators and at most one terminal newline. Monetary fields have two implied decimal places and accept ordinary digits or ASCII zoned final signs {ABCDEFGHI for positive 0–9 and }JKLMNOPQR for negative 0–9. Binary packed decimal and EBCDIC decoding are not implemented. Text is right-trimmed, not left-trimmed.

Wiki basis: intcalc-opus.pdf p.5 maps S9(10)V99 to "decimal, scale 2." intcalc-opus.pdf p.10 requires "one record per line, fixed width" and allows strings to omit trailing spaces; intcalc-opus.pdf p.11 identifies the account output fields and permits an alternative fixed-width dump. These statements support scale-two amounts and trailing-space omission, but do not prescribe decoded ASCII input, zoned-sign characters, line-ending rules, a terminal-newline limit, left-space preservation or decoder exclusions. Those encoding and parsing details are provisional implementation limitations.

## P07

Assumed: Interpret each parsed disclosure rate as a decimal fractional multiplier: multiply currentBalance directly by groupRate, without percentage conversion, annualisation, period conversion or day-count division. Allow exactly one record per group and require every account's group rate, including for zero-balance accounts.

Wiki basis: intcalc-opus.pdf p.2 gives "interest = currentBalance × interestRate(groupId)" but explicitly leaves the exact formula and grouping as a TODO. intcalc-opus.pdf p.4 repeats "Interest = balance × group rate," requires the correct rate per group and states that a zero balance yields zero interest. Neither page defines rate units, time conversions, duplicate-group handling or whether a zero balance bypasses rate lookup. Direct fractional units, uniqueness and mandatory lookup are therefore provisional resolutions of those omissions.

## P08

Assumed: Process every account, including inactive accounts and signed negative balances. Apply no eligibility filter or positive-interest-only rule.

Wiki basis: intcalc-opus.pdf p.2 describes computing interest "for each account," and intcalc-opus.pdf p.4 presents a balance-times-rate rule without an eligibility condition. intcalc-opus.pdf p.5 includes activeStatus and a signed currentBalance, establishing that those attributes exist but not how they affect interest eligibility. The excerpts specify no inactive-account exclusion, negative-balance exclusion or positive-interest threshold. Applying the rule without those filters is provisional.

## P09

Assumed: Compute products with decimal-string integer arithmetic. Round interest once to cents, half away from zero, and then add that rounded amount. Reject overflow rather than clip or wrap. Limit account money to 12 digits of cents and transaction and category money to 11 digits of cents.

Wiki basis: intcalc-opus.pdf p.2 leaves exact rounding as a TODO, and intcalc-opus.pdf p.4 explicitly says "TODO: confirm rounding mode." intcalc-opus.pdf p.5 gives account amounts as S9(10)V99, while intcalc-opus.pdf p.8 gives transaction and category amounts as S9(9)V99; those definitions support the respective 12- and 11-digit cent capacities. intcalc-opus.pdf p.10 permits output amounts with "at most two decimals." The arithmetic mechanism, half-away-from-zero mode, single rounding point and overflow rejection are not specified and remain provisional.

## P10

Assumed: Return every account and change only curr_bal. Preserve active status, credit limits, dates, cycle credit, cycle debit, ZIP and group, using the contract field names. Do not increment cycle totals.

Wiki basis: intcalc-opus.pdf p.2 says interest is "posted to balance and category balance," supporting an account-balance update. intcalc-opus.pdf p.5 and intcalc-opus.pdf p.6 enumerate the account attributes, including cycle credit and debit, but give no instruction to update those totals during interest calculation. intcalc-opus.pdf p.11 supplies the contract names, including curr_bal, curr_cyc_credit and curr_cyc_debit. Preserving every non-balance field and not incrementing cycle totals are provisional because the supplied excerpts do not define those posting side effects.

## P11

Assumed: If rounded interest is zero, leave the account balance unchanged and emit neither an interest transaction nor a new interest-category row.

Wiki basis: intcalc-opus.pdf p.4 explicitly states "Account balance 0; Zero interest," while intcalc-opus.pdf p.2 describes posting interest to account and category balances. intcalc-opus.pdf p.10 requires transaction fields for "every interest transaction written," but does not say whether zero-valued transactions or category rows must be written. Suppressing those records, including when a nonzero product rounds to zero, is a provisional output and posting choice.

## P12

Assumed: Post each nonzero rounded interest amount to the account's category type 01, category 0, creating a category row if absent. Preserve other category balances. Return categoryBalances as ancillary records, not as an additional CONTRACT.md output file.

Wiki basis: intcalc-opus.pdf p.2 expressly says interest is "posted to balance and category balance." intcalc-opus.pdf p.8 defines the category composite key as "accountId + typeCode + categoryCode," supporting a keyed category update. Neither page specifies the interest type/category values, creation of absent rows or preservation rules for other rows. intcalc-opus.pdf p.10 lists intcalc_systran.json and intcalc_acctdata.json, not a category-balance output file. The chosen destination, row-creation behaviour and ancillary return channel are therefore provisional.

## P13

Assumed: Sort accounts numerically by account ID. Generate interest transaction IDs from the ten-digit INTCALC parameter followed by a six-digit emitted-transaction sequence starting at 000001, and fail above 999999 transactions. A rerun on identical input reproduces records rather than tracking an idempotency ledger.

Wiki basis: intcalc-opus.pdf p.10 supplies the INTCALC parameter 2022071800, requires tran_id in transaction output and permits output objects "in any order." intcalc-opus.pdf p.2 describes the interest pipeline but provides no sorting, identifier-generation, sequence-capacity or rerun protocol. Thus numeric sorting, parameter-based IDs, the sequence limit and reproduction without an idempotency ledger are provisional deterministic implementation choices, not documented behavioural requirements.

## P14

Assumed: Populate interest transactions with type_cd 01, cat_cd 0, source INTCALC, desc Interest, signed rounded amt, merchant_id 0, and empty merchant_name, merchant_city and merchant_zip. These transaction metadata defaults are not given by the wiki.

Wiki basis: intcalc-opus.pdf p.2 establishes that interest is posted, and intcalc-opus.pdf p.8 defines the transaction fields and signed amount type. intcalc-opus.pdf p.10 provides the output names, including type_cd, cat_cd, source, desc, amt and merchant fields. These excerpts specify field structures but not the metadata values for an interest transaction. The codes, labels, zero merchant ID and empty merchant text are therefore provisional defaults; the amount represents the interest computed under the separate arithmetic policy.

## P15

Assumed: Select the lexically smallest card string in cardxref.dat for the account. If no mapping exists, use an empty card_num rather than suppressing interest. Permit multiple mappings.

Wiki basis: intcalc-opus.pdf p.7 says CardXref "Links card ↔ customer ↔ account" and has an alternate index on accountId, providing an account-to-card lookup source. intcalc-opus.pdf p.10 requires card_num in transaction output. Neither excerpt defines how to choose among multiple cards or what to do when an account has no card mapping. Lexical selection, acceptance of multiple mappings and an empty-card fallback without suppressing interest are provisional.

## P16

Assumed: Default businessDate to 2022-07-18 and intcalcParameter to 2022071800 only when omitted. Set both transaction timestamps to the chosen business date followed by a space and 00:00:00.000000; do not use a runtime clock. Preserve existing account dates as ISO dates, and allow a blank optional reissue date.

Wiki basis: intcalc-opus.pdf p.10 lists "business date 2022-07-18, INTCALC parameter 2022071800," but does not define omission defaults. intcalc-opus.pdf p.5 identifies the account date fields and date/timestamp conversions; intcalc-opus.pdf p.6 continues the account schema without supplying timestamp or blank-date rules. intcalc-opus.pdf p.8 specifies originTimestamp and processTimestamp as X(26). The midnight values, separator, equal timestamps, clock exclusion, ISO preservation and optional blank reissue date are not prescribed by these excerpts and are provisional.

## P17

Assumed: Validate Gregorian dates, a ten-digit run parameter, required file strings, exact widths, ASCII characters, digit fields, amount ranges, nonblank category type, duplicate account/category/group keys, and category/card references to existing accounts. Invalid input fails the entire calculation with errors and empty output lists; produce no partial posting or reject file. Empty files are valid. Missing group rates fail even when the associated balance is zero.

Wiki basis: intcalc-opus.pdf p.5 supplies account types and the accountId key; intcalc-opus.pdf p.8 supplies category types and its composite key. intcalc-opus.pdf p.10 provides fixed widths and run parameters, while intcalc-opus.pdf p.11 identifies account output fields. intcalc-opus.pdf p.2 requires group-based rates but leaves grouping details unresolved. These statements motivate structural and referential checks, but do not specify the complete validation set, duplicate-group rejection, empty-file acceptance, zero-balance lookup requirements or all-or-nothing failure handling. Those choices are provisional. The supplied calculation remains FAILED with the reported error "Duplicate disclosure group" and empty output lists; this register does not recalculate or partially post results.

## P18

Assumed: Return records and assumptions without writing JSON or Markdown files, scheduling, persistence or mutating input. Financial results and policy choices are deterministic. A model writes explanatory assumptions from choices and wiki excerpts only, not account data. If its output fails or has incomplete policy/citation coverage, retain the complete canonical choices and source excerpts with assumptionsStatus FALLBACK and a warning; do not discard valid financial results.

Wiki basis: intcalc-opus.pdf p.10 describes "one JSON file per output," whereas this implementation uses a return-only interface rather than file production. intcalc-opus.pdf p.11 permits alternative fixed-width dumps and mentions "uncertainties declared before scoring," supporting explicit uncertainty disclosure but not this model-assisted register or fallback mechanism. intcalc-opus.pdf p.2 describes a periodic pipeline without defining scheduling, persistence, mutation controls or explanatory-output handling. The return-only limitation, determinism and assumptions fallback are therefore provisional implementation policies. Preserving valid results on an explanation failure does not convert a failed calculation into a success: the supplied calculation remains FAILED.
