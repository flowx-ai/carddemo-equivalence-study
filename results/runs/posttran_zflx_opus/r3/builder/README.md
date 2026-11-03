# CardDemo POSTTRAN (daily transaction posting) on FlowX.AI

## What was built

FlowX project **`cd_posttran_zflx_opus_r3`** (appId `<uuid>`, WIP version
`<uuid>`, host `dev-env`), integration workflow **`posttran_daily_posting`**:

| | |
|---|---|
| resourceId | `<uuid>` |
| resourceDefinitionId | `<uuid>` |

```
Start ─▶ Load Daily Transactions ─▶ Load Account Master Data ─▶ Validate and Post Transactions ─▶ Write Posting Outputs ─▶ End
         (dailytran, CVTRA06Y)      (acctdata/cardxref/          (PostingValidation gateway,        (CONTRACT.md shapes)
                                     carddata/tcatbal)             post / reject, per txn)
```

The node scripts are mirrored in `flowx/scripts/01..04_*.js`; they are the same code that is configured on the nodes.

**INPUT slice (Start)** — raw file contents as strings, one record per line:
`businessDate` (req), `acctdata` (req), `cardxref` (req), `dailytran`, `tcatbal`, `carddata`, `runTimestamp`
(optional; pins `proc_ts`, format `YYYY-MM-DD-HH.MM.SS.ffffff`).

**OUTPUT slice (End)** — `posttran_transact`, `posttran_dalyrejs`, `posttran_acctdata`, `posttran_tcatbal` (each a
list in the CONTRACT.md field format) and `summary` {businessDate, transactionsRead, posted, rejected, returnCode}.

Decisions where the wiki was uncertain, incomplete or silent: **`output/assumptions.md`**. Pre-declared uncertainties:
**`output/flags.json`**.

## Running it on the real inputs

The `.dat` files were not in this workspace, so the real outputs have not been produced yet. To produce them:

1. Put the input files in `input/` (`dailytran.dat`, `acctdata.dat`, `cardxref.dat`, `tcatbal.dat`, `carddata.dat`;
   the others are not used by this step).
2. Start the workflow with the file contents (zFLX `run_workflow`, or the Designer's Run):
   ```json
   {"businessDate": "2022-07-18",
    "dailytran": "<contents of dailytran.dat>", "acctdata": "<…>", "cardxref": "<…>",
    "tcatbal": "<…>", "carddata": "<…>"}
   ```
3. From the End output, write each of the four lists to `output/<name>.json`
   (`posttran_transact.json`, `posttran_dalyrejs.json`, `posttran_acctdata.json`, `posttran_tcatbal.json`), next to
   `assumptions.md` and `flags.json`.

Size: the whole data model ships to each script node (1 MB cap). The standard CardDemo files (~105 KB daily file,
50 accounts) are well within it; each node nulls the raw data it has consumed.

## Tests (run on FlowX, 2026-10-26)

`test/generate_fixtures.js` built copybook-exact fixtures (`test/fixtures/*.dat`). The workflow output for them is in
`test/run-fixture/` (run with `runTimestamp` pinned):

| AC scenario | fixture txn | result |
|---|---|---|
| 1 valid post | T…01 purchase 25.50, T…02 payment −10.00 | posted; acct 1 bal 100.00→115.50, cyc credit 25.50, cyc debit −10.00 |
| 2 over limit | T…04 150.00 vs 100.00 available | rejected 102 |
| — boundary | T…05 exactly 100.00 available | posted; acct 3 bal 1000.00 |
| 3 inactive account | T…03 acct status N | rejected 104 |
| 4 TCATBAL update | T…01 / T…02 / T…05 | 1/01/0001 50.00→75.50; 1/02/0002 created −10.00; 3/01/0001 900.00→1000.00 |
| 5 empty daily file | separate run | 0 read, nothing posted, accounts unchanged, RC 0 |
| 6 mixed | whole fixture | 3 posted, 7 rejected, RC 4 |
| extra | card inactive / card not in xref / xref acct missing / expired / over-limit + expired | 105 / 100 / 101 / 103 / 103 |

The empty-file run also confirmed an 11-digit account id (`99999999999`) and a negative overpunched balance
(`…123M` → −12.34) survive the INTEGER/STRING output slice. AC "Legacy Comparison" could not be run: there is no
oracle output here.
