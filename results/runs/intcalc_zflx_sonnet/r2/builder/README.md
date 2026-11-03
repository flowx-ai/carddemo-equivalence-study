# CardDemo INTCALC (interest calculation) on FlowX.AI

FlowX implementation of the CardDemo batch step INTCALC (`CBACT04C`, wiki P-15 interest-calculation).

## What is on the platform

Project `cd_intcalc_zflx_sonnet_r2` (appId `<uuid>`, WIP version `<uuid>`):

| Resource | Id |
|---|---|
| Workflow `intcalc_interest_calculation` (DEFAULT) | resourceId `<uuid>`, resourceDefinitionId `<uuid>` |
| Project data type `Account` (DT-01) | resourceDefinitionId `<uuid>` |
| Project data type `Transaction` (DT-05) | resourceDefinitionId `<uuid>` |

Workflow graph: `Start → Parse input files → Lookup rate and compute interest → Write interest transactions → Update accounts → End`

- **INPUT** (Start): `interestRunDate` (PARM, e.g. `2022071800`), `tcatbalFile`, `acctdataFile`, `discgrpFile`, `cardxrefFile` (optional). Each `*File` field holds the raw text of the fixed-width file.
- **OUTPUT** (End): `transactions` (Transaction[]), `accounts` (Account[], every account after interest), `runSummary` (counts and warnings).

All business rules (BR-01 … BR-10) run inside the workflow. `intcalc_runner.py` only moves data in and out of it.

## Running a batch

```sh
# 1. input files -> workflow INPUT body
python3 intcalc_runner.py prepare --input-dir <dir with tcatbal.dat acctdata.dat discgrp.dat cardxref.dat> \
        --run-date 2022071800 --out intcalc_input.json

# 2. run workflow intcalc_interest_calculation with intcalc_input.json as the input body
#    (zFlx MCP run_workflow, or Designer > workflow > Run) and save the END output as intcalc_result.json

# 3. END output -> CONTRACT outputs (output/intcalc_systran.json, output/intcalc_acctdata.json)
python3 intcalc_runner.py emit --result intcalc_result.json --out-dir output
```

`output/assumptions.md` records every decision taken where the wiki is uncertain or silent. `output/flags.json` lists the same uncertainties in the CONTRACT `flags.json` format.

## Tests

`test/fixtures/*.dat` is a synthetic data set covering every acceptance scenario: monthly interest
(1000.00 at 18.00 → 15.00), the DEFAULT fallback, `ZEROAPR`, a payment category at rate 0,
truncation, a negative balance written with GnuCOBOL sign encoding, a missing card xref, an
unsorted TCATBAL, and an account with no balances.

- `test/fixture_result.json` is the workflow's END output for those fixtures (run on 2026-10-25).
- `test/expected/*.json` is what `emit` should produce from that result.
