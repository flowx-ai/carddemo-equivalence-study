#!/usr/bin/env python3
"""Self-test of scorer/full_e2e_compare.py on legacy material only (no FlowX): the four pairs, positive and negative controls."""
import json, pathlib, shutil, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent; sys.path.insert(0, str(ROOT / "scorer")); sys.path.insert(0, str(ROOT / "tools"))
import full_e2e_compare as E, a24_e2e as AE, full_lib as F  # noqa: E402
work = pathlib.Path(sys.argv[1]); shutil.rmtree(work, ignore_errors=True); work.mkdir(parents=True); res = []
def chk(n, ok, i=""):
    res.append(bool(ok)); print(("ok   " if ok else "FAIL ") + n + (f"  [{i}]" if i else ""))
def good_jobs(c):
    p = work / f"{c}-jobs.json"; p.write_text(json.dumps(E.FC.legacy_jobs(E.V2 / E.CASES[c]))); return str(p)
bd = AE.divergences(E.V1, E.V1, E.IN); T = {}
for c in E.CASES:
    T[c] = E.touched(c); sd = AE.divergences(E.pair(c), E.pair(c), E.IN)
    chk(f"{c}: the pair as session, golden/v1 as baseline -> carried through", E.classify(c, sd, bd, T[c], good_jobs(c))[0] == "carried through", f"{len(T[c])} touched units")
    v1s = AE.divergences(E.pair(c), E.V1, E.IN); o, bad = E.classify(c, v1s, bd, T[c], "-")
    if c != "e2e-o2-rpt-01":
        chk(f"{c}: negative: no session (golden/v1 as the session chain) -> differs from legacy", o == "differs from legacy", f"{len(bad)} differ")
chk("e2e-o2-rpt-01: its touched unit is the period alone (chain byte-identical)", T["e2e-o2-rpt-01"] == {E.PERIOD}, str(T["e2e-o2-rpt-01"]))
c = "e2e-o2-rpt-01"; sd = AE.divergences(E.pair(c), E.pair(c), E.IN)
chk("e2e-o2-rpt-01: negative: no job request -> differs from legacy", E.classify(c, sd, bd, T[c], "-")[0] == "differs from legacy")
p = work / "bad.json"; p.write_text(json.dumps([{"start_date": "2022-08-01", "end_date": "2022-08-31"}]))
chk("e2e-o2-rpt-01: negative: another period -> differs from legacy", E.classify(c, sd, bd, T[c], str(p))[0] == "differs from legacy")
c = "e2e-o2-tad-01"; PAIR = E.pair(c)
def mut(src, tag, fn):
    d = work / tag; shutil.copytree(src, d); d.chmod(0o755)
    for q in d.rglob("*"):
        q.chmod(0o755 if q.is_dir() else 0o644)   # the copy only; the frozen source stays read-only
    fn(d); return d
def plus1(d):
    p = d / "combtran_transact.txt"; L = p.read_bytes().decode("latin-1").split("\n"); o = []
    for l in L:
        if l[:16] == "0000000996722788":
            l = l[:262] + "1111111111111111" + l[278:]
        o.append(l)
    p.write_bytes("\n".join(o).encode("latin-1"))
m = mut(PAIR, "tad-card", plus1); sd = AE.divergences(PAIR, m, E.IN); o, bad = E.classify(c, sd, bd, T[c], "-")
chk("tad: negative: the online row's card altered in COMBTRAN -> differs from legacy", o == "differs from legacy", str(bad[:2]))
def drop(d):
    p = d / "tranrept_report.txt"; p.unlink()
m = mut(PAIR, "tad-abs", drop); chk("tad: negative: an output missing -> absent", E.classify(c, AE.divergences(PAIR, m, E.IN), bd, T[c], "-")[0] == "absent")
def ts(d):
    p = d / "combtran_transact.txt"; L = p.read_bytes().decode("latin-1").split("\n"); p.write_bytes("\n".join(l[:304] + "2022-07-18 23:59:59.000000" + l[330:] if l[:16] == "0000000996722788" else l for l in L).encode("latin-1"))
m = mut(PAIR, "tad-ts", ts); chk("tad: must not count: the online row's time part, same date", E.classify(c, AE.divergences(PAIR, m, E.IN), bd, T[c], "-")[0] == "carried through")
c = "e2e-o2-aup-01"; PAIR = E.pair(c)
def bal(d):
    p = d / "intcalc_acctdata.txt"; recs = [F.to_json("ACCTDAT", F.decode("ACCTDAT", l)) for l in p.read_bytes().decode("latin-1").split("\n") if l]
    for r in recs:
        if r["acct_id"] == 1:
            r["curr_bal"] = round(float(r["curr_bal"]) + 1, 2)
    p.write_bytes("".join(F.encode("ACCTDAT", r) + "\n" for r in recs).encode("latin-1"))
m = mut(PAIR, "aup-bal", bal); mb = mut(E.V1, "v1-bal", bal)
sd = AE.divergences(PAIR, m, E.IN); bd2 = AE.divergences(E.V1, mb, E.IN)
chk("aup: same field off in both chains -> carried through except inherited", E.classify(c, sd, bd2, T[c])[0] == "carried through except inherited")
chk("aup: negative: off only in the session chain -> differs from legacy", E.classify(c, sd, bd, T[c])[0] == "differs from legacy")
# the fix to A24's known property: a touched unit whose whole key is missing
u = sorted(x for x in T["e2e-o2-tad-01"] if x[0] == "tranrept_report" or x[0].startswith("creastmt"))[0]
sd2 = {(u[0], u[1], "missing")}
chk("A24's property fixed: a touched unit's key missing from the session chain differs", E.classify("e2e-o2-tad-01", sd2, bd, T["e2e-o2-tad-01"])[0] == "differs from legacy", str(u))
chk("the same with the key missing in both chains -> inherited, not carried through", E.classify("e2e-o2-tad-01", sd2, sd2, T["e2e-o2-tad-01"])[0] == "carried through except inherited")
print(f"\n{sum(res)}/{len(res)} checks passed"); sys.exit(0 if all(res) else 1)
