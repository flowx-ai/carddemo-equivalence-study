# A31 pre-score record: harness batch builds on the R21 image

Contract: PROTOCOL.md §13 A31 (frozen `prereg/frozen/a31/`, commit 101c0893), with A21–A27 otherwise unchanged. One row per build, written from the build's workflow definition before any output is opened and committed before execution.

| Build | Rule as implemented (register and definition) | Flags the CR rule? | Legacy citation | Mentions a change request / the bundle id | Keymaps | Flags (hash) |
|---|---|---|---|---|---|---|
| CR7 ix3 r3 (R21) | line 115: type 01 + category 0005 excluded. Plan COMPLETED, no retry | no explicit flag on the interest rule; R-REPT-SET flags from date and selection gaps and the wiki TODO | no | no (attachment file name only) | files; START names, startDate, endDate; no decode map | 36 flags, 0dac10db3fbb |
| CR8 yx3 r1 (R21) | FICO band per BR-07, line 94. Plan COMPLETED, no retry | line 94 flags only blank or malformed scores; coarse R-STMT-FICO from 82 (offsets) | no | no (attachment file name only) | files; START names; decode _root result | 30 flags, 32f8960f9985 |
| CR8 yx3 r2 (R21) | FICO band per BR-07, line 46. Plan COMPLETED, no retry | 'unreadable-fico' only; coarse R-STMT-FICO from offsets | no | no (attachment file name only) | files; START names; decode _root statementRun | 30 flags, 12709bc77e53 |
| CR8 yx3 r3 (R21) | FICO band per BR-07, lines 79 and 115. Plan COMPLETED, no retry | line 78 only; coarse R-STMT-FICO from offsets | no | no (attachment file name only) | files; START names; decode _root result | 36 flags, d762a90bea92 |
