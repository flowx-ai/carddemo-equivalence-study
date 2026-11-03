# ACCRUE (interest calculation) — assumptions

Implementation: FlowX workflow `accrue_interest_calculation`
(resourceDefinitionId `<uuid>`, project app `<uuid>`).
Nodes: Start → Load inputs → Compute interest → Post interest to accounts → Format outputs → End.

Sources cited: **WIKI-P** = 02-processes/process-interest-calculation.md, **WIKI-AC** =
10-acceptance-criteria/acceptance-criteria-interest-calculation.md, **WIKI-DM** = 01-data-model/project-data-model.md,
**ONT** = ONTOLOGY.md (same content as the `ledgerline-accrue` ontology in the project), **CONTRACT** = CONTRACT.md.
Each entry: what was decided, and the statement (or absence) it rests on.

## Calculation

**A1 — Formula is monthly: `interest = balance × rate / 1200`.**
WIKI-P gives only `interest = currentBalance × interestRate(groupId)` and leaves
`{{TODO: Extract exact interest formula, rounding, and grouping from LXB002C + RATEGRP.}}`. ONT describes RG-INT-RATE as
"Interest rate used to compute monthly interest" and WS-MONTHLY-INT as "the computed monthly interest amount"; RG-INT-RATE
is "signed decimal(6,2)", i.e. a percentage such as 18.00. An annual percentage applied monthly gives ÷100 ÷12 = ÷1200.

**A2 — Rounding is truncation toward zero to cents.**
WIKI-P TODO above and WIKI-AC scenario 2 "Rounding matches legacy `{{TODO: confirm rounding mode}}`". Nothing names the
mode. A COBOL COMPUTE without ROUNDED truncates into its target, and WS-MONTHLY-INT is assumed to have two decimals like
every other amount (WIKI-DM: amounts are decimal scale 2). Computed in exact integer arithmetic
(cents × hundredths-of-percent ÷ 120000). Example: 194.00 at 15.00 % → 2.425 → **2.42**; −10.35 at 24.00 % → −0.207 → **−0.20**.

**A3 — Interest is computed per transaction-category balance, not on the account's currentBalance.**
WIKI-P says `currentBalance × interestRate(groupId)`, but ONT says TXN-CAT-BAL is "the balance amount for the transaction
category used in interest calculation", LXB002C reads BALCAT-FILE sequentially (1000-BALCATF-GET-NEXT) and the rate key
holds type and category codes (FD-RG-TXN-TYPE-CD, FD-RG-TXN-CAT-CD). WIKI-P "Related Data" also lists
TransactionCategoryBalance. I followed the ontology; this deviates from the wiki's formula text.

**A4 — Rate lookup key is (account groupId, balance typeCd, balance catCd).**
WIKI-P: rate(groupId). ONT: RG-GROUP-KEY = RG-LACC-GROUP-ID + RG-TXN-TYPE-CD + RG-TXN-CAT-CD, populated from
FD-RG-LACC-GROUP-ID / FD-RG-TXN-TYPE-CD / FD-RG-TXN-CAT-CD. The group comes from the account record (LACC-GROUP-ID), type and
category from the balance record. Group ids and type codes are compared without trailing spaces; category numerically.

**A5 — When the key is not on file, the rate of the standard group is used; that group is named `DEFAULT` (then `STANDARD`).**
ONT: 1200-A-GET-STANDARD-INT-RATE is "performed to get the standard interest rate when the disclosure group status is '23'"
(record not found). No source names the standard group. I try `DEFAULT` first, then `STANDARD`, with the same type/category.

**A6 — A balance whose rate is 0 produces no transaction and no interest.**
Silent in WIKI-P/WIKI-AC. ONT shows 1300-COMPUTE-INTEREST and 1300-B-WRITE-TX only as consequences of a rate being found;
I assumed the usual guard (compute and write only for a non-zero rate). A zero balance with a non-zero rate still writes
a transaction of 0.00 (WIKI-AC scenario 3 "Zero balance → zero interest" is satisfied either way).

**A7 — Negative category balances give negative interest; no floor or cap.**
Silent everywhere. TXN-CAT-BAL is "signed numeric" (ONT, WIKI-DM `balance` decimal signed), so the sign is carried through.

**A8 — Interest posting: `currBal += Σ interest of the account`, and current-cycle credit and debit are reset to 0.**
WIKI-P: "Add interest to balance". ONT: 1050-UPDATE-ACCOUNT "update account information" and the Account Record concept
(LXB002C chunk 8, the rewrite) lists LACC-CURR-BAL, LACC-CURR-CYC-CREDIT, LACC-CURR-CYC-DEBIT. The wiki does not say what
happens to the cycle fields; their presence in the rewrite chunk is the only hint. Resetting them at the end of the cycle
is an assumption.

**A9 — Every account with category balances is posted, including the last one in the file.**
WIKI-P: interest is posted to "the account" for each account. ONT shows the legacy control fields WS-FIRST-TIME and
WS-LAST-LACC-NUM, i.e. the update is triggered on an account-id change; the end-of-file handling is not in any source. If the
legacy program only rewrites on a key change, the last account's balance would not move. I followed the wiki.

**A10 — Accounts without category balances are written unchanged; all accounts are output.**
CONTRACT: accrue_ledgacc = "account fields for every account, after interest". WIKI silent on accounts with no balances.

**A11 — Category balances are not updated and not output.**
WIKI-P: "posted to balance and category balance". CONTRACT lists no ACCRUE balance output, ONT shows BALCAT-FILE opened
with SEQUENTIAL access (read) and no write to it. Not implemented.

**A12 — Fees (1400-COMPUTE-FEES) do nothing.**
ONT names 1400-COMPUTE-FEES ("compute fees related to transactions") with no logic or fields; WIKI is silent. No fee
transactions are produced.

## Transactions written (accrue_systxn)

**A13 — One transaction per non-zero-rate category balance, in key order.**
ONT: 1300-COMPUTE-INTEREST calls 1300-B-WRITE-TX, which writes to TXNFILE-FILE. Balances are processed in
TXN-CAT-KEY order (account, type, category) as an indexed file read sequentially (BALCAT-FILE INDEXED/SEQUENTIAL); the
input is sorted by that key before processing.

**A14 — `tran_id` = ACCRUE parameter (10 chars, `2022071800`) + 6-digit counter starting at 000001, incremented per write.**
ONT: TXN-ID "composed by concatenating PARM-DATE and WS-TRANID-SUFFIX". Width 6 and start value 1 are assumed so that the
id is the 16 characters TXN-ID X(16) holds; the counter is per run.

**A15 — Constant fields: `type_cd` "07", `cat_cd` 12, `source` "Batch", `merchant_id` 0, merchant name/city/zip blank.**
ONT: TXN-TYPE-CD "set to '07'", TXN-CAT-CD "set to '12'", TXN-SOURCE "set to 'Batch'", TXN-MERCHANT-ID "set to 0",
TXN-MERCHANT-NAME/CITY/ZIP "set to spaces". Blank strings are output as "" (CONTRACT: strings may omit trailing spaces).

**A16 — `desc` = "Accrued int " + the 11-digit zero-padded account id, e.g. `Accrued int 00000000001`.**
ONT: TXN-DESC "composed of the string 'Accrued int ' concatenated with LACC-ID". LACC-ID is 9(11) (WIKI-DM), so it keeps its
leading zeros; the single space after "int" is taken from the quoted literal.

**A17 — `card_num` = the first card-link record for the account (file order).**
ONT: TXN-CRD-NUM "set to LINK-CRD-NUM"; LINK-FILE is read by alternate key FD-LINK-LACC-ID. An account can have several
cards and nothing says which one the alternate-key read returns; I take the first one in cardlink.dat order. No link →
blank card number (the legacy would abend, see A20).

**A18 — `orig_ts` = `proc_ts` = run time in DB2 format `YYYY-MM-DD-HH.MM.SS.hh0000` (26 chars).**
ONT: both "set to DB2-FORMAT-TS"; DB2 Timestamp Format is built from FUNCTION CURRENT-DATE with dash/dot separators,
DB2-MIL and a constant DB2-REST. Two digits of hundredths followed by "0000" is assumed. The clock is the FlowX runtime's
local time (not the business date). The optional `runTimestamp` input overrides it for reproducible runs. These values cannot
match a legacy run made at another time.

## Inputs, formats, errors

**A19 — ACCRUE reads the POSTDAY outputs for accounts and category balances.**
CONTRACT "Step isolation": the candidate receives the oracle's POSTDAY outputs as its account and category-balance inputs.
Precedence: `postday_ledgacc.json` → `postday_ledgacc.txt` → `ledgacc.dat` (same for balcat). `cardlink.dat` and
`rategrp.dat` are read as given. daytxn, clntrec, crdrec, txntype, txncatg are not used — LXB002C uses only BALCAT, LINK,
RATEGRP and the account file (ONT: LXB002C uses_file; ACCOUNT-FILE). The `.txt` dumps are assumed to use the copybook layout.

**A20 — Error handling: log and continue instead of abending.**
ONT: open/read/close failures perform 9910-DISPLAY-IO-STATUS and 9999-ABEND-PROGRAM (APPL-RESULT 12). WIKI-P has no error
path. The workflow records problems in `runLog` and continues: balance for an unknown account → skipped (no interest, no
posting); no rate even in the standard group → no interest for that balance; no card link → blank card number.

**A21 — Record layouts (byte offsets) follow the copybooks as listed in WIKI-DM / ONT.**
Account (300): id 0–11, status 11, curr bal 12–24, credit limit 24–36, cash limit 36–48, open 48–58, expiry 58–68,
reissue 68–78, cyc credit 78–90, cyc debit 90–102, zip 102–112, group 112–122. Balance (50): acct 0–11, type 11–13,
cat 13–17, bal 17–28 (S9(9)V99). Link (50): card 0–16, customer 16–25, acct 25–36. Rate group (50): group 0–10,
type 10–12, cat 12–16, rate 16–22 (S9(4)V99 — ONT says "signed decimal(6,2)", read as 6 digits with 2 implied decimals).
Signed numbers accept trailing overpunch (`{A–I` / `}J–R`, ASCII `p–y`), a separate sign, or an explicit decimal point.

**A22 — Output formatting.**
CONTRACT field names; amounts as strings with exactly two decimals; `acct_id`, `cat_cd`, `merchant_id` as integers;
strings right-trimmed; dates copied as stored. Duplicate keys in a keyed input file: first record wins.

**A23 — Orchestration differs from the wiki's flow.**
WIKI-P shows Load Accounts / Save Account as Kafka send/receive tasks to "FlowX Persistence" topics
(`ai.flowx.in.ledgerline.datastore.*`) inside a scheduled process. No such persistence system exists in the project, and the
contract is file-in/file-out, so the step is a single workflow whose input is the file contents and whose output is the two
contract lists. The business date 2022-07-18 is not used by this step; the ACCRUE parameter 2022071800 is (A14).
