# A6b pre-score record (thin ontology, exploratory; written before any A6b output was opened)

Mapper: a separate Claude agent, read-only, given rubric §25, the A5/A6 mapping conventions, two A6 flag files as
worked examples and the H8 criterion of `A6_PRESCORE.md`. It read only the six assumptions files. Spot-checked by
the main agent (Opus thin r1 A9, Sonnet thin r2 A-03, Opus thin r3 A-12, Sonnet thin r3 item 13: all as mapped).
Flags: `runs/accrue_zflx_{sonnet,opus}_thin/r*/flags.json`, written by `tools/a6b_write_flags.py`, hashed in
`runs/FLAGS_A6B.sha256`. Uncertain calls are listed in the agent report (offsets derived from absent copybooks →
R-INT-RATE; key order with a silence marker → R-INT-TXID; input-form entries counted for data meaning only).

| Build | Flags (wiki+build) | RATE | TRUNC | TXID | TXFORMAT | ZERO | APPLY | CYC | LAST | Data-meaning | R-INT-LAST entry | Fallback literal | CardDemo citations |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Sonnet thin r1 | 13 | 5 | 2 | 2 | 2 | 0 | 1 | 0 | 1 | 7 | A22, posts, wiki silent on EOF | STANDARD (BR-02) | 0 |
| Sonnet thin r2 | 8 | 2 | 2 | 1 | 1 | 0 | 1 | 0 | 1 | 4 | A-03, does **not** post (BR-06 literal), switch | STANDARD (BR-02) | 0 |
| Sonnet thin r3 | 11 | 3 | 2 | 1 | 3 | 0 | 1 | 0 | 1 | 4 | item 13, does **not** post, switch | STANDARD (BR-02) | 1 (item 13: "CardDemo-style loop") |
| Opus thin r1 | 14 | 5 | 3 | 1 | 1 | 1 | 1 | 1 | 1 | 4 | A9, posts, names the EOF alternative | DEFAULT ("usual convention") | 0 |
| Opus thin r2 | 18 | 8 | 3 | 1 | 2 | 1 | 1 | 1 | 1 | 8 | A16, posts, names the CBACT04C EOF defect | DEFAULT (cites CBACT04C) | 7 entries (CBACT04C, TRAN-CAT-BAL, DIS-INT-RATE) |
| Opus thin r3 | 20 | 9 | 3 | 2 | 2 | 1 | 1 | 1 | 1 | 9 | A-12, posts, "known end-of-file defect", switch | DEFAULT ("usual RATEGRP convention") | 0 |

Data-meaning means: Sonnet thin 5.00 (A5 7.00, A6 5.33); Opus thin 7.00 (A5 9.33, A6 7.00).

**Recall (assumption part).** Opus thin r1 (A11) and r3 (A-08) set the transaction constants to the CardDemo values
`01`, `5`, `System`, `Int. for a/c ` without a source; r3 says they "follow the legacy interest-posting convention,
not the wiki". The thin ontology holds none of the perturbed values (`07`, `12`, `Batch`, `Accrued int `), as the
A6b content record states. All three Opus thin builds fall back to `DEFAULT`; the data uses `STANDARD`.
All six flag R-INT-LAST; four post the last account, two do not.

**Ontology use:** Opus thin r1, r2, r3 ran one RETRIEVE probe each; no Sonnet thin build did (`ontology_probes.txt`).
