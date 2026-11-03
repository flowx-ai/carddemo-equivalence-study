# harness opus/r1: assumption register, verbatim from the build's workflow script (register.json)

1. [input_delivery] The caller supplies file contents as text in files; no physical files are read.
   basis: intcalc-opus.pdf pp.10–11 list input files but do not specify delivery to FlowX; delivery is delegated to the caller.
2. [required_files] Require supplied text for acctdata.dat, tcatbal.dat and discgrp.dat; empty text represents an empty supplied file.
   basis: intcalc-opus.pdf p.2 bases interest on account balance and disclosure group and posts to category balance; p.10 names these inputs. Empty-file handling is unspecified.
3. [unused_inputs] Accept but do not process dailytran.dat, cardxref.dat, custdata.dat, carddata.dat, trantype.dat and trancatg.dat.
   basis: intcalc-opus.pdf p.10 lists these inputs; pp.2–4 identify no interest dependency on their contents.
4. [extra_input_keys] Ignore unrecognised files keys and do not interpret their contents.
   basis: intcalc-opus.pdf pp.10–11 names the recognised files but specifies no policy for additional caller keys.
5. [no_posttran] Use supplied post-posting account and category balances without running POSTTRAN.
   basis: intcalc-opus.pdf p.10: A candidate for INTCALC receives the oracle’s POSTTRAN outputs as its account and category-balance inputs.
6. [response_delivery] Return output lists and assumptions.md text in the response; create no files and persist no data.
   basis: intcalc-opus.pdf pp.10–11 names output files but specifies no storage location; the approved scope explicitly selects response-only delivery.
7. [business_date_default] Default an omitted businessDate to 2022-07-18.
   basis: intcalc-opus.pdf p.10 lists run business date 2022-07-18; using it as an omitted-input default is assumed.
8. [parameter_default] Default an omitted intcalcParameter to 2022071800.
   basis: intcalc-opus.pdf p.10 lists INTCALC parameter 2022071800; using it as an omitted-input default is assumed.
9. [business_date_validation] Require a real Gregorian businessDate in YYYY-MM-DD format.
   basis: intcalc-opus.pdf pp.10–11 supplies a date example but does not define date validation.
10. [parameter_validation] Require intcalcParameter to be ten digits: a real YYYYMMDD date followed by an hour 00 through 23; do not require its date to equal businessDate.
   basis: intcalc-opus.pdf pp.10–11 supplies 2022071800 but does not define parameter syntax, hour semantics or a cross-parameter equality rule.
11. [ascii] Decode processed files as printable ASCII fixed-width text; reject other characters within records.
   basis: intcalc-opus.pdf pp.5–9 gives PIC-style fields but no complete ASCII encoding convention. Public copybook content could not be verified.
12. [line_separators] Accept LF or CRLF record separators and one final newline; reject blank records and bare carriage returns.
   basis: intcalc-opus.pdf pp.5–9 specifies record lengths but not text record separators.
13. [account_record_length] Require each account record to contain exactly 300 characters.
   basis: intcalc-opus.pdf pp.5–6 specify account record length 300.
14. [account_layout] Decode account widths in field order as 11,1,12,12,12,10,10,10,12,12,10,10 and ignore the remaining filler.
   basis: intcalc-opus.pdf pp.5–6 list the account fields and PIC widths in this order. The complete copybook and filler layout could not be verified.
15. [category_record_length] Require each category-balance record to contain exactly 50 characters.
   basis: intcalc-opus.pdf p.8 specifies category-balance record length 50.
16. [category_layout] Decode category widths as account 11, type 2, category 4 and balance 11, then ignore filler.
   basis: intcalc-opus.pdf p.8 lists accountId 9(11), typeCode X(2), categoryCode 9(4), balance S9(9)V99. The complete copybook could not be verified.
17. [disclosure_record_length] Require each disclosure-group record to contain exactly 50 characters.
   basis: intcalc-opus.pdf p.10 lists discgrp.dat CVTRA02Y length 50.
18. [disclosure_layout] Decode disclosure widths as group 10, type 2, category 4 and rate 6, then ignore filler.
   basis: intcalc-opus.pdf pp.5–9 provides no complete disclosure-group layout; this layout is unverified and the copybook verification attempt yielded no content.
19. [money_scale] Decode money with two implied decimal places.
   basis: intcalc-opus.pdf pp.5–6 and p.8 use V99 for account and category money.
20. [signed_encoding] Accept ordinary digits or ASCII trailing overpunch: { and A through I positive, } and J through R negative; reject all other signed encodings.
   basis: intcalc-opus.pdf pp.5–9 gives signed numeric PICs but does not specify ASCII sign encoding.
21. [rate_scale] Decode the six-character disclosure rate with two implied decimal places, accepting the same trailing overpunch convention.
   basis: intcalc-opus.pdf pp.5–9 omits the full disclosure layout, rate scale and sign encoding.
22. [integer_fields] Require unsigned decimal digits for account identifiers and category codes; emit their numeric values as JSON integers.
   basis: intcalc-opus.pdf pp.5–6 and p.8 specify digit fields; pp.10–11 fix integer account/category fields.
23. [text_preservation] Preserve account dates and active_status as supplied; omit only trailing spaces on group_id and addr_zip. Preserve all other account values except curr_bal.
   basis: intcalc-opus.pdf pp.10–11 allows strings to omit trailing spaces; pp.2–4 specify balance posting but no changes to unrelated fields.
24. [group_normalisation] Trim only trailing spaces when matching account and disclosure group identifiers; retain case and leading spaces.
   basis: intcalc-opus.pdf pp.2–4 do not specify group identifier normalisation. The chosen value is an implementation assumption, not recovered legacy behaviour.
25. [group_rate_agreement] Require every disclosure row in a group to have the same decoded rate, irrespective of its type or category; fail on missing or conflicting rates.
   basis: intcalc-opus.pdf pp.2–4 do not specify grouping details or conflicting-rate precedence. The chosen value is an implementation assumption, not recovered legacy behaviour. p.2 explicitly leaves grouping extraction as TODO.
26. [direct_multiplier] Compute interest as starting account balance multiplied directly by the group rate, without annualisation or a divisor.
   basis: intcalc-opus.pdf p.2: Logic: interest = currentBalance × interestRate(groupId); posted to balance and category balance. The same page leaves the exact formula as TODO; pp.2–4 specify no annualisation or divisor.
27. [exact_arithmetic] Use exact signed integer cents and decimal-string multiplication; never use binary floating-point multiplication for financial arithmetic.
   basis: intcalc-opus.pdf pp.2–4 do not specify an arithmetic representation. The chosen value is an implementation assumption, not recovered legacy behaviour.
28. [rounding] Round the product once to cents, with halfway cases away from zero.
   basis: intcalc-opus.pdf p.4: Rounding matches legacy {{TODO: confirm rounding mode}}. No cent rounding mode is supplied.
29. [active_status] Process every account regardless of active status.
   basis: intcalc-opus.pdf pp.2–4 do not specify active-status filtering. The chosen value is an implementation assumption, not recovered legacy behaviour.
30. [negative_balances] Preserve signed balances and signed interest, including negative results.
   basis: intcalc-opus.pdf pp.2–4 do not specify signed-balance exclusion. The chosen value is an implementation assumption, not recovered legacy behaviour.
31. [zero_balance] A zero starting balance produces zero interest.
   basis: intcalc-opus.pdf p.4: Account balance 0 Zero interest.
32. [account_posting] Add rounded interest to curr_bal.
   basis: intcalc-opus.pdf p.2 says interest is posted to the account balance.
33. [cycle_fields] Do not change current-cycle credit or debit values.
   basis: intcalc-opus.pdf pp.2–4 do not specify cycle credit/debit updates. The chosen value is an implementation assumption, not recovered legacy behaviour.
34. [category_target] Internally post rounded interest to category type 01 and category 0.
   basis: intcalc-opus.pdf p.2 requires category-balance posting; pp.2–4 do not specify the target type or category.
35. [category_creation] Create the internal target category at zero if it is absent.
   basis: intcalc-opus.pdf pp.2–4 do not specify missing-category creation. The chosen value is an implementation assumption, not recovered legacy behaviour.
36. [category_delivery] Return no category-balance output and make no durable category update; retain unrelated supplied category records internally.
   basis: intcalc-opus.pdf pp.10–11 lists no INTCALC category-balance output; response-only delivery is approved.
37. [transaction_emission] Emit exactly one transaction per account with nonzero rounded interest; emit none for zero rounded interest.
   basis: intcalc-opus.pdf pp.2–4 do not specify zero-rounded transaction emission. The chosen value is an implementation assumption, not recovered legacy behaviour.
38. [sorting] Sort accounts and emitted transactions by numeric account identifier.
   basis: intcalc-opus.pdf pp.10–11 permits lists in any order; a stable account order is chosen.
39. [transaction_identifier] Build tran_id from the zero-padded eleven-digit account identifier followed by a five-digit emitted-transaction sequence starting at 00001.
   basis: intcalc-opus.pdf pp.2–4 do not specify transaction identifier generation. The chosen value is an implementation assumption, not recovered legacy behaviour.
40. [sequence_overflow] Fail if the emitted-transaction sequence would exceed 99999.
   basis: intcalc-opus.pdf pp.2–4 do not specify transaction sequence overflow. The chosen value is an implementation assumption, not recovered legacy behaviour.
41. [identifier_representation] Emit tran_id as a JSON integer; fail if an identifier exceeds 9007199254740991 rather than returning an inexact JavaScript integer.
   basis: intcalc-opus.pdf pp.10–11 fixes identifier fields; it does not specify safe-integer overflow handling in FlowX.
42. [type_default] Set each transaction type_cd to 01.
   basis: intcalc-opus.pdf pp.2–4 do not specify transaction type metadata. The chosen value is an implementation assumption, not recovered legacy behaviour.
43. [category_default] Set each transaction cat_cd to integer 0.
   basis: intcalc-opus.pdf pp.2–4 do not specify transaction category metadata. The chosen value is an implementation assumption, not recovered legacy behaviour.
44. [source_default] Set each transaction source to INTCALC.
   basis: intcalc-opus.pdf pp.2–4 do not specify transaction source metadata. The chosen value is an implementation assumption, not recovered legacy behaviour.
45. [description_default] Set each transaction desc to Interest charge.
   basis: intcalc-opus.pdf pp.2–4 do not specify transaction description metadata. The chosen value is an implementation assumption, not recovered legacy behaviour.
46. [merchant_id_default] Set each transaction merchant_id to integer 0.
   basis: intcalc-opus.pdf pp.2–4 do not specify transaction merchant identifier metadata. The chosen value is an implementation assumption, not recovered legacy behaviour.
47. [merchant_name_default] Set each transaction merchant_name to an empty string.
   basis: intcalc-opus.pdf pp.2–4 do not specify transaction merchant name metadata. The chosen value is an implementation assumption, not recovered legacy behaviour.
48. [merchant_city_default] Set each transaction merchant_city to an empty string.
   basis: intcalc-opus.pdf pp.2–4 do not specify transaction merchant city metadata. The chosen value is an implementation assumption, not recovered legacy behaviour.
49. [merchant_zip_default] Set each transaction merchant_zip to an empty string.
   basis: intcalc-opus.pdf pp.2–4 do not specify transaction merchant ZIP metadata. The chosen value is an implementation assumption, not recovered legacy behaviour.
50. [card_default] Set each transaction card_num to an empty string.
   basis: intcalc-opus.pdf pp.2–4 do not specify transaction card number metadata. The chosen value is an implementation assumption, not recovered legacy behaviour.
51. [original_timestamp] Set orig_ts to businessDate at midnight formatted YYYY-MM-DDT00:00:00.000000.
   basis: intcalc-opus.pdf pp.2–4 do not specify original transaction timestamp generation. The chosen value is an implementation assumption, not recovered legacy behaviour.
52. [processing_timestamp] Set proc_ts to businessDate at midnight formatted YYYY-MM-DDT00:00:00.000000.
   basis: intcalc-opus.pdf pp.2–4 do not specify processing transaction timestamp generation. The chosen value is an implementation assumption, not recovered legacy behaviour.
53. [duplicates] Fail the whole run for duplicate account identifiers or duplicate account/type/category balance keys; equal disclosure rates within a group are permitted.
   basis: intcalc-opus.pdf pp.2–4 do not specify duplicate-record handling. The chosen value is an implementation assumption, not recovered legacy behaviour. p.8 defines the category key as accountId + typeCode + categoryCode.
54. [amount_overflow] Reject interest or updated account balances exceeding twelve cent digits, and updated category balances exceeding eleven cent digits in magnitude.
   basis: intcalc-opus.pdf pp.5–6 specify S9(10)V99 and p.8 specifies S9(9)V99; pp.2–4 do not specify overflow policy.
55. [atomic_failure] Return diagnostics and empty outputs for any malformed input, missing/conflicting rate, duplicate, overflow or incomplete/failed explanation; return no partial successful lists.
   basis: intcalc-opus.pdf pp.2–4 do not specify an error policy. The chosen value is an implementation assumption, not recovered legacy behaviour.
56. [amount_format] Return every monetary account and transaction value as a two-place decimal string.
   basis: intcalc-opus.pdf pp.10–11 permits JSON strings or numbers holding at most two decimals; two-place strings avoid representation ambiguity.
57. [contract_fields] Return exactly the listed account and transaction fields, using expiration_date with the corrected spelling.
   basis: intcalc-opus.pdf pp.10–11 define the INTCALC output fields and types; the approved contract uses expiration_date.
58. [explanation_boundary] Send only the decision register, wiki evidence, validated run parameters and validation summary to the explanation model; never send account or customer records.
   basis: The wiki does not define an explanation model boundary; the approved implementation isolates explanation from financial records and calculation.
59. [explanation_validation] Require one unique entry per registered decision, with separate unchanged assumption and evidence statements; reject incomplete, invented or altered entries.
   basis: The requested assumption log requires each decision and its wiki basis; pp.2–4 leave financial choices unresolved. Explanation cannot change approved choices.
60. [assumption_table] Render one Markdown row per decision with separate What you assumed and Which wiki statement (or absence of one) it rests on columns.
   basis: The requested assumptions.md records every decision and its basis; the approved response uses a two-column Markdown table.
61. [no_oracle_claim] Make no legacy-equivalence claim: copybooks and an oracle result have not been verified.
   basis: intcalc-opus.pdf p.4 says Interest = balance × group rate; matches legacy but leaves rounding confirmation as TODO. No oracle inputs or results were supplied and public copybook content could not be verified.
