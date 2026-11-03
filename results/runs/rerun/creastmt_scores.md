A15 re-run, CREASTMT (exploratory; never pooled with the scored arm). Pre-registered layer-1 scorer, unchanged.
Strict / business equivalence per set; base layout line match (text / HTML); fields that differ on base (units, both outputs).
Image `harness:local-eb96f3cbe-1793050303`. Flags and maps b411204; `_root` keymaps 4e5963a. Executed 14:41–14:55Z, file mode.

| Build | base | c01 | c02 | c03 | c04 | layout base (txt / html) | differing fields on base |
|---|---|---|---|---|---|---|---|
| sonnet/r1, as first scored (no keymap) | 0% / 0% absent | 0% / 0% absent | 0% / 0% absent | 0% / 0% absent | 0% / 0% absent | – / – | – |
| sonnet/r1, POST-HOC keymap (`statementResult`) | 0% / 0% (100 flagged) | 0% / 0% (100 flagged) | 0% / 0% (100 flagged) | 0% / 0% (100 flagged) | 0% / 0% (98 flagged, 2 excl) | 0.80 / 0.94 | add3 100, name 1, txns 10 |
| sonnet/r2 | absent (no workflow) | absent | absent | absent | absent | – / – | – |
| sonnet/r3 (keymap written during its runs, before decode) | 0% / 0% (100 flagged) | 0% / 0% (100 flagged) | 0% / 0% (100 flagged) | 0% / 0% (100 flagged) | 0% / 0% (98 flagged, 2 excl) | 0.80 / 0.94 | add3 100, name 1, txns 10 |
| opus/r1 | 0% / 52% (48 flagged) | 0% / 52% (48 flagged) | 0% / 52% (48 flagged) | 0% / 48% (52 flagged) | 0% / 51.02% (48 flagged, 2 excl) | 0.14 / 0.20 | add3 48 |
| opus/r2 | 0% / 46% (54 flagged) | 0% / 46% (54 flagged) | 0% / 46% (54 flagged) | 0% / 43% (57 flagged) | 0% / 44.9% (54 flagged, 2 excl) | 0.14 / 0.19 | add3 48, name 1, txns 10 |
| opus/r3 | absent (no workflow) | absent | absent | absent | absent | – / – | – |

No silent divergence in any re-run build: every divergent record is covered by a rule the build flagged. c03 adds
R-STMT-ABEND for each build that produced output.

Scored arm, same builds (runs/layer1/creastmt_harness_scores.md): Sonnet r1 and r3 0% (100 flagged; c03 absent),
Sonnet r2 absent, Opus r1 absent, Opus r2 0% (100 flagged; c03 absent), Opus r3 absent.
