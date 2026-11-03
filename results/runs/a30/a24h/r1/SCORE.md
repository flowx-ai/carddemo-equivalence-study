# A30 harness r1 (cd_a30_sf6_harness_r1): score

Build 18:43-19:06Z, R20, 36 calls. Plan PAUSED `behaviour_failed` at 24 of 109 items, stop read as the build's own (interventions log): the sign-on workflow's check run failed, and its write was discarded. Publish step not reached. No UI flow or workflow exists; 5 stores exist, empty. Scored as it stands (A24); 0 flags. Pilot access: no. **Uncertain:** the failing node's error is not journalled, so a fault outside the model is not excluded.

| | result on this build | detail |
|---|---|---|
| H15h payment files | fails | absent; 626 units count as silent under the frozen rule |
| H16h core screens | fails | absent; 259 units count as silent |
| H17h account view | fails | 0/29 fields |
| H18h browser subset | fails | no UI flow to open; the browser step was not run |
| H19h end to end | absent | no UI flow, so no payment to carry; the step is not run (A27 part 5) |

The scorer's "silent" counts are the frozen rule applied to an absent build. They record that the screens were not built, and say nothing about behaviour. The post-hoc blank-extra column is not computed: no build output exists.
