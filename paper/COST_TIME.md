# Cost and time per build (CardDemo study)

**Summary (for email):**
- A coding-agent build of one CardDemo batch step through the FlowX.AI MCP server costs **$2.29–5.44** in model usage at list price (median **$3.46**, 42 builds over four steps) and takes **4.9–13.6 minutes** (median 7.5).
- Per thousand COBOL lines: interest calculation **$4.56** and **12 minutes**; transaction posting **$5.37** and **11.6 minutes**; statements **$3.49** and **7.7 minutes**; transaction report **$4.65** and **10.7 minutes** (medians, raw line counts including comments).
- The in-product AI harness takes **9.2–49.7 minutes** per build (median 20.4, 24 builds) and 0.95–1.98M input tokens; its dollar cost is not logged. None of these include generating the wiki or people's time.

Read-only analysis of the run logs as of 2026-10-26 ~11:30Z; POSTTRAN harness Opus rows added at 12:30Z, after those builds ended. Layer 1 rows (CREASTMT, TRANREPT; A12–A14) added
2026-10-26 from the same sources, after every layer 1 build ended.
Every number below comes from the file named in its row. Nothing is estimated or priced by us.

## Sources and definitions

- **zflx builds** (builder `claude-opus-5-5` in Claude Code, through the zFLX MCP server):
  - wall-clock = `builder started` → `builder exited` in `log.txt`;
  - turns, tokens and cost = the `result` line of `transcript.jsonl` (`num_turns`, `usage`, `total_cost_usd`; `costBasis: list`, i.e. list price, as Claude Code reports it);
  - input tokens = input + cache creation + cache reads; cache reads shown separately, as they are billed at a lower rate.
- **Harness builds** (model `gpt-6.1-sol`, resolved by the org manager):
  - wall-clock = first → last timestamp of `harness_log.txt` (session created → session saved). It includes the driver answering every gate mechanically, and any operator resume;
  - model calls and tokens = the `RESULT` line of `harness_log.txt`, as the harness reports them (whether cached input is included is not stated);
  - **dollar cost is not logged** by the harness, and we do not price it.
- **Arms:** primary = pre-registered INTCALC conditions; A5 = disguised variant; A6 = ontology arm; A6b = thin-ontology
  arm (exploratory); A11 = POSTTRAN; A13 = CREASTMT; A14 = TRANREPT. Wiki = which agent-generated wiki the build was given.
- **Lines of COBOL:** `wc -l` of the program source, comments included: CBACT04C (INTCALC) 652 lines, CBTRN02C
  (POSTTRAN) 731 lines, CBSTM03A + CBSTM03B (CREASTMT) 924 + 230 = 1,154 lines, CBTRN03C (TRANREPT) 649 lines (`src/`).
  CREASTMT counts both programs, as the step runs the subroutine CBSTM03B.

## zflx builds (42)

| Step | Arm | Wiki | Rep | Wall-clock (min) | Turns | Input tokens (of which cache reads) | Output tokens | Cost (USD) | Source |
|---|---|---|---|---|---|---|---|---|---|
| INTCALC | primary | Sonnet | r1 | 6.2 | 33 | 6.39M (6.30M) | 39,299 | 2.81 | `runs/intcalc_zflx_sonnet/r1/` |
| INTCALC | primary | Sonnet | r2 | 10.0 | 44 | 7.93M (7.80M) | 55,684 | 3.63 | `runs/intcalc_zflx_sonnet/r2/` |
| INTCALC | primary | Sonnet | r3 | 6.5 | 38 | 6.45M (6.35M) | 42,791 | 2.90 | `runs/intcalc_zflx_sonnet/r3/` |
| INTCALC | primary | Opus | r1 | 9.1 | 50 | 7.45M (7.34M) | 58,507 | 3.53 | `runs/intcalc_zflx_opus/r1/` |
| INTCALC | primary | Opus | r2 | 13.6 | 46 | 7.13M (7.04M) | 44,359 | 3.04 | `runs/intcalc_zflx_opus/r2/` |
| INTCALC | primary | Opus | r3 | 5.3 | 31 | 5.46M (5.40M) | 33,525 | 2.29 | `runs/intcalc_zflx_opus/r3/` |
| INTCALC | A5 | Sonnet | r1 | 6.8 | 35 | 5.88M (5.60M) | 44,051 | 4.23 | `runs/accrue_zflx_sonnet/r1/` |
| INTCALC | A5 | Sonnet | r2 | 8.1 | 44 | 7.05M (6.94M) | 55,667 | 3.38 | `runs/accrue_zflx_sonnet/r2/` |
| INTCALC | A5 | Sonnet | r3 | 7.0 | 37 | 6.90M (6.80M) | 46,779 | 3.10 | `runs/accrue_zflx_sonnet/r3/` |
| INTCALC | A5 | Opus | r1 | 7.7 | 41 | 6.34M (6.25M) | 53,067 | 3.00 | `runs/accrue_zflx_opus/r1/` |
| INTCALC | A5 | Opus | r2 | 7.5 | 31 | 5.57M (5.47M) | 48,671 | 2.85 | `runs/accrue_zflx_opus/r2/` |
| INTCALC | A5 | Opus | r3 | 6.4 | 33 | 5.17M (5.09M) | 42,893 | 2.48 | `runs/accrue_zflx_opus/r3/` |
| INTCALC | A6 | Sonnet | r1 | 7.2 | 42 | 7.72M (7.41M) | 46,884 | 4.89 | `runs/accrue_zflx_sonnet_onto/r1/` |
| INTCALC | A6 | Sonnet | r2 | 7.5 | 45 | 9.23M (9.08M) | 46,287 | 3.93 | `runs/accrue_zflx_sonnet_onto/r2/` |
| INTCALC | A6 | Sonnet | r3 | 8.4 | 48 | 10.56M (10.40M) | 54,111 | 4.40 | `runs/accrue_zflx_sonnet_onto/r3/` |
| INTCALC | A6 | Opus | r1 | 7.2 | 48 | 10.26M (10.13M) | 42,977 | 3.97 | `runs/accrue_zflx_opus_onto/r1/` |
| INTCALC | A6 | Opus | r2 | 7.5 | 38 | 7.98M (7.85M) | 43,344 | 3.44 | `runs/accrue_zflx_opus_onto/r2/` |
| INTCALC | A6 | Opus | r3 | 7.2 | 40 | 7.58M (7.44M) | 44,117 | 3.48 | `runs/accrue_zflx_opus_onto/r3/` |
| INTCALC | A6b | Sonnet | r1 | 6.2 | 29 | 5.96M (5.85M) | 39,814 | 2.86 | `runs/accrue_zflx_sonnet_thin/r1/` |
| INTCALC | A6b | Sonnet | r2 | 5.9 | 27 | 4.88M (4.77M) | 39,513 | 2.64 | `runs/accrue_zflx_sonnet_thin/r2/` |
| INTCALC | A6b | Sonnet | r3 | 4.9 | 26 | 4.64M (4.54M) | 30,457 | 2.32 | `runs/accrue_zflx_sonnet_thin/r3/` |
| INTCALC | A6b | Opus | r1 | 9.2 | 55 | 10.79M (10.65M) | 60,437 | 4.46 | `runs/accrue_zflx_opus_thin/r1/` |
| INTCALC | A6b | Opus | r2 | 7.8 | 44 | 9.52M (9.39M) | 50,832 | 3.95 | `runs/accrue_zflx_opus_thin/r2/` |
| INTCALC | A6b | Opus | r3 | 5.3 | 38 | 7.08M (6.81M) | 31,082 | 4.09 | `runs/accrue_zflx_opus_thin/r3/` |
| POSTTRAN | A11 | Sonnet | r1 | 9.0 | 39 | 6.61M (6.31M) | 60,627 | 4.89 | `runs/posttran_zflx_sonnet/r1/` |
| POSTTRAN | A11 | Sonnet | r2 | 8.0 | 43 | 8.84M (8.72M) | 51,484 | 3.73 | `runs/posttran_zflx_sonnet/r2/` |
| POSTTRAN | A11 | Sonnet | r3 | 6.8 | 46 | 7.64M (7.52M) | 45,428 | 3.35 | `runs/posttran_zflx_sonnet/r3/` |
| POSTTRAN | A11 | Opus | r1 | 10.3 | 62 | 14.51M (14.36M) | 64,538 | 5.30 | `runs/posttran_zflx_opus/r1/` |
| POSTTRAN | A11 | Opus | r2 | 8.0 | 40 | 6.27M (6.17M) | 53,036 | 3.13 | `runs/posttran_zflx_opus/r2/` |
| POSTTRAN | A11 | Opus | r3 | 10.4 | 48 | 9.10M (8.97M) | 65,933 | 4.12 | `runs/posttran_zflx_opus/r3/` |
| CREASTMT | A13 | Sonnet | r1 | 9.0 | 48 | 8.65M (8.34M) | 62,615 | 5.44 | `runs/creastmt_zflx_sonnet/r1/` |
| CREASTMT | A13 | Sonnet | r2 | 8.8 | 44 | 9.53M (9.40M) | 54,425 | 3.96 | `runs/creastmt_zflx_sonnet/r2/` |
| CREASTMT | A13 | Sonnet | r3 | 9.2 | 39 | 8.25M (8.11M) | 62,030 | 3.97 | `runs/creastmt_zflx_sonnet/r3/` |
| CREASTMT | A13 | Opus | r1 | 7.5 | 23 | 4.92M (4.82M) | 48,219 | 2.72 | `runs/creastmt_zflx_opus/r1/` |
| CREASTMT | A13 | Opus | r2 | 8.0 | 36 | 6.42M (6.12M) | 55,448 | 4.70 | `runs/creastmt_zflx_opus/r2/` |
| CREASTMT | A13 | Opus | r3 | 11.0 | 35 | 7.58M (7.44M) | 73,281 | 4.09 | `runs/creastmt_zflx_opus/r3/` |
| TRANREPT | A14 | Sonnet | r1 | 7.7 | 33 | 5.59M (5.30M) | 53,350 | 4.49 | `runs/tranrept_zflx_sonnet/r1/` |
| TRANREPT | A14 | Sonnet | r2 | 6.7 | 36 | 6.15M (6.05M) | 42,699 | 2.91 | `runs/tranrept_zflx_sonnet/r2/` |
| TRANREPT | A14 | Sonnet | r3 | 7.3 | 34 | 6.44M (6.33M) | 48,721 | 3.13 | `runs/tranrept_zflx_sonnet/r3/` |
| TRANREPT | A14 | Opus | r1 | 6.6 | 37 | 5.95M (5.85M) | 44,720 | 2.82 | `runs/tranrept_zflx_opus/r1/` |
| TRANREPT | A14 | Opus | r2 | 6.0 | 37 | 6.05M (5.95M) | 36,735 | 2.66 | `runs/tranrept_zflx_opus/r2/` |
| TRANREPT | A14 | Opus | r3 | 7.2 | 47 | 6.54M (6.44M) | 49,041 | 3.14 | `runs/tranrept_zflx_opus/r3/` |

## Harness builds

| Step | Wiki | Rep | Wall-clock (min) | Model calls | Input tokens | Output tokens | Plan end state | Source |
|---|---|---|---|---|---|---|---|---|
| INTCALC | Sonnet | r1 | 20.0 | 29 | 1.41M | 30,400 | COMPLETED | `runs/intcalc_harness_sonnet/r1/harness_log.txt` |
| INTCALC | Sonnet | r2 | 49.7 | 37 | 1.65M | 65,561 | PAUSED (intent_unparseable) | `runs/intcalc_harness_sonnet/r2/harness_log.txt` |
| INTCALC | Sonnet | r3 | 15.1 | 28 | 1.37M | 33,051 | COMPLETED | `runs/intcalc_harness_sonnet/r3/harness_log.txt` |
| INTCALC | Opus | r1 | 21.6 | 41 | 1.72M | 77,224 | COMPLETED | `runs/intcalc_harness_opus/r1/harness_log.txt` |
| INTCALC | Opus | r2 | 9.2 | 26 | 1.37M | 19,362 | COMPLETED | `runs/intcalc_harness_opus/r2/harness_log.txt` |
| INTCALC | Opus | r3 | 26.2 | 36 | 1.36M | 130,877 | PAUSED (eval_cases_unwritten) | `runs/intcalc_harness_opus/r3/harness_log.txt` |
| POSTTRAN | Sonnet | r1 | 22.2 | 36 | 1.92M | 35,448 | COMPLETED | `runs/posttran_harness_sonnet/r1/harness_log.txt` |
| POSTTRAN | Sonnet | r2 | 25.1 | 28 | 1.57M | 33,390 | COMPLETED | `runs/posttran_harness_sonnet/r2/harness_log.txt` |
| POSTTRAN | Sonnet | r3 | 19.8 | 28 | 1.40M | 48,161 | COMPLETED | `runs/posttran_harness_sonnet/r3/harness_log.txt` |
| POSTTRAN | Opus | r1 | 12.9 | 31 | 1.51M | 25,757 | COMPLETED | `runs/posttran_harness_opus/r1/harness_log.txt` |
| POSTTRAN | Opus | r2 | 15.9 | 30 | 1.30M | 40,942 | FAILED (committed_preview_changed) | `runs/posttran_harness_opus/r2/harness_log.txt` |
| POSTTRAN | Opus | r3 | 16.5 | 26 | 1.07M | 27,692 | COMPLETED | `runs/posttran_harness_opus/r3/harness_log.txt` |
| CREASTMT | Sonnet | r1 | 26.5 | 34 | 1.66M | 33,136 | COMPLETED | `runs/creastmt_harness_sonnet/r1/harness_log.txt` |
| CREASTMT | Sonnet | r2 | 32.6 | 41 | 1.91M | 46,131 | COMPLETED | `runs/creastmt_harness_sonnet/r2/harness_log.txt` |
| CREASTMT | Sonnet | r3 | 22.1 | 28 | 1.43M | 35,872 | COMPLETED | `runs/creastmt_harness_sonnet/r3/harness_log.txt` |
| CREASTMT | Opus | r1 | 20.8 | 31 | 1.43M | 46,094 | PAUSED (goal_at_risk) | `runs/creastmt_harness_opus/r1/harness_log.txt` |
| CREASTMT | Opus | r2 | 10.3 | 24 | 1.25M | 14,923 | COMPLETED | `runs/creastmt_harness_opus/r2/harness_log.txt` |
| CREASTMT | Opus | r3 | 19.9 | 25 | 1.24M | 33,201 | COMPLETED | `runs/creastmt_harness_opus/r3/harness_log.txt` |
| TRANREPT | Sonnet | r1 | 11.8 | 23 | 1.20M | 20,122 | FAILED (behaviour_failed) | `runs/tranrept_harness_sonnet/r1/harness_log.txt` |
| TRANREPT | Sonnet | r2 | 22.9 | 31 | 1.60M | 72,789 | FAILED (behaviour_failed) | `runs/tranrept_harness_sonnet/r2/harness_log.txt` |
| TRANREPT | Sonnet | r3 | 31.8 | 37 | 1.41M | 41,527 | PAUSED (item_evidence) | `runs/tranrept_harness_sonnet/r3/harness_log.txt` |
| TRANREPT | Opus | r1 | 15.8 | 31 | 1.37M | 39,586 | FAILED (committed_preview_changed) | `runs/tranrept_harness_opus/r1/harness_log.txt` |
| TRANREPT | Opus | r2 | 15.5 | 23 | 0.95M | 28,053 | COMPLETED | `runs/tranrept_harness_opus/r2/harness_log.txt` |
| TRANREPT | Opus | r3 | 32.0 | 45 | 1.98M | 86,780 | PAUSED (goal_at_risk) | `runs/tranrept_harness_opus/r3/harness_log.txt` |

Notes:
- INTCALC Sonnet r2 (49.7 min) includes two operator resumes after the script-size stop, the driver's gate flood
  (fixed during the run) and the 22:14–22:24Z harness outage (HARNESS_ISSUES A2–A4, A8).
- INTCALC Opus r3 includes two resumes of the paused evaluation step (HARNESS_ISSUES A5).
- POSTTRAN Opus r2 includes the operator's two manual restart attempts after the plan failed (HARNESS_ISSUES A9);
  no workflow was saved.
- Layer 1 harness windows run 15:32–17:46Z (CREASTMT) and 19:06–21:16Z (TRANREPT) on 2026-10-26; none overlaps the
  ≈17:50–17:59Z outage, which hit execution only (notebook §47). They include the A2 platform-error retries:
  CREASTMT Opus r1 one; TRANREPT Sonnet r1 and r2 two each (plan `behaviour_failed` three times); Sonnet r3 two
  (`decide_timeout`); Opus r1 two refused restarts (409); Opus r3 one (HARNESS_ISSUES A10–A14).

## Per condition: median (range)

| Step | Arm | Builder | Wiki | n | Wall-clock min, median (range) | Turns / calls | Output tokens | Cost USD |
|---|---|---|---|---|---|---|---|---|
| INTCALC | primary | zflx | Sonnet | 3 | 6.5 (6.2–10) | 38 (33–44) | 42791 (39299–55684) | 2.9 (2.81–3.63) |
| INTCALC | primary | zflx | Opus | 3 | 9.1 (5.3–13.6) | 46 (31–50) | 44359 (33525–58507) | 3.04 (2.29–3.53) |
| INTCALC | A5 | zflx | Sonnet | 3 | 7 (6.8–8.1) | 37 (35–44) | 46779 (44051–55667) | 3.38 (3.1–4.23) |
| INTCALC | A5 | zflx | Opus | 3 | 7.5 (6.4–7.7) | 33 (31–41) | 48671 (42893–53067) | 2.85 (2.48–3) |
| INTCALC | A6 | zflx | Sonnet | 3 | 7.5 (7.2–8.4) | 45 (42–48) | 46884 (46287–54111) | 4.4 (3.93–4.89) |
| INTCALC | A6 | zflx | Opus | 3 | 7.2 (7.2–7.5) | 40 (38–48) | 43344 (42977–44117) | 3.48 (3.44–3.97) |
| INTCALC | A6b | zflx | Sonnet | 3 | 5.9 (4.9–6.2) | 27 (26–29) | 39513 (30457–39814) | 2.64 (2.32–2.86) |
| INTCALC | A6b | zflx | Opus | 3 | 7.8 (5.3–9.2) | 44 (38–55) | 50832 (31082–60437) | 4.09 (3.95–4.46) |
| POSTTRAN | A11 | zflx | Sonnet | 3 | 8 (6.8–9) | 43 (39–46) | 51484 (45428–60627) | 3.73 (3.35–4.89) |
| POSTTRAN | A11 | zflx | Opus | 3 | 10.3 (8–10.4) | 48 (40–62) | 64538 (53036–65933) | 4.12 (3.13–5.3) |
| CREASTMT | A13 | zflx | Sonnet | 3 | 9 (8.8–9.2) | 44 (39–48) | 62030 (54425–62615) | 3.97 (3.96–5.44) |
| CREASTMT | A13 | zflx | Opus | 3 | 8 (7.5–11) | 35 (23–36) | 55448 (48219–73281) | 4.09 (2.72–4.7) |
| TRANREPT | A14 | zflx | Sonnet | 3 | 7.3 (6.7–7.7) | 34 (33–36) | 48721 (42699–53350) | 3.13 (2.91–4.49) |
| TRANREPT | A14 | zflx | Opus | 3 | 6.6 (6–7.2) | 37 (37–47) | 44720 (36735–49041) | 2.82 (2.66–3.14) |
| INTCALC | primary | harness | Sonnet | 3 | 20 (15.1–49.7) | 29 (28–37) | 33051 (30400–65561) | not logged |
| INTCALC | primary | harness | Opus | 3 | 21.6 (9.2–26.2) | 36 (26–41) | 77224 (19362–130877) | not logged |
| POSTTRAN | A11 | harness | Sonnet | 3 | 22.2 (19.8–25.1) | 28 (28–36) | 35448 (33390–48161) | not logged |
| POSTTRAN | A11 | harness | Opus | 3 | 15.9 (12.9–16.5) | 30 (26–31) | 27692 (25757–40942) | not logged |
| CREASTMT | A13 | harness | Sonnet | 3 | 26.5 (22.1–32.6) | 34 (28–41) | 35872 (33136–46131) | not logged |
| CREASTMT | A13 | harness | Opus | 3 | 19.9 (10.3–20.8) | 25 (24–31) | 33201 (14923–46094) | not logged |
| TRANREPT | A14 | harness | Sonnet | 3 | 22.9 (11.8–31.8) | 31 (23–37) | 41527 (20122–72789) | not logged |
| TRANREPT | A14 | harness | Opus | 3 | 15.8 (15.5–32) | 31 (23–45) | 39586 (28053–86780) | not logged |

## Per thousand lines of COBOL

Primary INTCALC, POSTTRAN, CREASTMT and TRANREPT zflx builds (6 each), both wikis pooled; harness builds as available.

| Step | Lines | zflx n | zflx $/kLOC, median (range) | zflx min/kLOC, median (range) | Harness n | Harness input tokens/kLOC (median) | Harness output tokens/kLOC (median) | Harness min/kLOC (median) |
|---|---|---|---|---|---|---|---|---|
| INTCALC | 652 | 6 | 4.56 (3.51–5.57) | 12.0 (8.1–20.9) | 6 | 2.13M | 75.6k | 31.9 |
| POSTTRAN | 731 | 6 | 5.37 (4.28–7.25) | 11.6 (9.3–14.2) | 6 | 1.99M | 47.1k | 24.8 |
| CREASTMT | 1,154 | 6 | 3.49 (2.36–4.71) | 7.7 (6.5–9.5) | 6 | 1.24M | 29.9k | 18.6 |
| TRANREPT | 649 | 6 | 4.65 (4.10–6.92) | 10.7 (9.2–11.9) | 6 | 2.15M | 62.5k | 29.8 |

These ratios come from four short programs (649–1,154 lines). The largest (CREASTMT) has the lowest zflx cost and
time per line, so the ratios are not constant across programs. How build cost scales with program size is not
measured here, so they should not be extrapolated linearly to a large codebase.

## Wiki generation (one-time, whole codebase, not per step)

- **Opus-run wiki** (2026-10-22, legacy agent on dev-env, model `claude-opus-4-8`, 228 input files):
  - analysis phase: 717,685 input tokens (597,132 cache reads), 33,987 output tokens (wiki-run log, not published, final `complete` event; elapsed time not logged);
  - wiki phase: 1,801 s (30.0 min), 28,098,513 input tokens (27,782,436 cache reads), 153,076 output tokens (wiki-run log, not published, final `complete` event).
  - No dollar cost is logged.
- **Sonnet-run wiki:** no usage or timing log was kept (wiki-run log, not published holds the bundle and
  the wiki only). Not reported.

## What these figures exclude

- Generating the wiki (above, reported separately; it covers the whole codebase, not one step).
- Human and driver time: answering gates, logging in, preparing bundles, mapping flags, scoring.
- Building the oracle (GnuCOBOL setup, golden outputs, scorer).
- Running the built workflows on the evaluation sets.
- The exploratory repairs (A9/A10): manual deletions of input checks in the harness workflows
  (`runs/intcalc_harness_*/r*_repair/repair.diff`), with no model calls, so there is no model cost to report.
- Pilots P0–P2 and the setup incidents (no builder ran in the incidents).

Build cost says nothing about output quality on its own: read it next to the scores (`runs/*_SUMMARY.md`).
