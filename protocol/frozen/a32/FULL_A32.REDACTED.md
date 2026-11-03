# Amendment A32: the full base application

**FROZEN as amendment A32 on 2026-11-02.** Decisions D1-D11 taken by the user on 2026-11-02, all as recommended (section 2; D11 after the pilot). Nothing had been built or scored under it at the freeze. Every number from a tool
below was measured on 2026-10-30; every budget and time figure is an estimate and says so.

## 1. Why

A24 built 4 of 17 screens and A1-A21 built 4 batch steps. The target headline (batch to working screens, both checked against the
original) needs the rest of the base application measured the same way. The optional upstream modules (Db2, IMS, MQ) stay out, as
`plan_full_application.md` section 1 sets out.

**Corrected scope:** 17 online programs (4 scored in A24, 13 answer key only), CSUTLDTC, and **11 batch programs, not 12**: 4 core
(CBTRN02C, CBACT04C, CBSTM03A with its subroutine CBSTM03B, CBTRN03C) and 7 others (CBACT01C-03C, CBCUS01C, CBTRN01C, CBEXPORT, CBIMPORT).

## 2. Decisions for the user

Each had a recommendation; none was taken silently. **The user approved all ten as recommended on 2026-11-02** ("approve d1-d10 as recommended"). D8 is now settled by the record: the harness arm has built no screen application in 12 trials since A27 (`runs/stage1/`), so it is not part of this amendment.

| # | Decision | Recommendation |
|---|---|---|
| D1 | **Bundle size against the harness limit** (section 5) | Start zflx on the full bundle. Hold the harness arm until a smoke shows it can read an input of this size; choose among the section 5 options then, with A27's result in hand. |
| D2 | **Run date in the contract** (section 7) | Option A, the contract states it. |
| D3 | Report requests as a `job_requests` store (section 6) | Yes. The wiki drops TD JOBS, so nothing else can be compared. |
| D4 | Blank extras: not a unit, shown in a column (section 9) | Yes. A24 counted them, with a post hoc column. Comparing with A24 needs that column. |
| D5 | Tag list: 59% of screen units are tagged, mostly by A24's R-RCV-EMPTY-EOF (section 9) | Keep A24's families for comparability; hypotheses decide on all units, as in A24's H16. |
| D6 | The 5 utility programs have no behaviour in the wiki: report only (section 10) | Yes. A hypothesis on them would be refuted by construction. |
| D7 | One builder session for the whole application, or four as the pilot proposed (section 8) | One, as A24, with the resume rule. Four sessions would be a different condition; test it only as its own arm. |
| D8 | Run the harness arm at all before A27 reports | No. |
| D9 | Budget (section 13) | Approve zflx r1 alone first, then decide on r2 and r3 from its real cost. |
| D10 | The target claim's rule (section 11) | Keep A24's: all hypotheses must hold. |
| D11 | Decided 2026-11-02 (user: yes), after the pilot: the contract names where a workflow script reads RUN_TIMESTAMP (section 7) | Name it. The text is in the re-rendered bundle; if declined, it is removed and the bundle re-rendered before the freeze. |

## 3. Oracle and what it can say

Answer keys, all frozen before this draft and none built against: `golden/v1` and cases (4 core batch), `golden/full-v1` (7 batch,
`SHA256SUMS` `e52fadb6…07c2`), `golden-online/v1` and `v2` (17 screens, 54 scored cases, 4 end-to-end pairs).

The score is a match with the original, not correctness. A build that differs may be right: it differs from legacy.

**Limits that must be disclosed with any result:**

- **R-CEE-PIC8.** The largest assumption. CEEDAYS is replaced by our stub, and we assume it accepts the 10-byte call as an 8-byte date
  with a `YYYYMMDD` picture. If real CEEDAYS rejected that call, every COACTUPC case past a change would be wrong. It affects 7 cases
  (o2-aup-01 to 07) and 3,001 of 33,246 units. Those units are reported in their own column and do not decide a hypothesis.
- **No reference CICS and no z/OS.** Every stub rule is our reading of mainframe documents; the self-tests prove the stub does what we wrote.
  What z/OS holds in bytes the source never sets is not determined; those bytes are not scored. See `golden/full-v1/RESULTS.md`.
- **Compiler port.** CBEXPORT and CBIMPORT do not compile as shipped and were ported (one FD change). COBDATFT is assembler and was replaced.
- **COACTUPC's update record has no zip field.** On a saved account, `addr_zip` and `group_id` are outside the score and shown as `quirk`
  units. Whether a build that keeps the record intact is a defect or a fix is not for this score to say.
- **Paths left out on purpose:** ONLINE_ORACLE.md 8.5.

## 4. Operator-instruction isolation

Notebook 87: the operator's global instruction file reached zflx builder sessions. 8 of 83 transcripts show its content, because the
launchers run `claude -p` with no setting-source restriction. Every registered build keeps that disclosure.

Notebook 90: `tools/zflx_build_isolated.sh` excludes the file with `claudeMdExcludes` and records what each session loads. **Proven by a
probe, not by a build:** a short session on a cheaper model, no MCP, no dev-env. Limits to disclose:

- No full build has run with it.
- It copies `tools/zflx_build.sh` only. `tools/full_zflx_build.sh` (written 2026-11-02) carries the same settings and load record;
  no build has run on it yet.
- The user-level skill names stay in the session's start record.
- It names one path; a file loaded from elsewhere would not be excluded, though the load record would show it.

Rule: every build of this amendment uses the isolated launcher, and its `instructions_loaded.jsonl` is checked. A build whose record shows
the file is reported as not isolated, and stays in the count. Results from these builds are not strictly comparable with A24's on this
point.

## 5. Inputs: bundle size

Bundle `app-sonnet-kk7`, `tools/full_bundle.sh`, sha256 `dfdadb48c21abaeb26bd305776f996863b3a3013673e79db9e06ecbc297c0ba5`: 96 wiki pages
+ 4 contracts, 234 PDF pages. Re-rendered on 2026-11-02 after the contract's two additions (section 6); the earlier render (`886f646f…`,
never used by a build) is kept in `builds/inputs/superseded/kk7-2026-10-30/`. Page rule at the head of the script, mechanical. Seed `builds/inputs/app-seed-kk7`.

**Character count: 270,305 by `pdftotext` (269,762 before the two contract additions), before page markers. R15's process drafter accepts up to 140,000, counted on the text the
model reads with page markers included, and refuses more by name (`document_too_long`).** The bundle would be refused. This is a
precondition for any harness build. The earlier estimate of about 170,000 for the 146-page wiki was low: the whole wiki measures
366,397. The harness's own extraction was not run; A24's bundle is the one calibration point (95,494 by `pdftotext`, the figure D8
reports).

Other R15 limits, from notebook 91: 240 s per draft call, 40 nodes, 30 unmodelled statements. **Open question: a 17-screen, 11-batch
application may strain the 40-node limit, and a long draft the 240 s bound.** Not seen; no live model has yet drafted from even the
registered 95,494-character bundle.

**Options. Each changes what is measured; none is chosen here.**

| Option | Input to the harness | What it costs | What it does to the comparison |
|---|---|---|---|
| A. Raise the limit in a new image | Full bundle, 269,762 | A harness change, and the 240 s and 40-node limits may bind next | Same input for both arms. The cleanest comparison. An image change needs its own disclosure, and a smoke before any count. |
| B. Split into parts, build in order | Batch 81,467 fits. Online 171,989 does not: needs 2 or more parts, for 3 or more parts in all | Needs the harness to extend a plan across documents: not known to work | A different condition: incremental build. zflx would need the same split to compare. |
| C. Shorter bundle for both arms | UI flows, process pages, project data model, contracts: 40 files, 90 pages, 111,898 | Drops the legacy screen pages, acceptance criteria, integrations and plan | Comparable between arms, but A24's rule is broken, and the dropped pages hold field-level detail. Scores would likely fall for both, for a reason unrelated to the platform. |
| D. Shorter input for the harness only | The 111,898 set; zflx keeps the full bundle | No platform change | **Not comparable.** Report the arms apart, with the difference in the first line. Never pooled. |
| E. zflx first, no harness arm yet | None | The harness arm waits | Answers the full-application question for one arm. The paper would say so. |

Removing `12-legacy-analysis` alone (194,892) or also acceptance and plan pages (154,604) still does not fit. The largest set under the
limit found is the 111,898 one; a set between it and 140,000 needs a further rule, chosen before any build.

**Decided (D1): E. The harness arm is not part of this amendment.** A later amendment may add it, if the harness team shows a smoke at this size. C and D would make the headline weaker in ways a reader
must be told. The limit is in the deployed image, and A27 is registered on that image, so this is the user's call.

## 6. Contracts

`scorer/CONTRACT-UI-FULL.md`, `scorer/CONTRACT-BATCH-FULL.md`, and the unchanged `scorer/CONTRACT.md` and `CONTRACT-L1.md`. Formats only, with
two additions a reader should weigh: the run date (section 7) and `job_requests`. The wiki says "Replaces the TDQ job submission", so a
store is the only surface where both sides can be compared. Requiring it adds something the wiki does not ask for, disclosed.

**A third addition, dates on screens** (decided 2026-11-02 with D1-D10, from `runs/a24/DATE_DISPLAY_FINDING.md`): A24's H18 failed 3 of
3 at the account view's dates, because the web renderer re-formats a text value that looks like an ISO date with the project's short date
format, and the builders were not told and could not see a rendered page. The contract now says a screen shows a date in the format the
wiki documents, and names the renderer behaviour and the component setting that controls it. This is a hint about the platform, not
about CardDemo: it does not say which format any screen uses. A reader must be told; HF5 and H18 are then not the same test. The pilot
rendered it on dev-env on 2026-11-02 (`runs/full/pilot/PILOT.md` section 3): with no setting, `2014-11-20` shows as 11/20/14; with the
component's own format it shows as set. The text stands as written.

Prompt, as A24's with the scope named:

> Build a FlowX.AI implementation of the CardDemo application described in the attached wiki pages: the online screens and the batch steps.
> The application keeps its data in the stores CONTRACT-UI.md lists, in the format given there; the operator loads them from the seed
> files before testing and reads them back after. Batch steps read and write the files the contracts list. Implement the behaviour the wiki
> documents. Wherever the wiki is uncertain, incomplete or silent and you had to decide something, record each decision in `assumptions.md`:
> what you assumed, and which wiki statement (or absence of one) it rests on.

## 7. The clock: stated before builds, never applied after results

**The issue.** A24's H19 was refuted 3 of 3 by construction: the zflx POSTTRAN stamped the wall clock, so TRANREPT's July 2022 window
dropped those rows. The legacy runs under a fixed clock (2022-07-18 10:00:00). Repeating that test would refute the end-to-end
hypothesis whatever the build does.

**Option A, decided (D2): the contract states the date.** `RUN_TIMESTAMP = 2022-07-18 10:00:00`, a project parameter read wherever the
application needs the date or time, in screens, workflows and batch. The operator sets it. Consequences:

- A build that ignores it and reads the system clock **differs from legacy, and that is scored** (R-ONL-CLOCK on session rows, every
  export record, and the TRANREPT rows it loses). It is not fixed after the fact.
- The scorer's clock unit compares the date only; the time part stays masked, as in A24.
- A reader must be told that the contract now carries a behaviour hint A24's did not. H19's refutation and this result are not the same
  test, and should not be shown as an improvement between them.
- Pilot (2026-11-02, `runs/full/pilot/PILOT.md` section 1): zflx cannot create a parameter, so the build script creates it in each
  build's project before the builder starts (operator action, logged). A workflow script reads it as
  `additionalData.applicationConfiguration.RUN_TIMESTAMP`; `${RUN_TIMESTAMP}` in an END payload does not resolve. A screen reaches it
  through a workflow. **D11 (decided, yes):** the contract names that access path (one sentence, a platform fact like the date-display hint).
  Without it, a builder that cannot find the parameter falls back to the clock and is scored as differing; with it, a reader must be
  told the contract says where the date is.

Option B: leave the contract silent, and take TRANREPT's window from the chain's own run date. It changes a legacy parameter, and
then the report under test is not the legacy's. Option C: leave TRANREPT's detail out of the end-to-end test. It removes what the test is
for. Neither is recommended. **The choice is made at the freeze and not revisited**, and a plumbing check confirms, after the stamp and
before the first build, that the operator's parameter reaches a trivial workflow.

## 8. Conditions and execution

- **zflx × 3** (`cd_<id>_kk7_zflx_r1-3`), `claude-opus-5-5`, one session per build, on the isolated launcher (section 4). Cut-off rule as A24's
  r2b: a session cut off by a usage limit is resumed, and reported with its resume. A resumed build counts.
- **harness**: not in this amendment (D1, D8).
- Execution, per build: `tools/adapter_full.py` on 54 cases; `tools/full_ui_check.cjs` on 9 browser cases (the 4 of A24, then o2-ccl-01,
  o2-trl-01, o2-usl-01, o2-tad-01, o2-rpt-02); batch on 23 + the core sets; the end-to-end chain on 4 pairs with a no-session baseline.
- Map and flags committed before execution. Other agents use dev-env: `runs/PR2127_LOCK` as in A24.

## 9. Scoring

As A24 (units NAV, MSG, FIELD and file records; outcome classes; flags from `assumptions.md`; recall), with `scorer/full_compare.py`. Added, all
before any build, all self-tested:

- **CARDDAT** scored everywhere. **Job units** (R-ONL-JOB). **Clock units** (R-ONL-CLOCK).
- **Blank extras:** a field the legacy step does not send, shown blank by the build, is not a unit, and is counted in a column. A24's
  scorer counted these and its self-test did not cover it. (D4)
- **Exclusions, mechanical:** A24's list; 5 steps with legacy's 'Invalid key pressed'; 3 selection values a web list cannot produce plus
  one two-row selection (o2-ccl-04 steps 4-5, o2-trl-03 step 6, o2-usl-01 step 6); the abend step (o2-trl-02 step 7); o2-cup-02 from step 9.
- **Masks:** session rows' time part; on a saved account, `addr_zip` and `group_id`; on a changed card, `cvv_cd`.
- **Tags** (`scorer/online/TAGS_v2.json`, 208 tagged steps, sha256 `448a9e4e…`) report units apart. A24's families are kept; R-RCV-PAD-BLANK, R-MDT-ATTR, R-ATTR-OVERRIDE are universal. **59% of screen units are tagged**, because the cases empty fields often. (D5)

**Batch** (`scorer/full_batch_compare.py`): RC, RECORD, SYSOUT. Bytes never set are not compared, nor libcob lines, CBACT01C's signed DISPLAY
lines, or the START/END banners.

**End to end** (`scorer/full_e2e_compare.py`): as A24, plus the job period, plus two fixes to A24's rule, disclosed: a touched unit whose
whole key is missing differs; a field differing on a session-new row differs. Under A24's rule both passed.

## 10. Hypotheses

Per builder; **refuted if at least 2 of 3 builds fail. Never pooled across builders.** Each is decided by the scorer's stated field, on units
not resting on R-CEE-PIC8; the R-CEE-PIC8 count is reported beside it.

| | Claim | Measure | Fails when |
|---|---|---|---|
| HF1 | All 17 screens are built and reachable | `H_reachable`: core case per program, `CORE` in `full_compare.py` | any core case absent or not reachable |
| HF2 | Core screens differ from legacy only where flagged | `H_core_screens` | any silent unit on any of 17 core cases |
| HF3 | Money: payment, transaction add and account update write what legacy writes | `H_money_files`: ACCTDAT, TRANSACT on o-bil-01, o-bil-03, o2-tad-01, o2-aup-03 | any silent unit |
| HF4 | List paging returns legacy's rows | `H_list_paging`: NAV and row fields on 14 PF7/PF8 steps, except steps resting on an R-BR rule | any unit differs |
| HF5 | What the workflow returns is what the browser shows, dates included, on 9 cases | `full_ui_check.cjs`, each case all steps ok | any case fails |
| HF6 | A session carries through the batch chain | `full_e2e_compare.py` on 4 pairs | any "differs from legacy" or "absent". "Carried through except inherited" passes, and is reported. |
| HF7 | Export and import round trip | `H_round_trip`: f-exp-01, f-imp-01 | either differs |

**Not hypotheses, reported with counts:** the other batch cases. CBACT01C-03C, CBCUS01C and CBTRN01C have no behaviour in the wiki: no page holds
2525.00 or the double printing. A hypothesis on them would be refuted by construction. (D6)

**Honest expectation, from A24 at 4 screens:** H16, H17, H18 and H19 were all refuted 3 of 3. HF2 asks for no silent difference across 17
programs. It is very likely refuted. HF5 holds only if the builder sets a date format on every screen that shows a date; the pilot
shows the setting works, and that the default shows 11/20/14. The value is in the per-program counts: the
refutation rules exist to be fair, not to be passed.

## 11. The target claim

**Kept from A24: the claim "batch to working screens, both checked against the original" is stated for a builder only if HF1-HF7 all hold for
it.** Otherwise the paper reports which hold and the per-program equivalence as measured.

An alternative exists: state it when HF1, HF3, HF6 and HF7 hold, with HF2, HF4 and HF5 shown beside. It is easier to reach and easier to
defend as "works end to end", and it weakens A24's rule after A24 was refuted. I do not recommend it, and if chosen it must say so in its first
line. (D10) **Decided: A24's rule is kept**; the alternative is not used.

## 12. Instrument validation

`scorer/online/SELFTEST_FULL.txt`: **38/38**, including sub-suites adapter 12/12, browser 6/6, end to end 17/17, batch 15/15, and A24's own
40/40. No FlowX build was used. Identity 100% on all 54 cases and 33,246 units, through the adapter and a fake backend as well as
directly. Negative controls fail on altered data with exact counts. Not proven: anything on a real FlowX: `make-loader` on a sixth store,
background steps, list row mapping on a real table, the browser check against a real UI flow (only a local mock).

Fixes 1-6 of A24 carry over: 1, 2, 6 by importing `tools/adapter_online.py`; 3, 4 by copy into `tools/full_ui_check.cjs`; 5 by using
`scorer/report_compare.py` unchanged.

## 13. Budget and time: estimates only

| Item | Basis | Estimate |
|---|---|---|
| zflx, screens, one build | A24: $10.25-13.64 for 4 screens, about $3 per screen. Pilot's own: $8-15 per screen | $45-255 |
| zflx, batch, one build | A1-A21 batch builds, $2.5-5.5 per step; assumes the same for the 7 others, which is unmeasured | $30-60 |
| **zflx, one build** | | **$75-315** |
| **zflx × 3** | | **$225-945** |
| Harness × 3 | No harness UI build has finished; A27 will give the first figure | **not estimated** |
| Build time, one | A24: 18-34 min for 4 screens. Pilot: 10-20 min per screen. Batch, about 9 min per step | 3-7.5 h |
| Execution, one build | Assumes about 5 s per FlowX call, about 33 calls per case, 54 cases; browser extra | about 3 h |

Risks to these figures: the range is wide because A24 and the pilot differ threefold per screen, and neither built a whole application. A
session this long may compact and lose the wiki's start. A24's r2 was cut off by the 7-day usage limit at 4 screens, so at this size a
cut-off is likely. Recommendation D9 exists for that reason.

## 14. Before a freeze

1. The user's decisions D1-D11. Done 2026-11-02, all as recommended.
2. Write `tools/full_zflx_build.sh` (isolated) and the chain runner.
3. A short pilot on the open questions in `plan_full_application.md` section 6: list paging, the run date parameter, user admin, a report request.
   A pilot changes what we know before a freeze, and is disclosed as such.
   Done 2026-11-02: `runs/full/pilot/PILOT.md`. Run date, keyed paging and the date display setting probed
   (rendered in the Designer runtime: the contract text holds); user admin and the report request were not probed separately (no new platform surface).
4. Re-render the bundle only if a contract changes; the hash above then changes. Done 2026-11-02 (`dfdadb48…`).
5. Manifest, stamp, then the plumbing check. No stamp has been made.
