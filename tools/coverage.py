# Branch coverage of CBTRN02C and CBACT04C per evaluation set, from GnuCOBOL statement traces (-ftraceall).
# Re-runs each set with traced binaries (bin-trace/), checks the outputs still equal the golden ones, then evaluates
# the probes of BRANCHES.md. usage: python3 tools/coverage.py   (writes coverage/v1/coverage.{json,md})
import filecmp, json, os, pathlib, re, subprocess
from collections import Counter

ROOT = pathlib.Path(__file__).resolve().parent.parent
SETS = {"base": ("data/in", "golden/v1"), **{c: (f"cases/{c}/in", f"golden/v1/cases/{c}/out") for c in ("c01", "c02", "c03", "c04")}}
LINE = re.compile(r"Program-Id:\s+(\S+)\s.*Line:\s+(\d+)")

def trace(name, inp):
    run = ROOT / "run" / f"cov-{name}"; tdir = run.parent / f"cov-{name}-trace"
    subprocess.run(["rm", "-rf", str(tdir)]); tdir.mkdir(parents=True)
    env = dict(os.environ, BIN=str(ROOT / "bin-trace"), INPUT=str(ROOT / inp), COB_SET_TRACE="Y",
               COB_TRACE_FILE=str(tdir / "t-$$.log"))
    subprocess.run(["bash", "run_chain.sh", str(run)], cwd=ROOT, env=env, capture_output=True)
    seq = {}
    for f in tdir.iterdir():
        for l in f.read_text(errors="replace").splitlines():
            m = LINE.search(l)
            if m and m.group(1) in ("CBTRN02C", "CBACT04C"): seq.setdefault(m.group(1), []).append(int(m.group(2)))
    return run / "out", seq

def both_fail(seq):
    # P07: a record whose 102 (line 410) is followed by 103 (line 417) before the next record (line 206)
    n, s102 = 0, False
    for x in seq:
        if x == 206: s102 = False
        elif x == 410: s102 = True
        elif x == 417 and s102: n += 1; s102 = False
    return n

def probes(seq):
    T, A = Counter(seq.get("CBTRN02C", [])), Counter(seq.get("CBACT04C", []))
    return {  # outcome: executions
        "P01 next record": T[206], "P01 end of file": T[361],
        "P02 card found": T[390], "P02 reason 100": T[385],
        "P03 account lookup": T[373], "P03 lookup skipped": T[375],
        "P04 account found": T[403], "P04 reason 101": T[397],
        "P05 limit pass": T[408], "P05 reason 102": T[410],
        "P06 expiry pass": T[415], "P06 reason 103": T[417],
        "P07 102 and 103 both (103 wins)": both_fail(seq.get("CBTRN02C", [])),
        "P08 posted": T[212], "P08 rejected": T[214],
        "P09 category balance updated": T[498], "P09 category balance created": T[496],
        "P10 cycle credit (amt >= 0)": T[549], "P10 cycle debit (amt < 0)": T[551],
        "P12 reason 109 (rewrite failed)": T[556],
        "P13 RC 4": T[230], "P13 RC 0": int(bool(T[229]) and not T[230]),
        "P14 abend": T[707],
        "I01 next record": A[192], "I01 end of file": A[340],
        "I02 final account update (ELSE)": A[220],
        "I03 account changed": A[200], "I03 same account": A[192] - A[200],
        "I04 first account": A[198], "I04 previous account updated": A[196],
        "I05 own group rate found": A[436] - A[437], "I05 DEFAULT fallback": A[437],
        "I06 DEFAULT found": A[453], "I06 DEFAULT missing (abend)": A[455],
        "I07 interest computed": A[215], "I07 zero rate skipped": A[214] - A[215],
        "I08 account found": A[379], "I08 account missing (abend)": A[375],
        "I09 card found": A[394] - A[397], "I09 card missing (abend)": A[397],
        "I16 abend": A[628],
    }

if __name__ == "__main__":
    res, ok = {}, True
    for name, (inp, gold) in SETS.items():
        out, seq = trace(name, inp)
        g = ROOT / gold
        same = all(filecmp.cmp(out / f.name, f, shallow=False) for f in g.glob("*.txt") if f.name != "rc.txt")
        rc = g / "rc.txt" if (g / "rc.txt").exists() else g.parent / "rc.txt"   # return codes must match too
        same &= filecmp.cmp(out.parent / "log/rc.txt", rc, shallow=False)
        ok &= same
        res[name] = dict(outputs_equal_golden=same, statements={p: len(s) for p, s in seq.items()}, probes=probes(seq))
        print(name, "traced outputs == golden:", same, {p: len(s) for p, s in seq.items()})
    d = ROOT / "coverage/v1"; d.mkdir(parents=True, exist_ok=True)
    (d / "coverage.json").write_text(json.dumps(res, indent=1))
    keys = list(res["base"]["probes"])
    L = ["# Branch coverage (GnuCOBOL statement trace)", "", "Executions of each branch outcome per evaluation set. "
         "Probe lines and outcome definitions: `tools/coverage.py`, `BRANCHES.md`.", "",
         "| Outcome | " + " | ".join(res) + " | covered |", "|---|" + "---|" * (len(res) + 1)]
    for k in keys:
        v = [res[s]["probes"][k] for s in res]
        L.append(f"| {k} | " + " | ".join(str(x) for x in v) + f" | {'yes' if any(v) else '**no**'} |")
    L += ["", "Traced outputs equal golden: " + ", ".join(f"{s} {'yes' if r['outputs_equal_golden'] else 'NO'}" for s, r in res.items())]
    (d / "coverage.md").write_text("\n".join(L) + "\n")
    print("ALL OUTPUTS MATCH" if ok else "OUTPUT MISMATCH UNDER TRACE")
