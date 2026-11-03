# Branch coverage (GnuCOBOL statement trace)

Executions of each branch outcome per evaluation set. Probe lines and outcome definitions: `tools/coverage.py`, `BRANCHES.md`.

| Outcome | base | c01 | c02 | c03 | c04 | covered |
|---|---|---|---|---|---|---|
| P01 next record | 300 | 307 | 300 | 301 | 304 | yes |
| P01 end of file | 1 | 1 | 1 | 1 | 1 | yes |
| P02 card found | 300 | 306 | 300 | 301 | 304 | yes |
| P02 reason 100 | 0 | 1 | 0 | 0 | 0 | yes |
| P03 account lookup | 300 | 306 | 300 | 301 | 304 | yes |
| P03 lookup skipped | 0 | 1 | 0 | 0 | 0 | yes |
| P04 account found | 300 | 306 | 300 | 300 | 304 | yes |
| P04 reason 101 | 0 | 0 | 0 | 1 | 0 | yes |
| P05 limit pass | 262 | 266 | 262 | 262 | 266 | yes |
| P05 reason 102 | 38 | 40 | 38 | 38 | 38 | yes |
| P06 expiry pass | 300 | 304 | 300 | 300 | 304 | yes |
| P06 reason 103 | 0 | 2 | 0 | 0 | 0 | yes |
| P07 102 and 103 both (103 wins) | 0 | 1 | 0 | 0 | 0 | yes |
| P08 posted | 262 | 265 | 262 | 262 | 266 | yes |
| P08 rejected | 38 | 42 | 38 | 39 | 38 | yes |
| P09 category balance updated | 212 | 215 | 212 | 212 | 213 | yes |
| P09 category balance created | 50 | 50 | 50 | 50 | 53 | yes |
| P10 cycle credit (amt >= 0) | 212 | 214 | 212 | 212 | 215 | yes |
| P10 cycle debit (amt < 0) | 50 | 51 | 50 | 50 | 51 | yes |
| P12 reason 109 (rewrite failed) | 0 | 0 | 0 | 0 | 0 | **no** |
| P13 RC 4 | 1 | 1 | 1 | 1 | 1 | yes |
| P13 RC 0 | 0 | 0 | 0 | 0 | 0 | **no** |
| P14 abend | 0 | 0 | 0 | 0 | 0 | **no** |
| I01 next record | 100 | 100 | 100 | 100 | 103 | yes |
| I01 end of file | 1 | 1 | 1 | 1 | 1 | yes |
| I02 final account update (ELSE) | 0 | 0 | 0 | 0 | 0 | **no** |
| I03 account changed | 50 | 50 | 50 | 50 | 50 | yes |
| I03 same account | 50 | 50 | 50 | 50 | 53 | yes |
| I04 first account | 1 | 1 | 1 | 1 | 1 | yes |
| I04 previous account updated | 49 | 49 | 49 | 49 | 49 | yes |
| I05 own group rate found | 0 | 0 | 3 | 0 | 0 | yes |
| I05 DEFAULT fallback | 100 | 100 | 97 | 100 | 103 | yes |
| I06 DEFAULT found | 100 | 100 | 97 | 100 | 103 | yes |
| I06 DEFAULT missing (abend) | 0 | 0 | 0 | 0 | 0 | **no** |
| I07 interest computed | 50 | 50 | 49 | 50 | 53 | yes |
| I07 zero rate skipped | 50 | 50 | 51 | 50 | 50 | yes |
| I08 account found | 50 | 50 | 50 | 50 | 50 | yes |
| I08 account missing (abend) | 0 | 0 | 0 | 0 | 0 | **no** |
| I09 card found | 50 | 50 | 50 | 50 | 50 | yes |
| I09 card missing (abend) | 0 | 0 | 0 | 0 | 0 | **no** |
| I16 abend | 0 | 0 | 0 | 0 | 0 | **no** |

Traced outputs equal golden: base yes, c01 yes, c02 yes, c03 yes, c04 yes
