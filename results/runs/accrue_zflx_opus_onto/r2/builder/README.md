# Ledgerline ACCRUE (interest calculation) on FlowX.AI

The step is the FlowX workflow **`accrue_interest_calculation`** in project app `<uuid>`
(resourceId `<uuid>`, resourceDefinitionId `<uuid>`).

```
Start ─▶ Load inputs ─▶ Compute interest ─▶ Post interest to accounts ─▶ Format outputs ─▶ End (${result})
```

| Node | Legacy (LXB002C) | Does |
|---|---|---|
| Load inputs | file opens/reads | parses ledgacc / balcat (fixed-width or POSTDAY JSON), cardlink, rategrp |
| Compute interest | 1000–1300 | key-ordered walk of category balances, rate lookup with standard-group fallback, `bal × rate / 1200` truncated, one interest transaction each |
| Post interest to accounts | 1050-UPDATE-ACCOUNT | balance += account's interest, cycle credit/debit reset |
| Format outputs | — | CONTRACT.md field names and number formats |

**Workflow input** (START INPUT slice): `ledgacc`, `balcat`, `cardlink`, `rategrp` (file contents as strings),
`parmDate` (`2022071800`), optional `runTimestamp`. **Output** (END): `{accrue_systxn, accrue_ledgacc, runLog}`.

## Running a batch

1. `python3 -I tools/pack_inputs.py <input_dir> accrue_input.json` — picks `postday_ledgacc.*` / `postday_balcat.*`
   when present (CONTRACT step isolation), else `ledgacc.dat` / `balcat.dat`.
2. Run the workflow with that JSON as input body (Designer → Run workflow, or the MCP `run_workflow` tool) and save the
   END output as `result.json`.
3. `python3 -I tools/unpack_outputs.py result.json .` — writes `accrue_systxn.json`, `accrue_ledgacc.json`, `accrue_runlog.txt`.

Decisions taken where the wiki is silent or uncertain: `assumptions.md`. Declared uncertainties for the scorer: `flags.json`.
