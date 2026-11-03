# CardDemo batch steps on FlowX

Each step is a FlowX workflow made of START → SCRIPT → END. The script is the matching `*.js` file in this folder, with `lib.js` placed in front of it.

## How to run a step

Run the workflow (Designer "Run", or `run_workflow`) with:

```json
{ "files": { "dailytran.dat": "<line1>\n<line2>...", "acctdata.dat": ["<line>", "..."] } }
```

- Each file can be one string with lines separated by `\n`, or a list of lines.
- Instead of `files`, you can pass a top-level key with dots replaced by underscores, e.g. `"acctdata_dat": "..."`.
- An absent file counts as missing: the step ends with `<step>_rc = "12"`.
- An empty file (`""` or `[]`) is valid and contains no records.

Outputs are top-level keys on the END node, named after the contract file without its extension. For example, `posttran_transact.json` is output key `posttran_transact`. JSON files are lists of objects; `.txt` files are lists of lines.

| Step | Workflow (resourceId) | Inputs | Extra input | Outputs |
|---|---|---|---|---|
| POSTTRAN | batch_posttran `<uuid>` | dailytran, acctdata, cardxref, tcatbal (optional) | — | posttran_transact, posttran_dalyrejs, posttran_acctdata, posttran_tcatbal, posttran_rc (4 if rejects) |
| INTCALC | batch_intcalc `<uuid>` | tcatbal, acctdata, cardxref, discgrp | `parm` (default 2022071800) | intcalc_systran, intcalc_acctdata, intcalc_sysout |
| COMBTRAN | batch_combtran `<uuid>` | transact, systran | — | combtran_transact, combtran_sysout |
| CREASTMT | batch_creastmt `<uuid>` | transact, cardxref, acctdata, custdata | — | creastmt_statements, creastmt_statements_html |
| TRANREPT | batch_tranrept `<uuid>` | transact, cardxref, trantype, trancatg | `start_date`, `end_date` (default 2022-07-01 / 2022-07-31) | tranrept_report, tranrept_sysout |
| CBACT01C / 02C / 03C, CBCUS01C, CBTRN01C | batch_readutils `<uuid>` | acctdata / carddata / cardxref / custdata / dailytran (+cardxref, acctdata) | `step` (one program; omit to run all) | acctext_out, acctext_array, acctext_vb, acctext_sysout, cardprint_sysout, xrefprint_sysout, custprint_sysout, dailycheck_sysout |
| CBEXPORT / CBIMPORT | batch_export_import `<uuid>` | export: custdata, acctdata, cardxref, transact, carddata; import: `export.json` (JSON string or list) | `step` = CBEXPORT or CBIMPORT | export, export_sysout / import_customers, import_accounts, import_card_xref, import_transactions, import_cards, import_errors, import_sysout |

Timestamps come from the config parameter `RUN_TIMESTAMP`. Design decisions are recorded in `../assumptions.md`.
