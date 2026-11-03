# CardDemo daily transaction report (TRANREPT) on FlowX

FlowX project `cd_tranrept_zflx_sonnet_r1` on dev-env (appId `<uuid>`,
WIP version `<uuid>`), workflow `transaction-report`:

    Start -> Select Transactions in Range -> Load Reference Data -> Add Report Lines and Totals -> End

- INPUT (Start): `transactDat`, `cardxrefDat`, `trantypeDat`, `trancatgDat`. Each holds the full text of
  that `.dat` file. Also `startDate` and `endDate` (YYYY-MM-DD).
- OUTPUT (End): `tranrept_report`, the 133-column lines joined by `\n`. Also `lineCount`, `detailCount`,
  `grandTotal`, `status` and `referenceErrors`.

## Run

Start the workflow with the four files' contents and the dates, e.g. via the zflx MCP `run_workflow`.
Write `tranrept_report` to `output/tranrept_report.txt`:

    {"startDate":"2022-07-01","endDate":"2022-07-31",
     "transactDat":"<transact.dat>","cardxrefDat":"<cardxref.dat>",
     "trantypeDat":"<trantype.dat>","trancatgDat":"<trancatg.dat>"}

## Layout

- `flowx/scripts/`: the SCRIPT node sources. These are the source of truth; paste them into the nodes after
  editing.
- `output/`: `assumptions.md` and `flags.json`. `tranrept_report.txt` goes here.
- `tests/synthetic/`: hand-made inputs and the report the workflow produced from them. They cover page
  breaks, overpunch negatives, a zero amount, the date boundaries, and unknown type and card references.
