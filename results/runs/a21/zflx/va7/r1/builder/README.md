# POSTTRAN (daily-transaction-posting) — FlowX build

- **Environment:** dev-env. Project `cd_a21_va7_zflx_r1` (appId `<uuid>`, WIP version `<uuid>`).
- **Workflow:** `posttran_daily_transaction_posting`. resourceId `<uuid>`, resourceDefinitionId `<uuid>`.

| Node | Wiki node (P-14) | Legacy (CBTRN02C) |
|---|---|---|
| Load Daily Feed | Load Daily Feed | file opens / reads, copybook layouts |
| Validate and Post Records | For Each Record → Validate Record → Post Transaction / Write Reject | 1500-VALIDATE-TRAN, 2000-POST-TRANSACTION (2700/2800/2900), 2500-WRITE-REJECT-REC; plus BR-10 |
| Build Run Summary | Build Run Summary | end-of-job counts, RETURN-CODE 4 |

## Input (workflow START, INPUT slice)
```json
{ "businessDate": "2022-07-18", "batchId": "...",
  "dalytranLines": ["<each line of dailytran.dat>"],
  "acctdataLines": ["<each line of acctdata.dat>"],
  "cardxrefLines": ["<each line of cardxref.dat>"],
  "tcatbalLines":  ["<each line of tcatbal.dat>"] }
```

## Output (END payload)
The END payload is `{ runSummary, posttran_transact, posttran_dalyrejs, posttran_acctdata, posttran_tcatbal }`.
Each `posttran_*` array is written verbatim as `<name>.json` in this directory.

## Verification
I ran the workflow on a synthetic 12-record feed covering acceptance scenarios 1–9 and 11. Every scenario
produced its expected result: posted, the 100 / 101 / 102 / 103 / 104 rejects, a new category balance, and
a WARNING run state with return code 4.

Decisions taken where the wiki is open are in `assumptions.md`; the related flags are in `flags.json`.
