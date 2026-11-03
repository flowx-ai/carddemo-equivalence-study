# Results of the batch answer key full-v1

23 cases, 7 programs. Predictions were committed before each first run. **21 match, 2 partial, 0 mismatch.** Both partials are against the export sample shipped in the repository, whose origin is not stated.

A plain re-run of all 23 is byte-identical. The traced builds give identical output files in all 23 cases; in 4 cases `stdout.txt` differs only in the source location libcob prints in its warnings. Coverage: 790 of 1,001 statements (78.9%), all 86 paragraphs (COVERAGE.md). Every statement not reached sits in a file-error arm. The open-error arms of other files could be reached by removing those files, the same path shape as the tested ones; the read, write and close arms need a disk or file-format failure. The answer key does not test them.

| case | program | outcome | prediction |
|---|---|---|---|
| f-crd-01 | CBACT02C | rc 0, 50 records once | match |
| f-crd-02 | CBACT02C | rc 0, no record | match |
| f-crd-03 | CBACT02C | rc 16, status 35 | match |
| f-xrf-01 | CBACT03C | rc 0, 50 records twice | match |
| f-xrf-02 | CBACT03C | rc 16 | match |
| f-cus-01 | CBCUS01C | rc 0, 50 records twice | match |
| f-cus-02 | CBCUS01C | rc 16 | match |
| f-act-01 | CBACT01C | rc 0, 50 / 50 / 100 records | match |
| f-act-02 | CBACT01C | rc 0, see below | match |
| f-act-03 | CBACT01C | rc 16, no output | match |
| f-trn-01 | CBTRN01C | rc 0, 300 records, 301 lookups | match |
| f-trn-02 | CBTRN01C | rc 0, 1 unknown card, 6 account misses | match |
| f-trn-03 | CBTRN01C | rc 0, one lookup on an unset card | match |
| f-trn-04 | CBTRN01C | rc 16 | match |
| f-exp-01 | CBEXPORT | rc 0, 462 records | match |
| f-exp-02 | CBEXPORT | rc 0, 500 records | **partial** |
| f-exp-03 | CBEXPORT | rc 16, no export file | match |
| f-exp-04 | CBEXPORT | rc 0, 412 records | match |
| f-imp-01 | CBIMPORT | rc 0, round trip: every business field equal | match |
| f-imp-02 | CBIMPORT | rc 0, 500 records | **partial** |
| f-imp-03 | CBIMPORT | rc 0, 2 error lines of 132 bytes | match |
| f-imp-04 | CBIMPORT | rc 16 | match |
| f-imp-05 | CBIMPORT | rc 0, six empty files | match |

Not predicted in any case: the `libcob: implicit CLOSE` warning lines, runtime text with no business meaning. Loose wording: f-imp-03's CASE.md sketches the timestamp as `20220718100000000000|`; the prediction's stated structure (21 characters from FUNCTION CURRENT-DATE, blanks up to 26) holds, with the actual value `2022071810000000+0000`.

## The two partials

**f-exp-02** compares CBEXPORT's output with `AWS.M2.CARDDEMO.EXPORT.DATA.PS` (tools/full_export_check.py): 7,768 fields equal, 582 differ.

- Predicted: all 500 timestamps; two account balances; two group ids.
- Layout and encodings agree: record order, COMP and COMP-3 values, and every cross-reference and transaction business field.
- **Not predicted:**
  - Card records: the sample's sequence numbers run 460 to 509, where this source writes 451 to 500. The sample jumps from 450 to 460.
  - Customers 1 and 50 differ in most personal fields.
  - Accounts 1, 49 and 50 differ in zip; account 1 also in open and expiry date. Sample account 49's zip field holds `ZEROAPR`.

So the sample was taken from another data state, and with a sequence that the shipped source's counter does not give. It checks the layout; it is not a reference for behaviour.

**f-imp-02** reads that sample. Counts are as predicted. Predicted "no !hex on a business field"; four such values appear: `addr_zip` and `group_id` in two accounts each, the sample's own X'00' bytes passing through. The f-exp-02 check had shown the group id before this run, and I did not update this prediction.

## What the originals do

Recorded as what they do. A build that behaves otherwise differs from legacy.

| program | behaviour |
|---|---|
| CBACT02C | Prints each record once. |
| CBACT03C, CBCUS01C | Print each record twice: once in the read paragraph, once in the main loop. |
| CBACT01C | Cycle debit in OUTFILE: a zero debit becomes 2525.00; a non-zero debit moves nothing, so the field keeps what the record area holds (X'00' on the first record, the previous record's value later). All 50 sample accounts have zero debit, so every sample row gives 2525.00. |
| CBACT01C | Array record: debit 1 = 1005.00, debit 2 = 1525.00, balance 3 = -1025.00, debit 3 = -2500.00, fixed values. |
| CBACT01C | Reissue date: 8 digits and 2 bytes never set. Separators in the input are ignored. Only ACCTFILE is closed by the program. |
| CBTRN01C | Writes no file. At end of file it looks up the last record once more (301 lookups for 300 records). On an empty file it looks up a card number never set. Opens CUSTFILE, CARDFILE and TRANFILE, never reads them, and stops with rc 16 if TRANFILE is missing. No JCL in the repository. |
| CBEXPORT | Timestamp: 22 characters, then 4 bytes never set. Sequence runs from 1 across record types, with no gap. |
| CBIMPORT | `3000-VALIDATE-IMPORT` checks nothing and always prints 'No validation errors detected'. An unknown record type goes to ERROUT and the run continues with rc 0. The shipped JCL has no CARDOUT DD, while the program opens CARDOUT; the runner supplies it. |

## Not determined by this rig

- What z/OS holds in bytes the source never sets (f-act-01, f-act-02, f-trn-03, f-exp-01).
- What CBACT01C's output record area holds after a WRITE on z/OS (f-act-02, account 3).
- OPEN of a never-loaded KSDS on z/OS (f-crd-02, f-exp-04, f-imp-05, and others using an empty indexed file).
- CBIMPORT's OPEN of CARDOUT without a DD on z/OS.

A scorer should not count those bytes (scorer/full_batch_compare.py masks them).
