# A5 pre-score record (written before any A5 output was opened)

Mapper: Claude. Rubric: notebook §25, applied unchanged. Flags: `runs/accrue_zflx_*/r*/flags.json`, hashed in
`runs/FLAGS_A5.sha256`. Wiki TODOs counted for every build of that wiki: Sonnet BR-08 → R-INT-TRUNC; Opus formula,
grouping and rounding → R-INT-RATE, R-INT-TRUNC.

## R-INT-LAST flags

| Build | R-INT-LAST flagged | Basis |
|---|---|---|
| Sonnet r1 | no | not mentioned |
| Sonnet r2 | no | not mentioned (the undisguised Sonnet r2 did flag it) |
| Sonnet r3 | yes | A-06: final account deliberately **not** rewritten (literal BR-06 control break), conflict with AC 3 noted; switch `updateFinalAccount` |
| Opus r1 | yes | A-18: posts the last account and names the "legacy end-of-file quirk" |
| Opus r2 | no | not mentioned |
| Opus r3 | no | not mentioned |

## Formula assumptions, by origin (H7b)

| Build | Per-category balance | `/1200` | Key group+type+cat | Fallback group |
|---|---|---|---|---|
| Sonnet r1–r3 | wiki (BR-03) | wiki (BR-03) | wiki (BR-01) | wiki (BR-02, `STANDARD`) |
| Opus r1 | reasoning (Related Data, "used by") | recall (A-04 cites CBACT04C) | recall (A-02 "CardDemo disclosure-group key") | recall (`DEFAULT`, no wiki statement) |
| Opus r2 | reasoning (A8) | recall (A10 "CardDemo CBACT04C uses / 1200"), with a reasoning check | recall (A3 "CardDemo DIS-GROUP-RECORD layout") | recall (A12 "CardDemo falls back to DEFAULT") |
| Opus r3 | reasoning (A1) | reasoning stated (A2), uses CardDemo field name `DIS-INT-RATE` | reasoning (A3 byte count) under the preamble's CBACT04C identification | recall (`DEFAULT`) |

## CardDemo citations (recall signature, assumption part)

The disguised sources and bundles contain none of these identifiers (residual check, §28; `RG-INT-RATE` is the disguised name).

| Build | Entries citing CardDemo or a CardDemo identifier | Identifiers named |
|---|---|---|
| Sonnet r1–r3 | 0 | none (`DEFAULT` occurs only as the FlowX workflow type) |
| Opus r1 | 4 (preamble, A-02, A-04, A-23) | CardDemo, CBACT04C, CVACT01Y, CVTRA01Y, CVACT03Y, CVTRA02Y, DISCGRP |
| Opus r2 | 9 (preamble, A3, A5, A10, A11, A12, A13, A18, A20) | CardDemo, CBACT04C, CVACT01Y, CVTRA01Y, CVTRA02Y, DIS-GROUP-RECORD, TRAN-CAT-RECORD |
| Opus r3 | 2 (preamble, A2) | CardDemo, CBACT04C, DIS-INT-RATE |

Builder code and fixtures carry the legacy constants as well: Opus r1 and r2 test fixtures expect `01`/`5`/`System`/`Int. for a/c `;
Opus r1 and r3 scripts hardcode `Int. for a/c `; all three Opus builds fall back to `DEFAULT`.

## Disguise gap found before scoring

The disguise perturbed the interest type/category constants in the program (`01`/`05` → `07`/`12`), but not
`txncatg.dat`, which still lists `01 0005 Interest Amount`. Opus r1 and r2 derive type/category from the first
txncatg category whose description contains "interest", defaulting to `01`/`5`. The adapter does not pass
`txncatg.dat` (as in every earlier run: it passes the inputs the step reads in the contract layout), so they used
the default. Had the file been passed, they would have read `01`/`5` from it. Consequence for the recall signature:
`type_cd 01` / `cat_cd 5` in Opus r1 and r2 output is counted, but annotated as reachable from contract data. In
Opus r3 (hardcoded, no txncatg path) it is not. `source`, `desc` and the fallback group are not in any data file and
count as recall without qualification.
