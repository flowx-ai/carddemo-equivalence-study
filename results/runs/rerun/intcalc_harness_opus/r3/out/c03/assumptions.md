# CardDemo interest calculation assumptions



This is a calculation-only implementation, not verified COBOL equivalence. The following implementation decisions are fixed, not inferred anew per run.



1. **Input representation.** Receive decoded records, not raw file paths or bytes. CONTRACT.md references copybook layouts but does not reproduce all offsets or encodings (intcalc-opus.pdf p.10). No missing layout is guessed.

2. **Input isolation.** Accounts and category balances supplied to this calculation are the post-POSTTRAN inputs for this isolated step, as CONTRACT.md specifies (intcalc-opus.pdf p.10); this workflow does not implement POSTTRAN.

3. **Rate units.** A supplied rate is a decimal rate for this cycle: 0.015 means 1.5 percent. No annualisation, percentage division or day-count adjustment is applied. The wiki says currentBalance multiplied by interestRate(groupId), but flags exact formula as TODO (intcalc-opus.pdf pp.2,4).

4. **Grouping.** Match trimmed group identifiers to exactly one rate. Trimming and duplicate-rate handling are not specified; exact grouping is TODO (intcalc-opus.pdf p.2). Even equal duplicate rates are ambiguous.

5. **Rounding.** Multiply exactly and round once, to cents, ties away from zero; use integer arithmetic rather than binary floating-point money. Rounding mode is explicitly unconfirmed (intcalc-opus.pdf p.4).

6. **Balance basis.** Use current account balance, not category-specific balances. The formula names currentBalance (intcalc-opus.pdf p.2); no category allocation formula is given.

7. **Negative balances.** Apply the same signed formula without clamping. The data model admits signed balances (intcalc-opus.pdf pp.5–6); the interest pages supply no negative-balance exception (pp.2,4).

8. **Active status.** Do not filter accounts by active status. The field exists (intcalc-opus.pdf p.5), but interest eligibility by status is unstated (pp.2–4).

9. **Zero interest.** Zero balance or any interest rounding to zero leaves balance unchanged and emits no transaction. Zero interest is documented (intcalc-opus.pdf p.4); omission of a zero transaction is an assumption.

10. **Posting cardinality.** Emit one transaction per successfully calculated nonzero account interest. CONTRACT.md requests every written interest transaction (intcalc-opus.pdf p.10), but does not define cardinality.

11. **Account fields.** Add rounded interest to current balance only. Preserve credit limits, dates, status, address, group and cycle credit/debit totals. Balance posting is documented (intcalc-opus.pdf p.2); updates to the other fields are unstated.

12. **Category balances.** Accept category records but do not modify them or return an invented category file. The wiki mentions category posting without defining allocation (intcalc-opus.pdf p.2); CONTRACT.md lists no INTCALC category-balance output (p.10). This is a documented implementation limitation.

13. **Card selection.** Match cross-references by account identifier and choose the lexicographically first nonblank associated card. The cross-reference relationship is described (intcalc-opus.pdf p.7), but card selection for interest transactions is unstated.

14. **Transaction type.** Use provisional type_cd 01. The output field is required but its interest value is not supplied (intcalc-opus.pdf p.10). This is not a verified legacy code.

15. **Transaction category.** Use provisional integer cat_cd 0. The contract fixes its type, not the interest category code (intcalc-opus.pdf p.10).

16. **Transaction source.** Use INTCALC. The step name is supplied, but transaction source wording is not (intcalc-opus.pdf pp.2,10).

17. **Transaction description.** Use Interest charge. The required desc field has no specified interest wording (intcalc-opus.pdf p.10).

18. **Merchant identifier.** Use integer merchant_id 0. The contract requires an integer but supplies no merchant for interest (intcalc-opus.pdf p.10).

19. **Merchant name.** Use an empty merchant_name because none is specified for interest (intcalc-opus.pdf p.10).

20. **Merchant city.** Use an empty merchant_city because none is specified for interest (intcalc-opus.pdf p.10).

21. **Merchant ZIP.** Use an empty merchant_zip because none is specified for interest (intcalc-opus.pdf p.10).

22. **Timestamps.** Both orig_ts and proc_ts are business-date midnight, formatted YYYY-MM-DD HH:mm:ss.ffffff without a timezone. The contract supplies the business date and the model mentions 26-character timestamps, but no interest timestamp rule (intcalc-opus.pdf pp.8,10).

23. **Transaction identifiers.** Concatenate the ten-character batch parameter and a six-digit sequence starting 000001, assigned in input order to successful emitted transactions. The parameter is supplied and transaction identifiers are 16 characters, but their construction is unstated (intcalc-opus.pdf pp.7,10).

24. **Ordering.** Keep account input order and emitted transaction order; the contract permits any output order (intcalc-opus.pdf p.10). Reordering inputs may therefore change provisional transaction identifiers.

25. **Missing or ambiguous references.** Leave an affected account unchanged and return a diagnostic, continuing other accounts. Require a card only for nonzero interest. Missing-rate, duplicate-rate and missing-card policies are not specified (intcalc-opus.pdf pp.2–4).

26. **Malformed consumed values.** A malformed consumed account identifier, current balance or rate leaves that account unchanged with a diagnostic. Do not reject unused fields or filler. The wiki supplies no record-error policy (intcalc-opus.pdf pp.2–4); this is not a whole-batch rejection.

27. **Overflow.** Use the documented account decimal(12,2) and transaction decimal(11,2) bounds; report an affected account rather than wrapping amounts or duplicating exhausted six-digit identifiers. Numeric shapes are stated (intcalc-opus.pdf pp.5,8), but overflow handling is not.

28. **Identifiers.** Preserve digit identifiers as strings for matching, normalising account leading zeros only for numeric identity; emit acct_id as the contract integer. This reconciles fixed digit layouts and the JSON contract (intcalc-opus.pdf pp.5,10–11). Card numbers stay strings.

29. **Empty inputs.** Empty account input returns empty lists and this assumptions text. The source does not define empty-batch behaviour (intcalc-opus.pdf pp.2–4).

30. **Run parameters.** Default business date to 2022-07-18 and batch parameter to 2022071800 as CONTRACT.md specifies (intcalc-opus.pdf p.10). Supplied values replace the defaults; malformed consumed parameters prevent posting with per-account diagnostics.

31. **Output representation.** Return intcalc_systran and intcalc_acctdata lists plus assumptionsMarkdown content. Amounts are two-decimal strings, allowed by CONTRACT.md (intcalc-opus.pdf pp.10–11). No intcalc_systran.json, intcalc_acctdata.json or assumptions.md file is created: the maker selected calculation-only scope because file creation is unavailable here.

32. **Existing data.** This pure calculation changes no input file, database or stored record. Result objects are new values; no persistence mechanism or existing-record migration is added.