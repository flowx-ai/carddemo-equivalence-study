# ACCRUE (interest-calculation, P-15) — assumptions

FlowX implementation: workflow **`accrue_interest_calculation`**
(resourceId `<uuid>`, resourceDefinitionId `<uuid>`),
project `<uuid>` / version `<uuid>` on dev-env (platform 5.13).

`Start → Parse legacy files → Compute interest per category balance → Format contract outputs → End (${result})`

Each entry below names the decision and the wiki statement it rests on (or the gap it fills).
Items marked **[flag]** are also listed in `flags.json`.

## Architecture and I/O

1. **One integration workflow, not process P-15 plus data-access workflows.** The wiki designs P-15 as a BPMN process
   that calls `reference-data-access`, `account-data-access` and `transaction-data-access` against the
   `ledgerline-datastore` NOSQL_DB. CONTRACT.md gives flat files in and JSON files out per run, and the ACCRUE step
   is isolated (it gets the oracle's POSTDAY outputs). So the steps of P-15 are implemented as SCRIPT nodes in
   one workflow, in the order of the P-15 flow: list balances, get rate, compute, write transaction, update account.
   The workflow takes the file contents as input (`ledgacc`, `balcat`, `rategrp`, `cardlink`, `interestRunDate`).
   `tools/prepare_input.py` builds that body from a run directory, and `tools/split_outputs.py` writes
   `accrue_systxn.json` and `accrue_ledgacc.json` from the END payload.
2. **`interestRunDate` is a workflow input defaulting to `2022071800`.** Wiki: "interestRunDate (Configuration
   Parameter default; override at start)", legacy PARM `2022071800`. No configuration parameter was created; the
   default is in the script.
3. **`batchWindowOpen` / `RuntimeSwitches` and `batchId` are not implemented.** They belong to the
   end-of-day-batch-chain orchestrator (marked DECISION/TODO there) and do not affect this step's outputs.
4. **The inputs read are ledgacc, balcat, rategrp and cardlink.** LXB002C uses BALCAT, ACCOUNT, LINK, TXNFILE and
   RATEGRP (ontology `LXB002C uses_file`). daytxn, clntrec, crdrec, txntype and txncatg are not used by this step.

## Record layouts

5. **Field offsets are derived by laying out the copybook fields in the order the wiki lists them**, with the wiki's
   record lengths as a check:
   - LXV022Y (300): id 9(11) · status X · curr-bal S9(10)V99 · credit-limit · cash-credit-limit · open X(10) ·
     expiry X(10) · reissue X(10) · cyc-credit S9(10)V99 · cyc-debit S9(10)V99 · zip X(10) · group X(10) ·
     FILLER 178 (122 + 178 = 300, matching "Legacy FILLER (178 bytes) is dropped").
   - LXV026Y (50): acct 9(11) · type X(2) · cat 9(4) · bal S9(9)V99 · FILLER 22.
   - LXV027Y (50): group X(10) · type X(2) · cat 9(4) · rate S9(4)V99 · FILLER 28 (ontology "Disclosure Group Record").
   - LXV024Y (50): card X(16) · cust 9(9) · acct 9(11) · FILLER 14 (ontology "CRD-LINK-RECORD").
6. **Signed fields are zoned decimal with the sign overpunched on the last byte.** The wiki states this only for the
   rate ("0150{ = 15.00"). The same decoding is applied to every `S9…V99` field: `{A–I` positive, `}J–R` negative.
   ASCII-style negatives (`p–y`) and explicit `+`/`-` are also accepted, in case the files were produced by
   GnuCOBOL. Lines shorter than the record length are padded with spaces. Blank lines are ignored.

## Processing rules

7. **Category balances are processed in key order (acctId + typeCd + catCd)**, whatever order the input file is in.
   Ontology: BALCAT-FILE is INDEXED, read SEQUENTIAL, record key FD-TXN-CAT-KEY; the wiki says "grouped per account".
8. **Rate key** (BR-01): `account.groupId` (padded to 10) + `typeCd` + `catCd` (4 digits, as stored).
   **Fallback** (BR-02): if there is no row, the same type/category under `STANDARD`.
   **[flag]** If `STANDARD` has no row either, the wiki says nothing. This build uses rate 0 (no interest) and records a
   warning; the legacy program would most likely abend.
9. **Rate 0 means no transaction** (BR-03 "If rate ≠ 0", BR-10, scenario 5 ZEROAPR). The account is still rewritten
   when the account changes, which resets the cycle totals (point 12).
10. **[flag] Interest is truncated toward zero to cents, not rounded** (BR-08 is a TODO: "COBOL COMPUTE default
    truncation … confirm"). `interest = trunc(balance × rate / 1200)`, computed exactly with integers (BigInt), so the
    only loss is the final truncation. This includes negative balances (−12.34 at 15% gives −0.15). The acceptance
    page says "verify interest rounding to two decimals", which this reads as two-decimal precision, not ROUNDED.
11. **Total interest per account is the sum of the already-truncated per-category amounts** (BR-06 adds
    `totalInterest`; BR-03 computes it per category balance).
12. **Account update** (BR-06): when the account id changes, the previous account gets
    `currentBalance += totalInterest`, `currentCycleCredit = 0`, `currentCycleDebit = 0`. This happens for every
    account that had at least one category balance, including accounts whose interest is 0.
13. **[flag] The last account in the balance file is NOT updated.** BR-06 says the rewrite happens "at each change of
    account". The wiki never mentions an end-of-file update, and in the CardDemo-style loop of LXB002C
    (`PERFORM UNTIL END-OF-FILE`) the end-of-file branch that would rewrite the last account is never reached. The
    P-15 diagram ("Account done? → Update Account") could be read the other way. Passing input
    `updateLastAccount: true` applies the update to the last account as well.
14. **Fees** (BR-07, scenario 7 "{{DECISION: implement fees in FlowX or keep stub}}"): the stub is kept, so no fee
    transaction is written.
15. **Accounts with no category balance are not changed.** A category balance whose account is not in ledgacc is
    skipped with a warning; the legacy program would abend on that read error. Duplicate keys: the first record
    wins.

## Interest transaction fields (accrue_systxn)

16. `type_cd "07"`, `cat_cd 12`, `source "Batch"`, `amt` = the category interest. All of these come from BR-04.
17. **`desc` = `"Accrued int "` + the 11-digit, zero-padded account id.** BR-04 writes `Accrued int <accountId>`
    and does not say how the id is formatted. The stored `LACC-ID 9(11)` form is used.
18. **[flag] `tran_id` = PARM (10 characters) + a 6-digit running suffix, starting at `000001`.** One counter runs
    across the whole run and is incremented before each write: `2022071800000001`, `…000002`, and so on. BR-05 gives
    "run date prefix + running suffix". It does not give the suffix width (taken as 16 − 10 from TXN-ID X(16)) or the
    start value.
19. **`card_num`** is the card linked to the account in cardlink (LINK-FILE alternate key FD-LINK-LACC-ID in the
    ontology). If an account has several cards, the first in card-number order is used. If it has none, the field is
    blank and a warning is recorded. The wiki says nothing on either case.
20. **`merchant_id` 0; `merchant_name`, `merchant_city` and `merchant_zip` blank.** The wiki says nothing about them
    for interest transactions.
21. **[flag] `orig_ts` = `proc_ts` = the run's current timestamp in DB2 format `YYYY-MM-DD-HH.MM.SS.hh0000`.** This
    rests on the ontology's "DB2 Timestamp Format … constructed from current date components" in LXB002C. The wiki
    does not define these fields. Input `runTimestamp` can fix the value for reproducible runs.
22. **accrue_systxn holds only the transactions written by this run.** BR-09 (legacy overwrites, FlowX appends) is
    about the store, not this output.

## Output formatting

23. Amounts are strings with exactly two decimals (`"1014.85"`, `"-0.15"`). `acct_id` and `cat_cd`/`merchant_id` are
    integers. Trailing spaces are trimmed. This follows CONTRACT.md.
24. **accrue_ledgacc lists every account in ledgacc, in input order, after interest.** Only `curr_bal`,
    `curr_cyc_credit` and `curr_cyc_debit` can change.
25. Overflow of the legacy PIC sizes (S9(10)V99 balance, S9(9)V99 amount) is not emulated. No high-order truncation
    is applied.

## Verification done

The workflow was run on a synthetic 3-account dataset covering scenario 1 (1000.00 at 18.00 → 15.00), a negative
balance (−12.34 at 15.00 → −0.15), a rate-0 payment category, a ZEROAPR group (no transaction, cycle totals reset),
the STANDARD fallback (1000.00 at 12.00 → 10.00) and a missing card xref. All results were as expected. The real
run inputs were not available in this workspace, so **accrue_systxn.json and accrue_ledgacc.json have not been
produced yet**. Produce them with:

```
python3 -I tools/prepare_input.py <run_dir> body.json --parm 2022071800
# run workflow accrue_interest_calculation with body.json as inputBody (Designer, or zFLX run_workflow)
python3 -I tools/split_outputs.py end_output.json outputs/
```
