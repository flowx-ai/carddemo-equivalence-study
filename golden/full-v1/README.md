# Batch answer key full-v1

Answer key for the seven batch programs outside the four-program core: CBACT01C, CBACT02C, CBACT03C, CBCUS01C, CBTRN01C, CBEXPORT, CBIMPORT. Preparation for a full-application study; nothing here is scored, and nothing is registered until an amendment is approved.

Each `f-*` directory holds `rc.txt`, `stdout.txt` (stdout and stderr together), `out/` (raw output files) and `decoded/` (the same output as JSON lines). The cases are in `cases-full/`, with their predictions.

**Rig.** GnuCOBOL 3.2, the batch rig's flags, clock pinned by `COB_CURRENT_DATE` to 2022-07-18 10:00:00. `build_full.sh` builds into `bin-full/`. `tools/run_full_case.py` runs a case; `tools/freeze_full.sh` refuses to overwrite and writes the hash files. golden/v1, cr1-cr8 and d1 were not written.

**Changes to the source, all of them:**

- CBEXPORT and CBIMPORT do not compile as shipped: their RECORD KEY names a field in WORKING-STORAGE. `patches/port_cbexport.py` moves the key into the FD with the same offset (`ported-full/`). The JCL says KEYS(4 28), where the copybook's sequence number sits at offset 27; the port follows the copybook.
- COBDATFT is assembler. `stub-batch/COBDATFT.cbl` replaces it with type 2 only (YYYY-MM-DD to YYYYMMDD), the only type CBACT01C uses.
- The five other programs are compiled unmodified.

**Hash files.** `SHA256SUMS.g1`, `.g2`, `.g3a`, `.g3b` were written when each group was frozen. `SHA256SUMS` joins them. Group 3 split because the runner stopped at f-imp-03 on a case-file defect (an edit with no `op` key), before f-imp-03's program ran. f-imp-01 and f-imp-02 had run and are their first runs, hashed as `.g3a`; the case file was corrected with the prediction unchanged, and f-imp-03 to 05 are `.g3b`.

**Limits.** What GnuCOBOL does with bytes the source never sets is recorded as this rig's behaviour; the z/OS result is not determined (RESULTS.md lists them). `stdout.txt` holds libcob's `implicit CLOSE` warnings, which are this runtime's text. Numeric DISPLAY format also differs from z/OS. A scorer should compare parsed values and ignore the `libcob:` lines; `scorer/full_batch_compare.py` does.
