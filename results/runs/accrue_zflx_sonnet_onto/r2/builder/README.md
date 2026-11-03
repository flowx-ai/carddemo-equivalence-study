# Ledgerline ACCRUE (interest calculation) on FlowX.AI

FlowX workflow **`interest-calculation`** (project dev-env, app `<uuid>`, version `<uuid>`;
resourceId `<uuid>`, resourceDefinitionId `<uuid>`).

```
START ─▶ Load input files ─▶ Compute interest and post transactions ─▶ Build outputs ─▶ END
```

- **Input slice (START):** `interestRunDate` (PARM, e.g. `2022071800`), `ledgaccDat`, `cardlinkDat`,
  `balcatDat`, `rategrpDat` (file text: fixed width per copybook, or a JSON list in CONTRACT naming).
  Optional: `rewriteLastAccount` (see `out/assumptions.md` A-01) and `runTimestamp` (pins the timestamps).
- **Output slice (END):** `accrue_systxn[]`, `accrue_ledgacc[]` (CONTRACT.md fields), `summary`
  (counts, the account left un-rewritten, and any data errors).

## Run

```sh
python3 -I tools/prepare_input.py <input_dir> --parm 2022071800 > input_body.json
# run the workflow with input_body.json as inputBody (Designer "Run", or MCP run_workflow),
# save the END output as result.json, then:
python3 -I tools/write_outputs.py result.json out/
```

`out/` holds `assumptions.md` (every decision and the wiki statement it rests on), `flags.json`
(the same uncertainties, in the CONTRACT flags format) and, after a run, `accrue_systxn.json`,
`accrue_ledgacc.json` and `run_summary.json`.

`tools/make_fixture.py <dir>` generates the synthetic fixture used for the smoke test.
