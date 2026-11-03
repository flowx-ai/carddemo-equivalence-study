# A16 zflx pre-score record (written per build before that build is executed; no output opened)

Mapper: Claude. Flag rubric: notebook §25, unchanged. Flags: `runs/a16/<step>_zflx_sonnet/r<n>/flags.json` (specs in
`runs/a16/flagspec/`), hashes in `runs/a16/FLAGS_A16.sha256`. Wiki flags: CR1 none (the edited BR-08 has no TODO left;
other TODO/DECISION markers sit on pages no earlier INTCALC mapping counted). CR2: the two posttran-sonnet wiki flags
(BR-04 and AC DECISIONs, R-POST-PRECEDENCE), unchanged lines in the CR2 bundle.

Decode keymaps: read from each build's workflow definition and README (`adapter/keymap_source.txt`), committed with
the flags, before execution.

Bundle file name: the run directory holds the frozen bundle under its frozen name (`cr1-intcalc-sonnet.pdf`,
`cr2-posttran-sonnet.pdf`), so the builder can see the `cr1`/`cr2` prefix. Project names and run dirs use
`cd_a16_<step>_zflx_sonnet_r<n>` / `carddemo-builds/a16/`, with no `cr`. Each register is checked below for any
mention of a change request.

## What each build says about the changed rule (before execution)

| Build | Rule as implemented (from its register and definition) | Legacy citation | Mentions a change request / the file prefix |
|---|---|---|---|
| CR1 r1 | A-09: rounded to the cent, halves away from zero (wiki BR-08), `divRoundHalfAway` in the script. Notes the conflict with its recollection of CBACT04C (no `ROUNDED`), "unverified"; flags R-INT-TRUNC | CBACT04C: register 1, script 2, README 1 | no |
| CR1 r2 | A-12: rounded to the cent, halves away from zero (wiki BR-08), integer cents per category before summing. Notes that legacy may truncate if CBACT04C has no `ROUNDED`; flags R-INT-TRUNC | CBACT04C: register 1, script 1, README 1 | no |
| CR1 r3 | A8: rounded to the nearest cent, halves away from zero (wiki BR-08, AC), BigInt integer arithmetic. "Uncertain: if the legacy statement actually truncates…"; flags R-INT-TRUNC | CBACT04C: register 0, definition 2 (description, comment) | no |
| CR2 r1 | A7: `cycle credit − cycle debit + amount > creditLimit × 1.10` → 102, strict `>`, integer cents (wiki BR-03, AC 4). Flags that its memory of CBTRN02C has no tolerance and that 100–110% records would differ from that program | CBTRN02C: register 1 (A7), definition 2 | names the bundle file `cr2-posttran-sonnet.pdf` (line 8) as the source of "Wiki"; no change request mentioned |
| CR2 r2 | A6: `… > creditLimit × 1.10` → 102, strict `>`, integer cents (BR-03). Says AC scenario 4's text omits the ×1.10 and it followed BR-03; flags R-POST-102 as "the single rule most likely to differ from the legacy oracle" (no program named) | CBTRN02C: 0 in register and README, 2 in definition | names `cr2-posttran-sonnet.pdf` as the source of "Wiki" (line 4); no change request mentioned |
| CR2 r3 | V2: `… > creditLimit × 1.10` → 102 "exactly as written", strict `>`, integer cents; "I implemented the wiki as documented; I did not add or remove the tolerance". No uncertainty raised, so R-POST-102 is **not** flagged | CBTRN02C: register 0, README 1, definition 4; F1 says "standard CardDemo field offsets" | no |

Revision before execution: CR2 r2 got one more flag (A3, line 27, R-POST-COPY: offsets not in the wiki), so that the
same statement maps the same way in r2 and r3. r2 had not been executed and no output was opened; both hashes are in
`FLAGS_A16.sha256`, the later one is the scored file.
