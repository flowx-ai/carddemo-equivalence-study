# Independent Python model of CBACT04C (INTCALC), written from the COBOL source. Input: the POSTTRAN outputs.
# Checks interest transactions and account updates against the GnuCOBOL run.
import sys, pathlib
from decimal import Decimal, ROUND_DOWN
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from ref_posttran_lib import zoned
import os
I = pathlib.Path(os.environ.get("INPUT", pathlib.Path(__file__).parent.parent / "data/in")); out = pathlib.Path(sys.argv[1]); PARM = "2022071800"
rd = lambda p: p.read_text().split("\n")[:-1]
acct = {l[0:11]: dict(bal=zoned(l[12:24], 2), grp=l[112:122], cyc_cr=zoned(l[78:90], 2), cyc_db=zoned(l[90:102], 2))
        for l in (x.ljust(300) for x in rd(out / "posttran_acctdata.txt"))}
disc = {l[0:16]: zoned(l[16:22], 2) for l in rd(I / "discgrp.dat")}
xref_by_acct = {}
for l in rd(I / "cardxref.dat"): xref_by_acct.setdefault(l[25:36], l[0:16])
tcat = sorted((l[0:17], zoned(l[17:28], 2)) for l in rd(out / "posttran_tcatbal.txt"))
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
