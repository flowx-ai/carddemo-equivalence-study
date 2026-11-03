# Harness × Sonnet wiki × INTCALC, r1 with a one-line repair (A9, exploratory)

- Repair: version d5223829… (WIP, branch `a9-one-line-repair`) branched from the scored build 2fc3c2d3…. One
  statement deleted from script node "Calculate interest": `if(row.group_id==='')throw new Error('Empty group_id');`
  (`repair.diff`; `workflow_before.md` and `workflow_after.md` differ only in that line, ids aside). The workflow
  was forked into the WIP as resource 1e65ee80….
- Execution as r1 (same requests, same renaming map); flags are r1's frozen `flags.json`.

| set | records | strict | business | divergent (silent / flagged) | rule |
|---|---|---|---|---|---|
| base | 100 | 99.00% | 99.00% | 1 (0 / 1) | R-INT-LAST |
| c01 | 100 | 99.00% | 99.00% | 1 (0 / 1) | R-INT-LAST |
| c02 | 99 | 98.99% | 98.99% | 1 (0 / 1) | R-INT-LAST |
| c03 | 100 | 0.00% | 0.00% | 100 (100 / 0) | R-ABSENT |
| c04 | 103 | 99.03% | 99.03% | 1 (0 / 1) | R-INT-LAST |

- The one divergent record (base, c01, c02, c04) is the last account: the build rewrites it (adds its interest and
  clears the cycle totals); legacy does not (the end-of-file defect, notebook §7). This differs from legacy and is
  flagged ([account-boundaries], catalogue line 22).
- c03 fails with `Card link references missing account 99999999999`. c03 holds an orphan card cross-reference
  (an account that does not exist, notebook §12). Legacy ignores it; the build's input validation rejects the whole
  run. It is the same kind of failure as the blank group, a strictness the legacy program does not have. A9 allows
  one line only, so it is not repaired.
- Reading: with one statement removed, the build matches legacy on every interest transaction in four of five
  sets. Its remaining differences are one flagged last-account record and a second validation rejection.
