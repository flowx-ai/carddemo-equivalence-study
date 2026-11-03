# Agentic Harness stops

The FlowX Developer Agentic Harness (the in-product builder; folder names use the internal label `harness`) was
improved during the study. When a defect of the Agentic Harness halted an arm before its builds were done, the
Agentic Harness was corrected and the remaining builds were run under a new amendment, frozen and timestamped before
any build on the corrected version (protocol §13, A15–A31). Builds already scored keep their scores. D15 was not
corrected: the screens arm ended under A31's rule.

| Stop | Arm | Effect on the record |
|---|---|---|
| D1 | change request and ablation (A16, A17), A18 version | 2 of 18 builds run; reported as a separate partial arm; rerun under A19 |
| D2 | wiki ablation (A17), A19 version | 1 of 12 builds run; reported separately; rerun under A20 |
| D3 | wiki ablation (A17), A20 version | a platform stop before any plan; retried once under A22; arm completed |
| D4 | wiki ablation (A17), A20 version | last build, scored 0% (no workflow) |
| D5 | six further change requests (A21), A20 version | 5 of 18 builds run; CR3 complete and kept; CR4–CR8 rerun under A23 |
| D6 | CR6 r2 (A23), A23 version | arm stopped; CR6 r3, CR7, CR8 not run; run under A25 |
| D7 | CR8 r3 (A25), R13 version | last of 9 change-request builds, scored as it ended; later arms on R13 not run |
| D8 | online screens r1 (A26), R14 version | 1 of 3 builds run, scored 0% (no application built); the other two and one check build not run |
| D9 | online screens smoke (A27), R15 version | unscored smoke stopped mid-plan; no A27 build run |
| D10, D11 | unscored pilots before A28, R16 and R17 versions | two unscored pilot builds stopped mid-plan; no scored build affected |
| D12 | CR7 r1 (A28), R18 version | not scored; A28 stopped in its batch part before any screens build; continued under A29 |
| D13 | online screens r1 (A29), R19 version | stopped at 17 of 113 plan items; recorded, not counted; continued under A30 |
| D14 | online screens r2 (A30), R20 version | recorded, not counted; continued under A31 |
| D15 | online screens r3 (A31), R21 version | stopped at 1 of 54 plan items; recorded, not counted; not corrected; the screens arm ended |

**Stops read as the build's own** (the operator's reading, made before any output of the build was opened, and
reported for a ruling: for the two counted screens builds a cause in the Agentic Harness is not excluded):

| Build | Version | Effect on the record |
|---|---|---|
| online screens smoke p1 (A29) | R19 | unscored; stopped at planning |
| online screens r1 (A30) | R20 | paused at 24 of 109 plan items with nothing built; counted, scored absent |
| online screens r2 (A31) | R21 | paused before running a step, nothing written; counted, scored absent |
| A18 (a) POSTTRAN, Opus wiki, r3 | R21 | paused at 8 of 10 plan items; scored as it ended |

With the two counted screens builds absent, H15h–H18h are refuted on two of three builds as registered, and H19h was
not run: no Agentic Harness build has built a screen. Read as defects of the Agentic Harness, the two stops would
leave the arm with no verdict.

Every stopped build is scored as the protocol requires (a build with no workflow scores 0%) and reported; no build is
dropped and no result is pooled across Agentic Harness versions, except the H14h rule count, as registered.
Engineering details of the corrections are not part of this repository.
