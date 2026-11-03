# CardDemo golden outputs v1

Frozen outputs of the CardDemo batch chain run off-mainframe (GnuCOBOL 3.2) on the shipped sample data.
They are the oracle for differential testing of a migrated implementation.

- Subject: AWS CardDemo (Apache-2.0), commit 59cc6c2fd7ebd7ef7925cad552a01a4b8b6e4d5e
- Reproduce: `./build.sh && ./run_chain.sh run/x && diff -r run/x/out golden/v1` (text outputs; compare SHA256SUMS)
- Clock pinned: COB_CURRENT_DATE="2022/07/18 10:00:00.00+0000"; INTCALC PARM 2022071800; TRANREPT window 2022-07-01..2022-07-31
- Return codes: see rc.txt (POSTTRAN 4 = rejects present, by design)

| File | Step | Content |
|---|---|---|
| posttran_transact.txt | POSTTRAN | 262 posted transactions (TRANFILE, key order) |
| posttran_dalyrejs.txt | POSTTRAN | 38 rejects (350-byte input + reason 9(4) + description) |
| posttran_acctdata.txt | POSTTRAN | 50 accounts after posting |
| posttran_tcatbal.txt | POSTTRAN | 100 category balances after posting |
| intcalc_systran.txt | INTCALC | 50 interest transactions |
| intcalc_acctdata.txt | INTCALC | 50 accounts after interest (last account not updated: legacy defect, see LAB_NOTEBOOK §7) |
| combtran_transact.txt | COMBTRAN | 312 combined transactions |
| creastmt_statements.txt | CREASTMT | text statements (80-byte lines) |
| creastmt_statements_html.txt | CREASTMT | HTML statements (100-byte lines) |
| tranrept_report.txt | TRANREPT | daily transaction report (133-byte lines) |

Comparison rules for a migrated implementation: compare fields, not bytes, for records carrying FILLER (low-values);
TRAN-PROC-TS is a processing timestamp (pinned here; mask or pin it on the other side).
