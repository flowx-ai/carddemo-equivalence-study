# ACCRUE (interest calculation) — assumptions and decisions

Implementation: FlowX workflow **`accrue_interest_calculation`**
(resourceDefinitionId `<uuid>`, project `<uuid>`, version `<uuid>`).
`Start → Compute and post interest (SCRIPT) → End`. The `A-xx` ids below are referenced in comments in the script.

Sources consulted: `02-processes/process-interest-calculation.md` (the "process page"),
`10-acceptance-criteria/acceptance-criteria-interest-calculation.md` (the "AC page"),
`01-data-model/project-data-model.md` (the "data model"), `ONTOLOGY.md` (and the same ontology,
`ledgerline-accrue`, queried live in the project: it holds nothing beyond the export), `CONTRACT.md`.

| id | Decision | What the wiki says (or does not) |
|---|---|---|
| A-01 | **Formula: monthly interest = category balance × rate ÷ 1200.** The rate is read as an annual percentage (`S9(4)V99`, e.g. `15.00`) and applied for one month. | Process page: `interest = currentBalance × interestRate(groupId)` plus `{{TODO: Extract exact interest formula, rounding, and grouping from LXB002C + RATEGRP.}}`. The literal formula would give 15× the balance for a 15.00 rate, which no ledger posts. ÷1200 (÷100 for percent, ÷12 for monthly) is the interpretation consistent with the rate field's shape (ontology: `RG-INT-RATE` signed decimal(6,2)) and with "Periodic pipeline" / "interest cycle". |
| A-02 | **Rounding: truncate toward zero to 2 decimals** (COBOL `COMPUTE` without `ROUNDED`), per transaction; the account total is the sum of the truncated amounts. Exact integer (BigInt) arithmetic, no floats. | AC scenario 2: `Rounding matches legacy {{TODO: confirm rounding mode}}`. Silent on the mode. CONTRACT.md's flag example `R-INT-TRUNC` hints truncation is the point of interest. |
| A-03 | **Grouping: interest is computed per transaction-category balance record** (LXV026Y), not per account balance. The rate is looked up by `groupId + typeCode + categoryCode`. | Process page says `currentBalance × interestRate(groupId)` but lists TransactionCategoryBalance as Related Data; ontology `RG-GROUP-KEY` = group id + type code + category code, so a rate exists per (group, type, category) — only a category balance supplies type and category. The process-page grouping TODO leaves this open. |
| A-04 | Category balances are processed in **key order (acct id 11 + type 2 + cat 4)**, i.e. the input is sorted first. This order determines transaction-id numbering. | Ontology: BALCAT-FILE is INDEXED, SEQUENTIAL access, key `FD-TXN-CAT-KEY` → a KSDS sequential read returns key order. The wiki is silent on processing order. |
| A-05 | **No rate for the account's group → fall back to group `DEFAULT`** (same type/category). Accounts with a blank group also use this. | Silent. Neither page says what happens when a group/type/category combination has no RATEGRP record. `DEFAULT` fallback is the usual RATEGRP convention; if no `DEFAULT` record exists either, see A-06. |
| A-06 | No rate under the group nor `DEFAULT` → **no interest for that category**, run continues, warning in `accrue_summary.warnings`. | Silent. (The legacy program would most likely abend; a partial-abend output cannot be modelled meaningfully.) |
| A-07 | **Transaction id = ACCRUE parameter (10 chars, `2022071800`) + 6-digit running sequence from 000001**, in A-04 order. | Silent on the id. CONTRACT.md gives the ACCRUE parameter `2022071800` (10 chars) and `tran_id` is 16 chars (data model `TXN-ID X(16)`): 10 + 6. |
| A-08 | Interest transaction content: `type_cd "01"`, `cat_cd 5`, `source "System"`, `desc "Int. for a/c " + 11-digit account id`, `merchant_id 0`, merchant name/city/zip blank, `card_num` from the card link, **`orig_ts` = `proc_ts` = business date `2022-07-18-00.00.00.000000`** (DB2 timestamp format). | Silent on all transaction field values. Ontology: `DB2 Timestamp Format` built from the *current* date/time — a wall-clock value cannot be reproduced, so the business date at midnight is used. Type/category/source/description follow the legacy interest-posting convention, not the wiki. |
| A-09 | **Rate = 0 → no transaction written** for that category. **Balance = 0 with a non-zero rate → a 0.00 transaction is written.** | AC scenario 3: "Account balance 0 → Zero interest" — satisfied either way; whether a zero-amount transaction is written is not stated. Chosen to mirror legacy (skip on zero rate only). |
| A-10 | Card number = the **lowest card number linked to the account** in `cardlink.dat` (alternate-index read by account id). No link → blank `card_num`, warning, run continues. | Ontology: LINK-FILE alternate key `FD-LINK-LACC-ID` (non-unique: an account can have several cards). Which card is used is not stated; an AIX built in ascending prime-key order returns the lowest card first. |
| A-11 | Category balance whose account is not in `ledgacc.dat` → **skipped** (no interest, no transaction), warning. | Silent (legacy would abend on "account not found"). |
| A-12 | **Every account with at least one category balance is posted** (curr_bal += sum of its interest), including the last account in the file. Accounts without category balances are left untouched. Workflow input `postLastAccount: false` switches off posting of the last account if the oracle turns out to skip it. | Process page: "Post Interest — Add interest to balance" for each account in the loop. Implemented as documented. Flagged because the legacy program family this was converted from has a known end-of-file control-break defect that never rewrites the last account. |
| A-13 | **Posting also resets `curr_cyc_credit` and `curr_cyc_debit` to 0** on each posted account (cycle close). Workflow input `resetCycleTotals: false` keeps them. | Silent: the process page only says "Add interest to balance". Data model has the cycle fields; "Periodic pipeline / interest cycle" implies a cycle close. Chosen to mirror legacy LXB002C ("balance update" / `REWRITE LEDGFILE`). |
| A-14 | Interest is **not** posted to `TransactionCategoryBalance`. | Process page Logic: "posted to balance and category balance". CONTRACT.md has no ACCRUE balcat output, and posting it back would double-count on the next cycle, so not done. |
| A-15 | Negative balances accrue (negative) interest; no floor, cap, or active-status filter (inactive accounts still accrue). | Silent on sign and on `activeStatus`. Formula applied as written. |
| A-16 | Fees: none computed. | Silent (process page mentions only interest). |
| A-17 | Input parsing: one record per line, fixed width per copybook offsets below; signed numerics are zoned decimal with the sign overpunched on the last byte (`{A–I` positive, `}J–R` negative); a leading/trailing `+`/`-` or an explicit decimal point is also accepted. Unsigned 9(n) fields are parsed as integers. Output strings have trailing spaces removed; amounts are 2-decimal strings. | Data model type-conversion note (`S9(10)V99 → NUMBER decimal scale 2`) and CONTRACT.md ("layouts as in the copybooks", "Strings may omit trailing spaces"). Overpunch encoding is not stated anywhere. |
| A-18 | Only the files ACCRUE needs are read: `ledgacc.dat`, `cardlink.dat`, `balcat.dat`, `rategrp.dat` (+ run parameters). `daytxn`, `clntrec`, `crdrec`, `txntype`, `txncatg` are ignored. | Ontology: LXB002C `uses_file` BALCAT, ACCOUNT, LINK, TXNFILE (output), RATEGRP only. Per CONTRACT "step isolation", `ledgacc.dat`/`balcat.dat` are the POSTDAY outputs. |

## Record layouts used (offset, length — 0-based)

- **LXV022Y account (300):** acct_id 0,11 · active_status 11,1 · curr_bal 12,12 · credit_limit 24,12 · cash_credit_limit 36,12 · open_date 48,10 · expiration_date 58,10 · reissue_date 68,10 · curr_cyc_credit 78,12 · curr_cyc_debit 90,12 · addr_zip 102,10 · group_id 112,10 · filler.
  (Order and widths from the data model's Account table; the copybook itself was not in the attachment.)
- **LXV024Y card link (50):** card_num 0,16 · cust_id 16,9 · acct_id 25,11 · filler 14 (ontology CRD-LINK-RECORD).
- **LXV026Y category balance (50):** acct_id 0,11 · type_cd 11,2 · cat_cd 13,4 · bal 17,11 `S9(9)V99` (data model + ontology).
- **LXV027Y disclosure group (50):** group_id 0,10 · type_cd 10,2 · cat_cd 12,4 · int_rate 16,6 `S9(4)V99` · filler 28 (ontology Disclosure Group Record; the `decimal(6,2)` read as 6 bytes so the record totals 50).

## Not verified

No input `.dat` files were included in the attachment, so the workflow has only been run on a hand-built
synthetic dataset (3 accounts, 5 category balances, DEFAULT fallback, zero rate, negative balance, unsorted
input, multi-card account), whose results matched hand calculation. It has not been compared with the oracle.
