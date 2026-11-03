# CardDemo INTCALC on FlowX.AI

- Environment: `dev-env` (<dev-environment>), project `cd_intcalc_zflx_opus_r3`
- Workflow: `intcalc_interest_calculation`
  - resourceId `<uuid>`
  - resourceDefinitionId `<uuid>`
- Nodes: Start → Load Accounts → Compute Interest → Post Interest to Balance → Save Accounts and Transactions → End

## Contract
INPUT (Start), each a file's full text:
- `acctdataDat`
- `cardxrefDat`
- `tcatbalDat`
- `discgrpDat`
- `parmDate` (optional, default `2022071800`)
- `runTimestamp` (optional, pins orig_ts/proc_ts)

OUTPUT (End):
- `intcalcSystran` — JSON text written to `intcalc_systran.json`
- `intcalcAcctdata` — JSON text written to `intcalc_acctdata.json`
- `runLog` — counts and skipped/missing-rate messages

## Running a scored run
1. Put each input file's text into the matching INPUT key.
2. Run the workflow.
3. Write `intcalcSystran` to `intcalc_systran.json` and `intcalcAcctdata` to `intcalc_acctdata.json`, both in this directory.

Behavioural decisions: `assumptions.md`. Declared uncertainties: `flags.json`.
