# CardDemo POSTTRAN (daily transaction posting) on FlowX.AI

## What was built

| | |
|---|---|
| Environment | `dev-env` (`<dev-environment>`), platform 5.13.0 |
| Project | `cd_posttran_zflx_opus_r2` (appId `<uuid>`, WIP version `<uuid>`) |
| Workflow | `posttran_daily_posting`: resourceId `<uuid>`, resourceDefinitionId `<uuid>` |

```
START ─► Load Daily Transactions ─► Any daily transactions? ─┬─ yes ─► Post Transactions ─► Build Output Files ─► END
         (parse fixed-width files)   (FORK)                  └─ no (empty file) ─────────────► Build Output Files
```

- **Load Daily Transactions**: parses `dailytran` (CVTRA06Y), `acctdata` (CVACT01Y), `cardxref`
  (CVACT03Y), `tcatbal` (CVTRA01Y) and `carddata` (CVACT02Y). Amounts are held as integer cents.
- **Post Transactions**: one pass per transaction, in file order:
  1. Fetch the account through the card xref.
  2. Validate (PostingValidation, the gateway).
  3. If valid, update the account balances and the category balance (UpdateCategoryBalance).
     Otherwise, write a reject with its reason.
- **Build Output Files**: produces the four POSTTRAN outputs of CONTRACT.md.

### Contract

**Input** (START INPUT slice). Each file is passed as its full text content, one record per line:

| key | required | |
|---|---|---|
| `businessDate` | yes | e.g. `2022-07-18` |
| `dailytran`, `acctdata`, `cardxref`, `tcatbal`, `carddata` | optional (empty = no records) | file contents |
| `ruleProfile` | optional | `WIKI` (default) or `LEGACY`; see `outputs/assumptions.md` A2 |
| `procTimestamp` | optional | pins `proc_ts` for reproducible runs |

**Output** (END OUTPUT slice): `posttran_transact`, `posttran_dalyrejs`, `posttran_acctdata`,
`posttran_tcatbal`, `runSummary`. Each list is written as `<name>.json`.

## Running it on the real inputs

The real input files were not in this folder, so no real outputs have been produced yet. To run:

1. Read each `.dat` file as text.
2. Start the workflow with
   `{"businessDate":"2022-07-18","dailytran":"<file text>","acctdata":"…","cardxref":"…","tcatbal":"…","carddata":"…"}`.
   You can use the Designer's Run, or the MCP `run_workflow` tool, which is how it was tested here.
3. Write each of the four output lists to `outputs/<name>.json`, next to `outputs/assumptions.md`.

The data is about 50 accounts and a few hundred daily transactions, well under the 1 MB
script-payload cap.

## Tested

The synthetic inputs in `test/inputs/` cover AC scenarios 1–6 plus unknown card, missing account,
inactive card, a credit (negative amount), a new TCATBAL key and an exact-limit transaction. The
FlowX run results are in `test/outputs/` and match the hand-computed expectations. The empty-file
branch and the LEGACY profile were run separately and also behaved as expected.
