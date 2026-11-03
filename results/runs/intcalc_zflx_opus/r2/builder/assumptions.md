# INTCALC (interest calculation): assumptions and decisions

Implementation: FlowX workflow `intcalc_batch` in project `cd_intcalc_zflx_opus_r2`
(resourceDefinitionId `<uuid>`):
`Start → Load inputs → Compute interest → Post interest to accounts → End`.
Script sources: `flowx/scripts/01_load_inputs.js`, `02_compute_interest.js`, `03_post_interest.js`.

## How the decisions were made

The wiki pages are thin on this step. The formula, rounding and grouping are left as explicit TODOs,
and the wiki says nothing about the interest transactions the contract requires. So I followed this rule:

1. Where the wiki states something and does not mark it uncertain, follow the wiki.
2. Where the wiki marks it as a TODO, or says nothing, follow the legacy program the wiki names
   (`CBACT04C`, the public AWS CardDemo source, Apache-2.0). Acceptance criteria 1, 2 and the
   Legacy Comparison table require results "identical per account" to the legacy output.

**Caveat:** I took the legacy behaviour from my recollection of the public CardDemo source.
I did not read the source in this session. Every item tagged *(legacy recollection)* rests on that
memory and should be checked against `CBACT04C.cbl` / `CVTRA02Y.cpy`.

## Decisions

### A1 — Interest formula and rate units
- **Wiki:** "interest = currentBalance × interestRate(groupId)" and
  "{{TODO: Extract exact interest formula, rounding, and grouping from CBACT04C + DISCGRP.}}".
- **Problem:** The wiki never says what unit the rate is in. The DISCGRP rate is `S9(04)V99`, an
  annual percentage such as 15.00, so a literal `balance × rate` would be meaningless.
- **Decision:** monthly interest = `balance × DIS-INT-RATE / 1200` (annual percent ÷ 12 ÷ 100).
  *(legacy recollection)*

### A2 — Which balance interest is computed on (grouping)
- **Wiki:** says "currentBalance", but the formula is marked TODO (it includes "grouping").
  *Related Data* lists `TransactionCategoryBalance`, and the rule says interest is "posted to
  balance and category balance".
- **Decision:** interest is computed once per transaction-category-balance record (`tcatbal.dat`,
  `TRAN-CAT-BAL`), not on the account's `ACCT-CURR-BAL`. The amounts are then summed per account.
  *(legacy recollection)*

### A3 — Rate lookup key and fallback
- **Wiki:** `rate(groupId)` only. The DISCGRP record layout is not on the supplied pages; CONTRACT.md
  only names copybook CVTRA02Y.
- **Decision:** the rate is looked up by (account `ACCT-GROUP-ID`, category `TRANCAT-TYPE-CD`,
  `TRANCAT-CD`). If that key is missing, the lookup is retried with group id `DEFAULT`.
  *(legacy recollection)*
- **Decision:** if the `DEFAULT` key is missing too, the rate is treated as 0. The legacy program
  abends here; a batch that stops on missing configuration is not reproducible, so this is a
  deliberate deviation.

### A4 — Rounding
- **Wiki:** "Rounding matches legacy {{TODO: confirm rounding mode}}".
- **Decision:** each per-category amount is truncated toward zero to 2 decimals (a COBOL `COMPUTE`
  without `ROUNDED`, into `S9(09)V99`). The truncated amounts are then summed per account. Integer
  arithmetic in cents is used; there is no floating point. *(legacy recollection)*

### A5 — Zero rate versus zero balance
- **Wiki:** scenario 3 says only "Account balance 0 → Zero interest".
- **Decision:** a category whose rate is 0 produces no transaction. A category with a non-zero rate
  produces a transaction even when its interest is 0.00, for example a zero or tiny balance.
  *(legacy recollection)*

### A6 — Interest transactions (`intcalc_systran.json`)
- **Wiki:** says nothing about writing transactions. Only CONTRACT.md requires "transaction fields
  for every interest transaction written".
- **Decision:** one transaction per category with a non-zero rate, with these fields:
  - `tran_id` = the 10-character INTCALC parameter (`2022071800`) followed by a 6-digit sequence
    starting at 000001, in processing order
  - `type_cd` = `01`, `cat_cd` = `5`, `source` = `System`
  - `desc` = `Int. for a/c ` followed by the 11-digit zero-padded account id
  - `amt` = the interest
  - `merchant_id` = 0; merchant name, city and zip blank
  - `card_num` = the account's card from cardxref
  - `orig_ts` = `proc_ts` = the run timestamp
  
  *(legacy recollection)*

### A7 — Transaction timestamps
- **Wiki:** silent.
- **Decision:** DB2 format `YYYY-MM-DD-HH.MM.SS.hh0000`, taken from the wall clock at run time as
  in the legacy program. The optional workflow input `runTimestamp` overrides it, so runs can be
  reproduced. These values cannot match the oracle's.

### A8 — Posting to the account (`intcalc_acctdata.json`)
- **Wiki:** "Post Interest — Add interest to balance"; the wiki says nothing about the cycle fields.
- **Decision:** for each account that has at least one category-balance record:
  `curr_bal += total interest`, `curr_cyc_credit = 0`, `curr_cyc_debit = 0`. The cycle fields are
  reset even when the total interest is 0.00. *(legacy recollection, cycle reset)*

### A9 — The last account in the file is also posted
- **Wiki:** the flow is "For each account → Compute → Post → Save → More?", which means every account
  is posted. The wiki does not mark this as uncertain.
- **Legacy note:** as I recall CBACT04C's main loop, the account update for the last account sits in
  an `ELSE` branch of `PERFORM UNTIL END-OF-FILE = 'Y'` that the loop never reaches. If so, the
  oracle leaves the last account's balance and cycle fields unchanged, while its interest
  transactions are still written.
- **Decision:** follow the wiki (rule 1) and post every account. This may differ from the oracle for
  the highest-keyed account in tcatbal. It is flagged.

### A10 — Accounts with no category balance
- **Wiki:** silent.
- **Decision:** these accounts are written out unchanged. The contract asks for "every account,
  after interest".

### A11 — Category balances are not updated
- **Wiki:** the ComputeInterest rule says the interest is "posted to balance and category balance".
- **Decision:** `TRAN-CAT-BAL` is not changed. CONTRACT.md defines no INTCALC category-balance output,
  and CBACT04C does not rewrite TCATBALF. *(legacy recollection)* Interest reaches the category
  balances when the next POSTTRAN posts the `01/0005` transactions.

### A12 — Processing order
- **Wiki:** silent.
- **Decision:** category balances are processed in key order (account id, type, category), the order
  in which the TCATBALF KSDS is read sequentially. Transaction ids are numbered in that order.
  Output order does not matter under the contract.

### A13 — Missing reference data
- **Wiki:** silent. The legacy program abends.
- **Decisions:**
  - a category balance whose account is not in acctdata is skipped (no transaction)
  - an account with no cardxref entry gets a blank `card_num`
  - for a missing rate, see A3

### A14 — An account with several cards
- **Wiki:** silent. The legacy program reads the xref alternate index on account id.
- **Decision:** use the first card in card-number order.

### A15 — Fees
- **Wiki:** silent. In CBACT04C, `1400-COMPUTE-FEES` is an empty stub *(legacy recollection)*.
- **Decision:** no fees.

### A16 — Account status
- **Wiki:** silent.
- **Decision:** interest is computed whatever the value of `ACCT-ACTIVE-STATUS`. *(legacy recollection: no status check)*

### A17 — Input format
- **CONTRACT.md:** records are fixed-width, one per line, laid out as in the copybooks.
- **Decision:**
  - field offsets come from CVACT01Y, CVTRA01Y, CVACT03Y and CVTRA02Y
  - signed fields are read as zoned decimal with an ASCII overpunched last byte (`{`/`A`–`I`
    positive, `}`/`J`–`R` negative); explicit `+`/`-` signs and a decimal point are also accepted
  - short lines are padded with spaces and blank lines are ignored
  - `custdata`, `carddata`, `trantype`, `trancatg` and `dailytran` are not read by this step

### A18 — Run parameters
- **Decision:** the INTCALC parameter `2022071800` is used as `PARM-DATE`, the transaction-id prefix.
  The business date `2022-07-18` is not otherwise used.

### A19 — Orchestration and persistence
- **Wiki:** describes a scheduled process that loads accounts and saves them one at a time through
  Kafka topics to "FlowX Persistence".
- **Decision:** CONTRACT.md fixes file inputs and JSON outputs, so the step is built as one FlowX
  integration workflow that takes the four files as string inputs and returns both outputs. There is
  no scheduler, no Kafka topics and no FlowX Database. A scheduled process could call this workflow
  later.

### A20 — Output formatting
- **Decision:**
  - amounts are JSON strings with exactly 2 decimals and a leading `-` when negative
  - `acct_id`, `cat_cd` and `merchant_id` are integers
  - other strings have trailing spaces removed (allowed by CONTRACT.md)
  - the legacy field `ACCT-EXPIRAION-DATE` is output as `expiration_date`, the contract's name
- **Decision:** there is no overflow or size-error handling; the legacy program has none either.
