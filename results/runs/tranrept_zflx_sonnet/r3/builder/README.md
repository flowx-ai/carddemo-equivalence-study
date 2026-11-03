# CardDemo daily transaction report: FlowX build

The build lives on the FlowX platform:

| | |
|---|---|
| Environment | dev-env (`<dev-environment>`) |
| Project | `cd_tranrept_zflx_sonnet_r3` (appId `<uuid>`, WIP version `<uuid>`) |
| Workflow | `tranrept_daily_transaction_report` (resourceId `<uuid>`, resourceDefinitionId `<uuid>`) |

Flow: START → Select Transactions In Range Sorted By Card → Lookup Account Type And Category Names → Build Report Lines And Totals → END.
The script of each node is mirrored in `src/` (`01_…`, `02_…`, `03_…`).

## Running a step

Workflow input (INPUT slice on START). Each file is passed as its full text, one record per line:

```json
{
  "transact":  "<contents of transact.dat>",
  "cardxref":  "<contents of cardxref.dat>",
  "trantype":  "<contents of trantype.dat>",
  "trancatg":  "<contents of trancatg.dat>",
  "startDate": "2022-07-01",
  "endDate":   "2022-07-31"
}
```

Run it with `run_workflow`, or start the workflow on the platform.
The output (OUTPUT slice on END) has these fields:

| Field | Content |
|---|---|
| `tranrept_report` | The report, one 133-character string per printed line. This is the contract's `tranrept_report.txt` in list form; join with `\n` to get the file. |
| `lineCount` | Number of detail lines. |
| `grandTotal` | Grand total as a decimal string. |
| `errors` | Unknown card, type or category references (the run continues). |

Decisions where the wiki was silent or uncertain are in `assumptions.md`.

## Verification done

These ran on the platform with synthetic data, not the study inputs, which were not available here:

- **Full run.** Three cards, overpunch signs including a negative `}`, a record outside the date range, and a card and type missing from the reference files. Field positions, sorting, the filter, account, page and grand totals, and error flagging were checked.
- **Report node alone, 18 transactions.** Checked that a page holds 20 lines, after which the page total, a rule and a new header are printed.
- **Report node alone, empty range.**
