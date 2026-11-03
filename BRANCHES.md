# Branch inventory: CBTRN02C (POSTTRAN) and CBACT04C (INTCALC)

Built from the COBOL source alone (`src/*.cbl`, CardDemo commit 59cc6c2), with no reference to the wikis
(PROTOCOL §3a). Each decision point is listed with its outcomes.

- **Expected coverage** is the analysis from the source and the golden outputs. It counts as evidence only once
  step 2 (GnuCOBOL statement trace per evaluation set) confirms it, in the column added then.
- **Classes:**
  - **B**, business: the outcome changes an output record;
  - **C**, control: loop, end of file, return code;
  - **V**, value partition: no IF, but a class of input that behaves differently, such as the sign or a
    multiplicity;
  - **E**, error handling: a file status other than OK leads to the abend routine.

## CBTRN02C, POSTTRAN (731 lines)

| ID | Line | Decision | Outcomes | Class | Expected coverage |
|---|---|---|---|---|---|
| P01 | 202–205 | main loop: read until end of file | next record / EOF | C | base (both) |
| P02 | 384 | card in CARDXREF? | found / INVALID KEY → reason 100 | B | found: base · 100: c01 |
| P03 | 372 | reason still 0 after the card check? | look up account / skip | B | both: c01 |
| P04 | 396 | account found? | found / INVALID KEY → reason 101 | B | found: base · 101: c03 |
| P05 | 407 | `limit >= cyc_credit − cyc_debit + amt`? | pass / reason 102 | B | both: base · boundary (=): c01 |
| P06 | 414 | `expiry >= orig date (1:10)`? | pass / reason 103 | B | 103: c01 · boundary (=): c01 |
| P07 | 407+414 | 102 and 103 both fail: 103 overwrites 102 (sequential IFs) | — | B | c01 |
| P08 | 211 | reason = 0? | post / write reject | B | both: base |
| P09 | 475 | category balance exists? | update / INVALID KEY → create | B | both: base (TCATBAL 50 → 100) |
| P10 | 548 | `amt >= 0`? | add to cycle credit / add to cycle debit | B | both: base (50 negative amounts posted) |
| P11 | 548 | amount exactly 0 (falls to credit) | — | V | **not covered** |
| P12 | 555 | REWRITE account INVALID KEY → reason 109 | — | B | **unreachable by data**: the account was read just before. The 109 is never checked, so no reject would be written |
| P13 | 229 | rejects > 0? | RC 4 / RC 0 | C | RC 4: all sets · **RC 0 not covered** |
| P14 | 239–684 | OPEN/READ/WRITE/CLOSE status checks (×22) | OK / abend | E | OK only. Error paths out of scope (not data-reachable) |

## CBACT04C, INTCALC (652 lines)

| ID | Line | Decision | Outcomes | Class | Expected coverage |
|---|---|---|---|---|---|
| I01 | 188–191 | main loop: read category balances until end of file | next / EOF | C | base (both) |
| I02 | 219 | ELSE of `IF END-OF-FILE = 'N'`: final account update | — | C | **unreachable by construction**: the loop exits before re-entering. This is the last-account defect (notebook §7) |
| I03 | 194 | account changed? | new account / same account | B | both: base (2 category balances per account) |
| I04 | 195 | first account? | skip update / update previous account | B | both: base |
| I05 | 417/436 | rate row for the account's group? | found / status 23 → DEFAULT | B | DEFAULT: base (group field blank, notebook §11) · own group: **c02 only** |
| I06 | 446 | DEFAULT row present? | found / abend | B/E | found: base · **missing DEFAULT → abend not covered** |
| I07 | 214 | rate ≠ 0? | compute interest + fees / skip | B | both: base (50 of 100 category balances skipped) · zero-rate group: c02 |
| I08 | 374 | account of the category balance exists? | found / abend | B/E | found only · **orphan category balance not covered** |
| I09 | 396 | card for the account (alternate key)? | found / abend | B/E | found only · **account without a card not covered** |
| I10 | 1300 | `COMPUTE` without ROUNDED: truncation | — | V | positive values: base (28 of 50 differ from half-up, notebook §14) |
| I11 | 1300 | negative category balance at a non-zero rate → negative interest, truncated toward zero | — | V | **not covered**: the 50 negative balances all sit in zero-rate categories |
| I12 | 1300 | interest truncating to 0.00 is still written | — | V | base (1 transaction of 0.00) |
| I13 | 1300 | several rated categories on one account: one transaction each, summed into the balance | — | V | **not covered** (max 1 interest transaction per card in every set) |
| I14 | 1400 | fees paragraph is an empty stub | — | B | trivially covered (no effect) |
| I15 | 1300-B | interest ID = PARM + a run-wide counter (not per account) | — | B | base · shift: c02 |
| I16 | 237–605 | OPEN/READ/WRITE/CLOSE status checks (×18) | OK / abend | E | OK only. Out of scope |

## Gaps (by analysis, before tracing)

**Reachable by data, not exercised:**
- P11, amount exactly 0;
- P13, a run with no rejects (RC 0);
- I06, DEFAULT row missing (abend);
- I08, orphan category balance (abend);
- I09, account without a card (abend);
- I11, negative interest;
- I13, several rated categories on one account.

**Unreachable:**
- P12, guarded by the read just before;
- I02, the defect.

**Out of scope:**
- the E families (I/O failures).

I11 and I13 matter most for a migration. A builder that rounds toward minus infinity (floor) instead of toward
zero only differs on negative interest (I11). A builder that writes one interest transaction per account
instead of one per category only differs when an account has several rated categories (I13). With no case for
either, the scorer cannot see such a builder's error.

## Step 2: trace confirmation

`tools/coverage.py` re-ran every evaluation set with binaries built with `-ftraceall` (`bin-trace/`). Each traced
run reproduced its golden outputs and return codes byte for byte, so the instrumentation does not change
behaviour. Each outcome was then counted from the trace: `coverage/v1/coverage.md`, with the raw counts in
`coverage.json`.

- **Every branch outcome marked covered above is confirmed by execution.**
- **Every outcome marked not covered executed 0 times:** P12, P13 RC 0, I02, I06 missing, I08 missing,
  I09 missing, and the abend paragraphs of both programs.
- **The defect has independent evidence:** "previous account updated" ran 49 times for 50 accounts, and the
  final-update ELSE (I02) ran 0 times.
- **The data quirk has independent evidence:** in base, the own-group rate is never found (0 of 100 lookups),
  and DEFAULT answers all 100. In c02 the own-group rate is found 3 times.
- **Value partitions (P11, I10–I13) cannot be seen in a statement trace.** Their coverage comes from the golden
  data (notebook §16): no amount of 0, no negative interest, at most one interest transaction per card.

## Step 3: gaps closed by c04

`cases/c04` (expected values committed before its first run, in commit 7ac6cfa) covers:
- **I11:** −123.45 in DEFAULT 01/0002 gives interest −2.57. That is truncation toward zero; a build that floors
  gives −2.58. Self-test mutant m11 confirms the scorer sees it.
- **I13:** account 00000000005 has three rated categories, so its card gets three interest transactions (15.83,
  4.16, 3.75), summed into the balance. Mutant m12 (one transaction per account) is caught.
- **P11:** an amount of exactly 0.00 is posted. Adding 0 gives the same result on the credit or the debit side,
  so P11 is unobservable in the outputs, and a migration cannot diverge on it.

**Still not exercised, by decision:**
- the abend paths I06, I08 and I09 and both programs' E families, which are I/O and data-integrity failures and
  out of scope for v1;
- P13 RC 0, because return codes are not part of the scored outputs;
- P12 and I02, which are unreachable.
