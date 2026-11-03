# A6 (ontology arm, disguised variant d1) scores: six zflx builds, five sets each

Scored like A5: `scorer/compare.py` unchanged, against `runs/A5_golden/<set>/`. Flags, R-INT-LAST record, ontology
use and H8 counts were committed before any A6 output was opened (`runs/A6_PRESCORE.md`, commit 08c3d92). Decode
maps are pure renaming (Sonnet-onto r3 used camelCase output keys; every record field already had its contract name).

| Build | base | c01 | c02 | c03 | c04 | Overall | Divergent rules (records over 5 sets) |
|---|---|---|---|---|---|---|---|
| Sonnet-onto r1 | 99.0% | 99.0% | 99.0% | 99.0% | 99.0% | 99.0% | R-INT-LAST silent |
| Sonnet-onto r2 | 100% | 100% | 100% | 100% | 100% | 100% | — |
| Sonnet-onto r3 | 100% | 100% | 100% | 100% | 100% | 100% | — |
| Opus-onto r1 | 1.0% | 1.0% | 2.0% | 1.0% | 1.0% | 1.2% | R-INT-RATE (251), R-INT-APPLY (239), R-INT-CYC: all flagged |
| Opus-onto r2 | 99.0% | 99.0% | 99.0% | 99.0% | 99.0% | 99.0% | R-INT-LAST flagged |
| Opus-onto r3 | 99.0% | 99.0% | 99.0% | 99.0% | 99.0% | 99.0% | R-INT-LAST silent |

A5 for comparison (`runs/A5_SUMMARY.md`): Sonnet 99.0 / 99.0 / 100%; Opus 1.4 / 1.0 / 1.4%.

## What happened

- **Opus with the ontology:** r2 and r3 match legacy on every record except the last account.
  - Formula and truncation: same inference as A5 (monthly, /1200, truncate), now resting on the ontology's
    "used to compute monthly interest" with no CardDemo citation.
  - Fallback group: r2 tries `DEFAULT` then `STANDARD`; r3 tries `STANDARD` then `DEFAULT`. The disguised data uses
    `STANDARD`, which the ontology carries only inside the procedure name `1200-A-GET-STANDARD-INT-RATE` (the
    disguise renamed the procedure along with the literal, `disguise/d1/map.json`). Both builds say no source gives
    the literal and accept either spelling.
  - Transaction constants (`07`, `12`, `Batch`, `Accrued int `) come from the ontology, cited per entry. A5 Opus used
    the recalled legacy values.
  - r1 falls back to `DEFAULT` only (the CardDemo value, uncited), and abends on the first balance record, as its
    A10 says it should when the standard record is missing: about 1%, like A5.
- **Sonnet with the ontology:** r1 posts the last account (silent), like A5 r1/r2. r2 and r3 do not post it, so they reproduce the legacy
  defect. Both flagged that choice and cited the ontology's control-break fields (`WS-FIRST-TIME`, `WS-LAST-LACC-NUM`) next to BR-06; r3 probed
  the ontology for end-of-file handling and got those fields back.

## Hypotheses

- **H8 (fewer data-meaning assumptions with the ontology): supported, descriptively.** Means Sonnet 7.00 → 5.33,
  Opus 9.33 → 7.00 (pre-score record; A5 counted after A5 was scored, disclosed there). Three runs per arm, no test.
- **H9 (ontology lowers R-INT-RATE and R-INT-TXFORMAT divergence for Opus): supported for two of three builds.**
  R-INT-RATE records: A5 251 / 251 / 251, A6 251 / 0 / 0. R-INT-TXFORMAT: A5 2 / 2 / 2, A6 0 / 0 / 0. The R-INT-RATE gain
  is the fallback group literal, read from a procedure name; the formula was already inferred in A5.
- **H10 (no change on R-INT-LAST, since the ontology has no end-of-file rule): not refuted, with a counter-signal.**
  Legacy last-account behaviour reproduced: A5 1 of 6 (Sonnet r3), A6 2 of 6 (Sonnet-onto r2, r3). Flagged: A5 2 of
  6, A6 3 of 6. With three runs per arm this is no evidence of a change, but both builds that reproduced it cite
  ontology fields as part of their basis. A5 Sonnet r3 reached the same choice from BR-06 alone.

## Recall

No A6 assumption entry or builder file cites CardDemo or a CardDemo identifier (A5 Opus: 4, 9, 2 entries). The only
legacy value in A6 is the `DEFAULT` group in the three Opus builds, stated as an assumption without citation; it
decides Opus-onto r1's result.

## Notes

- The ontology was used at build time by five of six builds (RETRIEVE probes, `ontology_probes.txt`); no delivered
  workflow contains an ONTOLOGY node.
- Opus-onto r1 base/c01/c03/c04 return no transactions and no account updates (abend at record 1); c02 returns one.
