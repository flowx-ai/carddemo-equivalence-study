# Score: `runs/accrue_zflx_opus/r3/out/c02` vs `runs/A5_golden/c02`

- Equivalence (strict): **3.03%** · business: **3.03%** of 99 records
- Divergent records: 96 (silent 1, flagged 95)
- Flags raised: 17 (unneeded 7) · volatile fields masked: {'intcalc_systran.proc_ts': 1, 'intcalc_systran.orig_ts': 1}

| Output | golden | candidate | equal (strict) | equal (business) |
|---|---|---|---|---|
| intcalc_systran | 49 | 1 | 0 | 0 |
| intcalc_acctdata | 50 | 50 | 3 | 3 |

| Rule | silent | flagged |
|---|---|---|
| R-INT-APPLY | 0 | 46 |
| R-INT-LAST | 2 | 0 |
| R-INT-RATE | 0 | 48 |
| R-INT-TXFORMAT | 0 | 2 |

First 40 divergences:

| output | key | kind | field | golden | candidate | rule | flagged |
|---|---|---|---|---|---|---|---|
| intcalc_systran | 0500024453765740#1 | missing |  |  |  | R-INT-RATE | yes |
| intcalc_systran | 0683586198171516#1 | missing |  |  |  | R-INT-RATE | yes |
| intcalc_systran | 0927987108636232#1 | missing |  |  |  | R-INT-RATE | yes |
| intcalc_systran | 0982496213629795#1 | missing |  |  |  | R-INT-RATE | yes |
| intcalc_systran | 1014086565224350#1 | missing |  |  |  | R-INT-RATE | yes |
| intcalc_systran | 1142167692878931#1 | missing |  |  |  | R-INT-RATE | yes |
| intcalc_systran | 1561409106491600#1 | missing |  |  |  | R-INT-RATE | yes |
| intcalc_systran | 2745303720002090#1 | missing |  |  |  | R-INT-RATE | yes |
| intcalc_systran | 2760836797107565#1 | missing |  |  |  | R-INT-RATE | yes |
| intcalc_systran | 2871968252812490#1 | missing |  |  |  | R-INT-RATE | yes |
| intcalc_systran | 2940139362300449#1 | missing |  |  |  | R-INT-RATE | yes |
| intcalc_systran | 2988091353094312#1 | missing |  |  |  | R-INT-RATE | yes |
| intcalc_systran | 3260763612337560#1 | missing |  |  |  | R-INT-RATE | yes |
| intcalc_systran | 3766281984155154#1 | missing |  |  |  | R-INT-RATE | yes |
| intcalc_systran | 3940246016141489#1 | missing |  |  |  | R-INT-RATE | yes |
| intcalc_systran | 3999169246375885#1 | missing |  |  |  | R-INT-RATE | yes |
| intcalc_systran | 4011500891777367#1 | missing |  |  |  | R-INT-RATE | yes |
| intcalc_systran | 4385271476627819#1 | missing |  |  |  | R-INT-RATE | yes |
| intcalc_systran | 4534784102713951#1 | missing |  |  |  | R-INT-RATE | yes |
| intcalc_systran | 4859452612877065#1 | missing |  |  |  | R-INT-RATE | yes |
| intcalc_systran | 5407099850479866#1 | missing |  |  |  | R-INT-RATE | yes |
| intcalc_systran | 5656830544981216#1 | missing |  |  |  | R-INT-RATE | yes |
| intcalc_systran | 5671184478505844#1 | missing |  |  |  | R-INT-RATE | yes |
| intcalc_systran | 5787351228879339#1 | missing |  |  |  | R-INT-RATE | yes |
| intcalc_systran | 5975117516616077#1 | missing |  |  |  | R-INT-RATE | yes |
| intcalc_systran | 6009619150674526#1 | missing |  |  |  | R-INT-RATE | yes |
| intcalc_systran | 6349250331648509#1 | missing |  |  |  | R-INT-RATE | yes |
| intcalc_systran | 6503535181795992#1 | missing |  |  |  | R-INT-RATE | yes |
| intcalc_systran | 6509230362553816#1 | missing |  |  |  | R-INT-RATE | yes |
| intcalc_systran | 6723000463207764#1 | missing |  |  |  | R-INT-RATE | yes |
| intcalc_systran | 6727055190616014#1 | missing |  |  |  | R-INT-RATE | yes |
| intcalc_systran | 6832676047698087#1 | missing |  |  |  | R-INT-RATE | yes |
| intcalc_systran | 7026637615032277#1 | missing |  |  |  | R-INT-RATE | yes |
| intcalc_systran | 7058267261837752#1 | missing |  |  |  | R-INT-RATE | yes |
| intcalc_systran | 7094142751055551#1 | missing |  |  |  | R-INT-RATE | yes |
| intcalc_systran | 7251508149188883#1 | missing |  |  |  | R-INT-RATE | yes |
| intcalc_systran | 7379335634661142#1 | missing |  |  |  | R-INT-RATE | yes |
| intcalc_systran | 7427684863423209#1 | missing |  |  |  | R-INT-RATE | yes |
| intcalc_systran | 7443870988897530#1 | missing |  |  |  | R-INT-RATE | yes |
| intcalc_systran | 8040580410348680#1 | missing |  |  |  | R-INT-RATE | yes |
