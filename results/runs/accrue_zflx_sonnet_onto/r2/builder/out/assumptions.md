# ACCRUE (interest-calculation, P-15): assumptions and decisions

Implementation: FlowX workflow `interest-calculation` (project dev-env, resourceDefinitionId
`<uuid>`): START → Load input files → Compute interest and post
transactions → Build outputs → END. Outputs written here by `tools/write_outputs.py`:
`accrue_systxn.json`, `accrue_ledgacc.json`.

Each entry lists what was decided and the wiki statement (or gap) it rests on. "Wiki" means the pages in
the attachment; "ontology" means ONTOLOGY.md / the `ledgerline-accrue` ontology in the FlowX project.

## A-01 The last account in BALCAT order is not rewritten
- Decision: the account rewrite (balance += total interest, cycle credit/debit = 0) happens only when
  the account key changes between consecutive category-balance records. Interest transactions for the
  last account are still written, but that account's record is left as read. The workflow input
  `rewriteLastAccount: true` also rewrites it.
- Rests on: P-15 BR-06 "**At each change of account**: account.currentBalance += totalInterest; …;
  rewrite account". The ontology has WS-FIRST-TIME, WS-LAST-LACC-NUM and 1050-UPDATE-ACCOUNT, i.e. a
  control-break loop. No wiki page or ontology concept says the account is also rewritten at end of
  file. Acceptance criterion 3 ("account current balance increased by total interest") does not
  single out the last account either. The wiki is silent at the boundary, and I kept the literal
  control-break reading. **This is the most uncertain decision.** If the oracle rewrites every
  account, run with `rewriteLastAccount: true`.

## A-02 Interest is truncated to two decimals, toward zero
- Decision: monthlyInterest = trunc((balance × rate) / 1200) at 2 decimals, computed exactly in
  integer minor units (no floating point). Negative results are truncated toward zero
  (−2.0835 → −2.08).
- Rests on: P-15 BR-08 "Rounding follows COBOL COMPUTE default truncation; {{TODO: confirm rounding
  mode (truncate vs ROUNDED)}}". The acceptance criteria say "verify interest rounding to two
  decimals" without naming a mode. A COMPUTE without ROUNDED truncates, and COBOL truncation drops
  magnitude, so it goes toward zero.

## A-03 Negative category balances produce negative interest transactions
- Decision: a credit (negative) balance at a non-zero rate yields a negative interest amount and a
  transaction.
- Rests on: BR-03, which conditions only on rate ≠ 0. The wiki says nothing about the sign of the
  balance.

## A-04 Rate ≠ 0 with zero computed interest still writes a transaction
- Decision: when the rate is non-zero but the truncated interest is 0.00 (e.g. balance 0), a 0.00
  transaction is still written and the suffix advances.
- Rests on: BR-03/BR-04, where the transaction is tied to rate ≠ 0, not to amount ≠ 0. The ontology
  says 1300-COMPUTE-INTEREST always calls 1300-B-WRITE-TX.

## A-05 Transaction id = PARM (10 chars) + 6-digit running suffix
- Decision: tran_id = interestRunDate padded to 10 + suffix zero-padded to 6. The suffix starts at
  000001 and runs across the whole run (not per account). With PARM 2022071800 the first id is
  `2022071800000001`.
- Rests on: BR-05 "run date prefix (PARM, e.g. 2022071800) + running suffix". Ontology TXN-ID =
  PARM-DATE + WS-TRANID-SUFFIX. DT-05 transactionId is String(16), so 16 − 10 = 6 digits. The wiki
  does not give the suffix width or its start value.

## A-06 Transaction description uses the 11-digit zero-padded account id
- Decision: desc = `Accrued int ` + accountId as 11 digits (e.g. `Accrued int 00000000001`).
- Rests on: BR-04 "description `Accrued int <accountId>`". Ontology TXN-DESC = 'Accrued int '
  concatenated with LACC-ID. DT-01 accountId is 9(11), so it keeps its leading zeros.

## A-07 Card number comes from CARDLINK by account; with several cards, the lowest card number wins
- Decision: card_num = the card cross-referenced to the account. If an account has several cards, the
  lowest card number is used. If none is found, card_num is blank and a message is logged.
- Rests on: ontology TXN-CRD-NUM "set to LINK-CRD-NUM", LINK-FILE "alternate record key
  FD-LINK-LACC-ID" and 1110-GET-LINK-DATA. The wiki does not say which card is chosen when there are
  several. A read by a non-unique alternate key returns the first duplicate, assumed to be in
  primary-key (card number) order.

## A-08 Fixed transaction fields
- Decision: type_cd `07`, cat_cd 12, source `Batch`, merchant_id 0, merchant name/city/zip blank.
- Rests on: BR-04, and ontology TXN-MERCHANT-ID "set to 0" and TXN-MERCHANT-NAME/CITY/ZIP "set to
  spaces".

## A-09 Timestamps are the run clock in DB2 format, same value for orig_ts and proc_ts
- Decision: orig_ts = proc_ts = `YYYY-MM-DD-HH.MM.SS.hh0000` (26 chars), taken once per run from the
  clock in UTC. Input `runTimestamp` can pin it.
- Rests on: ontology TXN-ORIG-TS / TXN-PROC-TS "set to DB2-FORMAT-TS" and DB2 Timestamp Format built
  from CURRENT-DATE (year … millisecond + DB2-REST). The wiki does not say which clock, time zone or
  precision. The legacy value is wall-clock dependent anyway, so it cannot match an oracle exactly.

## A-10 Rate lookup: own group, then STANDARD; if both are missing, no interest
- Decision: the key is (account.groupId, typeCode, categoryCode); if absent, (STANDARD, typeCode,
  categoryCode). The rate found (own or STANDARD) decides BR-10. If STANDARD is missing too, that
  balance gets no interest and a message is logged; the run continues.
- Rests on: BR-01, BR-02 and AC 4. The ontology says 1200-A-GET-STANDARD-INT-RATE runs on status '23'
  and abends otherwise. The wiki does not say what happens when STANDARD is also missing. The legacy
  code abends; in FlowX I chose to continue and report.

## A-11 Missing account record: its balances are skipped, the run continues
- Decision: if a category balance names an account that is not in ledgacc, its balances produce no
  interest and a message is logged.
- Rests on: the ontology (1100-GET-LACC-DATA, 9999-ABEND-PROGRAM: the legacy program abends). The wiki
  does not describe this case for the batch.

## A-12 Zero-interest accounts are still rewritten
- Decision: an account whose balances all have rate 0 (e.g. group ZEROAPR) is still rewritten when the
  account changes: its balance stays the same (+0.00) and its cycle credit/debit are reset to 0.
- Rests on: BR-06, which applies "at each change of account" and does not depend on interest being
  posted. AC 5 only requires that no interest transaction is created.

## A-13 Accounts with no category balance are untouched
- Decision: these appear in accrue_ledgacc exactly as read; cycle totals are not reset.
- Rests on: P-15 Purpose "for each account/type/category balance …". The batch is driven by BALCAT,
  and CONTRACT asks for "every account, after interest".

## A-14 Processing order is BALCAT key order
- Decision: category balances are sorted by (account, type, category) before processing, so suffix
  numbering and the control break follow key order whatever order the input file uses.
- Rests on: DT-06 composite key and the ontology "BALCAT-FILE: INDEXED, SEQUENTIAL". CONTRACT allows
  outputs in any order, but the tran_id suffix depends on processing order.

## A-15 No fees
- Decision: no fee is computed or posted.
- Rests on: BR-07 "Fees (1400-COMPUTE-FEES) is an empty stub — no fees charged". AC 7 leaves the
  {{DECISION: implement fees in FlowX or keep stub}} open, and I kept the stub.

## A-16 accrue_systxn holds only this run's interest transactions
- Decision: the output lists the interest transactions written by this run, not the earlier contents
  of the transaction file.
- Rests on: CONTRACT "every interest transaction written". BR-09 (legacy OUTPUT overwrites, FlowX
  appends) concerns the store, not this output.

## A-17 Numeric field decoding
- Decision: amount fields are S9(n)V99 zoned decimals with the sign overpunched on the last byte.
  Both `{ A–I` / `} J–R` (EBCDIC style, as in the wiki's `0150{`) and ASCII `p–y` negatives are
  accepted. Rates are S9(4)V99 (6 bytes) and balances S9(9)V99 (11 bytes). Account offsets follow
  DT-01 order (122 bytes used + 178 FILLER). Lines shorter than the record length are space-padded.
- Rests on: the DT-01/06/07 field lists, DT-07 "seed file stores signed overpunch (0150{ = 15.00)",
  and the ontology Disclosure Group Record (RG-INT-RATE signed decimal(6,2), FILLER 28). The wiki
  example `0150{` is only 5 bytes against the declared 6, so I read it as a shortened example.

## A-18 No PIC-size overflow emulation
- Decision: results are not cut to PIC sizes (WS-MONTHLY-INT, ACCT-CURR-BAL S9(10)V99), so high-order
  digits are never dropped.
- Rests on: the wiki gives no working-storage sizes for these fields. Realistic data stays well within
  range.

## A-19 Group id matching
- Decision: group ids match exactly after trimming trailing spaces (X(10) fields); case-sensitive.
  A blank group id finds no row and falls back to STANDARD.
- Rests on: DT-07 key groupId String(10); the wiki is silent on blanks.

## A-20 Architecture: file-driven workflow, not the datastore/process design
- Decision: one FlowX integration workflow reads the four input files (passed in as text) and returns
  both outputs. It does not use the P-15 process with MESSAGE_EVENT_SEND/RECEIVE pairs, the
  `ledgerline-datastore` NOSQL_DB system or the three `*-data-access` workflows (W-01, W-04, W-05).
- Rests on: CONTRACT (inputs are per-run fixed-width files and outputs are JSON files). The wiki's
  datastore design ({{DECISION: Keep one NOSQL_DB System …}}) has nothing to load the files or dump
  the collections, so building it would not produce the contracted outputs. The business rules are the
  same; the workflow node names mirror the P-15 steps.

## A-21 interestRunDate is a run input, not a Configuration Parameter
- Decision: `interestRunDate` is a required workflow input (the helper defaults it to `2022071800`,
  the CONTRACT ACCRUE parameter). `batchId` is not used.
- Rests on: P-15 "interestRunDate (Configuration Parameter default; override at start)". CONTRACT
  fixes the PARM per run, and no Configuration Parameter exists in the project.

## A-22 The batch-window switch is not checked
- Decision: `RuntimeSwitches.batchWindowOpen` is neither read nor set.
- Rests on: the AC configuration dependencies list it, but end-of-day-batch-chain owns it ("Open/Close
  Batch Window" service tasks) and the chain itself carries a {{TODO}} on it.

## A-23 Input form for step isolation
- Decision: each input is either the fixed-width file text or a JSON list in CONTRACT field naming
  (e.g. `postday_ledgacc.json`, `postday_balcat.json`). `tools/prepare_input.py` prefers `<name>.dat`.
- Rests on: CONTRACT "A candidate for ACCRUE receives the oracle's POSTDAY outputs as its account and
  category-balance inputs". It does not say whether these arrive as `.dat` or as the POSTDAY JSON.
