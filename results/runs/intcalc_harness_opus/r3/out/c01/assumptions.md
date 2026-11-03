# CardDemo interest calculation assumptions

Calculation outcome: FAILED.
Assumption drafting: DRAFTED.
No JSON or Markdown output files were written. Layouts and unresolved legacy behaviour are provisional.

## P01

Assumed: Receive already-decoded file contents in files, not filesystem paths. Treat acctdata.dat and tcatbal.dat as the oracle POSTTRAN outputs. Require acctdata.dat, tcatbal.dat, discgrp.dat and cardxref.dat strings; accept the other contract files but leave them unused in this isolated interest step. Do not rerun POSTTRAN.

Wiki basis: intcalc-opus.pdf p.10 explicitly states that an isolated INTCALC candidate "receives the oracle POSTTRAN outputs as its account and category-balance inputs" and lists the contract input files. intcalc-opus.pdf p.2 identifies account balances and DISCGRP as the inputs to the interest rule. Neither excerpt specifies an in-memory files interface, required string values or treatment of the remaining files; these transport and input-selection choices are provisional.

## P02

Assumed: Use a provisional 300-character account layout in wiki order: account ID 11, active status 1, current balance 12, credit limit 12, cash credit limit 12, open date 10, expiration date 10, reissue date 10, cycle credit 12, cycle debit 12, ZIP 10, group 10 and ignored filler 178. The copybook offsets are not supplied.

Wiki basis: intcalc-opus.pdf p.5 describes the account record as "300 bytes" and gives the initial fields and their types; intcalc-opus.pdf p.6 supplies the cycle totals, ZIP and group fields. intcalc-opus.pdf p.10 confirms the 300-width contract but refers to "layouts as in the copybooks." intcalc-opus.pdf p.11 supplies output account names, not physical offsets. The supplied excerpts do not establish contiguous field placement, character encoding or filler placement, so this ordered character layout and its 178-character filler are provisional.

## P03

Assumed: Use a provisional 50-character category layout: account ID 11, type 2, category 4, signed balance 11 and ignored filler 22. The copybook offsets are not supplied.

Wiki basis: intcalc-opus.pdf p.8 identifies a 50-byte TransactionCategoryBalance record, its composite key and fields "accountId 9(11), typeCode X(2), categoryCode 9(4), balance S9(9)V99." intcalc-opus.pdf p.10 confirms tcatbal.dat has width 50 but delegates layouts to copybooks. Neither excerpt supplies physical offsets or filler placement; the sequential character layout, signed display representation and 22-character filler are therefore provisional.

## P04

Assumed: Use a provisional 50-character cross-reference layout: card 16, customer ID 9, account ID 11 and ignored filler 14. The copybook offsets are not supplied.

Wiki basis: intcalc-opus.pdf p.7 describes CardXref as "50 bytes" and lists a 16-character card number, nine-digit customer ID and eleven-digit account ID. intcalc-opus.pdf p.10 confirms cardxref.dat width 50 while requiring copybook layouts. The supplied excerpts contain no offsets or filler definition, so placing those fields consecutively and ignoring the remaining 14 characters is provisional.

## P05

Assumed: Use an invented, provisional 50-character disclosure layout: group at positions 1–10, six unsigned digits at positions 11–16 representing a rate with two implied decimal places, and ignored filler 34. The supplied wiki has no disclosure copybook layout.

Wiki basis: intcalc-opus.pdf p.2 says that "interest-rate parameters come from the disclosure-group reference data (DISCGRP)" but leaves exact formula and grouping extraction as a TODO. intcalc-opus.pdf p.10 specifies discgrp.dat CVTRA02Y width 50 without providing its fields. No supplied disclosure copybook establishes group placement, rate width, decimal scale or filler. All of those layout details are provisional inventions rather than documented disclosure-format facts.

## P06

Assumed: Accept ASCII-compatible decoded text with one exact-width record per line, LF or CRLF line endings and at most one terminal newline. Monetary fields have two implied decimal places and accept ordinary digits or ASCII zoned final signs {ABCDEFGHI for positive digits 0–9 and }JKLMNOPQR for negative digits 0–9. Do not implement binary packed-decimal or EBCDIC decoding. Right-trim text, but do not left-trim it.

Wiki basis: intcalc-opus.pdf p.5 specifies decimal scale 2 through "S9(10)V99 → NUMBER (decimal, scale 2)." intcalc-opus.pdf p.10 requires "one record per line, fixed width" and permits strings to omit trailing spaces. intcalc-opus.pdf p.11 lists account output fields and permits fixed-width dumps as an alternative, but supplies no decoding rules. ASCII, zoned-sign mappings, accepted newline forms, the terminal-newline limit, input trimming and exclusion of packed-decimal and EBCDIC decoding are not specified in these excerpts and remain provisional.

## P07

Assumed: Interpret each parsed disclosure rate as a decimal fractional multiplier and calculate currentBalance times groupRate directly, without percentage conversion, annualisation, period conversion or day-count division. Allow exactly one record per group. Require a group rate for every account, including zero-balance accounts.

Wiki basis: intcalc-opus.pdf p.2 gives "interest = currentBalance × interestRate(groupId)" while explicitly leaving exact formula and grouping extraction as a TODO. intcalc-opus.pdf p.4 repeats "Interest = balance × group rate," requires the correct rate per group and states that zero balance yields zero interest. Neither excerpt defines rate units, conversion factors, group-record uniqueness or whether zero balances bypass lookup. The direct fractional-rate interpretation and these lookup constraints are provisional.

## P08

Assumed: Process every account, including inactive accounts and accounts with signed negative balances. Apply no eligibility filter and no positive-interest-only rule.

Wiki basis: intcalc-opus.pdf p.2 describes computing interest "for each account." intcalc-opus.pdf p.4 describes balance-times-rate scenarios without eligibility conditions. intcalc-opus.pdf p.5 includes activeStatus and a signed currentBalance field, but does not make active status or balance sign an eligibility test. Because these excerpts do not define filtering or suppression rules, processing inactive and negative-balance accounts without such filters is provisional.

## P09

Assumed: Compute products using decimal-string integer arithmetic. Round interest once to cents, half away from zero, and then add the rounded amount. Reject overflow instead of clipping or wrapping. Limit account monetary values to 12 digits of cents and transaction and category monetary values to 11 digits of cents.

Wiki basis: intcalc-opus.pdf p.2 leaves rounding as a TODO, and intcalc-opus.pdf p.4 explicitly says "TODO: confirm rounding mode." intcalc-opus.pdf p.5 supplies account amounts as S9(10)V99; intcalc-opus.pdf p.8 supplies transaction and category amounts as S9(9)V99, supporting the respective digit capacities. intcalc-opus.pdf p.10 allows amounts with "at most two decimals" but does not define computation precision, rounding stage, tie handling or overflow response. Decimal-string arithmetic, one half-away-from-zero rounding operation before addition and overflow rejection are provisional.

## P10

Assumed: Return every account using the contract field names and change only curr_bal. Preserve active status, credit limits, dates, cycle credit, cycle debit, ZIP and group. Do not increment cycle totals.

Wiki basis: intcalc-opus.pdf p.2 says interest is "posted to balance and category balance." intcalc-opus.pdf p.5 lists the initial account attributes, and intcalc-opus.pdf p.6 lists cycle totals, ZIP and group, but neither states that interest updates those other attributes. intcalc-opus.pdf p.11 supplies the contract account field names, including curr_bal, curr_cyc_credit and curr_cyc_debit. Preserving all fields other than current balance, including not incrementing cycle totals, is a provisional restriction because detailed account-update semantics are absent.

## P11

Assumed: When rounded interest is zero, leave the account balance unchanged and emit neither an interest transaction nor a new interest-category row.

Wiki basis: intcalc-opus.pdf p.4 states "Account balance 0; Zero interest," and intcalc-opus.pdf p.2 describes posting computed interest to account and category balances. intcalc-opus.pdf p.10 requires transaction output for "every interest transaction written" but does not require writing a zero-amount transaction. The excerpts do not define suppression of zero postings or category-row creation, including when nonzero products round to zero; those choices are provisional.

## P12

Assumed: Post every nonzero rounded interest amount to that account's category type 01, category 0, creating the category row if absent. Preserve all other category balances. Return categoryBalances as ancillary records, not as an additional CONTRACT.md output file.

Wiki basis: intcalc-opus.pdf p.2 explicitly requires interest to be "posted to balance and category balance." intcalc-opus.pdf p.8 defines the category composite key as "accountId + typeCode + categoryCode." intcalc-opus.pdf p.10 names the transaction and account output files but does not list a category-balance output file. The excerpts do not select interest category codes, define missing-row creation or prescribe ancillary category output. Type 01, category 0, row creation, preservation of other categories and the ancillary-return mechanism are provisional.

## P13

Assumed: Sort accounts numerically by account ID. Form each interest transaction ID from the ten-digit INTCALC parameter followed by a six-digit emitted-transaction sequence beginning at 000001, and fail if more than 999999 transactions would be emitted. Rerunning identical input reproduces records rather than consulting an idempotency ledger.

Wiki basis: intcalc-opus.pdf p.10 supplies "INTCALC parameter 2022071800" and permits output objects "in any order." intcalc-opus.pdf p.2 describes a periodic interest pipeline but gives no transaction-ID construction, processing order, sequence capacity or rerun ledger behaviour. The excerpts therefore do not establish the parameter as an ID prefix or require sorting. Numeric ordering, parameter-plus-sequence IDs, the transaction limit and record-reproducing reruns are provisional implementation choices.

## P14

Assumed: Populate interest transactions with type_cd 01, cat_cd 0, source INTCALC, desc Interest, signed rounded amt, merchant_id 0, and empty merchant_name, merchant_city and merchant_zip. These transaction metadata defaults are not supplied by the wiki.

Wiki basis: intcalc-opus.pdf p.2 establishes that interest is computed and posted. intcalc-opus.pdf p.8 defines transaction field types, including signed amount S9(9)V99 and merchant fields; intcalc-opus.pdf p.10 supplies their output names, including type_cd, cat_cd, source, desc and amt. Field definitions do not establish values for interest transactions. The listed codes, descriptive strings and merchant defaults are therefore provisional; the signed rounded amount follows the supplied computation choice rather than a documented metadata rule.

## P15

Assumed: Select the lexically smallest card string in cardxref.dat for each account. Permit multiple mappings. If no mapping exists, use an empty card_num rather than suppressing interest.

Wiki basis: intcalc-opus.pdf p.7 says CardXref "Links card ↔ customer ↔ account" with an alternate index on accountId and a card-number key. intcalc-opus.pdf p.10 lists cardxref.dat as an input and card_num as a transaction output field. Neither excerpt specifies how to choose among cards, whether multiple cards per account are accepted or what to do when no mapping exists. Lexical selection, acceptance of multiple mappings and the empty-card fallback without interest suppression are provisional.

## P16

Assumed: Default businessDate to 2022-07-18 and intcalcParameter to 2022071800 only when omitted. Set both transaction timestamps to the chosen business date followed by a separating space and 00:00:00.000000; do not use the runtime clock. Preserve existing account dates as ISO dates and allow a blank optional reissue date.

Wiki basis: intcalc-opus.pdf p.10 lists the business date and INTCALC parameter values but does not describe omitted-value defaults. intcalc-opus.pdf p.5 identifies account dates as X(10) converted to DATE, and intcalc-opus.pdf p.6 continues the account-field list without supplying date-update rules. intcalc-opus.pdf p.8 defines originTimestamp and processTimestamp as X(26), but supplies no timestamp values or clock source. Omission-only defaults, midnight timestamps, ISO-date preservation and blank optional reissue dates are provisional because those behaviours are not specified.

## P17

Assumed: Validate Gregorian dates, a ten-digit run parameter, required file strings, exact widths, ASCII characters, digit fields, amount ranges, nonblank category type, duplicate account/category/group keys, and category/card references to existing accounts. Invalid input fails the entire calculation with errors and empty output lists; produce neither partial postings nor a reject file. Empty files are valid. A missing group rate fails even when the associated balance is zero.

Wiki basis: intcalc-opus.pdf p.5 provides account types and "Key: accountId"; intcalc-opus.pdf p.8 provides category types and the composite category key. intcalc-opus.pdf p.10 supplies fixed widths and run parameters but cautions that the contract "says nothing about behaviour." intcalc-opus.pdf p.2 requires group-based rates without defining missing-rate or duplicate-group handling, and intcalc-opus.pdf p.11 lists output fields and optional uncertainty flags without specifying error outputs. These excerpts support structural validation targets but do not define the full validation set, referential checks, empty-file acceptance or atomic failure handling; those choices are provisional. The supplied calculation remains FAILED with the reported "Duplicate disclosure group" error and empty output lists; this register does not change that outcome.

## P18

Assumed: Return records and assumptions without writing JSON or Markdown files, scheduling, persisting data or mutating input. Keep financial results and policy choices deterministic. Have a model compose explanatory assumptions only from implementation choices and wiki excerpts, not account data. If that explanatory output fails or has incomplete policy or citation coverage, retain the complete canonical choices and source excerpts with assumptionsStatus FALLBACK and a warning; do not discard valid financial results.

Wiki basis: intcalc-opus.pdf p.2 describes a periodic pipeline but does not require this isolated interface to schedule or persist anything. intcalc-opus.pdf p.10 describes "one JSON file per output," while intcalc-opus.pdf p.11 permits oracle fixed-width dumps and mentions optional flags.json for declared uncertainties. Neither excerpt specifies an in-memory-only return interface, input immutability, model-generated explanations, deterministic implementation mechanics or an assumptions fallback protocol. These interface limitations and fallback safeguards are provisional choices, not documented file-output behaviour. Preserving valid results through an explanatory fallback does not convert the supplied FAILED calculation into a successful one.
