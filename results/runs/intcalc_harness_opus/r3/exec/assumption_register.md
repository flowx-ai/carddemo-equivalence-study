# harness opus/r3: assumption register, verbatim from the build's workflow script (register.json)

1. [P01] Receive already-decoded file contents in files, not filesystem paths. acctdata.dat and tcatbal.dat are the oracle POSTTRAN outputs. Require acctdata.dat, tcatbal.dat, discgrp.dat and cardxref.dat strings; the other contract files are accepted but unused in this isolated interest step. No POSTTRAN is rerun.
   pages: [2, 10]
2. [P02] Provisional account layout: 300 characters; in wiki order account ID 11, active status 1, current balance 12, credit limit 12, cash credit limit 12, open date 10, expiration date 10, reissue date 10, cycle credit 12, cycle debit 12, ZIP 10, group 10, ignored filler 178. The copybook offsets are not supplied.
   pages: [5, 6, 10, 11]
3. [P03] Provisional category layout: 50 characters; account ID 11, type 2, category 4, signed balance 11, ignored filler 22. The copybook offsets are not supplied.
   pages: [8, 10]
4. [P04] Provisional cross-reference layout: 50 characters; card 16, customer ID 9, account ID 11, ignored filler 14. The copybook offsets are not supplied.
   pages: [7, 10]
5. [P05] Provisional disclosure layout: 50 characters; group at positions 1-10, six unsigned digits at 11-16 representing a rate with two implied decimal places, ignored filler 34. This layout is invented because the supplied wiki has no disclosure copybook layout.
   pages: [2, 10]
6. [P06] Input is ASCII-compatible decoded text, one exact-width record per line, LF or CRLF, with at most one terminal newline. Monetary fields have two implied decimal places and accept ordinary digits or ASCII zoned final signs {ABCDEFGHI for positive 0-9 and }JKLMNOPQR for negative 0-9. Binary packed decimal and EBCDIC decoding are not implemented. Text is right-trimmed, not left-trimmed.
   pages: [5, 10, 11]
7. [P07] Interpret each parsed disclosure rate as a decimal fractional multiplier: currentBalance times groupRate directly, with no percentage conversion, annualisation, period conversion or day-count division. Exactly one record per group is allowed; every account requires its group rate, including zero-balance accounts.
   pages: [2, 4]
8. [P08] Process every account, including inactive accounts and signed negative balances. No eligibility filter or positive-interest-only rule is applied.
   pages: [2, 4, 5]
9. [P09] Compute products with decimal-string integer arithmetic. Round the interest once to cents, half away from zero, then add that rounded amount. Reject overflow rather than clip or wrap. Account money is limited to 12 digits of cents; transaction and category money to 11 digits of cents.
   pages: [2, 4, 5, 8, 10]
10. [P10] Return every account and change only curr_bal. Preserve active status, credit limits, dates, cycle credit, cycle debit, ZIP and group; output the contract field names. Do not increment cycle totals.
   pages: [2, 5, 6, 11]
11. [P11] If rounded interest is zero, leave the account balance unchanged and emit no interest transaction or new interest-category row.
   pages: [2, 4, 10]
12. [P12] Post each nonzero rounded interest amount to that account category type 01, category 0, creating a category row if absent. Preserve other category balances. Return categoryBalances as ancillary records, not an additional CONTRACT.md output file.
   pages: [2, 8, 10]
13. [P13] Sort accounts numerically by account ID. Generate interest transaction IDs from the ten-digit INTCALC parameter plus a six-digit emitted-transaction sequence starting 000001; fail above 999999 transactions. A rerun on identical input reproduces records rather than tracking an idempotency ledger.
   pages: [2, 10]
14. [P14] Populate interest transactions with type_cd 01, cat_cd 0, source INTCALC, desc Interest, signed rounded amt, merchant_id 0 and empty merchant_name, merchant_city and merchant_zip. These transaction metadata defaults are not given by the wiki.
   pages: [2, 8, 10]
15. [P15] Select the lexically smallest card string in cardxref.dat for the account. If no mapping exists, use an empty card_num rather than suppressing interest. Multiple mappings are permitted.
   pages: [7, 10]
16. [P16] Default businessDate to 2022-07-18 and intcalcParameter to 2022071800 only when omitted. Both transaction timestamps equal the chosen business date plus 00:00:00.000000 with a separating space; no runtime clock is used. Existing account dates are preserved as ISO dates, and a blank optional reissue date is allowed.
   pages: [5, 6, 8, 10]
17. [P17] Validate Gregorian dates, ten-digit run parameter, required file strings, exact widths, ASCII characters, digit fields, amount ranges, nonblank category type, duplicate account/category/group keys, and category/card references to existing accounts. Invalid input fails the entire calculation with errors and empty output lists; no partial posting or reject file is produced. Empty files are valid. Missing group rates fail even if the associated balance is zero.
   pages: [2, 5, 8, 10, 11]
18. [P18] Return records and assumptions without writing JSON or Markdown files, scheduling, persistence or mutating input. Financial results and policy choices are deterministic. A model writes explanatory assumptions from choices and wiki excerpts only, not account data. If its output fails or has incomplete policy/citation coverage, retain the complete canonical choices and source excerpts with assumptionsStatus FALLBACK and a warning; valid financial results are not discarded.
   pages: [2, 10, 11]
