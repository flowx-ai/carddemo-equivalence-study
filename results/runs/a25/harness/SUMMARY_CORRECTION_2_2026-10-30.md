# A25 harness arm, part 1: second correction to `SUMMARY.md`, post hoc (2026-10-30)

Found by the paper claim check (`paper/CLAIM_CHECK_2026-10-30.md`, E1 and E2). `SUMMARY.md` is listed in
`prereg/frozen/a26/A26_MANIFEST.sha256` and is not edited. No score changes; the `report.json` files stand.

**Strict and business (`SUMMARY.md` l.31).**
Recorded: "Strict and business are equal on every build below."
Corrected: equal on every build except CR7 (`ix3/r{1,2,3}/score/*/report.json`).

| Build | Business, base / c01 / c02 / c03 / c04 | Strict, base / c01 / c02 / c03 / c04 |
|---|---|---|
| CR7 r1 | 99.36 / 99.37 / 99.36 / 99.36 / 99.37 | 99.04 / 99.05 / 99.04 / 99.04 / 98.74 |
| CR7 r2 | 99.36 / 99.37 / 99.36 / 99.36 / 99.37 | 99.36 / 99.37 / 99.36 / 99.36 / 99.06 |
| CR7 r3 | 99.36 / 99.37 / 99.36 / 99.36 / 99.37 | 99.04 / 99.05 / 99.04 / 99.04 / 98.74 |

**The 5 X records (`SUMMARY.md` l.57).**
Recorded: "The 5 X records differ from legacy on the flagged last-account handling."
Corrected: the 5 X records are the grand-total records. The changed key is `grand` in `cr/cr7/changed_keys.json`; the
flagged last-account record is not a changed key. The F / K / X counts do not change.
