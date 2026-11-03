# Instrument check (A5): golden/d1 equals golden/v1 field by field except the perturbed fields, which must carry
# exactly the perturbed values. Exit 1 on any other difference.
import sys, pathlib; sys.path.insert(0, "scorer"); import canon
from collections import Counter
EXPECT = {"type_cd": ("01", "07"), "cat_cd": (5, 12), "source": ("System", "Batch")}
bad, seen = [], Counter()
for s in ["base", "c01", "c02", "c03", "c04"]:
    v = "golden/v1" if s == "base" else f"golden/v1/cases/{s}/out"; d = "golden/d1" if s == "base" else f"golden/d1/cases/{s}/out"
    for out in ("intcalc_systran", "intcalc_acctdata"):
        V, D = canon.load(v, out), canon.load(d, out)
        if set(V) != set(D): bad.append((s, out, "keys differ", len(V), len(D))); continue
        for k in V:
            for f in V[k]:
                a, b = V[k][f], D[k][f]
                if a == b: continue
                if out == "intcalc_systran" and f in EXPECT and (a, b) == EXPECT[f]: seen[f] += 1; continue
                if out == "intcalc_systran" and f == "desc" and a.startswith("Int. for a/c ") and b == "Accrued int " + a[13:]: seen[f] += 1; continue
                bad.append((s, out, k, f, a, b))
        seen[f"{out} records"] += len(V)
print(dict(seen)); print("unexpected differences:", len(bad)); [print("  ", *b) for b in bad[:20]]
sys.exit(1 if bad else 0)
