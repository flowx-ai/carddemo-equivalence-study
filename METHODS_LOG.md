# Methods log

A short account of every intervention, deviation and incident in the study, condensed from the private lab
notebook (69 dated entries, 2026-10-24 to 2026-10-28). Section numbers (§) refer to that notebook; amendment numbers
(A1–A22) refer to `protocol/PROTOCOL.md`. Internal environment names are replaced with neutral labels ("the dev
environment").

## Oracle (2026-10-24, §1–§19)

- CardDemo's batch programs were compiled with GnuCOBOL 3.2 (`-std=ibm -fsign=EBCDIC -ftab-width=3`), with the clock
  pinned through `COB_CURRENT_DATE`. Sort steps are emulated by `tools/dfsort.py`.
- **One source change:** CBSTM03A walks z/OS control blocks only to display job and DD names; off-mainframe it
  dereferences address 0. `patches/port_cbstm03a.py` comments out lines 266–291 into `ported/` at build time (§9).
- Two runs gave identical outputs (§8). Independent Python reimplementations (`tools/ref_*.py`) reproduce every
  golden output (§6). Golden v1 was frozen at that point (§10).
- **Legacy properties recorded before any build:** CBACT04C never rewrites the last account (§7); the sample
  accounts hold their group code in the ZIP field, so every group lookup falls back to `DEFAULT` (§11).
- Case sets c01–c04 come from a statement-level branch inventory of the source (`BRANCHES.md`, §12, §16–§18).
- The protocol was frozen as git tag `protocol-v1` after the first author read it and approved (§19). The flag
  mapper is the AI assistant, disclosed, mapping each build's flags before its outputs are opened (§6).

## Pre-registration (2026-10-25, §22–§24)

- A deposit of the pre-registration package on a public archive was prepared, then withdrawn unpublished by the
  author's decision. In its place, only the package's SHA-256 was stamped with OpenTimestamps.
- **Rule:** no build is scored until the stamp shows a Bitcoin attestation. It was attested in block 973059
  (2026-10-25T10:44:06Z) before any score. Bitcoin Core was not installed, so the proof's merkle roots were checked
  against block headers from a public explorer.
- An A5/A6 stamp (`protocol/frozen/withdrawn_544a088/`) covered a protocol file in which the A5/A6 edit had failed
  to save. It is kept, marked withdrawn, and replaced by a stamp of the corrected file (`a5a6/`) before any A5 or A6
  build.

## Pilots (unscored)

- **P0** (A1, §20): Agentic Harness × Sonnet wiki × INTCALC. Two attempts discarded (a deprecated model in one workspace; a
  reused conversation). Attempt 3's plan failed, but its workflow ran and stopped on the real data with
  `Invalid group_id`.
- **Agentic Harness blocked** (§21): two retries failed on the platform's pre-commit validation (HTTP 409 after 120 s).
  With the author's agreement, A3 ran the FlowX Platform MCP arm first and added FlowX Platform MCP pilot P1.
- **P1** (A3, A4): settled the FlowX Platform MCP procedure (isolated headless coding agent + MCP server, same PDF bundle).
- **P2** (§35): the Agentic Harness, driven through its API, could not store the attachment because a dependent service on
  the dev environment lacked an endpoint; Agentic Harness runs waited until that service was redeployed.

## Interventions during scored builds

- **Gate answers:** every Agentic Harness question was answered with its recommended option; briefs and plans approved
  unchanged (A2, A8).
- **Platform-error retries:** at most twice, when the platform's own message places the stop on its side (A2).
  Used for a script-size pause (INTCALC Agentic Harness Sonnet r2, §36) and an `intent_unparseable` pause (CREASTMT Agentic Harness
  Opus r1, §47). Neither retry produced a workflow.
- **Driver defect (§36):** the Agentic Harness driver did not handle a PAUSED plan and re-sent "approve" about 311 times;
  every call was refused with 409, the session did not change, and the build is unaffected. The driver was fixed to
  answer each interrupt at most once.
- **Logins:** one proactive CLI re-login during layer 1 (§49). No FlowX Platform MCP re-login was needed.
- **Hard stop (§45):** the author stopped the build chain at a fixed time; the build in flight ran to completion. No
  build was cut off.

## Deviations and corrections

- **Exploratory repairs (A9, A10):** after the Agentic Harness INTCALC builds were scored at 0%, the operator deleted input
  checks (deletions only) to see what remained. Reported as exploratory, labelled with the deletion count, never in
  place of the scored 0%.
- **A5 golden folder:** a first A5 scoring pass lacked the POSTTRAN file the scorer uses to find the last account and
  mis-tagged one divergence; it was re-run before anything was reported (`results/summaries/A5_SUMMARY.md`).
- **POSTTRAN adapter (§42):** the first executions of two Agentic Harness builds used an adapter that dropped a blank
  timestamp field. They were re-executed with the corrected adapter; the superseded executions are not reported.
- **TRANREPT decode root (§50):** two Agentic Harness adapters pointed at script-node keys in the response; corrected from the
  response structure before report content was read, and rescored offline.
- **Layer 1 summary count:** the summary's prose counts differ from its own tables; the tables (3 builds with no
  workflow, 4 with output, for the Agentic Harness on layer 1) are authoritative.
- **Ontology (A6, §31):** a first extraction over all chunks in one job kept structure only (48 concepts, 30
  relations) and was set aside as an under-extraction; the ontology was re-extracted in smaller jobs. Four jobs
  returned nothing right after a service redeploy and were rerun under the platform-error rule. The set-aside
  extraction became the exploratory thin-ontology arm A6b, added after A6 was scored. The re-extraction decided the
  A6 Opus-wiki result, so it is reported with that result.

## Incidents

- **Node-pool upgrade (§36):** 502/504 errors matched a managed node-pool upgrade that rescheduled platform pods. No
  scored build was affected beyond the driver crash above.
- **Environment outage (§47), about 17:50–17:59Z on 2026-10-26:** a message-broker volume filled on the dev
  environment. The volume was expanded with the author's approval. Not caused by the study; the 503 attempts were
  set aside and not scored.
- **Shared project context (§42):** the FlowX Platform MCP project context moved once during an execution; the two affected sets
  were retried once.
- **Instrument limitation (§48):** the bundle PDF renderer collapses runs of spaces inside inline code. Found after
  the layer 1 builds; the bundles are frozen and were not re-rendered. It affects strict layout scores of three
  statement labels only.

## Builder isolation

FlowX Platform MCP builds ran in their own directories. Every file access outside the run directory was logged
(`results/runs/*/r*/isolation.txt`, 42 builds): accesses to other run directories or the parent folder were denied;
the only ones allowed were the coding agent's own per-directory memory and tool-result files. For the 18 disguise and
ontology builds, each build's MCP calls were also checked against its own project (`mcp_scope.txt`). Isolation cannot block recall of public training data; that is
what the disguise arm (A5) controls for.

## A15: Agentic Harness re-run after fixes (2026-10-26/27, §51–§53, exploratory)

- A fixed Agentic Harness image was built from an open, unmerged platform change and deployed to the dev environment after
  A15 was committed and stamped (§51). Before the deploy, the other teams using the environment were notified and
  the rollback image recorded.
- **Disclosed post-hoc corrections, each reported beside the first score:** an INTCALC decoder lookup (literal key,
  then dotted key) for Sonnet r1, and a missing CREASTMT keymap for Sonnet r1 (the operator's omission). Every other
  decoder and map change was committed before its step executed (§52).
- **Stopped early:** TRANREPT ran 1 of 6 re-run builds; the author stopped it to deploy a further fixed image.
- **Driver deviation found (§53):** until 2026-10-27 the driver retried a build's own failed check
  (`behaviour_failed`) as if it were a platform error, which A2 does not allow. Three scored versions came from such
  a retry. A18(b) re-executed the version each first attempt left (§55): all three figures are identical.

## A16–A18: change request, ablation and a second fixed image (2026-10-27/28, §54–§58)

- A16–A18 were frozen and stamped before any of their builds (§54). The author authorised Agentic Harness fixes and
  redeploys on the dev environment overnight, each logged with time, image, digest and rollback image, and each
  image change before Agentic Harness builds to be covered by a new stamped amendment.
- **Smoke builds** on non-study projects checked each new image before A16; two further Agentic Harness defects found there
  (a check-case size limit, an expected-empty check) were fixed before the A18 image was named (§53).
- **FlowX Platform MCP A16 (§56) and A17 (§57):** 18 builds, no retry, no redo, no intervention. One flag revision before
  execution (CR2 r2: one more flag), both hashes kept. Two CR2 registers name the bundle file; none mentions a change
  request.
- **Agentic Harness A16 on the A18 image (§58):** stopped after 2 builds by Agentic Harness defect D1 (a script size bound of the
  Agentic Harness's own, which the engine does not have). Per the rule fixed before the arm, an Agentic Harness defect stops the arm;
  the fix, a new image and a new amendment come first.

## A19–A22: Agentic Harness defects, new images, a retry rule (2026-10-28, §59–§69)

- **A19 (§59, §60):** the script bound was raised and the image redeployed under the overnight authority, then A19
  was stamped. The A16 Agentic Harness arm ran in full on it (6 builds). The A17 Agentic Harness arm stopped at its first build on
  defect D2: the planner refused its own approved brief without naming the part. A driver gap (no branch for a
  `blocked` session) let it poll until the logins expired; no effect on the outcome. One re-login, nothing in flight.
- **A20 (§61):** two planner fixes, redeploy with the author's approval, A20 stamped. During diagnosis a read-only
  query made an internal service restart once (about 30 s, no study build in flight).
- **A21 (§62–§64):** six further change requests (CR3–CR8) prepared locally: patched sources, oracles, independent
  models (PASS 30/30 on the new oracles, FAIL 30/30 on golden v1), bundles under neutral names, a novelty search (44
  queries). Frozen with a manifest of 136 instruments, stamped, before any CR3–CR8 build. Two coordinator decisions
  were recorded before any build: the step wikis' own TODOs make H14 unrefutable on CR6 and CR7 under the unchanged
  rubric, and a supplementary outcome from the builds' own flags is reported beside the registered one. One adapter
  option (`_lines`, sending each input file as a list of lines) was added before the build that needed it; no field
  value changes, and existing maps re-encode byte-identical.
- **A17 Agentic Harness on the A20 image (§65):** 6 builds, then a stop before any plan (`lease_expired`, marked
  retryable, nothing written; D3). A22 (§66) made such a turn-level platform stop retryable once and was stamped
  before any further Agentic Harness build. An instrument fix to the run-log decoder (a Markdown fence ended a regex early)
  gives identical results on every earlier log.
- **FlowX Platform MCP CR3–CR8 (§67):** 18 builds, no intervention. A post-hoc observation, labelled as such: the record-level
  outcome rule cannot separate the CR field from an unrelated divergence on the same record (CR6 r1, r2); the
  registered outcome stands.
- **A17 Agentic Harness completed (§68):** the D3 build was retried once under A22 and completed; its first attempt is kept
  and never scored. The last build paused before its first step, reporting inputs missing that the planner had read
  (D4); not retryable, scored as absent.
- **Agentic Harness CR3–CR8 (§69):** stopped after 5 of 18 builds by defect D5 (the D4 pattern, no workflow). Two
  interventions are logged in `results/runs/a21/interventions.log`: a re-login after a CLI token expired between
  driver calls, and stopping a client that hung on a stream the server had already closed (the same session was
  driven on; no new session, no retry). The 13 builds not run are reported as not run.

## A23–A32: later Agentic Harness versions, screens and the whole base application (2026-10-28 to 11-03)

- **Agentic Harness change requests completed (A23, A25):** CR4 and CR5 on the A23 version; CR6 stopped there (D6),
  and CR6 r3, CR7 and CR8 ran on R13 under A25, its last build ending on D7 and scored as it ended.
- **Screens, FlowX Platform MCP (A24):** r2 was cut off by the account's usage limit and is scored as it stands; an
  exploratory extra build (r2b) after the limit reset is reported and never counted. The sample password the builders
  used as test data is masked in every committed file.
- **Agentic Harness screens arm (A26–A31):** each stop of the Agentic Harness was classified before any output of the
  build was opened, and each new version was covered by an amendment stamped before its builds
  (`results/HARNESS_STOPS.md`). Two stops were read as the builds' own (A30 r1, A31 r2) and are reported for a ruling.
  D15 was not corrected, and the arm ended under A31's rule.
- **A18 (a) and the CR6–CR8 reruns (A28–A31, exploratory):** three builds used retries the protocol allows (five in
  all), one after a platform HTTP 500 whose cause was not established; that retry favours the Agentic Harness. A
  tool that prepares flag maps was corrected before the output it affects was opened (disclosed in the record).
- **Re-logins.** When the CLI login of the development environment expired, the operator signed in again between
  calls, never while a build or execution was in flight; each is logged as an infrastructure intervention.
- **The whole base application (A32):** the run date was created by the operator as a project parameter before each
  builder started, and logged. Instrument fixes 7–10 (field mapping between legacy and web fields, conditional
  actions, browser handling of menus and choices, and a constant start parameter) were made after the freeze and
  before any output they first served was executed, each self-tested; fix 11 is a post-hoc browser sensitivity that
  decides nothing. The first loader attempt for r2 ran against r1's project context and created nothing; the
  execution script now sets and checks each build's project before every step. One map agent printed the sample
  password in its own session and wrote it to no file. Each A32 launch excluded the operator's global instruction
  file, and each session's load record shows it was not loaded.

