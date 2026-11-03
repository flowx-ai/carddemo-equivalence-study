# CardDemo interest calculation assumptions

Calculation outcome: FAILED.
Assumption drafting: DRAFTED.
No JSON or Markdown output files were written. Layouts and unresolved legacy behaviour are provisional.

## P01

Assumed: Receive already-decoded file contents in files, not filesystem paths. acctdata.dat and tcatbal.dat are the oracle POSTTRAN outputs. Require acctdata.dat, tcatbal.dat, discgrp.dat and cardxref.dat strings; the other contract files are accepted but unused in this isolated interest step. No POSTTRAN is rerun.

Wiki basis: The isolation statement says INTCALC 'receives the oracle POSTTRAN outputs as its account and category-balance inputs' (intcalc-opus.pdf p.10), supporting consumption of those outputs without rerunning POSTTRAN. The interest rule obtains rates from 'disclosure-group reference data (DISCGRP)' (intcalc-opus.pdf p.2). The contract lists the input files but does not specify an in-memory files interface, decoded-string requirements, or which other files this isolated implementation must use (intcalc-opus.pdf p.10). Those transport and required-versus-unused file choices are provisional.

## P02

Assumed: Provisional account layout: 300 characters; in wiki order account ID 11, active status 1, current balance 12, credit limit 12, cash credit limit 12, open date 10, expiration date 10, reissue date 10, cycle credit 12, cycle debit 12, ZIP 10, group 10, ignored filler 178. The copybook offsets are not supplied.

Wiki basis: The account description identifies a '300 bytes' record and lists the initial fields with their numeric or text sizes (intcalc-opus.pdf p.5); the continuation supplies cycle credit, cycle debit, ZIP and group sizes (intcalc-opus.pdf p.6). The contract confirms 'acctdata.dat CVACT01Y 300' but delegates layouts to the copybooks (intcalc-opus.pdf p.10). The output account names are listed separately, without physical offsets (intcalc-opus.pdf p.11). Because the supplied excerpts do not provide copybook offsets or filler placement, the sequential character layout and ignored filler remain provisional.

## P03

Assumed: Provisional category layout: 50 characters; account ID 11, type 2, category 4, signed balance 11, ignored filler 22. The copybook offsets are not supplied.

Wiki basis: The category-balance description gives a '50 bytes' record, the composite key 'accountId + typeCode + categoryCode', and field declarations 9(11), X(2), 9(4) and S9(9)V99 (intcalc-opus.pdf p.8). The contract confirms a 50-wide tcatbal.dat input but says layouts are 'as in the copybooks' (intcalc-opus.pdf p.10). No supplied excerpt establishes offsets, physical sign encoding or filler placement, so the proposed character layout and ignored filler are provisional.

## P04

Assumed: Provisional cross-reference layout: 50 characters; card 16, customer ID 9, account ID 11, ignored filler 14. The copybook offsets are not supplied.

Wiki basis: CardXref is described as a '50 bytes' record linking card, customer and account, with field sizes of 16 characters, 9 digits and 11 digits respectively (intcalc-opus.pdf p.7). The contract lists 'cardxref.dat CVACT03Y 50' and refers physical layouts to the copybooks (intcalc-opus.pdf p.10). The supplied excerpts omit offsets and filler placement; therefore the sequential character layout and 14-character ignored filler are provisional.

## P05

Assumed: Provisional disclosure layout: 50 characters; group at positions 1-10, six unsigned digits at 11-16 representing a rate with two implied decimal places, ignored filler 34. This layout is invented because the supplied wiki has no disclosure copybook layout.

Wiki basis: The business description identifies DISCGRP as the source of interest-rate parameters, while explicitly leaving 'exact interest formula, rounding, and grouping' for later extraction (intcalc-opus.pdf p.2). The contract supplies only 'discgrp.dat CVTRA02Y 50' and a reference to copybook layouts (intcalc-opus.pdf p.10). No supplied disclosure field definitions establish group positions, rate width, sign, scale or filler. All of those layout choices are therefore provisional rather than a verified disclosure copybook interpretation.

## P06

Assumed: Input is ASCII-compatible decoded text, one exact-width record per line, LF or CRLF, with at most one terminal newline. Monetary fields have two implied decimal places and accept ordinary digits or ASCII zoned final signs {ABCDEFGHI for positive 0-9 and }JKLMNOPQR for negative 0-9. Binary packed decimal and EBCDIC decoding are not implemented. Text is right-trimmed, not left-trimmed.

Wiki basis: The conversion note specifies 'decimal, scale 2' for S9(10)V99 but does not define its physical encoding (intcalc-opus.pdf p.5). The contract requires 'one record per line, fixed width' and permits strings to 'omit trailing spaces' (intcalc-opus.pdf p.10), supporting fixed-width parsing and trailing-space removal. The alternative of leaving oracle fixed-width dumps supplies no additional decoding rules (intcalc-opus.pdf p.11). ASCII, newline variants and count, zoned-sign mappings, left-space preservation, and the exclusions of packed-decimal and EBCDIC decoding are not specified in the excerpts and are provisional transport and encoding limitations.

## P07

Assumed: Interpret each parsed disclosure rate as a decimal fractional multiplier: currentBalance times groupRate directly, with no percentage conversion, annualisation, period conversion or day-count division. Exactly one record per group is allowed; every account requires its group rate, including zero-balance accounts.

Wiki basis: The stated formula is 'interest = currentBalance × interestRate(groupId)', but its exact formula and grouping remain a TODO (intcalc-opus.pdf p.2). The scenarios reiterate 'Interest = balance × group rate', require the correct rate per group, and state that a zero balance yields zero interest (intcalc-opus.pdf p.4). These statements support group-based multiplication but do not establish rate units, conversion rules, disclosure-record uniqueness or mandatory lookup for zero balances. The direct fractional interpretation and those lookup constraints are provisional.

## P08

Assumed: Process every account, including inactive accounts and signed negative balances. No eligibility filter or positive-interest-only rule is applied.

Wiki basis: The business description says interest is computed 'for each account' (intcalc-opus.pdf p.2). The scenarios discuss balance multiplication and zero balance without supplying an eligibility filter (intcalc-opus.pdf p.4). The account schema includes activeStatus and a signed currentBalance, but gives no processing rule based on either status or balance sign (intcalc-opus.pdf p.5). Processing inactive and negative-balance accounts without a positive-interest restriction is therefore a provisional interpretation of that absent eligibility guidance.

## P09

Assumed: Compute products with decimal-string integer arithmetic. Round the interest once to cents, half away from zero, then add that rounded amount. Reject overflow rather than clip or wrap. Account money is limited to 12 digits of cents; transaction and category money to 11 digits of cents.

Wiki basis: The interest rule requires posting the computed interest but leaves exact rounding unresolved (intcalc-opus.pdf p.2); the boundary scenario explicitly says 'TODO: confirm rounding mode' (intcalc-opus.pdf p.4). Account S9(10)V99 and its scale-2 conversion support a 12-digit cents capacity (intcalc-opus.pdf p.5), while transaction and category S9(9)V99 support 11-digit cents capacities (intcalc-opus.pdf p.8). The contract limits output amounts to 'at most two decimals' (intcalc-opus.pdf p.10). No excerpt specifies arithmetic machinery, half-away-from-zero rounding, when rounding occurs or overflow handling, so those choices are provisional.

## P10

Assumed: Return every account and change only curr_bal. Preserve active status, credit limits, dates, cycle credit, cycle debit, ZIP and group; output the contract field names. Do not increment cycle totals.

Wiki basis: The business rule says interest is 'posted to balance and category balance' without identifying changes to other account fields (intcalc-opus.pdf p.2). The account definitions enumerate status, limits, balances and dates (intcalc-opus.pdf p.5), followed by cycle totals, ZIP and group (intcalc-opus.pdf p.6). The output schema supplies the contract names, including curr_bal, curr_cyc_credit and curr_cyc_debit (intcalc-opus.pdf p.11). The excerpts do not specify whether interest changes cycle totals or other account attributes. Preserving all such fields, not incrementing cycle totals, and returning every account are explicit provisional scope choices.

## P11

Assumed: If rounded interest is zero, leave the account balance unchanged and emit no interest transaction or new interest-category row.

Wiki basis: The multiplication and posting rule provides no special zero-posting procedure (intcalc-opus.pdf p.2). The edge scenario states 'Account balance 0; Zero interest' (intcalc-opus.pdf p.4), supporting an unchanged balance when the interest amount is zero. The contract requests transaction fields 'for every interest transaction written' but does not say whether zero amounts must produce transactions (intcalc-opus.pdf p.10). Suppressing zero-rounded transactions and new category rows, including where a nonzero product rounds to zero, is therefore provisional.

## P12

Assumed: Post each nonzero rounded interest amount to that account category type 01, category 0, creating a category row if absent. Preserve other category balances. Return categoryBalances as ancillary records, not an additional CONTRACT.md output file.

Wiki basis: The rule explicitly requires interest to be 'posted to balance and category balance' (intcalc-opus.pdf p.2). The category schema supplies the account/type/category composite key and signed balance, but no interest-specific type or category value or row-creation rule (intcalc-opus.pdf p.8). The contract names intcalc_systran.json and intcalc_acctdata.json, without specifying a categoryBalances output file (intcalc-opus.pdf p.10). The 01/0 destination, creation of missing rows, preservation of other rows and ancillary return representation are provisional implementation choices.

## P13

Assumed: Sort accounts numerically by account ID. Generate interest transaction IDs from the ten-digit INTCALC parameter plus a six-digit emitted-transaction sequence starting 000001; fail above 999999 transactions. A rerun on identical input reproduces records rather than tracking an idempotency ledger.

Wiki basis: The business rule describes computing and posting interest but provides no ordering, identifier-generation or rerun protocol (intcalc-opus.pdf p.2). The contract supplies the INTCALC parameter and allows output objects 'in any order', while naming tran_id without a generation algorithm (intcalc-opus.pdf p.10). Thus numerical sorting is a deterministic choice permitted by the output-order freedom, not a required processing order. Parameter-plus-sequence identifiers, sequence exhaustion failure and the absence of an idempotency ledger are provisional because the supplied excerpts do not define them.

## P14

Assumed: Populate interest transactions with type_cd 01, cat_cd 0, source INTCALC, desc Interest, signed rounded amt, merchant_id 0 and empty merchant_name, merchant_city and merchant_zip. These transaction metadata defaults are not given by the wiki.

Wiki basis: The interest rule establishes the amount's connection to account balance and group rate, but supplies no transaction metadata constants (intcalc-opus.pdf p.2). The transaction schema defines fields and sizes, including signed amount S9(9)V99 and merchant fields (intcalc-opus.pdf p.8). The contract gives the output names type_cd, cat_cd, source, desc, amt and merchant fields, including integer types for cat_cd and merchant_id (intcalc-opus.pdf p.10). These schemas support the field population structure but do not specify the chosen metadata values. Those defaults and use of the signed rounded interest amount are provisional.

## P15

Assumed: Select the lexically smallest card string in cardxref.dat for the account. If no mapping exists, use an empty card_num rather than suppressing interest. Multiple mappings are permitted.

Wiki basis: CardXref 'Links card ↔ customer ↔ account' and has an 'alternate index on accountId'; the stated key is cardNumber, not accountId (intcalc-opus.pdf p.7). The contract lists cardxref.dat as an input and card_num as a transaction output field (intcalc-opus.pdf p.10). Neither excerpt defines account-level card selection, requires one mapping per account, or prescribes missing-mapping behavior. Allowing multiple mappings, choosing the lexical minimum and using an empty card without suppressing interest are provisional.

## P16

Assumed: Default businessDate to 2022-07-18 and intcalcParameter to 2022071800 only when omitted. Both transaction timestamps equal the chosen business date plus 00:00:00.000000 with a separating space; no runtime clock is used. Existing account dates are preserved as ISO dates, and a blank optional reissue date is allowed.

Wiki basis: The account schema defines X(10) dates and their conversion to DATE but does not prescribe ISO rendering or permit a blank reissue date (intcalc-opus.pdf p.5). The continuation identifies interest calculation as an account user but supplies no date-update rule (intcalc-opus.pdf p.6). Transactions have originTimestamp and processTimestamp fields of X(26), without rules for their values (intcalc-opus.pdf p.8). The contract lists 'business date 2022-07-18, INTCALC parameter 2022071800' (intcalc-opus.pdf p.10). Treating these as omission-only defaults, using identical midnight timestamps without a runtime clock, and the account-date preservation and blank-date rules are provisional because the excerpts do not specify those behaviors.

## P17

Assumed: Validate Gregorian dates, ten-digit run parameter, required file strings, exact widths, ASCII characters, digit fields, amount ranges, nonblank category type, duplicate account/category/group keys, and category/card references to existing accounts. Invalid input fails the entire calculation with errors and empty output lists; no partial posting or reject file is produced. Empty files are valid. Missing group rates fail even if the associated balance is zero.

Wiki basis: The group-based formula requires a rate lookup but gives no missing-rate failure procedure (intcalc-opus.pdf p.2). Account keys, numeric declarations and dates provide structural validation evidence (intcalc-opus.pdf p.5); the category composite key and field declarations provide further structural constraints (intcalc-opus.pdf p.8). The contract specifies fixed widths and run parameters but expressly 'says nothing about behaviour' (intcalc-opus.pdf p.10). Account output fields and the optional uncertainty mechanism add no failure protocol (intcalc-opus.pdf p.11). The excerpts do not specify Gregorian validation, ASCII restrictions, duplicate rejection, referential checks, empty-file acceptance, atomic failure, reject-file handling or missing-rate treatment for zero balances; these validation and failure choices are provisional. The supplied calculation outcome remains FAILED with empty output lists; documenting the policies does not authorize partial posting or change that outcome.

## P18

Assumed: Return records and assumptions without writing JSON or Markdown files, scheduling, persistence or mutating input. Financial results and policy choices are deterministic. A model writes explanatory assumptions from choices and wiki excerpts only, not account data. If its output fails or has incomplete policy/citation coverage, retain the complete canonical choices and source excerpts with assumptionsStatus FALLBACK and a warning; valid financial results are not discarded.

Wiki basis: The business description establishes computation and posting but does not define an explanatory-model service, persistence or scheduling interface (intcalc-opus.pdf p.2). The contract describes 'one JSON file per output' and is limited to formats, not behavior (intcalc-opus.pdf p.10); returning records without writing files is therefore an explicit implementation limitation, not a claim of file delivery. The alternative fixed-width dumps and 'uncertainties declared before scoring' provide output and uncertainty context, but no assumption-generation or fallback protocol (intcalc-opus.pdf p.11). Determinism, input immutability, model evidence restrictions, FALLBACK status and preservation of valid financial results are provisional orchestration choices unsupported by a specified wiki procedure. Such explanatory fallback does not convert the supplied FAILED calculation into a successful one.
