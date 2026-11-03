# Evaluation protocol: agentic migration of the CardDemo batch layer

**Status: FROZEN as git tag `protocol-v1` (2026-10-24), approved by the first author before any candidate was
scored.** Every later change is an amendment in §13, with its date and reason. Results produced
under an amended protocol are reported against the version they were produced under.

## 1. Research questions

- **RQ1, fidelity.** Starting only from the agent-generated wiki, how much of the CardDemo batch behaviour does an
  agent-built FlowX.AI implementation reproduce, with no human edits to the generated logic?
- **RQ2, honesty.** Of the behaviours it gets wrong, how many did the pipeline flag as uncertain beforehand
  (*flagged*), and how many did it get wrong without warning (*silent*)?
- **RQ3, secondary.** How do the two builders (harness, zflx) and the two wikis (Sonnet run, Opus run) differ?

## 2. Hypotheses (pre-registered predictions)

- **H1.** Every build of INTCALC from either wiki diverges on the last account (rule R-INT-LAST): the build
  applies interest to account 00000000050, which the legacy program does not.
- **H2.** That divergence is **silent** in every build. No frozen artefact flags it (notebook §13).
- **H3.** Builds from the Sonnet wiki either truncate interest (no R-INT-TRUNC divergence) or diverge on
  R-INT-TRUNC **flagged**, because BR-08 marks rounding as a TODO.
- **H4.** Builds from the Opus wiki diverge on R-INT-RATE, because its formula uses the account balance with no
  /1200.

A hypothesis that fails is reported as failed. Predictions are not revised after scoring.

## 3. Subject and oracle

- Subject: AWS CardDemo, open source (Apache-2.0), commit `59cc6c2fd7ebd7ef7925cad552a01a4b8b6e4d5e`.
  Batch chain: POSTTRAN, INTCALC, COMBTRAN, CREASTMT, TRANREPT.
- Oracle: the unmodified COBOL compiled with GnuCOBOL 3.2. The one source change is the CBSTM03A port patch
  (notebook §9). The clock is pinned. Outputs are frozen in `golden/v1` (`SHA256SUMS`).
- Evaluation sets:
  - `base`, the shipped sample data;
  - `c01`, posting validation: all four reject reasons plus boundary cases;
  - `c02`, interest-rate paths: own group, zero rate, unknown group;
  - `c03`, orphan cross-reference;
  - `c04`, interest value partitions: negative interest, several rated categories on one account, an amount of 0
    (added from the branch inventory, `BRANCHES.md`).
- **Blinding.** Builders never see `golden/`, `cases/`, the notebook or this protocol. They see the wiki, the
  build prompt (Appendix A) and CONTRACT.md.

## 3a. Provenance of the checks

The authors had seen both wikis before any check existed. On 2026-10-22 they generated them, recorded a
walkthrough that opens the interest page, and used wiki pages in another test. So no check below is blind to the
wikis. The table records, for each check, what it was derived from and whether it came before or after the first
close read of the interest pages (2026-10-24 09:41). Timestamps come from the session log; the notebook
sections are cited.

| Check | Derived from | Relative to the close read | Evidence |
|---|---|---|---|
| Golden outputs, all six POSTTRAN/INTCALC outputs, every field | COBOL run (oracle) | before | notebook §5–§10, 08:48–09:01 |
| Last-account defect (R-INT-LAST) | COBOL source + model vs run | found before, from COBOL; wikis keyword-searched one minute later (08:56); a named rule only after | notebook §7 |
| Truncation (R-INT-TRUNC) | COBOL source (`COMPUTE` without `ROUNDED`), model | before | notebook §6 |
| DEFAULT-group fallback, zero-rate skip (c02) | COBOL source (CBACT04C branches) | before (09:39) | notebook §12 |
| Reject reasons 100/101/102/103 and boundaries (c01) | COBOL source (CBTRN02C validation) | before (09:39) | notebook §12 |
| Orphan cross-reference (c03) | accident while building c01 | before (09:41) | notebook §12 |
| Negative interest, several rated categories, amount 0 (c04) | branch inventory of the COBOL (wiki-independent) | after, but derived from the source alone; expected values committed before the first run | notebook §16–§18 |
| Group code in the ZIP field (data quirk) | data + copybook | before | notebook §11 |
| Rule catalogue (§5) | COBOL outputs, labels for any divergence | **after** (10:14) | notebook §14 |
| H1, H2 (last account, silent) | COBOL finding + wiki read | **after** | notebook §13 |
| H3, H4 (truncation flagged, Opus formula) | wiki read | **after** | notebook §13 |
| Interest-key choice (card + occurrence) | COBOL (generated IDs) | after, but wiki-independent | notebook §14 |

How the design limits the bias:
- **The primary endpoint does not depend on any named check.** Equivalence is computed over every record and every
  business field of the six outputs. The rule tags only *label* a divergence. A divergence that fits no named
  check is still counted, and tagged by output (`R-POST-COPY`, `R-PASSTHRU`, `R-INT-TXFORMAT`).
- **The evaluation inputs came from the COBOL's branches, not from the wikis.** c01–c03 were designed before the
  close read, from the reject logic and the rate paths.
- **The paper labels every finding.** Each one is reported as either *a-priori* (from the COBOL, before the read)
  or *post-hoc* (shaped by the wiki read). H1–H4 are reported as *informed predictions*, not blind ones. The last-
  account result is reported with this table beside it.
- **Planned (§12): a wiki-independent branch inventory.** Every decision point in CBTRN02C and CBACT04C, enumerated
  from the source and mapped to the case that exercises it, frozen before the first build is scored. Uncovered
  branches are listed as such.

## 4. Unit of measure and canonicalisation

- **Unit:** one output record, matched by business key.
  - Accounts: account ID.
  - Category balances: account + type + category.
  - Posted and rejected transactions: transaction ID.
  - Interest transactions: card number + occurrence. Their IDs are a generated counter and are compared as a
    field.
- **Canonicalisation:**
  - Fields are typed from the copybooks.
  - Amounts compare as decimals, so `14.5` equals `14.50`.
  - Trailing spaces and low-values in text fields are padding, not content.
  - Record order is ignored.
- **Masked (volatile):** `proc_ts` everywhere, and `orig_ts` on interest transactions. Both hold the run clock.
  Differences are counted and reported, but never scored.
- **Presentation fields:** `reason_desc` on rejects, and `desc` and `source` on interest transactions. Scored in
  *strict* equivalence only.

## 5. Metrics

- **Equivalence** = equal records ÷ (golden keys ∪ candidate keys). A missing or extra record counts as unequal.
  - *Business* equivalence is the primary endpoint.
  - *Strict* equivalence also includes the presentation fields.
- **Divergent records** = records with at least one business-field difference, a missing record or an extra record.
- **Silent** and **flagged**: each divergence is one or the other (§6). Headline: silent divergent records.
- **Rule table:** every divergence carries one tag from the closed catalogue below, assigned mechanically by
  `scorer/compare.py`. Counts are per divergence, so one record can carry several field divergences.

| Rule | Meaning |
|---|---|
| R-POST-100 / 101 / 102 / 103 | a transaction rejected for that reason in one run and not the other |
| R-POST-PRECEDENCE | rejected in both, reasons 102 and 103 swapped |
| R-POST-WRITE | posted in one run, absent from both posted and rejected in the other |
| R-POST-COPY | a posted or rejected transaction's copied fields differ |
| R-POST-BAL | account balance or cycle totals differ after posting |
| R-POST-TCAT | category balance differs after posting |
| R-INT-RATE | interest transaction missing or extra, or its amount off by more than 0.01 |
| R-INT-TRUNC | interest amount off by exactly 0.01 (the rounding mode, *probable*) |
| R-INT-ZERO | extra interest transaction with amount 0 |
| R-INT-TXID | interest transaction ID differs |
| R-INT-TXFORMAT | another field of an interest transaction differs |
| R-INT-APPLY | balance after interest differs (not the last account) |
| R-INT-CYC | cycle totals after interest differ (not the last account) |
| R-INT-LAST | balance or cycle totals of the last account differ after interest |
| R-PASSTHRU | an account field the step should leave untouched differs |
| R-ABSENT | a required output was not produced |

## 6. Flags

A flag is an explicit statement of uncertainty that exists in a frozen artefact **before scoring**. It can be a
wiki `{{TODO}}` or open item, or an assumption the build records in its own output. A plain statement of
behaviour is not a flag, even when it later turns out to be wrong.

**Procedure.** The flag mapper is the AI assistant that ran the experiment (Claude), and the paper discloses it.
Before a build's outputs are scored, and before anyone opens them, the mapper reads that build's wiki and build artefacts and
writes `flags.json`. Each entry maps to a rule ID and cites the artefact path and line. The file is committed with
a hash. Then the scorer runs. Flags are never added or edited after scoring.

## 7. Design

- **Conditions:** builder (harness, zflx) × wiki (Sonnet run, Opus run) × step.
  - Steps in order: INTCALC first, POSTTRAN second. COMBTRAN, CREASTMT and TRANREPT are out of scope for v1.
- **Primary condition:** harness × Sonnet wiki × INTCALC.
- **Repetitions:** 3 independent builds per condition (fresh session, same prompt). LLM output varies between
  runs, so each condition reports the median and the range, and every run is listed.
- **Fixed per run:**
  - the prompt (Appendix A, verbatim);
  - the wiki snapshot (hash);
  - the platform version;
  - the model ID, recorded at run time.
- **Allowed human interventions:** infrastructure only (authentication, deployment, retrying a platform error).
  Each one is logged with a timestamp. Editing generated logic or prompting it toward a fix ends the run as
  *assisted*. Assisted runs are reported separately and never pooled.
- **Failed builds:** a build that produces no output is scored as it stands (R-ABSENT). It is not rerun, and it
  is not dropped.
- **Execution:** the built FlowX.AI app runs on each evaluation set's inputs and writes the contract outputs, with
  step isolation as in CONTRACT.md.

## 8. Analysis plan

- Per condition: business and strict equivalence, divergent / silent / flagged records, and the rule table, for
  each evaluation set and pooled.
- Hypotheses H1–H4: checked against the rule tables of the primary condition and its Opus counterpart.
- Descriptive statistics only. Three runs per condition cannot support significance tests, and the paper will
  not report any.
- Every run is reported, including failed and assisted runs. No run is excluded after its score is seen.

## 9. Instrument validation

- Before any candidate is scored, `scorer/selftest.py` must pass. It plants 13 known defects (m00–m12) and asserts
  the exact rule counts.
- Golden scored against itself must give 100% on all five sets.
- Both results are recorded in the notebook with the scorer's commit hash.

## 10. Threats to validity

- **Oracle fidelity:**
  - GnuCOBOL is not z/OS;
  - DFSORT is emulated (pad byte, tie order);
  - the order of duplicates on the VSAM alternate index is assumed;
  - CREASTMT and TRANREPT are not independently cross-checked.
- **Scale:** 50 accounts and about 300 daily transactions; the cases add targeted records.
- **Step isolation flatters** a pipeline whose upstream steps would err. End-to-end runs are future work.
- **Wiki provenance:** the two wikis come from different runs (models and agent versions), so RQ3 is
  observational.
- **R-INT-TRUNC is heuristic:** a 0.01 difference is tagged as the rounding mode.
- **Checks chosen with the wikis in view:** see §3a. Mitigated by scoring every record, by inputs drawn from the
  COBOL branches, and by labelling each finding a-priori or post-hoc.
- **Author affiliation:** the authors build the tool under test. Mitigations:
  - publish the oracle, the scorer, the raw candidate outputs and every `flags.json`;
  - freeze this protocol first.
- **The online (CICS) half of CardDemo is out of scope.** It cannot run here.

## 11. Artefacts

The oracle workspace is under git; `protocol-v1` is the tag. Each scored run gets a directory `runs/<condition>/<n>/`
holding:
- the candidate outputs;
- `flags.json`;
- the build log;
- the intervention log;
- `report.json` and `report.md`;
- the scorer commit.

## 12. Before freezing

- ~~Branch inventory of CBTRN02C and CBACT04C, mapped to cases (see §3a).~~ Done: `BRANCHES.md`, trace coverage
  `coverage/v1/`, gaps closed by c04 (notebook §16–§18).

## 13. Amendments

**A1 (2026-10-24, before any build). Pilot run P0.** The protocol does not fix three operating details:
- how the input bundle reaches each builder (the harness takes PDF attachments);
- the fixed reply when a builder asks a question mid-build;
- how a built FlowX.AI app is executed on the input files.

One pilot run, P0 (harness × Sonnet wiki × INTCALC, in its own fresh project), exists only to settle these. Its
outputs are **not scored** and are not opened for comparison with the golden files. The resulting operating
procedure is written as amendment A2 before scored run 1. P0 is reported in the paper as a pilot, with what it
changed.

**A2 (2026-10-25, after pilot P0, before scored run 1). Operating procedure.** Settled by P0 (notebook §20,
`runs/pilot-p0/log.txt`). Applies to every scored run of the harness; the zflx procedure is fixed as A3 before the
first zflx run, on the same principles.
- **Where:** the Sandbox workspace of a FlowX.AI development environment (platform 5.13.0), one fresh project per run named
  `cd_<step>_<builder>_<wiki>_r<n>`, one new conversation in Make mode. The model is whatever the platform resolves
  for that workspace; it is read from the session record and logged per run (P0: `gpt-6.1-sol`).
- **Input:** the prompt of Appendix A, verbatim, plus one PDF attachment rendered from the frozen bundle by
  `tools/bundle2pdf.cjs`; the PDF's SHA-256 is logged.
- **Gates:** every gate takes the option the harness itself recommends, unchanged. A question with no marked
  recommendation takes its first option. A question that needs free text gets this fixed reply, verbatim:
  "Decide as you think best and record the decision in assumptions.md." Brief → "Go ahead"; plan → "Implement this
  plan" unchanged; branch → the recommended option; commit → "Commit changes and implement this plan".
- **Platform errors:** when the session reports a stop on the platform's side (an error code such as
  `validation_unknown`, a timeout, an HTTP 5xx), the operator retries in the same session, at most twice, logging
  each retry. Anything else the operator types or edits ends the run as *assisted* (§7).
- **The build:** the latest version of the run's project at the end of the session, committed or work in progress,
  as listed by the platform, whatever state the plan ends in. If it holds no runnable workflow for the step, every
  record of the step is R-ABSENT.
- **Execution:** `tools/adapter_intcalc.py` encodes each evaluation set (accounts and category balances from the
  oracle's POSTTRAN outputs, rates and cross-references from the set's inputs, CONTRACT.md field names), the
  workflow runs once per set through the platform's run endpoint (MCP `run_workflow` or the platform API; instance IDs
  logged), and the adapter decodes the returned lists into contract JSON. If a build names its inputs differently,
  the operator may write a pure field-renaming map for that build, committed in the run directory; nothing else.
  A run that returns an error or no lists leaves that set's outputs absent (R-ABSENT).
- **Flags:** the assumptions the build returns (or writes) are mapped to `flags.json` per §6 and committed before the
  scorer runs on that build.
- **Pilot outputs:** P0's workflow may be re-run to test this procedure; its outputs stay unscored and unopened
  against the golden files (A1).

**A3 (2026-10-25, before any scored run). Run order changed; zflx pilot P1 and zflx procedure.**
- **Why:** every harness build in that environment so far ends with the platform's pre-commit validation "still computing after
  120s (HTTP 409)", so nothing is saved (pilot P0, original attempt and retry 1, 18 h apart; notebook §20–21). Running
  harness conditions now would measure that fault, not the builder. No build has been scored; the change rests on
  this platform fault alone.
- **Order:** zflx conditions run first (Sonnet wiki, then Opus wiki), harness conditions once the environment saves work.
  The primary condition stays harness × Sonnet × INTCALC. If harness builds still cannot save once the zflx INTCALC
  runs are done, a further amendment, written before any score is opened, may name zflx × Sonnet × INTCALC primary;
  the paper reports that as forced by the environment.
- **Pilot P1 (unscored):** one zflx × Sonnet × INTCALC run, under the rules of A1, to settle how zflx receives the
  bundle, how it asks questions and how its build is executed. Its outputs are not compared with the golden files.
- **zflx builder:** zflx (FlowX MCP Designer, version logged) is an MCP server driven by a coding agent. The builder
  is a fresh, headless Claude Code session (`claude -p`, version logged) with a pinned model (`claude-opus-5-5`),
  started in an empty run directory outside the oracle workspace that holds only the bundle PDF used for the harness
  (same file, same hash). Isolation: only the zflx MCP server (`--strict-mcp-config`); built-in tools limited to
  Read, Write, Edit, Glob and Grep (no shell, no web); no auto-memory for that directory; no other prompt than
  Appendix A, verbatim. The operator pre-creates one empty project per run in that Sandbox workspace
  (`cd_<step>_zflx_<wiki>_r<n>`) and sets it as the zflx context before the session starts. A headless session
  cannot ask questions; it decides alone, which is the zflx equivalent of A2's fixed reply. The full transcript
  (stream-json) is kept, and the operator checks it for reads outside the run directory; any such read is reported.
- **The build, execution, flags, retries:** as A2. The build is the run project's latest version when the session
  ends; it is executed through the adapter (a pure renaming map allowed per build); assumptions the build returns or
  writes in the run directory become `flags.json` before scoring; a platform error may be retried twice by the
  operator, which for a headless session means re-running the failed platform call, never re-prompting the builder.

**A4 (2026-10-25, after pilot P1, before any scored run). What P1 settled for zflx.**
- **Input format:** a build may take the inputs as decoded records (P0) or as fixed-width file text (P1). The adapter
  offers both (`encode`, `files`); `files` pads each record to its copybook length. Which one, and the build's key
  names, are taken from what the build itself documents (its README or data model) and committed as a renaming map
  in the run directory. Run parameters given by CONTRACT.md (INTCALC `2022071800`) are passed when the build asks for
  them; optional inputs the build offers (such as a fixed timestamp) are left unset.
- **Builder-written flags:** a builder may write its own `flags.json`. It is kept as a builder artefact; the scored
  `flags.json` is still the mapper's (§6), made from the builder's assumptions before outputs are opened. The paper
  reports where the two disagree.
- **Isolation as observed:** reads outside the run directory are denied by the permission mode and reported;
  Claude Code's auto-memory writes to a per-directory store, fresh for every run directory, so it carries nothing
  between runs. Each run gets its own directory under `~/Dev/_tests/carddemo-builds/`.
- **Logged per run:** turns, duration and cost from the session result.


**Editorial note E1 (2026-10-25, before deposit, no change of method).** For the public deposit the internal environment
name was replaced by "a FlowX.AI development environment" and an internal CLI name by "the platform API" in A2–A4.

**A5 (2026-10-25, after the six INTCALC zflx builds were scored, before any build below). Recall control:
disguised CardDemo.** The first six builds were all made by the same builder model (`claude-opus-5-5`). In all
three builds from the Opus wiki, the builder says it filled gaps from memory of the public CardDemo source, which
was not in its bundle (notebook §25). The first six builds therefore cannot separate what the wiki supplied from
what the builder recalled. This amendment adds a variant in which recall gives wrong answers.
- **Disguise map D (frozen and hashed before any disguised build).** One mechanical substitution table is applied
  to the COBOL source, JCL, data files, both INTCALC wiki bundles and CONTRACT.md. It covers:
  - identifiers: program, copybook, paragraph, file, field and step names, the product name "CardDemo", and the
    contract's output names. No AWS reference is left.
  - behaviour perturbations, changing a few values that are stated in the source and that recall would get
    wrong. The Sonnet bundle states all of them. The Opus bundle states none.
    - interest transaction type `01` → `07` and category `5` → `12`;
    - source `System` → `Batch`;
    - description prefix `Int. for a/c ` → `Accrued int `;
    - fallback disclosure group `DEFAULT` → `STANDARD`, in the program and in the rate data.

  Record layouts, the arithmetic and the control flow (including the last-account defect) are unchanged. The wiki
  text is a transformed copy, not a new wiki run. Its information content is identical, and the paper says so.
- **Oracle.** The disguised source is built and run under GnuCOBOL on the same data, giving `golden/d1` for base
  and c01–c04. Instrument check, before any disguised build: `golden/d1` must equal `golden/v1` under the inverse
  map in every field except the perturbed ones. If it doesn't, the disguise is broken and is fixed before any build.
- **Builds.** zflx, same builder, same prompt (step name per D), Sonnet and Opus bundles under D, three runs each.
  The procedure follows A2–A4. The adapter maps the disguised output names back to the canonical ones (pure
  renaming).
- **Scoring.** As in §5–6, against `golden/d1`. In addition: a **recall signature**, counted for each build. It is
  every output field that equals the undisguised legacy value where the disguised oracle differs (e.g. source
  `System`, type `01`, group `DEFAULT`), and every assumption that cites CardDemo or a CardDemo identifier.
- **Hypotheses:**
  - **H5.** Disguised builds cite no CardDemo identifier, and their recall signature is 0.
  - **H6.** Disguised Sonnet-bundle builds keep the business equivalence of their undisguised counterparts (±1
    record per set), because their bundle states every perturbed value.
  - **H7.** Disguised Opus-bundle builds diverge on R-INT-TXFORMAT, and on R-INT-RATE wherever the fallback group
    applies, because only recall could supply those values. If any of them still emits a legacy value, that is
    recall leaking through the disguise and is reported as such.
  - **H7b.** Disguised Opus-bundle builds diverge on R-INT-RATE unless they recover the per-category `/1200`
    formula by reasoning. Each assumption about the formula is classed before scoring as "from the wiki", "from
    reasoning" or "from recall".

**A6 (2026-10-25, same point). Ontology arm.** This tests whether a FlowX.AI ontology built from the legacy source
improves the build over the wiki alone. It runs on the disguised variant only, so that recall cannot flatter either
arm.
- **Ontology (one per variant, frozen and hashed before any ontology build).** It is built in the FlowX.AI Ontology
  Service, platform 5.13, from the disguised source the wiki agent would have read: copybooks, JCL and the step's
  program. Two routes:
  1. import of a project data model generated from the copybooks;
  2. EXTRACT over the source.

  Staged writes are promoted all at once, without edits, and their count is logged. The ontology never sees golden
  outputs, scorer files, the notebook or either wiki's known errors. Before any build, the mapper records whether
  the ontology contains:
  - the rate formula;
  - the truncation rule;
  - the fallback rule;
  - the perturbed values;
  - any statement about end-of-file account handling.
- **Builder input.** The same bundle as A5, plus an export of the ontology (concepts, type contracts, relations
  and provenance) added to the bundle PDF. The ontology also sits in the run's project, so a build may use
  ONTOLOGY nodes (DESCRIBE, RETRIEVE, VALIDATE). Any such use is logged and reported. The prompt adds one
  sentence naming the ontology export as an input.
- **Builds.** zflx, Sonnet and Opus bundles plus the ontology, three runs each, procedure as A5. Scored like A5.
- **Hypotheses:**
  - **H8.** Builds with the ontology record fewer data-meaning assumptions than A5 builds from the same bundle.
    These are assumptions about encoding, field layout, keys, units, relations and the fallback, classed by the
    mapper before scoring.
  - **H9.** The ontology lowers R-INT-RATE and R-INT-TXFORMAT divergence for Opus-bundle builds compared with A5.
  - **H10.** The ontology does not change R-INT-LAST, unless the ontology was found to contain end-of-file
    account handling (recorded above).
- **Setup gate.** Creating an ontology in a project is not exposed to the builder's tool set. The operator does it
  in the Designer or through the platform API, and the route is logged. If the Ontology Service cannot be set up,
  A6 is dropped by a later amendment before any A6 build, and the paper says so.

**Timing for A5 and A6.** These amendments are committed, and their hash is stamped with OpenTimestamps, before
any A5 or A6 build is scored.

**A7 (2026-10-25, after the disguise was built, before any A5 or A6 build). Closing cue paths for the disguised
arms.** Preparing A5 showed three paths by which a builder could see CardDemo names (notebook §28). Every earlier
build listed the projects of the shared Sandbox workspace once (`list_projects`) and so saw the `cd_intcalc_*`
project names. None read another project's content. A5 and A6 builds therefore run as follows:
- in a dedicated, otherwise empty Sandbox workspace ("Ledgerline study");
- with the project-name prefix `ll` (e.g. `ll_accrue_zflx_sonnet_r1`);
- with a run-dir parent that names no product (`~/Dev/_tests/ll-builds`);
- with the prompt of Appendix A, in which "CardDemo" becomes "Ledgerline" and nothing else changes.

Each A5 or A6 transcript is checked for every MCP call that lists or reads resources outside its own project. The
paper reports that the six INTCALC builds (§26) could see the names of earlier projects.

**A6b (2026-10-25, after A6 was scored, before any A6b build). Thin-ontology arm, exploratory.** The A6 ontology
was re-extracted after its first extraction had been inspected (notebook §31): one job over all chunks returned
about 100 candidates with structure only, was judged an under-extraction and withdrawn, and the ontology was
rebuilt in batches. That choice was made after seeing the content. A6b measures what it changed.
- **Ontology:** the withdrawn first extraction (5eabcea3…, 48 concepts, 30 relations), unchanged, rendered with the
  same export code as A6.
- **Content record (before any build):** rate formula absent; truncation absent; fallback absent (no standard-rate
  procedure, no `STANDARD`); perturbed values absent (0 of 5); end-of-file handling absent. It holds file, record
  and key layouts, including the rate-group record (`RG-INT-RATE` signed decimal(6,2)).
- **Builds:** as A6 (zflx, Sonnet and Opus bundles plus this ontology, three runs each, the same prompt, the
  ontology loaded into each run project), scored like A5 and A6, flags mapped before any output is opened.
- **Status:** exploratory, added after the A6 results; reported as such, never pooled with A6. No hypothesis is
  confirmed by it. Expected pattern if the procedure name is what moved A6 Opus: Opus about 1% (fallback fails).

**A8 (2026-10-25, after pilot P2, before any scored harness run). Harness runs through the API.** Pilot P2
(notebook §35) showed the harness on dev-env saving work once integration-designer served the maker-files API.
- **Driver:** every scored harness run is driven by `tools/harness_api.py auto`, which makes the calls the Designer
  panel makes (create session, upload the PDF as a temp file, send the turn, resume gates, plan preview and run)
  and applies A2's gate rules mechanically: ask_user → the recommended option, else the first; free text → A2's fixed
  reply; brief and plan → approve unchanged; implementation → new branch, saved-changes commit confirmed.
- **Record:** the session record and its full event list (`session.json`, `events.jsonl`), every SSE body, and the
  driver log are kept per run. The model is read from the session record and logged.
- **Platform errors:** a run stop that the harness itself attributes to its side (e.g. `committed_preview_changed`,
  `validation_unknown`, a 5xx) is retried by re-preview and run in the same session, at most twice (A2).
- **Order and naming:** harness × Sonnet × INTCALC r1–r3, then harness × Opus × INTCALC r1–r3, one at a time, each in
  a fresh Sandbox project `cd_intcalc_harness_<wiki>_r<n>`. Execution and scoring as A2.

**A9 (2026-10-26, after harness Sonnet r1 was scored, exploratory). One-line repair of harness Sonnet r1.**
- **Why:** harness Sonnet r1 scored 0% on every set (R-ABSENT): its input validation rejects a blank account group
  id with `Empty group_id`, and every CardDemo account has one, because the sample data puts the group code in the
  ZIP field (notebook §11). The legacy program falls back to DEFAULT on a missing group (`CBACT04C.cbl` 436–438),
  and the build's own rate lookup already does the same. This arm measures how far the build was from the legacy
  behaviour. It was decided after the score was seen, so it is exploratory and never replaces the scored result.
- **The repair:** on a new version branched from the scored build (version 2fc3c2d3…), delete exactly one statement
  from the script node "Calculate interest": `if(row.group_id==='')throw new Error('Empty group_id');`. Nothing
  else in the workflow changes; the diff is committed in the run directory.
- **Execution, flags, scoring:** as A2 for r1: same adapter, same renaming map, same five sets. The flags are r1's
  frozen `flags.json`, unchanged. Results go to `runs/intcalc_harness_sonnet/r1_repair/`.
- **Reporting:** the paper reports harness Sonnet r1 as 0% (pre-registered), with the repaired score beside it,
  labelled exploratory and "one-line repair by the operator". It applies to this build only; repairing any other
  build needs its own amendment written before that build is scored.

**A10 (2026-10-26, before harness Sonnet r3 and Opus r1–r3 are scored, exploratory). Deletion-only repair of
input checks.**
- **Why:** harness Sonnet r1 rejected the real data with input checks the legacy program does not have (A9, notebook
  §37–38). The user asked for the same treatment of the remaining harness builds. This rule is written and committed
  before any output of Sonnet r3, Opus r1, Opus r2 or Opus r3 is decoded or scored.
- **Scope:** harness Sonnet r3, Opus r1, Opus r2, Opus r3. The pre-registered score of each build comes first and is
  never replaced.
- **Trigger:** a set's run returns an error result (no records), and the error is raised by an input check, i.e. a
  check that rejects an input record or field before or instead of computing. Every evaluation set ran to completion
  under the legacy program (its golden outputs exist), so any input record a build rejects is one legacy accepts.
  Errors raised by the calculation itself (overflow, missing rate after lookup, sequence exhaustion) are not input
  checks and are not repaired.
- **The repair:** on a new version branched from the scored build, delete the smallest syntactic unit that raises
  that error: the statement, or the condition clause of a compound check. Only deletions. Nothing is added,
  rewritten or re-valued. Re-run all five sets. If a set now fails on a different input check, repeat, up to three
  deletions per build in total. Each deletion is committed as a diff in `runs/intcalc_harness_<wiki>/r<n>_repair/`.
- **Execution, flags, scoring:** as A2: same requests, same renaming map, each build's frozen `flags.json`.
- **Reporting:** "repaired, k deletions by the operator", exploratory, next to the pre-registered score. A build whose
  error does not come from an input check, or that still fails after three deletions, is reported as not repairable
  under A10.

**A11 (2026-10-26, after every INTCALC build was scored, before any POSTTRAN build). POSTTRAN, step 2 of §7.**
- **Inputs:** bundles by the mechanical rule of Appendix A, frozen with hashes in `builds/inputs/posttran-<wiki>/SHA256SUMS`
  and rendered by `tools/bundle2pdf.cjs` (hashes in `builds/inputs/PDF.SHA256`):
  - `posttran-sonnet` (8 pages + contract, PDF 28 pages): process-daily-transaction-posting,
    acceptance-criteria-daily-transaction-posting, project-data-model, workflow-account-data-access,
    workflow-batch-file-transfer, workflow-reference-data-access, workflow-transaction-data-access,
    process-end-of-day-batch-chain;
  - `posttran-opus` (4 pages + contract, PDF 13 pages): process-transaction-posting,
    acceptance-criteria-transaction-posting, project-data-model, trigger-inventory.
  Pages shared with the INTCALC bundles are byte-identical to them; CONTRACT.md is the same file.
- **Prompt:** Appendix A verbatim, with the step name in the parenthesis: "(daily transaction posting)"
  (`builds/inputs/prompt-posttran.txt`). The step name is the prompt's only slot, as in A5.
- **Conditions:** the §7 design only: builder (zflx, harness) × wiki (Sonnet, Opus) × 3 runs, undisguised, no
  ontology. The A5 and A6 arms are not extended to POSTTRAN. The zflx recall confound (§25) applies here as well
  and is reported the same way.
- **Order:** zflx conditions first, then harness, as A3. The primary condition of §7 is unchanged; POSTTRAN results
  are secondary and reported per §8, with no new hypothesis (H1–H4 are INTCALC predictions).
- **Procedure:** A2–A4 for zflx (`tools/zflx_build.sh posttran <wiki> <n>`, `PROMPT` and `PDF` set to the files
  above), A8 for the harness, same driver and gate rules.
- **Execution:** `tools/adapter_posttran.py`. POSTTRAN is the first step, so a set's inputs are its own files
  (`data/in` or `cases/<set>/in`); no oracle output is passed in. Record mode sends daily transactions, accounts,
  card cross-references and category balances; file mode sends the CONTRACT.md files as fixed-width text. The run
  parameter business date `2022-07-18` is passed when the build asks for it. A pure renaming map per build is
  allowed as in A2/A4; an error with no records leaves the set's outputs absent (R-ABSENT).
- **Adapter check, before any build:** `adapter_posttran.py selftest` encodes each set, posts it with an independent
  model of CBTRN02C, decodes and scores it: 100% strict on base and c01–c04.
- **Scoring:** §4–§6 on the four `posttran_*` outputs against `golden/v1` and `golden/v1/cases/<set>/out`; flags
  mapped by Claude from each build's assumptions before any output is opened.
- **Repairs:** A9 and A10 are INTCALC-specific. In POSTTRAN the input checks are the step's business logic
  (rejects 100–103), so A10 does not apply. Any exploratory repair needs its own amendment, written before it is scored.

**A12 (2026-10-26, after every POSTTRAN build was scored, before any layer 1 build). Layer 1: scope and instrument.**
Plan and reasons: `plan_layer1_batch_chain.md`; the four decisions in its §10 are the user's (2026-10-26).
- **Scope:** the §7 design is extended to the two remaining batch programs, CREASTMT (statement generation, A13)
  and TRANREPT (daily transaction report, A14). **COMBTRAN gets no build arm.** It has no COBOL program (a merge and
  a key sort), and the Opus wiki has no COMBTRAN process page, so the Appendix A rule gives no Opus bundle and the
  2 × 2 design cannot hold. It is folded into a later end-to-end check (future work, §10); its scorer path and
  self-test mutant stay in place, so an arm can still be added by amendment.
- **Oracle:** `golden/v1` unchanged. Independent cross-checks written from the source and the JCL,
  `tools/ref_creastmt.py` and `tools/ref_tranrept.py`, match the GnuCOBOL outputs line for line on base and
  c01–c04 (10 of 10, commit 4c1e6ae; rechecked after the write-out mode was added, 79d5e60). This closes the "not
  independently cross-checked" item of §10 for CREASTMT and TRANREPT; the DFSORT assumptions remain (below).
- **Instrument:** `scorer/report_compare.py` at 79d5e60 (`compare.py` unchanged). Units: one statement per account
  in each statement output; for the report, each detail line (key TRAN-ID), each account total, the grand total and
  the header. Strict = the unit's lines identical after trailing spaces; business = parsed fields equal (whitespace
  collapsed, low-values read as spaces, amounts as numbers, a statement's transactions as a multiset). Equivalence
  as §5, per output. Closed rule catalogue: R-STMT-SET, R-STMT-ABEND, R-STMT-NAME, R-STMT-ADDR, R-STMT-BAL,
  R-STMT-FICO, R-STMT-TXN, R-STMT-TOTAL, R-STMT-OVERFLOW, R-REPT-SET, R-REPT-AMT, R-REPT-XREF, R-REPT-LOOKUP,
  R-REPT-ACCT, R-REPT-LASTACCT, R-REPT-LASTDUP, R-REPT-GRAND, R-REPT-HEADER, R-ABSENT. Validation before any layer
  1 build: `scorer/report_selftest.py` plants 18 defects and passes all 18; golden scored against itself gives 100%
  strict and business on all five sets; `scorer/selftest.py` still passes.
- **Platform assumptions** (plan §3): S1 the OUTREC pad bytes are never read; S2 equal sort keys in TRANREPT keep
  TRAN-ID order, so page totals and page breaks are a layout score only, never equivalence, and the grand total is
  business-equal when it equals any total legacy can print under some order of equal keys; S3 the report window is
  2022-07-01..2022-07-31, passed as run parameters; **S4 the c04 overflow statement** (account 00000000005, more than
  10 transactions on one card; text and HTML, 2 units) **is excluded from c04 equivalence and reported separately**
  under R-STMT-OVERFLOW, because z/OS may abend where GnuCOBOL added spaces as zero (not verified). This is the
  scorer's default; `--include-overflow` gives the score with it included, reported in the appendix only. S5 the
  c03 abend keeps the statements written before it, as GnuCOBOL does.
- **Contract:** `scorer/CONTRACT-L1.md`, formats only: the input files per step, the run parameters, and the
  output line layouts (field positions, fixed labels, the HTML lines), with no assembly rule (which records go into
  a statement or a total, how a name or address line is built, which records are selected). In each layer 1
  bundle, `CONTRACT.md` is `scorer/CONTRACT.md` followed by `CONTRACT-L1.md`, so the Appendix A prompt stays
  verbatim ("the outputs CONTRACT.md lists for this step").
- **Builders and image:** zflx as A3/A4 (`claude-opus-5-5`, model recorded at run time). The harness runs on the
  scored image `harness:local-262994253-1792952514`, so each layer 1 harness result changes one variable (the step).
  Any image switch on dev-env while layer 1 runs is logged with tag and digest. The fixed harness image
  (`plan_fixes_harness_issues.md`) is used only in the exploratory re-run arm, numbered after A14.
- **Reporting:** layer 1 results are secondary, reported per step, never pooled with INTCALC or POSTTRAN or across
  steps, with no new hypothesis. The zflx recall confound (§25) applies and is reported the same way; the disguise
  arm (A5) is not extended to layer 1.
- **Timestamp:** PROTOCOL.md as committed with A12–A14 is OpenTimestamps-stamped, as the original pre-registration
  was; the `.ots` file is committed next to it.

**A13 (2026-10-26, same point). CREASTMT, statement generation.**
- **Inputs:** bundles by the Appendix A rule, frozen with hashes in `builds/inputs/creastmt-<wiki>/SHA256SUMS`,
  rendered by `tools/bundle2pdf.cjs` (hashes in `builds/inputs/PDF.SHA256`):
  - `creastmt-sonnet` (8 pages + contract, PDF 29 pages, fd95b8a8…): process-statement-generation,
    acceptance-criteria-statement-generation, project-data-model, workflow-account-data-access,
    workflow-batch-file-transfer, workflow-transaction-data-access, plugin-statement-document,
    process-end-of-day-batch-chain;
  - `creastmt-opus` (5 pages + contract, PDF 16 pages, 467302b1…): process-statement-generation,
    acceptance-criteria-statement-generation, project-data-model, system-statementpdf, document-strategy.
  Pages shared with earlier bundles are byte-identical to them.
- **Prompt:** Appendix A verbatim with "(statement generation)" (`builds/inputs/prompt-creastmt.txt`).
- **Conditions and order:** builder (zflx, harness) × wiki (Sonnet, Opus) × 3 runs = 12 builds, undisguised, no
  ontology; zflx first, then harness (A3). Procedure: A2–A4 for zflx (`tools/zflx_build.sh creastmt <wiki> <n>`,
  `PROMPT` and `PDF` set to the files above), A8 for the harness (`STEP=creastmt tools/harness_build.sh <wiki> <n>`),
  same driver and gate rules.
- **Execution:** `tools/adapter_creastmt.py`. Step isolation: a set's inputs are the oracle's `combtran_transact`
  and `intcalc_acctdata` for that set plus the set's own `cardxref.dat` and `custdata.dat`. File mode sends the
  CONTRACT-L1 files as fixed-width text; record mode sends every copybook field (text as is apart from trailing
  spaces). A pure renaming map per build is allowed as in A2/A4; an error with no output leaves the set's outputs
  absent (R-ABSENT).
- **Adapter check, before any build:** `adapter_creastmt.py selftest` runs each set through both modes and the
  independent model and scores it: 100% strict and business on base and c01–c04 (79d5e60).
- **Flags:** mapped by Claude from each build's assumptions before any output is opened (§6), committed with a hash.
- **Scoring:** `report_compare.py --outputs creastmt_statements,creastmt_statements_html` against `golden/v1` and
  `golden/v1/cases/<set>/out`, with S4 on c04. Statements a build prints for cards legacy never reaches in c03 are
  R-STMT-ABEND.
- **Repairs:** none. Any exploratory repair needs its own amendment, written before it is scored.

**A14 (2026-10-26, same point). TRANREPT, daily transaction report.**
- **Inputs:** as A13:
  - `tranrept-sonnet` (8 pages + contract, PDF 29 pages, a16f6b66…): process-transaction-report,
    acceptance-criteria-transaction-report, project-data-model, workflow-reference-data-access,
    workflow-transaction-data-access, plugin-transaction-report-document, process-end-of-day-batch-chain,
    process-report-request;
  - `tranrept-opus` (6 pages + contract, PDF 19 pages, 6c7d6d72…): process-reports, acceptance-criteria-reports,
    project-data-model, ui-flow-reports, system-statementpdf, process-date-utility. The Opus wiki has no page named
    for the batch report; process-reports is its step page because its legacy source names `TRANREPT.jcl` (it also
    covers the online report request, CORPT00C). The bundle is what the rule gives from that page, and the paper
    reports it as such.
- **Prompt:** Appendix A verbatim with "(daily transaction report)" (`builds/inputs/prompt-tranrept.txt`).
- **Conditions, order, procedure:** as A13 with `creastmt` replaced by `tranrept`.
- **Execution:** `tools/adapter_tranrept.py`. A set's inputs are the oracle's `combtran_transact` plus the set's own
  `cardxref.dat`, `trantype.dat` and `trancatg.dat`; run parameters start date `2022-07-01` and end date
  `2022-07-31`. Modes, renaming and R-ABSENT as A13. Adapter check: 100% strict and business on all five sets in
  both modes (79d5e60).
- **Flags, repairs:** as A13.
- **Scoring:** `report_compare.py --outputs tranrept_report`; page totals and page breaks reported as layout only (S2).

**A15 (2026-10-26, after every layer 1 build was scored, before any re-run build). Exploratory re-run arm:
harness after fixes.** This arm is exploratory. It tests whether the harness fixes change the scores; it is not a
pre-registered hypothesis test, and its results are reported next to the scored harness results (A8, A11, A13, A14),
never pooled with them and never replacing them.
- **Builder:** the AI harness service on dev-env, image
  `<registry>/harness:local-eb96f3cbe-1793050303`
  (manifest digest `sha256:08e4428b63ea65c7982d7c0c1af28fbe6224570652320210b79f863546a049bd`), built from a clean
  checkout of commit `eb96f3cbe` (branch `<internal branch>`, an internal platform PR, open and not
  merged) with the service Dockerfile, linux/amd64. Model as resolved by the org manager at run time,
  recorded per build. Everything else on dev-env is unchanged; the deploy, its time and the rollback image are logged
  in the notebook.
- **Fixes in that image** (one commit each, an internal platform PR): A4 script limit stated (bc34e7376); B1 rebuild keeps the
  source's failure handling, digit identifiers stay strings (3e29d18f0); B3 prompt (716e84ddd); A9 restart after a
  run-added item (755ca367b); A2 `paused_on_item` (019089c54); A3 resume fields (3d7ebe94b); empty `error` list on a
  successful run no longer fails the check (c32c8947d); non-printable filler bytes never cause a rejection
  (6ebf967d1); a step rewritten mid-run keeps its approved text (dfbc1f2ce); a failed check names the differing
  values (81e60fbee); A5 eval-write failure logged and non-blocking (6cd858698); B3 gate 1.179 (eb96f3cbe). Not
  fixed: A1, B2, A6, A8. The image also carries the 11 harness-sync commits that were already under the scored image
  (262994253 sits on top of them).
- **Conditions:** harness × {Sonnet wiki, Opus wiki} × r1–r3 × {INTCALC, POSTTRAN, CREASTMT, TRANREPT} = 24 builds,
  in that step order, one at a time, each in a fresh project.
- **Fixed per build, identical to the scored arms:** the prompt (Appendix A with the step name), the bundles and
  their hashes (`builds/inputs/<step>-<wiki>/`), the contract (CONTRACT.md, with CONTRACT-L1 for layer 1), the
  driver and its gate answers (`tools/harness_build.sh`, recommended option, brief and plan approved unchanged),
  the allowed interventions (infrastructure only, logged; retries as A2), the A2 rule that the build is the project's
  latest version committed or work in progress, the adapters, decoders and scorers (`scorer/compare.py` for INTCALC
  and POSTTRAN, `scorer/report_compare.py` with S4 for layer 1), and flags mapped by Claude from each build's
  register before any output is opened (§6), committed with a hash. The bundle PDFs keep the whitespace collapse
  recorded in notebook §48, so layout scores stay comparable.
- **Expectations, written down before any re-run build (exploratory, not hypotheses):**
  - INTCALC: Sonnet-wiki builds return records on every set and reach the zflx scores (99.00 / 99.00 / 98.99 /
    99.00 / 99.03); Opus-wiki builds ask at least one question about the rate lookup, grouping or fallback; no build
    pauses on the script limit.
  - POSTTRAN: every Sonnet-wiki build returns records on every set (zflx and harness Sonnet r2 reached 100%);
    Opus-wiki builds ask about the reject codes, the credit rule or the sign of the cycle totals; no build ends
    with a run that cannot be restarted.
  - CREASTMT: builds no longer reject `transact.dat` on its NUL filler; no build loses the contract layouts when a
    step is split; whether address line 3 and FICO match legacy is left open (the Sonnet wiki states the address
    rule; the scored harness builds still differed there).
  - TRANREPT: no build fails on an empty `error` list or on the NUL filler; Sonnet-wiki builds return records on
    every set (harness Sonnet r1 reached 99.17–99.19% business); the last-transaction double count and the last
    account total stay as flagged divergences unless a build asks about them.
  - Across steps: at least one Opus-wiki build per step asks a question about a number-deciding rule (gate 1.179);
    no build that returns output has a silent divergence.
- **Reporting:** a new condition, "harness after fixes", per step and per set, business and strict, with the
  divergent / silent / flagged counts and the rule table, next to the scored harness and zflx results. The paper
  states the fix list, the image, the dates, and that the arm is exploratory. Any further change to the image means
  a new amendment before its builds.

## Appendix A. Build inputs and prompt

**Inputs per wiki.** The rule below is mechanical and applies to both wikis. Neither wiki has per-program pages.
- the step's process page;
- its acceptance-criteria page;
- `01-data-model/project-data-model.md`;
- every wiki page the process page links to;
- `CONTRACT.md`.

The bundles are frozen with hashes in `builds/inputs/<step>-<wiki>/SHA256SUMS`. For INTCALC:

| Bundle | Pages |
|---|---|
| `intcalc-sonnet` (7 pages + contract) | process-interest-calculation, acceptance-criteria-interest-calculation, project-data-model, workflow-account-data-access, workflow-reference-data-access, workflow-transaction-data-access, process-end-of-day-batch-chain |
| `intcalc-opus` (3 pages + contract) | process-interest-calculation, acceptance-criteria-interest-calculation, project-data-model |

The two bundles differ in size because the two wikis link differently. That difference belongs to each wiki and
is reported as such.

**Prompt (verbatim, identical for every run and builder):**

> Build a FlowX.AI implementation of the CardDemo batch step described in the attached wiki pages
> (interest calculation). It reads the input files listed in CONTRACT.md and writes the outputs CONTRACT.md lists
> for this step, in the format given there. Implement the behaviour the wiki documents. Wherever the wiki is
> uncertain, incomplete or silent and you had to decide something, record each decision in `assumptions.md`
> next to the outputs: what you assumed, and which wiki statement (or absence of one) it rests on.

The paper discloses that the prompt asks for assumptions. Assumptions recorded in `assumptions.md` count as
flags under §6, mapped to rule IDs before scoring.
