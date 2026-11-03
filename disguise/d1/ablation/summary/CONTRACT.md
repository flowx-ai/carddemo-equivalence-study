# Candidate I/O contract

What a migrated implementation must produce so the scorer can compare it with the oracle. The contract fixes
**formats only**. It says nothing about behaviour, so it may be handed to a builder without leaking the answers.

## Inputs (given per run)

The same files the COBOL chain reads, one record per line, fixed width, layouts as in the copybooks:

| File | Copybook | Record |
|---|---|---|
| `daytxn.dat` | LXV031Y | 350 |
| `ledgacc.dat` | LXV022Y | 300 |
| `cardlink.dat` | LXV024Y | 50 |
| `balcat.dat` | LXV026Y | 50 |
| `rategrp.dat` | LXV027Y | 50 |
| `clntrec.dat`, `crdrec.dat`, `txntype.dat`, `txncatg.dat` | LXU021C, LXV023Y, LXV028Y, LXV029Y | 500, 150, 60, 60 |

Run parameters: business date `2022-07-18`, ACCRUE parameter `2022071800`.

**Step isolation.** A candidate for ACCRUE receives the oracle's POSTDAY outputs as its account and
category-balance inputs, so an ACCRUE result is never penalised for a POSTDAY error.

## Outputs

One JSON file per output: a list of objects, in any order. Field names and types are fixed. Strings may omit
trailing spaces. Amounts are JSON strings or numbers holding at most two decimals (`"14.56"`, `-500`).

| File | Step | Fields |
|---|---|---|
| `postday_txnfile.json` | POSTDAY | transaction fields (below) for every posted transaction |
| `postday_dayrej.json` | POSTDAY | transaction fields + `reason` (int) + `reason_desc` for every rejected transaction |
| `postday_ledgacc.json` | POSTDAY | account fields for every account, after posting |
| `postday_balcat.json` | POSTDAY | `acct_id, type_cd, cat_cd, bal` for every category balance, after posting |
| `accrue_systxn.json` | ACCRUE | transaction fields for every interest transaction written |
| `accrue_ledgacc.json` | ACCRUE | account fields for every account, after interest |

- Transaction fields: `tran_id, type_cd, cat_cd (int), source, desc, amt, merchant_id (int), merchant_name, merchant_city, merchant_zip, card_num, orig_ts, proc_ts`
- Account fields: `acct_id (int), active_status, curr_bal, credit_limit, cash_credit_limit, open_date, expiration_date, reissue_date, curr_cyc_credit, curr_cyc_debit, addr_zip, group_id`

A run may instead leave the oracle's fixed-width dumps (`<name>.txt`). The scorer reads either form.

Optional `flags.json`: the uncertainties the pipeline declared **before** scoring, as
`[{"rule": "R-INT-TRUNC", "source": "<artefact path and line>"}]` or `[{"output": "...", "key": "...", "source": "..."}]`.
See PROTOCOL.md §6 for what counts as a flag.
