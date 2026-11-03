# Build: daily transaction report (TRANREPT) on FlowX.AI

- Environment: dev-env (FlowX 5.13.0), project `cd_a21_ix3_zflx_r2`
  (appId `<uuid>`, version `<uuid>`, WIP, not committed)
- Workflow: `tranrept_daily_transaction_report`
  - resourceId `<uuid>`
  - resourceDefinitionId `<uuid>`

## Flow
START → Select Transactions in Range (BR-01, BR-02, BR-05, BR-07)
→ Get Type and Category Names (BR-03, AC-5)
→ Add Report Lines and Totals (BR-04, BR-06) → END

## Contract
INPUT (START slice):
- `transactDat`, `cardxrefDat`, `trantypeDat`, `trancatgDat`: the file contents, one record per line
- `startDate`, `endDate`: optional, `YYYY-MM-DD`

OUTPUT (END slice):
- `tranrept_report`: the report as one string, lines joined by `\n`. This is the contract's
  "under the file's name without extension" form; write it to `tranrept_report.txt`.
- `lineCount`, `detailCount`, `grandTotal`, `excludedInterestCount`, `errorCount`, `errors[]`

Run it with the contract parameters:

    run_workflow { workflowResourceId: "a4a7be75-...", inputBody: {"startDate":"2022-07-01","endDate":"2022-07-31",
      "transactDat":"<transact.dat>","cardxrefDat":"<cardxref.dat>","trantypeDat":"<trantype.dat>","trancatgDat":"<trancatg.dat>"} }

## Verification
The workflow ran once end to end (run `6ae1edc53695c563ea50ae62`, FINISHED) on a 32-record
synthetic fixture covering:
- out-of-range dates on both sides
- an interest posting
- a negative amount
- an amount over 1,000,000
- a 25-transaction card forcing a page break
- a card with no xref and an unknown type/category

All 46 output lines matched a hand-derived expectation: totals 1,234,605.86 / 25.00 / page
1,234,616.86 and 14.50 / grand 1,234,631.36, and 3 errors. The real CardDemo data files and the
oracle output were not available here, so the report has not been compared with the oracle.
