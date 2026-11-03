# ACCRUE (interest calculation) — assumptions and decisions

Implementation: FlowX integration workflow `accrue_interest_calculation`
(project `ll_accrue_zflx_opus_r3`, resourceDefinitionId `<uuid>`).
Nodes: Start → Load Accounts → Compute Interest → Post Interest → Save Account → End.
Script sources are mirrored in `flowx/scripts/`; file I/O helper in `flowx/accrue_io.py`.

The wiki leaves the actual computation as a TODO ("Extract exact interest formula, rounding, and
grouping from LXB002C + RATEGRP") and documents neither the RATEGRP record layout nor the interest
transactions that CONTRACT.md requires as an output. Where it is silent, I filled the gaps from
the legacy program the wiki describes. The Ledgerline chain (LXB002C reading the category-balance,
card cross-reference, disclosure-group and account files and writing transactions) matches
AWS CardDemo's CBACT04C interest calculator under different names. Most of the decisions below
follow that program, which is what the acceptance criteria require: "matches legacy",
"identical per account". **That identification is my inference; the wiki does not state it.**

---

**A1 — Interest is computed per category balance, not on the account's current balance.**
Wiki: Business Rules give `interest = currentBalance × interestRate(groupId)`, but the same rule
carries `{{TODO: Extract exact interest formula, rounding, and grouping …}}`. The page also lists
*TransactionCategoryBalance* as Related Data, and the data model lists Interest Calculation under
TransactionCategoryBalance "Used by". The acceptance criteria require legacy parity.
Decision: one interest amount per TransactionCategoryBalance record (balcat), using that record's
`balance`. The account's interest is the sum of these amounts. I treated the wiki formula as a
simplification that its own TODO flags as unconfirmed. It conflicts directly with this
implementation.

**A2 — The rate is an annual percentage and the interest is monthly: `bal × rate / 1200`.**
Wiki: silent on the rate's unit and on the accrual period (the pipeline is only described as
"periodic"). Taken literally, `balance × rate` with a rate such as 15.00 would charge 1500 %.
Decision: `monthly interest = category balance × DIS-INT-RATE / 1200`.

**A3 — Layout of `rategrp.dat` (LXV027Y, 50 bytes).**
Wiki: no page documents it. CONTRACT.md gives only the copybook name and record length.
Decision: `group id X(10) | tran type X(2) | tran category 9(4) | interest rate S9(4)V99 |
filler X(28)`. That adds up to the 50 bytes. The rate is keyed by group **and** transaction type/category, not by group alone
(wiki: "interest rate per account group"). Duplicate keys: the first record wins.

**A4 — Rate lookup and fallback.**
Wiki: "Correct rate per group" (scenario 4). Silent on an account whose group has no rate.
Decision: look up (account `group_id`, balance type, balance category). If no record exists, look up
group `DEFAULT` with the same type/category. If that is also missing, treat the rate as 0 (no
interest). The legacy program would abend at that point, and I chose not to fail the batch.
A blank group id resolves through `DEFAULT`. No gateway node is needed, because the per-group
choice is a lookup.

**A5 — Rounding: truncate toward zero to cents, separately for each category balance.**
Wiki: `{{TODO: confirm rounding mode}}` (acceptance scenario 2).
Decision: legacy `COMPUTE` without `ROUNDED` into a 2-decimal field means truncation. Each category
balance's amount is truncated before it is summed (e.g. 333.33 × 24.99 / 1200 = 6.9416 → 6.94;
−50.25 × 12 / 1200 = −0.5025 → −0.50). Integer arithmetic in cents, with no floating point.

**A6 — Zero rate versus zero balance.**
Wiki: scenario 3, "Account balance 0 → Zero interest".
Decision: a **zero rate** writes no transaction. A **zero balance** with a non-zero rate yields
interest 0.00, and that still writes a 0.00 interest transaction, because legacy tests only the rate.
The posted interest is 0 either way, so scenario 3 holds.

**A7 — What "post interest" changes on the account.**
Wiki: "Add interest to balance"; "posted to balance and category balance". Silent on other fields.
Decision: for every account that has **at least one** category-balance record, `curr_bal +=` total
interest, and **`curr_cyc_credit` and `curr_cyc_debit` are reset to 0.00**. This is the legacy
end-of-cycle behaviour, and the wiki does not mention it. It applies even when the total interest
is 0. Accounts with no category-balance record are output unchanged. Every other field passes
through unchanged.

**A8 — Category balances are not updated.**
Wiki: "posted to balance and category balance".
Decision: category balances are left unchanged. CONTRACT.md lists no ACCRUE category-balance
output, and the legacy program never rewrites that file. This contradicts the wiki sentence.

**A9 — Interest transactions (`accrue_systxn.json`).**
Wiki: does not mention writing transactions at all. CONTRACT.md requires "every interest transaction
written".
Decision: one transaction per category balance with a non-zero rate (A6), in the processing order (A10):
- `tran_id` = ACCRUE parameter (10 chars, `2022071800`) + a 6-digit sequence starting at `000001`
  for the run (`2022071800000001`, …)
- `type_cd` `"01"`, `cat_cd` `5`, `source` `"System"`
- `desc` = `"Int. for a/c "` + account id zero-padded to 11 digits
- `amt` = the truncated monthly interest (A5)
- `merchant_id` 0; `merchant_name`, `merchant_city`, `merchant_zip` empty
- `card_num` = the account's card from `cardlink.dat` (A11)
- `orig_ts` = `proc_ts` = **business date at midnight in DB2 format, `2022-07-18-00.00.00.000000`**.
  Legacy stamps the wall-clock time of the run, which cannot be reproduced. I chose the business
  date so that output is deterministic. The flag for this is in `flags.json`.

**A10 — Processing order.**
Wiki: "For each account" loop. Silent on order.
Decision: category balances are processed in ascending key order (account id, type code, category
code), matching a sequential read of the keyed file, whatever order the input file uses. This
order determines the `tran_id` sequence. `accrue_ledgacc.json` keeps the input account order.

**A11 — Card number for the transaction.**
Wiki: CardXref "Links card ↔ customer ↔ account; alternate index on accountId". Silent on
accounts with several cards.
Decision: the first card in alternate-index order, which means the lowest card number for that
account. If no card is linked, `card_num` is empty.

**A12 — A category balance whose account is not in `ledgacc`.**
Wiki: silent.
Decision: the interest is computed with a blank group (so via `DEFAULT`) and the transaction is
written. No account is updated or created.

**A13 — Account status.**
Wiki: silent on whether inactive accounts accrue interest.
Decision: no status filter. Every account with category balances is processed (as in legacy).

**A14 — Numeric overflow.**
Legacy fields are S9(9)V99 or S9(10)V99. High-order truncation on overflow is not emulated, because
no realistic input reaches those limits.

**A15 — Input formats and parsing.**
CONTRACT.md: "fixed width, layouts as in the copybooks". Step isolation: ACCRUE receives the
POSTDAY outputs as its account and category-balance inputs.
Decision: `ledgacc` and `balcat` are accepted either as fixed-width records (LXV022Y / LXV026Y) or as
the POSTDAY JSON lists (CONTRACT.md field names). The format is detected by a leading `[`. Signed
zoned amounts accept trailing overpunch in both conventions (`{A–I` / `}J–R`, and GnuCOBOL ASCII
`p–y` for negatives), a separate `+`/`−` sign, or an explicit decimal point. Field offsets follow
the column order in the wiki data model: account `id 0–11, status 11, curr_bal 12–24,
credit_limit 24–36, cash_credit_limit 36–48, open 48–58, expiration 58–68, reissue 68–78,
cyc_credit 78–90, cyc_debit 90–102, zip 102–112, group 112–122`; balcat `acct 0–11, type 11–13,
cat 13–17, bal 17–28`; cardlink `card 0–16, cust 16–25, acct 25–36`. A short (right-trimmed)
record is padded back to full width. The other files that CONTRACT.md lists (`daytxn`, `clntrec`,
`crdrec`, `txntype`, `txncatg`) are not used by this step.

**A16 — Output formatting.**
CONTRACT.md fixes names and types. Amounts are JSON strings with exactly two decimals (`"-50.75"`).
`acct_id`, `cat_cd` and `merchant_id` are integers. Trailing spaces are stripped. Dates are passed
through as stored. `expiration_date` is the corrected spelling, following the wiki
`{{DECISION}}` on the LACC-EXPIRY-DATE typo; the contract uses that name too.

**A17 — Run parameters.**
CONTRACT.md: business date `2022-07-18`, ACCRUE parameter `2022071800`. Both are workflow inputs.
If either is omitted, the defaults are `2022-07-18` and `<business date as yyyymmdd>00`.

**A18 — FlowX shape: a workflow instead of a scheduled BPMN process with Kafka send/receive.**
Wiki: a "Scheduled Process" with Send/Receive tasks to "FlowX Persistence" (topics
`…datastore.loadaccounts` / `…saveaccount`).
Decision: the contract is file-in/file-out, and no persistence service or topic exists to bind.
So the step is a single FlowX integration workflow. Its four script nodes mirror the wiki's nodes
(Load Accounts, Compute Interest, Post Interest, Save Account). The per-account loop runs inside
the scripts rather than as a BPMN loop, and there is no scheduled trigger. A scheduled process can
call this workflow later through a send/receive pair.

**A19 — No outputs were produced in this build.**
The working directory contained only the wiki PDF and no input `.dat` files. So
`accrue_systxn.json` and `accrue_ledgacc.json` have not been generated here. Produce them with
`flowx/accrue_io.py pack` → run the workflow → `flowx/accrue_io.py unpack <end_output> out/`.
The workflow itself was verified on a synthetic fixture: fixed-width inputs with overpunched
signs, unsorted balcat, DEFAULT fallback, a zero-rate category, a negative balance, a duplicate card
link, an account without balances, and the JSON (step-isolated) input path. Every result matched
the hand-computed values.
