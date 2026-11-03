# ACCRUE (interest calculation) — assumptions and decisions

Implementation: FlowX workflow `accrue_interest_calculation`
(resourceDefinitionId `<uuid>`, project app `<uuid>`).
Nodes: Start → **Decode input files** (SCRIPT) → **Compute and post interest** (SCRIPT) → End.
The script comments cite the A-numbers below.

Sources consulted: the wiki pages `02-processes/process-interest-calculation.md` ("process page"),
`10-acceptance-criteria/acceptance-criteria-interest-calculation.md` ("AC page"),
`01-data-model/project-data-model.md` ("data model"), `ONTOLOGY.md` (also queried live from the
project ontology `ledgerline-accrue`, which returned the same concepts and no source text), and `CONTRACT.md`.

---

## A1 — Interest formula: monthly interest per category balance = balance × rate / 1200
**Assumed:** for each transaction-category-balance record, `monthly = TXN-CAT-BAL × RG-INT-RATE / 1200`,
where RG-INT-RATE is an annual percentage (e.g. `15.00` = 15 % p.a.).
**Rests on:** the process page gives only `interest = currentBalance × interestRate(groupId)` and says
`{{TODO: Extract exact interest formula, rounding, and grouping from LXB002C + RATEGRP.}}`. The ontology
describes RG-INT-RATE as the "Interest rate used to compute **monthly** interest". It also describes
WS-MONTHLY-INT as "the computed monthly interest amount" and TXN-CAT-BAL as "the balance amount for the
transaction category used in interest calculation". RG-INT-RATE is "signed decimal(6,2)", which suggests a
percentage, not a fraction. Taken literally, `balance × rate` would post 15× the balance as interest.
The divisor 1200 (12 months × 100 for a percentage) is my inference. No source states it.

## A2 — Rounding: truncate toward zero to cents, per transaction
**Assumed:** each monthly interest amount is truncated (not rounded) to 2 decimals, toward zero (so
-0.125 → -0.12). The account total is the sum of the already-truncated amounts.
**Rests on:** the AC page says "Rounding matches legacy `{{TODO: confirm rounding mode}}`". WS-MONTHLY-INT
is a 2-decimal working field, and a COBOL COMPUTE without ROUNDED truncates. CONTRACT.md's example flag
`R-INT-TRUNC` points to the same question. Exact integer arithmetic (BigInt) is used, so there is no
floating-point drift.

## A3 — Driver: category-balance file read sequentially in key order, grouped by account
**Assumed:** processing walks balcat (LXV026Y) in key order (account id + type code + category code).
On each change of account id, the previous account is posted (A6). The input lines are sorted by the
17-byte key, so file order does not matter (ties keep file order).
**Rests on:** the ontology: BALCAT-FILE is "INDEXED", "SEQUENTIAL" access with record key FD-TXN-CAT-KEY;
1000-BALCATF-GET-NEXT reads "until end of file"; WS-LAST-LACC-NUM "stores the last processed
BCAT-LACC-ID"; and WS-FIRST-TIME is a first-record flag. The process page instead shows "Load Accounts → For
each account". The ontology is more specific and source-cited, so I followed it.

## A4 — Rate lookup key = (account group id, category type code, category code)
**Assumed:** the rate is read from rategrp (LXV027Y) using account LACC-GROUP-ID + the balance record's
type code + category code.
**Rests on:** the ontology RG-GROUP-KEY = RG-LACC-GROUP-ID + RG-TXN-TYPE-CD + RG-TXN-CAT-CD, and the
FD-RG-LACC-GROUP-ID / FD-RG-TXN-TYPE-CD / FD-RG-TXN-CAT-CD key fields. The wiki writes `rate(groupId)`
only. AC scenario 4 ("Correct rate per group") is satisfied either way.

## A5 — Rate not found: fall back to the standard group; if that is missing too, accrue nothing
**Assumed:** when the (group, type, category) key is missing (VSAM status '23'), the same type/category is
looked up under group id `STANDARD`, then `DEFAULT`. If neither exists, that category accrues no interest
and the run reports an error in `summary.errors`.
**Rests on:** the ontology: 1200-A-GET-STANDARD-INT-RATE is "performed to get the standard interest rate
when the disclosure group status is '23'". It does not give the literal group id used for the standard
record, so I accept either spelling found in the data. On any other failure the legacy performs
9999-ABEND-PROGRAM. I chose not to abend the whole batch, to keep the run producing outputs.

## A6 — Posting: total interest is added to the account's current balance only
**Assumed:** after an account's last category balance, `curr_bal = curr_bal + Σ monthly interest`. The
category-balance records are **not** updated, and no balcat output is produced.
**Rests on:** the process page: "Post Interest — Add interest to balance". The same page also says
"posted to balance and category balance". CONTRACT.md lists no ACCRUE balcat output, and the ontology shows
BALCAT-FILE read sequentially with no rewrite procedure; only ACCOUNT-FILE is opened "I-O". I resolved the
wiki's contradiction toward the account balance only.

## A7 — Posting resets the current-cycle credit and debit to zero
**Assumed:** every account that has at least one category balance record gets
`curr_cyc_credit = 0` and `curr_cyc_debit = 0` when its interest is posted. This applies even when its
interest is 0 or its rates are 0.
**Rests on:** the wiki is silent. The ontology "Account Record" (cited to the rewrite chunk LXB002C-8, next
to "ERROR RE-WRITING ACCOUNT FILE") lists exactly the fields balance, current_cycle_credit and
current_cycle_debit as what the update touches. A monthly interest run closing the cycle is the usual
reading. This is the least certain account-side decision.

## A8 — Category balance whose account is missing from ledgacc: skipped
**Assumed:** its interest is neither computed nor written, and an error is reported.
**Rests on:** the ontology: 1100-GET-LACC-DATA plus the APPL-RESULT 0/12 → 9999-ABEND pattern (the legacy
aborts). The wiki is silent. I chose to continue rather than abort.

## A9 — Card number on the interest transaction = first cardlink record for the account
**Assumed:** `card_num` is the LINK-CRD-NUM of the first cardlink (LXV024Y) record whose LINK-LACC-ID
equals the account id, in file order. If there is none, `card_num` is blank and an error is reported.
**Rests on:** the ontology: TXN-CRD-NUM is "set to LINK-CRD-NUM"; LINK-FILE has alternate record key
FD-LINK-LACC-ID; and 1110-GET-LINK-DATA sets APPL-RESULT 12 on failure (the legacy aborts). The ontology
does not say which card to pick when an account has several.

## A10 — Zero rate: no interest and no transaction; zero balance with a non-zero rate: a 0.00 transaction
**Assumed:** a category whose resolved rate is 0 is skipped (no transaction). A zero balance with a
non-zero rate produces a transaction with `amt` "0.00".
**Rests on:** the AC page scenario 3: "Zero balance → Zero interest", which gives no rule on writing a
transaction. The ontology says 1300-COMPUTE-INTEREST "calls 1300-B-WRITE-TX": one transaction per
computed interest. Skipping zero-rate categories is my judgement (nothing to accrue). The ontology
mentions no rate guard.

## A11 — Interest transaction field values
**Assumed (all from the ontology, chunk LXB002C-14, except where noted):**
| field | value | note |
|---|---|---|
| tran_id | ACCRUE parameter (`2022071800`) + WS-TRANID-SUFFIX | suffix is a 6-digit zero-padded counter starting at 1 for each run and incremented per transaction. The width is my inference from TXN-ID X(16) = 10 + 6, and the start value is not documented |
| type_cd | `07` | |
| cat_cd | `12` | |
| source | `Batch` | |
| desc | `Accrued int ` + LACC-ID | LACC-ID as its 11-digit zero-padded form; a single space after "int" as in the ontology string |
| amt | monthly interest (A1/A2) | |
| merchant_id | 0 | |
| merchant_name / city / zip | blank | the ontology says spaces; trailing spaces omitted, as CONTRACT.md allows |
| card_num | A9 | |
| orig_ts, proc_ts | DB2-FORMAT-TS of the current date/time, both equal | format `YYYY-MM-DD-HH.MM.SS.hh0000`: two fractional digits from CURRENT-DATE followed by `0000` (DB2-MIL + DB2-REST). The separator layout is inferred from DB2-STREEP/DB2-DOT; the exact digit split is not documented. The wall clock (server local time) is used unless the `runTimestamp` input is given, so these two fields cannot match an oracle run byte for byte |

## A12 — Account output: every account, input order
**Assumed:** `accrue_ledgacc.json` holds every ledgacc record. Accounts with no category balance are
emitted unchanged (including their cycle fields). Amount fields are strings with 2 decimals, and string
fields have trailing spaces removed.
**Rests on:** CONTRACT.md: "account fields for every account, after interest".

## A13 — Input decoding
**Assumed:**
- One record per line. Lines shorter than the record length are right-padded with spaces, and blank lines are ignored.
- Signed zoned fields accept several encodings: EBCDIC-style overpunch (`{`/`A`–`I` positive, `}`/`J`–`R` negative), GnuCOBOL ASCII negative overpunch (`p`–`y`), separate `+`/`-` and an explicit decimal point.
- Field offsets come from the data-model page and ontology PIC clauses: account 300, cardlink 50 (card 1–16, client 17–25, account 26–36), balcat 50 (account 1–11, type 12–13, category 14–17, balance 18–28 S9(9)V99), rategrp 50 (group 1–10, type 11–12, category 13–16, rate 17–22 S9(4)V99).
- Duplicate keys: the first occurrence wins.

**Rests on:** CONTRACT.md: "fixed width, layouts as in the copybooks", which does not specify the
sign encoding. The rate layout "signed decimal(6,2)" is read as 6 digits with 2 implied decimals.

## A14 — No PIC-size overflow emulation
**Assumed:** results are not truncated to the legacy field widths (S9(9)V99 monthly interest,
S9(10)V99 balance).
**Rests on:** silence. Real balances are far below those limits.

## A15 — Fees are not computed
**Assumed:** 1400-COMPUTE-FEES has no behaviour to implement.
**Rests on:** the ontology lists the procedure ("compute fees related to transactions") with no
fields, outputs or relations. The wiki never mentions fees. CONTRACT.md has no fee output.

## A16 — Runtime shape: workflow with file contents in and JSON out, instead of a scheduled process
**Assumed:** the step is a FlowX integration workflow. Its INPUT is the four fixed-width file contents
(`ledgacc`, `cardlink`, `balcat`, `rategrp`) plus `parmDate` (default `2022071800`) and an optional
`runTimestamp`. Its OUTPUT is `accrue_systxn`, `accrue_ledgacc` and a `summary` with errors.
**Rests on:** the process page describes a scheduled BPMN process with Kafka send/receive to a "FlowX
Persistence" datastore (`ai.flowx.in.ledgerline.datastore.*`). No such datastore or topics exist in the
project, and CONTRACT.md defines the step as files in, JSON files out. The rates come from the rategrp
input file, not from a Configuration Parameter (the process page mentions both). Per CONTRACT.md step
isolation, the caller passes the POSTDAY ledgacc/balcat outputs as `ledgacc`/`balcat`. clntrec, crdrec,
txntype, txncatg and daytxn are not read by this step.
