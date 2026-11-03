# Layer 1 score: `runs/a25/harness/ix3/r1/out/base` vs `golden/v1`

- Equivalence (strict): **72.25%** · business: **72.53%** of 364 units
- Divergent units: 100 (silent 0, flagged 100)
- Flags raised: 36 (unneeded 18)
- Layout (not part of equivalence): {"tranrept_report": {"line_match": 0.6803, "page_totals_equal": false, "pages_golden": 18, "pages_candidate": 7}}
- Excluded from equivalence (S4, overflow statements): 0 units, 0 differing

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| tranrept_report | 363 | 314 | 263 | 264 |

| Rule | silent | flagged |
|---|---|---|
| R-REPT-ACCT | 0 | 48 |
| R-REPT-GRAND | 0 | 1 |
| R-REPT-LASTACCT | 0 | 1 |
| R-REPT-SET | 0 | 50 |

First 40 divergences:

| output | key | kind | field | rule | flagged |
|---|---|---|---|---|---|
| tranrept_report | 2022071800000001 | missing |  | R-REPT-SET | yes |
| tranrept_report | 2022071800000002 | missing |  | R-REPT-SET | yes |
| tranrept_report | 2022071800000003 | missing |  | R-REPT-SET | yes |
| tranrept_report | 2022071800000004 | missing |  | R-REPT-SET | yes |
| tranrept_report | 2022071800000005 | missing |  | R-REPT-SET | yes |
| tranrept_report | 2022071800000006 | missing |  | R-REPT-SET | yes |
| tranrept_report | 2022071800000007 | missing |  | R-REPT-SET | yes |
| tranrept_report | 2022071800000008 | missing |  | R-REPT-SET | yes |
| tranrept_report | 2022071800000009 | missing |  | R-REPT-SET | yes |
| tranrept_report | 2022071800000010 | missing |  | R-REPT-SET | yes |
| tranrept_report | 2022071800000011 | missing |  | R-REPT-SET | yes |
| tranrept_report | 2022071800000012 | missing |  | R-REPT-SET | yes |
| tranrept_report | 2022071800000013 | missing |  | R-REPT-SET | yes |
| tranrept_report | 2022071800000014 | missing |  | R-REPT-SET | yes |
| tranrept_report | 2022071800000015 | missing |  | R-REPT-SET | yes |
| tranrept_report | 2022071800000016 | missing |  | R-REPT-SET | yes |
| tranrept_report | 2022071800000017 | missing |  | R-REPT-SET | yes |
| tranrept_report | 2022071800000018 | missing |  | R-REPT-SET | yes |
| tranrept_report | 2022071800000019 | missing |  | R-REPT-SET | yes |
| tranrept_report | 2022071800000020 | missing |  | R-REPT-SET | yes |
| tranrept_report | 2022071800000021 | missing |  | R-REPT-SET | yes |
| tranrept_report | 2022071800000022 | missing |  | R-REPT-SET | yes |
| tranrept_report | 2022071800000023 | missing |  | R-REPT-SET | yes |
| tranrept_report | 2022071800000024 | missing |  | R-REPT-SET | yes |
| tranrept_report | 2022071800000025 | missing |  | R-REPT-SET | yes |
| tranrept_report | 2022071800000026 | missing |  | R-REPT-SET | yes |
| tranrept_report | 2022071800000027 | missing |  | R-REPT-SET | yes |
| tranrept_report | 2022071800000028 | missing |  | R-REPT-SET | yes |
| tranrept_report | 2022071800000029 | missing |  | R-REPT-SET | yes |
| tranrept_report | 2022071800000030 | missing |  | R-REPT-SET | yes |
| tranrept_report | 2022071800000031 | missing |  | R-REPT-SET | yes |
| tranrept_report | 2022071800000032 | missing |  | R-REPT-SET | yes |
| tranrept_report | 2022071800000033 | missing |  | R-REPT-SET | yes |
| tranrept_report | 2022071800000034 | missing |  | R-REPT-SET | yes |
| tranrept_report | 2022071800000035 | missing |  | R-REPT-SET | yes |
| tranrept_report | 2022071800000036 | missing |  | R-REPT-SET | yes |
| tranrept_report | 2022071800000037 | missing |  | R-REPT-SET | yes |
| tranrept_report | 2022071800000038 | missing |  | R-REPT-SET | yes |
| tranrept_report | 2022071800000039 | missing |  | R-REPT-SET | yes |
| tranrept_report | 2022071800000040 | missing |  | R-REPT-SET | yes |
