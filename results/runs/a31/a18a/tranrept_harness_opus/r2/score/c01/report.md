# Layer 1 score: `runs/a31/a18a/tranrept_harness_opus/r2/out/c01` vs `golden/v1/cases/c01/out`

- Equivalence (strict): **13.35%** · business: **13.90%** of 367 units
- Divergent units: 316 (silent 0, flagged 316)
- Flags raised: 22 (unneeded 11)
- Layout (not part of equivalence): {"tranrept_report": {"line_match": 0.0687, "page_totals_equal": false, "pages_golden": 21, "pages_candidate": 1}}
- Excluded from equivalence (S4, overflow statements): 0 units, 0 differing

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| tranrept_report | 366 | 102 | 49 | 51 |

| Rule | silent | flagged |
|---|---|---|
| R-REPT-ACCT | 0 | 49 |
| R-REPT-GRAND | 0 | 1 |
| R-REPT-LASTACCT | 0 | 1 |
| R-REPT-SET | 0 | 265 |

First 40 divergences:

| output | key | kind | field | rule | flagged |
|---|---|---|---|---|---|
| tranrept_report | 0000000000683580 | missing |  | R-REPT-SET | yes |
| tranrept_report | 0000000001774260 | missing |  | R-REPT-SET | yes |
| tranrept_report | 0000000006292564 | missing |  | R-REPT-SET | yes |
| tranrept_report | 0000000009101861 | missing |  | R-REPT-SET | yes |
| tranrept_report | 0000000010142252 | missing |  | R-REPT-SET | yes |
| tranrept_report | 0000000010229018 | missing |  | R-REPT-SET | yes |
| tranrept_report | 0000000016259484 | missing |  | R-REPT-SET | yes |
| tranrept_report | 0000000017874199 | missing |  | R-REPT-SET | yes |
| tranrept_report | 0000000019065428 | missing |  | R-REPT-SET | yes |
| tranrept_report | 0000000021711604 | missing |  | R-REPT-SET | yes |
| tranrept_report | 0000000025430891 | missing |  | R-REPT-SET | yes |
| tranrept_report | 0000000028097268 | missing |  | R-REPT-SET | yes |
| tranrept_report | 0000000030755266 | missing |  | R-REPT-SET | yes |
| tranrept_report | 0000000032979555 | missing |  | R-REPT-SET | yes |
| tranrept_report | 0000000033688127 | missing |  | R-REPT-SET | yes |
| tranrept_report | 0000000043636099 | missing |  | R-REPT-SET | yes |
| tranrept_report | 0000000051205286 | missing |  | R-REPT-SET | yes |
| tranrept_report | 0000000054288996 | missing |  | R-REPT-SET | yes |
| tranrept_report | 0000000054727064 | missing |  | R-REPT-SET | yes |
| tranrept_report | 0000000058866561 | missing |  | R-REPT-SET | yes |
| tranrept_report | 0000000060921254 | missing |  | R-REPT-SET | yes |
| tranrept_report | 0000000061394789 | missing |  | R-REPT-SET | yes |
| tranrept_report | 0000000070754800 | missing |  | R-REPT-SET | yes |
| tranrept_report | 0000000072220498 | missing |  | R-REPT-SET | yes |
| tranrept_report | 0000000084515950 | missing |  | R-REPT-SET | yes |
| tranrept_report | 0000000085824369 | missing |  | R-REPT-SET | yes |
| tranrept_report | 0000000095706092 | missing |  | R-REPT-SET | yes |
| tranrept_report | 0000000099965527 | missing |  | R-REPT-SET | yes |
| tranrept_report | 0000000100915314 | missing |  | R-REPT-SET | yes |
| tranrept_report | 0000000107748365 | missing |  | R-REPT-SET | yes |
| tranrept_report | 0000000109340521 | missing |  | R-REPT-SET | yes |
| tranrept_report | 0000000109506921 | missing |  | R-REPT-SET | yes |
| tranrept_report | 0000000115716061 | missing |  | R-REPT-SET | yes |
| tranrept_report | 0000000130111733 | missing |  | R-REPT-SET | yes |
| tranrept_report | 0000000132831571 | missing |  | R-REPT-SET | yes |
| tranrept_report | 0000000137879630 | missing |  | R-REPT-SET | yes |
| tranrept_report | 0000000139910093 | missing |  | R-REPT-SET | yes |
| tranrept_report | 0000000142315472 | missing |  | R-REPT-SET | yes |
| tranrept_report | 0000000143386237 | missing |  | R-REPT-SET | yes |
| tranrept_report | 0000000152467982 | missing |  | R-REPT-SET | yes |
