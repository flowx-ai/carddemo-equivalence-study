#!/usr/bin/env python3
"""A24 online scorer: a FlowX build's online run (tools/adapter_online.py) against the online oracle (golden-online/v1).

  python3 scorer/online_compare.py --golden golden-online/v1 --cand <run-dir> [--flags flags.json]
         [--tags scorer/online/TAGS_v1.json] [--cases o-bil-01,...] [--out <dir>]
  python3 scorer/online_compare.py --export <golden case dir> <out case dir>   (oracle -> candidate format; self-test)

Candidate run dir: one directory per case, holding
  screens.json   {"case": id, "steps": [{"step": n, "reached": true|false, "nav": <legacy map name>|"TEXT"|other,
                  "msg": {"ERRMSG": "...", "INFOMSG": "..."}, "fields": {<BMS field name>: "<displayed value>"},
                  "note": "..."}]}
                 written by the adapter through the build's screen map (one entry per session.yaml step);
  files/<FILE>.txt  the unloaded FlowX stores in the oracle's ul_* format (ONLINE_ORACLE.md 2.4).
A case directory that is missing, or has neither file, is absent.

Units (A24 "Scoring"):
  screen units, per scored step, from the last screen the legacy step sends (SEND MAP or SEND TEXT):
    NAV   the map name (TEXT for SEND TEXT);
    MSG   ERRMSG and INFOMSG (the SEND TEXT text for TEXT), compared after whitespace trim, with runs of
          whitespace inside the text taken as one space (a web page renders them as one);
    FIELD every other field the program sent (tag D) or kept as typed (tag T), except the header fields (TRNNAME,
          TITLE01, TITLE02, CURDATE, CURTIME, PGMNAME, APPLID, SYSID) and dark fields; compared after trim; a value
          shaped as a signed amount (+0000000194.00, +      2,020.00) is compared as a decimal, with '$', ',' and
          spaces removed on both sides. A field the build adds under a legacy field name the step does not send is
          an extra unit (unequal).
  file units: one record of ACCTDAT, CUSTDAT, CCXREF, TRANSACT, USRSEC, matched by key, equal when every business
    field is equal under the §4 canonicalisation (tools/a24_lib.canon). USRSEC's password is masked on both sides.
    Not scored: orig_ts and proc_ts on TRANSACT rows the session wrote (key not in the case's base TRANSACT); in
    o-bil-04, card_num on those rows.
Exclusions (pre-registered): o-bil-06 unscored; steps not executable on a web UI (o-sgn-02 5, o-mnu-01 3,
o-avw-02 8, o-bil-02 11); o-sgn-03 and o-mnu-02 scored only up to the transfer out of the slice (step 3 excluded).
Rules (closed): R-ONL-NAV, R-ONL-MSG, R-ONL-FIELD, R-ONL-ACCT, R-ONL-TRAN, R-ONL-FILE, R-ONL-UNREACH, R-ABSENT.
Flags: [{"rule": "R-ONL-MSG", "case": "o-bil-01", "step": 5, "field": "ERRMSG", "screen": "COBIL0A",
         "file": "TRANSACT", "source": "assumptions.md:12"}]; rule required, every other selector optional. A
differing unit is flagged when a flag with its rule matches every selector the flag gives.
"""
import argparse, copy, json, pathlib, re, sys
from decimal import Decimal, InvalidOperation

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
import a24_lib as L  # noqa: E402

HEADER = {"TRNNAME", "TITLE01", "TITLE02", "CURDATE", "CURTIME", "PGMNAME", "APPLID", "SYSID"}
MSG_FIELDS = {"ERRMSG", "INFOMSG"}
UNSCORED = {"o-bil-06"}
EXCLUDED_STEPS = {"o-sgn-02": {5}, "o-mnu-01": {3}, "o-avw-02": {8}, "o-bil-02": {11}, "o-sgn-03": {3}, "o-mnu-02": {3}}
CORE = ["o-sgn-01", "o-sgn-02", "o-mnu-01", "o-avw-01", "o-bil-01", "o-bil-02", "o-bil-03"]
FILES = ["ACCTDAT", "CUSTDAT", "CCXREF", "TRANSACT", "USRSEC"]
AMOUNT = re.compile(r"^[+-]?[\d,\s]*\.\d\d$")
RESP = re.compile(r"RESP|Resp:|Reas:")
ws = lambda t: re.sub(r"\s+", " ", str(t)).strip()


# ---------------------------------------------------------------- legacy side
def parse_screens(path):
    """screens.log -> {step: {"label", "end": screen|None, "outcome": ...}}; screen = {nav, msg{}, fields{}}."""
    steps, cur, scr = {}, None, None
    for line in pathlib.Path(path).read_text(errors="replace").splitlines():
        m = re.match(r"^##### step\s+(\d+):\s*(.*)$", line)
        if m:
            cur = int(m.group(1)); steps[cur] = {"label": m.group(2), "end": None, "outcome": None}; scr = None
            continue
        if cur is None:
            continue
        m = re.match(r"^SEND MAP (\S+)", line)
        if m:
            scr = {"nav": m.group(1), "msg": {}, "fields": {}}; steps[cur]["end"] = scr
            continue
        m = re.match(r"^SEND TEXT from \S+ site \d+ \|(.*)\|?$", line)
        if m:
            t = m.group(1)
            t = t[:-1] if t.endswith("|") else t
            steps[cur]["end"] = {"nav": "TEXT", "msg": {"TEXT": t}, "fields": {}}; scr = None
            continue
        m = re.match(r"^  (\S+)\s+([DINT])\s\|(.*)\|$", line)
        if m and scr is not None:
            name, tag, val = m.groups()
            if name in HEADER or val == "<dark>":
                continue
            if name in MSG_FIELDS:
                scr["msg"][name] = val
            elif tag in "DT":
                scr["fields"][name] = val
            continue
        if line.startswith("END outcome=OUT-OF-SLICE"):
            steps[cur]["outcome"] = "OUT-OF-SLICE"
        elif line.startswith("task end: ABEND"):
            steps[cur]["outcome"] = "ABEND"
        if not line.startswith("  "):
            scr = None if not line.startswith("SEND MAP") else scr
    return steps


def export_candidate(gcase, ocase):
    """Writes the oracle's own result in the candidate format (screens.json + files/)."""
    gcase, ocase = pathlib.Path(gcase), pathlib.Path(ocase)
    st = parse_screens(gcase / "screens.log")
    out = {"case": gcase.name, "steps": []}
    for n, s in sorted(st.items()):
        e = s["end"] or {"nav": None, "msg": {}, "fields": {}}
        out["steps"].append({"step": n, "reached": True, "nav": e["nav"], "msg": e["msg"], "fields": e["fields"]})
    (ocase / "files").mkdir(parents=True, exist_ok=True)
    (ocase / "screens.json").write_text(json.dumps(out, indent=1) + "\n")
    for f in FILES:
        (ocase / "files" / f"{f}.txt").write_bytes((gcase / "files" / f"{f}.txt").read_bytes())


def base_state(case_id):
    """The case's starting records per file: the untouched-session unload plus the case's data_edits (as onlrun)."""
    import yaml
    sess = yaml.safe_load((ROOT / "cases-online" / case_id / "session.yaml").read_text())
    keylen = {"ACCTDAT": 11, "CUSTDAT": 9, "CCXREF": 16, "TRANSACT": 16, "USRSEC": 8}
    base = {}
    for f in FILES:
        lines = [l for l in (ROOT / "golden-online/v1/o-sgn-01/files" / f"{f}.txt").read_bytes().decode("latin-1").split("\n") if l]
        for e in sess.get("data_edits") or []:
            if e["file"] != f:
                continue
            if "delete" in e:
                lines = [l for l in lines if l[:keylen[f]] != e["delete"]]
            elif "add" in e:
                lines.append(e["add"].rstrip(" "))
            elif e.get("truncate"):
                lines = []
            elif "replace" in e:
                k = e["replace"][:keylen[f]]
                lines = [e["replace"].rstrip(" ") if l[:keylen[f]] == k else l for l in lines]
        base[f] = {L.key_of(f, L.decode(f, l)): L.decode(f, l) for l in lines}
    return base


# ---------------------------------------------------------------- comparison
def canon_amount(s):
    t = str(s).replace("$", "").replace(",", "").replace(" ", "").strip()
    neg = t.startswith("-") or t.endswith("-") or (t.startswith("(") and t.endswith(")"))
    t = t.strip("+-()")
    try:
        d = Decimal(t or "0").quantize(Decimal("0.01"))
    except InvalidOperation:
        return None
    return -d if neg else d


def field_equal(legacy, cand):
    if cand is None:
        return False
    if AMOUNT.match(legacy.strip() or "x"):
        a, b = canon_amount(legacy), canon_amount(cand)
        return a is not None and a == b
    return legacy.strip() == str(cand).strip()


def rec_equal(f, g, c, masked):
    for fname, _, _ in L.fields(f):
        if fname in masked or (f == "USRSEC" and fname == "pwd"):
            continue
        if L.canon(f, fname, g.get(fname)) != L.canon(f, fname, c.get(fname)):
            return False
    return True


def score_case(gdir, cdir, case_id, tags, flags):
    """-> list of units: dict(kind, case, step, name, rule, equal, tagged, flagged, detail)."""
    units = []
    gcase = gdir / case_id
    leg = parse_screens(gcase / "screens.log")
    excl = EXCLUDED_STEPS.get(case_id, set())
    ctag = tags["cases"].get(case_id, {})
    tsteps = {int(k) for k in ctag.get("tagged_steps", {})}
    ccase = cdir / case_id
    cscr = None
    if (ccase / "screens.json").exists():
        cscr = {s["step"]: s for s in json.loads((ccase / "screens.json").read_text())["steps"]}
    has_files = (ccase / "files").is_dir()
    absent = cscr is None and not has_files

    def add(kind, step, name, rule, equal, tagged, screen=None, file=None, detail=None):
        u = dict(kind=kind, case=case_id, step=step, name=name, rule=None if equal else rule, equal=equal,
                 tagged=tagged, flagged=False, screen=screen, file=file, detail=detail)
        if not equal and not absent:
            u["flagged"] = any(fl.get("rule") == rule and fl.get("case", case_id) == case_id
                               and fl.get("step", step) == step and fl.get("field", name) == name
                               and fl.get("screen", screen) == screen and fl.get("file", file) == file
                               for fl in flags)
        units.append(u)

    # screen units
    for n, s in sorted(leg.items()):
        if n in excl or s["end"] is None:
            continue
        e = s["end"]; tstep = n in tsteps
        c = (cscr or {}).get(n)
        unreached = c is not None and c.get("reached") is False
        rule_of = lambda r: "R-ABSENT" if (absent or cscr is None or c is None) else ("R-ONL-UNREACH" if unreached else r)
        ok = lambda: c is not None and not unreached
        add("screen", n, "NAV", rule_of("R-ONL-NAV"), ok() and c.get("nav") == e["nav"], tstep, screen=e["nav"],
            detail={"legacy": e["nav"], "build": c.get("nav") if c else None})
        cmsg = (c or {}).get("msg") or {}
        for k, v in e["msg"].items():
            cv = cmsg.get(k)
            add("screen", n, k, rule_of("R-ONL-MSG"), ok() and cv is not None and ws(v) == ws(cv),
                tstep or bool(RESP.search(v)), screen=e["nav"], detail={"legacy": v, "build": cv})
        cf = (c or {}).get("fields") or {}
        for k, v in e["fields"].items():
            add("screen", n, k, rule_of("R-ONL-FIELD"), ok() and field_equal(v, cf.get(k)), tstep, screen=e["nav"],
                detail={"legacy": v, "build": cf.get(k)})
        for k in sorted(set(cf) - set(e["fields"]) - MSG_FIELDS - HEADER):
            if ok():
                add("screen", n, k, "R-ONL-FIELD", False, tstep, screen=e["nav"], detail={"legacy": None, "build": cf[k]})

    # file units
    base = base_state(case_id)
    write_tagged = any(s in tsteps for s in ctag.get("write_steps", []))
    for f in FILES:
        g = L.read_file(gcase / "files" / f"{f}.txt", f)
        cpath = ccase / "files" / f"{f}.txt"
        c = L.read_file(cpath, f) if cpath.exists() else None
        for k in sorted(set(g) | set(c or {})):
            gr, cr = g.get(k), (c or {}).get(k)
            session_row = f == "TRANSACT" and k not in base["TRANSACT"]
            changed = gr is not None and (k not in base[f] or not rec_equal(f, base[f][k], gr, set()))
            masked = {"orig_ts", "proc_ts"} if session_row else set()
            if session_row and case_id == "o-bil-04":
                masked |= {"card_num"}
            rule = ("R-ONL-ACCT" if f == "ACCTDAT" else "R-ONL-TRAN" if session_row else "R-ONL-FILE")
            if c is None:
                rule = "R-ABSENT"
            eq = gr is not None and cr is not None and rec_equal(f, gr, cr, masked)
            add("file", None, k, rule, eq, bool(changed and write_tagged), file=f,
                detail=None if eq else {"legacy": _show(f, gr), "build": _show(f, cr)})
    return units, absent


def _show(f, r):
    if r is None:
        return None
    return {k: (str(v) if not isinstance(v, (int, str)) else v) for k, v in r.items() if not (f == "USRSEC" and k == "pwd")}


def outcome(us, any_absent):
    if any_absent or (us and all(u["rule"] == "R-ABSENT" for u in us)):
        return "absent"
    if any(u["rule"] == "R-ONL-UNREACH" for u in us):
        return "not reachable"
    diff = [u for u in us if not u["equal"]]
    if not diff:
        return "matches legacy"
    return "differs from legacy, flagged" if all(u["flagged"] for u in diff) else "differs from legacy, silent"


def eq(us):
    return (sum(u["equal"] for u in us), len(us))


def summarise(per_case):
    allu = [u for us, _ in per_case.values() for u in us]
    pick = lambda kind, tagged: [u for u in allu if u["kind"] == kind and u["tagged"] == tagged]
    r = {"cases": {}, "pooled": {}}
    for cid, (us, ab) in per_case.items():
        r["cases"][cid] = {
            "outcome_untagged": outcome([u for u in us if not u["tagged"]], ab),
            "outcome_tagged": outcome([u for u in us if u["tagged"]], ab) if any(u["tagged"] for u in us) else None,
            "screen_untagged": eq([u for u in us if u["kind"] == "screen" and not u["tagged"]]),
            "screen_tagged": eq([u for u in us if u["kind"] == "screen" and u["tagged"]]),
            "file_untagged": eq([u for u in us if u["kind"] == "file" and not u["tagged"]]),
            "file_tagged": eq([u for u in us if u["kind"] == "file" and u["tagged"]]),
            "rules_silent": sorted({u["rule"] for u in us if not u["equal"] and not u["flagged"]}),
            "rules_flagged": sorted({u["rule"] for u in us if not u["equal"] and u["flagged"]}),
        }
    for kind in ("screen", "file"):
        for t in (False, True):
            e, n = eq(pick(kind, t))
            r["pooled"][f"{kind}_{'tagged' if t else 'untagged'}"] = {"equal": e, "units": n,
                                                                       "equivalence": (e / n) if n else None}
    # hypotheses (A24): computed per build; the per-builder 2-of-3 rule is applied over builds by the analyst
    core = [u for c in CORE if c in per_case for u in per_case[c][0] if u["kind"] == "screen"]
    r["H16_core_no_silent"] = {"cases": [c for c in CORE if c in per_case],
                               "silent_units": sum(1 for u in core if not u["equal"] and not u["flagged"]),
                               "holds": all(c in per_case for c in CORE) and not any(per_case[c][1] for c in CORE)
                               and all(u["equal"] or u["flagged"] for u in core)}
    h15 = [u for c in ("o-bil-01", "o-bil-03") if c in per_case for u in per_case[c][0]
           if u["kind"] == "file" and u["file"] in ("ACCTDAT", "TRANSACT")]
    r["H15_payment_files"] = {"silent_units": sum(1 for u in h15 if not u["equal"] and not u["flagged"]),
                              "holds": all(c in per_case for c in ("o-bil-01", "o-bil-03"))
                              and all(u["equal"] or u["flagged"] for u in h15) and bool(h15)}
    av = [u for u in per_case.get("o-avw-01", ([], True))[0] if u["kind"] == "screen" and u["step"] == 4
          and u["name"] not in ("NAV",) and u["name"] not in MSG_FIELDS]
    r["H17_account_view_fields"] = {"equal": eq(av)[0], "units": eq(av)[1], "holds": bool(av) and all(u["equal"] for u in av)}
    return r


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--golden", default=str(ROOT / "golden-online/v1"))
    ap.add_argument("--cand")
    ap.add_argument("--flags")
    ap.add_argument("--tags", default=str(ROOT / "scorer/online/TAGS_v1.json"))
    ap.add_argument("--cases")
    ap.add_argument("--out")
    ap.add_argument("--export", nargs=2)
    a = ap.parse_args()
    if a.export:
        export_candidate(*a.export); return
    gdir, cdir = pathlib.Path(a.golden), pathlib.Path(a.cand)
    tags = json.loads(pathlib.Path(a.tags).read_text())
    flags = json.loads(pathlib.Path(a.flags).read_text()) if a.flags else []
    cases = a.cases.split(",") if a.cases else sorted(p.name for p in gdir.iterdir()
                                                      if p.is_dir() and p.name.startswith("o-") and p.name not in UNSCORED)
    per_case = {c: score_case(gdir, cdir, c, tags, flags) for c in cases}
    r = summarise(per_case)
    if a.out:
        o = pathlib.Path(a.out); o.mkdir(parents=True, exist_ok=True)
        (o / "units.json").write_text(json.dumps([u for us, _ in per_case.values() for u in us], indent=1, default=str) + "\n")
        (o / "summary.json").write_text(json.dumps(r, indent=1) + "\n")
    print(json.dumps(r, indent=1))


if __name__ == "__main__":
    main()
