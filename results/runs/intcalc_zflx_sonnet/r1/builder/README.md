# CardDemo INTCALC on FlowX.AI

The interest-calculation batch step (legacy job `INTCALC`, program `CBACT04C`) built as a FlowX
integration workflow.

| | |
|---|---|
| FlowX project | `cd_intcalc_zflx_sonnet_r1` (appId `<uuid>`, WIP version `<uuid>`) |
| Workflow | `intcalc_interest_calculation`, resourceId `<uuid>`, resourceDefinitionId `<uuid>` |
| Graph | Start → Parse input files → Compute interest and post → Format contract outputs → End |
| Input slice | `acctdataDat`, `tcatbalDat`, `discgrpDat`, `cardxrefDat` (raw file text), optional `interestRunDate` (default `2022071800`), `batchId` |
| Output (END payload) | `intcalc_systran[]`, `intcalc_acctdata[]` (CONTRACT.md fields), plus `stats` and `warnings` |

## Running one batch

```sh
python3 run_intcalc.py build-request <input_dir> -o request.json --parm 2022071800
# run the workflow with request.json as its input body
#   (MCP: run_workflow { workflowResourceId: 3e143bc8-..., inputBody: <request.json> }, or Designer > Run)
# save the run result (END node output) as result.json, then:
python3 run_intcalc.py write-outputs result.json output/
```

This writes `output/intcalc_systran.json` and `output/intcalc_acctdata.json`. Decisions taken where
the wiki is silent or uncertain are in `output/assumptions.md`; `output/flags.json` lists the
outputs those decisions affect.
