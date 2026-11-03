# harness sonnet/r3: assumption register, verbatim from the build's workflow script (register.json)

1. Accept decoded accounts, categoryBalances, disclosureRates and cardXrefs lists; decimal rates are already decoded, not overpunch text.
   basis: The confirmed brief supplies the decoded interface. Its source summaries identify the legacy record layouts and data access in intcalc-sonnet.pdf pp.6,8–9,16–20; replacing file decoding with caller-supplied records is an implementation choice.
2. CONTRACT.md input-file reading is deferred; this workflow does not read the fixed-width input files.
   basis: The maker explicitly selected calculation-only delivery. The batch/data-access descriptions summarized from intcalc-sonnet.pdf pp.4,16–20 do not establish completion of the separate CONTRACT.md file contract.
3. Writing intcalc_systran.json and intcalc_acctdata.json is deferred; returned datasets are not actual output files.
   basis: The confirmed partial-delivery decision defers file writing. Output/account-rewrite descriptions summarized from intcalc-sonnet.pdf pp.3–4,24–25 provide calculation context, not evidence that this workflow writes files.
4. Saving assumptions.md adjacent to output files is deferred; assumptionsMarkdown is only its intended content.
   basis: This is the maker-approved delivery boundary, not a wiki rule. The supplied summaries of intcalc-sonnet.pdf pp.3–4,24–25 do not specify this explanatory artifact or its saving mechanism.
5. Default an omitted businessDate to 2022-07-18.
   basis: This default is explicitly approved in the brief. The supplied processing/timestamp summaries of intcalc-sonnet.pdf pp.2–4,24 do not prescribe this default date.
6. Default an omitted interestRunDate to 2022071800, interpreted as an eight-digit calendar date and two-digit run discriminator.
   basis: This run prefix is approved in the brief; the supplied transaction summaries of intcalc-sonnet.pdf pp.2–3,24 do not establish a legacy run-prefix algorithm.
7. Resolve the account group/type/category rate first; consult DEFAULT only if that exact row is absent.
   basis: Explicit interest lookup/fallback rule in the supplied summaries of intcalc-sonnet.pdf pp.2,17–20; applying it to normalized decoded keys is this implementation.
8. A present zero rate neither falls back nor posts. A nonzero rate posts even when the truncated result is zero.
   basis: The supplied summaries of intcalc-sonnet.pdf pp.2–3 distinguish zero-rate handling and interest generation. Zero-valued results from nonzero rates are retained by the approved implementation policy, not asserted as independently observed legacy behavior.
9. Calculate each category as balance multiplied by the annual percentage divided by 1200; use exact decimal arithmetic.
   basis: The monthly-interest formula is explicit in the supplied summaries of intcalc-sonnet.pdf pp.2–3. Exact scaled-integer arithmetic is the approved implementation technique.
10. Truncate each category toward zero to cents before summing, for both positive and negative results.
   basis: The supplied summary of intcalc-sonnet.pdf p.2 mentions default truncation but says rounding requires confirmation. Per-category signed truncation is the approved resolution, not a proven oracle-equivalent rounding rule.
11. Use supplied rates for all categories; add no fees and hard-code no payment or credit exemptions.
   basis: The supplied summaries of intcalc-sonnet.pdf pp.2–3 describe rate-driven interest. Additional fee or exemption rules are not established by those summaries; the confirmed brief excludes them.
12. An account is affected when at least one category-balance row represents it, including when every resolved rate is zero. Add its posted amounts to curr_bal and set both cycle totals to 0.00.
   basis: Account balance updates and cycle resets are explicit in the supplied summaries of intcalc-sonnet.pdf pp.3–4,25. The zero-rate affected-account boundary is an approved implementation choice where the supplied summary is incomplete.
13. Return all input accounts in input order, preserve unrelated fields, and preserve unchanged monetary representations; normalize output account identifiers to integers.
   basis: The supplied summaries of intcalc-sonnet.pdf pp.3–4,25 describe account rewriting. Full preservation, input ordering and unchanged-value representation are approved interface choices rather than verified legacy serialization behavior.
14. Normalize numeric account/type/category/card identifiers as left-zero-padded strings for matching; use eleven-, two-, four- and sixteen-digit widths respectively. Output account identifiers and transaction categories as integers.
   basis: Legacy identifier/layout context is supplied from intcalc-sonnet.pdf pp.6,8–9,16–20,24–25. Decoded-key normalization and JSON integer representation are approved implementation choices.
15. Sort a copy of category rows by normalized account, type and category before allocating posting ids.
   basis: The supplied summaries of intcalc-sonnet.pdf pp.2–3,24 do not settle posting order. Stable numeric-key ordering is the approved deterministic choice.
16. Use the ten-digit run prefix followed by a global six-digit posting suffix starting at 000001; fail rather than wrap after 999999.
   basis: Transaction identification is required by the supplied layout summary of intcalc-sonnet.pdf p.24, but this prefix/suffix allocation and exhaustion behavior are implementation choices approved in the brief.
17. Restart the suffix at 000001 on each invocation. Identical inputs and parameters produce identical results, not globally unique ids across repeated runs.
   basis: The supplied summaries of intcalc-sonnet.pdf pp.2–4,24 do not define cross-run sequence persistence or rerun deduplication. Restarting without persistence is the approved calculation-only policy.
18. Set transaction type_cd to 01, cat_cd to integer 5, source to System and desc to Int. for a/c followed by the eleven-digit padded account id.
   basis: Interest transaction constants and description are explicit in the supplied summaries of intcalc-sonnet.pdf pp.2–3,24. Padding and decoded JSON category representation follow the approved implementation policy.
19. Choose the numerically smallest cross-referenced card for each posting; retain card numbers as sixteen-digit strings.
   basis: The supplied cross-reference and transaction summaries of intcalc-sonnet.pdf pp.16–20,24 establish card-related data, but do not settle multiple-card selection. Minimum-card selection is an approved implementation choice.
20. Set merchant_id to 0.
   basis: The supplied transaction-layout summary of intcalc-sonnet.pdf p.24 requires merchant information but does not establish an interest merchant-id default. Zero is the approved implementation choice.
21. Set merchant_name, merchant_city and merchant_zip to empty strings.
   basis: The supplied transaction-layout summary of intcalc-sonnet.pdf p.24 does not establish interest merchant-text values. Empty strings are the approved implementation choice.
22. Set orig_ts and proc_ts to businessDate plus 00:00:00.000000, separated by one space.
   basis: The supplied transaction summaries of intcalc-sonnet.pdf pp.2–3,24 do not establish timestamp time-of-day defaults. Business-date midnight is the approved implementation choice.
23. Validate complete required records, real calendar dates, identifier widths and decimal values. Account money is S9(10)V99; category balances and transaction amounts are S9(9)V99; rates are S9(4)V99. Reject extra fractional digits, exponent text, undecoded overpunch and overflow.
   basis: Declared legacy layouts are grounded in the supplied summaries of intcalc-sonnet.pdf pp.6,8–9,16–20,24–25 and the approved step. Strict decoded-input validation, including rejecting over-precision rather than rounding it, is an implementation choice.
24. Reject duplicate account ids, category account/type/category keys, disclosure group/type/category keys and identical account/card cross-reference pairs after normalization.
   basis: The supplied keyed-access summaries of intcalc-sonnet.pdf pp.16–20 do not establish duplicate-input recovery for decoded lists. Rejecting ambiguous keys is the approved validation policy; distinct cards for one account remain allowed.
25. Fail if a category or cross-reference names a missing account, if a required DEFAULT rate is absent, or if a posting has no card reference. Zero-rate rows do not require a card for posting.
   basis: DEFAULT fallback is explicit in the supplied summaries of intcalc-sonnet.pdf pp.2,17–20; missing DEFAULT, missing-reference recovery and the zero-rate card boundary are not fully specified there. Atomic rejection is the approved resolution.
26. On any validation or calculation failure return FAILED, explanatory errors and empty financial datasets, while retaining assumptions and Markdown. Do not mutate inputs or write a database.
   basis: The supplied summaries of intcalc-sonnet.pdf pp.2–4,17–20 do not define decoded-interface partial recovery or transaction atomicity. All-or-nothing, side-effect-free failure is the approved implementation policy.
27. Draft these explanations once at build time, not through a runtime model; render precisely the same entries as Markdown on success and failure. No oracle-equivalence claim is made.
   basis: This is the confirmed implementation/authoring decision. The available grounding is the brief and page-specific summaries of intcalc-sonnet.pdf pp.2–4,6,8–9,16–20,24–25, not independent inspection or verbatim quotations of the PDF; no golden outputs were supplied.
