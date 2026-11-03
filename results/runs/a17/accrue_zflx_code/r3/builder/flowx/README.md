# Running `accrue_lxb002c`

FlowX project `ll_a17_accrue_zflx_code_r3`, workflow `accrue_lxb002c`
(resourceId `<uuid>`).

## Input (workflow start body)

| Key        | Content                                                                  |
|------------|--------------------------------------------------------------------------|
| `parm`     | ACCRUE parameter, e.g. `"2022071800"` (required)                         |
| `balcat`   | full text of `balcat.dat` (POSTDAY output: `.txt` dump or JSON list)     |
| `ledgacc`  | full text of `ledgacc.dat` (POSTDAY output: `.txt` dump or JSON list)    |
| `cardlink` | full text of `cardlink.dat`                                              |
| `rategrp`  | full text of `rategrp.dat`                                               |

`daytxn.dat`, `clntrec.dat`, `crdrec.dat`, `txntype.dat` and `txncatg.dat` are not read by LXB002C.
A file that is left out is treated as a failed OPEN, and the run abends with RC 16 (see A-12).

Example with zflx: `run_workflow { workflowResourceId, inputBody: {"parm": "2022071800", "balcat": "<file text>", ...} }`.

## Output (END node returns `result`)

```json
{ "accrue_systxn": [...], "accrue_ledgacc": [...], "returnCode": 0, "displayLog": [...] }
```

Write `result.accrue_systxn` to `accrue_systxn.json` and `result.accrue_ledgacc` to
`accrue_ledgacc.json`. Both already use the CONTRACT.md field names and types. `returnCode` 16 means
the COBOL abend path was taken; the lists then hold the partial state (assumptions.md A-12).

The SCRIPT node receives the whole data model, which is capped at about 1 MB. That is enough for
roughly 3,000 ledger accounts plus their BALCAT records. A larger input would need the files split
across nodes or stored in a FlowX database.
