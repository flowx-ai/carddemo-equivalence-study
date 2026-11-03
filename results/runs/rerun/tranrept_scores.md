A15 re-run, TRANREPT (exploratory; never pooled with the scored arm). Pre-registered layer-1 scorer, unchanged.
**Stopped early by user decision (2026-10-27): only Sonnet r1 was built. Sonnet r2–r3 and Opus r1–r3 were not run.**
Image `harness:local-eb96f3cbe-1793050303`. Flags, map and `_root` keymap committed in 035176f, before execution.
Executed 15:11–15:13Z in file mode, zctx ok before and after.

| Build | arm | base | c01 | c02 | c03 | c04 | silent rules | flagged rules |
|---|---|---|---|---|---|---|---|---|
| sonnet r1 | scored A11 | 98.90% / 99.18% | 98.91% / 99.18% | 98.90% / 99.17% | 98.90% / 99.18% | 98.65% / 99.19% | — | LASTDUP, LASTACCT, HEADER (3 units per set) |
| sonnet r1 | scored A11, A18(b) first attempt, post-hoc (a5dbe043) | 98.90% / 99.18% | 98.91% / 99.18% | 98.90% / 99.17% | 98.90% / 99.18% | 98.65% / 99.19% | — | LASTDUP, LASTACCT, HEADER (3 units per set) |
| sonnet r1 | re-run A15 | 99.18% / 99.45% | 99.18% / 99.46% | 99.17% / 99.45% | 99.18% / 99.45% | 98.92% / 99.46% | — | R-REPT-LASTDUP, R-REPT-LASTACCT (2 units per set) |

Strict / business. Compared with the scored build, the re-run build's header date range matches legacy. The grand
total by the last transaction's amount (LASTDUP) and the extra last-account total (LASTACCT) remain, and both are
flagged by the build.
