# H8 data-meaning classification (A5 and A6, disguised, ACCRUE)

Classifier: a separate Claude agent, read-only, given only the 12 assumptions files and the criterion in
`A6_PRESCORE.md` § Data-meaning assumptions. Listed: the entries that count (entry, line, class, marker). (U) =
marked uncertain by the classifier, choice shown. Every other entry was classed "-" or lacked a marker.

| Build | File | Entries | Counted entries (line: class) | Count |
|---|---|---|---|---|
| Sonnet r1 | builder/output/assumptions.md | 24 | A2 24 layout · A3 37 encoding · A4 42 layout · A5 46 keys · A8 62 fallback · A14 91 relations · A20 117 relations · A21 121 keys | 8 |
| Sonnet r2 | builder/output/assumptions.md | 26 | A-03 28 layout (U) · A-04 32 layout+encoding · A-11 72 fallback · A-12 76 keys · A-14 86 relations · A-16 95 layout · A-18 105 relations | 7 |
| Sonnet r3 | builder/assumptions.md | 23 | A-01 19 layout · A-02 28 encoding · A-05 41 keys · A-09 59 fallback · A-13 73 relations · A-16 85 relations | 6 |
| Opus r1 | builder/out/assumptions.md | 27 | A-01 24 relations (U) · A-02 34 keys · A-03 40 fallback · A-04 47 units · A-13 91 relations · A-15 101 keys · A-21 135 relations · A-23 146 layout · A-24 160 encoding (U) · A-25 165 layout (U) | 10 |
| Opus r2 | builder/out/assumptions.md | 25 | A1 24 layout · A2 25 layout (U) · A3 26 layout+keys · A4 27 layout (U) · A5 28 layout · A7 30 encoding · A8 36 relations (U) · A9 37 keys · A10 38 units · A12 40 fallback · A21 54 relations | 11 |
| Opus r3 | builder/out/assumptions.md | 19 | A1 19 relations (U) · A2 29 units · A3 34 layout · A4 40 fallback · A10 88 keys · A11 94 relations · A12 100 relations | 7 |
| Sonnet-onto r1 | builder/assumptions.md | 24 | 5 31 layout · 6 41 encoding (U) · 10 59 fallback · 15 77 relations · 18 90 relations | 5 |
| Sonnet-onto r2 | builder/out/assumptions.md | 23 | A-07 58 relations · A-10 78 fallback · A-11 86 relations · A-17 120 encoding (U) · A-19 135 keys · A-23 160 layout (U) | 6 |
| Sonnet-onto r3 | builder/assumptions.md | 24 | 11 52 fallback · 12 56 encoding (U) · 15 72 relations · 19 87 relations · 21 98 layout (U) | 5 |
| Opus-onto r1 | builder/outputs/assumptions.md | 30 | A1 12 units · A3 20 relations (U) · A9 38 fallback · A11 43 keys · A18 64 relations (U) · A22 79 relations · A25 90 encoding · A26 94 layout (U) | 8 |
| Opus-onto r2 | builder/assumptions.md | 23 | A1 14 units · A3 26 relations (U) · A5 37 fallback · A17 90 relations · A19 103 layout · A20 109 relations | 6 |
| Opus-onto r3 | builder/output/assumptions.md | 16 | A1 15 units · A3 34 keys (U) · A4 43 keys (U) · A5 50 fallback · A8 76 relations · A9 81 relations · A13 117 encoding | 7 |

Recurring calls: entries about sort order, trim or duplicate keys whose only basis is "a KSDS is read in key order"
or a composite key, with no marker word, were not counted. "Input may be fixed-width or JSON" entries count as
layout only with a marker. Opus-onto r3 heads every entry "Assumed:"; it decides only A3 and A4, which also
choose between readings.
