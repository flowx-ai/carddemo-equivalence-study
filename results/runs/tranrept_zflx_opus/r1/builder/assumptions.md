# TRANREPT (daily transaction report): assumptions and decisions

## What was built

FlowX project `cd_tranrept_zflx_opus_r1` (app `<uuid>`, WIP version
`<uuid>`, platform dev-env). It contains one integration workflow:

**`tranrept_daily_report`** (resourceId `<uuid>`,
resourceDefinitionId `<uuid>`)

```
Start ─► Validate parameters ─► Parameters valid? ─┬─ yes ─► Build report (TRANREPT) ─┬─► End
                                                   └─ no ──► Reject parameters ───────┘
```

- **INPUT** (on Start): `transact`, `cardxref`, `trantype`, `trancatg` are the full text of
  `transact.dat`, `cardxref.dat`, `trantype.dat` and `trancatg.dat` (one fixed-width record per line).
  `startDate` / `endDate` are `YYYY-MM-DD`. `accountId` is an optional filter.
- **OUTPUT** (on End): `tranrept_report` holds the report lines joined by `\n`, each padded to
  133 characters. This is the "one string under the file's name without extension" form that CONTRACT.md
  allows. The output also has `lineCount` and `error` (empty on success).
- Contract run: `{"transact": <transact.dat>, "cardxref": <cardxref.dat>, "trantype": <trantype.dat>,
  "trancatg": <trancatg.dat>, "startDate": "2022-07-01", "endDate": "2022-07-31"}`.
- Script sources are mirrored in `flowx/` (`validate_parameters.js`, `build_report.js`).
  `flowx/test_harness_prefix.js` is the synthetic-data generator used for testing.

Verification so far uses synthetic data only, because no real input files were in the workspace:
- A node run on 21 generated records covered the date filter, the card-number sort, an account
  break, a page break, and negative, zero and comma-formatted amounts. All lines were 133 wide and
  the totals were arithmetically consistent.
- Two end-to-end workflow runs covered an empty result and from > to.

The workflow has **not** been run on the real CardDemo files and has **not** been compared with the oracle.

## Where the wiki is silent and what I decided

The wiki gives this step almost no behaviour. `process-reports.md` only says "Query Report Data —
Aggregate transactions — legacy reference `TRANREPT logic`". The acceptance criteria give five
scenarios, and the UI flow gives the parameters and validators. Selection, ordering, grouping,
paging and totals are not documented. In every one of those gaps I followed the legacy program the
wiki names as the reference: `TRANREPT.jcl` (a sort step) followed by `CBTRN03C`, as I know it from
the open-source CardDemo code. Each item below is a decision of that kind.

1. **Selection by processing date.** A transaction is included when the first 10 characters of
   `TRAN-PROC-TS` (YYYY-MM-DD) are between the start and end dates, both inclusive. *Wiki:*
   "Captures report parameters (date range …)" and "Validate date range". The wiki never says which
   timestamp the range applies to (origin or processing); I followed the legacy sort INCLUDE on the
   processing date.
2. **Order: card number ascending, stable.** Records are sorted on `TRAN-CARD-NUM`. Equal card
   numbers keep their input-file order. *Wiki:* silent about order. The legacy JCL sorts on card
   number; whether that sort is stable (EQUALS) is not stated anywhere, so stability is my choice.
3. **Grouping key is the card, labelled "Account Total".** An "Account Total" line is written when
   the card number changes, not when the account changes. Two cards on one account therefore get
   two account totals. The Account ID printed on a detail line is `XREF-ACCT-ID`, looked up in
   `cardxref.dat` by card number. *Wiki:* silent. This follows legacy CBTRN03C.
4. **Page size 20 with a legacy line counter.** One counter counts every printed line: header
   block +4, detail +1, account total and its rule +2, page total and its rule +2. Before each
   detail line, if the counter is a multiple of 20, a page total and a new page header are written.
   Because totals add 2 lines, pages can be longer than 20 lines. *Wiki / CONTRACT:* the contract
   gives the page-start structure but no page length.
5. **The first page header is written with the first selected transaction.** The first card change
   writes no account total.
6. **End of file is reproduced as the legacy program does it.**
   - The amount of the last selected transaction is added a **second time** to the page total and
     the account total.
   - Then the final page total (with its rule) and the Grand Total are written.
   - **No account total is written for the last card.**

   *Wiki:* silent about end-of-report totals. This is bug-compatible with CBTRN03C, where the EOF
   branch re-adds `TRAN-AMT`. I chose fidelity to the legacy output over the "correct" totals; see
   `flags.json`.
7. **Grand total = sum of printed page totals.** That includes the duplicated last amount.
   Account totals do not feed the grand total.
8. **Lookup failures abort the report.** These are: a card not in cardxref, a type code not in
   trantype, or a type + category pair not in trancatg. The legacy program ABENDs in these cases.
   I stop at the failing transaction, return the lines produced so far, and set `error`. *Wiki:*
   silent about missing reference data.
9. **Descriptions are truncated to the print width:** type description to 15 characters, category
   description to 29 (CONTRACT X(15) / X(29)). The type lookup key is `TRAN-TYPE-CD`; the category
   lookup key is `TRAN-TYPE-CD` + `TRAN-CAT-CD`.
10. **Edited amounts.**
    - A zero amount or zero total prints as 15 spaces (COBOL Z-suppression with an all-Z picture),
      including the sign position.
    - The detail picture `-ZZZ,ZZZ,ZZZ.ZZ` prints a space for positive values. The totals picture
      `+ZZZ,ZZZ,ZZZ.ZZ` prints `+` or `-`.
    - Values below 1 print as `.nn` with no leading zero.

    *CONTRACT* defines the pictures but says nothing about zero values.
11. **Amount parsing.** `TRAN-AMT` (S9(9)V99) is read as zoned decimal with a trailing overpunch
    sign. Both conventions are accepted: `{`/`A`–`I` positive and `}`/`J`–`R` negative (EBCDIC
    style), and `p`–`y` negative (ASCII style). An explicit sign or decimal point is also tolerated.
    *CONTRACT:* "layouts as in the copybooks"; the file encoding of the sign is not stated.
12. **Accumulators** are S9(9)V99. On overflow the high-order digits are truncated, as the legacy
    program does without ON SIZE ERROR.
13. **Header date range.** The report header prints the start and end date parameters as given
    (CONTRACT positions 92–101 and 106–115).
14. **Parameter validation (Date Utility).** Both dates are required, must be valid calendar dates
    in `YYYY-MM-DD`, and must satisfy from ≤ to. If any check fails, no report is produced and
    `error` is returned (acceptance scenarios 2 and 3). The wiki's Date Utility is a call activity;
    I implemented its rules inline in a SCRIPT node. *Wiki:* `process-date-utility.md` recommends
    "replace with the platform date library inline (no call activity)". The legacy batch did not
    validate DATEPARM at all; this is an addition taken from the wiki.
15. **Empty result.** When no transaction is in range, the output is a page total line (blank
    amount), a rule and a grand total line (blank amount). There is no page header and no error
    (acceptance scenario 4: "Report with zero rows, no error"). This matches what the legacy
    program prints.
16. **Optional `accountId` filter** (UI field `report.accountId`, numeric). When it is given, only
    transactions whose card maps to that account are selected. For the contract run it is empty,
    so every account is included. *Wiki:* `ui-flow-reports.md` binds `accountId`, but the batch has
    no such parameter.
17. **Not built.**
    - The interactive parts of the Reports process: the user tasks, the Report Type selector (the
      only known type is "Transaction Detail"), and download/view.
    - PDF rendering through the Statement PDF Renderer (`pdfRendererUrl`), including acceptance
      scenario 5.

    *Wiki:* those are UI and PDF concerns. CONTRACT asks only for `tranrept_report.txt`, and the
    wiki's PDF strategy is itself an open `{{DECISION}}`.
18. **Input hygiene.** Blank lines are ignored, CRLF is accepted, and short records are
    right-padded with spaces to the copybook length. For a duplicate key in a lookup file, the
    first occurrence wins, because the KSDS keys are unique.
