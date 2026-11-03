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
