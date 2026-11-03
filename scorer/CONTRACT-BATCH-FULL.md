<!-- DRAFT for the full-application study. Not frozen. Supplements scorer/CONTRACT.md and scorer/CONTRACT-L1.md (kept as they are) for the seven added batch programs. This comment does not render in the bundle. -->
# Batch data contract, added steps

This supplements the batch contract for seven more steps. It fixes **formats only**: which files a run receives, which files it writes, and field names and types. It says nothing about how a value is computed, which records are selected or how often anything is written or printed. That is behaviour, and it comes from the wiki.

Run parameter: the batch date and time, as `RUN_TIMESTAMP` (Data contract, Run date): `2022-07-18 10:00:00`.

## Inputs (given per run)

Fixed-width text, one record per line, layouts as in the copybooks, named as in the batch contract: `acctdata.dat`, `carddata.dat`, `custdata.dat`, `cardxref.dat`, `transact.dat`, `dailytran.dat`. A missing input is given as an absent file. `export.json` is a list of export records as below.

## Outputs

One JSON file per output: a list of objects in output order. Strings may omit trailing spaces. Amounts are JSON strings or numbers with at most two decimals. A value the step leaves unset is `null`. Any line a step prints to its log goes to `<step>_sysout.txt`, one line per printed line, in order. A step that stops on an error writes its return code to `<step>_rc.txt`; a step that ends normally may omit this file.

| Step | Legacy program | Output files |
|---|---|---|
| Account extract | CBACT01C | `acctext_out.json`, `acctext_array.json`, `acctext_vb.json`, `acctext_sysout.txt` |
| Card file print | CBACT02C | `cardprint_sysout.txt` |
| Cross-reference print | CBACT03C | `xrefprint_sysout.txt` |
| Customer print | CBCUS01C | `custprint_sysout.txt` |
| Daily transaction check | CBTRN01C | `dailycheck_sysout.txt` |
| Export | CBEXPORT | `export.json`, `export_sysout.txt` |
| Import | CBIMPORT | `import_customers.json`, `import_accounts.json`, `import_card_xref.json`, `import_transactions.json`, `import_cards.json`, `import_errors.json`, `import_sysout.txt` |

Fields (type in brackets when it is not a string; the same types as the seed files):

- **`acctext_out`:** the fields of an account record, without `addr_zip`.
- **`acctext_array`:** `acct_id (int)`, then `curr_bal_1`, `curr_cyc_debit_1` to `curr_bal_5`, `curr_cyc_debit_5` (amounts).
- **`acctext_vb`:** either `acct_id (int), active_status` or `acct_id (int), curr_bal, credit_limit, reissue_yyyy`.
- **`export`:** `rec_type, seq (int), branch_id, region_code`, then the fields of the record the type holds: the customer, account, cross-reference, transaction or card fields of the seed files. `timestamp` as the step writes it.
- **`import_*`:** the seed file's fields of that record type.
- **`import_errors`:** `rec_type, seq (int), message`.
- **`*_sysout`:** a printed record is the fixed-width line of the input record. Other lines are free text.
