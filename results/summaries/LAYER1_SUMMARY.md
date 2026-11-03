# Layer 1 (CREASTMT, TRANREPT): scores (2026-10-26)

Protocol A12–A14 (commit c1dcaab, frozen copy `prereg/frozen/a12a14/`, OTS-attested in Bitcoin block 973237 before any
score). Scorer `scorer/report_compare.py`, frozen at 79d5e60. 24 builds: per step, 6 zflx (`claude-opus-5-5`) and 6
harness (`gpt-6.1-sol`, image `harness:local-262994253-1792952514`, digest `sha256:8ffa6ab82fde…`, unchanged at every
check). For each build the flags were mapped by rule from the build's own register and committed before its outputs
were opened (`runs/layer1/builder_flags.json`, `tools/l1_write_flags.py`, hashes in `runs/FLAGS_LAYER1.sha256`).

Business and strict are reported separately. Strict: the unit's lines are identical. Business: the unit's parsed
fields are equal. Absent units are R-ABSENT, silent.

## CREASTMT (account statements, text + HTML; 100 units on base)

| Builder | Wiki | Run | Strict / business, base, c01, c02, c04 | c03 (missing account) | Divergence |
|---|---|---|---|---|---|
| zflx | Sonnet | r1 | **100% / 100%** | 100% / 100% | none |
| zflx | Sonnet | r2 | **100% / 100%** | 100% / 100% | none |
| zflx | Sonnet | r3 | **100% / 100%** | 88% / 88% | 12 extra statements, flagged (R-STMT-ABEND) |
| zflx | Opus | r1 | **100% / 100%** | 88% / 88% | same, flagged |
| zflx | Opus | r2 | **100% / 100%** | 88% / 88% | same, flagged |
| zflx | Opus | r3 | **100% / 100%** | 100% / 100% | none |
| harness | Sonnet | r1 | 0% / 0% | absent | every statement: address line 3, FICO blank; flagged |
| harness | Sonnet | r2 | 0% / 0% | absent | R-ABSENT: rejects record 1 (NUL filler) |
| harness | Sonnet | r3 | 0% / 0% | absent | every statement: address line 3 (FICO in 14); flagged |
| harness | Opus | r1 | 0% / 0% | absent | R-ABSENT: no workflow (plan paused `goal_at_risk`) |
| harness | Opus | r2 | 0% / 0% | absent | every statement: address line 3; flagged |
| harness | Opus | r3 | 0% / 0% | absent | R-ABSENT: "unsupported character encoding" (NUL filler) |

c04's two overflow statements are excluded by S4 and reported separately: the five zflx builds that do not reproduce
them differ there, as expected; zflx Opus r3 reproduces them, from recall of CBSTM03A. Tables:
`runs/layer1/creastmt_zflx_scores.md`, `runs/layer1/creastmt_harness_scores.md`.

## TRANREPT (daily transaction report; 362–370 units)

| Builder | Wiki | Run | Strict (5 sets) | Business (5 sets) | Divergence |
|---|---|---|---|---|---|
| zflx | Sonnet | r1–r3 | 99.72–99.73% | 99.72–99.73% | grand total (R-REPT-LASTDUP), flagged |
| zflx | Opus | r1–r3 | **100%** | **100%** | none (legacy end-of-file behaviour recalled) |
| harness | Sonnet | r1 | 98.65–98.91% | 99.17–99.19% | grand total (LASTDUP), extra last-account total (LASTACCT), header range (HEADER), all flagged; strict only: one zero-amount line |
| harness | Sonnet | r2 | 0% | 0% | R-ABSENT: "Input validation failed" on record 1 (NUL filler) |
| harness | Sonnet | r3 | 0% | 0% | R-ABSENT: "transact.dat line 1: non-ASCII text" (NUL filler) |
| harness | Opus | r1 | 0% | 0% | R-ABSENT: no workflow (`committed_preview_changed`, restart refused 409) |
| harness | Opus | r2 | 0% | 0% | R-ABSENT: "invalid record at line 1" (NUL filler) |
| harness | Opus | r3 | 0% | 0% | R-ABSENT: no workflow (`decide_budget_exhausted`, then `goal_at_risk`) |

Tables: `runs/layer1/tranrept_zflx_scores.md`, `runs/layer1/tranrept_harness_scores.md`.

## What the numbers say

- **zflx:** 12 of 12 builds return output on every set. Every divergence is flagged in the build's own register;
  none is silent. CREASTMT c03 (a card with no account) splits on a rule the wiki leaves open: three builds print
  the 6 extra statements (12 text and HTML units), three follow legacy. TRANREPT splits by wiki: the Opus builds recall the legacy
  end-of-file behaviour (last amount added twice); the Sonnet builds name it and decline to copy it.
- **harness:** 3 of 12 builds have no workflow (CREASTMT Opus r1, TRANREPT Opus r1, r3); 5 of 12 reject the real input on record 1; 4 of 12 return output
  (CREASTMT Sonnet r1, r3, Opus r2; TRANREPT Sonnet r1, and CREASTMT c03 is absent for all of them). When the
  harness does return a TRANREPT report it is close: every detail line and every account total but the last
  matches in business, and the divergences are flagged. The CREASTMT statements differ in business on every unit,
  on address line 3 (all three) and FICO (Sonnet r1, r3); both are flagged in the registers.
- **No silent divergence in any build that returned output.** Every silent outcome is R-ABSENT.
- **Business vs strict:** the two differ only for harness TRANREPT Sonnet r1, by one unit (a zero amount printed
  `.00` where legacy leaves it blank). The frozen scorer does not count pure layout (label spacing, the column
  header line) as business divergence, so no exploratory re-score was needed (§48).

## Did the harness builds follow the contract's report line layouts?

- **CREASTMT** (3 builds with output): line count, order, separators, field positions and pictures, yes. Labels,
  no: all three print `Account ID :        ` where CONTRACT.md has `Account ID         :`, and `Tran Amount` two
  columns left. Both follow the PDF as rendered (next section). Opus r2 also sorts statements by account number
  where legacy follows the cross-reference file order (its register entry 5); statement units are keyed by
  account, so this affects layout line match (0.14) only.
- **TRANREPT** (1 build with output, Sonnet r1): detail, account-total and rule lines character for character;
  column header `Amount` collapsed as in the PDF; 7 pages where legacy prints 18 (the wiki leaves page size a TODO).

## Caveats and instrument findings

- **PDF whitespace collapse (instrument limitation, §48):** `tools/bundle2pdf.cjs` renders inline code with the
  default white-space rule, so runs of spaces inside inline code collapse in every bundle PDF: the three CREASTMT
  labels, `  Tran Amount` and TRANREPT's `        Amount`. The harness builds reproduced the collapsed text; the
  zflx builds printed legacy spacing (they also cite the legacy programs). Effect: strict and layout only for
  CREASTMT statement units (business unaffected, and every harness unit already differs in business); the
  TRANREPT column header is not a unit. The bundles are frozen (A13/A14) and were not re-rendered.
- **NUL filler:** `transact.dat` carries 20 NUL bytes in each record's FILLER, as the legacy COMBTRAN output does.
  Five harness builds reject it; their registers call input encoding unspecified or require printable ASCII. An
  input-format entry is not mapped to a rule (POSTTRAN precedent), so these are silent R-ABSENT.
- **Recall confound (§25):** every zflx Opus build cites the legacy programs from memory; TRANREPT Opus 100% and
  CREASTMT Opus r3's overflow statements cannot be credited to the wiki. All six TRANREPT zflx builds take the 20-line
  page size from recall.
- **Decode-root correction (§50):** two TRANREPT harness adapters pointed at script-node keys; corrected from the
  responses' structure before reading report content, rescored offline. The superseded score is kept.
- **Infrastructure event (§47):** dev-env outage ≈17:50–17:59Z (Kafka volume full; PVC expanded by the coordinator with
  the user's approval). Not caused by the study; the 503 attempts are set aside, not scored.
- **Interventions:** `tools/fxc_relogin.sh` once, proactively, at 19:05:46Z (§49). No zflx relogin was needed.
- **Copybooks:** CONTRACT.md names four input copybooks the bundle does not contain; the three TRANREPT harness Opus builds
  asked for them at the brief and got the recommended answer (proceed), as every gate is answered.
