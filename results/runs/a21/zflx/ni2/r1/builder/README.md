# CardDemo INTCALC on FlowX

| | |
|---|---|
| Project | `cd_a21_ni2_zflx_r1` (appId `<uuid>`, WIP `<uuid>`) on dev-env |
| Workflow | `intcalc_batch` — resourceId `<uuid>`, resourceDefinitionId `<uuid>` |
| Nodes | Start → Parse input files → Compute interest (CBACT04C) → Build contract outputs → End (payload `${result}`) |
| Input | `acctdata`, `tcatbal`, `discgrp`, `cardxref` (file text, verbatim), `interestRunDate` (default `2022071800`), optional `runTimestamp` |
| Output | `{ intcalc_systran: [...], intcalc_acctdata: [...], report: {...} }` |

## Running on a set of input files

```sh
python3 run_intcalc.py build-input <input_dir> --parm 2022071800 --out input.json
# run workflow intcalc_batch with input.json as its input body
#   (zFLX MCP: run_workflow { workflowResourceId: 62a9cab5-..., inputBody: <input.json> },
#    or Designer > intcalc_batch > Run), save the END output as result.json
python3 run_intcalc.py write-outputs result.json --out-dir .
```

`write-outputs` writes `intcalc_systran.json` and `intcalc_acctdata.json` and prints the run report.
The report lists accounts updated, transactions written, DEFAULT fallbacks, and any missing account, rate or xref.

## Test

`test/input/*.dat` are fixtures built from the acceptance-criteria scenarios.
`test/output/*.json` is what the workflow returned for them on 2026-10-28 (run `6ae1d50a3695c563ea50a98a`, `runTimestamp` fixed).
Every value was checked by hand.

- **DEFAULT fallback** (AC 1, 4): account 5 (`NOSUCHGRP`) uses the DEFAULT 18.00 rate, giving 15.00.
- **Ten-year rule:**
  - AC 8: account 2, opened 2010-02-13 → rate 13.00 → 10.83.
  - Boundary: account 4, opened 2012-07-18 → reduced → 10.83.
  - AC 9: account 3, opened 2012-07-19 → not reduced → 12.50.
- **Zero rates** (AC 5): `ZEROAPR` and payments (type 02, rate 0) write no transaction. A 1.50 rate on a long-standing account clamps to 0 and writes none either.
- **Truncation:** −100.10 × 25.00 / 1200 = −2.0854 → −2.08.
- **Ids and cards:** transaction ids follow TCATBAL key order even though the file is unsorted. Account 1 has two cards and the lower number is used.
- **Account update:** the cycle totals of accounts with balances are reset, and account 7 (no balances) is left unchanged.

Decisions where the wiki is unclear are listed in `assumptions.md`; the uncertainties declared for scoring are in `flags.json`.
