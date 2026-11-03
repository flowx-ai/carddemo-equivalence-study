# CardDemo equivalence study

A pre-registered test of whether FlowX.AI implementations of a COBOL application, built through **FlowX Platform MCP**
by a coding agent that sees only an agent-generated wiki of the legacy code, produce the same outputs as the original
programs: first the four steps of the nightly batch chain, then four online screens (A24), then the whole base
application (A32).

**Paper:** `paper/CardDemo_equivalence_study_v1.0.pdf` (version 1.0, 2026-11-03, FlowX.AI).

**Names.** Folder and file names keep the study's internal labels: `zflx` is FlowX Platform MCP. The protocol also
registered a second builder, the **FlowX Developer Agentic Harness** (`harness` in folder names), an earlier in-product
builder; its results are summarised under "Second registered builder" below and are never pooled with FlowX Platform
MCP.

**Subject:** AWS CardDemo, open source (Apache-2.0), commit `59cc6c2fd7ebd7ef7925cad552a01a4b8b6e4d5e`
(https://github.com/aws-samples/aws-mainframe-modernization-carddemo).

## What was tested

1. **Oracle.** The unmodified CardDemo batch programs are compiled with GnuCOBOL 3.2 and run on CardDemo's sample
   data plus four targeted case sets. Their outputs are the "golden" reference (`golden/v1`, frozen with
   `SHA256SUMS`). An independent Python reimplementation of each step (`tools/ref_*.py`) reproduces every golden
   output.
2. **Wikis.** FlowX.AI's legacy agent read the whole CardDemo codebase and wrote a wiki, twice: once on a Sonnet
   model (detailed) and once on an Opus model (thin; several rules left as TODO). Per step, the relevant pages were
   bundled as PDF plus Markdown (`inputs/wikis/`).
3. **Builds.** A coding agent (`claude-opus-5-5`) working through FlowX Platform MCP (`zflx`), in an isolated
   directory, built each step from one bundle, three times per wiki. The prompts are in `inputs/wikis/prompt-*.txt`
   and next to the disguise and ontology bundles. "Sonnet" and "Opus" in run names refer to the wiki a build was
   given, not the model that built it.
4. **Flags.** Before any output was opened, each build's own assumption register was mapped to scoring rules
   (`flags.json`) and committed, with hashes in `results/summaries/FLAGS_*.sha256`.
5. **Scoring.** Each build's workflow was run on the five sets and compared with legacy record by record
   (`scorer/compare.py`) or, for the statement and report steps, statement by statement and report line by report
   line (`scorer/report_compare.py`). A divergence is **flagged** if the build named that behaviour as uncertain
   beforehand, **silent** if it did not. A missing output counts as a silent divergence (R-ABSENT).

The metric is **equivalence with legacy, not correctness.** Where a build differs from legacy because legacy has a
defect (for example, interest calculation never rewrites the last account), the build "differs from legacy"; whether
a migration should keep such a defect is a business decision.

### Evaluation sets

| Set | Content |
|---|---|
| `base` | CardDemo's shipped sample data (50 accounts, about 300 daily transactions) |
| `c01` | posting validation: all four reject reasons and boundary cases |
| `c02` | interest-rate paths: own group, zero rate, unknown group |
| `c03` | a card cross-reference with no account |
| `c04` | interest value partitions: negative interest, several rated categories, zero amount |

### Pre-registration

The protocol was frozen (git tag `protocol-v1`, 2026-10-24) before any build was scored. Every later change is a
dated amendment (A1–A32) in `protocol/PROTOCOL.md`. The package and each later amendment were hashed and the hash
was timestamped with OpenTimestamps, anchored in Bitcoin, before the scores they govern were computed. The package
itself (`protocol/frozen/CardDemo_preregistration.zip`) is published with this repository; the timestamps, not the
publication date, carry the order. See `protocol/VERIFY.md`.

## Results

24 scored FlowX Platform MCP builds over the four COBOL steps of CardDemo's nightly batch (6 per step: 2 wikis × 3
runs), plus 18 disguise and ontology builds on interest calculation. Every build is counted, including the ones that
produced nothing. Full tables: `results/summaries/`.

### Interest calculation (INTCALC, CBACT04C)

| Builder | Wiki | r1 | r2 | r3 |
|---|---|---|---|---|
| FlowX Platform MCP | Sonnet | 99.0%, last account **silent** | 99.0%, flagged | 99.0%, flagged |
| FlowX Platform MCP | Opus | 100% (legacy defect reproduced from recall) | 99.0%, flagged | 99.0%, flagged |

Business equivalence, every set (c02 98.99%, c04 99.03% where 99.0% is shown). The one divergent record in every
99% build is account 50, which legacy never rewrites.

### Transaction posting (POSTTRAN, CBTRN02C)

| Builder | Wiki | r1 | r2 | r3 |
|---|---|---|---|---|
| FlowX Platform MCP | Sonnet | 100% | 100% | 100% |
| FlowX Platform MCP | Opus | 100% (legacy rules recalled) | 84.7–87.4%, all flagged | 85.7–87.4%, all flagged |

The Opus wiki gives a credit rule that differs from legacy; builds following it differ on about 12 postings per set
and flag each one.

### Statements (CREASTMT, CBSTM03A)

| Builder | Wiki | r1 | r2 | r3 |
|---|---|---|---|---|
| FlowX Platform MCP | Sonnet | 100% | 100% | 100% on 4 sets, 88% on c03 (flagged) |
| FlowX Platform MCP | Opus | 100% on 4 sets, 88% on c03 (flagged) | same | 100% |

Strict and business shown together where equal. On `c03` legacy abends at a card with no account; the 88% builds
write the 6 remaining statements and said in advance they would.

### Transaction report (TRANREPT, CBTRN03C)

| Builder | Wiki | r1 | r2 | r3 |
|---|---|---|---|---|
| FlowX Platform MCP | Sonnet | 99.72–99.73%, flagged | same | same |
| FlowX Platform MCP | Opus | 100% (legacy end-of-file behaviour recalled) | 100% | 100% |

The FlowX Platform MCP Sonnet builds name legacy's double-counting of the last amount in the grand total and decline to copy it.

### Summary across the four steps

- **FlowX Platform MCP, detailed (Sonnet) wiki:** 12 of 12 builds produced output on every set. One divergence was silent
  (INTCALC Sonnet r1, the last account); every other divergence was flagged before scoring.
- **Thin (Opus) wiki:** builds often match by recalling the public CardDemo source. Those matches are not counted as
  evidence for the wiki.

### Recall control (disguise, A5) and ontology arms (A6, A6b), interest calculation only

CardDemo is public and the models know it. A5 disguises identifiers and perturbs five values so that recalled values
differ from the disguised data; the oracle is re-run on the disguised source (`golden/d1`).

| Arm | Sonnet wiki r1 / r2 / r3 | Opus wiki r1 / r2 / r3 |
|---|---|---|
| Undisguised | 99.0 / 99.0 / 99.0 | 100 / 99.0 / 99.0 |
| A5, disguised, wiki only | 99.0 / 99.0 / 100 | 1.4 / 1.0 / 1.4 |
| A6b, plus thin ontology (exploratory) | 99.0 / 100 / 100 | 1.4 / 1.2 / 1.4 |
| A6, plus full ontology | 99.0 / 100 / 100 | 1.2 / 99.0 / 99.0 |

The detailed-wiki result holds under disguise; the thin-wiki result collapses, which shows the undisguised Opus-wiki
scores measured recall as much as the wiki. Under disguise the last-account divergence became silent in more builds:
4 of 6 A5 builds have a silent divergence. The disguise has been run on interest calculation only.

### Change request: the spec changes, the code does not (A16, A21)

Each rule was changed once in the Sonnet wiki and once in the COBOL (`cr/`), and the changed program was re-run as
the oracle (`golden/cr1`–`golden/cr8`). The wiki states the new rule as the rule, with no change marker, and the
bundles carry neutral names. A build "followed the change" when the changed records match `golden/crN`; "kept
legacy" when they match `golden/v1`. CR1 can be supplied from memory (proposed in CardDemo's public tracker); none of
CR2–CR8 was found proposed anywhere in 44 searches (`cr/NOVELTY_CR3_8.tsv`).

| CR | Step | Rule | r1 / r2 / r3 (business, all five sets) |
|---|---|---|---|
| CR1 | INTCALC | interest rounded to the cent | 99.0 / 99.0 / 99.0, followed |
| CR2 | POSTTRAN | over-limit at `creditLimit × 1.10` | 100 / 100 / 100, followed |
| CR3 | INTCALC | accounts open ten years or more: rate − 2.00 | 99.0 / 99.0 / 99.0, followed |
| CR4 | POSTTRAN | at most four purchases per card per run | 100 / 100 / 100, followed |
| CR5 | POSTTRAN | post in ascending amount order | 100 / 100 / 100, followed |
| CR6 | CREASTMT | Total EXP sums charges only | 0 / 0 / 100 (88 on c03); r1, r2 other (address line, flagged), r3 followed |
| CR7 | TRANREPT | interest postings left out of the report | 99.68 / 99.68 / 99.68, followed |
| CR8 | CREASTMT | FICO score band in place of the score | 100 (88 on c03) ×3, followed |

- **FlowX Platform MCP:** 24 of 24 builds; 22 followed the change, 2 "other" (CR6 r1, r2: an unrelated, flagged address
  divergence on every statement), 0 kept legacy. H11 supported for CR1 and CR2; H14 not refuted (0 of 3 builds kept
  legacy silently on every rule). The 99% cells are the legacy last-account record (R-INT-LAST), as in the
  unchanged INTCALC builds.
- A21 has two known limits stated before any build: the step wikis' own TODOs map to the CR6 and CR7 rules under the
  unchanged rubric, so H14 cannot be refuted on those two rules; and the record-level outcome rule cannot separate
  the CR field from an unrelated divergence on the same record (CR6 r1, r2). A per-field check, labelled
  supplementary, gives "followed" on every changed record of all 18 FlowX Platform MCP builds.

### Wiki ablation on the disguised INTCALC (A17)

Four specifications of the same step, on the disguised source (`golden/d1`): the detailed Sonnet wiki, a summary
(process page to Business Rules, record layouts, contract), no wiki (layouts and contract) and the code only.
Business equivalence on the base set, r1 / r2 / r3 (the other sets are within a few hundredths, see the
summaries; strict differs only where a summary build recalled text constants or wrote midnight timestamps):

| Arm | r1 / r2 / r3 |
|---|---|
| detailed wiki | 99.0 / 99.0 / 99.0 |
| summary | 99.0 / 99.0 / 2.0 |
| no wiki | 1.0 / 2.0 / 2.0 |
| code only | 100 / 100 / 100 |

- **H12** (detailed no more than 1 point below code): supported at the margin (0.996 points).
- **H13** (detailed more than 1 point above summary): not supported; the summary builds filled the gap from recall
  of the public source.
- **Instrument check** (no wiki more than 5 points below detailed): passes.

### Online screens (A24)

One wiki, four screens (sign-on, main menu, account view, bill payment), FlowX Platform MCP builds r1–r3, scored
against the original screens on a stand-in for the mainframe's online system (`golden-online/v1`; there is no
reference CICS). As registered: H15 (the payment's file state) not refuted; H16–H19 (screen content, account-view
data, browser behaviour, end to end) refuted. r2 was cut off by the account's usage limit and is scored as it stands
(`results/runs/a24/`).

### The whole base application (A32, FlowX Platform MCP only)

17 online programs, the date utility CSUTLDTC and 11 batch programs, built three times from one wiki of the whole
application (234 pages), scored on answer keys frozen before the amendment (`golden/v1`, `golden/full-v1`,
`golden-online/v1`, `golden-online/v2`): 54 screen cases, 23 batch cases, 4 end-to-end pairs and 9 browser cases.
Each hypothesis is refuted if two or more of three builds fail it, decided on units that do not rest on
R-CEE-PIC8 (the stand-in's reading of one date service, reported in its own column).

| Hypothesis | r1 | r2 | r3 | Verdict |
|---|---|---|---|---|
| HF1 all 17 screens built and reachable | 4 not reachable, 2 differ | 2 not reachable, 1 differs | 3 not reachable, 1 differs | refuted |
| HF2 programs whose screens differ only where flagged | 0 of 17 | 1 of 17 | 1 of 17 | refuted |
| HF3 money files, silent units | 0, holds | 0, holds | 0, holds | **not refuted** |
| HF4 list paging, units equal | 336 of 348 | 336 of 348 | 336 of 348 | refuted |
| HF5 browser cases, all steps as legacy | 5 of 9 | 8 of 9 | 1 of 9 | refuted |
| HF6 end to end, pairs that carry through | 0 of 4 (absent) | 2 of 4 | 2 of 4 | refuted |
| HF7 export and import round trip | fails | fails | fails | refuted |

The target claim, batch to working screens both checked against the original, is not stated. A32's contract adds a
job-request store, a run date the operator sets before each build, and a text on dates on screens, which A24's did
not carry, so A32 is not an improvement on A24 and is never shown as one. Per-program counts:
`results/runs/full/A32_RESULTS.md` (regenerate with `python3 tools/a32_results_table.py`). Instrument fixes 7–10
were made after the freeze and before the output they first served was executed; fix 11 is a post-hoc browser
sensitivity (`browser_fix11/`) and decides nothing. r1–r3 cost $37.67, $35.62 and $35.77 and took 69, 75 and 74
minutes.

### Not in this repository

- The online candidate sessions (each build's per-case screen captures and session records); scores, per-case
  reports and the browser results are included.

## Second registered builder: FlowX Developer Agentic Harness

The protocol registered a second builder from the start: the FlowX Developer Agentic Harness (`harness`), an earlier
in-product builder, driven through its API with every gate answered with its recommended option (`gpt-6.1-sol`). The
originally registered primary condition was one of its arms (INTCALC, Sonnet wiki, H1–H4). The paper centres on
FlowX Platform MCP by the authors' choice, made after both builders' results were known, and summarises this builder
in its Appendix A. Every one of its builds is here, scored as it stands, and nothing is pooled with FlowX Platform
MCP; the two builders used different models.

**Versions.** The arms after A15 ran on versions built from open, unmerged platform changes, each named in an
amendment stamped before its builds. A defect of this builder stops an arm; the correction, the new version and the
rerun are a new amendment. Builds already scored are never replaced. `results/HARNESS_STOPS.md` lists every stop;
engineering details of the corrections are not part of this repository.

### First scored run, four steps

7 of 24 builds produced output. The primary condition (INTCALC, Sonnet wiki) returned no records, so H1, H2 and H4
are not supported and H3 is not assessable there.

| Step | Wiki | r1 | r2 | r3 |
|---|---|---|---|---|
| INTCALC | Sonnet | 0%: rejects the blank account group | 0%: nothing saved (script size limit) | 0%: rejects the blank account group |
| INTCALC | Opus | 0%: rejects groups with several rates | 0%: rejects duplicate disclosure groups | 0%: paused after step 1 of 3, same check |
| POSTTRAN | Sonnet | 0%: rejects blank `group_id` | 100% | 0%: card numbers parsed as JavaScript numbers overflow |
| POSTTRAN | Opus | 72.4–74.5%, all flagged | 0%: no workflow (restart deadlock) | 72.4–74.5%, all flagged |
| CREASTMT | Sonnet | 0%: address line 3 and FICO differ on every statement, flagged | 0%: rejects NUL filler bytes | 0%: address line 3 differs, flagged |
| CREASTMT | Opus | 0%: no workflow | 0%: address line 3 differs, flagged | 0%: rejects NUL filler bytes |
| TRANREPT | Sonnet | 99.17–99.19% business, 98.65–98.91% strict, all flagged | 0%: rejects NUL filler | 0%: rejects NUL filler |
| TRANREPT | Opus | 0%: no workflow | 0%: rejects NUL filler | 0%: no workflow |

Exploratory deletion-only repairs of the INTCALC builds (A9, A10): Sonnet r1 and r3 reach 99.00 / 99.00 / 98.99 /
99.00 / 99.03% after one or two deleted input checks (Sonnet r1 still fails c03); the three Opus builds cannot be
repaired by deletion, as their rate model has no fallback for the blank group. Repairs are reported next to, never in
place of, the 0% scores. Two builds match legacy at 99–100% (POSTTRAN Sonnet r2, TRANREPT Sonnet r1); the rest stop
on input the legacy programs accept (a blank field, 16-digit card numbers held as numbers, NUL filler bytes) or on
platform defects that leave no workflow. No build of this builder that returned records differed from legacy
silently.

### Re-run after fixes (A15, exploratory) and the A18(b) correction

Each scored Agentic Harness build was rebuilt once on a corrected Agentic Harness version, with the same
driver, prompts, bundles, adapters and scorers. Reported next to the scored Agentic Harness results, never pooled with or in
place of them (`results/summaries/RERUN_SUMMARY.md`, per-step tables in `results/runs/rerun/`). TRANREPT has 1 of 6
re-run builds: it was stopped early by the author's decision.

- More builds produce output: INTCALC 5 of 6 (one only after a disclosed post-hoc decoder correction), POSTTRAN 4
  of 6 with records (Sonnet r2 and r3 at 100%), CREASTMT 4 of 6 (one only after a post-hoc keymap), TRANREPT Sonnet
  r1 at 99.45–99.46% business.
- Silent divergences remain only in INTCALC (R-INT-LAST in the Sonnet-wiki builds, R-INT-APPLY in the Opus-wiki builds).
- **A18(b):** up to 2026-10-27 the Agentic Harness driver had retried a build's own failed check as if it were a platform
  error, which A2 does not allow. The three affected builds were re-executed on the version left by the first
  attempt: all three figures are identical to the reported ones (`results/runs/*/r*/posthoc_a18b/`).

### Four steps on the latest versions (A18 (a), exploratory)

The registered re-run of all 24 Agentic Harness builds of the four steps, with the same wikis, prompts, gate rules,
scorers and flag procedure: Sonnet r1 of each step on the R20 version (A30), the other 20 builds on the R21 version
(A31); never pooled with each other or with earlier versions (`results/runs/a30/a18a/`, `results/runs/a31/a18a/`).
All 24 returned output on every set; 23 completed and 1 (POSTTRAN, Opus wiki, r3) ended early and is scored as it
ended. Business equivalence (CREASTMT and TRANREPT strict / business):

| Step | Sonnet wiki | Opus wiki |
|---|---|---|
| INTCALC | r1 98.99–99.03 (last account silent); r2 0.97–6.06 (rejects an empty group id; silent); r3 98.99–99.03 (flagged) | r1–r3 0.97–1.01 (flagged) |
| POSTTRAN | r1, r2 100; r3 26.40–26.59 (flagged) | r1–r3 72.38–74.53 (6 silent records at base each) |
| CREASTMT | r1–r3 0 / 0 (flagged) | r1, r2 0 / 0 (flagged); r3 0 / 24–26 (flagged) |
| TRANREPT | r1 98.92–99.18 / 99.45–99.46; r2, r3 98.11–98.37 / 99.17–99.19 (flagged) | r1 98.92–99.18 / 99.45–99.46 (1 silent unit); r2 13.22–14.02 / 13.77–14.56 (flagged); r3 98.65–98.91 / 99.17–99.19 (1 silent unit) |

### Change requests (A16, A21)

| CR | Step | Rule | r1 / r2 / r3 (version) |
|---|---|---|---|
| CR1 | INTCALC | interest rounded to the cent | 99.0 / 99.0 / 99.0, followed (A19 image) |
| CR2 | POSTTRAN | over-limit at `creditLimit × 1.10` | 2.6–3.3 / 100 / 0, other / followed / other (A19 image) |
| CR3 | INTCALC | accounts open ten years or more: rate − 2.00 | 99.0 / 99.0 / 99.0, followed (A20) |
| CR4 | POSTTRAN | at most four purchases per card per run | 99.1–100, other / 32.6–32.9, followed / 0, other (A23) |
| CR5 | POSTTRAN | post in ascending amount order | 100 ×3, followed (A23) |
| CR6 | CREASTMT | Total EXP sums charges only | 0 ×3, other (address line, flagged) (R13, A25) |
| CR7 | TRANREPT | interest postings left out of the report | 99.36–99.37 ×3, followed (R13, A25) |
| CR8 | CREASTMT | FICO score band in place of the score | 0 ×3, other (address line, flagged) (R13, A25) |

- **Agentic Harness:** the A16 arm stopped on the A18 image after 2 builds (Agentic Harness defect D1; CR1 r1 followed the change,
  CR1 r2 left no workflow) and was rerun in full on the A19 image (A19). CR2 r1 and r3 require a caller-supplied
  timestamp (and r3 a start id) that the renaming-only adapter does not carry, so they post nothing ("other"). The
  A21 Agentic Harness arm stopped after 5 of 18 builds (D5) and was completed on later versions: CR4 and CR5 under A23, CR6
  to CR8 under A25 (`results/HARNESS_STOPS.md`). Of the 18 counted builds, 10 followed the change, 8 are "other" and
  none kept legacy silently: H14h not refuted on each rule and overall. CR6 and CR8 are "other" because every
  statement differs from legacy on a flagged address line; a post-hoc field count, labelled as such, shows the
  changed field followed. Exploratory reruns on the latest versions (A28–A31: CR6, CR7 r2 and r3, CR8) give the same
  outcome classes (`results/runs/a28/`, `results/runs/a31/harness/`).

### Wiki ablation (A17), A20 version

| Arm | r1 / r2 / r3 |
|---|---|
| detailed wiki | 99.0 / 99.0 / 99.0 |
| summary | 0.0 / 49.0 / 49.0 |
| no wiki | 1.0 / 1.0 / 1.0 |
| code only | 100 / 100 / 0 (no workflow, D4) |

H12h supported at the margin (0.996 points); H13h supported (50.2 points); the instrument check passes.
- The Agentic Harness arm stopped once on the A19 image (D2, detailed r1, reported as a separate partial result) and once on
  a platform stop before any plan (D3), which A22 made retryable once; it was completed on the A20 image.

### Screens (A24) and the whole base application (A32)

**Screens (A26–A31).** Registered on three builds of its own and re-registered on each new
version. No Agentic Harness build built a screen. The two counted builds (A30 r1, A31 r2) both ended with nothing
built and are scored absent, so H15h–H18h are refuted on two of three builds as registered; H19h was not run. Both
stops were read as the builds' own before any output was opened, and are reported for a ruling: read as defects of
the Agentic Harness, they would leave the arm with no verdict (`results/HARNESS_STOPS.md`,
`results/runs/a30/a24h/`, `results/runs/a31/a24h/`).

**Whole base application.** Not run: the A32 bundle is 270,305 characters and the deployed version accepts at most
140,000.

**Time.** First scored run: 9.2–49.7 minutes per build (median 20.4, 24 builds); its dollar cost is not logged.

## Caveats

- **Recall.** All FlowX Platform MCP builds used one builder model; recall of the public source reaches even detailed-wiki builds
  on a few details (the report's 20-line page, a `STRING … DELIMITED BY` rule). The disguise test covers one step.
- **Scale.** Demo-sized data: 50 accounts, about 300 transactions a day, plus targeted cases. Four programs of
  649–1,154 lines.
- **Flag granularity.** Flags are matched per rule, so one flag covers every divergence under that rule. Unneeded
  flags are reported per build.
- **Flag mapper.** Flags were mapped from each build's register by an AI assistant (Claude), by a fixed rubric,
  before outputs were opened (protocol §6).
- **Instrument limitation.** The bundle PDFs collapse runs of spaces inside inline code; this affects strict layout
  of three statement labels (results/summaries/LAYER1_SUMMARY.md).
- **Coverage.** The batch steps are scored on GnuCOBOL; the online programs (A24, A32) are scored on a stand-in for
  CICS written from our reading of the vendor's documentation, with no reference CICS. Units resting on a stand-in rule are
  tagged and reported apart. COMBTRAN is a sort with no program and is emulated (`tools/dfsort.py`). The optional
  Db2, IMS and MQ modules are out of scope.
- **Pilots and infrastructure.** Pilots P0–P2 are unscored. One environment outage and its retries are logged in
  `METHODS_LOG.md`; no attempt hit by it was scored.
- **Builder isolation.** Before A32, FlowX Platform MCP builder sessions could read the operator's global instruction
  file (no CardDemo content); A32's launches excluded it and each session's load record shows it was not loaded.

## Cost and time

FlowX Platform MCP: **$2.29–5.44** per build of one step in model usage at list price (median $3.46, 42 builds), **4.9–13.6
minutes** (median 7.5).
Excludes wiki generation, people's time and running the workflows. Detail: `paper/COST_TIME.md`. The 18 FlowX Platform MCP CR3–CR8
builds (A21): USD 57.00 and 120.9 builder minutes in total (`results/runs/a21/zflx/SUMMARY.md`). Screens (A24):
$10.25–13.64 and 18–24 minutes per build. Whole base application (A32): $35.62–37.67 and 69–75 minutes per build,
$109.06 in all.

## Rerun it yourself

Every command below was run in a fresh `git clone` of this repository (see `SCRUB_REPORT.md`, "Checks run"). No network
is needed except to install the OpenTimestamps client and the PDF renderer.

**Prerequisites:** GnuCOBOL 3.2 (`cobc`), Python 3 (standard library only), bash, `shasum`, git. Optional: Node 18+
with Playwright to re-render a bundle PDF, `pdftotext` (poppler) to compare PDF text, and the OpenTimestamps
client to check the timestamps. Run everything from the repository root; scratch output goes to `run/` (ignored).

### 1. Build the oracle and reproduce the frozen legacy outputs

```bash
./build.sh                                   # compiles the four programs and the loaders into bin/
./run_chain.sh run/base                      # the batch chain on data/in, clock pinned
for f in golden/v1/*_*.txt; do cmp "$f" "run/base/out/$(basename "$f")"; done      # silent = byte-identical
for s in c01 c02 c03 c04; do
  INPUT=cases/$s/in ./run_chain.sh run/$s > /dev/null
  for f in golden/v1/cases/$s/out/*_*.txt; do cmp "$f" "run/$s/out/$(basename "$f")"; done
done
(cd golden/v1 && shasum -a 256 -c --quiet SHA256SUMS)                               # golden integrity
```

### 2. Regenerate the change-request oracles and check them against the frozen hashes

```bash
F="-std=ibm -fsign=EBCDIC -ftab-width=3 -I src"
for n in 1 2; do mkdir -p cr/cr$n/bin; cp bin/* cr/cr$n/bin/; done
cobc -x $F -o cr/cr1/bin/CBACT04C src/RUNPARM.cbl cr/cr1/src/CBACT04C.cbl src/CEE3ABD.cbl
cobc -x $F -o cr/cr2/bin/CBTRN02C cr/cr2/src/CBTRN02C.cbl src/CEE3ABD.cbl
cr/build_cr3_8.sh                            # rewrites cr/cr3..cr8/src from src/, then compiles them
for x in cr1:intcalc cr2:posttran cr3:intcalc cr4:posttran cr5:posttran cr6:creastmt cr7:tranrept cr8:creastmt; do
  cr/run_oracle.sh ${x%%:*} ${x##*:} > /dev/null
done
git status --porcelain cr golden             # empty: sources, outputs and SHA256SUMS regenerate byte-identical
for n in 1 2 3 4 5 6 7 8; do (cd golden/cr$n && shasum -a 256 -c --quiet SHA256SUMS); done
sed 's#  builds/inputs/#  inputs/wikis/#' protocol/frozen/a21/A21_MANIFEST.sha256 | shasum -a 256 -c --quiet -
(cd inputs/wikis && shasum -a 256 -c --quiet PDF.SHA256)          # every bundle PDF a builder received
python3 tools/check_flag_hashes.py          # every flags.json against the hash committed before its scoring
```

The A21 manifest is timestamped (step 5), so the last two hash checks tie the CR3–CR8 oracles, sources, models
and bundles to a date before any CR3–CR8 build.

### 3. Run the scorer self-tests

```bash
python3 scorer/selftest.py                   # SELFTEST PASS: record scorer, planted defects
python3 scorer/report_selftest.py            # SELFTEST PASS: statement and report scorer
tools/a21_selftest.sh > run/SELFTEST.txt && diff run/SELFTEST.txt results/runs/a21/SELFTEST.txt   # A21 wiring
```

### 4. Score a candidate

A candidate is a folder with the decoded outputs under `out/<set>/` (`base`, `c01`–`c04`) and its pre-registered
flags in `flags.json` (`[]` for none). Legacy's own output scores 100%:

```bash
python3 scorer/compare.py --golden golden/v1 --cand run/base/out --outputs intcalc_systran,intcalc_acctdata
python3 scorer/report_compare.py --golden golden/v1 --cand run/base/out --input data/in --outputs tranrept_report
```

Re-score a stored build and compare with its stored result (here FlowX Platform MCP CR4 r1, A21):

```bash
mkdir -p run/cand && cp -R results/runs/a21/zflx/va7/r1/out results/runs/a21/zflx/va7/r1/flags.json run/cand/
tools/a21_score.sh cr4 run/cand              # per-set scores, then the outcome ("followed the change", …)
diff <(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["outcome"])' run/cand/outcome.json) \
     <(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["outcome"])' results/runs/a21/zflx/va7/r1/outcome.json)
python3 scorer/compare.py --golden golden/v1 --cand results/runs/intcalc_zflx_sonnet/r1/out/base \
  --flags results/runs/intcalc_zflx_sonnet/r1/flags.json --outputs intcalc_acctdata,intcalc_systran   # 99%, R-INT-LAST silent
```

### 5. Verify an OpenTimestamps proof

Each frozen file's SHA-256 was stamped; a stamp proves the file existed, byte for byte, no later than the Bitcoin
block it is anchored in (`protocol/VERIFY.md`). The A21 manifest ships unchanged, so its proof can be checked here:

```bash
python3 -m venv run/ots && run/ots/bin/pip install -q opentimestamps-client
run/ots/bin/ots --no-bitcoin verify protocol/frozen/a21/A21_MANIFEST.sha256.ots
#   hashes the file, checks it against the proof, and prints one line per calendar, e.g. "check that Bitcoin block 973533 has merkleroot
#   d021d842…": compare with any block explorer
run/ots/bin/ots verify protocol/frozen/a21/A21_MANIFEST.sha256.ots      # full check: needs a local Bitcoin Core node
# a held-back file: check that its recorded hash is the one stamped (the file itself is not in this repository)
run/ots/bin/ots --no-bitcoin verify -d "$(cut -c1-64 protocol/frozen/a16a18/PROTOCOL_A16-A18.md.sha256)" \
  protocol/frozen/a16a18/PROTOCOL_A16-A18.md.ots
```

The frozen protocol files of A5/A6, A7 and the withdrawn A5/A6 draft ship as stamped and verify as files. From A12
on, the frozen files name internal infrastructure and are held back, with a reading copy (`*.REDACTED.md`) next to
the unchanged `.sha256` and `.ots`: their stamps can be checked against the recorded hash with `-d`. The proofs for A5/A6, A7, A16–A22 and the A21 manifest are stored as stamped, with the
attestation still pending inside the file: `ots verify` fetches the Bitcoin attestation from the public calendars, so it needs
network access (or run `ots upgrade <file>.ots` once). All of them are attested in Bitcoin as of 2026-10-29
(`protocol/VERIFY.md`); a stamp made shortly before a refresh, such as the coming A23, can show "pending" for a few
hours.

### 6. Re-render a bundle PDF (optional, Node)

```bash
npm install --no-save playwright@1.62.1 && npx playwright install chromium
node tools/bundle2pdf_v2.cjs inputs/wikis/intcalc-sonnet-ni2 run/ni2.pdf "CardDemo interest calculation: wiki pages and I/O contract" \
  02-processes/process-interest-calculation.md 10-acceptance-criteria/acceptance-criteria-interest-calculation.md \
  01-data-model/project-data-model.md 04-integrations/workflow-account-data-access.md \
  04-integrations/workflow-reference-data-access.md 04-integrations/workflow-transaction-data-access.md \
  02-processes/process-end-of-day-batch-chain.md CONTRACT.md
diff <(pdftotext run/ni2.pdf -) <(pdftotext inputs/wikis/intcalc-sonnet-ni2.pdf -)   # same text
```

The renderer loads its Markdown and diagram libraries from a CDN. A re-rendered PDF has the same text but not the
same bytes (the PDF carries its creation time), so the hashes above apply to the shipped PDFs.

### Also

- `normalize.py` regenerates `data/in` from a CardDemo clone (`CARDDEMO=/path/to/clone python3 normalize.py`);
  `gen_cases.py` regenerates the case sets; `disguise/run_oracle.sh` rebuilds `golden/d1`.
- `tools/link_a5_golden.sh` and `tools/link_cr_golden.sh` recreate the golden link folders if a host drops symlinks.
- Re-running a *build* needs FlowX.AI platform access.

## Layout

| Path | Content |
|---|---|
| `build.sh`, `run_chain.sh`, `src/`, `loaders/`, `patches/`, `data/`, `cases/`, `tools/`, `disguise/` | the oracle |
| `src/` | CardDemo batch sources, unmodified, plus two stubs of ours (`CEE3ABD.cbl`, `RUNPARM.cbl`) |
| `golden/v1`, `golden/d1` | frozen legacy outputs, original and disguised, with `SHA256SUMS` |
| `scorer/` | scorers, contracts (`CONTRACT.md`, `CONTRACT-L1.md`, `CONTRACT-UI-FULL.md`, `CONTRACT-BATCH-FULL.md`), planted-defect selftests |
| `protocol/` | protocol with amendments, frozen copies, `.ots` proofs, `VERIFY.md` |
| `inputs/` | wiki bundles (Markdown + PDF, with hashes; the change-request bundles have neutral names), ontology exports, and the builder prompts (`inputs/wikis/prompt-*.txt`) |
| `cr/` | change-request sources (modified CardDemo programs), oracle runner, independent models, changed-record lists, novelty log |
| `golden/cr1`–`golden/cr8` | frozen outputs of the changed programs, with `SHA256SUMS` |
| `results/runs/<step>_<builder>_<wiki>/rN/` | per build: `flags.json`, `out/` (candidate outputs), `score/`, builder or workflow notes |
| `results/runs/rerun/`, `a16/`, `a17/`, `a19h/`, `a20h/`, `a21/`, `a23/`, `a25/` | the A15 re-run, change requests and ablation, by amendment; summaries, pre-score records, flag hashes and intervention logs |
| `results/runs/a24/`, `a26/` | online screens (A24): FlowX Platform MCP builds and the first Agentic Harness screens build |
| `results/runs/a28/`, `a30/`, `a31/` | Agentic Harness on later versions: A18 (a), CR6–CR8 reruns, screens builds; builds, flags, maps, outputs and scores only (`results/HARNESS_STOPS.md` describes the stops) |
| `results/runs/full/` | the whole base application (A32): per build `score/`, `batch_score.json`, browser and end-to-end results, maps and flags; `A32_RESULTS.md` |
| `golden-online/v1`, `golden-online/v2`, `golden/full-v1` | frozen answer keys for the screens (A24) and the whole base application (A32) |
| `results/runs/A5_golden/`, `A16_golden/`, `A21_golden/` | links that put a golden INTCALC output next to `golden/v1`'s category-balance file (`tools/link_a5_golden.sh`, `tools/link_cr_golden.sh`) |
| `results/summaries/` | per-step summaries, pre-score records, flag hashes |
| `paper/` | the paper (PDF), related work, cost and time |
| `METHODS_LOG.md` | interventions, deviations and incidents, from the lab notebook |

Paths in the protocol, summaries and hash files are written from the study repository's root: `runs/…` there is
`results/runs/…` here (top-level summaries are in `results/summaries/`), and `builds/inputs/…` is `inputs/wikis/…`.
Some files they cite (lab notebook, build drivers, platform session records) are not in this repository.

## License and attribution

Two kinds of files, kept apart by folder:

- **AWS CardDemo, open source (Apache-2.0), Copyright Amazon.com, Inc. or its affiliates.** `src/` holds the batch
  programs and copybooks, unmodified, at commit `59cc6c2fd7ebd7ef7925cad552a01a4b8b6e4d5e` of
  https://github.com/aws-samples/aws-mainframe-modernization-carddemo, with the upstream `LICENSE` and `NOTICE`
  intact (`src/UPSTREAM.md`), except our two stubs `CEE3ABD.cbl` and `RUNPARM.cbl`. Modified copies, each marked:
  `disguise/d1/src/` (renamed identifiers, five changed values; `MODIFIED.md`), `cr/cr1/src/`–`cr/cr8/src/` (one
  rule changed each; `cr/NOTICE.md`) and `ported/` (build output: CBSTM03A with a z/OS control-block walk commented
  out by `patches/port_cbstm03a.py`). `data/`, `cases/` and the `golden/` folders derive from CardDemo's sample data
  and are outputs of its programs.
- **Ours: Apache-2.0, Copyright 2026 FlowX.AI** (top-level `LICENSE` and `NOTICE`). Everything else: the oracle
  scripts (`build.sh`, `run_chain.sh`, `loaders/`, `patches/`, `gen_*.py`, `normalize.py`, `disguise/*.py`,
  `disguise/run_oracle.sh`, the scripts and models in `cr/`), `scorer/`, `tools/`, `protocol/`, `results/`, `paper/`,
  `inputs/` (wikis generated by FlowX.AI's legacy agent from CardDemo, plus ontology exports) and the documents.

## Paper

*Change the rule in the documentation, not the code: a pre-registered test of COBOL migrations built through FlowX
Platform MCP*, version 1.0, 2026-11-03, FlowX.AI: `paper/CardDemo_equivalence_study_v1.0.pdf`.
