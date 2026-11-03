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

# Candidate I/O contract, layer 1 supplement (statement generation, daily transaction report)

This supplements CONTRACT.md for the two layer 1 steps. Like CONTRACT.md it fixes **formats only**: which files a
run receives, which files it writes, and where each field sits on a printed line. It says nothing about how a
field's value is computed or assembled (which records go into a statement or a total, how a name or an address
line is built, which records are selected). That is behaviour, and it comes from the wiki.

## Inputs (given per run)

Fixed-width text, one record per line, layouts as in the copybooks (CONTRACT.md).

| Step | File | Copybook | Record |
|---|---|---|---|
| statement generation | `transact.dat`: the day's combined transaction file | CVTRA05Y | 350 |
| statement generation | `acctdata.dat`: accounts after the day's posting and interest | CVACT01Y | 300 |
| statement generation | `cardxref.dat` | CVACT03Y | 50 |
| statement generation | `custdata.dat` | CUSTREC | 500 |
| daily transaction report | `transact.dat`: the day's combined transaction file | CVTRA05Y | 350 |
| daily transaction report | `cardxref.dat` | CVACT03Y | 50 |
| daily transaction report | `trantype.dat`, `trancatg.dat` | CVTRA03Y, CVTRA04Y | 60, 60 |

Run parameters: daily transaction report start date `2022-07-01` and end date `2022-07-31` (`YYYY-MM-DD`).

**Step isolation.** Each step receives the oracle's upstream outputs (the combined transaction file and the
accounts after interest), so a result is never penalised for an upstream error.

## Outputs

Each output is a text file of fixed-length lines, one line per printed line, in the order printed. Trailing
spaces may be omitted. Instead of a file, a run may return the same lines as one string (lines joined by `\n`)
or as a list of strings, under the file's name without extension.

| File | Step | Line length |
|---|---|---|
| `creastmt_statements.txt` | statement generation | 80 |
| `creastmt_statements_html.txt` | statement generation | 100 |
| `tranrept_report.txt` | daily transaction report | 133 |

Optional `assumptions.md` and `flags.json` as in CONTRACT.md.

Picture notation in the tables below, as in COBOL: `X(n)` text of n characters, left-aligned, space-padded;
`9(9).99-` nine digits with leading zeros, a point, two decimals and a trailing sign (`-` or a space);
`Z(9).99-` the same with leading zeros printed as spaces; `+ZZZ,ZZZ,ZZZ.ZZ` / `-ZZZ,ZZZ,ZZZ.ZZ` a sign in the first
position (`+`/`-`, or space/`-`), leading zeros and their commas printed as spaces.

### `creastmt_statements.txt`: one statement, lines in this order

| # | Line (positions are 1-based) |
|---|---|
| 0 | `*` × 31, `START OF STATEMENT`, `*` × 31 |
| 1 | 1–75 customer name X(75); 76–80 spaces |
| 2 | 1–50 address line 1 X(50); 51–80 spaces |
| 3 | 1–50 address line 2 X(50); 51–80 spaces |
| 4 | 1–80 address line 3 X(80) |
| 5 | `-` × 80 |
| 6 | 33 spaces, `Basic Details`, spaces to 80 |
| 5 | `-` × 80 |
| 7 | 1–20 `Account ID         :`; 21–40 account ID X(20); spaces to 80 |
| 8 | 1–20 `Current Balance    :`; 21–33 current balance `9(9).99-`; spaces to 80 |
| 9 | 1–20 `FICO Score         :`; 21–40 FICO score X(20); spaces to 80 |
| 10 | `-` × 80 |
| 11 | 30 spaces, `TRANSACTION SUMMARY`, spaces to 80 |
| 12 | `-` × 80 |
| 13 | `Tran ID` padded to 16, `Tran Details` padded to 51, `  Tran Amount` (80 in all) |
| 12 | `-` × 80 |
| 14 | one per transaction: 1–16 transaction ID X(16); 17 space; 18–66 transaction details X(49); 67 `$`; 68–80 amount `Z(9).99-` |
| 12 | `-` × 80 |
| 14A | 1–10 `Total EXP:`; 11–66 spaces; 67 `$`; 68–80 total `Z(9).99-` |
| 15 | `*` × 32, `END OF STATEMENT`, `*` × 32 |

### `creastmt_statements_html.txt`: one statement, lines in this order

Each line is one of the fixed lines below or a fixed line with one field inserted (`{…}`), padded to 100. The
transaction block repeats once per transaction; then the closing block ends the statement.

```
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>HTML Table Layout</title>
</head>
<body style="margin:0px;">
<table  align="center" frame="box" style="width:70%; font:12px Segoe UI,sans-serif;">
<tr>
<td colspan="3" style="padding:0px 5px;background-color:#1d1d96b3;">
<h3>Statement for Account Number: {account ID X(20)}</h3>
</td>
</tr>
<tr>
<td colspan="3" style="padding:0px 5px;background-color:#FFAF33;">
<p style="font-size:16px">Bank of XYZ</p>
<p>410 Terry Ave N</p>
<p>Seattle WA 99999</p>
</td>
</tr>
<tr>
<td colspan="3" style="padding:0px 5px;background-color:#f2f2f2;">
<p style="font-size:16px">{customer name}  </p>
<p>{address line 1}  </p>
<p>{address line 2}  </p>
<p>{address line 3}  </p>
</td>
</tr>
<tr>
<td colspan="3" style="padding:0px 5px;background-color:#33FFD1; text-align:center;">
<p style="font-size:16px">Basic Details</p>
</td>
</tr>
<tr>
<td colspan="3" style="padding:0px 5px;background-color:#f2f2f2;">
<p>Account ID         : {account ID X(20)}</p>
<p>Current Balance    : {current balance 9(9).99-}</p>
<p>FICO Score         : {FICO score X(20)}</p>
</td>
</tr>
<tr>
<td colspan="3" style="padding:0px 5px;background-color:#33FFD1; text-align:center;">
<p style="font-size:16px">Transaction Summary</p>
</td>
</tr>
<tr>
<td style="width:25%; padding:0px 5px; background-color:#33FF5E; text-align:left;">
<p style="font-size:16px">Tran ID</p>
</td>
<td style="width:55%; padding:0px 5px; background-color:#33FF5E; text-align:left;">
<p style="font-size:16px">Tran Details</p>
</td>
<td style="width:20%; padding:0px 5px; background-color:#33FF5E; text-align:right;">
<p style="font-size:16px">Amount</p>
</td>
</tr>
--- transaction block, once per transaction ---
<tr>
<td style="width:25%; padding:0px 5px; background-color:#f2f2f2; text-align:left;">
<p>{transaction ID X(16)}</p>
</td>
<td style="width:55%; padding:0px 5px; background-color:#f2f2f2; text-align:left;">
<p>{transaction details X(49)}</p>
</td>
<td style="width:20%; padding:0px 5px; background-color:#f2f2f2; text-align:right;">
<p>{amount Z(9).99-}</p>
</td>
</tr>
--- closing block ---
<tr>
<td colspan="3" style="padding:0px 5px;background-color:#1d1d96b3;">
<h3>End of Statement</h3>
</td>
</tr>
</table>
</body>
</html>
```

### `tranrept_report.txt`: line types

| Line | Layout (positions are 1-based) |
|---|---|
| report header | 1–38 `DALYREPT`; 39–79 `Daily Transaction Report`; 80–91 `Date Range: `; 92–101 start date; 102–105 ` to `; 106–115 end date |
| blank line | spaces |
| column header | `Transaction ID` padded to 17, `Account ID` to 12, `Transaction Type` to 19, `Tran Category` to 35, `Tran Source` to 14, one space, `        Amount` padded to 16 |
| rule | `-` × 133 |
| detail | 1–16 transaction ID; 17 space; 18–28 account ID; 29 space; 30–31 type code; 32 `-`; 33–47 type description X(15); 48 space; 49–52 category code 9(4); 53 `-`; 54–82 category description X(29); 83 space; 84–93 source X(10); 94–97 spaces; 98–112 amount `-ZZZ,ZZZ,ZZZ.ZZ`; 113–114 spaces |
| page total | 1–11 `Page Total`; 12–97 `.` × 86; 98–112 total `+ZZZ,ZZZ,ZZZ.ZZ` |
| account total | 1–13 `Account Total`; 14–97 `.` × 84; 98–112 total `+ZZZ,ZZZ,ZZZ.ZZ` |
| grand total | 1–11 `Grand Total`; 12–97 `.` × 86; 98–112 total `+ZZZ,ZZZ,ZZZ.ZZ` |

A page starts with the report header, the blank line, the column header and a rule. Each page total and each
account total line is followed by a rule.
