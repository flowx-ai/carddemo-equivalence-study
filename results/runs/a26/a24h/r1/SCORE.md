# A26 harness r1 (cd_a26_sf6_harness_r1): score

Build 08:59–09:21Z, 37 calls, no plan: planning failed after the approved brief (harness defect D8, `../HARNESS_DEFECTS.md`).
No UI flow, workflow or store exists. Scored as it stands (A24); 0 flags, no register. Pilot access: no.

| | result on this build | detail |
|---|---|---|
| H15h payment files | fails | absent; 626 units count as silent under the frozen rule |
| H16h core screens | fails | absent; 259 units count as silent |
| H17h account view | fails | 0/29 fields |
| H18h browser subset | fails | no UI flow to open; the browser step was not run |
| H19h end to end | not run | parts 3–4 are not run on R14 (see `../../../STATE.md`) |

Screen equivalence: untagged 0/435, tagged 0/72. File equivalence: untagged 0/6,747, tagged 0/8. All 16 scored cases are *absent*.

The scorer's "silent" counts are the frozen rule applied to an absent build. They record that nothing was built, and
say nothing about behaviour. The post-hoc blank-extra column is not computed: no build output exists.
