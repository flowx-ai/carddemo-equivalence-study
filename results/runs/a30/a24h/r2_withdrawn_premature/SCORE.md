# A30 harness r2 (cd_a30_sf6_harness_r2): score

Build 19:08-20:06Z, R20. The planning turn was stopped at the harness's 30-minute limit, `turn_deadline`, marked retryable, with the plan still a draft. A22's retry applies only when no plan exists, so no retry; the stop is read as the build's own. Nothing built. Scored as it stands (A24); 0 flags. Pilot access: no.

| | result on this build | detail |
|---|---|---|
| H15h payment files | fails | absent; 626 units count as silent under the frozen rule |
| H16h core screens | fails | absent; 259 units count as silent |
| H17h account view | fails | 0/29 fields |
| H18h browser subset | fails | no UI flow to open; the browser step was not run |
| H19h end to end | absent | no UI flow, so no payment to carry; the step is not run (A27 part 5) |

The scorer's "silent" counts are the frozen rule applied to an absent build. They record that the screens were not built, and say nothing about behaviour. The post-hoc blank-extra column is not computed: no build output exists.
