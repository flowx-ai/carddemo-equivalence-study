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

**A16 (2026-10-27, after every A15 re-run build was scored, before any change-request build). Change request: the
spec changes, the code does not.** Two rule changes. Each is made once in the Sonnet wiki and once in the COBOL; the
wiki states the new rule as the rule, with no change-request marker.
- **CR1:** INTCALC interest is rounded to the cent (`COMPUTE … ROUNDED`). A model could supply this from memory: the
  change is proposed in CardDemo's public tracker (PR #32). It is the contrast.
- **CR2:** POSTTRAN's over-limit check moves to `creditLimit × 1.10`. No public source proposes it. It is the
  headline.
- **Oracle:** `golden/cr1` and `golden/cr2`, from `cr/run_oracle.sh` with the build.sh flags, on the five sets.
  Independent models `cr/ref_*_cr*.py` give PASS on all sets; the negative control against `golden/v1` gives FAIL.
  Legacy kept as the candidate scores 43.4–44.7% against CR1 and 91.1–92.3% against CR2. Diffs and hashes are in
  `plan_experiments_change_and_ablation.md`.
- **Conditions:**
  - **zflx** (`claude-opus-5-5`) × {CR1 on `cr1-intcalc-sonnet`, CR2 on `cr2-posttran-sonnet`} × r1–r3. The prompt is
    Appendix A with the step name, and the bundles are rendered with `tools/bundle2pdf_v2.cjs`. Run order: CR1
    r1–r3, then CR2 r1–r3.
  - **harness**, after the zflx builds: the same 6 builds on the dev-env harness image
    `<registry>/harness:local-8a7b5087c-1793131445` (OCI index digest
    `sha256:9da070d0ff4939721f0f6f8a3ac3471e9ceea140f30ef27d051314cb4948d90a`, commit `8a7b5087c`, an internal platform PR, stacked on an earlier internal PR, neither merged). This image is called **the A18 image** below.
  - **Smoke condition, met before this amendment was stamped.** Smoke builds use non-study projects and are never
    scored. Their checks: plan COMPLETED, no NUL pause, no dotted-key failure, no stray options, and the base set
    executes and decodes.
    - The first p2 image (`local-804cbd90f`, digest `4c7a58d5…`) passed INTCALC, POSTTRAN and TRANREPT.
    - CREASTMT failed on it twice, on two further harness defects. R7 was a 20,000-character limit on a check
      case. R8 was a check that failed an expected-empty output that came back empty.
    - Both were fixed in two further fix rounds (`90f77f1f4`, then `8a7b5087c`).
    - CREASTMT then passed on the A18 image (smoke r3, 2026-10-27 21:25Z).
    - The three other steps were not rebuilt on the A18 image. R7 and R8 only widen what the build's own check
      accepts.
    - The smoke record is in `runs/smoke/` and notebook §53.
  - The driver, gate answers, interventions and A2 rule are the same as A15, with one correction. A FAILED plan is
    retried only for a platform-side error code. Before 2026-10-27 the driver also retried `behaviour_failed`; that
    is a deviation from A2, disclosed in §53 and handled in A18. Decode keymaps are read from each workflow definition
    and committed before that build executes.
- **Scoring:** `scorer/compare.py` unchanged, against `runs/A16_golden/cr1/<set>` and `golden/cr2`. Flags are mapped
  from each build's register before any output is opened (§6). Per build: business equivalence, and one outcome of
  "followed the change", "kept legacy, flagged", "kept legacy, silent" or "other".
- **H11 (zflx) and H11h (harness), tested separately and never pooled.** Each CR build follows the changed rule,
  with no silent R-INT-TRUNC (CR1) or R-POST-102 (CR2) divergence against `golden/crN`. It is refuted for a builder
  and a rule if two or more of the three builds follow the legacy rule silently.
- **Expectation (not a hypothesis):** zflx CR1 builds score about 99%, as INTCALC Sonnet did, with R-INT-LAST the only
  silent rule; zflx CR2 builds score 100%.

**A17 (2026-10-27, same point). Wiki ablation on the disguised INTCALC (map D).** Four arms that differ only in the
specification:
- detailed: the A5 Sonnet-wiki bundle, rerun r1–r3, interleaved with the other arms;
- summary: the process page up to Business Rules, plus the record layouts and CONTRACT;
- no wiki: the record layouts and CONTRACT;
- code only: the disguised LXB002C with its copybooks and shims, plus CONTRACT.

The bundles are in `disguise/d1/ablation/`, hashed and rendered with v2.
- **Conditions:**
  - **zflx** × {detailed, summary, no wiki, code} × r1–r3 = 12 builds, in the Ledgerline workspace as A5. They are
    interleaved per rep: detailed, summary, no wiki, code. The A5 detailed results are reported beside the rerun,
    not pooled with it.
  - **harness** on the A18 image (see A16), same 12 builds, after the zflx arm. The A16 smoke condition is met.
- **Scoring:** as A5. Decode maps and the recall pre-score record are committed before any output is opened, against
  `runs/A5_golden/<set>/`.
- **H12.** The detailed arm's median business equivalence is no more than 1 point below the code-only arm's.
- **H13.** The detailed arm is more than 1 point above the summary arm.
- **Both are tested per builder, never pooled.**
- **Instrument check (not a hypothesis):** the no-wiki arm stays more than 5 points below the detailed arm. If it
  doesn't, the ablation is reported as uninformative.

**Order for A16 and A17:** zflx CR1, then zflx CR2, then the zflx ablation. The harness runs after that, in the
same order (the smoke condition holds; see A16).

**A18 (2026-10-27, after the smoke builds on the A18 image passed, before any A16, A17 or A18 build). Harness after
all fixes: a full CardDemo re-run, and a correction for retries A2 does not allow.**

- **(a) Full re-run.** This arm is exploratory, like A15. It is reported next to the scored harness results
  (A8, A11, A13, A14) and the A15 re-run, never pooled with them and never replacing them.
  - **Builder:** the harness on dev-env, A18 image (`local-8a7b5087c-1793131445`, digest
    `sha256:9da070d0ff4939721f0f6f8a3ac3471e9ceea140f30ef27d051314cb4948d90a`).
  - **Fixes:** the A15 fixes (an internal platform PR) plus an internal platform PR:
    - R2: NUL filler escaped in plan JSON (1af21438e).
    - R3: dotted output keys kept flat (15542e7e1).
    - R4: an AI node's run-time error is reported (5a4c154f5).
    - R5: ask_user offers only its own options (c4239a532).
    - R6: decision timeout of 300 s for script-writing decisions (804cbd90f).
    - R7: a check case can hold up to 100,000 characters (90f77f1f4).
    - R8: an output the check expects empty, and that comes back empty, passes (8a7b5087c).
    - Not fixed: A1 (`committed_preview_changed` on the first commit, retried as a platform error), B2, A6, A8.
  - **Conditions, identical to A15:** harness × {Sonnet wiki, Opus wiki} × r1–r3 × {INTCALC, POSTTRAN, CREASTMT,
    TRANREPT} = 24 builds. They run in that step order, one at a time, each in a fresh project named
    `cd_a18_<step>_harness_<wiki>_r<n>`. Prompt, bundles and hashes, contract, gate answers, adapters, decoders,
    scorers, flag mapping before outputs are opened, and the A2 latest-version rule are all as A15.
  - **The driver change:** a FAILED plan is retried, at most twice, only for a platform-side code
    (`committed_preview_changed`, `validation_unknown`, `timeout`, `platform_error`, `internal_error`). A PAUSED plan
    is retried only when the harness attributes the stop to its own side (A8). A build's own failed check
    (`behaviour_failed`, `goal_at_risk`) ends the run, and the latest version is scored.
  - **Expectations (exploratory, written before any A18 build):** every build returns output on every set, and the
    Sonnet-wiki builds reach the scores of the zflx Sonnet-wiki builds on every step. No build that returns output
    has a silent divergence.
  - **Reporting:** a third harness column, "after all fixes (A18)", next to "first scored run" and "after first fixes
    (A15)", per step and set, business and strict, with divergent, silent and flagged counts.

- **(b) Correction for retries outside A2 (notebook §53).** Up to 2026-10-27 the driver retried `behaviour_failed`
  as if it were a platform error. Each retry restarts the plan on a new branch, so in three builds the scored latest
  version came from the second such retry:
  - TRANREPT harness Sonnet r1 and r2 (A11);
  - POSTTRAN harness Sonnet r1 (A15).

  For each, the version left by the first attempt (the latest version when the first `behaviour_failed` stopped the
  run) is executed and scored with the same adapters and scorer. Its keymaps are read from its own definition and
  committed before execution, and its flags are mapped before outputs are opened. It is reported as a labelled
  post-hoc correction beside the original score. Both figures are kept.

**Order of all remaining builds:**
1. The A18 (b) corrections (no builds).
2. zflx CR1, CR2, then the ablation (A16, A17).
3. harness CR1, CR2, then the ablation (A16, A17, A18 image).
4. The A18 (a) CardDemo re-run.

Each phase starts only after the previous one is scored, or after the user's decision.

**A19 (2026-10-28, after harness defect D1 stopped the A16 harness arm, before any build on the new image). Harness
on the A19 image.**

- **Why:** the A16 harness arm on the A18 image stopped after 2 of 18 builds. CR1 r1 COMPLETED (99.00 / 99.00 /
  98.99 / 99.00 / 99.03, followed the change). CR1 r2 PAUSED `intent_unparseable` and left no workflow (R-ABSENT):
  - its calculation script was over the harness's own 20,000-character script bound (`ComposeScript.script`);
  - the harness refused it, and every split attempt was again over the bound;
  - the engine has no such limit (`runs/a16/HARNESS_DEFECTS.md`, notebook §58).
- **The A19 image:** `<registry>/harness:local-2cd4ec072-1793149068`,
  OCI index digest `sha256:8deba674c4e233c83ac5888c13ce5be99689cfdc12e53d6035fb4fbd7d228f16`, commit `2cd4ec072`
  (an internal platform PR, stacked on an earlier internal PR, neither merged).
  - It carries R2–R8 (A18) plus R9: workflow script nodes may hold 40,000 characters (one shared constant). An
    over-limit script is refused with its length, the true limit and advice to split it.
  - Process-action, SQL and payload bounds are unchanged.
  - Deployed to dev-env on 2026-10-28 at ~01:10Z under the user's overnight authority (§54). The rollback is the
    A18 image.
- **What changes:**
  - **A16 and A17 harness arm:** all 18 builds run again, fresh, on the A19 image (CR1 r1–r3, CR2 r1–r3, A17
    12 builds), in the A16/A17 order. Projects are named `cd_a19h_<step>_harness_sonnet_r<n>` and
    `ll_a19h_accrue_harness_<arm>_r<n>`.
  - **H11h, H12, H13 and the instrument check** are tested for the harness on these A19 builds only.
  - **The two A18-image builds** are reported as a separate partial arm, "harness, A18 image (stopped by D1)".
    They are never pooled with the A19 builds and never dropped.
  - **A18 (a), the full CardDemo re-run:** it runs on the A19 image (none of its builds had started). Projects are
    named `cd_a19_<step>_harness_<wiki>_r<n>`.
  - **Everything else is as A16, A17 and A18:** bundles, prompts, gate answers, the A18 driver retry rule, the A2
    latest-version rule, keymaps and flags committed before execution, scorers.
- **Smoke:** no new smoke build. R9 only widens a bound the build itself writes against. The first A19 build is
  watched for any new failure mode. A harness defect stops the arm again, under the same rule.
- **Order:** the harness A16/A17 arm, then A18 (a).

**A20 (2026-10-28, after harness defect D2 stopped the A19 harness arm, before any build on the new image). Harness
on the A20 image.**

- **Why:** the A19 harness arm completed and scored A16 (6 of 6 builds; `runs/a19h/SUMMARY.md`). It then stopped at
  A17 detailed r1 (`ll_a19h_accrue_harness_detailed_r1`), notebook §60, `runs/a19h/HARNESS_DEFECTS.md`:
  - planning failed with `unsupported_capability`, no part named, after the build's own approved brief;
  - nothing was written, so the build is scored R-ABSENT, 0%.
- **Cause, from the planner's trace:**
  - The build's answer to the file-writing scope question was applied to every later gap.
  - The approved brief contradicted itself: it put opening the input files out of scope (the caller supplies their
    contents) and also kept a restored check that the build "reads the input files".
  - The coverage check sent the plan back, and the planner refused reading files without asking.
- **The A20 image:** `<registry>/harness:local-7efcc95ef-1793176993`, OCI
  index digest `sha256:f4cd0b26002e0e301aafabd7ba6a10c177165fd25bcd362b6e4e2df1ee967eb3`, commit `7efcc95ef`
  (an internal platform PR, stacked on an earlier internal PR, neither merged).
  - It carries R2–R9 (A19) plus R10 and R11:
    - R10: a scope answer covers only the operations it names, and a refusal names the refused operation.
    - R11: a restored "reads the input files" check, next to a row saying the caller supplies their contents, is
      read as taking those contents as inputs.
  - Deployed to dev-env on 2026-10-28 with the user's approval. The rollback is the A19 image.
- **What changes:**
  - **A17 harness arm:** all 12 builds run fresh on the A20 image, interleaved per rep as A17. Projects are named
    `ll_a20h_accrue_harness_<arm>_r<n>`; run dirs are `runs/a20h/a17/`.
  - H12, H13 and the instrument check are tested for the harness on these builds only.
  - **The A19 detailed r1 build** is reported as a separate partial result, "A19 image (stopped by D2)", never
    pooled.
  - **The A16 harness results on the A19 image stand** as the harness change-request result. A16 is not rerun.
  - **A18 (a), the full CardDemo re-run:** it runs on the A20 image, after the A17 harness arm. Projects are named
    `cd_a20_<step>_harness_<wiki>_r<n>`; run dirs are `runs/a20/`.
  - **The driver** also stops when the session reaches phase `blocked`. Before, it polled until the logins
    expired, with no effect on any outcome.
  - **Everything else is as A16–A19:** bundles, prompts, gate answers, the A18 retry rule, the A2 latest-version
    rule, keymaps and flags committed before execution, scorers, the image digest checked before every build.
- **Smoke:** no new smoke build. R10 and R11 change only the planning path that stopped D2. The first A20 build is
  watched; a harness defect stops the arm again, under the same rule.
- **Order:** the A17 harness arm, then A18 (a).

**A21 (2026-10-28, after the first A20 harness build completed, before any CR3–CR8 build). Six further change
requests, and a new order.**

- **Why:** the change request is the study's lead result, and two rules (A16) are thin. Six more rules, one or two on
  each of the four steps, test whether following a spec-only change holds beyond INTCALC and POSTTRAN. The full
  harness CardDemo re-run (A18 (a)) is kept, unchanged, and moved after them.
- **Change requests.** As A16: each rule is changed once in the Sonnet wiki and once in the COBOL. The wiki states the
  new rule as the rule, with no change marker, and rows that would contradict it are removed. Preparation record:
  notebook §62, commit `a03957e`.
  - **CR3, INTCALC:** an account opened on or before the same calendar date ten years before the run date (run
    parameter 2022071800, so on or before 2012-07-18) is charged its disclosure-group rate minus 2.00, never below
    0.00.
  - **CR4, POSTTRAN:** a card may have at most four purchases (amount > 0) posted per run, counted in feed order. A
    further purchase that passes checks 100–103 is rejected **104** "DAILY PURCHASE LIMIT EXCEEDED".
  - **CR5, POSTTRAN:** the run posts the day's transactions in ascending order of amount, smallest first (credits,
    which carry negative amounts, come first). Equal amounts keep their feed order.
  - **CR6, CREASTMT:** Total EXP is the sum of the charges listed (amounts above zero). Credits and returns are listed
    but not subtracted.
  - **CR7, TRANREPT:** interest postings (type 01, category 0005) are left out of the daily report. They get no line
    and are not counted in any total.
  - **CR8, CREASTMT:** the statement shows the FICO score band in place of the score: below 580 Poor, 580–669 Fair,
    670–739 Good, 740–799 Very Good, 800 and above Exceptional.
  - **Novelty:** none of the six was found proposed in CardDemo's public tracker or on the web, in 44 searches
    (`cr/NOVELTY_CR3_8.tsv`). Nothing stronger is claimed.
  - No fee rule: TRANCATG has no fee category, so a fee would need new reference data.
- **Oracle:** `golden/cr3`–`golden/cr8`, from `cr/run_oracle.sh` with the build.sh flags, on the five sets. The runner
  now also keeps the upstream files the report steps read. `golden/cr1` and `golden/cr2` regenerate byte-identical,
  and the unpatched binaries reproduce all `golden/v1` outputs.
  - Independent models `cr/ref_*_cr3..8.py`, written from the rule text, give PASS on all 30 rule × set pairs. The
    negative control against `golden/v1` gives FAIL on all 30.
  - Legacy kept as the candidate scores, business: CR3 70.7–71.8%, CR4 72.0–72.7%, CR5 84.4–84.7%, CR6 50.0%, CR7
    72.4–73.2%, CR8 0.0%.
  - Diffs, hashes and the changed records per set (`cr/crN/changed_keys.json`) are in
    `plan_experiments_change_and_ablation.md`, Experiment 4.
- **Bundles**, rendered with `tools/bundle2pdf_v2.cjs` under neutral names; hashes in `cr/PDF.SHA256`:
  `intcalc-sonnet-ni2` (CR3), `posttran-sonnet-va7` (CR4), `posttran-sonnet-dr8` (CR5), `creastmt-sonnet-bd5` (CR6),
  `tranrept-sonnet-ix3` (CR7), `creastmt-sonnet-yx3` (CR8). No bundle or project name carries a change marker; a
  text search of each PDF finds the same marker-word counts as the frozen bundle of its step.
- **Conditions:**
  - **zflx** (`claude-opus-5-5`) × CR3–CR8 × r1–r3, 18 builds. Projects `cd_a21_<bundle id>_zflx_r<n>` (e.g.
    `cd_a21_ni2_zflx_r1`); run dirs `runs/a21/`.
  - **harness** on the A20 image (OCI index digest
    `sha256:f4cd0b26002e0e301aafabd7ba6a10c177165fd25bcd362b6e4e2df1ee967eb3`, checked before every build), the same
    18 builds, projects `cd_a21_<bundle id>_harness_r<n>`, as many as complete before the paper freeze. Builds not
    run by then are reported as not run, never estimated.
  - Prompt: Appendix A with the step name. Run order per builder: CR3, CR4, CR5, CR6, CR7, CR8, each r1–r3.
  - Driver, gate answers, interventions, the A2 latest-version rule and the A18 retry rule are as A16–A20. Keymaps
    and flags are committed before each build executes.
- **Scoring:** the scorers are unchanged.
  - `scorer/compare.py` scores CR3 against `runs/A21_golden/cr3/<set>`, and CR4 and CR5 against `golden/crN`.
  - `scorer/report_compare.py` scores CR6–CR8 against `golden/crN`, with S4 on c04.
  - Flags are mapped from each build's register before any output is opened (§6).
  - Each build gets business equivalence and one outcome: "followed the change", "kept legacy, flagged", "kept
    legacy, silent" or "other". A build "kept legacy" on a changed record when its value equals `golden/v1` there.
- **H14 (zflx) and H14h (harness), tested separately and never pooled.** Each CR build follows the changed rule, with
  no silent divergence of the CR's rule on the records it changes, against `golden/crN`. Rule ids: CR3 R-INT-RATE,
  CR4 R-POST-104, CR5 R-POST-102, CR6 R-STMT-TOTAL, CR7 R-REPT-SET, CR8 R-STMT-FICO.
  - Per rule: refuted for a builder and a rule if two or more of the three builds follow the legacy rule silently.
  - Overall: refuted for a builder if that happens on two or more of the six rules.
- **Known limits, stated before any build:**
  - CR8: CONTRACT-L1 still labels the field "FICO score X(20)", which a build can fairly read as the number. The text
    scorer compares the field's value up to its first space.
  - CR5: posting credits first interacts with the legacy over-limit sign (the sign PR #32 proposes to change). A build
    that also changes the sign differs from legacy for that reason, and is classified "other".
  - CR3 depends on the run date from the run parameter; a build that uses today's date moves the cutoff.
  - CR7: the legacy end-of-file double count stays, now on the last printed amount; the wiki does not describe it, as
    before (R-REPT-LASTDUP).
- **Order on dev-env, one build at a time:**
  1. The A17 harness arm under A20 finishes as registered (12 builds).
  2. zflx CR3–CR8 (18 builds).
  3. harness CR3–CR8 (18 builds).
  4. A18 (a), the full harness CardDemo re-run on the A20 image (24 builds), unchanged except for its place.
- **Everything else is unchanged.** A16, A17 and their results stand. No scored result is replaced.

**A22 (2026-10-28, after harness stop D3 ended the A17 harness arm at 6 of 12 builds, before any further harness
build). A turn-level platform stop is retried; the A17 harness arm is completed.**

- **Why:** A17 harness summary r2 (`ll_a20h_accrue_harness_summary_r2`) stopped while the harness was still indexing
  the PDF: event `lease_expired`, `retryable: true`, before any brief, question or plan, with nothing written
  (`runs/a20h/HARNESS_DEFECTS.md` D3, notebook §65). The A18 retry rule names plan-level codes only and does not cover
  a stop before any plan exists. A2 allows a retry for a platform-side error. No output of this build exists, so the
  retry cannot depend on its result.
- **Rule:** a turn that ends with a platform event marked `retryable: true` (such as `lease_expired`) before any plan
  exists is a platform-side stop under A2. It is retried once, in the same project with a new session; if the project
  state prevents that, in a new project named with the suffix `_retry1`. A second such stop on the same build stops
  the arm, as a harness defect does. This applies from now to every harness build (A17 remainder, A21, A18 (a)).
  The first attempt's record is kept and disclosed in the build's retries.log; it is never scored as the build.
- **The A17 harness arm, completed on the A20 image:** summary r2 (retry), nowiki r2, code r2, then detailed r3,
  summary r3, nowiki r3, code r3 (7 builds), as A17 and A20 otherwise. H12, H13 and the instrument check are tested
  for the harness on the 12 A20 builds. If the arm stops again, the six scored builds are reported descriptively, as
  in §65.
- **Instrument fix, disclosed:** `tools/run_build.py` now decodes a build's END output from the opening brace (a
  Markdown fence inside a build log had ended the old regex early). It gives identical results on all earlier A20 run
  logs (commit in §65).
- **Order on dev-env, one build at a time (replaces A21's order):**
  1. zflx CR3–CR8 (18 builds), already started.
  2. The A17 harness arm remainder (7 builds).
  3. harness CR3–CR8 (18 builds).
  4. A18 (a) (24 builds).
- **Everything else is unchanged.** No scored result is replaced.

**A23 (2026-10-29, after harness defect D5 stopped the A21 harness arm at 5 of 18 builds, before any build on the new
image). The A21 harness arm, CR4–CR8, on the A23 image.**

- **Why:** two plans paused `goal_at_risk` before their first step because the executor lacked material the planner
  had read from the attached PDF: D4 (A17 code r3, `runs/a20h/HARNESS_DEFECTS.md`) and D5 (A21 CR4 r2,
  `runs/a21/harness/HARNESS_DEFECTS.md`; notebook §68–§70). Cause: the request built for the executor kept only a
  fixed list of step fields and dropped the fields in which the planner had written the source material; the executor
  cannot read attachments itself. Attachment expiry is not involved.
- **The A23 image:** `<registry>/harness:local-4144a2849-1793274007`, OCI
  index digest `sha256:1eff15db73957ebe3575c7f8d80da7ae2987c7916385bb9b54c1bc7be0950003`, commit `4144a2849`
  (an internal platform PR, stacked on an earlier internal PR, neither merged). It carries R2–R11 (A20) plus R12: the executor's request
  also carries the step's other fields and the attached pages the step cites, read from the stored extraction, within
  the request size limit; pages left out are listed. Deployed to dev-env on 2026-10-29 at 11:41Z with the user's
  approval. The rollback is the A20 image.
- **What changes:**
  - **A21 harness arm, CR4–CR8:** all 15 builds (CR4 r1–r3 … CR8 r1–r3) run fresh on the A23 image, in A21's order.
    Projects `cd_a23_<bundle id>_harness_r<n>`; run dirs `runs/a23/harness/`.
  - **CR3 on the A20 image stands** (3 of 3 builds, complete, `runs/a21/harness/`). It is not rerun.
  - **CR4 r1 and r2 on the A20 image** are reported as a separate partial result, "A20 image (stopped by D5)", never
    pooled.
  - **H14h** per rule: CR3 on its A20 builds, CR4–CR8 on their A23 builds. The overall H14h criterion counts the six
    rules across the two images; this is stated wherever it is reported.
  - **Driver:** `tools/harness_api.py` ends a stream read at the server's end event, when the server closes it, or
    after 10 minutes idle while no turn runs, then re-polls the session (commit `6f3a13a`, notebook §70). Before, it
    could wait on a stream the server had ended (D5: 2 h 31 min). No other behaviour changes.
  - **Concurrent non-study activity** on dev-env (a demonstration UI build in its own project and the user's browser
    check of it) is logged in `runs/a21/interventions.log` with start and end times; any harness stop in such a window
    is checked against it.
  - **Everything else is as A21 and A22:** bundles and their hashes, prompts, gate answers, the A18 and A22 retry
    rules, the A2 latest-version rule, keymaps and flags committed before execution, scorers, the outcome rule, the
    image digest checked before every build.
- **Smoke:** no smoke build. R12 only adds material to the executor's request; a step that cites nothing sends the
  same request as before. The first A23 build is watched; a harness defect stops the arm again, under the same rule.
- **Order on dev-env, one build at a time:** the A21 harness arm CR4–CR8 on the A23 image, then A18 (a) on the A23
  image (24 builds; projects `cd_a23_<step>_harness_<wiki>_r<n>`, run dirs `runs/a23/a18a/`).

**A24 (2026-10-29, after A23 ended with its harness arm stopped at D6, before any A24 build). The first online
slice: FlowX screens against the online oracle, and one end-to-end case.**

- **Why:** every arm so far builds batch steps; §10 puts the online (CICS) half out of scope, because it could not
  run. The online oracle (`plan_online_oracle.md`, `ONLINE_ORACLE.md`, `golden-online/v1`) now runs the four programs
  of slice 1 unchanged under GnuCOBOL with a CICS stub. A24 tests whether FlowX builds of that slice behave like the
  legacy screens, and whether a payment made on the FlowX screens reaches the FlowX batch builds the way it reaches
  the legacy batch. Target claim: *"from mainframe batch to working screens, end to end, both checked against the
  original."* H15–H19 below are written so that each can refute it.

- **A23's end.** A23 ended with its harness arm stopped at D6; A24 follows it.

- **Pilot disclosure (unregistered, unscored).** Before this amendment, on 2026-10-29, a UI pilot built the same four
  screens on the same environment (`~/Dev/_tests/carddemo-ui-demo/REPORT.md`): zflx with `claude-opus-5-5`, in a
  non-study project in another workspace, in three sessions (build, a fix session given two screenshots, a slice
  extension). It is **not** a scored result and is reported as a pilot only. It differs from A24 in ways that matter:
  - it was built from **mixed wikis**: sign-on and account view from the Opus wiki (93 pages), main menu and bill
    payment from the Sonnet wiki (146 pages), with the Opus project data model;
  - its CONTRACT.md carried task instructions (scope, routing, sign-on against seeded users) and a form pattern
    (`run_fix1/PATTERN.md`, summarised in `bundle_slice/CONTRACT.md`) derived from its own browser failures;
  - its checks were our own scripts, not the online oracle.

  **Design choice, stated explicitly:** the pilot's PATTERN.md and its CONTRACT.md form pattern have **no role** in
  A24 inputs. No A24 bundle, contract or prompt contains or paraphrases them, and no A24 build is told the pilot
  exists. No A24 build uses the pilot project. Its only A24 use is as an instrument: the adapter check below runs on
  the pilot app, never scored. Each A24 transcript (zflx) and event list (harness) is checked for any listing or read
  of the pilot project; any such access is reported, and that build is reported separately, never pooled. The
  authors saw the pilot's results before writing A24 and the online cases; every expectation below that the pilot
  informed says so.

- **Provenance of the checks (as §3a).**
  - The 17 online cases (`cases-online/`, commit 490dc88) were written from the COBOL branches. Each one's CASE.md was
    committed before the first oracle run. They were written after the authors had read both wikis and seen the
    pilot.
  - The golden outputs are whatever the oracle produced (`golden-online/v1`, commit 165a279, `SHA256SUMS`).
  - The end-to-end join was recorded before its diff was read (commit de42d7e).
  - Every finding is labelled *a-priori* (from the COBOL and the oracle) or *post-hoc* (shaped by a wiki or pilot read).

- **Oracle and its limits.** Slice 1 is COSGN00C, COMEN01C, COACTVWC and COBIL00C. The cases run under
  `golden-online/v1` (frozen, `SHA256SUMS`), with the stub, driver and programs at commit 165a279.
  - The stub interprets CICS and BMS rules from mainframe's public documentation. It is checked by its own self-tests
    (`tests-online/run_selftest.sh`, 48 pass), **never against a real CICS region; no reference CICS exists for this
    study.** The online oracle is therefore weaker evidence than the batch oracle. Every scored value that rests on a
    stub rule is tagged and reported apart (Scoring, below).
  - The clock is pinned to 2022-07-18 10:00:00.
  - Statement coverage is 78.6% (`golden-online/v1/COVERAGE.md`).

- **Inputs: one wiki, the Sonnet wiki (146 pages, `~/Dev/_tests/carddemo-wiki-run/sonnet/wiki`), for every screen.**
  - **Rule (mechanical):** the four screens' `03-ui-flows` pages; every page that one of those pages or its
    `02-processes` page links to, one hop, except pages for a screen or process outside the slice; the four screens'
    `10-acceptance-criteria` pages; the three `01-data-model` pages; both `09-roles-and-access` pages. One hop from
    the UI-flow pages gives the four process pages, the four `12-legacy-analysis/screen-co*` pages (legacy layouts
    and messages) and `12-legacy-analysis/transformation-matrix.md`; one hop from the process pages adds
    `04-integrations/workflow-{user-security,account-data,transaction-data}-access.md` and
    `05-triggers/trigger-inventory.md`. Excluded as outside the slice: `ui-flow-admin-menu`, `ui-flow-account-update`
    and the other screens' process pages that `process-menu-navigation` links to.
  - **Bundle `online-sonnet-sf6`** (26 pages + `CONTRACT-UI.md`), made by `tools/a24_bundle.sh`. Page order in
    `PAGES.txt`; hashes in `builds/inputs/online-sonnet-sf6/SHA256SUMS`. Rendered by `tools/bundle2pdf_v2.cjs`
    (unchanged) under the neutral title "CardDemo online screens: wiki pages and data contract"; the PDF hash is in
    `builds/inputs/PDF.SHA256` and `cr/PDF.SHA256`. The 11 pages shared with the frozen Sonnet bundles (A1–A15) are
    byte-identical to them (checked by the script).

    | Page | SHA-256 |
    |---|---|
    | 03-ui-flows/ui-flow-signon.md | `16f48d159551cf7c7fbe304a60e49ebe1235dec1be61b4264b17cc36a1e6c32f` |
    | 03-ui-flows/ui-flow-main-menu.md | `fbbdb6210f284e59a56a06687ae36c5dc6b075c8a7c2c06a31738fbbfb6a099e` |
    | 03-ui-flows/ui-flow-account-view.md | `90477a85f858d50a7fbf7dab3946e9be9cb9a0748ef65f6d15988aad15973572` |
    | 03-ui-flows/ui-flow-bill-payment.md | `76cfa0462fd116ed328740dd32cc40a15c14f0b555b54f97cfbd66defced61d1` |
    | 02-processes/process-user-signon.md | `e99f9089977fe54ddb5d53fd45c5c3147e230c7bace9a02f85e9ef1c0b271597` |
    | 02-processes/process-menu-navigation.md | `b76b79ad27d0c8a966caae1dfd4c43e4d28098486641f86c36cf7d2a771ac40e` |
    | 02-processes/process-account-view.md | `e0dc8d2a45507deaf74e2019d9326a8df2a3d3cd944113370940900398daaf2f` |
    | 02-processes/process-bill-payment.md | `182543bd5ae4d3d9b126455c61148282e6686079daaf6c1adf98ba1ab2531404` |
    | 10-acceptance-criteria/acceptance-criteria-user-signon.md | `20c0100547743c0ec6d6108b5c4bac46b8a7cc615d18b4e906000d4b46ea1bbd` |
    | 10-acceptance-criteria/acceptance-criteria-menu-navigation.md | `f24f84241913f6ecc868337724e9136ba88ece107c84c79b19a418b0c5f3babf` |
    | 10-acceptance-criteria/acceptance-criteria-account-view.md | `33cca57367c73b71750d85d74d021903906da05d05afddf094b36d809d821310` |
    | 10-acceptance-criteria/acceptance-criteria-bill-payment.md | `275ee6b27a7ae8187bb1a7735ad96afe8c06edfacaabb822aace09b9888bab4f` |
    | 12-legacy-analysis/screen-cosgn00.md | `d53e68478d4a806d7ff300f915bf56563b37af78a27c765177f90d3fc21f94e6` |
    | 12-legacy-analysis/screen-comen01.md | `30a29718c5fe9dfdaf45bc35cdc44844d8fd05ed66e8b45c9e50ac1aeaad77d3` |
    | 12-legacy-analysis/screen-coactvw.md | `f96d4401fcba8e3da48f4a7adf93fbc3aa449789840a3fd89cdd73b106da26ae` |
    | 12-legacy-analysis/screen-cobil00.md | `f30554a41651e56da1e3c358a06fe936747fa105d8a991df2f30bef5f59d6641` |
    | 12-legacy-analysis/transformation-matrix.md | `7c2b3ff70351cbd492acc8ebd4f7b25bc90372f7dc1112be9f1f27c990592c9e` |
    | 04-integrations/workflow-user-security-access.md | `c923eba0157c3d95bac5edd72b129a465d4a1764d59e2b9904ee2f95493420cb` |
    | 04-integrations/workflow-account-data-access.md | `5025586467f268846b67cb16674da4383bf2155755bc76e059f98d060bffccee` |
    | 04-integrations/workflow-transaction-data-access.md | `8ae1ebb714f0d9c8a1af57eb1032ffeed0963efc89b4e33d136652dcc273602f` |
    | 05-triggers/trigger-inventory.md | `cbec73a395b097facfcc98910a19f9ad01bbf685c358da790c9437b8bf065dd6` |
    | 01-data-model/project-data-model.md | `19a08c9a602cf03121f4acf71f9ccce10f628e10dcc7be9e66512d113ac0bd37` |
    | 01-data-model/enumerations.md | `2e515f544a07c8e422d4ebe7bc5f8d1b1d98bb069ca548f828d4932689a48484` |
    | 01-data-model/data-model-diagram.md | `45e8bfe813bb9438484ef1ffb522129ee6dac6322aaea072f163502f5b886880` |
    | 09-roles-and-access/roles-overview.md | `18089bb7fede42701c94c69f819cd8b0b1847ee25e6f9d8ad7072e987af72619` |
    | 09-roles-and-access/role-matrix.md | `181fde6807b4636e837f2686f5f3e668c74a34332fedfb1fecec7abee51137d1` |
    | CONTRACT-UI.md | `e52c02b82f763ca067c2cc13681f49c0f489804ef7d601aab9f4fd6e71778913` |
    | PDF `online-sonnet-sf6.pdf` (78 pages) | `2fa1a8106c15bf22ad669c0e1bd4a3633346fa08759fc477a6ccafffeb31aef5` |

  - **Known properties of the input, recorded before any build:**
    - 29 `{{TODO}}` and 15 `{{DECISION}}` markers across the 26 pages, among them `{{TODO: confirm text}}` on
      bill-payment messages (BR-02, BR-08) and `{{DECISION}}` blocks on sign-on (identity provider, a coexistence
      credential check, a lockout proposal). They become flags only through a build's register (§6).
    - **The wiki contradicts itself on new transaction ids, and the bundle keeps both statements as written:**
      `02-processes/process-bill-payment.md` BR-06 says id = last + 1; `04-integrations/workflow-transaction-data-access.md`
      says a sequence allocates the id ("replaces last record + 1"). Legacy uses last + 1. A build that follows the
      sequence differs from legacy on the id; that is reported as it falls (flagged if its register names the
      choice).
    - BR-08 states the success message with one space after "successful."; legacy sends two. Messages are compared
      with runs of whitespace taken as one space (Scoring), so this alone is not a difference.
    - The acceptance pages' Gherkin blocks sit in `<details>` elements, which the frozen renderer prints collapsed,
      as in every earlier bundle (the tables above them are printed).
    - The PDF cover's fixed sentence names "CONTRACT.md" as the contract (a fixed string of `bundle2pdf_v2.cjs`); the
      contract page itself is labelled `CONTRACT-UI.md`.
    - Recall baseline (`tools/a24_recall.py`, `runs/a24/RECALL_PRE.json`): 8 of the 29 distinct scored legacy
      messages and literals are stated verbatim in the bundle.
  - **`CONTRACT-UI.md` (formats only, as `scorer/CONTRACT.md`):** one seed file per legacy file the slice uses, with
    its copybook, field names and types: users (CSUSR01Y), accounts (CVACT01Y), customers (CVCUS01Y), card
    cross-reference (CVACT03Y) and transactions (CVTRA05Y). **Format requirement:** the application keeps that data
    in FlowX Database stores, one store per file, with the contract's field names; the operator loads the stores from
    the seed files before testing and reads them back after. It says nothing about behaviour, routing, messages or
    form construction.
  - **Seed data, the same files for both builders** (`tools/a24_seed.py`, `builds/inputs/online-seed-sf6/`; given to
    the operator only, never to a builder): users from the USRSEC sample (EBCDIC, cp037, as the oracle loads it);
    accounts, customers and cross-reference from `data/in`; transactions from the frozen POSTTRAN output
    `golden/v1/posttran_transact.txt` (262 records). Every seed file, encoded back to the oracle's unload format,
    equals byte for byte the oracle's unload of an untouched session (checked by the script). `users.json` holds
    `@data:USRSEC.<user>.pwd` references, never a password; the loader resolves them in memory.

    | Seed file | SHA-256 |
    |---|---|
    | users.json (10) | `4e526fc29739b7761222e79088042a0f1f6b42c0ac7f95c4ea600970e69c6cee` |
    | accounts.json (50) | `a99335ca3c4349f07fca05bdc4ac81c35545cfb31ed3dacf51feda97956cf5f1` |
    | customers.json (50) | `a5e5c6f9893f2815de2fcdaa70ff490bd5030567fff5fb893c237bdb6297fb25` |
    | card_xref.json (50) | `39a3d5dc900d2d5ef5284e8eb018f2292b0c7848a0255db9376d25875e78dbc5` |
    | transactions.json (262) | `e5baabb75c607a5845485792db4d89040932fb557a4b9d14508ec50fa1ac0d03` |
    | source: AWS.M2.CARDDEMO.USRSEC.PS | `8608d4b8a03f7587c1493282f9337ab24fdf527d0aadbdb85dc3713dccdc6fc8` |

    Each case starts from this base state plus its own `data_edits` from `session.yaml`, applied by the same loader.

- **Prompt (verbatim, identical for every build and builder; `builds/inputs/prompt-online.txt`, SHA-256
  `458f985f192a5d41304a34624bec5d78a0020a35efcfb1ec2b2f990810d6593f`):**

  > Build a FlowX.AI implementation of the CardDemo online screens described in the attached wiki pages (sign-on,
  > main menu, account view, bill payment). The application keeps its data in the stores CONTRACT-UI.md lists, in the
  > format given there; the operator loads them from the seed files before testing and reads them back after.
  > Implement the behaviour the wiki documents. Wherever the wiki is uncertain, incomplete or silent and you had to
  > decide something, record each decision in `assumptions.md`: what you assumed, and which wiki statement (or
  > absence of one) it rests on.

  As in Appendix A, the paper discloses that the prompt asks for assumptions. No other text reaches a builder.

- **Builders, tested separately and never pooled:**
  - **zflx:**
    - setup: `claude-opus-5-5`, the A3/A4 headless setup. That is `claude -p`, only the zflx MCP server
      (`--strict-mcp-config`), built-in tools limited to Read, Write, Edit, Glob and Grep, and a fresh run directory
      under `~/Dev/_tests/carddemo-builds/` that holds only the bundle PDF;
    - profile: the builder runs on its own zflx profile `a24_ui` behind a profile proxy that switches only its own
      session and refuses profile, environment and login switches. This is the pilot's isolation mechanism, not its
      inputs. The shared zflx context is checked unchanged before and after each build;
    - checks: transcripts are checked for reads outside the run directory and for MCP calls outside the run project
      (A7).
    - script: `tools/a24_zflx_build.sh <n>`, wrapper `tools/a24_zflx/zFLX-a24` (a copy of the pilot's profile proxy
      pinned to `a24_ui`; only its trace path differs). Every operator call on an A24 build also goes through it.
  - **harness:**
    - setup: `gpt-6.1-sol` as resolved by the org manager and recorded per build, on the A23 image (OCI index digest
      `sha256:1eff15db73957ebe3575c7f8d80da7ae2987c7916385bb9b54c1bc7be0950003`). The digest is checked before every
      build;
    - driver: `tools/harness_api.py auto` with A8's gate answers, the A18 retry rule, the A22 turn-level retry, and
      A23's stream read.
  - **Builds:** 3 per builder, one at a time, each in a fresh Sandbox project `cd_a24_sf6_<builder>_r<n>`
    (`cd_a24_sf6_zflx_r1` … `cd_a24_sf6_harness_r3`). Run dirs `runs/a24/<builder>/r<n>/`.
  - **The build** is the project's latest version when the session ends, committed or work in progress (the A2 rule).
    A build with no UI flow, or none of the four screens, is scored as it stands (R-ABSENT on the missing units). It is
    not rerun and not dropped.
  - **Interventions:** infrastructure only, logged with times in `runs/a24/interventions.log`; the relogin rule
    (`relogin`, only between calls) is unchanged. Anything else ends the build as *assisted*.

- **Harness smoke (one build, unscored), before the harness A24 arm.** On the A23 image, in a non-study project
  `a24_smoke`, from the neutral prompt `builds/inputs/prompt-a24-smoke.txt` (SHA-256
  `3cbd8765f6047d9d3ffa80aeb3c0317b119fb57cdef57272512df13cda12598f`: one page, one form field bound to a data type,
  a Save button that starts a workflow inserting into a FlowX Database store). It checks the gated UI-flow and
  database operations and the namespace render host on dev-env:
  - plan COMPLETED; a UI flow with the page, the bound form control and the submit-to-workflow button committed; the
    store and its insert operation committed; no item ends `unverified_render_unavailable`.
  - **If the UI-flow operations or rendering are unavailable on dev-env** (gated operations not enabled, or the render
    host unavailable), the harness A24 arm is reported as **"not run: capability unavailable on dev-env"** and zflx
    proceeds unchanged. A failure on a harness defect stops the harness arm; a later amendment decides.

- **Execution (the FlowX adapter, `tools/adapter_online.py`).**
  - **Per-build maps, committed before any output is opened.** Read from the build's own UI-flow, workflow and
    database definitions; a pure correspondence, with no logic:
    - *screen map:* legacy map ↔ build page; BMS input field ↔ the page's form key; each displayed `…O` field and
      message line ↔ the response path or page element that shows it (constant page text as `static`); legacy AID ↔
      button. The AID table is fixed now: ENTER ↔ the page's submit action; PF3 ↔ back or exit; PF4 ↔ clear. A button
      the build lacks leaves that step *not reachable*. A transaction id (`tran CC00`, `tran CB00`) ↔ the page the
      UI flow opens on.
    - *store map:* legacy file ↔ the build's FlowX Database store, field renames where the build's names differ from
      the contract's, and two loader workflows per store (clear the store; insert a chunk of records).
    - Where the build's definition is ambiguous, the operator's choice is written in the map before execution.
  - **Loading.** If the build has its own loader workflows that take records, the map names them. Otherwise the
    operator creates them (`adapter_online.py make-loader`: one DELETE_MANY and one INSERT_MANY operation on the
    build's own store, each in an operator workflow `zz_a24_op_<clear|insert>_<file>`) after the build's version is
    recorded and its definitions are read for the maps. They are an instrument addition, logged in
    `runs/a24/interventions.log`, never part of the scored build. Each load is checked by counting the store.
  - **Workflow level, every case:** each case's `session.yaml` is replayed step by step. A step sends what the page's
    action sends (form keys plus session keys, as the UI-flow definition states) to the workflow that action starts.
    The response is decoded through the screen map into `screens.json`. Instance ids and every call are logged
    (`calls.jsonl`); a resolved password is written as `<dark>` everywhere.
  - **Browser, a subset:** o-sgn-02, o-avw-01, o-bil-01 and o-bil-03 (`tools/a24_ui_check.cjs`, modelled on the
    pilot's `verify/ui_check.cjs`), in a headed browser on the built UI flow, with screenshots kept and the stores
    reset before each case. Each step records the page reached, whether the message and each field value the same
    build returned at the workflow level are on the page, and the page legacy reaches.
  - **File state:** after each case, the stores are unloaded through the store map into the oracle's unload format
    (`ul_*` layouts, fixed width per copybook, `tools/a24_lib.py`), USRSEC with its password column masked.
  - **Not executable here:** PF5 and other "invalid key" AIDs have no counterpart in a web UI. Those steps are
    excluded, from the legacy cases alone: o-sgn-02 step 5, o-mnu-01 step 3, o-avw-02 step 8, o-bil-02 step 11.
  - **Adapter check, before any A24 build (on the pilot app, instrument only, never scored).** After A23 has ended
    (its chain log shows the final CR8 r3 "done", or the harness arm's stop at D6 recorded in the chain log or the
    A23 harness SUMMARY, and no "start" after it), `tools/a24_validate_pilot.sh` runs the
    adapter on `demo_ui_carddemo_pilot` through the pilot's zflx profile `demo_ui`, with a map read from the pilot's
    definitions (`runs/a24/adapter_validation/pilot_map.json`). Pass criteria, fixed now:
    - (a) the base state loaded and unloaded with no session equals `golden-online/v1/o-sgn-01/files` byte for byte;
    - (b) after o-bil-01 the unloaded files hold the pilot's payment (TRANSACT `0000000996722788`, type 02, category
      2, amount 194.00; account 00000000001 at 0), as the pilot's own checks found;
    - (c) all 17 cases replay with no adapter error and one `screens.json` entry per step;
    - (d) no sample password in any output (`tools/check_secrets.py`);
    - (e) the browser subset completes on the pilot.

    The pilot's screen and file results are never scored, pooled or reported as results. A failure caused by the
    adapter is fixed and the check rerun before any A24 build; each fix is committed and disclosed. The result is
    recorded in `runs/a24/adapter_validation/VALIDATION.md`. **Result, before this text was frozen:** (a)–(e) pass
    (`VALIDATION.md`, commit 7506403). Four instrument fixes were found on the pilot and disclosed there: the operator
    loader against the live zflx tools; nested start parameters in the replay (a dotted body key; `json:` constants);
    check (b) comparing amounts as decimals; the browser check clearing inputs the browser profile autofilled and
    reading input values. (e) ran with the pilot's signed-in browser profile; no sign-in was needed. Offline checks already pass
    (`tests-online/a24_adapter_offline.py`: the records the adapter loads equal the oracle's base state for all 17
    cases; replay mechanics; no password in any output).

- **Scoring (`scorer/online_compare.py`; validated before any A24 output is opened).**
  - **Units:**
    - *screen units*, per scored step, from the last screen the legacy step sends (SEND MAP or SEND TEXT):
      - **NAV**, which screen it is (the map name; TEXT for SEND TEXT);
      - **MSG**, the message lines (`ERRMSG`, and `INFOMSG` on account view; the text of a SEND TEXT), compared
        after trimming, with runs of whitespace taken as one space (a web page renders them as one);
      - **FIELD**, every other field the program sent or kept as typed, blank values included. Header, title, date
        and time, APPLID and SYSID, dark fields, attributes, colours and cursor are not scored. A value shaped as a
        signed amount (`+0000000194.00`, `+      2,020.00`) is compared as a decimal, with `$`, `,` and spaces
        removed on both sides. A field the build shows under a legacy name that the step does not send is an extra
        unit.
    - *file units*: one record of ACCTDAT, CUSTDAT, CCXREF, TRANSACT or USRSEC (password masked on both sides),
      matched by key and equal when every business field is equal under the §4 canonicalisation (amounts as
      decimals, trailing spaces and low-values as padding). Masked as volatile: `orig_ts` and `proc_ts` on
      transactions written during the session (the legacy clock is pinned; a FlowX build uses its own). They are
      counted, never scored.
  - **Equivalence** = equal units ÷ all units, per build, as §5. A missing or extra unit counts as unequal. Reported
    separately for screen units and file units, tagged and untagged, per case and pooled over the scored cases.
  - **Stub-dependent units (tagged, reported apart, never in the headline). Tag list `scorer/online/TAGS_v1.json`,
    extracted by `tools/a24_tags.py` from `golden-online/v1` before any build:**
    - a step is tagged when a rule of the families `R-RCV-*`, `R-MDT-*`, `R-BR-*`, `R-DUPKEY`, `R-XCTL-*` or
      `R-COND-ABEND` fires in it, except the rules that fire on every RECEIVE MAP or XCTL of the slice whatever the
      input (`R-RCV-NULLFILL`, `R-MDT-FSET`, `R-MDT-TYPED`, `R-XCTL-AID`; tagging on them would tag every step) and
      field rules on protected, output-only fields. All screen units of a tagged step are tagged;
    - a message that carries a CICS RESP or RESP2 value is tagged in any step;
    - a file record the session changed is tagged when a step that ran WRITE or REWRITE is tagged.

    Tagged steps: o-sgn-02 step 2; o-mnu-01 and o-mnu-02 step 3; o-avw-01 steps 3 and 6; o-avw-02 steps 3 and 4;
    o-avw-03 and o-avw-04 step 3; o-avw-05 steps 3 and 4; o-bil-01 steps 4, 5 and 7; o-bil-02 step 4; o-bil-03 to
    o-bil-06 steps 4 and 5; o-bil-07 step 1. o-sgn-01 and o-sgn-03 have none. Of 507 scored screen units, 72 are
    tagged; of 6,755 file units, 8. The honest limit is that no reference CICS exists to check these rules.
  - **Pre-registered exclusions (from `golden-online/v1/RESULTS.md`):**
    - o-bil-06 is unscored: it rests on the assumed rule R-BR-FF-EMPTY. It is reported descriptively;
    - in o-bil-04, TRAN-CARD-NUM is excluded: it is uninitialised storage, undefined on z/OS;
    - o-sgn-03 and o-mnu-02 are scored only up to the transfer out of the slice (step 3 excluded); what the build does
      there is reported descriptively.
  - **Rule catalogue (closed; assigned mechanically):**

    | Rule | Meaning |
    |---|---|
    | R-ONL-NAV | the screen the user sees after a step differs |
    | R-ONL-MSG | the message differs |
    | R-ONL-FIELD | a displayed data field differs, is missing, or is extra |
    | R-ONL-ACCT | an account record's business field differs after the session |
    | R-ONL-TRAN | a transaction written in the session is missing, extra, or differs in a business field |
    | R-ONL-FILE | any other file record differs |
    | R-ONL-UNREACH | a step could not be driven (no counterpart in the build) |
    | R-ABSENT | the screen, its workflow or its store is absent |

  - **Outcome per case** (the first that applies):
    - *absent*: no unit of the case could be produced;
    - *not reachable*: a scored step could not be driven. Its units count as unequal and carry R-ONL-UNREACH;
    - *matches legacy*: every scored, untagged unit is equal;
    - *differs from legacy, flagged*: every differing unit is covered by a flag mapped before scoring;
    - *differs from legacy, silent*: at least one differing unit is not.

    Tagged units get the same classes in their own column.
  - **Flags (§6):** the mapper (Claude) reads each build's register (`assumptions.md`, or what the harness records as
    its assumptions) and the bundle. It writes `flags.json` with online rule ids and optional selectors (case, step,
    field, screen, file) before any output of that build is opened, and commits it with a hash.
  - **Recall check (descriptive):** a build that matches a legacy message or literal the bundle does not state
    verbatim (`runs/a24/RECALL_PRE.json`) is listed as possible recall (the zflx recall confound, §25).
  - **Instrument validation (done):** `scorer/online_selftest.py`, 35/35 (`scorer/online/SELFTEST_v1.txt`):
    - `golden-online/v1` scored against itself: 100% on each of the 16 scored cases (507 screen units, 6,755 file
      units), every outcome *matches legacy*, H15, H16 and H17 hold;
    - one planted defect per rule, each with the exact count asserted (NAV, MSG, FIELD, extra field, ACCT, TRAN missing
      and differing, FILE, UNREACH, ABSENT); H15, H16 and H17 each fail under their defect;
    - masks and canonicalisation hold (session timestamps, o-bil-04's card, an excluded step, `$194.00`, whitespace);
      a matching flag gives *flagged*, a flag for another rule leaves it *silent*;
    - the batch self-tests still pass (`scorer/selftest.py`, `scorer/report_selftest.py`).

- **End to end (one case per UI build, after its online scoring; `tools/a24_e2e.py`).**
  - **The legacy pair** is frozen in `golden-online/v1/e2e-o-bil-01`, made with `tools/e2e_online.sh`. Session o-bil-01
    runs on the base state. Its master files (ACCTDAT, CARDDAT, CCXREF, CUSTDAT) replace those in `data/in`, and the
    whole chain runs from POSTTRAN with `tools/run_chain_online.sh`.
  - **Join (recorded in commit de42d7e before its diff was read):** the TRANSACT rows the session wrote (key not in
    the base TRANSACT) join the TRANSACT backup that COMBTRAN merges; POSTTRAN still opens TRANSACT for OUTPUT;
    DALYTRAN is unchanged.
  - **Payment-touched units** (fixed now, `runs/a24/e2e/PAYMENT_UNITS.json`, the 11 units where the legacy pair
    differs from `golden/v1`): account 00000000001's `curr_bal` in `posttran_acctdata` and `intcalc_acctdata`; the
    payment row in `combtran_transact`; account 1's statement balance, total and transaction list (text) and balance
    and transaction list (HTML); in `tranrept_report`, the payment line, account 1's total and the grand total.
  - **The FlowX side, per UI build:**
    1. Reload the build's stores with the base state.
    2. Run o-bil-01 at the workflow level.
    3. Unload the stores, then take the online rows by the same key rule.
    4. Run the builder's fixed batch builds in chain order on those files:
       - POSTTRAN on the session's master files and the base DALYTRAN;
       - INTCALC on that POSTTRAN build's outputs;
       - COMBTRAN by `tools/dfsort.py` over the FlowX POSTTRAN TRANSACT, the online rows and the FlowX INTCALC output;
       - CREASTMT on the COMBTRAN output, the FlowX INTCALC accounts and the cross-reference and customers;
       - TRANREPT on the COMBTRAN output and the reference files, window 2022-07-01..2022-07-31.

       COMBTRAN has no build arm (A12), so the study's own sort is used on both sides; this is disclosed. The batch
       builds use their existing adapters and keymaps, in the request mode their arm used, with only their input paths
       changed (the adapters run from a scratch copy of the repository where the set `e2e` points at the stage's
       files). No step isolation: each step reads the previous FlowX step's output.
    5. Score each output against the legacy pair with `scorer/compare.py` and `scorer/report_compare.py` (S4 as A12);
       `combtran_transact` record by record, with the online row's timestamps masked as in the online scoring.
  - **Baseline:** the same FlowX chain run on the base state with no session (`a24_e2e.py run … BASE`), scored against
    `golden/v1`.
  - **Which batch builds (rule fixed now):** for each builder, the r1 build of the Sonnet-wiki condition of each step,
    from that builder's most recent registered full CardDemo arm.
    - **zflx:** `cd_posttran_zflx_sonnet_r1` (A11), `cd_intcalc_zflx_sonnet_r1` (A3), `cd_creastmt_zflx_sonnet_r1`
      (A13), `cd_tranrept_zflx_sonnet_r1` (A14) (`runs/a24/e2e/chain_zflx.json`). Their step-isolated scores are
      already known (100 / 99.0 with R-INT-LAST silent / 100 / 99.72 with R-REPT-LASTDUP flagged); this is disclosed.
    - **harness:** the A18 (a) Sonnet r1 builds on the A23 image (`cd_a23_<step>_harness_sonnet_r1`,
      `runs/a24/e2e/chain_harness.json`). They do not exist yet, so the choice cannot depend on their scores. The
      harness end to end runs after A18 (a) is scored.
  - **E2E outcome per UI build** (one of):
    - *carried through*: every payment-touched unit equals the legacy pair;
    - *carried through except inherited*: every differing payment-touched unit also differs, in the same field, in the
      FlowX baseline against `golden/v1`. These are divergences of the batch build, already scored in its own arm;
    - *payment differs from legacy*: any other difference on a payment-touched unit;
    - *absent*: a stage returned no output.

    Business equivalence of every output against the legacy pair is reported beside it.
  - **Checked offline (`runs/a24/e2e/CONTROL.txt`):** the outcome rule on legacy material (7/7: the pair is *carried
    through*; golden/v1 as the session chain *differs*; the same wrong field in both chains is *inherited*; a missing
    output is *absent*; the COMBTRAN step reproduces the pair's `combtran_transact` byte for byte), and the zflx
    chain's plumbing (4/4: with base inputs, each step's request equals the build's stored `req-base.json`).

- **Hypotheses. Each is tested per builder (zflx: H15–H19; harness: H15h–H19h), never pooled, and refuted for a
  builder if two or more of its three builds fail it.**
  - **Core cases** (the sign-on → menu → account view → bill pay → back path and its ordinary errors, no data edits,
    each matched its CASE.md prediction in full): o-sgn-01, o-sgn-02, o-mnu-01, o-avw-01, o-bil-01, o-bil-02,
    o-bil-03.
  - **H15 (the payment, file state).** After o-bil-01 and o-bil-03, the build's ACCTDAT and TRANSACT have no silent
    business-field divergence from legacy (tagged or not): the balance is 0; one new record, with id = last id + 1,
    type 02, category 0002, the amount equal to the old balance, and source, description, merchant id, name, city and
    zip and card as legacy; "nothing to pay" writes nothing.
  - **H16 (screens; primary, in the H11/H14 style).** No silent divergence on the core cases: every scored screen
    unit of the seven core cases, tagged or not, equals legacy or differs under a flag mapped before scoring. The
    share of equal untagged screen units over the 16 scored cases is **reported descriptively only** (no threshold).
  - **H17 (account view data).** In o-avw-01 step 4, every displayed data field of account 00000000001 equals legacy
    (29 fields).
  - **H18 (working screens).** In the browser subset (o-sgn-02, o-avw-01, o-bil-01, o-bil-03), every scored step
    reaches the page legacy reaches and shows the message and fields the same build returns at the workflow level.
    H18 counts toward the "working screens" claim for these four cases only.
  - **H19 (end to end).** The E2E outcome is *carried through* or *carried through except inherited*.
  - **The target claim** is stated for a builder only if H15–H19 all hold for it. Otherwise the paper reports which
    part failed.
  - **Expectations (not hypotheses; informed by the pilot, disclosed):**
    - messages the bundle marks `{{TODO: confirm text}}` may differ from legacy;
    - sign-on may follow the identity-provider `{{DECISION}}`, which makes sign-on steps *not reachable*;
    - stub-dependent units will differ more often than untagged ones: DUPKEY handling (o-avw-05, o-bil-05) and RESP
      codes in messages;
    - a build may follow the wiki's sequence for new transaction ids (see Known properties), which H15 counts;
    - the harness has not yet built a UI flow in this study (see Known limits).

- **Known limits, stated before any build:**
  - **No reference CICS:** the BMS and CICS rules are ours, from mainframe documentation. Tagged units are reported apart.
  - **Web vs 3270:** PF keys, cursor, attributes and screen headers have no web counterpart. The AID table above and
    the excluded steps are fixed from the legacy cases, before any build.
  - **Recall:** both builders may know the public CardDemo online source; the recall check is descriptive.
  - **Harness UI-flow operations are in the gated tier.** At commit 4144a2849 they are not certified. Each needs the
    namespace render host to commit an item: an unavailable host leaves the item "unverified and uncommitted". No
    harness build in this study has used them; the smoke build checks this first.
  - **Seed coherence:** the base state's balances are pre-posting while its TRANSACT is post-posting, as in the
    oracle's base state. This applies to both sides.
  - **Message units are strict text** (after trimming and whitespace runs). A build that words a message differently
    differs from legacy, even if the meaning is the same; the paper reports it that way.
  - **Display formats:** a field the build shows in another form (status "Active" for `Y`, a combined holder name)
    differs from legacy, or is missing, on that field.
  - **Operator loaders:** for a build without its own loader, the operator adds two workflows per store to the build
    project after the build is recorded; they read and write only that store.
  - **One wiki:** only the Sonnet wiki is tested. RQ3's wiki comparison does not extend to the screens.

- **Order on dev-env, one build at a time:**
  1. A23 ends (registered as the A21 harness arm CR4–CR8 on the A23 image; it ended with its harness arm stopped at
     D6 after CR6 r2).
  2. The adapter check on the pilot app (above). Its result is recorded before step 3.
  3. A24:
     - zflx r1–r3;
     - the harness smoke;
     - harness r1–r3, unless the smoke reports the capability unavailable.

     No other builder (study or non-study, including any demonstration build) is active on dev-env during any A24
     build. The start and end of each build are logged in `runs/a24/interventions.log`. Online execution and scoring
     follow each builder's builds. The zflx end to end runs after the zflx UI builds are scored.
  4. A18 (a), unchanged except for its place (24 builds, A23 image, `cd_a23_<step>_harness_<wiki>_r<n>`). The harness
     end to end runs after it is scored.

- **Everything else is unchanged:** the A18 retry rule, A22, the A2 latest-version rule, interventions logging and the
  relogin rule. No scored result is replaced, and nothing from A24 is pooled with a batch arm.

- **Timestamp:** at freeze, A24 is stamped with OpenTimestamps, hash only, as A12–A23.

**A25 (2026-10-29/30, after the A23 arm stopped at D6 and the R13 image was deployed, before any A25 build). The rest
of the A21 harness arm, the harness A24 arm and A18 (a), on the R13 image.**

- **Why:** the A23 harness arm stopped at harness defect D6 after CR6 r2, with 8 of 15 builds scored (notebook §74,
  `runs/a23/harness/SUMMARY.md`). D6 is of the D4/D5 class: the executor lacked attached pages the planner had read.
  Its cause was found after the arm stopped and fixed in a new harness image, R13, which also carries fixes for two
  platform-side refusals the A18 retry rule already treats as platform errors (notebook §77; engineering detail only
  in the internal record `runs/a23/harness/HARNESS_DEFECTS.md`). Text meant for the paper says only that a harness
  defect stopped the arm and was fixed between arms. Not run under A23: CR6 r3, CR7 r1–r3, CR8 r1–r3, the harness
  A24 arm and A18 (a).
- **The R13 image:** `<registry>/harness:local-3cc15a66e-1793305090`, OCI
  index digest `sha256:7360d185d448749b7d62a46c232a9da88dfac8ac7c694f2110ebc5885f31b2ca`, commit `3cc15a66e`
  (the platform repository branch `<internal branch>`, an internal platform PR line, not merged). It carries R2–R12 (A23) plus R13
  (commits `59ced3db7`, `d06f9a3d3`, `3cc15a66e`). Deployed to dev-env on 2026-10-29 at 20:18:42Z with the user's
  approval. The rollback is the A23 image (`local-4144a2849-1793274007`, `sha256:1eff15db…0003`). The digest is checked
  before every A25 build; a mismatch stops the chain.

- **(1) The A21 harness arm, CR6–CR8, fresh on R13.**
  - CR6, CR7 and CR8, r1–r3 each (9 builds), in that order, one at a time. Projects `cd_a25_<bundle id>_harness_r<n>`
    (`cd_a25_bd5_harness_r1` … `cd_a25_yx3_harness_r3`); run dirs `runs/a25/harness/<bundle id>/r<n>/`.
  - Bundles and their hashes, prompts, gate answers, scorers, flag rubric and mapping, the outcome rule and its four
    classes, and the H14h per-rule criterion are exactly as A21 and A23.
  - **Which builds count for CR6 (fixed now, before any A25 build):** the registered CR6 test on the harness is the
    A25 set of three, r1–r3 on R13. A23's CR6 r1 and r2 (A23 image) stand as scored and are reported beside it as a
    separate partial result, "A23 image (stopped by D6)", never pooled into the same per-rule count. Reasons:
    - A21 registers each rule on a set of three builds from one image. A mixed set would depend on which build a
      defect happened to stop.
    - This is the conservative choice. Neither A23 CR6 build produced output, so neither can be "kept legacy, silent".
      Counting them with one A25 build would make CR6 unrefutable by construction (at most 1 of 3). The fresh set
      keeps refutation possible.
  - **CR3 (A20 image) and CR4–CR5 (A23 image) stand** and are not rerun.
  - **H14h per rule:** CR3 on its A20 builds, CR4 and CR5 on their A23 builds, CR6–CR8 on their A25 builds. **The
    overall H14h criterion counts the six rules across three images**, as A23 counted across two; this is stated
    wherever it is reported.

- **(2) The harness A24 arm on R13, exactly as A24 registered it for the harness.**
  - **Smoke (one build, unscored):** non-study project `a25_smoke`, prompt `builds/inputs/prompt-a24-smoke.txt`
    (unchanged), A24's pass criteria and its "not run: capability unavailable on dev-env" rule unchanged.
  - **Builds:** r1–r3, one at a time, fresh Sandbox projects `cd_a25_sf6_harness_r<n>`, run dirs
    `runs/a25/a24h/r<n>/`. Bundle `online-sonnet-sf6` and its hashes, the prompt, seed files, the per-build maps
    committed before any output is opened, operator loaders, the online execution, the browser subset, the scorer and
    tag list, the exclusions, the rule catalogue, the outcome classes and the flag mapping are as A24. The register the
    mapper reads is what the harness records as the build's assumptions. Each event list is checked for any listing
    or read of the pilot project, as A24.
  - **Instrument in force at this freeze:** the A24 adapter and scorer with their disclosed instrument fixes 1–6.
    Fix 6 (commit `6db2b0a`, disclosed post-freeze under A24, before any zflx r2 output was opened): a show path
    `a|b|c` in a screen map means the first non-empty of those paths, and only when they are mutually exclusive; if two
    or more are non-empty, the unit differs from legacy as ambiguous. It is used where a build splits legacy's single
    message line (ERRMSG) across several response fields, and each such use is recorded in the map's notes. The A25
    harness maps are read under these rules.
  - **H15h–H19h** are tested on these three builds only, refuted at two or more of three, and never pooled with zflx.
  - **End to end:** A24 names the A18 (a) Sonnet r1 builds as the harness batch chain. Under A25 these are the R13
    builds `cd_a25_<step>_harness_sonnet_r1` (run dirs `runs/a25/a18a/<step>_harness_sonnet/r1`).
    `runs/a24/e2e/chain_harness.json` is rewritten to those names before any A18 (a) build; they do not exist yet, so
    the choice cannot depend on their scores. The harness end to end runs after A18 (a) is scored.

- **(3) A18 (a) on R13:** unchanged except for the image and its place: 24 builds (harness × {Sonnet wiki, Opus wiki}
  × r1–r3 × {INTCALC, POSTTRAN, CREASTMT, TRANREPT}), step by step in that order, Sonnet r1–r3 then Opus r1–r3 within a
  step. Projects `cd_a25_<step>_harness_<wiki>_r<n>`; run dirs `runs/a25/a18a/<step>_harness_<wiki>/r<n>/`.
  Exploratory, reported beside the scored harness arms and A15, never pooled.

- **Procedure, common to all three parts.**
  - Driver `tools/harness_api.py auto` with A8's gate answers, the A18 retry rule, the A22 turn-level retry and A23's
    stream read; the A2 latest-version rule; keymaps and flags committed before execution. Unchanged, except that
    `start` can send a turn with no attachment, used only by the smoke build (A24's smoke prompt has none); every other
    request is as before.
  - Chains `tools/a25_harness_chain.sh` (the A23 chain with the R13 digest and the A25 names),
    `tools/a25_a24h_chain.sh` and `tools/a25_a18a_chain.sh` (the A20 A18 (a) chain with the R13 digest, the A25 names
    and the A22 retry), with the shared checks in `tools/a25_lib.sh`.
  - **dev-env lock.** The A24 zflx arm may still be running. No other builder is active on dev-env during an A25 build.
    Before each A25 build starts, the chain checks that no A24 zflx build is in flight (each zflx build log either
    does not exist or shows its `result:` line) and that `runs/PR2127_LOCK` is absent; otherwise it waits. It then
    writes `runs/PR2127_LOCK` ("a25 <build id> <UTC start>") and removes it when the build ends. The lock is also held
    during the build's A2 extraction and its execution, which set the shared zflx context. The lock file is local and
    never committed.
  - Start and end of every A25 build, every relogin (`relogin`, only between calls) and every other infrastructure
    action go to `runs/a25/interventions.log`. Anything else ends the build as *assisted*.
  - **Stops.** A harness defect stops A25 at that build. It is recorded as A23 recorded D6 (`HARNESS_DEFECTS.md` in the
    run's directory, an operator line in `chain.log`), and every later A25 build waits for the user and a later
    amendment. If the harness is unusable on R13, the image is rolled back to the A23 image (`kubectl set image`,
    logged) and A25 stops; nothing is built on the rollback image under A25.
- **Smoke for the batch builds:** none. R13 changes what the executor is sent and two refusals; the first A25 build is
  watched.
- **Known limits, stated before any build:**
  - The executor is a model. The fix changes what it is sent, not its behaviour: it can still stop `goal_at_risk` for
    its own reasons, as CR6 r1 did on A23 (the build's own stop under A18).
  - Near the request bound, cited pages can still be left out; when that happens they are listed by the harness.
  - The first commit of a fresh project is no longer refused on R13, so A25 builds may need fewer A18 retries than A23
    builds. A difference in retries between images is an image difference, not a builder difference.
  - The overall H14h count spans three images. Any comparison of A25 CR6 with A23 CR6 is descriptive.
  - The harness has not yet built a UI flow in this study; A24's gated-tier limit still applies and the smoke checks it
    first.
- **Order on dev-env, one build at a time:**
  1. CR6 r1–r3, CR7 r1–r3, CR8 r1–r3 (9 builds), each scored before the next phase.
  2. The harness A24 smoke, then r1–r3 with their online scoring (unless the smoke reports the capability unavailable).
  3. A18 (a), 24 builds.
  4. The harness end to end for each harness A24 build.

  Builds not run before the paper freeze are reported as not run, never estimated.
- **Everything else is unchanged.** A16–A24 and their results stand. No scored result is replaced. Nothing from A25 is
  pooled with zflx or across arms, except the overall H14h rule count stated above.
- **Timestamp:** at freeze, A25 is stamped with OpenTimestamps, hash only, as A12–A24.

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
