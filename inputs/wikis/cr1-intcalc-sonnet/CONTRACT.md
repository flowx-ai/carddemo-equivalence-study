# Candidate I/O contract

What a migrated implementation must produce so the scorer can compare it with the oracle. The contract fixes
**formats only**. It says nothing about behaviour, so it may be handed to a builder without leaking the answers.

## Inputs (given per run)

The same files the COBOL chain reads, one record per line, fixed width, layouts as in the copybooks:

| File | Copybook | Record |
|---|---|---|
| `dailytran.dat` | CVTRA06Y | 350 |
| `acctdata.dat` | CVACT01Y | 300 |
| `cardxref.dat` | CVACT03Y | 50 |
| `tcatbal.dat` | CVTRA01Y | 50 |
| `discgrp.dat` | CVTRA02Y | 50 |
| `custdata.dat`, `carddata.dat`, `trantype.dat`, `trancatg.dat` | CUSTREC, CVACT02Y, CVTRA03Y, CVTRA04Y | 500, 150, 60, 60 |

Run parameters: business date `2022-07-18`, INTCALC parameter `2022071800`.

**Step isolation.** A candidate for INTCALC receives the oracle's POSTTRAN outputs as its account and
category-balance inputs, so an INTCALC result is never penalised for a POSTTRAN error.

## Outputs

One JSON file per output: a list of objects, in any order. Field names and types are fixed. Strings may omit
trailing spaces. Amounts are JSON strings or numbers holding at most two decimals (`"14.56"`, `-500`).

| File | Step | Fields |
|---|---|---|
| `posttran_transact.json` | POSTTRAN | transaction fields (below) for every posted transaction |
| `posttran_dalyrejs.json` | POSTTRAN | transaction fields + `reason` (int) + `reason_desc` for every rejected transaction |
| `posttran_acctdata.json` | POSTTRAN | account fields for every account, after posting |
| `posttran_tcatbal.json` | POSTTRAN | `acct_id, type_cd, cat_cd, bal` for every category balance, after posting |
| `intcalc_systran.json` | INTCALC | transaction fields for every interest transaction written |
| `intcalc_acctdata.json` | INTCALC | account fields for every account, after interest |

- Transaction fields: `tran_id, type_cd, cat_cd (int), source, desc, amt, merchant_id (int), merchant_name, merchant_city, merchant_zip, card_num, orig_ts, proc_ts`
- Account fields: `acct_id (int), active_status, curr_bal, credit_limit, cash_credit_limit, open_date, expiration_date, reissue_date, curr_cyc_credit, curr_cyc_debit, addr_zip, group_id`

A run may instead leave the oracle's fixed-width dumps (`<name>.txt`). The scorer reads either form.

Optional `flags.json`: the uncertainties the pipeline declared **before** scoring, as
`[{"rule": "R-INT-TRUNC", "source": "<artefact path and line>"}]` or `[{"output": "...", "key": "...", "source": "..."}]`.
See PROTOCOL.md §6 for what counts as a flag.
