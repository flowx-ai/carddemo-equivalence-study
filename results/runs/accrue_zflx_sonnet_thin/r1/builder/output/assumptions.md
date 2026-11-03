# ACCRUE (interest calculation) — assumptions and decisions

Implementation: FlowX workflow `accrue_interest_calculation` (resourceDefinitionId `<uuid>`)
in project `<uuid>` / WIP version `<uuid>`: START → SCRIPT "Compute interest (LXB002C)" → END.
The script body is `flowx/accrue_script.js`; `run_accrue.mjs` runs that same text over the input files.

Each entry: what was decided, and the wiki statement (or gap) it rests on.

## Architecture

**A1. One workflow over the batch files, no FlowX Database / message-event chain.**
The wiki (P-15 Data Mapping, W-01/W-04/W-05, project-data-model DECISION) describes a process that reads and writes a
`ledgerline-datastore` NOSQL_DB through three data-access workflows. CONTRACT.md instead fixes per-run input *files* and
JSON output *files*, and says nothing about a persistent store. A persistent store would also keep state between scored
runs. So the behaviour of P-15 (BR-01…BR-10) is implemented in one integration workflow whose inputs are the file
contents and whose outputs are the two contract lists. It can be called from the end-of-day-batch-chain (P-19) as a
subworkflow, or from a process via SEND/RECEIVE, with the same contract.

**A2. Run parameter.** `interestRunDate` is a workflow input defaulting to `2022071800` (CONTRACT.md run parameters;
P-15 "Configuration Parameter default; override at start"). `batchId` (P-15 start data) is not used by any rule and is
not an input.

**A3. `batchWindowOpen` / `RuntimeSwitches` is not implemented.** Acceptance criteria list it as a configuration
dependency, but blocking online processes is the end-of-day chain's job and P-19 itself carries the open TODO
"confirm with business whether online access must be blocked".

## Inputs

**A4. Record layouts.** The copybooks are not in the attachment; byte offsets were derived from the attribute lists in
the project data model (and confirmed by the ontology records for LXV022Y/LXV024Y/LXV026Y/LXV027Y):
- ledgacc (LXV022Y, 300): id 9(11), status X(1), curr-bal, credit-limit, cash-credit-limit S9(10)V99 (12 each),
  open/expiry/reissue dates X(10), cyc-credit, cyc-debit S9(10)V99, zip X(10), group X(10), FILLER (DT-01: "FILLER (178
  bytes) is dropped", which leaves exactly 122 used bytes in this order).
- balcat (LXV026Y, 50): acct 9(11), type X(2), cat 9(4), bal S9(9)V99 (11).
- rategrp (LXV027Y, 50): group X(10), type X(2), cat 9(4), rate S9(4)V99 (6), FILLER X(28) (ontology "Disclosure Group Record").
- cardlink (LXV024Y, 50): card X(16), client 9(9), acct 9(11), FILLER X(14) (ontology CRD-LINK-RECORD).

**A5. Signed numbers are zoned decimal with the sign overpunched on the last byte** (`{`/`A`–`I` positive, `}`/`J`–`R`
negative). The wiki states this only for the rate ("signed overpunch, `0150{` = 15.00"); the same COBOL `S9…V99` DISPLAY
picture is assumed for every signed amount. (The wiki example has 5 characters for a 6-byte field; it is read as
"last byte `{` = digit 0, positive".) Plain digits and explicit decimals (`"14.56"`) are also accepted. A field that is
neither raises an error and fails the run (no silent zero).

**A6. Step isolation.** CONTRACT.md: ACCRUE receives the oracle's POSTDAY outputs as its account and category-balance
inputs. The runner therefore prefers `postday_ledgacc.json` / `postday_balcat.json` (contract JSON form), then
`postday_*.txt` (assumed to be fixed-width in the same copybook layout), then `ledgacc.dat` / `balcat.dat`.
`daytxn.dat`, `clntrec.dat`, `crdrec.dat`, `txntype.dat`, `txncatg.dat` are not read: no P-15 rule uses them.

## Processing order and lookup

**A7. Balances are processed in key order (account, type, category)**, whatever order the file has. Not stated in the
wiki; the ontology describes BALCAT-FILE as an INDEXED file read SEQUENTIALLY by FD-TXN-CAT-KEY (= acct+type+cat), i.e.
key order. This order fixes the transaction-id suffixes.

**A8. Rate lookup** (BR-01/BR-02): exact match on group id (trailing spaces ignored) + type code + category code; if no
row, the `STANDARD` row for the same type + category. An account whose group id is blank or unknown therefore uses
STANDARD.

**A9. No rate even under STANDARD → no interest for that balance, warning in `accrue_summary.json`, run continues.**
The wiki is silent (legacy would most likely abend on a non-23 status / second miss). Chosen so one bad reference row
does not stop the monthly batch.

**A10. Category balance whose account is not in ledgacc → skipped with a warning.** Wiki silent; there is no account
to take the group from or to update.

**A11. Card number of the interest transaction = card from cardlink by account id; with several cards, the lowest card
number; none → empty.** The wiki does not say where the interest transaction's card number comes from, but DT-05
makes `cardNumber` required and the ontology shows LXB002C uses LINK-FILE with alternate key FD-LINK-LACC-ID (account).
Lowest card number = VSAM AIX order of duplicate keys (prime-key order).

**A12. Inactive accounts are not filtered** — the wiki applies the rules to "each account/type/category balance"
without an active-status condition.

## Computation

**A13. Rounding = truncation toward zero at 2 decimals** (BR-08: "COBOL COMPUTE default truncation"; the TODO asks
whether ROUNDED was intended and the acceptance criteria say "verify interest rounding to two decimals"). Implemented
exactly in integer cents: `cents = trunc(balanceCents × rateHundredths / 120000)`. Flagged as uncertain (R-INT-TRUNC).

**A14. Each category's interest is truncated separately; the account total is the sum of the truncated amounts** (BR-03
computes `monthlyInterest` per balance; BR-06 adds `totalInterest`).

**A15. A transaction is written whenever the rate is non-zero, even if the computed interest is 0.00** (BR-03
conditions only on the rate; BR-10 / scenario 5 tie "no interest transaction" to a zero rate).

**A16. Negative (credit) balances give negative interest** — the formula is applied as written; the wiki has no sign
rule.

**A17. Fees: none** (BR-07 empty stub; scenario 7 DECISION left open — kept as stub, which matches legacy).

## Transactions (`accrue_systxn.json`)

**A18. tran_id = PARM (10 chars) + 6-digit zero-padded running suffix starting at 000001 per run, across all
accounts** (BR-05). The suffix width is not stated; 6 digits makes the 16 characters of TXN-ID X(16) (DT-05).

**A19. Fields:** type_cd `"07"`, cat_cd `12`, source `"Batch"`, desc `"Accrued int " + 11-digit account id` with leading
zeros (BR-04; accountId is "String(11) numeric" in DT-01), amt = the interest. merchant_id `0` and empty merchant
name/city/zip — the wiki is silent; an interest posting has no merchant.

**A20. orig_ts = proc_ts = run timestamp in DB2 format `YYYY-MM-DD-HH.MM.SS.hh0000`** (26 chars, DT-05 X(26)). Wiki
silent on the value; the ontology's "DB2 Timestamp Format" (LXB002C-20) shows legacy builds it from the current date
and time. Not deterministic; `--ts` / `processTs` fixes it for repeatable runs.

**A21. Only the transactions written by this run are output** (contract: "every interest transaction written"; BR-09's
overwrite-vs-append difference only matters for an existing transaction file, which this step does not receive).

## Accounts (`accrue_ledgacc.json`)

**A22. Every account with at least one category balance is rewritten**: `curr_bal += totalInterest` (possibly 0) and
both cycle totals reset to 0 — including accounts whose rates are all zero (BR-06 "at each change of account …
rewrite account"; scenario 3). The last account is rewritten at end of file too (wiki silent on end-of-file; otherwise
the last account would lose its interest). Accounts without any category balance are output unchanged.

**A23. Output lists every account in input order**; acct_id as integer, amounts as strings with 2 decimals, text fields
without trailing spaces (CONTRACT.md).

## Verification done

Run in FlowX (instance `6ade4c644b977556e600416b`) on synthetic records: 1000.00 @ 18.00 → 15.00 (scenario 1);
543.24 @ 25.00 → 11.31 (truncated from 11.3175); NOGROUP → STANDARD 15.00; ZEROAPR and type-02 rate 0 → no
transaction; accounts updated and cycle totals reset; unknown account warned; lowest card picked. The real input files
were not part of the attachment, so no run on them was possible here.
