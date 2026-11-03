# POSTTRAN on FlowX: assumptions and decisions

Implementation: FlowX workflow `posttran_daily_posting` in project `cd_posttran_zflx_opus_r2`
(resourceDefinitionId `<uuid>`). Wiki pages cited:

- **PROC**: `02-processes/process-transaction-posting.md`
- **AC**: `10-acceptance-criteria/acceptance-criteria-transaction-posting.md`
- **DM**: `01-data-model/project-data-model.md`
- **TRG**: `05-triggers/trigger-inventory.md`
- **CONTRACT**: `CONTRACT.md`

Each entry gives the decision, then the wiki statement it rests on (or the gap it fills).

## A. Validation rules (PostingValidation)

**A1. The default rule set is the wiki's.** The rules: the account must be active; the card must be
active; the amount must not exceed `creditLimit - currentBalance`. All three apply under
`ruleProfile = WIKI`, which is the default.
*Rests on:* PROC, Rule PostingValidation: "account must be active; transaction must not exceed
available credit (`creditLimit - currentBalance`); card active". AC scenarios 2 and 3 say the same.

**A2. An optional `LEGACY` profile is also built in, but it is not the default.** The wiki
contradicts itself. Its rule summary is explicit, but it also says "balances must match the legacy
batch exactly" (AC) and "See CBTRN01-03C source for exact reject reasons" (PROC TODO). From my
recollection of the public AWS CardDemo `CBTRN02C` (not checked against the source in this build),
the legacy program differs from the wiki summary in four ways:
- It does **not** check account or card active status.
- It tests over-limit as `creditLimit >= currCycCredit - currCycDebit + amount`, not against
  `currentBalance`.
- It rejects a transaction whose origination date is after the account expiration date (code 103).
- When both 102 and 103 apply, the later check (103) wins.

`ruleProfile = LEGACY` reproduces that recollection. I added it so that whoever owns the PROC TODO
can switch modes without a rebuild. Results produced under the default profile follow the wiki, as
instructed.

**A3. A transaction is joined to its account through the card cross-reference.** The path is card
number → `cardxref.dat` → account id → `acctdata.dat`.
*Rests on:* PROC node 4 "Fetch Account — Read owning account". The wiki does not say how.
CardXref ("Links card ↔ customer ↔ account", DM) is the only card→account link that CONTRACT
supplies among the inputs.

**A4. Reject reason codes and texts.** The wiki gives none (PROC: "See CBTRN01-03C source for exact
reject reasons" is an open TODO). Codes used:

| reason | reason_desc | when | origin |
|---|---|---|---|
| 100 | INVALID CARD NUMBER FOUND | card not in cardxref | legacy CBTRN02C (recalled) |
| 101 | ACCOUNT RECORD NOT FOUND | xref account not in acctdata | legacy CBTRN02C (recalled) |
| 102 | OVERLIMIT TRANSACTION | over available credit | legacy CBTRN02C (recalled) |
| 103 | TRANSACTION RECEIVED AFTER ACCT EXPIRATION | LEGACY profile only | legacy CBTRN02C (recalled) |
| 104 | ACCOUNT NOT ACTIVE | wiki rule "account must be active" | **invented**: no legacy code exists |
| 105 | CARD NOT ACTIVE | wiki rule "card active" | **invented**: no legacy code exists |

**A5. Order of checks (WIKI profile), first failure wins.** The order is 100, 101, 104, 105, 102.
Lookup failures have to come first, because nothing else can be evaluated without the record.
Among the rules the wiki lists, I used the wiki's own order: active account, then credit, then
card. I moved the card check ahead of the credit check so that a transaction on a blocked card
reports the card problem.
*Rests on:* the wiki gives no precedence.

**A6. "Active" means status `Y`.** Anything else (`N`, blank) counts as inactive. This applies to
both `ACCT-ACTIVE-STATUS` and `CARD-ACTIVE-STATUS`.
*Rests on:* AC scenario 3 "Account status N → Rejected". The AccountStatus/CardStatus enumeration
pages were not supplied.

**A7. A card that is in cardxref but missing from carddata is not rejected.** The card-active check
only runs when a card record exists. If `carddata.dat` is not supplied at all, the check is skipped.
*Rests on:* the wiki is silent. Legacy validation is driven by the xref, and rejecting on a missing
record would invent a new failure mode.

**A8. The over-limit boundary is inclusive.** A transaction is accepted when `amount <= creditLimit
- currentBalance`, so spending exactly the available credit is allowed.
*Rests on:* the wiki says "must not exceed".

**A9. Credits (negative amounts) go through the same checks.** A negative amount can never exceed
available credit, so in practice it only fails the lookup and status checks.
*Rests on:* the wiki is silent about payments and credits.

## B. Posting

**B1. Transactions are processed one at a time, in file order.** Each posting updates the balances
that the next transaction is validated against.
*Rests on:* PROC flow "For each transaction … Next transaction". This matches a sequential batch.

**B2. Account update.** `currentBalance += amount`. If `amount >= 0`, `currentCycleCredit +=
amount`; otherwise `currentCycleDebit += amount`, so the debit stays a negative running sum.
*Rests on:* PROC says only "posts valid transactions to account balances". The split between
cycle credit and debit is taken from CBTRN02C (recalled). The output contract carries
`curr_cyc_credit`/`curr_cyc_debit`, so the fields had to be maintained somehow.

**B3. Category balance (UpdateCategoryBalance).** The amount is added to the TCATBAL record keyed by
the xref account id, the transaction type and the category. If no such record exists, one is
created with balance = amount.
*Rests on:* PROC Rule UpdateCategoryBalance ("add transaction amount to the matching …"). The wiki
does not say what happens when there is no match; creating the record follows CBTRN02C (recalled)
and AC scenario 4 ("TCATBAL … increased").

**B4. `proc_ts` of a posted transaction is the processing time.** The format is the DB2 style
`YYYY-MM-DD-HH.MM.SS.hh0000`, taken from the FlowX script runtime clock, which is server time
(appears to be UTC). It can be pinned with the `procTimestamp` input for reproducible runs.
*Rests on:* DM only says `processTimestamp` is a "Processing timestamp" `X(26)`. The format follows
CBTRN02C's `Z-GET-DB2-FORMAT-TIMESTAMP` (recalled). It cannot match the oracle byte for byte,
because it is a wall-clock value.

**B5. Rejected transactions keep the daily record's own `proc_ts`.** In the daily file it is usually
blank, so it comes out as `""`.
*Rests on:* the wiki is silent. DALYREJS holds the input record plus the reason.

**B6. Business date does not filter transactions.** `businessDate` is carried into the run summary.
Every record in the supplied `dailytran.dat` is posted or rejected, whatever its `orig_ts` date.
*Rests on:* AC Configuration "Business date / cycle → Which daily file is posted". The business date
selects the file and is not a record filter. The GDG/dated-partition semantics are an open TODO in
PROC.

**B7. Duplicate keys: the first record wins.** This applies to a duplicate account id, card number
or TCATBAL key in an input file. The later duplicates are ignored.
*Rests on:* the wiki is silent. The legacy files are KSDS, keyed by these fields, so they cannot
hold duplicates.

## C. Inputs and outputs

**C1. File parsing.** Each file is read as one record per line, with fixed-width columns at the
copybook offsets (CVTRA06Y, CVACT01Y, CVACT03Y, CVTRA01Y, CVACT02Y). Short lines are right-padded
with spaces, and blank lines are skipped.
*Rests on:* CONTRACT Inputs ("one record per line, fixed width, layouts as in the copybooks"). The
copybook offsets are not in the wiki. They are the standard CardDemo layouts; DM gives the field
lists and PICs, which agree with them.

**C2. Signed amounts.** Amounts are signed zoned decimals with an implied 2 decimals. The parser
accepts:
- plain digits;
- an overpunched last byte (`{`/`A`–`I` positive, `}`/`J`–`R` negative, `p`–`y` negative in the
  ASCII convention);
- a separate leading or trailing sign;
- an explicit decimal point.

All arithmetic is in integer cents.
*Rests on:* DM "S9(n)V99 → NUMBER (decimal, scale 2)". The ASCII encoding of the sign is not stated
anywhere.

**C3. Non-numeric integer fields become 0.** This applies to `cat_cd`, `merchant_id` and `acct_id`
when the field is blank or not numeric.
*Rests on:* CONTRACT fixes these as int but does not say what to do with an invalid value.

**C4. Output files.** There are four lists, as CONTRACT names them for POSTTRAN:
- `posttran_transact.json`: posted transactions, in input order.
- `posttran_dalyrejs.json`: rejected transactions plus `reason`/`reason_desc`, in input order.
- `posttran_acctdata.json`: every account after posting, in input order.
- `posttran_tcatbal.json`: every category balance after posting. Existing keys come first in input
  order, then keys created during the run.

Amounts are JSON strings with exactly two decimals (`"-50.00"`). Strings are right-trimmed.
*Rests on:* CONTRACT Outputs.

**C5. Only `dailytran`, `acctdata`, `cardxref`, `tcatbal` and `carddata` are read.** CONTRACT lists
`custdata.dat`, `trantype.dat`, `trancatg.dat` and `discgrp.dat` as run inputs, but no POSTTRAN rule
in the wiki uses them. In particular, type and category codes are not validated against
`trantype`/`trancatg`.
*Rests on:* PROC lists Related Data as Transaction, Account and TransactionCategoryBalance only.

## D. Platform mapping

**D1. Built as one FlowX integration workflow, not a BPMN process.** The flow is: START → Load
Daily Transactions → FORK "Any daily transactions?" → Post Transactions → Build Output Files → END.
The wiki's process design has a per-transaction loop with Kafka send/receive nodes and a gateway.
Here, "Fetch Account", "Account Active & Within Limit?", "Post to Balance + TCATBAL" and "Write
Reject" are implemented in the Post Transactions script, one pass per transaction.
*Rests on:* PROC says "Scheduled Process (orchestration)". The node shapes are a draft design
(Status: Draft). The contract is file in, file out per run. A process with a message round-trip per
transaction adds nothing to that and is slow for a batch.

**D2. Nothing is persisted to FlowX Persistence or a FlowX Database.** "Save Account + Balances"
returns the updated account and TCATBAL sets as outputs instead.
*Rests on:* PROC Integration Touchpoints `ai.flowx.in.carddemo.datastore.postbatch`. CONTRACT
defines a stateless per-run file contract, and the GDG/partition design is still a TODO.

**D3. No scheduled trigger is attached.** The workflow runs on demand with the files as input.
*Rests on:* TRG "Nightly, cron to be defined per operations window".

**D4. COMBTRAN is not modelled.** That job merges and sorts the posted transactions into the
transaction master. `posttran_transact.json` lists the transactions posted in this run.
*Rests on:* CONTRACT "transaction fields for every posted transaction".
