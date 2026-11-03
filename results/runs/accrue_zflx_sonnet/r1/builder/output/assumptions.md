# ACCRUE (interest-calculation, P-15) — build assumptions

FlowX build: project `ll_accrue_zflx_sonnet_r1`, workflow `accrue_interest_calculation`
(resourceId `<uuid>`, resourceDefinitionId `<uuid>`).
Script sources: `../flowx/scripts/`. How to run: `../RUN.md`.

Each entry: **what was decided** — *what in the wiki it rests on (or the gap it fills)*.

## Architecture

A1. **The step is one DEFAULT integration workflow (Start → Parse input files → Calculate interest and post →
Build contract outputs → End). It reads the input files and works on them in memory, with no process
(P-15 with MESSAGE_EVENT_SEND/RECEIVE) and no `ledgerline-datastore` NOSQL_DB collections.** The calculation node
still follows the wiki's operations in order: LIST_BALANCES_BY_ACCOUNT → GET_DISCLOSURE_RATE (with fallback) →
WRITE_INTEREST_TRANSACTION → UPDATE_ACCOUNT_AFTER_INTEREST.
— *CONTRACT.md: inputs are files "given per run" and outputs are JSON lists. Step isolation means each run starts
from the oracle's POSTDAY files, so a persistent store would only add state that leaks between runs. The wiki's
persistence and workflow split (W-01/W-04/W-05, `ledgerline-datastore`) are themselves `{{DECISION}}` blocks, not
behaviour. As a result, these are not built: the account version check (W-01 UPDATE_ACCOUNT `expectedVersion`), the
"retry 3 times" on store timeout, and the transaction id sequence generator. Ids follow BR-05 instead (A11).*

## Input layouts

A2. **Record layouts come from the field order and PIC clauses in the project-data-model tables. Fields are
contiguous from column 1, and the FILLER sits at the end:**
- ledgacc (300): id 9(11), status X(1), curr-bal S9(10)V99, credit-limit S9(10)V99, cash-credit-limit S9(10)V99,
  open-date X(10), expiry-date X(10), reissue-date X(10), cyc-credit S9(10)V99, cyc-debit S9(10)V99,
  addr-zip X(10), group-id X(10), filler 178
- balcat (50): acct-id 9(11), type X(2), cat 9(4), bal S9(9)V99, filler 22
- rategrp (50): group-id X(10), type X(2), cat 9(4), int-rate S9(4)V99, filler 28
- cardlink (50): card X(16), cust-id 9(9), acct-id 9(11), filler 14

— *The copybooks (LXV022Y, LXV024Y, LXV026Y, LXV027Y) are not attached. The attribute widths add up exactly to the
stated record sizes (122+178=300, 28+22=50, 22+28=50, 36+14=50). The wiki also says "Legacy FILLER (178 bytes) is
dropped" for DT-01.*

A3. **Every signed `S9…V99` field is read as display zoned decimal with a trailing overpunch sign
(`{`/`A`–`I` positive, `}`/`J`–`R` negative). ASCII-style `p`–`y` negatives, plain unsigned digits and an explicit
`-123.45` form are also accepted.** — *The wiki shows overpunch only for the rate ("`0150{` = 15.00", DT-07 and the
acceptance-criteria data-mapping note). The same encoding is assumed for balances and account amounts.*

A4. **Lines may be shorter than the record length (trailing spaces trimmed) and may end in CRLF. Short lines are
right-padded with spaces, and blank lines are ignored.** — *CONTRACT.md: "one record per line, fixed width". It is
silent on trimming and line endings.*

A5. **Account and category keys are compared numerically, so `00000000001` and `1` match. Group ids and type codes
are compared with trailing spaces trimmed.** — *The wiki is silent. The key fields are 9(n) or X(n) padded.*

## Calculation

A6. **Monthly interest = balance × rate / 1200, truncated (not rounded) to 2 decimals, toward zero for negative
balances. It is computed in exact integer arithmetic (cents × hundredths of a percent).** — *BR-03 gives the
formula. BR-08 says "Rounding follows COBOL COMPUTE default truncation", with an open
`{{TODO: confirm rounding mode (truncate vs ROUNDED)}}`. The acceptance criteria say "verify interest rounding to two
decimals". Truncation was chosen because BR-08 describes the legacy default, and COBOL truncation drops the extra
digits toward zero. This is flagged (`flags.json`).*

A7. **Interest is truncated per category balance (one transaction each), and the account's total interest is the
sum of those truncated amounts.** — *BR-03 computes `monthlyInterest` per balance, and BR-06 adds `totalInterest`
at the account change.*

A8. **Rate lookup key = account.groupId + typeCode + categoryCode. If there is no row, the lookup is retried with
group `STANDARD`. If STANDARD has no row either, rate 0 is used: no interest, and a message in `summary.messages`.**
— *BR-01 and BR-02. The wiki does not say what happens when the fallback row is also missing. The legacy program
would most likely abend; a batch that skips one category was preferred.*

A9. **Rate = 0 (e.g. group ZEROAPR, or types 02/03): no transaction is written, but the account is still rewritten
at the account change (balance + 0, cycle credit/debit reset to 0).** — *BR-03 makes only the computation
conditional on rate ≠ 0. BR-06 applies "at each change of account" without a condition. Acceptance scenario 5 only
says "No interest transaction".*

A10. **When the rate is non-zero but the truncated interest is 0.00 (tiny or zero balance), a 0.00 transaction is
still written.** — *BR-03/BR-04 make the transaction conditional on the rate, not on the amount.* Negative
category balances produce negative interest; there is no floor. *(The wiki is silent.)*

A11. **Category balances are processed in key order (account, type, category), whatever their order in balcat.dat.
`tran_id` = the 10-character PARM (`interestRunDate`, default `2022071800`) + a 6-digit zero-padded running suffix
starting at `000001`, with one counter for the whole run.** — *BR-05: "run date prefix (PARM) + running suffix".
DT-05 fixes `transactionId` at 16 characters, so the suffix is 6 digits. The legacy reads the KSDS sequentially,
which is key order, and that order decides the suffix sequence.*

A12. **Fees: none (stub kept).** — *BR-07 says fees are an empty stub. Acceptance scenario 7 has an open
`{{DECISION: implement fees in FlowX or keep stub}}`; the stub is kept to match legacy.*

## Interest transaction fields (accrue_systxn)

A13. **type_cd `"07"`, cat_cd `12`, source `"Batch"`, desc `"Accrued int "` + the 11-digit zero-padded account id
(e.g. `Accrued int 00000000001`), amt = the monthly interest.** — *BR-04. The wiki does not say how the account id
is formatted inside the description; the 9(11) display form is used.*

A14. **card_num = the card linked to the account in cardlink.dat (the lowest card number if the account has
several). If there is none, it is blank and a message is logged.** — *BR-04 does not mention the card, but DT-05
makes `cardNumber` required. CONTRACT.md lists cardlink.dat as an input, and the legacy reads the account's xref
(alternate index on account id) before writing.*

A15. **merchant_id `0`; merchant_name, merchant_city and merchant_zip are empty strings.** — *The wiki does not say
what a system-generated transaction carries in the merchant fields, which DT-05 marks required.*

A16. **orig_ts = proc_ts = the run's current timestamp in DB2 format `YYYY-MM-DD-HH.MM.SS.hh0000`. It can be fixed
with the optional `processingTimestamp` input to make runs reproducible.** — *The wiki is silent on the timestamps
of interest transactions.* The workflow clock is the FlowX runtime's (UTC).

A17. **accrue_systxn holds only the interest transactions written in this run.** — *BR-09: legacy overwrites the
transaction output and FlowX appends. Under step isolation the output is "every interest transaction written", so
the difference has no effect here.*

## Account output (accrue_ledgacc)

A18. **Every account in ledgacc.dat is emitted, in input order. Accounts with category balances get
`curr_bal += total interest`, `curr_cyc_credit = 0` and `curr_cyc_debit = 0`. Accounts without category balances are
emitted unchanged (their cycle totals are not reset).** — *BR-06 resets at "each change of account" in the balance
scan, so only accounts that appear there. CONTRACT.md: "account fields for every account, after interest".*

A19. **The active status is not checked: inactive (`N`) accounts accrue interest like active ones.** — *Neither the
BRs nor the acceptance criteria mention status.*

A20. **A category balance whose account is missing from ledgacc.dat is skipped (no interest, no transaction) and
logged.** — *The wiki is silent. The legacy would most likely abend on the failed random read; skipping keeps the
batch running.*

A21. **Duplicates: the first ledgacc record per account id wins, and the first rategrp row per key wins.** —
*The keys are unique in a KSDS, so the wiki has no rule for duplicates.*

## Configuration and run parameters

A22. **`interestRunDate` is a workflow input that defaults to `2022071800` (the CONTRACT/JCL PARM). It is not a
FlowX Configuration Parameter.** — *The process page puts it in the Configuration Parameter bucket with an override
at start. The default is set in the script so a run without the parameter still matches the contract.*
`batchId` is accepted and not used.

A23. **`RuntimeSwitches.batchWindowOpen` is not checked.** — *It belongs to the end-of-day chain (P-19) and blocks
online processes, not this step. Its own page has an open `{{TODO}}`.*

## Output format

A24. **Amounts are JSON strings with exactly two decimals (`"15.00"`, `"-1.50"`). `acct_id`, `cat_cd` and
`merchant_id` are integers. Other strings have trailing spaces trimmed. Dates are passed through as stored
(YYYY-MM-DD).** — *CONTRACT.md allows string or number amounts with at most two decimals, and lets strings omit
trailing spaces.* The END payload also carries a `summary` object (counts and messages) next to the two lists; it
is not written to the output files.
