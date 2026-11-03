# Ledgerline ACCRUE (interest calculation) on FlowX.AI

**FlowX workflow:** `accrue_interest_calculation`, in project `ll_accrue_zflx_opus_r2` (WIP version
`<uuid>`). Its resourceId is `<uuid>`
and its resourceDefinitionId is `<uuid>`.

```
Start ──► Load input files ──► Compute interest ──► Post interest to accounts ──► End
          (parse LXV022Y/       (per category       (sum per account, add to
           026Y/027Y/024Y/029Y)  balance × rate/1200, curr_bal, write interest
                                 truncated)          transactions)
```

## Running a scored run

1. Start the workflow with this input (each `*File` holds the full text of that `.dat` file):

   | Input | Source |
   |---|---|
   | `ledgaccFile` | `ledgacc.dat` (the POSTDAY output, per CONTRACT.md step isolation) |
   | `balcatFile` | `balcat.dat` (POSTDAY output) |
   | `rategrpFile` | `rategrp.dat` |
   | `cardlinkFile` | `cardlink.dat` |
   | `txncatgFile` | `txncatg.dat` (optional) |
   | `businessDate` | `2022-07-18` |
   | `accrueParam` | `2022071800` |
   | `resetCycleTotals` | optional, default `false` (see assumption A18) |

2. Write the END output into `out/`:
   - `accrue_systxn_json` → `out/accrue_systxn.json`
   - `accrue_ledgacc_json` → `out/accrue_ledgacc.json`

   `runReport` contains counts and data warnings.

`out/assumptions.md` lists every decision made where the wiki was uncertain or silent.
`out/flags.json` declares the matching uncertainties in the CONTRACT.md format.

The real input files were not part of the hand-off, so `out/` contains no scored outputs yet.

## Tests

`test/fixture-input.json` is a synthetic 5-account / 6-balance set built to cover the acceptance
scenarios: happy path, fractional cents, zero balance, two disclosure groups plus a DEFAULT fallback,
rate 0, a negative overpunched balance, an 11-digit account id, and an account with no card link. Its
outputs from a live run on 2026-10-25 are in `test/expected/` and match hand calculation.
