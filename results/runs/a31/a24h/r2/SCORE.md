# A31 harness r2 (cd_a31_sf6_harness_r2): score

Build 21:51-22:15Z, R21, 39 calls. Plan PAUSED `milestone_expansion_refused` with 0 steps run, after two A2 retries; stop read as the build's own (interventions log). Nothing was written: no store, workflow or UI flow. Not established: why the planner wrote the refused names. Scored as it stands.

| | result on this build | detail |
|---|---|---|
| H15h payment files | fails | absent; 626 units count as silent under the frozen rule |
| H16h core screens | fails | absent; 259 units count as silent |
| H17h account view | fails | 0/29 fields |
| H18h browser subset | fails | no UI flow to open; the browser step was not run |
| H19h end to end | absent | no UI flow, so no payment to carry; the step is not run (A27 part 5) |

The scorer's "silent" counts are the frozen rule applied to an absent build. They record that the screens were not built, and say nothing about behaviour. The post-hoc blank-extra column is not computed: no build output exists.
