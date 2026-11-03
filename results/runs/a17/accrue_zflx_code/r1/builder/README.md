# ACCRUE step (LXB002C) on FlowX

The implementation is the FlowX workflow `accrue_lxb002c` in project `ll_a17_accrue_zflx_code_r1`
on dev-env (resourceId `<uuid>`).

## Contract

| Direction | Key | Content |
|---|---|---|
| INPUT | `parm` | EXEC PARM, e.g. `2022071800` |
| INPUT | `ledgacc` | account input: the POSTDAY output (`postday_ledgacc.json` / `.txt`), or `ledgacc.dat` |
| INPUT | `balcat` | category balances: the POSTDAY output (`postday_balcat.json` / `.txt`), or `balcat.dat` |
| INPUT | `cardlink` | `cardlink.dat` (fixed-width) |
| INPUT | `rategrp` | `rategrp.dat` (fixed-width) |
| OUTPUT | `accrue_systxn` | list, CONTRACT.md transaction fields |
| OUTPUT | `accrue_ledgacc` | list, CONTRACT.md account fields |
| OUTPUT | `returnCode` | 0, or 16 on abend |
| OUTPUT | `abendMessage` | abend reason |
| OUTPUT | `runLog` | program messages |

## Running one case

```sh
python3 -I run/make_input.py <input_dir> 2022071800 > input.json
# run the workflow with input.json as its input body
# (zflx run_workflow, or the Designer's Run with that JSON)
# save the END node output as end_output.json, then:
python3 -I run/write_outputs.py end_output.json .   # -> accrue_systxn.json, accrue_ledgacc.json
```

`assumptions.md` records every decision taken where the COBOL source was silent or surprising.
