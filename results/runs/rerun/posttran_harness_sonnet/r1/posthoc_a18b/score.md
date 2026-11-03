# A18(b) first attempt, post-hoc: POSTTRAN harness Sonnet r1 (A15 re-run)

Labelled POST-HOC correction (PROTOCOL A18 b, notebook §53/§55). The original score is kept unchanged
(`runs/rerun/posttran_scores.md`, row "sonnet r1 | re-run A15").

- Version: <uuid> (WIP, branch ai/calculate-carddemo-daily-trans-9a57da, 10:28:14Z),
  verified in `first_attempt.txt` (after the first run_started 10:28:13.1Z, before the first behaviour_failed
  10:28:37.5Z and the first retry's run_started 10:28:40.8Z).
- No runnable workflow for the step: the version's only workflow, DraftPostingAssumptions (298451db), is
  START -> AI "Draft assumptions" -> END. It has no posting logic and no END key for any of the four contract outputs.
  Its text equals the workflow the original run executed (6db87f74 / 72f02960) once ids are removed.
- No map or keymap (as the original run); flags = the 2 wiki flags (the definition holds no ledger), sha256 f0fb8713…,
  committed in bbe1639 before execution.
- Executed 2026-10-27 21:56:58–21:58:52Z, record mode, zctx ok before and after, no redo (every run had an
  instance). All five runs FAILED with no END output: the AI node returned AGENT_BUILDER_SCHEMA_VALIDATION_FAILED.
  (The original run's base set FINISHED and c01–c04 FAILED the same way; neither produces a contract output.)
- Scored with `scorer/compare.py`, settings as the original. A null END output is scored as an empty candidate
  directory, as the original run's null sets were (the decoder does not accept `null`; done offline, no re-execution).

| set | strict | business | divergent | silent | flagged | silent rules |
|---|---|---|---|---|---|---|
| base | 0% | 0% | 450 | 450 | 0 | R-ABSENT |
| c01 | 0% | 0% | 457 | 457 | 0 | R-ABSENT |
| c02 | 0% | 0% | 450 | 450 | 0 | R-ABSENT |
| c03 | 0% | 0% | 451 | 451 | 0 | R-ABSENT |
| c04 | 0% | 0% | 457 | 457 | 0 | R-ABSENT |

R-ABSENT on every set, the same as the original score: the first attempt held no workflow that computes the step.
