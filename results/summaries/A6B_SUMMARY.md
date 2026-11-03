# A6b (thin ontology, exploratory) scores: six zflx builds, five sets each

Scored like A5/A6 against `runs/A5_golden/<set>/`. Flags and recall record committed before any output was opened
(`runs/A6B_PRESCORE.md`, 283b048). Decode maps are pure renaming of output keys; record fields already matched.
Exploratory arm (amendment A6b), added after A6 was scored; never pooled with A6.

| Build | Overall | Divergent rules (records over 5 sets) |
|---|---|---|
| Sonnet thin r1 | 99.0% | R-INT-LAST flagged |
| Sonnet thin r2 | 100% | — |
| Sonnet thin r3 | 100% | — |
| Opus thin r1 | 1.4% | R-INT-RATE (251), R-INT-APPLY (238), R-INT-LAST (10), R-INT-TXFORMAT (2): all flagged |
| Opus thin r2 | 1.2% | R-INT-RATE (252), R-INT-APPLY (239), R-INT-LAST (10), R-INT-TXFORMAT (2): all flagged |
| Opus thin r3 | 1.4% | R-INT-RATE (251), R-INT-APPLY (238), R-INT-LAST (10), R-INT-TXFORMAT (2): all flagged |

## Three arms side by side (disguised variant)

| Arm | Sonnet r1 / r2 / r3 | Opus r1 / r2 / r3 |
|---|---|---|
| A5, wiki only | 99.0 / 99.0 / 100 | 1.4 / 1.0 / 1.4 |
| A6b, thin ontology (first extraction) | 99.0 / 100 / 100 | 1.4 / 1.2 / 1.4 |
| A6, full ontology (re-extracted) | 99.0 / 100 / 100 | 1.2 / 99.0 / 99.0 |

## What it shows

- **Opus:** with the thin ontology all three builds fall back to the recalled `DEFAULT` group, find no rate in the
  disguised data, and score like A5. Two of them (r1, r3) set the transaction constants to the CardDemo values
  without a source; r2 cites CBACT04C in seven entries. The A6 Opus gain therefore comes from content only the
  re-extraction holds: the procedure name `1200-A-GET-STANDARD-INT-RATE` (the fallback literal) and the transaction
  constants. The re-extraction decided the A6 Opus result, so it must be reported with the result.
- **Sonnet:** the thin ontology gives the same scores as the full one, and two builds again do not post the last
  account. The thin ontology holds none of the control-break fields that A6 Sonnet r2/r3 cited, so the A6 last-account
  pattern is not attributable to those fields. Across A5, A6b and A6 the Sonnet arm reproduces legacy last-account
  behaviour in 1, 2 and 2 of 3 builds; with three runs per arm that is not a measurable difference.
- **H8 (descriptive):** data-meaning means Sonnet 7.00 / 5.00 / 5.33 and Opus 9.33 / 7.00 / 7.00 (A5 / A6b / A6).
  The thin ontology lowers the count as much as the full one, so the drop does not track rule content.
