# POSTTRAN on FlowX — assumptions and decisions

Implementation: FlowX integration workflow **`posttran_daily_posting`** in project `cd_posttran_zflx_opus_r3`
(resourceDefinitionId `<uuid>`). Node scripts are mirrored in
`flowx/scripts/`. Each entry below says what was decided and which wiki statement (or missing one) it rests on.
Abbreviations: **PROC** = `02-processes/process-transaction-posting.md`, **AC** =
`10-acceptance-criteria/acceptance-criteria-transaction-posting.md`, **DM** = `01-data-model/project-data-model.md`,
**TRG** = `05-triggers/trigger-inventory.md`, **CON** = `CONTRACT.md`.

**How rules were chosen:** where the wiki states a rule, it is implemented as written, even where I believe the legacy
program behaves differently. Each such case is called out and listed in `flags.json`. Where the wiki is silent, or
defers to the legacy source (PROC: *"See CBTRN01-03C source for exact reject reasons"*), I used my knowledge of the
public AWS CardDemo program CBTRN02C as the tie-breaker. I had no legacy source files in this workspace, so those
details are from recollection, not checked against code.

---

## 1. Shape of the implementation

**A1 — An integration workflow, not a scheduled BPMN process with Kafka send/receive.**
PROC describes a Scheduled Process with send/receive nodes on `ai.flowx.in.carddemo.datastore.*` topics backed by
"FlowX Persistence". CON says the inputs are files given per run and the outputs are JSON files. No such datastore
exists, and the GDG→partition mapping is an open TODO (PROC: *"Confirm GDG daily-cycle semantics – map to dated
partitions/snapshots in FlowX Persistence"*). So I built the step as one workflow: the raw file contents and
`businessDate` go in, the four contract outputs come out (OUTPUT slice on End). Nothing is persisted (no NOSQL_DB).
The account and TCATBAL results "persisted" by *Save Account + Balances* are the returned `posttran_acctdata` and
`posttran_tcatbal`.

**A2 — No schedule configured.** TRG: *"cron to be defined per operations window"*, suggested "Nightly". No cron was
given, so the workflow is started per run.

**A3 — The per-transaction loop runs inside one SCRIPT node.** PROC shows a loop with a gateway per transaction and
*"NoOpHandler business rule per transaction in the loop"*. Each posting changes the balance the next transaction is
checked against, so processing must be strictly sequential in file order. In one node this is deterministic and
avoids N graph iterations. The wiki nodes map onto 4 scripts: Load Daily Transactions → Load Account Master Data
(Fetch Account) → Validate and Post Transactions (gateway, Post, Write Reject) → Write Posting Outputs (Save Account
+ Balances). AC *"each transaction processed once"* holds because each record is visited exactly once.

**A4 — Business date is informational.** AC: *"Business date / cycle → Which daily file is posted"*. The run receives
exactly one daily file, so `businessDate` (`2022-07-18`) only selects which file the caller passes. It is echoed in
`summary` and does **not** filter transactions by `orig_ts`. The INTCALC parameter (`2022071800`) belongs to INTCALC
and is not used.

## 2. Validation (rule PostingValidation)

**A5 — Card → account resolution goes through `cardxref.dat`.** PROC: *"Fetch Account — Read owning account"*. DM:
CardXref *"Links card ↔ customer ↔ account"*. A transaction's `card_num` is looked up in the xref, then the xref
`accountId` is looked up in `acctdata`.

**A6 — Reject reason codes and texts** (the wiki gives none; PROC defers to the CBTRN source; AC requires
*"counts match legacy DALYREJS"*):

| reason | reason_desc | origin |
|---|---|---|
| 100 | INVALID CARD NUMBER FOUND | legacy CBTRN02C (card not in xref) |
| 101 | ACCOUNT RECORD NOT FOUND | legacy CBTRN02C (xref account missing from acctdata) |
| 102 | OVERLIMIT TRANSACTION | legacy code/text; condition from the wiki (A9) |
| 103 | TRANSACTION RECEIVED AFTER ACCT EXPIRATION | legacy CBTRN02C (A10) |
| 104 | ACCOUNT NOT ACTIVE | **new** — wiki-only rule (A7); no legacy code exists |
| 105 | CARD NOT ACTIVE | **new** — wiki-only rule (A8); no legacy code exists |

Precedence: 100 → 101 → 104 → 105 → 102/103. The first failure among 100/101/104/105 wins. 102 and 103 are both
evaluated and 103 overwrites 102, mirroring the legacy order of the two checks. A transaction failing both limit and
expiry is reported as 103.

**A7 — "Account must be active" means `active_status == 'Y'`.** PROC: *"account must be active"*. AC scenario 3:
*"Account status N → Rejected"*. The AccountStatus enumeration was not among the pages, so any value other than `Y`
(including blank) counts as inactive. **Possible divergence:** as far as I recall, CBTRN02C does not test account
status, so the legacy DALYREJS may not reject these (flagged).

**A8 — "Card active" means the card record in `carddata.dat` has status `Y`.** PROC: *"card active"*. The CardStatus
enum is not provided. A reject (105) happens only when the card **is found** in carddata and its status is not `Y`.
If carddata is absent, or the card has no carddata record, the check is skipped. The xref has already proven the card
exists, so a missing card master is not treated as inactive. **Possible divergence:** I don't believe CBTRN02C reads
CARDFILE at all (flagged).

**A9 — Credit limit check uses the wiki formula.** PROC: *"transaction must not exceed available credit (creditLimit −
currentBalance)"*. Reject 102 when `amt > credit_limit − curr_bal`. An amount exactly equal to the available credit
posts ("must not exceed"). `curr_bal` is the running balance after this run's earlier postings for the same account.
Negative amounts (payments/credits) always pass. **Known conflict with legacy:** my recollection of CBTRN02C is
`credit_limit >= curr_cyc_credit − curr_cyc_debit + amt`, a cycle-based test that can give different results. This
is the highest-risk decision for *"balances must match legacy exactly"* (flagged).

**A10 — Account-expiration reject (103) is included although the wiki does not mention it.** Basis: PROC's TODO
pointing to the CBTRN source for the exact reject reasons, and AC's requirement that reject counts match legacy
DALYREJS. Condition: `expiration_date < first 10 chars of orig_ts`, compared as `YYYY-MM-DD` strings. A blank
expiration date therefore rejects (flagged, since it goes beyond the wiki text).

**A11 — Transaction type/category codes are not validated** against `trantype.dat` / `trancatg.dat`. The rule lists
only account/credit/card conditions, and DM's ENUM typing is a data-model statement, not a posting rule.
`custdata.dat` and `discgrp.dat` are not read by this step.

## 3. Posting (Post to Balance + TCATBAL, rule UpdateCategoryBalance)

**A12 — Account update.** PROC says valid transactions are posted *"to account balances"* and does not say which
fields. Per legacy: `curr_bal += amt`. If `amt >= 0`, `curr_cyc_credit += amt`; otherwise `curr_cyc_debit += amt`.
The cycle debit therefore accumulates as a negative number, as in the legacy record.

**A13 — Category balance.** PROC: *"add transaction amount to the matching TransactionCategoryBalance (key = account
+ type + category)"*. The account part of the key is the xref account. The wiki is silent on a missing key: a new
TCATBAL record is **created** with the amount (legacy behaviour). Output order is key order; the contract allows any
order.

**A14 — `posttran_transact` lists only the transactions posted in this run**, in input order (CON: *"for every posted
transaction"*). Prior TRANSACT contents are not an input.

**A15 — `proc_ts` of posted transactions is the run's processing timestamp**, in DB2 format
`YYYY-MM-DD-HH.MM.SS.ffffff` (UTC). The wiki is silent; DM: *"processTimestamp — Processing timestamp"*. The
optional input `runTimestamp` pins it so a run is reproducible. Without it, the value differs from the oracle by
construction (flagged). Rejected records keep their input `proc_ts`.

**A16 — Reject record = the daily record unchanged + `reason` + `reason_desc`** (CON field list; PROC *"routes invalid
ones to a rejects output"*).

**A17 — Run summary / return code.** The wiki says nothing about completion status. `summary.returnCode` is 4 when at
least one reject was written and 0 otherwise (legacy convention). The workflow still finishes normally. AC scenario 5
(empty file) → `transactionsRead 0`, nothing posted, every account and TCATBAL returned unchanged.

## 4. File parsing and output format

**A18 — Fixed-width parsing** follows the copybook offsets in CON/DM:

- Signed numerics (`S9(n)V99`) are zoned decimal with the sign overpunched on the last byte (`{A–I` positive, `}J–R`
  negative). The GnuCOBOL ASCII negative form `p–y` and explicit `+`/`-`/decimal-point forms are also accepted.
- Lines shorter than the record length are padded with spaces, since trailing FILLER may have been trimmed.
- Blank lines are skipped.
- A malformed amount aborts the run, like an S0C7 would. A non-numeric `merchant_id` / `cat_cd` becomes `0`.

The wiki's type-conversion note covers types, not error handling.

**A19 — Output values.** Amounts are JSON strings with exactly two decimals (`"25.50"`, `"-10.00"`), allowed by CON.
`acct_id`, `cat_cd`, `merchant_id` and `reason` are integers. Other strings have trailing spaces removed and leading
spaces kept. Dates and timestamps are passed through as text, not re-formatted. The legacy `ACCT-EXPIRAION-DATE` typo
is irrelevant because CON fixes the name `expiration_date`.

**A20 — Duplicate keys.** If a master file repeats a key (card in xref/carddata), the later record wins. Duplicate
transaction ids in the daily file are each processed and posted. The wiki is silent; the legacy KSDS write behaviour
on a duplicate was not reproduced.

**A21 — Outputs are JSON only**; no fixed-width `<name>.txt` dumps are produced (CON allows either).

## 5. Status of this deliverable

The input `.dat` files were not in this workspace, so **no real-run outputs exist here yet**. The workflow was run on
fixtures covering every AC scenario except the legacy comparison (`test/fixtures/`, results in `test/run-fixture/`).
See `README.md` for how to run it on the real files and where the four JSON files go.
