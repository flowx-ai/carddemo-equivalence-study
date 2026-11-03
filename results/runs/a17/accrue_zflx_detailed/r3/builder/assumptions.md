# ACCRUE (interest-calculation, P-15): assumptions and decisions

Implementation: FlowX workflow **`interest_calculation`** (project app `<uuid>`, WIP version
`<uuid>`, resourceId `<uuid>`, resourceDefinitionId
`<uuid>`).
`Start → Parse input files (SCRIPT) → Compute interest and update accounts (SCRIPT) → End (payload ${result})`.

Each entry gives what I decided and the wiki statement it rests on, or notes that the wiki says nothing.

## A. Architecture

1. **One stateless workflow, not a Main Process with message events and the NOSQL datastore.**
   - Wiki: P-15 is a "Main Process (batch)" calling W-01/W-04/W-05 through SEND/RECEIVE.
   - Wiki: Project Data Model DECISION keeps every store in the `ledgerline-datastore` NOSQL_DB.
   - CONTRACT.md: inputs are files "given per run", and outputs are per-run JSON files.
   - A persistent store would carry state between runs, and the scorer compares one run's files. I kept the P-15 business rules and moved the data access in memory. The GET_DISCLOSURE_GROUP, LIST_CATEGORY_BALANCES and ADD_TRANSACTION calls become in-script lookups.
2. **`interestRunDate` is a workflow input (default `2022071800`), not a Configuration Parameter.**
   - Wiki: "Configuration Parameter default; override at start".
   - CONTRACT.md fixes the ACCRUE parameter to `2022071800`.
   - The MCP tooling can't create configuration parameters, so the default lives in the script.
3. **`RuntimeSwitches.batchWindowOpen` is ignored.**
   - Wiki: AC page "Configuration Dependencies"; the batch-chain DECISION.
   - It only blocks *online* processes during the chain and has no effect on the computation.
4. **Files not read:** `daytxn.dat`, `clntrec.dat`, `crdrec.dat`, `txntype.dat`, `txncatg.dat`. P-15 uses only accounts, category balances, disclosure groups and card xrefs. The batch-chain BR-01 says posting precedes interest, and step isolation already provides the posted state.

## B. Input formats

5. **Byte offsets.**
   - The wiki gives the field order and PICs, not offsets. I assumed contiguous fields in the listed order, with FILLER at the end.
   - Wiki: Account says "FILLER (178 bytes) is dropped", which confirms 122 data bytes out of 300.
   - Resulting layouts:
     - Account: id 0-10, status 11, curr bal 12-23, credit limit 24-35, cash limit 36-47, open 48-57, expiry 58-67, reissue 68-77, cycle credit 78-89, cycle debit 90-101, zip 102-111, group 112-121.
     - Category balance: acct 0-10, type 11-12, cat 13-16, bal 17-27 (S9(9)V99).
     - Disclosure group: group 0-9, type 10-11, cat 12-15, rate 16-21 (S9(4)V99).
     - Card xref: card 0-15, customer 16-24, account 25-35.
6. **Signed numbers use a trailing overpunch.**
   - Wiki: DT-07 says "seed file stores signed overpunch (`0150{` = 15.00)". The AC page says the same.
   - I applied this to every `S9…V99` field: `{`/A–I are positive 0–9, `}`/J–R are negative 0–9.
   - Leading or trailing `+`/`-` signs and explicit decimal points are also accepted.
7. **ACCRUE may receive JSON instead of `.dat` files.**
   - CONTRACT.md: "receives the oracle's POSTDAY outputs as its account and category-balance inputs". It also says "A run may instead leave the oracle's fixed-width dumps".
   - Each input is detected separately: text starting with `[` is parsed as JSON with the contract field names; anything else is fixed-width. For rates, JSON `rate` or `int_rate` is accepted.
8. **Duplicate keys: the first record wins**, as a KSDS load would reject later duplicates. The wiki says nothing about duplicates.

## C. Business rules

9. **Processing order.** Category balances are processed in key order: account, then type, then category (DT-06 composite key; legacy reads the KSDS sequentially). Input line order is not trusted.
10. **Rate lookup (BR-01, BR-02).**
    - Key is `account.groupId + typeCode + categoryCode`. Group and type are compared after trimming trailing spaces, and the category is compared numerically.
    - If no row exists, the lookup retries with group `STANDARD`.
    - **If `STANDARD` also has no row, the rate is 0, so no interest and no transaction.** The wiki doesn't cover this case; the legacy program would probably abend.
11. **Rate 0 means no interest and no transaction** (BR-03 "If rate ≠ 0", BR-10, AC5).
    - The test is on the *rate*, not on the computed amount.
    - So a non-zero rate whose interest truncates to 0.00 (or a zero balance) still writes a transaction with `amt` 0.00.
    - Wiki: AC2 says "created per category balance". The wiki never mentions suppressing zero-amount transactions.
12. **Formula and rounding (BR-03, BR-08).**
    - `interest = balance × rate / 1200`, computed in exact integer cents with BigInt.
    - BR-08 is a TODO ("truncate vs ROUNDED"). I chose **truncation**, because BR-08 states "Rounding follows COBOL COMPUTE default truncation".
    - Negative results truncate **toward zero**, matching COBOL magnitude truncation. Example: −2.005 becomes −2.00, not −2.01.
13. **Interest transaction fields (BR-04).**
    - `type_cd` "07", `cat_cd` 12, `source` "Batch".
    - `desc` is `"Accrued int " + accountId`, where the account id is the **11-digit zero-padded** form (DT-01 accountId is String(11) numeric). Example: `Accrued int 00000000001`.
    - `amt` is the interest.
    - Merchant fields aren't mentioned for this transaction. They are required in DT-05, so I wrote `merchant_id` 0 and empty name, city and zip.
14. **Transaction id (BR-05).**
    - Run-date prefix (`2022071800`) plus a **6-digit zero-padded running suffix starting at 000001**. One counter covers the whole run and increments for every interest transaction written.
    - Width: DT-05 makes `transactionId` 16 characters, and 16 − 10 = 6.
    - The DT-05 "FlowX: sequence generator" is not used; BR-05 and AC6 require ids built from the run date.
15. **`card_num` (P-15 doesn't mention it).**
    - CONTRACT.md lists `cardlink.dat` as an input, and DT-05 makes `cardNumber` a required FK to Card.
    - I take the account's card from CardXref via the `accountId` secondary index (DT-04, "replaces AIX LKACAIX").
    - With several cards I take the lowest card number, which matches alternate-index duplicate order. With none, `card_num` is empty.
16. **`orig_ts` / `proc_ts` (wiki doesn't cover them).**
    - Both are the run timestamp in DB2 format `YYYY-MM-DD-HH.MM.SS.hh0000`. Legacy fields are X(26) (DT-05).
    - The time comes from the FlowX server clock (UTC). It can be pinned with the optional `runTimestamp` input.
    - The values won't match an oracle run made at a different moment.
17. **Account update (BR-06).**
    - `currentBalance += totalInterest`, `currentCycleCredit = 0`, `currentCycleDebit = 0`.
    - This runs at every change of account **and also for the last account in the file**. Wiki: Purpose ("updates the account balance") and AC3.
    - BR-06 says "at each change of account". If the legacy loop rewrote only on a change, the final account would stay unchanged in the oracle. This is flagged.
18. **Every account that has at least one category balance is updated, even with zero total interest.** Its cycle totals are reset (BR-06 is tied to the account change, not to interest; AC5 ZEROAPR).
19. **Accounts with no category balance are output unchanged** (CONTRACT.md says "account fields for every account").
20. **A category balance whose account doesn't exist is skipped**, with no transaction, and noted in `summary.notes`. The wiki doesn't cover this; the legacy program would probably abend.
21. **Fees are not charged** (BR-07 stub). AC7 leaves "implement fees or keep stub" as a DECISION; I kept the stub.
22. **`accrue_systxn.json` holds only this run's interest transactions.** BR-09 (legacy overwrite vs FlowX append) doesn't affect a per-run output. Category balances are not changed by ACCRUE, and the contract defines no balcat output for this step.

## D. Output formatting

23. Amounts are JSON strings with exactly two decimals, for example `"-202.00"`. `acct_id`, `cat_cd` and `merchant_id` are integers. Trailing spaces are trimmed (CONTRACT.md: "Strings may omit trailing spaces").
24. `expiration_date` takes legacy `LACC-EXPIRY-DATE` (DT-01 notes the legacy typo).
