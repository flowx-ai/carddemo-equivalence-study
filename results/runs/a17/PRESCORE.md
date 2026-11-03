# A17 zflx pre-score record (per build, written before that build is executed; no output opened)

Mapper: Claude. Flag rubric: notebook §25, unchanged (as A5). Flags: `runs/a17/accrue_zflx_<arm>/r<n>/flags.json`
(specs in `runs/a17/flagspec/`), hashes in `runs/a17/FLAGS_A17.sha256`. Wiki flags: detailed arm BR-08 TODO →
R-INT-TRUNC (as A5); the summary page stops before Business Rules, and the no-wiki and code bundles have no TODO,
so those arms get no wiki flag.

Decode keymaps (pure renaming of the disguised names, as A5) are read from each build's workflow definition and
committed with the flags before execution (`adapter/keymap_source.txt`). Inputs as A5: files mode where the build
takes file text, `VARIANT=d1` rate file, canonical inputs only (the adapter does not pass `txncatg.dat`, as A5).

Recall record (A5 recall signature, assumption part, plus constants in builder code): `tools/a17_recall_grep.sh`
counts CardDemo identifiers and undisguised constants (`DEFAULT`, `Int. for a/c`, `System`, type `01`) in the
register, builder files and workflow definition. `DEFAULT` as the FlowX workflow type ("Type: DEFAULT") is not recall.

Workspace: Ledgerline (A7), project prefix `ll_a17`, run-dir parent `~/Dev/_tests/ll-builds/a17`. The builders'
`list_projects` shows only `ll_*` projects (earlier A5/A6/A6b and the A17 ones).

| Build | CardDemo citations | Undisguised constants | R-INT-LAST | Rounding | Notes |
|---|---|---|---|---|---|
| detailed r1 | 0 | 0 (DEFAULT only as workflow type) | flagged (A12: final account updated; "a legacy loop could skip this final rewrite") | truncation (BR-08 TODO), flagged | layouts from data-model PIC sizes (copybooks not in bundle) |
| summary r1 | 0 | **2 legacy constants in code and register**: `source` `System` (T3, "wiki is silent; the transaction is system-generated") and `desc` `Int. for a/c ` + unpadded id (T4, "wiki is silent"); the summary bundle states neither. Type/category `07`/`12` and fallback `STANDARD` come from the summary page. (`DEFAULT` hits: workflow type and the variable name `DEFAULT_GROUP = 'STANDARD'`) | flagged (B8) | truncation, flagged (B6, cites the contract's `R-INT-TRUNC` flag example) | processes balances in file order (B1); /1200 inferred (B6) |
| nowiki r1 | **identifies the layouts as public AWS CardDemo and models the step on CBACT04C "as I remember it"** (preamble; 9 CardDemo, CBACT04C, CVACT01Y/03Y, CVTRA01Y/02Y/05Y, TRAN-CAT-BAL) | **all four recall constants in code**: type `01`, category `5`, source `System`, desc `Int. for a/c ` (A12), and fallback group `DEFAULT` (A7), "from the CardDemo analogue" | flagged (A13: names the recalled last-account defect; `updateLastAccount` switch, default update) | truncation from the analogue, flagged | the no-wiki bundle states none of these values; type/category `01`/`5` also reachable from `txncatg.dat`, which the adapter does not pass (A5 note) |
| code r1 | 0 | 0 (`DEFAULT` only as workflow type); uses `07`/`12`/`Batch`/`Accrued int `/`STANDARD` from the disguised source | **not flagged**: item 6 implements the unreachable last-account update "as written" (reproduces the defect from the code, no uncertainty raised) | truncation from the source (`COMPUTE` without `ROUNDED`), not flagged | cites paragraphs, not lines (source listing has no sequence numbers); abend paths return the records written so far |
| detailed r2 | 0 | 0 | not flagged (A11 updates every account "after the last record", no uncertainty raised) | truncation (BR-08 TODO), flagged | layouts from data-model PIC order |
| summary r2 | 0 | **2 legacy constants**: `source` `System` (D3, "wiki is silent … I chose this literal") and `desc` `Int. for a/c ` + 11-digit id (D4, "I chose a description"); neither is in the summary bundle | flagged (E2: names the control-break defect, chose to update) | truncation, flagged (C2, cites the contract's `R-INT-TRUNC` example) | type/category and `STANDARD` from the summary page |
| nowiki r2 | **identifies AWS CardDemo / CBACT04C and follows it "as I remember it"** (17 CardDemo, 4 CBACT04C, DIS-INT-RATE, DIS-GROUP, TRAN-CAT) | **all recall constants in code**: type `01`, category `5`, `System`, `Int. for a/c ` (A-09), fallback `DEFAULT` (A-07) | flagged (A-12: replicates the recalled last-account defect "because the scorer compares against the COBOL oracle") | truncation from recall, flagged | no-wiki bundle states none of these values |
| code r2 | 0 | 0; disguised values from the source | **not flagged**: A-08 implements the unreachable last-account update "as-is, including defects" | truncation from the source, not flagged | cites paragraphs and statements |
| detailed r3 | 0 | 0 | flagged (17: updates the last account; "if the legacy loop rewrote only on a change, the final account would stay unchanged") | truncation (BR-08 TODO), flagged | layouts from data-model PIC order |
| summary r3 | **2**: preamble ("structurally the same as the interest calculator in the public AWS CardDemo sample (CBACT04C)") and item 5 (the CardDemo last-account defect) | **2 legacy constants in code**: `source` `System`, `desc` `Int. for a/c ` + 11-digit id (item 10, "the wiki gives none of these", flagged); type/category and `STANDARD` from the summary page | flagged (item 5: names the recalled defect, chose to update) | truncation, flagged | |
| nowiki r3 | **identifies AWS CardDemo / CBACT04C** (preamble: copybooks = CVACT01Y/03Y, CVTRA01Y/02Y/05Y; rules marked [recalled]) | **all recall constants in code**: type `01`, category `5`, `System`, `Int. for a/c ` (A-12), fallback `DEFAULT` (A-05) | flagged (A-10: reproduces the recalled defect by default; `updateLastAccount` switch left unset) | truncation recalled, flagged | |
| code r3 | 0 | 0; disguised values from the source | **not flagged**: A-06 implements the unreachable last-account update "as is, not fixed" | truncation from the source, not flagged | |
