# harness opus/r2: assumption register, verbatim from the build's workflow script (register.json)

1. [A01] Rates are decimal multipliers with at most six fractional digits; apply once without annualisation or proration. Signed rates are accepted.
   basis: p.2 says interest = currentBalance × interestRate(groupId), but gives no units, precision, sign restriction or accrual interval.
2. [A02] Use exact decimal arithmetic; round each signed product half away from zero to cents before adding it to the account.
   basis: Exact formula and rounding are explicitly TODO.
3. [A03] Process all supplied accounts including inactive and negative balances. Emit no transaction for interest rounded to zero.
   basis: Zero balance must give zero interest; eligibility and zero-transaction creation are otherwise unspecified.
4. [A04] Use one unique disclosure-group rate per account, matching group strings after removing trailing spaces; calculate from current balance, not category balances.
   basis: The wiki names account balance and group rate, while detailed grouping is TODO.
5. [A05] Change only curr_bal on each account; preserve cycle totals and all other contracted fields. Add nonzero interest to category IN/9999, creating that category if absent.
   basis: Posting to balance and category balance is stated, but the category and cycle-field updates are not defined; the contract requires every account.
6. [A06] Interest transaction type_cd is IN, cat_cd is 9999, source is INTCALC, desc is Interest, merchant_id is 0 and merchant text fields are empty.
   basis: Transaction output fields are listed without interest-specific values.
7. [A07] Transaction id is IC plus the 11-digit zero-padded account id plus 001. Use the lexicographically smallest linked card number, or empty if none exists.
   basis: The cross-reference and transaction fields exist, but transaction numbering and card selection are unspecified.
8. [A08] Default to business date 2022-07-18 and parameter 2022071800. Require a valid YYYY-MM-DD date and ten-digit parameter beginning with YYYYMMDD. Both transaction timestamps are YYYY-MM-DD 00:00:00.000000 without timezone conversion.
   basis: The run date and parameter are supplied, but parameter semantics and timestamp construction are not.
9. [A09] Reject the entire request on missing arrays or account fields, duplicate keys, missing rates, malformed numeric/date/text values or account/category monetary overflow. Empty accounts is valid. Monetary numeric inputs must have ordinary decimal notation and at most two fractional digits. Account and category identifiers must be JSON integers in their copybook ranges; card references must have 16 digit strings.
   basis: Keys, numeric sizes and some string lengths are given; validation, defaults and batch failure policy are unspecified.
10. [A10] Return money as two-decimal strings and identifiers as integers. Preserve account order and emitted-transaction order. Do not mutate inputs or persist records; calls calculate independently without replay protection.
   basis: The contract permits amount strings and any object-list order. Replay handling is unspecified, and storage writes are outside the selected partial scope.
11. [A11] Caller supplies already-decoded POSTTRAN account and category balances. Do not run POSTTRAN or use daily transactions, customers, full card data, transaction types or transaction categories in this isolated calculation.
   basis: Step isolation expressly supplies oracle POSTTRAN outputs to INTCALC; parsing of files is excluded in the selected partial delivery.
12. [A12] Return intended JSON and Markdown file contents and mark each written=false. Do not read or create any file. Return assumptions on success and failure.
   basis: CONTRACT.md requires actual files and the maker requests assumptions.md; the maker explicitly selected the partial structured-results implementation because file writing is unavailable.
13. [A13] A model receives only this ledger and may render Markdown; preserve the structured ledger as authoritative. Use deterministic full-ledger Markdown on model failure or whenever the proposed Markdown differs from the authoritative rendering.
   basis: The request requires every decision and its wiki basis; it does not prescribe a rendering mechanism. This is an implementation default that cannot change calculations.
