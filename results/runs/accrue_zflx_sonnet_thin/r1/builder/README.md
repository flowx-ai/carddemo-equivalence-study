# Ledgerline ACCRUE — interest calculation on FlowX.AI

Wiki process P-15 (`interest-calculation`, legacy job ACCRUE / LXB002C).

## What is in FlowX

Project `<uuid>`, WIP version `<uuid>` (not committed):

- Workflow **`accrue_interest_calculation`** — resourceId `<uuid>`,
  resourceDefinitionId `<uuid>`.
  START → SCRIPT `Compute interest (LXB002C)` → END.
  - INPUT slice: `interestRunDate` (opt., default `2022071800`), `ledgaccFile`, `balcatFile`, `rategrpFile`,
    `cardlinkFile` (opt.), `processTs` (opt.) — the file contents as text.
  - OUTPUT slice: `accrueSystxnJson`, `accrueLedgaccJson` (the CONTRACT.md lists as JSON text), `accrueSummaryJson`.

## Files here

- `flowx/accrue_script.js` — the SCRIPT node body, verbatim.
- `run_accrue.mjs` — runs that script over an input directory and writes the outputs.
- `output/assumptions.md` — every decision taken where the wiki is uncertain or silent.
- `output/flags.json` — those uncertainties in the CONTRACT.md flags form.

## Running

```sh
# outputs -> output/accrue_systxn.json, output/accrue_ledgacc.json (+ accrue_summary.json)
node run_accrue.mjs --in <dir with ledgacc/balcat/rategrp/cardlink> --parm 2022071800

# or run in FlowX: build the inputBody, run the workflow, convert its END output
node run_accrue.mjs --in <dir> --emit-request          # -> output/flowx_request.json
node run_accrue.mjs --flowx-result end_output.json     # -> contract files
```

Pass `--ts 2022-07-18-00.00.00.000000` for a repeatable `orig_ts`/`proc_ts`.

The input files were not included in the attachment, so the contract outputs have not been produced yet; the workflow
was verified in FlowX on synthetic records (see the end of `output/assumptions.md`). The runner itself has not been
executed (no shell was available in this session).
