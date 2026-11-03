# CR3 fork of tools/ref_intcalc.py (A21 draft), written from the rule text, not from the patched COBOL: an account
# opened on or before the same calendar date ten years before the run date (the date in the run parameter) is charged
# its disclosure-group rate minus 2.00 points, never below 0.00; a rate that ends at 0.00 writes no interest transaction.
# usage: INPUT=<in dir> [UPSTREAM=<dir with posttran_acctdata/posttran_tcatbal>] python3 cr/ref_intcalc_cr3.py <out dir>
import sys, pathlib
from decimal import Decimal, ROUND_DOWN
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "tools"))
from ref_posttran_lib import zoned
import os
I = pathlib.Path(os.environ.get("INPUT", pathlib.Path(__file__).parent.parent / "data/in")); out = pathlib.Path(sys.argv[1]); PARM = "2022071800"
up = pathlib.Path(os.environ.get("UPSTREAM", out))
RUN = PARM[0:4] + "-" + PARM[4:6] + "-" + PARM[6:8]
CUTOFF = str(int(RUN[0:4]) - 10) + RUN[4:]   # same calendar date, ten years earlier
rd = lambda p: p.read_text().split("\n")[:-1]
acct = {l[0:11]: dict(bal=zoned(l[12:24], 2), grp=l[112:122], opened=l[48:58], cyc_cr=zoned(l[78:90], 2), cyc_db=zoned(l[90:102], 2))
        for l in (x.ljust(300) for x in rd(up / "posttran_acctdata.txt"))}
disc = {l[0:16]: zoned(l[16:22], 2) for l in rd(I / "discgrp.dat")}
xref_by_acct = {}
for l in rd(I / "cardxref.dat"): xref_by_acct.setdefault(l[25:36], l[0:16])
tcat = sorted((l[0:17], zoned(l[17:28], 2)) for l in rd(up / "posttran_tcatbal.txt"))
txs, last, total, suffix, updated = [], None, Decimal(0), 0, {}
def close(a):
    acct[a]["bal"] += total; acct[a]["cyc_cr"] = Decimal(0); acct[a]["cyc_db"] = Decimal(0); updated[a] = True
for key, bal in tcat:
    a, typ, cat = key[0:11], key[11:13], key[13:17]
    if a != last:
        if last is not None: close(last)
        total, last = Decimal(0), a
    k = acct[a]["grp"] + typ + cat
    rate = disc.get(k, disc.get("DEFAULT".ljust(10) + typ + cat))
    if rate and acct[a]["opened"] <= CUTOFF: rate = max(rate - Decimal("2.00"), Decimal(0))   # CR3: long-standing account
    if rate:
        m = (bal * rate / 1200).quantize(Decimal("0.01"), rounding=ROUND_DOWN)   # COMPUTE without ROUNDED truncates
        total += m; suffix += 1
        txs.append((PARM + str(suffix).zfill(6), m, xref_by_acct.get(a)))
LAST_APPLIED = "--apply-last" in sys.argv
if LAST_APPLIED: close(last)
got = [(l[0:16], zoned(l[132:143], 2), l[262:278]) for l in rd(out / "intcalc_systran.txt")]
print("interest txs ref", len(txs), "cobol", len(got), "match" if got == txs else "DIFF")
if got != txs:
    for x, y in zip(txs, got):
        if x != y: print("  ref", x, "cobol", y); break
diff = []
for l in (x.ljust(300) for x in rd(out / "intcalc_acctdata.txt")):
    a = acct[l[0:11]]
    if (zoned(l[12:24], 2), zoned(l[78:90], 2), zoned(l[90:102], 2)) != (a["bal"], a["cyc_cr"], a["cyc_db"]): diff.append(l[0:11])
print("accounts diffs", len(diff), diff[:5], "| last tcatbal account:", last, "applied in model:", LAST_APPLIED)
print("CROSS-CHECK", "PASS" if got == txs and not diff else "FAIL")
