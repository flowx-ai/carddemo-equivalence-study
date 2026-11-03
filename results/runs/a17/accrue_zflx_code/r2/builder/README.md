# Ledgerline ACCRUE (LXB002C) on FlowX.AI

| | |
|---|---|
| Environment | dev-env, project `ll_a17_accrue_zflx_code_r2` (appId `<uuid>`, WIP version `<uuid>`) |
| Workflow | `cmd_accrue_lxb002c` — resourceId `<uuid>`, resourceDefinitionId `<uuid>` |
| Graph | START → SCRIPT "LXB002C accrue" → END (payload `${result}`) |
| Script source | `flowx/lxb002c_accrue.js` (same text as the node) |
| Decisions | `output/assumptions.md`, `output/flags.json` |

## Running a step

Start the workflow with this input body. Each file input is the **text of the file** (one record per line):

```json
{
  "parmDate": "2022071800",
  "ledgacc":  "<ledgacc.dat | postday_ledgacc.txt | postday_ledgacc.json>",
  "balcat":   "<balcat.dat  | postday_balcat.txt  | postday_balcat.json>",
  "cardlink": "<cardlink.dat>",
  "rategrp":  "<rategrp.dat>",
  "runTimestamp": "optional, 26-char DB2 timestamp to replace the clock"
}
```

The END output is:

```json
{ "accrue_systxn": [...], "accrue_ledgacc": [...], "returnCode": 0, "abendMessage": null, "recordCount": 6, "log": "..." }
```

Write `accrue_systxn` to `output/accrue_systxn.json` and `accrue_ledgacc` to `output/accrue_ledgacc.json`,
next to `assumptions.md`. `returnCode` 16 means the COBOL program would have abended (see A-14). The other
input files in CONTRACT.md are not read by this step.

## Verification

`test/fixture/` holds a hand-built data set (unsorted balance file, overpunched signs, STANDARD fallback,
rate 0, zero and negative balances, two cards on one account, an account with no balances). Its expected
outputs were worked out by hand from the COBOL, and the workflow reproduced them exactly in two forms:
fixed-width input and JSON input for ledgacc/balcat (`runTimestamp` `2022-07-18-10.00.00.000000`). An abend
run (an account missing from the ledger) returned code 16 and kept the rewrite and the transaction made
before it.
