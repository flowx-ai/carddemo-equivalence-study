# A6 pre-score record (written before any A6 output was opened)

Mapper: Claude. Rubric: notebook §25, applied unchanged, with the mapping conventions used for A5. Flags:
`runs/accrue_zflx_{sonnet,opus}_onto/r*/flags.json`, hashed in `runs/FLAGS_A6.sha256`. Wiki TODOs counted for every
build of that wiki, as in A5: Sonnet BR-08 → R-INT-TRUNC; Opus formula, grouping and rounding → R-INT-RATE,
R-INT-TRUNC.

## Flags per build

| Build | Flags (wiki + build) | RATE | TRUNC | TXID | TXFORMAT | ZERO | APPLY | CYC | LAST |
|---|---|---|---|---|---|---|---|---|---|
| Sonnet-onto r1 | 10 | 5 | 2 | 0 | 1 | 0 | 2 | 0 | 0 |
| Sonnet-onto r2 | 12 | 5 | 2 | 1 | 1 | 0 | 2 | 0 | 1 |
| Sonnet-onto r3 | 9 | 4 | 2 | 0 | 1 | 0 | 1 | 0 | 1 |
| Opus-onto r1 | 22 | 10 | 3 | 1 | 2 | 2 | 2 | 2 | 0 |
| Opus-onto r2 | 16 | 6 | 3 | 1 | 1 | 1 | 2 | 1 | 1 |
| Opus-onto r3 | 15 | 6 | 3 | 1 | 1 | 1 | 2 | 1 | 0 |

Entries not mapped (rubric 3): timestamps, architecture, input form, output form and field naming. Entries that
restate a source with no silence/assumption marker are not flags (rubric 1), e.g. Sonnet-onto r1 item 17 and
Opus-onto r1 A12, which state that the last account is posted at end of file without raising it as open.

## R-INT-LAST flags (H10)

The ontology content record (notebook §31) found no end-of-file account handling, so H10 predicts no change.

| Build | R-INT-LAST flagged | Basis |
|---|---|---|
| Sonnet-onto r1 | no | item 17 posts the last account at end of file, stated without doubt |
| Sonnet-onto r2 | yes | A-01: last account in BALCAT order **not** rewritten; wiki silent at the boundary; cites the ontology's control-break fields |
| Sonnet-onto r3 | yes | item 7: last account **not** rewritten ("at each change of account"); conflict with AC 3 noted; switch `applyFinalAccountUpdate` |
| Opus-onto r1 | no | A12 posts at end of file, stated without doubt |
| Opus-onto r2 | yes | A9: last account posted; end-of-file handling "not in any source"; names the alternative reading |
| Opus-onto r3 | no | not mentioned |

A5 (disguised) for comparison: Sonnet r3 and Opus r1 flagged it (2 of 6); A6: 3 of 6.

## Ontology use

From each build transcript (`ontology_probes.txt`, made by `tools/onto_probes.py`). Correction: the
`ontology_use.txt` files written at build time listed only `run_workflow` calls and missed probes run with
`run_workflow_node`; `ontology_probes.txt` supersedes them for probe counts.

| Build | ONTOLOGY node configured | RETRIEVE probes run | Returned |
|---|---|---|---|
| Sonnet-onto r1 | no (list_ontologies only) | 0 | — |
| Sonnet-onto r2 | yes | 1 (end of file / last account) | 0 concepts (END output not mapped) |
| Sonnet-onto r3 | yes | 1 (end of file / last account) | 15 concepts (1050-UPDATE-ACCOUNT, WS-LAST-LACC-NUM, 1000-BALCATF-GET-NEXT, close procedures) |
| Opus-onto r1 | yes | 2 (formula "divided by 1200"; PARM-DATE, suffix, "DEFAULT group", cycle reset) | 15 + 15 concepts |
| Opus-onto r2 | yes | 1 (standard rate on status 23) | 15 concepts |
| Opus-onto r3 | yes | 2 (formula; "default standard group id … divide 1200 rounded") | 15 + 15 concepts |

No ONTOLOGY node is part of any delivered ACCRUE workflow (probes were separate workflows); no build used
DESCRIBE or VALIDATE. Opus-onto r1 and r3 probe strings contain `1200` and `DEFAULT`, values the ontology does not
hold (§31).

## CardDemo citations (recall signature, assumption part)

| Build | Entries citing CardDemo or a CardDemo identifier |
|---|---|
| Sonnet-onto r1–r3 | 0 |
| Opus-onto r1–r3 | 0 |

A5 Opus: 4, 9 and 2. Builder code scanned for `CardDemo`, `CBACT04C`, `Int. for a/c`, `DISCGRP`, `DIS-INT-RATE`:
no hits in any A6 build. The fallback group literal: Sonnet-onto builds use `STANDARD` (wiki BR-02); Opus-onto r1
`DEFAULT`, r2 `DEFAULT` then `STANDARD`, r3 `STANDARD` then `DEFAULT`, each stated as not given by any source.
`DEFAULT` is the CardDemo value and is not in the disguised sources, bundle or ontology; it is counted as recall
without a citation. The A6 Opus transaction constants (`07`, `12`, `Batch`, `Accrued int `) come from the
ontology, cited per entry.

## Data-meaning assumptions (H8)

Classified by a separate Claude agent that read only the 12 assumptions files (no outputs, scores, adapters or
golden files) and applied one written criterion to A5 and A6 alike. An entry counts when (a) it marks its own basis
as absent, silent, inferred, assumed, unverified, ambiguous, contradictory or open, or chooses between readings,
and (b) its subject is encoding, field layout, keys, units, relations or the fallback (protocol H8 classes).
Rounding, timestamps, fees, overflow, cycle resets, last-account handling, output form, transaction id, desc,
architecture, zero/negative handling are excluded. Per-entry tables: `runs/A6_H8_CLASSIFICATION.md`.

**Timing disclosure.** The A6 counts are made before any A6 output is opened. The A5 counts are made now, after the
A5 outputs were opened and scored (§30); the A5 flags were mapped before scoring, but this data-meaning class was
not counted then. The same criterion and the same classifier were used for both arms to limit that bias.

| Arm | r1 | r2 | r3 | Mean |
|---|---|---|---|---|
| A5 Sonnet | 8 | 7 | 6 | 7.00 |
| A6 Sonnet-onto | 5 | 6 | 5 | 5.33 |
| A5 Opus | 10 | 11 | 7 | 9.33 |
| A6 Opus-onto | 8 | 6 | 7 | 7.00 |

Judgement calls marked uncertain by the classifier: "per category balance, not account balance" entries classed as
relations (5 entries, 3 in A5 Opus, 2 in A6 Opus-onto); entries about key sort order, trim or duplicates without a
marker word not counted. Reclassing the balance-basis entries as "-" lowers A5 Opus by 1 per build and Opus-onto
r1, r2 by 1; the direction of every comparison is unchanged.
