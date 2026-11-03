# TRANREPT — daily transaction report on FlowX.AI

FlowX project `cd_tranrept_zflx_opus_r3` (appId `<uuid>`,
WIP version `<uuid>`, env dev-env), not committed.

Workflow **`tranrept_daily_report`**
- resourceId `<uuid>`
- resourceDefinitionId `<uuid>`

```
Start → Validate Run Parameters → Params Valid? ─IF→ Query Report Data → Render Report → Report End
                                                └ELSE→ Validation Error End
```

| Node | Legacy | Does |
|---|---|---|
| Validate Run Parameters | CSUTLDTC (Date Utility) | dates required, valid, start ≤ end |
| Query Report Data | TRANREPT.jcl sort step | parse transact.dat, keep proc-date in range, stable sort by card number |
| Render Report | CBTRN03C | lookups, 133-byte lines, paging, account/page/grand totals |

Script sources (identical to what is deployed): `flowx/01_validate_params.js`,
`flowx/02_query_report_data.js`, `flowx/03_render_report.js`.

## Contract

INPUT (Start): `transactFile`, `cardxrefFile`, `trantypeFile`, `trancatgFile` — the full text of
`transact.dat`, `cardxref.dat`, `trantype.dat`, `trancatg.dat`; `startDate`, `endDate` (`YYYY-MM-DD`).

OUTPUT (Report End): `tranrept_report` — the report lines joined by `\n` (= `tranrept_report.txt`),
`reportLineCount`, `abendMessage` (null unless a lookup failed).
OUTPUT (Validation Error End): `validationError`.

Run for the contract parameters:
`run_workflow { workflowResourceId: <uuid>, inputBody: {"startDate":"2022-07-01","endDate":"2022-07-31", "transactFile": "...", ...} }`

## Verification done

Run on FlowX with synthetic data (3 cards, 42 records, out-of-range dates, negatives, zeros,
a 9-digit amount): filtering, card ordering, page breaks at the 20-line counter, account totals,
EOF double-add and grand total were checked by hand. Also checked: from > to (validation error),
missing end date (required error), empty selection, and an unknown card (partial report + abendMessage).
Not run against the real CardDemo data files, which were not provided.

`test/harness.js` and `test/gen_synthetic.js` are a node harness for the same scripts. They were
not executed in this session (no shell available).

Decisions: `assumptions.md`. Declared uncertainties: `flags.json`.
