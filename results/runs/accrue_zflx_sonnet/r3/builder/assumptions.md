# ACCRUE (interest-calculation, P-15): assumptions and decisions

These are the decisions taken where the wiki is uncertain, incomplete or silent. Each one cites the
wiki statement it rests on, or notes that there is none. Wiki pages are abbreviated as follows:
- **P-15**: `02-processes/process-interest-calculation.md`
- **AC**: `10-acceptance-criteria/acceptance-criteria-interest-calculation.md`
- **DM**: `01-data-model/project-data-model.md`
- **W-01**: `04-integrations/workflow-account-data-access.md`
- **W-04**: `04-integrations/workflow-transaction-data-access.md`
- **W-05**: `04-integrations/workflow-reference-data-access.md`
- **CONTRACT**: `CONTRACT.md`

Implementation: FlowX workflow `accrue_interest_calculation` (app `ll_accrue_zflx_sonnet_r3`), with
SCRIPT nodes *Parse legacy inputs*, *Calculate interest (P-15)* and *Map contract outputs*. The sources
are in `flowx/`. `run_accrue.py` packs the input files and unpacks the outputs.

## Inputs and record layouts

- **A-01 Field offsets come from the wiki attribute tables.** The copybooks (LXV022Y, LXV026Y,
  LXV027Y, LXV024Y) were not supplied. Offsets were derived from the attribute order and PICs in DM
  DT-01, DT-06, DT-07 and DT-04, and checked against the record sizes:
  - Account: 11+1+3×12+3×10+2×12+10+10 = 122, plus 178 bytes of FILLER, which makes 300. (DM: "FILLER (178 bytes) is dropped".)
  - Category balance: 11+2+4+11 = 28 bytes, record size 50.
  - Disclosure group: 10+2+4+6 = 22 bytes, record size 50.
  - CardXref: 16+9+11 = 36 bytes, record size 50.

  The trailing bytes are treated as FILLER. DM gives no FILLER for the last three layouts, so that part is assumed.
- **A-02 Signed amounts are zoned decimal with a trailing overpunch sign.** `{`/`A`–`I` mean +0..9
  and `}`/`J`–`R` mean −0..9. The ASCII `p`–`y` negatives and an explicit `+`/`-` are also accepted.
  This rests on DM DT-07 ("seed file stores signed overpunch (`0150{` = 15.00)") and the AC data mapping
  verification. The wiki only states this for the rate. Applying it to every `S9(n)V99` field is an
  assumption.
- **A-03 ACCRUE inputs are the oracle's POSTDAY outputs.** Per the CONTRACT step-isolation rule,
  `ledgacc.dat`/`balcat.dat` are read as given. If only `postday_ledgacc` / `postday_balcat` are present
  (as a `.txt` dump or contract `.json`), the harness converts them back to the fixed-width layout.
  `daytxn.dat`, `clntrec.dat`, `crdrec.dat`, `txntype.dat` and `txncatg.dat` are not used. P-15 names
  only balances, disclosure groups, accounts and transactions.
- **A-04 Category balances are processed in key order** (accountId + typeCode + categoryCode),
  whatever order the file is in. This rests on DM DT-06 (composite key) and DM DT-06 legacy store "VSAM KSDS BALCATF", which is read
  sequentially in key order. The order decides which transaction-id suffix each balance gets.
- **A-05 A duplicate key keeps the first record** (account, rate row, xref). The wiki is silent.

## Calculation

- **A-06 The final account in the run is NOT rewritten.** P-15 BR-06 says "*At each change of
  account*: currentBalance += totalInterest; cycle credit/debit = 0; rewrite". Read literally as a legacy
  control break, the last account has no following change, so it is never rewritten. Its interest
  transactions are still written. This conflicts with AC scenario 3 ("Account current balance increased
  by total interest"), and with the P-15 FlowX design that updates per account group. The literal BR-06
  reading was kept because BR-06 is the rule traced to LXB002C. Pass `updateFinalAccount: true` /
  `--update-final-account` to rewrite every account instead.
- **A-07 Monthly interest is truncated toward zero to cents.** This follows BR-08 ("follows COBOL
  `COMPUTE` default truncation"), which still carries an open TODO (truncate vs ROUNDED). The AC
  "verify interest rounding to two decimals" does not settle the mode. Computation is exact
  integer arithmetic (`balance_cents × rate_hundredths / 120000`). `roundingMode: HALF_UP` is
  available as a switch.
- **A-08 Negative category balances give negative interest**, truncated toward zero (e.g. −100.01 @ 18
  gives −1.50). BR-03 has no sign condition, and the wiki says nothing about credit balances.
- **A-09 Rate lookup** uses BR-01 (`account.groupId + typeCode + categoryCode`) with group ids compared after
  trimming trailing spaces (X(10)). If no row exists, the lookup retries with group `STANDARD` (BR-02, W-05).
  If the `STANDARD` row is missing too, the wiki is silent. The decision is to post no interest for that
  balance and emit a warning, rather than fail the whole run.
- **A-10 "rate ≠ 0" is the only condition for posting** (BR-03). If the rate is non-zero, a transaction is
  written even when the computed amount is 0.00 (e.g. a zero balance). AC scenario 2 says
  "created per category balance". Zero-rate groups such as ZEROAPR, and payment/credit categories,
  produce no transaction (BR-10, AC-5).
- **A-11 Every account with at least one category balance is rewritten**, even when its total
  interest is 0. Its cycle credit/debit are therefore reset (subject to A-06). BR-06 attaches the update to the
  change of account, not to a non-zero interest. Accounts without category balances are left exactly as
  read.
- **A-12 Fees: none.** BR-07 / AC-7 describe `1400-COMPUTE-FEES` as an empty stub. The open DECISION
  ("implement fees in FlowX or keep stub") was resolved as *keep the stub*.
- **A-13 A balance whose account is missing from ledgacc is skipped** (no transaction, warning). The
  wiki is silent. W-01 only describes `found = false`.

## Interest transaction (accrue_systxn)

- **A-14 `tran_id`** is the 10-character run-date PARM followed by a 6-digit suffix: `000001`, `000002`, …,
  restarting at 1 each run, giving 16 characters. This rests on BR-05 ("run date prefix (`PARM`) + running
  suffix"), AC-6 and DM DT-05 (String(16)). The suffix width and start value are not stated. The
  W-04 / DT-05 "sequence generator" was not used, because BR-05 defines the interest ids explicitly.
- **A-15 Fixed fields** come from BR-04: `type_cd` "07", `cat_cd` 12, `source` "Batch". `desc` is
  "Accrued int " followed by the account id as its 11-digit zero-padded legacy value (e.g.
  `Accrued int 00000000001`). BR-04 writes `<accountId>` but does not say whether it is padded.
- **A-16 `card_num`** is the card of the first CARDLINK record for the account, in file order (card-number
  key order). BR-04 does not mention a card. W-01 lists LXB002C among the programs doing
  "CARDLINK alternate-index reads". If there is no xref, `card_num` is blank and a warning is emitted.
- **A-17 Merchant fields** are `merchant_id` 0 and blank name/city/zip. The wiki is silent, and an interest
  posting has no merchant.
- **A-18 `orig_ts` = `proc_ts`** is the time of the run, formatted `YYYY-MM-DD-HH.MM.SS.ff0000` (26 chars,
  DM DT-05 X(26)). The wiki is silent on the source of the timestamp. It can be overridden with
  `runTimestamp` for reproducible runs.
- **A-19 BR-09 (legacy overwrites, FlowX appends)**: `accrue_systxn.json` lists only the transactions
  written by this run, which is what CONTRACT asks for ("every interest transaction written").

## Accounts (accrue_ledgacc)

- **A-20 All input accounts are emitted**, in input order. Updated accounts carry the new balance and
  zeroed cycle totals. CONTRACT: "account fields for every account, after interest".
- **A-21 No overflow/size checks** on `S9(10)V99` after adding interest. The wiki is silent.

## Platform / scope

- **A-22 No persistence or process layer.** The wiki routes all data access through
  `ledgerline-datastore` (NOSQL_DB) via W-01/W-04/W-05, driven by process P-15 message events. Under the
  CONTRACT's file-based step isolation, the calculation runs as one integration workflow over the run's
  files. No collections are read or written, and the `batchWindowOpen` runtime switch (AC configuration
  dependency) is not checked.
- **A-23 `interestRunDate`** is a workflow input (default `2022071800`, the CONTRACT's ACCRUE parameter).
  P-15 lists it as a Configuration Parameter, but no FlowX configuration parameter was created.
