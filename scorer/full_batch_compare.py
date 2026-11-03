#!/usr/bin/env python3
"""Batch scorer of the full-application study (DRAFT): a build's outputs for the seven added programs against golden/full-v1.
  python3 scorer/full_batch_compare.py --cand <dir> [--cases f-exp-01,...] [--flags flags.json] [--out <dir>]
  python3 scorer/full_batch_compare.py --export <golden case dir> <out case dir>   (answer key -> candidate form; self-test)
Candidate: <dir>/<case>/ with the files of scorer/CONTRACT-BATCH-FULL.md. Units:
  RC       the return code (`<step>_rc.txt`; no file = 0).
  RECORD   one output record, matched by position in the output, equal when every business field is equal. A bytes-never-set value
           (shown as !hex in decoded/) is not compared: the rig's X'00' is not settled for z/OS. Amounts compare as decimals.
           Export timestamp: only its date part, against RUN_TIMESTAMP's. The reissue date in CBACT01C's OUTFILE: the 8 digits.
  SYSOUT   one printed line. libcob lines, and the lines CBACT01C prints with signed numbers (a compiler's DISPLAY form), are not compared.
           Lines holding X'00' are not compared. START and END banners and CEE3ABD's stub line are not units: they are rig text.
Outcome per case: matches legacy / differs, flagged / differs, silent / absent. Rules: R-BAT-RC, R-BAT-REC, R-BAT-LINE, R-ABSENT.
A difference from legacy says nothing about which is right."""
import argparse, json, pathlib, re, sys
from decimal import Decimal, InvalidOperation
ROOT = pathlib.Path(__file__).resolve().parent.parent
G = ROOT / "golden/full-v1"
STEP = {"CBACT01C": "acctext", "CBACT02C": "cardprint", "CBACT03C": "xrefprint", "CBCUS01C": "custprint", "CBTRN01C": "dailycheck", "CBEXPORT": "export", "CBIMPORT": "import"}
FILEOF = {"OUTFILE": "acctext_out", "ARRYFILE": "acctext_array", "VBRCFILE": "acctext_vb", "EXPFILE": "export", "CUSTOUT": "import_customers", "ACCTOUT": "import_accounts",
          "XREFOUT": "import_card_xref", "TRNXOUT": "import_transactions", "CARDOUT": "import_cards", "ERROUT": "import_errors"}
RIG = re.compile(r"^(libcob:|CEE3ABD ABEND CALLED|START OF EXECUTION|END OF EXECUTION)")
SIGNED = re.compile(r"[0-9][+-]$|\{|\}")


def num(v):
    try:
        return Decimal(str(v).replace(",", "").strip()).quantize(Decimal("0.01"))
    except (InvalidOperation, ValueError):
        return None


def same(a, b):
    if a is None or b is None:
        return str(a or "").strip() == str(b or "").strip()
    a, b = str(a).strip(), str(b).strip()
    if a == b:
        return True
    return bool(re.fullmatch(r"-?[\d.,]+", a) and re.fullmatch(r"-?[\d.,]+", b)) and num(a) == num(b)


def unset(v):
    return isinstance(v, str) and v.startswith("!hex:")


def err_fields(g):
    """ERROUT's fixed line -> the contract's fields. The line's timestamp is not compared (FUNCTION CURRENT-DATE, a clock)."""
    _, t, q, m = (g["line"].split("|") + ["", "", ""])[:4]
    return {"rec_type": t, "seq": str(int(q)) if q.strip().isdigit() else q, "message": m}


def rec_equal(g, c):
    if "line" in g:
        g = err_fields(g)
    for k, v in g.items():
        if k.startswith("_"):
            continue
        if unset(v):
            if k == "reissue_date":
                if bytes.fromhex(v[5:21]).decode("latin-1") != str(c.get(k, ""))[:8]:
                    return False
            elif k == "timestamp":
                if bytes.fromhex(v[5:25]).decode("latin-1") != str(c.get(k, ""))[:10]:
                    return False
            continue
        if not same(v, c.get(k)):
            return False
    return True


def golden_lines(gc, program):
    p = gc / "stdout.txt"
    lines = p.read_bytes().decode("latin-1").splitlines() if p.exists() else []
    out = [l for l in lines if not RIG.match(l) and "\x00" not in l]
    return [l for l in out if not (program == "CBACT01C" and (SIGNED.search(l) or l.startswith(("VBRC-REC2", "0"))))]


def contract_form(rec):
    """decoded/ -> the contract's form: bytes never set are dropped; a value of none at all is null."""
    if "line" in rec:
        return err_fields(rec)
    out = {}
    for k, v in rec.items():
        if unset(v):
            t = bytes.fromhex(v[5:]).decode("latin-1").replace("\x00", "")
            v = t or None
        if not k.startswith("_"):
            out[k] = v
    return out


def export_candidate(gc, oc):
    gc, oc = pathlib.Path(gc), pathlib.Path(oc); oc.mkdir(parents=True, exist_ok=True)
    prog, rc = (gc / "rc.txt").read_text().split(); step = STEP[prog]
    (oc / f"{step}_sysout.txt").write_bytes((gc / "stdout.txt").read_bytes())
    if rc != "rc=0":
        (oc / f"{step}_rc.txt").write_text(rc[3:] + "\n")
    for f in sorted((gc / "decoded").glob("*.jsonl")) if (gc / "decoded").exists() else []:
        (oc / f"{FILEOF[f.stem]}.json").write_text(json.dumps([contract_form(json.loads(l)) for l in f.read_text().splitlines()]) + "\n")


def score_case(cdir, case, flags):
    gc = G / case; prog, rc = (gc / "rc.txt").read_text().split(); step = STEP[prog]; cc = pathlib.Path(cdir) / case; absent = not cc.is_dir(); units = []

    def add(kind, name, rule, eq, detail=None):
        u = dict(kind=kind, case=case, name=name, rule=None if eq else ("R-ABSENT" if absent else rule), equal=eq, flagged=False, detail=detail)
        if not eq and not absent:
            u["flagged"] = any(f.get("rule") == rule and f.get("case", case) == case and f.get("name", name) == name for f in flags)
        units.append(u)
    want = rc[3:]; p = cc / f"{step}_rc.txt"; got = p.read_text().strip() if p.exists() else "0"
    add("rc", "RC", "R-BAT-RC", not absent and want == got, {"legacy": want, "build": got})
    for f in sorted((gc / "decoded").glob("*.jsonl")) if (gc / "decoded").exists() else []:
        gr = [json.loads(l) for l in f.read_text().splitlines()]; cp = cc / f"{FILEOF[f.stem]}.json"
        cr = json.loads(cp.read_text()) if cp.exists() else []
        for i in range(max(len(gr), len(cr))):
            ok = i < len(gr) and i < len(cr) and rec_equal(gr[i], cr[i])
            add("record", f"{FILEOF[f.stem]}:{i + 1}", "R-BAT-REC", ok and not absent, None if ok else {"legacy": gr[i] if i < len(gr) else None, "build": cr[i] if i < len(cr) else None})
    gl = golden_lines(gc, prog); sp = cc / f"{step}_sysout.txt"
    cl = golden_lines(cc, prog) if False else ([l for l in sp.read_bytes().decode("latin-1").splitlines() if not RIG.match(l) and "\x00" not in l] if sp.exists() else [])
    cl = [l for l in cl if not (prog == "CBACT01C" and (SIGNED.search(l) or l.startswith(("VBRC-REC2", "0"))))]
    if prog == "CBACT01C":
        cset = set(cl)                                  # order of the extract's printed lines is not a business result
        for i, l in enumerate(gl):
            add("line", f"sysout:{i + 1}", "R-BAT-LINE", l in cset and not absent, None if l in cset else {"legacy": l})
    else:
        for i in range(max(len(gl), len(cl))):
            ok = i < len(gl) and i < len(cl) and gl[i].strip() == cl[i].strip()
            add("line", f"sysout:{i + 1}", "R-BAT-LINE", ok and not absent, None if ok else {"legacy": gl[i] if i < len(gl) else None, "build": cl[i] if i < len(cl) else None})
    return units, absent


def outcome(us, absent):
    if absent:
        return "absent"
    d = [u for u in us if not u["equal"]]
    return "matches legacy" if not d else ("differs from legacy, flagged" if all(u["flagged"] for u in d) else "differs from legacy, silent")


def summarise(pc):
    r = {"cases": {}, "by_program": {}}
    for c, (us, ab) in pc.items():
        prog = (G / c / "rc.txt").read_text().split()[0]; e = sum(u["equal"] for u in us)
        r["cases"][c] = {"program": prog, "outcome": outcome(us, ab), "equal": e, "units": len(us), "rules_silent": sorted({u["rule"] for u in us if not u["equal"] and not u["flagged"]})}
        b = r["by_program"].setdefault(prog, {"equal": 0, "units": 0, "silent": 0}); b["equal"] += e; b["units"] += len(us); b["silent"] += sum(1 for u in us if not u["equal"] and not u["flagged"])
    ri = [c for c in ("f-exp-01", "f-imp-01") if c in pc]
    r["H_round_trip"] = {"cases": ri, "holds": len(ri) == 2 and all(outcome(*pc[c]) == "matches legacy" for c in ri)}
    return r


def all_cases():
    return sorted(p.name for p in G.iterdir() if p.is_dir() and p.name.startswith("f-"))


def main():
    a = argparse.ArgumentParser(); a.add_argument("--cand"); a.add_argument("--cases"); a.add_argument("--flags"); a.add_argument("--out"); a.add_argument("--export", nargs=2); a = a.parse_args()
    if a.export:
        export_candidate(*a.export); return
    flags = json.loads(pathlib.Path(a.flags).read_text()) if a.flags else []
    cases = a.cases.split(",") if a.cases else all_cases(); pc = {c: score_case(a.cand, c, flags) for c in cases}; r = summarise(pc)
    if a.out:
        o = pathlib.Path(a.out); o.mkdir(parents=True, exist_ok=True); (o / "units.json").write_text(json.dumps([u for v in pc.values() for u in v[0]], indent=1, default=str) + "\n"); (o / "summary.json").write_text(json.dumps(r, indent=1) + "\n")
    print(json.dumps(r, indent=1))


if __name__ == "__main__":
    main()
