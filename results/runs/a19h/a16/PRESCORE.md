# A19 harness arm, A16 change request: pre-score record (per build, written before execution; no output opened)

Builder: dev-env harness on the A19 image (digest sha256:8deba674…8f16 checked before every build, `digest_check.log`),
`tools/a1617_harness_chain.sh` (A8 gates, A18 retry rule). Mapper: Claude; rubric PROTOCOL §6 / notebook §25, §52: a
ledger entry is a flag only if its basis says the wiki leaves the point open. Register = the assumption inventory in
the workflow definition (`exec/workflow_*.md`). Flags `…/flags.json` (specs `flagspec/`), hashes `FLAGS.sha256`
(written by `tools/a19h_prep.py`). Wiki flags as the zflx arm: CR1 none; CR2 the two posttran-sonnet DECISION flags.
A2 version: `exec/a2_pick.txt`. Keymaps from the definition: `adapter/keymap_source.txt`.

| Build | A2 version | Rule as implemented | Legacy citation | Change request / file prefix |
|---|---|---|---|---|
| CR1 r1 | ceecec1c (committed branch head = session head) | inventory line 72: each category rounded to the cent, halves away from zero (BR-08 as edited); `interest()` divides by 120000, rounds up at remainder ≥ 60000. No R-INT-TRUNC doubt raised | none | cites `cr1-intcalc-sonnet.pdf` pages; no change request |
| CR1 r2 | b8a3d3c1 (committed branch head = session head) | register `monthly-interest` (absence=false): per-category interest rounded to the cent half away from zero; `interest()` divides by 120000, rounds up at ≥ 60000. No R-INT-TRUNC doubt raised | none | cites `cr1-intcalc-sonnet.pdf`; no change request |
| CR1 r3 | 816b5977 (committed branch head = session head) | fact `individual-rounding`: each category rounded to the cent half away (BR-08 as edited); BigInt `(|p|+60000)/120000`. No R-INT-TRUNC doubt. Flags R-INT-LAST (`final-account`: end-of-input flush not described) | none | cites `cr1-intcalc-sonnet.pdf`; no change request |
| CR2 r1 | 13dc18cb (committed branch head = session head) | line 115: `exposure*10 > limit*11` → 102 (×1.10, strict >, integer cents); line 116: expiry 103 overwrites 102. No uncertainty raised on the tolerance (R-POST-102 not flagged). Requires a caller `processingTimestamp`, left unset (pure renaming): postable records will error inside the build | none | cites `cr2-posttran-sonnet.pdf`; no change request |

Correction (after CR2 r1 execution, citation only): CR2 r1 `adapter/keymap_source.txt` cites "notebook §40" for the unset-timestamp precedent; the precedent is §41 (POSTTRAN zflx execution: optional inputs left unset, timestamps included). The file is left as committed.
| CR2 r2 | 3daa162a (committed branch head = session head) | entry 9: `10*(credit−debit+amount) > 11*limit` → 102 (×1.10, strict >, integer cents), citing BR-03 verbatim; entry 12: expiry overwrites limit. No uncertainty on the tolerance (R-POST-102 not flagged). processingTimestamp optional (falls back to now) | none | cites `cr2-posttran-sonnet.pdf`; no change request |
| CR2 r3 | 2facb880 (committed branch head = session head) | line 38/82: `(credit−debit+amount)*10 > limit*11` → 102 (×1.10, strict >), citing BR-03; expiry overwrites 102. No uncertainty on the tolerance. Records mode; requires caller `processingTimestamp` and `nextTransactionId`, left unset (pure renaming), so its context check will stop every run; it also replaces feed IDs on posted rows (wiki's FlowX sequence) | none | cites `cr2-posttran-sonnet.pdf`; no change request |
