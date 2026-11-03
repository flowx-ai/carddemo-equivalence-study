# CR5 fork of tools/ref_posttran.py (A21 draft), written from the rule text: the run posts the day's transactions in
# ascending order of amount (smallest first); equal amounts keep their order in the daily file. Every check and
# update happens in that order. The reject file is compared as a set of (id, reason), since its order follows posting.
import sys, pathlib
from decimal import Decimal
import os
I = pathlib.Path(os.environ.get("INPUT", pathlib.Path(__file__).parent.parent / "data/in"))
POS = "{ABCDEFGHI"; NEG = "}JKLMNOPQR"
def zoned(s, scale):
    s = s.strip() or "0"; last = s[-1]
    if last in POS: d, sign = str(POS.index(last)), 1
    elif last in NEG: d, sign = str(NEG.index(last)), -1
    else: d, sign = last, 1
    return sign * Decimal(s[:-1] + d) / (10 ** scale)
def enc(v, digits, scale):  # back to zoned overpunch text
    n = int((abs(v) * 10 ** scale).to_integral_value()); s = str(n).zfill(digits)
    return s[:-1] + (POS if v >= 0 else NEG)[int(s[-1])]
lines = lambda f: (I / f).read_text().split("\n")[:-1]
xref = {l[0:16]: l[25:36] for l in lines("cardxref.dat")}
acct = {l[0:11]: dict(rec=l, bal=zoned(l[12:24], 2), lim=zoned(l[24:36], 2), exp=l[58:68],
                      cyc_cr=zoned(l[78:90], 2), cyc_db=zoned(l[90:102], 2)) for l in lines("acctdata.dat")}
tcat = {l[0:17]: zoned(l[17:28], 2) for l in lines("tcatbal.dat")}
rejects = []
for d in sorted(lines("dailytran.dat"), key=lambda d: zoned(d[132:143], 2)):   # CR5: stable sort, smallest first
    tid, typ, cat, amt, card, orig = d[0:16], d[16:18], d[18:22], zoned(d[132:143], 2), d[262:278], d[278:304]
    reason = 0
    if card not in xref: reason = 100
    elif xref[card] not in acct: reason = 101
    else:
        a = acct[xref[card]]
        if not (a["lim"] >= a["cyc_cr"] - a["cyc_db"] + amt): reason = 102
        if not (a["exp"] >= orig[:10]): reason = 103
    if reason: rejects.append((tid, reason)); continue
    k = xref[card] + typ + cat
    tcat[k] = tcat.get(k, Decimal(0)) + amt
    a["bal"] += amt
    if amt >= 0: a["cyc_cr"] += amt
    else: a["cyc_db"] += amt
out = sys.argv[1]
ok = True
got_rej = [(l[0:16], int(l[350:354])) for l in pathlib.Path(out, "posttran_dalyrejs.txt").read_text().split("\n")[:-1]]
print("rejects  ref", len(rejects), "cobol", len(got_rej), "match" if sorted(got_rej) == sorted(rejects) else "DIFF"); ok &= sorted(got_rej) == sorted(rejects)
diff = 0
for l in (x.ljust(300) for x in pathlib.Path(out, "posttran_acctdata.txt").read_text().split("\n")[:-1]):
    a = acct[l[0:11]]
    if (zoned(l[12:24], 2), zoned(l[78:90], 2), zoned(l[90:102], 2)) != (a["bal"], a["cyc_cr"], a["cyc_db"]): diff += 1; print("acct diff", l[0:11])
print("accounts", len(acct), "diffs", diff); ok &= diff == 0
got_t = {l[0:17]: zoned(l[17:28], 2) for l in pathlib.Path(out, "posttran_tcatbal.txt").read_text().split("\n")[:-1]}
td = sum(1 for k in set(tcat) | set(got_t) if tcat.get(k) != got_t.get(k))
print("tcatbal  ref", len(tcat), "cobol", len(got_t), "diffs", td); ok &= td == 0
print("CROSS-CHECK", "PASS" if ok else "FAIL")
