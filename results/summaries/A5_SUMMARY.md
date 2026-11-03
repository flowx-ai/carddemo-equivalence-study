# A5 (disguised variant d1) scores: six zflx builds, five sets each

Scored against `golden/d1` with `scorer/compare.py`, unchanged. The scorer takes the last account from the POSTTRAN
category-balance file in the golden folder; `golden/d1` holds only the INTCALC outputs, so `runs/A5_golden/<set>/`
links the frozen `golden/d1` INTCALC outputs with the frozen `golden/v1` POSTTRAN file the step read. A first pass
without that file mis-tagged the last-account divergence as R-INT-APPLY/R-INT-CYC; it was rerun before anything was reported.
Flags were mapped before any output was opened (`runs/A5_PRESCORE.md`, commit 2dddea4).

| Build | base | c01 | c02 | c03 | c04 | Silent rules | Flagged rules | Flags (unneeded, base) |
|---|---|---|---|---|---|---|---|---|
| Sonnet-wiki r1 | 99.00% | 99.00% | 98.99% | 99.00% | 99.03% | R-INT-LAST | — | 12 (12) |
| Sonnet-wiki r2 | 99.00% | 99.00% | 98.99% | 99.00% | 99.03% | R-INT-LAST | — | 12 (12) |
| Sonnet-wiki r3 | 100.00% | 100.00% | 100.00% | 100.00% | 100.00% | — | — | 14 (14) |
| Opus-wiki r1 | 1.00% | 1.00% | 3.03% | 1.00% | 0.97% | — | R-INT-APPLY, R-INT-LAST, R-INT-RATE, R-INT-TXFORMAT | 24 (10) |
| Opus-wiki r2 | 1.00% | 1.00% | 1.01% | 1.00% | 0.97% | R-INT-APPLY | R-INT-CYC, R-INT-RATE, R-INT-TXFORMAT | 17 (7) |
| Opus-wiki r3 | 1.00% | 1.00% | 3.03% | 1.00% | 0.97% | R-INT-LAST | R-INT-APPLY, R-INT-RATE, R-INT-TXFORMAT | 17 (9) |

Undisguised INTCALC for comparison (`runs/INTCALC_zflx_SUMMARY.md`): Sonnet-wiki r1–r3 99.0% each; Opus-wiki r1 100%,
r2–r3 99.0%.

## What happened

- **Sonnet-wiki builds (bundle states every disguised value):** no legacy value in any output, no CardDemo citation.
  - r1 and r2 post the last account as the wiki's FlowX design describes; legacy never posts it. 99.0%, R-INT-LAST
    **silent** in both. The undisguised Sonnet r2 had flagged it; this one did not raise it.
  - r3 matches legacy exactly (100%). It read BR-06 ("at each change of account") literally as a control break,
    so the final account is never rewritten. It flagged the conflict with AC 3 and added a switch. This is the
    legacy defect reproduced **from the wiki's own wording**, with no CardDemo citation, unlike the undisguised
    Opus r1, which reproduced it from memory.
- **Opus-wiki builds (bundle states none of the disguised values):** all three identified the disguised code as
  AWS CardDemo / CBACT04C in their assumptions and filled the wiki's gaps from it.
  - Every account's group is blank, so every rate goes through the fallback. They fell back to the recalled group
    `DEFAULT`, which does not exist in the disguised rate data (`STANDARD`). Result: no interest at all, except one
    transaction in c02, where the case data gives a direct rate. About 1% equivalence on every set.
  - That one transaction has the legacy amount (formula recovered: per category, `/1200`, truncation) but the
    legacy type `01`, category `5`, source `System` and description `Int. for a/c `: four recalled values.
  - r1 and r3 reset cycle totals on every account (legacy behaviour); r2 does not (its least-sure choice), so its
    R-INT-CYC divergence is large. r1 posts the last account (flagged); r3 does too, silently.

## Recall signature

| Build | Assumption entries citing CardDemo | Output fields with a legacy value |
|---|---|---|
| Sonnet-wiki r1–r3 | 0 | 0 (252 transactions each) |
| Opus-wiki r1 | 4 | 4 (1 transaction) + `DEFAULT` fallback in code |
| Opus-wiki r2 | 9 | 4 (1 transaction) + `DEFAULT` fallback in code |
| Opus-wiki r3 | 2 | 4 (1 transaction) + `DEFAULT` fallback in code |

For Opus r1 and r2, `type_cd 01` / `cat_cd 5` is also reachable from `txncatg.dat`, which the disguise did not
perturb (pre-score record). `source`, `desc` and `DEFAULT` are in no data file.

## Hypotheses

- **H5 (no CardDemo citation, recall signature 0): not supported.** Holds for all three Sonnet-wiki builds; fails for
  all three Opus-wiki builds, which name CardDemo and emit recalled values.
- **H6 (Sonnet-wiki builds keep their undisguised equivalence, ±1 record per set): supported.** 99.0%, 99.0%, 100%
  against 99.0% ×3; r3 differs by the one last-account record. Flagging moved: r2 went from flagged to silent on
  R-INT-LAST, r3 now reproduces the defect and flags it.
- **H7 (Opus-wiki builds diverge on R-INT-TXFORMAT, and on R-INT-RATE where the fallback applies): supported**, and
  recall leaking through the disguise is observed in all three (reported as such).
- **H7b (Opus-wiki builds diverge on R-INT-RATE unless they recover `/1200` by reasoning): supported as stated, but
  the mechanism differs.** All three diverge on R-INT-RATE, yet all three recovered the formula (r3 by stated
  reasoning, r1 and r2 citing CBACT04C); the one priced transaction has the legacy amount. The divergence comes from
  the recalled fallback group, not from the formula.

## How to read this

The disguise did its job: it separated wiki-derived behaviour from recalled behaviour. With every value stated,
the Sonnet-wiki builds behave as before and show no recall. With the values left out, the Opus-wiki builds reach
for memory of the public code, and the disguise turns that memory into a near-total divergence. The undisguised
INTCALC scores for the Opus-wiki builds therefore measured recall as much as the wiki, as suspected in §25.
The score is equivalence with legacy, not correctness: Sonnet-wiki r1–r2 follow the wiki's design on the last
account, and r3 keeps a legacy defect because the wiki describes it.
