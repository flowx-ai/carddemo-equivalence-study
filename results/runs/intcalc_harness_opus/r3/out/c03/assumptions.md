# CardDemo interest calculation assumptions

Calculation outcome: FAILED.
Assumption drafting: DRAFTED.
No JSON or Markdown output files were written. Layouts and unresolved legacy behaviour are provisional.

## P01

Assumed: Receive already-decoded file contents through files, not filesystem paths. Require acctdata.dat, tcatbal.dat, discgrp.dat and cardxref.dat as strings. Treat acctdata.dat and tcatbal.dat as the oracle POSTTRAN outputs; do not rerun POSTTRAN. Accept the other contract files but do not use them in this isolated interest step.

Wiki basis: intcalc-opus.pdf p.10 states that an INTCALC candidate "receives the oracle POSTTRAN outputs as its account and category-balance inputs," supporting step isolation and not rerunning POSTTRAN. intcalc-opus.pdf p.2 identifies account balances and DISCGRP as the interest inputs. The excerpts do not define an in-memory files interface, required string arguments or how unused contract files are handled; those transport and input-selection choices are provisional.

## P02

Assumed: Use a provisional 300-character account layout in wiki field order: account ID 11, active status 1, current balance 12, credit limit 12, cash credit limit 12, open date 10, expiration date 10, reissue date 10, cycle credit 12, cycle debit 12, ZIP 10, group 10 and ignored filler 178. The supplied excerpts do not provide copybook offsets.

Wiki basis: intcalc-opus.pdf p.5 identifies the account record as "300 bytes" and lists the initial fields and their declared sizes; intcalc-opus.pdf p.6 supplies the cycle amounts, ZIP and group fields. intcalc-opus.pdf p.10 confirms a width of 300 and says layouts are "as in the copybooks," while intcalc-opus.pdf p.11 lists the account output fields. None supplies copybook offsets or filler placement. Sequential character placement and the 178-character filler are therefore provisional rather than a verified copybook layout.

## P03

Assumed: Use a provisional 50-character category-balance layout: account ID 11, type 2, category 4, signed balance 11 and ignored filler 22. The supplied excerpts do not provide copybook offsets.

Wiki basis: intcalc-opus.pdf p.8 identifies a "50 bytes" category-balance record and declares accountId 9(11), typeCode X(2), categoryCode 9(4) and balance S9(9)V99. intcalc-opus.pdf p.10 confirms tcatbal.dat has width 50 but refers to copybooks for layouts. The excerpts do not supply offsets, physical sign encoding or filler placement; the sequential character layout and 22-character filler are provisional.

## P04

Assumed: Use a provisional 50-character card cross-reference layout: card 16, customer ID 9, account ID 11 and ignored filler 14. The supplied excerpts do not provide copybook offsets.

Wiki basis: intcalc-opus.pdf p.7 describes CardXref as "50 bytes" and gives cardNumber as 16 characters, customerId as 9 digits and accountId as 11 digits. intcalc-opus.pdf p.10 confirms the 50-character contract width and refers to copybooks. Neither excerpt supplies field offsets or filler placement, so the sequential layout and 14-character filler remain provisional.

## P05

Assumed: Use an invented, provisional 50-character disclosure layout: group in positions 1–10, six unsigned digits in positions 11–16 representing a rate with two implied decimal places, and ignored filler 34. The supplied wiki excerpts contain no disclosure copybook layout.

Wiki basis: intcalc-opus.pdf p.2 says that "interest-rate parameters come from the disclosure-group reference data (DISCGRP)," establishing the reference data's role. intcalc-opus.pdf p.10 gives discgrp.dat a width of 50 but no field definitions. Neither excerpt specifies group positions, rate width, rate scale or filler. All of those layout and encoding details are provisional implementation choices, not extracted disclosure-copybook facts.

## P06

Assumed: Accept ASCII-compatible, already-decoded text with one exact-width record per line, LF or CRLF line endings and at most one terminal newline. Monetary fields have two implied decimal places and accept ordinary digits or final ASCII zoned signs {ABCDEFGHI for positive digits 0–9 and }JKLMNOPQR for negative digits 0–9. Do not implement binary packed-decimal or EBCDIC decoding. Right-trim text without left-trimming it.

Wiki basis: intcalc-opus.pdf p.5 describes S9(10)V99 as "decimal, scale 2," supporting two-decimal monetary interpretation but not a physical encoding. intcalc-opus.pdf p.10 requires "one record per line, fixed width" and permits strings to omit trailing spaces, supporting fixed-width parsing and right-trimming. intcalc-opus.pdf p.11 supplies account field names and permits fixed-width dumps as an output alternative, without defining input encoding. ASCII, zoned-sign mappings, accepted line endings, terminal-newline limits, preservation of leading spaces and exclusion of binary/EBCDIC decoding are unspecified and provisional.

## P07

Assumed: Interpret each parsed disclosure rate as a decimal fractional multiplier and calculate currentBalance times groupRate directly, without percentage conversion, annualisation, period conversion or day-count division. Allow exactly one record per group. Require a group rate for every account, including accounts with zero balances.

Wiki basis: intcalc-opus.pdf p.2 gives "interest = currentBalance × interestRate(groupId)" but explicitly leaves the exact formula and grouping for further extraction. intcalc-opus.pdf p.4 repeats "Interest = balance × group rate," requires the correct rate per group and states that zero balance yields zero interest. Neither excerpt defines rate units, time conversions, duplicate-group handling or whether zero balances bypass rate lookup. The direct fractional-rate interpretation and strict group-lookup requirements are therefore provisional.

## P08

Assumed: Process every account, including inactive accounts and accounts with signed negative balances. Apply neither an eligibility filter nor a positive-interest-only rule.

Wiki basis: intcalc-opus.pdf p.2 describes computing interest "for each account," and intcalc-opus.pdf p.4 illustrates balance-times-group-rate calculation without an eligibility condition. intcalc-opus.pdf p.5 includes activeStatus and a signed currentBalance field, but gives no interest exclusion based on either value. Processing inactive and negative-balance accounts without filtering is therefore a provisional interpretation of the broad account population, not confirmed eligibility behaviour.

## P09

Assumed: Compute products using decimal-string integer arithmetic. Round interest once to cents, half away from zero, and then add the rounded amount. Reject overflow rather than clipping or wrapping. Limit account monetary values to 12 digits of cents and transaction and category monetary values to 11 digits of cents.

Wiki basis: intcalc-opus.pdf p.2 leaves rounding unresolved, and intcalc-opus.pdf p.4 explicitly says "TODO: confirm rounding mode." intcalc-opus.pdf p.5 declares account amounts as S9(10)V99, while intcalc-opus.pdf p.8 declares transaction and category amounts as S9(9)V99; these support the respective 12- and 11-digit cent capacities. intcalc-opus.pdf p.10 permits output amounts with "at most two decimals." The excerpts do not specify arithmetic representation, rounding direction, rounding stage or overflow handling, so those choices are provisional.

## P10

Assumed: Return every account using the contract field names and change only curr_bal. Preserve active status, credit limits, dates, cycle credit, cycle debit, ZIP and group. Do not increment cycle totals.

Wiki basis: intcalc-opus.pdf p.2 says interest is "posted to balance and category balance," identifying balance changes but not cycle-total changes. intcalc-opus.pdf p.5 and intcalc-opus.pdf p.6 enumerate the account attributes to preserve, and intcalc-opus.pdf p.11 provides their contract output names. The excerpts do not explicitly define preservation of all nonbalance fields or cycle-total posting behaviour. Those restrictions are provisional choices that avoid adding unspecified account mutations.

## P11

Assumed: When rounded interest is zero, leave the account balance unchanged and emit neither an interest transaction nor a new interest-category row.

Wiki basis: intcalc-opus.pdf p.4 states "Account balance 0; Zero interest," and intcalc-opus.pdf p.2 describes posting calculated interest to account and category balances. intcalc-opus.pdf p.10 requires transaction output for "every interest transaction written," but does not require writing zero-amount transactions. The excerpts do not specify suppression of transactions or category-row creation when interest rounds to zero, so that suppression policy is provisional.

## P12

Assumed: Post each nonzero rounded interest amount to the account's category type 01, category 0, creating that category row if absent. Preserve all other category balances. Return categoryBalances as ancillary records, not as an additional CONTRACT.md output file.

Wiki basis: intcalc-opus.pdf p.2 explicitly requires interest to be "posted to balance and category balance." intcalc-opus.pdf p.8 defines the category composite key as "accountId + typeCode + categoryCode," providing the structure for a posting target. intcalc-opus.pdf p.10 names the interest-transaction and account outputs but does not specify a categoryBalances output file. The target codes, missing-row creation, preservation of other categories and ancillary return mechanism are absent from the excerpts and remain provisional.

## P13

Assumed: Sort accounts numerically by account ID. Construct interest transaction IDs by concatenating the ten-digit INTCALC parameter with a six-digit emitted-transaction sequence starting at 000001. Fail if more than 999999 transactions would be emitted. Reproduce records on identical-input reruns rather than maintaining an idempotency ledger.

Wiki basis: intcalc-opus.pdf p.10 supplies the INTCALC parameter 2022071800 and permits output lists "in any order," leaving numeric sorting available as an implementation choice. intcalc-opus.pdf p.2 describes periodic interest calculation but gives no transaction-ID construction or rerun semantics. Neither assigned excerpt defines sequence allocation, sequence exhaustion or an idempotency ledger. Sorting, parameter-based IDs, the sequence limit and reproducible reruns without a ledger are provisional.

## P14

Assumed: Populate each interest transaction with type_cd 01, cat_cd 0, source INTCALC, desc Interest, the signed rounded interest as amt, merchant_id 0, and empty merchant_name, merchant_city and merchant_zip. These transaction metadata defaults are not specified by the supplied wiki.

Wiki basis: intcalc-opus.pdf p.2 establishes that the posting represents calculated interest. intcalc-opus.pdf p.8 defines transaction fields and their types, including a signed amount, and intcalc-opus.pdf p.10 supplies the contract names type_cd, cat_cd, source, desc, amt and merchant fields. The excerpts do not assign interest-specific codes, descriptions, source values or merchant defaults. Those population defaults are provisional; field definitions alone do not establish their values.

## P15

Assumed: For each account, select the lexically smallest card string in cardxref.dat. Permit multiple mappings. If no mapping exists, use an empty card_num instead of suppressing interest.

Wiki basis: intcalc-opus.pdf p.7 says CardXref "Links card ↔ customer ↔ account" and has an "alternate index on accountId," supporting account-based card lookup. intcalc-opus.pdf p.10 includes card_num in transaction output. Neither excerpt defines selection among multiple cards, limits an account to one mapping or prescribes missing-mapping behaviour. Lexical selection, acceptance of multiple mappings and an empty-card fallback without suppressing interest are provisional.

## P16

Assumed: Default businessDate to 2022-07-18 and intcalcParameter to 2022071800 only when omitted. Set both transaction timestamps to the chosen business date followed by a separating space and 00:00:00.000000; do not use the runtime clock. Preserve existing account dates as ISO dates and allow a blank optional reissue date.

Wiki basis: intcalc-opus.pdf p.10 lists "business date 2022-07-18" and "INTCALC parameter 2022071800," but does not define omission-only defaulting. intcalc-opus.pdf p.5 identifies account date fields as X(10) dates, intcalc-opus.pdf p.6 continues the account schema without adding date-handling rules, and intcalc-opus.pdf p.8 declares originTimestamp and processTimestamp as X(26). These declarations do not specify midnight timestamps, clock use, ISO rendering, date preservation or blank reissue-date acceptance. Those temporal details and defaulting semantics are provisional.

## P17

Assumed: Validate Gregorian dates, a ten-digit run parameter, required file strings, exact record widths, ASCII characters, digit fields, monetary ranges, nonblank category type, duplicate account/category/group keys, and category/card references to existing accounts. Invalid input fails the entire calculation with errors and empty output lists; produce neither partial postings nor a reject file. Accept empty files. Fail on missing group rates even when the associated balance is zero. The supplied calculation remains FAILED with the reported Duplicate disclosure group error and empty output lists.

Wiki basis: intcalc-opus.pdf p.5 defines accountId as a key and declares numeric, monetary and date types; intcalc-opus.pdf p.8 defines the category composite key and amount types. intcalc-opus.pdf p.10 requires fixed widths and supplies run parameters, while intcalc-opus.pdf p.11 lists account output fields without defining error output. intcalc-opus.pdf p.2 requires group-based rates but leaves exact grouping unresolved. These statements motivate structural validation, but do not specify the complete checks, duplicate-group rule, reference enforcement, empty-file acceptance, zero-balance lookup requirement or all-or-nothing failure protocol. Those are provisional policies. Documenting them does not change the supplied failed outcome.

## P18

Assumed: Return records and assumptions without writing JSON or Markdown files, scheduling work, persisting state or mutating input. Keep financial results and policy choices deterministic. Have a model compose explanatory assumptions solely from the supplied choices and wiki excerpts, not account data. If that explanatory output fails or lacks complete policy or citation coverage, retain the complete canonical choices and source excerpts with assumptionsStatus FALLBACK and a warning; do not discard otherwise valid financial results. This explanatory fallback does not turn the supplied FAILED calculation into a success.

Wiki basis: intcalc-opus.pdf p.2 describes a "Periodic pipeline" but does not prescribe scheduling, persistence, mutation or explanatory-model operation. intcalc-opus.pdf p.10 specifies "one JSON file per output," so returning records without writing files is an explicit transport limitation rather than literal file-output implementation. intcalc-opus.pdf p.11 permits oracle fixed-width dumps and mentions uncertainties declared through optional flags.json, but does not define an assumption-generation service or fallback status. Determinism, account-data exclusion, canonical-evidence retention, FALLBACK handling and separation of explanatory failures from valid financial results are provisional implementation safeguards. They provide no basis for overriding a failed calculation.
